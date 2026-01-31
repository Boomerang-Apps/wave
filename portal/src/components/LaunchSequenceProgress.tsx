/**
 * LaunchSequenceProgress Component
 *
 * Clean, minimal progress indicator for the 10-step launch sequence.
 * Shows step circles with labels and connecting lines.
 */

import { Check, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface LaunchStep {
  id: string;
  label: string;
  status: 'idle' | 'ready' | 'blocked' | 'validating';
}

export interface LaunchSequenceProgressProps {
  steps: LaunchStep[];
  currentStep: number;
}

// ============================================
// Main Component
// ============================================

export function LaunchSequenceProgress({
  steps,
  currentStep
}: LaunchSequenceProgressProps) {
  const completedCount = steps.filter(s => s.status === 'ready').length;
  const isAllComplete = completedCount === steps.length;

  return (
    <div className="bg-card border border-border rounded-xl p-5 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Launch Sequence</span>
          {isAllComplete && (
            <span className="px-2 py-0.5 text-xs font-semibold bg-green-500 text-white rounded">
              READY
            </span>
          )}
        </div>
        <span className="text-sm text-muted-foreground">
          {completedCount}/{steps.length} Complete
        </span>
      </div>

      {/* All systems green message */}
      {isAllComplete && (
        <div className="mb-4 text-center text-sm text-green-500 font-medium">
          All systems green - ready for launch
        </div>
      )}

      {/* Stepper */}
      <div className="flex items-center">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            {/* Step Circle + Label */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                  step.status === 'ready' && 'bg-green-500 text-white',
                  step.status === 'blocked' && 'bg-red-500 text-white',
                  step.status === 'validating' && 'bg-amber-500 text-white animate-pulse',
                  step.status === 'idle' && 'bg-muted text-muted-foreground',
                  index === currentStep && step.status === 'idle' && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                )}
              >
                {step.status === 'ready' ? (
                  index === steps.length - 1 ? (
                    <Rocket className="h-3.5 w-3.5" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )
                ) : (
                  index
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] mt-1.5 whitespace-nowrap',
                  step.status === 'ready' && 'text-green-500',
                  step.status === 'blocked' && 'text-red-500',
                  step.status !== 'ready' && step.status !== 'blocked' && 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connecting Line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-2 mt-[-18px]',
                  step.status === 'ready' ? 'bg-green-500' : 'bg-muted'
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default LaunchSequenceProgress;
