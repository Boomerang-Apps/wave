/**
 * MockupDesignTab Component (Gate 0)
 *
 * Clean project connection and discovery flow:
 * 1. Not Connected - Single "Select Folder" action
 * 2. Discovering - Auto-detect docs, mockups, structure
 * 3. Connected - Show discovered project info
 *
 * Uses standardized TabLayout components for consistent UI
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  FolderOpen, FileText, Layout, CheckCircle2, AlertTriangle,
  ExternalLink, RefreshCw, Loader2, Sparkles, X, Target, FileDown, Lightbulb,
  ArrowRight, AlertCircle, Settings
} from 'lucide-react';
import { KPICards, ExpandableCard, TabContainer } from './TabLayout';
import { BestPracticesSection } from './BestPracticesSection';
import { FileListView } from './FileListView';
import { FoundationAnalysisProgress, type FoundationReport } from './FoundationAnalysisProgress';
import { ConnectionCards } from './ConnectionCards';
import { InlineAnalysis } from './InlineAnalysis';
import { CorePillars } from './CorePillars';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface MockupFile {
  name: string;
  filename: string;
  path: string;
  order?: number;
}

interface DocumentFile {
  title: string;
  filename: string;
  path: string;
  type: string;
}

interface ProjectData {
  name: string;
  tagline: string;
  vision: string;
  description: string;
  documentation: DocumentFile[];
  mockups: MockupFile[];
  techStack: string[];
  paths: {
    root: string;
    mockups: string;
    docs: string;
  };
  connection: {
    rootExists: boolean;
    mockupsFolderExists: boolean;
    docsFolderExists: boolean;
    status: 'connected' | 'disconnected';
  };
}

interface StructureValidation {
  deviations: Array<{
    type: string;
    path: string;
    severity: 'error' | 'warning';
    message: string;
    suggestion: string;
    suggestedLocation?: string;
  }>;
  complianceScore: number;
  reorganizationPlan: {
    actions: Array<{
      action: 'create' | 'move';
      folder?: string;
      file?: string;
      destination?: string;
      priority: string;
    }>;
    isOrganized: boolean;
    estimatedMinutes: number;
    duplicates: {
      prd: string[];
      architecture: string[];
      hasDuplicates: boolean;
      suggestion?: string;
    };
  };
}

export interface MockupDesignTabProps {
  projectPath: string;
  projectId: string;
  validationStatus: 'idle' | 'validating' | 'ready' | 'blocked';
  onValidationComplete: (status: 'ready' | 'blocked') => void;
}

// ============================================
// Sub-components
// ============================================

// Foundation Analysis Progress Modal - Full wizard experience
function FoundationAnalysisProgressModal({
  projectPath,
  analysisReport: existingReport,
  onAnalysisComplete,
  onValidationComplete,
  onClose
}: {
  projectPath: string;
  analysisReport: FoundationReport | null;
  onAnalysisComplete: (report: FoundationReport) => void;
  onValidationComplete: (status: 'ready' | 'blocked') => void;
  onClose: () => void;
}) {
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<'new' | 'existing' | 'monorepo' | null>(
    existingReport?.mode || null
  );
  const [analysisSteps, setAnalysisSteps] = useState<Array<{
    step: number;
    status: 'pending' | 'running' | 'complete' | 'failed';
    detail: string;
    proof: string | null;
  }>>([]);
  const [analysisReport, setAnalysisReport] = useState<FoundationReport | null>(existingReport);
  const [enableAiReview, setEnableAiReview] = useState(false);

  const STEP_LABELS: Record<number, string> = {
    1: 'Scanning project structure',
    2: 'Validating documentation',
    3: 'Analyzing design mockups',
    4: 'Checking folder compliance',
    5: 'Validating tech stack',
    6: 'Generating readiness score',
  };

  // Start analysis
  const startAnalysis = useCallback(async () => {
    if (!projectPath || analysisRunning) return;

    setAnalysisRunning(true);
    setAnalysisReport(null);
    setAnalysisSteps([]);

    try {
      const response = await fetch('/api/analyze-foundation-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath,
          mode: 'auto',
          enableAiReview,
          aiReviewDepth: 'quick'
        })
      });

      if (!response.ok) throw new Error('Failed to start analysis');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

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

              if (data.type === 'mode') {
                setAnalysisMode(data.mode);
                const totalSteps = data.totalSteps;
                const initialSteps = [];
                for (let i = 1; i <= totalSteps; i++) {
                  initialSteps.push({
                    step: i,
                    status: 'pending' as const,
                    detail: STEP_LABELS[i] || `Step ${i}`,
                    proof: null
                  });
                }
                setAnalysisSteps(initialSteps);
              } else if (typeof data.step === 'number') {
                setAnalysisSteps(prev => prev.map(s =>
                  s.step === data.step
                    ? { ...s, status: data.status, detail: data.detail || s.detail, proof: data.proof }
                    : s
                ));
              } else if (data.step === 'done') {
                setAnalysisSteps(prev => prev.map(s =>
                  s.status === 'running' || s.status === 'pending'
                    ? { ...s, status: 'complete' }
                    : s
                ));
              } else if (data.type === 'result') {
                setAnalysisReport(data.report);
                onAnalysisComplete(data.report);
                onValidationComplete(data.report.validationStatus);
              }
            } catch (parseErr) {
              console.error('Failed to parse SSE:', parseErr);
            }
          }
        }
      }
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setAnalysisRunning(false);
    }
  }, [projectPath, analysisRunning, enableAiReview, onAnalysisComplete, onValidationComplete]);

  const isReady = analysisReport?.validationStatus === 'ready';
  const score = analysisReport?.readinessScore ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !analysisRunning && onClose()} />

      {/* Modal */}
      <div className="relative bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl w-full max-w-3xl shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2e2e2e]">
          <div>
            <h2 className="text-lg font-semibold text-[#fafafa]">Foundation Analysis</h2>
            <p className="text-xs text-[#a3a3a3] mt-0.5">{projectPath}</p>
          </div>
          {!analysisRunning && (
            <button
              onClick={onClose}
              className="p-2 text-[#a3a3a3] hover:text-[#a3a3a3] hover:bg-[#2e2e2e] rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Pre-analysis state */}
          {!analysisRunning && analysisSteps.length === 0 && !analysisReport && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-[#2e2e2e] border border-[#2e2e2e]">
                <h3 className="text-sm font-medium text-[#fafafa] mb-3">What We'll Check</h3>
                <div className="grid grid-cols-3 gap-3">
                  {['Structure', 'Documentation', 'Mockups', 'Tech Stack', 'Compliance', 'Readiness'].map((item) => (
                    <div key={item} className="p-2 bg-[#1e1e1e] rounded text-center">
                      <p className="text-xs text-[#a3a3a3]">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Review Option */}
              <label className="flex items-center gap-2 p-3 rounded-lg bg-[#2e2e2e] border border-[#2e2e2e] cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableAiReview}
                  onChange={(e) => setEnableAiReview(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-[#a3a3a3]">Include AI Deep Review (analyzes code quality)</span>
              </label>
            </div>
          )}

          {/* Running state - Step progress */}
          {analysisSteps.length > 0 && !analysisReport && (
            <div className="space-y-2">
              {analysisSteps.map((step) => (
                <div
                  key={step.step}
                  className={cn(
                    "p-3 rounded-lg border bg-[#1e1e1e] border-[#2e2e2e]",
                    step.status === 'running' && "border-[#2e2e2e]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs bg-[#2e2e2e]",
                      step.status === 'complete' ? "text-[#5a9a5a]" : "text-[#a3a3a3]"
                    )}>
                      {step.status === 'running' ? (
                        <Loader2 className="h-3 w-3 animate-spin text-[#a3a3a3]" />
                      ) : step.status === 'complete' ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        step.step
                      )}
                    </div>
                    <span className={cn(
                      "text-sm",
                      step.status === 'running' ? "text-[#fafafa]" :
                      step.status === 'complete' ? "text-[#a3a3a3]" :
                      "text-[#a3a3a3]"
                    )}>
                      {step.detail}
                    </span>
                    {step.status === 'complete' && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#5a9a5a] ml-auto" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results state */}
          {analysisReport && (
            <div className="space-y-4">
              {/* Score Header */}
              <div className="p-4 rounded-lg bg-[#2e2e2e] border border-[#2e2e2e]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isReady && <CheckCircle2 className="h-5 w-5 text-[#5a9a5a]" />}
                    <div>
                      <p className="text-sm font-medium text-[#fafafa]">
                        {isReady ? 'Foundation Ready' : 'Needs Attention'}
                      </p>
                      <p className="text-xs text-[#a3a3a3] mt-0.5">
                        {analysisReport.mode === 'existing' ? 'Existing Project' : 'New Project'}
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    "text-3xl font-bold tabular-nums",
                    isReady ? "text-[#5a9a5a]" : "text-[#a3a3a3]"
                  )}>
                    {score}%
                  </span>
                </div>
              </div>

              {/* Analysis Details */}
              {analysisReport.analysis && (
                <div className="space-y-2">
                  {Object.entries(analysisReport.analysis).map(([key, value]) => {
                    if (!value || typeof value !== 'object') return null;
                    const data = value as { status?: string; findings?: string[]; issues?: string[] };
                    const isPass = data.status === 'pass' || data.status === 'complete';

                    return (
                      <div key={key} className="p-3 rounded-lg bg-[#1e1e1e] border border-[#2e2e2e]">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#fafafa] capitalize">{key}</span>
                          <div className="flex items-center gap-1.5">
                            {isPass && <CheckCircle2 className="h-3.5 w-3.5 text-[#5a9a5a]" />}
                            <span className="text-xs text-[#a3a3a3]">
                              {isPass ? 'Pass' : data.status}
                            </span>
                          </div>
                        </div>
                        {data.findings && data.findings.length > 0 && (
                          <p className="text-xs text-[#a3a3a3] mt-1">{data.findings[0]}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Blocking Reasons */}
              {analysisReport.blockingReasons?.length > 0 && (
                <div className="p-3 rounded-lg bg-[#1e1e1e] border border-[#2e2e2e]">
                  <p className="text-xs font-medium text-[#a3a3a3] mb-2">Blocking Issues</p>
                  {analysisReport.blockingReasons.map((reason, i) => (
                    <p key={i} className="text-xs text-[#a3a3a3]">• {reason}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2e2e2e] flex justify-between items-center">
          <div className="text-xs text-[#a3a3a3]">
            {analysisRunning && 'Analysis in progress...'}
            {analysisReport && `Completed ${analysisSteps.length} checks`}
          </div>
          <div className="flex gap-2">
            {!analysisRunning && !analysisReport && (
              <button
                onClick={startAnalysis}
                className="px-4 py-2 text-sm bg-[#2e2e2e] text-[#fafafa] hover:bg-[#2e2e2e] rounded-lg transition-colors"
              >
                Start Analysis
              </button>
            )}
            {analysisReport && (
              <button
                onClick={startAnalysis}
                className="px-4 py-2 text-sm text-[#a3a3a3] hover:text-[#fafafa] hover:bg-[#2e2e2e] rounded-lg transition-colors"
              >
                Re-analyze
              </button>
            )}
            {!analysisRunning && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-[#a3a3a3] hover:text-[#fafafa] hover:bg-[#2e2e2e] rounded-lg transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Not Connected State - Clean folder selection with native Finder picker
function NotConnectedState({
  onSelectFolder,
  isUpdating
}: {
  onSelectFolder: (path: string) => void;
  isUpdating: boolean;
}) {
  const [inputPath, setInputPath] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handleConnect = () => {
    if (inputPath.trim()) {
      onSelectFolder(inputPath.trim());
    }
  };

  // Open native macOS Finder folder picker
  const handleOpenFinder = async () => {
    setIsPickerOpen(true);

    try {
      const response = await fetch('/api/open-folder-picker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success && data.path) {
        setInputPath(data.path);
        // Auto-connect after selection
        onSelectFolder(data.path);
      }
      // If cancelled, just close the loading state
    } catch (err) {
      console.error('Failed to open folder picker:', err);
    } finally {
      setIsPickerOpen(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="max-w-md w-full">
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <FolderOpen className="h-8 w-8 text-blue-500" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold mb-2">Connect Your Project</h2>

          {/* Description */}
          <p className="text-muted-foreground text-sm mb-6">
            Select your project's root folder. WAVE will automatically discover
            documentation, design mockups, and project structure.
          </p>

          {/* Browse Button - Primary Action (Opens native Finder) */}
          <button
            onClick={handleOpenFinder}
            disabled={isUpdating || isPickerOpen}
            className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-4"
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : isPickerOpen ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Select a folder in Finder...
              </>
            ) : (
              <>
                <FolderOpen className="h-4 w-4" />
                Select Folder...
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or enter path manually</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Manual Input */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputPath}
                onChange={(e) => setInputPath(e.target.value)}
                placeholder="/path/to/your/project"
                className="flex-1 px-4 py-2.5 bg-muted border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
              />
              <button
                onClick={handleConnect}
                disabled={!inputPath.trim() || isUpdating}
                className="px-4 py-2.5 bg-muted hover:bg-muted/80 border border-border text-foreground rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                Connect
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Discovering State - Loading animation
function DiscoveringState() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Discovering Project</h2>
        <p className="text-muted-foreground text-sm">
          Scanning folder structure, finding documentation and mockups...
        </p>
      </div>
    </div>
  );
}

// Mockup Preview Modal
function MockupPreviewModal({
  mockup,
  onClose
}: {
  mockup: MockupFile | null;
  onClose: () => void;
}) {
  if (!mockup) return null;

  // Use API endpoint to serve the HTML file
  const previewUrl = `/api/serve-mockup?path=${encodeURIComponent(mockup.path)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl w-[95vw] h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <Layout className="h-5 w-5 text-purple-500" />
            <h2 className="font-semibold">{mockup.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(previewUrl, '_blank')}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors flex items-center gap-1"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in New Tab
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Preview iframe */}
        <div className="flex-1 bg-white">
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            title={mockup.name}
          />
        </div>
      </div>
    </div>
  );
}

// Connected State - Show discovered project using standardized TabLayout components
function ConnectedState({
  project,
  projectPath,
  onRefresh,
  onChangePath,
  isRefreshing,
  structureValidation,
  analysisReport,
  onAnalysisComplete,
  onValidationComplete
}: {
  project: ProjectData;
  projectPath: string;
  onRefresh: () => void;
  onChangePath: () => void;
  isRefreshing: boolean;
  structureValidation: StructureValidation | null;
  analysisReport: FoundationReport | null;
  onAnalysisComplete: (report: FoundationReport) => void;
  onValidationComplete: (status: 'ready' | 'blocked') => void;
}) {
  const [previewMockup, setPreviewMockup] = useState<MockupFile | null>(null);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportSaved, setReportSaved] = useState<string | null>(null);
  const [bestPracticesExpanded, setBestPracticesExpanded] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const bestPracticesRef = useRef<HTMLDivElement>(null);

  // Scroll to Best Practices and expand when clicking the notification button
  const handleViewIssues = () => {
    setBestPracticesExpanded(true);
    setTimeout(() => {
      bestPracticesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Generate improvement report
  const handleGenerateReport = async () => {
    if (!analysisReport) return;

    setReportGenerating(true);
    setReportSaved(null);
    try {
      const response = await fetch('/api/foundation/improvement-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath,
          report: analysisReport,
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
  };

  const handleOpenDoc = (doc: DocumentFile) => {
    window.open(`vscode://file${doc.path}`, '_blank');
  };

  // Determine status based on docs and mockups presence
  const hasAllRequired = project.documentation.length > 0 && project.mockups.length > 0;

  // Use analysis results if available
  const readinessScore = analysisReport?.readinessScore ?? 0;
  const isAnalyzed = !!analysisReport;

  return (
    <>
      {/* PROJECT HEADER - Minimal */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
            <Target className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{project.name}</h2>
            <p className="text-sm text-muted-foreground">{project.tagline || 'Validate your foundation before development'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </button>
          <button
            onClick={onChangePath}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            title="Change Folder"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* INLINE ANALYSIS - Main Focus */}
      <InlineAnalysis
        projectPath={projectPath}
        onAnalysisComplete={onAnalysisComplete}
        onValidationComplete={onValidationComplete}
        analysisReport={analysisReport}
        onOpenModal={() => setShowAnalysisModal(true)}
      />

      {/* CORE PILLARS - Documents, Mockups, Structure */}
      <div className="mt-6">
        <CorePillars
          documents={project.documentation}
          mockups={project.mockups}
          structureScore={structureValidation?.complianceScore ?? 0}
          suggestionsCount={structureValidation?.deviations?.length ?? 0}
          onViewSuggestions={handleViewIssues}
        />
      </div>

      {/* CONNECTION STATUS - Collapsible */}
      <details className="mt-6 group">
        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
          <span>Project Connections</span>
          <span className="text-xs bg-muted px-2 py-0.5 rounded">4 services</span>
        </summary>
        <div className="mt-4">
          <ConnectionCards projectPath={projectPath} layout="horizontal" />
        </div>
      </details>

      {/* Tech Stack Pills */}
      {project.techStack.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {project.techStack.map((tech, i) => (
            <span key={i} className="px-3 py-1.5 bg-card border border-border text-muted-foreground rounded-lg text-xs font-medium">
              {tech}
            </span>
          ))}
        </div>
      )}

      {/* Best Practices - as ExpandableCard */}
      {structureValidation && (
        <div ref={bestPracticesRef}>
          <ExpandableCard
            title="File Organization"
            subtitle={`${structureValidation.deviations.length} suggestions (optional)`}
            icon={<Lightbulb className="h-4 w-4" />}
            status={structureValidation.complianceScore >= 80 ? 'pass' : structureValidation.complianceScore >= 50 ? 'warn' : 'fail'}
            expanded={bestPracticesExpanded}
            onExpandChange={setBestPracticesExpanded}
            badge={`${structureValidation.complianceScore}%`}
          >
            <BestPracticesSection
              deviations={structureValidation.deviations}
              reorganizationPlan={structureValidation.reorganizationPlan}
              complianceScore={structureValidation.complianceScore}
              embedded={true}
              projectPath={projectPath}
              onFixesApplied={onRefresh}
            />
          </ExpandableCard>
        </div>
      )}

      {/* Documentation */}
      <ExpandableCard
        title="Documentation"
        subtitle={`${project.documentation.length} files discovered`}
        icon={<FileText className="h-4 w-4" />}
        status={project.documentation.length > 0 ? 'pass' : 'warn'}
        defaultExpanded={false}
        badge={`${project.documentation.length} files`}
      >
        {project.documentation.length > 0 ? (
          <FileListView
            files={project.documentation.map(doc => ({
              id: doc.path,
              title: doc.title,
              filename: doc.filename,
              path: doc.path,
              type: doc.type,
              modifiedAt: (doc as any).modifiedAt,
              version: (doc as any).version,
              size: (doc as any).size,
            }))}
            onOpen={(file) => handleOpenDoc(file as DocumentFile)}
            fileType="document"
          />
        ) : (
          <div className="text-center py-8">
            <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No documentation found</p>
            <p className="text-xs text-muted-foreground mt-1">Add .md files to docs/ folder</p>
          </div>
        )}
      </ExpandableCard>

      {/* Design Mockups */}
      <ExpandableCard
        title="Design Mockups"
        subtitle={`${project.mockups.length} HTML screens discovered`}
        icon={<Layout className="h-4 w-4" />}
        status={project.mockups.length > 0 ? 'pass' : 'warn'}
        defaultExpanded={false}
        badge={`${project.mockups.length} screens`}
      >
        {project.mockups.length > 0 ? (
          <FileListView
            files={project.mockups.map(mockup => ({
              id: mockup.path,
              name: mockup.name,
              filename: mockup.filename,
              path: mockup.path,
              order: mockup.order,
              modifiedAt: (mockup as any).modifiedAt,
              version: (mockup as any).version,
              size: (mockup as any).size,
            }))}
            onOpen={(file) => setPreviewMockup(file as MockupFile)}
            fileType="mockup"
          />
        ) : (
          <div className="text-center py-8">
            <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No mockups found</p>
            <p className="text-xs text-muted-foreground mt-1">Add HTML files to design_mockups/ folder</p>
          </div>
        )}
      </ExpandableCard>

      {/* Vision Statement (if available) */}
      {project.vision && (
        <ExpandableCard
          title="Project Vision"
          subtitle="Guiding statement for this project"
          icon={<Target className="h-4 w-4" />}
          status="pass"
          defaultExpanded={false}
        >
          <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-lg">
            <p className="text-sm text-blue-400 italic">"{project.vision}"</p>
          </div>
        </ExpandableCard>
      )}

      {/* Mockup Preview Modal */}
      <MockupPreviewModal
        mockup={previewMockup}
        onClose={() => setPreviewMockup(null)}
      />

      {/* Foundation Analysis Modal - Uses existing FoundationAnalysisProgress */}
      {showAnalysisModal && (
        <FoundationAnalysisProgressModal
          projectPath={projectPath}
          analysisReport={analysisReport}
          onAnalysisComplete={onAnalysisComplete}
          onValidationComplete={onValidationComplete}
          onClose={() => setShowAnalysisModal(false)}
        />
      )}
    </>
  );
}

// ============================================
// Main Component
// ============================================

export function MockupDesignTab({
  projectPath,
  projectId,
  validationStatus: _validationStatus,
  onValidationComplete
}: MockupDesignTabProps) {
  const [state, setState] = useState<'not-connected' | 'discovering' | 'connected'>(
    projectPath ? 'discovering' : 'not-connected'
  );
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [currentPath, setCurrentPath] = useState(projectPath);
  const [isUpdating, setIsUpdating] = useState(false);
  const [structureValidation, setStructureValidation] = useState<StructureValidation | null>(null);
  const [analysisReport, setAnalysisReport] = useState<FoundationReport | null>(null);

  // Handle analysis completion
  const handleAnalysisComplete = useCallback((report: FoundationReport) => {
    setAnalysisReport(report);
  }, []);

  // Discover project when path is set
  const discoverProject = useCallback(async (path: string) => {
    if (!path) {
      setState('not-connected');
      return;
    }

    setState('discovering');

    try {
      // Fetch project data and structure validation in parallel
      const [projectResponse, structureResponse] = await Promise.all([
        fetch('/api/discover-project', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectPath: path })
        }),
        fetch('/api/validate-structure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectPath: path })
        })
      ]);

      if (projectResponse.ok) {
        const { data } = await projectResponse.json();
        setProjectData(data);

        if (data.connection?.status === 'connected') {
          setState('connected');
        } else {
          setState('not-connected');
        }
      } else {
        setState('not-connected');
      }

      // Handle structure validation separately (don't block on errors)
      if (structureResponse.ok) {
        const { data: structData } = await structureResponse.json();
        setStructureValidation({
          deviations: structData.deviations || [],
          complianceScore: structData.complianceScore || 0,
          reorganizationPlan: structData.reorganizationPlan || {
            actions: [],
            isOrganized: true,
            estimatedMinutes: 0,
            duplicates: { prd: [], architecture: [], hasDuplicates: false }
          }
        });
      }
    } catch (err) {
      console.error('Failed to discover project:', err);
      setState('not-connected');
    }
  }, []);

  // Initial discovery
  useEffect(() => {
    if (currentPath) {
      discoverProject(currentPath);
    }
  }, []);

  // Handle folder selection
  const handleSelectFolder = async (path: string) => {
    setIsUpdating(true);

    try {
      // Update path in database
      const response = await fetch('/api/update-project-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, rootPath: path })
      });

      if (response.ok) {
        setCurrentPath(path);
        await discoverProject(path);
      }
    } catch (err) {
      console.error('Failed to update path:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    if (currentPath) {
      discoverProject(currentPath);
    }
  };

  // Handle change path
  const handleChangePath = () => {
    setState('not-connected');
    setProjectData(null);
  };

  return (
    <TabContainer>
      {state === 'not-connected' && (
        <NotConnectedState
          onSelectFolder={handleSelectFolder}
          isUpdating={isUpdating}
        />
      )}

      {state === 'discovering' && (
        <DiscoveringState />
      )}

      {state === 'connected' && projectData && (
        <ConnectedState
          project={projectData}
          projectPath={currentPath}
          onRefresh={handleRefresh}
          onChangePath={handleChangePath}
          isRefreshing={false}
          structureValidation={structureValidation}
          analysisReport={analysisReport}
          onAnalysisComplete={handleAnalysisComplete}
          onValidationComplete={onValidationComplete}
        />
      )}
    </TabContainer>
  );
}

export default MockupDesignTab;
