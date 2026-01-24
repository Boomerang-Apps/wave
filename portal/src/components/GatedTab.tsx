/**
 * GatedTab Component (Launch Sequence)
 *
 * Phase 1, Step 1.5: Tab Rendering with Lock State
 *
 * A tab button component that renders locked/unlocked states
 * based on gate access validation.
 */

import { Lock } from 'lucide-react';

// ============================================
// Types
// ============================================

export interface GatedTabProps {
  /** Unique identifier for the tab */
  id: string;
  /** Full label text */
  label: string;
  /** Short label (usually step number) */
  shortLabel: string;
  /** Step number (0-9) */
  stepNumber: number;
  /** Whether the tab is locked (blocked by dependencies) */
  isLocked: boolean;
  /** Whether this is the currently active tab */
  isActive: boolean;
  /** Validation status: idle, ready, or blocked */
  status: 'idle' | 'ready' | 'blocked';
  /** List of step labels that are blocking access */
  blockedBy: string[];
  /** Click handler - receives tab id */
  onClick: (id: string) => void;
}

// ============================================
// StatusDot Component
// ============================================

interface StatusDotProps {
  status: 'idle' | 'ready' | 'blocked';
}

function StatusDot({ status }: StatusDotProps) {
  const colorClass =
    status === 'ready'
      ? 'bg-green-500'
      : status === 'blocked'
      ? 'bg-red-500'
      : 'bg-gray-400';

  return (
    <span
      data-testid="status-dot"
      className={`w-2 h-2 rounded-full ${colorClass}`}
    />
  );
}

// ============================================
// GatedTab Component
// ============================================

export function GatedTab({
  id,
  label,
  shortLabel,
  stepNumber,
  isLocked,
  isActive,
  status,
  blockedBy,
  onClick
}: GatedTabProps) {
  const handleClick = () => {
    if (!isLocked) {
      onClick(id);
    }
  };

  // Build class names
  const baseClasses =
    'flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-sm font-medium rounded-xl';
  const lockedClasses = isLocked ? 'opacity-40 cursor-not-allowed' : '';
  const activeClasses = isActive && !isLocked ? 'bg-white shadow-sm' : '';

  const className = [baseClasses, lockedClasses, activeClasses]
    .filter(Boolean)
    .join(' ');

  // Build tooltip title for locked tabs
  const title = isLocked
    ? `Complete first: ${blockedBy.join(', ')}`
    : undefined;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLocked}
      className={className}
      title={title}
    >
      {isLocked ? (
        <Lock className="h-3 w-3" data-testid="lock-icon" />
      ) : (
        <span>{stepNumber}.</span>
      )}
      {label}
      <StatusDot status={isLocked ? 'blocked' : status} />
    </button>
  );
}

export default GatedTab;
