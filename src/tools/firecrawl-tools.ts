import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Props, createErrorResponse } from "../types";
import { z } from "zod";
import FirecrawlApp from '@mendable/firecrawl-js';

const ALLOWED_USERNAMES = new Set<string>([
	// Add GitHub usernames of users who should have access to Firecrawl operations
	// For example: 'yourusername', 'coworkerusername'
	'Pimmetjeoss'
]);

// Configuration for retries and monitoring
const CONFIG = {
  retry: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
  },
  credit: {
    warningThreshold: 1000,
    criticalThreshold: 100,
  },
};

// Helper function for delays
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retry logic with exponential backoff
async function withRetry<T>(
  operation: () => Promise<T>,
  context: string,
  attempt = 1
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const isRateLimit = error instanceof Error && 
      (error.message.includes('rate limit') || 
       error.message.includes('429') ||
       (error as any).response?.status === 429);

    if (isRateLimit && attempt < CONFIG.retry.maxAttempts) {
      const delayMs = Math.min(
        CONFIG.retry.initialDelay * Math.pow(CONFIG.retry.backoffFactor, attempt - 1),
        CONFIG.retry.maxDelay
      );

      console.log(`Rate limit hit for ${context}. Attempt ${attempt}/${CONFIG.retry.maxAttempts}. Retrying in ${delayMs}ms`);
      await delay(delayMs);
      return withRetry(operation, context, attempt + 1);
    }

    throw error;
  }
}

// Validation schemas
const CrawlToolSchema = {
  url: z.string().url("Invalid URL format"),
  excludePaths: z.array(z.string()).optional(),
  includePaths: z.array(z.string()).optional(),
  maxDepth: z.number().int().positive().max(10).optional(),
  ignoreSitemap: z.boolean().default(false).optional(),
  limit: z.number().int().positive().max(1000).default(50),
  allowBackwardLinks: z.boolean().default(false).optional(),
  allowExternalLinks: z.boolean().default(false).optional(),
  webhook: z.union([
    z.string().url(),
    z.object({
      url: z.string().url(),
      headers: z.record(z.string()).optional(),
    })
  ]).optional(),
  deduplicateSimilarURLs: z.boolean().default(true).optional(),
  ignoreQueryParameters: z.boolean().default(false).optional(),
  scrapeOptions: z.object({
    formats: z.array(z.enum([
      "markdown", 
      "html", 
      "rawHtml", 
      "screenshot", 
      "links", 
      "screenshot@fullPage", 
      "extract"
    ])).default(["markdown"]).optional(),
    onlyMainContent: z.boolean().default(true).optional(),
    includeTags: z.array(z.string()).optional(),
    excludeTags: z.array(z.string()).optional(),
    waitFor: z.number().int().positive().max(60000).optional(),
  }).optional(),
};

const ScrapeToolSchema = {
  url: z.string().url("Invalid URL format"),
  formats: z.array(z.enum([
    "markdown", 
    "html", 
    "rawHtml", 
    "screenshot", 
    "links", 
    "screenshot@fullPage", 
    "extract"
  ])).default(["markdown"]),
  onlyMainContent: z.boolean().default(true).optional(),
  includeTags: z.array(z.string()).optional(),
  excludeTags: z.array(z.string()).optional(),
  waitFor: z.number().int().positive().max(60000).optional(),
  timeout: z.number().int().positive().max(180000).optional(),
  actions: z.array(z.object({
    type: z.enum([
      "wait", 
      "click", 
      "screenshot", 
      "write", 
      "press", 
      "scroll", 
      "scrape", 
      "executeJavascript"
    ]),
    selector: z.string().optional(),
    milliseconds: z.number().int().positive().optional(),
    text: z.string().optional(),
    key: z.string().optional(),
    direction: z.enum(["up", "down"]).optional(),
    script: z.string().optional(),
    fullPage: z.boolean().optional(),
  }).refine((action) => {
    // Validate required fields based on action type
    if (action.type === "wait" && !action.milliseconds) return false;
    if (["click", "write", "press"].includes(action.type) && !action.selector) return false;
    if (action.type === "write" && !action.text) return false;
    if (action.type === "press" && !action.key) return false;
    if (action.type === "scroll" && !action.direction) return false;
    if (action.type === "executeJavascript" && !action.script) return false;
    return true;
  }, {
    message: "Action missing required fields for its type"
  })).optional(),
  extract: z.object({
    schema: z.object({}).passthrough().optional(),
    systemPrompt: z.string().optional(),
    prompt: z.string().optional(),
  }).optional(),
  mobile: z.boolean().default(false).optional(),
  skipTlsVerification: z.boolean().default(false).optional(),
  removeBase64Images: z.boolean().default(false).optional(),
  location: z.object({
    country: z.string().optional(),
    languages: z.array(z.string()).optional(),
  }).optional(),
  maxAge: z.number().int().nonnegative().optional(),
};

