---
name: "MCP Business Automation Agent with PydanticAI"
description: "Comprehensive PRP for building a PydanticAI agent that integrates with the MCP server for business automation workflows"
---

## Purpose

Build a sophisticated Business Automation & Research Agent using PydanticAI that integrates seamlessly with your existing MCP (Model Context Protocol) server running on Cloudflare Workers. This agent will serve as an intelligent business assistant capable of executing complex multi-step workflows through natural language conversations.

## Core Principles

1. **MCP Integration First**: Deep integration with your existing MCP server infrastructure for tool execution
2. **PydanticAI Best Practices**: Leverage PydanticAI patterns for agent creation, tools, and structured outputs
3. **Production Ready**: Include security, testing, and monitoring for production deployments
4. **Type Safety First**: Leverage PydanticAI's type-safe design and Pydantic validation throughout
5. **Business Workflow Focus**: Optimize for real-world business automation scenarios
6. **Comprehensive Testing**: Use TestModel and MockMCPClient for thorough agent validation

## ⚠️ Implementation Guidelines: MCP-Focused Development

**IMPORTANT**: This agent specifically integrates with your MCP server - don't rebuild functionality that already exists.

### What NOT to do:
- ❌ **Don't reimplement MCP tools** - Use your existing database, email, and scraping tools via MCP
- ❌ **Don't bypass MCP authentication** - Leverage the existing GitHub OAuth flow
- ❌ **Don't create direct API integrations** - Route everything through your MCP server
- ❌ **Don't ignore MCP server errors** - Implement proper retry and fallback mechanisms
- ❌ **Don't hardcode MCP endpoints** - Use environment-based configuration

### What TO do:
- ✅ **Wrap MCP tools as PydanticAI tools** - Create lightweight wrappers for each MCP capability
- ✅ **Leverage existing authentication** - Use your GitHub OAuth tokens for MCP server access
- ✅ **Handle MCP workflows** - Chain multiple MCP tool calls for complex business processes
- ✅ **Test with mock MCP responses** - Create realistic test scenarios without hitting live server
- ✅ **Monitor MCP connectivity** - Include health checks and error handling

### Key Question:
**"Does this functionality already exist in the MCP server, and can I use it instead of rebuilding?"**

If yes, integrate with MCP. If no, consider adding to MCP server first.

---

## Goal

Create a conversational AI agent that can execute sophisticated business workflows by orchestrating your existing MCP server tools. The agent should handle complex multi-step processes like:

- **Data Analysis Workflows**: "Analyze Q4 sales performance, identify key trends, and email a comprehensive report to the executive team"
- **Research & Intelligence**: "Research our competitor's new pricing strategy, update our competitive analysis database, and suggest strategic responses"
- **Content Creation**: "Scrape recent industry news, analyze trends against our market data, and draft an executive briefing for the board meeting"
- **Strategic Decision Support**: "Help me think through this product launch strategy step by step, considering market data and competitive landscape"

## Why

Your MCP server provides powerful business automation capabilities, but requires technical knowledge to use effectively. This PydanticAI agent will:

- **Democratize Access**: Enable non-technical users to leverage complex database queries, email automation, and web research
- **Orchestrate Workflows**: Chain multiple MCP tools together for sophisticated business processes
- **Provide Natural Interface**: Allow complex requests in plain English rather than technical commands
- **Scale Intelligence**: Apply AI reasoning to business data and automate decision-making processes
- **Maintain Security**: Leverage existing MCP authentication and permission systems

## What

### Agent Type Classification
- [x] **Chat Agent**: Conversational interface with memory and context for business discussions
- [x] **Tool-Enabled Agent**: Integration with all MCP server tools (database, email, scraping, thinking)
- [x] **Workflow Agent**: Multi-step task processing and orchestration across MCP capabilities
- [ ] **Structured Output Agent**: Use string output by default, structured only when validation needed

### Model Provider Requirements
- [x] **OpenAI**: `openai:gpt-4o` or `openai:gpt-4o-mini` for primary reasoning
- [x] **Anthropic**: `anthropic:claude-3-5-sonnet-20241022` as fallback option
- [x] **Fallback Strategy**: Multiple provider support with automatic failover for reliability

### External Integrations
- [x] **MCP Server**: Primary integration with your Cloudflare Workers MCP server
- [x] **PostgreSQL Database**: Via MCP server database tools (listTables, queryDatabase, executeDatabase)
- [x] **Microsoft Graph API**: Via MCP server email tools (sendEmail with HTML support)
- [x] **Firecrawl API**: Via MCP server scraping tools (scrapePage, crawlWebsite, mapWebsite, searchWeb)
- [x] **Sequential Thinking**: Via MCP server thinking tools for complex problem solving
- [x] **GitHub OAuth**: Leverage existing authentication system

