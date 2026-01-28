/**
 * BlueprintFlyout Component
 *
 * Flyout panel showing detailed Blueprint/Foundation analysis results and history.
 */

import { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Image,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Clock,
  History,
  FolderTree,
  Code2,
  Layers,
  Shield,
  Zap,
  Download,
  Play,
  Trash2
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { FoundationReport } from './FoundationAnalysisProgress';

interface BlueprintFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  report: FoundationReport | null;
  history: FoundationReport[];
  onRunAnalysis: () => void;
  onSelectHistoryItem: (report: FoundationReport) => void;
  onClearHistory: () => void;
  isAnalyzing: boolean;
  projectPath: string;
}

export function BlueprintFlyout({
  isOpen,
  onClose,
  report,
  history,
  onRunAnalysis,
  onSelectHistoryItem,
  onClearHistory,
  isAnalyzing,
  projectPath
}: BlueprintFlyoutProps) {
  const [activeTab, setActiveTab] = useState<'results' | 'history'>('results');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']));

  if (!isOpen) return null;

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Flyout Panel */}
      <div className="fixed inset-y-0 right-0 w-[500px] max-w-[90vw] bg-[#1a1a1a] border-l border-[#2e2e2e] z-50 flex flex-col shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-[#2e2e2e] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3b82f6]/20 to-[#22c55e]/20 flex items-center justify-center">
              <FolderTree className="h-4 w-4 text-[#3b82f6]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#fafafa]">Blueprint Analysis</h2>
              <p className="text-[10px] text-[#666]">Foundation validation results</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#666] hover:text-[#fafafa] hover:bg-[#2e2e2e] rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#2e2e2e] shrink-0">
          <button
            onClick={() => setActiveTab('results')}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-medium transition-colors",
              activeTab === 'results'
                ? "text-[#fafafa] border-b-2 border-[#3b82f6]"
                : "text-[#666] hover:text-[#a3a3a3]"
            )}
          >
            Results
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2",
              activeTab === 'history'
                ? "text-[#fafafa] border-b-2 border-[#3b82f6]"
                : "text-[#666] hover:text-[#a3a3a3]"
            )}
          >
            <History className="h-4 w-4" />
            History
            {history.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-[#3e3e3e] rounded-full">
                {history.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'results' ? (
            <ResultsTab
              report={report}
              expandedSections={expandedSections}
              toggleSection={toggleSection}
              onRunAnalysis={onRunAnalysis}
              isAnalyzing={isAnalyzing}
            />
          ) : (
            <HistoryTab
              history={history}
              onSelectItem={onSelectHistoryItem}
              onClearHistory={onClearHistory}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2e2e2e] shrink-0">
          <button
            onClick={onRunAnalysis}
            disabled={isAnalyzing}
            className={cn(
              "w-full py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2",
              isAnalyzing
                ? "bg-[#3b82f6]/20 text-[#3b82f6] cursor-wait"
                : "bg-[#3b82f6] text-white hover:bg-[#2563eb]"
            )}
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run New Analysis
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// Results Tab Content
function ResultsTab({
  report,
  expandedSections,
  toggleSection,
  onRunAnalysis,
  isAnalyzing
}: {
  report: FoundationReport | null;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
  onRunAnalysis: () => void;
  isAnalyzing: boolean;
}) {
  if (!report) {
    return (
      <div className="p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#2e2e2e] flex items-center justify-center mx-auto mb-4">
          <FolderTree className="h-8 w-8 text-[#666]" />
        </div>
        <h3 className="text-sm font-medium text-[#a3a3a3] mb-2">No Analysis Yet</h3>
        <p className="text-xs text-[#666] mb-4">
          Run an analysis to validate your project foundation
        </p>
        <button
          onClick={onRunAnalysis}
          disabled={isAnalyzing}
          className="px-4 py-2 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-[#2563eb] transition-colors"
        >
          Start Analysis
        </button>
      </div>
    );
  }

  const isReady = report.validationStatus === 'ready';
  const score = report.readinessScore;

  return (
    <div className="p-4 space-y-4">
      {/* Summary Card */}
      <div className={cn(
        "p-4 rounded-xl border",
        isReady ? "bg-[#22c55e]/10 border-[#22c55e]/30" : "bg-[#f97316]/10 border-[#f97316]/30"
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isReady ? (
              <CheckCircle2 className="h-5 w-5 text-[#22c55e]" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-[#f97316]" />
            )}
            <span className={cn(
              "text-sm font-semibold",
              isReady ? "text-[#22c55e]" : "text-[#f97316]"
            )}>
              {isReady ? 'Foundation Ready' : 'Foundation Blocked'}
            </span>
          </div>
          <span className={cn(
            "text-2xl font-bold",
            score >= 80 ? "text-[#22c55e]" :
            score >= 60 ? "text-[#f97316]" :
            "text-[#ef4444]"
          )}>
            {score}%
          </span>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            icon={<FileText className="h-4 w-4" />}
            value={report.analysis.documentation?.docsFound?.length || 0}
            label="Docs"
            color="blue"
          />
          <MetricCard
            icon={<Image className="h-4 w-4" />}
            value={report.analysis.mockups?.count || 0}
            label="Mockups"
            color="purple"
          />
          <MetricCard
            icon={<AlertCircle className="h-4 w-4" />}
            value={report.issues?.length || 0}
            label="Issues"
            color={report.issues?.length > 0 ? "red" : "green"}
          />
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-1 mt-3 text-xs text-[#666]">
          <Clock className="h-3 w-3" />
          <span>{new Date(report.timestamp).toLocaleString()}</span>
        </div>
      </div>

      {/* Analysis Details */}
      <ExpandableSection
        title="Structure"
        icon={<FolderTree className="h-4 w-4" />}
        status={report.analysis.structure?.status}
        expanded={expandedSections.has('structure')}
        onToggle={() => toggleSection('structure')}
      >
        <div className="space-y-1">
          {report.analysis.structure?.findings?.map((finding, i) => (
            <p key={i} className="text-xs text-[#a3a3a3]">• {finding}</p>
          ))}
          {report.analysis.structure?.issues?.map((issue, i) => (
            <p key={i} className="text-xs text-[#f97316]">• {issue}</p>
          ))}
        </div>
      </ExpandableSection>

      <ExpandableSection
        title="Documentation"
        icon={<FileText className="h-4 w-4" />}
        status={report.analysis.documentation?.status}
        expanded={expandedSections.has('documentation')}
        onToggle={() => toggleSection('documentation')}
      >
        <div className="space-y-1">
          {report.analysis.documentation?.docsFound?.map((doc, i) => (
            <p key={i} className="text-xs text-[#22c55e]">✓ {doc.name}</p>
          ))}
          {report.analysis.documentation?.issues?.map((issue, i) => (
            <p key={i} className="text-xs text-[#f97316]">• {issue}</p>
          ))}
        </div>
      </ExpandableSection>

      <ExpandableSection
        title="Design Mockups"
        icon={<Image className="h-4 w-4" />}
        status={report.analysis.mockups?.status}
        expanded={expandedSections.has('mockups')}
        onToggle={() => toggleSection('mockups')}
      >
        <div className="space-y-1">
          <p className="text-xs text-[#a3a3a3]">
            Found {report.analysis.mockups?.count || 0} mockups
          </p>
          {report.analysis.mockups?.mockupsFound?.slice(0, 5).map((mockup, i) => (
            <p key={i} className="text-xs text-[#666]">• {mockup}</p>
          ))}
          {(report.analysis.mockups?.mockupsFound?.length || 0) > 5 && (
            <p className="text-xs text-[#666]">
              +{(report.analysis.mockups?.mockupsFound?.length || 0) - 5} more
            </p>
          )}
        </div>
      </ExpandableSection>

      <ExpandableSection
        title="Tech Stack"
        icon={<Zap className="h-4 w-4" />}
        status={report.analysis.techstack?.status}
        expanded={expandedSections.has('techstack')}
        onToggle={() => toggleSection('techstack')}
      >
        <div className="flex flex-wrap gap-2">
          {report.analysis.techstack?.techStack?.map((tech, i) => (
            <span
              key={i}
              className="px-2 py-1 text-xs bg-[#3b82f6]/20 text-[#3b82f6] rounded-md"
            >
              {tech}
            </span>
          ))}
        </div>
      </ExpandableSection>

      <ExpandableSection
        title="Compliance"
        icon={<Shield className="h-4 w-4" />}
        status={report.analysis.compliance?.status}
        expanded={expandedSections.has('compliance')}
        onToggle={() => toggleSection('compliance')}
      >
        <div className="space-y-1">
          <p className="text-xs text-[#a3a3a3]">
            Compliance Score: {report.analysis.compliance?.complianceScore || 0}%
          </p>
          {report.analysis.compliance?.findings?.map((finding, i) => (
            <p key={i} className="text-xs text-[#666]">• {finding}</p>
          ))}
        </div>
      </ExpandableSection>

      {/* Blocking Reasons */}
      {!isReady && report.blockingReasons?.length > 0 && (
        <div className="p-3 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30">
          <p className="text-xs font-medium text-[#ef4444] mb-2">Blocking Issues:</p>
          <ul className="space-y-1">
            {report.blockingReasons.map((reason, i) => (
              <li key={i} className="text-xs text-[#fca5a5] flex items-start gap-1">
                <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {report.recommendations?.length > 0 && (
        <div className="p-3 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/30">
          <p className="text-xs font-medium text-[#3b82f6] mb-2">Recommendations:</p>
          <ul className="space-y-1">
            {report.recommendations.slice(0, 5).map((rec, i) => (
              <li key={i} className="text-xs text-[#93c5fd]">• {rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// History Tab Content
function HistoryTab({
  history,
  onSelectItem,
  onClearHistory
}: {
  history: FoundationReport[];
  onSelectItem: (report: FoundationReport) => void;
  onClearHistory: () => void;
}) {
  if (history.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#2e2e2e] flex items-center justify-center mx-auto mb-4">
          <History className="h-8 w-8 text-[#666]" />
        </div>
        <h3 className="text-sm font-medium text-[#a3a3a3] mb-2">No History</h3>
        <p className="text-xs text-[#666]">
          Previous analysis results will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-[#666]">Last {history.length} analyses</p>
        <button
          onClick={onClearHistory}
          className="text-xs text-[#666] hover:text-[#ef4444] transition-colors flex items-center gap-1"
        >
          <Trash2 className="h-3 w-3" />
          Clear
        </button>
      </div>

      <div className="space-y-2">
        {history.map((item, index) => {
          const isReady = item.validationStatus === 'ready';
          return (
            <button
              key={index}
              onClick={() => onSelectItem(item)}
              className="w-full p-3 rounded-lg bg-[#252525] border border-[#2e2e2e] hover:border-[#3e3e3e] transition-colors text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {isReady ? (
                    <CheckCircle2 className="h-4 w-4 text-[#22c55e]" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-[#f97316]" />
                  )}
                  <span className={cn(
                    "text-sm font-medium",
                    isReady ? "text-[#22c55e]" : "text-[#f97316]"
                  )}>
                    {item.readinessScore}%
                  </span>
                </div>
                <span className="text-xs text-[#666]">
                  {new Date(item.timestamp).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#666]">
                <span>{item.analysis.documentation?.docsFound?.length || 0} docs</span>
                <span>•</span>
                <span>{item.analysis.mockups?.count || 0} mockups</span>
                <span>•</span>
                <span>{item.issues?.length || 0} issues</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Helper Components
function MetricCard({
  icon,
  value,
  label,
  color
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: 'blue' | 'purple' | 'green' | 'red';
}) {
  const colorClasses = {
    blue: 'bg-[#3b82f6]/10 text-[#3b82f6]',
    purple: 'bg-[#a855f7]/10 text-[#a855f7]',
    green: 'bg-[#22c55e]/10 text-[#22c55e]',
    red: 'bg-[#ef4444]/10 text-[#ef4444]',
  };

  return (
    <div className="p-2 rounded-lg bg-[#1a1a1a] text-center">
      <div className={cn(
        "w-6 h-6 rounded-md flex items-center justify-center mx-auto mb-1",
        colorClasses[color]
      )}>
        {icon}
      </div>
      <p className="text-lg font-bold text-[#fafafa]">{value}</p>
      <p className="text-[10px] text-[#666] uppercase">{label}</p>
    </div>
  );
}

function ExpandableSection({
  title,
  icon,
  status,
  expanded,
  onToggle,
  children
}: {
  title: string;
  icon: React.ReactNode;
  status?: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const statusColor = status === 'pass' || status === 'found'
    ? 'text-[#22c55e]'
    : status === 'fail' || status === 'missing'
    ? 'text-[#ef4444]'
    : 'text-[#f97316]';

  return (
    <div className="border border-[#2e2e2e] rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center justify-between hover:bg-[#252525] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[#666]">{icon}</span>
          <span className="text-sm font-medium text-[#a3a3a3]">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {status && (
            <span className={cn("text-xs capitalize", statusColor)}>{status}</span>
          )}
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-[#666]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[#666]" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="p-3 pt-0 border-t border-[#2e2e2e]">
          {children}
        </div>
      )}
    </div>
  );
}

export default BlueprintFlyout;
