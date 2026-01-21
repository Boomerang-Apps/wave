import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FolderKanban,
  Waves,
  ScrollText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { cn } from '../lib/utils'

interface Stats {
  projects: number
  waves: number
  stories: number
  completed: number
}

interface Project {
  id: string
  name: string
  root_path: string
  created_at: string
}

interface Wave {
  id: string
  wave_number: number
  status: string
  current_gate: number
}

interface Story {
  id: string
  story_id: string
  title: string
  status: string
  wave_id: string
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats>({ projects: 0, waves: 0, stories: 0, completed: 0 })
  const [recentProjects, setRecentProjects] = useState<Project[]>([])
  const [activeWaves, setActiveWaves] = useState<Wave[]>([])
  const [recentStories, setRecentStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    async function fetchData() {
      try {
        // Fetch projects
        const { data: projects } = await supabase
          .from('maf_projects')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5)

        if (projects) {
          setRecentProjects(projects)
        }

        // Fetch waves
        const { data: waves } = await supabase
          .from('maf_waves')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5)

        if (waves) {
          setActiveWaves(waves)
        }

        // Fetch stories
        const { data: stories } = await supabase
          .from('maf_stories')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5)

        if (stories) {
          setRecentStories(stories)
          const completedStories = stories.filter(s => s.status === 'completed' || s.status === 'done')

          setStats({
            projects: projects?.length || 0,
            waves: waves?.length || 0,
            stories: stories.length,
            completed: completedStories.length,
          })
        }

        // Get total counts
        const { count: projectCount } = await supabase.from('maf_projects').select('*', { count: 'exact', head: true })
        const { count: waveCount } = await supabase.from('maf_waves').select('*', { count: 'exact', head: true })
        const { count: storyCount } = await supabase.from('maf_stories').select('*', { count: 'exact', head: true })

        setStats(prev => ({
          ...prev,
          projects: projectCount || prev.projects,
          waves: waveCount || prev.waves,
          stories: storyCount || prev.stories,
        }))
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maf_projects' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maf_waves' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maf_stories' }, fetchData)
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Supabase Not Configured</h2>
        <p className="text-muted-foreground mb-4 max-w-md">
          Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file to connect to the database.
        </p>
        <Link
          to="/settings"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          Go to Settings
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const statCards = [
    { name: 'Projects', value: stats.projects, icon: FolderKanban, href: '/projects/new', color: 'text-blue-500' },
    { name: 'Waves', value: stats.waves, icon: Waves, href: '/waves', color: 'text-purple-500' },
    { name: 'Stories', value: stats.stories, icon: ScrollText, href: '/stories', color: 'text-orange-500' },
    { name: 'Completed', value: stats.completed, icon: CheckCircle2, href: '/stories', color: 'text-green-500' },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'done':
        return 'bg-green-500/10 text-green-600'
      case 'in_progress':
      case 'active':
        return 'bg-blue-500/10 text-blue-600'
      case 'pending':
        return 'bg-gray-500/10 text-gray-600'
      default:
        return 'bg-gray-500/10 text-gray-600'
    }
  }

  const getGateName = (gate: number) => {
    const gates: Record<number, string> = {
      [-1]: 'Pre-Validation',
      0: 'Story Validation',
      1: 'Environment Setup',
      2: 'Smoke Test',
      3: 'Development',
      4: 'QA/Merge',
      5: 'Deployment',
      6: 'Monitoring',
      7: 'Complete',
    }
    return gates[gate] || `Gate ${gate}`
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Link
            key={stat.name}
            to={stat.href}
            className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary/50 transition-colors"
          >
            <div className={cn('p-3 rounded-lg bg-muted', stat.color)}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.name}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold mb-4">Quick Actions</h3>
        <div className="flex gap-3">
          <Link
            to="/projects/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Link>
          <Link
            to="/waves"
            className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
          >
            <Waves className="h-4 w-4" />
            View Waves
          </Link>
          <Link
            to="/stories"
            className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
          >
            <ScrollText className="h-4 w-4" />
            View Stories
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent Projects</h3>
            <Link to="/projects/new" className="text-sm text-primary hover:underline flex items-center gap-1">
              New Project <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentProjects.length === 0 ? (
              <div className="text-center py-8">
                <FolderKanban className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No projects yet</p>
                <Link
                  to="/projects/new"
                  className="text-sm text-primary hover:underline mt-2 inline-block"
                >
                  Create your first project
                </Link>
              </div>
            ) : (
              recentProjects.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{project.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{project.root_path}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Active Waves */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Active Waves</h3>
            <Link to="/waves" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {activeWaves.length === 0 ? (
              <div className="text-center py-8">
                <Waves className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No active waves</p>
              </div>
            ) : (
              activeWaves.map((wave) => (
                <div
                  key={wave.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">Wave {wave.wave_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {getGateName(wave.current_gate)}
                    </p>
                  </div>
                  <span className={cn('px-2 py-1 text-xs rounded-full', getStatusColor(wave.status))}>
                    {wave.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Stories */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Recent Stories</h3>
          <Link to="/stories" className="text-sm text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="space-y-3">
          {recentStories.length === 0 ? (
            <div className="text-center py-8">
              <ScrollText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No stories yet</p>
            </div>
          ) : (
            recentStories.map((story) => (
              <div
                key={story.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{story.title}</p>
                  <p className="text-xs text-muted-foreground">{story.story_id}</p>
                </div>
                <span className={cn('px-2 py-1 text-xs rounded-full', getStatusColor(story.status))}>
                  {story.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
