## Purpose

Template for AI agents to integrate Firecrawl web scraping and crawling capabilities into the production-ready MCP server infrastructure with GitHub OAuth authentication, maintaining existing security patterns and Cloudflare Workers deployment.

## Core Principles

- **Context is King**: Include ALL necessary Firecrawl API patterns, authentication flows, and MCP tool implementations
- **Validation Loops**: Provide executable tests from TypeScript compilation to Firecrawl API integration
- **Security First**: Maintain GitHub OAuth authentication while securing Firecrawl API credentials
- **Production Ready**: Include monitoring, error handling, and rate limiting for web scraping operations

## Goal

Integrate Firecrawl web scraping capabilities into the existing MCP server infrastructure with:

- **Firecrawl tools**: crawl, scrape, map, and search functionality
- **GitHub OAuth authentication** maintaining existing security patterns
- **Cloudflare Workers deployment** with proper API key management
- **Rate limiting and error handling** for web scraping operations
- **Structured markdown output** for AI consumption

## Why

- **Developer Productivity**: Enable AI assistants to access and analyze web content through secure MCP tools
- **Enterprise Security**: Maintain GitHub OAuth while protecting Firecrawl API credentials
- **Data Accessibility**: Convert unstructured web content to structured markdown for AI processing
- **Integration**: Seamlessly add web scraping to existing MCP server capabilities
- **User Value**: Provide authenticated users with powerful web content extraction tools

## What

### MCP Server Features

#### Core MCP Tools:

- Tools follow the modular pattern with registration via `src/tools/register-tools.ts`
- Firecrawl tools get their own registration file: `src/tools/firecrawl-tools.ts`
- **crawl** - Crawl websites and extract content from multiple pages
- **scrape** - Extract content from single URLs with customizable options
- **map** - Generate a sitemap of a website
- **search** - Search the web and extract content from results
- All tools maintain user authentication context and permission validation
- Comprehensive error handling with rate limit awareness
- Structured markdown output format

#### Authentication & Authorization:

- Maintains existing GitHub OAuth 2.0 integration
- Firecrawl API key stored as Cloudflare Workers secret
- User context propagation to all Firecrawl tools
- Optional per-user rate limiting based on GitHub username

#### API Integration:

- Firecrawl API client with automatic retry logic
- Rate limit handling with exponential backoff
- Error message sanitization to prevent API key leakage
- Request/response logging for debugging

#### Deployment & Monitoring:

- Cloudflare Workers environment variable for API key
- Optional Sentry integration for Firecrawl operation tracking
- Structured logging for all web scraping operations
- Performance metrics for API calls

## Success Criteria

- [ ] Firecrawl tools pass validation with MCP Inspector
- [ ] GitHub OAuth flow continues to work with new tools
- [ ] TypeScript compilation succeeds with Firecrawl types
- [ ] Local development server includes Firecrawl endpoints
- [ ] API key is properly secured in Cloudflare Workers
- [ ] Rate limiting prevents API quota exhaustion
- [ ] Error handling provides user-friendly messages for common failures
- [ ] All four Firecrawl tools (crawl, scrape, map, search) function correctly

## All Needed Context

### Documentation & References (MUST READ)

```yaml
# CRITICAL MCP PATTERNS - Read these first
- docfile: PRPs/ai_docs/mcp_patterns.md
  why: Core MCP development patterns, security practices, and error handling

# TOOL REGISTRATION SYSTEM - Understand the modular approach
- file: src/tools/register-tools.ts
  why: Central registry showing how all tools are imported and registered

# EXAMPLE MCP TOOLS - Study implementation patterns
- file: examples/database-tools.ts
  why: Example showing best practices for tool creation with permissions

# EXISTING CODEBASE PATTERNS - Study these implementations
- file: src/index.ts
  why: Complete MCP server with authentication - ADD Firecrawl tools here

- file: src/github-handler.ts
  why: OAuth flow - Firecrawl tools must respect this authentication

# FIRECRAWL DOCUMENTATION
- url: https://docs.firecrawl.dev/introduction
  why: Official Firecrawl API documentation for implementation details

- url: https://github.com/mendableai/firecrawl-mcp-server
  why: Reference implementation of Firecrawl MCP server

- url: https://docs.firecrawl.dev/api-reference/endpoint/crawl
  why: Crawl endpoint documentation with parameters

- url: https://docs.firecrawl.dev/api-reference/endpoint/scrape
  why: Scrape endpoint documentation with options
```

