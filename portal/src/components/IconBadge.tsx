/**
 * IconBadge Component
 *
 * Displays an icon in a rounded square container with a muted gray background.
 * Minimal, monochromatic design for consistent icon styling.
 */

import { ReactNode } from 'react';
import { cn } from '../lib/utils';

export type IconBadgeVariant = 'gray';

interface IconBadgeProps {
  icon: ReactNode;
  variant?: IconBadgeVariant;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  xs: 'w-[18px] h-[18px] rounded [&>svg]:w-2.5 [&>svg]:h-2.5',
  sm: 'w-6 h-6 rounded-md [&>svg]:w-3.5 [&>svg]:h-3.5',
  md: 'w-8 h-8 rounded-lg [&>svg]:w-4 [&>svg]:h-4',
  lg: 'w-10 h-10 rounded-xl [&>svg]:w-5 [&>svg]:h-5'
};

export function IconBadge({
  icon,
  variant = 'gray',
  size = 'md',
  className
}: IconBadgeProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center flex-shrink-0',
        'bg-[#2a2a2a] text-[#888]',
        sizeStyles[size],
        className
      )}
    >
      {icon}
    </div>
  );
}

export default IconBadge;
