/**
 * Wave V2 Story Executor
 *
 * Executes stories through Gates 0-7 using the Claude Agent SDK.
 * Each gate is handled by the appropriate specialized agent.
 */

import { query, ClaudeAgentOptions } from "@anthropic-ai/claude-agent-sdk";
import * as fs from "fs/promises";
import * as path from "path";
import {
  StorySchemaV4_1,
  Story,
  SignalSchema,
  createWaveV2Options,
  waveV2Agents,
  GATE_SEQUENCE,
  GATE_DESCRIPTIONS,
  StoryExecutionResult
} from "./wave-v2-config";

// =============================================================================
// Signal File Management
// =============================================================================

const SIGNALS_DIR = ".claude/signals";
const STORIES_DIR = "stories";

async function createSignal(
  storyId: string,
  gate: string,
  event: "passed" | "failed",
  agent: string
): Promise<void> {
  const signalDir = path.resolve(process.cwd(), SIGNALS_DIR);
  await fs.mkdir(signalDir, { recursive: true });

  const signal = {
    storyId,
    gate,
    event,
    timestamp: new Date().toISOString(),
    agent
  };

  const filename = `signal-${storyId}-${gate}-${event}.json`;
  await fs.writeFile(
    path.join(signalDir, filename),
    JSON.stringify(signal, null, 2)
  );

  console.log(`[Signal] Created: ${filename}`);
}

async function checkSignalExists(storyId: string, gate: string): Promise<boolean> {
  const signalPath = path.resolve(
    process.cwd(),
    SIGNALS_DIR,
    `signal-${storyId}-${gate}-passed.json`
  );

  try {
    await fs.access(signalPath);
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// Story Loading and Validation
// =============================================================================

async function loadStory(storyId: string): Promise<Story> {
  // Search for story file
  const storyPatterns = [
    `${STORIES_DIR}/**/${storyId}.json`,
    `${STORIES_DIR}/${storyId}.json`,
    `stories/**/${storyId}.json`
  ];

  for (const pattern of storyPatterns) {
    const files = await findFiles(pattern);
    if (files.length > 0) {
      const content = await fs.readFile(files[0], "utf-8");
      const parsed = JSON.parse(content);

      // Validate against schema
      const result = StorySchemaV4_1.safeParse(parsed);
      if (!result.success) {
        console.error(`[Validation Error] Story ${storyId}:`, result.error.issues);
        throw new Error(`Story validation failed: ${result.error.message}`);
      }

      return result.data;
    }
  }

  throw new Error(`Story not found: ${storyId}`);
}

async function findFiles(pattern: string): Promise<string[]> {
  // Simple glob implementation for story files
  const parts = pattern.split("**/");
  const baseDir = parts[0] || ".";
  const filePattern = parts[parts.length - 1];

  const files: string[] = [];

  async function walk(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.name.endsWith(".json") && fullPath.includes(filePattern.replace("*.json", ""))) {
          files.push(fullPath);
        }
      }
    } catch {
      // Directory doesn't exist
    }
  }

  await walk(baseDir);
  return files;
}

// =============================================================================
// Gate Execution
// =============================================================================

type GateAgent = "research-agent" | "be-dev" | "fe-dev" | "qa-agent" | "devops-agent";

const GATE_AGENT_MAP: Record<string, GateAgent> = {
  gate0: "research-agent",
  gate1: "be-dev", // or fe-dev depending on story type
  gate2: "devops-agent",
  gate3: "devops-agent",
  gate4: "qa-agent",
  gate5: "qa-agent", // PM approval simulated
  gate6: "qa-agent", // Architecture review
  gate7: "devops-agent"
};

