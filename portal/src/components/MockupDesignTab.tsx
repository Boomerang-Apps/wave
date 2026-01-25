/**
 * MockupDesignTab Component (Launch Sequence)
 *
 * Step 0: Gate 0 - Design Phase
 * - Project overview with name and vision
 * - Documentation links (PRD, Architecture, User Stories)
 * - Mockup gallery with thumbnails
 * - Validate and lock mockups before development
 */

import { useState, useCallback, useEffect } from 'react';
import {
  FileCode, Layout, CheckCircle2, XCircle, AlertTriangle,
  Lock, Database, FileText, Building2, Users, BookOpen, Bot,
  Rocket, Settings, File, ExternalLink, Play, Eye, Quote, Palette
} from 'lucide-react';
import { InfoBox, KPICards, ActionBar, ResultSummary, ExpandableCard, TabContainer, SectionDivider } from './TabLayout';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface MockupCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: Record<string, unknown>;
}

export interface MockupScreen {
  path?: string;
  name: string;
  title: string;
  summary: string;
  filename?: string;
  order?: number;
}

export interface ValidationResult {
  status: 'ready' | 'blocked';
  checks: MockupCheck[];
  screens: MockupScreen[];
  timestamp?: string;
  persistError?: string;
}

export interface DocumentationFile {
  title: string;
  filename: string;
  path: string;
  relativePath?: string;
  type: 'prd' | 'architecture' | 'userStories' | 'readme' | 'claude' | 'quickstart' | 'setup' | 'other';
  icon: string;
}

export interface ProjectMetadata {
  name: string;
  tagline: string;
  vision: string;
  description: string;
  documentation: DocumentationFile[];
  mockups: MockupScreen[];
  techStack: string[];
}

export interface MockupDesignTabProps {
  projectPath: string;
  projectId: string;
  validationStatus: 'idle' | 'validating' | 'ready' | 'blocked';
  onValidationComplete: (status: 'ready' | 'blocked') => void;
}

// ============================================
// Helper Functions
// ============================================

const getDocIcon = (type: string) => {
  switch (type) {
    case 'prd': return <FileText className="h-4 w-4" />;
    case 'architecture': return <Building2 className="h-4 w-4" />;
    case 'userStories': return <Users className="h-4 w-4" />;
    case 'readme': return <BookOpen className="h-4 w-4" />;
    case 'claude': return <Bot className="h-4 w-4" />;
    case 'quickstart': return <Rocket className="h-4 w-4" />;
    case 'setup': return <Settings className="h-4 w-4" />;
    default: return <File className="h-4 w-4" />;
  }
};

const getDocColor = (type: string) => {
  switch (type) {
    case 'prd': return 'text-blue-500 bg-blue-500/10';
    case 'architecture': return 'text-purple-500 bg-purple-500/10';
    case 'userStories': return 'text-green-500 bg-green-500/10';
    case 'readme': return 'text-amber-500 bg-amber-500/10';
    case 'claude': return 'text-orange-500 bg-orange-500/10';
    default: return 'text-slate-500 bg-slate-500/10';
  }
};

// ============================================
// Sub-components
// ============================================

interface ProjectHeaderProps {
  name: string;
  tagline: string;
  vision: string;
  techStack: string[];
}

