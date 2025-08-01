# MCP Server met Database, Web Scraping, Email & AI Tools

Een productie-klare MCP server die draait op Cloudflare Workers met GitHub OAuth authenticatie. Combineert veilige database toegang, krachtige web scraping, email functionaliteit en AI-assisted thinking tools.

## Beschikbare Tools

### Database Tools
Veilige PostgreSQL database toegang met ingebouwde SQL injection bescherming:

- **`listTables`** - Ontdek database schema met tabellen, kolommen en types
- **`queryDatabase`** - Read-only SQL queries voor alle geauthenticeerde gebruikers  
- **`executeDatabase`** - Write operaties (INSERT, UPDATE, DELETE) voor geautoriseerde gebruikers

### Email Tools
Email functionaliteit via Microsoft Graph API met persoonlijke Microsoft accounts:

- **`sendEmail`** - Verstuur emails met HTML/plain text support, CC/BCC opties, en prioriteit instellingen

### Firecrawl Tools
Geavanceerde web scraping met retry logic en rate limiting:

- **`crawlWebsite`** - Crawl complete websites met job tracking
- **`crawlJobStatus`** - Monitor crawl job voortgang en resultaten
- **`scrapePage`** - Single page scraping met browser actions
- **`mapWebsite`** - Generate sitemaps voor URL discovery
- **`searchWeb`** - Web search met content extraction

### Sequential Thinking
AI-assisted problem solving tool voor complexe analyse en stapsgewijze planning met ondersteuning voor gedachte-herzieningen en branching logic.

## Wat heb je nodig?

- Node.js (LTS versie)
- Cloudflare account (gratis tier werkt)
- GitHub account voor OAuth
- Microsoft account voor email functionaliteit
- PostgreSQL database (lokaal/cloud)
- Firecrawl API key (optioneel, voor scraping)

## Installatie & Setup

### 1. Project Setup
```bash
git clone https://github.com/Pimmetjeoss/MCP_Server.git
cd MCP_Server
npm install
wrangler login
```