### Current Codebase Tree

```bash
/
├── src/
│   ├── index.ts                 # Main authenticated MCP server ← ADD FIRECRAWL HERE
│   ├── index_sentry.ts         # Sentry monitoring version
│   ├── github-handler.ts       # OAuth implementation ← MAINTAIN PATTERN
│   ├── database.ts             # Database utilities
│   └── tools/                  # Tool registration system
│       └── register-tools.ts   # Central tool registry ← REGISTER FIRECRAWL
├── examples/                   # Example tool implementations
│   └── database-tools.ts       # Database tools example ← FOLLOW PATTERN
├── wrangler.jsonc              # Cloudflare config ← ADD FIRECRAWL_API_KEY
└── package.json                # Dependencies ← ADD @mendable/firecrawl-js
```

### Desired Codebase Tree (Files to add/modify)

```bash
/
├── src/
│   └── tools/
│       ├── register-tools.ts   # MODIFY: Import and register Firecrawl tools
│       └── firecrawl-tools.ts  # CREATE: Firecrawl tool implementations
├── wrangler.jsonc              # MODIFY: Add FIRECRAWL_API_KEY to vars
├── .dev.vars                   # MODIFY: Add FIRECRAWL_API_KEY for local dev
└── package.json                # MODIFY: Add @mendable/firecrawl-js dependency
```

## Known Gotchas & Critical Firecrawl Patterns

```typescript
// CRITICAL: Firecrawl-specific patterns for Cloudflare Workers
// 1. ALWAYS initialize Firecrawl client with API key from environment
import FirecrawlApp from '@mendable/firecrawl-js';

const getFirecrawlClient = (apiKey: string) => {
  return new FirecrawlApp({ apiKey });
};

// 2. ALWAYS handle rate limits with proper error responses
const handleFirecrawlError = (error: any): any => {
  if (error.response?.status === 429) {
    return createErrorResponse(\"Rate limit reached. Please try again later.\");
  }
  if (error.response?.status === 402) {
    return createErrorResponse(\"Firecrawl quota exceeded.\");
  }
  return createErrorResponse(`Web scraping failed: ${error.message}`);
};

// 3. ALWAYS validate URLs before sending to Firecrawl
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// 4. ALWAYS sanitize Firecrawl responses to prevent injection
const sanitizeContent = (content: string): string => {
  // Remove any potential script tags or malicious content
  return content.replace(/<script\\b[^<]*(?:(?!<\\/script>)<[^<]*)*<\\/script>/gi, '');
};

// 5. ALWAYS use Zod schemas for Firecrawl tool inputs
const CrawlSchema = z.object({
  url: z.string().url(\"Invalid URL format\"),
  maxPages: z.number().int().positive().max(100).default(10),
  includeHtml: z.boolean().default(false),
});
```

## Implementation Blueprint

### Data Models & Types

Define TypeScript interfaces and Zod schemas for Firecrawl integration.

```typescript
// Firecrawl-specific types
interface FirecrawlConfig {
  apiKey: string;
  maxRetries: number;
  timeout: number;
}

// Tool input schemas
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

// Environment interface update
interface Env {
  // Existing environment variables
  DATABASE_URL: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  OAUTH_KV: KVNamespace;
  // New Firecrawl variable
  FIRECRAWL_API_KEY: string;
}
```

## List of Tasks (Complete in order)

### Task 1 - Dependencies & Configuration

**INSTALL Firecrawl SDK:**
- RUN: `npm install @mendable/firecrawl-js`
- RUN: `npm install --save-dev @types/node` (if needed for types)

