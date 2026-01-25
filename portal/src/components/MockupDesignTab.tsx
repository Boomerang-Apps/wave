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

import { useState, useCallback, useEffect } from 'react';
import {
  FolderOpen, FileText, Layout, CheckCircle2, AlertTriangle,
  Building2, Users, BookOpen, ExternalLink, Play, RefreshCw,
  Loader2, Sparkles, Folder, ChevronRight, Home, X, ArrowLeft,
  Palette, Target, LayoutGrid, List
} from 'lucide-react';
import { InfoBox, KPICards, ActionBar, ExpandableCard, TabContainer } from './TabLayout';
import { BestPracticesSection } from './BestPracticesSection';
import { FileListView } from './FileListView';
import { cn } from '@/lib/utils';

// ============================================
// Folder Browser Dialog
// ============================================

interface FolderItem {
  name: string;
  path: string;
  isProject: boolean;
}

interface FolderBrowserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
}

function FolderBrowserDialog({ isOpen, onClose, onSelect }: FolderBrowserDialogProps) {
  const [currentPath, setCurrentPath] = useState('');
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Browse a directory
  const browsePath = useCallback(async (path: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/browse-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: path || undefined })
      });

      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders || []);
        setCurrentPath(data.currentPath || '');
        setParentPath(data.parentPath || null);
      } else {
        setError('Failed to browse folder');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load initial path when dialog opens
  useEffect(() => {
    if (isOpen) {
      browsePath('');
    }
  }, [isOpen, browsePath]);

  // Handle folder click - navigate into it
  const handleFolderClick = (folder: FolderItem) => {
    browsePath(folder.path);
  };

  // Handle folder selection (double-click or select button)
  const handleSelect = () => {
    if (currentPath) {
      onSelect(currentPath);
      onClose();
    }
  };

  // Go to parent directory
  const handleGoUp = () => {
    if (parentPath) {
      browsePath(parentPath);
    }
  };

  // Go to home directory
  const handleGoHome = () => {
    browsePath('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-card border border-border rounded-2xl w-full max-w-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-blue-500" />
            Select Project Folder
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Bar */}
        <div className="flex items-center gap-2 p-3 border-b border-border bg-muted/30">
          <button
            onClick={handleGoUp}
            disabled={!parentPath}
            className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Go up"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleGoHome}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            title="Home"
          >
            <Home className="h-4 w-4" />
          </button>
          <div className="flex-1 px-3 py-1.5 bg-muted rounded-lg">
            <code className="text-xs font-mono text-muted-foreground truncate block">
              {currentPath || '~'}
            </code>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          ) : folders.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No subfolders found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {folders.map((folder) => (
                <button
                  key={folder.path}
                  onClick={() => handleFolderClick(folder)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left group"
                >
                  <Folder className={cn(
                    "h-5 w-5",
                    folder.isProject ? "text-blue-500" : "text-muted-foreground"
                  )} />
                  <span className="flex-1 text-sm font-medium truncate">
                    {folder.name}
                  </span>
                  {folder.isProject && (
                    <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full">
                      Project
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground">
            Navigate to your project folder and click Select
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSelect}
              disabled={!currentPath}
              className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Select This Folder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  structureValidation
}: {
  project: ProjectData;
  projectPath: string;
  onRefresh: () => void;
  onChangePath: () => void;
  isRefreshing: boolean;
  structureValidation: StructureValidation | null;
}) {
  const [previewMockup, setPreviewMockup] = useState<MockupFile | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const handleOpenDoc = (doc: DocumentFile) => {
    window.open(`vscode://file${doc.path}`, '_blank');
  };

  const getDocIcon = (type: string) => {
    switch (type) {
      case 'prd': return <FileText className="h-4 w-4" />;
      case 'architecture': return <Building2 className="h-4 w-4" />;
      case 'userStories': return <Users className="h-4 w-4" />;
      case 'readme': return <BookOpen className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getDocColor = (type: string) => {
    switch (type) {
      case 'prd': return 'text-blue-500 bg-blue-500/10';
      case 'architecture': return 'text-purple-500 bg-purple-500/10';
      case 'userStories': return 'text-green-500 bg-green-500/10';
      case 'readme': return 'text-amber-500 bg-amber-500/10';
      default: return 'text-slate-500 bg-slate-500/10';
    }
  };

  // Determine status based on docs and mockups presence
  const hasAllRequired = project.documentation.length > 0 && project.mockups.length > 0;

  return (
    <>
      {/* 1. INFO BOX */}
      <InfoBox
        title="Step 0: Design Foundation"
        description={`${project.name} - ${project.tagline || 'Project connected and ready for validation'}. Review your documentation and design mockups before proceeding.`}
        icon={<Palette className="h-4 w-4 text-blue-500" />}
      />

      {/* 2. KPI CARDS */}
      <KPICards
        items={[
          {
            label: 'Documents',
            value: project.documentation.length,
            status: project.documentation.length > 0 ? 'success' : 'warning',
            icon: <FileText className="h-4 w-4" />
          },
          {
            label: 'Mockups',
            value: project.mockups.length,
            status: project.mockups.length > 0 ? 'success' : 'warning',
            icon: <Layout className="h-4 w-4" />
          },
          {
            label: 'Technologies',
            value: project.techStack.length,
            status: 'neutral',
            icon: <Target className="h-4 w-4" />
          },
          {
            label: 'Status',
            value: hasAllRequired ? 'Ready' : 'Missing',
            status: hasAllRequired ? 'success' : 'warning',
            icon: <CheckCircle2 className="h-4 w-4" />
          },
        ]}
      />

      {/* 3. ACTION BAR */}
      <ActionBar
        category="DESIGN"
        title={project.name}
        description={projectPath}
        statusBadge={{
          label: project.connection.status === 'connected' ? 'Connected' : 'Disconnected',
          icon: <FolderOpen className="h-3 w-3" />,
          variant: project.connection.status === 'connected' ? 'success' : 'warning'
        }}
        primaryAction={{
          label: 'Refresh',
          onClick: onRefresh,
          loading: isRefreshing,
          icon: <RefreshCw className="h-4 w-4" />
        }}
        secondaryAction={{
          label: 'Change Folder',
          onClick: onChangePath,
          icon: <FolderOpen className="h-4 w-4" />
        }}
      />

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

      {/* Best Practices Section */}
      {structureValidation && (
        <div className="mb-6">
          <BestPracticesSection
            deviations={structureValidation.deviations}
            reorganizationPlan={structureValidation.reorganizationPlan}
            complianceScore={structureValidation.complianceScore}
          />
        </div>
      )}

      {/* View Toggle */}
      <div className="flex items-center justify-end gap-1 mb-4">
        <span className="text-xs text-muted-foreground mr-2">View:</span>
        <button
          onClick={() => setViewMode('list')}
          className={cn(
            "p-2 rounded-lg transition-colors",
            viewMode === 'list'
              ? "bg-blue-500/10 text-blue-500"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
          aria-label="List view"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          onClick={() => setViewMode('grid')}
          className={cn(
            "p-2 rounded-lg transition-colors",
            viewMode === 'grid'
              ? "bg-blue-500/10 text-blue-500"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
          aria-label="Grid view"
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
      </div>

      {/* 4. EXPANDABLE CARDS */}

      {/* Documentation */}
      <ExpandableCard
        title="Documentation"
        subtitle={`${project.documentation.length} files discovered`}
        icon={<FileText className="h-4 w-4" />}
        status={project.documentation.length > 0 ? 'pass' : 'warn'}
        defaultExpanded={true}
        badge={`${project.documentation.length} files`}
      >
        {project.documentation.length > 0 ? (
          viewMode === 'list' ? (
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {project.documentation.map((doc, i) => (
                <button
                  key={i}
                  onClick={() => handleOpenDoc(doc)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left group"
                >
                  <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", getDocColor(doc.type))}>
                    {getDocIcon(doc.type)}
                  </span>
                  <span className="flex-1 text-sm font-medium truncate">{doc.title}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              ))}
            </div>
          )
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
        defaultExpanded={true}
        badge={`${project.mockups.length} screens`}
      >
        {project.mockups.length > 0 ? (
          viewMode === 'list' ? (
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {project.mockups.map((mockup, i) => (
                <button
                  key={i}
                  onClick={() => setPreviewMockup(mockup)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left group"
                >
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-500/10 text-purple-500 shrink-0">
                    <Layout className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-sm font-medium truncate">{mockup.name}</span>
                  <Play className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              ))}
            </div>
          )
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
    </>
  );
}

// ============================================
// Main Component
// ============================================

export function MockupDesignTab({
  projectPath,
  projectId,
  validationStatus: _initialStatus,
  onValidationComplete: _onValidationComplete
}: MockupDesignTabProps) {
  const [state, setState] = useState<'not-connected' | 'discovering' | 'connected'>(
    projectPath ? 'discovering' : 'not-connected'
  );
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [currentPath, setCurrentPath] = useState(projectPath);
  const [isUpdating, setIsUpdating] = useState(false);
  const [structureValidation, setStructureValidation] = useState<StructureValidation | null>(null);

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
        />
      )}
    </TabContainer>
  );
}

export default MockupDesignTab;
