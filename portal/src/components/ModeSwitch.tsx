/**
 * ModeSwitch Component
 *
 * Simple icon-based toggle for the sidebar.
 */

import { Sparkles, Code2 } from 'lucide-react';
import { useMode } from '../contexts/ModeContext';
import { cn } from '../lib/utils';

export function ModeSwitch() {
  const { toggleMode, isSimple } = useMode();

  return (
    <button
      onClick={toggleMode}
      className={cn(
        "w-9 h-9 rounded-lg flex items-center justify-center transition-all",
        isSimple
          ? "bg-[#22c55e]/20 text-[#22c55e] hover:bg-[#22c55e]/30"
          : "bg-[#3b82f6]/20 text-[#3b82f6] hover:bg-[#3b82f6]/30"
      )}
      title={isSimple ? "Simple Mode (Click for Pro)" : "Pro Mode (Click for Simple)"}
    >
      {isSimple ? (
        <Sparkles className="h-4 w-4" />
      ) : (
        <Code2 className="h-4 w-4" />
      )}
    </button>
  );
}

export default ModeSwitch;
