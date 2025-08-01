import { Hono } from "hono";
import { ExtendedEnv, MicrosoftTokenResponse, MicrosoftUserInfo, ClientInfo } from "../types";
import { 
  clientIdAlreadyApproved, 
  renderApprovalDialog, 
  signClientApproval,
  parseApprovalForm
} from "./oauth-utils";

const app = new Hono<{ Bindings: ExtendedEnv }>();

// Microsoft OAuth endpoints
const MICROSOFT_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const MICROSOFT_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const MICROSOFT_GRAPH_URL = "https://graph.microsoft.com/v1.0";

// Required scopes for email functionality
const MICROSOFT_SCOPES = [
  "offline_access",
  "User.Read",
  "Mail.Read",
  "Mail.Send",
  "Calendars.Read",
  "Calendars.ReadWrite",
  "Contacts.Read"
].join(" ");

/**
 * Microsoft OAuth authorization endpoint
 * This initiates the OAuth flow with Microsoft
 */
app.get("/microsoft/authorize", async (c) => {
  const userId = c.req.query("userId");
  
  if (!userId) {
    return c.text("Missing userId parameter", 400);
  }

  // Generate state parameter for security
  const state = btoa(JSON.stringify({
    userId,
    timestamp: Date.now(),
    random: Math.random().toString(36).substring(7)
  }));

  // Store state in KV for verification
  await c.env.OAUTH_KV.put(
    `ms_oauth_state:${state}`,
    JSON.stringify({ userId }),
    { expirationTtl: 600 } // 10 minutes
  );

  // Check if client already approved via cookie
  const clientId = c.env.MS_CLIENT_ID;
  if (await clientIdAlreadyApproved(c.req.raw, clientId, c.env.COOKIE_ENCRYPTION_KEY)) {
    return redirectToMicrosoft(c, state);
  }

  // Show approval dialog
  return renderApprovalDialog(c.req.raw, {
    client: {
      clientId: clientId,
      clientName: "Microsoft Email Integration",
      redirectUris: []
    } as ClientInfo,
    server: {
      name: "MCP Email Tools",
      description: "This integration allows sending emails through your Microsoft account",
      logo: "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg"
    },
    state: { microsoftState: state, userId }
  });
});

/**
 * Handle approval form submission
 */
app.post("/microsoft/authorize", async (c) => {
  const { state, headers } = await parseApprovalForm(c.req.raw);
  
  if (!state.approved) {
    return c.text("Authorization denied", 403);
  }

  // Sign client approval
  const signedHeaders = await signClientApproval(
    c.env.MS_CLIENT_ID,
    c.env.COOKIE_ENCRYPTION_KEY as string,
    headers
  );

  // Redirect to Microsoft with signed cookie
  const response = redirectToMicrosoft(c, state.microsoftState);
  Object.entries(signedHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
});

/**
 * Microsoft OAuth callback endpoint
 * This handles the response from Microsoft after user authorization
 */
app.get("/microsoft/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const error = c.req.query("error");
  const errorDescription = c.req.query("error_description");

  if (error) {
    console.error(`Microsoft OAuth error: ${error} - ${errorDescription}`);
    return c.html(`
      <html>
        <body>
          <h2>Authorization Failed</h2>
          <p>${errorDescription || error}</p>
          <p><a href="javascript:window.close()">Close this window</a></p>
        </body>
      </html>
    `);
  }

  if (!code || !state) {
    return c.text("Missing code or state parameter", 400);
  }

  try {
    // Verify state parameter
    const stateData = await c.env.OAUTH_KV.get(`ms_oauth_state:${state}`);
    if (!stateData) {
      throw new Error("Invalid or expired state parameter");
    }

    const { userId } = JSON.parse(stateData);
    
    // Delete state from KV
    await c.env.OAUTH_KV.delete(`ms_oauth_state:${state}`);

    // Exchange code for access token
    const tokenResponse = await exchangeCodeForToken(c, code);

    // Get user information from Microsoft Graph
    const userInfo = await getMicrosoftUserInfo(tokenResponse.access_token);

    // Store Microsoft tokens in KV with user association
    const tokenData = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
      userInfo: {
        id: userInfo.id,
        displayName: userInfo.displayName,
        email: userInfo.mail || userInfo.userPrincipalName
      }
    };

    await c.env.OAUTH_KV.put(
      `ms_tokens:${userId}`,
      JSON.stringify(tokenData),
      { expirationTtl: 90 * 24 * 60 * 60 } // 90 days
    );

    // Return success page
    return c.html(`
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .success { color: #4CAF50; }
            .info { background-color: #f0f0f0; padding: 20px; border-radius: 5px; margin: 20px auto; max-width: 500px; }
          </style>
        </head>
        <body>
          <h2 class="success">✓ Microsoft Authentication Successful</h2>
          <div class="info">
            <p>Authenticated as: <strong>${userInfo.displayName}</strong></p>
            <p>Email: <strong>${userInfo.mail || userInfo.userPrincipalName}</strong></p>
          </div>
          <p>You can now use the email tools in MCP.</p>
          <p><a href="javascript:window.close()">Close this window</a></p>
        </body>
      </html>
    `);

  } catch (error) {
    console.error("Microsoft OAuth callback error:", error);
    return c.html(`
      <html>
        <body>
          <h2>Authentication Error</h2>
          <p>${error instanceof Error ? error.message : "An unknown error occurred"}</p>
          <p><a href="/microsoft/authorize?userId=${c.req.query("userId")}">Try again</a></p>
        </body>
      </html>
    `, 500);
  }
});