const MapToolSchema = {
  url: z.string().url("Invalid URL format"),
  search: z.string().optional(),
  ignoreSitemap: z.boolean().default(false).optional(),
  sitemapOnly: z.boolean().default(false).optional(),
  includeSubdomains: z.boolean().default(false).optional(),
  limit: z.number().int().positive().max(5000).default(100),
};

const CrawlJobStatusSchema = {
  jobId: z.string().min(1, "Job ID cannot be empty"),
};

const SearchToolSchema = {
  query: z.string().min(1, "Search query cannot be empty"),
  limit: z.number().int().positive().max(20).default(5),
  lang: z.string().optional(),
  country: z.string().optional(),
  tbs: z.string().optional(),
  filter: z.string().optional(),
  location: z.object({
    country: z.string().optional(),
    languages: z.array(z.string()).optional(),
  }).optional(),
  scrapeOptions: z.object({
    formats: z.array(z.enum(["markdown", "html", "rawHtml"])).default(["markdown"]),
    onlyMainContent: z.boolean().default(true).optional(),
    waitFor: z.number().int().positive().max(60000).optional(),
    includeTags: z.array(z.string()).optional(),
    excludeTags: z.array(z.string()).optional(),
    timeout: z.number().int().positive().max(180000).optional(),
  }).optional(),
};

// Enhanced error handling with categorization
const handleFirecrawlError = (error: any, context: string = "operation"): any => {
  const startTime = Date.now();
  
  // Log detailed error information
  console.error(`Firecrawl ${context} failed:`, {
    message: error.message,
    status: error.response?.status,
    timestamp: new Date().toISOString(),
  });

  // Categorize errors
  if (error.response?.status === 429) {
    return createErrorResponse("Rate limit reached. Please try again later.");
  }
  if (error.response?.status === 402) {
    return createErrorResponse("Firecrawl quota exceeded. Check your billing.");
  }
  if (error.response?.status === 401) {
    return createErrorResponse("Authentication failed. Please check your API key.");
  }
  if (error.response?.status === 403) {
    return createErrorResponse("Access denied. Insufficient permissions.");
  }
  if (error.response?.status === 404) {
    return createErrorResponse("Resource not found. Please check the URL.");
  }
  if (error.response?.status >= 500) {
    return createErrorResponse("Firecrawl service temporarily unavailable. Please try again later.");
  }
  
  // Network/timeout errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return createErrorResponse("Network connection failed. Please check your internet connection.");
  }
  
  // Never expose API key in error messages
  const message = error.message || "Web scraping failed";
  const sanitizedMessage = message.replace(/api[_-]?key[^\s]*/gi, 'REDACTED');
  
  return createErrorResponse(`${context} failed: ${sanitizedMessage}`);
};

const sanitizeContent = (content: string): string => {
  // Remove potential script tags or malicious content
  return content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};

