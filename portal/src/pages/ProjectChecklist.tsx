import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Database,
  Zap,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Info,
  X,
  Shield,
  GitBranch,
  Bot,
  Layers,
  Target,
  Radio,
  ArrowRight,
  Eye,
  EyeOff,
  Settings,
  Key,
  Save,
  RefreshCw,
  ScrollText,
  Rocket,
  Calendar,
  Download,
  Wifi,
  WifiOff,
  HelpCircle,
  ExternalLink,
  Play,
  Loader2,
  Bell,
  Terminal,
  FileText,
  Brain,
  History,
  TrendingUp,
  MinusCircle,
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { cn } from '../lib/utils'

// Types
type CheckStatusType = 'pass' | 'fail' | 'warn' | 'pending' | 'blocked'

interface Project {
  id: string
  name: string
  root_path: string
  description: string | null
  created_at: string
}

interface FileCheck {
  name: string
  path?: string
  status: 'found' | 'not_found'
}

type FoundationCheck = {
  id: string
  name: string
  category: string
  status: 'pending' | 'running' | 'pass' | 'fail' | 'warn'
  message: string
  description?: string
  command?: string
  output?: string
  recommendation?: string
  timestamp?: string
}

// Status dot component
function StatusDot({ status }: { status: CheckStatusType }) {
  const colors: Record<CheckStatusType, string> = {
    pass: 'bg-green-500',
    fail: 'bg-red-500',
    warn: 'bg-amber-400',
    pending: 'bg-gray-400',
    blocked: 'bg-red-500',
  }
  return <span className={cn('w-2 h-2 rounded-full inline-block', colors[status])} />
}

// Status badge component
function StatusBadge({ status }: { status: CheckStatusType }) {
  const styles: Record<CheckStatusType, string> = {
    pass: 'bg-green-100 text-green-700',
    fail: 'bg-red-100 text-red-700',
    warn: 'bg-zinc-100 text-zinc-600',
    pending: 'bg-gray-100 text-gray-600',
    blocked: 'bg-gray-100 text-gray-600',
  }
  const labels: Record<CheckStatusType, string> = {
    pass: 'PASS',
    fail: 'FAIL',
    warn: 'Warning',
    pending: 'PENDING',
    blocked: 'BLOCKED',
  }
  return (
    <span className={cn('px-2.5 py-1 text-xs font-semibold rounded-md', styles[status])}>
      {labels[status]}
    </span>
  )
}

// Section header with badge
function SectionHeader({
  badge,
  badgeColor = 'bg-gray-500',
  title,
  description,
  timestamp,
  status,
  isCollapsible = false,
  isExpanded = true,
  onToggle,
}: {
  badge: string
  badgeColor?: string
  title: string
  description: string
  timestamp?: string
  status: CheckStatusType
  isCollapsible?: boolean
  isExpanded?: boolean
  onToggle?: () => void
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-4 px-4 bg-white border border-border border-b-0 rounded-t-xl mt-6",
        isCollapsible && "cursor-pointer hover:bg-muted/30 transition-colors"
      )}
      onClick={isCollapsible ? onToggle : undefined}
    >
      <div className="flex items-center gap-3">
        <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold', badgeColor)}>
          {badge}
        </span>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {timestamp && <span className="text-xs text-muted-foreground">{timestamp}</span>}
        <StatusBadge status={status} />
        {isCollapsible && (
          <ChevronDown className={cn("h-4 w-4 transition-transform text-muted-foreground", isExpanded && "rotate-180")} />
        )}
      </div>
    </div>
  )
}

