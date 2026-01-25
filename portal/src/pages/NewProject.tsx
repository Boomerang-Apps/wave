import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FolderKanban,
  ArrowRight,
  AlertTriangle
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export function NewProject() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [rootPath, setRootPath] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !rootPath.trim()) {
      setError('Project name and root path are required')
      return
    }

    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured. Please check your .env file.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data, error: insertError } = await supabase
        .from('wave_projects')
        .insert({
          name: name.trim(),
          root_path: rootPath.trim(),
          description: description.trim() || null,
        })
        .select()
        .single()

      if (insertError) {
        setError(insertError.message)
        return
      }

      if (data) {
        // Navigate to the project's checklist
        navigate(`/projects/${data.id}`)
      }
    } catch (err) {
      setError('An error occurred while creating the project')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Supabase Not Configured</h2>
        <p className="text-muted-foreground mb-4 max-w-md">
          Please configure Supabase to create projects.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <FolderKanban className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Create New Project</h1>
        <p className="text-muted-foreground mt-2">
          Set up a new project to run the WAVE Pre-Launch Checklist
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., photo-gallery-v10"
              className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>

          {/* Root Path */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Root Path <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={rootPath}
              onChange={(e) => setRootPath(e.target.value)}
              placeholder="e.g., /Users/username/Projects/my-project"
              className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              The absolute path to your project folder on your local machine
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Description <span className="text-muted-foreground">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your project..."
              rows={3}
              className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Creating...
              </>
            ) : (
              <>
                Create Project
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Info */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg">
        <h3 className="font-medium mb-2">What happens next?</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
          <li>Your project will be created in the database</li>
          <li>You'll be redirected to the Pre-Launch Checklist</li>
          <li>The checklist will validate your project structure</li>
          <li>Complete all checks to get your project ready for WAVE</li>
        </ol>
      </div>
    </div>
  )
}
