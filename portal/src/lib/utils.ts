import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

export function formatRelativeTime(date: string | Date) {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(date)
}

export function getGateName(gate: number): string {
  const gates: Record<number, string> = {
    [-1]: 'Pre-Validation',
    0: 'Story Assignment',
    1: 'Planning',
    2: 'Development',
    3: 'Dev Complete',
    4: 'QA Validation',
    4.5: 'Dev Fix',
    5: 'Code Review',
    6: 'Merge Prep',
    7: 'Final Approval',
  }
  return gates[gate] || `Gate ${gate}`
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-muted text-muted-foreground',
    in_progress: 'bg-blue-500/10 text-blue-600',
    active: 'bg-blue-500/10 text-blue-600',
    completed: 'bg-success/10 text-green-600',
    done: 'bg-success/10 text-green-600',
    failed: 'bg-destructive/10 text-destructive',
    rejected: 'bg-destructive/10 text-destructive',
    paused: 'bg-warning/10 text-yellow-600',
  }
  return colors[status.toLowerCase()] || 'bg-muted text-muted-foreground'
}
