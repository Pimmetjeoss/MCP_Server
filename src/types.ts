import { z } from "zod";
import type { AuthRequest, OAuthHelpers, ClientInfo } from "@cloudflare/workers-oauth-provider";

// User context passed through OAuth
export type Props = {
  login: string;
  name: string;
  email: string;
  accessToken: string;
  // Microsoft OAuth tokens (optional)
  microsoftAccessToken?: string;
  microsoftRefreshToken?: string;
  microsoftTokenExpiry?: number;
};

// Extended environment with OAuth provider
export type ExtendedEnv = Env & { OAUTH_PROVIDER: OAuthHelpers };

// Environment type with all bindings
declare global {
  interface Env {
    // OAuth and KV bindings
    OAUTH_KV: KVNamespace;
    MCP_OBJECT: DurableObjectNamespace;
    
    // Database
    DATABASE_URL: string;
    
    // GitHub OAuth
    GITHUB_CLIENT_ID: string;
    GITHUB_CLIENT_SECRET: string;
    COOKIE_ENCRYPTION_KEY: string;
    
    // Optional Sentry
    SENTRY_DSN?: string;
    
    // AI binding
    AI: any;
    
    // Sequential thinking
    DISABLE_THOUGHT_LOGGING?: string;
    
    // Firecrawl API key
    FIRECRAWL_API_KEY: string;
    
    // Microsoft OAuth
    MS_CLIENT_ID: string;
    MS_CLIENT_SECRET: string;
    MS_TENANT_ID?: string;
  }
}

// OAuth URL construction parameters
export interface UpstreamAuthorizeParams {
  upstream_url: string;
  client_id: string;
  scope: string;
  redirect_uri: string;
  state?: string;
}

// OAuth token exchange parameters
export interface UpstreamTokenParams {
  code: string | undefined;
  upstream_url: string;
  client_secret: string;
  redirect_uri: string;
  client_id: string;
}

// Approval dialog configuration
export interface ApprovalDialogOptions {
  client: ClientInfo | null;
  server: {
    name: string;
    logo?: string;
    description?: string;
  };
  state: Record<string, any>;
  cookieName?: string;
  cookieSecret?: string | Uint8Array;
  cookieDomain?: string;
  cookiePath?: string;
  cookieMaxAge?: number;
}

// Result of parsing approval form
export interface ParsedApprovalResult {
  state: any;
  headers: Record<string, string>;
}

// MCP tool schemas using Zod
export const ListTablesSchema = {};

export const QueryDatabaseSchema = {
  sql: z
    .string()
    .min(1, "SQL query cannot be empty")
    .describe("SQL query to execute (SELECT queries only)"),
};

export const ExecuteDatabaseSchema = {
  sql: z
    .string()
    .min(1, "SQL command cannot be empty")
    .describe("SQL command to execute (INSERT, UPDATE, DELETE, CREATE, etc.)"),
};

// MCP response types
export interface McpTextContent {
  type: "text";
  text: string;
  isError?: boolean;
}

export interface McpResponse {
  content: McpTextContent[];
}

// Standard response creators
export function createSuccessResponse(message: string, data?: any): McpResponse {
  let text = `**Success**\n\n${message}`;
  if (data !== undefined) {
    text += `\n\n**Result:**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
  }
  return {
    content: [{
      type: "text",
      text,
    }],
  };
}

export function createErrorResponse(message: string, details?: any): McpResponse {
  let text = `**Error**\n\n${message}`;
  if (details !== undefined) {
    text += `\n\n**Details:**\n\`\`\`json\n${JSON.stringify(details, null, 2)}\n\`\`\``;
  }
  return {
    content: [{
      type: "text",
      text,
      isError: true,
    }],
  };
}

// Database operation result type
export interface DatabaseOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  duration?: number;
}

// SQL validation result
export interface SqlValidationResult {
  isValid: boolean;
  error?: string;
}

// Email schemas
export const SendEmailSchema = {
  to: z
    .string()
    .min(1, "Recipients (to) cannot be empty")
    .describe("Comma-separated list of email recipients"),
  cc: z
    .string()
    .optional()
    .describe("Comma-separated list of CC recipients"),
  bcc: z
    .string()
    .optional()
    .describe("Comma-separated list of BCC recipients"),
  subject: z
    .string()
    .min(1, "Subject cannot be empty")
    .describe("Email subject line"),
  body: z
    .string()
    .min(1, "Email body cannot be empty")
    .describe("Email body content (HTML or plain text)"),
  importance: z
    .enum(["low", "normal", "high"])
    .optional()
    .default("normal")
    .describe("Email importance level"),
  saveToSentItems: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether to save email to sent items"),
};


// Microsoft Graph API types
export interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface MicrosoftUserInfo {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
}

export interface EmailRecipient {
  emailAddress: {
    address: string;
    name?: string;
  };
}

export interface EmailMessage {
  message: {
    subject: string;
    body: {
      contentType: "text" | "html";
      content: string;
    };
    toRecipients: EmailRecipient[];
    ccRecipients?: EmailRecipient[];
    bccRecipients?: EmailRecipient[];
    importance?: "low" | "normal" | "high";
  };
  saveToSentItems?: boolean;
}

// Re-export external types that are used throughout
export type { AuthRequest, OAuthHelpers, ClientInfo };