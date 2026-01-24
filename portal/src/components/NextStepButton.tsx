/**
 * NextStepButton Component (Phase 6)
 *
 * Prominent navigation button shown when current step is complete.
 * Guides users through the sequential launch flow.
 *
 * Design: Shadcn UI, Light Mode, Tailwind colors, Lucide icons
 */

import { ArrowRight, Check, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

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
      <Alert className="mt-6 border-green-200 bg-green-50">
        <Check className="h-5 w-5 text-green-600" />
        <div className="flex items-center justify-between w-full">
          <div className="ml-2">
            <AlertTitle className="text-green-700">
              All Pre-Flight Checks Passed
            </AlertTitle>
            <AlertDescription className="text-green-600">
              Launch sequence complete. Ready for autonomous agent execution.
            </AlertDescription>
          </div>
          <Button
            onClick={onLaunch}
            size="lg"
            className="bg-green-600 hover:bg-green-700 ml-4"
          >
            <Rocket className="h-5 w-5 mr-2" />
            Launch Agents
          </Button>
        </div>
      </Alert>
    );
  }

  // Not final step - show continue button
  if (!nextStep) {
    return null;
  }

  return (
    <div className="mt-6 flex justify-end">
      <Button
        onClick={() => onNavigate(nextStep.id)}
        size="lg"
        className="bg-primary hover:bg-primary/90"
      >
        Continue to Step {nextStep.step}: {nextStep.label}
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}

export default NextStepButton;
