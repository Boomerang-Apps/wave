/**
 * ReadinessCircle Component
 *
 * Animated circular progress indicator showing foundation readiness score.
 * States: pending → analyzing → ready/needs-work
 */

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReadinessCircleProps {
  score: number | null;
  status: 'pending' | 'analyzing' | 'ready' | 'blocked';
  size?: 'sm' | 'md' | 'lg';
}

export function ReadinessCircle({ score, status, size = 'lg' }: ReadinessCircleProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  // Animate score counting up
  useEffect(() => {
    if (score === null) {
      setAnimatedScore(0);
      return;
    }

    const duration = 1000; // 1 second animation
    const steps = 60;
    const increment = score / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setAnimatedScore(score);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [score]);

  // Size configurations
  const sizes = {
    sm: { container: 'w-20 h-20', text: 'text-xl', stroke: 4, radius: 34 },
    md: { container: 'w-32 h-32', text: 'text-3xl', stroke: 6, radius: 56 },
    lg: { container: 'w-44 h-44', text: 'text-5xl', stroke: 8, radius: 80 },
  };

  const config = sizes[size];
  const circumference = 2 * Math.PI * config.radius;
  const progress = score !== null ? ((100 - animatedScore) / 100) * circumference : circumference;

  // Colors based on status/score
  const getColor = () => {
    if (status === 'pending') return 'stroke-muted-foreground/30';
    if (status === 'analyzing') return 'stroke-blue-500';
    if (score === null) return 'stroke-muted-foreground/30';
    if (score >= 80) return 'stroke-green-500';
    if (score >= 60) return 'stroke-amber-500';
    return 'stroke-red-500';
  };

  const getBgColor = () => {
    if (status === 'pending') return 'bg-muted/30';
    if (status === 'analyzing') return 'bg-blue-500/10';
    if (score === null) return 'bg-muted/30';
    if (score >= 80) return 'bg-green-500/10';
    if (score >= 60) return 'bg-amber-500/10';
    return 'bg-red-500/10';
  };

  const getTextColor = () => {
    if (status === 'pending') return 'text-muted-foreground';
    if (status === 'analyzing') return 'text-blue-500';
    if (score === null) return 'text-muted-foreground';
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div className={cn("relative", config.container)}>
      {/* Background circle */}
      <svg className="w-full h-full -rotate-90" viewBox="0 0 180 180">
        <circle
          cx="90"
          cy="90"
          r={config.radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.stroke}
          className="text-muted/30"
        />
        {/* Progress circle */}
        <circle
          cx="90"
          cy="90"
          r={config.radius}
          fill="none"
          strokeWidth={config.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          className={cn(
            "transition-all duration-1000 ease-out",
            getColor()
          )}
        />
      </svg>

      {/* Center content */}
      <div className={cn(
        "absolute inset-4 rounded-full flex flex-col items-center justify-center",
        getBgColor()
      )}>
        {status === 'pending' && (
          <>
            <span className={cn("font-bold", config.text, "text-muted-foreground")}>—</span>
            <span className="text-xs text-muted-foreground mt-1">Pending</span>
          </>
        )}

        {status === 'analyzing' && (
          <>
            <Loader2 className={cn(
              "animate-spin text-blue-500",
              size === 'lg' ? 'h-10 w-10' : size === 'md' ? 'h-8 w-8' : 'h-5 w-5'
            )} />
            <span className="text-xs text-blue-500 mt-2">Analyzing...</span>
          </>
        )}

        {(status === 'ready' || status === 'blocked') && score !== null && (
          <>
            <span className={cn("font-bold", config.text, getTextColor())}>
              {animatedScore}%
            </span>
            <span className={cn("text-xs mt-1", getTextColor())}>
              {status === 'ready' ? 'Ready' : 'Needs Work'}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export default ReadinessCircle;
