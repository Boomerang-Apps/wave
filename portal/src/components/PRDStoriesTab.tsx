/**
 * PRDStoriesTab Component (Launch Sequence)
 *
 * Step 1: Validate PRD & Stories before execution planning
 * Uses standardized TabLayout components for consistent UI
 * Enhanced with PRD Generation, Stories Generation, and Alignment Checking
 */

import { useState, useCallback } from 'react';
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
  Zap,
  Wand2,
  Link2,
  BookOpen,
  Sparkles,
  FileDown,
} from 'lucide-react';
import { InfoBox, KPICards, ActionBar, ResultSummary, ExpandableCard, TabContainer } from './TabLayout';
import { AlignmentReport, type AlignmentReportData } from './AlignmentReport';
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

export interface PRDData {
  projectId: string;
  version: string;
  overview: {
    name: string;
    tagline: string;
    description: string;
    problemStatement: string;
  };
  goals: {
    primary: string[];
    secondary: string[];
    nonGoals: string[];
  };
  features: {
    core: Array<{
      id: string;
      name: string;
      description: string;
      domain: string;
      priority: string;
      acceptanceCriteria: string[];
    }>;
  };
  technical: {
    stack: string[];
    integrations: string[];
    constraints: string[];
  };
}

export interface StoryData {
  id: string;
  title: string;
  domain: string;
  priority: string;
  storyPoints: number;
  userStory: {
    asA: string;
    iWant: string;
    soThat: string;
  };
  gwt: {
    given: string[];
    when: string[];
    then: string[];
  };
  acceptanceCriteria: Array<{
    id: string;
    description: string;
    testable: boolean;
  }>;
  mockupRefs?: Array<{
    file: string;
    elements: string[];
  }>;
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
  // Optional: External PRD/Stories data
  prdData?: PRDData | null;
  storiesData?: StoryData[] | null;
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
  onCopyPath,
  prdData: externalPrd,
  storiesData: externalStories,
}: PRDStoriesTabProps) {
  const [_folderExpanded, _setFolderExpanded] = useState(false);

  // PRD Generation State
  const [prd, setPrd] = useState<PRDData | null>(externalPrd || null);
  const [prdGenerating, setPrdGenerating] = useState(false);
  const [prdScore, setPrdScore] = useState<number | null>(null);
  const [prdStatus, setPrdStatus] = useState<string | null>(null);

  // Stories Generation State
  const [stories, setStories] = useState<StoryData[]>(externalStories || []);
  const [storiesGenerating, setStoriesGenerating] = useState(false);
  const [storiesAvgScore, setStoriesAvgScore] = useState<number | null>(null);
  const [storiesStatus, setStoriesStatus] = useState<string | null>(null);

  // Alignment State
  const [alignmentReport, setAlignmentReport] = useState<AlignmentReportData | null>(null);
  const [alignmentChecking, setAlignmentChecking] = useState(false);

  // Report Generation State
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportSaved, setReportSaved] = useState<string | null>(null);

  // Generate PRD from project sources
  const handleGeneratePRD = useCallback(async () => {
    setPrdGenerating(true);
    try {
      const response = await fetch('/api/generate-prd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath,
          sources: {},
          options: { skipLLM: true },
        }),
      });

      const data = await response.json();
      if (data.success) {
        setPrd(data.prd);
        setPrdScore(data.score);
        setPrdStatus(data.status);
      } else {
        console.error('PRD generation failed:', data.error);
      }
    } catch (error) {
      console.error('PRD generation error:', error);
    } finally {
      setPrdGenerating(false);
    }
  }, [projectPath]);

  // Generate Stories from PRD
  const handleGenerateStories = useCallback(async () => {
    if (!prd) {
      console.warn('Cannot generate stories without PRD');
      return;
    }

    setStoriesGenerating(true);
    try {
      const response = await fetch('/api/generate-stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath,
          prd,
          options: { skipLLM: true },
        }),
      });

      const data = await response.json();
      if (data.success) {
        setStories(data.stories);
        setStoriesAvgScore(data.averageScore);
        setStoriesStatus(data.status);
      } else {
        console.error('Stories generation failed:', data.error);
      }
    } catch (error) {
      console.error('Stories generation error:', error);
    } finally {
      setStoriesGenerating(false);
    }
  }, [projectPath, prd]);

  // Check Alignment
  const handleCheckAlignment = useCallback(async () => {
    if (!prd || stories.length === 0) {
      console.warn('Cannot check alignment without PRD and stories');
      return;
    }

    setAlignmentChecking(true);
    try {
      const response = await fetch('/api/check-alignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath,
          prd,
          stories,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setAlignmentReport(data.report);
      } else {
        console.error('Alignment check failed:', data.error);
      }
    } catch (error) {
      console.error('Alignment check error:', error);
    } finally {
      setAlignmentChecking(false);
    }
  }, [projectPath, prd, stories]);

  // Generate Improvement Report
  const handleGenerateReport = useCallback(async () => {
    setReportGenerating(true);
    setReportSaved(null);
    try {
      const response = await fetch('/api/prd-stories/improvement-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath,
          prd,
          stories,
          alignmentReport,
          prdScore,
          storiesScore: storiesAvgScore,
          save: true,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setReportSaved(data.savedPath);
      } else {
        console.error('Report generation failed:', data.error);
      }
    } catch (error) {
      console.error('Report generation error:', error);
    } finally {
      setReportGenerating(false);
    }
  }, [projectPath, prd, stories, alignmentReport, prdScore, storiesAvgScore]);

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
            label: 'PRD Score',
            value: prdScore !== null ? `${prdScore}%` : '-',
            status: prdScore !== null ? (prdScore >= 80 ? 'success' : prdScore >= 60 ? 'warning' : 'error') : 'neutral',
            icon: <ScrollText className="h-4 w-4" />
          },
          {
            label: 'Stories',
            value: stories.length || storiesFound || storiesCount,
            status: (stories.length || storiesFound || storiesCount) > 0 ? 'success' : 'neutral',
            icon: <Database className="h-4 w-4" />
          },
          {
            label: 'Story Score',
            value: storiesAvgScore !== null ? `${storiesAvgScore.toFixed(0)}%` : '-',
            status: storiesAvgScore !== null ? (storiesAvgScore >= 80 ? 'success' : storiesAvgScore >= 60 ? 'warning' : 'error') : 'neutral',
            icon: <BookOpen className="h-4 w-4" />
          },
          {
            label: 'Alignment',
            value: alignmentReport ? `${alignmentReport.score}%` : '-',
            status: alignmentReport ? (alignmentReport.valid ? 'success' : 'warning') : 'neutral',
            icon: <Link2 className="h-4 w-4" />
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

      {/* 5. GENERATION WIZARD */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        {/* Wizard Header with Stepper */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wand2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">PRD & Stories Wizard</h3>
              <p className="text-sm text-muted-foreground">Generate and validate your project artifacts</p>
            </div>
          </div>
          {/* Report Generation Button */}
          <button
            onClick={handleGenerateReport}
            disabled={reportGenerating || (!prd && stories.length === 0 && !alignmentReport)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors",
              reportSaved
                ? "bg-green-500/10 text-green-500 border border-green-500/20"
                : "bg-muted hover:bg-muted/80 text-foreground"
            )}
          >
            {reportGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : reportSaved ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Saved: {reportSaved}
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                Save Report (.md)
              </>
            )}
          </button>
        </div>

        {/* Connected Step Indicators */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center">
            {/* Step 1 indicator */}
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all",
              prd ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
            )}>
              {prd ? <CheckCircle2 className="h-5 w-5" /> : '1'}
            </div>
            {/* Connector 1-2 */}
            <div className={cn(
              "w-24 h-1 transition-all",
              prd ? "bg-green-500" : "bg-muted"
            )} />
            {/* Step 2 indicator */}
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all",
              stories.length > 0 ? "bg-green-500 text-white" : prd ? "bg-primary text-white" : "bg-muted text-muted-foreground"
            )}>
              {stories.length > 0 ? <CheckCircle2 className="h-5 w-5" /> : '2'}
            </div>
            {/* Connector 2-3 */}
            <div className={cn(
              "w-24 h-1 transition-all",
              stories.length > 0 ? "bg-green-500" : "bg-muted"
            )} />
            {/* Step 3 indicator */}
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all",
              alignmentReport?.valid ? "bg-green-500 text-white" :
              alignmentReport ? "bg-amber-500 text-white" :
              stories.length > 0 ? "bg-primary text-white" : "bg-muted text-muted-foreground"
            )}>
              {alignmentReport?.valid ? <CheckCircle2 className="h-5 w-5" /> :
               alignmentReport ? <AlertTriangle className="h-5 w-5" /> : '3'}
            </div>
          </div>
        </div>

        {/* Step Cards */}
        <div className="grid grid-cols-3 gap-4">
        {/* Step 1: Generate PRD */}
        <div className={cn(
          "p-4 rounded-xl border-2 transition-all",
          prd ? "border-green-500/50 bg-green-500/5" : "border-border bg-card"
        )}>
          <div className="flex items-center gap-2 mb-3">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
              prd ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
            )}>
              {prd ? <CheckCircle2 className="h-4 w-4" /> : '1'}
            </div>
            <div>
              <h4 className="font-medium text-sm">Generate PRD</h4>
              <p className="text-xs text-muted-foreground">From project sources</p>
            </div>
          </div>
          {prd ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Score</span>
                <span className={cn(
                  "font-medium",
                  prdScore && prdScore >= 80 ? "text-green-500" : prdScore && prdScore >= 60 ? "text-amber-500" : "text-red-500"
                )}>
                  {prdScore}%
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize">{prdStatus}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Features</span>
                <span className="font-medium">{prd.features?.core?.length || 0}</span>
              </div>
              <button
                onClick={handleGeneratePRD}
                disabled={prdGenerating}
                className="w-full mt-2 px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-lg transition-colors"
              >
                Regenerate
              </button>
            </div>
          ) : (
            <button
              onClick={handleGeneratePRD}
              disabled={prdGenerating}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {prdGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Generate PRD
                </>
              )}
            </button>
          )}
        </div>

        {/* Step 2: Generate Stories */}
        <div className={cn(
          "p-4 rounded-xl border-2 transition-all",
          stories.length > 0 ? "border-green-500/50 bg-green-500/5" :
          !prd ? "border-border bg-muted/50 opacity-60" : "border-border bg-card"
        )}>
          <div className="flex items-center gap-2 mb-3">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
              stories.length > 0 ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
            )}>
              {stories.length > 0 ? <CheckCircle2 className="h-4 w-4" /> : '2'}
            </div>
            <div>
              <h4 className="font-medium text-sm">Generate Stories</h4>
              <p className="text-xs text-muted-foreground">From PRD features</p>
            </div>
          </div>
          {stories.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Count</span>
                <span className="font-medium">{stories.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Avg Score</span>
                <span className={cn(
                  "font-medium",
                  storiesAvgScore && storiesAvgScore >= 80 ? "text-green-500" : storiesAvgScore && storiesAvgScore >= 60 ? "text-amber-500" : "text-red-500"
                )}>
                  {storiesAvgScore?.toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize">{storiesStatus}</span>
              </div>
              <button
                onClick={handleGenerateStories}
                disabled={storiesGenerating || !prd}
                className="w-full mt-2 px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-lg transition-colors"
              >
                Regenerate
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerateStories}
              disabled={storiesGenerating || !prd}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {storiesGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Stories
                </>
              )}
            </button>
          )}
        </div>

        {/* Step 3: Check Alignment */}
        <div className={cn(
          "p-4 rounded-xl border-2 transition-all",
          alignmentReport?.valid ? "border-green-500/50 bg-green-500/5" :
          alignmentReport ? "border-amber-500/50 bg-amber-500/5" :
          stories.length === 0 ? "border-border bg-muted/50 opacity-60" : "border-border bg-card"
        )}>
          <div className="flex items-center gap-2 mb-3">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
              alignmentReport?.valid ? "bg-green-500 text-white" :
              alignmentReport ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"
            )}>
              {alignmentReport?.valid ? <CheckCircle2 className="h-4 w-4" /> :
               alignmentReport ? <AlertTriangle className="h-4 w-4" /> : '3'}
            </div>
            <div>
              <h4 className="font-medium text-sm">Check Alignment</h4>
              <p className="text-xs text-muted-foreground">PRD ↔ Stories ↔ Mockups</p>
            </div>
          </div>
          {alignmentReport ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Score</span>
                <span className={cn(
                  "font-medium",
                  alignmentReport.score >= 80 ? "text-green-500" : alignmentReport.score >= 60 ? "text-amber-500" : "text-red-500"
                )}>
                  {alignmentReport.score}%
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className={cn(
                  "font-medium",
                  alignmentReport.valid ? "text-green-500" : "text-amber-500"
                )}>
                  {alignmentReport.valid ? 'Aligned' : 'Gaps Found'}
                </span>
              </div>
              <button
                onClick={handleCheckAlignment}
                disabled={alignmentChecking || !prd || stories.length === 0}
                className="w-full mt-2 px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-lg transition-colors"
              >
                Re-check
              </button>
            </div>
          ) : (
            <button
              onClick={handleCheckAlignment}
              disabled={alignmentChecking || !prd || stories.length === 0}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {alignmentChecking ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4" />
                  Check Alignment
                </>
              )}
            </button>
          )}
        </div>
        </div>
      </div>

      {/* Alignment Report */}
      {alignmentReport && (
        <ExpandableCard
          title="Alignment Report"
          subtitle={`Score: ${alignmentReport.score}/100`}
          icon={<Link2 className="h-4 w-4" />}
          status={alignmentReport.valid ? 'pass' : 'warn'}
          defaultExpanded={!alignmentReport.valid}
        >
          <AlignmentReport
            report={alignmentReport}
            onRunCheck={handleCheckAlignment}
          />
        </ExpandableCard>
      )}

      {/* 6. EXPANDABLE DETAIL CARDS */}

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
