/**
 * Gate0Wizard Component
 *
 * Multi-step wizard for Gate 0 Foundation Analysis & Project Setup.
 * Guides users through: Create → Setup → Analyze → Checklist → Launch
 */

import { useState, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Folder,
  FileText,
  Link2,
  Search,
  Rocket,
  Check,
  Upload,
  Github,
  Database,
  Globe,
  Sparkles,
  FolderTree,
  Layers,
  Zap,
  Shield,
  Code2,
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { cn } from '../lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface ProjectConnection {
  type: 'local' | 'github' | 'supabase' | 'vercel';
  connected: boolean;
  details?: string;
  url?: string;
}

export interface WizardData {
  // Step 1: Basics
  projectName: string;
  projectDescription: string;
  projectType: 'new' | 'existing';
  projectPath: string;

  // Step 2: Documents
  uploadedFiles: File[];
  figmaLink: string;

  // Step 3: Connections
  connections: ProjectConnection[];

  // Step 4: Analysis
  analysisComplete: boolean;
  analysisReport: unknown | null;

  // Step 5: Review
  readyToLaunch: boolean;
}

interface Gate0WizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: WizardData) => void;
  initialPath?: string;
  existingConnections?: ProjectConnection[];
}

// ============================================================================
// Step Components
// ============================================================================

interface StepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep?: boolean;
  isLastStep?: boolean;
}

/**
 * Step 1: Project Basics
 */
function Step1Basics({ data, updateData, onNext }: StepProps) {
  const [localPath, setLocalPath] = useState(data.projectPath || '');

  const isValid = data.projectName.trim().length > 0 && localPath.trim().length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-[#fafafa] mb-2">Project Basics</h2>
        <p className="text-sm text-[#525252]">Tell us about your project</p>
      </div>

      <div className="space-y-6">
        {/* Project Name */}
        <div>
          <label className="block text-sm font-medium text-[#a3a3a3] mb-3">
            Project Name <span className="text-[#ef4444]">*</span>
          </label>
          <input
            type="text"
            value={data.projectName}
            onChange={(e) => updateData({ projectName: e.target.value })}
            placeholder="My Awesome Project"
            className="w-full px-5 py-4 bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl text-[#fafafa] placeholder-[#404040] focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/20 transition-all text-base"
          />
        </div>

        {/* Project Description */}
        <div>
          <label className="block text-sm font-medium text-[#a3a3a3] mb-3">
            Description (optional)
          </label>
          <textarea
            value={data.projectDescription}
            onChange={(e) => updateData({ projectDescription: e.target.value })}
            placeholder="A brief description of what you're building..."
            rows={4}
            className="w-full px-5 py-4 bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl text-[#fafafa] placeholder-[#404040] focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/20 transition-all resize-none text-base"
          />
        </div>

        {/* Project Type */}
        <div>
          <label className="block text-sm font-medium text-[#a3a3a3] mb-3">
            Project Type
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => updateData({ projectType: 'new' })}
              className={cn(
                "flex items-center gap-4 p-5 rounded-xl border-2 transition-all duration-200",
                data.projectType === 'new'
                  ? "border-[#3b82f6] bg-[#3b82f6]/5"
                  : "border-[#2e2e2e] bg-[#1e1e1e] hover:border-[#262626] hover:bg-[#252525]"
              )}
            >
              <div className={cn(
                "p-3 rounded-xl",
                data.projectType === 'new' ? "bg-[#3b82f6]/20" : "bg-[#2e2e2e]"
              )}>
                <Sparkles className={cn("h-6 w-6", data.projectType === 'new' ? "text-[#3b82f6]" : "text-[#525252]")} />
              </div>
              <div className="text-left">
                <p className={cn("text-base font-medium", data.projectType === 'new' ? "text-[#3b82f6]" : "text-[#fafafa]")}>
                  New Project
                </p>
                <p className="text-sm text-[#525252]">Start from scratch</p>
              </div>
            </button>
            <button
              onClick={() => updateData({ projectType: 'existing' })}
              className={cn(
                "flex items-center gap-4 p-5 rounded-xl border-2 transition-all duration-200",
                data.projectType === 'existing'
                  ? "border-[#22c55e] bg-[#22c55e]/5"
                  : "border-[#2e2e2e] bg-[#1e1e1e] hover:border-[#262626] hover:bg-[#252525]"
              )}
            >
              <div className={cn(
                "p-3 rounded-xl",
                data.projectType === 'existing' ? "bg-[#22c55e]/20" : "bg-[#2e2e2e]"
              )}>
                <Folder className={cn("h-6 w-6", data.projectType === 'existing' ? "text-[#22c55e]" : "text-[#525252]")} />
              </div>
              <div className="text-left">
                <p className={cn("text-base font-medium", data.projectType === 'existing' ? "text-[#22c55e]" : "text-[#fafafa]")}>
                  Existing Project
                </p>
                <p className="text-sm text-[#525252]">Analyze existing code</p>
              </div>
            </button>
          </div>
        </div>

        {/* Project Path */}
        <div>
          <label className="block text-sm font-medium text-[#a3a3a3] mb-3">
            Project Path <span className="text-[#ef4444]">*</span>
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={localPath}
              onChange={(e) => {
                setLocalPath(e.target.value);
                updateData({ projectPath: e.target.value });
              }}
              placeholder="/path/to/project"
              className="flex-1 px-5 py-4 bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl text-[#fafafa] placeholder-[#404040] focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/20 transition-all font-mono text-sm"
            />
            <button
              className="px-5 py-4 bg-[#2e2e2e] text-[#a3a3a3] rounded-xl hover:bg-[#262626] transition-all duration-200"
              title="Browse folder"
            >
              <Folder className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Next Button */}
      <div className="flex justify-end pt-6">
        <button
          onClick={onNext}
          disabled={!isValid}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all",
            isValid
              ? "bg-[#fafafa] text-[#1e1e1e] hover:bg-[#e5e5e5]"
              : "bg-[#2e2e2e] text-[#404040] cursor-not-allowed"
          )}
        >
          Continue
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Step 2: Upload Documents
 */
