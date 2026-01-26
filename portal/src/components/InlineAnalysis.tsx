/**
 * InlineAnalysis Component
 *
 * Minimal, sleek foundation analysis status.
 * Compact design with subtle indicators.
 */

import { useState, useCallback } from 'react';
import {
  CheckCircle2,
  Loader2,
  Play,
  ChevronRight,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
export interface AnalysisStep {
  step: number;
  status: 'pending' | 'running' | 'complete' | 'failed';
  detail: string;
  proof: string | null;
}

export interface FoundationReport {
  timestamp: string;
  mode: 'new' | 'existing' | 'monorepo';
  projectPath: string;
  readinessScore: number;
  validationStatus: 'ready' | 'blocked';
  blockingReasons: string[];
  findings: string[];
  issues: string[];
  recommendations: string[];
  analysis: Record<string, unknown>;
  aiReview?: unknown;
}

interface InlineAnalysisProps {
  projectPath: string;
  onAnalysisComplete: (report: FoundationReport) => void;
  onValidationComplete: (status: 'ready' | 'blocked') => void;
  analysisReport: FoundationReport | null;
  onOpenModal?: () => void;
}

// Step labels
const STEP_LABELS: Record<number, { label: string; friendlyLabel: string }> = {
  1: { label: 'Scanning project structure', friendlyLabel: 'Scanning structure' },
  2: { label: 'Validating documentation', friendlyLabel: 'Checking docs' },
  3: { label: 'Analyzing design mockups', friendlyLabel: 'Finding mockups' },
  4: { label: 'Checking folder compliance', friendlyLabel: 'Validating folders' },
  5: { label: 'Validating tech stack', friendlyLabel: 'Detecting stack' },
  6: { label: 'Generating readiness score', friendlyLabel: 'Scoring' },
};

export function InlineAnalysis({
  projectPath,
  onAnalysisComplete,
  onValidationComplete,
  analysisReport,
  onOpenModal
}: InlineAnalysisProps) {
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([]);

  // Determine current status
  const getStatus = (): 'pending' | 'analyzing' | 'ready' | 'blocked' => {
    if (analysisRunning) return 'analyzing';
    if (analysisReport) {
      return analysisReport.validationStatus === 'ready' ? 'ready' : 'blocked';
    }
    return 'pending';
  };

  // Start analysis
  const startAnalysis = useCallback(async () => {
    if (!projectPath || analysisRunning) return;

    setAnalysisRunning(true);
    setAnalysisSteps([]);

    try {
      const response = await fetch('/api/analyze-foundation-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath,
          mode: 'auto',
          enableAiReview: false,
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
                const totalSteps = data.totalSteps;
                const initialSteps: AnalysisStep[] = [];
                for (let i = 1; i <= totalSteps; i++) {
                  initialSteps.push({
                    step: i,
                    status: 'pending',
                    detail: STEP_LABELS[i]?.friendlyLabel || `Step ${i}`,
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
                onAnalysisComplete(data.report);
                onValidationComplete(data.report.validationStatus);
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
  }, [projectPath, analysisRunning, onAnalysisComplete, onValidationComplete]);

  const status = getStatus();
  const completedSteps = analysisSteps.filter(s => s.status === 'complete').length;
  const totalSteps = analysisSteps.length || 6;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  const score = analysisReport?.readinessScore ?? 0;

  // Pending - show analyze button
  if (status === 'pending') {
    return (
      <button
        onClick={startAnalysis}
        className="w-full p-4 rounded-lg border border-dashed border-[#2e2e2e] hover:border-[#2e2e2e] bg-[#1e1e1e] hover:bg-[#1e1e1e] transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#2e2e2e] flex items-center justify-center">
              <Play className="h-4 w-4 text-[#a3a3a3] group-hover:text-[#a3a3a3] transition-colors" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-[#fafafa]">Run Foundation Analysis</p>
              <p className="text-xs text-[#a3a3a3]">Validate structure, docs, and mockups</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-[#a3a3a3] group-hover:text-[#a3a3a3] transition-colors" />
        </div>
      </button>
    );
  }

  // Analyzing - show progress
  if (status === 'analyzing') {
    return (
      <div className="p-4 rounded-lg border border-[#2e2e2e] bg-[#1e1e1e]">
        <div className="flex items-center gap-3 mb-3">
          <Loader2 className="h-4 w-4 text-[#a3a3a3] animate-spin" />
          <span className="text-sm font-medium text-[#fafafa]">Analyzing...</span>
          <span className="text-xs text-[#a3a3a3]">{completedSteps}/{totalSteps}</span>
        </div>
        <div className="h-1 bg-[#2e2e2e] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#555] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {analysisSteps.map((step) => (
            <span
              key={step.step}
              className={cn(
                "text-xs px-2 py-0.5 rounded",
                step.status === 'complete' ? "bg-[#2e2e2e] text-[#999]" :
                step.status === 'running' ? "bg-[#2e2e2e] text-[#a3a3a3]" :
                "text-[#444]"
              )}
            >
              {step.detail}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Ready or Blocked - show compact status
  const isReady = status === 'ready';

  return (
    <div className="p-4 rounded-lg border border-[#2e2e2e] bg-[#1e1e1e]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Score */}
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-2xl font-bold tabular-nums",
              isReady ? "text-[#5a9a5a]" : "text-[#fafafa]"
            )}>
              {score}%
            </span>
            <span className="text-xs text-[#a3a3a3]">
              {isReady ? 'ready' : 'needs work'}
            </span>
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-3 text-xs text-[#a3a3a3]">
            <span className="flex items-center gap-1">
              <CheckCircle2 className={cn("h-3 w-3", isReady && "text-[#5a9a5a]")} />
              Structure
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className={cn("h-3 w-3", isReady && "text-[#5a9a5a]")} />
              Docs
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className={cn("h-3 w-3", isReady && "text-[#5a9a5a]")} />
              Mockups
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {onOpenModal && (
            <button
              onClick={onOpenModal}
              className="p-2 text-[#a3a3a3] hover:text-[#a3a3a3] hover:bg-[#2e2e2e] rounded-lg transition-colors"
              title="View details"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={startAnalysis}
            className="p-2 text-[#a3a3a3] hover:text-[#a3a3a3] hover:bg-[#2e2e2e] rounded-lg transition-colors"
            title="Re-analyze"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Blocking reasons if any */}
      {status === 'blocked' && analysisReport?.blockingReasons.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#2e2e2e]">
          <p className="text-xs text-[#a3a3a3] mb-2">Needs attention:</p>
          {analysisReport.blockingReasons.map((reason, i) => (
            <p key={i} className="text-xs text-[#a3a3a3]">{reason}</p>
          ))}
        </div>
      )}
    </div>
  );
}

export default InlineAnalysis;
