/**
 * BlueprintSummaryBar Component
 *
 * Persistent summary bar showing Blueprint/Foundation analysis results.
 * Displays readiness score, key metrics, and quick actions.
 */

import {
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Clock,
  Sparkles,
  RefreshCw,
  FolderTree,
  Code2,
  Layers,
  Zap,
  Shield
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { FoundationReport } from './FoundationAnalysisProgress';

interface BlueprintSummaryBarProps {
  report: FoundationReport | null;
  isAnalyzing: boolean;
  onViewDetails: () => void;
  onOpenWizard?: () => void;
  onViewChecklist?: () => void;
  onOpenGate0Wizard?: () => void;
  // Custom button component (e.g., FoundationAnalysisProgress)
  analyzeButton?: React.ReactNode;
  className?: string;
}

export function BlueprintSummaryBar({
  report,
  isAnalyzing,
  onViewDetails,
  onOpenWizard,
  onViewChecklist,
  onOpenGate0Wizard,
  analyzeButton,
  className
}: BlueprintSummaryBarProps) {
  // Analysis categories to show
  const analysisCategories = [
    { id: 'structure', label: 'Structure', icon: FolderTree, color: 'text-[#3b82f6]', bg: 'bg-[#3b82f6]/10' },
    { id: 'documentation', label: 'Documentation', icon: Code2, color: 'text-[#22c55e]', bg: 'bg-[#22c55e]/10' },
    { id: 'mockups', label: 'Mockups', icon: Layers, color: 'text-[#a855f7]', bg: 'bg-[#a855f7]/10' },
    { id: 'tech-stack', label: 'Tech Stack', icon: Zap, color: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/10' },
    { id: 'compliance', label: 'Compliance', icon: Shield, color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10' },
  ];

  // Don't show if no report and not analyzing
  if (!report && !isAnalyzing) {
    return (
      <div className={cn(
        "mb-6",
        className
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2a2a2a] flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-[#888]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[#fafafa]">Blueprint Analysis</h1>
              <p className="text-sm text-[#a3a3a3] mt-1">Run analysis to validate your project foundation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenGate0Wizard && (
              <button
                onClick={onOpenGate0Wizard}
                className="flex items-center gap-2 px-4 py-2 bg-[#fafafa] text-[#1e1e1e] rounded-lg text-sm font-medium hover:bg-[#e5e5e5] transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                Full Setup Wizard
              </button>
            )}
            {onOpenWizard ? (
              <button
                onClick={onOpenWizard}
                className="flex items-center gap-2 px-4 py-2 bg-[#2e2e2e] text-[#a3a3a3] rounded-lg text-sm font-medium hover:bg-[#262626] hover:text-[#fafafa] transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                Quick Analysis
              </button>
            ) : analyzeButton}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#2e2e2e] mt-5 pt-5">
          {/* What We'll Analyze Section */}
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-[#3b82f6]" />
            <span className="text-sm font-medium text-[#fafafa]">What We'll Analyze</span>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {analysisCategories.map((cat) => (
              <div
                key={cat.id}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#1e1e1e] border border-[#2e2e2e] cursor-pointer hover:border-[#3e3e3e] transition-colors"
                onClick={onOpenWizard}
              >
                <div className={cn("p-2 rounded-lg", cat.bg)}>
                  <cat.icon className={cn("h-5 w-5", cat.color)} />
                </div>
                <span className="text-xs text-[#a3a3a3]">{cat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show analyzing state
  if (isAnalyzing) {
    return (
      <div className={cn(
        "mb-6",
        className
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/20 flex items-center justify-center">
              <RefreshCw className="h-5 w-5 text-[#3b82f6] animate-spin" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[#3b82f6]">Analyzing Foundation...</h1>
              <p className="text-sm text-[#a3a3a3] mt-1">Scanning project structure, documentation, and mockups</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#2e2e2e] mt-5 pt-5">
          {/* Analyzing Categories */}
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-[#3b82f6]" />
            <span className="text-sm font-medium text-[#fafafa]">Analyzing</span>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {analysisCategories.map((cat, index) => (
              <div
                key={cat.id}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#1e1e1e] border border-[#3b82f6]/30"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={cn("p-2 rounded-lg", cat.bg, "animate-pulse")}>
                  <cat.icon className={cn("h-5 w-5", cat.color)} />
                </div>
                <span className="text-xs text-[#a3a3a3]">{cat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show results
  const isReady = report!.validationStatus === 'ready';
  const score = report!.readinessScore;
  const docsCount = report!.analysis.documentation?.docsFound?.length || 0;
  const mockupsCount = report!.analysis.mockups?.count || 0;
  const issuesCount = report!.issues?.length || 0;

  // Format timestamp
  const timestamp = report!.timestamp;
  const timeAgo = getTimeAgo(timestamp);

  return (
    <div className={cn(
      "mb-6",
      className
    )}>
      <div className="flex items-center justify-between">
        {/* Left: Status Icon and Text */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            isReady ? "bg-[#22c55e]/20" : "bg-[#f97316]/20"
          )}>
            {isReady ? (
              <CheckCircle2 className="h-5 w-5 text-[#22c55e]" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-[#f97316]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className={cn(
                "text-xl font-semibold",
                isReady ? "text-[#22c55e]" : "text-[#f97316]"
              )}>
                {isReady ? 'Foundation Ready' : 'Foundation Blocked'}
              </h1>
              <span className={cn(
                "text-xl font-bold",
                score >= 80 ? "text-[#22c55e]" :
                score >= 60 ? "text-[#f97316]" :
                "text-[#ef4444]"
              )}>
                {score}%
              </span>
              {/* Inline Metrics */}
              <div className="flex items-center gap-4 ml-4 pl-4 border-l border-[#2e2e2e]">
                <span className="text-sm text-[#a3a3a3]">
                  <span className="text-[#fafafa] font-medium">{docsCount}</span> Docs
                </span>
                <span className="text-sm text-[#a3a3a3]">
                  <span className="text-[#fafafa] font-medium">{mockupsCount}</span> Mockups
                </span>
                <span className="text-sm text-[#a3a3a3]">
                  <span className={issuesCount > 0 ? "text-[#ef4444] font-medium" : "text-[#22c55e] font-medium"}>{issuesCount}</span> Issues
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm text-[#a3a3a3] mt-1">
              <Clock className="h-3.5 w-3.5" />
              <span>Analyzed {timeAgo}</span>
              {/* Blocking Reasons inline */}
              {!isReady && report!.blockingReasons && report!.blockingReasons.length > 0 && (
                <span className="ml-2 text-[#f97316]">
                  — {report!.blockingReasons[0]}
                  {report!.blockingReasons.length > 1 && ` (+${report!.blockingReasons.length - 1} more)`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {onOpenWizard ? (
            <button
              onClick={onOpenWizard}
              className="flex items-center gap-2 px-3 py-1.5 border border-[#2e2e2e] text-[#a3a3a3] rounded-lg text-sm font-medium hover:bg-[#2e2e2e] hover:text-[#fafafa] transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Re-analyze
            </button>
          ) : analyzeButton}
          {onViewChecklist && (
            <button
              onClick={onViewChecklist}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#fafafa] text-[#1e1e1e] rounded-lg text-sm font-medium hover:bg-[#e5e5e5] transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              View Checklist
            </button>
          )}
          <button
            onClick={onViewDetails}
            className="px-3 py-1.5 border border-[#2e2e2e] text-[#a3a3a3] rounded-lg text-sm font-medium hover:bg-[#2e2e2e] hover:text-[#fafafa] transition-colors flex items-center gap-1.5"
          >
            Details
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[#2e2e2e] mt-5 pt-5">
        {/* Analysis Results by Category */}
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-[#3b82f6]" />
          <span className="text-sm font-medium text-[#fafafa]">Analysis Results</span>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {analysisCategories.map((cat) => {
            // Determine status based on analysis results
            const getCategoryStatus = () => {
              if (cat.id === 'structure') return report!.analysis.structure?.status === 'pass' || report!.analysis.structure?.status === 'found';
              if (cat.id === 'documentation') return (report!.analysis.documentation?.docsFound?.length || 0) > 0;
              if (cat.id === 'mockups') return (report!.analysis.mockups?.count || 0) > 0;
              if (cat.id === 'tech-stack') return (report!.analysis.techstack?.techStack?.length || 0) > 0;
              if (cat.id === 'compliance') return !report!.blockingReasons?.length;
              return true;
            };
            const isPassing = getCategoryStatus();

            return (
              <div
                key={cat.id}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl bg-[#1e1e1e] border transition-colors",
                  isPassing ? "border-[#22c55e]/30" : "border-[#f97316]/30"
                )}
              >
                <div className="relative">
                  <div className={cn("p-2 rounded-lg", cat.bg)}>
                    <cat.icon className={cn("h-5 w-5", cat.color)} />
                  </div>
                  {/* Status indicator */}
                  <div className={cn(
                    "absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center",
                    isPassing ? "bg-[#22c55e]" : "bg-[#f97316]"
                  )}>
                    {isPassing ? (
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    ) : (
                      <AlertTriangle className="h-2.5 w-2.5 text-white" />
                    )}
                  </div>
                </div>
                <span className="text-xs text-[#a3a3a3]">{cat.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Helper: Format time ago
function getTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

export default BlueprintSummaryBar;
