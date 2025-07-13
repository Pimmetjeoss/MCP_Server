# Database Gateway voor AI Applicaties

Tijdens mijn experimenten met Model Context Protocol servers kwam ik tegen het probleem dat ik AI applicaties wilde laten praten met mijn PostgreSQL databases. Na veel uitproberen heb ik deze oplossing gebouwd die draait op Cloudflare's edge netwerk en GitHub gebruikt voor toegangsbeheer.

## Waarom deze database gateway?

Toen ik begon met MCP servers merkte ik dat er geen goede manier was om AI tools veilig met databases te laten werken. De meeste oplossingen waren of te simpel (alleen read-only) of geen toegangscontrole. Daarom bouwde ik deze gateway die:

Het probleem oplost van **veilige database toegang** - AI applicaties kunnen queries uitvoeren maar alleen gebruikers die je vertrouwt kunnen data aanpassen. De **GitHub integratie zorgt ervoor** dat je precies kunt bepalen wie wat mag doen zonder ingewikkelde configuratie. Daarnaast kun je dit makkelijk voor een divers team uitbreiden en beheren.

**Edge deployment betekent** dat je database gateway wereldwijd beschikbaar is met lage latency. **Automatische schema detectie** zorgt ervoor dat AI tools direct begrijpen hoe jouw database in elkaar steekt.

## Je eerste implementatie

### Wat heb je nodig?

Voor je begint zorg dat je deze dingen hebt:
- Een werkende Node.js installatie (ik gebruik meestal de LTS versie)
- Cloudflare account - de gratis tier werkt prima voor experimenteren
- GitHub account voor de authenticatie flow
- Een PostgreSQL database (lokaal of cloud, maakt niet uit)

### Quick start process

Begin met het opzetten van Wrangler, Cloudflare's command line tool:

```bash
npm install -g wrangler
wrangler login
```

Download en setup het project:

```bash
git clone https://github.com/Pimmetjeoss/MCP_Server.git
cd MCP_Server
npm install
```

## Configuratie die daadwerkelijk werkt

### GitHub authenticatie opzetten

Het authenticatie verhaal is eigenlijk simpeler dan het lijkt. Je hebt twee OAuth apps nodig - een voor development en een voor productie.

