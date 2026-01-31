/**
 * Wave V2 Agent SDK - Main Export
 *
 * This module exports all Wave V2 agent configurations and utilities.
 */

export {
  // Schema definitions
  StorySchemaV4_1,
  SignalSchema,
  type Story,
  type Signal,

  // Agent definitions
  waveV2Agents,
  createWaveV2Options,

  // Constants
  GATE_SEQUENCE,
  GATE_DESCRIPTIONS,

  // Types
  type StoryExecutionResult
} from "./wave-v2-config";

export { executeStory } from "./story-executor";
