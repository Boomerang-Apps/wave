/**
 * FoundationAnalysisProgress Component (Gate 0)
 *
 * Displays real-time analysis progress for foundation validation.
 * Supports dual-mode: New Project (6 steps) vs Existing Project (10+ steps)
 * Optional AI Deep Review for semantic code analysis
 */

import { useState, useCallback, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  FolderTree,
  X,
  Brain,
  Shield,
  Layers,
  Zap,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Play,
  FileDown,
  Wand2,
  Rocket,
  Code2
} from 'lucide-react';
import { ConnectionCards } from './ConnectionCards';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface AnalysisStep {
  step: number;
  status: 'pending' | 'running' | 'complete' | 'failed';
  detail: string;
  proof: string | null;
}

// AI Review Finding type
export interface AIReviewFinding {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  file?: string;
  line?: number;
  suggestion?: string;
}

// AI Review result type
export interface AIReviewResult {
  securityFindings: AIReviewFinding[];
  architectureFindings: AIReviewFinding[];
  qualityFindings: AIReviewFinding[];
  scorePenalty: number;
  nonDevSummary: string;
  filesAnalyzed: number;
  tokensUsed: number;
  cost: number;
}

export interface FoundationReport {
  timestamp: string;
  mode: 'new' | 'existing' | 'monorepo';
  projectPath: string;
  readinessScore: number;
  analysis: {
    structure?: { status: string; findings: string[]; issues: string[]; proof?: string };
    documentation?: { status: string; findings: string[]; issues: string[]; docsFound: { name: string; path: string }[]; proof?: string };
    mockups?: { status: string; findings: string[]; issues: string[]; count: number; mockupsFound: string[]; proof?: string };
    compliance?: { status: string; findings: string[]; issues: string[]; complianceScore: number; proof?: string };
    techstack?: { status: string; findings: string[]; issues: string[]; techStack: string[]; proof?: string };
    architecture?: { status: string; findings: string[]; issues: string[]; architecture: { pattern: string }; proof?: string };
    sourcefiles?: { status: string; findings: string[]; issues: string[]; total: number; counts: Record<string, number>; proof?: string };
    patterns?: { status: string; findings: string[]; issues: string[]; patterns: Record<string, boolean>; proof?: string };
    testing?: { status: string; findings: string[]; issues: string[]; testCount: number; hasConfig: boolean; proof?: string };
    issues?: { status: string; findings: string[]; issues: string[]; proof?: string };
  };
  findings: string[];
  issues: string[];
  recommendations: string[];
  validationStatus: 'ready' | 'blocked';
  blockingReasons: string[];
  // AI Review results (optional)
  aiReview?: AIReviewResult;
}

// Cost estimation response type
export interface CostEstimate {
  filesCount: number;
  estimatedTokens: number;
  estimatedCost: {
    quick: number;
    deep: number;
  };
  depth: 'quick' | 'deep';
  recommendation: string;
  warning: string | null;
}

export interface FoundationAnalysisProgressProps {
  projectPath: string;
  onAnalysisComplete: (report: FoundationReport) => void;
  onValidationComplete: (status: 'ready' | 'blocked') => void;
}

// Step labels for UI
const NEW_PROJECT_STEP_LABELS: Record<number, string> = {
  1: 'Scanning project structure',
  2: 'Validating documentation',
  3: 'Analyzing design mockups',
  4: 'Checking folder compliance',
  5: 'Validating tech stack',
  6: 'Generating readiness score',
};

const EXISTING_PROJECT_STEP_LABELS: Record<number, string> = {
  1: 'Scanning project structure',
  2: 'Detecting tech stack',
  3: 'Analyzing code architecture',
  4: 'Counting source files',
  5: 'Finding documentation',
  6: 'Checking design mockups',
  7: 'Analyzing code patterns',
  8: 'Detecting test coverage',
  9: 'Identifying potential issues',
  10: 'Generating comprehensive report',
  11: 'AI Deep Review (Security, Architecture, Quality)',
};

