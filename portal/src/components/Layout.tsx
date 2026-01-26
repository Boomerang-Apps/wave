import { useState, useEffect, createContext, useContext } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  Waves,
  ScrollText,
  Settings,
  Activity,
  Network,
  Building2,
  Folder,
  ChevronDown,
  Plus,
  Check
} from 'lucide-react'
import { cn } from '../lib/utils'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

interface LayoutProps {
  children: React.ReactNode
  secondarySidebar?: React.ReactNode
}

interface Project {
  id: string
  name: string
  root_path: string
}

// Layout context for sharing state
interface LayoutContextType {
  projects: Project[]
  currentProject: Project | null
  setCurrentProject: (project: Project | null) => void
  supabaseConnected: boolean
}

const LayoutContext = createContext<LayoutContextType | null>(null)

export function useLayout() {
  const context = useContext(LayoutContext)
  if (!context) {
    throw new Error('useLayout must be used within Layout')
  }
  return context
}

// Primary sidebar navigation items
const navItems = [
  { icon: LayoutDashboard, path: '/', label: 'Dashboard' },
  { icon: FolderKanban, path: '/projects', label: 'Projects' },
  { icon: Waves, path: '/waves', label: 'Waves' },
  { icon: ScrollText, path: '/stories', label: 'Stories' },
  { icon: Activity, path: '/activity', label: 'Activity' },
  { icon: Network, path: '/architecture', label: 'Architecture' },
]

// Workspace dropdown component
function WorkspaceDropdown() {
  const [open, setOpen] = useState(false)
  const workspaces = [{ id: '1', name: 'Default Workspace' }]
  const current = workspaces[0]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1e1e1e] border border-[#2e2e2e] hover:border-[#3e3e3e] text-sm text-[#a3a3a3] hover:text-[#fafafa] transition-colors"
      >
        <Building2 className="h-3.5 w-3.5 text-[#666]" />
        <span className="max-w-[120px] truncate">{current.name}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-[#666] transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg shadow-xl z-50 py-1">
          <div className="px-3 py-1.5 text-xs text-[#666] uppercase tracking-wider">Workspace</div>
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => setOpen(false)}
              className="w-full px-3 py-2 flex items-center gap-2 text-left text-sm text-[#a3a3a3] hover:bg-[#252525] hover:text-[#fafafa] transition-colors"
            >
              <Building2 className="h-3.5 w-3.5 text-[#666]" />
              <span className="flex-1 truncate">{ws.name}</span>
              {ws.id === current.id && <Check className="h-3.5 w-3.5 text-[#5a9a5a]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Project dropdown component
function ProjectDropdown({ projects, currentProject, onSelect, onNew }: {
  projects: Project[]
  currentProject: Project | null
  onSelect: (project: Project) => void
  onNew: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1e1e1e] border border-[#2e2e2e] hover:border-[#3e3e3e] text-sm text-[#a3a3a3] hover:text-[#fafafa] transition-colors"
      >
        <Folder className="h-3.5 w-3.5 text-[#666]" />
        <span className="max-w-[120px] truncate">{currentProject?.name || 'Select Project'}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-[#666] transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg shadow-xl z-50 py-1">
          <div className="px-3 py-1.5 text-xs text-[#666] uppercase tracking-wider">Project</div>
          <div className="max-h-60 overflow-y-auto">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => {
                  onSelect(project)
                  setOpen(false)
                }}
                className="w-full px-3 py-2 flex items-center gap-2 text-left text-sm text-[#a3a3a3] hover:bg-[#252525] hover:text-[#fafafa] transition-colors"
              >
                <Folder className="h-3.5 w-3.5 text-[#666]" />
                <span className="flex-1 truncate">{project.name}</span>
                {currentProject?.id === project.id && <Check className="h-3.5 w-3.5 text-[#5a9a5a]" />}
              </button>
            ))}
          </div>
          <div className="border-t border-[#2e2e2e] my-1" />
          <button
            onClick={() => {
              onNew()
              setOpen(false)
            }}
            className="w-full px-3 py-2 flex items-center gap-2 text-left text-sm text-[#a3a3a3] hover:bg-[#252525] hover:text-[#fafafa] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Project</span>
          </button>
        </div>
      )}
    </div>
  )
}

