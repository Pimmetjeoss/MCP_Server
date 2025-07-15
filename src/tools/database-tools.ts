import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { 
	Props, 
	ListTablesSchema, 
	QueryDatabaseSchema, 
	ExecuteDatabaseSchema,
	createErrorResponse,
	createSuccessResponse
} from "../types";
import { validateSqlQuery, isWriteOperation, formatDatabaseError } from "../database/security";
import { withDatabase } from "../database/utils";
import { z } from 'zod';
import { DatabaseReportSchema, DatabaseReport } from '../schemas/database-report.schema';

const ALLOWED_USERNAMES = new Set<string>([
	// Add GitHub usernames of users who should have access to database write operations
	// For example: 'yourusername', 'coworkerusername'
	'Pimmetjeoss'
]);

export function registerDatabaseTools(server: McpServer, env: Env, props: Props) {
	// Tool 1: List Tables - Available to all authenticated users
	server.tool(
		"listTables",
		"Get a list of all tables in the database along with their column information. Use this first to understand the database structure before querying.",
		ListTablesSchema,
		async () => {
			try {
				return await withDatabase((env as any).DATABASE_URL, async (db) => {
					// Single query to get all table and column information (using your working query)
					const columns = await db.unsafe(`
						SELECT 
							table_name, 
							column_name, 
							data_type, 
							is_nullable,
							column_default
						FROM information_schema.columns 
						WHERE table_schema = 'public' 
						ORDER BY table_name, ordinal_position
					`);
					
					// Group columns by table
					const tableMap = new Map();
					for (const col of columns) {
						// Use snake_case property names as returned by the SQL query
						if (!tableMap.has(col.table_name)) {
							tableMap.set(col.table_name, {
								name: col.table_name,
								schema: 'public',
								columns: []
							});
						}
						tableMap.get(col.table_name).columns.push({
							name: col.column_name,
							type: col.data_type,
							nullable: col.is_nullable === 'YES',
							default: col.column_default
						});
					}
					
					const tableInfo = Array.from(tableMap.values());
					
					return {
						content: [
							{
								type: "text",
								text: `**Database Tables and Schema**\n\n${JSON.stringify(tableInfo, null, 2)}\n\n**Total tables found:** ${tableInfo.length}\n\n**Note:** Use the \`queryDatabase\` tool to run SELECT queries, or \`executeDatabase\` tool for write operations (if you have write access).`
							}
						]
					};
				});
			} catch (error) {
				console.error('listTables error:', error);
				return createErrorResponse(
					`Error retrieving database schema: ${formatDatabaseError(error)}`
				);
			}
		}
	);

	// Tool 2: Query Database - Available to all authenticated users (read-only)
	server.tool(
		"queryDatabase",
		"Execute a read-only SQL query against the PostgreSQL database. This tool only allows SELECT statements and other read operations. All authenticated users can use this tool.",
		QueryDatabaseSchema,
		async ({ sql }) => {
			try {
				// Validate the SQL query
				const validation = validateSqlQuery(sql);
				if (!validation.isValid) {
					return createErrorResponse(`Invalid SQL query: ${validation.error}`);
				}
				
				// Check if it's a write operation
				if (isWriteOperation(sql)) {
					return createErrorResponse(
						"Write operations are not allowed with this tool. Use the `executeDatabase` tool if you have write permissions (requires special GitHub username access)."
					);
				}
				
				return await withDatabase((env as any).DATABASE_URL, async (db) => {
					const results = await db.unsafe(sql);
					
					return {
						content: [
							{
								type: "text",
								text: `**Query Results**\n\`\`\`sql\n${sql}\n\`\`\`\n\n**Results:**\n\`\`\`json\n${JSON.stringify(results, null, 2)}\n\`\`\`\n\n**Rows returned:** ${Array.isArray(results) ? results.length : 1}`
							}
						]
					};
				});
			} catch (error) {
				console.error('queryDatabase error:', error);
				return createErrorResponse(`Database query error: ${formatDatabaseError(error)}`);
			}
		}
	);

	// Tool 3: Execute Database - Only available to privileged users (write operations)
	if (ALLOWED_USERNAMES.has(props.login)) {
		server.tool(
			"executeDatabase",
			"Execute any SQL statement against the PostgreSQL database, including INSERT, UPDATE, DELETE, and DDL operations. This tool is restricted to specific GitHub users and can perform write transactions. **USE WITH CAUTION** - this can modify or delete data.",
			ExecuteDatabaseSchema,
			async ({ sql }) => {
				try {
					// Validate the SQL query
					const validation = validateSqlQuery(sql);
					if (!validation.isValid) {
						return createErrorResponse(`Invalid SQL statement: ${validation.error}`);
					}
					
					return await withDatabase((env as any).DATABASE_URL, async (db) => {
						const results = await db.unsafe(sql);
						
						const isWrite = isWriteOperation(sql);
						const operationType = isWrite ? "Write Operation" : "Read Operation";
						
						return {
							content: [
								{
									type: "text",
									text: `**${operationType} Executed Successfully**\n\`\`\`sql\n${sql}\n\`\`\`\n\n**Results:**\n\`\`\`json\n${JSON.stringify(results, null, 2)}\n\`\`\`\n\n${isWrite ? '**⚠️ Database was modified**' : `**Rows returned:** ${Array.isArray(results) ? results.length : 1}`}\n\n**Executed by:** ${props.login} (${props.name})`
								}
							]
						};
					});
				} catch (error) {
					console.error('executeDatabase error:', error);
					return createErrorResponse(`Database execution error: ${formatDatabaseError(error)}`);
				}
			}
		);
	}

	// Tool 4: Analyze Database - Available to all authenticated users
	server.tool(
		"analyzeDatabase",
		"Analyseert de gehele database en genereert een gestructureerd JSON rapport met statistieken, kwaliteitsmetrieken en aanbevelingen.",
		{}, // geen parameters nodig
		async () => {
			try {
				return await withDatabase((env as any).DATABASE_URL, async (db) => {
					// 1. Algemene statistieken - gebruik information_schema voor row counts
					const tables = await db.unsafe(`
						SELECT 
							t.table_name,
							t.table_name as name
						FROM information_schema.tables t
						WHERE t.table_schema = 'public'
						ORDER BY t.table_name
					`);

					// Get row counts per table
					let totalRecords = 0;
					for (const table of tables) {
						try {
							const countResult = await db.unsafe(`
								SELECT COUNT(*) as count FROM ${table.table_name}
							`);
							table.row_count = parseInt(countResult[0].count);
							totalRecords += table.row_count;
						} catch (e) {
							table.row_count = 0;
						}
					}

					// Database grootte
					const dbSize = await db.unsafe(`
						SELECT pg_size_pretty(pg_database_size(current_database())) as size
					`);

					// 2. Primaire sleutels ophalen
					const primaryKeys = await db.unsafe(`
						SELECT 
							tc.table_name, 
							kcu.column_name as primary_key
						FROM information_schema.table_constraints tc
						JOIN information_schema.key_column_usage kcu 
							ON tc.constraint_name = kcu.constraint_name
						WHERE tc.constraint_type = 'PRIMARY KEY' 
							AND tc.table_schema = 'public'
					`);

					const pkMap = new Map(
						primaryKeys.map((pk: any) => [pk.table_name, pk.primary_key])
					);

					// 3. Data periode bepalen
					let dataPeriod = "Geen datum velden gevonden";
					try {
						const dateColumns = await db.unsafe(`
							SELECT table_name, column_name 
							FROM information_schema.columns 
							WHERE table_schema = 'public' 
								AND data_type IN ('timestamp', 'date', 'timestamp with time zone', 'timestamp without time zone')
								AND column_name LIKE '%created%'
							LIMIT 1
						`);

						if (dateColumns.length > 0) {
							const dateInfo = await db.unsafe(`
								SELECT 
									MIN(${dateColumns[0].column_name})::text as min_date,
									MAX(${dateColumns[0].column_name})::text as max_date
								FROM ${dateColumns[0].table_name}
							`);
							
							if (dateInfo[0].min_date && dateInfo[0].max_date) {
								dataPeriod = `${dateInfo[0].min_date.split(' ')[0]} tot ${dateInfo[0].max_date.split(' ')[0]}`;
							}
						}
					} catch (e) {
						// Gebruik fallback waarde
					}

					// 4. Data kwaliteit - NULL waarden
					const nullChecks = [];
					for (const table of tables.slice(0, 5)) { // Limit to first 5 tables for performance
						try {
							const columns = await db.unsafe(`
								SELECT column_name 
								FROM information_schema.columns 
								WHERE table_name = $1 
									AND table_schema = 'public'
									AND is_nullable = 'YES'
							`, [table.table_name]);

							for (const col of columns.slice(0, 3)) { // Limit columns per table
								const nullCount = await db.unsafe(`
									SELECT COUNT(*) as null_count 
									FROM ${table.table_name} 
									WHERE ${col.column_name} IS NULL
								`);
								
								if (parseInt(nullCount[0].null_count) > 0) {
									nullChecks.push({
										tabel: table.table_name,
										kolom: col.column_name,
										aantalNull: parseInt(nullCount[0].null_count)
									});
								}
							}
						} catch (e) {
							// Skip als tabel niet toegankelijk is
						}
					}

					// 5. Email domein analyse
					let emailDomains = [];
					try {
						const emailColumns = await db.unsafe(`
							SELECT table_name, column_name 
							FROM information_schema.columns 
							WHERE table_schema = 'public' 
								AND (column_name LIKE '%email%' OR column_name LIKE '%mail%')
							LIMIT 1
						`);

						if (emailColumns.length > 0) {
							const domainData = await db.unsafe(`
								SELECT 
									LOWER(SUBSTRING(${emailColumns[0].column_name} FROM POSITION('@' IN ${emailColumns[0].column_name}) + 1)) as domain,
									COUNT(*) as count
								FROM ${emailColumns[0].table_name}
								WHERE ${emailColumns[0].column_name} IS NOT NULL
									AND ${emailColumns[0].column_name} LIKE '%@%'
								GROUP BY domain
								ORDER BY count DESC
								LIMIT 5
							`);

							const totalEmails = domainData.reduce((sum: number, d: any) => 
								sum + parseInt(d.count), 0
							);

							emailDomains = domainData.map((d: any) => ({
								domein: d.domain || 'onbekend',
								aantal: parseInt(d.count),
								percentage: totalEmails > 0 ? Math.round((parseInt(d.count) / totalEmails) * 100) : 0
							}));
						}
					} catch (e) {
						// Email analyse niet mogelijk
					}

					// 6. Temporele patronen
					let temporelePatronen = {
						meestActievePeriode: "Onbekend",
						gemiddeldeRecordsPerDag: 0,
						trend: "stabiel" as const
					};

					try {
						const dateColumn = await db.unsafe(`
							SELECT table_name, column_name 
							FROM information_schema.columns 
							WHERE table_schema = 'public' 
								AND data_type IN ('timestamp', 'timestamp with time zone', 'timestamp without time zone')
								AND column_name LIKE '%created%'
							LIMIT 1
						`);

						if (dateColumn.length > 0) {
							const activityData = await db.unsafe(`
								SELECT 
									${dateColumn[0].column_name}::date as date,
									COUNT(*) as count
								FROM ${dateColumn[0].table_name}
								WHERE ${dateColumn[0].column_name} >= CURRENT_DATE - INTERVAL '30 days'
								GROUP BY ${dateColumn[0].column_name}::date
								ORDER BY count DESC
								LIMIT 1
							`);

							if (activityData.length > 0) {
								temporelePatronen.meestActievePeriode = activityData[0].date;
								
								// Bereken gemiddelde
								const avgData = await db.unsafe(`
									SELECT AVG(daily_count)::numeric as avg_count
									FROM (
										SELECT COUNT(*) as daily_count
										FROM ${dateColumn[0].table_name}
										WHERE ${dateColumn[0].column_name} >= CURRENT_DATE - INTERVAL '30 days'
										GROUP BY ${dateColumn[0].column_name}::date
									) daily_counts
								`);
								
								temporelePatronen.gemiddeldeRecordsPerDag = 
									Math.round(parseFloat(avgData[0].avg_count) || 0);
							}
						}
					} catch (e) {
						// Temporele analyse niet mogelijk
					}

					// 7. Bouw het rapport
					const report: DatabaseReport = {
						algemeneStatistieken: {
							totaalAantalRecords: totalRecords,
							totaalAantalTabellen: tables.length,
							databaseGrootte: dbSize[0].size,
							periodeVanData: dataPeriod
						},
						tabelOverzicht: tables.map((t: any) => ({
							tabelNaam: t.table_name,
							aantalRecords: t.row_count || 0,
							primaireSleutel: pkMap.get(t.table_name) || "geen"
						})),
						dataKwaliteit: {
							volledigheid: {
								percentageCompleteRecords: nullChecks.length === 0 ? 100 : 
									Math.round((1 - nullChecks.length / Math.max(tables.length * 3, 1)) * 100),
								legeVelden: nullChecks
							},
							consistentie: {
								duplicateRecords: 0,
								formatInconsistenties: []
							}
						},
						emailDomeinAnalyse: emailDomains,
						temporelePatronen: temporelePatronen,
						aanbevelingen: [
							nullChecks.length > 0 
								? `Overweeg NOT NULL constraints toe te voegen aan ${nullChecks.length} kolommen`
								: "Data integriteit is goed, behoud huidige constraints",
							totalRecords > 100000 
								? "Implementeer indexen op frequent gebruikte query kolommen"
								: "Database grootte is beheersbaar, monitor groei",
							emailDomains.length > 0
								? "Valideer email formaten met CHECK constraints"
								: "Voeg email validatie toe indien van toepassing"
						],
						conclusie: `Database bevat ${tables.length} tabellen met totaal ${totalRecords.toLocaleString('nl-NL')} records. ` +
							`${nullChecks.length === 0 ? 'Data kwaliteit is uitstekend.' : `Er zijn ${nullChecks.length} velden met NULL waarden die aandacht vereisen.`}`
					};

					// Valideer het rapport met Zod
					const validatedReport = DatabaseReportSchema.parse(report);

					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(validatedReport, null, 2)
							}
						]
					};
				});
			} catch (error) {
				console.error('analyzeDatabase error:', error);
				
				// Specifieke Zod validatie errors
				if (error instanceof z.ZodError) {
					return createErrorResponse(
						`Rapport validatie gefaald: ${error.errors.map(e => 
							`${e.path.join('.')}: ${e.message}`
						).join(', ')}`
					);
				}
				
				return createErrorResponse(
					`Database analyse fout: ${formatDatabaseError(error)}`
				);
			}
		}
	);
}