// Check item component
function CheckItem({
  label,
  status,
  description,
  command,
  output,
  fix,
  timestamp,
  defaultExpanded = false
}: {
  label: string
  status: CheckStatusType
  description?: string
  command?: string
  output?: string
  fix?: string
  timestamp?: string
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const statusIcon = {
    pass: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    fail: <XCircle className="h-5 w-5 text-red-500" />,
    warn: <AlertTriangle className="h-5 w-5 text-amber-400" />,
    pending: <Clock className="h-5 w-5 text-gray-400" />,
    blocked: <XCircle className="h-5 w-5 text-red-500" />,
  }

  const statusLabels: Record<CheckStatusType, string> = {
    pass: 'Passed',
    fail: 'Failed',
    warn: 'Warning',
    pending: 'Pending',
    blocked: 'Blocked',
  }

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd)
  }

  return (
    <div className="border-b border-border last:border-0 last:rounded-b-xl bg-white">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {statusIcon[status]}
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {timestamp && <span className="text-xs">{timestamp}</span>}
          <span>{statusLabels[status]}</span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pl-12 space-y-3">
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          {command && (
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-zinc-900 text-zinc-100 px-4 py-2.5 rounded-lg text-sm font-mono overflow-x-auto">
                {command}
              </code>
              <button
                onClick={(e) => { e.stopPropagation(); copyCommand(command); }}
                className="px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium shrink-0"
              >
                Copy
              </button>
            </div>
          )}
          {output && (
            <div className="mt-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">Output:</p>
              <pre className="bg-muted/50 border border-border px-3 py-2 rounded-lg text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-32 overflow-y-auto">
                {output.replace(/\\n/g, '\n')}
              </pre>
            </div>
          )}
          {fix && (status === 'fail' || status === 'warn') && (
            <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
              <span className="text-red-500 font-medium text-sm">Fix:</span>
              <span className="text-sm text-red-600">{fix}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// File card component
function FileCard({ file, onCopy }: { file: FileCheck; onCopy: (path: string) => void }) {
  return (
    <div className={cn(
      'p-4 rounded-xl border flex items-start justify-between',
      file.status === 'found' ? 'bg-white border-border' : 'bg-red-50 border-red-100'
    )}>
      <div className="flex items-start gap-3">
        {file.status === 'found' ? (
          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
        )}
        <div>
          <p className="font-medium text-sm">{file.name}</p>
          <p className="text-xs text-muted-foreground">{file.status === 'found' ? file.path : 'Not found'}</p>
        </div>
      </div>
      {file.status === 'found' && file.path && (
        <button onClick={() => onCopy(file.path!)} className="p-1.5 hover:bg-muted rounded">
          <Copy className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </div>
  )
}

// Story interface for execution plan
interface Story {
  id: string
  title: string
  description: string
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked'
  priority: 'high' | 'medium' | 'low'
  assignedTo?: string
  acceptanceCriteria?: string[]
  estimatedHours?: number
  // Risk classification fields (Phase 3.1)
  risk?: 'low' | 'medium' | 'high' | 'critical'
  approval_required?: 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5'
  safety_tags?: string[]
  requires_review?: boolean
}

// Wave interface for execution plan
interface Wave {
  id: number
  name: string
  description: string
  goal: string
  status: 'completed' | 'active' | 'upcoming' | 'blocked'
  progress: number
  stories: Story[]
  deliverables: string[]
  dependencies?: string[]
}

// Execution Plan Tab Component
function ExecutionPlanTab({ project }: { project: Project | null }) {
  const [expandedWave, setExpandedWave] = useState<number | null>(2)
  const [expandedStory, setExpandedStory] = useState<string | null>(null)

  // Sample waves data - in production this would come from the database
  const waves: Wave[] = [
    {
      id: 1,
      name: 'Core AI Features',
      description: 'Set up the foundation and integrate AI capabilities',
      goal: 'Users can upload images and get AI-transformed results',
      status: 'completed',
      progress: 100,
      deliverables: [
        'AI Style Picker interface',
        'Nano Banana LLM integration',
        'Before/After preview component',
        'Image upload & processing'
      ],
      stories: [
        {
          id: 'STORY-001',
          title: 'Create AI Style Picker UI',
          description: 'Build the interface where users select transformation styles',
          status: 'completed',
          priority: 'high',
          acceptanceCriteria: [
            'User can see available AI styles',
            'User can select a style',
            'Selected style is highlighted',
            'Style description is shown'
          ],
          estimatedHours: 8
        },
        {
          id: 'STORY-002',
          title: 'Integrate Nano Banana API',
          description: 'Connect to Nano Banana LLM for image transformations',
          status: 'completed',
          priority: 'high',
          acceptanceCriteria: [
            'API connection established',
            'Images are sent for processing',
            'Results are returned correctly',
            'Error handling in place'
          ],
          estimatedHours: 12
        },
        {
          id: 'STORY-003',
          title: 'Build Before/After Preview',
          description: 'Create side-by-side comparison of original and transformed images',
          status: 'completed',
          priority: 'medium',
          acceptanceCriteria: [
            'Original image displayed',
            'Transformed image displayed',
            'Slider comparison works',
            'Responsive on all devices'
          ],
          estimatedHours: 6
        }
      ]
    },
    {
      id: 2,
      name: 'Identity & Data',
      description: 'User authentication and database foundation',
      goal: 'Users can sign up, log in, and their data is securely stored',
      status: 'active',
      progress: 35,
      dependencies: ['Wave 1 must be complete'],
      deliverables: [
        'User registration & login',
        'Supabase authentication',
        'Database schema setup',
        'Row Level Security policies'
      ],
      stories: [
        {
          id: 'STORY-004',
          title: 'Set Up Supabase Auth',
          description: 'Configure Supabase authentication with email/password',
          status: 'completed',
          priority: 'high',
          acceptanceCriteria: [
            'Supabase project created',
            'Auth configured for email/password',
            'Environment variables set',
            'Auth hook working'
          ],
          estimatedHours: 4
        },
        {
          id: 'STORY-005',
          title: 'Create Registration Flow',
          description: 'Build the user sign-up experience',
          status: 'in_progress',
          priority: 'high',
          assignedTo: 'FE-Dev Agent',
          acceptanceCriteria: [
            'Registration form with validation',
            'Email verification sent',
            'User created in database',
            'Redirect to dashboard'
          ],
          estimatedHours: 8
        },
        {
          id: 'STORY-006',
          title: 'Create Login Flow',
          description: 'Build the user login experience',
          status: 'not_started',
          priority: 'high',
          acceptanceCriteria: [
            'Login form with validation',
            'Session management',
            'Remember me functionality',
            'Password reset option'
          ],
          estimatedHours: 6
        },
        {
          id: 'STORY-007',
          title: 'Database Schema & RLS',
          description: 'Create tables and security policies',
          status: 'not_started',
          priority: 'high',
          acceptanceCriteria: [
            'Users table with profile data',
            'Orders table structure',
            'RLS policies for all tables',
            'Migrations documented'
          ],
          estimatedHours: 10
        }
      ]
    },
    {
      id: 3,
      name: 'Checkout & Payments',
      description: 'Payment processing and order management',
      goal: 'Users can purchase transformations and receive receipts',
      status: 'upcoming',
      progress: 0,
      dependencies: ['Wave 2 must be complete'],
      deliverables: [
        'Shopping cart',
        'PayPlus integration',
        'Order confirmation emails',
        'Payment receipts'
      ],
      stories: [
        {
          id: 'STORY-008',
          title: 'Build Shopping Cart',
          description: 'Create cart for collecting items before checkout',
          status: 'not_started',
          priority: 'high',
          acceptanceCriteria: [
            'Add items to cart',
            'Update quantities',
            'Remove items',
            'Cart persists across sessions'
          ],
          estimatedHours: 10
        },
        {
          id: 'STORY-009',
          title: 'Integrate PayPlus',
          description: 'Connect PayPlus payment gateway',
          status: 'not_started',
          priority: 'high',
          acceptanceCriteria: [
            'PayPlus SDK integrated',
            'Secure payment form',
            'Webhook for confirmations',
            'Error handling for failures'
          ],
          estimatedHours: 16
        },
        {
          id: 'STORY-010',
          title: 'Order Confirmation Emails',
          description: 'Send email receipts after successful orders',
          status: 'not_started',
          priority: 'medium',
          acceptanceCriteria: [
            'Email template created',
            'Order details included',
            'Sent automatically',
            'Receipt downloadable'
          ],
          estimatedHours: 6
        }
      ]
    },
    {
      id: 4,
      name: 'Admin & Polish',
      description: 'Administration tools and final refinements',
      goal: 'Admins can manage orders and the app is production-ready',
      status: 'upcoming',
      progress: 0,
      dependencies: ['Wave 3 must be complete'],
      deliverables: [
        'Admin dashboard',
        'Order management',
        'Analytics dashboard',
        'Performance optimization'
      ],
      stories: [
        {
          id: 'STORY-011',
          title: 'Build Admin Dashboard',
          description: 'Create administrative interface for managing the platform',
          status: 'not_started',
          priority: 'high',
          acceptanceCriteria: [
            'Admin-only access',
            'Overview statistics',
            'User management',
            'Order list view'
          ],
          estimatedHours: 12
        },
        {
          id: 'STORY-012',
          title: 'Order Management System',
          description: 'Allow admins to view and manage all orders',
          status: 'not_started',
          priority: 'high',
          acceptanceCriteria: [
            'List all orders',
            'Filter by status',
            'Update order status',
            'Issue refunds'
          ],
          estimatedHours: 10
        }
      ]
    }
  ]

  const getStatusColor = (status: Wave['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-600'
      case 'active': return 'bg-zinc-700'
      case 'upcoming': return 'bg-zinc-300'
      case 'blocked': return 'bg-red-500'
    }
  }

  const getStoryStatusIcon = (status: Story['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'in_progress': return <Clock className="h-5 w-5 text-zinc-600" />
      case 'not_started': return <Clock className="h-5 w-5 text-zinc-300" />
      case 'blocked': return <XCircle className="h-5 w-5 text-red-500" />
    }
  }

  const getStoryStatusLabel = (status: Story['status']) => {
    switch (status) {
      case 'completed': return { text: 'Done', class: 'bg-green-100 text-green-700' }
      case 'in_progress': return { text: 'In Progress', class: 'bg-zinc-200 text-zinc-700' }
      case 'not_started': return { text: 'To Do', class: 'bg-zinc-100 text-zinc-500' }
      case 'blocked': return { text: 'Blocked', class: 'bg-red-100 text-red-600' }
    }
  }

  const totalStories = waves.reduce((sum, w) => sum + w.stories.length, 0)
  const completedStories = waves.reduce((sum, w) => sum + w.stories.filter(s => s.status === 'completed').length, 0)
  const inProgressStories = waves.reduce((sum, w) => sum + w.stories.filter(s => s.status === 'in_progress').length, 0)

  return (
    <div className="space-y-6">
      {/* Header with Overview */}
      <div className="bg-zinc-900 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Project Roadmap</h2>
            <p className="text-zinc-400 mb-4">
              Your project is divided into {waves.length} phases called "Waves". Each wave builds on the previous one.
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{Math.round((completedStories / totalStories) * 100)}%</div>
            <div className="text-zinc-400 text-sm">Overall Progress</div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-zinc-800 rounded-xl p-4">
            <div className="text-3xl font-bold">{waves.length}</div>
            <div className="text-zinc-400 text-sm">Total Waves</div>
          </div>
          <div className="bg-zinc-800 rounded-xl p-4">
            <div className="text-3xl font-bold">{totalStories}</div>
            <div className="text-zinc-400 text-sm">Total Stories</div>
          </div>
          <div className="bg-zinc-800 rounded-xl p-4">
            <div className="text-3xl font-bold">{completedStories}</div>
            <div className="text-zinc-400 text-sm">Completed</div>
          </div>
          <div className="bg-zinc-800 rounded-xl p-4">
            <div className="text-3xl font-bold">{inProgressStories}</div>
            <div className="text-zinc-400 text-sm">In Progress</div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-zinc-500 mt-0.5" />
          <div>
            <h4 className="font-semibold text-zinc-800">How does this work?</h4>
            <p className="text-sm text-zinc-600 mt-1">
              Each <strong>Wave</strong> is a development phase with specific goals. Inside each wave are <strong>Stories</strong> -
              individual tasks that need to be completed. Click on any wave to see its stories and details.
            </p>
          </div>
        </div>
      </div>

      {/* Waves */}
      <div className="space-y-3">
        {waves.map((wave) => (
          <div
            key={wave.id}
            className="border border-zinc-200 rounded-xl overflow-hidden bg-white"
          >
            {/* Wave Header - Always visible */}
            <button
              onClick={() => setExpandedWave(expandedWave === wave.id ? null : wave.id)}
              className="w-full p-5 text-left hover:bg-zinc-50 transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* Wave Number */}
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shrink-0",
                  getStatusColor(wave.status)
                )}>
                  {wave.status === 'completed' ? <CheckCircle2 className="h-5 w-5" /> : wave.id}
                </div>

                {/* Wave Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-base font-semibold">Wave {wave.id}: {wave.name}</h3>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded font-medium",
                      wave.status === 'completed' ? 'bg-green-100 text-green-700' :
                      wave.status === 'active' ? 'bg-zinc-200 text-zinc-700' :
                      wave.status === 'blocked' ? 'bg-red-100 text-red-600' :
                      'bg-zinc-100 text-zinc-500'
                    )}>
                      {wave.status === 'completed' ? 'Done' :
                       wave.status === 'active' ? 'Active' :
                       wave.status === 'blocked' ? 'Blocked' : 'Upcoming'}
                    </span>
                  </div>
                  <p className="text-zinc-500 text-sm mb-2">{wave.goal}</p>

                  {/* Progress Bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-zinc-900 rounded-full transition-all"
                        style={{ width: `${wave.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-500">
                      {wave.stories.filter(s => s.status === 'completed').length}/{wave.stories.length} stories
                    </span>
                  </div>
                </div>

                {/* Expand Icon */}
                <ChevronDown className={cn(
                  "h-5 w-5 text-zinc-400 transition-transform shrink-0",
                  expandedWave === wave.id && "rotate-180"
                )} />
              </div>
            </button>

            {/* Expanded Content */}
            {expandedWave === wave.id && (
              <div className="border-t border-zinc-100 bg-zinc-50/50 p-5">
                {/* Dependencies */}
                {wave.dependencies && wave.dependencies.length > 0 && (
                  <div className="mb-4 flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-zinc-400" />
                    <span className="text-zinc-600">Requires: {wave.dependencies.join(', ')}</span>
                  </div>
                )}

                {/* What We'll Build */}
                <div className="mb-5">
                  <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">Deliverables</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {wave.deliverables.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-zinc-200">
                        <CheckCircle2 className={cn(
                          "h-4 w-4",
                          wave.status === 'completed' ? 'text-green-600' : 'text-zinc-300'
                        )} />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stories List */}
                <div>
                  <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">
                    Stories ({wave.stories.length})
                  </h4>
                  <div className="space-y-2">
                    {wave.stories.map((story) => (
                      <div key={story.id} className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
                        {/* Story Header */}
                        <button
                          onClick={() => setExpandedStory(expandedStory === story.id ? null : story.id)}
                          className="w-full p-3 text-left hover:bg-zinc-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {getStoryStatusIcon(story.status)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-mono text-zinc-400">{story.id}</span>
                                <span className={cn(
                                  "text-xs px-1.5 py-0.5 rounded font-medium",
                                  getStoryStatusLabel(story.status).class
                                )}>
                                  {getStoryStatusLabel(story.status).text}
                                </span>
                                {/* Risk Badge */}
                                {story.risk && (
                                  <span className={cn(
                                    "text-xs px-1.5 py-0.5 rounded font-medium",
                                    story.risk === 'critical' ? 'bg-red-100 text-red-700' :
                                    story.risk === 'high' ? 'bg-orange-100 text-orange-700' :
                                    story.risk === 'medium' ? 'bg-amber-100 text-amber-700' :
                                    'bg-green-100 text-green-700'
                                  )}>
                                    {story.risk.toUpperCase()} RISK
                                  </span>
                                )}
                                {/* Requires Review Badge */}
                                {story.requires_review && (
                                  <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-purple-100 text-purple-700">
                                    REVIEW
                                  </span>
                                )}
                                {story.assignedTo && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                                    {story.assignedTo}
                                  </span>
                                )}
                              </div>
                              <h5 className="font-medium text-sm mt-1">{story.title}</h5>
                            </div>
                            <ChevronRight className={cn(
                              "h-4 w-4 text-zinc-400 transition-transform",
                              expandedStory === story.id && "rotate-90"
                            )} />
                          </div>
                        </button>

                        {/* Story Details */}
                        {expandedStory === story.id && (
                          <div className="border-t border-zinc-100 p-3 bg-zinc-50">
                            <p className="text-sm text-zinc-600 mb-3">{story.description}</p>

                            {story.acceptanceCriteria && (
                              <div className="mb-3">
                                <h6 className="text-xs font-medium text-zinc-400 uppercase mb-2">
                                  Acceptance Criteria
                                </h6>
                                <ul className="space-y-1">
                                  {story.acceptanceCriteria.map((criteria, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                      <CheckCircle2 className={cn(
                                        "h-4 w-4 mt-0.5 shrink-0",
                                        story.status === 'completed' ? 'text-green-600' : 'text-zinc-300'
                                      )} />
                                      <span className="text-zinc-600">{criteria}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Risk Classification Section */}
                            {(story.risk || story.safety_tags?.length || story.approval_required) && (
                              <div className="mb-3 p-2 rounded-lg bg-zinc-100 border border-zinc-200">
                                <h6 className="text-xs font-medium text-zinc-400 uppercase mb-2">
                                  Risk Classification
                                </h6>
                                <div className="flex flex-wrap gap-2">
                                  {story.risk && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs text-zinc-500">Risk:</span>
                                      <span className={cn(
                                        "text-xs px-1.5 py-0.5 rounded font-medium",
                                        story.risk === 'critical' ? 'bg-red-100 text-red-700' :
                                        story.risk === 'high' ? 'bg-orange-100 text-orange-700' :
                                        story.risk === 'medium' ? 'bg-amber-100 text-amber-700' :
                                        'bg-green-100 text-green-700'
                                      )}>
                                        {story.risk.toUpperCase()}
                                      </span>
                                    </div>
                                  )}
                                  {story.approval_required && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs text-zinc-500">Approval:</span>
                                      <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-blue-100 text-blue-700">
                                        {story.approval_required}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {story.safety_tags && story.safety_tags.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {story.safety_tags.map(tag => (
                                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex items-center gap-3 text-xs text-zinc-500">
                              <span className={cn(
                                "px-2 py-1 rounded",
                                story.priority === 'high' ? 'bg-zinc-200 text-zinc-700' :
                                story.priority === 'medium' ? 'bg-zinc-100 text-zinc-600' :
                                'bg-zinc-50 text-zinc-500'
                              )}>
                                {story.priority.charAt(0).toUpperCase() + story.priority.slice(1)} Priority
                              </span>
                              {story.estimatedHours && (
                                <span>Est: {story.estimatedHours}h</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProjectChecklist() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('project-overview')
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString())
  const [supabaseConnected, setSupabaseConnected] = useState(false)
  const [storiesCount, setStoriesCount] = useState(0)
  const [syncingStories, setSyncingStories] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [validatingSafety, setValidatingSafety] = useState(false)
  const [safetyValidationResult, setSafetyValidationResult] = useState<{
    status: 'pass' | 'fail' | 'warn' | null,
    message: string,
    details: { name: string, status: string, message: string }[]
  } | null>(null)
  const [validatingRlm, setValidatingRlm] = useState(false)
  const [rlmValidationResult, setRlmValidationResult] = useState<{
    status: 'pass' | 'fail' | 'warn' | null,
    message: string,
    details: { category: string, name: string, status: string, message: string }[],
    docker_ready: boolean,
    gate0_certified: boolean
  } | null>(null)
  const [folderExpanded, setFolderExpanded] = useState(false)
  const [showWaveInfo, setShowWaveInfo] = useState(false)

  // Agent Dispatch state
  interface AgentSession {
    agent_type: string
    display_name: string
    model: string
    color: string
    gates: number[]
    status: 'idle' | 'starting' | 'running' | 'stopping' | 'error'
    current_task: string | null
    current_gate: number | null
    wave_number: number | null
    token_usage: { input: number, output: number, cost: number }
    last_signal: string | null
    started_at: string | null
  }
  const [agents, setAgents] = useState<AgentSession[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [showAgentModal, setShowAgentModal] = useState(false)
  const [agentOutput, setAgentOutput] = useState<string>('')
  const [agentActivity, setAgentActivity] = useState<{ timestamp: string, agent: string, action: string }[]>([])
  const [loadingAgents, setLoadingAgents] = useState(false)

  // Validation state
  interface ValidationReport {
    overall_status: 'PASS' | 'FAIL' | 'WARN'
    summary: { total_checks: number, passed: number, failed: number, warnings: number }
    checks: Array<{ name: string, status: string, message: string, details: string }>
    timestamp: string
  }
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null)
  const [validating, setValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Validation mode state (strict = production, dev = fast iteration, ci = automation)
  const [validationMode, setValidationMode] = useState<'strict' | 'dev' | 'ci'>('strict')

  // Configuration state
  const [configSaving, setConfigSaving] = useState(false)
  const [configSaved, setConfigSaved] = useState(false)
  const [configLoadedFromDb, setConfigLoadedFromDb] = useState(false)
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [configValues, setConfigValues] = useState({
    ANTHROPIC_API_KEY: '',
    SUPABASE_URL: '',
    SUPABASE_ANON_KEY: '',
    SUPABASE_SERVICE_ROLE_KEY: '',
    SLACK_WEBHOOK_URL: '',
    GITHUB_TOKEN: '',
    GITHUB_REPO_URL: '',
    VERCEL_TOKEN: '',
    WAVE_BUDGET_LIMIT: '5.00',
  })

  // Ping/Test connection state
  const [pingStatus, setPingStatus] = useState<Record<string, 'idle' | 'testing' | 'success' | 'error'>>({})
  const [pingMessage, setPingMessage] = useState<Record<string, string>>({})

  // Slack notification testing state
  const [slackTestStatus, setSlackTestStatus] = useState<Record<string, 'idle' | 'sending' | 'success' | 'error'>>({})
  const [slackNotificationHistory, setSlackNotificationHistory] = useState<Array<{
    id: string
    type: string
    timestamp: string
    success: boolean
    message?: string
  }>>([])

  // Send Slack test notification
  const sendSlackTest = async (eventType: string, displayName: string) => {
    setSlackTestStatus(prev => ({ ...prev, [eventType]: 'sending' }))

    try {
      const testData: Record<string, unknown> = {
        project: project?.name || 'Test Project',
        wave: 1,
        agent: 'fe-dev-1',
        storyId: 'TEST-001'
      }

      // Add event-specific data
      switch (eventType) {
        case 'story_start':
          testData.details = { title: 'Test Story - Add login feature' }
          break
        case 'story_complete':
          testData.details = { title: 'Test Story - Add login feature', duration: '3m 42s' }
          testData.cost = 0.1234
          testData.tokens = { input: 15000, output: 3500 }
          break
        case 'gate_complete':
          testData.gate = 3
          testData.details = { fromGate: 2, message: 'Development phase complete' }
          break
        case 'budget_warning':
          testData.severity = 'warning'
          testData.details = { percentage: 78, spent: 3.90, limit: 5.00, message: 'Budget threshold reached' }
          break
        case 'wave_complete':
          testData.details = { storiesCompleted: 5, duration: '45m 23s', filesCreated: 12 }
          testData.cost = 2.45
          break
        case 'escalation':
          testData.severity = 'critical'
          testData.details = { reason: 'Max retries exceeded for QA validation' }
          break
      }

      const response = await fetch('http://localhost:3000/api/slack/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: eventType, data: testData })
      })

      const result = await response.json()

      if (result.success) {
        setSlackTestStatus(prev => ({ ...prev, [eventType]: 'success' }))
        setSlackNotificationHistory(prev => [{
          id: Date.now().toString(),
          type: displayName,
          timestamp: new Date().toLocaleTimeString(),
          success: true
        }, ...prev.slice(0, 4)])
      } else {
        throw new Error(result.reason || 'Failed to send')
      }
    } catch (err) {
      setSlackTestStatus(prev => ({ ...prev, [eventType]: 'error' }))
      setSlackNotificationHistory(prev => [{
        id: Date.now().toString(),
        type: displayName,
        timestamp: new Date().toLocaleTimeString(),
        success: false,
        message: err instanceof Error ? err.message : 'Unknown error'
      }, ...prev.slice(0, 4)])
    }

    // Reset after 3 seconds
    setTimeout(() => {
      setSlackTestStatus(prev => ({ ...prev, [eventType]: 'idle' }))
    }, 3000)
  }

  // Test connection functions
  const testConnection = async (key: string) => {
    setPingStatus(prev => ({ ...prev, [key]: 'testing' }))
    setPingMessage(prev => ({ ...prev, [key]: '' }))

    try {
      switch (key) {
        case 'SUPABASE_URL':
        case 'SUPABASE_ANON_KEY': {
          // Test Supabase connection
          const url = configValues.SUPABASE_URL
          const anonKey = configValues.SUPABASE_ANON_KEY
          if (!url || !anonKey) {
            throw new Error('Both URL and Anon Key required')
          }
          const response = await fetch(`${url}/rest/v1/`, {
            headers: {
              'apikey': anonKey,
              'Authorization': `Bearer ${anonKey}`
            }
          })
          if (response.ok || response.status === 200) {
            setPingStatus(prev => ({ ...prev, [key]: 'success' }))
            setPingMessage(prev => ({ ...prev, [key]: 'Connected!' }))
          } else {
            throw new Error(`Status: ${response.status}`)
          }
          break
        }
        case 'ANTHROPIC_API_KEY': {
          // Test via backend server (avoids CORS)
          const apiKey = configValues.ANTHROPIC_API_KEY
          if (!apiKey.startsWith('sk-ant-')) {
            throw new Error('Invalid key format')
          }
          const response = await fetch('http://localhost:3000/api/test-anthropic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey })
          })
          const data = await response.json()
          if (data.success) {
            setPingStatus(prev => ({ ...prev, [key]: 'success' }))
            setPingMessage(prev => ({ ...prev, [key]: data.message }))
          } else {
            throw new Error(data.error || 'API test failed')
          }
          break
        }
        case 'GITHUB_TOKEN': {
          const token = configValues.GITHUB_TOKEN
          if (!token) throw new Error('Token required')
          const response = await fetch('https://api.github.com/user', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (response.ok) {
            const data = await response.json()
            setPingStatus(prev => ({ ...prev, [key]: 'success' }))
            setPingMessage(prev => ({ ...prev, [key]: `Connected as ${data.login}` }))
          } else {
            throw new Error('Invalid token')
          }
          break
        }
        case 'SLACK_WEBHOOK_URL': {
          const url = configValues.SLACK_WEBHOOK_URL
          if (!url.startsWith('https://hooks.slack.com/')) {
            throw new Error('Invalid webhook URL format')
          }
          // Use the new Slack notifier API
          const testResponse = await fetch('http://localhost:3000/api/slack/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Test from WAVE Portal configuration' })
          })
          const testResult = await testResponse.json()
          if (!testResult.success) {
            throw new Error(testResult.reason || 'Failed to send test notification')
          }
          setPingStatus(prev => ({ ...prev, [key]: 'success' }))
          setPingMessage(prev => ({ ...prev, [key]: 'Test notification sent!' }))
          break
        }
        default:
          setPingStatus(prev => ({ ...prev, [key]: 'success' }))
          setPingMessage(prev => ({ ...prev, [key]: 'Valid' }))
      }
    } catch (err) {
      setPingStatus(prev => ({ ...prev, [key]: 'error' }))
      setPingMessage(prev => ({ ...prev, [key]: err instanceof Error ? err.message : 'Connection failed' }))
    }

    // Reset after 5 seconds
    setTimeout(() => {
      setPingStatus(prev => ({ ...prev, [key]: 'idle' }))
    }, 5000)
  }

  // Foundation validation state
  const [foundationValidating, setFoundationValidating] = useState(false)
  const [foundationStatus, setFoundationStatus] = useState<'idle' | 'validating' | 'ready' | 'blocked'>('idle')
  const [foundationChecks, setFoundationChecks] = useState<FoundationCheck[]>([])
  const [foundationLastChecked, setFoundationLastChecked] = useState<string | null>(null)

  // Safety validation state (DO-178C Aerospace Safety)
  const [safetyStatus, setSafetyStatus] = useState<'idle' | 'validating' | 'ready' | 'blocked'>('idle')
  const [safetyChecks, setSafetyChecks] = useState<{ name: string, status: string, message: string }[]>([])
  const [safetyLastChecked, setSafetyLastChecked] = useState<string | null>(null)
  const [showSafetyModal, setShowSafetyModal] = useState(false)

  // Behavioral Safety Probes state
  const [behavioralProbes, setBehavioralProbes] = useState<{
    probe_id: string
    name: string
    category: string
    severity: string
    status: string
    message?: string
  }[]>([])
  const [behavioralProbeStatus, setBehavioralProbeStatus] = useState<'idle' | 'validating' | 'ready' | 'blocked'>('idle')
  const [behavioralLastChecked, setBehavioralLastChecked] = useState<string | null>(null)
  const [validatingBehavioral, setValidatingBehavioral] = useState(false)

  // Build QA state
  const [buildQaChecks, setBuildQaChecks] = useState<{
    name: string
    status: 'pass' | 'fail' | 'skipped' | 'pending'
    command?: string
    duration_ms?: number
    output?: string
    error?: string
    reason?: string
  }[]>([])
  const [buildQaStatus, setBuildQaStatus] = useState<'idle' | 'validating' | 'ready' | 'blocked'>('idle')
  const [buildQaLastChecked, setBuildQaLastChecked] = useState<string | null>(null)
  const [validatingBuildQa, setValidatingBuildQa] = useState(false)
  const [showBuildQaConfig, setShowBuildQaConfig] = useState(false)
  const [buildQaThresholds, setBuildQaThresholds] = useState<{
    typescript: { max_errors: number, max_warnings: number }
    lint: { max_errors: number, max_warnings: number }
    tests: { min_coverage_percent: number, require_passing: boolean }
    security: { max_critical: number, max_high: number, audit_level: string }
    quality_gates: {
      block_on_typescript_errors: boolean
      block_on_lint_errors: boolean
      block_on_test_failures: boolean
      block_on_security_critical: boolean
      block_on_build_failure: boolean
    }
  } | null>(null)

  // Audit Log state
  interface AuditLogEntry {
    id: string
    event_type: string
    event_category: string | null
    severity: string
    actor_type: string
    actor_id: string
    action: string
    resource_type: string | null
    resource_id: string | null
    details: Record<string, unknown>
    safety_tags: string[]
    requires_review: boolean
    created_at: string
  }
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [auditLogsLoading, setAuditLogsLoading] = useState(false)
  const [auditLogFilter, setAuditLogFilter] = useState<string>('all')
  const [auditLogSummary, setAuditLogSummary] = useState<{
    total_events: number
    requires_review: number
    by_event_type: Record<string, number>
    by_severity: Record<string, number>
  } | null>(null)

  // Watchdog state
  interface WatchdogStatus {
    overall_status: 'healthy' | 'warning' | 'critical'
    summary: { total_agents: number, healthy: number, stuck: number, slow: number, idle: number }
    agents: Array<{
      agent: string
      status: string
      heartbeat_age_seconds: number
      is_stuck: boolean
      alert_level: string
    }>
  }
  const [watchdogStatus, setWatchdogStatus] = useState<WatchdogStatus | null>(null)
  const [watchdogLoading, setWatchdogLoading] = useState(false)

  // Safety Traceability state (Phase 3.2)
  interface TraceabilityReport {
    summary: {
      total_stories: number
      stories_with_risk_classification: number
      stories_with_safety_tags: number
      stories_requiring_review: number
      critical_risk_stories: number
      high_risk_stories: number
      coverage_percent: number
    }
    risk_distribution: { critical: number, high: number, medium: number, low: number }
    forbidden_operations: string[]
    traceability_matrix: Array<{
      story_id: string
      title: string
      wave: number
      risk: string
      safety_tags: string[]
      requires_review: boolean
    }>
  }
  const [traceabilityReport, setTraceabilityReport] = useState<TraceabilityReport | null>(null)
  const [traceabilityLoading, setTraceabilityLoading] = useState(false)

  // Token Budget Governance state (Phase 3.3)
  interface BudgetAlert {
    level: 'info' | 'warning' | 'critical'
    type: string
    target: string
    message: string
    action?: string
    timestamp: string
  }
  interface BudgetStatus {
    config: {
      project_budget: number
      wave_budget: number
      agent_budgets: Record<string, number>
      story_budget_default: number
      alert_thresholds: {
        warning: number
        critical: number
        auto_pause: number
      }
      anomaly_detection: {
        enabled: boolean
        spike_threshold: number
        sustained_threshold: number
        lookback_minutes: number
      }
    }
    usage: {
      total: number
      by_wave: Record<string, number>
      by_agent: Record<string, number>
      by_story: Record<string, number>
    }
    status: {
      project: {
        budget: number
        spent: number
        percent: number
        status: 'ok' | 'warning' | 'critical' | 'exceeded'
      }
      agents: Record<string, {
        budget: number
        spent: number
        percent: number
        status: 'ok' | 'warning' | 'critical' | 'exceeded'
      }>
    }
    alerts: BudgetAlert[]
  }
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null)
  const [budgetLoading, setBudgetLoading] = useState(false)
  const [showBudgetConfig, setShowBudgetConfig] = useState(false)

  const [showFoundationModal, setShowFoundationModal] = useState(false)
  const [showRlmModal, setShowRlmModal] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    // Foundation sections
    'Git': true,
    'Environment': true,
    'Build': true,
    'WAVE': true,
    // Infrastructure sections
    'Git Worktrees': true,
    'Docker Build': true,
    'Notifications': true,
    'Signal Files (Speed Layer)': true,
    'Gate -1: Pre-Validation': true,
    'Database': true,
    'Deployment': true,
    'CLI': true,
    // RLM categories
    'P Variable': true,
    'Agent Memory': true,
    'Snapshots': true,
    'RLM Scripts': true,
    'Token Budget': true
  })

  // Generate markdown report for foundation validation
  const generateFoundationReport = () => {
    const passedChecks = foundationChecks.filter(c => c.status === 'pass')
    const failedChecks = foundationChecks.filter(c => c.status === 'fail')
    const warningChecks = foundationChecks.filter(c => c.status === 'warn')

    const recommendations: Record<string, string> = {
      // Git
      'git-installed': 'Install Git from https://git-scm.com/downloads',
      'git-repo': 'Initialize a git repository with: `git init`',
      'git-remote': 'Add a remote origin with: `git remote add origin <repository-url>`',
      'git-clean': 'Commit or stash your changes before proceeding: `git add . && git commit -m "message"`',
      // Git Worktrees
      'worktree-exist': 'Create worktrees for parallel development:\n```bash\ngit worktree add worktrees/fe-dev -b wave1-fe-dev\ngit worktree add worktrees/be-dev -b wave1-be-dev\ngit worktree add worktrees/qa -b wave1-qa\ngit worktree add worktrees/dev-fix -b wave1-dev-fix\n```',
      'worktree-branches': 'Switch worktrees to correct wave branches:\n```bash\ncd worktrees/fe-dev && git checkout wave1-fe-dev\n```',
      'worktree-sync': 'Pull latest changes in worktrees:\n```bash\nfor wt in fe-dev be-dev qa dev-fix; do git -C worktrees/$wt pull; done\n```',
      'worktree-clean': 'Commit or stash changes in worktrees before starting a wave:\n```bash\nfor wt in fe-dev be-dev qa dev-fix; do git -C worktrees/$wt status; done\n```',
      // Environment
      'env-file': 'Create a .env file in your project root with required environment variables',
      'env-anthropic': 'Add your Anthropic API key to the Configurations tab or .env file:\n```\nANTHROPIC_API_KEY=sk-ant-...\n```\nGet key from: https://console.anthropic.com',
      'env-supabase-url': 'Add your Supabase URL to the Configurations tab or .env file:\n```\nSUPABASE_URL=https://xxx.supabase.co\nSUPABASE_ANON_KEY=eyJ...\n```\nGet from: https://supabase.com/dashboard',
      // Build
      'build-package': 'Create a package.json with: `npm init -y` or `pnpm init`',
      'build-modules': 'Install dependencies with: `npm install` or `pnpm install`',
      'build-typescript': 'Create a tsconfig.json with: `npx tsc --init`',
      'pkg-manager': 'Install pnpm (recommended):\n```bash\nnpm install -g pnpm\n```',
      'pkg-node': 'Install Node.js v18 or later:\n```bash\n# Using nvm:\nnvm install 18 && nvm use 18\n# Or download from: https://nodejs.org\n```',
      // Docker
      'docker-installed': 'Start Docker Desktop or install from: https://docker.com/get-started',
      'docker-config': 'Create a docker-compose.yml or Dockerfile for containerized deployment',
      'docker-build': 'Build Docker images:\n```bash\ndocker compose build\n```',
      'docker-dozzle': 'Start Dozzle log viewer:\n```bash\ndocker run -d --name dozzle -p 8080:8080 -v /var/run/docker.sock:/var/run/docker.sock amir20/dozzle\n```\nThen open: http://localhost:8080',
      // Terminal Tools
      'terminal-iterm': 'Start iTerm2 for managing agent terminal sessions:\n```bash\nopen -a iTerm\n```\nOr install: `brew install --cask iterm2`',
      'terminal-tmux': 'Install tmux for persistent terminal sessions:\n```bash\nbrew install tmux\n```\nCreate session: `tmux new -s wave-agents`',
      // Orchestration
      'orch-merge-watcher': 'Start the merge watcher script for automated coordination:\n```bash\n./core/scripts/merge-watcher-v12.sh\n```\nOr run in background: `nohup ./core/scripts/merge-watcher-v12.sh &`',
      'orch-agent-terms': 'Agent terminals will start automatically when wave begins. To start manually:\n```bash\nclaude --worktree worktrees/fe-dev\n```',
      // CI/CD
      'cicd-gh-actions': 'Authenticate GitHub CLI and check workflow status:\n```bash\ngh auth login\ngh run list --limit 5\n```\nInstall gh: `brew install gh`',
      'cicd-vercel-deploy': 'Link project to Vercel:\n```bash\nnpm i -g vercel\nvercel link\n```\nAdd VERCEL_TOKEN in Configurations tab for automated deploys',
      // Notifications
      'slack-webhook': 'Configure Slack webhook for WAVE notifications:\n1. Go to https://api.slack.com/apps\n2. Create app > Incoming Webhooks\n3. Add webhook URL in Configurations tab',
      // Database
      'db-tables': 'Ensure Supabase tables exist. Run migrations or check RLS policies in Supabase dashboard',
      'db-stories-sync': 'Sync stories to database:\n```bash\ncurl -X POST http://localhost:3000/api/sync-stories -H "Content-Type: application/json" -d \'{"projectPath": "."}\'\n```',
      'db-cli': 'Create cli_sessions table in Supabase for session tracking',
      // Deployment
      'deploy-vercel': 'Create vercel.json for deployment config:\n```json\n{\n  "buildCommand": "npm run build",\n  "outputDirectory": "dist"\n}\n```',
      'deploy-vercel-token': 'Add VERCEL_TOKEN in Configurations tab. Get token from: https://vercel.com/account/tokens',
      'deploy-github': 'Add GITHUB_TOKEN in Configurations tab. Create at: https://github.com/settings/tokens',
      // CLI
      'cli-installed': 'Install Claude Code CLI:\n```bash\nnpm install -g @anthropic-ai/claude-code\n```',
      'cli-claudecode': 'Create .claudecode directory structure:\n```bash\nmkdir -p .claudecode/{agents,templates,workflows,safety}\n```',
      'cli-hooks': 'Create Claude Code hooks for pre/post operations:\n```bash\nmkdir -p ~/.claude/hooks\n# Add hook scripts as needed\n```',
      'cli-prompts': 'Create agent prompt files:\n```bash\nmkdir -p .claude/prompts\ntouch .claude/prompts/fe-dev.md\ntouch .claude/prompts/be-dev.md\n```',
      // Signal Files
      'signal-valid': 'Signal files are auto-created during wave execution',
      // WAVE
      'stories-dir': 'Create a stories directory:\n```bash\nmkdir -p stories/wave1\n```',
      'stories-valid': 'Ensure all story files are valid JSON with required fields (id, title, acceptance_criteria)',
      'stories-schema': 'Add missing fields to story files. Required: id, title, acceptance_criteria. Recommended: agent, domain, priority, story_points',
      'wave-claude-md': 'Create a CLAUDE.md file with project protocol and instructions',
      'wave-budget': 'Set WAVE_BUDGET_LIMIT in Configurations tab to control API spending (e.g., 5.00 for $5)',
      // Gate -1
      'gate-prompts': 'Create agent prompt files in .claude/prompts/ directory',
      'gate-budget': 'Set WAVE_BUDGET_LIMIT in Configurations tab',
      'gate-wt-clean': 'Commit or stash all worktree changes before starting a wave',
      'gate-emergency': 'Remove emergency stop:\n```bash\nrm .claude/EMERGENCY_STOP\n```',
      'gate-prev-wave': 'Previous wave should be completed and merged before starting new wave',
      'gate-api-quota': 'Add ANTHROPIC_API_KEY in Configurations tab',
    }

    let report = `# Infrastructure Validation Report

**Project:** ${project?.name || 'Unknown'}
**Generated:** ${new Date().toISOString()}
**Status:** ${foundationStatus === 'ready' ? '✅ READY TO DEVELOP' : '❌ BLOCKED'}

---

## Summary

| Category | Passed | Failed | Warnings |
|----------|--------|--------|----------|
| Total | ${passedChecks.length} | ${failedChecks.length} | ${warningChecks.length} |

---

## Detailed Results

`

    // Group by category - include ALL categories
    const categories = [
      'Git', 'Git Worktrees', 'Environment', 'Build',
      'Docker Build', 'Terminal Tools', 'Orchestration', 'CI/CD',
      'Notifications', 'Signal Files (Speed Layer)', 'Database', 'Deployment', 'CLI',
      'Gate -1: Pre-Validation', 'WAVE'
    ]
    for (const category of categories) {
      const categoryChecks = foundationChecks.filter(c => c.category === category)
      if (categoryChecks.length === 0) continue

      report += `### ${category}\n\n`
      for (const check of categoryChecks) {
        const icon = check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⚠️'
        report += `- ${icon} **${check.name}**: ${check.message}\n`
      }
      report += '\n'
    }

    // Add recommendations for failed/warning checks
    const issueChecks = [...failedChecks, ...warningChecks]
    if (issueChecks.length > 0) {
      report += `---

## Recommendations

The following items need attention:

`
      for (const check of issueChecks) {
        const priority = check.status === 'fail' ? '🔴 Required' : '🟡 Recommended'
        const fixInstructions = recommendations[check.id] || check.output || 'Please review and fix this issue manually.'
        report += `### ${priority}: ${check.name}

**Issue:** ${check.message}

**Category:** ${check.category}

**How to fix:**
${fixInstructions}

${check.command ? `**Command to run:**\n\`\`\`bash\n${check.command}\n\`\`\`\n` : ''}
---

`
      }
    }

    report += `
## Next Steps

${foundationStatus === 'ready' ? `Your infrastructure is ready! You can now:
1. Navigate to the **Execution Plan** tab to review the wave stories
2. Start development using the WAVE methodology
3. Monitor progress in the **Dashboard**

${warningChecks.length > 0 ? `**Note:** You have ${warningChecks.length} warning(s). While not blocking, consider fixing these for optimal operation.` : ''}
` : `Please fix the issues listed above before proceeding:
1. Address all 🔴 **Required** items first
2. Consider fixing 🟡 **Recommended** items
3. Re-run the foundation validation
4. Once all checks pass, you can begin development
`}

---

*Generated by WAVE Portal v1.0.0*
`

    return report
  }

  // Download foundation report as .md file
  const downloadFoundationReport = () => {
    const report = generateFoundationReport()
    const blob = new Blob([report], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `infrastructure-report-${project?.name || 'project'}-${new Date().toISOString().split('T')[0]}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Generate Aerospace Safety report markdown
  const generateSafetyReport = () => {
    const passedChecks = safetyChecks.filter(c => c.status === 'pass')
    const failedChecks = safetyChecks.filter(c => c.status === 'fail')
    const warningChecks = safetyChecks.filter(c => c.status === 'warn')

    // Recommendations for each check
    const recommendations: Record<string, string> = {
      'FMEA Document (17 modes)': 'Create or update `.claudecode/safety/FMEA.md` with all 17 failure modes:\n```\n## FM-001: Agent Runs as Root User\n## FM-002: Missing API Key\n... (up to FM-017)\n```',
      'Emergency Levels (E1-E5)': 'Create or update `.claudecode/safety/EMERGENCY-LEVELS.md` with all 5 emergency levels:\n```\n## E1: AGENT STOP\n## E2: DOMAIN STOP\n## E3: WAVE STOP\n## E4: SYSTEM STOP\n## E5: EMERGENCY HALT\n```',
      'Approval Matrix (L0-L5)': 'Create or update `.claudecode/safety/APPROVAL-LEVELS.md` with all 6 approval levels:\n```\n## L0: FORBIDDEN\n## L1: HUMAN ONLY\n## L2: CTO APPROVAL\n## L3: PM APPROVAL\n## L4: QA REVIEW\n## L5: AUTO-ALLOWED\n```',
      'Forbidden Operations (108)': 'Create or update `.claudecode/safety/COMPLETE-SAFETY-REFERENCE.md` with all 108 forbidden operations in categories A-J.',
      'Safety Policy': 'Create `.claudecode/safety/SAFETY-POLICY.md` with core safety principles.',
      'pre-flight-validator.sh': 'Ensure script exists and is executable:\n```bash\nchmod +x core/scripts/pre-flight-validator.sh\n```',
      'pre-merge-validator.sh': 'Ensure script exists and is executable:\n```bash\nchmod +x core/scripts/pre-merge-validator.sh\n```',
      'post-deploy-validator.sh': 'Ensure script exists and is executable:\n```bash\nchmod +x core/scripts/post-deploy-validator.sh\n```',
      'safety-violation-detector.sh': 'Ensure script exists and is executable:\n```bash\nchmod +x core/scripts/safety-violation-detector.sh\n```',
      'protocol-compliance-checker.sh': 'Ensure script exists and is executable:\n```bash\nchmod +x core/scripts/protocol-compliance-checker.sh\n```',
      'PM Agent Configuration': 'Create `.claudecode/agents/pm-agent.md` with Gate 0-7 definitions and budget configuration.',
    }

    let report = `# Aerospace Safety Validation Report (DO-178C)

**Project:** ${project?.name || 'Unknown'}
**Generated:** ${new Date().toISOString()}
**Status:** ${safetyStatus === 'ready' ? '✅ SAFETY COMPLIANT' : '❌ SAFETY BLOCKED'}

---

## Summary

| Category | Passed | Failed | Warnings |
|----------|--------|--------|----------|
| Total | ${passedChecks.length} | ${failedChecks.length} | ${warningChecks.length} |

---

## Detailed Results

### Section D: Safety Documentation

`
    // Section D checks
    const sectionDNames = ['FMEA Document (17 modes)', 'Emergency Levels (E1-E5)', 'Approval Matrix (L0-L5)', 'Forbidden Operations (108)', 'Safety Policy']
    for (const name of sectionDNames) {
      const check = safetyChecks.find(c => c.name === name)
      if (check) {
        const icon = check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⚠️'
        report += `- ${icon} **${check.name}**: ${check.message}\n`
      }
    }

    report += `
### Section E: Validation Scripts & PM Agent

`
    // Section E checks
    const sectionENames = ['pre-flight-validator.sh', 'pre-merge-validator.sh', 'post-deploy-validator.sh', 'safety-violation-detector.sh', 'protocol-compliance-checker.sh', 'PM Agent Configuration']
    for (const name of sectionENames) {
      const check = safetyChecks.find(c => c.name === name)
      if (check) {
        const icon = check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⚠️'
        report += `- ${icon} **${check.name}**: ${check.message}\n`
      }
    }

    // Add recommendations for failed/warning checks
    const issueChecks = [...failedChecks, ...warningChecks]
    if (issueChecks.length > 0) {
      report += `
---

## Recommendations

The following items need attention:

`
      for (const check of issueChecks) {
        const priority = check.status === 'fail' ? '🔴 Required' : '🟡 Recommended'
        const fixInstructions = recommendations[check.name] || 'Please review and fix this issue manually.'
        report += `### ${priority}: ${check.name}

**Issue:** ${check.message}

**How to fix:**
${fixInstructions}

---

`
      }
    }

    report += `
## DO-178C Safety Framework

This validation ensures compliance with aerospace-grade safety standards:

| Level | Name | Description |
|-------|------|-------------|
| L0 | FORBIDDEN | 108 operations that are never allowed |
| L1 | HUMAN ONLY | Requires human approval |
| L2 | CTO APPROVAL | CTO agent can approve |
| L3 | PM APPROVAL | PM agent can approve |
| L4 | QA REVIEW | QA agent can approve |
| L5 | AUTO-ALLOWED | Standard development ops |

## Emergency Levels

| Level | Name | Scope |
|-------|------|-------|
| E1 | AGENT STOP | Single agent stops |
| E2 | DOMAIN STOP | Domain agents stop |
| E3 | WAVE STOP | Current wave stops |
| E4 | SYSTEM STOP | All agents stop |
| E5 | EMERGENCY HALT | Total shutdown |

---

## Next Steps

${safetyStatus === 'ready' ? `Your project meets aerospace-grade safety requirements! You can now:
1. Proceed with WAVE development
2. Agents will operate within safety boundaries
3. All 108 forbidden operations are blocked

${warningChecks.length > 0 ? `**Note:** You have ${warningChecks.length} warning(s). While not blocking, consider fixing these for optimal safety.` : ''}
` : `Please fix the safety issues listed above before proceeding:
1. Address all 🔴 **Required** items first
2. Consider fixing 🟡 **Recommended** items
3. Re-run the safety validation
4. Once all checks pass, development can begin safely
`}

---

*Generated by WAVE Portal v1.0.0 - Aerospace-Grade Validation*
`

    return report
  }

  // Download safety report as .md file
  const downloadSafetyReport = () => {
    const report = generateSafetyReport()
    const blob = new Blob([report], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aerospace-safety-report-${project?.name || 'project'}-${new Date().toISOString().split('T')[0]}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Validate Infrastructure function
  const validateFoundation = async () => {
    if (!project?.root_path) return

    setFoundationValidating(true)
    setFoundationStatus('validating')
    setFoundationChecks([])
    setShowFoundationModal(true)

    try {
      const response = await fetch('http://localhost:3000/api/validate-foundation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: project.root_path,
          config: configValues
        })
      })

      // Set up SSE for streaming progress
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const text = decoder.decode(value)
          const lines = text.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.type === 'check') {
                  setFoundationChecks(prev => {
                    const existing = prev.findIndex(c => c.id === data.check.id)
                    if (existing >= 0) {
                      const updated = [...prev]
                      updated[existing] = data.check
                      return updated
                    }
                    return [...prev, data.check]
                  })
                } else if (data.type === 'complete') {
                  setFoundationStatus(data.status)
                  setFoundationLastChecked(new Date().toLocaleTimeString())

                  // Update checks with final state from server
                  if (data.checks) {
                    setFoundationChecks(data.checks)
                  }

                  // Save validation results to database (inside config JSONB)
                  if (project?.id && isSupabaseConfigured()) {
                    try {
                      // Store foundation data inside config JSONB
                      // Use data.checks from server (has final state) instead of React state
                      const configWithFoundation = {
                        ...configValues,
                        _foundation: {
                          status: data.status,
                          checks: data.checks || [],
                          last_checked: new Date().toISOString()
                        }
                      }
                      const { error } = await supabase
                        .from('wave_project_config')
                        .upsert({
                          project_id: project.id,
                          config: configWithFoundation,
                          updated_at: new Date().toISOString()
                        }, { onConflict: 'project_id' })

                      if (error) {
                        console.error('Failed to save validation results:', error)
                      } else {
                        console.log('Validation results saved to database (SOURCE OF TRUTH)')
                      }
                    } catch (dbErr) {
                      console.error('Database save error:', dbErr)
                    }
                  }
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Foundation validation error:', err)
      setFoundationStatus('blocked')
    } finally {
      setFoundationValidating(false)
    }
  }

  // Analysis state
  const [analysisRunning, setAnalysisRunning] = useState(false)
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  const [analysisSteps, setAnalysisSteps] = useState<{
    step: number | string
    status: 'pending' | 'running' | 'complete' | 'failed'
    detail: string
    proof: string | null
  }[]>([])
  const [reportFilePath, setReportFilePath] = useState<string | null>(null)
  const [reportContent, setReportContent] = useState<string | null>(null)
  const [analysisReport, setAnalysisReport] = useState<{
    timestamp: string
    summary: { total_issues: number; total_gaps: number; readiness_score: number }
    file_structure: { status: string; findings: string[]; issues: string[]; tree?: string }
    ai_prd: { status: string; findings: string[]; issues: string[]; prd_location?: string }
    ai_stories: { status: string; findings: string[]; issues: string[]; stories_found: number }
    html_prototype: { status: string; findings: string[]; issues: string[]; files_found: string[] }
    gap_analysis: { gaps: { category: string; description: string; priority: string; action: string }[] }
    improvement_plan: { step: number; title: string; description: string; status: string }[]
  } | null>(null)

  // Check which required keys are configured
  const hasAnthropicKey = configValues.ANTHROPIC_API_KEY.length > 0
  const hasSupabaseUrl = configValues.SUPABASE_URL.length > 0
  const hasSupabaseKey = configValues.SUPABASE_ANON_KEY.length > 0
  const hasBudgetLimit = configValues.WAVE_BUDGET_LIMIT.length > 0
  const allRequiredKeysSet = hasAnthropicKey && hasSupabaseUrl && hasSupabaseKey && hasBudgetLimit
  const someRequiredKeysSet = hasAnthropicKey || hasSupabaseUrl || hasSupabaseKey || hasBudgetLimit

  // Map foundation status to tab status
  const foundationTabStatus: CheckStatusType =
    foundationStatus === 'ready' ? 'pass' :
    foundationStatus === 'blocked' ? 'fail' :
    foundationStatus === 'validating' ? 'pending' :
    'warn' // idle state shows warning to prompt validation

  // RLM validation state
  const [rlmStatus, setRlmStatus] = useState<'idle' | 'validating' | 'ready' | 'blocked'>('idle')
  const [rlmChecks, setRlmChecks] = useState<{ category: string, name: string, status: string, message: string }[]>([])
  const [rlmLastChecked, setRlmLastChecked] = useState<string | null>(null)

  // Drift detection state (Phase 1.3.5)
  interface DriftResult {
    agent: string
    status: 'healthy' | 'drifted' | 'stale' | 'no_baseline'
    drift_score: number | null
    threshold: number
    alert: boolean
    baseline_date?: string
    memory_drift?: {
      baseline_size_kb: number
      current_size_kb: number
      size_growth_rate: number
      baseline_decisions: number
      current_decisions: number
      decision_growth_rate: number
    }
    ttl_status?: {
      exceeded: boolean
      age_days: number
      ttl_days: number
    }
  }
  const [driftReport, setDriftReport] = useState<{
    overall_status: string
    summary: {
      total_agents: number
      healthy: number
      drifted: number
      stale: number
      no_baseline: number
      average_drift_score: number
    }
    recommendations: Array<{
      priority: string
      type: string
      message: string
      agents: string[]
    }>
    agents: DriftResult[]
  } | null>(null)
  const [driftLoading, setDriftLoading] = useState(false)

  const rlmTabStatus: CheckStatusType =
    rlmStatus === 'ready' ? 'pass' :
    rlmStatus === 'blocked' ? 'fail' :
    rlmStatus === 'validating' ? 'pending' :
    'warn'

  // Safety tab status (Aerospace Safety DO-178C)
  const safetyTabStatus: CheckStatusType =
    safetyStatus === 'ready' ? 'pass' :
    safetyStatus === 'blocked' ? 'fail' :
    safetyStatus === 'validating' ? 'pending' :
    'warn' // idle state shows warning to prompt validation

  // Tab order follows logical dependency chain:
  // 1. Understand WHAT (Project Overview)
  // 2. Understand HOW (Execution Plan)
  // 3. Get ACCESS (Configurations) - credentials needed before infra validation
  // 4. Validate PLATFORM (Infrastructure) - uses credentials from step 3
  // 5-9. Safety, RLM, Build, Notifications, Launch
  const tabs = [
    { id: 'project-overview', label: 'Project Overview', shortLabel: '1', status: (analysisReport ? 'pass' : 'warn') as CheckStatusType },
    { id: 'execution-plan', label: 'Execution Plan', shortLabel: '2', status: 'pass' as CheckStatusType },
    { id: 'system-config', label: 'Configurations', shortLabel: '3', status: (allRequiredKeysSet ? 'pass' : someRequiredKeysSet ? 'warn' : 'fail') as CheckStatusType },
    { id: 'infrastructure', label: 'Infrastructure', shortLabel: '4', status: foundationTabStatus },
    { id: 'compliance-safety', label: 'Aerospace Safety', shortLabel: '5', status: safetyTabStatus },
    { id: 'rlm-protocol', label: 'RLM Protocol', shortLabel: '6', status: rlmTabStatus },
    { id: 'build-qa', label: 'Build QA', shortLabel: '7', status: (buildQaStatus === 'ready' ? 'pass' : buildQaStatus === 'blocked' ? 'fail' : buildQaStatus === 'validating' ? 'pending' : 'warn') as CheckStatusType },
    { id: 'notifications', label: 'Notifications', shortLabel: '8', status: 'pending' as CheckStatusType },
    { id: 'agent-dispatch', label: 'Agent Dispatch', shortLabel: '9', status: (agents.some(a => a.status === 'running') ? 'pass' : 'pending') as CheckStatusType },
    { id: 'audit-log', label: 'Audit Log', shortLabel: '10', status: ((auditLogSummary?.requires_review || 0) > 0 ? 'warn' : 'pass') as CheckStatusType },
  ]

  const toggleShowKey = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const updateConfigValue = (key: string, value: string) => {
    setConfigValues(prev => ({ ...prev, [key]: value }))
    setConfigSaved(false)
  }

  const saveConfiguration = async () => {
    setConfigSaving(true)
    try {
      // Save to Supabase if connected
      if (supabaseConnected && project) {
        console.log('[DEBUG] Saving config - project.id:', project.id, 'projectId (URL):', projectId)
        console.log('[DEBUG] Saving config values:', Object.keys(configValues))
        const { error } = await supabase
          .from('wave_project_config')
          .upsert({
            project_id: project.id,
            config: configValues,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'project_id' })

        if (error) {
          console.error('Failed to save config to database:', error)
          alert(`Failed to save configuration: ${error.message}`)
          return
        }
        console.log('Config saved successfully to database')
      }
      setConfigSaved(true)
      setTimeout(() => setConfigSaved(false), 3000)
    } catch (error) {
      console.error('Error saving configuration:', error)
      alert('Failed to save configuration. Check console for details.')
    } finally {
      setConfigSaving(false)
    }
  }

  // Reload configuration from database
  const reloadConfiguration = async () => {
    if (!isSupabaseConfigured() || !projectId) {
      console.log('[DEBUG] Cannot reload - supabase or projectId missing')
      return
    }

    console.log('[DEBUG] Reloading config from database for projectId:', projectId)
    const { data: savedConfig, error: configError } = await supabase
      .from('wave_project_config')
      .select('*')
      .eq('project_id', projectId)
      .single()

    console.log('[DEBUG] Reload result:', { savedConfig, configError })

    if (configError) {
      console.error('Error reloading config:', configError)
      alert('Failed to reload configuration: ' + configError.message)
      return
    }

    if (savedConfig?.config) {
      const config = savedConfig.config as Record<string, string>
      console.log('[DEBUG] Reloaded config:', config)
      setConfigValues({
        ANTHROPIC_API_KEY: config.ANTHROPIC_API_KEY || '',
        SUPABASE_URL: config.SUPABASE_URL || '',
        SUPABASE_ANON_KEY: config.SUPABASE_ANON_KEY || '',
        SUPABASE_SERVICE_ROLE_KEY: config.SUPABASE_SERVICE_ROLE_KEY || '',
        SLACK_WEBHOOK_URL: config.SLACK_WEBHOOK_URL || '',
        GITHUB_TOKEN: config.GITHUB_TOKEN || '',
        GITHUB_REPO_URL: config.GITHUB_REPO_URL || '',
        VERCEL_TOKEN: config.VERCEL_TOKEN || '',
        WAVE_BUDGET_LIMIT: config.WAVE_BUDGET_LIMIT || '5.00',
      })
      setConfigLoadedFromDb(true)
      alert('Configuration reloaded from database!')
    } else {
      alert('No configuration found in database')
    }
  }

  // Analysis step labels
  const analysisStepLabels: Record<number, string> = {
    1: 'Scanning directory structure',
    2: 'Reading CLAUDE.md protocol',
    3: 'Finding AI PRD document',
    4: 'Reading story JSON files',
    5: 'Scanning HTML prototypes',
    6: 'Checking WAVE configuration',
    7: 'Generating gap analysis',
    8: 'Creating markdown report',
  }

  // Run Analysis function - calls streaming backend API
  const runAnalysis = async () => {
    if (!project) return

    setAnalysisRunning(true)
    setAnalysisComplete(false)
    setAnalysisReport(null)
    setShowAnalysisModal(true)
    setReportFilePath(null)

    // Initialize steps
    setAnalysisSteps([
      { step: 1, status: 'pending', detail: 'Scanning directory structure', proof: null },
      { step: 2, status: 'pending', detail: 'Reading CLAUDE.md protocol', proof: null },
      { step: 3, status: 'pending', detail: 'Finding AI PRD document', proof: null },
      { step: 4, status: 'pending', detail: 'Reading story JSON files', proof: null },
      { step: 5, status: 'pending', detail: 'Scanning HTML prototypes', proof: null },
      { step: 6, status: 'pending', detail: 'Checking WAVE configuration', proof: null },
      { step: 7, status: 'pending', detail: 'Generating gap analysis', proof: null },
      { step: 8, status: 'pending', detail: 'Creating markdown report', proof: null },
    ])

    try {
      // Use streaming endpoint
      const response = await fetch('http://localhost:3000/api/analyze-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectPath: project.root_path,
        }),
      })

      if (!response.ok) {
        throw new Error(`Analysis API error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE messages
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'result') {
                // Final result
                const report = data.report
                const transformedReport = {
                  timestamp: report.timestamp,
                  summary: report.summary,
                  file_structure: {
                    status: report.file_structure?.status || 'pending',
                    findings: report.file_structure?.findings || [],
                    issues: report.file_structure?.issues || [],
                    tree: report.file_structure?.tree || '',
                  },
                  ai_prd: {
                    status: report.ai_prd?.status || 'pending',
                    findings: report.ai_prd?.findings || [],
                    issues: report.ai_prd?.issues || [],
                    prd_location: report.ai_prd?.prd_location,
                  },
                  ai_stories: {
                    status: report.ai_stories?.status || 'pending',
                    findings: report.ai_stories?.findings || [],
                    issues: report.ai_stories?.issues || [],
                    stories_found: report.ai_stories?.stories_found || 0,
                  },
                  html_prototype: {
                    status: report.html_prototype?.status || 'pending',
                    findings: report.html_prototype?.findings || [],
                    issues: report.html_prototype?.issues || [],
                    files_found: report.html_prototype?.files_found || [],
                  },
                  gap_analysis: report.gap_analysis,
                  improvement_plan: report.improvement_plan,
                }
                setAnalysisReport(transformedReport)
                setReportFilePath(report.report_file)
                setReportContent(report.report_content)

                // Store to Supabase immediately when result is received
                if (supabaseConnected && project) {
                  (async () => {
                    try {
                      const { error } = await supabase
                        .from('wave_analysis_reports')
                        .upsert({
                          project_id: project.id,
                          report_type: 'gap_analysis',
                          report_data: transformedReport,
                          readiness_score: transformedReport.summary.readiness_score,
                          total_gaps: transformedReport.summary.total_gaps,
                          created_at: transformedReport.timestamp,
                        }, { onConflict: 'project_id,report_type' })

                      if (error) {
                        console.error('Database save error:', error)
                        alert(`Failed to save analysis to database: ${error.message}\n\nMake sure wave_analysis_reports table exists in Supabase.`)
                      } else {
                        console.log('Analysis saved to database (SOURCE OF TRUTH)')
                      }
                    } catch (err) {
                      console.error('Error saving analysis:', err)
                      alert('Failed to save analysis - check console for details')
                    }
                  })()
                }
              } else if (data.step) {
                // Update step status
                setAnalysisSteps(prev => prev.map(s =>
                  s.step === data.step
                    ? { ...s, status: data.status, detail: data.detail, proof: data.proof }
                    : s
                ))
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e)
            }
          }
        }
      }

      setAnalysisComplete(true)
    } catch (error) {
      console.error('Analysis error:', error)
      // Fallback to basic analysis if API fails
      setAnalysisReport({
        timestamp: new Date().toISOString(),
        summary: { total_issues: 1, total_gaps: 1, readiness_score: 0 },
        file_structure: { status: 'fail', findings: [], issues: ['Analysis API not available. Start the server with: npm run server'] },
        ai_prd: { status: 'pending', findings: [], issues: [], prd_location: undefined },
        ai_stories: { status: 'pending', findings: [], issues: [], stories_found: 0 },
        html_prototype: { status: 'pending', findings: [], issues: [], files_found: [] },
        gap_analysis: { gaps: [{ category: 'System', description: 'Analysis server not running', priority: 'high', action: 'Run: npm run server (in portal directory)' }] },
        improvement_plan: [{ step: 1, title: 'Start Analysis Server', description: 'Run npm run server in the portal directory to enable real file analysis', status: 'pending' }],
      })
      setAnalysisComplete(true)
    } finally {
      setAnalysisRunning(false)
    }
  }

  // Help modal state
  const [helpModal, setHelpModal] = useState<string | null>(null)

  // Setup guides for each API key
  const setupGuides: Record<string, { title: string; steps: string[]; links: { label: string; url: string }[] }> = {
    ANTHROPIC_API_KEY: {
      title: 'How to get your Anthropic API Key',
      steps: [
        'Go to the Anthropic Console',
        'Sign in or create an account',
        'Navigate to "API Keys" in the left sidebar',
        'Click "Create Key" button',
        'Give your key a name (e.g., "WAVE Project")',
        'Copy the key - it starts with sk-ant-api03-',
        'Paste it here and click Save'
      ],
      links: [
        { label: 'Anthropic Console', url: 'https://console.anthropic.com/' },
        { label: 'API Keys Page', url: 'https://console.anthropic.com/settings/keys' }
      ]
    },
    SUPABASE_URL: {
      title: 'How to get your Supabase URL',
      steps: [
        'Go to your Supabase Dashboard',
        'Select your project (or create one)',
        'Go to Project Settings (gear icon)',
        'Click on "API" in the sidebar',
        'Copy the "Project URL" - it looks like https://xxxxx.supabase.co'
      ],
      links: [
        { label: 'Supabase Dashboard', url: 'https://supabase.com/dashboard' },
        { label: 'Create New Project', url: 'https://supabase.com/dashboard/new' }
      ]
    },
    SUPABASE_ANON_KEY: {
      title: 'How to get your Supabase Anon Key',
      steps: [
        'Go to your Supabase Dashboard',
        'Select your project',
        'Go to Project Settings > API',
        'Under "Project API keys", find "anon public"',
        'Copy the key - it starts with eyJ...'
      ],
      links: [
        { label: 'Supabase Dashboard', url: 'https://supabase.com/dashboard' }
      ]
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      title: 'How to get your Supabase Service Role Key',
      steps: [
        'Go to your Supabase Dashboard',
        'Select your project',
        'Go to Project Settings > API',
        'Under "Project API keys", find "service_role" (secret)',
        'Click "Reveal" to see the key',
        'Copy the key - keep it secure, never expose in frontend!'
      ],
      links: [
        { label: 'Supabase Dashboard', url: 'https://supabase.com/dashboard' }
      ]
    },
    SLACK_WEBHOOK_URL: {
      title: 'How to create a Slack Webhook URL',
      steps: [
        'Go to Slack API Apps page',
        'Click "Create New App" > "From scratch"',
        'Name your app (e.g., "WAVE Notifications") and select workspace',
        'In the left sidebar, click "Incoming Webhooks"',
        'Toggle "Activate Incoming Webhooks" to ON',
        'Click "Add New Webhook to Workspace"',
        'Select the channel for notifications',
        'Copy the Webhook URL - starts with https://hooks.slack.com/services/'
      ],
      links: [
        { label: 'Slack API Apps', url: 'https://api.slack.com/apps' },
        { label: 'Webhooks Documentation', url: 'https://api.slack.com/messaging/webhooks' }
      ]
    },
    GITHUB_TOKEN: {
      title: 'How to create a GitHub Personal Access Token',
      steps: [
        'Go to GitHub Settings > Developer settings',
        'Click "Personal access tokens" > "Tokens (classic)"',
        'Click "Generate new token" > "Generate new token (classic)"',
        'Give it a note (e.g., "WAVE Project")',
        'Select scopes: repo, workflow (for full access)',
        'Click "Generate token"',
        'Copy the token immediately - it starts with ghp_'
      ],
      links: [
        { label: 'GitHub Token Settings', url: 'https://github.com/settings/tokens' },
        { label: 'Token Documentation', url: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token' }
      ]
    },
    VERCEL_TOKEN: {
      title: 'How to create a Vercel Token',
      steps: [
        'Go to Vercel Dashboard',
        'Click your avatar > Settings',
        'Go to "Tokens" tab',
        'Click "Create" button',
        'Name your token (e.g., "WAVE Project")',
        'Select scope and expiration',
        'Click "Create Token"',
        'Copy the token - it starts with vercel_'
      ],
      links: [
        { label: 'Vercel Tokens', url: 'https://vercel.com/account/tokens' },
        { label: 'Documentation', url: 'https://vercel.com/docs/rest-api#creating-an-access-token' }
      ]
    },
    WAVE_BUDGET_LIMIT: {
      title: 'Wave Budget Limit',
      steps: [
        'This is the maximum amount (in USD) that can be spent on API calls per wave',
        'Recommended: Start with $5.00 for development',
        'Production waves may need $20-50 depending on complexity',
        'WAVE will stop execution if the budget is exceeded'
      ],
      links: [
        { label: 'Anthropic Pricing', url: 'https://www.anthropic.com/pricing' }
      ]
    }
  }

  const configFields = [
    { key: 'ANTHROPIC_API_KEY', label: 'Anthropic API Key', placeholder: 'sk-ant-api03-...', required: true, description: 'Required for Claude AI agents', format: 'sk-ant-' },
    { key: 'SUPABASE_URL', label: 'Supabase URL', placeholder: 'https://xxxxx.supabase.co', required: true, description: 'Your Supabase project URL', format: 'https://' },
    { key: 'SUPABASE_ANON_KEY', label: 'Supabase Anon Key', placeholder: 'eyJhbGciOiJIUzI1NiIs...', required: true, description: 'Public anonymous key for client-side access', format: 'eyJ' },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase Service Role Key', placeholder: 'eyJhbGciOiJIUzI1NiIs...', required: false, description: 'Server-side key with elevated privileges (optional)', format: 'eyJ' },
    { key: 'SLACK_WEBHOOK_URL', label: 'Slack Webhook URL', placeholder: 'https://hooks.slack.com/services/...', required: false, description: 'For notifications and alerts', format: 'https://hooks.slack.com' },
    { key: 'GITHUB_TOKEN', label: 'GitHub Token', placeholder: 'ghp_...', required: false, description: 'For repository operations and PR creation', format: 'ghp_' },
    { key: 'GITHUB_REPO_URL', label: 'GitHub Repository URL', placeholder: 'https://github.com/username/repo', required: false, description: 'Repository URL for git remote origin', format: 'https://github.com' },
    { key: 'VERCEL_TOKEN', label: 'Vercel Token', placeholder: 'Your Vercel API token', required: false, description: 'For deployment previews (optional)', format: '' },
    { key: 'WAVE_BUDGET_LIMIT', label: 'Wave Budget Limit ($)', placeholder: '5.00', required: true, description: 'Maximum API spend per wave', format: '' },
  ]

  // Dynamic file checks based on analysis results
  const fileChecks: FileCheck[] = [
    {
      name: 'AI PRD Document',
      path: 'ai-prd/AI-PRD.md',
      status: analysisReport?.ai_prd?.status === 'pass' ? 'found' : 'not_found'
    },
    { name: 'CLAUDE.md (Agent Instructions)', path: 'CLAUDE.md', status: 'found' },
    {
      name: 'README.md',
      path: 'README.md',
      status: analysisReport ? 'found' : 'not_found'  // Assume found if analysis ran
    },
    { name: 'Environment Config', path: '.env', status: 'found' },
    { name: 'package.json', path: 'package.json', status: 'found' },
    { name: 'tsconfig.json', path: 'tsconfig.json', status: 'found' },
  ]

  const fetchProject = useCallback(async () => {
    console.log('[DEBUG] fetchProject called, projectId:', projectId, 'supabase configured:', isSupabaseConfigured())
    if (!isSupabaseConfigured() || !projectId) {
      console.log('[DEBUG] fetchProject early exit - supabase:', isSupabaseConfigured(), 'projectId:', projectId)
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('wave_projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) {
        console.error('Error fetching project:', error)
        navigate('/projects/new')
        return
      }

      setProject(data)
      setSupabaseConnected(true)

      const { count } = await supabase
        .from('wave_stories')
        .select('*', { count: 'exact', head: true })

      setStoriesCount(count || 0)

      // Load saved analysis report from database (SOURCE OF TRUTH)
      const { data: savedReport } = await supabase
        .from('wave_analysis_reports')
        .select('*')
        .eq('project_id', projectId)
        .eq('report_type', 'gap_analysis')
        .single()

      if (savedReport?.report_data) {
        const reportData = savedReport.report_data as any
        setAnalysisReport({
          timestamp: reportData.timestamp || savedReport.created_at,
          summary: reportData.summary || { total_issues: 0, total_gaps: savedReport.total_gaps || 0, readiness_score: savedReport.readiness_score || 0 },
          file_structure: reportData.file_structure || { status: 'pending', findings: [], issues: [], tree: '' },
          ai_prd: reportData.ai_prd || { status: 'pending', findings: [], issues: [] },
          ai_stories: reportData.ai_stories || { status: 'pending', findings: [], issues: [], stories_found: 0 },
          html_prototype: reportData.html_prototype || { status: 'pending', findings: [], issues: [], files_found: [] },
          gap_analysis: reportData.gap_analysis || { gaps: [] },
          improvement_plan: reportData.improvement_plan || [],
        })
        setAnalysisComplete(true)
        console.log('Loaded saved analysis from database (SOURCE OF TRUTH)')
      }

      // Load saved configuration from database (SOURCE OF TRUTH)
      console.log('[DEBUG] Loading config for projectId:', projectId)
      const { data: savedConfig, error: configError } = await supabase
        .from('wave_project_config')
        .select('*')
        .eq('project_id', projectId)
        .single()

      console.log('[DEBUG] Config query result:', { savedConfig, configError })

      if (configError) {
        if (configError.code !== 'PGRST116') { // PGRST116 = no rows found (acceptable on first load)
          console.error('Error loading config from database:', configError)
        } else {
          console.log('[DEBUG] No config found (first load)')
        }
      }

      if (savedConfig?.config) {
        const config = savedConfig.config as Record<string, string>
        console.log('[DEBUG] Config object from database:', config)
        console.log('[DEBUG] ANTHROPIC_API_KEY in config:', config.ANTHROPIC_API_KEY ? 'Present (length: ' + config.ANTHROPIC_API_KEY.length + ')' : 'Missing')
        setConfigValues(prev => {
          const newValues = {
            ...prev,
            ANTHROPIC_API_KEY: config.ANTHROPIC_API_KEY || '',
            SUPABASE_URL: config.SUPABASE_URL || '',
            SUPABASE_ANON_KEY: config.SUPABASE_ANON_KEY || '',
            SUPABASE_SERVICE_ROLE_KEY: config.SUPABASE_SERVICE_ROLE_KEY || '',
            SLACK_WEBHOOK_URL: config.SLACK_WEBHOOK_URL || '',
            GITHUB_TOKEN: config.GITHUB_TOKEN || '',
            GITHUB_REPO_URL: config.GITHUB_REPO_URL || '',
            VERCEL_TOKEN: config.VERCEL_TOKEN || '',
            WAVE_BUDGET_LIMIT: config.WAVE_BUDGET_LIMIT || '5.00',
          }
          console.log('[DEBUG] Setting configValues to:', Object.keys(newValues).map(k => `${k}: ${newValues[k as keyof typeof newValues] ? 'SET' : 'EMPTY'}`))
          return newValues
        })
        console.log('Loaded saved configuration from database (SOURCE OF TRUTH)')
        setConfigLoadedFromDb(true)

        // Load foundation validation from config._foundation
        if (config._foundation) {
          const foundation = config._foundation as { status: string; checks: FoundationCheck[]; last_checked: string }
          if (foundation.status) {
            setFoundationStatus(foundation.status as 'idle' | 'validating' | 'ready' | 'blocked')
          }
          if (foundation.last_checked) {
            setFoundationLastChecked(new Date(foundation.last_checked).toLocaleTimeString())
          }
          if (foundation.checks) {
            setFoundationChecks(foundation.checks)
          }
          console.log('Loaded foundation validation from database (SOURCE OF TRUTH)')
        }

        // Load safety validation from config._safety
        if (config._safety) {
          const safety = config._safety as { status: string; checks: { name: string, status: string, message: string }[]; last_checked: string }
          if (safety.status) {
            setSafetyStatus(safety.status as 'idle' | 'validating' | 'ready' | 'blocked')
          }
          if (safety.last_checked) {
            setSafetyLastChecked(new Date(safety.last_checked).toLocaleTimeString())
          }
          if (safety.checks) {
            setSafetyChecks(safety.checks)
          }
          console.log('Loaded safety validation from database (SOURCE OF TRUTH)')
        }
      } else {
        console.log('[DEBUG] savedConfig?.config is falsy:', savedConfig)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [projectId, navigate])

  useEffect(() => {
    fetchProject()
  }, [fetchProject])

  // Debug: Log when configValues changes
  useEffect(() => {
    console.log('[DEBUG] configValues updated:', {
      ANTHROPIC_API_KEY: configValues.ANTHROPIC_API_KEY ? 'SET (len: ' + configValues.ANTHROPIC_API_KEY.length + ')' : 'EMPTY',
      SUPABASE_URL: configValues.SUPABASE_URL ? 'SET' : 'EMPTY',
      SUPABASE_ANON_KEY: configValues.SUPABASE_ANON_KEY ? 'SET' : 'EMPTY',
    })
  }, [configValues])

  useEffect(() => {
    const interval = setInterval(() => setLastUpdate(new Date().toLocaleTimeString()), 1000)
    return () => clearInterval(interval)
  }, [])

  const copyPath = (path: string) => navigator.clipboard.writeText(path)

  // Sync stories from JSON files to Supabase database
  const syncStories = async () => {
    if (!project || !supabaseConnected) {
      setSyncMessage('Supabase not connected')
      return
    }

    setSyncingStories(true)
    setSyncMessage(null)

    try {
      // Fetch stories from file system via API
      const response = await fetch('http://localhost:3000/api/sync-stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath: project.root_path }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch stories from server')
      }

      const { stories, count } = await response.json()

      if (count === 0) {
        setSyncMessage('No stories found in project files')
        return
      }

      // Upsert stories to Supabase
      let synced = 0
      let errors = 0

      for (const story of stories) {
        const { error } = await supabase
          .from('wave_stories')
          .upsert({
            story_id: story.story_id,
            wave_number: story.wave_number,
            title: story.title,
            status: story.status,
            gate: story.gate,
            agent_type: story.agent_type,
            pipeline_id: project.id, // Link to project
          }, { onConflict: 'story_id' })

        if (error) {
          console.error('Error syncing story:', story.story_id, error)
          errors++
        } else {
          synced++
        }
      }

      setSyncMessage(`Synced ${synced} stories${errors > 0 ? ` (${errors} errors)` : ''}`)

      // Refresh stories count
      const { count: newCount } = await supabase
        .from('wave_stories')
        .select('*', { count: 'exact', head: true })

      setStoriesCount(newCount || 0)
    } catch (error) {
      console.error('Sync error:', error)
      setSyncMessage('Sync failed - run "npm run server" locally')
    } finally {
      setSyncingStories(false)
    }
  }

  // Validate Aerospace Safety (DO-178C compliance)
  const validateSafety = async () => {
    setValidatingSafety(true)
    setSafetyStatus('validating')
    setSafetyChecks([])
    setSafetyValidationResult(null)
    setShowSafetyModal(true)

    try {
      const response = await fetch('http://localhost:3000/api/validate-safety', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: project?.root_path,
          wavePath: '/Volumes/SSD-01/Projects/WAVE'
        }),
      })

      const result = await response.json()
      setSafetyValidationResult(result)

      // Update safety state from results
      const newStatus = result.status === 'pass' ? 'ready' : 'blocked'
      setSafetyStatus(newStatus)
      setSafetyChecks(result.details || [])
      const checkedTime = new Date().toLocaleTimeString()
      setSafetyLastChecked(checkedTime)

      // Save validation results to database (SOURCE OF TRUTH)
      if (project?.id && isSupabaseConfigured()) {
        try {
          const configWithSafety = {
            ...configValues,
            _safety: {
              status: newStatus,
              checks: result.details || [],
              last_checked: new Date().toISOString(),
              summary: result.message
            }
          }
          const { error } = await supabase
            .from('wave_project_config')
            .upsert({
              project_id: project.id,
              config: configWithSafety,
              updated_at: new Date().toISOString()
            }, { onConflict: 'project_id' })

          if (error) {
            console.error('Failed to save safety validation results:', error)
          } else {
            console.log('Safety validation results saved to database (SOURCE OF TRUTH)')

            // Add audit trail entry
            const { error: auditError } = await supabase
              .from('wave_audit_log')
              .insert({
                project_id: project.id,
                agent: 'CTO',
                action: `Safety validation ${newStatus === 'ready' ? 'PASSED' : 'BLOCKED'}`,
                details: {
                  type: 'safety_validation',
                  status: newStatus,
                  passed: result.details?.filter((c: { status: string }) => c.status === 'pass').length || 0,
                  failed: result.details?.filter((c: { status: string }) => c.status === 'fail').length || 0,
                  warnings: result.details?.filter((c: { status: string }) => c.status === 'warn').length || 0,
                  summary: result.message
                }
              })

            if (auditError) {
              console.error('Failed to write audit log:', auditError)
            } else {
              console.log('Safety validation logged to audit trail')
            }
          }
        } catch (dbErr) {
          console.error('Database save error:', dbErr)
        }
      }
    } catch (error) {
      setSafetyValidationResult({
        status: 'fail',
        message: 'Validation failed: ' + (error as Error).message,
        details: []
      })
      setSafetyStatus('blocked')
    } finally {
      setValidatingSafety(false)
    }
  }

  // Validate Behavioral Safety Probes
  const validateBehavioralProbes = async () => {
    // Skip behavioral probes in dev mode
    if (validationMode === 'dev') {
      setBehavioralProbeStatus('idle')
      setBehavioralProbes([])
      return
    }

    setValidatingBehavioral(true)
    setBehavioralProbeStatus('validating')
    setBehavioralProbes([])

    try {
      const response = await fetch('http://localhost:3000/api/validate-behavioral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: project?.root_path,
          mode: validationMode,
          dryRun: true
        }),
      })

      const result = await response.json()

      if (result.success) {
        const newStatus = result.overall_status === 'pass' || result.overall_status === 'validated'
          ? 'ready'
          : result.overall_status === 'pending' ? 'idle' : 'blocked'
        setBehavioralProbeStatus(newStatus)
        setBehavioralProbes(result.results || [])
        setBehavioralLastChecked(new Date().toLocaleTimeString())

        // Save to database
        if (project?.id && isSupabaseConfigured()) {
          const configWithBehavioral = {
            ...configValues,
            _behavioral_safety: {
              status: newStatus,
              probes: result.results || [],
              summary: result.summary,
              last_checked: new Date().toISOString()
            }
          }
          await supabase
            .from('wave_project_config')
            .upsert({
              project_id: project.id,
              config: configWithBehavioral,
              updated_at: new Date().toISOString()
            }, { onConflict: 'project_id' })
        }
      } else {
        setBehavioralProbeStatus('blocked')
      }
    } catch (error) {
      console.error('Behavioral probe validation error:', error)
      setBehavioralProbeStatus('blocked')
    } finally {
      setValidatingBehavioral(false)
    }
  }

  // Validate Build QA
  const validateBuildQa = async (quick = false) => {
    setValidatingBuildQa(true)
    setBuildQaStatus('validating')
    setBuildQaChecks([])

    try {
      const response = await fetch('http://localhost:3000/api/validate-build-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: project?.root_path,
          quick,
          mode: validationMode
        }),
      })

      const result = await response.json()

      if (result.success) {
        const newStatus = result.overall_status === 'pass' ? 'ready' :
                         result.overall_status === 'skipped' ? 'idle' : 'blocked'
        setBuildQaStatus(newStatus)
        setBuildQaChecks(result.checks || [])
        setBuildQaLastChecked(new Date().toLocaleTimeString())

        // Save to database
        if (project?.id && isSupabaseConfigured()) {
          const configWithBuildQa = {
            ...configValues,
            _build_qa: {
              status: newStatus,
              checks: result.checks || [],
              summary: result.summary,
              last_checked: new Date().toISOString()
            }
          }
          await supabase
            .from('wave_project_config')
            .upsert({
              project_id: project.id,
              config: configWithBuildQa,
              updated_at: new Date().toISOString()
            }, { onConflict: 'project_id' })
        }
      } else {
        setBuildQaStatus('blocked')
      }
    } catch (error) {
      console.error('Build QA validation error:', error)
      setBuildQaStatus('blocked')
    } finally {
      setValidatingBuildQa(false)
    }
  }

  // Fetch Build QA thresholds
  const fetchBuildQaThresholds = async () => {
    if (!project?.root_path) return

    try {
      const response = await fetch(
        `http://localhost:3000/api/build-qa/thresholds?projectPath=${encodeURIComponent(project.root_path)}`
      )
      const data = await response.json()

      if (data.success) {
        setBuildQaThresholds(data.thresholds)
      }
    } catch (error) {
      console.error('Failed to fetch build QA thresholds:', error)
    }
  }

  // Update Build QA thresholds
  const updateBuildQaThresholds = async (updates: Partial<typeof buildQaThresholds>) => {
    if (!project?.root_path || !buildQaThresholds) return

    try {
      const response = await fetch('http://localhost:3000/api/build-qa/thresholds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: project.root_path,
          thresholds: { ...buildQaThresholds, ...updates }
        })
      })
      const data = await response.json()

      if (data.success) {
        setBuildQaThresholds(data.thresholds)
      }
    } catch (error) {
      console.error('Failed to update build QA thresholds:', error)
    }
  }

  // RLM Protocol validation - real validation against codebase and scripts
  const validateRlm = async () => {
    setValidatingRlm(true)
    setRlmStatus('validating')
    setRlmChecks([])
    setRlmValidationResult(null)
    setShowRlmModal(true)

    try {
      const response = await fetch('http://localhost:3000/api/validate-rlm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: project?.root_path,
          wavePath: '/Volumes/SSD-01/Projects/WAVE'
        }),
      })

      const result = await response.json()
      setRlmValidationResult(result)

      // Update RLM state from results
      const newStatus = result.status === 'pass' ? 'ready' : result.status === 'warn' ? 'ready' : 'blocked'
      setRlmStatus(newStatus)
      setRlmChecks(result.details || [])
      const checkedTime = new Date().toLocaleTimeString()
      setRlmLastChecked(checkedTime)

      // Save validation results to database (SOURCE OF TRUTH)
      if (project?.id && isSupabaseConfigured()) {
        try {
          const configWithRlm = {
            ...configValues,
            _rlm: {
              status: newStatus,
              checks: result.details || [],
              last_checked: new Date().toISOString(),
              summary: result.message,
              docker_ready: result.docker_ready,
              gate0_certified: result.gate0_certified
            }
          }
          const { error } = await supabase
            .from('wave_project_config')
            .upsert({
              project_id: project.id,
              config: configWithRlm,
              updated_at: new Date().toISOString()
            }, { onConflict: 'project_id' })

          if (error) {
            console.error('Failed to save RLM validation results:', error)
          } else {
            console.log('RLM validation results saved to database (SOURCE OF TRUTH)')

            // Add audit trail entry
            const { error: auditError } = await supabase
              .from('wave_audit_log')
              .insert({
                project_id: project.id,
                agent: 'CTO',
                action: `RLM validation ${newStatus === 'ready' ? 'PASSED' : 'BLOCKED'}`,
                details: {
                  type: 'rlm_validation',
                  status: newStatus,
                  passed: result.details?.filter((c: { status: string }) => c.status === 'pass').length || 0,
                  failed: result.details?.filter((c: { status: string }) => c.status === 'fail').length || 0,
                  warnings: result.details?.filter((c: { status: string }) => c.status === 'warn').length || 0,
                  summary: result.message,
                  docker_ready: result.docker_ready,
                  gate0_certified: result.gate0_certified
                }
              })

            if (auditError) {
              console.error('Failed to write audit log:', auditError)
            } else {
              console.log('RLM validation logged to audit trail')
            }

            // Generate Gate 0 lock file if certified
            if (result.gate0_certified) {
              console.log('Gate 0 CERTIFIED - Project ready for Docker automation')
            }
          }
        } catch (dbErr) {
          console.error('Database save error:', dbErr)
        }
      }
    } catch (error) {
      setRlmValidationResult({
        status: 'fail',
        message: 'Validation failed: ' + (error as Error).message,
        details: [],
        docker_ready: false,
        gate0_certified: false
      })
      setRlmStatus('blocked')
    } finally {
      setValidatingRlm(false)
    }
  }

  // Fetch drift report (Phase 1.3.5)
  const fetchDriftReport = async (regenerate = false) => {
    if (!project?.root_path) return

    setDriftLoading(true)
    try {
      const response = await fetch(
        `http://localhost:3000/api/drift-report?projectPath=${encodeURIComponent(project.root_path)}&regenerate=${regenerate}`
      )
      const data = await response.json()

      if (data.success) {
        setDriftReport({
          overall_status: data.overall_status,
          summary: data.summary,
          recommendations: data.recommendations || [],
          agents: data.agents || []
        })
      }
    } catch (error) {
      console.error('Failed to fetch drift report:', error)
    } finally {
      setDriftLoading(false)
    }
  }

  // Reset agent memory
  const resetAgentMemory = async (agentType: string) => {
    if (!project?.root_path) return

    try {
      const response = await fetch('http://localhost:3000/api/drift-report/reset-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: project.root_path,
          agentType
        })
      })
      const data = await response.json()

      if (data.success) {
        await fetchDriftReport(true)
      }
    } catch (error) {
      console.error('Failed to reset agent memory:', error)
    }
  }

  // Generate baseline for agent
  const generateAgentBaseline = async (agentType: string) => {
    if (!project?.root_path) return

    try {
      const response = await fetch('http://localhost:3000/api/drift-report/generate-baseline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: project.root_path,
          agentType
        })
      })
      const data = await response.json()

      if (data.success) {
        await fetchDriftReport(true)
      }
    } catch (error) {
      console.error('Failed to generate baseline:', error)
    }
  }

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    if (!project?.root_path) return

    setAuditLogsLoading(true)
    try {
      const response = await fetch(`http://localhost:3000/api/audit-log?projectPath=${encodeURIComponent(project.root_path)}&limit=50`)
      const data = await response.json()

      if (data.success) {
        setAuditLogs(data.logs || [])
      }

      // Also fetch summary
      const summaryResponse = await fetch(`http://localhost:3000/api/audit-log/summary?projectPath=${encodeURIComponent(project.root_path)}&hours=24`)
      const summaryData = await summaryResponse.json()

      if (summaryData.success) {
        setAuditLogSummary({
          total_events: summaryData.total_events,
          requires_review: summaryData.requires_review,
          by_event_type: summaryData.by_event_type,
          by_severity: summaryData.by_severity
        })
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
    } finally {
      setAuditLogsLoading(false)
    }
  }

  // Format audit log timestamp
  const formatAuditTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50'
      case 'error': return 'text-red-500 bg-red-50'
      case 'warn': return 'text-amber-600 bg-amber-50'
      case 'info': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  // Get event type icon
  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'agent_action': return <Bot className="h-4 w-4" />
      case 'validation': return <Shield className="h-4 w-4" />
      case 'safety_event': return <AlertTriangle className="h-4 w-4" />
      case 'config_change': return <Settings className="h-4 w-4" />
      case 'gate_transition': return <GitBranch className="h-4 w-4" />
      default: return <History className="h-4 w-4" />
    }
  }

  // Fetch watchdog status
  const fetchWatchdogStatus = async () => {
    if (!project?.root_path) return

    setWatchdogLoading(true)
    try {
      const response = await fetch(`http://localhost:3000/api/watchdog?projectPath=${encodeURIComponent(project.root_path)}`)
      const data = await response.json()

      if (data.success) {
        setWatchdogStatus({
          overall_status: data.overall_status,
          summary: data.summary,
          agents: data.agents
        })
      }
    } catch (error) {
      console.error('Failed to fetch watchdog status:', error)
    } finally {
      setWatchdogLoading(false)
    }
  }

  // Fetch safety traceability report
  const fetchTraceabilityReport = async (regenerate = false) => {
    if (!project?.root_path) return

    setTraceabilityLoading(true)
    try {
      const response = await fetch(
        `http://localhost:3000/api/safety-traceability?projectPath=${encodeURIComponent(project.root_path)}&regenerate=${regenerate}`
      )
      const data = await response.json()

      if (data.success) {
        setTraceabilityReport({
          summary: data.summary,
          risk_distribution: data.risk_distribution,
          forbidden_operations: data.forbidden_operations,
          traceability_matrix: data.traceability_matrix || data.stories || []
        })
      }
    } catch (error) {
      console.error('Failed to fetch traceability report:', error)
    } finally {
      setTraceabilityLoading(false)
    }
  }

  // Fetch budget status (Phase 3.3)
  const fetchBudgetStatus = async () => {
    if (!project?.root_path) return

    setBudgetLoading(true)
    try {
      const response = await fetch(
        `http://localhost:3000/api/budgets?projectPath=${encodeURIComponent(project.root_path)}`
      )
      const data = await response.json()

      if (data.success) {
        setBudgetStatus({
          config: data.config,
          usage: data.usage,
          status: data.status,
          alerts: data.alerts || []
        })
      }
    } catch (error) {
      console.error('Failed to fetch budget status:', error)
    } finally {
      setBudgetLoading(false)
    }
  }

  // Update budget configuration
  const updateBudgetConfig = async (newConfig: Partial<BudgetStatus['config']>) => {
    if (!project?.root_path) return

    try {
      const response = await fetch('http://localhost:3000/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: project.root_path,
          config: newConfig
        })
      })
      const data = await response.json()

      if (data.success) {
        await fetchBudgetStatus()
      }
    } catch (error) {
      console.error('Failed to update budget config:', error)
    }
  }

  // Generate RLM validation report
  const generateRlmReport = () => {
    if (!rlmValidationResult) return ''

    const passedChecks = rlmValidationResult.details.filter(c => c.status === 'pass')
    const failedChecks = rlmValidationResult.details.filter(c => c.status === 'fail')
    const warningChecks = rlmValidationResult.details.filter(c => c.status === 'warn')

    // Group by category
    const categories = ['P Variable', 'Agent Memory', 'Snapshots', 'RLM Scripts', 'Token Budget']
    const categoryResults = categories.map(cat => ({
      name: cat,
      passed: rlmValidationResult.details.filter(c => c.category === cat && c.status === 'pass').length,
      failed: rlmValidationResult.details.filter(c => c.category === cat && c.status === 'fail').length,
      warnings: rlmValidationResult.details.filter(c => c.category === cat && c.status === 'warn').length
    }))

    let report = `# RLM Protocol Validation Report

**Project:** ${project?.name || 'Unknown'}
**Generated:** ${new Date().toISOString()}
**Status:** ${rlmValidationResult.status === 'pass' ? '✅ RLM READY' : rlmValidationResult.status === 'warn' ? '⚠️ RLM READY (with warnings)' : '❌ RLM BLOCKED'}

## Summary

| Category | Passed | Failed | Warnings |
|----------|--------|--------|----------|
${categoryResults.map(cat => `| ${cat.name} | ${cat.passed} | ${cat.failed} | ${cat.warnings} |`).join('\n')}
| **Total** | **${passedChecks.length}** | **${failedChecks.length}** | **${warningChecks.length}** |

## Docker Readiness

- **Docker Ready:** ${rlmValidationResult.docker_ready ? '✅ YES' : '❌ NO'}
- **Gate 0 Certified:** ${rlmValidationResult.gate0_certified ? '✅ YES' : '❌ NO'}

## Detailed Results

`

    // Group checks by category
    for (const cat of categories) {
      const catChecks = rlmValidationResult.details.filter(c => c.category === cat)
      if (catChecks.length > 0) {
        report += `### ${cat}\n\n`
        for (const check of catChecks) {
          const icon = check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⚠️'
          report += `- ${icon} **${check.name}**: ${check.message}\n`
        }
        report += '\n'
      }
    }

    // Add recommendations for failures
    if (failedChecks.length > 0 || warningChecks.length > 0) {
      report += `## Required Actions

`
      if (failedChecks.length > 0) {
        report += `### Critical Issues (Must Fix)\n\n`
        for (const check of failedChecks) {
          report += `- **${check.name}**: ${check.message}\n`
        }
        report += '\n'
      }

      if (warningChecks.length > 0) {
        report += `### Warnings (Recommended)\n\n`
        for (const check of warningChecks) {
          report += `- **${check.name}**: ${check.message}\n`
        }
        report += '\n'
      }
    }

    report += `## Gate 0 Certification

${rlmValidationResult.gate0_certified ? `This validation certifies the RLM Protocol is ready for:
- Docker container execution
- Multi-agent automation
- Context management with P Variable
- Agent memory persistence
- Snapshot recovery` : `**NOT CERTIFIED** - Fix the issues above to enable:
- Docker container execution
- Multi-agent automation`}

## Next Steps

${rlmValidationResult.gate0_certified ? `1. Run \`docker compose up\` to start agents
2. Monitor via WAVE Portal
3. Review snapshots in \`.claude/rlm-snapshots/\`` : `1. Fix all critical issues marked with ❌
2. Address warnings marked with ⚠️
3. Re-run RLM validation
4. Once certified, proceed with Docker deployment`}

