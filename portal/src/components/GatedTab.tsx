/**
 * GatedTab Component (Launch Sequence)
 *
 * Phase 1, Step 1.5: Tab Rendering with Lock State
 *
 * A tab button component that renders locked/unlocked states
 * based on gate access validation.
 *
 * Design: Shadcn UI, Light Mode, Tailwind colors, Lucide icons
 */

import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

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
  return (
    <span
      data-testid="status-dot"
      className={cn(
        'w-2 h-2 rounded-full',
        status === 'ready' && 'bg-green-500',
        status === 'blocked' && 'bg-destructive',
        status === 'idle' && 'bg-muted-foreground'
      )}
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

  const tabButton = (
    <Button
      variant={isActive && !isLocked ? 'secondary' : 'ghost'}
      size="sm"
      onClick={handleClick}
      disabled={isLocked}
      className={cn(
        'flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-sm font-medium rounded-xl h-auto',
        isLocked && 'opacity-40 cursor-not-allowed',
        isActive && !isLocked && 'bg-background shadow-sm'
      )}
    >
      {isLocked ? (
        <Lock className="h-3 w-3" data-testid="lock-icon" />
      ) : (
        <span>{stepNumber}.</span>
      )}
      {label}
      <StatusDot status={isLocked ? 'blocked' : status} />
    </Button>
  );

  // Wrap with tooltip if locked
  if (isLocked && blockedBy.length > 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {tabButton}
          </TooltipTrigger>
          <TooltipContent>
            <p>Complete first: {blockedBy.join(', ')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return tabButton;
}

export default GatedTab;
