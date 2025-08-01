## Purpose
Integrate Firecrawl web scraping and crawling capabilities into the production-ready MCP server infrastructure with GitHub OAuth authentication, maintaining existing security patterns and Cloudflare Workers deployment.

## Core Principles

- **Security First**: Maintain GitHub OAuth authentication while securing Firecrawl API credentials
- **Context is King**: Include ALL necessary Firecrawl API patterns, authentication flows, and MCP tool implementations
- **Validation Loops**: Provide executable tests from TypeScript compilation to Firecrawl API integration
- **Production Ready**: Include monitoring, error handling, and rate limiting for web scraping operations

## Goal
Integrate Firecrawl web scraping capabilities into the existing MCP server infrastructure with:

- Four Firecrawl tools: crawl, scrape, map, and search functionality
- GitHub OAuth authentication maintaining existing security patterns
- Cloudflare Workers deployment with proper API key management
- Rate limiting and error handling for web scraping operations
- Structured markdown output for AI consumption

## Why

- **Developer Productivity**: Enable AI assistants to access and analyze web content through secure MCP tools
- **Enterprise Security**: Maintain GitHub OAuth while protecting Firecrawl API credentials
- **Data Accessibility**: Convert unstructured web content to structured markdown for AI processing
- **Integration**: Seamlessly add web scraping to existing MCP server capabilities
- **User Value**: Provide authenticated users with powerful web content extraction tools

## What

### MCP Server Features

**Core MCP Tools:**

- `crawlWebsite` - Crawl websites and extract content from multiple pages (max 100 pages)
- `scrapePage` - Extract content from single URLs with customizable options
- `mapWebsite` - Generate a sitemap of a website (max 1000 URLs)
- `searchWeb` - Search the web and extract content from results (max 20 results)

All tools follow the modular pattern with registration via `src/tools/register-tools.ts` and implement:

- User authentication context and permission validation
- Comprehensive error handling with rate limit awareness
- Structured markdown output format
- URL validation before API calls
- Content sanitization to prevent script injection

**Authentication & Authorization:**

- Maintains existing GitHub OAuth 2.0 integration
- Firecrawl API key stored as Cloudflare Workers secret (FIRECRAWL_API_KEY)
- User context propagation to all Firecrawl tools
- Operation logging with authenticated user context

**API Integration:**

- Firecrawl API client with automatic retry logic
- Rate limit handling (429) with user-friendly messages
- Quota error handling (402) with clear guidance
- Error message sanitization to prevent API key leakage
- Request/response logging for debugging

**Deployment & Monitoring:**

- Cloudflare Workers environment variable for API key
- Optional Sentry integration for Firecrawl operation tracking
- Structured logging for all web scraping operations
- Performance metrics for API calls

## Success Criteria

- ✅ Firecrawl tools pass validation with MCP Inspector
- ✅ GitHub OAuth flow continues to work with new tools
- ✅ TypeScript compilation succeeds with Firecrawl types
- ✅ Local development server includes Firecrawl endpoints
- ✅ API key is properly secured in Cloudflare Workers
- ✅ Rate limiting prevents API quota exhaustion
- ✅ Error handling provides user-friendly messages for common failures
- ✅ All four Firecrawl tools (crawl, scrape, map, search) function correctly

## Required Context & Documentation

### Critical Files to Reference

- `PRPs/ai_docs/mcp_patterns.md` - Core MCP development patterns and security practices
- `src/tools/register-tools.ts` - Central registry showing modular tool registration approach
- `src/index.ts` - Complete MCP server with authentication patterns to maintain
- `src/auth/github-handler.ts` - OAuth flow that Firecrawl tools must respect
- `src/tools/database-tools.ts` - Example tool implementation patterns to follow

### External Documentation

