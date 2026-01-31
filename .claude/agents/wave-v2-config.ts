/**
 * Wave V2 Agent SDK Configuration
 *
 * This file defines the agent configuration for the Wave V2 Aerospace Safety Protocol.
 * It includes specialized subagents for different development roles.
 */

import { ClaudeAgentOptions, AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

// =============================================================================
// Schema Definitions (Zod v4)
// =============================================================================

export const StorySchemaV4_1 = z.object({
  storyId: z.string().regex(/^[A-Z]+-[A-Z]+-\d+$/, "Story ID must match EPIC-TYPE-NNN format"),
  title: z.string().min(10, "Title must be at least 10 characters"),
  epic: z.string(),
  wave: z.number().int().min(1).max(6),
  status: z.enum(["backlog", "ready", "in-progress", "review", "done"]),
  dalLevel: z.enum(["A", "B", "C", "D", "E"]),

  // Research validation (required for Wave V2)
  researchValidation: z.object({
    validated: z.boolean(),
    apiEndpointsVerified: z.boolean(),
    dependenciesConfirmed: z.boolean(),
    securityReviewed: z.boolean(),
    validatedAt: z.string().datetime().optional(),
    validatedBy: z.string().optional()
  }),

  // Acceptance criteria in EARS format
  acceptanceCriteria: z.array(z.object({
    id: z.string(),
    type: z.enum(["ubiquitous", "event-driven", "unwanted", "state-driven", "optional"]),
    trigger: z.string().optional(),
    condition: z.string().optional(),
    behavior: z.string(),
    verified: z.boolean().default(false)
  })),

  // Gate tracking
  gates: z.object({
    gate0: z.object({ passed: z.boolean(), timestamp: z.string().optional(), agent: z.string().optional() }),
    gate1: z.object({ passed: z.boolean(), timestamp: z.string().optional(), agent: z.string().optional() }),
    gate2: z.object({ passed: z.boolean(), timestamp: z.string().optional(), agent: z.string().optional() }),
    gate3: z.object({ passed: z.boolean(), timestamp: z.string().optional(), agent: z.string().optional() }),
    gate4: z.object({ passed: z.boolean(), timestamp: z.string().optional(), agent: z.string().optional() }),
    gate5: z.object({ passed: z.boolean(), timestamp: z.string().optional(), agent: z.string().optional() }),
    gate6: z.object({ passed: z.boolean(), timestamp: z.string().optional(), agent: z.string().optional() }),
    gate7: z.object({ passed: z.boolean(), timestamp: z.string().optional(), agent: z.string().optional() })
  }).optional(),

  // Dependencies
  dependencies: z.array(z.string()).optional(),
  blockedBy: z.array(z.string()).optional()
});

export type Story = z.infer<typeof StorySchemaV4_1>;

export const SignalSchema = z.object({
  storyId: z.string(),
  event: z.enum(["started", "passed", "failed", "complete"]),
  gate: z.string().optional(),
  timestamp: z.string().datetime(),
  agent: z.string()
});

export type Signal = z.infer<typeof SignalSchema>;

// =============================================================================
// Subagent Definitions
// =============================================================================

export const waveV2Agents: Record<string, AgentDefinition> = {
  "be-dev": {
    description: "Backend Development Agent - Handles API endpoints, database schemas, and server-side logic",
    prompt: `You are a Backend Development Agent following the Wave V2 Aerospace Safety Protocol.

Your responsibilities:
1. Implement API endpoints following OpenAPI specifications
2. Design and implement database schemas
3. Write server-side business logic
4. Ensure proper error handling and validation
5. Follow TDD: Write tests BEFORE implementation (RED → GREEN → REFACTOR)

Gate Requirements:
- Gate 0: Verify research validation exists
- Gate 1: Self-verify implementation matches acceptance criteria
- Gate 2: All builds must pass
- Gate 3: Tests must have 80%+ coverage
- Gate 4: QA review required
- Gate 5: PM approval required
- Gate 6: Architecture review for DAL A/B stories

Always create signal files in .claude/signals/ when gates pass.
Branch naming: feature/EPIC-TYPE-NNN`,
    tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"]
  },

  "fe-dev": {
    description: "Frontend Development Agent - Handles UI components, state management, and user interactions",
    prompt: `You are a Frontend Development Agent following the Wave V2 Aerospace Safety Protocol.

Your responsibilities:
1. Implement React/Next.js components
2. Handle state management and data fetching
3. Ensure accessibility (WCAG compliance)
4. Implement responsive design
5. Follow TDD: Write tests BEFORE implementation (RED → GREEN → REFACTOR)

Gate Requirements:
- Gate 0: Verify research validation exists
- Gate 1: Self-verify implementation matches acceptance criteria
- Gate 2: All builds must pass
- Gate 3: Tests must have 80%+ coverage (unit + E2E)
- Gate 4: QA review required
- Gate 5: PM approval required
- Gate 6: Architecture review for DAL A/B stories

Always create signal files in .claude/signals/ when gates pass.
Branch naming: feature/EPIC-TYPE-NNN`,
    tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"]
  },

  "qa-agent": {
    description: "Quality Assurance Agent - Reviews code, validates tests, ensures coverage requirements",
    prompt: `You are a Quality Assurance Agent following the Wave V2 Aerospace Safety Protocol.

Your responsibilities:
1. Review code for quality and best practices
2. Verify test coverage meets DAL requirements:
   - DAL A: 100% MC/DC coverage
   - DAL B: 100% decision coverage
   - DAL C: 100% statement coverage
   - DAL D: 80%+ coverage
   - DAL E: 60%+ coverage
3. Run integration and E2E tests
4. Verify acceptance criteria in EARS format
5. Document any defects or anomalies

Gate 4 Checklist:
- [ ] All tests passing
- [ ] Coverage requirements met for DAL level
- [ ] No security vulnerabilities
- [ ] Performance benchmarks met
- [ ] Accessibility verified

Create signal file: signal-{STORY_ID}-gate4-passed.json`,
    tools: ["Read", "Bash", "Glob", "Grep"]
  },

  "devops-agent": {
    description: "DevOps Agent - Handles CI/CD, deployments, and infrastructure",
    prompt: `You are a DevOps Agent following the Wave V2 Aerospace Safety Protocol.

Your responsibilities:
1. Configure CI/CD pipelines
2. Manage deployments
3. Monitor build health
4. Ensure infrastructure compliance

Gate 2 Requirements:
- All lint checks pass
- TypeScript compilation successful
- Build artifacts generated
- No security vulnerabilities in dependencies

Create signal file: signal-{STORY_ID}-gate2-passed.json`,
    tools: ["Read", "Bash", "Glob", "Grep"]
  },

  "research-agent": {
    description: "Research Agent - Validates APIs, dependencies, and technical feasibility before development",
    prompt: `You are a Research Agent following the Wave V2 Aerospace Safety Protocol.

Your responsibilities:
1. Verify API endpoints exist and match expected schemas
2. Confirm all dependencies are available and compatible
3. Review security implications
4. Document technical constraints
5. Update story's researchValidation field

Research Validation Checklist:
- [ ] API endpoints verified (200 response, correct schema)
- [ ] Dependencies confirmed (npm/pip packages available)
- [ ] Security reviewed (no known vulnerabilities)
- [ ] Technical feasibility confirmed

Output: Update story JSON with researchValidation.validated = true`,
    tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "WebFetch"]
  }
};