export function Layout({ children, secondarySidebar }: LayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [supabaseConnected, setSupabaseConnected] = useState(false)

  useEffect(() => {
    async function fetchProjects() {
      if (!isSupabaseConfigured()) {
        setSupabaseConnected(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('wave_projects')
          .select('id, name, root_path')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Supabase error:', error)
          setSupabaseConnected(false)
          return
        }

        if (data) {
          setProjects(data)
          setSupabaseConnected(true)

          // Set current project from URL if on project page
          const match = location.pathname.match(/\/projects\/([^/]+)/)
          if (match) {
            const projectId = match[1]
            const project = data.find(p => p.id === projectId)
            if (project) setCurrentProject(project)
          }
        }
      } catch (err) {
        console.error('Fetch projects error:', err)
        setSupabaseConnected(false)
      }
    }

    fetchProjects()

    const subscription = supabase
      .channel('projects-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wave_projects' }, () => {
        fetchProjects()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [location.pathname])

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const handleProjectSelect = (project: Project) => {
    setCurrentProject(project)
    navigate(`/projects/${project.id}`)
  }

  const hasSecondarySidebar = !!secondarySidebar
  const mainLeftOffset = hasSecondarySidebar ? 'pl-[310px]' : 'pl-[50px]'
  const topLeftOffset = hasSecondarySidebar ? 'left-[310px]' : 'left-[50px]'

  return (
    <LayoutContext.Provider value={{ projects, currentProject, setCurrentProject, supabaseConnected }}>
      <div className="min-h-screen bg-[#1e1e1e]">
        {/* Primary Sidebar - Icons only (50px) */}
        <aside className="fixed inset-y-0 left-0 z-50 w-[50px] bg-[#1e1e1e] border-r border-[#2e2e2e] flex flex-col">
          {/* Logo */}
          <div className="h-14 flex items-center justify-center border-b border-[#2e2e2e]">
            <div className="w-8 h-8 rounded-lg bg-[#2e2e2e] flex items-center justify-center">
              <span className="text-[#fafafa] font-bold text-sm">W</span>
            </div>
          </div>

          {/* Navigation Icons */}
          <nav className="flex-1 flex flex-col items-center py-3 gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                    active
                      ? "bg-[#2e2e2e] text-[#fafafa]"
                      : "text-[#666] hover:text-[#a3a3a3] hover:bg-[#2e2e2e]"
                  )}
                  title={item.label}
                >
                  <Icon className="h-4 w-4" />
                </Link>
              )
            })}
          </nav>

          {/* Bottom - Settings & Status */}
          <div className="pb-3 flex flex-col items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              supabaseConnected ? "bg-[#5a9a5a]" : "bg-[#d97706]"
            )} title={supabaseConnected ? "Connected" : "Not Connected"} />
            <Link
              to="/settings"
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                location.pathname === '/settings'
                  ? "bg-[#2e2e2e] text-[#fafafa]"
                  : "text-[#666] hover:text-[#a3a3a3] hover:bg-[#2e2e2e]"
              )}
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </aside>

        {/* Secondary Sidebar - Step Navigation (200px) - Optional */}
        {secondarySidebar}

        {/* Top Navigation Bar */}
        <header className={cn(
          "fixed top-0 right-0 z-30 h-14 bg-[#1e1e1e] border-b border-[#2e2e2e] flex items-center px-4 gap-3",
          topLeftOffset
        )}>
          <WorkspaceDropdown />
          <span className="text-[#2e2e2e]">/</span>
          <ProjectDropdown
            projects={projects}
            currentProject={currentProject}
            onSelect={handleProjectSelect}
            onNew={() => navigate('/projects/new')}
          />
          <div className="flex-1" />
        </header>

        {/* Main Content */}
        <main className={cn(mainLeftOffset, "pt-14")}>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </LayoutContext.Provider>
  )
}
