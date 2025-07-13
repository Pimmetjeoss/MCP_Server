# Cloudflare Remote PostgreSQL Database MCP Server + GitHub OAuth

This is a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) server that enables you to **chat with your PostgreSQL database**, deployable as a remote MCP server with GitHub OAuth through Cloudflare. This is production ready MCP.

## Key Features

- **🗄️ Database Integration with Lifespan**: Direct PostgreSQL database connection for all MCP tool calls
- **🛠️ Modular, Single Purpose Tools**: Following best practices around MCP tools and their descriptions
- **🔐 Role-Based Access**: GitHub username-based permissions for database write operations
- **📊 Schema Discovery**: Automatic table and column information retrieval
- **🛡️ SQL Injection Protection**: Built-in validation and sanitization
- **📈 Monitoring**: Optional Sentry integration for production monitoring
- **☁️ Cloud Native**: Powered by [Cloudflare Workers](https://developers.cloudflare.com/workers/) for global scale

## Modular Architecture

This MCP server uses a clean, modular architecture that makes it easy to extend and maintain:

- **`src/tools/`** - Individual tool implementations in separate files
- **`registerAllTools()`** - Centralized tool registration system 
- **Extensible Design** - Add new tools by creating files in `tools/` and registering them

This architecture allows you to easily add new database operations, external API integrations, or any other MCP tools while keeping the codebase organized and maintainable.

## Transport Protocols

This MCP server supports both modern and legacy transport protocols:

- **`/mcp` - Streamable HTTP** (recommended): Uses a single endpoint with bidirectional communication, automatic connection upgrades, and better resilience for network interruptions
- **`/sse` - Server-Sent Events** (legacy): Uses separate endpoints for requests/responses, maintained for backward compatibility

For new implementations, use the `/mcp` endpoint as it provides better performance and reliability.

## How It Works

The MCP server provides three main tools for database interaction:

1. **`listTables`** - Get database schema and table information (all authenticated users)
2. **`queryDatabase`** - Execute read-only SQL queries (all authenticated users)  
3. **`executeDatabase`** - Execute write operations like INSERT/UPDATE/DELETE (privileged users only)

**Authentication Flow**: Users authenticate via GitHub OAuth → Server validates permissions → Tools become available based on user's GitHub username.

**Security Model**: 
- All authenticated GitHub users can read data
- Only specific GitHub usernames can write/modify data
- SQL injection protection and query validation built-in

## Simple Example First

Want to see a basic MCP server before diving into the full database implementation? Check out `src/simple-math.ts` - a minimal MCP server with a single `calculate` tool that performs basic math operations (add, subtract, multiply, divide). This example demonstrates the core MCP components: server setup, tool definition with Zod schemas, and dual transport support (`/mcp` and `/sse` endpoints). You can run it locally with `wrangler dev --config wrangler-simple.jsonc` and test at `http://localhost:8789/mcp`.

## Prerequisites

- Node.js installed on your machine
- A Cloudflare account (free tier works)
- A GitHub account for OAuth setup
- A PostgreSQL database (local or hosted)

## Getting Started

### Step 1: Install Wrangler CLI

Install Wrangler globally to manage your Cloudflare Workers:

```bash
npm install -g wrangler
```

### Step 2: Authenticate with Cloudflare

Log in to your Cloudflare account:

```bash
wrangler login
```

This will open a browser window where you can authenticate with your Cloudflare account.

### Step 3: Clone and Setup

Clone the repo directly & install dependencies: 

```bash
git clone https://github.com/Pimmetjeoss/MCP_Server.git
cd MCP_Server
npm install
```

## Environment Variables Setup

Before running the MCP server, you need to configure several environment variables for authentication and database access.

### Create Environment Variables File

1. **Create your `.dev.vars` file** from the example:
   ```bash
   cp .dev.vars.example .dev.vars
   ```

2. **Configure all required environment variables** in `.