/**
 * Redirect to Microsoft OAuth authorization
 */
function redirectToMicrosoft(c: any, state: string): Response {
  const redirectUri = new URL("/microsoft/callback", c.req.url).href;
  
  const authUrl = new URL(MICROSOFT_AUTH_URL);
  authUrl.searchParams.set("client_id", c.env.MS_CLIENT_ID);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", MICROSOFT_SCOPES);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("response_mode", "query");
  authUrl.searchParams.set("prompt", "select_account");
  authUrl.searchParams.set("domain_hint", "consumers"); // Prefer personal accounts

  // Debug logging
  console.log("Microsoft OAuth redirect:", {
    clientId: c.env.MS_CLIENT_ID,
    redirectUri: redirectUri,
    authUrl: authUrl.toString(),
    scopes: MICROSOFT_SCOPES
  });

  return c.redirect(authUrl.toString());
}

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(c: any, code: string): Promise<MicrosoftTokenResponse> {
  const redirectUri = new URL("/microsoft/callback", c.req.url).href;
  
  const tokenParams = new URLSearchParams({
    client_id: c.env.MS_CLIENT_ID,
    client_secret: c.env.MS_CLIENT_SECRET,
    code: code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    scope: MICROSOFT_SCOPES
  });

  const response = await fetch(MICROSOFT_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: tokenParams.toString()
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return await response.json();
}

/**
 * Get user information from Microsoft Graph
 */
async function getMicrosoftUserInfo(accessToken: string): Promise<MicrosoftUserInfo> {
  const response = await fetch(`${MICROSOFT_GRAPH_URL}/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get user info: ${error}`);
  }

  return await response.json();
}

/**
 * Refresh Microsoft access token
 */
export async function refreshMicrosoftToken(
  env: ExtendedEnv,
  refreshToken: string
): Promise<MicrosoftTokenResponse> {
  const tokenParams = new URLSearchParams({
    client_id: env.MS_CLIENT_ID,
    client_secret: env.MS_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    scope: MICROSOFT_SCOPES
  });

  const response = await fetch(MICROSOFT_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: tokenParams.toString()
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return await response.json();
}

/**
 * Get Microsoft tokens for a user
 */
export async function getMicrosoftTokens(
  env: ExtendedEnv,
  userId: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
} | null> {
  const tokenData = await env.OAUTH_KV.get(`ms_tokens:${userId}`);
  
  if (!tokenData) {
    return null;
  }

  const tokens = JSON.parse(tokenData);
  
  // Check if token needs refresh
  if (tokens.refreshToken && Date.now() > tokens.expiresAt - 300000) { // 5 minutes before expiry
    try {
      const newTokens = await refreshMicrosoftToken(env, tokens.refreshToken);
      
      // Update stored tokens
      tokens.accessToken = newTokens.access_token;
      if (newTokens.refresh_token) {
        tokens.refreshToken = newTokens.refresh_token;
      }
      tokens.expiresAt = Date.now() + (newTokens.expires_in * 1000);
      
      await env.OAUTH_KV.put(
        `ms_tokens:${userId}`,
        JSON.stringify(tokens),
        { expirationTtl: 90 * 24 * 60 * 60 }
      );
    } catch (error) {
      console.error("Failed to refresh Microsoft token:", error);
      // Return existing token and let it fail naturally
    }
  }

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt
  };
}

export default app;