- [Firecrawl API Documentation](https://docs.firecrawl.dev/introduction)
- [Reference MCP Server](https://github.com/mendableai/firecrawl-mcp-server)
- [Crawl Endpoint](https://docs.firecrawl.dev/api-reference/endpoint/crawl)
- [Scrape Endpoint](https://docs.firecrawl.dev/api-reference/endpoint/scrape)

## Implementation Plan

### Current Codebase Structure

```
/
├── src/
│   ├── index.ts                 # Main authenticated MCP server ← MAINTAIN
│   ├── auth/github-handler.ts   # OAuth implementation ← MAINTAIN PATTERN
│   ├── database/               # Database utilities
│   └── tools/                  # Tool registration system
│       └── register-tools.ts   # Central tool registry ← REGISTER FIRECRAWL
├── wrangler.jsonc              # Cloudflare config ← ADD FIRECRAWL_API_KEY
└── package.json                # Dependencies ← ADD @mendable/firecrawl-js
```

### Target Structure (Files to Create/Modify)

```
/
├── src/
│   └── tools/
│       ├── register-tools.ts   # MODIFY: Import and register Firecrawl tools
│       └── firecrawl-tools.ts  # CREATE: Firecrawl tool implementations
├── wrangler.jsonc              # MODIFY: Add FIRECRAWL_API_KEY to vars
├── .dev.vars                   # MODIFY: Add FIRECRAWL_API_KEY for local dev
└── package.json                # MODIFY: Add @mendable/firecrawl-js dependency
```

## Data Models & Types

### TypeScript Interfaces

```typescript
// Environment interface extension
interface Env {
  // Existing variables
  DATABASE_URL: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  OAUTH_KV: KVNamespace;
  // New Firecrawl variable
  FIRECRAWL_API_KEY: string;
}

// Firecrawl configuration
interface FirecrawlConfig {
  apiKey: string;
  maxRetries: number;
  timeout: number;
}

// User authentication props (from existing codebase)
type Props = {
  login: string; // GitHub username
  name: string; // Display name
  email: string; // Email address
  accessToken: string; // GitHub access token
};
```

### Zod Validation Schemas

```typescript
import { z } from \"zod\";

const CrawlToolSchema = z.object({
  url: z.string().url(\"Invalid URL format\"),
  maxPages: z.number().int().positive().max(100).default(10),
  includeHtml: z.boolean().default(false),
  limit: z.number().int().positive().max(100).optional(),
});

const ScrapeToolSchema = z.object({
  url: z.string().url(\"Invalid URL format\"),
  formats: z.array(z.enum([\"markdown\", \"html\", \"links\"])).default([\"markdown\"]),
  onlyMainContent: z.boolean().default(true),
  waitFor: z.number().int().positive().max(30000).optional(),
});

const MapToolSchema = z.object({
  url: z.string().url(\"Invalid URL format\"),
  search: z.string().optional(),
  limit: z.number().int().positive().max(1000).default(100),
});

const SearchToolSchema = z.object({
  query: z.string().min(1, \"Search query cannot be empty\"),
  limit: z.number().int().positive().max(20).default(5),
  scrapeOptions: z.object({
    formats: z.array(z.enum([\"markdown\", \"html\"])).default([\"markdown\"]),
  }).optional(),
});
```

### Helper Functions

```typescript
// Error response helper function
function createErrorResponse(message: string, details?: any): any {
  return {
    content: [{
      type: \"text\",
      text: `**Error**\
\
${message}${details ? `\
\
**Details:**\
\\`\\`\\`json\
${JSON.stringify(details, null, 2)}\
\\`\\`\\`` : ''}`,
      isError: true
    }]
  };
}
```

## Critical Implementation Patterns

### Firecrawl Client Initialization

```typescript
import FirecrawlApp from '@mendable/firecrawl-js';

const getFirecrawlClient = (apiKey: string) => {
  return new FirecrawlApp({ apiKey });
};
```

### Error Handling with Rate Limits

```typescript
const handleFirecrawlError = (error: any): any => {
  if (error.response?.status === 429) {
    return createErrorResponse(\"Rate limit reached. Please try again later.\");
  }
  if (error.response?.status === 402) {
    return createErrorResponse(\"Firecrawl quota exceeded.\");
  }
  // Never expose API key in error messages
  return createErrorResponse(`Web scraping failed: ${error.message}`);
};
```

### URL Validation

```typescript
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};
```

### Content Sanitization

```typescript
const sanitizeContent = (content: string): string => {
  // Remove potential script tags or malicious content
  return content.replace(/<script\\b[^<]*(?:(?!<\\/script>)<[^<]*)*<\\/script>/gi, '');
};
```

## Complete Tool Implementation

```typescript
// src/tools/firecrawl-tools.ts
import { McpServer } from \"@modelcontextprotocol/sdk/server/mcp.js\";
import { Props } from \"../types\";
import { z } from \"zod\";
import FirecrawlApp from '@mendable/firecrawl-js';

// Import validation schemas
const CrawlToolSchema = z.object({
  url: z.string().url(\"Invalid URL format\"),
  maxPages: z.number().int().positive().max(100).default(10),
  includeHtml: z.boolean().default(false),
});

const ScrapeToolSchema = z.object({
  url: z.string().url(\"Invalid URL format\"),
  formats: z.array(z.enum([\"markdown\", \"html\", \"links\"])).default([\"markdown\"]),
  onlyMainContent: z.boolean().default(true),
  waitFor: z.number().int().positive().max(30000).optional(),
});

const MapToolSchema = z.object({
  url: z.string().url(\"Invalid URL format\"),
  search: z.string().optional(),
  limit: z.number().int().positive().max(1000).default(100),
});

const SearchToolSchema = z.object({
  query: z.string().min(1, \"Search query cannot be empty\"),
  limit: z.number().int().positive().max(20).default(5),
  scrapeOptions: z.object({
    formats: z.array(z.enum([\"markdown\", \"html\"])).default([\"markdown\"]),
  }).optional(),
});

// Helper functions
function createErrorResponse(message: string, details?: any): any {
  return {
    content: [{
      type: \"text\",
      text: `**Error**\
\
${message}${details ? `\
\
**Details:**\
\\`\\`\\`json\
${JSON.stringify(details, null, 2)}\
\\`\\`\\`` : ''}`,
      isError: true
    }]
  };
}

const handleFirecrawlError = (error: any): any => {
  if (error.response?.status === 429) {
    return createErrorResponse(\"Rate limit reached. Please try again later.\");
  }
  if (error.response?.status === 402) {
    return createErrorResponse(\"Firecrawl quota exceeded.\");
  }
  return createErrorResponse(`Web scraping failed: ${error.message}`);
};

const sanitizeContent = (content: string): string => {
  return content.replace(/<script\\b[^<]*(?:(?!<\\/script>)<[^<]*)*<\\/script>/gi, '');
};

export function registerFirecrawlTools(server: McpServer, env: Env, props: Props) {
  const firecrawl = new FirecrawlApp({ apiKey: env.FIRECRAWL_API_KEY });

  // Tool 1: Crawl website
  server.tool(
    \"crawlWebsite\",
    \"Crawl a website and extract content from multiple pages\",
    CrawlToolSchema,
    async ({ url, maxPages, includeHtml }) => {
      try {
        console.log(`User ${props.login} crawling ${url} (max ${maxPages} pages)`);
        
        const result = await firecrawl.crawlUrl(url, {
          limit: maxPages,
          scrapeOptions: {
            formats: includeHtml ? [\"markdown\", \"html\"] : [\"markdown\"],
          },
        });

        if (!result.success) {
          throw new Error(result.error || \"Crawl failed\");
        }

        const pages = result.data || [];
        const content = pages.map((page: any, index: number) => 
          `### Page ${index + 1}: ${page.url}\
\
${sanitizeContent(page.markdown || '')}\
\
---\
`
        ).join('\
');

        return {
          content: [{
            type: \"text\",
            text: `**Crawl Results**\
\
Crawled ${pages.length} pages from ${url}\
\
${content}`,
          }],
        };
      } catch (error) {
        return handleFirecrawlError(error);
      }
    }
  );

  // Tool 2: Scrape single page
  server.tool(
    \"scrapePage\",
    \"Extract content from a single web page\",
    ScrapeToolSchema,
    async ({ url, formats, onlyMainContent, waitFor }) => {
      try {
        console.log(`User ${props.login} scraping ${url}`);
        
        const result = await firecrawl.scrapeUrl(url, {
          formats,
          onlyMainContent,
          waitFor,
        });

        if (!result.success) {
          throw new Error(result.error || \"Scrape failed\");
        }

        const content = sanitizeContent(result.data?.markdown || 'No content extracted');

        return {
          content: [{
            type: \"text\",
            text: `**Scrape Results**\
\
**URL:** ${url}\
\
**Content:**\
\
${content}`,
          }],
        };
      } catch (error) {
        return handleFirecrawlError(error);
      }
    }
  );

  // Tool 3: Map website
  server.tool(
    \"mapWebsite\",
    \"Generate a sitemap of a website\",
    MapToolSchema,
    async ({ url, search, limit }) => {
      try {
        console.log(`User ${props.login} mapping ${url}`);
        
        const result = await firecrawl.mapUrl(url, {
          search,
          limit,
        });

        if (!result.success) {
          throw new Error(result.error || \"Mapping failed\");
        }

        const links = result.data || [];
        const linksList = links.map((link: string) => `- ${link}`).join('\
');

        return {
          content: [{
            type: \"text\",
            text: `**Website Map**\
\
**URL:** ${url}\
**Found:** ${links.length} links\
\
**Links:**\
${linksList}`,
          }],
        };
      } catch (error) {
        return handleFirecrawlError(error);
      }
    }
  );

  // Tool 4: Search web
  server.tool(
    \"searchWeb\",
    \"Search the web and extract content from results\",
    SearchToolSchema,
    async ({ query, limit, scrapeOptions }) => {
      try {
        console.log(`User ${props.login} searching for: ${query}`);
        
        const result = await firecrawl.search(query, {
          limit,
          scrapeOptions,
        });

        if (!result.success) {
          throw new Error(result.error || \"Search failed\");
        }

        const results = result.data || [];
        const content = results.map((item: any, index: number) => 
          `### Result ${index + 1}: ${item.title}\
**URL:** ${item.url}\
\
${sanitizeContent(item.markdown || '')}\
\
---\
`
        ).join('\
');

        return {
          content: [{
            type: \"text\",
            text: `**Search Results for \"${query}\"**\
\
Found ${results.length} results\
\
${content}`,
          }],
        };
      } catch (error) {
        return handleFirecrawlError(error);
      }
    }
  );
}
```

## Reference Implementation Example

```typescript
// Example from src/tools/database-tools.ts showing the pattern to follow
import { McpServer } from \"@modelcontextprotocol/sdk/server/mcp.js\";
import { Props } from \"../types\";
import { z } from \"zod\";
import { withDatabase, validateSqlQuery, isWriteOperation, formatDatabaseError } from \"../database.js\";