// =============================================================================
// Wave V2 Agent Options Factory
// =============================================================================

export function createWaveV2Options(storyId: string, agentType: keyof typeof waveV2Agents): ClaudeAgentOptions {
  const agent = waveV2Agents[agentType];

  return {
    allowedTools: [...agent.tools, "Task"],
    agents: waveV2Agents,
    permissionMode: "acceptEdits",
    settingSources: ["project"],
    hooks: {
      PostToolUse: [
        {
          matcher: "Edit|Write",
          hooks: [async (input, toolUseId, context) => {
            const filePath = (input as { tool_input?: { file_path?: string } }).tool_input?.file_path ?? "";
            // Log file changes for audit
            console.log(`[Wave V2 Audit] ${new Date().toISOString()}: ${agentType} modified ${filePath}`);
            return {};
          }]
        }
      ]
    },
    env: {
      STORY_ID: storyId,
      AGENT_TYPE: agentType,
      SIGNALS_DIR: ".claude/signals",
      STORIES_DIR: "stories"
    }
  };
}

// =============================================================================
// Story Executor
// =============================================================================

export interface StoryExecutionResult {
  storyId: string;
  success: boolean;
  gatesPassed: string[];
  gatesFailed: string[];
  errors: string[];
}

export const GATE_SEQUENCE = [
  "gate0", "gate1", "gate2", "gate3", "gate4", "gate5", "gate6", "gate7"
] as const;

export const GATE_DESCRIPTIONS: Record<string, string> = {
  gate0: "Pre-flight Check - Research validation",
  gate1: "Self-Verify - Implementation matches acceptance criteria",
  gate2: "Build Gate - All builds pass",
  gate3: "Test Gate - Coverage requirements met",
  gate4: "QA Gate - Quality review passed",
  gate5: "PM Gate - Product approval",
  gate6: "Architecture Gate - Technical review (DAL A/B)",
  gate7: "Merge Gate - Ready for integration"
};
