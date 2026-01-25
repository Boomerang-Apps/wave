/**
 * GateDecisionDropdown Component (Phase D.1)
 *
 * Provides orchestrator gate decision controls:
 * - Go: Proceed with execution
 * - Hold: Pause for additional data
 * - Kill: Abandon the run
 * - Recycle: Restart from beginning
 */

import { useState } from 'react';
import { Target, ChevronDown, CheckCircle2, PauseCircle, XCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export type GateStatus = 'pending' | 'go' | 'hold' | 'kill' | 'recycle';

export interface GateDecisionDropdownProps {
  onGo: () => void;
  onHold: (reason: string) => void;
  onKill: (reason: string) => void;
  onRecycle: () => void;
  currentStatus: GateStatus;
  disabled?: boolean;
}

const statusConfig: Record<GateStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pending', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  go: { label: 'Go', color: 'text-green-500', bgColor: 'bg-green-500/10' },
  hold: { label: 'Hold', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  kill: { label: 'Kill', color: 'text-red-500', bgColor: 'bg-red-500/10' },
  recycle: { label: 'Recycle', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
};

export function GateDecisionDropdown({
  onGo,
  onHold,
  onKill,
  onRecycle,
  currentStatus,
  disabled = false
}: GateDecisionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const config = statusConfig[currentStatus];

  const handleGo = () => {
    onGo();
    setIsOpen(false);
  };

  const handleHold = () => {
    const reason = window.prompt('Hold reason (required):');
    if (reason) {
      onHold(reason);
    }
    setIsOpen(false);
  };

  const handleKill = () => {
    const reason = window.prompt('Kill reason (required):');
    if (reason) {
      onKill(reason);
    }
    setIsOpen(false);
  };

  const handleRecycle = () => {
    onRecycle();
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-label="Gate Decision"
        className={cn(
          "px-3 py-2 bg-muted border border-border rounded-lg text-sm flex items-center gap-2",
          "hover:bg-muted/80 transition-colors",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Target className="h-4 w-4" data-testid="gate-icon" />
        <span>Gate Decision</span>
        <span
          data-testid="status-badge"
          className={cn(
            "px-1.5 py-0.5 rounded text-xs font-medium",
            config.bgColor,
            config.color
          )}
        >
          {config.label}
        </span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && !disabled && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] bg-popover border border-border rounded-lg shadow-lg py-1">
            <button
              onClick={handleGo}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Go (Proceed)
            </button>
            <button
              onClick={handleHold}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
            >
              <PauseCircle className="h-4 w-4 text-amber-500" />
              Hold (Pause for data)
            </button>
            <button
              onClick={handleKill}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
            >
              <XCircle className="h-4 w-4 text-red-500" />
              Kill (Abandon)
            </button>
            <button
              onClick={handleRecycle}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4 text-blue-500" />
              Recycle (Restart)
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default GateDecisionDropdown;
