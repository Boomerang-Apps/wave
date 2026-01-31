/**
 * Wave V2 oRPC Router
 *
 * Type-safe RPC for agent-to-agent communication.
 * Enables CTO Master Agent to coordinate with specialized agents.
 */

import { os, ORPCError } from "@orpc/server";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";

// =============================================================================
// Schema Definitions
// =============================================================================

const StoryIdSchema = z.string().regex(/^[A-Z]+-[A-Z]+-\d+$/, "Invalid story ID format");

const GateSchema = z.enum([
  "gate0", "gate1", "gate2", "gate3", "gate4", "gate5", "gate6", "gate7"
]);

const AgentTypeSchema = z.enum([
  "cto", "be-dev", "fe-dev", "qa-agent", "devops-agent", "research-agent"
]);

const StoryStatusSchema = z.object({
  storyId: z.string(),
  title: z.string(),
  wave: z.number(),
  dalLevel: z.enum(["A", "B", "C", "D", "E"]),
  status: z.enum(["backlog", "ready", "in-progress", "review", "done"]),
  currentGate: z.string().optional(),
  gatesPassed: z.array(z.string()),
  gatesFailed: z.array(z.string()),
  assignedAgent: z.string().optional()
});

const SignalSchema = z.object({
  storyId: z.string(),
  gate: z.string().optional(),
  event: z.enum(["started", "passed", "failed", "complete"]),
  timestamp: z.string(),
  agent: z.string(),
  details: z.record(z.unknown()).optional()
});

const AgentTaskSchema = z.object({
  taskId: z.string(),
  storyId: z.string(),
  agentType: z.string(),
  action: z.string(),
  parameters: z.record(z.unknown()).optional(),
  status: z.enum(["pending", "running", "completed", "failed"]),
  result: z.unknown().optional()
});

// =============================================================================
// Directories
// =============================================================================

const SIGNALS_DIR = ".claude/signals";
const STORIES_DIR = "stories";

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(path.resolve(process.cwd(), dir), { recursive: true });
}

// =============================================================================
// oRPC Router Definition
// =============================================================================

/**
 * Story Management Procedures
 */
const storyProcedures = {
  /**
   * Get story status by ID
   */
  getStatus: os
    .input(z.object({ storyId: StoryIdSchema }))
    .output(StoryStatusSchema)
    .handler(async ({ input }) => {
      const { storyId } = input;

      // Find story file
      const storyPath = await findStoryFile(storyId);
      if (!storyPath) {
        throw new ORPCError("NOT_FOUND", `Story not found: ${storyId}`);
      }

      const storyData = JSON.parse(await fs.readFile(storyPath, "utf-8"));

      // Get gates status from signals
      const signals = await getStorySignals(storyId);
      const gatesPassed = signals
        .filter(s => s.event === "passed")
        .map(s => s.gate || "unknown");
      const gatesFailed = signals
        .filter(s => s.event === "failed")
        .map(s => s.gate || "unknown");

      return {
        storyId,
        title: storyData.title,
        wave: storyData.wave,
        dalLevel: storyData.dalLevel,
        status: storyData.status,
        currentGate: determineCurrentGate(gatesPassed, gatesFailed),
        gatesPassed,
        gatesFailed,
        assignedAgent: storyData.assignedAgent
      };
    }),

  /**
   * List all stories for a wave
   */
  listByWave: os
    .input(z.object({ wave: z.number().int().min(1).max(6) }))
    .output(z.array(StoryStatusSchema))
    .handler(async ({ input }) => {
      const { wave } = input;
      const stories: z.infer<typeof StoryStatusSchema>[] = [];

      // Scan stories directory
      const storyFiles = await findAllStoryFiles();

      for (const file of storyFiles) {
        try {
          const data = JSON.parse(await fs.readFile(file, "utf-8"));
          if (data.wave === wave) {
            const signals = await getStorySignals(data.storyId);
            const gatesPassed = signals.filter(s => s.event === "passed").map(s => s.gate || "");
            const gatesFailed = signals.filter(s => s.event === "failed").map(s => s.gate || "");

            stories.push({
              storyId: data.storyId,
              title: data.title,
              wave: data.wave,
              dalLevel: data.dalLevel,
              status: data.status,
              currentGate: determineCurrentGate(gatesPassed, gatesFailed),
              gatesPassed,
              gatesFailed,
              assignedAgent: data.assignedAgent
            });
          }
        } catch {
          // Skip invalid files
        }
      }

      return stories;
    }),

  /**
   * Update story status
   */
  updateStatus: os
    .input(z.object({
      storyId: StoryIdSchema,
      status: z.enum(["backlog", "ready", "in-progress", "review", "done"]),
      assignedAgent: AgentTypeSchema.optional()
    }))
    .output(z.object({ success: z.boolean() }))
    .handler(async ({ input }) => {
      const { storyId, status, assignedAgent } = input;

      const storyPath = await findStoryFile(storyId);
      if (!storyPath) {
        throw new ORPCError("NOT_FOUND", `Story not found: ${storyId}`);
      }

      const storyData = JSON.parse(await fs.readFile(storyPath, "utf-8"));
      storyData.status = status;
      if (assignedAgent) {
        storyData.assignedAgent = assignedAgent;
      }

      await fs.writeFile(storyPath, JSON.stringify(storyData, null, 2));

      return { success: true };
    })
};

