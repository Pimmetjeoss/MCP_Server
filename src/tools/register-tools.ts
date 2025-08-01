import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Props } from "../types";
import { registerDatabaseTools } from "./database-tools";
import { registerSequentialThinkingTool, SequentialThinkingState } from "./sequential-thinking-tool";
import { registerFirecrawlTools } from "./firecrawl-tools";
import { registerEmailTools } from "./email-tools";

export function registerAllTools(
	server: McpServer, 
	env: Env, 
	props: Props,
	thinkingState?: SequentialThinkingState
) {
	// Register database tools
	registerDatabaseTools(server, env, props);
	
	// Register sequential thinking tools if state is provided
	if (thinkingState) {
		registerSequentialThinkingTool(server, env, props, thinkingState);
	}
	
	// Register Firecrawl web scraping tools
	registerFirecrawlTools(server, env, props);
	
	// Register email tools (requires Microsoft authentication)
	registerEmailTools(server, env, props);
}