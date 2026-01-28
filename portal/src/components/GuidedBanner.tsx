/**
 * GuidedBanner Component
 *
 * Contextual guidance banner for Simple Mode.
 * Shows helpful tips based on current step/section.
 */

import { Sparkles, ArrowRight, CheckCircle2, Lightbulb, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { useMode } from '../contexts/ModeContext';

interface GuidedBannerProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'info' | 'success' | 'tip' | 'next-step';
  dismissible?: boolean;
  className?: string;
}

export function GuidedBanner({
  title,
  description,
  actionLabel,
  onAction,
  variant = 'info',
  dismissible = true,
  className
}: GuidedBannerProps) {
  const { isSimple } = useMode();
  const [dismissed, setDismissed] = useState(false);

  // Only show in Simple mode
  if (!isSimple || dismissed) return null;

  const variants = {
    info: {
      bg: 'bg-[#3b82f6]/10',
      border: 'border-[#3b82f6]/30',
      icon: <Sparkles className="h-5 w-5 text-[#3b82f6]" />,
      iconBg: 'bg-[#3b82f6]/20',
      titleColor: 'text-[#60a5fa]',
      textColor: 'text-[#93c5fd]',
      buttonBg: 'bg-[#3b82f6] hover:bg-[#2563eb]',
    },
    success: {
      bg: 'bg-[#22c55e]/10',
      border: 'border-[#22c55e]/30',
      icon: <CheckCircle2 className="h-5 w-5 text-[#22c55e]" />,
      iconBg: 'bg-[#22c55e]/20',
      titleColor: 'text-[#4ade80]',
      textColor: 'text-[#86efac]',
      buttonBg: 'bg-[#22c55e] hover:bg-[#16a34a]',
    },
    tip: {
      bg: 'bg-[#f97316]/10',
      border: 'border-[#f97316]/30',
      icon: <Lightbulb className="h-5 w-5 text-[#f97316]" />,
      iconBg: 'bg-[#f97316]/20',
      titleColor: 'text-[#fb923c]',
      textColor: 'text-[#fdba74]',
      buttonBg: 'bg-[#f97316] hover:bg-[#ea580c]',
    },
    'next-step': {
      bg: 'bg-gradient-to-r from-[#3b82f6]/10 to-[#22c55e]/10',
      border: 'border-[#3b82f6]/30',
      icon: <ArrowRight className="h-5 w-5 text-[#3b82f6]" />,
      iconBg: 'bg-[#3b82f6]/20',
      titleColor: 'text-[#60a5fa]',
      textColor: 'text-[#a3a3a3]',
      buttonBg: 'bg-gradient-to-r from-[#3b82f6] to-[#22c55e] hover:opacity-90',
    },
  };

  const v = variants[variant];

  return (
    <div className={cn(
      "rounded-xl border p-4 mb-6",
      v.bg,
      v.border,
      className
    )}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", v.iconBg)}>
          {v.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={cn("text-sm font-medium", v.titleColor)}>
            {title}
          </h3>
          <p className={cn("text-sm mt-1", v.textColor)}>
            {description}
          </p>

          {/* Action Button */}
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className={cn(
                "mt-3 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors",
                v.buttonBg
              )}
            >
              {actionLabel}
            </button>
          )}
        </div>

        {/* Dismiss Button */}
        {dismissible && (
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-[#666] hover:text-[#a3a3a3] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Predefined guided banners for common scenarios
export function WelcomeBanner({ onGetStarted }: { onGetStarted?: () => void }) {
  return (
    <GuidedBanner
      title="Welcome to WAVE Portal!"
      description="Let's build your app together. Start by describing what you want to create, and AI will help you through each step."
      actionLabel="Get Started"
      onAction={onGetStarted}
      variant="info"
    />
  );
}

export function StepCompleteBanner({ stepName, nextStep }: { stepName: string; nextStep?: string }) {
  return (
    <GuidedBanner
      title={`${stepName} Complete!`}
      description={nextStep ? `Great progress! Next up: ${nextStep}` : "You're making great progress!"}
      variant="success"
      dismissible={true}
    />
  );
}

export function TipBanner({ tip }: { tip: string }) {
  return (
    <GuidedBanner
      title="Helpful Tip"
      description={tip}
      variant="tip"
      dismissible={true}
    />
  );
}

export function NextStepBanner({
  currentStep,
  nextStep,
  onProceed
}: {
  currentStep: string;
  nextStep: string;
  onProceed?: () => void
}) {
  return (
    <GuidedBanner
      title={`Ready for: ${nextStep}`}
      description={`You've completed ${currentStep}. Let's move on to the next step.`}
      actionLabel={`Proceed to ${nextStep}`}
      onAction={onProceed}
      variant="next-step"
    />
  );
}

export default GuidedBanner;