### Success Criteria
- [x] Agent successfully executes complex multi-step business workflows via MCP
- [x] All MCP tools accessible through natural language commands
- [x] Robust error handling for MCP server connectivity and timeouts
- [x] Comprehensive test coverage with MockMCPClient and integration tests
- [x] Security measures implemented (OAuth tokens, input validation, rate limiting)
- [x] Performance meets requirements (sub-3s response for simple queries, sub-30s for complex workflows)
- [x] Conversation memory maintains context across multi-step workflows

## All Needed Context

### PydanticAI Documentation & Research

```yaml
# MCP servers
- mcp: Archon
  query: "PydanticAI agent creation model providers tools dependencies"
  why: Core framework understanding and latest patterns

# ESSENTIAL PYDANTIC AI DOCUMENTATION - Must be researched
- url: https://ai.pydantic.dev/
  why: Official PydanticAI documentation with getting started guide
  content: Agent creation, model providers, dependency injection patterns

- url: https://ai.pydantic.dev/agents/
  why: Comprehensive agent architecture and configuration patterns
  content: System prompts, output types, execution methods, agent composition

- url: https://ai.pydantic.dev/tools/
  why: Tool integration patterns and function registration
  content: @agent.tool decorators, RunContext usage, parameter validation

- url: https://ai.pydantic.dev/testing/
  why: Testing strategies specific to PydanticAI agents
  content: TestModel, FunctionModel, Agent.override(), pytest patterns

- url: https://ai.pydantic.dev/models/
  why: Model provider configuration and authentication
  content: OpenAI, Anthropic, Gemini setup, API key management, fallback models

# Prebuilt examples
- path: examples/
  why: Reference implementations for Pydantic AI agents
  content: A bunch of already built simple Pydantic AI examples to reference including how to set up models and providers

- path: examples/cli.py
  why: Shows real-world interaction with Pydantic AI agents
  content: Conversational CLI with streaming, tool call visibility, and conversation handling
```

### MCP Integration Research

```yaml
# MCP Protocol & Server Documentation
- url: https://modelcontextprotocol.io/
  why: Core MCP protocol specification and integration patterns
  content: Protocol basics, tool calling, authentication, error handling

- path: https://github.com/Pimmetjeoss/MCP_Server
  why: Your existing MCP server implementation and API reference
  content: Tool schemas, authentication flow, deployment configuration, error responses

- url: https://docs.cloudflare.com/workers/
  why: Understanding Cloudflare Workers deployment and limitations
  content: Request limits, timeout handling, edge deployment considerations

# MCP Server Tools Analysis (from your repository)
mcp_tools_reference:
  database_tools:
    - listTables(): Returns database schema with table/column information
    - queryDatabase(sql: str): Read-only SQL execution with results
    - executeDatabase(sql: str): Write operations for authorized users
  
  email_tools:
    - sendEmail(to, subject, body, cc?, bcc?, importance?, html_body?): Microsoft Graph integration
  
  firecrawl_tools:
    - scrapePage(url, options?): Single page content extraction
    - crawlWebsite(url, max_pages?, options?): Full website crawling with job tracking
    - getCrawlStatus(job_id): Monitor crawling progress
    - mapWebsite(url): Generate sitemap for URL discovery
    - searchWeb(query, max_results?): Web search with content extraction
  
  thinking_tools:
    - startThinking(problem, context?): Initialize structured problem solving
    - addThought(thought, is_revision?, revises_thought?): Add reasoning steps
    - branchThinking(from_thought, new_direction): Alternative reasoning paths
    - finishThinking(): Complete analysis with solution
```

### Agent Architecture Research

```yaml
# PydanticAI + MCP Integration Patterns
agent_structure:
  configuration:
    - settings.py: Environment-based configuration with MCP server URL and tokens
    - providers.py: Model provider abstraction with get_llm_model()
    - mcp_client.py: HTTP client for MCP server communication
    - Environment variables: MCP_SERVER_URL, GITHUB_ACCESS_TOKEN, AI model keys
  
  agent_definition:
    - Default to string output for conversational responses
    - Use get_llm_model() from providers.py for model configuration
    - Business-focused system prompts for automation workflows
    - MCPDeps dataclass for MCP client and authentication dependencies
  
  tool_integration:
    - @agent.tool wrappers for each MCP server capability
    - RunContext[MCPDeps] for authenticated MCP server access
    - Error handling for network timeouts and MCP server errors
    - Retry logic for failed MCP calls with exponential backoff
  
  testing_strategy:
    - TestModel for rapid development validation
    - MockMCPClient for isolated testing without server dependency
    - Integration tests with actual MCP server for E2E validation
    - Conversation flow testing with multi-step workflows
```