async function executeGate(
  story: Story,
  gate: string,
  options?: Partial<ClaudeAgentOptions>
): Promise<{ success: boolean; output: string }> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`[Gate ${gate}] ${GATE_DESCRIPTIONS[gate]}`);
  console.log(`[Story] ${story.storyId} - ${story.title}`);
  console.log(`[DAL] ${story.dalLevel}`);
  console.log(`${"=".repeat(60)}\n`);

  // Check if gate already passed
  if (await checkSignalExists(story.storyId, gate)) {
    console.log(`[Skip] ${gate} already passed for ${story.storyId}`);
    return { success: true, output: "Gate already passed" };
  }

  const agentType = GATE_AGENT_MAP[gate];
  const agentOptions = createWaveV2Options(story.storyId, agentType);

  const prompt = buildGatePrompt(story, gate);
  let output = "";

  try {
    for await (const message of query({
      prompt,
      options: { ...agentOptions, ...options }
    })) {
      if ("result" in message) {
        output = String(message.result);
        console.log(output);
      } else if ("content" in message) {
        process.stdout.write(String(message.content));
      }
    }

    // Create success signal
    await createSignal(story.storyId, gate, "passed", agentType);

    return { success: true, output };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Gate ${gate} FAILED] ${errorMsg}`);

    // Create failure signal
    await createSignal(story.storyId, gate, "failed", agentType);

    return { success: false, output: errorMsg };
  }
}

function buildGatePrompt(story: Story, gate: string): string {
  const baseContext = `
Story ID: ${story.storyId}
Title: ${story.title}
Epic: ${story.epic}
Wave: ${story.wave}
DAL Level: ${story.dalLevel}
Status: ${story.status}

Acceptance Criteria:
${story.acceptanceCriteria.map((ac, i) => `${i + 1}. [${ac.type}] ${ac.trigger ? `WHEN ${ac.trigger} ` : ""}${ac.condition ? `IF ${ac.condition} ` : ""}THEN ${ac.behavior}`).join("\n")}
`;

  const gatePrompts: Record<string, string> = {
    gate0: `
${baseContext}

## Gate 0: Pre-flight Check

Verify research validation for this story:
1. Check that researchValidation.validated is true
2. Verify API endpoints are accessible
3. Confirm dependencies are installed
4. Review security implications

If validation is missing, perform research now and update the story file.
Report PASS or FAIL with details.
`,

    gate1: `
${baseContext}

## Gate 1: Self-Verify

Review the implementation and verify:
1. All acceptance criteria are implemented
2. Code follows project conventions
3. No obvious bugs or issues
4. TDD was followed (tests exist before implementation)

Check the branch for this story and verify implementation.
Report PASS or FAIL with details.
`,

    gate2: `
${baseContext}

## Gate 2: Build Gate

Run build verification:
1. Run \`pnpm build\` (or equivalent)
2. Run \`pnpm lint\`
3. Run \`pnpm typecheck\`

All must pass. Report PASS or FAIL with details.
`,

    gate3: `
${baseContext}

## Gate 3: Test Gate

Run tests and verify coverage:
1. Run \`pnpm test:coverage\`
2. Check coverage meets DAL ${story.dalLevel} requirements:
   - DAL A: 100% MC/DC
   - DAL B: 100% decision
   - DAL C: 100% statement
   - DAL D: 80%+
   - DAL E: 60%+

Report PASS or FAIL with coverage numbers.
`,

    gate4: `
${baseContext}

## Gate 4: QA Gate

Perform QA review:
1. Review code quality and best practices
2. Check for security vulnerabilities
3. Verify accessibility compliance
4. Run E2E tests if applicable
5. Verify all acceptance criteria are met

Report PASS or FAIL with QA findings.
`,

    gate5: `
${baseContext}

## Gate 5: PM Gate

Product Manager approval simulation:
1. Verify feature matches requirements
2. Check user experience
3. Verify documentation is complete

Report PASS (auto-approved for now) or FAIL with concerns.
`,

    gate6: `
${baseContext}

## Gate 6: Architecture Gate

${story.dalLevel === "A" || story.dalLevel === "B" ? `
REQUIRED for DAL ${story.dalLevel} story:
1. Review architectural decisions
2. Verify design patterns
3. Check for scalability concerns
4. Review security architecture
` : `
Optional for DAL ${story.dalLevel} - auto-passing.
`}

Report PASS or FAIL with architectural notes.
`,

    gate7: `
${baseContext}

## Gate 7: Merge Gate

Final merge authorization:
1. Verify all previous gates passed
2. Check branch is up to date with main
3. Verify no merge conflicts
4. Confirm ready for integration

Report PASS or FAIL. If PASS, the story can be merged.
`
  };

  return gatePrompts[gate] || `Execute ${gate} for story ${story.storyId}`;
}

