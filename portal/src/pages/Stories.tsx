import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { cn, getGateName, formatRelativeTime, getStatusColor } from '../lib/utils'
import type { Story } from '../types/database'
import { Search } from 'lucide-react'

export function Stories() {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    async function fetchStories() {
      const { data } = await supabase
        .from('wave_stories')
        .select('*')
        .order('wave_number', { ascending: false })
        .order('created_at', { ascending: false })

      if (data) {
        setStories(data)
      }
      setLoading(false)
    }

    fetchStories()

    const subscription = supabase
      .channel('stories-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wave_stories' }, () => {
        fetchStories()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const filteredStories = stories.filter(story => {
    if (filter !== 'all' && story.status !== filter) return false
    if (search && !story.title.toLowerCase().includes(search.toLowerCase()) &&
        !story.story_id.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const statusCounts = {
    all: stories.length,
    pending: stories.filter(s => s.status === 'pending').length,
    in_progress: stories.filter(s => s.status === 'in_progress' || s.status === 'active').length,
    completed: stories.filter(s => s.status === 'completed' || s.status === 'done').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg transition-colors',
                filter === status
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              )}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ')} ({count})
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search stories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-background w-64"
          />
        </div>
      </div>

      {/* Stories Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Story</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Wave</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Gate</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Agent</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredStories.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  {stories.length === 0 ? 'No stories found' : 'No stories match your filter'}
                </td>
              </tr>
            ) : (
              filteredStories.map((story) => (
                <tr key={story.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{story.title}</p>
                      <p className="text-xs text-muted-foreground font-mono">{story.story_id}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-muted rounded text-sm">Wave {story.wave_number}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">{getGateName(story.gate)}</td>
                  <td className="px-4 py-3 text-sm">{story.agent_type || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-1 text-xs rounded-full', getStatusColor(story.status))}>
                      {story.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatRelativeTime(story.updated_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
