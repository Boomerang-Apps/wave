/**
 * LaunchSequenceProgress Component (Phase 6)
 *
 * Visual progress indicator for the 10-step launch sequence.
 * Shows completion status with step circles and connecting lines.
 */

import { Check, Rocket } from 'lucide-react';

// ============================================
// Types
// ============================================

export interface LaunchStep {
  id: string;
  label: string;
  status: 'idle' | 'ready' | 'blocked' | 'validating';
}

export interface LaunchSequenceProgressProps {
  /** Array of all steps in the launch sequence */
  steps: LaunchStep[];
  /** Index of the currently active step */
  currentStep: number;
  /** Optional: Show compact version */
  compact?: boolean;
}

// ============================================
// Step Circle Component
// ============================================

interface StepCircleProps {
  stepNumber: number;
  status: 'idle' | 'ready' | 'blocked' | 'validating';
  isCurrent: boolean;
  isLast: boolean;
}

function StepCircle({ stepNumber, status, isCurrent, isLast }: StepCircleProps) {
  const getBackgroundClass = () => {
    if (status === 'ready') return 'bg-green-500';
    if (status === 'blocked') return 'bg-red-500';
    if (status === 'validating') return 'bg-yellow-500 animate-pulse';
    return 'bg-zinc-700';
  };

  const getRingClass = () => {
    if (isCurrent) return 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900';
    return '';
  };

  return (
    <div
      className={`
        w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
        ${getBackgroundClass()}
        ${getRingClass()}
        transition-all duration-300
      `}
      title={`Step ${stepNumber}`}
    >
      {status === 'ready' ? (
        isLast ? (
          <Rocket className="h-4 w-4" />
        ) : (
          <Check className="h-4 w-4" />
        )
      ) : (
        stepNumber
      )}
    </div>
  );
}

// ============================================
// Connecting Line Component
// ============================================

interface ConnectingLineProps {
  isComplete: boolean;
}

function ConnectingLine({ isComplete }: ConnectingLineProps) {
  return (
    <div
      className={`
        flex-1 h-1 mx-1 rounded-full transition-colors duration-300
        ${isComplete ? 'bg-green-500' : 'bg-zinc-700'}
      `}
    />
  );
}

// ============================================
// Main Component
// ============================================

export function LaunchSequenceProgress({
  steps,
  currentStep,
  compact = false
}: LaunchSequenceProgressProps) {
  const completedCount = steps.filter(s => s.status === 'ready').length;
  const allComplete = completedCount === steps.length;

  return (
    <div className="bg-zinc-900 text-white rounded-xl p-4 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Rocket className={`h-5 w-5 ${allComplete ? 'text-green-400' : 'text-zinc-400'}`} />
          <h3 className="font-bold">Launch Sequence</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm ${allComplete ? 'text-green-400' : 'text-zinc-400'}`}>
            {completedCount}/{steps.length} Complete
          </span>
          {allComplete && (
            <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-medium">
              READY
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center">
        {steps.map((step, index) => (
          <div key={step.id} className="contents">
            <StepCircle
              stepNumber={index}
              status={step.status}
              isCurrent={index === currentStep}
              isLast={index === steps.length - 1}
            />
            {index < steps.length - 1 && (
              <ConnectingLine isComplete={step.status === 'ready'} />
            )}
          </div>
        ))}
      </div>

      {/* Step Labels (non-compact mode) */}
      {!compact && (
        <div className="flex items-center mt-2 text-[10px] text-zinc-500">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`
                flex-1 text-center truncate px-1
                ${index === currentStep ? 'text-white font-medium' : ''}
                ${step.status === 'ready' ? 'text-green-400' : ''}
              `}
            >
              {step.label}
            </div>
          ))}
        </div>
      )}

      {/* All Green Message */}
      {allComplete && (
        <div className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-center">
          <span className="text-green-400 font-medium">
            All systems green - Launch authorized
          </span>
        </div>
      )}
    </div>
  );
}

export default LaunchSequenceProgress;