/**
 * Signal Management Procedures
 */
const signalProcedures = {
  /**
   * Create a signal for gate completion
   */
  createGateSignal: os
    .input(z.object({
      storyId: StoryIdSchema,
      gate: GateSchema,
      event: z.enum(["passed", "failed"]),
      agent: AgentTypeSchema,
      details: z.record(z.unknown()).optional()
    }))
    .output(z.object({ signalPath: z.string() }))
    .handler(async ({ input }) => {
      const { storyId, gate, event, agent, details } = input;

      await ensureDir(SIGNALS_DIR);

      const signal: z.infer<typeof SignalSchema> = {
        storyId,
        gate,
        event,
        timestamp: new Date().toISOString(),
        agent,
        details
      };

      const filename = `signal-${storyId}-${gate}-${event}.json`;
      const signalPath = path.join(SIGNALS_DIR, filename);

      await fs.writeFile(
        path.resolve(process.cwd(), signalPath),
        JSON.stringify(signal, null, 2)
      );

      return { signalPath };
    }),

  /**
   * Get all signals for a story
   */
  getStorySignals: os
    .input(z.object({ storyId: StoryIdSchema }))
    .output(z.array(SignalSchema))
    .handler(async ({ input }) => {
      return getStorySignals(input.storyId);
    }),

  /**
   * Check if a specific gate has passed
   */
  checkGatePassed: os
    .input(z.object({ storyId: StoryIdSchema, gate: GateSchema }))
    .output(z.object({ passed: z.boolean(), timestamp: z.string().optional() }))
    .handler(async ({ input }) => {
      const { storyId, gate } = input;
      const signalPath = path.resolve(
        process.cwd(),
        SIGNALS_DIR,
        `signal-${storyId}-${gate}-passed.json`
      );

      try {
        const content = await fs.readFile(signalPath, "utf-8");
        const signal = JSON.parse(content);
        return { passed: true, timestamp: signal.timestamp };
      } catch {
        return { passed: false };
      }
    })
};

/**
 * Agent Task Management Procedures
 */
const taskProcedures = {
  /**
   * Dispatch a task to an agent
   */
  dispatch: os
    .input(z.object({
      storyId: StoryIdSchema,
      agentType: AgentTypeSchema,
      action: z.string(),
      parameters: z.record(z.unknown()).optional()
    }))
    .output(AgentTaskSchema)
    .handler(async ({ input }) => {
      const { storyId, agentType, action, parameters } = input;

      const task: z.infer<typeof AgentTaskSchema> = {
        taskId: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        storyId,
        agentType,
        action,
        parameters,
        status: "pending"
      };

      // In a real implementation, this would dispatch to an agent queue
      // For now, we just return the task definition
      return task;
    }),

  /**
   * Get task status
   */
  getTaskStatus: os
    .input(z.object({ taskId: z.string() }))
    .output(AgentTaskSchema)
    .handler(async ({ input }) => {
      // In a real implementation, this would look up the task status
      throw new ORPCError("NOT_IMPLEMENTED", "Task status lookup not yet implemented");
    })
};

