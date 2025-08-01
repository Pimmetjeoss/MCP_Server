## FEATURE: 

We want to add Firecrawl web scraping capabilities to our existing MCP server using this repo's template.
The goal is to integrate Firecrawl tools (crawl, scrape, map, search) into our authenticated MCP server infrastructure while maintaining all existing security patterns and GitHub OAuth authentication.

Additional features:

- All four Firecrawl tools: crawl, scrape, map, and search
- Secure API key management via Cloudflare Workers secrets
- Rate limit handling and error management
- Maintain existing GitHub OAuth authentication flow

We need tools for web scraping that integrate seamlessly with our current authentication system. These tools should respect user permissions and log all operations with the authenticated user context.

We need:

- crawlWebsite tool to crawl multiple pages from a website
- scrapePage tool to extract content from single URLs
- mapWebsite tool to generate sitemaps
- searchWeb tool to search and extract content from search results
- Proper error handling for rate limits (429) and quota errors (402)
- Integration with existing tool registration system
- User context propagation to all Firecrawl operations

## EXAMPLES & DOCUMENTATION:
All examples are already referenced in prp_mcp_base.md and the new prp_firecrawl_mcp.md document provides the complete implementation blueprint.

## OTHER CONSIDERATIONS:

- Firecrawl API key must be stored as FIRECRAWL_API_KEY environment variable
- All tools must follow the existing modular pattern (one tool registration file)
- Error messages must never expose the API key
- URL validation is required before sending requests to Firecrawl
- Content sanitization needed to prevent script injection
- Maintain compatibility with existing database tools