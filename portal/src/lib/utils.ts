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
 * Returns text color only (for icons, text, etc.)
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'ready': 'text-green-500',
    'pass': 'text-green-500',
    'success': 'text-green-500',
    'completed': 'text-green-500',
    'done': 'text-green-500',
    'active': 'text-blue-500',
    'blocked': 'text-red-500',
    'fail': 'text-red-500',
    'error': 'text-red-500',
    'failed': 'text-red-500',
    'rejected': 'text-red-500',
    'idle': 'text-muted-foreground',
    'pending': 'text-muted-foreground',
    'validating': 'text-amber-500',
    'running': 'text-amber-500',
    'in_progress': 'text-blue-500'
  }
  return colors[status.toLowerCase()] || 'text-muted-foreground'
}

/**
 * Get status badge classes (background + text) - NO BORDER
 * Use this for status badges/pills
 */
export function getStatusBadgeClasses(status: string): string {
  const classes: Record<string, string> = {
    'ready': 'bg-green-500/10 text-green-500',
    'pass': 'bg-green-500/10 text-green-500',
    'success': 'bg-green-500/10 text-green-500',
    'completed': 'bg-green-500/10 text-green-500',
    'done': 'bg-green-500/10 text-green-500',
    'active': 'bg-blue-500/10 text-blue-500',
    'blocked': 'bg-red-500/10 text-red-500',
    'fail': 'bg-red-500/10 text-red-500',
    'error': 'bg-red-500/10 text-red-500',
    'failed': 'bg-red-500/10 text-red-500',
    'rejected': 'bg-red-500/10 text-red-500',
    'idle': 'bg-muted text-muted-foreground',
    'pending': 'bg-muted text-muted-foreground',
    'validating': 'bg-amber-500/10 text-amber-500',
    'running': 'bg-amber-500/10 text-amber-500',
    'in_progress': 'bg-blue-500/10 text-blue-500'
  }
  return classes[status.toLowerCase()] || 'bg-muted text-muted-foreground'
}

/**
 * Get icon color class for status
 */
export function getStatusIconColor(status: string): string {
  const colors: Record<string, string> = {
    'ready': 'text-green-500',
    'pass': 'text-green-500',
    'success': 'text-green-500',
    'completed': 'text-green-500',
    'done': 'text-green-500',
    'active': 'text-blue-500',
    'blocked': 'text-red-500',
    'fail': 'text-red-500',
    'error': 'text-red-500',
    'failed': 'text-red-500',
    'rejected': 'text-red-500',
    'idle': 'text-muted-foreground',
    'pending': 'text-muted-foreground',
    'validating': 'text-amber-500',
    'running': 'text-amber-500',
    'in_progress': 'text-blue-500'
  }
  return colors[status.toLowerCase()] || 'text-muted-foreground'
}
