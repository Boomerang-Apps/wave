/**
 * OrchestratorStatus Component (Phase D.3)
 *
 * Displays real-time orchestrator run status:
 * - Current agent, safety score, gate status, token usage
 * - Pause/Resume and Kill controls
 * - Color-coded safety score visualization
 */

import { Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RunStatus = 'running' | 'completed' | 'failed' | 'cancelled' | 'held';
export type GateStatus = 'pending' | 'go' | 'hold' | 'kill' | 'recycle';

export interface OrchestratorRunStatus {
  runId: string;
  status: RunStatus;
  currentAgent: string;
  safetyScore: number;
  gateStatus: GateStatus;
  tokensUsed: number;
  actionsCount: number;
}

export interface OrchestratorStatusProps {
  status: OrchestratorRunStatus | null;
  onPause: () => void;
  onResume: () => void;
  onKill: (reason: string) => void;
}

const statusBadgeConfig: Record<RunStatus, { color: string; bgColor: string }> = {
  running: { color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  completed: { color: 'text-green-500', bgColor: 'bg-green-500/10' },
  failed: { color: 'text-red-500', bgColor: 'bg-red-500/10' },
  cancelled: { color: 'text-muted-foreground', bgColor: 'bg-muted' },
  held: { color: 'text-amber-500', bgColor: 'bg-amber-500/10' }
};

function getSafetyScoreColor(score: number): string {
  if (score >= 0.85) return 'text-green-500';
  if (score >= 0.7) return 'text-amber-500';
  return 'text-red-500';
}

export function OrchestratorStatus({
  status,
  onPause,
  onResume,
  onKill
}: OrchestratorStatusProps) {
  if (!status) return null;

  const handleKill = () => {
    const reason = window.prompt('Kill reason (required):');
    if (reason) {
      onKill(reason);
    }
  };

  const badgeConfig = statusBadgeConfig[status.status];

  return (
    <div
      data-testid="orchestrator-status"
      className="bg-card border border-border rounded-xl p-4 mb-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Cpu className="h-4 w-4 text-purple-500" data-testid="cpu-icon" />
          Orchestrator Run
        </h3>
        <span
          data-testid="status-badge"
          className={cn(
            "px-2 py-1 rounded-full text-xs font-medium",
            badgeConfig.bgColor,
            badgeConfig.color
          )}
        >
          {status.status}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-xs text-muted-foreground">Current Agent</p>
          <p className="font-medium">{status.currentAgent || '-'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Safety Score</p>
          <p
            data-testid="safety-score"
            className={cn("font-medium", getSafetyScoreColor(status.safetyScore))}
          >
            {Math.round(status.safetyScore * 100)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Gate Status</p>
          <p className="font-medium">{status.gateStatus}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Tokens Used</p>
          <p className="font-medium">{status.tokensUsed.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {status.gateStatus === 'hold' ? (
          <button
            onClick={onResume}
            className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors"
          >
            Resume
          </button>
        ) : (
          <button
            onClick={onPause}
            className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 transition-colors"
          >
            Pause
          </button>
        )}
        <button
          onClick={handleKill}
          className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors"
        >
          Kill
        </button>
      </div>
    </div>
  );
}

export default OrchestratorStatus;
