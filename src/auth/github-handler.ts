// import { env } from "cloudflare:workers";
import type { AuthRequest } from "@cloudflare/workers-oauth-provider";
import { Hono } from "hono";
import { Octokit } from "octokit";
import type { Props, ExtendedEnv } from "../types";
import {
	clientIdAlreadyApproved,
	parseRedirectApproval,
	renderApprovalDialog,
	fetchUpstreamAuthToken,
	getUpstreamAuthorizeUrl,
} from "./oauth-utils";
import microsoftApp, { getMicrosoftTokens } from "./microsoft-handler";
const app = new Hono<{ Bindings: ExtendedEnv }>();

app.get("/authorize", async (c) => {
	const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
	const { clientId } = oauthReqInfo;
	if (!clientId) {
		return c.text("Invalid request", 400);
	}

	if (
		await clientIdAlreadyApproved(c.req.raw, oauthReqInfo.clientId, (c.env as any).COOKIE_ENCRYPTION_KEY)
	) {
		return redirectToGithub(c.req.raw, oauthReqInfo, c.env, {});
	}

	return renderApprovalDialog(c.req.raw, {
		client: await c.env.OAUTH_PROVIDER.lookupClient(clientId),
		server: {
			description: "This is a demo MCP Remote Server using GitHub for authentication.",
			logo: "https://avatars.githubusercontent.com/u/314135?s=200&v=4",
			name: "Cloudflare GitHub MCP Server", // optional
		},
		state: { oauthReqInfo }, // arbitrary data that flows through the form submission below
	});
});

app.post("/authorize", async (c) => {
	// Validates form submission, extracts state, and generates Set-Cookie headers to skip approval dialog next time
	const { state, headers } = await parseRedirectApproval(c.req.raw, (c.env as any).COOKIE_ENCRYPTION_KEY);
	if (!state.oauthReqInfo) {
		return c.text("Invalid request", 400);
	}

	return redirectToGithub(c.req.raw, state.oauthReqInfo, c.env, headers);
});

async function redirectToGithub(
	request: Request,
	oauthReqInfo: AuthRequest,
	env: Env,
	headers: Record<string, string> = {},
) {
	return new Response(null, {
		headers: {
			...headers,
			location: getUpstreamAuthorizeUrl({
				client_id: (env as any).GITHUB_CLIENT_ID,
				redirect_uri: new URL("/callback", request.url).href,
				scope: "read:user",
				state: btoa(JSON.stringify(oauthReqInfo)),
				upstream_url: "https://github.com/login/oauth/authorize",
			}),
		},
		status: 302,
	});
}

/**
 * OAuth Callback Endpoint
 *
 * This route handles the callback from GitHub after user authentication.
 * It exchanges the temporary code for an access token, then stores some
 * user metadata & the auth token as part of the 'props' on the token passed
 * down to the client. It ends by redirecting the client back to _its_ callback URL
 */
app.get("/callback", async (c) => {
	try {
		// Get the state parameter with better error handling
		const stateParam = c.req.query("state");
		if (!stateParam) {
			console.error("No state parameter found");
			return c.text("Missing state parameter", 400);
		}

		console.log("State parameter received:", stateParam);

		// Try to decode the state parameter with better error handling
		let oauthReqInfo: AuthRequest;
		try {
			// First try direct base64 decode
			const base64Decoded = atob(stateParam);
			console.log("Base64 decoded state:", base64Decoded);
			oauthReqInfo = JSON.parse(base64Decoded) as AuthRequest;
		} catch (directDecodeError) {
			console.log("Direct base64 decode failed, trying URL decode first");
			try {
				// If that fails, try URL decode first, then base64 decode
				const urlDecoded = decodeURIComponent(stateParam);
				console.log("URL decoded state:", urlDecoded);
				const base64Decoded = atob(urlDecoded);
				console.log("Base64 decoded after URL decode:", base64Decoded);
				oauthReqInfo = JSON.parse(base64Decoded) as AuthRequest;
			} catch (urlDecodeError) {
				console.error("Both decode methods failed:");
				console.error("Direct decode error:", directDecodeError);
				console.error("URL decode error:", urlDecodeError);
				console.error("Original state param:", stateParam);
				return c.text(`State decoding failed: ${urlDecodeError instanceof Error ? urlDecodeError.message : String(urlDecodeError)}`, 400);
			}
		}

		if (!oauthReqInfo.clientId) {
			console.error("No clientId in decoded oauthReqInfo:", oauthReqInfo);
			return c.text("Invalid state - missing clientId", 400);
		}

		console.log("Successfully decoded oauthReqInfo:", oauthReqInfo);

		// Exchange the code for an access token
		const [accessToken, errResponse] = await fetchUpstreamAuthToken({
			client_id: (c.env as any).GITHUB_CLIENT_ID,
			client_secret: (c.env as any).GITHUB_CLIENT_SECRET,
			code: c.req.query("code"),
			redirect_uri: new URL("/callback", c.req.url).href,
			upstream_url: "https://github.com/login/oauth/access_token",
		});
		if (errResponse) {
			console.error("Error fetching upstream auth token");
			return errResponse;
		}

		console.log("Successfully got access token");

		// Fetch the user info from GitHub
		const user = await new Octokit({ auth: accessToken }).rest.users.getAuthenticated();
		const { login, name, email } = user.data;

		console.log("Successfully fetched user info:", { login, name, email });

		// Check if user has Microsoft tokens
		const microsoftTokens = await getMicrosoftTokens(c.env, login);

		// Return back to the MCP client a new token
		const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
			metadata: {
				label: name,
			},
			// This will be available on this.props inside MyMCP
			props: {
				accessToken,
				email,
				login,
				name,
				// Include Microsoft tokens if available
				microsoftAccessToken: microsoftTokens?.accessToken,
				microsoftRefreshToken: microsoftTokens?.refreshToken,
				microsoftTokenExpiry: microsoftTokens?.expiresAt,
			} as Props,
			request: oauthReqInfo,
			scope: oauthReqInfo.scope,
			userId: login,
		});

		console.log("Successfully completed authorization, redirecting to:", redirectTo);
		return Response.redirect(redirectTo);

	} catch (error) {
		console.error("Unexpected error in callback:", error);
		return c.text(`Callback error: ${error instanceof Error ? error.message : String(error)}`, 500);
	}
});

// Mount Microsoft OAuth routes
app.route("/", microsoftApp);

export { app as GitHubHandler };