**UPDATE .dev.vars:**
- ADD: `FIRECRAWL_API_KEY=your_api_key_here`
- KEEP: All existing OAuth and database variables

**UPDATE wrangler.jsonc:**
- ADD to vars section: `FIRECRAWL_API_KEY = \"placeholder\"`
- KEEP: All existing configuration intact

### Task 2 - Firecrawl Tools Implementation

**CREATE src/tools/firecrawl-tools.ts:**
- IMPORT FirecrawlApp from '@mendable/firecrawl-js'
- IMPLEMENT crawl tool with CrawlToolSchema validation
- IMPLEMENT scrape tool with ScrapeToolSchema validation
- IMPLEMENT map tool with MapToolSchema validation
- IMPLEMENT search tool with SearchToolSchema validation
- USE existing error handling patterns from database-tools.ts
- ADD rate limit handling for all tools

### Task 3 - Tool Registration

**UPDATE src/tools/register-tools.ts:**
- IMPORT registerFirecrawlTools from './firecrawl-tools'
- ADD registerFirecrawlTools(server, env, props) to registerAllTools
- MAINTAIN existing tool registration order

### Task 4 - Environment Setup

**SET Firecrawl API key for development:**
- GET API key from https://firecrawl.dev/dashboard
- UPDATE .dev.vars with actual API key

**SET production secret:**
- RUN: `wrangler secret put FIRECRAWL_API_KEY`
- ENTER your production API key when prompted

### Task 5 - Type Safety

**UPDATE TypeScript types:**
- RUN: `npm run type-check`
- FIX any type errors related to Firecrawl integration
- ENSURE all Zod schemas are properly typed

### Task 6 - Local Testing

**TEST Firecrawl integration:**
- RUN: `wrangler dev`
- TEST scrape tool with a simple URL
- TEST crawl tool with page limit
- VERIFY markdown output format
- CHECK error handling for invalid URLs

### Task 7 - MCP Inspector Validation

**VALIDATE with MCP Inspector:**
- RUN: `npx @modelcontextprotocol/inspector@latest`
- CONNECT to local MCP server
- TEST all four Firecrawl tools
- VERIFY tool descriptions and schemas

## Per Task Implementation Details

### Task 2 - Firecrawl Tools Implementation (src/tools/firecrawl-tools.ts)

```typescript
import { McpServer } from \"@modelcontextprotocol/sdk/server/mcp.js\";
import { Props } from \"../types\";
import { z } from \"zod\";
import FirecrawlApp from '@mendable/firecrawl-js';

// Tool schemas
const CrawlToolSchema = z.object({
  url: z.string().url(\"Invalid URL format\"),
  maxPages: z.number().int().positive().max(100).default(10),
  includeHtml: z.boolean().default(false),
});

// Additional schemas...

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

        return {
          content: [{
            type: \"text\",
            text: `**Crawl Results**\
\
Crawled ${result.data?.length || 0} pages from ${url}\
\
${
              result.data?.map((page: any, index: number) => 
                `### Page ${index + 1}: ${page.url}\
\
${page.markdown}\
\
---\
`
              ).join('\
')
            }`,
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

        return {
          content: [{
            type: \"text\",
            text: `**Scrape Results**\
\
**URL:** ${url}\
\
**Content:**\
\
${result.data?.markdown || 'No content extracted'}`,
          }],
        };
      } catch (error) {
        return handleFirecrawlError(error);
      }
    }
  );

  // Additional tools implementation...
}

// Error handling helper
function handleFirecrawlError(error: any): any {
  if (error.response?.status === 429) {
    return {
      content: [{
        type: \"text\",
        text: \"**Error**\
\
Rate limit reached. Please try again later.\",
        isError: true,
      }],
    };
  }
  
  return {
    content: [{
      type: \"text\",
      text: `**Error**\
\
Web scraping failed: ${error.message}`,
      isError: true,
    }],
  };
}
```

### Task 3 - Update Tool Registry (src/tools/register-tools.ts)

