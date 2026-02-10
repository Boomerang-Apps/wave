import { useState, useEffect } from 'react'
import {
  Plus,
  FolderTree,
  Settings,
  Play,
  Pause,
  ChevronRight,
  ChevronDown,
  FileText,
  Folder,
  FolderOpen,
  Copy,
  Check,
  Search
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { cn, getStatusBadgeClasses } from '../lib/utils'
import type { Project } from '../types/database'

interface TreeNode {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: TreeNode[]
}

// Mock folder structure for demo
const mockFolderTree: TreeNode = {
  name: 'project-root',
  path: '/Users/demo/project',
  type: 'folder',
  children: [
    {
      name: '.claude',
      path: '/Users/demo/project/.claude',
      type: 'folder',
      children: [
        { name: 'dashboard.html', path: '/Users/demo/project/.claude/dashboard.html', type: 'file' },
        { name: 'locks', path: '/Users/demo/project/.claude/locks', type: 'folder', children: [] },
        { name: 'signals', path: '/Users/demo/project/.claude/signals', type: 'folder', children: [] },
      ]
    },
    {
      name: 'src',
      path: '/Users/demo/project/src',
      type: 'folder',
      children: [
        { name: 'components', path: '/Users/demo/project/src/components', type: 'folder', children: [] },
        { name: 'pages', path: '/Users/demo/project/src/pages', type: 'folder', children: [] },
        { name: 'lib', path: '/Users/demo/project/src/lib', type: 'folder', children: [] },
        { name: 'App.tsx', path: '/Users/demo/project/src/App.tsx', type: 'file' },
        { name: 'main.tsx', path: '/Users/demo/project/src/main.tsx', type: 'file' },
      ]
    },
    {
      name: 'docs',
      path: '/Users/demo/project/docs',
      type: 'folder',
      children: [
        { name: 'AI-PRD.md', path: '/Users/demo/project/docs/AI-PRD.md', type: 'file' },
      ]
    },
    { name: 'package.json', path: '/Users/demo/project/package.json', type: 'file' },
    { name: 'CLAUDE.md', path: '/Users/demo/project/CLAUDE.md', type: 'file' },
    { name: 'README.md', path: '/Users/demo/project/README.md', type: 'file' },
    { name: '.env', path: '/Users/demo/project/.env', type: 'file' },
  ]
}

function TreeItem({ node, level = 0 }: { node: TreeNode; level?: number }) {
  const [isOpen, setIsOpen] = useState(level < 2)
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(node.path)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const hasChildren = node.type === 'folder' && node.children && node.children.length > 0

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 py-1 px-2 rounded hover:bg-muted/50 cursor-pointer transition-colors',
          'text-sm'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => node.type === 'folder' && setIsOpen(!isOpen)}
      >
        {/* Expand/Collapse */}
        {node.type === 'folder' ? (
          hasChildren ? (
            isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : <span className="w-4" />
        ) : <span className="w-4" />}

        {/* Icon */}
        {node.type === 'folder' ? (
          isOpen ? <FolderOpen className="h-4 w-4 text-blue-500" /> : <Folder className="h-4 w-4 text-blue-500" />
        ) : (
          <FileText className="h-4 w-4 text-muted-foreground" />
        )}

        {/* Name */}
        <span className="flex-1 truncate">{node.name}</span>

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-opacity"
          title="Copy path"
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Children */}
      {hasChildren && isOpen && (
        <div>
          {node.children!.map((child, i) => (
            <TreeItem key={`${child.path}-${i}`} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectPath, setNewProjectPath] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // Defer state update to avoid setState in effect body
      Promise.resolve().then(() => setLoading(false))
      return
    }

    async function fetchProjects() {
      const { data } = await supabase
        .from('wave_projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (data) {
        setProjects(data)
        if (data.length > 0 && !selectedProject) {
          setSelectedProject(data[0])
        }
      }
      setLoading(false)
    }

    fetchProjects()
  }, [])

  const handleCreateProject = async () => {
    if (!newProjectName || !newProjectPath) return

    const { data } = await supabase
      .from('wave_projects')
      .insert({
        name: newProjectName,
        path: newProjectPath,
        status: 'active',
      })
      .select()
      .single()

    if (data) {
      setProjects([data, ...projects])
      setSelectedProject(data)
      setShowNewProject(false)
      setNewProjectName('')
      setNewProjectPath('')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Projects List */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Projects</h3>
          <button
            onClick={() => setShowNewProject(true)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* New Project Form */}
        {showNewProject && (
          <div className="mb-4 p-3 bg-muted rounded-lg space-y-3">
            <input
              type="text"
              placeholder="Project Name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background"
            />
            <input
              type="text"
              placeholder="Project Path"
              value={newProjectPath}
              onChange={(e) => setNewProjectPath(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateProject}
                className="flex-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90"
              >
                Create
              </button>
              <button
                onClick={() => setShowNewProject(false)}
                className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Project List */}
        <div className="space-y-2">
          {projects.length === 0 && !loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderTree className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No projects yet</p>
              <button
                onClick={() => setShowNewProject(true)}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Add your first project
              </button>
            </div>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                onClick={() => setSelectedProject(project)}
                className={cn(
                  'p-3 rounded-lg cursor-pointer transition-colors',
                  selectedProject?.id === project.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{project.name}</span>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    getStatusBadgeClasses(project.status)
                  )}>
                    {project.status}
                  </span>
                </div>
                <p className="text-xs opacity-70 truncate mt-1">{project.path}</p>
              </div>
            ))
          )}

          {/* Demo project for when no Supabase */}
          {!isSupabaseConfigured() && (
            <div
              onClick={() => setSelectedProject({
                id: 'demo',
                name: 'Demo Project',
                path: '/Users/demo/project',
                status: 'active',
                description: 'Demo project for testing',
                current_wave: 1,
                config: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })}
              className={cn(
                'p-3 rounded-lg cursor-pointer transition-colors',
                selectedProject?.id === 'demo'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">Demo Project</span>
                <span className={cn('text-xs px-2 py-0.5 rounded-full', getStatusBadgeClasses('active'))}>
                  active
                </span>
              </div>
              <p className="text-xs opacity-70 truncate mt-1">/Users/demo/project</p>
            </div>
          )}
        </div>
      </div>

      {/* Project Details */}
      <div className="lg:col-span-2 space-y-4">
        {selectedProject ? (
          <>
            {/* Project Header */}
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{selectedProject.name}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{selectedProject.path}</p>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
                    <Settings className="h-4 w-4" />
                  </button>
                  {selectedProject.status === 'active' ? (
                    <button className="flex items-center gap-2 px-4 py-2 bg-warning/10 text-warning rounded-lg hover:bg-warning/20 transition-colors">
                      <Pause className="h-4 w-4" />
                      Pause
                    </button>
                  ) : (
                    <button className="flex items-center gap-2 px-4 py-2 bg-success/10 text-success rounded-lg hover:bg-success/20 transition-colors">
                      <Play className="h-4 w-4" />
                      Start
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{selectedProject.current_wave || 0}</p>
                  <p className="text-xs text-muted-foreground">Current Wave</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-xs text-muted-foreground">Stories</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">Gate 0</p>
                  <p className="text-xs text-muted-foreground">Current Gate</p>
                </div>
              </div>
            </div>

            {/* Folder Tree */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <FolderTree className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Project Structure</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search files..."
                      className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-border bg-background w-48"
                    />
                  </div>
                </div>
              </div>
              <div className="p-2 max-h-[500px] overflow-y-auto font-mono text-sm">
                <TreeItem node={mockFolderTree} />
              </div>
            </div>
          </>
        ) : (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <FolderTree className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-semibold mb-2">Select a Project</h3>
            <p className="text-sm text-muted-foreground">
              Choose a project from the list or create a new one
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
