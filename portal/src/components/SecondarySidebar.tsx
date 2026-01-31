/**
 * SecondarySidebar Component
 *
 * Vertical step navigation sidebar (~200px) - Devin-style
 * Shows launch sequence steps with status indicators
 */

import { CheckCircle2, AlertCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StepStatus = 'pass' | 'fail' | 'warn' | 'pending';

export interface Step {
  id: string;
  label: string;
  shortLabel: string;
  status: StepStatus;
}

interface SecondarySidebarProps {
  steps: Step[];
  activeStep: string;
  onStepClick: (stepId: string) => void;
  projectName?: string;
}

function StatusIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case 'pass':
      return <CheckCircle2 className="h-3.5 w-3.5 text-[#5a9a5a]" />;
    case 'fail':
      return <AlertCircle className="h-3.5 w-3.5 text-[#d97706]" />;
    case 'warn':
      return <AlertCircle className="h-3.5 w-3.5 text-[#a3a3a3]" />;
    case 'pending':
      return <Circle className="h-3.5 w-3.5 text-[#555]" />;
    default:
      return <Circle className="h-3.5 w-3.5 text-[#555]" />;
  }
}

export function SecondarySidebar({
  steps,
  activeStep,
  onStepClick,
  projectName
}: SecondarySidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-[50px] z-40 w-[200px] bg-[#1e1e1e] border-r border-[#2e2e2e] flex flex-col">
      {/* Header - Project context */}
      <div className="h-14 flex items-center px-4 border-b border-[#2e2e2e]">
        <div className="truncate">
          <p className="text-xs text-[#666] uppercase tracking-wider">Launch Sequence</p>
          {projectName && (
            <p className="text-sm text-[#a3a3a3] truncate">{projectName}</p>
          )}
        </div>
      </div>

      {/* Step Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {steps.map((step) => {
          const isActive = step.id === activeStep;

          return (
            <button
              key={step.id}
              onClick={() => onStepClick(step.id)}
              className={cn(
                "w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors",
                isActive
                  ? "bg-[#2e2e2e] border-l-2 border-[#5a9a5a]"
                  : "hover:bg-[#252525] border-l-2 border-transparent"
              )}
            >
              {/* Step number */}
              <span className={cn(
                "w-5 h-5 rounded flex items-center justify-center text-xs font-medium",
                isActive ? "bg-[#3e3e3e] text-[#fafafa]" : "bg-[#2e2e2e] text-[#666]"
              )}>
                {step.shortLabel}
              </span>

              {/* Step label */}
              <span className={cn(
                "flex-1 text-sm truncate",
                isActive ? "text-[#fafafa]" : "text-[#a3a3a3]"
              )}>
                {step.label}
              </span>

              {/* Status indicator */}
              <StatusIcon status={step.status} />
            </button>
          );
        })}
      </nav>

      {/* Footer - Progress summary */}
      <div className="p-4 border-t border-[#2e2e2e]">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#666]">Progress</span>
          <span className="text-[#a3a3a3]">
            {steps.filter(s => s.status === 'pass').length}/{steps.length}
          </span>
        </div>
        <div className="mt-2 h-1 bg-[#2e2e2e] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#5a9a5a] transition-all duration-300"
            style={{
              width: `${(steps.filter(s => s.status === 'pass').length / steps.length) * 100}%`
            }}
          />
        </div>
      </div>
    </aside>
  );
}

export default SecondarySidebar;
