/**
 * Example: Run a Wave V2 Story through all gates
 *
 * Usage:
 *   npx ts-node .claude/agents/examples/run-story.ts AUTH-STORY-001
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { createWaveV2Options, waveV2Agents } from "../wave-v2-config";

async function main() {
  const storyId = process.argv[2] || "AUTH-STORY-001";

  console.log(`\nWave V2 Agent SDK Example`);
  console.log(`Running story: ${storyId}\n`);

  // Example 1: Use the BE-Dev agent to implement a story
  console.log("=== Backend Development Agent ===\n");

  const options = createWaveV2Options(storyId, "be-dev");

  for await (const message of query({
    prompt: `
      Analyze story ${storyId} and prepare for implementation.

      1. Read the story file from stories/ directory
      2. Verify research validation exists
      3. List the acceptance criteria
      4. Identify files that need to be created/modified

      Do NOT make any changes yet - just analyze and report.
    `,
    options: {
      ...options,
      allowedTools: ["Read", "Glob", "Grep"] // Read-only for this example
    }
  })) {
    if ("result" in message) {
      console.log("\nResult:", message.result);
    } else if ("content" in message) {
      process.stdout.write(String(message.content));
    }
  }
}

main().catch(console.error);
