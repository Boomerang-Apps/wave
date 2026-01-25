/**
 * ExecutionPlanTab Component (Launch Sequence)
 *
 * Step 2: Create WAVE Execution Plan
 * Assigns stories to agents and creates wave batches by dependencies
 * Uses standardized TabLayout components for consistent UI
 */

import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Layers,
  Target,
  Database
} from 'lucide-react';
import { InfoBox, KPICards, ActionBar, ResultSummary, TabContainer } from './TabLayout';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface Story {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'in_progress' | 'not_started' | 'blocked';
  priority: 'high' | 'medium' | 'low';
  acceptanceCriteria?: string[];
  assignedTo?: string;
  estimatedHours?: number;
  risk?: 'critical' | 'high' | 'medium' | 'low';
  safety_tags?: string[];
  approval_required?: string;
  requires_review?: boolean;
}

interface Wave {
  id: number;
  name: string;
  description: string;
  goal: string;
  status: 'completed' | 'active' | 'upcoming' | 'blocked';
  progress: number;
  deliverables: string[];
  stories: Story[];
  dependencies?: string[];
}

interface Project {
  id: string;
  name: string;
  root_path: string;
}

export interface ExecutionPlanTabProps {
  project: Project | null;
}

// ============================================
// Mock Data (In production, this comes from database)
// ============================================

const MOCK_WAVES: Wave[] = [
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
];

// ============================================
// Sub-components
// ============================================

function StoryStatusIcon({ status }: { status: Story['status'] }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'in_progress':
      return <Clock className="h-5 w-5 text-blue-500" />;
    case 'not_started':
      return <Clock className="h-5 w-5 text-muted-foreground" />;
    case 'blocked':
      return <XCircle className="h-5 w-5 text-red-500" />;
  }
}

function StoryStatusBadge({ status }: { status: Story['status'] }) {
  const styles = {
    completed: 'bg-green-500/10 text-green-500',
    in_progress: 'bg-blue-500/10 text-blue-500',
    not_started: 'bg-muted text-muted-foreground',
    blocked: 'bg-red-500/10 text-red-500',
  };
  const labels = {
    completed: 'Done',
    in_progress: 'In Progress',
    not_started: 'To Do',
    blocked: 'Blocked',
  };
  return (
    <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', styles[status])}>
      {labels[status]}
    </span>
  );
}

