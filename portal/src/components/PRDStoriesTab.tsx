/**
 * PRDStoriesTab Component (Launch Sequence)
 *
 * Step 1: Validate PRD & Stories before execution planning
 * Uses standardized TabLayout components for consistent UI
 */

import { useState } from 'react';
import {
  ScrollText,
  Database,
  Layers,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Target,
  RefreshCw,
  Copy,
  Info,
  ArrowRight,
  Zap
} from 'lucide-react';
import { InfoBox, KPICards, ActionBar, ResultSummary, ExpandableCard, TabContainer } from './TabLayout';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface AnalysisSection {
  status: string;
  findings: string[];
  issues: string[];
}

export interface FileStructureSection extends AnalysisSection {
  tree?: string;
}

export interface PRDSection extends AnalysisSection {
  prd_location?: string;
}

export interface StoriesSection extends AnalysisSection {
  stories_found: number;
}

export interface PrototypeSection extends AnalysisSection {
  files_found: string[];
}

export interface Gap {
  category: string;
  description: string;
  priority: string;
  action: string;
}

export interface ImprovementStep {
  step: number;
  title: string;
  description: string;
  status: string;
}

export interface AnalysisReport {
  timestamp: string;
  summary: {
    total_issues: number;
    total_gaps: number;
    readiness_score: number;
  };
  file_structure: FileStructureSection;
  ai_prd: PRDSection;
  ai_stories: StoriesSection;
  html_prototype: PrototypeSection;
  gap_analysis: { gaps: Gap[] };
  improvement_plan: ImprovementStep[];
}

export interface FileCheck {
  name: string;
  path?: string;
  status: 'found' | 'not_found';
}

export interface PRDStoriesTabProps {
  projectPath: string;
  projectName: string;
  projectId: string;
  analysisReport: AnalysisReport | null;
  analysisRunning: boolean;
  onRunAnalysis: () => void;
  fileChecks: FileCheck[];
  supabaseConnected: boolean;
  storiesCount: number;
  onSyncStories: () => void;
  syncingStories: boolean;
  syncMessage: string | null;
  onCopyPath: (path: string) => void;
}

// ============================================
// Sub-components
// ============================================