function ProjectHeader({ name, tagline, vision, techStack }: ProjectHeaderProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 mb-6">
      {/* Project Name & Tagline */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">{name}</h1>
          {tagline && (
            <p className="text-sm text-muted-foreground">{tagline}</p>
          )}
        </div>
        {/* Tech Stack Badges */}
        {techStack.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-end">
            {techStack.map((tech, index) => (
              <span
                key={index}
                className="px-2.5 py-1 bg-muted text-muted-foreground rounded-lg text-xs font-medium"
              >
                {tech}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Vision Statement */}
      {vision && (
        <div className="flex items-start gap-3 bg-blue-500/10 rounded-lg p-4">
          <Quote className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-blue-500 text-sm leading-relaxed">"{vision}"</p>
        </div>
      )}
    </div>
  );
}

interface DocumentationLinksProps {
  docs: DocumentationFile[];
}

function DocumentationLinks({ docs }: DocumentationLinksProps) {
  if (docs.length === 0) {
    return (
      <div className="bg-amber-500/10 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 text-amber-500">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">No documentation files found in project</span>
        </div>
      </div>
    );
  }

  const handleOpenDoc = (doc: DocumentationFile) => {
    // Open file in system viewer or VS Code
    window.open(`vscode://file${doc.path}`, '_blank');
  };

  // Group docs by type for organized display
  const priorityDocs = docs.filter(d => ['prd', 'architecture', 'userStories', 'readme'].includes(d.type));
  const otherDocs = docs.filter(d => !['prd', 'architecture', 'userStories', 'readme'].includes(d.type));

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Documentation</h3>

      {/* Priority Documents Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        {priorityDocs.map((doc, index) => (
          <button
            key={index}
            onClick={() => handleOpenDoc(doc)}
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border border-border bg-card",
              "hover:bg-muted/50 transition-colors text-left group"
            )}
          >
            <span className={cn("w-10 h-10 rounded-lg flex items-center justify-center", getDocColor(doc.type))}>
              {getDocIcon(doc.type)}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{doc.title}</div>
              <div className="text-xs text-muted-foreground capitalize">{doc.type.replace(/([A-Z])/g, ' $1').trim()}</div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>

      {/* Other Documents */}
      {otherDocs.length > 0 && (
        <ExpandableCard
          title="Additional Documents"
          subtitle={`${otherDocs.length} more file${otherDocs.length !== 1 ? 's' : ''}`}
          icon={<File className="h-4 w-4" />}
          defaultExpanded={false}
        >
          <div className="space-y-2">
            {otherDocs.map((doc, index) => (
              <button
                key={index}
                onClick={() => handleOpenDoc(doc)}
                className="flex items-center justify-between w-full py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <span className={cn("w-6 h-6 rounded flex items-center justify-center", getDocColor(doc.type))}>
                    {getDocIcon(doc.type)}
                  </span>
                  <span className="text-sm">{doc.title}</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </ExpandableCard>
      )}
    </div>
  );
}

interface MockupGalleryProps {
  mockups: MockupScreen[];
  onLaunchPreview: (mockup: MockupScreen) => void;
  selectedMockup?: MockupScreen | null;
  onSelectMockup: (mockup: MockupScreen | null) => void;
}

function MockupGallery({ mockups, onLaunchPreview, selectedMockup, onSelectMockup }: MockupGalleryProps) {
  if (mockups.length === 0) {
    return (
      <div className="bg-amber-500/10 rounded-xl p-6 mb-6 text-center">
        <Layout className="h-8 w-8 text-amber-500 mx-auto mb-2" />
        <p className="text-amber-500 font-medium">No mockups found</p>
        <p className="text-amber-500/70 text-sm mt-1">
          Add HTML files to <code className="bg-amber-500/20 px-1 rounded">design_mockups/</code> folder
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Design Mockups
        </h3>
        <span className="text-xs text-muted-foreground">{mockups.length} screen{mockups.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Mockup Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {mockups.map((mockup, index) => (
          <button
            key={index}
            onClick={() => onSelectMockup(selectedMockup?.name === mockup.name ? null : mockup)}
            className={cn(
              "group relative aspect-[4/3] rounded-xl border-2 overflow-hidden transition-all",
              selectedMockup?.name === mockup.name
                ? "border-blue-500 ring-2 ring-blue-500/20"
                : "border-border hover:border-slate-500"
            )}
          >
            {/* Placeholder background - in production would use iframe or screenshot */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
              <Layout className="h-8 w-8 text-slate-600" />
            </div>

            {/* Overlay with mockup name */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <p className="text-white text-sm font-medium truncate">{mockup.name}</p>
            </div>

            {/* Hover overlay with preview button */}
            <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <span className="bg-white text-slate-900 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-lg">
                <Eye className="h-3.5 w-3.5" />
                Preview
              </span>
            </div>

            {/* Selection indicator */}
            {selectedMockup?.name === mockup.name && (
              <div className="absolute top-2 right-2">
                <CheckCircle2 className="h-5 w-5 text-blue-500 bg-white rounded-full" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Launch Preview Button */}
      {selectedMockup && (
        <div className="mt-4 flex items-center justify-center">
          <button
            onClick={() => onLaunchPreview(selectedMockup)}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium flex items-center gap-2 transition-colors"
          >
            <Play className="h-4 w-4" />
            Launch Preview: {selectedMockup.name}
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function MockupDesignTab({
  projectPath,
  projectId,
  validationStatus: initialStatus,
  onValidationComplete
}: MockupDesignTabProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(true);
  const [currentStatus, setCurrentStatus] = useState<'idle' | 'validating' | 'ready' | 'blocked'>(initialStatus);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [projectMetadata, setProjectMetadata] = useState<ProjectMetadata | null>(null);
  const [selectedMockup, setSelectedMockup] = useState<MockupScreen | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Discover project metadata on mount
  useEffect(() => {
    async function discoverProject() {
      try {
        const response = await fetch('/api/discover-project', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectPath })
        });

        if (response.ok) {
          const { data } = await response.json();
          setProjectMetadata(data);
        }
      } catch (err) {
        console.error('Failed to discover project:', err);
      } finally {
        setIsDiscovering(false);
      }
    }

    discoverProject();
  }, [projectPath]);

  const handleValidate = useCallback(async () => {
    setIsValidating(true);
    setError(null);

    try {
      const response = await fetch('/api/validate-mockups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath, projectId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Server error');
      }

      const data: ValidationResult = await response.json();
      setValidationResult(data);
      setCurrentStatus(data.status);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsValidating(false);
    }
  }, [projectPath, projectId]);

  const handleLockMockups = useCallback(() => {
    onValidationComplete('ready');
  }, [onValidationComplete]);

  const handleLaunchPreview = useCallback((mockup: MockupScreen) => {
    if (mockup.path) {
      // Open mockup file in browser
      window.open(`file://${mockup.path}`, '_blank');
    }
  }, []);

  // Calculate KPIs
  const passedChecks = validationResult?.checks.filter(c => c.status === 'pass').length || 0;
  const totalChecks = validationResult?.checks.length || 0;
  const screenCount = projectMetadata?.mockups.length || validationResult?.screens.length || 0;
  const docCount = projectMetadata?.documentation.length || 0;

  // Format timestamp
  const formatTimestamp = (ts?: string) => {
    if (!ts) return undefined;
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  };

  // Extract project name from metadata or path
  const projectName = projectMetadata?.name || projectPath.split('/').pop() || 'Project';

  // Loading state
  if (isDiscovering) {
    return (
      <TabContainer>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-3" />
            <p className="text-muted-foreground">Discovering project...</p>
          </div>
        </div>
      </TabContainer>
    );
  }

  return (
    <TabContainer>
      {/* 1. INFO BOX */}
      <InfoBox
        title="Gate 0: Design Validation"
        description="Review project documentation and validate HTML mockups before development begins. Lock your design to ensure agents build exactly what you envisioned."
        icon={<Palette className="h-4 w-4 text-blue-500" />}
      />

      {/* PROJECT INFO */}
      <ProjectHeader
        name={projectName}
        tagline={projectMetadata?.tagline || ''}
        vision={projectMetadata?.vision || ''}
        techStack={projectMetadata?.techStack || []}
      />

      {/* DOCUMENTATION LINKS */}
      <DocumentationLinks
        docs={projectMetadata?.documentation || []}
      />

      <SectionDivider label="Design Mockups" />

      {/* MOCKUP GALLERY */}
      <MockupGallery
        mockups={projectMetadata?.mockups || []}
        onLaunchPreview={handleLaunchPreview}
        selectedMockup={selectedMockup}
        onSelectMockup={setSelectedMockup}
      />

      <SectionDivider label="Validation" />

      {/* KPI CARDS */}
      <KPICards
        items={[
          {
            label: 'Screens',
            value: screenCount,
            status: screenCount > 0 ? 'success' : 'neutral',
            icon: <Layout className="h-4 w-4" />
          },
          {
            label: 'Documents',
            value: docCount,
            status: docCount > 0 ? 'success' : 'neutral',
            icon: <FileText className="h-4 w-4" />
          },
          {
            label: 'Checks Passed',
            value: totalChecks > 0 ? `${passedChecks}/${totalChecks}` : '-',
            status: passedChecks === totalChecks && totalChecks > 0 ? 'success' : totalChecks > 0 ? 'warning' : 'neutral',
            icon: <CheckCircle2 className="h-4 w-4" />
          },
          {
            label: 'Status',
            value: currentStatus === 'ready' ? 'Ready' : currentStatus === 'blocked' ? 'Blocked' : 'Pending',
            status: currentStatus === 'ready' ? 'success' : currentStatus === 'blocked' ? 'error' : 'neutral',
          },
        ]}
      />

      {/* ACTION BAR */}
      <ActionBar
        category="GATE 0"
        title="Design Validation"
        description={`Validate HTML mockups before development`}
        statusBadge={validationResult ? {
          label: formatTimestamp(validationResult.timestamp) || 'Validated',
          icon: <Database className="h-3 w-3" />,
          variant: currentStatus === 'ready' ? 'success' : 'warning'
        } : undefined}
        primaryAction={{
          label: currentStatus === 'ready' ? 'Re-Validate' : 'Validate Mockups',
          onClick: handleValidate,
          loading: isValidating,
          icon: <FileCode className="h-4 w-4" />
        }}
        secondaryAction={currentStatus === 'ready' && !error ? {
          label: 'Lock & Continue',
          onClick: handleLockMockups,
          icon: <Lock className="h-4 w-4" />
        } : undefined}
      />

      {/* RESULT SUMMARY */}
      {(validationResult || error) && (
        <ResultSummary
          status={error ? 'fail' : currentStatus === 'ready' ? 'pass' : currentStatus === 'blocked' ? 'fail' : 'pending'}
          message={error || (currentStatus === 'ready' ? 'All mockups validated successfully' : 'Some checks failed - review details below')}
          timestamp={formatTimestamp(validationResult?.timestamp)}
        />
      )}

      {/* EXPANDABLE DETAIL CARDS */}
      {validationResult && !error && (
        <>
          {/* Validation Checks */}
          <ExpandableCard
            title="Validation Checks"
            subtitle={`${passedChecks} of ${totalChecks} checks passed`}
            icon={<CheckCircle2 className="h-4 w-4" />}
            status={passedChecks === totalChecks ? 'pass' : 'warn'}
            defaultExpanded={passedChecks < totalChecks}
          >
            <div className="space-y-2">
              {validationResult.checks.map((check, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    {check.status === 'pass' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {check.status === 'fail' && <XCircle className="h-4 w-4 text-red-500" />}
                    {check.status === 'warn' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                    <span className="text-sm">{check.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{check.message}</span>
                </div>
              ))}
            </div>
          </ExpandableCard>
        </>
      )}
    </TabContainer>
  );
}

export default MockupDesignTab;
