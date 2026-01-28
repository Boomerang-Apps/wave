/**
 * Custom Checkbox Component
 *
 * Native HTML checkboxes ignore most CSS styling.
 * This component uses appearance-none to fully customize the look.
 */

import { Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface CheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({
  checked = false,
  onChange,
  disabled = false,
  className
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        "w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors",
        "border bg-[#1e1e1e]",
        checked
          ? "border-[#fafafa] bg-[#fafafa]"
          : "border-[#4a4a4a] hover:border-[#5a5a5a]",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && "cursor-pointer",
        className
      )}
    >
      {checked && (
        <Check className="h-3 w-3 text-[#1e1e1e] stroke-[3]" />
      )}
    </button>
  );
}

export default Checkbox;
