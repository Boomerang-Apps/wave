import { useEffect, useState } from 'react'
import {
  Play,
  Pause,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  RefreshCw
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { cn, getGateName, formatRelativeTime, getStatusBadgeClasses } from '../lib/utils'
import type { Story } from '../types/database'

interface WaveData {
  number: number
  stories: Story[]
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  currentGate: number
}

const GATES = [-1, 0, 1, 2, 3, 4, 4.5, 5, 6, 7]

function GateProgress({ currentGate }: { currentGate: number }) {
  return (
    <div className="flex items-center gap-1">
      {GATES.map((gate, i) => (
        <div key={gate} className="flex items-center">
          <div
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
              gate < currentGate
                ? 'bg-green-500 text-white'
                : gate === currentGate
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {gate === 4.5 ? '4½' : gate}
          </div>
          {i < GATES.length - 1 && (
            <div
              className={cn(
                'w-4 h-0.5',
                gate < currentGate ? 'bg-green-500' : 'bg-muted'
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export function Waves() {
  const [waves, setWaves] = useState<WaveData[]>([])
  const [selectedWave, setSelectedWave] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchWaves = async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    try {
      const { data: stories } = await supabase
        .from('wave_stories')
        .select('*')
        .order('wave_number', { ascending: true })

      if (stories) {
        // Group by wave
        const waveMap = new Map<number, Story[]>()
        stories.forEach(story => {
          const existing = waveMap.get(story.wave_number) || []
          waveMap.set(story.wave_number, [...existing, story])
        })

        const waveData: WaveData[] = Array.from(waveMap.entries()).map(([number, stories]) => {
          const maxGate = Math.max(...stories.map(s => s.gate))
          const allCompleted = stories.every(s => s.status === 'completed' || s.status === 'done')
          const anyInProgress = stories.some(s => s.status === 'in_progress' || s.status === 'active')
          const anyFailed = stories.some(s => s.status === 'failed' || s.status === 'rejected')

          return {
            number,
            stories,
            currentGate: maxGate,
            status: allCompleted ? 'completed' : anyFailed ? 'failed' : anyInProgress ? 'in_progress' : 'pending',
          }
        })

        setWaves(waveData.sort((a, b) => b.number - a.number))
        if (waveData.length > 0 && selectedWave === null) {
          setSelectedWave(waveData[0].number)
        }
      }
    } catch (error) {
      console.error('Error fetching waves:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchWaves()

    // Real-time subscription
    if (isSupabaseConfigured()) {
      const subscription = supabase
        .channel('waves-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'wave_stories' }, () => {
          fetchWaves()
        })
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchWaves()
  }

  const selectedWaveData = waves.find(w => w.number === selectedWave)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  // Demo data when no Supabase
  if (!isSupabaseConfigured() || waves.length === 0) {
    const demoWaves: WaveData[] = [
      {
        number: 4,
        stories: [],
        status: 'in_progress',
        currentGate: 2,
      },
      {
        number: 3,
        stories: [],
        status: 'completed',
        currentGate: 7,
      },
      {
        number: 2,
        stories: [],
        status: 'completed',
        currentGate: 7,
      },
      {
        number: 1,
        stories: [],
        status: 'completed',
        currentGate: 7,
      },
    ]

    if (waves.length === 0) {
      setWaves(demoWaves)
      setSelectedWave(4)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Waves List */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Waves</h3>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          </button>
        </div>

        <div className="space-y-2">
          {waves.map((wave) => (
            <div
              key={wave.number}
              onClick={() => setSelectedWave(wave.number)}
              className={cn(
                'p-3 rounded-lg cursor-pointer transition-colors',
                selectedWave === wave.number
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(wave.status)}
                  <span className="font-medium">Wave {wave.number}</span>
                </div>
                <ChevronRight className="h-4 w-4 opacity-50" />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                <span>{wave.stories.length} stories</span>
                <span>{getGateName(wave.currentGate)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Wave Details */}
      <div className="lg:col-span-2 space-y-4">
        {selectedWaveData ? (
          <>
            {/* Wave Header */}
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    {getStatusIcon(selectedWaveData.status)}
                    <h2 className="text-xl font-semibold">Wave {selectedWaveData.number}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Currently at {getGateName(selectedWaveData.currentGate)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {selectedWaveData.status === 'in_progress' ? (
                    <button className="flex items-center gap-2 px-4 py-2 bg-warning/10 text-warning rounded-lg hover:bg-warning/20 transition-colors">
                      <Pause className="h-4 w-4" />
                      Pause
                    </button>
                  ) : selectedWaveData.status === 'pending' ? (
                    <button className="flex items-center gap-2 px-4 py-2 bg-success/10 text-success rounded-lg hover:bg-success/20 transition-colors">
                      <Play className="h-4 w-4" />
                      Start Wave
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Gate Progress */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Gate Progress</p>
                <GateProgress currentGate={selectedWaveData.currentGate} />
              </div>
            </div>

            {/* Stories */}
            <div className="bg-card rounded-xl border border-border">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="font-medium">Stories ({selectedWaveData.stories.length})</h3>
              </div>
              <div className="divide-y divide-border">
                {selectedWaveData.stories.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <p>No stories in this wave yet.</p>
                    <p className="text-sm mt-1">Stories will appear here once created.</p>
                  </div>
                ) : (
                  selectedWaveData.stories.map((story) => (
                    <div key={story.id} className="p-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{story.story_id}</span>
                          <span className={cn(
                            'px-2 py-0.5 text-xs rounded-full',
                            getStatusBadgeClasses(story.status)
                          )}>
                            {story.status}
                          </span>
                        </div>
                        <p className="font-medium mt-1">{story.title}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{getGateName(story.gate)}</span>
                          {story.agent_type && <span>Agent: {story.agent_type}</span>}
                          <span>{formatRelativeTime(story.updated_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-semibold mb-2">Select a Wave</h3>
            <p className="text-sm text-muted-foreground">
              Choose a wave from the list to view details
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