/**
 * Wave Management Procedures
 */
const waveProcedures = {
  /**
   * Get wave progress summary
   */
  getProgress: os
    .input(z.object({ wave: z.number().int().min(1).max(6) }))
    .output(z.object({
      wave: z.number(),
      totalStories: z.number(),
      completed: z.number(),
      inProgress: z.number(),
      blocked: z.number(),
      completionPercentage: z.number()
    }))
    .handler(async ({ input }) => {
      const stories = await storyProcedures.listByWave.handler({ input });

      const completed = stories.filter(s => s.status === "done").length;
      const inProgress = stories.filter(s => s.status === "in-progress").length;
      const blocked = stories.filter(s => s.gatesFailed.length > 0).length;

      return {
        wave: input.wave,
        totalStories: stories.length,
        completed,
        inProgress,
        blocked,
        completionPercentage: stories.length > 0 ? (completed / stories.length) * 100 : 0
      };
    })
};

// =============================================================================
// Helper Functions
// =============================================================================

async function findStoryFile(storyId: string): Promise<string | null> {
  const searchPaths = [
    path.resolve(process.cwd(), STORIES_DIR, `${storyId}.json`),
    path.resolve(process.cwd(), STORIES_DIR, `wave1/${storyId}.json`),
    path.resolve(process.cwd(), STORIES_DIR, `wave2/${storyId}.json`),
    path.resolve(process.cwd(), STORIES_DIR, `wave3/${storyId}.json`),
    path.resolve(process.cwd(), STORIES_DIR, `wave4/${storyId}.json`),
    path.resolve(process.cwd(), STORIES_DIR, `wave5/${storyId}.json`),
    path.resolve(process.cwd(), STORIES_DIR, `wave6/${storyId}.json`)
  ];

  for (const searchPath of searchPaths) {
    try {
      await fs.access(searchPath);
      return searchPath;
    } catch {
      // Continue searching
    }
  }

  return null;
}

async function findAllStoryFiles(): Promise<string[]> {
  const files: string[] = [];

  async function scanDir(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.name.endsWith(".json")) {
          files.push(fullPath);
        }
      }
    } catch {
      // Directory doesn't exist
    }
  }

  await scanDir(path.resolve(process.cwd(), STORIES_DIR));
  return files;
}

async function getStorySignals(storyId: string): Promise<z.infer<typeof SignalSchema>[]> {
  const signals: z.infer<typeof SignalSchema>[] = [];
  const signalsDir = path.resolve(process.cwd(), SIGNALS_DIR);

  try {
    const files = await fs.readdir(signalsDir);
    for (const file of files) {
      if (file.startsWith(`signal-${storyId}-`) && file.endsWith(".json")) {
        try {
          const content = await fs.readFile(path.join(signalsDir, file), "utf-8");
          signals.push(JSON.parse(content));
        } catch {
          // Skip invalid files
        }
      }
    }
  } catch {
    // Signals directory doesn't exist
  }

  return signals;
}

function determineCurrentGate(passed: string[], failed: string[]): string {
  const gates = ["gate0", "gate1", "gate2", "gate3", "gate4", "gate5", "gate6", "gate7"];

  if (failed.length > 0) {
    return failed[failed.length - 1];
  }

  for (const gate of gates) {
    if (!passed.includes(gate)) {
      return gate;
    }
  }

  return "complete";
}

// =============================================================================
// Export Router
// =============================================================================

export const waveV2Router = {
  story: storyProcedures,
  signal: signalProcedures,
  task: taskProcedures,
  wave: waveProcedures
};

export type WaveV2Router = typeof waveV2Router;
