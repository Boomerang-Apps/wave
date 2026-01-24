/**
 * LaunchSequenceProgress Component (Phase 6)
 *
 * Visual progress indicator for the 10-step launch sequence.
 * Shows completion status with step circles and connecting lines.
 *
 * Design: Shadcn UI, Light Mode, Tailwind colors, Lucide icons
 */

import { Check, Rocket } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  return (
    <div
      className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300',
        status === 'ready' && 'bg-primary text-primary-foreground',
        status === 'blocked' && 'bg-destructive text-destructive-foreground',
        status === 'validating' && 'bg-amber-500 text-white animate-pulse',
        status === 'idle' && 'bg-muted text-muted-foreground',
        isCurrent && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
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
      className={cn(
        'flex-1 h-1 mx-1 rounded-full transition-colors duration-300',
        isComplete ? 'bg-primary' : 'bg-muted'
      )}
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
  const progressPercent = (completedCount / steps.length) * 100;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Rocket className={cn('h-5 w-5', allComplete ? 'text-primary' : 'text-muted-foreground')} />
            Launch Sequence
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className={cn('text-sm', allComplete ? 'text-primary' : 'text-muted-foreground')}>
              {completedCount}/{steps.length} Complete
            </span>
            {allComplete && (
              <Badge variant="default" className="bg-green-500/100 hover:bg-green-500">
                READY
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall Progress Bar */}
        <Progress value={progressPercent} className="h-2" />

        {/* Step Circles */}
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
          <div className="flex items-center text-[10px] text-muted-foreground">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  'flex-1 text-center truncate px-1',
                  index === currentStep && 'text-foreground font-medium',
                  step.status === 'ready' && 'text-primary'
                )}
              >
                {step.label}
              </div>
            ))}
          </div>
        )}

        {/* All Green Message */}
        {allComplete && (
          <Alert className="border-green-500/30 bg-green-500/10">
            <Check className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-400 font-medium ml-2">
              All systems green - Launch authorized
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default LaunchSequenceProgress;