### Security and Production Considerations

```yaml
# MCP-Specific Security Patterns
security_requirements:
  mcp_authentication:
    environment_variables: ["MCP_SERVER_URL", "GITHUB_ACCESS_TOKEN", "OPENAI_API_KEY", "ANTHROPIC_API_KEY"]
    token_management: "GitHub OAuth token refresh and validation"
    secure_storage: "Never commit tokens to version control"
  
  mcp_communication:
    https_validation: "Ensure secure HTTPS communication with MCP server"
    timeout_handling: "Proper timeouts for MCP server calls (30s max)"
    retry_logic: "Exponential backoff for failed MCP requests"
    rate_limiting: "Respect MCP server rate limits to prevent abuse"
  
  business_data_security:
    sql_injection: "Validate SQL inputs even though MCP server has protection"
    email_validation: "Verify recipients before sending via MCP email tools"
    data_filtering: "Ensure no sensitive data in agent logs or responses"
    permission_checking: "Validate user permissions for database write operations"
```

### Common MCP Integration Gotchas

```yaml
# MCP-specific implementation challenges
mcp_integration_gotchas:
  connectivity_issues:
    issue: "MCP server timeouts during long-running operations like web crawling"
    research: "Cloudflare Workers execution limits and async handling patterns"
    solution: "Implement job polling for long operations, store job IDs in conversation memory"
  
  authentication_flow:
    issue: "GitHub OAuth token expiration during long conversations"
    research: "Token refresh mechanisms and session management"
    solution: "Automatic token refresh with fallback authentication prompts"
  
  error_categorization:
    issue: "Different error types from MCP server (auth, network, tool-specific)"
    research: "MCP server error response schemas and retry strategies"
    solution: "Categorized error handling with appropriate user messaging"
  
  conversation_context:
    issue: "Maintaining context across multi-step MCP workflows"
    research: "PydanticAI conversation memory and state management"
    solution: "Store workflow state and intermediate results in conversation context"
  
  tool_chaining:
    issue: "Complex workflows requiring multiple sequential MCP tool calls"
    research: "Tool execution order and dependency management"
    solution: "Workflow orchestration with clear step-by-step execution and error recovery"
```

## Implementation Blueprint

### Technology Research Phase

**RESEARCH REQUIRED - Complete before implementation:**

✅ **PydanticAI Framework Deep Dive:**
- [ ] Agent creation patterns and best practices for tool-heavy agents
- [ ] Model provider configuration with fallback for reliability
- [ ] Tool integration patterns (@agent.tool for MCP wrappers)
- [ ] Dependency injection system for MCP client and authentication
- [ ] Conversation memory patterns for multi-step workflows

✅ **MCP Integration Investigation:**
- [ ] HTTP client patterns for reliable MCP server communication
- [ ] Authentication flow with GitHub OAuth token management
- [ ] Error handling strategies for MCP server timeouts and failures
- [ ] Tool calling patterns and response parsing
- [ ] Async/await patterns for potentially long-running MCP operations

✅ **Business Workflow Analysis:**
- [ ] Common multi-step business automation patterns
- [ ] Data analysis and reporting workflow requirements
- [ ] Email communication templates and formatting
- [ ] Web research and competitive intelligence workflows
- [ ] Strategic thinking and decision support processes

### Agent Implementation Plan

