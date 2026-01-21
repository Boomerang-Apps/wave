import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  Waves,
  ScrollText,
  Settings,
  Activity,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Plus,
  Folder,
  Network
} from 'lucide-react'
import { cn } from '../lib/utils'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

interface LayoutProps {
  children: React.ReactNode
}

interface Project {
  id: string
  name: string
  root_path: string
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const [projectsExpanded, setProjectsExpanded] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [supabaseConnected, setSupabaseConnected] = useState(false)

  useEffect(() => {
    async function fetchProjects() {
      if (!isSupabaseConfigured()) {
        setSupabaseConnected(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('maf_projects')
          .select('id, name, root_path')
          .order('created_at', { ascending: false })

        if (!error && data) {
          setProjects(data)
          setSupabaseConnected(true)
        }
      } catch {
        setSupabaseConnected(false)
      }
    }

    fetchProjects()

    // Subscribe to project changes
    const subscription = supabase
      .channel('projects-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maf_projects' }, () => {
        fetchProjects()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const isProjectActive = (projectId: string) => {
    return location.pathname === `/projects/${projectId}`
  }

  const isProjectsSection = location.pathname.startsWith('/projects')

  const getPageTitle = () => {
    if (location.pathname === '/') return 'Dashboard'
    if (location.pathname === '/projects') return 'Projects'
    if (location.pathname.startsWith('/projects/new')) return 'New Project'
    if (location.pathname.startsWith('/projects/')) {
      const projectId = location.pathname.split('/')[2]
      const project = projects.find(p => p.id === projectId)
      return project?.name || 'Project'
    }
    if (location.pathname === '/waves') return 'Waves'
    if (location.pathname === '/stories') return 'Stories'
    if (location.pathname === '/activity') return 'Activity'
    if (location.pathname === '/settings') return 'Settings'
    if (location.pathname === '/architecture') return 'Architecture'
    return 'WAVE'
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 px-6 border-b border-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            W
          </div>
          <div>
            <h1 className="font-semibold text-foreground">WAVE Portal</h1>
            <p className="text-xs text-muted-foreground">Control Center</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 p-4">
          {/* Dashboard */}
          <Link
            to="/"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              location.pathname === '/'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>

          {/* Projects - Expandable */}
          <div>
            <button
              onClick={() => setProjectsExpanded(!projectsExpanded)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full',
                isProjectsSection
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <FolderKanban className="h-4 w-4" />
              <span className="flex-1 text-left">Projects</span>
              {projectsExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>

            {projectsExpanded && (
              <div className="ml-4 mt-1 space-y-1">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                      isProjectActive(project.id)
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Folder className="h-3.5 w-3.5" />
                    <span className="truncate">{project.name}</span>
                  </Link>
                ))}

                {/* New Project Button */}
                <Link
                  to="/projects/new"
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                    location.pathname === '/projects/new'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Project</span>
                </Link>
              </div>
            )}
          </div>

          {/* Waves */}
          <Link
            to="/waves"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              location.pathname === '/waves'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Waves className="h-4 w-4" />
            Waves
          </Link>

          {/* Stories */}
          <Link
            to="/stories"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              location.pathname === '/stories'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <ScrollText className="h-4 w-4" />
            Stories
          </Link>

          {/* Activity */}
          <Link
            to="/activity"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              location.pathname === '/activity'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Activity className="h-4 w-4" />
            Activity
          </Link>

          {/* Architecture */}
          <Link
            to="/architecture"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              location.pathname === '/architecture'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Network className="h-4 w-4" />
            Architecture
          </Link>
        </nav>

        {/* Status Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn(
              'flex h-2 w-2 rounded-full',
              supabaseConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            )} />
            <span>{supabaseConnected ? 'Connected to Supabase' : 'Not Connected'}</span>
          </div>
          <Link
            to="/settings"
            className="flex items-center gap-2 mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pl-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-foreground">
              {getPageTitle()}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted transition-colors">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <span>3 Alerts</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
