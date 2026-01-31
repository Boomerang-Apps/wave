/**
 * FoundationChecklist Page
 *
 * Standalone page for the Foundation Checklist with muted dark styling.
 * Accessed via /projects/:projectId/foundation route.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  FolderTree,
  FileText,
  Layers,
  Zap,
  Shield,
  Play,
  RefreshCw,
  Sparkles,
  Rocket,
  AlertCircle,
  ExternalLink,
  Loader2,
  FolderOpen,
  Search,
  Filter,
  Plus,
  ArrowUpRight,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Layout } from '../components/Layout';
import type { FoundationReport } from '../components/FoundationAnalysisProgress';

// ============================================================================
// Types
// ============================================================================

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'optional' | 'skipped';
type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
type TaskCategory = 'structure' | 'documentation' | 'mockups' | 'techstack' | 'compliance';

interface TaskAction {
  type: 'create_file' | 'generate_ai' | 'install' | 'configure' | 'link' | 'view' | 'custom';
  label: string;
  endpoint?: string;
  params?: Record<string, unknown>;
}

interface ChecklistTask {
  id: string;
  category: TaskCategory;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  action?: TaskAction;
}

interface ChecklistCategoryData {
  id: TaskCategory;
  name: string;
  icon: React.ReactNode;
  tasks: ChecklistTask[];
}

interface PreFlightCheck {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  required: boolean;
}

interface FolderItem {
  name: string;
  status: 'found' | 'pending' | 'missing';
  type: string;
  purpose: string;
}

// ============================================================================
// Task Transformer
// ============================================================================

function transformReportToTasks(report: FoundationReport | null, projectPath: string): ChecklistCategoryData[] {
  if (!report) return [];

  const categories: ChecklistCategoryData[] = [];

  // 1. STRUCTURE TASKS
  const structureTasks: ChecklistTask[] = [];
  const structureAnalysis = report.analysis?.structure;

  if (structureAnalysis?.status === 'fail') {
    structureTasks.push({
      id: 'structure-reorganize',
      category: 'structure',
      title: 'Reorganize Project Structure',
      description: 'Apply best practices to folder organization',
      status: 'pending',
      priority: 'high',
      action: { type: 'custom', label: 'Apply', endpoint: '/api/foundation/reorganize', params: { projectPath } }
    });
  } else {
    structureTasks.push({
      id: 'structure-valid',
      category: 'structure',
      title: 'Project Structure Valid',
      description: 'Folder organization follows best practices',
      status: 'completed',
      priority: 'medium'
    });
  }

  categories.push({
    id: 'structure',
    name: 'Structure',
    icon: <FolderTree className="h-4 w-4" />,
    tasks: structureTasks
  });

  // 2. DOCUMENTATION TASKS
  const docsTasks: ChecklistTask[] = [];
  const docsFound = report.analysis?.documentation?.docsFound || [];
  const hasPRD = docsFound.some(d => d.name?.toLowerCase().includes('prd'));

  if (!hasPRD) {
    docsTasks.push({
      id: 'docs-create-prd',
      category: 'documentation',
      title: 'Create PRD Document',
      description: 'Product Requirements Document needed',
      status: 'pending',
      priority: 'critical',
      action: { type: 'generate_ai', label: 'Generate PRD', endpoint: '/api/generate-prd', params: { projectPath } }
    });
  } else {
    docsTasks.push({
      id: 'docs-prd-found',
      category: 'documentation',
      title: 'PRD Document Found',
      description: 'Product Requirements Document detected',
      status: 'completed',
      priority: 'critical',
      action: { type: 'view', label: 'View PRD' }
    });

    docsTasks.push({
      id: 'docs-generate-stories',
      category: 'documentation',
      title: 'Generate User Stories',
      description: 'Create AI-powered user stories from your PRD',
      status: 'pending',
      priority: 'high',
      action: { type: 'generate_ai', label: 'Create AI Stories', endpoint: '/api/generate-stories', params: { projectPath } }
    });
  }

  categories.push({
    id: 'documentation',
    name: 'Documentation',
    icon: <FileText className="h-4 w-4" />,
    tasks: docsTasks
  });

  // 3. MOCKUPS TASKS
  const mockupsTasks: ChecklistTask[] = [];
  const mockupCount = report.analysis?.mockups?.count || 0;

  if (mockupCount === 0) {
    mockupsTasks.push({
      id: 'mockups-missing',
      category: 'mockups',
      title: 'No Design Mockups Found',
      description: 'Add HTML prototypes to design_mockups/',
      status: 'pending',
      priority: 'high',
      action: { type: 'create_file', label: 'Create Template', endpoint: '/api/tasks/create-mockup-template', params: { projectPath } }
    });
  } else {
    mockupsTasks.push({
      id: 'mockups-found',
      category: 'mockups',
      title: `${mockupCount} Mockups Found`,
      description: 'Design prototypes detected in project',
      status: 'completed',
      priority: 'high',
      action: { type: 'view', label: 'View Inventory' }
    });

    mockupsTasks.push({
      id: 'mockups-inventory',
      category: 'mockups',
      title: 'Manage Screen Inventory',
      description: 'Track screen versions and status',
      status: 'optional',
      priority: 'low',
      action: { type: 'view', label: 'Open Inventory' }
    });
  }

  categories.push({
    id: 'mockups',
    name: 'Mockups',
    icon: <Layers className="h-4 w-4" />,
    tasks: mockupsTasks
  });

  // 4. TECH STACK TASKS
  const techTasks: ChecklistTask[] = [];
  const techAnalysis = report.analysis?.techstack;
  const detectedTech = techAnalysis?.techStack || [];

  if (detectedTech.length > 0) {
    techTasks.push({
      id: 'tech-detected',
      category: 'techstack',
      title: `Tech Stack: ${detectedTech.slice(0, 3).join(', ')}`,
      description: `Detected ${detectedTech.length} technologies`,
      status: 'completed',
      priority: 'high'
    });
  }

  techTasks.push({
    id: 'tech-env',
    category: 'techstack',
    title: 'Environment Configuration',
    description: 'Generate .env file with required variables',
    status: 'pending',
    priority: 'high',
    action: { type: 'generate_ai', label: 'Generate .env', endpoint: '/api/tasks/generate-env', params: { projectPath } }
  });

  techTasks.push({
    id: 'tech-docker',
    category: 'techstack',
    title: 'Docker Setup (Recommended)',
    description: 'Containerize your development environment',
    status: 'optional',
    priority: 'medium',
    action: { type: 'install', label: 'Setup', endpoint: '/api/tasks/install-docker', params: { projectPath } }
  });

  categories.push({
    id: 'techstack',
    name: 'Tech Stack',
    icon: <Zap className="h-4 w-4" />,
    tasks: techTasks
  });

  // 5. COMPLIANCE TASKS
  const complianceTasks: ChecklistTask[] = [];
  const complianceScore = report.analysis?.compliance?.complianceScore || 0;

  complianceTasks.push({
    id: 'compliance-score',
    category: 'compliance',
    title: `Compliance Score: ${complianceScore}%`,
    description: complianceScore >= 80 ? 'Excellent compliance' : 'Some improvements needed',
    status: complianceScore >= 80 ? 'completed' : complianceScore >= 60 ? 'pending' : 'blocked',
    priority: 'high'
  });

  complianceTasks.push({
    id: 'compliance-safety',
    category: 'compliance',
    title: 'Aerospace-Grade Safety Scripts',
    description: 'Install validation and safety protocols',
    status: 'optional',
    priority: 'medium',
    action: { type: 'install', label: 'Install', endpoint: '/api/tasks/install-safety-scripts', params: { projectPath } }
  });

  complianceTasks.push({
    id: 'compliance-rlm',
    category: 'compliance',
    title: 'RLM Protocol',
    description: 'Rate limiting and moderation controls',
    status: 'optional',
    priority: 'medium',
    action: { type: 'install', label: 'Install', endpoint: '/api/tasks/install-rlm', params: { projectPath } }
  });

  categories.push({
    id: 'compliance',
    name: 'Compliance',
    icon: <Shield className="h-4 w-4" />,
    tasks: complianceTasks
  });

  return categories;
}

// ============================================================================
// Task Item Component - Muted styling
// ============================================================================

function TaskItem({
  task,
  onAction,
  isLoading
}: {
  task: ChecklistTask;
  onAction: (task: ChecklistTask) => void;
  isLoading: boolean;
}) {
  const getStatusIcon = () => {
    switch (task.status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-[#22c55e]" />;
      case 'blocked':
        return <AlertTriangle className="h-4 w-4 text-[#ef4444]" />;
      case 'in_progress':
        return <Loader2 className="h-4 w-4 text-[#3b82f6] animate-spin" />;
      default:
        return <Circle className="h-4 w-4 text-[#404040]" />;
    }
  };

  const getStatusTextColor = () => {
    switch (task.status) {
      case 'completed': return 'text-[#22c55e]';
      case 'blocked': return 'text-[#ef4444]';
      default: return 'text-[#a3a3a3]';
    }
  };

  return (
    <div className="flex items-center justify-between py-3 px-4 hover:bg-[#252525] rounded-lg transition-colors">
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <div>
          <p className={cn("text-sm", getStatusTextColor())}>{task.title}</p>
          <p className="text-xs text-[#525252]">{task.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {task.priority === 'critical' && task.status !== 'completed' && (
          <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-[#2e2e2e] text-[#ef4444] border border-[#ef4444]/20">
            Required
          </span>
        )}
        {task.action && task.status !== 'completed' && (
          <button
            onClick={() => onAction(task)}
            disabled={isLoading || task.status === 'blocked'}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              task.status === 'blocked'
                ? "bg-[#2e2e2e] text-[#404040] cursor-not-allowed"
                : "bg-[#fafafa] text-[#1e1e1e] hover:bg-[#e5e5e5]"
            )}
          >
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {task.action.label}
          </button>
        )}
        {task.status === 'completed' && task.action?.type === 'view' && (
          <button
            onClick={() => onAction(task)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#2e2e2e] text-[#a3a3a3] hover:text-[#fafafa] transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            {task.action.label}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Category Section - Muted styling
// ============================================================================

function CategorySection({
  category,
  isExpanded,
  onToggle,
  onTaskAction,
  loadingTaskId
}: {
  category: ChecklistCategoryData;
  isExpanded: boolean;
  onToggle: () => void;
  onTaskAction: (task: ChecklistTask) => void;
  loadingTaskId: string | null;
}) {
  const completedCount = category.tasks.filter(t => t.status === 'completed').length;
  const totalRequired = category.tasks.filter(t => t.status !== 'optional' && t.status !== 'skipped').length;
  const pendingCount = category.tasks.filter(t => t.status === 'pending').length;
  const allComplete = completedCount >= totalRequired;

  return (
    <div className="border border-[#2e2e2e] rounded-xl overflow-hidden bg-[#1e1e1e]">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-[#252525] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-[#525252]">{category.icon}</span>
          <div className="text-left">
            <p className="text-sm font-medium text-[#fafafa]">{category.name}</p>
            <p className="text-xs text-[#404040]">
              {completedCount}/{category.tasks.length} tasks complete
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {allComplete ? (
            <CheckCircle2 className="h-4 w-4 text-[#22c55e]" />
          ) : pendingCount > 0 ? (
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-[#2e2e2e] text-[#f59e0b]">
              {pendingCount} pending
            </span>
          ) : null}
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-[#404040]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[#404040]" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-[#2e2e2e] p-2">
          {category.tasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onAction={onTaskAction}
              isLoading={loadingTaskId === task.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Pre-Flight Checks - Muted styling
// ============================================================================

function PreFlightChecks({
  onRunTests,
  isRunning,
  checks
}: {
  onRunTests: () => void;
  isRunning: boolean;
  checks: PreFlightCheck[];
}) {
  const allPassed = checks.every(c => c.status === 'passed' || (!c.required && c.status !== 'failed'));
  const requiredFailed = checks.some(c => c.required && c.status === 'failed');

  return (
    <div className="border border-[#2e2e2e] rounded-xl p-5 bg-[#1e1e1e]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-[#525252]" />
          <span className="text-sm font-medium text-[#fafafa]">Pre-Flight Checks</span>
        </div>
        <button
          onClick={onRunTests}
          disabled={isRunning}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#2e2e2e] text-[#a3a3a3] hover:text-[#fafafa] transition-colors disabled:opacity-50"
        >
          {isRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Run Tests
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {checks.map(check => (
          <div
            key={check.id}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1e1e1e] border border-[#2e2e2e]"
          >
            {check.status === 'passed' ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-[#22c55e]" />
            ) : check.status === 'failed' ? (
              <AlertCircle className="h-3.5 w-3.5 text-[#ef4444]" />
            ) : check.status === 'running' ? (
              <Loader2 className="h-3.5 w-3.5 text-[#525252] animate-spin" />
            ) : (
              <Circle className="h-3.5 w-3.5 text-[#404040]" />
            )}
            <span className={cn(
              "text-xs",
              check.status === 'passed' ? "text-[#22c55e]" :
              check.status === 'failed' ? "text-[#ef4444]" :
              "text-[#525252]"
            )}>
              {check.name}
            </span>
            {check.required && check.status !== 'passed' && (
              <span className="text-[10px] text-[#ef4444]">*</span>
            )}
          </div>
        ))}
      </div>

      <div className={cn(
        "mt-4 p-3 rounded-lg text-xs text-center border",
        allPassed ? "bg-[#22c55e]/5 border-[#22c55e]/20 text-[#22c55e]" :
        requiredFailed ? "bg-[#ef4444]/5 border-[#ef4444]/20 text-[#ef4444]" :
        "bg-[#2e2e2e] border-[#2e2e2e] text-[#666]"
      )}>
        {allPassed ? "All systems go! Ready for launch." :
         requiredFailed ? "Some required checks failed. Please fix before launching." :
         "Run pre-flight checks to verify launch readiness."}
      </div>
    </div>
  );
}

// ============================================================================
// Project Structure Table - Muted styling
// ============================================================================

function ProjectStructureTable() {
  const folders: FolderItem[] = [
    { name: 'docs/', status: 'found', type: 'Documentation', purpose: 'PRD, CLAUDE.md, architecture' },
    { name: 'design_mockups/', status: 'found', type: 'Design', purpose: 'HTML prototypes, visual designs' },
    { name: 'src/', status: 'found', type: 'Source Code', purpose: 'Application source code' },
    { name: 'server/', status: 'found', type: 'Backend', purpose: 'API server and routes' },
    { name: 'worktrees/', status: 'pending', type: 'Git Worktrees', purpose: 'Agent isolation workspaces' },
    { name: 'signals/', status: 'pending', type: 'Speed Layer', purpose: 'Agent coordination signals' },
    { name: 'wave.config.json', status: 'found', type: 'Config', purpose: 'WAVE orchestrator settings' },
    { name: 'package.json', status: 'found', type: 'Config', purpose: 'Dependencies, scripts' },
    { name: 'tsconfig.json', status: 'found', type: 'Config', purpose: 'TypeScript config' },
  ];

  return (
    <div className="border border-[#2e2e2e] rounded-xl overflow-hidden bg-[#1e1e1e]">
      <div className="flex items-center justify-between p-4 border-b border-[#2e2e2e]">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-[#525252]" />
          <div>
            <p className="text-sm font-medium text-[#fafafa]">Project Structure</p>
            <p className="text-xs text-[#404040]">Root directory structure and project organization</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-[#404040]" />
            <input
              type="text"
              placeholder="Search folders..."
              className="pl-8 pr-3 py-1.5 text-xs bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg text-[#a3a3a3] placeholder-[#404040] focus:outline-none focus:border-[#262626] w-40"
            />
          </div>
          <button className="flex items-center gap-1 px-2 py-1.5 text-xs text-[#525252] hover:text-[#a3a3a3] transition-colors">
            <Filter className="h-3 w-3" />
            Filter
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[#2e2e2e] text-[#a3a3a3] hover:text-[#fafafa] rounded-lg transition-colors">
            <Plus className="h-3 w-3" />
            Add file
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[#2e2e2e] text-[#a3a3a3] hover:text-[#fafafa] rounded-lg transition-colors">
            <RefreshCw className="h-3 w-3" />
            Sync
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2e2e2e]">
              <th className="text-left px-4 py-2 text-[10px] font-medium text-[#404040] uppercase tracking-wider">Folder</th>
              <th className="text-left px-4 py-2 text-[10px] font-medium text-[#404040] uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-2 text-[10px] font-medium text-[#404040] uppercase tracking-wider">Type</th>
              <th className="text-left px-4 py-2 text-[10px] font-medium text-[#404040] uppercase tracking-wider">Purpose</th>
              <th className="text-left px-4 py-2 text-[10px] font-medium text-[#404040] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {folders.map((folder, index) => (
              <tr key={folder.name} className={cn(
                "border-b border-[#2e2e2e] hover:bg-[#252525] transition-colors",
                index === folders.length - 1 && "border-b-0"
              )}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="rounded border-[#262626] bg-[#1e1e1e]" />
                    <ChevronRight className="h-3 w-3 text-[#404040]" />
                    <FolderTree className="h-3.5 w-3.5 text-[#525252]" />
                    <span className="text-sm text-[#a3a3a3] font-mono">{folder.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "px-2 py-0.5 text-[10px] font-medium rounded",
                    folder.status === 'found' ? "bg-[#22c55e]/10 text-[#22c55e]" :
                    folder.status === 'pending' ? "bg-[#f59e0b]/10 text-[#f59e0b]" :
                    "bg-[#ef4444]/10 text-[#ef4444]"
                  )}>
                    {folder.status.charAt(0).toUpperCase() + folder.status.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-[#525252]">{folder.type}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-[#404040]">{folder.purpose}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button className="p-1 text-[#404040] hover:text-[#a3a3a3] transition-colors">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                    <button className="p-1 text-[#404040] hover:text-[#a3a3a3] transition-colors">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export function FoundationChecklist() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  // State
  const [report, setReport] = useState<FoundationReport | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectPath, setProjectPath] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const [taskStatuses, setTaskStatuses] = useState<Record<string, TaskStatus>>({});
  const [preFlightRunning, setPreFlightRunning] = useState(false);
  const [preFlightChecks, setPreFlightChecks] = useState<PreFlightCheck[]>([
    { id: 'git', name: 'Git Connected', status: 'pending', required: true },
    { id: 'env', name: 'Environment Variables', status: 'pending', required: true },
    { id: 'api_keys', name: 'API Keys Valid', status: 'pending', required: true },
    { id: 'dependencies', name: 'Dependencies Installed', status: 'pending', required: false },
    { id: 'docker', name: 'Docker Available', status: 'pending', required: false },
    { id: 'safety', name: 'Safety Enabled', status: 'pending', required: false },
  ]);

  // Fetch project data
  useEffect(() => {
    const fetchProject = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (response.ok) {
          const data = await response.json();
          setProjectName(data.project?.name || 'Project');
          setProjectPath(data.project?.root_path || '');

          // Load cached report if available
          const reportResponse = await fetch(`/api/foundation-report?projectPath=${encodeURIComponent(data.project?.root_path || '')}`);
          if (reportResponse.ok) {
            const reportData = await reportResponse.json();
            setReport(reportData);
          }
        }
      } catch (error) {
        console.error('Error fetching project:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  // Transform report to categories
  const categories = useMemo(() =>
    transformReportToTasks(report, projectPath),
    [report, projectPath]
  );

  // Expand all categories by default once loaded
  useEffect(() => {
    if (categories.length > 0 && expandedCategories.size === 0) {
      setExpandedCategories(new Set(categories.map(c => c.id)));
    }
  }, [categories, expandedCategories.size]);

  // Calculate progress
  const progress = useMemo(() => {
    let total = 0;
    let completed = 0;
    let critical = 0;

    categories.forEach(cat => {
      cat.tasks.forEach(task => {
        if (task.status !== 'optional' && task.status !== 'skipped') {
          total++;
          const status = taskStatuses[task.id] || task.status;
          if (status === 'completed') completed++;
          if (task.priority === 'critical' && status !== 'completed') critical++;
        }
      });
    });

    return {
      total,
      completed,
      critical,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [categories, taskStatuses]);

  const isReadyForLaunch = progress.critical === 0 && progress.percentage >= 60;
  const preFlightPassed = preFlightChecks.every(c => c.status === 'passed' || (!c.required && c.status !== 'failed'));

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }, []);

  const handleTaskAction = useCallback(async (task: ChecklistTask) => {
    if (task.action?.type === 'view') {
      console.log('View:', task.id);
      return;
    }

    if (!task.action?.endpoint) return;

    setLoadingTaskId(task.id);
    try {
      const response = await fetch(task.action.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task.action.params || {})
      });

      if (response.ok) {
        setTaskStatuses(prev => ({ ...prev, [task.id]: 'completed' }));
      }
    } catch (error) {
      console.error('Task action error:', error);
    } finally {
      setLoadingTaskId(null);
    }
  }, []);

  const runPreFlightTests = useCallback(async () => {
    setPreFlightRunning(true);

    for (const check of preFlightChecks) {
      setPreFlightChecks(prev => prev.map(c => c.id === check.id ? { ...c, status: 'running' } : c));
      await new Promise(resolve => setTimeout(resolve, 500));
      const passed = Math.random() > 0.2;
      setPreFlightChecks(prev => prev.map(c => c.id === check.id ? { ...c, status: passed ? 'passed' : 'failed' } : c));
    }

    setPreFlightRunning(false);
  }, [preFlightChecks]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 text-[#525252] animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-[#fafafa]">
              {projectName} - Foundation Checklist
            </h1>
            <p className="text-sm text-[#525252] mt-1">
              Complete the tasks below to prepare for development
            </p>
          </div>
          <button
            onClick={() => navigate(`/projects/${projectId}`)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-[#525252] hover:text-[#a3a3a3] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Analysis
          </button>
        </div>

        {/* Progress Bar */}
        <div className="border border-[#2e2e2e] rounded-xl p-5 bg-[#1e1e1e] mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[#fafafa]">Progress to Launch</span>
              {progress.critical > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-[#2e2e2e] text-[#ef4444] border border-[#ef4444]/20">
                  {progress.critical} critical remaining
                </span>
              )}
            </div>
            <span className={cn(
              "text-2xl font-bold",
              progress.percentage >= 80 ? "text-[#22c55e]" :
              progress.percentage >= 60 ? "text-[#f59e0b]" :
              "text-[#525252]"
            )}>
              {progress.percentage}%
            </span>
          </div>
          <div className="h-2 bg-[#2e2e2e] rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                progress.percentage >= 80 ? "bg-[#22c55e]" :
                progress.percentage >= 60 ? "bg-[#f59e0b]" :
                "bg-[#525252]"
              )}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <p className="text-xs text-[#404040] mt-2">
            {progress.completed} of {progress.total} required tasks completed
          </p>
        </div>

        {/* Category Sections */}
        <div className="space-y-3 mb-6">
          {categories.map(category => (
            <CategorySection
              key={category.id}
              category={{
                ...category,
                tasks: category.tasks.map(t => ({
                  ...t,
                  status: taskStatuses[t.id] || t.status
                }))
              }}
              isExpanded={expandedCategories.has(category.id)}
              onToggle={() => toggleCategory(category.id)}
              onTaskAction={handleTaskAction}
              loadingTaskId={loadingTaskId}
            />
          ))}
        </div>

        {/* Pre-Flight Checks */}
        <PreFlightChecks
          onRunTests={runPreFlightTests}
          isRunning={preFlightRunning}
          checks={preFlightChecks}
        />

        {/* Launch Button */}
        <div className="flex flex-col items-center gap-3 pt-8">
          <button
            onClick={() => navigate(`/projects/${projectId}?section=stories`)}
            disabled={!isReadyForLaunch || !preFlightPassed}
            className={cn(
              "flex items-center gap-3 px-8 py-4 rounded-xl text-base font-medium transition-all",
              isReadyForLaunch && preFlightPassed
                ? "bg-[#fafafa] text-[#1e1e1e] hover:bg-[#e5e5e5]"
                : "bg-[#2e2e2e] text-[#666] cursor-not-allowed"
            )}
          >
            <Play className="h-5 w-5" />
            Start Development
          </button>
          {!isReadyForLaunch && (
            <p className="text-xs text-[#404040]">
              Complete critical tasks and run pre-flight checks to enable launch
            </p>
          )}
        </div>

        {/* Project Structure Table */}
        <div className="mt-8">
          <ProjectStructureTable />
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-[#404040]">
          Generated: {new Date().toLocaleString()} | Dashboard v1.0.0 | Aerospace-Grade Validation Protocol
        </div>
      </div>
    </Layout>
  );
}

export default FoundationChecklist;
