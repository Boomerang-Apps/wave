/**
 * Example: Run multiple agents in parallel
 *
 * This demonstrates running BE-Dev and FE-Dev agents simultaneously
 * for stories that have both backend and frontend components.
 *
 * Usage:
 *   npx ts-node .claude/agents/examples/parallel-agents.ts
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { createWaveV2Options, waveV2Agents } from "../wave-v2-config";

interface AgentResult {
  agent: string;
  success: boolean;
  output: string;
}

async function runAgent(
  storyId: string,
  agentType: keyof typeof waveV2Agents,
  prompt: string
): Promise<AgentResult> {
  const options = createWaveV2Options(storyId, agentType);
  let output = "";

  try {
    for await (const message of query({ prompt, options })) {
      if ("result" in message) {
        output = String(message.result);
      }
    }
    return { agent: agentType, success: true, output };
  } catch (error) {
    return {
      agent: agentType,
      success: false,
      output: error instanceof Error ? error.message : String(error)
    };
  }
}

async function main() {
  const storyId = "AUTH-STORY-001";

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Wave V2 Parallel Agent Execution`);
  console.log(`Story: ${storyId}`);
  console.log(`${"=".repeat(60)}\n`);

  // Run BE-Dev and FE-Dev in parallel
  const [beResult, feResult] = await Promise.all([
    runAgent(
      storyId,
      "be-dev",
      `Analyze backend requirements for story ${storyId}. List API endpoints needed.`
    ),
    runAgent(
      storyId,
      "fe-dev",
      `Analyze frontend requirements for story ${storyId}. List components needed.`
    )
  ]);

  console.log("\n=== Results ===\n");

  console.log(`BE-Dev Agent: ${beResult.success ? "SUCCESS" : "FAILED"}`);
  console.log(`Output: ${beResult.output.substring(0, 200)}...\n`);

  console.log(`FE-Dev Agent: ${feResult.success ? "SUCCESS" : "FAILED"}`);
  console.log(`Output: ${feResult.output.substring(0, 200)}...\n`);

  // Both must succeed for the story to proceed
  const allSucceeded = beResult.success && feResult.success;
  console.log(`\nOverall: ${allSucceeded ? "ALL AGENTS SUCCEEDED" : "SOME AGENTS FAILED"}`);

  process.exit(allSucceeded ? 0 : 1);
}

main().catch(console.error);