```yaml
Implementation Task 1 - MCP Client Infrastructure:
  CREATE mcp integration foundation:
    - mcp_client.py: HTTP client for MCP server communication
    - auth_manager.py: GitHub OAuth token management and refresh
    - models.py: Pydantic models for MCP request/response validation
    - exceptions.py: MCP-specific error types and handling
    - settings.py: Environment configuration for MCP endpoints and tokens

Implementation Task 2 - Core Agent Architecture:
  IMPLEMENT agent.py following main_agent_reference patterns:
    - Use get_llm_model() from providers.py for model configuration
    - Business automation system prompt focused on workflow orchestration
    - MCPDeps dependency injection with authenticated MCP client
    - Conversation memory for multi-step workflow context
    - Error handling and graceful degradation for MCP server issues

Implementation Task 3 - MCP Tool Wrappers:
  DEVELOP tools.py with MCP integration:
    - Database tools: list_tables, query_database, execute_database
    - Email tools: send_email with rich formatting support
    - Web research tools: scrape_page, crawl_website, search_web
    - Thinking tools: start_thinking, add_thought, finish_thinking
    - All tools use @agent.tool with RunContext[MCPDeps]
    - Comprehensive error handling and retry logic for each tool

Implementation Task 4 - Workflow Orchestration:
  CREATE workflow_manager.py:
    - Multi-step workflow execution with state management
    - Job tracking for long-running operations (web crawling)
    - Progress reporting and intermediate result storage
    - Workflow recovery and resume capabilities
    - Template workflows for common business processes

Implementation Task 5 - Comprehensive Testing:
  IMPLEMENT testing suite:
    - MockMCPClient for isolated unit testing
    - TestModel integration for rapid development cycles
    - Integration tests with actual MCP server connectivity
    - Workflow testing with realistic business scenarios
    - Error scenario testing (timeouts, auth failures, malformed responses)

Implementation Task 6 - Production Deployment:
  SETUP production infrastructure:
    - Environment variable management for different deployment stages
    - Monitoring and logging for MCP server communication
    - Health checks for MCP server connectivity
    - Rate limiting and abuse prevention
    - Documentation for deployment and maintenance
```

## Validation Loop

### Level 1: MCP Connectivity Validation

```bash
# Verify MCP server accessibility and authentication
python -c "
import os
import httpx
import asyncio

async def test_mcp_connection():
    mcp_url = os.getenv('MCP_SERVER_URL')
    auth_token = os.getenv('GITHUB_ACCESS_TOKEN')
    
    async with httpx.AsyncClient() as client:
        # Test MCP server health
        response = await client.get(f'{mcp_url}/health')
        print(f'MCP Server Health: {response.status_code}')
        
        # Test authentication
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = await client.get(f'{mcp_url}/auth/validate', headers=headers)
        print(f'Auth Validation: {response.status_code}')

asyncio.run(test_mcp_connection())
"

# Expected: 200 responses for both health check and auth validation
# If failing: Check MCP server deployment and token validity
```

### Level 2: Agent Structure Validation

```bash
# Verify complete agent project structure with MCP integration
find mcp_agent -name "*.py" | sort
test -f mcp_agent/agent.py && echo "Agent definition present"
test -f mcp_agent/tools.py && echo "MCP tool wrappers present"
test -f mcp_agent/mcp_client.py && echo "MCP client present"
test -f mcp_agent/models.py && echo "Models present"
test -f mcp_agent/dependencies.py && echo "Dependencies present"

# Verify proper imports and MCP integration
grep -q "from pydantic_ai import Agent" mcp_agent/agent.py
grep -q "@agent.tool" mcp_agent/tools.py
grep -q "class MCPClient" mcp_agent/mcp_client.py
grep -q "MCPDeps" mcp_agent/dependencies.py

# Expected: All required files with MCP-specific implementations
# If missing: Generate missing components with MCP integration patterns
```

### Level 3: MCP Tool Integration Validation

```bash
# Test MCP tool wrappers with MockMCPClient
python -c "
from mcp_agent.agent import agent
from mcp_agent.mcp_client import MockMCPClient
from mcp_agent.dependencies import MCPDeps

# Create mock dependencies
mock_deps = MCPDeps(
    mcp_client=MockMCPClient(),
    github_token='test_token'
)

# Test agent with mock MCP client
with agent.override(deps=mock_deps):
    result = agent.run_sync('List all database tables')
    print(f'Agent response: {result.output}')
    
    # Test multi-step workflow
    result = agent.run_sync('Query user data and send summary email to admin@company.com')
    print(f'Workflow result: {result.output}')
"

# Expected: Agent successfully calls mock MCP tools and returns responses
# If failing: Debug tool registration and MCP client integration
```

### Level 4: Integration Testing with Live MCP Server

```bash
# Test actual MCP server integration
cd mcp_agent
python -c "
import asyncio
from agent import agent
from dependencies import get_mcp_deps

async def test_live_integration():
    # Get real MCP dependencies
    deps = await get_mcp_deps()
    
    # Test database tool
    result = await agent.run('Show me the database schema')
    print(f'Database query result: {result.output}')
    
    # Test email tool (be careful with real emails)
    result = await agent.run('Test email functionality (send to test@example.com)')
    print(f'Email test result: {result.output}')

asyncio.run(test_live_integration())
"

# Expected: Successful interaction with live MCP server
# If failing: Check MCP server status, authentication, and network connectivity
```