export function registerFirecrawlTools(server: McpServer, env: Env, props: Props) {
  // Check if user has permission to use Firecrawl tools
  if (!ALLOWED_USERNAMES.has(props.login)) {
    console.log(`User ${props.login} does not have access to Firecrawl tools`);
    return;
  }

  console.log(`Registering Firecrawl tools for authorized user: ${props.login}`);
  const firecrawl = new FirecrawlApp({ apiKey: env.FIRECRAWL_API_KEY });

  // Tool 1: Crawl website - Only available to authorized users
  server.tool(
    "crawlWebsite",
    "Start an asynchronous crawl job on a website and extract content from multiple pages. Best for extracting content from multiple related pages with comprehensive coverage. Returns a job ID for status tracking. This tool is restricted to specific GitHub users.",
    CrawlToolSchema,
    async ({ 
      url, 
      excludePaths, 
      includePaths, 
      maxDepth, 
      ignoreSitemap, 
      limit, 
      allowBackwardLinks, 
      allowExternalLinks, 
      webhook, 
      deduplicateSimilarURLs, 
      ignoreQueryParameters, 
      scrapeOptions 
    }) => {
      const crawlStartTime = Date.now();
      
      try {
        console.log(`User ${props.login} starting crawl for ${url} with options:`, {
          excludePaths,
          includePaths,
          maxDepth,
          limit,
          allowBackwardLinks,
          allowExternalLinks,
          deduplicateSimilarURLs,
          ignoreQueryParameters,
          scrapeFormats: scrapeOptions?.formats || ['markdown'],
          timestamp: new Date().toISOString(),
        });
        
        const result = await withRetry(
          async () => firecrawl.crawlUrl(url, {
            excludePaths,
            includePaths,
            maxDepth,
            ignoreSitemap,
            limit,
            allowBackwardLinks,
            allowExternalLinks,
            webhook,
            deduplicateSimilarURLs,
            ignoreQueryParameters,
            scrapeOptions: scrapeOptions || {
              formats: ['markdown'],
              onlyMainContent: true,
            },
          }),
          `crawl ${url}`
        );

        // Log performance metrics
        const duration = Date.now() - crawlStartTime;
        console.log(`Crawl job started in ${duration}ms for ${url}`);

        // Check if it's an async crawl response (has job ID) or immediate response (has data)
        if ('success' in result && !result.success) {
          throw new Error(result.error || "Crawl failed");
        }

        // Handle asynchronous crawl response with job ID
        if ('id' in result) {
          return {
            content: [{
              type: "text",
              text: `**Advanced Crawl Job Started**

**URL:** ${url}
**User:** ${props.login}
**Job ID:** ${result.id}
**Status:** ${result.success ? 'Started Successfully' : 'Failed to Start'}

**Configuration:**
- Max Pages: ${limit}
- Max Depth: ${maxDepth || 'Unlimited'}
- Allow External Links: ${allowExternalLinks ? 'Yes' : 'No'}
- Deduplicate URLs: ${deduplicateSimilarURLs ? 'Yes' : 'No'}
- Exclude Paths: ${excludePaths?.join(', ') || 'None'}
- Include Paths: ${includePaths?.join(', ') || 'All'}
- Formats: ${scrapeOptions?.formats?.join(', ') || 'markdown'}

**Performance:**
- Job Start Time: ${duration}ms

**Next Steps:**
Use the crawlJobStatus tool with Job ID \`${result.id}\` to check progress and retrieve results.

**⚠️ Note:** Large crawl jobs may take several minutes to complete. The job will continue running in the background.`,
            }],
          };
        }

        // Handle immediate response with data (for smaller crawls)
        const pages = result.data || [];
        const content = pages.slice(0, 5).map((page: any, index: number) => 
          `### Page ${index + 1}: ${page.url}

${sanitizeContent(page.markdown || page.html || 'No content')}

**Metadata:**
- Title: ${page.metadata?.title || 'N/A'}
- Status: ${page.metadata?.statusCode || 'N/A'}

---
`
        ).join('\n');

        const remainingPages = pages.length > 5 ? `\n**... and ${pages.length - 5} more pages** (showing first 5 for brevity)` : '';

        return {
          content: [{
            type: "text",
            text: `**Advanced Crawl Results (Immediate)**

**URL:** ${url}
**User:** ${props.login}
**Pages Crawled:** ${pages.length}
**Processing Time:** ${duration}ms

**Configuration Summary:**
- Max Depth: ${maxDepth || 'Unlimited'}
- External Links: ${allowExternalLinks ? 'Allowed' : 'Blocked'}
- Formats: ${scrapeOptions?.formats?.join(', ') || 'markdown'}

**Content Preview:**
${content}${remainingPages}

**Performance:**
- Total Processing Time: ${duration}ms
- Average Time per Page: ${pages.length > 0 ? Math.round(duration / pages.length) : 0}ms`,
          }],
        };
      } catch (error) {
        return handleFirecrawlError(error, "crawl");
      }
    }
  );

  // Tool 1.5: Check Crawl Job Status - Only available to authorized users  
  server.tool(
    "crawlJobStatus",
    "Check the status and retrieve results of a crawl job started with crawlWebsite. This tool is restricted to specific GitHub users.",
    CrawlJobStatusSchema,
    async ({ jobId }) => {
      const statusStartTime = Date.now();
      
      try {
        console.log(`User ${props.login} checking status for crawl job: ${jobId}`);
        
        const result = await withRetry(
          async () => firecrawl.checkCrawlStatus(jobId),
          `check crawl status ${jobId}`
        );

        // Log performance metrics
        const duration = Date.now() - statusStartTime;
        console.log(`Crawl status check completed in ${duration}ms for job ${jobId}`);

        if (!result.success) {
          throw new Error(result.error || "Failed to get crawl status");
        }

        // Format the status response
        const statusInfo = `**Status:** ${result.status}
**Progress:** ${result.completed || 0}/${result.total || 'Unknown'}
**Credits Used:** ${result.creditsUsed || 0}
**Expires At:** ${result.expiresAt || 'Unknown'}`;

        // Handle results if crawl is completed
        if (result.status === 'completed' && result.data && result.data.length > 0) {
          const pages = result.data;
          const contentPreview = pages.slice(0, 3).map((page: any, index: number) => 
            `### Page ${index + 1}: ${page.url || 'Unknown URL'}

${sanitizeContent((page.markdown || page.html || 'No content').substring(0, 500))}${(page.markdown || page.html || '').length > 500 ? '...' : ''}

**Metadata:**
- Title: ${page.metadata?.title || 'N/A'}
- Status: ${page.metadata?.statusCode || 'N/A'}

---
`
          ).join('\n');

          const remainingPages = pages.length > 3 ? `\n**... and ${pages.length - 3} more pages** (showing first 3 for brevity)` : '';

          return {
            content: [{
              type: "text",
              text: `**Crawl Job Status - COMPLETED**

**Job ID:** ${jobId}
**User:** ${props.login}

${statusInfo}

**Results Summary:**
- Total Pages: ${pages.length}
- Status Check Time: ${duration}ms

**Content Preview:**
${contentPreview}${remainingPages}

**✅ Crawl completed successfully!**`,
            }],
          };
        }

        // Handle in-progress or other statuses
        return {
          content: [{
            type: "text",
            text: `**Crawl Job Status**

**Job ID:** ${jobId}
**User:** ${props.login}

${statusInfo}

**Performance:**
- Status Check Time: ${duration}ms

${result.status === 'processing' ? '⏳ **Crawl is still in progress.** Check again in a few minutes.' : 
  result.status === 'failed' ? '❌ **Crawl failed.** Check the error details above.' : 
  '📊 **Status retrieved successfully.**'}`,
          }],
        };
      } catch (error) {
        return handleFirecrawlError(error, "crawl status check");
      }
    }
  );

  // Tool 2: Scrape single page - Only available to authorized users
  server.tool(
    "scrapePage",
    "Extract content from a single web page with advanced options including actions, multiple formats, location settings, and caching. This tool is the most powerful, fastest and most reliable scraper tool. This tool is restricted to specific GitHub users.",
    ScrapeToolSchema,
    async ({ 
      url, 
      formats, 
      onlyMainContent, 
      includeTags, 
      excludeTags, 
      waitFor, 
      timeout, 
      actions, 
      extract, 
      mobile, 
      skipTlsVerification, 
      removeBase64Images, 
      location, 
      maxAge 
    }) => {
      const scrapeStartTime = Date.now();
      
      try {
        console.log(`User ${props.login} scraping ${url} with options:`, {
          formats: formats || ['markdown'],
          onlyMainContent,
          hasActions: !!actions?.length,
          hasExtract: !!extract,
          mobile,
          maxAge,
          timestamp: new Date().toISOString(),
        });
        
        const result = await withRetry(
          async () => firecrawl.scrapeUrl(url, {
            formats: formats || ['markdown'],
            onlyMainContent,
            includeTags,
            excludeTags,
            waitFor,
            timeout,
            actions,
            extract,
            mobile,
            skipTlsVerification,
            removeBase64Images,
            location,
            maxAge,
          }),
          `scrape ${url}`
        );

        // Log performance metrics
        const duration = Date.now() - scrapeStartTime;
        console.log(`Scrape completed in ${duration}ms for ${url}`);

        if (!result.success) {
          throw new Error(result.error || "Scrape failed");
        }

        // Handle different response formats
        const contentParts: string[] = [];
        
        // Process each requested format
        if (result.markdown) {
          contentParts.push(`**Markdown Content:**\n${sanitizeContent(result.markdown)}`);
        }
        if (result.html && formats?.includes('html')) {
          contentParts.push(`**HTML Content:**\n${sanitizeContent(result.html)}`);
        }
        if (result.rawHtml && formats?.includes('rawHtml')) {
          contentParts.push(`**Raw HTML Content:**\n${sanitizeContent(result.rawHtml)}`);
        }
        if (result.links && formats?.includes('links')) {
          const linksList = Array.isArray(result.links) 
            ? result.links.map(link => `- ${link}`).join('\n')
            : result.links;
          contentParts.push(`**Links Found:**\n${linksList}`);
        }
        if (result.screenshot && formats?.includes('screenshot')) {
          contentParts.push(`**Screenshot:** ${result.screenshot}`);
        }
        if (result.extract && formats?.includes('extract')) {
          contentParts.push(`**Extracted Data:**\n\`\`\`json\n${JSON.stringify(result.extract, null, 2)}\n\`\`\``);
        }

        // If no content was extracted, provide a default message
        if (contentParts.length === 0) {
          contentParts.push('No content extracted');
        }

        // Add metadata if available
        let metadataText = '';
        if (result.metadata) {
          const metadata = result.metadata as any;
          metadataText = `\n\n**Metadata:**
- Title: ${metadata.title || 'N/A'}
- Description: ${metadata.description || 'N/A'}
- Language: ${metadata.language || 'N/A'}
- Status Code: ${metadata.statusCode || 'N/A'}`;
        }

        // Add performance info
        const performanceInfo = `\n\n**Performance:**
- Processing Time: ${duration}ms
- Cached: ${maxAge ? 'Enabled' : 'Disabled'}
- Mobile Mode: ${mobile ? 'Yes' : 'No'}`;

        // Add warnings if present
        let warningText = '';
        if ((result as any).warning) {
          warningText = `\n\n**⚠️ Warning:** ${(result as any).warning}`;
        }

        return {
          content: [{
            type: "text",
            text: `**Advanced Scrape Results**

**URL:** ${url}
**User:** ${props.login}

${contentParts.join('\n\n')}${metadataText}${performanceInfo}${warningText}`,
          }],
        };
      } catch (error) {
        return handleFirecrawlError(error, "scrape");
      }
    }
  );

  // Tool 3: Map website - Only available to authorized users
  server.tool(
    "mapWebsite",
    "Generate a comprehensive sitemap of a website for URL discovery. Best for discovering URLs before deciding what to scrape. This tool is restricted to specific GitHub users.",
    MapToolSchema,
    async ({ url, search, ignoreSitemap, sitemapOnly, includeSubdomains, limit }) => {
      const mapStartTime = Date.now();
      
      try {
        console.log(`User ${props.login} mapping ${url} with options:`, {
          search,
          ignoreSitemap,
          sitemapOnly,
          includeSubdomains,
          limit,
          timestamp: new Date().toISOString(),
        });
        
        const result = await withRetry(
          async () => firecrawl.mapUrl(url, {
            search,
            ignoreSitemap,
            sitemapOnly,
            includeSubdomains,
            limit,
          }),
          `map ${url}`
        );

        // Log performance metrics
        const duration = Date.now() - mapStartTime;
        console.log(`Website mapping completed in ${duration}ms for ${url}`);

        if (!result.success) {
          throw new Error(result.error || "Mapping failed");
        }

        // MapResponse has links property directly, not data
        const links = result.links || [];
        
        // Organize links by domain/subdomain if includeSubdomains is enabled
        let organizedContent = '';
        if (includeSubdomains && links.length > 0) {
          const linksByDomain = new Map<string, string[]>();
          
          links.forEach((link: string) => {
            try {
              const domain = new URL(link).hostname;
              if (!linksByDomain.has(domain)) {
                linksByDomain.set(domain, []);
              }
              linksByDomain.get(domain)!.push(link);
            } catch {
              // If URL parsing fails, add to 'other' category
              if (!linksByDomain.has('other')) {
                linksByDomain.set('other', []);
              }
              linksByDomain.get('other')!.push(link);
            }
          });

          organizedContent = Array.from(linksByDomain.entries())
            .map(([domain, domainLinks]) => 
              `**${domain}** (${domainLinks.length} links):\n${domainLinks.map(link => `- ${link}`).join('\n')}`
            )
            .join('\n\n');
        } else {
          organizedContent = links.map((link: string) => `- ${link}`).join('\n');
        }

        // Add discovery method info
        const discoveryMethod = sitemapOnly ? 'Sitemap only' : 
                              ignoreSitemap ? 'HTML links only' : 
                              'Sitemap + HTML links';

        // Add search filter info
        const searchInfo = search ? `\n**Search Filter Applied:** ${search}` : '';

        return {
          content: [{
            type: "text",
            text: `**Advanced Website Map**

**URL:** ${url}
**User:** ${props.login}
**Discovery Method:** ${discoveryMethod}
**Total Links Found:** ${links.length}${limit && links.length >= limit ? ` (limited to ${limit})` : ''}${searchInfo}

**Performance:**
- Processing Time: ${duration}ms
- Include Subdomains: ${includeSubdomains ? 'Yes' : 'No'}

**Links:**
${organizedContent || 'No links found'}`,
          }],
        };
      } catch (error) {
        return handleFirecrawlError(error, "website mapping");
      }
    }
  );

  // Tool 5: Search web - Only available to authorized users
  server.tool(
    "searchWeb",
    "Search the web and optionally extract content from search results. This is the most powerful search tool for finding specific information across multiple websites. Best for when you don't know which website has the information. This tool is restricted to specific GitHub users.",
    SearchToolSchema,
    async ({ 
      query, 
      limit, 
      lang, 
      country, 
      tbs, 
      filter, 
      location, 
      scrapeOptions 
    }) => {
      const searchStartTime = Date.now();
      
      try {
        console.log(`User ${props.login} searching for: "${query}" with options:`, {
          limit,
          lang,
          country,
          tbs,
          filter,
          location,
          scrapeFormats: scrapeOptions?.formats || ['markdown'],
          timestamp: new Date().toISOString(),
        });
        
        const result = await withRetry(
          async () => firecrawl.search(query, {
            limit,
            lang,
            country,
            tbs,
            filter,
            location,
            scrapeOptions,
          }),
          `search "${query}"`
        );

        // Log performance metrics
        const duration = Date.now() - searchStartTime;
        console.log(`Web search completed in ${duration}ms for query: "${query}"`);

        if (!result.success) {
          throw new Error(result.error || "Search failed");
        }

        const results = result.data || [];
        
        // Format search results with enhanced information
        const content = results.map((item: any, index: number) => {
          const contentPreview = sanitizeContent(item.markdown || item.html || 'No content extracted');
          const truncatedContent = contentPreview.length > 800 
            ? `${contentPreview.substring(0, 800)}...` 
            : contentPreview;

          return `### Result ${index + 1}: ${item.title || 'Untitled'}
**URL:** ${item.url}
**Description:** ${item.description || 'No description available'}

**Content Preview:**
${truncatedContent}

**Metadata:**
- Source: ${item.source || 'Unknown'}
- Language: ${item.language || 'N/A'}
- Relevance Score: ${item.score || 'N/A'}

---
`;
        }).join('\n');

        // Add search metadata
        const searchMetadata = `**Search Configuration:**
- Language: ${lang || 'Auto-detect'}
- Country: ${country || 'Global'}
- Time Filter: ${tbs || 'Any time'}
- Content Filter: ${filter || 'None'}
- Scraped Formats: ${scrapeOptions?.formats?.join(', ') || 'markdown'}`;

        // Calculate average content length
        const avgContentLength = results.length > 0 
          ? Math.round(results.reduce((sum: number, item: any) => 
              sum + (item.markdown || item.html || '').length, 0) / results.length)
          : 0;

        return {
          content: [{
            type: "text",
            text: `**Advanced Web Search Results**

**Query:** "${query}"
**User:** ${props.login}
**Results Found:** ${results.length}${limit && results.length >= limit ? ` (limited to ${limit})` : ''}

${searchMetadata}

**Performance:**
- Search Time: ${duration}ms
- Average Content Length: ${avgContentLength} characters
- Results per Second: ${results.length > 0 ? (results.length / (duration / 1000)).toFixed(2) : '0'}

**Results:**
${content || 'No results found for this search query.'}

${results.length >= (limit || 5) ? '**💡 Tip:** Increase the limit parameter to get more results, or refine your query for more specific results.' : ''}`,
          }],
        };
      } catch (error) {
        return handleFirecrawlError(error, "web search");
      }
    }
  );
}