### 2. GitHub OAuth Setup
Ga naar [GitHub Developer Settings](https://github.com/settings/developers) en maak een OAuth App:
- **Homepage URL**: `http://localhost:8792`
- **Authorization callback**: `http://localhost:8792/callback`

### 3. Azure App Registration (voor Email)
Ga naar [Azure Portal](https://portal.azure.com) en maak een App registration:
- **Name**: "MCP Email Server"
- **Supported account types**: "Accounts in any organizational directory and personal Microsoft accounts"
- **Redirect URI**: Web - `http://localhost:8792/microsoft/callback`
- **API permissions**: Microsoft Graph - offline_access, User.Read, Mail.Read, Mail.Send, Calendars.Read, Calendars.ReadWrite, Contacts.Read
- Maak een **Client Secret** en kopieer de waarde

### 4. Environment Configuratie
```bash
cp .dev.vars.example .dev.vars
```

Vul `.dev.vars` in:
```bash
# GitHub OAuth
GITHUB_CLIENT_ID=jouw_github_client_id
GITHUB_CLIENT_SECRET=jouw_github_secret

# Microsoft OAuth (voor Email)
MS_CLIENT_ID=jouw_azure_application_id
MS_CLIENT_SECRET=jouw_azure_client_secret

# Security
COOKIE_ENCRYPTION_KEY=$(openssl rand -hex 32)

# Database
DATABASE_URL=postgresql://user:pass@host:5432/database

# Optional services
FIRECRAWL_API_KEY=jouw_firecrawl_key
SENTRY_DSN=jouw_sentry_dsn
```

### 5. Lokaal Testen
```bash
wrangler dev
```

Server draait nu op `http://localhost:8792`. Test met MCP Inspector:
```bash
npx @modelcontextprotocol/inspector@latest
```

Verbind met `http://localhost:8792/mcp` en doorloop OAuth flow.

**Email Setup:** Ga naar `http://localhost:8792/microsoft/authorize?userId=jouw-github-username` om Microsoft authenticatie te voltooien voor email functionaliteit.

## Claude Desktop Integratie

Voeg toe aan je Claude Desktop configuratie:

```json
{
  "mcpServers": {
    "database-scraper": {
      "command": "npx",
      "args": [
        "mcp-remote", 
        "http://localhost:8792/mcp"
      ]
    }
  }
}
```

Herstart Claude Desktop en je tools zijn beschikbaar.

## Toegangsbeheer

### Database Write Access
Bewerk `src/tools/database-tools.ts`:
```typescript
const ALLOWED_USERNAMES = new Set([
  'jouw-github-username',
  'teamlid-username'
]);
```

### Firecrawl Access
Bewerk `src/tools/firecrawl-tools.ts`:
```typescript
const ALLOWED_USERNAMES = new Set([
  'jouw-github-username'
]);
```

## Productie Deployment

### 1. CloudFlare Setup
```bash
# Maak KV namespace voor sessions
wrangler kv namespace create "OAUTH_KV"

# Update wrangler.jsonc met de namespace ID
```

### 2. Productie Secrets
```bash
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put MS_CLIENT_ID
wrangler secret put MS_CLIENT_SECRET
wrangler secret put COOKIE_ENCRYPTION_KEY
wrangler secret put DATABASE_URL
wrangler secret put FIRECRAWL_API_KEY
wrangler secret put SENTRY_DSN
```

### 3. Production OAuth Update
**GitHub OAuth App:** Update voor productie:
- **Homepage URL**: `https://jouw-worker.workers.dev`
- **Authorization callback**: `https://jouw-worker.workers.dev/callback`

**Azure App Registration:** Update voor productie:
- **Redirect URI**: `https://jouw-worker.workers.dev/microsoft/callback`

### 4. Deploy
```bash
wrangler deploy
```

## Praktische Voorbeelden

**Database queries:**
```sql
-- Gebruik listTables eerst voor schema discovery
-- Dan queryDatabase voor analyse:
SELECT DATE(created_at) as dag, COUNT(*) 
FROM orders 
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at);
```

**Email workflows:**
```javascript
// Verstuur simple email
await sendEmail({
  to: "recipient@example.com",
  subject: "Hello World",
  body: "Dit is een test email vanuit MCP!"
});

// Verstuur HTML email met opmaak
await sendEmail({
  to: "recipient@example.com",
  cc: "manager@company.com",
  subject: "Project Update",
  body: "<h2>Project Status</h2><p>Het project loopt volgens planning...</p>",
  importance: "high"
});
```

**Web scraping workflows:**
- Start met `mapWebsite` voor URL discovery
- Gebruik `crawlWebsite` voor bulk content extraction
- `scrapePage` voor specifieke pagina's met dynamic content
- `searchWeb` voor content discovery across multiple sites

**Sequential thinking:**
Perfect voor het uitwerken van complexe architectuur beslissingen, API design, of troubleshooting met stapsgewijze analyse.

## Architecture & Security

- **Edge deployment** - Wereldwijd beschikbaar via Cloudflare Workers
- **OAuth protection** - GitHub-based authentication met signed cookies
- **SQL injection protection** - Query validation en sanitization
- **Rate limiting** - Automatische retry logic met exponential backoff
- **Error handling** - Comprehensive error categorization en logging

## Troubleshooting

**OAuth issues**: Controleer of callback URLs exact matchen (localhost vs 127.0.0.1).

**Database timeouts**: Workers hebben execution limits - partitioneer zware queries.

**Permission errors**: Voeg je GitHub username toe aan relevante `ALLOWED_USERNAMES` lijsten.

**Firecrawl rate limits**: Tools hebben ingebouwde retry logic, check je quota bij persistente errors.

## Testing

```bash
npm test
```

Tests gebruiken mocked dependencies, dus geen echte database/API keys nodig.