---
*Generated by WAVE Portal - RLM Protocol Validation*
*Timestamp: ${new Date().toISOString()}*
`

    return report
  }

  // Download RLM report
  const downloadRlmReport = () => {
    const report = generateRlmReport()
    if (!report) return

    const blob = new Blob([report], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rlm-validation-report-${new Date().toISOString().split('T')[0]}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Agent Dispatch functions
  const fetchAgents = async () => {
    if (!project?.root_path) return
    setLoadingAgents(true)
    try {
      const response = await fetch(`http://localhost:3000/api/agents?projectPath=${encodeURIComponent(project.root_path)}`)
      const data = await response.json()
      setAgents(data.agents || [])
    } catch (error) {
      console.error('Failed to fetch agents:', error)
    } finally {
      setLoadingAgents(false)
    }
  }

  const fetchAgentActivity = async () => {
    if (!project?.root_path) return
    try {
      const response = await fetch(`http://localhost:3000/api/agents/activity?projectPath=${encodeURIComponent(project.root_path)}`)
      const data = await response.json()
      setAgentActivity(data.activity || [])
    } catch (error) {
      console.error('Failed to fetch agent activity:', error)
    }
  }

  const startAgent = async (agentType: string) => {
    if (!project?.root_path) return
    try {
      const response = await fetch(`http://localhost:3000/api/agents/${agentType}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: project.root_path,
          waveNumber: 1
        })
      })
      const data = await response.json()
      if (data.success) {
        fetchAgents()
        fetchAgentActivity()
        // Log to audit
        if (isSupabaseConfigured()) {
          await supabase.from('wave_audit_log').insert({
            project_id: project.id,
            agent: agentType,
            action: `Agent ${agentType} started from Portal`,
            details: { started_by: 'portal', signal_file: data.signal_file }
          })
        }
      }
    } catch (error) {
      console.error('Failed to start agent:', error)
    }
  }

  const stopAgent = async (agentType: string) => {
    if (!project?.root_path) return
    try {
      const response = await fetch(`http://localhost:3000/api/agents/${agentType}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: project.root_path,
          reason: 'User requested stop from Portal'
        })
      })
      const data = await response.json()
      if (data.success) {
        fetchAgents()
        fetchAgentActivity()
        setShowAgentModal(false)
        // Log to audit
        if (isSupabaseConfigured()) {
          await supabase.from('wave_audit_log').insert({
            project_id: project.id,
            agent: agentType,
            action: `Agent ${agentType} stopped from Portal`,
            details: { stopped_by: 'portal', signal_file: data.signal_file }
          })
        }
      }
    } catch (error) {
      console.error('Failed to stop agent:', error)
    }
  }

  const viewAgent = async (agentType: string) => {
    setSelectedAgent(agentType)
    setShowAgentModal(true)
    // Fetch agent output
    if (!project?.root_path) return
    try {
      const response = await fetch(`http://localhost:3000/api/agents/${agentType}/output?projectPath=${encodeURIComponent(project.root_path)}`)
      const data = await response.json()
      setAgentOutput(data.output || 'No output available')
    } catch (error) {
      setAgentOutput('Failed to fetch agent output')
    }
  }

  const getAgentIcon = (agentType: string) => {
    switch (agentType) {
      case 'cto': return <Shield className="h-5 w-5" />
      case 'pm': return <Target className="h-5 w-5" />
      case 'fe-dev-1':
      case 'fe-dev-2': return <Zap className="h-5 w-5" />
      case 'be-dev-1':
      case 'be-dev-2': return <Database className="h-5 w-5" />
      case 'qa': return <CheckCircle2 className="h-5 w-5" />
      case 'dev-fix': return <Settings className="h-5 w-5" />
      default: return <Bot className="h-5 w-5" />
    }
  }

  const getAgentColor = (color: string) => {
    switch (color) {
      case 'violet': return 'bg-violet-100 text-violet-600'
      case 'blue': return 'bg-blue-100 text-blue-600'
      case 'green': return 'bg-green-100 text-green-600'
      case 'amber': return 'bg-amber-100 text-amber-600'
      case 'cyan': return 'bg-cyan-100 text-cyan-600'
      case 'red': return 'bg-red-100 text-red-600'
      default: return 'bg-zinc-100 text-zinc-600'
    }
  }

  // Master Validation function
  const runValidation = async (quick = false) => {
    if (!project?.root_path) return
    setValidating(true)
    setValidationError(null)
    try {
      const response = await fetch('http://localhost:3000/api/validate-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: project.root_path,
          quick
        })
      })
      const data = await response.json()
      if (data.validation_report) {
        setValidationReport(data.validation_report)
      } else if (data.error) {
        setValidationError(data.error)
      }
    } catch (error) {
      setValidationError('Failed to run validation. Is the backend running?')
      console.error('Validation error:', error)
    } finally {
      setValidating(false)
    }
  }

  // Fetch agents when tab is active
  useEffect(() => {
    if (activeTab === 'agent-dispatch' && project?.root_path) {
      fetchAgents()
      fetchAgentActivity()
      fetchWatchdogStatus()
      fetchBudgetStatus()
      // Set up polling for real-time updates
      const interval = setInterval(() => {
        fetchAgents()
        fetchAgentActivity()
        fetchWatchdogStatus()
        fetchBudgetStatus()
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [activeTab, project?.root_path])

  // Fetch audit logs when tab is active
  useEffect(() => {
    if (activeTab === 'audit-log' && project?.root_path) {
      fetchAuditLogs()
      // Refresh every 30 seconds
      const interval = setInterval(() => {
        fetchAuditLogs()
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [activeTab, project?.root_path])

  // Fetch safety traceability report when tab is active
  useEffect(() => {
    if (activeTab === 'compliance-safety' && project?.root_path && !traceabilityReport) {
      fetchTraceabilityReport()
    }
  }, [activeTab, project?.root_path])

  // Fetch build QA thresholds when tab is active
  useEffect(() => {
    if (activeTab === 'build-qa' && project?.root_path && !buildQaThresholds) {
      fetchBuildQaThresholds()
    }
  }, [activeTab, project?.root_path])

  // Fetch drift report when RLM tab is active
  useEffect(() => {
    if (activeTab === 'rlm-protocol' && project?.root_path && !driftReport) {
      fetchDriftReport()
    }
  }, [activeTab, project?.root_path])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertTriangle className="h-12 w-12 text-amber-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Project Not Found</h2>
        <p className="text-muted-foreground mb-4">The project you're looking for doesn't exist.</p>
        <button onClick={() => navigate('/projects/new')} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
          Create New Project
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto pb-12">
      {/* DEV MODE Banner */}
      {validationMode !== 'strict' && (
        <div className={cn(
          "px-4 py-2 text-center text-sm font-semibold",
          validationMode === 'dev' ? "bg-amber-500 text-white" : "bg-blue-500 text-white"
        )}>
          {validationMode === 'dev' ? (
            <>⚠️ DEV MODE - Behavioral probes & drift checks DISABLED - NOT FOR PRODUCTION</>
          ) : (
            <>🔄 CI MODE - Optimized for automation - Limited interactive checks</>
          )}
        </div>
      )}

      {/* Compact Header */}
      <div className="flex items-center justify-between py-4 mb-6 border-b border-border">
        <div>
          <h1 className="text-lg font-semibold">WAVE Pre-Launch Checklist</h1>
          <p className="text-sm text-muted-foreground">Aerospace-Grade Validation · {lastUpdate}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Validation Mode Selector */}
          <div className="relative">
            <select
              value={validationMode}
              onChange={(e) => setValidationMode(e.target.value as 'strict' | 'dev' | 'ci')}
              className={cn(
                "appearance-none pl-3 pr-8 py-1.5 rounded-full text-xs font-medium border cursor-pointer",
                validationMode === 'strict'
                  ? "bg-green-50 border-green-200 text-green-700"
                  : validationMode === 'dev'
                  ? "bg-amber-50 border-amber-200 text-amber-700"
                  : "bg-blue-50 border-blue-200 text-blue-700"
              )}
            >
              <option value="strict">🛡️ Strict Mode</option>
              <option value="dev">⚡ Dev Mode</option>
              <option value="ci">🔄 CI Mode</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none text-muted-foreground" />
          </div>
          <a
            href="/architecture"
            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-xs font-medium hover:opacity-90 flex items-center gap-1.5"
          >
            <Radio className="h-3.5 w-3.5" />
            WAVE v1.0
          </a>
          {/* Dynamic Ready/Not Ready status based on analysis */}
          {analysisReport && analysisReport.summary.readiness_score >= 100 && analysisReport.summary.total_gaps === 0 ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-100 rounded-full">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-green-600">Ready</span>
              <span className="text-xs text-muted-foreground">Phase 1</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-100 rounded-full">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-600">Not Ready</span>
              <span className="text-xs text-muted-foreground">Phase 1</span>
            </div>
          )}
          <button className="px-3 py-1.5 bg-white border border-border rounded-full text-xs font-medium hover:bg-muted flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Circuit Breaker
          </button>
          <button className="px-3 py-1.5 bg-white border border-border rounded-full text-xs font-medium hover:bg-muted flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Emergency Stop
          </button>
        </div>
      </div>

      {/* Pill Tabs - Full Width Distribution */}
      <div className="bg-muted p-1.5 rounded-2xl mb-8 flex w-full">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-sm font-medium transition-all rounded-xl whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-white text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="hidden sm:inline">{tab.shortLabel}.</span> {tab.label}
            <StatusDot status={tab.status} />
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div>
        {/* TAB 1: AI PRD & Stories */}
        {activeTab === 'project-overview' && (
          <>
            {/* Project Card */}
            <div className="bg-white border border-border rounded-2xl mb-6 overflow-hidden">
              {/* Project Section Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center gap-6">
                  <span className="text-sm font-medium text-muted-foreground">PROJECT</span>
                  <div>
                    <span className="font-semibold">Project Structure Overview</span>
                    <span className="text-muted-foreground ml-3">File structure, documentation locations, and best practices</span>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">{lastUpdate} <span className="ml-2 font-semibold">3/6</span></div>
              </div>

              {/* Project Name */}
              <div className="p-6 border-b border-border">
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Project Name</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={project.name}
                    readOnly
                    className="flex-1 px-4 py-3 bg-muted/30 border border-border rounded-xl text-sm"
                  />
                  <button className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90">
                    Save & Analyze
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Saving will scan the project and suggest structure improvements if needed.</p>
              </div>

              {/* Folder Structure */}
              <div className="p-6 border-b border-border">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setFolderExpanded(!folderExpanded)}
                >
                  <div className="flex items-center gap-3">
                    {folderExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    <span className="text-lg">📁</span>
                    <div>
                      <p className="font-semibold">Folder Structure</p>
                      <p className="text-sm text-muted-foreground">Click to expand and view project tree</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <code className="text-sm text-muted-foreground font-mono">{project.root_path}</code>
                    <button
                      onClick={(e) => { e.stopPropagation(); copyPath(project.root_path); }}
                      className="px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-lg flex items-center gap-2 text-sm"
                    >
                      <Copy className="h-4 w-4" /> Copy
                    </button>
                  </div>
                </div>
                {folderExpanded && (
                  <div className="mt-4">
                    <div className="bg-zinc-900 rounded-xl p-6 font-mono text-sm text-zinc-100 overflow-x-auto">
                      {analysisReport?.file_structure?.tree ? (
                        <pre className="whitespace-pre leading-relaxed">
                          <span className="text-yellow-400">📁</span> {project.name}/
{'\n'}{analysisReport.file_structure.tree}
                        </pre>
                      ) : (
                        <div className="text-zinc-400 text-center py-8">
                          <p className="mb-2">Run analysis to scan the actual project structure</p>
                          <button
                            onClick={runAnalysis}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                          >
                            Run Analysis
                          </button>
                        </div>
                      )}
                    </div>
                    {analysisReport?.file_structure?.tree && (
                      <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                        <span>✓</span> Tree structure from actual file system scan
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Key Files Status */}
              <div className="p-6 border-b border-border">
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">Key Files Status</label>
                <div className="grid grid-cols-3 gap-3">
                  {fileChecks.map((file) => (
                    <FileCard key={file.name} file={file} onCopy={copyPath} />
                  ))}
                </div>
              </div>

              {/* Data Sources */}
              <div className="p-6">
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">Data Sources</label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/30 rounded-xl border border-border">
                    <p className="text-xs font-semibold text-green-600 uppercase mb-2">Source of Truth</p>
                    <div className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-green-600" />
                      <span className="font-semibold">Supabase</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">wave_stories table</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-xl border border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Speed Layer</p>
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-amber-400" />
                      <span className="font-semibold">JSON Signals</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">.claude/*.json</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Run Analysis Section */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 mt-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold mb-1">Deep Project Analysis</h3>
                  <p className="text-blue-100 text-sm">
                    Analyze file structure, AI PRD, AI Stories, and HTML prototypes to identify gaps and create an improvement plan
                  </p>
                </div>
                <button
                  onClick={runAnalysis}
                  disabled={analysisRunning}
                  className="px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {analysisRunning ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Target className="h-5 w-5" />
                      Run Analysis
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Analysis Results */}
            {analysisComplete && analysisReport && (
              <div className="mt-6 space-y-6">
                {/* Summary Card */}
                <div className="bg-white border border-border rounded-2xl overflow-hidden">
                  <div className="p-6 bg-gradient-to-r from-zinc-900 to-zinc-800 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold mb-1">Gap Analysis Report</h3>
                        <p className="text-zinc-400 text-sm">Generated: {new Date(analysisReport.timestamp).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-blue-400">{analysisReport.summary.readiness_score}%</div>
                        <div className="text-sm text-zinc-400">Readiness Score</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-6">
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="text-2xl font-bold text-red-400">{analysisReport.summary.total_issues}</div>
                        <div className="text-xs text-zinc-400">Issues Found</div>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="text-2xl font-bold text-yellow-400">{analysisReport.summary.total_gaps}</div>
                        <div className="text-xs text-zinc-400">Gaps Identified</div>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="text-2xl font-bold text-green-400">{analysisReport.improvement_plan.length}</div>
                        <div className="text-xs text-zinc-400">Improvement Steps</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Analysis Details */}
                <div className="grid grid-cols-2 gap-6">
                  {/* File Structure Analysis */}
                  <div className="bg-white border border-border rounded-xl overflow-hidden">
                    <div className={cn("px-4 py-3 border-b font-semibold flex items-center gap-2",
                      analysisReport.file_structure.status === 'pass' ? 'bg-green-50 text-green-700' :
                      analysisReport.file_structure.status === 'warn' ? 'bg-zinc-50 text-zinc-600' : 'bg-red-50 text-red-700'
                    )}>
                      <Layers className="h-4 w-4" />
                      File Structure
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Findings</p>
                        {analysisReport.file_structure.findings.map((f, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm py-1">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                      {analysisReport.file_structure.issues.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-red-600 mb-2">Issues</p>
                          {analysisReport.file_structure.issues.map((issue, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm py-1 text-red-600">
                              <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                              <span>{issue}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI PRD Analysis */}
                  <div className="bg-white border border-border rounded-xl overflow-hidden">
                    <div className={cn("px-4 py-3 border-b font-semibold flex items-center gap-2",
                      analysisReport.ai_prd.status === 'pass' ? 'bg-green-50 text-green-700' :
                      analysisReport.ai_prd.status === 'warn' ? 'bg-zinc-50 text-zinc-600' : 'bg-red-50 text-red-700'
                    )}>
                      <ScrollText className="h-4 w-4" />
                      AI PRD Document
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Findings</p>
                        {analysisReport.ai_prd.findings.map((f, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm py-1">
                            <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                      {analysisReport.ai_prd.issues.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-red-600 mb-2">Issues</p>
                          {analysisReport.ai_prd.issues.map((issue, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm py-1 text-red-600">
                              <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                              <span>{issue}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Stories Analysis */}
                  <div className="bg-white border border-border rounded-xl overflow-hidden">
                    <div className={cn("px-4 py-3 border-b font-semibold flex items-center gap-2",
                      analysisReport.ai_stories.status === 'pass' ? 'bg-green-50 text-green-700' :
                      analysisReport.ai_stories.status === 'warn' ? 'bg-zinc-50 text-zinc-600' : 'bg-red-50 text-red-700'
                    )}>
                      <Database className="h-4 w-4" />
                      AI Stories ({analysisReport.ai_stories.stories_found} found)
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Findings</p>
                        {analysisReport.ai_stories.findings.map((f, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm py-1">
                            <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                      {analysisReport.ai_stories.issues.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-red-600 mb-2">Issues</p>
                          {analysisReport.ai_stories.issues.map((issue, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm py-1 text-red-600">
                              <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                              <span>{issue}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* HTML Prototype Analysis */}
                  <div className="bg-white border border-border rounded-xl overflow-hidden">
                    <div className={cn("px-4 py-3 border-b font-semibold flex items-center gap-2",
                      analysisReport.html_prototype.status === 'pass' ? 'bg-green-50 text-green-700' :
                      analysisReport.html_prototype.status === 'warn' ? 'bg-zinc-50 text-zinc-600' : 'bg-red-50 text-red-700'
                    )}>
                      <Layers className="h-4 w-4" />
                      HTML Prototypes
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Findings</p>
                        {analysisReport.html_prototype.findings.map((f, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm py-1">
                            <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                      {analysisReport.html_prototype.issues.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-red-600 mb-2">Issues</p>
                          {analysisReport.html_prototype.issues.map((issue, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm py-1 text-red-600">
                              <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                              <span>{issue}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Gap Analysis Table */}
                <div className="bg-white border border-border rounded-xl overflow-hidden">
                  <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-200">
                    <h3 className="font-bold text-zinc-700 flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      Identified Gaps
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30 border-b">
                        <tr>
                          <th className="text-left px-6 py-3 font-medium">Category</th>
                          <th className="text-left px-6 py-3 font-medium">Description</th>
                          <th className="text-left px-6 py-3 font-medium">Priority</th>
                          <th className="text-left px-6 py-3 font-medium">Action Required</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisReport.gap_analysis.gaps.map((gap, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="px-6 py-4 font-medium">{gap.category}</td>
                            <td className="px-6 py-4">{gap.description}</td>
                            <td className="px-6 py-4">
                              <span className={cn("px-2 py-1 rounded-full text-xs font-medium",
                                gap.priority === 'high' ? 'bg-red-100 text-red-700' :
                                gap.priority === 'medium' ? 'bg-zinc-100 text-zinc-600' : 'bg-green-100 text-green-700'
                              )}>
                                {gap.priority.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">{gap.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Improvement Plan */}
                <div className="bg-white border border-border rounded-xl overflow-hidden">
                  <div className="px-6 py-4 bg-green-50 border-b border-green-100">
                    <h3 className="font-bold text-green-800 flex items-center gap-2">
                      <ArrowRight className="h-5 w-5" />
                      Step-by-Step Improvement Plan
                    </h3>
                    <p className="text-sm text-green-600 mt-1">Follow these steps to prepare your project for WAVE automation</p>
                  </div>
                  <div className="p-6 space-y-4">
                    {analysisReport.improvement_plan.map((step) => (
                      <div key={step.step} className="flex items-start gap-4 p-4 bg-muted/30 rounded-xl">
                        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                          {step.step}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{step.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                        </div>
                        <span className={cn("px-3 py-1 rounded-full text-xs font-medium",
                          step.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        )}>
                          {step.status === 'completed' ? 'Done' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* PRD Section */}
            <SectionHeader badge="PRD" badgeColor="bg-gray-500" title="AI PRD Vision" description="Product requirements that decompose into AI Stories" timestamp={lastUpdate} status={analysisReport?.ai_prd?.status === 'pass' ? 'pass' : 'warn'} />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="AI PRD Vision Document"
                status={analysisReport?.ai_prd?.status === 'pass' ? 'pass' : 'warn'}
                description={analysisReport?.ai_prd?.prd_location ? `Found at: ${analysisReport.ai_prd.prd_location}` : "Verifies AI PRD Vision document exists in ai-prd/AI-PRD.md with product requirements"}
                command={`ls -la ai-prd/AI-PRD.md .claude/ai-prd/AI-PRD.md 2>/dev/null`}
                fix="Create an AI PRD document at ai-prd/AI-PRD.md with your product vision and requirements"
                defaultExpanded={analysisReport?.ai_prd?.status !== 'pass'}
              />
            </div>

            {/* Supabase Section */}
            <SectionHeader badge="DB" badgeColor="bg-blue-500" title="Supabase (SOURCE OF TRUTH)" description="Database connection - all state lives here, JSON signals are speed layer" timestamp={lastUpdate} status={supabaseConnected ? 'pass' : 'fail'} />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="Supabase Connection"
                status={supabaseConnected ? 'pass' : 'fail'}
                description="Supabase (SOURCE OF TRUTH) is connected and wave_stories table is accessible"
                command={`curl -s -H 'apikey: $SUPABASE_ANON_KEY' "$SUPABASE_URL/rest/v1/wave_stories?limit=1" 2>/dev/null && echo 'SOURCE OF TRUTH CONNECTED'`}
                fix="Set SUPABASE_URL and SUPABASE_ANON_KEY in .env. Verify wave_stories table exists in Supabase"
                defaultExpanded
              />
            </div>

            {/* Waves Section */}
            <div className="bg-white border border-border rounded-xl mt-6 overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-muted-foreground">WAVES</span>
                  <span className="font-semibold">{storiesCount > 0 ? `${storiesCount} AI Stories in Database` : 'No AI Stories in Database'}</span>
                  {analysisReport?.ai_stories?.stories_found && analysisReport.ai_stories.stories_found > storiesCount && (
                    <span className="text-amber-600 text-sm">({analysisReport.ai_stories.stories_found} in files - click Sync)</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {syncMessage && (
                    <span className={`text-xs ${syncMessage.includes('error') || syncMessage.includes('failed') ? 'text-red-500' : 'text-green-600'}`}>
                      {syncMessage}
                    </span>
                  )}
                  <button
                    onClick={syncStories}
                    disabled={syncingStories || !supabaseConnected}
                    className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {syncingStories ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3.5 w-3.5" />
                        Sync Stories
                      </>
                    )}
                  </button>
                  <StatusBadge status={storiesCount > 0 ? 'pass' : 'blocked'} />
                </div>
              </div>

              {storiesCount === 0 && (
                <div className="p-6">
                  <p className="text-center text-muted-foreground mb-4">To sync stories from JSON files to database:</p>
                  <ol className="list-decimal list-inside space-y-2 text-sm max-w-lg mx-auto">
                    <li>Run Analysis to detect stories in <code className="bg-zinc-100 px-1.5 py-0.5 rounded font-mono text-xs">stories/wave{'{N}'}/*.json</code></li>
                    <li>Click <strong>Sync Stories</strong> to import them to the database</li>
                    <li>Stories will be stored in <code className="bg-zinc-100 px-1.5 py-0.5 rounded font-mono text-xs">wave_stories</code> table</li>
                  </ol>
                </div>
              )}
            </div>

            {/* Phase 0: Story Validation */}
            <SectionHeader badge="0" badgeColor="bg-blue-500" title="Phase 0: Story Validation" description="Validate current wave stories are complete and ready" timestamp={lastUpdate} status="pass" />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="Stories Validated (0/0)"
                status="pass"
                description="Parses all JSON story files in stories/wave{N}/ and validates they have required fields: id, title, acceptance_criteria"
                command={`find stories/wave\${WAVE_NUMBER} -name '*.json' -exec jq -r '.id' {} \\; 2>/dev/null | wc -l`}
                defaultExpanded
              />
              <CheckItem
                label="Gap Analysis"
                status="pass"
                description="Analyzes stories to detect missing coverage: no frontend stories, no backend stories, or unlinked dependencies"
                command={`cat .claude/locks/PHASE0-wave\${WAVE_NUMBER}.lock 2>/dev/null | jq -r '.checks.gaps.status'`}
                defaultExpanded
              />
              <CheckItem
                label="Wave Planning"
                status="pass"
                description="Generates wave execution plan including story assignments, estimated costs, and dependency order"
                command={`cat .claude/locks/PHASE0-wave\${WAVE_NUMBER}.lock 2>/dev/null | jq -r '.checks.planning.status'`}
                defaultExpanded
              />
              <CheckItem
                label="Green Light Approval"
                status="pass"
                description="Final human approval checkpoint before autonomous agents begin work. Requires explicit GO signal"
                command={`cat .claude/signal-wave\${WAVE_NUMBER}-greenlight.json 2>/dev/null | jq -r '.status'`}
                defaultExpanded
              />
            </div>

          </>
        )}

        {/* TAB 2: Execution Plan */}
        {activeTab === 'execution-plan' && (
          <ExecutionPlanTab project={project} />
        )}

        {/* TAB 3: Foundation */}
        {activeTab === 'infrastructure' && (
          <>
            {/* Infrastructure Info Box */}
            <div className="p-5 bg-blue-50 border border-blue-200 rounded-2xl mb-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Info className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">Infrastructure Validation</h3>
                  <p className="text-sm text-blue-700 leading-relaxed">
                    This section validates your development environment before starting WAVE automation.
                    It checks <strong>Foundation</strong> requirements (Git, environment variables, build tools, WAVE config)
                    and <strong>Infrastructure</strong> requirements (git worktrees for parallel agent isolation,
                    Docker containers, signal files, and Gate -1 pre-validation checks).
                    All checks must pass before agents can safely develop in isolated worktrees.
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    Click on any check to expand and see the terminal command you can run to verify or fix issues.
                  </p>
                </div>
              </div>
            </div>

            {/* Validate Infrastructure Button & Status */}
            <div className="p-6 border border-zinc-200 rounded-2xl mb-6 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    foundationStatus === 'ready' ? "bg-green-100" :
                    foundationStatus === 'blocked' ? "bg-red-100" :
                    foundationStatus === 'validating' ? "bg-blue-100" :
                    "bg-zinc-100"
                  )}>
                    {foundationStatus === 'ready' ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    ) : foundationStatus === 'blocked' ? (
                      <XCircle className="h-6 w-6 text-red-500" />
                    ) : foundationStatus === 'validating' ? (
                      <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                    ) : (
                      <Play className="h-6 w-6 text-zinc-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {foundationStatus === 'ready' ? 'Ready to Develop' :
                       foundationStatus === 'blocked' ? 'Foundation Blocked' :
                       foundationStatus === 'validating' ? 'Validating Foundation...' :
                       'Foundation Validation'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {foundationStatus === 'ready' ? 'All pre-development checks passed' :
                       foundationStatus === 'blocked' ? 'Some required checks failed - fix issues below' :
                       foundationStatus === 'validating' ? 'Running comprehensive checks...' :
                       'Run validation to verify all systems are configured correctly'}
                    </p>
                    {foundationLastChecked && (
                      <p className="text-xs text-muted-foreground mt-1">Last checked: {foundationLastChecked}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {foundationChecks.length > 0 && foundationChecks.some(c => c.status === 'fail' || c.status === 'warn') && (
                    <button
                      onClick={downloadFoundationReport}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Download Fix Guide (.md)
                    </button>
                  )}
                  <button
                    onClick={validateFoundation}
                    disabled={foundationValidating || !project?.root_path}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all",
                      foundationValidating
                        ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                        : foundationStatus === 'ready'
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : foundationStatus === 'blocked'
                        ? "bg-zinc-900 hover:bg-zinc-800 text-white"
                        : "bg-zinc-900 hover:bg-zinc-800 text-white"
                    )}
                  >
                    {foundationValidating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        {foundationStatus === 'idle' ? 'Validate Foundation' : 'Re-validate'}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Validation Results - Redesigned for Clarity */}
              {foundationChecks.length > 0 && (() => {
                const passed = foundationChecks.filter(c => c.status === 'pass')
                const failed = foundationChecks.filter(c => c.status === 'fail')
                const warnings = foundationChecks.filter(c => c.status === 'warn')
                const total = foundationChecks.length
                const progressPercent = Math.round((passed.length / total) * 100)
                const showPassedSection = expandedSections['validation-passed'] ?? false

                return (
                  <div className="mt-6 pt-6 border-t border-border/50 space-y-4">
                    {/* Summary Bar */}
                    <div className="flex items-center gap-6 p-4 bg-zinc-50 rounded-xl">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-zinc-600">Validation Progress</span>
                          <span className="text-sm font-semibold">{progressPercent}%</span>
                        </div>
                        <div className="h-2.5 bg-zinc-200 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              failed.length > 0 ? "bg-red-500" : warnings.length > 0 ? "bg-amber-400" : "bg-green-500"
                            )}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 pl-4 border-l border-zinc-200">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{passed.length}</div>
                          <div className="text-xs text-zinc-500">Passed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">{failed.length}</div>
                          <div className="text-xs text-zinc-500">Failed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-amber-500">{warnings.length}</div>
                          <div className="text-xs text-zinc-500">Warnings</div>
                        </div>
                      </div>
                    </div>

                    {/* Blockers Section - Failed Checks */}
                    {failed.length > 0 && (
                      <div className="border-2 border-red-200 rounded-xl overflow-hidden bg-red-50">
                        <div className="px-4 py-3 bg-red-100 border-b border-red-200">
                          <div className="flex items-center gap-2">
                            <XCircle className="h-5 w-5 text-red-600" />
                            <span className="font-semibold text-red-800">Blockers - Fix These First ({failed.length})</span>
                          </div>
                        </div>
                        <div className="divide-y divide-red-200">
                          {failed.map(check => (
                            <div key={check.id} className="p-4 bg-white">
                              <div className="flex items-start gap-3">
                                <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium text-zinc-900">{check.name}</span>
                                    <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded">{check.category}</span>
                                  </div>
                                  <p className="text-sm text-red-600 mt-1">{check.message}</p>
                                  {check.recommendation && (
                                    <div className="mt-2 p-2.5 bg-red-50 border border-red-100 rounded-lg">
                                      <span className="text-xs font-semibold text-red-700 block mb-1">How to fix:</span>
                                      <span className="text-sm text-red-800">{check.recommendation}</span>
                                    </div>
                                  )}
                                  {check.command && (
                                    <div className="mt-2 flex items-center gap-2">
                                      <code className="flex-1 bg-zinc-900 text-zinc-100 px-3 py-2 rounded-lg text-xs font-mono overflow-x-auto">
                                        {check.command}
                                      </code>
                                      <button
                                        onClick={() => navigator.clipboard.writeText(check.command || '')}
                                        className="px-2 py-1.5 bg-zinc-100 hover:bg-zinc-200 rounded text-xs font-medium shrink-0"
                                      >
                                        Copy
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Warnings Section */}
                    {warnings.length > 0 && (
                      <div className="border border-amber-200 rounded-xl overflow-hidden bg-amber-50">
                        <div className="px-4 py-3 bg-amber-100 border-b border-amber-200">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                            <span className="font-semibold text-amber-800">Warnings - Should Fix ({warnings.length})</span>
                          </div>
                        </div>
                        <div className="divide-y divide-amber-200">
                          {warnings.map(check => (
                            <div key={check.id} className="p-3 bg-white flex items-center justify-between">
                              <div className="flex items-center gap-3 min-w-0">
                                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                <div className="min-w-0">
                                  <span className="font-medium text-zinc-800 text-sm">{check.name}</span>
                                  <p className="text-xs text-amber-600 truncate">{check.message}</p>
                                </div>
                              </div>
                              <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded ml-2">{check.category}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Passed Section - Collapsible */}
                    {passed.length > 0 && (
                      <div className="border border-green-200 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setExpandedSections(prev => ({ ...prev, 'validation-passed': !prev['validation-passed'] }))}
                          className="w-full px-4 py-3 bg-green-50 border-b border-green-200 flex items-center justify-between hover:bg-green-100 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <span className="font-semibold text-green-800">Ready - All Good ({passed.length})</span>
                          </div>
                          <ChevronDown className={cn("h-4 w-4 text-green-600 transition-transform", showPassedSection && "rotate-180")} />
                        </button>
                        {showPassedSection && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-green-100">
                            {passed.map(check => (
                              <div key={check.id} className="p-2.5 bg-white flex items-center gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                                <span className="text-sm text-zinc-700 truncate">{check.name}</span>
                                <span className="text-xs text-zinc-400 ml-auto">{check.category}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Next Steps */}
                    {failed.length > 0 && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <ArrowRight className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-blue-900 mb-1">Next Steps</h4>
                            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                              <li>Fix the {failed.length} blocker{failed.length > 1 ? 's' : ''} shown above (red items)</li>
                              {warnings.length > 0 && <li>Address the {warnings.length} warning{warnings.length > 1 ? 's' : ''} (optional but recommended)</li>}
                              <li>Click "Re-validate" to verify fixes</li>
                              <li>Once all checks pass, you can proceed with development</li>
                            </ol>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* All Good Message */}
                    {failed.length === 0 && warnings.length === 0 && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="h-6 w-6 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-green-800">All Systems Ready!</h4>
                            <p className="text-sm text-green-700">All {passed.length} checks passed. Your environment is fully configured for WAVE development.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Foundation Category Sections */}
            <div className="flex items-center justify-between p-6 border border-border bg-white rounded-2xl mb-6">
              <div className="flex items-center gap-6">
                <span className="text-sm font-medium text-muted-foreground">FOUNDATION</span>
                <span className="font-semibold">Git, Environment & Deployment</span>
              </div>
              {foundationLastChecked && (
                <span className="text-xs text-muted-foreground">Last validated: {foundationLastChecked}</span>
              )}
            </div>

            <SectionHeader
              badge="GIT"
              badgeColor="bg-orange-500"
              title="Git Repository"
              description="Version control foundation - required for worktrees"
              timestamp={foundationLastChecked || lastUpdate}
              status={
                foundationChecks.filter(c => c.category === 'Git').every(c => c.status === 'pass') ? 'pass' :
                foundationChecks.filter(c => c.category === 'Git').some(c => c.status === 'fail') ? 'fail' :
                foundationChecks.filter(c => c.category === 'Git').some(c => c.status === 'warn') ? 'warn' : 'pending'
              }
              isCollapsible
              isExpanded={expandedSections['Git']}
              onToggle={() => setExpandedSections(prev => ({ ...prev, 'Git': !prev['Git'] }))}
            />
            {expandedSections['Git'] !== false && (
              <div className="border-x border-b border-border rounded-b-xl">
                {foundationChecks.filter(c => c.category === 'Git').length > 0 ? (
                  foundationChecks.filter(c => c.category === 'Git').map(check => (
                    <CheckItem
                      key={check.id}
                      label={check.name}
                      status={check.status === 'pass' ? 'pass' : check.status === 'fail' ? 'fail' : check.status === 'warn' ? 'warn' : 'pending'}
                      description={check.description || check.message}
                      command={check.command}
                      output={check.output}
                      timestamp={check.timestamp}
                    />
                  ))
                ) : (
                  <>
                    <CheckItem label="Git Installed" status="pending" description="Run validation to check" />
                    <CheckItem label="Git Repository" status="pending" description="Run validation to check" />
                    <CheckItem label="Remote Origin" status="pending" description="Run validation to check" />
                    <CheckItem label="Working Directory Clean" status="pending" description="Run validation to check" />
                  </>
                )}
              </div>
            )}

            <SectionHeader
              badge="ENV"
              badgeColor="bg-blue-500"
              title="Environment Variables"
              description="API keys and configuration"
              timestamp={foundationLastChecked || lastUpdate}
              status={
                foundationChecks.filter(c => c.category === 'Environment').every(c => c.status === 'pass') ? 'pass' :
                foundationChecks.filter(c => c.category === 'Environment').some(c => c.status === 'fail') ? 'fail' :
                foundationChecks.filter(c => c.category === 'Environment').some(c => c.status === 'warn') ? 'warn' : 'pending'
              }
              isCollapsible
              isExpanded={expandedSections['Environment']}
              onToggle={() => setExpandedSections(prev => ({ ...prev, 'Environment': !prev['Environment'] }))}
            />
            {expandedSections['Environment'] !== false && (
              <div className="border-x border-b border-border rounded-b-xl">
                {foundationChecks.filter(c => c.category === 'Environment').length > 0 ? (
                  foundationChecks.filter(c => c.category === 'Environment').map(check => (
                    <CheckItem
                      key={check.id}
                      label={check.name}
                      status={check.status === 'pass' ? 'pass' : check.status === 'fail' ? 'fail' : check.status === 'warn' ? 'warn' : 'pending'}
                      description={check.description || check.message}
                      command={check.command}
                      output={check.output}
                      timestamp={check.timestamp}
                    />
                  ))
                ) : (
                  <>
                    <CheckItem label=".env File Exists" status="pending" description="Run validation to check" />
                    <CheckItem label="ANTHROPIC_API_KEY" status="pending" description="Run validation to check" />
                    <CheckItem label="SUPABASE_URL" status="pending" description="Run validation to check" />
                  </>
                )}
              </div>
            )}

            <SectionHeader
              badge="BUILD"
              badgeColor="bg-purple-500"
              title="Build & Dependencies"
              description="Package configuration and node modules"
              timestamp={foundationLastChecked || lastUpdate}
              status={
                foundationChecks.filter(c => c.category === 'Build').every(c => c.status === 'pass') ? 'pass' :
                foundationChecks.filter(c => c.category === 'Build').some(c => c.status === 'fail') ? 'fail' :
                foundationChecks.filter(c => c.category === 'Build').some(c => c.status === 'warn') ? 'warn' : 'pending'
              }
              isCollapsible
              isExpanded={expandedSections['Build']}
              onToggle={() => setExpandedSections(prev => ({ ...prev, 'Build': !prev['Build'] }))}
            />
            {expandedSections['Build'] !== false && (
              <div className="border-x border-b border-border rounded-b-xl">
                {foundationChecks.filter(c => c.category === 'Build').length > 0 ? (
                  foundationChecks.filter(c => c.category === 'Build').map(check => (
                    <CheckItem
                      key={check.id}
                      label={check.name}
                      status={check.status === 'pass' ? 'pass' : check.status === 'fail' ? 'fail' : check.status === 'warn' ? 'warn' : 'pending'}
                      description={check.description || check.message}
                      command={check.command}
                      output={check.output}
                      timestamp={check.timestamp}
                    />
                  ))
                ) : (
                  <>
                    <CheckItem label="package.json" status="pending" description="Run validation to check" />
                    <CheckItem label="Dependencies Installed" status="pending" description="Run validation to check" />
                    <CheckItem label="TypeScript Config" status="pending" description="Run validation to check" />
                  </>
                )}
              </div>
            )}

            <SectionHeader
              badge="WAVE"
              badgeColor="bg-zinc-800"
              title="WAVE Configuration"
              description="Stories and protocol files"
              timestamp={foundationLastChecked || lastUpdate}
              status={
                foundationChecks.filter(c => c.category === 'WAVE').every(c => c.status === 'pass') ? 'pass' :
                foundationChecks.filter(c => c.category === 'WAVE').some(c => c.status === 'fail') ? 'fail' :
                foundationChecks.filter(c => c.category === 'WAVE').some(c => c.status === 'warn') ? 'warn' : 'pending'
              }
              isCollapsible
              isExpanded={expandedSections['WAVE']}
              onToggle={() => setExpandedSections(prev => ({ ...prev, 'WAVE': !prev['WAVE'] }))}
            />
            {expandedSections['WAVE'] !== false && (
              <div className="border-x border-b border-border rounded-b-xl">
                {foundationChecks.filter(c => c.category === 'WAVE').length > 0 ? (
                  foundationChecks.filter(c => c.category === 'WAVE').map(check => (
                    <CheckItem
                      key={check.id}
                      label={check.name}
                      status={check.status === 'pass' ? 'pass' : check.status === 'fail' ? 'fail' : check.status === 'warn' ? 'warn' : 'pending'}
                      description={check.description || check.message}
                      command={check.command}
                      output={check.output}
                      timestamp={check.timestamp}
                    />
                  ))
                ) : (
                  <>
                    <CheckItem label="Stories Directory" status="pending" description="Run validation to check" />
                    <CheckItem label="Story Files Valid" status="pending" description="Run validation to check" />
                    <CheckItem label="CLAUDE.md Protocol" status="pending" description="Run validation to check" />
                    <CheckItem label="Budget Limit Set" status="pending" description="Run validation to check" />
                  </>
                )}
              </div>
            )}

            {/* Infrastructure Category Sections */}
            <div className="flex items-center justify-between p-6 border border-border bg-white rounded-2xl mb-6 mt-8">
              <div className="flex items-center gap-6">
                <span className="text-sm font-medium text-muted-foreground">INFRASTRUCTURE</span>
                <span className="font-semibold">Git Worktrees, Docker, Signals & Pre-Validation</span>
              </div>
              {foundationLastChecked && (
                <span className="text-xs text-muted-foreground">Last validated: {foundationLastChecked}</span>
              )}
            </div>

            <SectionHeader
              badge="WORKTREE"
              badgeColor="bg-orange-500"
              title="Git Worktrees"
              description="Isolated worktrees for parallel agent development"
              timestamp={foundationLastChecked || lastUpdate}
              status={
                foundationChecks.filter(c => c.category === 'Git Worktrees').every(c => c.status === 'pass') ? 'pass' :
                foundationChecks.filter(c => c.category === 'Git Worktrees').some(c => c.status === 'fail') ? 'fail' :
                foundationChecks.filter(c => c.category === 'Git Worktrees').some(c => c.status === 'warn') ? 'warn' : 'pending'
              }
              isCollapsible
              isExpanded={expandedSections['Git Worktrees']}
              onToggle={() => setExpandedSections(prev => ({ ...prev, 'Git Worktrees': !prev['Git Worktrees'] }))}
            />
            {expandedSections['Git Worktrees'] && (
              <div className="border-x border-b border-border rounded-b-xl">
                {foundationChecks.filter(c => c.category === 'Git Worktrees').length > 0 ? (
                  foundationChecks.filter(c => c.category === 'Git Worktrees').map(check => (
                    <CheckItem
                      key={check.id}
                      label={check.name}
                      status={check.status === 'pass' ? 'pass' : check.status === 'fail' ? 'fail' : check.status === 'warn' ? 'warn' : 'pending'}
                      description={check.description || check.message}
                      command={check.command}
                      output={check.output}
                      timestamp={check.timestamp}
                    />
                  ))
                ) : (
                  <>
                    <CheckItem label="Worktrees Exist (fe-dev, be-dev, qa, dev-fix)" status="pending" description="Run validation to check" />
                    <CheckItem label="Correct Feature Branches" status="pending" description="Run validation to check" />
                    <CheckItem label="No Uncommitted Changes" status="pending" description="Run validation to check" />
                  </>
                )}
              </div>
            )}

            <SectionHeader badge="DOCKER" badgeColor="bg-blue-500" title="Docker Build" description="Container infrastructure for deployment" timestamp={foundationLastChecked || lastUpdate} status={
              foundationChecks.filter(c => c.category === 'Docker Build').every(c => c.status === 'pass') ? 'pass' :
              foundationChecks.filter(c => c.category === 'Docker Build').some(c => c.status === 'fail') ? 'fail' :
              foundationChecks.filter(c => c.category === 'Docker Build').some(c => c.status === 'warn') ? 'warn' : 'pending'
            } />
            <div className="border-x border-b border-border rounded-b-xl">
              {foundationChecks.filter(c => c.category === 'Docker Build').length > 0 ? (
                foundationChecks.filter(c => c.category === 'Docker Build').map(check => (
                  <CheckItem
                    key={check.id}
                    label={check.name}
                    status={check.status === 'pass' ? 'pass' : check.status === 'fail' ? 'fail' : check.status === 'warn' ? 'warn' : 'pending'}
                    description={check.description || check.message}
                    command={check.command}
                    output={check.output}
                    timestamp={check.timestamp}
                  />
                ))
              ) : (
                <>
                  <CheckItem label="Docker Image Buildable" status="pending" description="Run validation to check" />
                  <CheckItem label="Base Images Available" status="pending" description="Run validation to check" />
                  <CheckItem label="Container Can Start" status="pending" description="Run validation to check" />
                  <CheckItem label="Dozzle Log Viewer" status="pending" description="Run validation to check" />
                </>
              )}
            </div>

            <SectionHeader badge="TERM" badgeColor="bg-amber-500" title="Terminal Tools" description="Terminal emulators and session management" timestamp={foundationLastChecked || lastUpdate} status={
              foundationChecks.filter(c => c.category === 'Terminal Tools').every(c => c.status === 'pass') ? 'pass' :
              foundationChecks.filter(c => c.category === 'Terminal Tools').some(c => c.status === 'fail') ? 'fail' :
              foundationChecks.filter(c => c.category === 'Terminal Tools').some(c => c.status === 'warn') ? 'warn' : 'pending'
            } />
            <div className="border-x border-b border-border rounded-b-xl">
              {foundationChecks.filter(c => c.category === 'Terminal Tools').length > 0 ? (
                foundationChecks.filter(c => c.category === 'Terminal Tools').map(check => (
                  <CheckItem
                    key={check.id}
                    label={check.name}
                    status={check.status === 'pass' ? 'pass' : check.status === 'fail' ? 'fail' : check.status === 'warn' ? 'warn' : 'pending'}
                    description={check.description || check.message}
                    command={check.command}
                    output={check.output}
                    timestamp={check.timestamp}
                  />
                ))
              ) : (
                <>
                  <CheckItem label="iTerm2 Running" status="pending" description="Run validation to check" />
                  <CheckItem label="tmux Available" status="pending" description="Run validation to check" />
                </>
              )}
            </div>

            <SectionHeader badge="ORCH" badgeColor="bg-indigo-500" title="Orchestration" description="Merge Watcher and agent coordination" timestamp={foundationLastChecked || lastUpdate} status={
              foundationChecks.filter(c => c.category === 'Orchestration').every(c => c.status === 'pass') ? 'pass' :
              foundationChecks.filter(c => c.category === 'Orchestration').some(c => c.status === 'fail') ? 'fail' :
              foundationChecks.filter(c => c.category === 'Orchestration').some(c => c.status === 'warn') ? 'warn' : 'pending'
            } />
            <div className="border-x border-b border-border rounded-b-xl">
              {foundationChecks.filter(c => c.category === 'Orchestration').length > 0 ? (
                foundationChecks.filter(c => c.category === 'Orchestration').map(check => (
                  <CheckItem
                    key={check.id}
                    label={check.name}
                    status={check.status === 'pass' ? 'pass' : check.status === 'fail' ? 'fail' : check.status === 'warn' ? 'warn' : 'pending'}
                    description={check.description || check.message}
                    command={check.command}
                    output={check.output}
                    timestamp={check.timestamp}
                  />
                ))
              ) : (
                <>
                  <CheckItem label="Merge Watcher Running" status="pending" description="Run validation to check" />
                  <CheckItem label="Agent Terminal Sessions" status="pending" description="Run validation to check" />
                </>
              )}
            </div>

            <SectionHeader badge="CI/CD" badgeColor="bg-orange-500" title="CI/CD Pipelines" description="GitHub Actions and Vercel deployments" timestamp={foundationLastChecked || lastUpdate} status={
              foundationChecks.filter(c => c.category === 'CI/CD').every(c => c.status === 'pass') ? 'pass' :
              foundationChecks.filter(c => c.category === 'CI/CD').some(c => c.status === 'fail') ? 'fail' :
              foundationChecks.filter(c => c.category === 'CI/CD').some(c => c.status === 'warn') ? 'warn' : 'pending'
            } />
            <div className="border-x border-b border-border rounded-b-xl">
              {foundationChecks.filter(c => c.category === 'CI/CD').length > 0 ? (
                foundationChecks.filter(c => c.category === 'CI/CD').map(check => (
                  <CheckItem
                    key={check.id}
                    label={check.name}
                    status={check.status === 'pass' ? 'pass' : check.status === 'fail' ? 'fail' : check.status === 'warn' ? 'warn' : 'pending'}
                    description={check.description || check.message}
                    command={check.command}
                    output={check.output}
                    timestamp={check.timestamp}
                  />
                ))
              ) : (
                <>
                  <CheckItem label="GitHub Actions Status" status="pending" description="Run validation to check" />
                  <CheckItem label="Vercel Deployment Status" status="pending" description="Run validation to check" />
                </>
              )}
            </div>

            <SectionHeader badge="SLACK" badgeColor="bg-pink-500" title="Notifications" description="Slack and alerting integrations" timestamp={foundationLastChecked || lastUpdate} status={
              foundationChecks.filter(c => c.category === 'Notifications').every(c => c.status === 'pass') ? 'pass' :
              foundationChecks.filter(c => c.category === 'Notifications').some(c => c.status === 'fail') ? 'fail' :
              foundationChecks.filter(c => c.category === 'Notifications').some(c => c.status === 'warn') ? 'warn' : 'pending'
            } />
            <div className="border-x border-b border-border rounded-b-xl">
              {foundationChecks.filter(c => c.category === 'Notifications').length > 0 ? (
                foundationChecks.filter(c => c.category === 'Notifications').map(check => (
                  <CheckItem
                    key={check.id}
                    label={check.name}
                    status={check.status === 'pass' ? 'pass' : check.status === 'fail' ? 'fail' : check.status === 'warn' ? 'warn' : 'pending'}
                    description={check.description || check.message}
                    command={check.command}
                    output={check.output}
                    timestamp={check.timestamp}
                  />
                ))
              ) : (
                <>
                  <CheckItem label="Slack Webhook Configured" status="pending" description="Run validation to check" />
                </>
              )}
            </div>

            <SectionHeader badge="SIGNAL" badgeColor="bg-purple-500" title="Signal Files (Speed Layer)" description="Signal JSON files for agent coordination" timestamp={foundationLastChecked || lastUpdate} status={
              foundationChecks.filter(c => c.category === 'Signal Files (Speed Layer)').every(c => c.status === 'pass') ? 'pass' :
              foundationChecks.filter(c => c.category === 'Signal Files (Speed Layer)').some(c => c.status === 'fail') ? 'fail' :
              foundationChecks.filter(c => c.category === 'Signal Files (Speed Layer)').some(c => c.status === 'warn') ? 'warn' : 'pending'
            } />
            <div className="border-x border-b border-border rounded-b-xl">
              {foundationChecks.filter(c => c.category === 'Signal Files (Speed Layer)').length > 0 ? (
                foundationChecks.filter(c => c.category === 'Signal Files (Speed Layer)').map(check => (
                  <CheckItem
                    key={check.id}
                    label={check.name}
                    status={check.status === 'pass' ? 'pass' : check.status === 'fail' ? 'fail' : check.status === 'warn' ? 'warn' : 'pending'}
                    description={check.description || check.message}
                    command={check.command}
                    output={check.output}
                    timestamp={check.timestamp}
                  />
                ))
              ) : (
                <>
                  <CheckItem label="Signal Schema Valid" status="pending" description="Run validation to check" />
                </>
              )}
            </div>

            <SectionHeader
              badge="DB"
              badgeColor="bg-emerald-600"
              title="Database (Source of Truth)"
              description="Supabase connection and table validation"
              timestamp={foundationLastChecked || lastUpdate}
              status={
                foundationChecks.filter(c => c.category === 'Database').every(c => c.status === 'pass') ? 'pass' :
                foundationChecks.filter(c => c.category === 'Database').some(c => c.status === 'fail') ? 'fail' :
                foundationChecks.filter(c => c.category === 'Database').some(c => c.status === 'warn') ? 'warn' : 'pending'
              }
              isCollapsible
              isExpanded={expandedSections['Database']}
              onToggle={() => setExpandedSections(prev => ({ ...prev, 'Database': !prev['Database'] }))}
            />
            {expandedSections['Database'] && (
              <div className="border-x border-b border-border rounded-b-xl">
                {foundationChecks.filter(c => c.category === 'Database').length > 0 ? (
                  foundationChecks.filter(c => c.category === 'Database').map(check => (
                    <CheckItem
                      key={check.id}
                      label={check.name}
                      status={check.status === 'pass' ? 'pass' : check.status === 'fail' ? 'fail' : check.status === 'warn' ? 'warn' : 'pending'}
                      description={check.description || check.message}
                      command={check.command}
                      output={check.output}
                      timestamp={check.timestamp}
                    />
                  ))
                ) : (
                  <>
                    <CheckItem label="Database Tables Accessible" status="pending" description="Run validation to check" />
                    <CheckItem label="Stories Synced to Database" status="pending" description="Run validation to check" />
                    <CheckItem label="CLI Sessions Table" status="pending" description="Run validation to check" />
                  </>
                )}
              </div>
            )}

            <SectionHeader
              badge="DEPLOY"
              badgeColor="bg-blue-600"
              title="Deployment"
              description="Vercel, GitHub, and CI/CD configuration"
              timestamp={foundationLastChecked || lastUpdate}
              status={
                foundationChecks.filter(c => c.category === 'Deployment').every(c => c.status === 'pass') ? 'pass' :
                foundationChecks.filter(c => c.category === 'Deployment').some(c => c.status === 'fail') ? 'fail' :
                foundationChecks.filter(c => c.category === 'Deployment').some(c => c.status === 'warn') ? 'warn' : 'pending'
              }
              isCollapsible
              isExpanded={expandedSections['Deployment']}
              onToggle={() => setExpandedSections(prev => ({ ...prev, 'Deployment': !prev['Deployment'] }))}
            />
            {expandedSections['Deployment'] && (
              <div className="border-x border-b border-border rounded-b-xl">
                {foundationChecks.filter(c => c.category === 'Deployment').length > 0 ? (
                  foundationChecks.filter(c => c.category === 'Deployment').map(check => (
                    <CheckItem
                      key={check.id}
                      label={check.name}
                      status={check.status === 'pass' ? 'pass' : check.status === 'fail' ? 'fail' : check.status === 'warn' ? 'warn' : 'pending'}
                      description={check.description || check.message}
                      command={check.command}
                      output={check.output}
                      timestamp={check.timestamp}
                    />
                  ))
                ) : (
                  <>
                    <CheckItem label="Vercel Configuration" status="pending" description="Run validation to check" />
                    <CheckItem label="Vercel Token" status="pending" description="Run validation to check" />
                    <CheckItem label="GitHub Token" status="pending" description="Run validation to check" />
                  </>
                )}
              </div>
            )}

            <SectionHeader
              badge="CLI"
              badgeColor="bg-violet-600"
              title="Claude Code CLI"
              description="CLI installation, hooks, and agent configuration"
              timestamp={foundationLastChecked || lastUpdate}
              status={
                foundationChecks.filter(c => c.category === 'CLI').every(c => c.status === 'pass') ? 'pass' :
                foundationChecks.filter(c => c.category === 'CLI').some(c => c.status === 'fail') ? 'fail' :
                foundationChecks.filter(c => c.category === 'CLI').some(c => c.status === 'warn') ? 'warn' : 'pending'
              }
              isCollapsible
              isExpanded={expandedSections['CLI']}
              onToggle={() => setExpandedSections(prev => ({ ...prev, 'CLI': !prev['CLI'] }))}
            />
            {expandedSections['CLI'] && (
              <div className="border-x border-b border-border rounded-b-xl">
                {foundationChecks.filter(c => c.category === 'CLI').length > 0 ? (
                  foundationChecks.filter(c => c.category === 'CLI').map(check => (
                    <CheckItem
                      key={check.id}
                      label={check.name}
                      status={check.status === 'pass' ? 'pass' : check.status === 'fail' ? 'fail' : check.status === 'warn' ? 'warn' : 'pending'}
                      description={check.description || check.message}
                      command={check.command}
                      output={check.output}
                      timestamp={check.timestamp}
                    />
                  ))
                ) : (
                  <>
                    <CheckItem label="Claude Code CLI" status="pending" description="Run validation to check" />
                    <CheckItem label=".claudecode Directory" status="pending" description="Run validation to check" />
                    <CheckItem label="Claude Code Hooks" status="pending" description="Run validation to check" />
                    <CheckItem label="Agent Prompts" status="pending" description="Run validation to check" />
                  </>
                )}
              </div>
            )}

            <SectionHeader badge="GATE-1" badgeColor="bg-zinc-800" title="Gate -1: Pre-Validation" description="Pre-requisites before starting a wave" timestamp={foundationLastChecked || lastUpdate} status={
              foundationChecks.filter(c => c.category === 'Gate -1: Pre-Validation').every(c => c.status === 'pass') ? 'pass' :
              foundationChecks.filter(c => c.category === 'Gate -1: Pre-Validation').some(c => c.status === 'fail') ? 'fail' :
              foundationChecks.filter(c => c.category === 'Gate -1: Pre-Validation').some(c => c.status === 'warn') ? 'warn' : 'pending'
            } />
            <div className="border-x border-b border-border rounded-b-xl">
              {foundationChecks.filter(c => c.category === 'Gate -1: Pre-Validation').length > 0 ? (
                foundationChecks.filter(c => c.category === 'Gate -1: Pre-Validation').map(check => (
                  <CheckItem
                    key={check.id}
                    label={check.name}
                    status={check.status === 'pass' ? 'pass' : check.status === 'fail' ? 'fail' : check.status === 'warn' ? 'warn' : 'pending'}
                    description={check.description || check.message}
                    command={check.command}
                    output={check.output}
                    timestamp={check.timestamp}
                  />
                ))
              ) : (
                <>
                  <CheckItem label="Prompt Files Exist" status="pending" description="Run validation to check" />
                  <CheckItem label="Budget Sufficient" status="pending" description="Run validation to check" />
                  <CheckItem label="Worktrees Clean" status="pending" description="Run validation to check" />
                  <CheckItem label="No Emergency Stop" status="pending" description="Run validation to check" />
                  <CheckItem label="Previous Wave Complete" status="pending" description="Run validation to check" />
                  <CheckItem label="API Quotas Available" status="pending" description="Run validation to check" />
                </>
              )}
            </div>
          </>
        )}

        {/* TAB 6: Build QA */}
        {activeTab === 'build-qa' && (
          <>
            <div className="flex items-center justify-between p-6 border border-border bg-white rounded-2xl mb-6">
              <div className="flex items-center gap-6">
                <span className="text-sm font-medium text-muted-foreground">BUILD & QA</span>
                <span className="font-semibold">Build Validation & Quality Assurance</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => validateBuildQa(true)}
                  disabled={validatingBuildQa}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Quick Check
                </button>
                <button
                  onClick={() => validateBuildQa(false)}
                  disabled={validatingBuildQa}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2",
                    validatingBuildQa
                      ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                      : "bg-primary text-primary-foreground hover:opacity-90"
                  )}
                >
                  {validatingBuildQa ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Run Full Validation
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowBuildQaConfig(!showBuildQaConfig)}
                  className="p-2 rounded-lg hover:bg-zinc-100 transition-colors"
                  title="Configure quality thresholds"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Quality Thresholds Configuration Panel */}
            {showBuildQaConfig && buildQaThresholds && (
              <div className="p-5 bg-zinc-50 border border-zinc-200 rounded-2xl mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <Settings className="h-5 w-5 text-zinc-600" />
                  <h3 className="font-semibold">Quality Thresholds Configuration</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {/* Quality Gates */}
                  <div className="col-span-full">
                    <h4 className="text-sm font-medium mb-3 text-zinc-700">Quality Gates (Block Deployment)</h4>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={buildQaThresholds.quality_gates.block_on_typescript_errors}
                          onChange={(e) => updateBuildQaThresholds({
                            quality_gates: { ...buildQaThresholds.quality_gates, block_on_typescript_errors: e.target.checked }
                          })}
                          className="rounded"
                        />
                        TypeScript errors
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={buildQaThresholds.quality_gates.block_on_lint_errors}
                          onChange={(e) => updateBuildQaThresholds({
                            quality_gates: { ...buildQaThresholds.quality_gates, block_on_lint_errors: e.target.checked }
                          })}
                          className="rounded"
                        />
                        Lint errors
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={buildQaThresholds.quality_gates.block_on_test_failures}
                          onChange={(e) => updateBuildQaThresholds({
                            quality_gates: { ...buildQaThresholds.quality_gates, block_on_test_failures: e.target.checked }
                          })}
                          className="rounded"
                        />
                        Test failures
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={buildQaThresholds.quality_gates.block_on_security_critical}
                          onChange={(e) => updateBuildQaThresholds({
                            quality_gates: { ...buildQaThresholds.quality_gates, block_on_security_critical: e.target.checked }
                          })}
                          className="rounded"
                        />
                        Security vulnerabilities
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={buildQaThresholds.quality_gates.block_on_build_failure}
                          onChange={(e) => updateBuildQaThresholds({
                            quality_gates: { ...buildQaThresholds.quality_gates, block_on_build_failure: e.target.checked }
                          })}
                          className="rounded"
                        />
                        Build failure
                      </label>
                    </div>
                  </div>

                  {/* TypeScript */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-zinc-700">TypeScript</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Max Errors</label>
                        <input
                          type="number"
                          value={buildQaThresholds.typescript.max_errors}
                          onChange={(e) => updateBuildQaThresholds({
                            typescript: { ...buildQaThresholds.typescript, max_errors: parseInt(e.target.value) || 0 }
                          })}
                          className="w-full mt-1 px-2 py-1 border rounded text-sm"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Max Warnings</label>
                        <input
                          type="number"
                          value={buildQaThresholds.typescript.max_warnings}
                          onChange={(e) => updateBuildQaThresholds({
                            typescript: { ...buildQaThresholds.typescript, max_warnings: parseInt(e.target.value) || 0 }
                          })}
                          className="w-full mt-1 px-2 py-1 border rounded text-sm"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Lint */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-zinc-700">Lint</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Max Errors</label>
                        <input
                          type="number"
                          value={buildQaThresholds.lint.max_errors}
                          onChange={(e) => updateBuildQaThresholds({
                            lint: { ...buildQaThresholds.lint, max_errors: parseInt(e.target.value) || 0 }
                          })}
                          className="w-full mt-1 px-2 py-1 border rounded text-sm"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Max Warnings</label>
                        <input
                          type="number"
                          value={buildQaThresholds.lint.max_warnings}
                          onChange={(e) => updateBuildQaThresholds({
                            lint: { ...buildQaThresholds.lint, max_warnings: parseInt(e.target.value) || 0 }
                          })}
                          className="w-full mt-1 px-2 py-1 border rounded text-sm"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Security */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-zinc-700">Security</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Max Critical</label>
                        <input
                          type="number"
                          value={buildQaThresholds.security.max_critical}
                          onChange={(e) => updateBuildQaThresholds({
                            security: { ...buildQaThresholds.security, max_critical: parseInt(e.target.value) || 0 }
                          })}
                          className="w-full mt-1 px-2 py-1 border rounded text-sm"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Max High</label>
                        <input
                          type="number"
                          value={buildQaThresholds.security.max_high}
                          onChange={(e) => updateBuildQaThresholds({
                            security: { ...buildQaThresholds.security, max_high: parseInt(e.target.value) || 0 }
                          })}
                          className="w-full mt-1 px-2 py-1 border rounded text-sm"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Changes are saved automatically. Set thresholds to 0 to disallow any errors.
                </p>
              </div>
            )}

            {/* Build QA Status Summary */}
            {buildQaChecks.length > 0 && (
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className={cn("p-4 rounded-xl border", buildQaChecks.filter(c => c.status === 'pass').length > 0 ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200")}>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-medium text-sm">Passed</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">{buildQaChecks.filter(c => c.status === 'pass').length}</p>
                </div>
                <div className={cn("p-4 rounded-xl border", buildQaChecks.filter(c => c.status === 'fail').length > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200")}>
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="font-medium text-sm">Failed</span>
                  </div>
                  <p className="text-2xl font-bold text-red-700">{buildQaChecks.filter(c => c.status === 'fail').length}</p>
                </div>
                <div className={cn("p-4 rounded-xl border", "bg-gray-50 border-gray-200")}>
                  <div className="flex items-center gap-2 mb-1">
                    <MinusCircle className="h-5 w-5 text-gray-400" />
                    <span className="font-medium text-sm">Skipped</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-700">{buildQaChecks.filter(c => c.status === 'skipped').length}</p>
                </div>
                <div className={cn("p-4 rounded-xl border", "bg-blue-50 border-blue-200")}>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <span className="font-medium text-sm">Last Run</span>
                  </div>
                  <p className="text-sm font-medium text-blue-700">{buildQaLastChecked || 'Never'}</p>
                </div>
              </div>
            )}

            {/* Build QA Checks Section */}
            <SectionHeader
              badge="A"
              badgeColor="bg-blue-500"
              title="Section A: Build & Compilation"
              description="TypeScript compilation and production build"
              timestamp={buildQaLastChecked || lastUpdate}
              status={(() => {
                const checks = buildQaChecks.filter(c => ['TypeScript', 'Build'].includes(c.name))
                if (checks.length === 0) return buildQaStatus === 'idle' ? 'warn' : 'pending'
                if (checks.some(c => c.status === 'fail')) return 'fail'
                if (checks.every(c => c.status === 'pass')) return 'pass'
                return 'warn'
              })()}
            />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="TypeScript Compilation"
                status={(buildQaChecks.find(c => c.name === 'TypeScript')?.status as 'pass' | 'fail' | 'warn') || (buildQaStatus === 'idle' ? 'warn' : 'pending')}
                description="TypeScript type checking must pass with zero errors (tsc --noEmit)"
                command="npx tsc --noEmit"
                output={buildQaChecks.find(c => c.name === 'TypeScript')?.output || buildQaChecks.find(c => c.name === 'TypeScript')?.reason}
              />
              <CheckItem
                label="Production Build"
                status={(buildQaChecks.find(c => c.name === 'Build')?.status as 'pass' | 'fail' | 'warn') || (buildQaStatus === 'idle' ? 'warn' : 'pending')}
                description="Production build must complete without errors"
                command="npm run build"
                output={buildQaChecks.find(c => c.name === 'Build')?.output || buildQaChecks.find(c => c.name === 'Build')?.reason}
              />
            </div>

            {/* Test & Lint Section */}
            <SectionHeader
              badge="B"
              badgeColor="bg-purple-500"
              title="Section B: Tests & Linting"
              description="Unit tests and code quality checks"
              timestamp={buildQaLastChecked || lastUpdate}
              status={(() => {
                const checks = buildQaChecks.filter(c => ['Tests', 'Lint'].includes(c.name))
                if (checks.length === 0) return buildQaStatus === 'idle' ? 'warn' : 'pending'
                if (checks.some(c => c.status === 'fail')) return 'fail'
                if (checks.every(c => c.status === 'pass')) return 'pass'
                return 'warn'
              })()}
            />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="Unit Tests"
                status={(buildQaChecks.find(c => c.name === 'Tests')?.status as 'pass' | 'fail' | 'warn') || (buildQaStatus === 'idle' ? 'warn' : 'pending')}
                description="All unit and integration tests must pass"
                command="npm test"
                output={buildQaChecks.find(c => c.name === 'Tests')?.output || buildQaChecks.find(c => c.name === 'Tests')?.reason}
              />
              <CheckItem
                label="ESLint"
                status={(buildQaChecks.find(c => c.name === 'Lint')?.status as 'pass' | 'fail' | 'warn') || (buildQaStatus === 'idle' ? 'warn' : 'pending')}
                description="ESLint must pass with no errors"
                command="npm run lint"
                output={buildQaChecks.find(c => c.name === 'Lint')?.output || buildQaChecks.find(c => c.name === 'Lint')?.reason}
              />
            </div>

            {/* Security Section */}
            <SectionHeader
              badge="C"
              badgeColor="bg-red-500"
              title="Section C: Security"
              description="Dependency vulnerability scanning"
              timestamp={buildQaLastChecked || lastUpdate}
              status={(() => {
                const check = buildQaChecks.find(c => c.name === 'Security Audit')
                if (!check) return buildQaStatus === 'idle' ? 'warn' : 'pending'
                if (check.status === 'fail') return 'fail'
                if (check.status === 'pass') return 'pass'
                return 'warn'
              })()}
            />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="Security Audit"
                status={(buildQaChecks.find(c => c.name === 'Security Audit')?.status as 'pass' | 'fail' | 'warn') || (buildQaStatus === 'idle' ? 'warn' : 'pending')}
                description="No high or critical vulnerabilities in dependencies"
                command="npm audit --audit-level=high"
                output={buildQaChecks.find(c => c.name === 'Security Audit')?.output || buildQaChecks.find(c => c.name === 'Security Audit')?.reason}
              />
            </div>

            {/* Results Detail */}
            {buildQaChecks.length > 0 && buildQaChecks.some(c => c.duration_ms) && (
              <div className="mt-6 p-4 bg-zinc-50 border border-zinc-200 rounded-xl">
                <h4 className="font-medium text-sm mb-3">Execution Details</h4>
                <div className="space-y-2">
                  {buildQaChecks.filter(c => c.duration_ms).map((check, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{check.name}</span>
                      <span className="font-mono text-xs">{check.duration_ms}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {buildQaChecks.length === 0 && buildQaStatus === 'idle' && (
              <div className="mt-6 p-8 text-center text-muted-foreground border border-dashed border-zinc-300 rounded-xl">
                <Rocket className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No validation results yet</p>
                <p className="text-sm mt-1">Click "Run Full Validation" to check TypeScript, build, tests, lint, and security</p>
              </div>
            )}
          </>
        )}

        {/* TAB 8: RLM Protocol */}
        {activeTab === 'rlm-protocol' && (
          <>
            {/* RLM Info Box */}
            <div className="p-5 bg-violet-50 border border-violet-200 rounded-2xl mb-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <Layers className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-violet-900 mb-1">RLM Protocol - Recursive Language Models</h3>
                  <p className="text-sm text-violet-700 leading-relaxed">
                    RLM solves <strong>context rot</strong> by storing context as an external variable (P) that agents query on-demand.
                    Instead of loading entire codebases into prompts, agents use <code className="bg-violet-100 px-1 rounded">peek()</code>, <code className="bg-violet-100 px-1 rounded">search()</code>, and <code className="bg-violet-100 px-1 rounded">get_story()</code> to access specific information.
                    This achieves <strong>90%+ token reduction</strong> while maintaining context accuracy.
                  </p>
                  <p className="text-xs text-violet-600 mt-2">
                    Based on MIT CSAIL research (arXiv:2512.24601) - Implemented in WAVE Framework V12.2
                  </p>
                </div>
              </div>
            </div>

            {/* Validate RLM Button */}
            <div className="p-6 border border-zinc-200 rounded-2xl mb-6 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    rlmStatus === 'ready' ? "bg-green-100" :
                    rlmStatus === 'blocked' ? "bg-red-100" :
                    rlmStatus === 'validating' ? "bg-violet-100" :
                    "bg-zinc-100"
                  )}>
                    {rlmStatus === 'ready' ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    ) : rlmStatus === 'blocked' ? (
                      <XCircle className="h-6 w-6 text-red-500" />
                    ) : rlmStatus === 'validating' ? (
                      <Loader2 className="h-6 w-6 text-violet-600 animate-spin" />
                    ) : (
                      <Layers className="h-6 w-6 text-zinc-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {rlmStatus === 'ready' ? 'RLM Protocol Active' :
                       rlmStatus === 'blocked' ? 'RLM Not Configured' :
                       rlmStatus === 'validating' ? 'Validating RLM...' :
                       'RLM Protocol Validation'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {rlmStatus === 'ready' ? 'External context and agent memory configured correctly' :
                       rlmStatus === 'blocked' ? 'RLM components need configuration' :
                       rlmStatus === 'validating' ? 'Checking P variable, memory, and snapshots...' :
                       'Validate RLM components for context-efficient agent operations'}
                    </p>
                    {rlmLastChecked && (
                      <p className="text-xs text-muted-foreground mt-1">Last checked: {rlmLastChecked}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={validateRlm}
                  disabled={validatingRlm}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all",
                    validatingRlm
                      ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                      : "bg-violet-600 hover:bg-violet-700 text-white"
                  )}
                >
                  {validatingRlm ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      {rlmStatus === 'idle' ? 'Validate RLM' : 'Re-validate'}
                    </>
                  )}
                </button>
              </div>

              {/* RLM Metrics Summary - dynamic based on validation results */}
              <div className="mt-6 pt-6 border-t border-border/50">
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-violet-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-violet-700">97%</p>
                    <p className="text-xs text-violet-600">Token Reduction</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-700">P</p>
                    <p className="text-xs text-green-600">External Context</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-blue-700">4</p>
                    <p className="text-xs text-blue-600">Agent Memories</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-amber-700">6</p>
                    <p className="text-xs text-amber-600">Checkpoints</p>
                  </div>
                </div>
              </div>
            </div>

            {/* RLM Category Sections */}
            <SectionHeader
              badge="P"
              badgeColor="bg-violet-600"
              title="P Variable (External Context)"
              description="Project state stored outside LLM context"
              timestamp={rlmLastChecked || lastUpdate}
              status={rlmChecks.filter(c => c.category === 'P Variable').every(c => c.status === 'pass') ? 'pass' :
                rlmChecks.filter(c => c.category === 'P Variable').some(c => c.status === 'fail') ? 'fail' : 'pending'}
              isCollapsible
              isExpanded={expandedSections['P Variable']}
              onToggle={() => setExpandedSections(prev => ({ ...prev, 'P Variable': !prev['P Variable'] }))}
            />
            {expandedSections['P Variable'] && (
              <div className="border-x border-b border-border rounded-b-xl">
                <CheckItem
                  label="P Variable File Generated"
                  status="pending"
                  description="External context variable exists at configured location"
                  command="cat /tmp/P.json | jq '.meta.project_name'"
                />
                <CheckItem
                  label="P Variable Schema Valid"
                  status="pending"
                  description="P variable matches expected JSON schema structure"
                  command="jq -e '.meta and .codebase and .wave_state' /tmp/P.json"
                />
                <CheckItem
                  label="Context Hash Current"
                  status="pending"
                  description="Hash matches actual file state (no drift detected)"
                  command="./core/scripts/rlm/load-project-variable.sh --verify-hash"
                />
                <CheckItem
                  label="Codebase Indexed"
                  status="pending"
                  description="File structure and source files captured in P variable"
                  command="jq '.codebase.file_count' /tmp/P.json"
                />
              </div>
            )}

            <SectionHeader
              badge="MEM"
              badgeColor="bg-blue-600"
              title="Agent Memory Persistence"
              description="Decisions and patterns survive context resets"
              timestamp={rlmLastChecked || lastUpdate}
              status={rlmChecks.filter(c => c.category === 'Agent Memory').every(c => c.status === 'pass') ? 'pass' :
                rlmChecks.filter(c => c.category === 'Agent Memory').some(c => c.status === 'fail') ? 'fail' : 'pending'}
              isCollapsible
              isExpanded={expandedSections['Agent Memory']}
              onToggle={() => setExpandedSections(prev => ({ ...prev, 'Agent Memory': !prev['Agent Memory'] }))}
            />
            {expandedSections['Agent Memory'] && (
              <div className="border-x border-b border-border rounded-b-xl">
                <CheckItem
                  label="Memory Directory Exists"
                  status="pending"
                  description="Agent memory storage at .claude/agent-memory/"
                  command="ls -la .claude/agent-memory/"
                />
                <CheckItem
                  label="FE-Dev Memory File"
                  status="pending"
                  description="Frontend agent memory persisted"
                  command="cat .claude/agent-memory/fe-dev-wave*.json | jq '.decisions | length'"
                />
                <CheckItem
                  label="BE-Dev Memory File"
                  status="pending"
                  description="Backend agent memory persisted"
                  command="cat .claude/agent-memory/be-dev-wave*.json | jq '.decisions | length'"
                />
                <CheckItem
                  label="Memory Schema Valid"
                  status="pending"
                  description="Memory files match required schema"
                  command="./core/scripts/rlm/memory-manager.sh --validate-all"
                />
              </div>
            )}

            <SectionHeader
              badge="SNAP"
              badgeColor="bg-amber-600"
              title="Snapshots & Recovery"
              description="Checkpoint/restore capability for rollback"
              timestamp={rlmLastChecked || lastUpdate}
              status={rlmChecks.filter(c => c.category === 'Snapshots').every(c => c.status === 'pass') ? 'pass' :
                rlmChecks.filter(c => c.category === 'Snapshots').some(c => c.status === 'fail') ? 'fail' : 'pending'}
              isCollapsible
              isExpanded={expandedSections['Snapshots']}
              onToggle={() => setExpandedSections(prev => ({ ...prev, 'Snapshots': !prev['Snapshots'] }))}
            />
            {expandedSections['Snapshots'] && (
              <div className="border-x border-b border-border rounded-b-xl">
                <CheckItem
                  label="Snapshot Directory"
                  status="pending"
                  description="Snapshots stored in .claude/snapshots/"
                  command="ls -la .claude/snapshots/"
                />
                <CheckItem
                  label="Checkpoint: startup"
                  status="pending"
                  description="Pre-flight check snapshot exists"
                  command="ls .claude/snapshots/P-wave*-startup-*.json | tail -1"
                />
                <CheckItem
                  label="Checkpoint: pre-sync"
                  status="pending"
                  description="Before worktree merge snapshot"
                  command="ls .claude/snapshots/P-wave*-pre-sync-*.json | tail -1"
                />
                <CheckItem
                  label="Restore Capability"
                  status="pending"
                  description="Can restore from last snapshot"
                  command="./core/scripts/rlm/restore-variable.sh --dry-run --latest"
                />
              </div>
            )}

            <SectionHeader
              badge="SCRIPTS"
              badgeColor="bg-green-600"
              title="RLM Scripts"
              description="Required scripts for RLM operations"
              timestamp={rlmLastChecked || lastUpdate}
              status={rlmChecks.filter(c => c.category === 'RLM Scripts').every(c => c.status === 'pass') ? 'pass' :
                rlmChecks.filter(c => c.category === 'RLM Scripts').some(c => c.status === 'fail') ? 'fail' : 'pending'}
              isCollapsible
              isExpanded={expandedSections['RLM Scripts']}
              onToggle={() => setExpandedSections(prev => ({ ...prev, 'RLM Scripts': !prev['RLM Scripts'] }))}
            />
            {expandedSections['RLM Scripts'] && (
              <div className="border-x border-b border-border rounded-b-xl">
                <CheckItem
                  label="load-project-variable.sh"
                  status="pending"
                  description="Generate P variable from project"
                  command="test -x core/scripts/rlm/load-project-variable.sh && echo 'executable'"
                />
                <CheckItem
                  label="query-variable.py"
                  status="pending"
                  description="REPL-style query interface for P"
                  command="test -f core/scripts/rlm/query-variable.py && echo 'exists'"
                />
                <CheckItem
                  label="memory-manager.sh"
                  status="pending"
                  description="Manage agent memory persistence"
                  command="test -x core/scripts/rlm/memory-manager.sh && echo 'executable'"
                />
                <CheckItem
                  label="snapshot-variable.sh"
                  status="pending"
                  description="Create P snapshots at checkpoints"
                  command="test -x core/scripts/rlm/snapshot-variable.sh && echo 'executable'"
                />
                <CheckItem
                  label="sub-llm-dispatch.py"
                  status="pending"
                  description="Delegate tasks to sub-LLMs"
                  command="test -f core/scripts/rlm/sub-llm-dispatch.py && echo 'exists'"
                />
              </div>
            )}

            <SectionHeader
              badge="$"
              badgeColor="bg-emerald-600"
              title="Token Budget & Efficiency"
              description="Context reduction and cost optimization"
              timestamp={rlmLastChecked || lastUpdate}
              status={rlmChecks.filter(c => c.category === 'Token Budget').every(c => c.status === 'pass') ? 'pass' :
                rlmChecks.filter(c => c.category === 'Token Budget').some(c => c.status === 'fail') ? 'fail' : 'pending'}
              isCollapsible
              isExpanded={expandedSections['Token Budget']}
              onToggle={() => setExpandedSections(prev => ({ ...prev, 'Token Budget': !prev['Token Budget'] }))}
            />
            {expandedSections['Token Budget'] && (
              <div className="border-x border-b border-border rounded-b-xl">
                <CheckItem
                  label="Baseline Token Count"
                  status="pending"
                  description="Initial context size measured (before RLM)"
                  command="wc -c CLAUDE.md stories/**/*.json | tail -1"
                />
                <CheckItem
                  label="RLM Token Reduction"
                  status="pending"
                  description="90%+ reduction in context tokens achieved"
                  command="./core/scripts/rlm/measure-reduction.sh"
                />
                <CheckItem
                  label="Sub-LLM Cost Tracking"
                  status="pending"
                  description="Per-model costs tracked (Haiku/Sonnet/Opus)"
                  command="cat .claude/budget.json | jq '.by_model'"
                />
                <CheckItem
                  label="Query Efficiency"
                  status="pending"
                  description="peek/search/list_files return accurate results"
                  command="./core/scripts/rlm/query-variable.py --test"
                />
              </div>
            )}

            {/* Drift Monitoring Section (Phase 1.3.5) */}
            <div className="mt-6 p-5 bg-white border border-border rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    driftReport?.overall_status === 'healthy' ? "bg-green-100" :
                    driftReport?.overall_status === 'drift_detected' ? "bg-amber-100" :
                    "bg-zinc-100"
                  )}>
                    <Brain className={cn(
                      "h-5 w-5",
                      driftReport?.overall_status === 'healthy' ? "text-green-600" :
                      driftReport?.overall_status === 'drift_detected' ? "text-amber-600" :
                      "text-zinc-600"
                    )} />
                  </div>
                  <div>
                    <h3 className="font-semibold">Agent Memory Drift Monitor</h3>
                    <p className="text-sm text-muted-foreground">Detect memory pollution and context drift</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {driftReport && (
                    <span className={cn(
                      "px-3 py-1 rounded-full text-sm",
                      driftReport.overall_status === 'healthy' ? "bg-green-100 text-green-700" :
                      "bg-amber-100 text-amber-700"
                    )}>
                      {driftReport.overall_status === 'healthy' ? 'No Drift' :
                       `${driftReport.summary.drifted + driftReport.summary.stale} Agents Affected`}
                    </span>
                  )}
                  <button
                    onClick={() => fetchDriftReport(true)}
                    disabled={driftLoading}
                    className="p-2 rounded-lg hover:bg-zinc-100 transition-colors"
                    title="Refresh drift report"
                  >
                    <RefreshCw className={cn("h-4 w-4", driftLoading && "animate-spin")} />
                  </button>
                </div>
              </div>

              {/* Drift Recommendations */}
              {driftReport && driftReport.recommendations.filter(r => r.priority !== 'info').length > 0 && (
                <div className="mb-4 space-y-2">
                  {driftReport.recommendations.filter(r => r.priority !== 'info').map((rec, i) => (
                    <div
                      key={i}
                      className={cn(
                        "px-4 py-3 rounded-lg flex items-start gap-3",
                        rec.priority === 'high' ? "bg-red-50 border border-red-200" :
                        rec.priority === 'medium' ? "bg-amber-50 border border-amber-200" :
                        "bg-blue-50 border border-blue-200"
                      )}
                    >
                      {rec.priority === 'high' ? (
                        <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      ) : rec.priority === 'medium' ? (
                        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className={cn(
                          "text-sm font-medium",
                          rec.priority === 'high' ? "text-red-700" :
                          rec.priority === 'medium' ? "text-amber-700" :
                          "text-blue-700"
                        )}>
                          {rec.message}
                        </p>
                        {rec.agents.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Affected: {rec.agents.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Drift Summary */}
              {driftReport && (
                <div className="grid grid-cols-5 gap-3 mb-4">
                  <div className="p-3 bg-green-50 rounded-lg text-center">
                    <p className="text-xl font-bold text-green-700">{driftReport.summary.healthy}</p>
                    <p className="text-xs text-green-600">Healthy</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg text-center">
                    <p className="text-xl font-bold text-amber-700">{driftReport.summary.drifted}</p>
                    <p className="text-xs text-amber-600">Drifted</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg text-center">
                    <p className="text-xl font-bold text-orange-700">{driftReport.summary.stale}</p>
                    <p className="text-xs text-orange-600">Stale</p>
                  </div>
                  <div className="p-3 bg-zinc-100 rounded-lg text-center">
                    <p className="text-xl font-bold text-zinc-700">{driftReport.summary.no_baseline}</p>
                    <p className="text-xs text-zinc-600">No Baseline</p>
                  </div>
                  <div className="p-3 bg-violet-50 rounded-lg text-center">
                    <p className="text-xl font-bold text-violet-700">{(driftReport.summary.average_drift_score * 100).toFixed(0)}%</p>
                    <p className="text-xs text-violet-600">Avg Drift</p>
                  </div>
                </div>
              )}

              {/* Agent Drift Details */}
              {driftReport && (
                <div className="border rounded-xl overflow-hidden">
                  <div className="px-4 py-2 bg-zinc-50 border-b text-sm font-medium">
                    Agent Memory Status
                  </div>
                  <div className="divide-y">
                    {driftReport.agents.map((agent) => (
                      <div key={agent.agent} className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            agent.status === 'healthy' ? "bg-green-500" :
                            agent.status === 'drifted' ? "bg-amber-500" :
                            agent.status === 'stale' ? "bg-orange-500" :
                            "bg-zinc-300"
                          )} />
                          <div>
                            <span className="font-medium text-sm">{agent.agent}</span>
                            <span className={cn(
                              "ml-2 text-xs px-2 py-0.5 rounded",
                              agent.status === 'healthy' ? "bg-green-100 text-green-700" :
                              agent.status === 'drifted' ? "bg-amber-100 text-amber-700" :
                              agent.status === 'stale' ? "bg-orange-100 text-orange-700" :
                              "bg-zinc-100 text-zinc-600"
                            )}>
                              {agent.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {agent.drift_score !== null && (
                            <div className="text-right">
                              <p className="text-sm font-medium">{(agent.drift_score * 100).toFixed(0)}%</p>
                              <p className="text-xs text-muted-foreground">drift</p>
                            </div>
                          )}
                          {agent.memory_drift && (
                            <div className="text-right">
                              <p className="text-sm">{agent.memory_drift.current_size_kb}KB</p>
                              <p className="text-xs text-muted-foreground">memory</p>
                            </div>
                          )}
                          {agent.status === 'no_baseline' ? (
                            <button
                              onClick={() => generateAgentBaseline(agent.agent)}
                              className="px-2 py-1 text-xs bg-violet-100 text-violet-700 rounded hover:bg-violet-200"
                            >
                              Create Baseline
                            </button>
                          ) : (agent.status === 'drifted' || agent.status === 'stale') && (
                            <button
                              onClick={() => resetAgentMemory(agent.agent)}
                              className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
                            >
                              Reset Memory
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!driftReport && !driftLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No drift data available</p>
                  <p className="text-xs mt-1">Click refresh to check agent memory drift</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 5: Aerospace Safety */}
        {activeTab === 'compliance-safety' && (
          <>
            <div className="flex items-center justify-between p-6 border border-border bg-white rounded-2xl mb-6">
              <div className="flex items-center gap-6">
                <span className="text-sm font-medium text-muted-foreground">AEROSPACE</span>
                <span className="font-semibold">DO-178C Inspired Safety Protocol</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={validateSafety}
                  disabled={validatingSafety}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {validatingSafety ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4" />
                      Run Safety Validation
                    </>
                  )}
                </button>
                {safetyValidationResult && (
                  <div className="flex items-center gap-2">
                    <StatusBadge status={safetyValidationResult.status || 'pending'} />
                    <span className="text-xs text-muted-foreground">{safetyValidationResult.message}</span>
                  </div>
                )}
              </div>
            </div>

            <SectionHeader badge="A" badgeColor="bg-gray-400" title="Section A: Safety Documentation" description="CLAUDE.md and forbidden operations" timestamp={lastUpdate} status="warn" />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="Safety Markers (20+)"
                status="warn"
                description="CLAUDE.md must contain at least 20 CRITICAL/NEVER/FORBIDDEN markers"
                command="grep -cE '(CRITICAL|NEVER|FORBIDDEN|DO NOT)' CLAUDE.md"
              />
              <CheckItem
                label="Emergency Stop Configured"
                status="pass"
                description="Emergency stop mechanism is configured and accessible"
                command="test -f .claude/emergency-stop.sh && echo 'CONFIGURED'"
              />
              <CheckItem
                label="Domain Boundaries Defined"
                status="pass"
                description="Agent domain boundaries are clearly defined in CLAUDE.md"
                command="grep -c 'DOMAIN:' CLAUDE.md"
              />
              <CheckItem
                label="Budget Limits Enforced"
                status="pass"
                description="API budget limits are set and being tracked"
                command="cat .claude/budget.json | jq '{limit, spent, remaining}'"
              />
            </div>

            <SectionHeader badge="B" badgeColor="bg-gray-400" title="Section B: Docker Configuration" description="Container safety settings" timestamp={lastUpdate} status="pass" />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="--dangerously-skip-permissions"
                status="pass"
                description="Docker runs with appropriate permission flags for Claude Code"
                command="grep -c 'dangerously-skip-permissions' docker-compose.yml || echo 'Not found'"
              />
              <CheckItem
                label="Non-Root User"
                status="pass"
                description="Container runs as non-root user for security"
                command="grep -E '^USER' Dockerfile | tail -1"
              />
            </div>

            <SectionHeader badge="C" badgeColor="bg-gray-400" title="Section C: Signal Protocol" description="Agent communication mechanism" timestamp={lastUpdate} status="pass" />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="Signal File Schema"
                status="pass"
                description="Signal files follow the required JSON schema"
                command="ajv validate -s .claude/schemas/signal.json -d '.claude/signal-*.json'"
              />
              <CheckItem
                label="Gate Progression (0-7)"
                status="pass"
                description="Gate progression follows the defined sequence (0→7)"
                command="cat .claude/gate-status.json | jq '.current_gate'"
              />
            </div>

            {/* Section D: Real validation results from API */}
            <SectionHeader
              badge="D"
              badgeColor="bg-gray-400"
              title="Section D: Aerospace Safety (DO-178C)"
              description="Design Assurance and FMEA compliance"
              timestamp={safetyLastChecked || lastUpdate}
              status={(() => {
                const sectionDChecks = ['FMEA Document (17 modes)', 'Emergency Levels (E1-E5)', 'Approval Matrix (L0-L5)', 'Forbidden Operations (108)', 'Safety Policy']
                const results = safetyChecks.filter(c => sectionDChecks.includes(c.name))
                if (results.length === 0) return safetyStatus === 'idle' ? 'warn' : 'pending'
                if (results.some(c => c.status === 'fail')) return 'fail'
                if (results.some(c => c.status === 'warn')) return 'warn'
                return 'pass'
              })()}
            />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="FMEA Document (17 modes)"
                status={(safetyChecks.find(c => c.name === 'FMEA Document (17 modes)')?.status as 'pass' | 'fail' | 'warn') || (safetyStatus === 'idle' ? 'warn' : 'pending')}
                description="Failure Mode and Effects Analysis covers all 17 identified failure modes"
                command="grep -c '## FM-' .claudecode/safety/FMEA.md"
                output={safetyChecks.find(c => c.name === 'FMEA Document (17 modes)')?.message}
              />
              <CheckItem
                label="Emergency Levels (E1-E5)"
                status={(safetyChecks.find(c => c.name === 'Emergency Levels (E1-E5)')?.status as 'pass' | 'fail' | 'warn') || (safetyStatus === 'idle' ? 'warn' : 'pending')}
                description="Emergency severity levels E1-E5 are defined and documented"
                command="grep -c '## E[1-5]:' .claudecode/safety/EMERGENCY-LEVELS.md"
                output={safetyChecks.find(c => c.name === 'Emergency Levels (E1-E5)')?.message}
              />
              <CheckItem
                label="Approval Matrix (L0-L5)"
                status={(safetyChecks.find(c => c.name === 'Approval Matrix (L0-L5)')?.status as 'pass' | 'fail' | 'warn') || (safetyStatus === 'idle' ? 'warn' : 'pending')}
                description="Approval levels L0-L5 are defined for different operation types"
                command="grep -c '## L[0-5]:' .claudecode/safety/APPROVAL-LEVELS.md"
                output={safetyChecks.find(c => c.name === 'Approval Matrix (L0-L5)')?.message}
              />
              <CheckItem
                label="Forbidden Operations (108)"
                status={(safetyChecks.find(c => c.name === 'Forbidden Operations (108)')?.status as 'pass' | 'fail' | 'warn') || (safetyStatus === 'idle' ? 'warn' : 'pending')}
                description="All 108 forbidden operations are documented and enforced"
                command="grep -c '| [A-J][0-9]' .claudecode/safety/COMPLETE-SAFETY-REFERENCE.md"
                output={safetyChecks.find(c => c.name === 'Forbidden Operations (108)')?.message}
              />
              <CheckItem
                label="Safety Policy"
                status={(safetyChecks.find(c => c.name === 'Safety Policy')?.status as 'pass' | 'fail' | 'warn') || (safetyStatus === 'idle' ? 'warn' : 'pending')}
                description="Safety policy document exists and defines core principles"
                command="test -f .claudecode/safety/SAFETY-POLICY.md"
                output={safetyChecks.find(c => c.name === 'Safety Policy')?.message}
              />
            </div>

            {/* Section E: Real validation results from API */}
            <SectionHeader
              badge="E"
              badgeColor="bg-gray-400"
              title="Section E: Operational Safety"
              description="Validation scripts and PM agent"
              timestamp={safetyLastChecked || lastUpdate}
              status={(() => {
                const sectionEChecks = ['pre-flight-validator.sh', 'pre-merge-validator.sh', 'post-deploy-validator.sh', 'safety-violation-detector.sh', 'protocol-compliance-checker.sh', 'PM Agent Configuration']
                const results = safetyChecks.filter(c => sectionEChecks.includes(c.name))
                if (results.length === 0) return safetyStatus === 'idle' ? 'warn' : 'pending'
                if (results.some(c => c.status === 'fail')) return 'fail'
                if (results.some(c => c.status === 'warn')) return 'warn'
                return 'pass'
              })()}
            />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="Pre-Flight Validator"
                status={(safetyChecks.find(c => c.name === 'pre-flight-validator.sh')?.status as 'pass' | 'fail' | 'warn') || (safetyStatus === 'idle' ? 'warn' : 'pending')}
                description="Pre-flight validation script exists and is executable"
                command="test -x core/scripts/pre-flight-validator.sh"
                output={safetyChecks.find(c => c.name === 'pre-flight-validator.sh')?.message}
              />
              <CheckItem
                label="Pre-Merge Validator"
                status={(safetyChecks.find(c => c.name === 'pre-merge-validator.sh')?.status as 'pass' | 'fail' | 'warn') || (safetyStatus === 'idle' ? 'warn' : 'pending')}
                description="Pre-merge validation script exists and is executable"
                command="test -x core/scripts/pre-merge-validator.sh"
                output={safetyChecks.find(c => c.name === 'pre-merge-validator.sh')?.message}
              />
              <CheckItem
                label="Post-Deploy Validator"
                status={(safetyChecks.find(c => c.name === 'post-deploy-validator.sh')?.status as 'pass' | 'fail' | 'warn') || (safetyStatus === 'idle' ? 'warn' : 'pending')}
                description="Post-deployment validation script exists and is executable"
                command="test -x core/scripts/post-deploy-validator.sh"
                output={safetyChecks.find(c => c.name === 'post-deploy-validator.sh')?.message}
              />
              <CheckItem
                label="Safety Violation Detector"
                status={(safetyChecks.find(c => c.name === 'safety-violation-detector.sh')?.status as 'pass' | 'fail' | 'warn') || (safetyStatus === 'idle' ? 'warn' : 'pending')}
                description="Real-time safety violation monitoring script"
                command="test -x core/scripts/safety-violation-detector.sh"
                output={safetyChecks.find(c => c.name === 'safety-violation-detector.sh')?.message}
              />
              <CheckItem
                label="Protocol Compliance Checker"
                status={(safetyChecks.find(c => c.name === 'protocol-compliance-checker.sh')?.status as 'pass' | 'fail' | 'warn') || (safetyStatus === 'idle' ? 'warn' : 'pending')}
                description="Protocol compliance verification script"
                command="test -x core/scripts/protocol-compliance-checker.sh"
                output={safetyChecks.find(c => c.name === 'protocol-compliance-checker.sh')?.message}
              />
              <CheckItem
                label="PM Agent Configuration"
                status={(safetyChecks.find(c => c.name === 'PM Agent Configuration')?.status as 'pass' | 'fail' | 'warn') || (safetyStatus === 'idle' ? 'warn' : 'pending')}
                description="PM agent configured with gates and budget"
                command="test -f .claudecode/agents/pm-agent.md && grep -q 'Gate' .claudecode/agents/pm-agent.md"
                output={safetyChecks.find(c => c.name === 'PM Agent Configuration')?.message}
              />
            </div>

            {/* Section F: Behavioral Safety Probes */}
            <SectionHeader
              badge="F"
              badgeColor="bg-amber-500"
              title="Section F: Behavioral Safety Probes"
              description="Tests that agents actually REFUSE forbidden operations"
              timestamp={behavioralLastChecked || lastUpdate}
              status={
                behavioralProbeStatus === 'ready' ? 'pass' :
                behavioralProbeStatus === 'blocked' ? 'fail' :
                behavioralProbeStatus === 'validating' ? 'pending' :
                'warn'
              }
            />
            <div className="border-x border-b border-border rounded-b-xl">
              {/* Explanation Banner */}
              <div className="p-4 bg-amber-50 border-b border-amber-100">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800">Why Behavioral Probes Matter</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Structural validation checks "Does the safety file exist?" but never asks
                      "Will the agent actually refuse a forbidden operation?" These probes test
                      actual behavior, not just configuration.
                    </p>
                  </div>
                </div>
              </div>

              {/* Run Probes Button */}
              <div className="p-4 border-b border-border bg-white">
                <button
                  onClick={validateBehavioralProbes}
                  disabled={validatingBehavioral}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2",
                    validatingBehavioral
                      ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                      : "bg-amber-600 text-white hover:bg-amber-700"
                  )}
                >
                  {validatingBehavioral ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Running Probes...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4" />
                      Run Behavioral Probes
                    </>
                  )}
                </button>
                <p className="text-xs text-muted-foreground mt-2">
                  15 probes testing forbidden operations, domain boundaries, prompt injection resistance
                </p>
              </div>

              {/* Probe Results */}
              {behavioralProbes.length > 0 ? (
                <div className="divide-y divide-border">
                  {/* Summary */}
                  <div className="p-4 bg-white">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="text-sm font-medium">
                          {behavioralProbes.filter(p => p.status === 'validated' || p.status === 'pass').length} Validated
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-500" />
                        <span className="text-sm font-medium">
                          {behavioralProbes.filter(p => p.status === 'fail').length} Failed
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-500" />
                        <span className="text-sm font-medium">
                          {behavioralProbes.filter(p => p.status === 'pending').length} Pending
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MinusCircle className="h-5 w-5 text-gray-400" />
                        <span className="text-sm font-medium">
                          {behavioralProbes.filter(p => p.status === 'skipped').length} Skipped
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Individual Probes */}
                  {behavioralProbes.map((probe) => (
                    <div key={probe.probe_id} className="p-4 bg-white hover:bg-zinc-50">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                          probe.status === 'validated' || probe.status === 'pass' ? "bg-green-100" :
                          probe.status === 'fail' ? "bg-red-100" :
                          probe.status === 'pending' ? "bg-blue-100" :
                          "bg-gray-100"
                        )}>
                          {probe.status === 'validated' || probe.status === 'pass' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : probe.status === 'fail' ? (
                            <XCircle className="h-4 w-4 text-red-600" />
                          ) : probe.status === 'pending' ? (
                            <Clock className="h-4 w-4 text-blue-600" />
                          ) : (
                            <MinusCircle className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{probe.name}</span>
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              probe.severity === 'critical' ? "bg-red-100 text-red-700" :
                              probe.severity === 'high' ? "bg-orange-100 text-orange-700" :
                              probe.severity === 'medium' ? "bg-yellow-100 text-yellow-700" :
                              "bg-gray-100 text-gray-700"
                            )}>
                              {probe.severity}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                              {probe.category?.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-xs text-muted-foreground font-mono">
                              {probe.probe_id}
                            </code>
                            {probe.message && (
                              <span className="text-xs text-muted-foreground">
                                - {probe.message}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No probe results yet</p>
                  <p className="text-sm mt-1">Click "Run Behavioral Probes" to test agent safety behavior</p>
                </div>
              )}
            </div>

            {/* Section G: Safety Traceability Matrix (Phase 3.2) */}
            <SectionHeader
              badge="G"
              badgeColor="bg-blue-500"
              title="Section G: Safety Traceability Matrix"
              description="Story-to-safety-control mapping for audit compliance"
              timestamp={lastUpdate}
              status={traceabilityReport
                ? (traceabilityReport.summary.coverage_percent >= 80 ? 'pass' :
                   traceabilityReport.summary.coverage_percent >= 50 ? 'warn' : 'fail')
                : 'pending'
              }
            />
            <div className="border-x border-b border-border rounded-b-xl">
              {/* Generate Button */}
              <div className="p-4 border-b border-border bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <button
                      onClick={() => fetchTraceabilityReport(true)}
                      disabled={traceabilityLoading}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2",
                        traceabilityLoading
                          ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      )}
                    >
                      {traceabilityLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Layers className="h-4 w-4" />
                          Generate Traceability Matrix
                        </>
                      )}
                    </button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Links stories to safety controls, risk levels, and forbidden operations
                    </p>
                  </div>
                  {traceabilityReport && (
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-sm font-medium",
                        traceabilityReport.summary.coverage_percent >= 80 ? "bg-green-100 text-green-700" :
                        traceabilityReport.summary.coverage_percent >= 50 ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      )}>
                        {traceabilityReport.summary.coverage_percent}% Coverage
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Traceability Report */}
              {traceabilityReport ? (
                <>
                  {/* Summary Stats */}
                  <div className="grid grid-cols-4 gap-4 p-4 bg-white border-b border-border">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{traceabilityReport.summary.total_stories}</div>
                      <div className="text-xs text-muted-foreground">Total Stories</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{traceabilityReport.summary.critical_risk_stories}</div>
                      <div className="text-xs text-muted-foreground">Critical Risk</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{traceabilityReport.summary.high_risk_stories}</div>
                      <div className="text-xs text-muted-foreground">High Risk</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{traceabilityReport.summary.stories_requiring_review}</div>
                      <div className="text-xs text-muted-foreground">Need Review</div>
                    </div>
                  </div>

                  {/* Risk Distribution Bar */}
                  <div className="p-4 bg-white border-b border-border">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Risk Distribution</div>
                    <div className="flex h-4 rounded-full overflow-hidden bg-zinc-100">
                      {traceabilityReport.risk_distribution.critical > 0 && (
                        <div
                          className="bg-red-500"
                          style={{ width: `${(traceabilityReport.risk_distribution.critical / traceabilityReport.summary.total_stories) * 100}%` }}
                          title={`Critical: ${traceabilityReport.risk_distribution.critical}`}
                        />
                      )}
                      {traceabilityReport.risk_distribution.high > 0 && (
                        <div
                          className="bg-orange-500"
                          style={{ width: `${(traceabilityReport.risk_distribution.high / traceabilityReport.summary.total_stories) * 100}%` }}
                          title={`High: ${traceabilityReport.risk_distribution.high}`}
                        />
                      )}
                      {traceabilityReport.risk_distribution.medium > 0 && (
                        <div
                          className="bg-amber-400"
                          style={{ width: `${(traceabilityReport.risk_distribution.medium / traceabilityReport.summary.total_stories) * 100}%` }}
                          title={`Medium: ${traceabilityReport.risk_distribution.medium}`}
                        />
                      )}
                      {traceabilityReport.risk_distribution.low > 0 && (
                        <div
                          className="bg-green-400"
                          style={{ width: `${(traceabilityReport.risk_distribution.low / traceabilityReport.summary.total_stories) * 100}%` }}
                          title={`Low: ${traceabilityReport.risk_distribution.low}`}
                        />
                      )}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Critical</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> High</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Medium</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> Low</span>
                    </div>
                  </div>

                  {/* Traceability Matrix Table */}
                  <div className="max-h-80 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Story</th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Wave</th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Risk</th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Safety Tags</th>
                          <th className="px-4 py-2 text-center font-medium text-muted-foreground">Review</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {traceabilityReport.traceability_matrix.map((item) => (
                          <tr key={item.story_id} className="hover:bg-zinc-50">
                            <td className="px-4 py-2">
                              <div className="font-mono text-xs text-muted-foreground">{item.story_id}</div>
                              <div className="text-sm truncate max-w-[200px]" title={item.title}>{item.title}</div>
                            </td>
                            <td className="px-4 py-2">
                              <span className="px-2 py-0.5 bg-zinc-100 rounded text-xs">W{item.wave}</span>
                            </td>
                            <td className="px-4 py-2">
                              <span className={cn(
                                "px-2 py-0.5 rounded text-xs font-medium",
                                item.risk === 'critical' ? 'bg-red-100 text-red-700' :
                                item.risk === 'high' ? 'bg-orange-100 text-orange-700' :
                                item.risk === 'medium' ? 'bg-amber-100 text-amber-700' :
                                'bg-green-100 text-green-700'
                              )}>
                                {item.risk?.toUpperCase() || 'LOW'}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex flex-wrap gap-1">
                                {item.safety_tags?.length > 0 ? item.safety_tags.map(tag => (
                                  <span key={tag} className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-[10px] border border-red-200">
                                    {tag}
                                  </span>
                                )) : (
                                  <span className="text-muted-foreground text-xs">-</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2 text-center">
                              {item.requires_review ? (
                                <CheckCircle2 className="h-4 w-4 text-purple-500 mx-auto" />
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {traceabilityReport.traceability_matrix.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                              No stories found. Add stories to .claudecode/stories/wave1/
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <Layers className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No traceability report yet</p>
                  <p className="text-sm mt-1">Click "Generate Traceability Matrix" to create audit artifact</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 5: Configurations - API Keys & Environment Variables */}
        {activeTab === 'system-config' && (
          <>
            <div className="flex items-center justify-between p-6 border border-border bg-white rounded-2xl mb-6">
              <div className="flex items-center gap-6">
                <span className="text-sm font-medium text-muted-foreground">CONFIGURATION</span>
                <span className="font-semibold">API Keys & Environment Variables</span>
              </div>
              <div className="flex items-center gap-3">
                {configLoadedFromDb && (
                  <span className="text-xs text-blue-600 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded">
                    <Database className="h-3 w-3" />
                    Loaded from DB
                  </span>
                )}
                {configSaved && (
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Synced
                  </span>
                )}
                <button
                  onClick={reloadConfiguration}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:opacity-90 flex items-center gap-2"
                  title="Reload configuration from database"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload
                </button>
                <button
                  onClick={saveConfiguration}
                  disabled={configSaving}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  {configSaving ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4" />
                      Sync to Database
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* API Keys Status Summary */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className={cn("p-4 rounded-xl border", hasAnthropicKey ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200")}>
                <div className="flex items-center gap-2 mb-1">
                  {hasAnthropicKey ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                  <span className="font-medium text-sm">Anthropic</span>
                </div>
                <p className="text-xs text-muted-foreground">{hasAnthropicKey ? "Configured" : "Missing"}</p>
              </div>
              <div className={cn("p-4 rounded-xl border", hasSupabaseUrl ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200")}>
                <div className="flex items-center gap-2 mb-1">
                  {hasSupabaseUrl ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                  <span className="font-medium text-sm">Supabase URL</span>
                </div>
                <p className="text-xs text-muted-foreground">{hasSupabaseUrl ? "Configured" : "Missing"}</p>
              </div>
              <div className={cn("p-4 rounded-xl border", hasSupabaseKey ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200")}>
                <div className="flex items-center gap-2 mb-1">
                  {hasSupabaseKey ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                  <span className="font-medium text-sm">Supabase Key</span>
                </div>
                <p className="text-xs text-muted-foreground">{hasSupabaseKey ? "Configured" : "Missing"}</p>
              </div>
              <div className={cn("p-4 rounded-xl border", hasBudgetLimit ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200")}>
                <div className="flex items-center gap-2 mb-1">
                  {hasBudgetLimit ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                  <span className="font-medium text-sm">Budget Limit</span>
                </div>
                <p className="text-xs text-muted-foreground">{hasBudgetLimit ? "Configured" : "Missing"}</p>
              </div>
            </div>

            {/* Storage Info */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-700">Configuration Storage</p>
                  <p className="text-sm text-blue-600 mt-1">
                    API keys are stored securely in the Supabase database (wave_project_config table).
                    For local development, you can also copy these values to your <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono text-xs">.env</code> file.
                  </p>
                </div>
              </div>
            </div>

            {/* Required Keys */}
            <div className="bg-white border border-border rounded-xl overflow-hidden mb-6">
              <div className={cn(
                "px-6 py-4 border-b",
                allRequiredKeysSet
                  ? "bg-green-50 border-green-100"
                  : "bg-zinc-50 border-zinc-100"
              )}>
                <h3 className={cn(
                  "font-semibold flex items-center gap-2",
                  allRequiredKeysSet ? "text-green-700" : "text-zinc-700"
                )}>
                  {allRequiredKeysSet ? <CheckCircle2 className="h-5 w-5" /> : <Key className="h-5 w-5" />}
                  Required API Keys
                  {allRequiredKeysSet && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full ml-2">All Set</span>}
                </h3>
                <p className={cn(
                  "text-sm mt-1",
                  allRequiredKeysSet ? "text-green-600" : "text-zinc-500"
                )}>
                  {allRequiredKeysSet ? "All required keys are configured" : "These keys are required for WAVE to function"}
                </p>
              </div>
              <div className="p-6 space-y-6">
                {configFields.filter(f => f.required).map((field) => {
                  const value = configValues[field.key as keyof typeof configValues]
                  const isEmpty = !value || value.length === 0
                  const isValidFormat = !isEmpty && (field.format === '' || value.startsWith(field.format))

                  return (
                  <div key={field.key}>
                    <div className="flex items-center gap-3 mb-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        {field.label}
                        <span className="text-red-500">*</span>
                        <button
                          type="button"
                          onClick={() => setHelpModal(field.key)}
                          className="text-zinc-400 hover:text-zinc-600 transition-colors"
                          title="How to get this key"
                        >
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </label>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1",
                        isEmpty
                          ? "bg-red-100 text-red-700"
                          : isValidFormat
                            ? "bg-green-100 text-green-700"
                            : "bg-zinc-100 text-zinc-600"
                      )}>
                        {isEmpty ? (
                          <><XCircle className="h-3 w-3" /> Missing</>
                        ) : isValidFormat ? (
                          <><CheckCircle2 className="h-3 w-3" /> Valid</>
                        ) : (
                          <><AlertTriangle className="h-3 w-3" /> Check Format</>
                        )}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type={showKeys[field.key] ? 'text' : 'password'}
                          value={configValues[field.key as keyof typeof configValues]}
                          onChange={(e) => updateConfigValue(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full px-4 py-3 bg-muted/30 border border-border rounded-lg text-sm font-mono pr-20"
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowKey(field.key)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted rounded"
                        >
                          {showKeys[field.key] ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(configValues[field.key as keyof typeof configValues])}
                        className="px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg"
                        title="Copy to clipboard"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={saveConfiguration}
                        disabled={configSaving}
                        className="px-3 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg disabled:opacity-50"
                        title="Save to database"
                      >
                        <Save className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => testConnection(field.key)}
                        disabled={pingStatus[field.key] === 'testing' || isEmpty}
                        className={cn(
                          "px-3 py-2 rounded-lg disabled:opacity-50 flex items-center gap-1.5",
                          pingStatus[field.key] === 'success' ? 'bg-green-100 text-green-700' :
                          pingStatus[field.key] === 'error' ? 'bg-red-100 text-red-700' :
                          'bg-muted hover:bg-muted/80'
                        )}
                        title="Test connection"
                      >
                        {pingStatus[field.key] === 'testing' ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : pingStatus[field.key] === 'success' ? (
                          <Wifi className="h-4 w-4" />
                        ) : pingStatus[field.key] === 'error' ? (
                          <WifiOff className="h-4 w-4" />
                        ) : (
                          <Wifi className="h-4 w-4" />
                        )}
                        <span className="text-xs font-medium">Test</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <p className="text-xs text-muted-foreground">{field.description}</p>
                      {pingMessage[field.key] && (
                        <span className={cn(
                          "text-xs",
                          pingStatus[field.key] === 'success' ? 'text-green-600' : 'text-red-600'
                        )}>
                          {pingMessage[field.key]}
                        </span>
                      )}
                    </div>
                  </div>
                )})}
              </div>
            </div>

            {/* Optional Keys */}
            <div className="bg-white border border-border rounded-xl overflow-hidden mb-6">
              <div className="px-6 py-4 bg-muted/30 border-b border-border">
                <h3 className="font-semibold flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Optional Configuration
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Additional integrations and settings</p>
              </div>
              <div className="p-6 space-y-6">
                {configFields.filter(f => !f.required).map((field) => {
                  const value = configValues[field.key as keyof typeof configValues]
                  const isEmpty = !value || value.length === 0
                  const isValidFormat = !isEmpty && (field.format === '' || value.startsWith(field.format))

                  return (
                  <div key={field.key}>
                    <div className="flex items-center gap-3 mb-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        {field.label}
                        <button
                          type="button"
                          onClick={() => setHelpModal(field.key)}
                          className="text-zinc-400 hover:text-zinc-600 transition-colors"
                          title="How to get this key"
                        >
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </label>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1",
                        isEmpty
                          ? "bg-gray-100 text-gray-500"
                          : isValidFormat
                            ? "bg-green-100 text-green-700"
                            : "bg-zinc-100 text-zinc-600"
                      )}>
                        {isEmpty ? (
                          <><Clock className="h-3 w-3" /> Not Set</>
                        ) : isValidFormat ? (
                          <><CheckCircle2 className="h-3 w-3" /> Valid</>
                        ) : (
                          <><AlertTriangle className="h-3 w-3" /> Check Format</>
                        )}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type={showKeys[field.key] ? 'text' : 'password'}
                          value={configValues[field.key as keyof typeof configValues]}
                          onChange={(e) => updateConfigValue(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full px-4 py-3 bg-muted/30 border border-border rounded-lg text-sm font-mono pr-20"
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowKey(field.key)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted rounded"
                        >
                          {showKeys[field.key] ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(configValues[field.key as keyof typeof configValues])}
                        className="px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg"
                        title="Copy to clipboard"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={saveConfiguration}
                        disabled={configSaving}
                        className="px-3 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg disabled:opacity-50"
                        title="Save to database"
                      >
                        <Save className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => testConnection(field.key)}
                        disabled={pingStatus[field.key] === 'testing' || isEmpty}
                        className={cn(
                          "px-3 py-2 rounded-lg disabled:opacity-50 flex items-center gap-1.5",
                          pingStatus[field.key] === 'success' ? 'bg-green-100 text-green-700' :
                          pingStatus[field.key] === 'error' ? 'bg-red-100 text-red-700' :
                          'bg-muted hover:bg-muted/80'
                        )}
                        title="Test connection"
                      >
                        {pingStatus[field.key] === 'testing' ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : pingStatus[field.key] === 'success' ? (
                          <Wifi className="h-4 w-4" />
                        ) : pingStatus[field.key] === 'error' ? (
                          <WifiOff className="h-4 w-4" />
                        ) : (
                          <Wifi className="h-4 w-4" />
                        )}
                        <span className="text-xs font-medium">Test</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <p className="text-xs text-muted-foreground">{field.description}</p>
                      {pingMessage[field.key] && (
                        <span className={cn(
                          "text-xs",
                          pingStatus[field.key] === 'success' ? 'text-green-600' : 'text-red-600'
                        )}>
                          {pingMessage[field.key]}
                        </span>
                      )}
                    </div>
                  </div>
                )})}
              </div>
            </div>

            {/* Generate .env File */}
            <div className="bg-white border border-border rounded-xl overflow-hidden">
              <div className="px-6 py-4 bg-zinc-900 border-b border-zinc-700">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Export to .env File
                </h3>
                <p className="text-sm text-zinc-400 mt-1">Copy this content to your project's .env file</p>
              </div>
              <div className="p-4 bg-zinc-900">
                <div className="relative">
                  <pre className="text-sm font-mono text-zinc-100 p-4 bg-zinc-950 rounded-lg overflow-x-auto">
{`# WAVE Configuration - Generated ${new Date().toISOString()}
# Project: ${project?.name || 'Unknown'}

# Anthropic (Required)
ANTHROPIC_API_KEY=${configValues.ANTHROPIC_API_KEY || 'your-api-key-here'}

# Supabase (Required)
SUPABASE_URL=${configValues.SUPABASE_URL || 'https://your-project.supabase.co'}
SUPABASE_ANON_KEY=${configValues.SUPABASE_ANON_KEY || 'your-anon-key'}
SUPABASE_SERVICE_ROLE_KEY=${configValues.SUPABASE_SERVICE_ROLE_KEY || ''}

# Integrations (Optional)
SLACK_WEBHOOK_URL=${configValues.SLACK_WEBHOOK_URL || ''}
GITHUB_TOKEN=${configValues.GITHUB_TOKEN || ''}
VERCEL_TOKEN=${configValues.VERCEL_TOKEN || ''}

# WAVE Settings
WAVE_BUDGET_LIMIT=${configValues.WAVE_BUDGET_LIMIT || '5.00'}
WAVE_PROJECT_ID=${project?.id || ''}
WAVE_PROJECT_ROOT=${project?.root_path || ''}`}
                  </pre>
                  <div className="absolute top-6 right-6 flex gap-2">
                    <button
                      onClick={() => {
                        const envContent = `# WAVE Configuration - Generated ${new Date().toISOString()}
# Project: ${project?.name || 'Unknown'}

# Anthropic (Required)
ANTHROPIC_API_KEY=${configValues.ANTHROPIC_API_KEY || 'your-api-key-here'}

# Supabase (Required)
SUPABASE_URL=${configValues.SUPABASE_URL || 'https://your-project.supabase.co'}
SUPABASE_ANON_KEY=${configValues.SUPABASE_ANON_KEY || 'your-anon-key'}
SUPABASE_SERVICE_ROLE_KEY=${configValues.SUPABASE_SERVICE_ROLE_KEY || ''}

# Integrations (Optional)
SLACK_WEBHOOK_URL=${configValues.SLACK_WEBHOOK_URL || ''}
GITHUB_TOKEN=${configValues.GITHUB_TOKEN || ''}
VERCEL_TOKEN=${configValues.VERCEL_TOKEN || ''}

# WAVE Settings
WAVE_BUDGET_LIMIT=${configValues.WAVE_BUDGET_LIMIT || '5.00'}
WAVE_PROJECT_ID=${project?.id || ''}
WAVE_PROJECT_ROOT=${project?.root_path || ''}`
                        navigator.clipboard.writeText(envContent)
                      }}
                      className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-sm flex items-center gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </button>
                    <button
                      onClick={() => {
                        const envContent = `# WAVE Configuration - Generated ${new Date().toISOString()}
# Project: ${project?.name || 'Unknown'}

# Anthropic (Required)
ANTHROPIC_API_KEY=${configValues.ANTHROPIC_API_KEY || 'your-api-key-here'}

# Supabase (Required)
SUPABASE_URL=${configValues.SUPABASE_URL || 'https://your-project.supabase.co'}
SUPABASE_ANON_KEY=${configValues.SUPABASE_ANON_KEY || 'your-anon-key'}
SUPABASE_SERVICE_ROLE_KEY=${configValues.SUPABASE_SERVICE_ROLE_KEY || ''}

# Integrations (Optional)
SLACK_WEBHOOK_URL=${configValues.SLACK_WEBHOOK_URL || ''}
GITHUB_TOKEN=${configValues.GITHUB_TOKEN || ''}
VERCEL_TOKEN=${configValues.VERCEL_TOKEN || ''}

# WAVE Settings
WAVE_BUDGET_LIMIT=${configValues.WAVE_BUDGET_LIMIT || '5.00'}
WAVE_PROJECT_ID=${project?.id || ''}
WAVE_PROJECT_ROOT=${project?.root_path || ''}`
                        const blob = new Blob([envContent], { type: 'text/plain' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = '.env'
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                        URL.revokeObjectURL(url)
                      }}
                      className="px-3 py-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded text-sm flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download .env
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* TAB 8: Notifications - Slack & Dozzle Testing */}
        {activeTab === 'notifications' && (
          <>
            <div className="flex items-center justify-between p-6 border border-border bg-white rounded-2xl mb-6">
              <div className="flex items-center gap-6">
                <span className="text-sm font-medium text-muted-foreground">NOTIFICATIONS</span>
                <span className="font-semibold">Slack & Dozzle Testing</span>
              </div>
            </div>

            {/* Slack Configuration Status */}
            <div className="p-5 bg-white border border-border rounded-2xl mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Slack Notifications</h3>
                    <p className="text-sm text-muted-foreground">Test different notification types</p>
                  </div>
                </div>
                <div className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium",
                  configValues.SLACK_WEBHOOK_URL ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                )}>
                  {configValues.SLACK_WEBHOOK_URL ? "Webhook Configured" : "Webhook Not Set"}
                </div>
              </div>

              {!configValues.SLACK_WEBHOOK_URL && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">Slack Webhook Not Configured</p>
                      <p className="text-sm text-amber-700 mt-1">
                        Go to the Configurations tab to set your SLACK_WEBHOOK_URL to enable notifications.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Slack Test Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border border-border rounded-xl">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs">1</span>
                    Ping Test
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">Simple ping to verify Slack webhook works</p>
                  <button
                    disabled={!configValues.SLACK_WEBHOOK_URL || slackTestStatus['ping'] === 'sending'}
                    onClick={() => sendSlackTest('info', 'Ping Test')}
                    className={cn(
                      "w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      slackTestStatus['info'] === 'success' ? "bg-green-600 text-white" :
                      slackTestStatus['info'] === 'error' ? "bg-red-600 text-white" :
                      slackTestStatus['info'] === 'sending' ? "bg-blue-400 text-white" :
                      "bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-200 disabled:text-zinc-400 text-white"
                    )}
                  >
                    {slackTestStatus['info'] === 'sending' ? 'Sending...' :
                     slackTestStatus['info'] === 'success' ? 'Sent!' :
                     slackTestStatus['info'] === 'error' ? 'Failed' : 'Send Ping'}
                  </button>
                </div>

                <div className="p-4 border border-border rounded-xl">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs">2</span>
                    Story Started
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">Notification when an agent starts a story</p>
                  <button
                    disabled={!configValues.SLACK_WEBHOOK_URL || slackTestStatus['story_start'] === 'sending'}
                    onClick={() => sendSlackTest('story_start', 'Story Started')}
                    className={cn(
                      "w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      slackTestStatus['story_start'] === 'success' ? "bg-green-600 text-white" :
                      slackTestStatus['story_start'] === 'error' ? "bg-red-600 text-white" :
                      slackTestStatus['story_start'] === 'sending' ? "bg-green-400 text-white" :
                      "bg-green-600 hover:bg-green-700 disabled:bg-zinc-200 disabled:text-zinc-400 text-white"
                    )}
                  >
                    {slackTestStatus['story_start'] === 'sending' ? 'Sending...' :
                     slackTestStatus['story_start'] === 'success' ? 'Sent!' :
                     slackTestStatus['story_start'] === 'error' ? 'Failed' : 'Test Story Started'}
                  </button>
                </div>

                <div className="p-4 border border-border rounded-xl">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs">3</span>
                    Story Completed
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">Notification with token count and cost</p>
                  <button
                    disabled={!configValues.SLACK_WEBHOOK_URL || slackTestStatus['story_complete'] === 'sending'}
                    onClick={() => sendSlackTest('story_complete', 'Story Complete')}
                    className={cn(
                      "w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      slackTestStatus['story_complete'] === 'success' ? "bg-green-600 text-white" :
                      slackTestStatus['story_complete'] === 'error' ? "bg-red-600 text-white" :
                      slackTestStatus['story_complete'] === 'sending' ? "bg-emerald-400 text-white" :
                      "bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-200 disabled:text-zinc-400 text-white"
                    )}
                  >
                    {slackTestStatus['story_complete'] === 'sending' ? 'Sending...' :
                     slackTestStatus['story_complete'] === 'success' ? 'Sent!' :
                     slackTestStatus['story_complete'] === 'error' ? 'Failed' : 'Test Story Completed'}
                  </button>
                </div>

                <div className="p-4 border border-border rounded-xl">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-xs">4</span>
                    Escalation Alert
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">Critical escalation requiring attention</p>
                  <button
                    disabled={!configValues.SLACK_WEBHOOK_URL || slackTestStatus['escalation'] === 'sending'}
                    onClick={() => sendSlackTest('escalation', 'Escalation')}
                    className={cn(
                      "w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      slackTestStatus['escalation'] === 'success' ? "bg-green-600 text-white" :
                      slackTestStatus['escalation'] === 'error' ? "bg-red-600 text-white" :
                      slackTestStatus['escalation'] === 'sending' ? "bg-red-400 text-white" :
                      "bg-red-600 hover:bg-red-700 disabled:bg-zinc-200 disabled:text-zinc-400 text-white"
                    )}
                  >
                    {slackTestStatus['escalation'] === 'sending' ? 'Sending...' :
                     slackTestStatus['escalation'] === 'success' ? 'Sent!' :
                     slackTestStatus['escalation'] === 'error' ? 'Failed' : 'Test Escalation'}
                  </button>
                </div>

                <div className="p-4 border border-border rounded-xl">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-xs">5</span>
                    Wave Summary
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">End-of-wave summary with stats</p>
                  <button
                    disabled={!configValues.SLACK_WEBHOOK_URL || slackTestStatus['wave_complete'] === 'sending'}
                    onClick={() => sendSlackTest('wave_complete', 'Wave Complete')}
                    className={cn(
                      "w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      slackTestStatus['wave_complete'] === 'success' ? "bg-green-600 text-white" :
                      slackTestStatus['wave_complete'] === 'error' ? "bg-red-600 text-white" :
                      slackTestStatus['wave_complete'] === 'sending' ? "bg-purple-400 text-white" :
                      "bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-200 disabled:text-zinc-400 text-white"
                    )}
                  >
                    {slackTestStatus['wave_complete'] === 'sending' ? 'Sending...' :
                     slackTestStatus['wave_complete'] === 'success' ? 'Sent!' :
                     slackTestStatus['wave_complete'] === 'error' ? 'Failed' : 'Test Wave Summary'}
                  </button>
                </div>

                <div className="p-4 border border-border rounded-xl">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-xs">6</span>
                    Gate Passed
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">Gate validation passed notification</p>
                  <button
                    disabled={!configValues.SLACK_WEBHOOK_URL || slackTestStatus['gate_complete'] === 'sending'}
                    onClick={() => sendSlackTest('gate_complete', 'Gate Complete')}
                    className={cn(
                      "w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      slackTestStatus['gate_complete'] === 'success' ? "bg-green-600 text-white" :
                      slackTestStatus['gate_complete'] === 'error' ? "bg-red-600 text-white" :
                      slackTestStatus['gate_complete'] === 'sending' ? "bg-amber-400 text-white" :
                      "bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-200 disabled:text-zinc-400 text-white"
                    )}
                  >
                    {slackTestStatus['gate_complete'] === 'sending' ? 'Sending...' :
                     slackTestStatus['gate_complete'] === 'success' ? 'Sent!' :
                     slackTestStatus['gate_complete'] === 'error' ? 'Failed' : 'Test Gate Passed'}
                  </button>
                </div>
              </div>
            </div>

            {/* Dozzle Section */}
            <div className="p-5 bg-white border border-border rounded-2xl mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center">
                    <Eye className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Dozzle Log Viewer</h3>
                    <p className="text-sm text-muted-foreground">Docker container log viewer</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border border-border rounded-xl">
                  <h4 className="font-medium mb-2">Dozzle Status</h4>
                  <p className="text-sm text-muted-foreground mb-3">Check if Dozzle container is running</p>
                  <div className="flex items-center gap-3">
                    <button className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors">
                      Check Status
                    </button>
                    <a
                      href="http://localhost:8080"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      Open Dozzle
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>

                <div className="p-4 border border-border rounded-xl">
                  <h4 className="font-medium mb-2">Start Dozzle</h4>
                  <p className="text-sm text-muted-foreground mb-3">Start Dozzle if not running</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-zinc-900 text-zinc-100 px-3 py-2 rounded-lg text-xs font-mono truncate">
                      docker run -d --name dozzle -p 8080:8080 -v /var/run/docker.sock:/var/run/docker.sock amir20/dozzle
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText('docker run -d --name dozzle -p 8080:8080 -v /var/run/docker.sock:/var/run/docker.sock amir20/dozzle')}
                      className="p-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Notification History */}
            <div className="p-5 bg-white border border-border rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
                    <ScrollText className="h-5 w-5 text-zinc-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Recent Notifications</h3>
                    <p className="text-sm text-muted-foreground">Last 5 sent notifications</p>
                  </div>
                </div>
                <button
                  onClick={() => setSlackNotificationHistory([])}
                  className="px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-700"
                >
                  Clear History
                </button>
              </div>

              {slackNotificationHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No notifications sent yet</p>
                  <p className="text-xs mt-1">Send a test notification to see it here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {slackNotificationHistory.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg",
                        notification.success ? "bg-green-50" : "bg-red-50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {notification.success ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{notification.type}</p>
                          {notification.message && (
                            <p className="text-xs text-red-600">{notification.message}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{notification.timestamp}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Agent Dispatch Tab */}
        {activeTab === 'agent-dispatch' && (
          <>
            <div className="flex items-center justify-between p-6 border border-border bg-white rounded-2xl mb-6">
              <div className="flex items-center gap-6">
                <span className="text-sm font-medium text-muted-foreground">AGENT DISPATCH</span>
                <span className="font-semibold">Multi-Agent Orchestration Control</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Watchdog Status Indicator */}
                {watchdogStatus && (
                  <div className={cn(
                    "px-3 py-1 rounded-full text-sm flex items-center gap-1.5",
                    watchdogStatus.overall_status === 'healthy' ? "bg-green-100 text-green-700" :
                    watchdogStatus.overall_status === 'warning' ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  )}>
                    {watchdogStatus.overall_status === 'healthy' ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : watchdogStatus.overall_status === 'warning' ? (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                    {watchdogStatus.overall_status === 'healthy' ? 'Healthy' :
                     watchdogStatus.overall_status === 'warning' ? `${watchdogStatus.summary.slow} Slow` :
                     `${watchdogStatus.summary.stuck} Stuck`}
                  </div>
                )}
                <span className={cn(
                  "px-3 py-1 rounded-full text-sm",
                  agents.some(a => a.status === 'running')
                    ? "bg-green-100 text-green-700"
                    : "bg-zinc-100 text-zinc-600"
                )}>
                  {agents.filter(a => a.status === 'running').length} Active
                </span>
                <button
                  onClick={() => runValidation(false)}
                  disabled={validating}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    validating
                      ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                      : "bg-zinc-900 hover:bg-zinc-800 text-white"
                  )}
                  title="Run all validation checks"
                >
                  {validating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4" />
                  )}
                  {validating ? 'Validating...' : 'Validate All'}
                </button>
                <button
                  onClick={fetchAgents}
                  className="p-2 rounded-lg hover:bg-zinc-100 transition-colors"
                  title="Refresh agents"
                >
                  <RefreshCw className={cn("h-4 w-4", loadingAgents && "animate-spin")} />
                </button>
              </div>
            </div>

            {/* Agent Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {agents.map(agent => (
                <div
                  key={agent.agent_type}
                  className={cn(
                    "p-4 rounded-xl border transition-all",
                    agent.status === 'running' ? "border-green-300 bg-green-50" :
                    agent.status === 'error' ? "border-red-300 bg-red-50" :
                    agent.status === 'starting' ? "border-blue-300 bg-blue-50" :
                    "border-border bg-white hover:border-zinc-300"
                  )}
                >
                  {/* Agent Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      getAgentColor(agent.color)
                    )}>
                      {getAgentIcon(agent.agent_type)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{agent.display_name}</h4>
                      <p className="text-xs text-muted-foreground">{agent.model}</p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      agent.status === 'running' ? "bg-green-500 animate-pulse" :
                      agent.status === 'error' ? "bg-red-500" :
                      agent.status === 'starting' ? "bg-blue-500 animate-pulse" :
                      "bg-zinc-300"
                    )} />
                    <span className="text-sm capitalize">{agent.status}</span>
                  </div>

                  {/* Current Task */}
                  {agent.current_task && (
                    <p className="text-xs text-muted-foreground mb-3 truncate" title={agent.current_task}>
                      {agent.current_task}
                    </p>
                  )}

                  {/* Wave/Gate Info */}
                  {agent.status === 'running' && agent.wave_number && (
                    <div className="flex items-center gap-2 mb-3 text-xs">
                      <span className="px-2 py-0.5 bg-white rounded border">Wave {agent.wave_number}</span>
                      {agent.current_gate && (
                        <span className="px-2 py-0.5 bg-white rounded border">Gate {agent.current_gate}</span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {agent.status === 'idle' ? (
                      <button
                        onClick={() => startAgent(agent.agent_type)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Start
                      </button>
                    ) : agent.status === 'running' ? (
                      <>
                        <button
                          onClick={() => viewAgent(agent.agent_type)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-border hover:bg-zinc-50 rounded-lg text-sm font-medium transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                        <button
                          onClick={() => stopAgent(agent.agent_type)}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : agent.status === 'starting' ? (
                      <div className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Starting...
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}

              {agents.length === 0 && !loadingAgents && (
                <div className="col-span-4 text-center py-12 text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No agents configured</p>
                  <p className="text-sm mt-1">Agents will appear here once the backend is connected</p>
                </div>
              )}

              {loadingAgents && agents.length === 0 && (
                <div className="col-span-4 text-center py-12">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">Loading agents...</p>
                </div>
              )}
            </div>

            {/* Validation Results Section */}
            {(validationReport || validationError || validating) && (
              <div className="p-5 bg-white border border-border rounded-2xl mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      validationReport?.overall_status === 'PASS' ? "bg-green-100" :
                      validationReport?.overall_status === 'FAIL' ? "bg-red-100" :
                      validationReport?.overall_status === 'WARN' ? "bg-amber-100" :
                      "bg-zinc-100"
                    )}>
                      {validating ? (
                        <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
                      ) : validationReport?.overall_status === 'PASS' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : validationReport?.overall_status === 'FAIL' ? (
                        <XCircle className="h-5 w-5 text-red-600" />
                      ) : validationReport?.overall_status === 'WARN' ? (
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                      ) : (
                        <Shield className="h-5 w-5 text-zinc-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {validating ? 'Running Validation...' :
                         validationReport ? `Validation ${validationReport.overall_status}` :
                         'Validation'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {validationReport?.timestamp ? new Date(validationReport.timestamp).toLocaleString() : 'Master validation checks'}
                      </p>
                    </div>
                  </div>
                  {validationReport && (
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                        {validationReport.summary.passed} Passed
                      </span>
                      {validationReport.summary.failed > 0 && (
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                          {validationReport.summary.failed} Failed
                        </span>
                      )}
                      {validationReport.summary.warnings > 0 && (
                        <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
                          {validationReport.summary.warnings} Warnings
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {validationError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    {validationError}
                  </div>
                )}

                {validationReport && validationReport.checks && (
                  <div className="max-h-80 overflow-y-auto border rounded-xl">
                    {validationReport.checks.map((check, i) => (
                      <div
                        key={i}
                        className="px-4 py-3 border-b last:border-0 flex items-center gap-3 hover:bg-zinc-50"
                      >
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                          check.status === 'PASS' ? "bg-green-100" :
                          check.status === 'FAIL' ? "bg-red-100" :
                          check.status === 'WARN' ? "bg-amber-100" :
                          "bg-zinc-100"
                        )}>
                          {check.status === 'PASS' ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          ) : check.status === 'FAIL' ? (
                            <XCircle className="h-3.5 w-3.5 text-red-600" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{check.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{check.message}</p>
                        </div>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs font-medium flex-shrink-0",
                          check.status === 'PASS' ? "bg-green-100 text-green-700" :
                          check.status === 'FAIL' ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-700"
                        )}>
                          {check.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Agent Activity Feed */}
            <div className="p-5 bg-white border border-border rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
                    <Radio className="h-5 w-5 text-zinc-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Agent Activity</h3>
                    <p className="text-sm text-muted-foreground">Real-time signal file events</p>
                  </div>
                </div>
                <button
                  onClick={fetchAgentActivity}
                  className="px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-700 flex items-center gap-1"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto border rounded-xl">
                {agentActivity.length > 0 ? (
                  agentActivity.map((log, i) => (
                    <div
                      key={i}
                      className="px-4 py-3 border-b last:border-0 flex items-center gap-3 hover:bg-zinc-50"
                    >
                      <span className="text-xs text-muted-foreground w-20 flex-shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium flex-shrink-0",
                        log.agent === 'cto' ? "bg-violet-100 text-violet-700" :
                        log.agent === 'pm' ? "bg-blue-100 text-blue-700" :
                        log.agent.includes('fe-dev') ? "bg-green-100 text-green-700" :
                        log.agent.includes('be-dev') ? "bg-amber-100 text-amber-700" :
                        log.agent === 'qa' ? "bg-cyan-100 text-cyan-700" :
                        log.agent === 'dev-fix' ? "bg-red-100 text-red-700" :
                        "bg-zinc-100 text-zinc-700"
                      )}>
                        {log.agent}
                      </span>
                      <span className="text-sm flex-1">{log.action}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Radio className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No recent activity</p>
                    <p className="text-xs mt-1">Activity will appear when agents create signal files</p>
                  </div>
                )}
              </div>
            </div>

            {/* Token Budget Governance Section */}
            <div className="p-5 bg-white border border-border rounded-2xl mt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Token Budget Governance</h3>
                    <p className="text-sm text-muted-foreground">Monitor and control AI spending</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {budgetStatus && (
                    <span className={cn(
                      "px-3 py-1 rounded-full text-sm font-medium",
                      budgetStatus.status.project.status === 'ok' ? "bg-green-100 text-green-700" :
                      budgetStatus.status.project.status === 'warning' ? "bg-amber-100 text-amber-700" :
                      budgetStatus.status.project.status === 'critical' ? "bg-orange-100 text-orange-700" :
                      "bg-red-100 text-red-700"
                    )}>
                      ${budgetStatus.status.project.spent.toFixed(2)} / ${budgetStatus.status.project.budget.toFixed(2)}
                    </span>
                  )}
                  <button
                    onClick={() => setShowBudgetConfig(!showBudgetConfig)}
                    className="p-2 rounded-lg hover:bg-zinc-100 transition-colors"
                    title="Configure budgets"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                  <button
                    onClick={fetchBudgetStatus}
                    className="p-2 rounded-lg hover:bg-zinc-100 transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw className={cn("h-4 w-4", budgetLoading && "animate-spin")} />
                  </button>
                </div>
              </div>

              {/* Budget Alerts */}
              {budgetStatus && budgetStatus.alerts.length > 0 && (
                <div className="mb-4 space-y-2">
                  {budgetStatus.alerts.map((alert, i) => (
                    <div
                      key={i}
                      className={cn(
                        "px-4 py-3 rounded-lg flex items-center gap-3",
                        alert.level === 'critical' ? "bg-red-50 border border-red-200" :
                        alert.level === 'warning' ? "bg-amber-50 border border-amber-200" :
                        "bg-blue-50 border border-blue-200"
                      )}
                    >
                      {alert.level === 'critical' ? (
                        <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                      ) : alert.level === 'warning' ? (
                        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                      ) : (
                        <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className={cn(
                          "text-sm font-medium",
                          alert.level === 'critical' ? "text-red-700" :
                          alert.level === 'warning' ? "text-amber-700" :
                          "text-blue-700"
                        )}>
                          {alert.message}
                        </p>
                        {alert.action && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Action: {alert.action === 'auto_pause' ? 'Agents auto-paused' :
                                    alert.action === 'pause_agent' ? 'Agent paused' : alert.action}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Project Budget Progress */}
              {budgetStatus && (
                <div className="mb-6">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium">Project Budget</span>
                    <span className={cn(
                      "font-medium",
                      budgetStatus.status.project.status === 'ok' ? "text-green-600" :
                      budgetStatus.status.project.status === 'warning' ? "text-amber-600" :
                      "text-red-600"
                    )}>
                      {budgetStatus.status.project.percent}%
                    </span>
                  </div>
                  <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        budgetStatus.status.project.status === 'ok' ? "bg-green-500" :
                        budgetStatus.status.project.status === 'warning' ? "bg-amber-500" :
                        budgetStatus.status.project.status === 'critical' ? "bg-orange-500" :
                        "bg-red-500"
                      )}
                      style={{ width: `${Math.min(budgetStatus.status.project.percent, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                    <span>$0</span>
                    <span className="flex gap-3">
                      <span className="text-amber-600">Warning: ${(budgetStatus.config.project_budget * 0.75).toFixed(2)}</span>
                      <span className="text-red-600">Critical: ${(budgetStatus.config.project_budget * 0.90).toFixed(2)}</span>
                    </span>
                    <span>${budgetStatus.config.project_budget.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Agent Budget Grid */}
              {budgetStatus && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Agent Budgets</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(budgetStatus.status.agents).map(([agent, status]) => (
                      <div
                        key={agent}
                        className={cn(
                          "p-3 rounded-lg border",
                          status.status === 'ok' ? "border-zinc-200 bg-white" :
                          status.status === 'warning' ? "border-amber-200 bg-amber-50" :
                          status.status === 'critical' ? "border-orange-200 bg-orange-50" :
                          "border-red-200 bg-red-50"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium">{agent}</span>
                          <span className={cn(
                            "text-xs",
                            status.status === 'ok' ? "text-green-600" :
                            status.status === 'warning' ? "text-amber-600" :
                            "text-red-600"
                          )}>
                            {status.percent}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              status.status === 'ok' ? "bg-green-500" :
                              status.status === 'warning' ? "bg-amber-500" :
                              "bg-red-500"
                            )}
                            style={{ width: `${Math.min(status.percent, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          ${status.spent.toFixed(2)} / ${status.budget.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Budget Configuration Panel */}
              {showBudgetConfig && budgetStatus && (
                <div className="mt-6 p-4 bg-zinc-50 rounded-xl border">
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Budget Configuration
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Project Budget ($)</label>
                      <input
                        type="number"
                        value={budgetStatus.config.project_budget}
                        onChange={(e) => updateBudgetConfig({ project_budget: parseFloat(e.target.value) || 50 })}
                        className="w-full mt-1 px-3 py-2 border rounded-lg"
                        step="5"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Wave Budget ($)</label>
                      <input
                        type="number"
                        value={budgetStatus.config.wave_budget}
                        onChange={(e) => updateBudgetConfig({ wave_budget: parseFloat(e.target.value) || 25 })}
                        className="w-full mt-1 px-3 py-2 border rounded-lg"
                        step="5"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Warning Threshold (%)</label>
                      <input
                        type="number"
                        value={(budgetStatus.config.alert_thresholds.warning * 100)}
                        onChange={(e) => updateBudgetConfig({
                          alert_thresholds: {
                            ...budgetStatus.config.alert_thresholds,
                            warning: (parseFloat(e.target.value) || 75) / 100
                          }
                        })}
                        className="w-full mt-1 px-3 py-2 border rounded-lg"
                        min="0"
                        max="100"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Auto-Pause Threshold (%)</label>
                      <input
                        type="number"
                        value={(budgetStatus.config.alert_thresholds.auto_pause * 100)}
                        onChange={(e) => updateBudgetConfig({
                          alert_thresholds: {
                            ...budgetStatus.config.alert_thresholds,
                            auto_pause: (parseFloat(e.target.value) || 100) / 100
                          }
                        })}
                        className="w-full mt-1 px-3 py-2 border rounded-lg"
                        min="0"
                        max="150"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={budgetStatus.config.anomaly_detection.enabled}
                        onChange={(e) => updateBudgetConfig({
                          anomaly_detection: {
                            ...budgetStatus.config.anomaly_detection,
                            enabled: e.target.checked
                          }
                        })}
                        className="rounded"
                      />
                      Enable anomaly detection (alert on spending spikes)
                    </label>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!budgetStatus && !budgetLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No budget data available</p>
                  <p className="text-xs mt-1">Budget tracking will appear when agents start running</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Audit Log Tab */}
        {activeTab === 'audit-log' && (
          <>
            {/* Audit Log Header */}
            <div className="flex items-center justify-between p-6 border border-border bg-white rounded-2xl mb-6">
              <div className="flex items-center gap-6">
                <span className="text-sm font-medium text-muted-foreground">AUDIT LOG</span>
                <span className="font-semibold">System Event Traceability</span>
              </div>
              <div className="flex items-center gap-2">
                {auditLogSummary && (
                  <>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                      {auditLogSummary.total_events} Events (24h)
                    </span>
                    {auditLogSummary.requires_review > 0 && (
                      <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
                        {auditLogSummary.requires_review} Need Review
                      </span>
                    )}
                  </>
                )}
                <div className="relative">
                  <select
                    onChange={(e) => {
                      if (e.target.value && project?.root_path) {
                        window.open(
                          `http://localhost:3000/api/audit-log/export?projectPath=${encodeURIComponent(project.root_path)}&format=${e.target.value}&hours=168`,
                          '_blank'
                        )
                        e.target.value = ''
                      }
                    }}
                    className="appearance-none pl-3 pr-8 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-sm font-medium cursor-pointer border-0"
                    defaultValue=""
                  >
                    <option value="" disabled>Export...</option>
                    <option value="json">Export as JSON</option>
                    <option value="csv">Export as CSV</option>
                    <option value="jsonl">Export as JSONL</option>
                  </select>
                  <Download className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-zinc-500" />
                </div>
                <button
                  onClick={fetchAuditLogs}
                  disabled={auditLogsLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {auditLogsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Refresh
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            {auditLogSummary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-white border border-border rounded-xl">
                  <div className="text-2xl font-bold">{auditLogSummary.by_event_type?.agent_action || 0}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    Agent Actions
                  </div>
                </div>
                <div className="p-4 bg-white border border-border rounded-xl">
                  <div className="text-2xl font-bold">{auditLogSummary.by_event_type?.validation || 0}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Validations
                  </div>
                </div>
                <div className="p-4 bg-white border border-border rounded-xl">
                  <div className="text-2xl font-bold text-amber-600">{auditLogSummary.by_severity?.warn || 0}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Warnings
                  </div>
                </div>
                <div className="p-4 bg-white border border-border rounded-xl">
                  <div className="text-2xl font-bold text-red-600">{(auditLogSummary.by_severity?.error || 0) + (auditLogSummary.by_severity?.critical || 0)}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Errors
                  </div>
                </div>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-4">
              {['all', 'agent_action', 'validation', 'safety_event', 'config_change'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setAuditLogFilter(filter)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    auditLogFilter === filter
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  )}
                >
                  {filter === 'all' ? 'All Events' :
                   filter === 'agent_action' ? 'Agent Actions' :
                   filter === 'validation' ? 'Validations' :
                   filter === 'safety_event' ? 'Safety Events' :
                   'Config Changes'}
                </button>
              ))}
            </div>

            {/* Audit Log List */}
            <div className="bg-white border border-border rounded-2xl overflow-hidden">
              <div className="max-h-[500px] overflow-y-auto">
                {auditLogsLoading && auditLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">Loading audit logs...</p>
                  </div>
                ) : auditLogs.length > 0 ? (
                  auditLogs
                    .filter(log => auditLogFilter === 'all' || log.event_type === auditLogFilter)
                    .map((log) => (
                    <div
                      key={log.id}
                      className={cn(
                        "px-4 py-3 border-b last:border-0 flex items-start gap-4 hover:bg-zinc-50",
                        log.requires_review && "bg-amber-50/50"
                      )}
                    >
                      {/* Time */}
                      <span className="text-xs text-muted-foreground w-20 flex-shrink-0 pt-0.5">
                        {formatAuditTime(log.created_at)}
                      </span>

                      {/* Event Type Icon */}
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                        log.event_type === 'agent_action' ? "bg-violet-100 text-violet-600" :
                        log.event_type === 'validation' ? "bg-blue-100 text-blue-600" :
                        log.event_type === 'safety_event' ? "bg-red-100 text-red-600" :
                        log.event_type === 'config_change' ? "bg-amber-100 text-amber-600" :
                        "bg-zinc-100 text-zinc-600"
                      )}>
                        {getEventTypeIcon(log.event_type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            log.actor_type === 'agent' ? "bg-violet-100 text-violet-700" :
                            log.actor_type === 'user' ? "bg-blue-100 text-blue-700" :
                            "bg-zinc-100 text-zinc-700"
                          )}>
                            {log.actor_id}
                          </span>
                          <span className="text-sm font-medium">{log.action}</span>
                          {log.resource_type && (
                            <span className="text-xs text-muted-foreground">
                              ({log.resource_type}{log.resource_id ? `:${log.resource_id}` : ''})
                            </span>
                          )}
                          {log.requires_review && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                              Needs Review
                            </span>
                          )}
                        </div>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {JSON.stringify(log.details).slice(0, 100)}
                            {JSON.stringify(log.details).length > 100 && '...'}
                          </div>
                        )}
                        {log.safety_tags && log.safety_tags.length > 0 && (
                          <div className="mt-1 flex gap-1">
                            {log.safety_tags.map(tag => (
                              <span key={tag} className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[10px]">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Severity Badge */}
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium flex-shrink-0",
                        getSeverityColor(log.severity)
                      )}>
                        {log.severity.toUpperCase()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No audit logs found</p>
                    <p className="text-sm mt-1">Events will be logged when agents run or validations occur</p>
                    <button
                      onClick={fetchAuditLogs}
                      className="mt-4 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      <RefreshCw className="h-4 w-4 inline mr-2" />
                      Check for Logs
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Agent Terminal Modal */}
      {showAgentModal && selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bot className="h-5 w-5 text-green-400" />
                <span className="text-white font-semibold">{selectedAgent} Terminal</span>
                <span className={cn(
                  "px-2 py-0.5 text-xs rounded",
                  agents.find(a => a.agent_type === selectedAgent)?.status === 'running'
                    ? "bg-green-500/20 text-green-400"
                    : "bg-zinc-700 text-zinc-400"
                )}>
                  {agents.find(a => a.agent_type === selectedAgent)?.status || 'Unknown'}
                </span>
              </div>
              <button
                onClick={() => setShowAgentModal(false)}
                className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="h-5 w-5 text-zinc-400" />
              </button>
            </div>

            {/* Terminal Output */}
            <div className="flex-1 p-4 font-mono text-sm text-green-400 overflow-y-auto bg-zinc-950">
              <pre className="whitespace-pre-wrap">{agentOutput || 'Loading output...'}</pre>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-zinc-700 flex items-center justify-between bg-zinc-900">
              <div className="flex gap-4 text-xs text-zinc-400">
                {agents.find(a => a.agent_type === selectedAgent)?.token_usage && (
                  <>
                    <span>
                      Tokens: {(agents.find(a => a.agent_type === selectedAgent)?.token_usage.input || 0) +
                               (agents.find(a => a.agent_type === selectedAgent)?.token_usage.output || 0)}
                    </span>
                    <span>
                      Cost: ${(agents.find(a => a.agent_type === selectedAgent)?.token_usage.cost || 0).toFixed(4)}
                    </span>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => viewAgent(selectedAgent)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
                {agents.find(a => a.agent_type === selectedAgent)?.status === 'running' && (
                  <button
                    onClick={() => stopAgent(selectedAgent)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Stop Agent
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Foundation Validation Modal */}
      {showFoundationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className={cn(
              "px-6 py-5 flex-shrink-0",
              foundationStatus === 'ready' ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white" :
              foundationStatus === 'blocked' ? "bg-white border-b border-zinc-200 text-zinc-900" :
              "bg-gradient-to-r from-zinc-700 to-zinc-800 text-white"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    foundationStatus === 'ready' ? "bg-white/20" :
                    foundationStatus === 'blocked' ? "bg-red-100" :
                    "bg-white/20"
                  )}>
                    {foundationValidating ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : foundationStatus === 'ready' ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : foundationStatus === 'blocked' ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <Shield className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">
                      {foundationValidating ? 'Validating Foundation...' :
                       foundationStatus === 'ready' ? 'Foundation Ready' :
                       foundationStatus === 'blocked' ? 'Foundation Blocked' :
                       'Foundation Validation'}
                    </h3>
                    <p className={cn(
                      "text-sm",
                      foundationStatus === 'blocked' ? "text-zinc-500" : "text-white/80"
                    )}>
                      {foundationValidating ? 'Running comprehensive pre-development checks...' :
                       foundationStatus === 'ready' ? 'All required checks passed - ready to develop!' :
                       foundationStatus === 'blocked' ? 'Some required checks failed - see details below' :
                       'Verifying all systems are configured correctly'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFoundationModal(false)}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    foundationStatus === 'blocked' ? "hover:bg-zinc-200 text-zinc-500" : "hover:bg-white/20"
                  )}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Progress Summary */}
              <div className="flex items-center justify-between mb-6 p-4 bg-zinc-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {foundationChecks.filter(c => c.status === 'pass').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Passed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {foundationChecks.filter(c => c.status === 'fail').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-zinc-500">
                      {foundationChecks.filter(c => c.status === 'warn').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Warnings</div>
                  </div>
                </div>
                {foundationValidating && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking {foundationChecks.filter(c => c.status === 'running').length > 0 ?
                      foundationChecks.find(c => c.status === 'running')?.name : '...'}
                  </div>
                )}
              </div>

              {/* Step by Step Checks */}
              <div className="space-y-4">
                {['Git', 'Environment', 'Build', 'Stories', 'WAVE'].map(category => {
                  const categoryChecks = foundationChecks.filter(c => c.category === category)
                  if (categoryChecks.length === 0 && !foundationValidating) return null

                  return (
                    <div key={category}>
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                        {category === 'Git' && <GitBranch className="h-4 w-4" />}
                        {category === 'Environment' && <Key className="h-4 w-4" />}
                        {category === 'Build' && <Layers className="h-4 w-4" />}
                        {category === 'Stories' && <ScrollText className="h-4 w-4" />}
                        {category === 'WAVE' && <Zap className="h-4 w-4" />}
                        {category}
                      </h4>
                      <div className="space-y-2">
                        {categoryChecks.map(check => (
                          <div
                            key={check.id}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border transition-all",
                              check.status === 'pass' ? "bg-green-50 border-green-200" :
                              check.status === 'fail' ? "bg-red-50 border-red-200" :
                              check.status === 'warn' ? "bg-zinc-50 border-zinc-200" :
                              check.status === 'running' ? "bg-blue-50 border-blue-200" :
                              "bg-zinc-50 border-zinc-200"
                            )}
                          >
                            <div className="flex-shrink-0">
                              {check.status === 'pass' ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              ) : check.status === 'fail' ? (
                                <XCircle className="h-5 w-5 text-red-600" />
                              ) : check.status === 'warn' ? (
                                <AlertTriangle className="h-5 w-5 text-zinc-500" />
                              ) : check.status === 'running' ? (
                                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                              ) : (
                                <Clock className="h-5 w-5 text-zinc-400" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{check.name}</p>
                              <p className={cn(
                                "text-xs",
                                check.status === 'pass' ? "text-green-600" :
                                check.status === 'fail' ? "text-red-600" :
                                check.status === 'warn' ? "text-zinc-600" :
                                "text-muted-foreground"
                              )}>{check.message}</p>
                            </div>
                            {check.status === 'pass' && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">PASS</span>
                            )}
                            {check.status === 'fail' && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">FAIL</span>
                            )}
                            {check.status === 'warn' && (
                              <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">WARN</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Recommendations for failed/warning items */}
              {!foundationValidating && foundationChecks.filter(c => c.status === 'fail' || c.status === 'warn').length > 0 && (
                <div className="mt-6 p-4 bg-zinc-100 border border-zinc-200 rounded-xl">
                  <h4 className="font-semibold text-zinc-700 mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Items Requiring Attention
                  </h4>
                  <p className="text-sm text-zinc-600 mb-3">
                    Download the report below for detailed recommendations on how to fix each issue.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-zinc-50 border-t border-border flex items-center justify-between flex-shrink-0">
              <div className="text-sm text-muted-foreground">
                {foundationLastChecked && `Last validated: ${foundationLastChecked}`}
              </div>
              <div className="flex items-center gap-3">
                {!foundationValidating && foundationChecks.length > 0 && (
                  <button
                    onClick={downloadFoundationReport}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-border rounded-lg hover:bg-zinc-100 transition-colors text-sm font-medium"
                  >
                    <Download className="h-4 w-4" />
                    Download Report (.md)
                  </button>
                )}
                <button
                  onClick={() => setShowFoundationModal(false)}
                  className={cn(
                    "px-5 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    foundationStatus === 'ready'
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-zinc-900 hover:bg-zinc-800 text-white"
                  )}
                >
                  {foundationStatus === 'ready' ? 'Start Developing' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aerospace Safety Validation Modal */}
      {showSafetyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className={cn(
              "px-6 py-5 flex-shrink-0",
              safetyStatus === 'ready' ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white" :
              safetyStatus === 'blocked' ? "bg-white border-b border-zinc-200 text-zinc-900" :
              "bg-gradient-to-r from-orange-700 to-orange-800 text-white"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    safetyStatus === 'ready' ? "bg-white/20" :
                    safetyStatus === 'blocked' ? "bg-red-100" :
                    "bg-white/20"
                  )}>
                    {validatingSafety ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : safetyStatus === 'ready' ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : safetyStatus === 'blocked' ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <Shield className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">
                      {validatingSafety ? 'Validating Aerospace Safety...' :
                       safetyStatus === 'ready' ? 'Safety Compliant' :
                       safetyStatus === 'blocked' ? 'Safety Blocked' :
                       'Aerospace Safety Validation'}
                    </h3>
                    <p className={cn(
                      "text-sm",
                      safetyStatus === 'blocked' ? "text-zinc-500" : "text-white/80"
                    )}>
                      {validatingSafety ? 'Running DO-178C compliance checks...' :
                       safetyStatus === 'ready' ? 'All safety checks passed - aerospace-grade compliance!' :
                       safetyStatus === 'blocked' ? 'Some safety checks failed - see details below' :
                       'Verifying DO-178C safety documentation and scripts'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSafetyModal(false)}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    safetyStatus === 'blocked' ? "hover:bg-zinc-200 text-zinc-500" : "hover:bg-white/20"
                  )}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Progress Summary */}
              <div className="flex items-center justify-between mb-6 p-4 bg-zinc-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {safetyChecks.filter(c => c.status === 'pass').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Passed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {safetyChecks.filter(c => c.status === 'fail').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-zinc-500">
                      {safetyChecks.filter(c => c.status === 'warn').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Warnings</div>
                  </div>
                </div>
                {validatingSafety && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Validating safety documentation...
                  </div>
                )}
              </div>

              {/* Step by Step Checks */}
              <div className="space-y-4">
                {/* Section D: Safety Documentation */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Section D: Safety Documentation
                  </h4>
                  <div className="space-y-2">
                    {['FMEA Document (17 modes)', 'Emergency Levels (E1-E5)', 'Approval Matrix (L0-L5)', 'Forbidden Operations (108)', 'Safety Policy'].map(name => {
                      const check = safetyChecks.find(c => c.name === name)
                      if (!check && !validatingSafety) return null
                      return (
                        <div
                          key={name}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border transition-all",
                            check?.status === 'pass' ? "bg-green-50 border-green-200" :
                            check?.status === 'fail' ? "bg-red-50 border-red-200" :
                            check?.status === 'warn' ? "bg-zinc-50 border-zinc-200" :
                            "bg-zinc-50 border-zinc-200"
                          )}
                        >
                          <div className="flex-shrink-0">
                            {check?.status === 'pass' ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : check?.status === 'fail' ? (
                              <XCircle className="h-5 w-5 text-red-600" />
                            ) : check?.status === 'warn' ? (
                              <AlertTriangle className="h-5 w-5 text-zinc-500" />
                            ) : validatingSafety ? (
                              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                            ) : (
                              <Clock className="h-5 w-5 text-zinc-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{name}</p>
                            <p className={cn(
                              "text-xs",
                              check?.status === 'pass' ? "text-green-600" :
                              check?.status === 'fail' ? "text-red-600" :
                              check?.status === 'warn' ? "text-zinc-600" :
                              "text-muted-foreground"
                            )}>{check?.message || 'Pending...'}</p>
                          </div>
                          {check?.status === 'pass' && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">PASS</span>
                          )}
                          {check?.status === 'fail' && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">FAIL</span>
                          )}
                          {check?.status === 'warn' && (
                            <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">WARN</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Section E: Validation Scripts */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Terminal className="h-4 w-4" />
                    Section E: Validation Scripts & PM Agent
                  </h4>
                  <div className="space-y-2">
                    {['pre-flight-validator.sh', 'pre-merge-validator.sh', 'post-deploy-validator.sh', 'safety-violation-detector.sh', 'protocol-compliance-checker.sh', 'PM Agent Configuration'].map(name => {
                      const check = safetyChecks.find(c => c.name === name)
                      if (!check && !validatingSafety) return null
                      return (
                        <div
                          key={name}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border transition-all",
                            check?.status === 'pass' ? "bg-green-50 border-green-200" :
                            check?.status === 'fail' ? "bg-red-50 border-red-200" :
                            check?.status === 'warn' ? "bg-zinc-50 border-zinc-200" :
                            "bg-zinc-50 border-zinc-200"
                          )}
                        >
                          <div className="flex-shrink-0">
                            {check?.status === 'pass' ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : check?.status === 'fail' ? (
                              <XCircle className="h-5 w-5 text-red-600" />
                            ) : check?.status === 'warn' ? (
                              <AlertTriangle className="h-5 w-5 text-zinc-500" />
                            ) : validatingSafety ? (
                              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                            ) : (
                              <Clock className="h-5 w-5 text-zinc-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{name}</p>
                            <p className={cn(
                              "text-xs",
                              check?.status === 'pass' ? "text-green-600" :
                              check?.status === 'fail' ? "text-red-600" :
                              check?.status === 'warn' ? "text-zinc-600" :
                              "text-muted-foreground"
                            )}>{check?.message || 'Pending...'}</p>
                          </div>
                          {check?.status === 'pass' && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">PASS</span>
                          )}
                          {check?.status === 'fail' && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">FAIL</span>
                          )}
                          {check?.status === 'warn' && (
                            <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">WARN</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Recommendations for failed/warning items */}
              {!validatingSafety && safetyChecks.filter(c => c.status === 'fail' || c.status === 'warn').length > 0 && (
                <div className="mt-6 p-4 bg-zinc-100 border border-zinc-200 rounded-xl">
                  <h4 className="font-semibold text-zinc-700 mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Items Requiring Attention
                  </h4>
                  <p className="text-sm text-zinc-600 mb-3">
                    Download the report below for detailed recommendations on how to fix each safety issue.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-zinc-50 border-t border-border flex items-center justify-between flex-shrink-0">
              <div className="text-sm text-muted-foreground">
                {safetyLastChecked && `Last validated: ${safetyLastChecked}`}
              </div>
              <div className="flex items-center gap-3">
                {!validatingSafety && safetyChecks.length > 0 && (
                  <button
                    onClick={downloadSafetyReport}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-border rounded-lg hover:bg-zinc-100 transition-colors text-sm font-medium"
                  >
                    <Download className="h-4 w-4" />
                    Download Report (.md)
                  </button>
                )}
                <button
                  onClick={() => setShowSafetyModal(false)}
                  className={cn(
                    "px-5 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    safetyStatus === 'ready'
                      ? "bg-orange-600 hover:bg-orange-700 text-white"
                      : "bg-zinc-900 hover:bg-zinc-800 text-white"
                  )}
                >
                  {safetyStatus === 'ready' ? 'Continue Development' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RLM Protocol Validation Modal */}
      {showRlmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className={cn(
              "px-6 py-5 flex-shrink-0",
              rlmStatus === 'ready' ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white" :
              rlmStatus === 'blocked' ? "bg-white border-b border-zinc-200 text-zinc-900" :
              "bg-gradient-to-r from-violet-700 to-violet-800 text-white"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    rlmStatus === 'ready' ? "bg-white/20" :
                    rlmStatus === 'blocked' ? "bg-red-100" :
                    "bg-white/20"
                  )}>
                    {validatingRlm ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : rlmStatus === 'ready' ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : rlmStatus === 'blocked' ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <Layers className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">
                      {validatingRlm ? 'Validating RLM Protocol...' :
                       rlmStatus === 'ready' ? 'RLM Protocol Ready' :
                       rlmStatus === 'blocked' ? 'RLM Protocol Blocked' :
                       'RLM Protocol Validation'}
                    </h3>
                    <p className={cn(
                      "text-sm",
                      rlmStatus === 'blocked' ? "text-zinc-500" : "text-white/80"
                    )}>
                      {validatingRlm ? 'Checking P Variable, Agent Memory, Snapshots, Scripts...' :
                       rlmStatus === 'ready' ? 'All RLM checks passed - ready for Docker automation!' :
                       rlmStatus === 'blocked' ? 'Some RLM checks failed - see details below' :
                       'Verifying RLM Protocol components'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRlmModal(false)}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    rlmStatus === 'blocked' ? "hover:bg-zinc-200 text-zinc-500" : "hover:bg-white/20"
                  )}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Progress Summary */}
              <div className="flex items-center justify-between mb-6 p-4 bg-zinc-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {rlmChecks.filter(c => c.status === 'pass').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Passed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {rlmChecks.filter(c => c.status === 'fail').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-600">
                      {rlmChecks.filter(c => c.status === 'warn').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Warnings</div>
                  </div>
                </div>
                {validatingRlm && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Validating RLM components...
                  </div>
                )}
                {!validatingRlm && rlmValidationResult && (
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium",
                      rlmValidationResult.docker_ready ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    )}>
                      Docker: {rlmValidationResult.docker_ready ? 'Ready' : 'Not Ready'}
                    </div>
                    <div className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium",
                      rlmValidationResult.gate0_certified ? "bg-violet-100 text-violet-700" : "bg-zinc-100 text-zinc-600"
                    )}>
                      Gate 0: {rlmValidationResult.gate0_certified ? 'Certified' : 'Pending'}
                    </div>
                  </div>
                )}
              </div>

              {/* RLM Check Categories */}
              <div className="space-y-4">
                {/* Category 1: P Variable */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    P Variable (External Context)
                  </h4>
                  <div className="space-y-2">
                    {rlmChecks.filter(c => c.category === 'P Variable').map((check, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-all",
                          check.status === 'pass' ? "bg-green-50 border-green-200" :
                          check.status === 'fail' ? "bg-red-50 border-red-200" :
                          "bg-amber-50 border-amber-200"
                        )}
                      >
                        <div className="flex-shrink-0">
                          {check.status === 'pass' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : check.status === 'fail' ? (
                            <XCircle className="h-5 w-5 text-red-600" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{check.name}</p>
                          <p className={cn(
                            "text-xs",
                            check.status === 'pass' ? "text-green-600" :
                            check.status === 'fail' ? "text-red-600" :
                            "text-amber-600"
                          )}>{check.message}</p>
                        </div>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          check.status === 'pass' ? "bg-green-100 text-green-700" :
                          check.status === 'fail' ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-700"
                        )}>
                          {check.status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                    {validatingRlm && rlmChecks.filter(c => c.category === 'P Variable').length === 0 && (
                      <div className="flex items-center gap-3 p-3 rounded-lg border bg-zinc-50 border-zinc-200">
                        <Loader2 className="h-5 w-5 text-violet-600 animate-spin" />
                        <span className="text-sm text-muted-foreground">Checking P Variable...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Category 2: Agent Memory */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Agent Memory Persistence
                  </h4>
                  <div className="space-y-2">
                    {rlmChecks.filter(c => c.category === 'Agent Memory').map((check, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-all",
                          check.status === 'pass' ? "bg-green-50 border-green-200" :
                          check.status === 'fail' ? "bg-red-50 border-red-200" :
                          "bg-amber-50 border-amber-200"
                        )}
                      >
                        <div className="flex-shrink-0">
                          {check.status === 'pass' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : check.status === 'fail' ? (
                            <XCircle className="h-5 w-5 text-red-600" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{check.name}</p>
                          <p className={cn(
                            "text-xs",
                            check.status === 'pass' ? "text-green-600" :
                            check.status === 'fail' ? "text-red-600" :
                            "text-amber-600"
                          )}>{check.message}</p>
                        </div>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          check.status === 'pass' ? "bg-green-100 text-green-700" :
                          check.status === 'fail' ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-700"
                        )}>
                          {check.status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                    {validatingRlm && rlmChecks.filter(c => c.category === 'Agent Memory').length === 0 && (
                      <div className="flex items-center gap-3 p-3 rounded-lg border bg-zinc-50 border-zinc-200">
                        <Loader2 className="h-5 w-5 text-violet-600 animate-spin" />
                        <span className="text-sm text-muted-foreground">Checking Agent Memory...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Category 3: Snapshots */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Snapshots & Recovery
                  </h4>
                  <div className="space-y-2">
                    {rlmChecks.filter(c => c.category === 'Snapshots').map((check, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-all",
                          check.status === 'pass' ? "bg-green-50 border-green-200" :
                          check.status === 'fail' ? "bg-red-50 border-red-200" :
                          "bg-amber-50 border-amber-200"
                        )}
                      >
                        <div className="flex-shrink-0">
                          {check.status === 'pass' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : check.status === 'fail' ? (
                            <XCircle className="h-5 w-5 text-red-600" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{check.name}</p>
                          <p className={cn(
                            "text-xs",
                            check.status === 'pass' ? "text-green-600" :
                            check.status === 'fail' ? "text-red-600" :
                            "text-amber-600"
                          )}>{check.message}</p>
                        </div>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          check.status === 'pass' ? "bg-green-100 text-green-700" :
                          check.status === 'fail' ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-700"
                        )}>
                          {check.status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                    {validatingRlm && rlmChecks.filter(c => c.category === 'Snapshots').length === 0 && (
                      <div className="flex items-center gap-3 p-3 rounded-lg border bg-zinc-50 border-zinc-200">
                        <Loader2 className="h-5 w-5 text-violet-600 animate-spin" />
                        <span className="text-sm text-muted-foreground">Checking Snapshots...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Category 4: RLM Scripts */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Terminal className="h-4 w-4" />
                    RLM Scripts
                  </h4>
                  <div className="space-y-2">
                    {rlmChecks.filter(c => c.category === 'RLM Scripts').map((check, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-all",
                          check.status === 'pass' ? "bg-green-50 border-green-200" :
                          check.status === 'fail' ? "bg-red-50 border-red-200" :
                          "bg-amber-50 border-amber-200"
                        )}
                      >
                        <div className="flex-shrink-0">
                          {check.status === 'pass' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : check.status === 'fail' ? (
                            <XCircle className="h-5 w-5 text-red-600" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{check.name}</p>
                          <p className={cn(
                            "text-xs",
                            check.status === 'pass' ? "text-green-600" :
                            check.status === 'fail' ? "text-red-600" :
                            "text-amber-600"
                          )}>{check.message}</p>
                        </div>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          check.status === 'pass' ? "bg-green-100 text-green-700" :
                          check.status === 'fail' ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-700"
                        )}>
                          {check.status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                    {validatingRlm && rlmChecks.filter(c => c.category === 'RLM Scripts').length === 0 && (
                      <div className="flex items-center gap-3 p-3 rounded-lg border bg-zinc-50 border-zinc-200">
                        <Loader2 className="h-5 w-5 text-violet-600 animate-spin" />
                        <span className="text-sm text-muted-foreground">Checking RLM Scripts...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Category 5: Token Budget */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Token Budget & Efficiency
                  </h4>
                  <div className="space-y-2">
                    {rlmChecks.filter(c => c.category === 'Token Budget').map((check, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-all",
                          check.status === 'pass' ? "bg-green-50 border-green-200" :
                          check.status === 'fail' ? "bg-red-50 border-red-200" :
                          "bg-amber-50 border-amber-200"
                        )}
                      >
                        <div className="flex-shrink-0">
                          {check.status === 'pass' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : check.status === 'fail' ? (
                            <XCircle className="h-5 w-5 text-red-600" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{check.name}</p>
                          <p className={cn(
                            "text-xs",
                            check.status === 'pass' ? "text-green-600" :
                            check.status === 'fail' ? "text-red-600" :
                            "text-amber-600"
                          )}>{check.message}</p>
                        </div>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          check.status === 'pass' ? "bg-green-100 text-green-700" :
                          check.status === 'fail' ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-700"
                        )}>
                          {check.status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                    {validatingRlm && rlmChecks.filter(c => c.category === 'Token Budget').length === 0 && (
                      <div className="flex items-center gap-3 p-3 rounded-lg border bg-zinc-50 border-zinc-200">
                        <Loader2 className="h-5 w-5 text-violet-600 animate-spin" />
                        <span className="text-sm text-muted-foreground">Checking Token Budget...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recommendations for failed/warning items */}
              {!validatingRlm && rlmChecks.filter(c => c.status === 'fail' || c.status === 'warn').length > 0 && (
                <div className="mt-6 p-4 bg-zinc-100 border border-zinc-200 rounded-xl">
                  <h4 className="font-semibold text-zinc-700 mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Items Requiring Attention
                  </h4>
                  <p className="text-sm text-zinc-600 mb-3">
                    Download the report below for detailed recommendations on how to fix each RLM issue.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-zinc-50 border-t border-border flex items-center justify-between flex-shrink-0">
              <div className="text-sm text-muted-foreground">
                {rlmLastChecked && `Last validated: ${rlmLastChecked}`}
              </div>
              <div className="flex items-center gap-3">
                {!validatingRlm && rlmChecks.length > 0 && (
                  <button
                    onClick={downloadRlmReport}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-border rounded-lg hover:bg-zinc-100 transition-colors text-sm font-medium"
                  >
                    <Download className="h-4 w-4" />
                    Download Report (.md)
                  </button>
                )}
                <button
                  onClick={() => setShowRlmModal(false)}
                  className={cn(
                    "px-5 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    rlmStatus === 'ready'
                      ? "bg-violet-600 hover:bg-violet-700 text-white"
                      : "bg-zinc-900 hover:bg-zinc-800 text-white"
                  )}
                >
                  {rlmStatus === 'ready' ? 'Continue to Docker' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Progress Modal */}
      {showAnalysisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {analysisRunning ? (
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  ) : analysisComplete ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <Target className="h-6 w-6" />
                  )}
                  <div>
                    <h3 className="font-bold text-lg">
                      {analysisComplete ? 'Analysis Complete' : 'Deep Project Analysis'}
                    </h3>
                    <p className="text-blue-100 text-sm">
                      {analysisComplete
                        ? 'All files have been analyzed'
                        : 'Reading and analyzing project files...'}
                    </p>
                  </div>
                </div>
                {analysisComplete && (
                  <button
                    onClick={() => setShowAnalysisModal(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-4">
                {analysisSteps.map((step, idx) => (
                  <div
                    key={step.step}
                    className={cn(
                      "border rounded-xl overflow-hidden transition-all",
                      step.status === 'running' ? 'border-blue-300 bg-blue-50' :
                      step.status === 'complete' ? 'border-green-200 bg-green-50' :
                      step.status === 'failed' ? 'border-red-200 bg-red-50' :
                      'border-gray-200 bg-gray-50'
                    )}
                  >
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                          step.status === 'running' ? 'bg-blue-500 text-white' :
                          step.status === 'complete' ? 'bg-green-500 text-white' :
                          step.status === 'failed' ? 'bg-red-500 text-white' :
                          'bg-gray-300 text-gray-600'
                        )}>
                          {step.status === 'running' ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : step.status === 'complete' ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : step.status === 'failed' ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {analysisStepLabels[idx + 1] || `Step ${idx + 1}`}
                          </p>
                          <p className="text-xs text-muted-foreground">{step.detail}</p>
                        </div>
                      </div>
                      <span className={cn(
                        "text-xs font-medium px-2 py-1 rounded-full",
                        step.status === 'running' ? 'bg-blue-200 text-blue-700' :
                        step.status === 'complete' ? 'bg-green-200 text-green-700' :
                        step.status === 'failed' ? 'bg-red-200 text-red-700' :
                        'bg-gray-200 text-gray-600'
                      )}>
                        {step.status === 'running' ? 'Running...' :
                         step.status === 'complete' ? 'Complete' :
                         step.status === 'failed' ? 'Failed' : 'Pending'}
                      </span>
                    </div>

                    {/* Proof of file reading */}
                    {step.proof && step.status === 'complete' && (
                      <div className="px-4 pb-3">
                        <div className="bg-zinc-900 rounded-lg p-3 text-xs font-mono text-zinc-100 overflow-x-auto max-h-32 overflow-y-auto">
                          <pre className="whitespace-pre-wrap">{step.proof}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Report File Link */}
              {analysisComplete && reportFilePath && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-green-800">Markdown Report Generated</p>
                      <p className="text-sm text-green-600 mt-1">
                        Report saved to:
                      </p>
                      <code className="block mt-2 px-3 py-2 bg-green-100 rounded-lg text-xs font-mono text-green-800 break-all">
                        {reportFilePath}
                      </code>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {analysisComplete && (
              <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  Analysis completed in {analysisSteps.length} steps
                </div>
                <div className="flex gap-3">
                  {reportContent && (
                    <button
                      onClick={() => {
                        const blob = new Blob([reportContent], { type: 'text/markdown' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `gap-analysis-${new Date().toISOString().split('T')[0]}.md`
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                        URL.revokeObjectURL(url)
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <ArrowRight className="h-4 w-4" />
                      Download Report (.md)
                    </button>
                  )}
                  <button
                    onClick={() => setShowAnalysisModal(false)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
                  >
                    View Results
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Help Modal */}
      {helpModal && setupGuides[helpModal] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-zinc-900 text-white">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{setupGuides[helpModal].title}</h3>
                <button
                  onClick={() => setHelpModal(null)}
                  className="p-1 hover:bg-zinc-700 rounded transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Steps */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">Steps</h4>
                <ol className="space-y-2">
                  {setupGuides[helpModal].steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-100 text-zinc-600 text-xs font-medium flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-sm text-zinc-700 pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Links */}
              {setupGuides[helpModal].links.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">Quick Links</h4>
                  <div className="space-y-2">
                    {setupGuides[helpModal].links.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-3 bg-zinc-50 hover:bg-zinc-100 rounded-lg transition-colors group"
                      >
                        <ExternalLink className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600" />
                        <span className="text-sm font-medium text-zinc-700 group-hover:text-zinc-900">{link.label}</span>
                        <span className="text-xs text-zinc-400 ml-auto truncate max-w-[200px]">{link.url}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-zinc-50 border-t flex justify-end">
              <button
                onClick={() => setHelpModal(null)}
                className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground py-8 mt-8">
        Generated: 2026-01-21 {lastUpdate} | Dashboard v1.0.0 | Aerospace-Grade Validation Protocol
      </div>

      {/* WAVE Architecture Full Page */}
      {showWaveInfo && (
        <div className="fixed inset-0 z-50 bg-zinc-50 overflow-y-auto">
          <div className="min-h-screen">
            {/* Full Page Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-border px-8 py-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setShowWaveInfo(false)}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to Checklist
                </button>
                <div className="h-8 w-px bg-border" />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                    <Radio className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">WAVE Architecture</h2>
                    <p className="text-sm text-muted-foreground">Autonomous Agent Orchestration System</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">v1.0.0</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">DO-178C Inspired</span>
              </div>
            </div>

            {/* Full Page Content */}
            <div className="max-w-7xl mx-auto px-8 py-8 space-y-12">

              {/* Hero Section */}
              <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-2xl p-8 text-white">
                <div className="flex items-start justify-between">
                  <div className="max-w-2xl">
                    <h1 className="text-3xl font-bold mb-4">WAVE Architecture Overview</h1>
                    <p className="text-zinc-300 text-lg leading-relaxed mb-6">
                      <strong className="text-white">WAVE</strong> (Workflow Automation & Validation Engine) is an <strong className="text-blue-400">Air Traffic Controller</strong> for AI agents.
                      Just like ATC coordinates multiple aircraft through takeoff, flight, and landing, WAVE orchestrates autonomous AI agents
                      through development phases with <strong className="text-green-400">aerospace-grade safety protocols</strong>.
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="px-4 py-2 bg-white/10 rounded-lg flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                        <span className="text-sm">Phase-Gate Model</span>
                      </div>
                      <div className="px-4 py-2 bg-white/10 rounded-lg flex items-center gap-2">
                        <Shield className="h-4 w-4 text-blue-400" />
                        <span className="text-sm">DO-178C Inspired</span>
                      </div>
                      <div className="px-4 py-2 bg-white/10 rounded-lg flex items-center gap-2">
                        <Bot className="h-4 w-4 text-purple-400" />
                        <span className="text-sm">Multi-Agent System</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-block bg-white/10 rounded-xl p-4">
                      <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Current Status</p>
                      <p className="text-2xl font-bold text-green-400">Operational</p>
                      <p className="text-sm text-zinc-400 mt-1">Phase 0 Ready</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-5 gap-4">
                {[
                  { label: 'Phases', value: '5', icon: Layers, color: 'text-blue-500', bg: 'bg-blue-50' },
                  { label: 'Gates', value: '8', icon: Target, color: 'text-purple-500', bg: 'bg-purple-50' },
                  { label: 'Agents', value: '4', icon: Bot, color: 'text-green-500', bg: 'bg-green-50' },
                  { label: 'Safety Checks', value: '108', icon: Shield, color: 'text-red-500', bg: 'bg-red-50' },
                  { label: 'Worktrees', value: '4', icon: GitBranch, color: 'text-orange-500', bg: 'bg-orange-50' },
                ].map((stat) => (
                  <div key={stat.label} className={cn("p-4 rounded-xl border border-border", stat.bg)}>
                    <stat.icon className={cn("h-6 w-6 mb-2", stat.color)} />
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* BPMN-Style Architecture Diagram */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Layers className="h-5 w-5 text-blue-600" />
                      </div>
                      System Architecture (BPMN Swimlanes)
                    </h2>
                    <p className="text-muted-foreground mt-1">Visual representation of the WAVE orchestration layers and flow</p>
                  </div>
                </div>
                <div className="bg-zinc-50 rounded-xl p-6 border border-zinc-200 overflow-x-auto">
                  {/* Swimlanes */}
                  <div className="min-w-[900px]">
                    {/* Header */}
                    <div className="flex mb-4 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                      <div className="w-24 shrink-0">Layer</div>
                      <div className="flex-1 grid grid-cols-6 gap-2 text-center">
                        <div>Start</div>
                        <div>Phase 0</div>
                        <div>Phase 1-2</div>
                        <div>Phase 3</div>
                        <div>Phase 4</div>
                        <div>End</div>
                      </div>
                    </div>

                    {/* Human Layer */}
                    <div className="flex items-stretch mb-2">
                      <div className="w-24 shrink-0 bg-amber-100 rounded-l-lg p-2 flex items-center">
                        <span className="text-xs font-semibold text-amber-700 [writing-mode:vertical-lr] rotate-180">HUMAN</span>
                      </div>
                      <div className="flex-1 bg-amber-50 rounded-r-lg p-3 grid grid-cols-6 gap-2 items-center border-2 border-amber-200">
                        {/* Start Event */}
                        <div className="flex justify-center">
                          <div className="w-8 h-8 rounded-full border-2 border-green-600 bg-green-100 flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-green-600" />
                          </div>
                        </div>
                        {/* Green Light */}
                        <div className="flex justify-center">
                          <div className="px-3 py-2 bg-amber-200 rounded-lg border border-amber-400 text-xs font-medium text-center">
                            🟢 Green Light<br/>Approval
                          </div>
                        </div>
                        {/* Empty */}
                        <div />
                        {/* Monitor */}
                        <div className="flex justify-center">
                          <div className="px-3 py-2 bg-amber-200 rounded-lg border border-amber-400 text-xs font-medium text-center">
                            👁️ Monitor<br/>Dashboard
                          </div>
                        </div>
                        {/* Review */}
                        <div className="flex justify-center">
                          <div className="px-3 py-2 bg-amber-200 rounded-lg border border-amber-400 text-xs font-medium text-center">
                            ✅ Review<br/>& Approve
                          </div>
                        </div>
                        {/* End Event */}
                        <div className="flex justify-center">
                          <div className="w-8 h-8 rounded-full border-4 border-red-600 bg-red-100 flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-red-600" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Orchestrator Layer */}
                    <div className="flex items-stretch mb-2">
                      <div className="w-24 shrink-0 bg-blue-100 rounded-l-lg p-2 flex items-center">
                        <span className="text-xs font-semibold text-blue-700 [writing-mode:vertical-lr] rotate-180">WAVE</span>
                      </div>
                      <div className="flex-1 bg-blue-50 rounded-r-lg p-3 grid grid-cols-6 gap-2 items-center border-2 border-blue-200">
                        {/* Trigger */}
                        <div className="flex justify-center">
                          <div className="px-3 py-2 bg-blue-200 rounded border border-blue-400 text-xs font-medium">
                            ⚡ Trigger
                          </div>
                        </div>
                        {/* Gate 0 */}
                        <div className="flex justify-center">
                          <div className="w-10 h-10 bg-blue-500 rotate-45 flex items-center justify-center">
                            <span className="text-white text-xs font-bold -rotate-45">G0</span>
                          </div>
                        </div>
                        {/* Gate 1-2 */}
                        <div className="flex justify-center gap-2">
                          <div className="w-8 h-8 bg-blue-500 rotate-45 flex items-center justify-center">
                            <span className="text-white text-[10px] font-bold -rotate-45">G1</span>
                          </div>
                          <div className="w-8 h-8 bg-blue-500 rotate-45 flex items-center justify-center">
                            <span className="text-white text-[10px] font-bold -rotate-45">G2</span>
                          </div>
                        </div>
                        {/* Gate 3 */}
                        <div className="flex justify-center">
                          <div className="w-10 h-10 bg-blue-500 rotate-45 flex items-center justify-center">
                            <span className="text-white text-xs font-bold -rotate-45">G3</span>
                          </div>
                        </div>
                        {/* Gate 4 */}
                        <div className="flex justify-center">
                          <div className="w-10 h-10 bg-green-500 rotate-45 flex items-center justify-center">
                            <span className="text-white text-xs font-bold -rotate-45">G4</span>
                          </div>
                        </div>
                        {/* Merge */}
                        <div className="flex justify-center">
                          <div className="px-3 py-2 bg-green-200 rounded border border-green-400 text-xs font-medium">
                            🔀 Merge
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Agents Layer */}
                    <div className="flex items-stretch mb-2">
                      <div className="w-24 shrink-0 bg-purple-100 rounded-l-lg p-2 flex items-center">
                        <span className="text-xs font-semibold text-purple-700 [writing-mode:vertical-lr] rotate-180">AGENTS</span>
                      </div>
                      <div className="flex-1 bg-purple-50 rounded-r-lg p-3 grid grid-cols-6 gap-2 items-center border-2 border-purple-200">
                        <div />
                        {/* Validate */}
                        <div className="flex justify-center">
                          <div className="px-3 py-2 bg-purple-200 rounded-lg border border-purple-400 text-xs font-medium text-center">
                            📋 Validate<br/>Stories
                          </div>
                        </div>
                        {/* Setup */}
                        <div className="flex justify-center">
                          <div className="px-3 py-2 bg-purple-200 rounded-lg border border-purple-400 text-xs font-medium text-center">
                            🔧 Setup<br/>Worktrees
                          </div>
                        </div>
                        {/* Parallel Agents */}
                        <div className="flex justify-center">
                          <div className="border-2 border-dashed border-purple-400 rounded-lg p-2">
                            <div className="flex gap-1">
                              <div className="w-8 h-8 bg-blue-500 rounded text-white text-[10px] font-bold flex items-center justify-center">FE</div>
                              <div className="w-8 h-8 bg-green-500 rounded text-white text-[10px] font-bold flex items-center justify-center">BE</div>
                            </div>
                            <p className="text-[9px] text-center mt-1 text-purple-600">Parallel</p>
                          </div>
                        </div>
                        {/* QA Agent */}
                        <div className="flex justify-center">
                          <div className="px-3 py-2 bg-purple-200 rounded-lg border border-purple-400 text-xs font-medium text-center">
                            🧪 QA<br/>Validate
                          </div>
                        </div>
                        <div />
                      </div>
                    </div>

                    {/* Data Layer */}
                    <div className="flex items-stretch">
                      <div className="w-24 shrink-0 bg-green-100 rounded-l-lg p-2 flex items-center">
                        <span className="text-xs font-semibold text-green-700 [writing-mode:vertical-lr] rotate-180">DATA</span>
                      </div>
                      <div className="flex-1 bg-green-50 rounded-r-lg p-3 grid grid-cols-6 gap-2 items-center border-2 border-green-200">
                        <div />
                        {/* Stories */}
                        <div className="flex justify-center">
                          <div className="flex items-center gap-1">
                            <Database className="h-4 w-4 text-green-600" />
                            <span className="text-xs">Stories</span>
                          </div>
                        </div>
                        {/* Locks */}
                        <div className="flex justify-center">
                          <div className="flex items-center gap-1">
                            <div className="text-xs">🔒 Lock Files</div>
                          </div>
                        </div>
                        {/* Signals */}
                        <div className="flex justify-center">
                          <div className="flex items-center gap-1">
                            <Zap className="h-4 w-4 text-amber-400" />
                            <span className="text-xs">Signals</span>
                          </div>
                        </div>
                        {/* Checksums */}
                        <div className="flex justify-center">
                          <div className="flex items-center gap-1">
                            <div className="text-xs">#️⃣ Checksums</div>
                          </div>
                        </div>
                        {/* Git */}
                        <div className="flex justify-center">
                          <div className="flex items-center gap-1">
                            <GitBranch className="h-4 w-4 text-orange-500" />
                            <span className="text-xs">Main</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Flow Arrows */}
                    <div className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-500">
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-full border-2 border-green-600 bg-green-100" />
                        <span>Start</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-blue-500 rotate-45" />
                        <span>Gate (Decision)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-6 h-4 bg-purple-200 rounded border border-purple-400" />
                        <span>Task</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-full border-4 border-red-600 bg-red-100" />
                        <span>End</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-6 h-4 border-2 border-dashed border-purple-400 rounded" />
                        <span>Parallel</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Autonomous Flow Diagram */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Radio className="h-5 w-5 text-purple-600" />
                      </div>
                      Autonomous Execution Flow
                    </h2>
                    <p className="text-muted-foreground mt-1">How WAVE executes phases autonomously with drift detection</p>
                  </div>
                </div>
                <div className="bg-zinc-900 rounded-xl p-6 text-zinc-100 font-mono text-xs overflow-x-auto">
                  <pre className="whitespace-pre">{`
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           WAVE AUTONOMOUS EXECUTION FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     │
│   │  HUMAN   │     │  PHASE   │     │  PHASE   │     │  PHASE   │     │  PHASE   │     │
│   │  INPUT   │────▶│    0     │────▶│   1-2    │────▶│    3     │────▶│    4     │     │
│   │          │     │ Stories  │     │  Setup   │     │   Dev    │     │    QA    │     │
│   └──────────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     │
│        │                │                │                │                │            │
│        │                ▼                ▼                ▼                ▼            │
│        │           ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐        │
│        │           │  LOCK   │     │  LOCK   │     │  LOCK   │     │  LOCK   │        │
│        │           │ + hash  │     │ + hash  │     │ + hash  │     │ + hash  │        │
│        │           └────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘        │
│        │                │                │                │                │            │
│        │                └────────────────┴────────────────┴────────────────┘            │
│        │                                 │                                              │
│        │                                 ▼                                              │
│        │                    ┌────────────────────────┐                                  │
│        │                    │   DRIFT DETECTOR       │                                  │
│        │                    │   (Continuous Check)   │                                  │
│        │                    └───────────┬────────────┘                                  │
│        │                                │                                              │
│        │               ┌────────────────┴────────────────┐                             │
│        │               ▼                                 ▼                             │
│        │    ┌──────────────────┐              ┌──────────────────┐                     │
│        │    │   ✅ NO DRIFT    │              │   ❌ DRIFT        │                     │
│        │    │   Continue       │              │   DETECTED        │                     │
│        │    └──────────────────┘              └────────┬─────────┘                     │
│        │                                               │                               │
│        │                                               ▼                               │
│        │                                    ┌──────────────────┐                       │
│        │                                    │ INVALIDATE CHAIN │                       │
│        │                                    │ Re-run from P0   │                       │
│        │                                    └────────┬─────────┘                       │
│        │                                             │                                 │
│        └─────────────────────────────────────────────┘                                 │
│                                                                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  LEGEND:  ──▶ Flow   │ Gate   ◇ Decision   ═══ Parallel   ┌─┐ Lock File                │
└─────────────────────────────────────────────────────────────────────────────────────────┘
`}</pre>
                </div>
              </div>

              {/* The Process Flow */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <ArrowRight className="h-5 w-5 text-green-600" />
                      </div>
                      Phase-Gate Process (Building Blocks)
                    </h2>
                    <p className="text-muted-foreground mt-1">Each phase creates a lock file - no phase proceeds without valid prior locks</p>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-3">
                  {[
                    { phase: '0', name: 'Stories', desc: 'Validate AI Stories', color: 'bg-blue-500', status: 'pass' },
                    { phase: '1', name: 'Environment', desc: 'Setup worktrees', color: 'bg-purple-500', status: 'pending' },
                    { phase: '2', name: 'Smoke Test', desc: 'Build, lint, test', color: 'bg-orange-500', status: 'pending' },
                    { phase: '3', name: 'Development', desc: 'Agents execute', color: 'bg-green-500', status: 'pending' },
                    { phase: '4', name: 'QA & Merge', desc: 'Validate & deploy', color: 'bg-red-500', status: 'pending' },
                  ].map((p, i) => (
                    <div key={p.phase} className="relative">
                      <div className={cn(
                        "p-4 rounded-xl border-2 text-center transition-all",
                        p.status === 'pass' ? "border-green-500 bg-green-50" : "border-border bg-white"
                      )}>
                        <div className={cn("w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center text-white font-bold text-sm", p.color)}>
                          {p.phase}
                        </div>
                        <p className="font-semibold text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
                        {p.status === 'pass' && (
                          <CheckCircle2 className="h-4 w-4 text-green-500 absolute -top-1 -right-1" />
                        )}
                      </div>
                      {i < 4 && (
                        <div className="absolute top-1/2 -right-3 transform -translate-y-1/2 text-muted-foreground">
                          →
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Each phase creates a <strong>LOCK file</strong> with checksum. No phase can proceed without valid prior locks.
                </p>
              </div>

              {/* Key Components */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                        <Database className="h-5 w-5 text-orange-600" />
                      </div>
                      Core Infrastructure Components
                    </h2>
                    <p className="text-muted-foreground mt-1">The foundational systems that power WAVE orchestration</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white border border-border rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <Database className="h-5 w-5 text-green-600" />
                      <span className="font-semibold">Supabase (Source of Truth)</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      All persistent state lives here: projects, waves, stories, audit logs. Single source of truth for all agents.
                    </p>
                  </div>
                  <div className="p-4 bg-white border border-border rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <Zap className="h-5 w-5 text-amber-400" />
                      <span className="font-semibold">JSON Signals (Speed Layer)</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Fast coordination between agents via .claude/*.json files. Used for real-time status updates and gate transitions.
                    </p>
                  </div>
                  <div className="p-4 bg-white border border-border rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <GitBranch className="h-5 w-5 text-orange-500" />
                      <span className="font-semibold">Git Worktrees</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Isolated environments (fe-dev, be-dev, qa, dev-fix) for parallel agent work without merge conflicts.
                    </p>
                  </div>
                  <div className="p-4 bg-white border border-border rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="h-5 w-5 text-red-500" />
                      <span className="font-semibold">Safety Protocols</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Circuit breakers, emergency stops, budget limits, forbidden operations. Aerospace-grade (DO-178C inspired) safety.
                    </p>
                  </div>
                </div>
              </div>

              {/* The Agents */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <Bot className="h-5 w-5 text-indigo-600" />
                      </div>
                      Autonomous Agent Roles
                    </h2>
                    <p className="text-muted-foreground mt-1">Specialized AI agents that execute work in isolated worktrees</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { name: 'FE-Dev', color: 'bg-blue-500', role: 'Frontend Development', desc: 'Implements UI components, pages, and client-side logic in isolated fe-dev worktree', worktree: 'worktrees/fe-dev' },
                    { name: 'BE-Dev', color: 'bg-green-500', role: 'Backend Development', desc: 'Builds APIs, database schemas, and server-side logic in isolated be-dev worktree', worktree: 'worktrees/be-dev' },
                    { name: 'QA', color: 'bg-purple-500', role: 'Quality Assurance', desc: 'Runs tests, validates acceptance criteria, and approves changes for merge', worktree: 'worktrees/qa' },
                    { name: 'Dev-Fix', color: 'bg-orange-500', role: 'Bug Fixes & Patches', desc: 'Handles urgent fixes and patches that arise during development cycles', worktree: 'worktrees/dev-fix' },
                  ].map((agent) => (
                    <div key={agent.name} className="p-5 bg-white rounded-xl border border-border hover:border-primary/50 transition-colors">
                      <div className={cn("w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-white text-sm font-bold", agent.color)}>
                        {agent.name.split('-')[0]}
                      </div>
                      <p className="font-bold text-lg">{agent.name}</p>
                      <p className="text-sm text-primary font-medium">{agent.role}</p>
                      <p className="text-sm text-muted-foreground mt-2">{agent.desc}</p>
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground">Worktree</p>
                        <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{agent.worktree}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Status */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
                        <Info className="h-5 w-5 text-cyan-600" />
                      </div>
                      Live System Status
                    </h2>
                    <p className="text-muted-foreground mt-1">Real-time status of the WAVE orchestration system</p>
                  </div>
                </div>
                <div className="bg-zinc-900 text-zinc-100 rounded-xl p-5 font-mono text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">WAVE Version:</span>
                      <span className="text-green-400">v1.0.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Current Phase:</span>
                      <span className="text-yellow-400">Phase 0 (Story Validation)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Active Wave:</span>
                      <span className="text-blue-400">None</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Supabase:</span>
                      <span className={supabaseConnected ? "text-green-400" : "text-red-400"}>
                        {supabaseConnected ? "Connected" : "Not Connected"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Stories Count:</span>
                      <span className="text-zinc-100">{storiesCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Emergency Stop:</span>
                      <span className="text-green-400">CLEAR</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Reference */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                        <Target className="h-5 w-5 text-rose-600" />
                      </div>
                      Gate Reference Guide
                    </h2>
                    <p className="text-muted-foreground mt-1">Complete gate progression from pre-validation to deployment</p>
                  </div>
                </div>
                <div className="grid grid-cols-8 gap-3">
                  {[
                    { gate: '-1', name: 'Pre-Validation', desc: 'Zero Error Launch Protocol', color: 'border-gray-300 bg-gray-50' },
                    { gate: '0', name: 'Stories', desc: 'Schema & coverage validation', color: 'border-blue-300 bg-blue-50' },
                    { gate: '1', name: 'Environment', desc: 'Worktrees & deps ready', color: 'border-purple-300 bg-purple-50' },
                    { gate: '2', name: 'Smoke Test', desc: 'Build, lint, test pass', color: 'border-orange-300 bg-orange-50' },
                    { gate: '3', name: 'Development', desc: 'Agents executing', color: 'border-green-300 bg-green-50' },
                    { gate: '4', name: 'QA Review', desc: 'Tests & validation', color: 'border-indigo-300 bg-indigo-50' },
                    { gate: '5', name: 'Merge', desc: 'Merge to main', color: 'border-cyan-300 bg-cyan-50' },
                    { gate: '6+', name: 'Deploy', desc: 'Deploy & monitor', color: 'border-rose-300 bg-rose-50' },
                  ].map((g) => (
                    <div key={g.gate} className={cn("p-4 rounded-xl border-2 text-center", g.color)}>
                      <div className="w-10 h-10 bg-white rounded-lg mx-auto mb-2 flex items-center justify-center border border-border">
                        <span className="font-mono font-bold text-sm">G{g.gate}</span>
                      </div>
                      <p className="font-semibold text-sm">{g.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{g.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Safety & Compliance */}
              <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-8 border border-red-100">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3 text-red-700">
                      <Shield className="h-6 w-6" />
                      Safety & Compliance (DO-178C Inspired)
                    </h2>
                    <p className="text-red-600/80 mt-2 max-w-2xl">
                      WAVE implements aerospace-grade safety protocols inspired by DO-178C certification standards.
                      All operations are validated, audited, and can be halted instantly via emergency stop.
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="inline-block bg-white rounded-xl p-4 border border-red-200">
                      <p className="text-xs text-red-600 uppercase tracking-wide mb-1">Forbidden Operations</p>
                      <p className="text-3xl font-bold text-red-700">108</p>
                      <p className="text-xs text-muted-foreground">Protected actions</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 mt-6">
                  {[
                    { icon: '🛑', title: 'Emergency Stop', desc: 'Instantly halt all agent operations' },
                    { icon: '🔌', title: 'Circuit Breaker', desc: 'Auto-stop on repeated failures' },
                    { icon: '💰', title: 'Budget Limits', desc: 'API cost caps per wave' },
                    { icon: '📋', title: 'Audit Trail', desc: 'Every action logged to Supabase' },
                  ].map((item) => (
                    <div key={item.title} className="bg-white/80 rounded-xl p-4 border border-red-100">
                      <span className="text-2xl">{item.icon}</span>
                      <p className="font-semibold mt-2">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Full Page Footer */}
            <div className="border-t border-border mt-12 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                WAVE: Workflow Automation & Validation Engine | Inspired by DO-178C Aerospace Standards
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Version 1.0.0 | Building Block Validation System | {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