Voor development ga je naar [GitHub Developer Settings](https://github.com/settings/developers) en maak je een nieuwe OAuth App met:
- Homepage: `http://localhost:8792`
- Callback: `http://localhost:8792/callback`

### Database verbinding configureren

Maak een `.dev.vars` bestand vanaf het voorbeeld:

```bash
cp .dev.vars.example .dev.vars
```

Vul het in met jouw gegevens:

```
GITHUB_CLIENT_ID=jouw_client_id_hier
GITHUB_CLIENT_SECRET=jouw_secret_hier
COOKIE_ENCRYPTION_KEY=willekeurige_32_char_string
DATABASE_URL=postgresql://gebruiker:wachtwoord@host:5432/database
```

Voor de encryption key gebruik ik altijd:
```bash
openssl rand -hex 32
```

### Database setup die ik aanbevel

Ik werk het liefst met Supabase voor nieuwe projecten omdat het makkelijk op te zetten is. Maar elke PostgreSQL database werkt - lokaal, AWS RDS, Google Cloud, wat dan ook.

Het mooie is dat je geen speciale database schema nodig hebt. De gateway ontdekt automatisch je tabellen en kolommen. Wel handig om te beginnen met wat test data zodat je direct kunt experimenteren.

## Lokaal testen en debuggen

Start de server lokaal:
```bash
wrangler dev
```

Nu draait je gateway op `http://localhost:8792`. 

### Testen met de MCP Inspector

De MCP Inspector is onmisbaar voor debuggen. Install en start het:

```bash
npx @modelcontextprotocol/inspector@latest
```

Verbind met `http://localhost:8792/mcp` en doorloop de GitHub OAuth flow. Je ziet dan drie tools verschijnen die je kunt testen.

## Productie deployment strategie

### CloudFlare Workers setup

Eerst de KV namespace voor session storage:
```bash
wrangler kv namespace create "OAUTH_KV"
```

Update `wrangler.jsonc` met de nieuwe namespace ID en deploy:
```bash
wrangler deploy
```

### Productie secrets configureren

Voor productie maak je een nieuwe GitHub OAuth app met je workers.dev URL en zet je de secrets:

```bash
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put COOKIE_ENCRYPTION_KEY
wrangler secret put DATABASE_URL
```

## Hoe werken de database functies?

### De drie hoofdfuncties

**`listTables`** - Dit gebruik ik altijd eerst om te zien wat er in een database zit. Toont alle tabellen, kolommen en hun types. Iedereen die is ingelogd kan dit gebruiken.

**`queryDatabase`** - Voor alle SELECT queries. Veilig omdat het alleen data kan lezen, niet aanpassen. Ook voor iedereen beschikbaar na inloggen.

**`executeDatabase`** - De 'gevaarlijke' functie voor INSERT, UPDATE, DELETE. Alleen beschikbaar voor usernames die je expliciet toevoegt aan de code.

### Toegangsbeheer implementatie

In `src/index.ts` vind je deze regel:

```typescript
const ALLOWED_USERNAMES = new Set([
  'jouw-github-username',
  // voeg hier teamleden toe
]);
```

Alleen deze gebruikers kunnen data aanpassen. Iedereen kan lezen, maar schrijven is beperkt.

### Praktische voorbeelden

Wat ik vaak doe:

```sql
-- Database structuur verkennen
-- Gebruik listTables tool eerst

-- Data analyseren  
SELECT DATE(created_at) as dag, COUNT(*) as orders 
FROM orders 
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at);

-- Data opschonen (alleen als je writeaccess hebt)
DELETE FROM temp_data WHERE created_at < NOW() - INTERVAL '7 days';
```

## Claude Desktop integratie

Open Claude Desktop settings en voeg dit toe aan je config:

```json
{
  "mcpServers": {
    "database": {
      "command": "npx",
      "args": [
        "mcp-remote", 
        "https://jouw-worker.workers.dev/mcp"
      ]
    }
  }
}
```

Herstart Claude en je ziet de database tools verschijnen. Nu kun je gewoon vragen stellen zoals "Hoeveel gebruikers zijn er deze maand bijgekomen?" en Claude haalt de data direct op.

## Transport protocollen

De gateway ondersteunt twee manieren van communiceren:

**`/mcp` endpoint** (nieuwer): Betere performance, automatische reconnection, bidirectionele communicatie. Dit gebruik ik standaard.

**`/sse` endpoint** (legacy): Voor compatibility met oudere tools. Werkt via Server-Sent Events.

Voor nieuwe projecten ga altijd voor `/mcp`.

## Monitoring met Sentry (optioneel)

Als je errors wilt tracken kun je Sentry integreren. Maak een account op sentry.io en gebruik `src/index_sentry.ts` in plaats van de standaard versie.

Voeg je Sentry DSN toe aan de secrets:
```bash
wrangler secret put SENTRY_DSN
```

Update `wrangler.jsonc` om de Sentry versie te gebruiken en redeploy.

## Architectuur overwegingen

### Hoe ik het heb opgezet

**OAuth Provider** beheert de GitHub authenticatie flow en slaat tokens veilig op in CloudFlare KV storage.

**Durable MCP** zorgt ervoor dat de MCP server state persistent blijft tussen requests en gebruiker context beschikbaar is.

**MCP Remote** handelt de communicatie af tussen AI clients en je server via het MCP protocol.

### Code organisatie

Alle tools zitten in aparte bestanden in `src/tools/`. Om een nieuwe functie toe te voegen:
1. Maak een nieuw bestand in `tools/`
2. Implementeer de tool functie
3. Voeg het toe in `registerAllTools()`

## Troubleshooting tips

**OAuth problemen**: Check of je callback URLs exact overeenkomen. Localhost vs 127.0.0.1 maakt verschil.

**Database timeouts**: CloudFlare Workers hebben een execution time limit. Voor zware queries overweeg je data te partitioneren.

**Permission errors**: Vergeet niet je GitHub username toe te voegen aan `ALLOWED_USERNAMES` voor write access.

## Testing aanpak

Run de test suite:
```bash
npm test
```

Ik test voornamelijk:
- Database connectie en query validatie  
- Permission checking voor verschillende usernames
- Tool registratie en response formatting
- OAuth flow simulatie

De tests gebruiken mocked dependencies dus je hebt geen echte database nodig om ze te draaien.

---

Dit is de setup die ik gebruik voor al mijn MCP database projecten. Het werkt betrouwbaar in productie en is makkelijk uit te breiden met nieuwe functionaliteit.