// =============================================================================
// Main Story Executor
// =============================================================================

export async function executeStory(
  storyId: string,
  options?: {
    startGate?: string;
    stopGate?: string;
    skipGates?: string[];
  }
): Promise<StoryExecutionResult> {
  console.log(`\n${"#".repeat(70)}`);
  console.log(`# Wave V2 Story Executor`);
  console.log(`# Story: ${storyId}`);
  console.log(`${"#".repeat(70)}\n`);

  const result: StoryExecutionResult = {
    storyId,
    success: true,
    gatesPassed: [],
    gatesFailed: [],
    errors: []
  };

  try {
    const story = await loadStory(storyId);

    const startIndex = options?.startGate
      ? GATE_SEQUENCE.indexOf(options.startGate as typeof GATE_SEQUENCE[number])
      : 0;
    const stopIndex = options?.stopGate
      ? GATE_SEQUENCE.indexOf(options.stopGate as typeof GATE_SEQUENCE[number])
      : GATE_SEQUENCE.length - 1;

    for (let i = startIndex; i <= stopIndex; i++) {
      const gate = GATE_SEQUENCE[i];

      if (options?.skipGates?.includes(gate)) {
        console.log(`[Skip] ${gate} skipped by request`);
        continue;
      }

      const gateResult = await executeGate(story, gate);

      if (gateResult.success) {
        result.gatesPassed.push(gate);
      } else {
        result.gatesFailed.push(gate);
        result.errors.push(`${gate}: ${gateResult.output}`);
        result.success = false;
        break; // Stop on first failure
      }
    }
  } catch (error) {
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : String(error));
  }

  // Final summary
  console.log(`\n${"#".repeat(70)}`);
  console.log(`# Execution Complete`);
  console.log(`# Success: ${result.success}`);
  console.log(`# Gates Passed: ${result.gatesPassed.join(", ") || "none"}`);
  console.log(`# Gates Failed: ${result.gatesFailed.join(", ") || "none"}`);
  console.log(`${"#".repeat(70)}\n`);

  return result;
}

// =============================================================================
// CLI Entry Point
// =============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Wave V2 Story Executor

Usage:
  npx ts-node story-executor.ts <story-id> [options]

Options:
  --start-gate <gate>   Start from specific gate (gate0-gate7)
  --stop-gate <gate>    Stop at specific gate
  --skip <gates>        Comma-separated gates to skip

Examples:
  npx ts-node story-executor.ts AUTH-STORY-001
  npx ts-node story-executor.ts AUTH-STORY-001 --start-gate gate2
  npx ts-node story-executor.ts AUTH-STORY-001 --skip gate5,gate6
`);
    process.exit(0);
  }

  const storyId = args[0];
  const options: Parameters<typeof executeStory>[1] = {};

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--start-gate" && args[i + 1]) {
      options.startGate = args[++i];
    } else if (args[i] === "--stop-gate" && args[i + 1]) {
      options.stopGate = args[++i];
    } else if (args[i] === "--skip" && args[i + 1]) {
      options.skipGates = args[++i].split(",");
    }
  }

  const result = await executeStory(storyId, options);
  process.exit(result.success ? 0 : 1);
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
