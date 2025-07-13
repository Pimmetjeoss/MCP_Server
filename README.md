# PostgreSQL MCP Server voor Cloudflare Workers

Een productie-klare implementatie van het [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) die directe **PostgreSQL database interactie** mogelijk maakt via een remote server met GitHub OAuth authenticatie, gedeployed op Cloudflare Workers.

## 🚀 Hoofdfunctionaliteiten

- **🔗 Persistente Database Verbindingen**: Directe PostgreSQL integratie voor alle MCP tool aanroepen
- **🧩 Modulaire Tool Architectuur**: Best practice implementatie met single-purpose tools en duidelijke beschrijvingen
- **👥 Gebruikersgebaseerde Toegangscontrole**: GitHub username permissions voor database schrijfoperaties
- **🔍 Automatische Schema Detectie**: Ontdekt tabellen, kolommen en constraints automatisch
- **🔒 Beveiligde Query Uitvoering**: Ingebouwde validatie en bescherming tegen SQL injection
- **📊 Productie Monitoring**: Optionele Sentry integratie voor error tracking
- **🌐 Serverless Deployment**: Draait op [Cloudflare Workers](https://developers.cloudflare.com/workers/) voor wereldwijde schaalbaarheid

## 📁 Projectstructuur

Het project gebruikt een schone, modulaire opzet voor eenvoudig onderhoud en uitbreiding:

- **`src/tools/`** - Individuele tool implementaties per bestand
- **`registerAllTools()`** - Gecentraliseerd systeem voor tool registratie
- **Uitbreidbaar Design** - Voeg nieuwe tools toe door bestanden te maken in `tools/` en te registreren

Deze architectuur maakt het eenvoudig om nieuwe database operaties, externe API integraties of andere MCP tools toe te voegen terwijl de codebase georganiseerd blijft.

## 🔌 Ondersteunde Protocollen

De server ondersteunt zowel moderne als legacy transport protocollen:

- **`/mcp` - Streamable HTTP** (aanbevolen): Gebruikt één endpoint met bidirectionele communicatie, automatische verbinding upgrades en betere weerstand tegen netwerkonderbrekingen
- **`/sse` - Server-Sent Events** (legacy): Gebruikt aparte endpoints voor requests/responses, onderhouden voor backward compatibility

Voor nieuwe implementaties gebruik je het `/mcp` endpoint omdat het betere prestaties en betrouwbaarheid biedt.

## 🛠️ Werkwijze

De MCP server biedt drie belangrijke tools voor database interactie:

1. **`listTables`** - Ophalen van database schema en tabel informatie (alle geauthenticeerde gebruikers)
2. **`queryDatabase`** - Uitvoeren van read-only SQL queries (alle geauthenticeerde gebruikers)
3. **`executeDatabase`** - Uitvoeren van schrijfoperaties zoals INSERT/UPDATE/DELETE (alleen privileged gebruikers)

**Authenticatie Workflow**: Gebruikers authenticeren via GitHub OAuth → Server valideert permissions → Tools worden beschikbaar gemaakt op basis van GitHub username.

**Beveiligingsmodel**: 
- Alle geauthenticeerde GitHub gebruikers kunnen data lezen
- Alleen specifieke GitHub usernames kunnen data schrijven/modificeren
- SQL injection bescherming en query validatie ingebouwd

## 📋 Vereisten

- Node.js geïnstalleerd op je machine
- Een Cloudflare account (gratis tier werkt)
- Een GitHub account voor OAuth configuratie
- Een PostgreSQL database (lokaal of gehost)

## 🏁 Aan de slag

### Stap 1: Wrangler CLI Installeren

Installeer Wrangler globaal om je Cloudflare Workers te beheren:

```bash
npm install -g wrangler
```

### Stap 2: Cloudflare Authenticatie

Log in op je Cloudflare account:

```bash
wrangler login
```

Dit opent een browservenster waar je kunt authenticeren met je Cloudflare account.

### Stap 3: Project Klonen en Configureren

Kloon de repository en installeer dependencies:

```bash
git clone https://github.com/Pimmetjeoss/MCP_Server.git
cd MCP_Server
npm install
```

## ⚙️ Omgevingsvariabelen Configuratie

Voor het draaien van de MCP server moet je verschillende environment variables configureren voor authenticatie en database toegang.

### Environment Variables Bestand Aanmaken

1. **Maak je `.dev.vars` bestand** aan vanaf het voorbeeld:
   ```bash
   cp .dev.vars.example .dev.vars
   ```

2. **Configureer alle vereiste environment variables** in `.dev.vars`:
   ```
   # GitHub OAuth (voor authenticatie)
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   COOKIE_ENCRYPTION_KEY=your_random_encryption_key

   # Database Verbinding
   DATABASE_URL=postgresql://username:password@localhost:5432/database_name

   # Optioneel: Sentry monitoring
   SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
   NODE_ENV=development
   ```

### GitHub OAuth Credentials Verkrijgen

1. **Maak een GitHub OAuth App** voor lokale ontwikkeling:
   - Ga naar [GitHub Developer Settings](https://github.com/settings/developers)
   - Klik "New OAuth App"
   - **Application name**: `MCP Server (Local Development)`
   - **Homepage URL**: `http://localhost:8792`
   - **Authorization callback URL**: `http://localhost:8792/callback`
   - Klik "Register application"

2. **Kopieer je credentials**:
   - Kopieer de **Client ID** en plak het als `GITHUB_CLIENT_ID` in `.dev.vars`
   - Klik "Generate a new client secret", kopieer het, en plak als `GITHUB_CLIENT_SECRET` in `.dev.vars`

### Encryption Key Genereren

Genereer een veilige random encryption key voor cookie encryption:
```bash
openssl rand -hex 32
```
Kopieer de output en plak het als `COOKIE_ENCRYPTION_KEY` in `.dev.vars`.

## 🗃️ Database Configuratie

1. **PostgreSQL opzetten** met een hosted service zoals:
   - [Supabase](https://supabase.com/) (aanbevolen voor beginners)
   - [Neon](https://neon.tech/)
   - Of gebruik lokale PostgreSQL/Docker

2. **Update de DATABASE_URL** in `.dev.vars` met je connection string:
   ```
   DATABASE_URL=postgresql://username:password@host:5432/database_name
   ```

#### Voorbeelden van Connection Strings:
- **Lokaal**: `postgresql://myuser:mypass@localhost:5432/mydb`
- **Supabase**: `postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres`

### Database Schema Configuratie

De MCP server werkt met elke PostgreSQL database schema. Het ontdekt automatisch:
- Alle tabellen in het `public` schema
- Kolomnamen, types en constraints
- Primary keys en indexes

**Verbinding Testen**: Zodra je database is opgezet, kun je het testen door de MCP server te vragen "Welke tabellen zijn beschikbaar in de database?" en vervolgens die tabellen bevragen om je data te verkennen.

## 🔧 Lokale Ontwikkeling & Testen

**Start de server lokaal**:
```bash
wrangler dev
```
Dit maakt de server beschikbaar op `http://localhost:8792`

### Testen met MCP Inspector

Gebruik de [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) om je server te testen:

1. **Installeer en start Inspector**:
   ```bash
   npx @modelcontextprotocol/inspector@latest
   ```

2. **Verbind met je lokale server**:
   - **Voorkeur**: Voer URL in: `http://localhost:8792/mcp` (streamable HTTP transport - nieuwer, robuuster)
   - **Alternatief**: Voer URL in: `http://localhost:8792/sse` (SSE transport - legacy ondersteuning)
   - Klik "Connect"
   - Volg de OAuth prompts om te authenticeren met GitHub
   - Eenmaal verbonden zie je de beschikbare tools

3. **Test de tools**:
   - Gebruik `listTables` om je database structuur te zien
   - Gebruik `queryDatabase` om SELECT queries uit te voeren
   - Gebruik `executeDatabase` (als je schrijftoegang hebt) voor INSERT/UPDATE/DELETE operaties

## 🚀 Productie Deployment

### KV namespace opzetten
Maak de KV namespace aan en update configuratie:
```bash
wrangler kv namespace create "OAUTH_KV"
```
Update het `wrangler.jsonc` bestand met de KV ID (vervang de bestaande ID).

### Deployen naar Cloudflare Workers
Deploy de MCP server om het beschikbaar te maken op je workers.dev domein:

```bash
wrangler deploy
```

### Environment variables aanmaken in productie

1. **Maak een nieuwe [GitHub OAuth App](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app) voor productie**:
   - Voor de Homepage URL, specificeer `https://your-worker-name.your-subdomain.workers.dev`
   - Voor de Authorization callback URL, specificeer `https://your-worker-name.your-subdomain.workers.dev/callback`
   - Noteer je Client ID en genereer een Client secret

2. **Stel alle vereiste secrets in via Wrangler**:
   ```bash
   wrangler secret put GITHUB_CLIENT_ID
   wrangler secret put GITHUB_CLIENT_SECRET
   wrangler secret put COOKIE_ENCRYPTION_KEY  # gebruik: openssl rand -hex 32
   wrangler secret put DATABASE_URL
   wrangler secret put SENTRY_DSN  # optioneel
   ```

### Productie Deployment Testen

Test de remote server met [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector): 

```bash
npx @modelcontextprotocol/inspector@latest
```

Voer `https://your-worker-name.your-subdomain.workers.dev/mcp` (voorkeur) of `https://your-worker-name.your-subdomain.workers.dev/sse` (legacy) in en klik connect. Na het doorlopen van de authenticatie flow zie je de tools werken.

Je hebt nu een remote MCP server gedeployed! 

## 🔐 Database Tools & Toegangscontrole

### Beschikbare Tools

#### 1. `listTables` (Alle Gebruikers)
**Doel**: Database schema en structuur ontdekken  
**Toegang**: Alle geauthenticeerde GitHub gebruikers  
**Gebruik**: Voer dit altijd eerst uit om je database structuur te begrijpen

```
Voorbeeld output:
- Tabellen: users, products, orders
- Kolommen: id (integer), name (varchar), created_at (timestamp)
- Constraints en relaties
```

#### 2. `queryDatabase` (Alle Gebruikers) 
**Doel**: Read-only SQL queries uitvoeren  
**Toegang**: Alle geauthenticeerde GitHub gebruikers  
**Beperkingen**: Alleen SELECT statements en read operaties toegestaan

```sql
-- Voorbeelden van toegestane queries:
SELECT * FROM users WHERE created_at > '2024-01-01';
SELECT COUNT(*) FROM products;
SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id;
```

#### 3. `executeDatabase` (Alleen Privileged Gebruikers)
**Doel**: Schrijfoperaties uitvoeren (INSERT, UPDATE, DELETE, DDL)  
**Toegang**: Beperkt tot specifieke GitHub usernames  
**Mogelijkheden**: Volledige database schrijftoegang inclusief schema modificaties

```sql
-- Voorbeelden van toegestane operaties:
INSERT INTO users (name, email) VALUES ('New User', 'user@example.com');
UPDATE products SET price = 29.99 WHERE id = 1;
DELETE FROM orders WHERE status = 'cancelled';
CREATE TABLE new_table (id SERIAL PRIMARY KEY, data TEXT);
```

### Toegangscontrole Configuratie

Database schrijftoegang wordt gecontroleerd door GitHub username in de `ALLOWED_USERNAMES` configuratie:

```typescript
// Voeg GitHub usernames toe voor database schrijftoegang
const ALLOWED_USERNAMES = new Set([
  'yourusername',    // Vervang met je GitHub username
  'teammate1',       // Voeg teamleden toe die schrijftoegang nodig hebben
  'database-admin'   // Voeg andere vertrouwde gebruikers toe
]);
```

**Om access permissions bij te werken**:
1. Bewerk `src/index.ts` en `src/index_sentry.ts`
2. Update de `ALLOWED_USERNAMES` set met GitHub usernames
3. Redeploy de worker: `wrangler deploy`

### Typische Workflow

1. **🔍 Ontdekken**: Gebruik `listTables` om database structuur te begrijpen
2. **📊 Bevragen**: Gebruik `queryDatabase` om data te lezen en analyseren
3. **✏️ Modificeren**: Gebruik `executeDatabase` (als je schrijftoegang hebt) om wijzigingen te maken

### Beveiligingsfeatures

- **SQL Injection Bescherming**: Alle queries worden gevalideerd voor uitvoering
- **Operatie Type Detectie**: Automatische detectie van read vs write operaties
- **Gebruiker Context Tracking**: Alle operaties worden gelogd met GitHub gebruiker informatie
- **Connection Pooling**: Efficiënt database verbindingsbeheer
- **Error Sanitization**: Database errors worden opgeschoond voordat ze aan gebruikers worden getoond

## 💻 Toegang vanuit Claude Desktop

Open Claude Desktop en navigeer naar Settings -> Developer -> Edit Config. Dit opent het configuratiebestand dat bepaalt welke MCP servers Claude kan benaderen.

Vervang de inhoud met de volgende configuratie. Zodra je Claude Desktop herstart, opent een browservenster met je OAuth login pagina. Voltooi de authenticatie flow om Claude toegang te geven tot je MCP server. Na het verlenen van toegang worden de tools beschikbaar voor gebruik.

```json
{
  "mcpServers": {
    "database": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://your-worker-name.your-subdomain.workers.dev/mcp"
      ]
    }
  }
}
```

Zodra de Tools (onder 🔨) verschijnen in de interface, kun je Claude vragen om te interacteren met je database. Voorbeeld commando's:

- **"Welke tabellen zijn beschikbaar in de database?"** → Gebruikt `listTables` tool
- **"Toon me alle gebruikers aangemaakt in de laatste 30 dagen"** → Gebruikt `queryDatabase` tool
- **"Voeg een nieuwe gebruiker toe genaamd John met email john@example.com"** → Gebruikt `executeDatabase` tool (als je schrijftoegang hebt)

### Claude en andere MCP Clients gebruiken

Bij het gebruik van Claude om verbinding te maken met je remote MCP server, kun je sommige foutmeldingen zien. Dit komt omdat Claude Desktop nog geen volledige ondersteuning heeft voor remote MCP servers, dus het raakt soms in de war. Om te verifiëren of de MCP server is verbonden, hover over het 🔨 icoon in de rechterbenedenhoek van Claude's interface. Je zou je tools daar beschikbaar moeten zien.

#### Cursor en andere MCP Clients gebruiken

Om Cursor te verbinden met je MCP server, kies `Type`: "Command" en in het `Command` veld, combineer de command en args velden tot één (bijv. `npx mcp-remote https://your-worker-name.your-subdomain.workers.dev/sse`).

Let op dat hoewel Cursor HTTP+SSE servers ondersteunt, het geen authenticatie ondersteunt, dus je moet nog steeds `mcp-remote` gebruiken (en een STDIO server gebruiken, geen HTTP).

Je kunt je MCP server verbinden met andere MCP clients zoals Windsurf door het configuratiebestand van de client te openen, dezelfde JSON toe te voegen die werd gebruikt voor de Claude setup, en de MCP client te herstarten.

## 📊 Sentry Integratie (Optioneel)

Dit project bevat optionele Sentry integratie voor uitgebreide error tracking, performance monitoring en distributed tracing. Er zijn twee versies beschikbaar:

- `src/index.ts` - Standaard versie zonder Sentry
- `src/index_sentry.ts` - Versie met volledige Sentry integratie

### Sentry Opzetten

1. **Maak een Sentry Account**: Meld je aan op [sentry.io](https://sentry.io) als je nog geen account hebt.

2. **Maak een Nieuw Project**: Maak een nieuw project in Sentry en selecteer "Cloudflare Workers" als platform (zoek rechtsboven).

3. **Verkrijg je DSN**: Kopieer de DSN uit je Sentry project instellingen.

### Sentry in Productie gebruiken

Om te deployen met Sentry monitoring:

1. **Stel de Sentry DSN secret in**:
   ```bash
   wrangler secret put SENTRY_DSN
   ```
   Voer je Sentry DSN in wanneer gevraagd.

2. **Update je wrangler.jsonc** om de Sentry-enabled versie te gebruiken:
   ```jsonc
   "main": "src/index_sentry.ts"
   ```

3. **Deploy met Sentry**:
   ```bash
   wrangler deploy
   ```

### Sentry in Development gebruiken

1. **Voeg Sentry DSN toe aan je `.dev.vars` bestand**:
   ```
   SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
   NODE_ENV=development
   ```

2. **Start met Sentry enabled**:
   ```bash
   wrangler dev
   ```

### Inbegrepen Sentry Features

- **Error Tracking**: Automatische capture van alle errors met context
- **Performance Monitoring**: Volledige request tracing met 100% sample rate
- **User Context**: Bindt automatisch GitHub gebruiker informatie aan events
- **Tool Tracing**: Elke MCP tool call wordt getraced met parameters
- **Custom Error Handling**: Gebruiksvriendelijke foutmeldingen met Event IDs
- **Context Enrichment**: Automatische tagging en context voor betere debugging

## 🔍 Technische Architectuur

#### OAuth Provider
De OAuth Provider bibliotheek dient als een complete OAuth 2.1 server implementatie voor Cloudflare Workers. Het handelt de complexiteiten van de OAuth flow af, inclusief token uitgifte, validatie en beheer. In dit project speelt het een dubbele rol:

- Authenticeren van MCP clients die verbinding maken met je server
- Beheren van de verbinding met GitHub's OAuth services
- Veilig opslaan van tokens en authenticatie state in KV storage

#### Durable MCP
Durable MCP breidt de basis MCP functionaliteit uit met Cloudflare's Durable Objects, wat biedt:
- Persistente state management voor je MCP server
- Veilige opslag van authenticatie context tussen requests
- Toegang tot geauthenticeerde gebruiker informatie via `this.props`
- Ondersteuning voor conditionele tool beschikbaarheid gebaseerd op gebruiker identiteit

#### MCP Remote
De MCP Remote bibliotheek stelt je server in staat om tools bloot te stellen die aangeroepen kunnen worden door MCP clients zoals de Inspector. Het:
- Definieert het protocol voor communicatie tussen clients en je server
- Biedt een gestructureerde manier om tools te definiëren
- Handelt serialisatie en deserialisatie van requests en responses af
- Onderhoudt de Server-Sent Events (SSE) verbinding tussen clients en je server

## 🧪 Testing

Dit project bevat uitgebreide unit tests die alle belangrijke functionaliteit dekken:

```bash
npm test        # Voer alle tests uit
npm run test:ui # Voer tests uit met UI
```

De test suite dekt database beveiliging, tool registratie, permission handling en response formatting met juiste mocking van externe dependencies.