function FileCard({ file, onCopy }: { file: FileCheck; onCopy: (path: string) => void }) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border">
      <div className="flex items-center gap-2">
        {file.status === 'found' ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <XCircle className="h-4 w-4 text-red-500" />
        )}
        <span className="text-sm font-medium">{file.name}</span>
      </div>
      {file.path && (
        <button
          onClick={() => onCopy(file.path!)}
          className="p-1.5 hover:bg-muted rounded-lg transition-colors"
        >
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

function AnalysisDetailCard({
  findings,
  issues
}: {
  findings: string[];
  issues: string[];
}) {
  return (
    <div className="space-y-2">
      {findings.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Findings</p>
          {findings.map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-sm py-1">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <span>{f}</span>
            </div>
          ))}
        </div>
      )}
      {issues.length > 0 && (
        <div>
          <p className="text-xs font-medium text-red-500 mb-2">Issues</p>
          {issues.map((issue, i) => (
            <div key={i} className="flex items-start gap-2 text-sm py-1 text-red-500">
              <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{issue}</span>
            </div>
          ))}
        </div>
      )}
      {findings.length === 0 && issues.length === 0 && (
        <p className="text-sm text-muted-foreground">No data available. Run analysis to populate.</p>
      )}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function PRDStoriesTab({
  projectPath,
  projectName,
  projectId: _projectId,
  analysisReport,
  analysisRunning,
  onRunAnalysis,
  fileChecks,
  supabaseConnected,
  storiesCount,
  onSyncStories,
  syncingStories,
  syncMessage,
  onCopyPath
}: PRDStoriesTabProps) {
  const [_folderExpanded, _setFolderExpanded] = useState(false);

  // Calculate KPIs
  const readinessScore = analysisReport?.summary.readiness_score ?? 0;
  const totalIssues = analysisReport?.summary.total_issues ?? 0;
  const totalGaps = analysisReport?.summary.total_gaps ?? 0;
  const storiesFound = analysisReport?.ai_stories?.stories_found ?? 0;
  const improvementSteps = analysisReport?.improvement_plan?.length ?? 0;

  // Determine overall status
  const getOverallStatus = () => {
    if (!analysisReport) return 'pending';
    if (readinessScore >= 80 && totalIssues === 0) return 'pass';
    if (readinessScore >= 50) return 'warn';
    return 'fail';
  };

  const formatTimestamp = (ts?: string) => {
    if (!ts) return undefined;
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  };

  const getStatusFromString = (status: string): 'pass' | 'fail' | 'warn' => {
    if (status === 'pass') return 'pass';
    if (status === 'fail') return 'fail';
    return 'warn';
  };

  return (
    <TabContainer>
      {/* 1. INFO BOX */}
      <InfoBox
        title="Step 1: PRD & Stories Validation"
        description={`Analyze your project structure, AI PRD document, and stories to ensure everything is ready for WAVE automation. Project: ${projectName}`}
        icon={<ScrollText className="h-4 w-4 text-blue-500" />}
      />

      {/* 2. KPI CARDS */}
      <KPICards
        items={[
          {
            label: 'Readiness',
            value: `${readinessScore}%`,
            status: readinessScore >= 80 ? 'success' : readinessScore >= 50 ? 'warning' : 'error',
            icon: <Target className="h-4 w-4" />
          },
          {
            label: 'Stories',
            value: storiesFound || storiesCount,
            status: (storiesFound || storiesCount) > 0 ? 'success' : 'neutral',
            icon: <Database className="h-4 w-4" />
          },
          {
            label: 'Issues',
            value: totalIssues,
            status: totalIssues === 0 ? 'success' : totalIssues <= 3 ? 'warning' : 'error',
          },
          {
            label: 'Gaps',
            value: totalGaps,
            status: totalGaps === 0 ? 'success' : totalGaps <= 2 ? 'warning' : 'error',
          },
        ]}
      />

      {/* 3. ACTION BAR */}
      <ActionBar
        category="PRD"
        title="PRD & Stories Validation"
        description={`Project: ${projectName}`}
        statusBadge={analysisReport ? {
          label: formatTimestamp(analysisReport.timestamp) || 'Analyzed',
          icon: <Database className="h-3 w-3" />,
          variant: getOverallStatus() === 'pass' ? 'success' : getOverallStatus() === 'warn' ? 'warning' : 'info'
        } : undefined}
        primaryAction={{
          label: analysisReport ? 'Re-Run Analysis' : 'Run Analysis',
          onClick: onRunAnalysis,
          loading: analysisRunning,
          icon: <Target className="h-4 w-4" />
        }}
        secondaryAction={analysisReport ? {
          label: 'Sync Stories',
          onClick: onSyncStories,
          icon: <RefreshCw className="h-4 w-4" />
        } : undefined}
      />

      {/* 4. RESULT SUMMARY */}
      {analysisReport && (
        <ResultSummary
          status={getOverallStatus()}
          message={
            getOverallStatus() === 'pass'
              ? 'Project structure validated successfully'
              : getOverallStatus() === 'warn'
              ? `${totalIssues} issues and ${totalGaps} gaps found - review details below`
              : 'Multiple issues detected - review and resolve before proceeding'
          }
          timestamp={formatTimestamp(analysisReport.timestamp)}
        />
      )}

      {/* 5. EXPANDABLE DETAIL CARDS */}

      {/* Project Structure */}
      <ExpandableCard
        title="Project Structure"
        subtitle={projectPath}
        icon={<Layers className="h-4 w-4" />}
        status={analysisReport?.file_structure ? getStatusFromString(analysisReport.file_structure.status) : 'pending'}
        defaultExpanded={false}
      >
        <div className="space-y-4">
          {/* Folder tree */}
          {analysisReport?.file_structure?.tree ? (
            <div className="bg-background rounded-xl p-4 font-mono text-sm overflow-x-auto">
              <pre className="whitespace-pre leading-relaxed">
                <span className="text-amber-500">📁</span> {projectName}/
{'\n'}{analysisReport.file_structure.tree}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Run analysis to scan project structure</p>
          )}

          {/* Key Files */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase mb-3">Key Files Status</p>
            <div className="grid grid-cols-2 gap-2">
              {fileChecks.map((file) => (
                <FileCard key={file.name} file={file} onCopy={onCopyPath} />
              ))}
            </div>
          </div>
        </div>
      </ExpandableCard>

      {/* Data Sources */}
      <ExpandableCard
        title="Data Sources"
        subtitle="Database and signal connections"
        icon={<Database className="h-4 w-4" />}
        status={supabaseConnected ? 'pass' : 'fail'}
        defaultExpanded={false}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-muted/30 rounded-xl border border-border">
            <p className="text-xs font-semibold text-green-500 uppercase mb-2">Source of Truth</p>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-green-500" />
              <span className="font-semibold">Supabase</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">wave_stories table</p>
            <div className="flex items-center gap-2 mt-2">
              {supabaseConnected ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-xs">{supabaseConnected ? 'Connected' : 'Not connected'}</span>
            </div>
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

        {/* Stories Sync */}
        <div className="mt-4 p-4 bg-muted/30 rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{storiesCount > 0 ? `${storiesCount} AI Stories in Database` : 'No AI Stories in Database'}</p>
              {storiesFound > storiesCount && (
                <p className="text-sm text-amber-500">({storiesFound} found in files - click Sync)</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {syncMessage && (
                <span className={cn(
                  "text-xs",
                  syncMessage.includes('error') || syncMessage.includes('failed') ? 'text-red-500' : 'text-green-500'
                )}>
                  {syncMessage}
                </span>
              )}
              <button
                onClick={onSyncStories}
                disabled={syncingStories || !supabaseConnected}
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
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
            </div>
          </div>
        </div>
      </ExpandableCard>

      {/* AI PRD Analysis */}
      <ExpandableCard
        title="AI PRD Document"
        subtitle={analysisReport?.ai_prd?.prd_location || 'Not detected'}
        icon={<ScrollText className="h-4 w-4" />}
        status={analysisReport?.ai_prd ? getStatusFromString(analysisReport.ai_prd.status) : 'pending'}
        defaultExpanded={analysisReport?.ai_prd?.status !== 'pass'}
      >
        <AnalysisDetailCard
          findings={analysisReport?.ai_prd?.findings || []}
          issues={analysisReport?.ai_prd?.issues || []}
        />
      </ExpandableCard>

      {/* AI Stories Analysis */}
      <ExpandableCard
        title="AI Stories"
        subtitle={`${storiesFound} stories detected`}
        icon={<Database className="h-4 w-4" />}
        status={analysisReport?.ai_stories ? getStatusFromString(analysisReport.ai_stories.status) : 'pending'}
        defaultExpanded={analysisReport?.ai_stories?.status !== 'pass'}
      >
        <AnalysisDetailCard
          findings={analysisReport?.ai_stories?.findings || []}
          issues={analysisReport?.ai_stories?.issues || []}
        />
      </ExpandableCard>

      {/* HTML Prototypes */}
      <ExpandableCard
        title="HTML Prototypes"
        subtitle={`${analysisReport?.html_prototype?.files_found?.length || 0} files found`}
        icon={<Layers className="h-4 w-4" />}
        status={analysisReport?.html_prototype ? getStatusFromString(analysisReport.html_prototype.status) : 'pending'}
        defaultExpanded={analysisReport?.html_prototype?.status !== 'pass'}
      >
        <AnalysisDetailCard
          findings={analysisReport?.html_prototype?.findings || []}
          issues={analysisReport?.html_prototype?.issues || []}
        />
      </ExpandableCard>

      {/* Gap Analysis */}
      {analysisReport?.gap_analysis?.gaps && analysisReport.gap_analysis.gaps.length > 0 && (
        <ExpandableCard
          title="Identified Gaps"
          subtitle={`${analysisReport.gap_analysis.gaps.length} gaps require attention`}
          icon={<AlertTriangle className="h-4 w-4" />}
          status="warn"
          defaultExpanded={true}
        >
          <div className="space-y-2">
            {analysisReport.gap_analysis.gaps.map((gap, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{gap.category}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium",
                      gap.priority === 'high' ? 'bg-red-500/10 text-red-500' :
                      gap.priority === 'medium' ? 'bg-amber-500/10 text-amber-500' :
                      'bg-green-500/10 text-green-500'
                    )}>
                      {gap.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{gap.description}</p>
                  <p className="text-xs text-blue-500 mt-1">{gap.action}</p>
                </div>
              </div>
            ))}
          </div>
        </ExpandableCard>
      )}

      {/* Improvement Plan */}
      {analysisReport?.improvement_plan && analysisReport.improvement_plan.length > 0 && (
        <ExpandableCard
          title="Improvement Plan"
          subtitle={`${improvementSteps} steps to complete`}
          icon={<ArrowRight className="h-4 w-4" />}
          status="pass"
          defaultExpanded={false}
        >
          <div className="space-y-3">
            {analysisReport.improvement_plan.map((step) => (
              <div key={step.step} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                  {step.step}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{step.title}</h4>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium",
                      step.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'
                    )}>
                      {step.status === 'completed' ? 'Done' : 'Pending'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </ExpandableCard>
      )}
    </TabContainer>
  );
}

export default PRDStoriesTab;
