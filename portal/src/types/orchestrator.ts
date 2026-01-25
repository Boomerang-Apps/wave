/**
 * Orchestrator TypeScript Types (Phase E.2)
 *
 * Type definitions matching the database schema in 005_orchestrator.sql
 */

import type { Json } from './database';

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS / LITERAL TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type OrchestratorPhase =
  | 'planning'
  | 'development'
  | 'testing'
  | 'complete'
  | 'failed';

export type GateStatus =
  | 'pending'
  | 'go'
  | 'hold'
  | 'kill'
  | 'recycle';

export type ReviewType =
  | 'safety'
  | 'gate_override'
  | 'budget_exceeded';

export type ReviewStatus =
  | 'pending'
  | 'approved'
  | 'rejected';

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR RUNS TABLE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Row type for orchestrator_runs table
 */
export interface OrchestratorRun {
  id: string;
  thread_id: string;
  project_id: string;
  story_id: string;

  // State
  phase: OrchestratorPhase;
  current_agent: string | null;
  gate_status: GateStatus;

  // Safety
  safety_score: number;
  violations: string[] | null;
  requires_human_review: boolean;

  // Budget
  tokens_used: number;
  cost_usd: number;

  // Timestamps
  started_at: string;
  completed_at: string | null;
  updated_at: string;

  // Results
  files_created: string[] | null;
  error: string | null;
}

/**
 * Insert type for orchestrator_runs table
 * Only thread_id, project_id, and story_id are required
 */
export interface OrchestratorRunInsert {
  id?: string;
  thread_id: string;
  project_id: string;
  story_id: string;

  // State (optional with defaults)
  phase?: OrchestratorPhase;
  current_agent?: string | null;
  gate_status?: GateStatus;

  // Safety (optional with defaults)
  safety_score?: number;
  violations?: string[] | null;
  requires_human_review?: boolean;

  // Budget (optional with defaults)
  tokens_used?: number;
  cost_usd?: number;

  // Timestamps (optional with defaults)
  started_at?: string;
  completed_at?: string | null;
  updated_at?: string;

  // Results (optional)
  files_created?: string[] | null;
  error?: string | null;
}

/**
 * Update type for orchestrator_runs table
 * All fields are optional for partial updates
 */
export interface OrchestratorRunUpdate {
  id?: string;
  thread_id?: string;
  project_id?: string;
  story_id?: string;

  phase?: OrchestratorPhase;
  current_agent?: string | null;
  gate_status?: GateStatus;

  safety_score?: number;
  violations?: string[] | null;
  requires_human_review?: boolean;

  tokens_used?: number;
  cost_usd?: number;

  started_at?: string;
  completed_at?: string | null;
  updated_at?: string;

  files_created?: string[] | null;
  error?: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HUMAN REVIEW QUEUE TABLE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Row type for human_review_queue table
 */
export interface HumanReviewItem {
  id: string;
  thread_id: string;
  review_type: ReviewType;
  reason: string;
  safety_score: number | null;
  context: Json | null;

  // Resolution
  status: ReviewStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;

  created_at: string;
}

/**
 * Insert type for human_review_queue table
 * Only thread_id, review_type, and reason are required
 */
export interface HumanReviewItemInsert {
  id?: string;
  thread_id: string;
  review_type: ReviewType;
  reason: string;
  safety_score?: number | null;
  context?: Json | null;

  // Resolution (optional with defaults)
  status?: ReviewStatus;
  resolved_by?: string | null;
  resolved_at?: string | null;
  resolution_notes?: string | null;

  created_at?: string;
}

/**
 * Update type for human_review_queue table
 * All fields are optional for partial updates
 */
export interface HumanReviewItemUpdate {
  id?: string;
  thread_id?: string;
  review_type?: ReviewType;
  reason?: string;
  safety_score?: number | null;
  context?: Json | null;

  status?: ReviewStatus;
  resolved_by?: string | null;
  resolved_at?: string | null;
  resolution_notes?: string | null;

  created_at?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Orchestrator run with human review items
 */
export interface OrchestratorRunWithReviews extends OrchestratorRun {
  reviews: HumanReviewItem[];
}

/**
 * Summary of orchestrator run for UI display
 */
export interface OrchestratorRunSummary {
  runId: string;
  status: OrchestratorPhase;
  currentAgent: string | null;
  safetyScore: number;
  gateStatus: GateStatus;
  tokensUsed: number;
  actionsCount: number;
  pendingReviews: number;
}