```typescript
import { registerFirecrawlTools } from \"./firecrawl-tools\";

export function registerAllTools(server: McpServer, env: Env, props: Props) {
  // Existing registrations
  registerDatabaseTools(server, env, props);
  
  // Add Firecrawl tools
  registerFirecrawlTools(server, env, props);
}
```

## Integration Points

### FIRECRAWL_API:
- **API Key**: Store as Cloudflare Workers secret
- **Rate Limits**: Handle 429 responses gracefully
- **Quotas**: Monitor usage to prevent 402 payment required errors
- **Timeouts**: Set reasonable timeouts for long-running crawls

### CLOUDFLARE_WORKERS:
- **wrangler.jsonc**: Add FIRECRAWL_API_KEY to vars
- **Environment secrets**: Store API key securely
- **Memory limits**: Be aware of response size for large crawls

### GITHUB_OAUTH:
- **User context**: Log which user is performing web scraping
- **Permissions**: Consider adding web scraping permissions if needed
- **Rate limiting**: Implement per-user limits if required

### ERROR_HANDLING:
- **API errors**: Translate Firecrawl errors to user-friendly messages
- **Network errors**: Handle timeouts and connection issues
- **Content errors**: Validate and sanitize scraped content

## Validation Gate

### Level 1: TypeScript & Configuration

```bash
# CRITICAL: Ensure Firecrawl types are resolved
npm install @mendable/firecrawl-js
npm run type-check

# Expected: No TypeScript errors
# If errors: Check Firecrawl import, add missing types
```

### Level 2: API Configuration

```bash
# Verify API key is set
cat .dev.vars | grep FIRECRAWL_API_KEY

# Test API key validity (optional)
curl -X POST https://api.firecrawl.dev/v1/scrape \\
  -H \"Authorization: Bearer YOUR_API_KEY\" \\
  -H \"Content-Type: application/json\" \\
  -d '{\"url\": \"https://example.com\"}'

# Expected: API key present, API responds with success
# If errors: Get API key from Firecrawl dashboard
```

### Level 3: Local Integration Testing

```bash
# Start server with Firecrawl tools
wrangler dev

# Test scrape tool via MCP
curl -X POST http://localhost:8792/mcp \\
  -H \"Content-Type: application/json\" \\
  -d '{
    \"method\": \"tools/call\",
    \"params\": {
      \"name\": \"scrapePage\",
      \"arguments\": {
        \"url\": \"https://example.com\"
      }
    }
  }'

# Expected: Markdown content from example.com
# If errors: Check API key, network access, tool registration
```

### Level 4: MCP Inspector Testing

```bash
# Use MCP Inspector for comprehensive testing
npx @modelcontextprotocol/inspector@latest

# Test each tool:
# 1. crawlWebsite - with maxPages limit
# 2. scrapePage - with different formats
# 3. mapWebsite - generate sitemap
# 4. searchWeb - test search queries

# Expected: All tools visible and functional
# If errors: Check tool registration, schema validation
```

## Final Validation Checklist

### Core Functionality

- [ ] **TypeScript compilation**: `npm run type-check` passes
- [ ] **Firecrawl SDK installed**: `@mendable/firecrawl-js` in package.json
- [ ] **API key configured**: `FIRECRAWL_API_KEY` in .dev.vars
- [ ] **All four tools registered**: crawl, scrape, map, search appear in MCP
- [ ] **Error handling works**: Invalid URLs return friendly errors
- [ ] **Rate limiting handled**: 429 errors return appropriate messages
- [ ] **Authentication maintained**: GitHub OAuth still functions

## Anti-Patterns to Avoid

### Firecrawl-Specific

❌ Don't expose API key in error messages or logs  
❌ Don't allow unlimited crawling - always set maxPages limits  
❌ Don't skip URL validation - malformed URLs can cause issues  
❌ Don't ignore rate limits - implement exponential backoff  

### Integration Process

❌ Don't modify existing authentication flows  
❌ Don't change database tools when adding Firecrawl  
❌ Don't skip content sanitization - scraped content may contain scripts  
❌ Don't forget to handle large responses - Cloudflare has memory limits  `,
  `message`: `Convert document to structured Markdown format`
