/**
 * NextStepButton Component (Phase 6)
 *
 * Prominent navigation button shown when current step is complete.
 * Guides users through the sequential launch flow.
 */

import { ArrowRight, Check, Rocket } from 'lucide-react';

// ============================================
// Types
// ============================================

export interface NextStepInfo {
  id: string;
  label: string;
  step: number;
}

export interface NextStepButtonProps {
  /** Current step status */
  currentStepStatus: 'idle' | 'ready' | 'blocked' | 'validating';
  /** Next step info (null if current is last step) */
  nextStep: NextStepInfo | null;
  /** Whether this is the final launch step */
  isFinalStep: boolean;
  /** Click handler to navigate to next step */
  onNavigate: (stepId: string) => void;
  /** Click handler for final launch */
  onLaunch?: () => void;
}

// ============================================
// Main Component
// ============================================

export function NextStepButton({
  currentStepStatus,
  nextStep,
  isFinalStep,
  onNavigate,
  onLaunch
}: NextStepButtonProps) {
  // Only show when current step is ready
  if (currentStepStatus !== 'ready') {
    return null;
  }

  // Final step - show launch button
  if (isFinalStep) {
    return (
      <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-green-400 flex items-center gap-2">
              <Check className="h-5 w-5" />
              All Pre-Flight Checks Passed
            </h4>
            <p className="text-sm text-zinc-400 mt-1">
              Launch sequence complete. Ready for autonomous agent execution.
            </p>
          </div>
          <button
            onClick={onLaunch}
            className="
              flex items-center gap-2 px-6 py-3
              bg-green-600 hover:bg-green-700
              text-white font-bold rounded-xl
              transition-colors duration-200
              shadow-lg shadow-green-500/20
            "
          >
            <Rocket className="h-5 w-5" />
            Launch Agents
          </button>
        </div>
      </div>
    );
  }

  // Not final step - show continue button
  if (!nextStep) {
    return null;
  }

  return (
    <div className="mt-6 flex justify-end">
      <button
        onClick={() => onNavigate(nextStep.id)}
        className="
          flex items-center gap-2 px-6 py-3
          bg-green-600 hover:bg-green-700
          text-white font-medium rounded-xl
          transition-colors duration-200
        "
      >
        Continue to Step {nextStep.step}: {nextStep.label}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export default NextStepButton;
