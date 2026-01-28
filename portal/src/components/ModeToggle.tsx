/**
 * ModeToggle Component
 *
 * Toggle switch for Simple (non-dev) vs Advanced (developer) mode.
 */

import { Sparkles, Code2 } from 'lucide-react';
import { useMode } from '../contexts/ModeContext';
import { cn } from '../lib/utils';

interface ModeToggleProps {
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function ModeToggle({ showLabel = false, size = 'sm' }: ModeToggleProps) {
  const { toggleMode, isSimple } = useMode();

  return (
    <button
      onClick={toggleMode}
      className="relative flex items-center h-7 w-[100px] rounded-full bg-[#252525] border border-[#3e3e3e] transition-colors hover:border-[#4e4e4e]"
      title={isSimple ? "Switch to Pro Mode" : "Switch to Simple Mode"}
    >
      {/* Sliding Pill */}
      <div
        className={cn(
          "absolute top-[2px] bottom-[2px] w-[48px] rounded-full transition-all duration-200 ease-out",
          isSimple
            ? "left-[2px] bg-[#22c55e]"
            : "left-[48px] bg-[#3b82f6]"
        )}
      />

      {/* Simple */}
      <span
        className={cn(
          "relative z-10 flex-1 flex items-center justify-center gap-1 text-[11px] font-medium transition-colors",
          isSimple ? "text-white" : "text-[#555]"
        )}
      >
        <Sparkles className="h-3 w-3" />
        Simple
      </span>

      {/* Pro */}
      <span
        className={cn(
          "relative z-10 flex-1 flex items-center justify-center gap-1 text-[11px] font-medium transition-colors",
          !isSimple ? "text-white" : "text-[#555]"
        )}
      >
        <Code2 className="h-3 w-3" />
        Pro
      </span>
    </button>
  );
}

export default ModeToggle;
