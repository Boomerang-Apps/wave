/**
 * BestPracticesSection Component (Gate 0 Enhancement)
 *
 * Collapsible section showing folder structure recommendations:
 * - Deviations from recommended structure
 * - Reorganization suggestions with executable commands
 * - Recommended folder structure template
 */

import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Copy,
  FolderTree,
  FileWarning
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Deviation {
  type: string;
  path: string;
  severity: 'error' | 'warning';
  message: string;
  suggestion: string;
  suggestedLocation?: string;
}

interface ReorganizationAction {
  action: 'create' | 'move';
  folder?: string;
  file?: string;
  destination?: string;
  priority: string;
}

interface ReorganizationPlan {
  actions: ReorganizationAction[];
  isOrganized: boolean;
  estimatedMinutes: number;
  duplicates: {
    prd: string[];
    architecture: string[];
    hasDuplicates: boolean;
    suggestion?: string;
  };
}

export interface BestPracticesSectionProps {
  deviations: Deviation[];
  reorganizationPlan: ReorganizationPlan;
  complianceScore: number;
  defaultExpanded?: boolean;
}

const RECOMMENDED_STRUCTURE = `project/
├── docs/                    # REQUIRED: Planning documents
│   ├── PRD.md               # Product Requirements
│   ├── CLAUDE.md            # Agent instructions
│   ├── Architecture.md      # System design
│   └── User-Stories.json    # Structured stories
├── mockups/                 # REQUIRED: Design assets
│   ├── html/                # HTML prototypes
│   └── figma/               # Figma exports
├── src/                     # Source code
│   ├── app/                 # Next.js pages
│   ├── components/          # React components
│   └── lib/                 # Utilities
├── public/                  # Static assets
└── package.json`;

export function BestPracticesSection({
  deviations,
  reorganizationPlan,
  complianceScore,
  defaultExpanded = false
}: BestPracticesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [activeTab, setActiveTab] = useState<'issues' | 'structure'>('issues');
  const [copied, setCopied] = useState(false);

  const errorCount = deviations.filter(d => d.severity === 'error').length;
  const warningCount = deviations.filter(d => d.severity === 'warning').length;
  const totalIssues = errorCount + warningCount;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500 bg-green-500/10';
    if (score >= 60) return 'text-amber-500 bg-amber-500/10';
    return 'text-red-500 bg-red-500/10';
  };

  const generateCommands = () => {
    const commands: string[] = [];

    // First mkdir commands
    reorganizationPlan.actions
      .filter(a => a.action === 'create')
      .forEach(a => {
        commands.push(`mkdir -p ${a.folder}`);
      });

    // Then mv commands
    reorganizationPlan.actions
      .filter(a => a.action === 'move')
      .forEach(a => {
        const src = a.file?.includes(' ') ? `"${a.file}"` : a.file;
        const dest = a.destination?.includes(' ') ? `"${a.destination}"` : a.destination;
        commands.push(`mv ${src} ${dest}`);
      });

    return commands.join('\n');
  };

  const handleCopyCommands = async () => {
    const commands = generateCommands();
    await navigator.clipboard.writeText(commands);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-card hover:bg-muted/50 transition-colors"
        aria-label="Best Practices"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          )}
          <FolderTree className="h-5 w-5 text-blue-500" />
          <span className="font-medium">Best Practices</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Issue count */}
          <span className={cn(
            "text-sm px-2 py-0.5 rounded-full",
            totalIssues > 0 ? "bg-amber-500/10 text-amber-500" : "bg-green-500/10 text-green-500"
          )}>
            {totalIssues} issues
          </span>

          {/* Compliance score */}
          <span className={cn(
            "text-sm font-medium px-2 py-0.5 rounded-full",
            getScoreColor(complianceScore)
          )}>
            {complianceScore}%
          </span>
        </div>
      </button>

      {/* Expandable content */}
      <div className={cn(
        "transition-all duration-200 ease-in-out overflow-hidden",
        isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="border-t border-border p-4 space-y-4">
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              role="tab"
              onClick={() => setActiveTab('issues')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                activeTab === 'issues'
                  ? "bg-blue-500 text-white"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
            >
              Issues ({totalIssues})
            </button>
            <button
              role="tab"
              onClick={() => setActiveTab('structure')}
              aria-label="Structure"
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                activeTab === 'structure'
                  ? "bg-blue-500 text-white"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
            >
              Structure
            </button>
          </div>

          {activeTab === 'issues' && (
            <>
              {/* Duplicate Warning */}
              {reorganizationPlan.duplicates.hasDuplicates && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
                  <FileWarning className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-500">Duplicate documents detected</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {reorganizationPlan.duplicates.suggestion}
                    </p>
                  </div>
                </div>
              )}

              {/* Deviations List */}
              {deviations.length > 0 ? (
                <div className="space-y-2">
                  {deviations.map((deviation, index) => (
                    <div
                      key={index}
                      data-severity={deviation.severity}
                      className={cn(
                        "p-3 rounded-lg border",
                        deviation.severity === 'error'
                          ? "bg-red-500/5 border-red-500/20"
                          : "bg-amber-500/5 border-amber-500/20"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {deviation.severity === 'error' ? (
                          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "font-medium text-sm",
                            deviation.severity === 'error' ? "text-red-500" : "text-amber-500"
                          )}>
                            {deviation.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {deviation.suggestion}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-500 p-3 bg-green-500/10 rounded-lg">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Project structure follows best practices!</span>
                </div>
              )}

              {/* Reorganization Actions */}
              {reorganizationPlan.actions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        {reorganizationPlan.actions.length} actions
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ~{reorganizationPlan.estimatedMinutes} min
                      </span>
                    </div>
                    <button
                      onClick={handleCopyCommands}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-lg text-sm hover:bg-muted/80 transition-colors"
                    >
                      <Copy className="h-4 w-4" />
                      {copied ? 'Copied!' : 'Copy Commands'}
                    </button>
                  </div>

                  <pre className="bg-muted/50 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                    {generateCommands()}
                  </pre>
                </div>
              )}
            </>
          )}

          {activeTab === 'structure' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Recommended folder structure for Next.js + Supabase projects:
              </p>
              <pre className="bg-muted/50 p-4 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre">
                {RECOMMENDED_STRUCTURE}
              </pre>
              <p className="text-xs text-muted-foreground">
                Required folders are marked. WAVE agents work best with this structure.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BestPracticesSection;
