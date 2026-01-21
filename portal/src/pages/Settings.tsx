import { useState } from 'react'
import { Save, Database, Bell } from 'lucide-react'
import { isSupabaseConfigured } from '../lib/supabase'

export function Settings() {
  const [supabaseUrl, setSupabaseUrl] = useState(import.meta.env.VITE_SUPABASE_URL || '')
  const [supabaseKey, setSupabaseKey] = useState(import.meta.env.VITE_SUPABASE_ANON_KEY || '')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    // In a real app, this would update .env or a config file
    // For now, just show feedback
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground">Configure your WAVE Portal instance</p>
      </div>

      {/* Database Connection */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">Database Connection</h3>
          {isSupabaseConfigured() ? (
            <span className="ml-auto px-2 py-0.5 text-xs rounded-full bg-success/10 text-green-600">Connected</span>
          ) : (
            <span className="ml-auto px-2 py-0.5 text-xs rounded-full bg-destructive/10 text-destructive">Not Connected</span>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Supabase URL</label>
            <input
              type="url"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://your-project.supabase.co"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Supabase Anon Key</label>
            <input
              type="password"
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Set these values in your <code className="px-1 py-0.5 bg-muted rounded">.env</code> file as VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
          </p>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">Notifications</h3>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm">Wave completion alerts</span>
            <input type="checkbox" defaultChecked className="rounded" />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">Gate transition alerts</span>
            <input type="checkbox" defaultChecked className="rounded" />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">Error notifications</span>
            <input type="checkbox" defaultChecked className="rounded" />
          </label>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
      >
        <Save className="h-4 w-4" />
        {saved ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  )
}