const ListTablesSchema = z.object({});
const QueryDatabaseSchema = z.object({
  sql: z.string().min(1, \"SQL query cannot be empty\"),
});

const ALLOWED_USERNAMES = new Set<string>(['Pimmetjeoss']);

export function registerDatabaseTools(server: McpServer, env: Env, props: Props) {
  // Tool 1: Available to all authenticated users
  server.tool(
    \"listTables\",
    \"Get a list of all tables in the database\",
    ListTablesSchema,
    async () => {
      try {
        return await withDatabase(env.DATABASE_URL, async (db) => {
          const result = await db`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
          `;
          
          return {
            content: [{
              type: \"text\",
              text: `**Database Tables**\
\
${result.map(r => `- ${r.table_name}`).join('\
')}`,
            }],
          };
        });
      } catch (error) {
        return createErrorResponse(formatDatabaseError(error));
      }
    }
  );

  // Tool 2: Only for privileged users
  if (ALLOWED_USERNAMES.has(props.login)) {
    server.tool(
      \"executeDatabase\",
      \"Execute any SQL statement (privileged)\",
      QueryDatabaseSchema,
      async ({ sql }) => {
        // Implementation with validation
      }
    );
  }
}
```

## Task Implementation Order

### Task 1: Dependencies & Configuration

1. Install Firecrawl SDK: `npm install @mendable/firecrawl-js`
2. Update `.dev.vars`: Add `FIRECRAWL_API_KEY=your_api_key_here`
3. Update `wrangler.jsonc`: Add `FIRECRAWL_API_KEY = \"placeholder\"` to vars
4. Type check: Run `npm run type-check` to ensure compatibility

### Task 2: Firecrawl Tools Implementation

1. Create `src/tools/firecrawl-tools.ts`: Use the complete implementation provided above
2. Ensure all imports are correct: Verify paths for McpServer, Props, and other dependencies
3. Add error handling: Use the provided helper functions
4. Include user context logging: Log props.login for all operations

### Task 3: Tool Registration

Update `src/tools/register-tools.ts`:

```typescript
import { registerFirecrawlTools } from \"./firecrawl-tools\";

export function registerAllTools(server: McpServer, env: Env, props: Props) {
  // Existing registrations
  registerDatabaseTools(server, env, props);
  
  // Add Firecrawl tools
  registerFirecrawlTools(server, env, props);
}
```

### Task 4: Environment Setup

**Development environment:**

1. Obtain API key from https://firecrawl.dev/dashboard
2. Update `.dev.vars` with actual API key

**Production environment:**

1. Run `wrangler secret put FIRECRAWL_API_KEY`
2. Enter production API key when prompted

### Task 5: Local Testing

1. Start development server: `wrangler dev`
2. Test each tool:
   - `scrapePage` with simple URL (https://example.com)
   - `crawlWebsite` with page limit (max 5 pages)
   - `mapWebsite` for sitemap generation
   - `searchWeb` with basic query

3. Verify error handling:
   - Invalid URLs return friendly errors
   - Rate limits are handled gracefully
   - User context is logged properly

### Task 6: MCP Inspector Validation

1. Run MCP Inspector: `npx @modelcontextprotocol/inspector@latest`
2. Connect to local server: Test connection and authentication
3. Validate each tool:
   - Verify tool descriptions and schemas
   - Test input validation
   - Confirm output format consistency

4. Integration testing:
   - Ensure GitHub OAuth still functions
   - Verify existing database tools unchanged
   - Test concurrent tool usage

## Integration Points

### FIRECRAWL_API

- **API Key Management**: Store securely as Cloudflare Workers secret
- **Rate Limits**: Handle 429 responses with exponential backoff
- **Quotas**: Monitor usage to prevent 402 payment errors
- **Timeouts**: Set reasonable timeouts for long-running operations
- **Response Size**: Be aware of Cloudflare Workers memory limits

### CLOUDFLARE_WORKERS

- **Environment Variables**: Add FIRECRAWL_API_KEY to wrangler.jsonc vars
- **Secrets Management**: Store API key using wrangler secret put
- **Memory Constraints**: Handle large crawl responses appropriately
- **Network Access**: Ensure outbound HTTPS requests are allowed

### GITHUB_OAUTH

- **User Context**: Log authenticated user for all web scraping operations
- **Permission Model**: Maintain existing authentication requirements
- **Session Management**: Ensure Firecrawl tools respect user sessions
- **Rate Limiting**: Consider per-user limits for web scraping operations

### ERROR_HANDLING

- **API Errors**: Translate Firecrawl errors to user-friendly messages
- **Network Errors**: Handle timeouts and connection failures gracefully
- **Content Validation**: Sanitize scraped content before returning
- **Security**: Never expose API keys or sensitive data in error messages

## Validation Gates

### Level 1: Configuration & Dependencies

```bash
# Verify package installation
npm list @mendable/firecrawl-js
# Expected: Package version displayed

# Check TypeScript compilation
npm run type-check
# Expected: No TypeScript errors

# Verify environment configuration
cat .dev.vars | grep FIRECRAWL_API_KEY
# Expected: API key present
```

### Level 2: API Connectivity

```bash
# Test API key validity (optional)
curl -X POST https://api.firecrawl.dev/v1/scrape \\
  -H \"Authorization: Bearer YOUR_API_KEY\" \\
  -H \"Content-Type: application/json\" \\
  -d '{\"url\": \"https://example.com\"}'
# Expected: Successful response with scraped content
```

### Level 3: Local Integration

```bash
# Start development server
wrangler dev
# Expected: Server starts without errors, Firecrawl tools registered

# Test via MCP protocol
curl -X POST http://localhost:8792/mcp \\
  -H \"Content-Type: application/json\" \\
  -d '{
    \"method\": \"tools/call\",
    \"params\": {
      \"name\": \"scrapePage\",
      \"arguments\": {\"url\": \"https://example.com\"}
    }
  }'
# Expected: Markdown content from example.com
```

### Level 4: MCP Inspector Comprehensive Testing

```bash
# Use MCP Inspector for full validation
npx @modelcontextprotocol/inspector@latest
# Test sequence:
# 1. Connect to local MCP server
# 2. Verify all four tools appear (crawl, scrape, map, search)
# 3. Test each tool with valid inputs
# 4. Verify error handling with invalid inputs
# 5. Confirm user authentication is maintained
```

## Critical Gotchas & Anti-Patterns

### Security Considerations

- ❌ Never expose API key in error messages, logs, or client responses
- ❌ Don't skip URL validation - malformed URLs can cause API failures
- ❌ Don't ignore content sanitization - scraped content may contain malicious scripts
- ❌ Never modify existing auth flows - maintain GitHub OAuth integrity

### Performance & Reliability

- ❌ Don't allow unlimited crawling - always enforce maxPages limits (≤100)
- ❌ Don't ignore rate limits - implement proper 429 error handling
- ❌ Don't skip timeout handling - web scraping can be slow
- ❌ Don't forget memory limits - Cloudflare Workers have response size constraints

### Integration Guidelines

- ❌ Don't modify existing database tools when adding Firecrawl capabilities
- ❌ Don't skip tool registration in the central registry
- ❌ Don't change authentication patterns - follow existing OAuth implementation
- ❌ Don't ignore error propagation - ensure all errors are properly handled and logged

## Final Success Checklist

### Core Functionality
- [ ] **TypeScript compilation**: `npm run type-check` passes without errors
- [ ] **Firecrawl SDK installed**: `@mendable/firecrawl-js` appears in package.json
- [ ] **API key configured**: `FIRECRAWL_API_KEY` properly set in .dev.vars
- [ ] **All tools registered**: crawl, scrape, map, search appear in MCP Inspector
- [ ] **Error handling functional**: Invalid URLs return user-friendly errors
- [ ] **Rate limiting handled**: 429 errors return appropriate retry messages
- [ ] **Authentication preserved**: GitHub OAuth continues to function normally

### Integration Verification  
- [ ] **Tool isolation**: Existing database tools remain unchanged
- [ ] **User context**: All Firecrawl operations log authenticated user
- [ ] **Content safety**: Scraped content is sanitized before return
- [ ] **Resource limits**: Page/result limits are properly enforced
- [ ] **Production readiness**: Secrets configured for deployment
- [ ] **Documentation**: All tools have clear descriptions and examples

This PRP provides a comprehensive blueprint for integrating Firecrawl web scraping capabilities into the existing MCP server while maintaining security, reliability, and compatibility with the current authentication and deployment infrastructure.