function WaveCard({
  wave,
  isExpanded,
  onToggle
}: {
  wave: Wave;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [expandedStory, setExpandedStory] = useState<string | null>(null);

  const getStatusBgColor = (status: Wave['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20';
      case 'active': return 'bg-blue-500/20';
      case 'upcoming': return 'bg-slate-500/20';
      case 'blocked': return 'bg-red-500/20';
    }
  };

  const getStatusTextColor = (status: Wave['status']) => {
    switch (status) {
      case 'completed': return 'text-green-500';
      case 'active': return 'text-blue-500';
      case 'upcoming': return 'text-slate-400';
      case 'blocked': return 'text-red-500';
    }
  };

  const completedStories = wave.stories.filter(s => s.status === 'completed').length;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Wave Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Wave Number */}
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center font-bold shrink-0',
            getStatusBgColor(wave.status),
            getStatusTextColor(wave.status)
          )}>
            {wave.status === 'completed' ? <CheckCircle2 className="h-5 w-5" /> : wave.id}
          </div>

          {/* Wave Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">Wave {wave.id}: {wave.name}</h3>
              <span className={cn(
                'text-xs px-2 py-0.5 rounded font-medium',
                wave.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                wave.status === 'active' ? 'bg-blue-500/10 text-blue-500' :
                wave.status === 'blocked' ? 'bg-red-500/10 text-red-500' :
                'bg-muted text-muted-foreground'
              )}>
                {wave.status === 'completed' ? 'Done' :
                 wave.status === 'active' ? 'Active' :
                 wave.status === 'blocked' ? 'Blocked' : 'Upcoming'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{wave.goal}</p>
            {/* Progress Bar */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    wave.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                  )}
                  style={{ width: `${wave.progress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {completedStories}/{wave.stories.length} stories
              </span>
            </div>
          </div>

          <ChevronDown className={cn(
            'h-5 w-5 text-muted-foreground transition-transform shrink-0',
            isExpanded && 'rotate-180'
          )} />
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-border bg-muted/30 p-4">
          {/* Dependencies */}
          {wave.dependencies && wave.dependencies.length > 0 && (
            <div className="mb-4 flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-muted-foreground">Requires: {wave.dependencies.join(', ')}</span>
            </div>
          )}

          {/* Deliverables */}
          <div className="mb-4">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Deliverables</h4>
            <div className="grid grid-cols-2 gap-2">
              {wave.deliverables.map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 border border-border">
                  <CheckCircle2 className={cn(
                    'h-4 w-4',
                    wave.status === 'completed' ? 'text-green-500' : 'text-muted-foreground'
                  )} />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stories */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Stories ({wave.stories.length})
            </h4>
            <div className="space-y-2">
              {wave.stories.map((story) => (
                <div key={story.id} className="bg-card rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setExpandedStory(expandedStory === story.id ? null : story.id)}
                    className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <StoryStatusIcon status={story.status} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-muted-foreground">{story.id}</span>
                          <StoryStatusBadge status={story.status} />
                          {story.assignedTo && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {story.assignedTo}
                            </span>
                          )}
                        </div>
                        <h5 className="font-medium text-sm mt-1">{story.title}</h5>
                      </div>
                      <ChevronRight className={cn(
                        'h-4 w-4 text-muted-foreground transition-transform',
                        expandedStory === story.id && 'rotate-90'
                      )} />
                    </div>
                  </button>

                  {expandedStory === story.id && (
                    <div className="border-t border-border p-3 bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-3">{story.description}</p>
                      {story.acceptanceCriteria && (
                        <div className="mb-3">
                          <h6 className="text-xs font-medium text-muted-foreground uppercase mb-2">
                            Acceptance Criteria
                          </h6>
                          <ul className="space-y-1">
                            {story.acceptanceCriteria.map((criteria, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <CheckCircle2 className={cn(
                                  'h-4 w-4 mt-0.5 shrink-0',
                                  story.status === 'completed' ? 'text-green-500' : 'text-muted-foreground'
                                )} />
                                <span className="text-muted-foreground">{criteria}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className={cn(
                          'px-2 py-1 rounded',
                          story.priority === 'high' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-muted text-muted-foreground'
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
  );
}

// ============================================
// Main Component
// ============================================

export function ExecutionPlanTab({ project: _project }: ExecutionPlanTabProps) {
  const [expandedWave, setExpandedWave] = useState<number | null>(2);
  const [_planStatus, _setPlanStatus] = useState<'idle' | 'generating' | 'ready'>('idle');

  // Calculate KPIs from mock data
  const waves = MOCK_WAVES;
  const totalStories = waves.reduce((sum, w) => sum + w.stories.length, 0);
  const completedStories = waves.reduce((sum, w) => sum + w.stories.filter(s => s.status === 'completed').length, 0);
  const inProgressStories = waves.reduce((sum, w) => sum + w.stories.filter(s => s.status === 'in_progress').length, 0);
  const overallProgress = Math.round((completedStories / totalStories) * 100);
  const activeWave = waves.find(w => w.status === 'active');

  const handleGeneratePlan = () => {
    // TODO: Implement plan generation
    console.log('Generate plan clicked');
  };

  return (
    <TabContainer>
      {/* 1. INFO BOX */}
      <InfoBox
        title="Step 2: WAVE Execution Plan"
        description="Review your project roadmap divided into Waves. Each wave builds on the previous one, with stories assigned to agents for execution."
        icon={<Layers className="h-4 w-4 text-blue-500" />}
      />

      {/* 2. KPI CARDS */}
      <KPICards
        items={[
          {
            label: 'Waves',
            value: waves.length,
            status: 'neutral',
            icon: <Layers className="h-4 w-4" />
          },
          {
            label: 'Stories',
            value: totalStories,
            status: 'neutral',
            icon: <Database className="h-4 w-4" />
          },
          {
            label: 'Completed',
            value: completedStories,
            status: completedStories > 0 ? 'success' : 'neutral',
          },
          {
            label: 'In Progress',
            value: inProgressStories,
            status: inProgressStories > 0 ? 'warning' : 'neutral',
          },
        ]}
      />

      {/* 3. ACTION BAR */}
      <ActionBar
        category="EXECUTION"
        title="Wave Execution Plan"
        description={`${waves.length} waves, ${totalStories} stories`}
        statusBadge={activeWave ? {
          label: `Wave ${activeWave.id} Active`,
          icon: <Database className="h-3 w-3" />,
          variant: 'info'
        } : overallProgress === 100 ? {
          label: 'All Complete',
          icon: <CheckCircle2 className="h-3 w-3" />,
          variant: 'success'
        } : undefined}
        primaryAction={{
          label: 'Re-Generate Plan',
          onClick: handleGeneratePlan,
          loading: false,
          icon: <Target className="h-4 w-4" />
        }}
      />

      {/* 4. RESULT SUMMARY */}
      <ResultSummary
        status={overallProgress === 100 ? 'pass' : overallProgress > 0 ? 'warn' : 'pending'}
        message={
          overallProgress === 100
            ? 'All stories completed! Ready for final review.'
            : activeWave
            ? `Currently executing Wave ${activeWave.id}: ${activeWave.name}`
            : 'No waves in progress'
        }
      />

      {/* 5. EXPANDABLE WAVE CARDS */}
      <div className="space-y-3">
        {waves.map((wave) => (
          <WaveCard
            key={wave.id}
            wave={wave}
            isExpanded={expandedWave === wave.id}
            onToggle={() => setExpandedWave(expandedWave === wave.id ? null : wave.id)}
          />
        ))}
      </div>
    </TabContainer>
  );
}

export default ExecutionPlanTab;
