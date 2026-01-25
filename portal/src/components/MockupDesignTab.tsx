/**
 * MockupDesignTab Component (Gate 0)
 *
 * Clean project connection and discovery flow:
 * 1. Not Connected - Single "Select Folder" action
 * 2. Discovering - Auto-detect docs, mockups, structure
 * 3. Connected - Show discovered project info
 */

import { useState, useCallback, useEffect } from 'react';
import {
  FolderOpen, FileText, Layout, CheckCircle2, AlertTriangle,
  Building2, Users, BookOpen, ExternalLink, Play, RefreshCw,
  Loader2, Sparkles
} from 'lucide-react';
import { TabContainer } from './TabLayout';
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

export interface MockupDesignTabProps {
  projectPath: string;
  projectId: string;
  validationStatus: 'idle' | 'validating' | 'ready' | 'blocked';
  onValidationComplete: (status: 'ready' | 'blocked') => void;
}

// ============================================
// Sub-components
// ============================================

// Not Connected State - Clean folder selection
function NotConnectedState({
  onSelectFolder,
  isUpdating
}: {
  onSelectFolder: (path: string) => void;
  isUpdating: boolean;
}) {
  const [inputPath, setInputPath] = useState('');

  const handleConnect = () => {
    if (inputPath.trim()) {
      onSelectFolder(inputPath.trim());
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
            Enter your project's root folder path. WAVE will automatically discover
            documentation, design mockups, and project structure.
          </p>

          {/* Input */}
          <div className="space-y-3">
            <input
              type="text"
              value={inputPath}
              onChange={(e) => setInputPath(e.target.value)}
              placeholder="/path/to/your/project"
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
            />

            <button
              onClick={handleConnect}
              disabled={!inputPath.trim() || isUpdating}
              className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Connect & Discover
                </>
              )}
            </button>
          </div>

          {/* Help text */}
          <p className="text-xs text-muted-foreground mt-4">
            Example: /Users/you/Projects/my-app
          </p>
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

// Connected State - Show discovered project
function ConnectedState({
  project,
  projectPath,
  onRefresh,
  onChangePath,
  isRefreshing
}: {
  project: ProjectData;
  projectPath: string;
  onRefresh: () => void;
  onChangePath: () => void;
  isRefreshing: boolean;
}) {
  const handleOpenDoc = (doc: DocumentFile) => {
    window.open(`vscode://file${doc.path}`, '_blank');
  };

  const handleOpenMockup = (mockup: MockupFile) => {
    window.open(`file://${mockup.path}`, '_blank');
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

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{project.name}</h1>
              {project.tagline && (
                <p className="text-muted-foreground text-sm">{project.tagline}</p>
              )}
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
              className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 hover:bg-muted rounded-lg transition-colors"
            >
              Change Folder
            </button>
          </div>
        </div>

        {/* Path display */}
        <div className="mt-4 flex items-center gap-2 text-sm">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-muted-foreground">
            {projectPath}
          </code>
        </div>

        {/* Tech Stack */}
        {project.techStack.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {project.techStack.map((tech, i) => (
              <span key={i} className="px-2.5 py-1 bg-muted text-muted-foreground rounded-lg text-xs font-medium">
                {tech}
              </span>
            ))}
          </div>
        )}

        {/* Vision */}
        {project.vision && (
          <div className="mt-4 p-4 bg-blue-500/5 border border-blue-500/10 rounded-lg">
            <p className="text-sm text-blue-400 italic">"{project.vision}"</p>
          </div>
        )}
      </div>

      {/* Documentation & Mockups Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documentation */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              Documentation
            </h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              {project.documentation.length} files
            </span>
          </div>

          {project.documentation.length > 0 ? (
            <div className="space-y-2">
              {project.documentation.slice(0, 6).map((doc, i) => (
                <button
                  key={i}
                  onClick={() => handleOpenDoc(doc)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left group"
                >
                  <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center", getDocColor(doc.type))}>
                    {getDocIcon(doc.type)}
                  </span>
                  <span className="flex-1 text-sm font-medium truncate">{doc.title}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
              {project.documentation.length > 6 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  +{project.documentation.length - 6} more files
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No documentation found</p>
              <p className="text-xs text-muted-foreground mt-1">Add .md files to docs/ folder</p>
            </div>
          )}
        </div>

        {/* Mockups */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Layout className="h-4 w-4 text-purple-500" />
              Design Mockups
            </h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              {project.mockups.length} screens
            </span>
          </div>

          {project.mockups.length > 0 ? (
            <div className="space-y-2">
              {project.mockups.slice(0, 6).map((mockup, i) => (
                <button
                  key={i}
                  onClick={() => handleOpenMockup(mockup)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left group"
                >
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-500/10 text-purple-500">
                    <Layout className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-sm font-medium truncate">{mockup.name}</span>
                  <Play className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
              {project.mockups.length > 6 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  +{project.mockups.length - 6} more screens
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No mockups found</p>
              <p className="text-xs text-muted-foreground mt-1">Add HTML files to design_mockups/ folder</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">{project.documentation.length}</p>
          <p className="text-xs text-muted-foreground">Documents</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">{project.mockups.length}</p>
          <p className="text-xs text-muted-foreground">Mockups</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">{project.techStack.length}</p>
          <p className="text-xs text-muted-foreground">Technologies</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-500">Ready</p>
          <p className="text-xs text-muted-foreground">Status</p>
        </div>
      </div>
    </div>
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

  // Discover project when path is set
  const discoverProject = useCallback(async (path: string) => {
    if (!path) {
      setState('not-connected');
      return;
    }

    setState('discovering');

    try {
      const response = await fetch('/api/discover-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath: path })
      });

      if (response.ok) {
        const { data } = await response.json();
        setProjectData(data);

        if (data.connection?.status === 'connected') {
          setState('connected');
        } else {
          setState('not-connected');
        }
      } else {
        setState('not-connected');
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
        />
      )}
    </TabContainer>
  );
}

export default MockupDesignTab;
