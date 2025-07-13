# MCP Server with PostgreSQL Database Integration

A Model Context Protocol (MCP) server implementation that provides secure database access through GitHub OAuth authentication, deployed on Cloudflare Workers.

## 🔧 Features

- **PostgreSQL Database Integration**: Secure database operations with connection pooling
- **GitHub OAuth Authentication**: User authentication and authorization
- **Cloudflare Workers Deployment**: Serverless deployment with Durable Objects
- **MCP Protocol Support**: Compatible with Model Context Protocol specifications
- **Role-based Access Control**: Different permission levels based on authenticated users
- **Error Monitoring**: Integrated Sentry error tracking
- **TypeScript**: Full type safety and modern development experience

## 🏗️ Architecture

The server is built using:

- **[Model Context Protocol (MCP)](https://modelcontextprotocol.org/)**: For standardized AI-to-tool communication
- **[Cloudflare Workers](https://workers.cloudflare.com/)**: Serverless compute platform
- **[Durable Objects](https://developers.cloudflare.com/durable-objects/)**: Stateful serverless objects for MCP sessions
- **[PostgreSQL](https://www.postgresql.org/)**: Primary database
- **[GitHub OAuth](https://docs.github.com/en/apps/oauth-apps)**: Authentication provider
- **[Hono](https://hono.dev/)**: Lightweight web framework

## 📁 Project Structure

```
src/
├── auth/                 # Authentication handlers
├── database/            # Database connection and utilities
├── tools/               # MCP tool implementations
│   ├── database-tools.ts
│   ├── database-tools-sentry.ts
│   └── register-tools.ts
├── index.ts             # Main server entry point
├── types.ts             # TypeScript type definitions
└── simple-math.ts       # Example MCP tool
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Cloudflare account
- GitHub OAuth App
- PostgreSQL database (local or remote)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Pimmetjeoss/MCP_Server.git
   cd MCP_Server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start local PostgreSQL database**
   ```bash
   docker-compose up -d
   ```

4. **Set up the database**
   ```bash
   chmod +x setup-database.sh
   ./setup-database.sh
   ```

5. **Configure environment variables**
   Create a `.env` file or set up Cloudflare secrets:
   ```
   DATABASE_URL=postgresql://mcp_user:mcp_password@localhost:5432/mcp_database
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   SENTRY_DSN=your_sentry_dsn (optional)
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

The server will be available at `http://localhost:8792`

### GitHub OAuth Setup

1. Create a new GitHub OAuth App at https://github.com/settings/applications/new
2. Set the Authorization callback URL to: `https://your-worker-domain.workers.dev/callback`
3. Note the Client ID and Client Secret for configuration

## 🛠️ Available Tools

The MCP server provides the following tools:

### Database Tools

- **`listTables`**: Get all tables and their schema information
- **`queryDatabase`**: Execute read-only SQL queries (SELECT statements)
- **`executeDatabase`**: Execute write operations (INSERT, UPDATE, DELETE) - restricted access

### Authentication & Authorization

Access to tools is controlled based on GitHub user authentication:

- **Public access**: `listTables`, `queryDatabase`
- **Restricted access**: `executeDatabase` (specific GitHub users only)

## 📦 Deployment

### Cloudflare Workers

1. **Configure wrangler.jsonc**
   Update the configuration with your specific settings:
   ```jsonc
   {
     "name": "your-mcp-server",
     "main": "src/index.ts",
     // ... other configurations
   }
   ```

2. **Set up secrets**
   ```bash
   wrangler secret put DATABASE_URL
   wrangler secret put GITHUB_CLIENT_ID
   wrangler secret put GITHUB_CLIENT_SECRET
   ```

3. **Deploy to Cloudflare**
   ```bash
   npm run deploy
   ```

### Database Deployment

For production, use a managed PostgreSQL service like:
- [Neon](https://neon.tech/)
- [Supabase](https://supabase.com/)
- [AWS RDS](https://aws.amazon.com/rds/)
- [Google Cloud SQL](https://cloud.google.com/sql)

## 🧪 Testing

Run the test suite:

```bash
npm test           # Run tests
npm run test:ui    # Run tests with UI
npm run test:run   # Run tests once
```

## 📝 Development Scripts

- `npm run dev` - Start development server
- `npm run deploy` - Deploy to Cloudflare Workers
- `npm run type-check` - Run TypeScript type checking
- `npm run cf-typegen` - Generate Cloudflare Worker types

## 🔒 Security Considerations

- All database operations are parameterized to prevent SQL injection
- GitHub OAuth provides secure authentication
- Write operations are restricted to authorized users only
- Connection pooling prevents database connection exhaustion
- Sentry integration for error monitoring and alerting

## 🐛 Error Handling

The server includes comprehensive error handling:

- Database connection errors
- Authentication failures
- Invalid SQL queries
- Permission denied scenarios
- Automatic retry logic for transient failures

## 📚 MCP Integration

This server implements the Model Context Protocol, making it compatible with:

- Claude Desktop
- MCP-compatible applications
- Custom MCP clients

### Connection Configuration

To connect from an MCP client, use:
```json
{
  "name": "database-server",
  "command": "npx",
  "args": ["@your-org/mcp-server"],
  "env": {
    "DATABASE_URL": "your-database-url"
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/Pimmetjeoss/MCP_Server/issues) page
2. Create a new issue with detailed information
3. Include error logs and reproduction steps

## 🔗 Related Links

- [Model Context Protocol Documentation](https://modelcontextprotocol.org/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [GitHub OAuth Documentation](https://docs.github.com/en/apps/oauth-apps)
