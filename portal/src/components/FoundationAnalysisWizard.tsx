/**
 * FoundationAnalysisWizard Component
 *
 * A comprehensive wizard for running Foundation Analysis.
 * Shows analysis categories, project connections, and analysis options.
 */

import { useState } from 'react';
import {
  X,
  Sparkles,
  FolderTree,
  Code2,
  Layers,
  Zap,
  Shield,
  Folder,
  Github,
  Database,
  Globe,
  Clock,
  AlertCircle,
  RefreshCw,
  Play,
  Brain,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

interface ProjectConnection {
  id: string;
  name: string;
  type: 'local' | 'github' | 'supabase' | 'vercel';
  status: 'connected' | 'not-connected';
  projectName?: string;
  lastAnalyzed?: string;
  issues?: number;
}

interface FoundationAnalysisWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onStartAnalysis: (options: { aiDeepReview: boolean }) => void;
  projectPath?: string;
  projectName?: string;
  connections?: ProjectConnection[];
  isAnalyzing?: boolean;
  // Render prop for analysis button/component
  analysisComponent?: React.ReactNode;
}

// Analysis categories
const analysisCategories = [
  { id: 'structure', label: 'Structure', icon: FolderTree, color: 'text-[#3b82f6]', bg: 'bg-[#3b82f6]/10' },
  { id: 'documentation', label: 'Documentation', icon: Code2, color: 'text-[#22c55e]', bg: 'bg-[#22c55e]/10' },
  { id: 'mockups', label: 'Mockups', icon: Layers, color: 'text-[#a855f7]', bg: 'bg-[#a855f7]/10' },
  { id: 'tech-stack', label: 'Tech Stack', icon: Zap, color: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/10' },
  { id: 'compliance', label: 'Compliance', icon: Shield, color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10' },
];

// Connection type icons
const connectionIcons = {
  local: Folder,
  github: Github,
  supabase: Database,
  vercel: Globe,
};

export function FoundationAnalysisWizard({
  isOpen,
  onClose,
  onStartAnalysis,
  projectPath,
  projectName = 'Project',
  connections: externalConnections,
  isAnalyzing = false,
  analysisComponent
}: FoundationAnalysisWizardProps) {
  const [aiDeepReview, setAiDeepReview] = useState(false);
  const [lastChecked] = useState(new Date());

  // Default connections if not provided
  const defaultConnections: ProjectConnection[] = [
    {
      id: 'local',
      name: 'Local',
      type: 'local',
      status: projectPath ? 'connected' : 'not-connected',
      projectName: projectName,
      lastAnalyzed: 'Just now',
      issues: 1,
    },
    {
      id: 'github',
      name: 'GitHub',
      type: 'github',
      status: 'not-connected',
      issues: 1,
    },
    {
      id: 'supabase',
      name: 'Supabase',
      type: 'supabase',
      status: 'not-connected',
      lastAnalyzed: 'Just now',
      issues: 2,
    },
    {
      id: 'vercel',
      name: 'Vercel',
      type: 'vercel',
      status: 'not-connected',
      issues: 1,
    },
  ];

  const connections = externalConnections || defaultConnections;
  const connectedCount = connections.filter(c => c.status === 'connected').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Wizard Panel */}
      <div className="relative w-[900px] max-w-[95vw] bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#1e1e1e]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#fafafa]">Foundation Analysis</h2>
              <p className="text-sm text-[#666] mt-0.5">Validate your project setup before starting development</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#1e1e1e] text-[#666] hover:text-[#fafafa] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* What We'll Analyze Section */}
          <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="h-4 w-4 text-[#3b82f6]" />
              <span className="text-sm font-medium text-[#fafafa]">What We'll Analyze</span>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {analysisCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex flex-col items-center gap-3 p-5 rounded-xl bg-[#0a0a0a] border border-[#1e1e1e] hover:border-[#2e2e2e] transition-colors"
                >
                  <div className={cn("p-3 rounded-xl", cat.bg)}>
                    <cat.icon className={cn("h-6 w-6", cat.color)} />
                  </div>
                  <span className="text-sm text-[#a3a3a3]">{cat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Project Connections Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-[#666]">Project Connections</span>
              <button className="p-1.5 rounded-lg hover:bg-[#1e1e1e] text-[#666] hover:text-[#fafafa] transition-colors">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {connections.map((conn) => {
                const Icon = connectionIcons[conn.type];
                const isConnected = conn.status === 'connected';

                return (
                  <div
                    key={conn.id}
                    className={cn(
                      "p-4 rounded-xl border transition-colors",
                      isConnected
                        ? "bg-[#111111] border-[#1e1e1e]"
                        : "bg-[#0a0a0a] border-[#1e1e1e]/50"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          isConnected ? "bg-[#1e1e1e]" : "bg-[#1e1e1e]/50"
                        )}>
                          <Icon className={cn(
                            "h-5 w-5",
                            isConnected ? "text-[#fafafa]" : "text-[#666]"
                          )} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "text-sm font-medium",
                              isConnected ? "text-[#fafafa]" : "text-[#666]"
                            )}>
                              {conn.name}
                            </span>
                            {isConnected ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-[#22c55e]" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-[#666]" />
                            )}
                          </div>
                          <span className="text-xs text-[#666]">
                            {isConnected ? conn.projectName : 'Not connected'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#1e1e1e]/50">
                      <div className="flex items-center gap-1 text-xs text-[#666]">
                        <Clock className="h-3 w-3" />
                        <span>{conn.lastAnalyzed || 'Not analyzed'}</span>
                      </div>
                      {conn.issues !== undefined && conn.issues > 0 && (
                        <div className="flex items-center gap-1 text-xs text-[#f97316]">
                          <AlertCircle className="h-3 w-3" />
                          <span>{conn.issues} issues</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-[#666]">
              <span>{connectedCount}/{connections.length} connected</span>
              <span>Last checked {lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-[#1e1e1e] bg-[#0a0a0a]">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={aiDeepReview}
                onChange={(e) => setAiDeepReview(e.target.checked)}
                className="sr-only"
              />
              <div className={cn(
                "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                aiDeepReview
                  ? "bg-[#3b82f6] border-[#3b82f6]"
                  : "border-[#3e3e3e] group-hover:border-[#666]"
              )}>
                {aiDeepReview && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-[#a855f7]" />
              <span className="text-sm text-[#a3a3a3] group-hover:text-[#fafafa] transition-colors">
                AI Deep Review
              </span>
            </div>
          </label>

          {analysisComponent ? (
            <div className="[&_button]:px-6 [&_button]:py-3 [&_button]:rounded-xl [&_button]:text-sm [&_button]:font-medium">
              {analysisComponent}
            </div>
          ) : (
            <button
              onClick={() => onStartAnalysis({ aiDeepReview })}
              disabled={isAnalyzing}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all",
                isAnalyzing
                  ? "bg-[#3b82f6]/50 text-white/50 cursor-not-allowed"
                  : "bg-[#3b82f6] text-white hover:bg-[#2563eb] hover:shadow-lg hover:shadow-[#3b82f6]/25"
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
                  Start Foundation Analysis
              </>
            )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default FoundationAnalysisWizard;