### Level 5: Business Workflow Validation

```bash
# Test complex multi-step business workflows
python -c "
import asyncio
from mcp_agent.agent import agent
from mcp_agent.dependencies import get_mcp_deps

async def test_business_workflows():
    deps = await get_mcp_deps()
    
    # Test data analysis workflow
    result = await agent.run('''
    Analyze our sales data from the last quarter:
    1. Show me the top performing products
    2. Calculate month-over-month growth
    3. Identify any concerning trends
    ''')
    print(f'Analysis workflow: {result.output}')
    
    # Test research workflow
    result = await agent.run('''
    Research our main competitor:
    1. Scrape their pricing page
    2. Compare with our current prices
    3. Suggest strategic responses
    ''')
    print(f'Research workflow: {result.output}')

asyncio.run(test_business_workflows())
"

# Expected: Complex workflows execute successfully with proper tool chaining
# If failing: Debug workflow orchestration and error handling
```

## Final Validation Checklist

### MCP Integration Completeness

- [ ] MCP client successfully connects to Cloudflare Workers server
- [ ] GitHub OAuth authentication flow works correctly
- [ ] All MCP tools (database, email, scraping, thinking) accessible via agent
- [ ] Error handling for MCP server timeouts and network issues
- [ ] Retry logic implemented for failed MCP requests
- [ ] Job tracking for long-running operations (web crawling)

### PydanticAI Agent Implementation

- [ ] Agent instantiation with proper model provider configuration
- [ ] Tool registration with @agent.tool decorators for all MCP capabilities
- [ ] MCPDeps dependency injection properly configured and tested
- [ ] Conversation memory maintains context across multi-step workflows
- [ ] Comprehensive test suite with TestModel and MockMCPClient
- [ ] Integration tests with live MCP server connectivity

### Business Workflow Capabilities

- [ ] Multi-step data analysis workflows (query → analyze → report → email)
- [ ] Research and intelligence workflows (scrape → analyze → update database)
- [ ] Strategic thinking workflows (problem → structured analysis → recommendations)
- [ ] Email automation with proper formatting and recipient validation
- [ ] Error recovery and graceful degradation for partial workflow failures

### Production Readiness

- [ ] Environment configuration with secure token management
- [ ] Monitoring and logging for MCP server communication
- [ ] Health checks for MCP server connectivity and authentication
- [ ] Rate limiting and abuse prevention mechanisms
- [ ] Documentation for deployment, maintenance, and troubleshooting

### Security and Reliability

- [ ] GitHub OAuth token refresh and expiration handling
- [ ] Input validation and sanitization for all user requests
- [ ] SQL injection prevention (defense in depth with MCP server)
- [ ] Email recipient validation and spam prevention
- [ ] Sensitive data filtering in logs and responses

---

## Anti-Patterns to Avoid

### MCP Integration Anti-Patterns

- ❌ Don't bypass MCP server - always route through your existing infrastructure
- ❌ Don't ignore MCP server errors - implement comprehensive error handling and retry logic
- ❌ Don't hardcode MCP endpoints - use environment-based configuration for flexibility
- ❌ Don't skip authentication validation - always verify GitHub OAuth tokens
- ❌ Don't forget timeout handling - MCP server operations can be slow (especially web crawling)

### PydanticAI Agent Anti-Patterns

- ❌ Don't skip TestModel validation - always test with mock responses during development
- ❌ Don't create overly complex tool chains - keep workflows focused and recoverable
- ❌ Don't ignore conversation context - maintain workflow state across multi-step processes
- ❌ Don't skip error categorization - different error types need different handling strategies
- ❌ Don't forget async patterns - MCP operations are inherently async and potentially slow

### Business Workflow Anti-Patterns

- ❌ Don't send emails without confirmation - always validate recipients and content
- ❌ Don't execute database writes without permission checks - respect user authorization levels
- ❌ Don't scrape aggressively - respect robots.txt and rate limits via MCP server
- ❌ Don't ignore data privacy - validate all outputs for sensitive information
- ❌ Don't forget workflow recovery - implement resume capabilities for long processes

**IMPLEMENTATION STATUS: [READY TO BEGIN]** - Complete MCP server integration research and begin PydanticAI agent development with focus on business automation workflows.