function Step2Documents({ data, updateData, onNext, onBack }: StepProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      updateData({ uploadedFiles: [...data.uploadedFiles, ...files] });
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...data.uploadedFiles];
    newFiles.splice(index, 1);
    updateData({ uploadedFiles: newFiles });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-[#fafafa] mb-2">Upload Documents</h2>
        <p className="text-sm text-[#525252]">
          Optional: Add existing documentation to help with analysis
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200",
          dragActive
            ? "border-[#3b82f6] bg-[#3b82f6]/5"
            : "border-[#2e2e2e] bg-[#1e1e1e] hover:border-[#262626] hover:bg-[#252525]"
        )}
      >
        <Upload className={cn("h-12 w-12 mx-auto mb-4", dragActive ? "text-[#3b82f6]" : "text-[#525252]")} />
        <p className="text-base text-[#fafafa] mb-1">
          Drag & drop files here
        </p>
        <p className="text-sm text-[#525252]">
          Supports PDF, MD, TXT, ZIP, JSON
        </p>
        <input
          type="file"
          multiple
          accept=".pdf,.md,.txt,.zip,.json"
          onChange={(e) => {
            if (e.target.files) {
              const files = Array.from(e.target.files);
              updateData({ uploadedFiles: [...data.uploadedFiles, ...files] });
            }
          }}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="inline-block mt-5 px-5 py-3 bg-[#2e2e2e] text-[#a3a3a3] rounded-xl text-sm font-medium cursor-pointer hover:bg-[#262626] hover:text-[#fafafa] transition-all duration-200"
        >
          Browse Files
        </label>
      </div>

      {/* Uploaded Files */}
      {data.uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-[#a3a3a3]">Uploaded Files</p>
          {data.uploadedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-[#2e2e2e]">
                  <FileText className="h-5 w-5 text-[#525252]" />
                </div>
                <div>
                  <span className="text-sm text-[#fafafa] font-medium">{file.name}</span>
                  <span className="text-xs text-[#525252] ml-2">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="p-2 text-[#525252] hover:text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg transition-all duration-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Figma Link */}
      <div>
        <label className="block text-sm font-medium text-[#a3a3a3] mb-3">
          Figma Link (optional)
        </label>
        <input
          type="url"
          value={data.figmaLink}
          onChange={(e) => updateData({ figmaLink: e.target.value })}
          placeholder="https://www.figma.com/file/..."
          className="w-full px-5 py-4 bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl text-[#fafafa] placeholder-[#404040] focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/20 transition-all text-base"
        />
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-3 text-[#a3a3a3] hover:text-[#fafafa] hover:bg-[#2e2e2e] rounded-xl transition-all duration-200"
        >
          <ChevronLeft className="h-5 w-5" />
          Back
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-3 bg-[#fafafa] text-[#1e1e1e] rounded-xl font-medium hover:bg-[#e5e5e5] transition-all"
        >
          Continue
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Step 3: Connect Services
 */
function Step3Connections({ data, updateData, onNext, onBack }: StepProps) {
  const connectionTypes = [
    { type: 'local' as const, name: 'Local Folder', icon: Folder, color: 'text-[#3b82f6]', bg: 'bg-[#3b82f6]/20' },
    { type: 'github' as const, name: 'GitHub', icon: Github, color: 'text-[#a855f7]', bg: 'bg-[#a855f7]/20' },
    { type: 'supabase' as const, name: 'Supabase', icon: Database, color: 'text-[#22c55e]', bg: 'bg-[#22c55e]/20' },
    { type: 'vercel' as const, name: 'Vercel', icon: Globe, color: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/20' }
  ];

  const toggleConnection = (type: ProjectConnection['type']) => {
    const existing = data.connections.find(c => c.type === type);
    if (existing) {
      updateData({
        connections: data.connections.map(c =>
          c.type === type ? { ...c, connected: !c.connected } : c
        )
      });
    } else {
      updateData({
        connections: [...data.connections, { type, connected: true }]
      });
    }
  };

  const isConnected = (type: ProjectConnection['type']) =>
    data.connections.find(c => c.type === type)?.connected || false;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-[#fafafa] mb-2">Connect Services</h2>
        <p className="text-sm text-[#525252]">
          Connect your project to external services (optional)
        </p>
      </div>

      {/* Connection Cards */}
      <div className="grid grid-cols-2 gap-4">
        {connectionTypes.map((conn) => {
          const connected = isConnected(conn.type);
          const Icon = conn.icon;

          return (
            <button
              key={conn.type}
              onClick={() => toggleConnection(conn.type)}
              className={cn(
                "flex items-center gap-4 p-5 rounded-xl border-2 transition-all duration-200 text-left",
                connected
                  ? "border-[#22c55e] bg-[#22c55e]/5"
                  : "border-[#2e2e2e] bg-[#1e1e1e] hover:border-[#262626] hover:bg-[#252525]"
              )}
            >
              <div className={cn("p-3 rounded-xl", conn.bg)}>
                <Icon className={cn("h-6 w-6", conn.color)} />
              </div>
              <div className="flex-1">
                <p className="text-base font-medium text-[#fafafa]">{conn.name}</p>
                <p className="text-sm text-[#525252]">
                  {connected ? 'Connected' : 'Click to connect'}
                </p>
              </div>
              {connected && (
                <CheckCircle2 className="h-6 w-6 text-[#22c55e]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Local folder is always shown as connected if path is set */}
      {data.projectPath && (
        <div className="p-5 bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl">
          <p className="text-xs text-[#525252] mb-2">Project Path</p>
          <p className="text-sm text-[#fafafa] font-mono">{data.projectPath}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-3 text-[#a3a3a3] hover:text-[#fafafa] hover:bg-[#2e2e2e] rounded-xl transition-all duration-200"
        >
          <ChevronLeft className="h-5 w-5" />
          Back
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-3 bg-[#fafafa] text-[#1e1e1e] rounded-xl font-medium hover:bg-[#e5e5e5] transition-all"
        >
          Start Analysis
          <Search className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

const ANALYSIS_STEPS = [
  { id: 'structure', label: 'Scanning Structure', icon: FolderTree, color: 'text-[#3b82f6]', bg: 'bg-[#3b82f6]/20' },
  { id: 'docs', label: 'Analyzing Documentation', icon: Code2, color: 'text-[#22c55e]', bg: 'bg-[#22c55e]/20' },
  { id: 'mockups', label: 'Detecting Mockups', icon: Layers, color: 'text-[#a855f7]', bg: 'bg-[#a855f7]/20' },
  { id: 'tech', label: 'Identifying Tech Stack', icon: Zap, color: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/20' },
  { id: 'compliance', label: 'Checking Compliance', icon: Shield, color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/20' }
] as const;

/**
 * Step 4: Analysis
 */
function Step4Analysis({ data, updateData, onNext, onBack }: StepProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const startAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    setError(null);
    setCurrentStep(0);

    try {
      const response = await fetch('/api/analyze-foundation-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: data.projectPath,
          mode: data.projectType
        })
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let result = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
          try {
            const jsonStr = line.slice(6);
            const event = JSON.parse(jsonStr);

            if (event.step) {
              const stepIndex = ANALYSIS_STEPS.findIndex(s => s.id === event.step);
              if (stepIndex >= 0) {
                setCurrentStep(stepIndex);
              }
            }

            if (event.type === 'complete' || event.report) {
              result = event.report || event;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }

      if (result) {
        updateData({
          analysisComplete: true,
          analysisReport: result
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [data.projectPath, data.projectType, updateData]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-[#fafafa] mb-2">Foundation Analysis</h2>
        <p className="text-sm text-[#525252]">
          Analyzing your project structure and readiness
        </p>
      </div>

      {/* Analysis Steps */}
      <div className="space-y-3">
        {ANALYSIS_STEPS.map((step, index) => {
          const Icon = step.icon;
          const isComplete = data.analysisComplete || index < currentStep;
          const isCurrent = isAnalyzing && index === currentStep;

          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-4 p-5 rounded-xl border-2 transition-all duration-200",
                isComplete ? "border-[#22c55e]/30 bg-[#22c55e]/5" :
                isCurrent ? "border-[#3b82f6]/30 bg-[#3b82f6]/5" :
                "border-[#2e2e2e] bg-[#1e1e1e]"
              )}
            >
              <div className={cn(
                "p-3 rounded-xl",
                isComplete ? "bg-[#22c55e]/20" :
                isCurrent ? "bg-[#3b82f6]/20" :
                "bg-[#2e2e2e]"
              )}>
                {isCurrent ? (
                  <Loader2 className="h-5 w-5 text-[#3b82f6] animate-spin" />
                ) : isComplete ? (
                  <Check className="h-5 w-5 text-[#22c55e]" />
                ) : (
                  <Icon className={cn("h-5 w-5", step.color, "opacity-50")} />
                )}
              </div>
              <span className={cn(
                "text-base font-medium",
                isComplete ? "text-[#22c55e]" :
                isCurrent ? "text-[#3b82f6]" :
                "text-[#525252]"
              )}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-4 p-5 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-xl">
          <AlertCircle className="h-6 w-6 text-[#ef4444]" />
          <span className="text-base text-[#ef4444]">{error}</span>
        </div>
      )}

      {/* Start/Continue Button */}
      {!data.analysisComplete && !isAnalyzing && (
        <button
          onClick={startAnalysis}
          className="w-full flex items-center justify-center gap-3 px-6 py-5 bg-[#fafafa] text-[#1e1e1e] rounded-xl text-base font-medium hover:bg-[#e5e5e5] transition-all"
        >
          <Search className="h-5 w-5" />
          Start Analysis
        </button>
      )}

      {/* Success Message */}
      {data.analysisComplete && (
        <div className="flex items-center gap-4 p-5 bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-xl">
          <CheckCircle2 className="h-6 w-6 text-[#22c55e]" />
          <span className="text-base text-[#22c55e]">Analysis complete! Review results and continue.</span>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <button
          onClick={onBack}
          disabled={isAnalyzing}
          className="flex items-center gap-2 px-5 py-3 text-[#a3a3a3] hover:text-[#fafafa] hover:bg-[#2e2e2e] rounded-xl transition-all duration-200 disabled:opacity-50"
        >
          <ChevronLeft className="h-5 w-5" />
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!data.analysisComplete}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all",
            data.analysisComplete
              ? "bg-[#3b82f6] text-white hover:bg-[#2563eb]"
              : "bg-[#2e2e2e] text-[#525252] cursor-not-allowed"
          )}
        >
          View Results
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Step 5: Review & Launch
 */
function Step5Review({ data, updateData, onNext, onBack }: StepProps) {
  const report = data.analysisReport as {
    readinessScore?: number;
    validationStatus?: string;
    analysis?: {
      documentation?: { docsFound?: unknown[] };
      mockups?: { count?: number };
    };
    issues?: unknown[];
  } | null;

  const score = report?.readinessScore || 0;
  const isReady = report?.validationStatus === 'ready';
  const docsCount = report?.analysis?.documentation?.docsFound?.length || 0;
  const mockupsCount = report?.analysis?.mockups?.count || 0;
  const issuesCount = report?.issues?.length || 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-[#fafafa] mb-2">Review & Launch</h2>
        <p className="text-sm text-[#525252]">
          Review your project setup before proceeding
        </p>
      </div>

      {/* Readiness Score */}
      <div className={cn(
        "p-8 rounded-xl border-2 text-center",
        isReady ? "border-[#22c55e]/30 bg-[#22c55e]/5" : "border-[#f97316]/30 bg-[#f97316]/5"
      )}>
        <p className={cn(
          "text-6xl font-bold mb-3",
          score >= 80 ? "text-[#22c55e]" :
          score >= 60 ? "text-[#f59e0b]" :
          "text-[#ef4444]"
        )}>
          {score}%
        </p>
        <p className={cn(
          "text-base font-medium",
          isReady ? "text-[#22c55e]" : "text-[#f97316]"
        )}>
          {isReady ? 'Ready for Development' : 'Needs Attention'}
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl text-center">
          <p className="text-3xl font-bold text-[#fafafa]">{docsCount}</p>
          <p className="text-sm text-[#525252] mt-1">Documents</p>
        </div>
        <div className="p-5 bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl text-center">
          <p className="text-3xl font-bold text-[#fafafa]">{mockupsCount}</p>
          <p className="text-sm text-[#525252] mt-1">Mockups</p>
        </div>
        <div className="p-5 bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl text-center">
          <p className={cn("text-3xl font-bold", issuesCount > 0 ? "text-[#ef4444]" : "text-[#22c55e]")}>
            {issuesCount}
          </p>
          <p className="text-sm text-[#525252] mt-1">Issues</p>
        </div>
      </div>

      {/* Project Info */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl">
          <span className="text-sm text-[#525252]">Project Name</span>
          <span className="text-base text-[#fafafa] font-medium">{data.projectName}</span>
        </div>
        <div className="flex items-center justify-between p-4 bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl">
          <span className="text-sm text-[#525252]">Type</span>
          <span className="text-base text-[#fafafa] font-medium capitalize">{data.projectType}</span>
        </div>
        <div className="flex items-center justify-between p-4 bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl">
          <span className="text-sm text-[#525252]">Path</span>
          <span className="text-sm text-[#fafafa] font-mono">{data.projectPath}</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-3 text-[#a3a3a3] hover:text-[#fafafa] hover:bg-[#2e2e2e] rounded-xl transition-all duration-200"
        >
          <ChevronLeft className="h-5 w-5" />
          Back
        </button>
        <button
          onClick={() => {
            updateData({ readyToLaunch: true });
            onNext();
          }}
          className="flex items-center gap-2 px-6 py-3 bg-[#fafafa] text-[#1e1e1e] rounded-xl font-medium hover:bg-[#e5e5e5] transition-all"
        >
          <Rocket className="h-5 w-5" />
          View Checklist
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Wizard Component
// ============================================================================

export function Gate0Wizard({
  isOpen,
  onClose,
  onComplete,
  initialPath = '',
  existingConnections = []
}: Gate0WizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<WizardData>({
    projectName: '',
    projectDescription: '',
    projectType: 'new',
    projectPath: initialPath,
    uploadedFiles: [],
    figmaLink: '',
    connections: existingConnections.length > 0 ? existingConnections : [
      { type: 'local', connected: !!initialPath }
    ],
    analysisComplete: false,
    analysisReport: null,
    readyToLaunch: false
  });

  const steps = [
    { id: 'basics', label: 'Basics', icon: Folder },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'connections', label: 'Connect', icon: Link2 },
    { id: 'analysis', label: 'Analyze', icon: Search },
    { id: 'review', label: 'Review', icon: Rocket }
  ];

  const updateData = useCallback((updates: Partial<WizardData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete(data);
    }
  }, [currentStep, steps.length, data, onComplete]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  if (!isOpen) return null;

  const stepProps: StepProps = {
    data,
    updateData,
    onNext: handleNext,
    onBack: handleBack,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === steps.length - 1
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal - 50% bigger: max-w-[1000px] and taller content area */}
      <div className="relative w-full max-w-[1000px] max-h-[95vh] overflow-hidden bg-[#1e1e1e] border border-[#2e2e2e] rounded-3xl shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-[#2e2e2e] bg-[#1e1e1e]">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#3b82f6]/20 to-[#8b5cf6]/20 border border-[#3b82f6]/20">
              <Sparkles className="h-6 w-6 text-[#3b82f6]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[#fafafa]">Gate 0: Foundation Setup</h1>
              <p className="text-sm text-[#525252] mt-0.5">Step {currentStep + 1} of {steps.length}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 text-[#525252] hover:text-[#fafafa] hover:bg-[#2e2e2e] rounded-xl transition-all duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-8 py-5 border-b border-[#2e2e2e] bg-[#1e1e1e]/50">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isComplete = index < currentStep;
              const isCurrent = index === currentStep;

              return (
                <div key={step.id} className="flex items-center">
                  <div className={cn(
                    "flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200",
                    isComplete ? "bg-[#22c55e]/10 border border-[#22c55e]/20" :
                    isCurrent ? "bg-[#3b82f6]/10 border border-[#3b82f6]/20" :
                    "bg-transparent border border-transparent"
                  )}>
                    <div className={cn(
                      "p-1.5 rounded-lg",
                      isComplete ? "bg-[#22c55e]" :
                      isCurrent ? "bg-[#3b82f6]" :
                      "bg-[#2e2e2e]"
                    )}>
                      {isComplete ? (
                        <Check className="h-3.5 w-3.5 text-white" />
                      ) : (
                        <Icon className={cn(
                          "h-3.5 w-3.5",
                          isCurrent ? "text-white" : "text-[#525252]"
                        )} />
                      )}
                    </div>
                    <span className={cn(
                      "text-sm font-medium",
                      isComplete ? "text-[#22c55e]" :
                      isCurrent ? "text-[#3b82f6]" :
                      "text-[#525252]"
                    )}>
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={cn(
                      "w-12 h-px mx-2",
                      index < currentStep ? "bg-[#22c55e]/50" : "bg-[#2e2e2e]"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content - Taller content area */}
        <div className="p-8 overflow-y-auto max-h-[70vh] bg-[#1e1e1e]">
          {currentStep === 0 && <Step1Basics {...stepProps} />}
          {currentStep === 1 && <Step2Documents {...stepProps} />}
          {currentStep === 2 && <Step3Connections {...stepProps} />}
          {currentStep === 3 && <Step4Analysis {...stepProps} />}
          {currentStep === 4 && <Step5Review {...stepProps} />}
        </div>
      </div>
    </div>
  );
}

export default Gate0Wizard;
