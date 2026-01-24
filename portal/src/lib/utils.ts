import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date as relative time (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(date: Date | string | number): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`

  return then.toLocaleDateString()
}

/**
 * Get human-readable gate name from gate ID
 */
export function getGateName(gateId: number | string): string {
  const gates: Record<string, string> = {
    '0': 'Mockup Design',
    '1': 'PRD & Stories',
    '2': 'Wave Plan',
    '3': 'Configuration',
    '4': 'Infrastructure',
    '5': 'Safety Protocol',
    '6': 'RLM Protocol',
    '7': 'Notifications',
    '8': 'Build QA',
    '9': 'Launch'
  }
  return gates[String(gateId)] || `Gate ${gateId}`
}

/**
 * Get status color class based on status string
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'ready': 'text-green-500',
    'pass': 'text-green-500',
    'success': 'text-green-500',
    'completed': 'text-green-500',
    'blocked': 'text-destructive',
    'fail': 'text-destructive',
    'error': 'text-destructive',
    'failed': 'text-destructive',
    'idle': 'text-muted-foreground',
    'pending': 'text-muted-foreground',
    'validating': 'text-amber-500',
    'running': 'text-amber-500',
    'in_progress': 'text-amber-500'
  }
  return colors[status.toLowerCase()] || 'text-muted-foreground'
}
