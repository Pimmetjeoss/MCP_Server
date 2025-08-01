import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { 
  Props, 
  SendEmailSchema,
  EmailRecipient,
  EmailMessage,
  createSuccessResponse,
  createErrorResponse
} from "../types";
import { getMicrosoftTokens } from "../auth/microsoft-handler";

const ALLOWED_USERNAMES = new Set<string>([
  // Add GitHub usernames of users who should have access to email functionality
  // For example: 'yourusername', 'coworkerusername'
  'Pimmetjeoss'
]);

/**
 * Register email-related tools for the MCP server
 * These tools require Microsoft OAuth authentication
 */
export function registerEmailTools(server: McpServer, env: Env, props: Props) {
  // Check if user has email permissions
  if (!ALLOWED_USERNAMES.has(props.login)) {
    console.log(`Email tools not registered for user: ${props.login} (not in ALLOWED_USERNAMES)`);
    return;
  }
  
  console.log(`Registering email tools for authorized user: ${props.login}`);
  // Register sendEmail tool
  server.tool(
    "sendEmail",
    "Send an email using Microsoft Graph API (Outlook)",
    SendEmailSchema as any,
    async ({ to, cc, bcc, subject, body, importance = "normal", saveToSentItems = true }: {
      to: string;
      cc?: string;
      bcc?: string;
      subject: string;
      body: string;
      importance?: "low" | "normal" | "high";
      saveToSentItems?: boolean;
    }) => {
      try {
        // Try to get Microsoft tokens from props first, then from KV
        let microsoftAccessToken = props.microsoftAccessToken;
        let tokenExpiry = props.microsoftTokenExpiry;
        
        console.log("Email tool - checking Microsoft auth:", {
          hasTokenInProps: !!props.microsoftAccessToken,
          username: props.login,
          kvKey: `ms_tokens:${props.login}`
        });
        
        // If not in props, try to fetch from KV storage
        if (!microsoftAccessToken) {
          console.log("No token in props, fetching from KV for user:", props.login);
          
          // Try both the exact username and lowercase version
          let tokens = await getMicrosoftTokens(env as any, props.login);
          if (!tokens && props.login !== props.login.toLowerCase()) {
            console.log("Trying lowercase username:", props.login.toLowerCase());
            tokens = await getMicrosoftTokens(env as any, props.login.toLowerCase());
          }
          
          console.log("Fetched tokens from KV:", !!tokens);
          if (tokens) {
            microsoftAccessToken = tokens.accessToken;
            tokenExpiry = tokens.expiresAt;
            console.log("Found Microsoft token, expires at:", new Date(tokens.expiresAt));
          }
        }
        
        // Check if user has Microsoft authentication
        if (!microsoftAccessToken) {
          return createErrorResponse(
            "Microsoft authentication required",
            {
              message: "Please authenticate with Microsoft to use email functionality",
              authUrl: `/microsoft/authorize?userId=${props.login}`
            }
          );
        }

        // Check if token is expired
        if (tokenExpiry && Date.now() > tokenExpiry) {
          return createErrorResponse(
            "Microsoft token expired",
            {
              message: "Your Microsoft authentication has expired. Please re-authenticate.",
              authUrl: `/microsoft/authorize?userId=${props.login}`
            }
          );
        }

        // Format recipients
        const toRecipients = formatRecipients(to);
        const ccRecipients = cc ? formatRecipients(cc) : [];
        const bccRecipients = bcc ? formatRecipients(bcc) : [];

        // Validate email addresses
        const invalidEmails = validateEmailAddresses([
          ...toRecipients.map(r => r.emailAddress.address),
          ...ccRecipients.map(r => r.emailAddress.address),
          ...bccRecipients.map(r => r.emailAddress.address)
        ]);

        if (invalidEmails.length > 0) {
          return createErrorResponse(
            "Invalid email addresses detected",
            { invalidEmails }
          );
        }

        // Prepare email object
        const emailObject: EmailMessage = {
          message: {
            subject,
            body: {
              contentType: body.includes('<html') ? 'html' : 'text',
              content: body
            },
            toRecipients,
            ccRecipients: ccRecipients.length > 0 ? ccRecipients : undefined,
            bccRecipients: bccRecipients.length > 0 ? bccRecipients : undefined,
            importance: importance as "low" | "normal" | "high"
          },
          saveToSentItems
        };

        // Make API call to send email
        const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${microsoftAccessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(emailObject)
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Microsoft Graph API error: ${response.status} - ${error}`);
        }

        const recipientCount = toRecipients.length + ccRecipients.length + bccRecipients.length;
        
        return createSuccessResponse(
          `Email sent successfully to ${recipientCount} recipient(s)`,
          {
            subject,
            recipients: {
              to: toRecipients.length,
              cc: ccRecipients.length,
              bcc: bccRecipients.length
            },
            messageLength: body.length,
            importance,
            savedToSentItems: saveToSentItems
          }
        );

      } catch (error) {
        console.error(`Error sending email:`, error);
        return createErrorResponse(
          "Failed to send email",
          { error: error instanceof Error ? error.message : String(error) }
        );
      }
    }
  );
}

/**
 * Format comma-separated email addresses into EmailRecipient array
 */
function formatRecipients(emails: string): EmailRecipient[] {
  return emails.split(',').map(email => ({
    emailAddress: {
      address: email.trim()
    }
  }));
}

/**
 * Validate email addresses
 */
function validateEmailAddresses(emails: string[]): string[] {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emails.filter(email => !emailRegex.test(email));
}