// ============================================
// Sub-components
// ============================================

function StepItem({
  step,
  label,
  status,
  detail,
  proof
}: {
  step: number;
  label: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
  detail: string;
  proof: string | null;
}) {
  return (
    <div
      className={cn(
        "border rounded-xl overflow-hidden transition-all",
        status === 'running' ? 'border-blue-500/30 bg-blue-500/10' :
        status === 'complete' ? 'border-green-500/30 bg-green-500/10' :
        status === 'failed' ? 'border-red-500/30 bg-red-500/10' :
        'border-border bg-muted/30'
      )}
    >
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
            status === 'running' ? 'bg-blue-500 text-white' :
            status === 'complete' ? 'bg-green-500 text-white' :
            status === 'failed' ? 'bg-red-500 text-white' :
            'bg-muted text-muted-foreground'
          )}>
            {status === 'running' ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : status === 'complete' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : status === 'failed' ? (
              <XCircle className="h-4 w-4" />
            ) : (
              step
            )}
          </div>
          <div>
            <p className="font-medium text-sm">{label}</p>
            <p className="text-xs text-muted-foreground">{detail}</p>
          </div>
        </div>
        <span className={cn(
          "text-xs font-medium px-2 py-1 rounded-full",
          status === 'running' ? 'bg-blue-500/20 text-blue-500' :
          status === 'complete' ? 'bg-green-500/20 text-green-500' :
          status === 'failed' ? 'bg-red-500/20 text-red-500' :
          'bg-muted text-muted-foreground'
        )}>
          {status === 'running' ? 'Running...' :
           status === 'complete' ? 'Complete' :
           status === 'failed' ? 'Failed' : 'Pending'}
        </span>
      </div>

      {/* Proof section */}
      {proof && status === 'complete' && (
        <div className="px-4 pb-3">
          <div className="bg-background rounded-lg p-3 text-xs font-mono text-foreground overflow-x-auto max-h-24 overflow-y-auto">
            <pre className="whitespace-pre-wrap">{proof}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultSummaryCard({ report }: { report: FoundationReport }) {
  const isReady = report.validationStatus === 'ready';
  const score = report.readinessScore;

  return (
    <div className={cn(
      "p-4 rounded-xl border",
      isReady ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
    )}>
      <div className="flex items-start gap-3">
        {isReady ? (
          <CheckCircle2 className="h-6 w-6 text-green-500 mt-0.5" />
        ) : (
          <AlertTriangle className="h-6 w-6 text-red-500 mt-0.5" />
        )}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <p className={cn(
              "font-semibold",
              isReady ? 'text-green-500' : 'text-red-500'
            )}>
              {isReady ? 'Foundation Ready' : 'Foundation Blocked'}
            </p>
            <span className={cn(
              "text-2xl font-bold",
              score >= 80 ? 'text-green-500' :
              score >= 60 ? 'text-amber-500' :
              'text-red-500'
            )}>
              {score}%
            </span>
          </div>

          <p className="text-sm text-muted-foreground mb-3">
            {report.mode === 'new' ? 'New Project' : report.mode === 'monorepo' ? 'Monorepo' : 'Existing Project'} Analysis Complete
          </p>

          {/* Key metrics */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center p-2 bg-background rounded-lg">
              <p className="text-lg font-bold">{report.analysis.documentation?.docsFound?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Docs Found</p>
            </div>
            <div className="text-center p-2 bg-background rounded-lg">
              <p className="text-lg font-bold">{report.analysis.mockups?.count || 0}</p>
              <p className="text-xs text-muted-foreground">Mockups</p>
            </div>
            <div className="text-center p-2 bg-background rounded-lg">
              <p className="text-lg font-bold">{report.issues.length}</p>
              <p className="text-xs text-muted-foreground">Issues</p>
            </div>
          </div>

          {/* Blocking reasons */}
          {report.blockingReasons.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-red-500 mb-1">Blocking Issues:</p>
              <ul className="text-xs text-red-400 space-y-1">
                {report.blockingReasons.map((reason, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Severity badge colors
const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-500/20', text: 'text-red-500', border: 'border-red-500/30' },
  high: { bg: 'bg-orange-500/20', text: 'text-orange-500', border: 'border-orange-500/30' },
  medium: { bg: 'bg-amber-500/20', text: 'text-amber-500', border: 'border-amber-500/30' },
  low: { bg: 'bg-blue-500/20', text: 'text-blue-500', border: 'border-blue-500/30' },
};


// AI Finding Item
function AIFindingItem({ finding }: { finding: AIReviewFinding }) {
  const [expanded, setExpanded] = useState(false);
  const colors = SEVERITY_COLORS[finding.severity] || SEVERITY_COLORS.low;

  return (
    <div className={cn("border rounded-lg overflow-hidden", colors.border)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted/50 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded", colors.bg, colors.text)}>
          {finding.severity.toUpperCase()}
        </span>
        <span className="text-sm font-medium flex-1 truncate">{finding.title}</span>
        {finding.file && (
          <span className="text-xs text-muted-foreground font-mono truncate max-w-[150px]">
            {finding.file.split('/').pop()}
            {finding.line && `:${finding.line}`}
          </span>
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border/50">
          <p className="text-sm text-muted-foreground">{finding.description}</p>
          {finding.suggestion && (
            <div className="p-2 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-500">
              <span className="font-medium">Suggestion: </span>
              {finding.suggestion}
            </div>
          )}
          {finding.file && (
            <p className="text-xs text-muted-foreground font-mono">
              File: {finding.file}{finding.line && ` (line ${finding.line})`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// AI Review Section
function AIReviewSection({ aiReview }: { aiReview: AIReviewResult }) {
  const [expandedSection, setExpandedSection] = useState<string | null>('summary');

  const criticalCount = [
    ...aiReview.securityFindings,
    ...aiReview.architectureFindings,
    ...aiReview.qualityFindings,
  ].filter(f => f.severity === 'critical' || f.severity === 'high').length;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-500" />
          <h3 className="font-semibold">AI Deep Review</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{aiReview.filesAnalyzed} files</span>
          <span>•</span>
          <span>{aiReview.tokensUsed.toLocaleString()} tokens</span>
          <span>•</span>
          <span className="text-green-500">${aiReview.cost.toFixed(4)}</span>
        </div>
      </div>

      {/* Non-Dev Summary (Traffic Light) */}
      <div
        className={cn(
          "p-4 rounded-xl border cursor-pointer transition-all",
          expandedSection === 'summary' ? 'bg-purple-500/10 border-purple-500/30' : 'bg-muted/30 border-border hover:border-purple-500/30'
        )}
        onClick={() => setExpandedSection(expandedSection === 'summary' ? null : 'summary')}
      >
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-medium">Plain English Summary</span>
          <span className={cn(
            "ml-auto text-xs font-medium px-2 py-0.5 rounded-full",
            criticalCount === 0 ? 'bg-green-500/20 text-green-500' :
            criticalCount <= 2 ? 'bg-amber-500/20 text-amber-500' :
            'bg-red-500/20 text-red-500'
          )}>
            {criticalCount === 0 ? '🟢 Good' : criticalCount <= 2 ? '🟡 Caution' : '🔴 Attention Needed'}
          </span>
        </div>
        {expandedSection === 'summary' && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {aiReview.nonDevSummary || 'No summary available.'}
          </p>
        )}
      </div>

      {/* Findings by Category */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setExpandedSection(expandedSection === 'security' ? null : 'security')}
          className={cn(
            "p-3 rounded-xl border text-center transition-all",
            expandedSection === 'security' ? 'bg-red-500/10 border-red-500/30' : 'bg-muted/30 border-border hover:border-red-500/30'
          )}
        >
          <Shield className="h-5 w-5 text-red-500 mx-auto mb-1" />
          <p className="text-lg font-bold">{aiReview.securityFindings.length}</p>
          <p className="text-xs text-muted-foreground">Security</p>
        </button>

        <button
          onClick={() => setExpandedSection(expandedSection === 'architecture' ? null : 'architecture')}
          className={cn(
            "p-3 rounded-xl border text-center transition-all",
            expandedSection === 'architecture' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-muted/30 border-border hover:border-blue-500/30'
          )}
        >
          <Layers className="h-5 w-5 text-blue-500 mx-auto mb-1" />
          <p className="text-lg font-bold">{aiReview.architectureFindings.length}</p>
          <p className="text-xs text-muted-foreground">Architecture</p>
        </button>

        <button
          onClick={() => setExpandedSection(expandedSection === 'quality' ? null : 'quality')}
          className={cn(
            "p-3 rounded-xl border text-center transition-all",
            expandedSection === 'quality' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-muted/30 border-border hover:border-amber-500/30'
          )}
        >
          <Zap className="h-5 w-5 text-amber-500 mx-auto mb-1" />
          <p className="text-lg font-bold">{aiReview.qualityFindings.length}</p>
          <p className="text-xs text-muted-foreground">Quality</p>
        </button>
      </div>

      {/* Expanded Findings List */}
      {expandedSection && expandedSection !== 'summary' && (
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {expandedSection === 'security' && aiReview.securityFindings.map((f, i) => (
            <AIFindingItem key={i} finding={f} />
          ))}
          {expandedSection === 'architecture' && aiReview.architectureFindings.map((f, i) => (
            <AIFindingItem key={i} finding={f} />
          ))}
          {expandedSection === 'quality' && aiReview.qualityFindings.map((f, i) => (
            <AIFindingItem key={i} finding={f} />
          ))}

          {/* Empty state */}
          {((expandedSection === 'security' && aiReview.securityFindings.length === 0) ||
            (expandedSection === 'architecture' && aiReview.architectureFindings.length === 0) ||
            (expandedSection === 'quality' && aiReview.qualityFindings.length === 0)) && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-sm">No issues found in this category</p>
            </div>
          )}
        </div>
      )}

      {/* Score impact */}
      {aiReview.scorePenalty > 0 && (
        <div className="flex items-center justify-between p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm">
          <span className="text-red-400">Score penalty from AI findings:</span>
          <span className="font-bold text-red-500">-{aiReview.scorePenalty} points</span>
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function FoundationAnalysisProgress({
  projectPath,
  onAnalysisComplete,
  onValidationComplete
}: FoundationAnalysisProgressProps) {
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<'new' | 'existing' | 'monorepo' | null>(null);
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([]);
  const [analysisReport, setAnalysisReport] = useState<FoundationReport | null>(null);
  const [showModal, setShowModal] = useState(false);

  // AI Review options
  const [enableAiReview, setEnableAiReview] = useState(false);
  const [aiReviewDepth, setAiReviewDepth] = useState<'quick' | 'deep'>('quick');
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null);
  const [, setEstimatingCost] = useState(false);

  // Report download
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [reportSavedPath, setReportSavedPath] = useState<string | null>(null);

  // Quick Setup
  const [applyingFixes, setApplyingFixes] = useState(false);
  const [fixResults, setFixResults] = useState<{ created: { type: string; path: string }[]; skipped: { type: string; path: string; reason: string }[] } | null>(null);

  // Fetch cost estimate when AI review is enabled
  useEffect(() => {
    if (!enableAiReview || !projectPath) {
      setCostEstimate(null);
      return;
    }

    const fetchEstimate = async () => {
      setEstimatingCost(true);
      try {
        const response = await fetch('/api/ai-review/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectPath, depth: aiReviewDepth })
        });

        if (response.ok) {
          const data = await response.json();
          // API returns { success: true, estimate: {...} }
          setCostEstimate(data.estimate || data);
        }
      } catch (err) {
        console.error('Failed to estimate cost:', err);
      } finally {
        setEstimatingCost(false);
      }
    };

    fetchEstimate();
  }, [enableAiReview, aiReviewDepth, projectPath]);

  // Start the analysis
  const startAnalysis = useCallback(async () => {
    if (!projectPath || analysisRunning) return;

    setAnalysisRunning(true);
    setAnalysisReport(null);
    setAnalysisSteps([]);
    setShowModal(true);
    setFixResults(null);
    setReportSavedPath(null);

    try {
      const response = await fetch('/api/analyze-foundation-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath,
          mode: 'auto',
          enableAiReview,
          aiReviewDepth
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start analysis');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              // Handle mode detection
              if (data.type === 'mode') {
                setAnalysisMode(data.mode);
                const totalSteps = data.totalSteps;
                const labels = data.mode === 'new' ? NEW_PROJECT_STEP_LABELS : EXISTING_PROJECT_STEP_LABELS;

                // Initialize all steps as pending
                const initialSteps: AnalysisStep[] = [];
                for (let i = 1; i <= totalSteps; i++) {
                  initialSteps.push({
                    step: i,
                    status: 'pending',
                    detail: labels[i] || `Step ${i}`,
                    proof: null
                  });
                }
                setAnalysisSteps(initialSteps);
              }
              // Handle step updates
              else if (typeof data.step === 'number') {
                setAnalysisSteps(prev => prev.map(s =>
                  s.step === data.step
                    ? { ...s, status: data.status, detail: data.detail || s.detail, proof: data.proof }
                    : s
                ));
              }
              // Handle "done" step - mark all remaining steps as complete
              else if (data.step === 'done') {
                setAnalysisSteps(prev => prev.map(s =>
                  s.status === 'running' || s.status === 'pending'
                    ? { ...s, status: 'complete', detail: s.detail }
                    : s
                ));
              }
              // Handle final result
              else if (data.type === 'result') {
                setAnalysisReport(data.report);
                onAnalysisComplete(data.report);
                onValidationComplete(data.report.validationStatus);
              }
              // Handle errors
              else if (data.type === 'error') {
                console.error('Analysis error:', data.error);
              }
            } catch (parseErr) {
              console.error('Failed to parse SSE data:', parseErr);
            }
          }
        }
      }
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setAnalysisRunning(false);
    }
  }, [projectPath, analysisRunning, enableAiReview, aiReviewDepth, onAnalysisComplete, onValidationComplete]);

  const stepLabels = analysisMode === 'new' ? NEW_PROJECT_STEP_LABELS : EXISTING_PROJECT_STEP_LABELS;

  // Open modal for configuration
  const openAnalysisModal = () => {
    setShowModal(true);
    // Reset state for fresh analysis
    if (!analysisRunning && analysisReport) {
      setAnalysisSteps([]);
      setAnalysisReport(null);
      setAnalysisMode(null);
      setReportSavedPath(null);
    }
  };

  // Download improvement report - saves to project AND triggers browser download
  const downloadReport = useCallback(async () => {
    if (!analysisReport || downloadingReport) {
      return;
    }

    setDownloadingReport(true);
    try {
      const response = await fetch('/api/foundation/improvement-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath,
          report: analysisReport,
          save: true
        })
      });

      if (!response.ok) {
        console.error('[DownloadReport] API error:', response.status);
        return;
      }

      const data = await response.json();

      if (data.success) {
        // Update state to show saved location
        if (data.savedPath) {
          setReportSavedPath(data.savedPath);
        }

        // Also trigger browser download
        if (data.markdown) {
          const blob = new Blob([data.markdown], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'FOUNDATION-IMPROVEMENT-REPORT.md';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }
    } catch (err) {
      console.error('[DownloadReport] Failed:', err);
    } finally {
      setDownloadingReport(false);
    }
  }, [analysisReport, projectPath, downloadingReport]);

  // Apply Quick Setup - create missing directories and template files
  const applyQuickSetup = useCallback(async () => {
    if (applyingFixes) return;

    setApplyingFixes(true);
    setFixResults(null);
    try {
      const response = await fetch('/api/foundation/apply-fixes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath,
          fixes: ['all'] // Apply all fixes
        })
      });

      if (!response.ok) {
        console.error('[QuickSetup] API error:', response.status);
        return;
      }

      const data = await response.json();

      if (data.success) {
        setFixResults({
          created: data.created || [],
          skipped: data.skipped || []
        });
      }
    } catch (err) {
      console.error('[QuickSetup] Failed:', err);
    } finally {
      setApplyingFixes(false);
    }
  }, [projectPath, applyingFixes]);

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={analysisRunning ? undefined : openAnalysisModal}
        disabled={analysisRunning || !projectPath}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all",
          analysisRunning
            ? "bg-blue-500/20 text-blue-500 cursor-wait"
            : analysisReport
            ? "bg-green-500/10 text-green-500 hover:bg-green-500/20 border border-green-500/30"
            : "bg-blue-500 text-white hover:bg-blue-600"
        )}
      >
        {analysisRunning ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : analysisReport ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            View Results ({analysisReport.readinessScore}%)
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Analyze Foundation
          </>
        )}
      </button>

      {/* Analysis Modal - Large comprehensive view */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !analysisRunning && setShowModal(false)}
          />

          <div className="relative bg-card border border-border rounded-2xl w-full max-w-5xl shadow-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                  <Rocket className="h-7 w-7 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">
                    Foundation Analysis
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Validate your project setup before starting development
                  </p>
                </div>
              </div>
              {!analysisRunning && (
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Show start prompt when no steps yet */}
              {!analysisRunning && analysisSteps.length === 0 && !analysisReport && (
                <div className="space-y-6">
                  {/* What we'll analyze - TOP */}
                  <div className="p-5 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20">
                    <h4 className="font-semibold mb-4 flex items-center gap-2 text-lg">
                      <Sparkles className="h-5 w-5 text-blue-500" />
                      What We'll Analyze
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="text-center p-3 bg-background/50 rounded-lg">
                        <FolderTree className="h-6 w-6 text-blue-500 mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground">Structure</p>
                      </div>
                      <div className="text-center p-3 bg-background/50 rounded-lg">
                        <Code2 className="h-6 w-6 text-green-500 mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground">Documentation</p>
                      </div>
                      <div className="text-center p-3 bg-background/50 rounded-lg">
                        <Layers className="h-6 w-6 text-purple-500 mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground">Mockups</p>
                      </div>
                      <div className="text-center p-3 bg-background/50 rounded-lg">
                        <Zap className="h-6 w-6 text-amber-500 mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground">Tech Stack</p>
                      </div>
                      <div className="text-center p-3 bg-background/50 rounded-lg">
                        <Shield className="h-6 w-6 text-red-500 mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground">Compliance</p>
                      </div>
                    </div>
                  </div>

                  {/* Connection Cards - MIDDLE */}
                  <ConnectionCards
                    projectPath={projectPath}
                    layout="horizontal"
                    showIssues={true}
                  />
                </div>
              )}

              {/* Step progress */}
              {analysisSteps.length > 0 && (
                <div className="space-y-3">
                  {analysisSteps.map((step) => (
                    <StepItem
                      key={step.step}
                      step={step.step}
                      label={stepLabels[step.step] || `Step ${step.step}`}
                      status={step.status}
                      detail={step.detail}
                      proof={step.proof}
                    />
                  ))}
                </div>
              )}

              {/* Result Summary */}
              {analysisReport && (
                <div className="mt-6">
                  <ResultSummaryCard report={analysisReport} />

                  {/* Quick Setup Results */}
                  {fixResults && (
                    <div className="mt-4 p-4 rounded-xl border bg-muted/30 border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <Wand2 className="h-5 w-5 text-purple-500" />
                        <h3 className="font-semibold">Quick Setup Complete</h3>
                      </div>

                      {fixResults.created.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-green-500 mb-1">Created:</p>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {fixResults.created.map((item, i) => (
                              <li key={i} className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                <span className="font-mono">{item.path}</span>
                                <span className="text-muted-foreground/60">({item.type})</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {fixResults.skipped.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Skipped (already exist):</p>
                          <ul className="text-xs text-muted-foreground/60 space-y-1">
                            {fixResults.skipped.map((item, i) => (
                              <li key={i} className="flex items-center gap-1">
                                <span className="font-mono">{item.path}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <p className="text-xs text-purple-400 mt-3">
                        Re-run analysis to see updated score
                      </p>
                    </div>
                  )}

                  {/* AI Review Results */}
                  {analysisReport.aiReview && (
                    <AIReviewSection aiReview={analysisReport.aiReview} />
                  )}
                </div>
              )}
            </div>

            {/* Footer - Pre-analysis (CTA) */}
            {!analysisRunning && analysisSteps.length === 0 && !analysisReport && (
              <div className="px-6 py-4 border-t border-border bg-muted/30 shrink-0">
                <div className="flex items-center justify-between gap-4">
                  {/* AI Review Option */}
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableAiReview}
                        onChange={(e) => setEnableAiReview(e.target.checked)}
                        className="w-4 h-4 rounded border-border bg-muted accent-purple-500"
                      />
                      <Brain className="h-4 w-4 text-purple-500" />
                      <span className="text-sm">AI Deep Review</span>
                    </label>
                    {enableAiReview && (
                      <select
                        value={aiReviewDepth}
                        onChange={(e) => setAiReviewDepth(e.target.value as 'quick' | 'deep')}
                        className="text-xs px-2 py-1 rounded-lg bg-muted border border-border"
                      >
                        <option value="quick">Quick (10 files)</option>
                        <option value="deep">Deep (50 files)</option>
                      </select>
                    )}
                    {enableAiReview && costEstimate && (
                      <span className="text-xs text-muted-foreground">
                        ~${costEstimate.estimatedCost[aiReviewDepth]?.toFixed(4) || '0.00'}
                      </span>
                    )}
                  </div>

                  {/* Start Button */}
                  <button
                    onClick={startAnalysis}
                    className="px-8 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    <Play className="h-5 w-5" />
                    Start Foundation Analysis
                  </button>
                </div>
              </div>
            )}

            {/* Footer - Post-analysis */}
            {!analysisRunning && analysisReport && (
              <div className="px-4 py-3 border-t border-border bg-muted/30 flex justify-between items-center shrink-0">
                <p className="text-xs text-muted-foreground">
                  Completed {analysisSteps.length} analysis steps
                  {analysisReport.aiReview && ' (including AI review)'}
                </p>
                <div className="flex items-center gap-2">
                  {/* Quick Setup Button - show if there are any issues (not just blocked) */}
                  {(analysisReport.issues?.length > 0 || analysisReport.blockingReasons?.length > 0) && !fixResults && (
                    <button
                      onClick={applyQuickSetup}
                      disabled={applyingFixes}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors",
                        "bg-purple-500 text-white hover:bg-purple-600"
                      )}
                    >
                      {applyingFixes ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Setting up...
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4" />
                          Quick Setup
                        </>
                      )}
                    </button>
                  )}
                  {/* Show success state after fixes applied */}
                  {fixResults && fixResults.created.length > 0 && (
                    <button
                      onClick={startAnalysis}
                      className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors bg-green-500 text-white hover:bg-green-600"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Re-Analyze
                    </button>
                  )}
                  {/* Download Report Button */}
                  <button
                    onClick={downloadReport}
                    disabled={downloadingReport}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors",
                      reportSavedPath
                        ? "bg-green-500/10 text-green-500 border border-green-500/20"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    )}
                  >
                    {downloadingReport ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : reportSavedPath ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Saved to docs/
                      </>
                    ) : (
                      <>
                        <FileDown className="h-4 w-4" />
                        Download.md
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default FoundationAnalysisProgress;
