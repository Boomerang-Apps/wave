import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { formatRelativeTime, getGateName } from '../lib/utils'
import type { AuditLog } from '../types/database'
import { Activity as ActivityIcon, RefreshCw } from 'lucide-react'

export function Activity() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('wave_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (data) {
      setLogs(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchLogs()

    if (isSupabaseConfigured()) {
      const subscription = supabase
        .channel('audit-log')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wave_audit_log' }, () => {
          fetchLogs()
        })
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Activity Log</h2>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border divide-y divide-border">
        {logs.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <ActivityIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No activity yet</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="p-4 flex items-start gap-4">
              <div className="p-2 rounded-lg bg-muted">
                <ActivityIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{log.action}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                  {log.agent && (
                    <span className="px-2 py-0.5 bg-muted rounded">{log.agent}</span>
                  )}
                  {log.wave_number && (
                    <span>Wave {log.wave_number}</span>
                  )}
                  {log.gate !== null && (
                    <span>{getGateName(log.gate)}</span>
                  )}
                </div>
                {log.details && (
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </div>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {formatRelativeTime(log.created_at)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
