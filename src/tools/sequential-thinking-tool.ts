import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Props } from "../types";

interface ThoughtData {
  thought: string;
  thoughtNumber: number;
  totalThoughts: number;
  isRevision?: boolean;
  revisesThought?: number;
  branchFromThought?: number;
  branchId?: string;
  needsMoreThoughts?: boolean;
  nextThoughtNeeded: boolean;
}

export class SequentialThinkingState {
  private thoughtHistory: Map<string, ThoughtData[]> = new Map();
  private branches: Map<string, Record<string, ThoughtData[]>> = new Map();

  constructor() {}

  addThought(userId: string, thought: ThoughtData): void {
    if (!this.thoughtHistory.has(userId)) {
      this.thoughtHistory.set(userId, []);
    }
    
    this.thoughtHistory.get(userId)!.push(thought);

    if (thought.branchFromThought && thought.branchId) {
      if (!this.branches.has(userId)) {
        this.branches.set(userId, {});
      }
      const userBranches = this.branches.get(userId)!;
      if (!userBranches[thought.branchId]) {
        userBranches[thought.branchId] = [];
      }
      userBranches[thought.branchId].push(thought);
    }
  }

  getUserThoughts(userId: string): ThoughtData[] {
    return this.thoughtHistory.get(userId) || [];
  }

  getUserBranches(userId: string): Record<string, ThoughtData[]> {
    return this.branches.get(userId) || {};
  }
}

// Exact schema zoals origineel
const SequentialThinkingSchema = {
  thought: z.string().describe("Your current thinking step"),
  nextThoughtNeeded: z.boolean().describe("Whether another thought step is needed"),
  thoughtNumber: z.number().min(1).describe("Current thought number"),
  totalThoughts: z.number().min(1).describe("Estimated total thoughts needed"),
  isRevision: z.boolean().optional().describe("Whether this revises previous thinking"),
  revisesThought: z.number().min(1).optional().describe("Which thought is being reconsidered"),
  branchFromThought: z.number().min(1).optional().describe("Branching point thought number"),
  branchId: z.string().optional().describe("Branch identifier"),
  needsMoreThoughts: z.boolean().optional().describe("If more thoughts are needed")
};

export function registerSequentialThinkingTool(
  server: McpServer, 
  env: Env, 
  props: Props,
  thinkingState: SequentialThinkingState
) {
  server.tool(
    "sequentialthinking",
    `A detailed tool for dynamic and reflective problem-solving through thoughts.
This tool helps analyze problems through a flexible thinking process that can adapt and evolve.
Each thought can build on, question, or revise previous insights as understanding deepens.

When to use this tool:
- Breaking down complex problems into steps
- Planning and design with room for revision
- Analysis that might need course correction
- Problems where the full scope might not be clear initially

You should:
1. Start with an initial estimate of needed thoughts, but be ready to adjust
2. Feel free to question or revise previous thoughts
3. Don't hesitate to add more thoughts if needed, even at the "end"
4. Only set nextThoughtNeeded to false when truly done`,
    SequentialThinkingSchema,
    async (args) => {
      try {
        // Valideer dat we alle required fields hebben
        const thoughtData: ThoughtData = {
          thought: args.thought,
          thoughtNumber: args.thoughtNumber,
          totalThoughts: args.totalThoughts,
          nextThoughtNeeded: args.nextThoughtNeeded,
          isRevision: args.isRevision,
          revisesThought: args.revisesThought,
          branchFromThought: args.branchFromThought,
          branchId: args.branchId,
          needsMoreThoughts: args.needsMoreThoughts
        };

        // Adjust totalThoughts als nodig
        if (thoughtData.thoughtNumber > thoughtData.totalThoughts) {
          thoughtData.totalThoughts = thoughtData.thoughtNumber;
        }

        // Voeg toe aan history
        thinkingState.addThought(props.login, thoughtData);

        const userThoughts = thinkingState.getUserThoughts(props.login);
        const userBranches = thinkingState.getUserBranches(props.login);

        // Log formatting (zonder chalk)
        if (env.DISABLE_THOUGHT_LOGGING !== "true") {
          let prefix = '💭 Thought';
          if (thoughtData.isRevision) prefix = '🔄 Revision';
          else if (thoughtData.branchFromThought) prefix = '🌿 Branch';
          
          console.log(`[${props.login}] ${prefix} ${thoughtData.thoughtNumber}/${thoughtData.totalThoughts}: ${thoughtData.thought}`);
        }

        // Return exact format zoals origineel
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              thoughtNumber: thoughtData.thoughtNumber,
              totalThoughts: thoughtData.totalThoughts,
              nextThoughtNeeded: thoughtData.nextThoughtNeeded,
              branches: Object.keys(userBranches),
              thoughtHistoryLength: userThoughts.length
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
              status: 'failed'
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );
}