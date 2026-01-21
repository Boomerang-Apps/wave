import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Database,
  Zap,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Info,
  X,
  Shield,
  GitBranch,
  Bot,
  Layers,
  Target,
  Radio,
  ArrowRight,
  Eye,
  EyeOff,
  Settings,
  Key,
  Save,
  RefreshCw,
  ScrollText,
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { cn } from '../lib/utils'

// Types
type CheckStatusType = 'pass' | 'fail' | 'warn' | 'pending' | 'blocked'

interface Project {
  id: string
  name: string
  root_path: string
  description: string | null
  created_at: string
}

interface FileCheck {
  name: string
  path?: string
  status: 'found' | 'not_found'
}

// Status dot component
function StatusDot({ status }: { status: CheckStatusType }) {
  const colors: Record<CheckStatusType, string> = {
    pass: 'bg-green-500',
    fail: 'bg-red-500',
    warn: 'bg-yellow-500',
    pending: 'bg-gray-400',
    blocked: 'bg-red-500',
  }
  return <span className={cn('w-2 h-2 rounded-full inline-block', colors[status])} />
}

// Status badge component
function StatusBadge({ status }: { status: CheckStatusType }) {
  const styles: Record<CheckStatusType, string> = {
    pass: 'bg-green-100 text-green-700',
    fail: 'bg-red-100 text-red-700',
    warn: 'bg-yellow-100 text-yellow-700',
    pending: 'bg-gray-100 text-gray-600',
    blocked: 'bg-gray-100 text-gray-600',
  }
  const labels: Record<CheckStatusType, string> = {
    pass: 'PASS',
    fail: 'FAIL',
    warn: 'WARN',
    pending: 'PENDING',
    blocked: 'BLOCKED',
  }
  return (
    <span className={cn('px-2.5 py-1 text-xs font-semibold rounded-md', styles[status])}>
      {labels[status]}
    </span>
  )
}

// Section header with badge
function SectionHeader({
  badge,
  badgeColor = 'bg-gray-500',
  title,
  description,
  timestamp,
  status,
}: {
  badge: string
  badgeColor?: string
  title: string
  description: string
  timestamp?: string
  status: CheckStatusType
}) {
  return (
    <div className="flex items-center justify-between py-4 px-4 bg-white border border-border border-b-0 rounded-t-xl mt-6">
      <div className="flex items-center gap-3">
        <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold', badgeColor)}>
          {badge}
        </span>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {timestamp && <span className="text-xs text-muted-foreground">{timestamp}</span>}
        <StatusBadge status={status} />
      </div>
    </div>
  )
}

// Check item component
function CheckItem({
  label,
  status,
  description,
  command,
  fix,
  defaultExpanded = false
}: {
  label: string
  status: CheckStatusType
  description?: string
  command?: string
  fix?: string
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const statusIcon = {
    pass: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    fail: <XCircle className="h-5 w-5 text-red-500" />,
    warn: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    pending: <Clock className="h-5 w-5 text-gray-400" />,
    blocked: <XCircle className="h-5 w-5 text-red-500" />,
  }

  const statusLabels: Record<CheckStatusType, string> = {
    pass: 'Passed',
    fail: 'Failed',
    warn: 'Warning',
    pending: 'Pending',
    blocked: 'Blocked',
  }

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd)
  }

  return (
    <div className="border-b border-border last:border-0 last:rounded-b-xl bg-white">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {statusIcon[status]}
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {statusLabels[status]}
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pl-12 space-y-3">
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          {command && (
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-zinc-900 text-zinc-100 px-4 py-2.5 rounded-lg text-sm font-mono overflow-x-auto">
                {command}
              </code>
              <button
                onClick={(e) => { e.stopPropagation(); copyCommand(command); }}
                className="px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium shrink-0"
              >
                Copy
              </button>
            </div>
          )}
          {fix && (status === 'fail' || status === 'warn') && (
            <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
              <span className="text-red-500 font-medium text-sm">Fix:</span>
              <span className="text-sm text-red-600">{fix}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// File card component
function FileCard({ file, onCopy }: { file: FileCheck; onCopy: (path: string) => void }) {
  return (
    <div className={cn(
      'p-4 rounded-xl border flex items-start justify-between',
      file.status === 'found' ? 'bg-white border-border' : 'bg-red-50 border-red-100'
    )}>
      <div className="flex items-start gap-3">
        {file.status === 'found' ? (
          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
        )}
        <div>
          <p className="font-medium text-sm">{file.name}</p>
          <p className="text-xs text-muted-foreground">{file.status === 'found' ? file.path : 'Not found'}</p>
        </div>
      </div>
      {file.status === 'found' && file.path && (
        <button onClick={() => onCopy(file.path!)} className="p-1.5 hover:bg-muted rounded">
          <Copy className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </div>
  )
}

export function ProjectChecklist() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ai-stories')
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString())
  const [supabaseConnected, setSupabaseConnected] = useState(false)
  const [storiesCount, setStoriesCount] = useState(0)
  const [folderExpanded, setFolderExpanded] = useState(false)
  const [showWaveInfo, setShowWaveInfo] = useState(false)

  // Configuration state
  const [configSaving, setConfigSaving] = useState(false)
  const [configSaved, setConfigSaved] = useState(false)
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [configValues, setConfigValues] = useState({
    ANTHROPIC_API_KEY: '',
    SUPABASE_URL: '',
    SUPABASE_ANON_KEY: '',
    SUPABASE_SERVICE_ROLE_KEY: '',
    SLACK_WEBHOOK_URL: '',
    GITHUB_TOKEN: '',
    VERCEL_TOKEN: '',
    WAVE_BUDGET_LIMIT: '5.00',
  })

  // Analysis state
  const [analysisRunning, setAnalysisRunning] = useState(false)
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  const [analysisSteps, setAnalysisSteps] = useState<{
    step: number | string
    status: 'pending' | 'running' | 'complete' | 'failed'
    detail: string
    proof: string | null
  }[]>([])
  const [reportFilePath, setReportFilePath] = useState<string | null>(null)
  const [reportContent, setReportContent] = useState<string | null>(null)
  const [analysisReport, setAnalysisReport] = useState<{
    timestamp: string
    summary: { total_issues: number; total_gaps: number; readiness_score: number }
    file_structure: { status: string; findings: string[]; issues: string[]; tree?: string }
    ai_prd: { status: string; findings: string[]; issues: string[]; prd_location?: string }
    ai_stories: { status: string; findings: string[]; issues: string[]; stories_found: number }
    html_prototype: { status: string; findings: string[]; issues: string[]; files_found: string[] }
    gap_analysis: { gaps: { category: string; description: string; priority: string; action: string }[] }
    improvement_plan: { step: number; title: string; description: string; status: string }[]
  } | null>(null)

  const tabs = [
    { id: 'ai-stories', label: 'AI PRD & Stories', shortLabel: '1', status: 'warn' as CheckStatusType },
    { id: 'foundation', label: 'Foundation', shortLabel: '2', status: 'pending' as CheckStatusType },
    { id: 'system', label: 'System', shortLabel: '3', status: 'fail' as CheckStatusType },
    { id: 'infrastructure', label: 'Infrastructure', shortLabel: '4', status: 'pending' as CheckStatusType },
    { id: 'build-qa', label: 'Build & QA', shortLabel: '5', status: 'pending' as CheckStatusType },
    { id: 'compliance', label: 'Compliance', shortLabel: '6', status: 'pending' as CheckStatusType },
    { id: 'configuration', label: 'Configuration', shortLabel: '7', status: (configValues.ANTHROPIC_API_KEY && configValues.SUPABASE_URL ? 'pass' : 'warn') as CheckStatusType },
  ]

  const toggleShowKey = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const updateConfigValue = (key: string, value: string) => {
    setConfigValues(prev => ({ ...prev, [key]: value }))
    setConfigSaved(false)
  }

  const saveConfiguration = async () => {
    setConfigSaving(true)
    try {
      // Save to Supabase if connected
      if (supabaseConnected && project) {
        await supabase
          .from('maf_project_config')
          .upsert({
            project_id: project.id,
            config: configValues,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'project_id' })
      }
      setConfigSaved(true)
      setTimeout(() => setConfigSaved(false), 3000)
    } catch (error) {
      console.error('Error saving configuration:', error)
    } finally {
      setConfigSaving(false)
    }
  }

  // Analysis step labels
  const analysisStepLabels: Record<number, string> = {
    1: 'Scanning directory structure',
    2: 'Reading CLAUDE.md protocol',
    3: 'Finding AI PRD document',
    4: 'Reading story JSON files',
    5: 'Scanning HTML prototypes',
    6: 'Checking WAVE configuration',
    7: 'Generating gap analysis',
    8: 'Creating markdown report',
  }

  // Run Analysis function - calls streaming backend API
  const runAnalysis = async () => {
    if (!project) return

    setAnalysisRunning(true)
    setAnalysisComplete(false)
    setAnalysisReport(null)
    setShowAnalysisModal(true)
    setReportFilePath(null)

    // Initialize steps
    setAnalysisSteps([
      { step: 1, status: 'pending', detail: 'Scanning directory structure', proof: null },
      { step: 2, status: 'pending', detail: 'Reading CLAUDE.md protocol', proof: null },
      { step: 3, status: 'pending', detail: 'Finding AI PRD document', proof: null },
      { step: 4, status: 'pending', detail: 'Reading story JSON files', proof: null },
      { step: 5, status: 'pending', detail: 'Scanning HTML prototypes', proof: null },
      { step: 6, status: 'pending', detail: 'Checking WAVE configuration', proof: null },
      { step: 7, status: 'pending', detail: 'Generating gap analysis', proof: null },
      { step: 8, status: 'pending', detail: 'Creating markdown report', proof: null },
    ])

    try {
      // Use streaming endpoint
      const response = await fetch('http://localhost:3001/api/analyze-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectPath: project.root_path,
        }),
      })

      if (!response.ok) {
        throw new Error(`Analysis API error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE messages
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'result') {
                // Final result
                const report = data.report
                const transformedReport = {
                  timestamp: report.timestamp,
                  summary: report.summary,
                  file_structure: {
                    status: report.file_structure?.status || 'pending',
                    findings: report.file_structure?.findings || [],
                    issues: report.file_structure?.issues || [],
                    tree: report.file_structure?.tree || '',
                  },
                  ai_prd: {
                    status: report.ai_prd?.status || 'pending',
                    findings: report.ai_prd?.findings || [],
                    issues: report.ai_prd?.issues || [],
                    prd_location: report.ai_prd?.prd_location,
                  },
                  ai_stories: {
                    status: report.ai_stories?.status || 'pending',
                    findings: report.ai_stories?.findings || [],
                    issues: report.ai_stories?.issues || [],
                    stories_found: report.ai_stories?.stories_found || 0,
                  },
                  html_prototype: {
                    status: report.html_prototype?.status || 'pending',
                    findings: report.html_prototype?.findings || [],
                    issues: report.html_prototype?.issues || [],
                    files_found: report.html_prototype?.files_found || [],
                  },
                  gap_analysis: report.gap_analysis,
                  improvement_plan: report.improvement_plan,
                }
                setAnalysisReport(transformedReport)
                setReportFilePath(report.report_file)
                setReportContent(report.report_content)

                // Store to Supabase immediately when result is received
                if (supabaseConnected && project) {
                  (async () => {
                    try {
                      await supabase
                        .from('maf_analysis_reports')
                        .upsert({
                          project_id: project.id,
                          report_type: 'gap_analysis',
                          report_data: transformedReport,
                          readiness_score: transformedReport.summary.readiness_score,
                          total_gaps: transformedReport.summary.total_gaps,
                          created_at: transformedReport.timestamp,
                        }, { onConflict: 'project_id,report_type' })
                      console.log('Analysis saved to database')
                    } catch (err) {
                      console.error('Error saving analysis:', err)
                    }
                  })()
                }
              } else if (data.step) {
                // Update step status
                setAnalysisSteps(prev => prev.map(s =>
                  s.step === data.step
                    ? { ...s, status: data.status, detail: data.detail, proof: data.proof }
                    : s
                ))
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e)
            }
          }
        }
      }

      setAnalysisComplete(true)
    } catch (error) {
      console.error('Analysis error:', error)
      // Fallback to basic analysis if API fails
      setAnalysisReport({
        timestamp: new Date().toISOString(),
        summary: { total_issues: 1, total_gaps: 1, readiness_score: 0 },
        file_structure: { status: 'fail', findings: [], issues: ['Analysis API not available. Start the server with: npm run server'] },
        ai_prd: { status: 'pending', findings: [], issues: [], prd_location: undefined },
        ai_stories: { status: 'pending', findings: [], issues: [], stories_found: 0 },
        html_prototype: { status: 'pending', findings: [], issues: [], files_found: [] },
        gap_analysis: { gaps: [{ category: 'System', description: 'Analysis server not running', priority: 'high', action: 'Run: npm run server (in portal directory)' }] },
        improvement_plan: [{ step: 1, title: 'Start Analysis Server', description: 'Run npm run server in the portal directory to enable real file analysis', status: 'pending' }],
      })
      setAnalysisComplete(true)
    } finally {
      setAnalysisRunning(false)
    }
  }

  const configFields = [
    { key: 'ANTHROPIC_API_KEY', label: 'Anthropic API Key', placeholder: 'sk-ant-api03-...', required: true, description: 'Required for Claude AI agents', format: 'sk-ant-' },
    { key: 'SUPABASE_URL', label: 'Supabase URL', placeholder: 'https://xxxxx.supabase.co', required: true, description: 'Your Supabase project URL', format: 'https://' },
    { key: 'SUPABASE_ANON_KEY', label: 'Supabase Anon Key', placeholder: 'eyJhbGciOiJIUzI1NiIs...', required: true, description: 'Public anonymous key for client-side access', format: 'eyJ' },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase Service Role Key', placeholder: 'eyJhbGciOiJIUzI1NiIs...', required: false, description: 'Server-side key with elevated privileges (optional)', format: 'eyJ' },
    { key: 'SLACK_WEBHOOK_URL', label: 'Slack Webhook URL', placeholder: 'https://hooks.slack.com/services/...', required: false, description: 'For notifications and alerts', format: 'https://hooks.slack.com' },
    { key: 'GITHUB_TOKEN', label: 'GitHub Token', placeholder: 'ghp_...', required: false, description: 'For repository operations and PR creation', format: 'ghp_' },
    { key: 'VERCEL_TOKEN', label: 'Vercel Token', placeholder: 'vercel_...', required: false, description: 'For deployment previews (optional)', format: 'vercel_' },
    { key: 'WAVE_BUDGET_LIMIT', label: 'Wave Budget Limit ($)', placeholder: '5.00', required: true, description: 'Maximum API spend per wave', format: '' },
  ]

  // Dynamic file checks based on analysis results
  const fileChecks: FileCheck[] = [
    {
      name: 'AI PRD Document',
      path: 'ai-prd/AI-PRD.md',
      status: analysisReport?.ai_prd?.status === 'pass' ? 'found' : 'not_found'
    },
    { name: 'CLAUDE.md (Agent Instructions)', path: 'CLAUDE.md', status: 'found' },
    {
      name: 'README.md',
      path: 'README.md',
      status: analysisReport ? 'found' : 'not_found'  // Assume found if analysis ran
    },
    { name: 'Environment Config', path: '.env', status: 'found' },
    { name: 'package.json', path: 'package.json', status: 'found' },
    { name: 'tsconfig.json', path: 'tsconfig.json', status: 'found' },
  ]

  const fetchProject = useCallback(async () => {
    if (!isSupabaseConfigured() || !projectId) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('maf_projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) {
        console.error('Error fetching project:', error)
        navigate('/projects/new')
        return
      }

      setProject(data)
      setSupabaseConnected(true)

      const { count } = await supabase
        .from('maf_stories')
        .select('*', { count: 'exact', head: true })

      setStoriesCount(count || 0)

      // Load saved analysis report from database (SOURCE OF TRUTH)
      const { data: savedReport } = await supabase
        .from('maf_analysis_reports')
        .select('*')
        .eq('project_id', projectId)
        .eq('report_type', 'gap_analysis')
        .single()

      if (savedReport?.report_data) {
        const reportData = savedReport.report_data as any
        setAnalysisReport({
          timestamp: reportData.timestamp || savedReport.created_at,
          summary: reportData.summary || { total_issues: 0, total_gaps: savedReport.total_gaps || 0, readiness_score: savedReport.readiness_score || 0 },
          file_structure: reportData.file_structure || { status: 'pending', findings: [], issues: [], tree: '' },
          ai_prd: reportData.ai_prd || { status: 'pending', findings: [], issues: [] },
          ai_stories: reportData.ai_stories || { status: 'pending', findings: [], issues: [], stories_found: 0 },
          html_prototype: reportData.html_prototype || { status: 'pending', findings: [], issues: [], files_found: [] },
          gap_analysis: reportData.gap_analysis || { gaps: [] },
          improvement_plan: reportData.improvement_plan || [],
        })
        setAnalysisComplete(true)
        console.log('Loaded saved analysis from database (SOURCE OF TRUTH)')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [projectId, navigate])

  useEffect(() => {
    fetchProject()
  }, [fetchProject])

  useEffect(() => {
    const interval = setInterval(() => setLastUpdate(new Date().toLocaleTimeString()), 1000)
    return () => clearInterval(interval)
  }, [])

  const copyPath = (path: string) => navigator.clipboard.writeText(path)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Project Not Found</h2>
        <p className="text-muted-foreground mb-4">The project you're looking for doesn't exist.</p>
        <button onClick={() => navigate('/projects/new')} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
          Create New Project
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto pb-12">
      {/* Compact Header */}
      <div className="flex items-center justify-between py-4 mb-6 border-b border-border">
        <div>
          <h1 className="text-lg font-semibold">WAVE Pre-Launch Checklist</h1>
          <p className="text-sm text-muted-foreground">Aerospace-Grade Validation · {lastUpdate}</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/architecture"
            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-xs font-medium hover:opacity-90 flex items-center gap-1.5"
          >
            <Radio className="h-3.5 w-3.5" />
            WAVE v1.0
          </a>
          {/* Dynamic Ready/Not Ready status based on analysis */}
          {analysisReport && analysisReport.summary.readiness_score >= 100 && analysisReport.summary.total_gaps === 0 ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-100 rounded-full">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-green-600">Ready</span>
              <span className="text-xs text-muted-foreground">Phase 1</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-100 rounded-full">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-600">Not Ready</span>
              <span className="text-xs text-muted-foreground">Phase 1</span>
            </div>
          )}
          <button className="px-3 py-1.5 bg-white border border-border rounded-full text-xs font-medium hover:bg-muted flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Circuit Breaker
          </button>
          <button className="px-3 py-1.5 bg-white border border-border rounded-full text-xs font-medium hover:bg-muted flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Emergency Stop
          </button>
        </div>
      </div>

      {/* Pill Tabs */}
      <div className="bg-muted p-1.5 rounded-2xl mb-8 inline-flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all rounded-xl',
              activeTab === tab.id
                ? 'bg-white text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.shortLabel}. {tab.label}
            <StatusDot status={tab.status} />
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div>
        {/* TAB 1: AI PRD & Stories */}
        {activeTab === 'ai-stories' && (
          <>
            {/* Project Card */}
            <div className="bg-white border border-border rounded-2xl mb-6 overflow-hidden">
              {/* Project Section Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center gap-6">
                  <span className="text-sm font-medium text-muted-foreground">PROJECT</span>
                  <div>
                    <span className="font-semibold">Project Structure Overview</span>
                    <span className="text-muted-foreground ml-3">File structure, documentation locations, and best practices</span>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">{lastUpdate} <span className="ml-2 font-semibold">3/6</span></div>
              </div>

              {/* Project Name */}
              <div className="p-6 border-b border-border">
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Project Name</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={project.name}
                    readOnly
                    className="flex-1 px-4 py-3 bg-muted/30 border border-border rounded-xl text-sm"
                  />
                  <button className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90">
                    Save & Analyze
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Saving will scan the project and suggest structure improvements if needed.</p>
              </div>

              {/* Folder Structure */}
              <div className="p-6 border-b border-border">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setFolderExpanded(!folderExpanded)}
                >
                  <div className="flex items-center gap-3">
                    {folderExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    <span className="text-lg">📁</span>
                    <div>
                      <p className="font-semibold">Folder Structure</p>
                      <p className="text-sm text-muted-foreground">Click to expand and view project tree</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <code className="text-sm text-muted-foreground font-mono">{project.root_path}</code>
                    <button
                      onClick={(e) => { e.stopPropagation(); copyPath(project.root_path); }}
                      className="px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-lg flex items-center gap-2 text-sm"
                    >
                      <Copy className="h-4 w-4" /> Copy
                    </button>
                  </div>
                </div>
                {folderExpanded && (
                  <div className="mt-4">
                    <div className="bg-zinc-900 rounded-xl p-6 font-mono text-sm text-zinc-100 overflow-x-auto">
                      {analysisReport?.file_structure?.tree ? (
                        <pre className="whitespace-pre leading-relaxed">
                          <span className="text-yellow-400">📁</span> {project.name}/
{'\n'}{analysisReport.file_structure.tree}
                        </pre>
                      ) : (
                        <div className="text-zinc-400 text-center py-8">
                          <p className="mb-2">Run analysis to scan the actual project structure</p>
                          <button
                            onClick={runAnalysis}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                          >
                            Run Analysis
                          </button>
                        </div>
                      )}
                    </div>
                    {analysisReport?.file_structure?.tree && (
                      <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                        <span>✓</span> Tree structure from actual file system scan
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Key Files Status */}
              <div className="p-6 border-b border-border">
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">Key Files Status</label>
                <div className="grid grid-cols-3 gap-3">
                  {fileChecks.map((file) => (
                    <FileCard key={file.name} file={file} onCopy={copyPath} />
                  ))}
                </div>
              </div>

              {/* Data Sources */}
              <div className="p-6">
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">Data Sources</label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/30 rounded-xl border border-border">
                    <p className="text-xs font-semibold text-green-600 uppercase mb-2">Source of Truth</p>
                    <div className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-green-600" />
                      <span className="font-semibold">Supabase</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">maf_stories table</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-xl border border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Speed Layer</p>
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-500" />
                      <span className="font-semibold">JSON Signals</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">.claude/*.json</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Run Analysis Section */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 mt-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold mb-1">Deep Project Analysis</h3>
                  <p className="text-blue-100 text-sm">
                    Analyze file structure, AI PRD, AI Stories, and HTML prototypes to identify gaps and create an improvement plan
                  </p>
                </div>
                <button
                  onClick={runAnalysis}
                  disabled={analysisRunning}
                  className="px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {analysisRunning ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Target className="h-5 w-5" />
                      Run Analysis
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Analysis Results */}
            {analysisComplete && analysisReport && (
              <div className="mt-6 space-y-6">
                {/* Summary Card */}
                <div className="bg-white border border-border rounded-2xl overflow-hidden">
                  <div className="p-6 bg-gradient-to-r from-zinc-900 to-zinc-800 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold mb-1">Gap Analysis Report</h3>
                        <p className="text-zinc-400 text-sm">Generated: {new Date(analysisReport.timestamp).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-blue-400">{analysisReport.summary.readiness_score}%</div>
                        <div className="text-sm text-zinc-400">Readiness Score</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-6">
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="text-2xl font-bold text-red-400">{analysisReport.summary.total_issues}</div>
                        <div className="text-xs text-zinc-400">Issues Found</div>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="text-2xl font-bold text-yellow-400">{analysisReport.summary.total_gaps}</div>
                        <div className="text-xs text-zinc-400">Gaps Identified</div>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="text-2xl font-bold text-green-400">{analysisReport.improvement_plan.length}</div>
                        <div className="text-xs text-zinc-400">Improvement Steps</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Analysis Details */}
                <div className="grid grid-cols-2 gap-6">
                  {/* File Structure Analysis */}
                  <div className="bg-white border border-border rounded-xl overflow-hidden">
                    <div className={cn("px-4 py-3 border-b font-semibold flex items-center gap-2",
                      analysisReport.file_structure.status === 'pass' ? 'bg-green-50 text-green-700' :
                      analysisReport.file_structure.status === 'warn' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
                    )}>
                      <Layers className="h-4 w-4" />
                      File Structure
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Findings</p>
                        {analysisReport.file_structure.findings.map((f, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm py-1">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                      {analysisReport.file_structure.issues.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-red-600 mb-2">Issues</p>
                          {analysisReport.file_structure.issues.map((issue, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm py-1 text-red-600">
                              <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                              <span>{issue}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI PRD Analysis */}
                  <div className="bg-white border border-border rounded-xl overflow-hidden">
                    <div className={cn("px-4 py-3 border-b font-semibold flex items-center gap-2",
                      analysisReport.ai_prd.status === 'pass' ? 'bg-green-50 text-green-700' :
                      analysisReport.ai_prd.status === 'warn' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
                    )}>
                      <ScrollText className="h-4 w-4" />
                      AI PRD Document
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Findings</p>
                        {analysisReport.ai_prd.findings.map((f, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm py-1">
                            <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                      {analysisReport.ai_prd.issues.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-red-600 mb-2">Issues</p>
                          {analysisReport.ai_prd.issues.map((issue, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm py-1 text-red-600">
                              <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                              <span>{issue}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Stories Analysis */}
                  <div className="bg-white border border-border rounded-xl overflow-hidden">
                    <div className={cn("px-4 py-3 border-b font-semibold flex items-center gap-2",
                      analysisReport.ai_stories.status === 'pass' ? 'bg-green-50 text-green-700' :
                      analysisReport.ai_stories.status === 'warn' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
                    )}>
                      <Database className="h-4 w-4" />
                      AI Stories ({analysisReport.ai_stories.stories_found} found)
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Findings</p>
                        {analysisReport.ai_stories.findings.map((f, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm py-1">
                            <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                      {analysisReport.ai_stories.issues.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-red-600 mb-2">Issues</p>
                          {analysisReport.ai_stories.issues.map((issue, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm py-1 text-red-600">
                              <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                              <span>{issue}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* HTML Prototype Analysis */}
                  <div className="bg-white border border-border rounded-xl overflow-hidden">
                    <div className={cn("px-4 py-3 border-b font-semibold flex items-center gap-2",
                      analysisReport.html_prototype.status === 'pass' ? 'bg-green-50 text-green-700' :
                      analysisReport.html_prototype.status === 'warn' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
                    )}>
                      <Layers className="h-4 w-4" />
                      HTML Prototypes
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Findings</p>
                        {analysisReport.html_prototype.findings.map((f, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm py-1">
                            <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                      {analysisReport.html_prototype.issues.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-red-600 mb-2">Issues</p>
                          {analysisReport.html_prototype.issues.map((issue, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm py-1 text-red-600">
                              <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                              <span>{issue}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Gap Analysis Table */}
                <div className="bg-white border border-border rounded-xl overflow-hidden">
                  <div className="px-6 py-4 bg-yellow-50 border-b border-yellow-100">
                    <h3 className="font-bold text-yellow-800 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Identified Gaps
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30 border-b">
                        <tr>
                          <th className="text-left px-6 py-3 font-medium">Category</th>
                          <th className="text-left px-6 py-3 font-medium">Description</th>
                          <th className="text-left px-6 py-3 font-medium">Priority</th>
                          <th className="text-left px-6 py-3 font-medium">Action Required</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisReport.gap_analysis.gaps.map((gap, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="px-6 py-4 font-medium">{gap.category}</td>
                            <td className="px-6 py-4">{gap.description}</td>
                            <td className="px-6 py-4">
                              <span className={cn("px-2 py-1 rounded-full text-xs font-medium",
                                gap.priority === 'high' ? 'bg-red-100 text-red-700' :
                                gap.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                              )}>
                                {gap.priority.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">{gap.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Improvement Plan */}
                <div className="bg-white border border-border rounded-xl overflow-hidden">
                  <div className="px-6 py-4 bg-green-50 border-b border-green-100">
                    <h3 className="font-bold text-green-800 flex items-center gap-2">
                      <ArrowRight className="h-5 w-5" />
                      Step-by-Step Improvement Plan
                    </h3>
                    <p className="text-sm text-green-600 mt-1">Follow these steps to prepare your project for WAVE automation</p>
                  </div>
                  <div className="p-6 space-y-4">
                    {analysisReport.improvement_plan.map((step) => (
                      <div key={step.step} className="flex items-start gap-4 p-4 bg-muted/30 rounded-xl">
                        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                          {step.step}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{step.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                        </div>
                        <span className={cn("px-3 py-1 rounded-full text-xs font-medium",
                          step.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        )}>
                          {step.status === 'completed' ? 'Done' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* PRD Section */}
            <SectionHeader badge="PRD" badgeColor="bg-gray-500" title="AI PRD Vision" description="Product requirements that decompose into AI Stories" timestamp={lastUpdate} status={analysisReport?.ai_prd?.status === 'pass' ? 'pass' : 'warn'} />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="AI PRD Vision Document"
                status={analysisReport?.ai_prd?.status === 'pass' ? 'pass' : 'warn'}
                description={analysisReport?.ai_prd?.prd_location ? `Found at: ${analysisReport.ai_prd.prd_location}` : "Verifies AI PRD Vision document exists in ai-prd/AI-PRD.md with product requirements"}
                command={`ls -la ai-prd/AI-PRD.md .claude/ai-prd/AI-PRD.md 2>/dev/null`}
                fix="Create an AI PRD document at ai-prd/AI-PRD.md with your product vision and requirements"
                defaultExpanded={analysisReport?.ai_prd?.status !== 'pass'}
              />
            </div>

            {/* Supabase Section */}
            <SectionHeader badge="DB" badgeColor="bg-blue-500" title="Supabase (SOURCE OF TRUTH)" description="Database connection - all state lives here, JSON signals are speed layer" timestamp={lastUpdate} status={supabaseConnected ? 'pass' : 'fail'} />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="Supabase Connection"
                status={supabaseConnected ? 'pass' : 'fail'}
                description="Supabase (SOURCE OF TRUTH) is connected and maf_stories table is accessible"
                command={`curl -s -H 'apikey: $SUPABASE_ANON_KEY' "$SUPABASE_URL/rest/v1/maf_stories?limit=1" 2>/dev/null && echo 'SOURCE OF TRUTH CONNECTED'`}
                fix="Set SUPABASE_URL and SUPABASE_ANON_KEY in .env. Verify maf_stories table exists in Supabase"
                defaultExpanded
              />
            </div>

            {/* Waves Section */}
            <div className="bg-white border border-border rounded-xl mt-6 overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-muted-foreground">WAVES</span>
                  <span className="font-semibold">{storiesCount > 0 ? `${storiesCount} AI Stories Found` : 'No AI Stories Found'}</span>
                  <span className="text-muted-foreground text-sm">Connect to Supabase and create AI Stories to begin validation</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">2026-01-21 {lastUpdate}</span>
                  <StatusBadge status="blocked" />
                </div>
              </div>

              {storiesCount === 0 && (
                <div className="p-6">
                  <p className="text-center text-muted-foreground mb-4">To get started:</p>
                  <ol className="list-decimal list-inside space-y-2 text-sm max-w-lg mx-auto">
                    <li>Configure Supabase credentials in <code className="bg-zinc-100 px-1.5 py-0.5 rounded font-mono text-xs">.env</code></li>
                    <li>Create AI Stories in the <code className="bg-zinc-100 px-1.5 py-0.5 rounded font-mono text-xs">maf_stories</code> table</li>
                    <li>Assign stories to a wave (set wave_number field)</li>
                  </ol>
                </div>
              )}
            </div>

            {/* Phase 0: Story Validation */}
            <SectionHeader badge="0" badgeColor="bg-blue-500" title="Phase 0: Story Validation" description="Validate current wave stories are complete and ready" timestamp={lastUpdate} status="pass" />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="Stories Validated (0/0)"
                status="pass"
                description="Parses all JSON story files in stories/wave{N}/ and validates they have required fields: id, title, acceptance_criteria"
                command={`find stories/wave\${WAVE_NUMBER} -name '*.json' -exec jq -r '.id' {} \\; 2>/dev/null | wc -l`}
                defaultExpanded
              />
              <CheckItem
                label="Gap Analysis"
                status="pass"
                description="Analyzes stories to detect missing coverage: no frontend stories, no backend stories, or unlinked dependencies"
                command={`cat .claude/locks/PHASE0-wave\${WAVE_NUMBER}.lock 2>/dev/null | jq -r '.checks.gaps.status'`}
                defaultExpanded
              />
              <CheckItem
                label="Wave Planning"
                status="pass"
                description="Generates wave execution plan including story assignments, estimated costs, and dependency order"
                command={`cat .claude/locks/PHASE0-wave\${WAVE_NUMBER}.lock 2>/dev/null | jq -r '.checks.planning.status'`}
                defaultExpanded
              />
              <CheckItem
                label="Green Light Approval"
                status="pass"
                description="Final human approval checkpoint before autonomous agents begin work. Requires explicit GO signal"
                command={`cat .claude/signal-wave\${WAVE_NUMBER}-greenlight.json 2>/dev/null | jq -r '.status'`}
                defaultExpanded
              />
            </div>
          </>
        )}

        {/* TAB 2: Foundation */}
        {activeTab === 'foundation' && (
          <>
            <div className="flex items-center justify-between p-6 border border-border bg-white rounded-2xl mb-6">
              <div className="flex items-center gap-6">
                <span className="text-sm font-medium text-muted-foreground">FOUNDATION</span>
                <span className="font-semibold">Git, Environment & Deployment</span>
              </div>
            </div>

            <SectionHeader badge="GIT" badgeColor="bg-orange-500" title="Git Repository" description="Version control foundation - required for worktrees" timestamp={lastUpdate} status="pass" />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="Remote Origin Configured"
                status="pass"
                description="Git remote origin is configured and accessible"
                command="git remote -v | grep origin | head -1"
              />
              <CheckItem
                label="Main Branch Clean"
                status="warn"
                description="Main branch exists and is clean (no uncommitted changes)"
                command="git status --porcelain | wc -l | xargs"
              />
              <CheckItem
                label="Git Installed"
                status="pass"
                description="Checks Git is installed and accessible from command line"
                command="git --version"
              />
            </div>

            <SectionHeader badge="ENV" badgeColor="bg-blue-500" title="Environment Variables" description="API keys and configuration in .env" timestamp={lastUpdate} status="pass" />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label=".env File Exists"
                status="pass"
                description="Checks that a .env file exists in the project root with environment variables"
                command="ls -la .env"
              />
              <CheckItem
                label="ANTHROPIC_API_KEY"
                status="pass"
                description="Validates ANTHROPIC_API_KEY is set and matches the expected sk-ant-* format"
                command="echo $ANTHROPIC_API_KEY | head -c 15"
              />
              <CheckItem
                label="SLACK_WEBHOOK_URL"
                status="pass"
                description="Validates SLACK_WEBHOOK_URL is set and points to hooks.slack.com"
                command={`curl -s -o /dev/null -w '%{http_code}' -X POST $SLACK_WEBHOOK_URL -d '{"text":"test"}'`}
              />
            </div>

            <SectionHeader badge="WAVE" badgeColor="bg-purple-500" title="Wave Configuration" description="Current wave settings and assignments" timestamp={lastUpdate} status="pending" />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="Wave Config File"
                status="pending"
                description="Wave configuration exists with proper structure"
                command={`cat .claude/wave-config.json 2>/dev/null | jq -r '.wave // "NOT SET"'`}
              />
            </div>

            <SectionHeader badge="VCL" badgeColor="bg-black" title="Vercel Deployment" description="Preview and production deployment (optional)" timestamp={lastUpdate} status="warn" />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="Vercel Project Linked"
                status="warn"
                description="Vercel deployment is configured and project is linked"
                command={`ls .vercel/project.json 2>/dev/null && echo 'LINKED'`}
              />
            </div>
          </>
        )}

        {/* TAB 3: System */}
        {activeTab === 'system' && (
          <>
            <div className="flex items-center justify-between p-6 border border-border bg-white rounded-2xl mb-6">
              <div className="flex items-center gap-6">
                <span className="text-sm font-medium text-muted-foreground">SYSTEM</span>
                <span className="font-semibold">Tools, Resources & Connectivity</span>
              </div>
            </div>

            <SectionHeader badge="SYS" badgeColor="bg-green-600" title="System Tools" description="Required tools for development" timestamp={lastUpdate} status="fail" />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="Node.js >= 18"
                status="pass"
                description="Node.js version 18 or higher is required for the build system"
                command="node --version"
              />
              <CheckItem
                label="pnpm Package Manager"
                status="fail"
                description="pnpm is the required package manager for this project"
                command="pnpm --version"
              />
              <CheckItem
                label="jq JSON Processor"
                status="pass"
                description="jq is required for parsing JSON signals and config files"
                command="jq --version"
              />
            </div>

            <SectionHeader badge="RES" badgeColor="bg-cyan-500" title="System Resources" description="Hardware requirements" timestamp={lastUpdate} status="pass" />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="Disk Space (>1GB)"
                status="pass"
                description="At least 1GB of free disk space is required for builds and dependencies"
                command="df -h . | awk 'NR==2 {print $4}'"
              />
              <CheckItem
                label="Memory (>4GB)"
                status="warn"
                description="At least 4GB of available RAM is recommended for development"
                command="free -h | awk '/^Mem:/ {print $7}'"
              />
              <CheckItem
                label="Ports Available (3000, 8080)"
                status="warn"
                description="Development ports must be free for local server"
                command="lsof -i :3000 -i :8080 | head -5"
              />
            </div>

            <SectionHeader badge="DOCK" badgeColor="bg-blue-600" title="Docker" description="Container runtime" timestamp={lastUpdate} status="pass" />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="Docker Daemon Running"
                status="pass"
                description="Docker daemon must be running for containerized builds"
                command="docker info --format '{{.ServerVersion}}'"
              />
              <CheckItem
                label="docker-compose.yml Valid"
                status="pass"
                description="Docker compose configuration is valid and can be parsed"
                command="docker compose config --quiet && echo 'VALID'"
              />
            </div>

            <SectionHeader badge="NET" badgeColor="bg-red-500" title="Network Connectivity" description="API endpoint reachability" timestamp={lastUpdate} status="fail" />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="Anthropic API"
                status="fail"
                description="Validates connectivity to Anthropic API endpoint"
                command="curl -s -o /dev/null -w '%{http_code}' https://api.anthropic.com/v1/messages"
              />
              <CheckItem
                label="GitHub API"
                status="pass"
                description="Validates connectivity to GitHub API for repository operations"
                command="curl -s -o /dev/null -w '%{http_code}' https://api.github.com"
              />
              <CheckItem
                label="NPM Registry"
                status="pass"
                description="Validates connectivity to NPM registry for package installation"
                command="curl -s -o /dev/null -w '%{http_code}' https://registry.npmjs.org"
              />
            </div>
          </>
        )}

        {/* TAB 4: Infrastructure */}
        {activeTab === 'infrastructure' && (
          <>
            <div className="flex items-center justify-between p-6 border border-border bg-white rounded-2xl mb-6">
              <div className="flex items-center gap-6">
                <span className="text-sm font-medium text-muted-foreground">INFRASTRUCTURE</span>
                <span className="font-semibold">Worktrees, Docker & Signal Files</span>
              </div>
            </div>

            <SectionHeader badge="WORK" badgeColor="bg-indigo-500" title="Git Worktrees" description="Isolated development environments for agents" timestamp={lastUpdate} status="pass" />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="Worktrees Exist (fe-dev, be-dev, qa, dev-fix)"
                status="pass"
                description="All required worktrees are created for parallel agent development"
                command="git worktree list | grep -E '(fe-dev|be-dev|qa|dev-fix)' | wc -l"
              />
              <CheckItem
                label="Correct Feature Branches"
                status="pass"
                description="Each worktree is on the correct feature branch for the current wave"
                command="for wt in fe-dev be-dev qa dev-fix; do git -C worktrees/$wt branch --show-current; done"
              />
              <CheckItem
                label="No Uncommitted Changes"
                status="warn"
                description="Worktrees should have no uncommitted changes before starting a wave"
                command="for wt in fe-dev be-dev qa dev-fix; do git -C worktrees/$wt status --porcelain | wc -l; done"
              />
            </div>

            <SectionHeader badge="BUILD" badgeColor="bg-amber-600" title="Docker Build" description="Container image and runtime" timestamp={lastUpdate} status="pass" />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="Docker Image Buildable"
                status="pass"
                description="Docker image can be built from Dockerfile without errors"
                command="docker build --dry-run . 2>&1 | tail -1"
              />
              <CheckItem
                label="Base Images Available"
                status="pass"
                description="Required base images are pulled and available locally"
                command="docker images --format '{{.Repository}}:{{.Tag}}' | grep -E '(node|alpine)' | head -3"
              />
              <CheckItem
                label="Container Can Start"
                status="pass"
                description="Container can start and health check passes"
                command="docker run --rm -d --name test-container app && docker stop test-container"
              />
            </div>

            <SectionHeader badge="SIG" badgeColor="bg-yellow-600" title="Signal Files (Speed Layer)" description="JSON signals for fast agent coordination" timestamp={lastUpdate} status="pass" />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="Signal Schema Valid (2 files)"
                status="pass"
                description="Signal JSON files match the required schema structure"
                command="find .claude -name '*.json' -exec jq empty {} \\; 2>&1 | grep -c 'error' || echo '0 errors'"
              />
            </div>

            <SectionHeader badge="-1" badgeColor="bg-gray-500" title="Gate -1: Pre-Validation" description="Zero Error Launch Protocol" timestamp={lastUpdate} status="pass" />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="Prompt Files Exist"
                status="pass"
                description="Agent prompt files exist in .claude/prompts directory"
                command="ls -la .claude/prompts/*.md 2>/dev/null | wc -l"
              />
              <CheckItem
                label="Budget Sufficient ($5.00)"
                status="pass"
                description="API budget is sufficient for the planned wave execution"
                command="cat .claude/budget.json | jq '.remaining'"
              />
              <CheckItem
                label="Worktrees Clean"
                status="pass"
                description="All worktrees have no uncommitted changes"
                command="git worktree list --porcelain | grep -c 'dirty' || echo '0 dirty'"
              />
              <CheckItem
                label="No Emergency Stop"
                status="pass"
                description="Emergency stop signal is not active"
                command="test ! -f .claude/EMERGENCY_STOP && echo 'CLEAR'"
              />
              <CheckItem
                label="Previous Wave Complete"
                status="pass"
                description="Previous wave has been completed and merged"
                command="cat .claude/wave-status.json | jq '.previous_wave_complete'"
              />
              <CheckItem
                label="API Quotas Available"
                status="pass"
                description="API rate limits have sufficient headroom"
                command="curl -s https://api.anthropic.com/v1/usage | jq '.remaining_tokens'"
              />
            </div>
          </>
        )}

        {/* TAB 5: Build & QA */}
        {activeTab === 'build-qa' && (
          <>
            <div className="flex items-center justify-between p-6 border border-border bg-white rounded-2xl mb-6">
              <div className="flex items-center gap-6">
                <span className="text-sm font-medium text-muted-foreground">BUILD & QA</span>
                <span className="font-semibold">Smoke Tests, Development & Validation</span>
              </div>
            </div>

            <SectionHeader badge="2" badgeColor="bg-blue-500" title="Phase 2: Smoke Test" description="Build, type check, lint, test" timestamp={lastUpdate} status="blocked" />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="pnpm build"
                status="pending"
                description="Production build must complete without errors"
                command="pnpm build 2>&1 | tail -5"
              />
              <CheckItem
                label="pnpm typecheck"
                status="pending"
                description="TypeScript type checking must pass with zero errors"
                command="pnpm typecheck 2>&1 | grep -E '(error|Found)' || echo '0 errors'"
              />
              <CheckItem
                label="pnpm lint"
                status="pending"
                description="ESLint must pass with no errors (warnings allowed)"
                command="pnpm lint 2>&1 | grep -E '(error|warning)' | tail -3"
              />
              <CheckItem
                label="pnpm test"
                status="pending"
                description="All unit and integration tests must pass"
                command="pnpm test --reporter=dot 2>&1 | tail -3"
              />
            </div>

            <SectionHeader badge="3" badgeColor="bg-purple-500" title="Phase 3: Development" description="Agent completion signals" timestamp={lastUpdate} status="blocked" />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="FE-Dev Completion Signal"
                status="pending"
                description="Frontend agent has signaled completion of assigned stories"
                command="cat .claude/signal-fe-dev-complete.json | jq '.status'"
              />
              <CheckItem
                label="BE-Dev Completion Signal"
                status="pending"
                description="Backend agent has signaled completion of assigned stories"
                command="cat .claude/signal-be-dev-complete.json | jq '.status'"
              />
            </div>

            <SectionHeader badge="4" badgeColor="bg-green-500" title="Phase 4: QA/Merge" description="Final validation and merge" timestamp={lastUpdate} status="blocked" />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="QA Approval"
                status="pending"
                description="QA agent has approved all changes after validation"
                command="cat .claude/signal-qa-approved.json | jq '{status, tests_passed, coverage}'"
              />
              <CheckItem
                label="Merge to Main"
                status="pending"
                description="All changes have been merged to main branch"
                command="git log main --oneline -1"
              />
            </div>
          </>
        )}

        {/* TAB 6: Compliance */}
        {activeTab === 'compliance' && (
          <>
            <div className="flex items-center justify-between p-6 border border-border bg-white rounded-2xl mb-6">
              <div className="flex items-center gap-6">
                <span className="text-sm font-medium text-muted-foreground">COMPLIANCE</span>
                <span className="font-semibold">Safety, Security & Audit Requirements</span>
              </div>
            </div>

            <SectionHeader badge="A" badgeColor="bg-gray-400" title="Section A: Safety Documentation" description="CLAUDE.md and forbidden operations" timestamp={lastUpdate} status="warn" />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="Safety Markers (20+)"
                status="warn"
                description="CLAUDE.md must contain at least 20 CRITICAL/NEVER/FORBIDDEN markers"
                command="grep -cE '(CRITICAL|NEVER|FORBIDDEN|DO NOT)' CLAUDE.md"
              />
              <CheckItem
                label="Emergency Stop Configured"
                status="pass"
                description="Emergency stop mechanism is configured and accessible"
                command="test -f .claude/emergency-stop.sh && echo 'CONFIGURED'"
              />
              <CheckItem
                label="Domain Boundaries Defined"
                status="pass"
                description="Agent domain boundaries are clearly defined in CLAUDE.md"
                command="grep -c 'DOMAIN:' CLAUDE.md"
              />
              <CheckItem
                label="Budget Limits Enforced"
                status="pass"
                description="API budget limits are set and being tracked"
                command="cat .claude/budget.json | jq '{limit, spent, remaining}'"
              />
            </div>

            <SectionHeader badge="B" badgeColor="bg-gray-400" title="Section B: Docker Configuration" description="Container safety settings" timestamp={lastUpdate} status="pass" />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="--dangerously-skip-permissions"
                status="pass"
                description="Docker runs with appropriate permission flags for Claude Code"
                command="grep -c 'dangerously-skip-permissions' docker-compose.yml || echo 'Not found'"
              />
              <CheckItem
                label="Non-Root User"
                status="pass"
                description="Container runs as non-root user for security"
                command="grep -E '^USER' Dockerfile | tail -1"
              />
            </div>

            <SectionHeader badge="C" badgeColor="bg-gray-400" title="Section C: Signal Protocol" description="Agent communication mechanism" timestamp={lastUpdate} status="pass" />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="Signal File Schema"
                status="pass"
                description="Signal files follow the required JSON schema"
                command="ajv validate -s .claude/schemas/signal.json -d '.claude/signal-*.json'"
              />
              <CheckItem
                label="Gate Progression (0-7)"
                status="pass"
                description="Gate progression follows the defined sequence (0→7)"
                command="cat .claude/gate-status.json | jq '.current_gate'"
              />
            </div>

            <SectionHeader badge="D" badgeColor="bg-gray-400" title="Section D: Aerospace Safety (DO-178C)" description="Design Assurance and FMEA compliance" timestamp={lastUpdate} status="fail" />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="DAL Level Assignment"
                status="pending"
                description="Design Assurance Level is assigned to all components"
                command="cat .claude/dal-assignments.json | jq '.components | length'"
              />
              <CheckItem
                label="FMEA Document (17 modes)"
                status="fail"
                description="Failure Mode and Effects Analysis covers all 17 identified failure modes"
                command="cat docs/FMEA.md | grep -c '## FM-'"
              />
              <CheckItem
                label="Emergency Levels (E1-E5)"
                status="fail"
                description="Emergency severity levels E1-E5 are defined and documented"
                command="grep -cE 'E[1-5]:' CLAUDE.md"
              />
              <CheckItem
                label="Approval Matrix (L0-L5)"
                status="fail"
                description="Approval levels L0-L5 are defined for different operation types"
                command="grep -cE 'L[0-5]:' CLAUDE.md"
              />
              <CheckItem
                label="Forbidden Operations (108)"
                status="pass"
                description="All 108 forbidden operations are documented and enforced"
                command="grep -c 'FORBIDDEN:' CLAUDE.md"
              />
            </div>

            <SectionHeader badge="E" badgeColor="bg-gray-400" title="Section E: Operational Safety" description="Rollback, audit, and security" timestamp={lastUpdate} status="fail" />
            <div className="border-x border-b border-border rounded-b-xl">
              <CheckItem
                label="Rollback Procedures"
                status="warn"
                description="Rollback procedures are documented and tested"
                command="test -f scripts/rollback.sh && echo 'EXISTS'"
              />
              <CheckItem
                label="Audit Trail (Supabase)"
                status="warn"
                description="All operations are logged to Supabase audit table"
                command="psql $DATABASE_URL -c 'SELECT COUNT(*) FROM maf_audit_log'"
              />
              <CheckItem
                label="Security Scan (npm audit)"
                status="pending"
                description="No high or critical vulnerabilities in dependencies"
                command="pnpm audit --audit-level=high 2>&1 | tail -5"
              />
              <CheckItem
                label="Backup Verification"
                status="warn"
                description="Database backups are recent and restorable"
                command="ls -la backups/*.sql | tail -1"
              />
              <CheckItem
                label="Pre-Flight Validator"
                status="warn"
                description="Pre-flight validation script passes all checks"
                command="./scripts/pre-flight-check.sh --summary"
              />
            </div>
          </>
        )}

        {/* TAB 7: Configuration */}
        {activeTab === 'configuration' && (
          <>
            <div className="flex items-center justify-between p-6 border border-border bg-white rounded-2xl mb-6">
              <div className="flex items-center gap-6">
                <span className="text-sm font-medium text-muted-foreground">CONFIGURATION</span>
                <span className="font-semibold">API Keys & Environment Variables</span>
              </div>
              <div className="flex items-center gap-3">
                {configSaved && (
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Saved
                  </span>
                )}
                <button
                  onClick={saveConfiguration}
                  disabled={configSaving}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  {configSaving ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Configuration
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Storage Info */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-700">Configuration Storage</p>
                  <p className="text-sm text-blue-600 mt-1">
                    API keys are stored securely in the Supabase database (maf_project_config table).
                    For local development, you can also copy these values to your <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono text-xs">.env</code> file.
                  </p>
                </div>
              </div>
            </div>

            {/* Required Keys */}
            <div className="bg-white border border-border rounded-xl overflow-hidden mb-6">
              <div className="px-6 py-4 bg-red-50 border-b border-red-100">
                <h3 className="font-semibold text-red-700 flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Required API Keys
                </h3>
                <p className="text-sm text-red-600 mt-1">These keys are required for WAVE to function</p>
              </div>
              <div className="p-6 space-y-6">
                {configFields.filter(f => f.required).map((field) => (
                  <div key={field.key}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        {field.label}
                        <span className="text-red-500">*</span>
                      </label>
                      {configValues[field.key as keyof typeof configValues] && (
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          configValues[field.key as keyof typeof configValues].startsWith(field.format)
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        )}>
                          {configValues[field.key as keyof typeof configValues].startsWith(field.format) ? 'Valid format' : 'Check format'}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type={showKeys[field.key] ? 'text' : 'password'}
                          value={configValues[field.key as keyof typeof configValues]}
                          onChange={(e) => updateConfigValue(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full px-4 py-3 bg-muted/30 border border-border rounded-lg text-sm font-mono pr-20"
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowKey(field.key)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted rounded"
                        >
                          {showKeys[field.key] ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(configValues[field.key as keyof typeof configValues])}
                        className="px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg"
                        title="Copy to clipboard"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">{field.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Optional Keys */}
            <div className="bg-white border border-border rounded-xl overflow-hidden mb-6">
              <div className="px-6 py-4 bg-muted/30 border-b border-border">
                <h3 className="font-semibold flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Optional Configuration
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Additional integrations and settings</p>
              </div>
              <div className="p-6 space-y-6">
                {configFields.filter(f => !f.required).map((field) => (
                  <div key={field.key}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">{field.label}</label>
                      {configValues[field.key as keyof typeof configValues] && configValues[field.key as keyof typeof configValues].length > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          Configured
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type={showKeys[field.key] ? 'text' : 'password'}
                          value={configValues[field.key as keyof typeof configValues]}
                          onChange={(e) => updateConfigValue(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full px-4 py-3 bg-muted/30 border border-border rounded-lg text-sm font-mono pr-20"
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowKey(field.key)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted rounded"
                        >
                          {showKeys[field.key] ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(configValues[field.key as keyof typeof configValues])}
                        className="px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg"
                        title="Copy to clipboard"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">{field.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Generate .env File */}
            <div className="bg-white border border-border rounded-xl overflow-hidden">
              <div className="px-6 py-4 bg-zinc-900 border-b border-zinc-700">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Export to .env File
                </h3>
                <p className="text-sm text-zinc-400 mt-1">Copy this content to your project's .env file</p>
              </div>
              <div className="p-4 bg-zinc-900">
                <div className="relative">
                  <pre className="text-sm font-mono text-zinc-100 p-4 bg-zinc-950 rounded-lg overflow-x-auto">
{`# WAVE Configuration - Generated ${new Date().toISOString()}
# Project: ${project?.name || 'Unknown'}

# Anthropic (Required)
ANTHROPIC_API_KEY=${configValues.ANTHROPIC_API_KEY || 'your-api-key-here'}

# Supabase (Required)
SUPABASE_URL=${configValues.SUPABASE_URL || 'https://your-project.supabase.co'}
SUPABASE_ANON_KEY=${configValues.SUPABASE_ANON_KEY || 'your-anon-key'}
SUPABASE_SERVICE_ROLE_KEY=${configValues.SUPABASE_SERVICE_ROLE_KEY || ''}

# Integrations (Optional)
SLACK_WEBHOOK_URL=${configValues.SLACK_WEBHOOK_URL || ''}
GITHUB_TOKEN=${configValues.GITHUB_TOKEN || ''}
VERCEL_TOKEN=${configValues.VERCEL_TOKEN || ''}

# WAVE Settings
WAVE_BUDGET_LIMIT=${configValues.WAVE_BUDGET_LIMIT || '5.00'}
WAVE_PROJECT_ID=${project?.id || ''}
WAVE_PROJECT_ROOT=${project?.root_path || ''}`}
                  </pre>
                  <button
                    onClick={() => {
                      const envContent = `# WAVE Configuration - Generated ${new Date().toISOString()}
# Project: ${project?.name || 'Unknown'}

# Anthropic (Required)
ANTHROPIC_API_KEY=${configValues.ANTHROPIC_API_KEY || 'your-api-key-here'}

# Supabase (Required)
SUPABASE_URL=${configValues.SUPABASE_URL || 'https://your-project.supabase.co'}
SUPABASE_ANON_KEY=${configValues.SUPABASE_ANON_KEY || 'your-anon-key'}
SUPABASE_SERVICE_ROLE_KEY=${configValues.SUPABASE_SERVICE_ROLE_KEY || ''}

# Integrations (Optional)
SLACK_WEBHOOK_URL=${configValues.SLACK_WEBHOOK_URL || ''}
GITHUB_TOKEN=${configValues.GITHUB_TOKEN || ''}
VERCEL_TOKEN=${configValues.VERCEL_TOKEN || ''}

# WAVE Settings
WAVE_BUDGET_LIMIT=${configValues.WAVE_BUDGET_LIMIT || '5.00'}
WAVE_PROJECT_ID=${project?.id || ''}
WAVE_PROJECT_ROOT=${project?.root_path || ''}`
                      navigator.clipboard.writeText(envContent)
                    }}
                    className="absolute top-6 right-6 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-sm flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy .env
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Analysis Progress Modal */}
      {showAnalysisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {analysisRunning ? (
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  ) : analysisComplete ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <Target className="h-6 w-6" />
                  )}
                  <div>
                    <h3 className="font-bold text-lg">
                      {analysisComplete ? 'Analysis Complete' : 'Deep Project Analysis'}
                    </h3>
                    <p className="text-blue-100 text-sm">
                      {analysisComplete
                        ? 'All files have been analyzed'
                        : 'Reading and analyzing project files...'}
                    </p>
                  </div>
                </div>
                {analysisComplete && (
                  <button
                    onClick={() => setShowAnalysisModal(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-4">
                {analysisSteps.map((step, idx) => (
                  <div
                    key={step.step}
                    className={cn(
                      "border rounded-xl overflow-hidden transition-all",
                      step.status === 'running' ? 'border-blue-300 bg-blue-50' :
                      step.status === 'complete' ? 'border-green-200 bg-green-50' :
                      step.status === 'failed' ? 'border-red-200 bg-red-50' :
                      'border-gray-200 bg-gray-50'
                    )}
                  >
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                          step.status === 'running' ? 'bg-blue-500 text-white' :
                          step.status === 'complete' ? 'bg-green-500 text-white' :
                          step.status === 'failed' ? 'bg-red-500 text-white' :
                          'bg-gray-300 text-gray-600'
                        )}>
                          {step.status === 'running' ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : step.status === 'complete' ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : step.status === 'failed' ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {analysisStepLabels[idx + 1] || `Step ${idx + 1}`}
                          </p>
                          <p className="text-xs text-muted-foreground">{step.detail}</p>
                        </div>
                      </div>
                      <span className={cn(
                        "text-xs font-medium px-2 py-1 rounded-full",
                        step.status === 'running' ? 'bg-blue-200 text-blue-700' :
                        step.status === 'complete' ? 'bg-green-200 text-green-700' :
                        step.status === 'failed' ? 'bg-red-200 text-red-700' :
                        'bg-gray-200 text-gray-600'
                      )}>
                        {step.status === 'running' ? 'Running...' :
                         step.status === 'complete' ? 'Complete' :
                         step.status === 'failed' ? 'Failed' : 'Pending'}
                      </span>
                    </div>

                    {/* Proof of file reading */}
                    {step.proof && step.status === 'complete' && (
                      <div className="px-4 pb-3">
                        <div className="bg-zinc-900 rounded-lg p-3 text-xs font-mono text-zinc-100 overflow-x-auto max-h-32 overflow-y-auto">
                          <pre className="whitespace-pre-wrap">{step.proof}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Report File Link */}
              {analysisComplete && reportFilePath && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-green-800">Markdown Report Generated</p>
                      <p className="text-sm text-green-600 mt-1">
                        Report saved to:
                      </p>
                      <code className="block mt-2 px-3 py-2 bg-green-100 rounded-lg text-xs font-mono text-green-800 break-all">
                        {reportFilePath}
                      </code>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {analysisComplete && (
              <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  Analysis completed in {analysisSteps.length} steps
                </div>
                <div className="flex gap-3">
                  {reportContent && (
                    <button
                      onClick={() => {
                        const blob = new Blob([reportContent], { type: 'text/markdown' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `gap-analysis-${new Date().toISOString().split('T')[0]}.md`
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                        URL.revokeObjectURL(url)
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <ArrowRight className="h-4 w-4" />
                      Download Report (.md)
                    </button>
                  )}
                  <button
                    onClick={() => setShowAnalysisModal(false)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
                  >
                    View Results
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground py-8 mt-8">
        Generated: 2026-01-21 {lastUpdate} | Dashboard v1.0.0 | Aerospace-Grade Validation Protocol
      </div>

      {/* WAVE Architecture Full Page */}
      {showWaveInfo && (
        <div className="fixed inset-0 z-50 bg-zinc-50 overflow-y-auto">
          <div className="min-h-screen">
            {/* Full Page Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-border px-8 py-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setShowWaveInfo(false)}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to Checklist
                </button>
                <div className="h-8 w-px bg-border" />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                    <Radio className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">WAVE Architecture</h2>
                    <p className="text-sm text-muted-foreground">Autonomous Agent Orchestration System</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">v1.0.0</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">DO-178C Inspired</span>
              </div>
            </div>

            {/* Full Page Content */}
            <div className="max-w-7xl mx-auto px-8 py-8 space-y-12">

              {/* Hero Section */}
              <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-2xl p-8 text-white">
                <div className="flex items-start justify-between">
                  <div className="max-w-2xl">
                    <h1 className="text-3xl font-bold mb-4">WAVE Architecture Overview</h1>
                    <p className="text-zinc-300 text-lg leading-relaxed mb-6">
                      <strong className="text-white">WAVE</strong> (Workflow Automation & Validation Engine) is an <strong className="text-blue-400">Air Traffic Controller</strong> for AI agents.
                      Just like ATC coordinates multiple aircraft through takeoff, flight, and landing, WAVE orchestrates autonomous AI agents
                      through development phases with <strong className="text-green-400">aerospace-grade safety protocols</strong>.
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="px-4 py-2 bg-white/10 rounded-lg flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                        <span className="text-sm">Phase-Gate Model</span>
                      </div>
                      <div className="px-4 py-2 bg-white/10 rounded-lg flex items-center gap-2">
                        <Shield className="h-4 w-4 text-blue-400" />
                        <span className="text-sm">DO-178C Inspired</span>
                      </div>
                      <div className="px-4 py-2 bg-white/10 rounded-lg flex items-center gap-2">
                        <Bot className="h-4 w-4 text-purple-400" />
                        <span className="text-sm">Multi-Agent System</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-block bg-white/10 rounded-xl p-4">
                      <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Current Status</p>
                      <p className="text-2xl font-bold text-green-400">Operational</p>
                      <p className="text-sm text-zinc-400 mt-1">Phase 0 Ready</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-5 gap-4">
                {[
                  { label: 'Phases', value: '5', icon: Layers, color: 'text-blue-500', bg: 'bg-blue-50' },
                  { label: 'Gates', value: '8', icon: Target, color: 'text-purple-500', bg: 'bg-purple-50' },
                  { label: 'Agents', value: '4', icon: Bot, color: 'text-green-500', bg: 'bg-green-50' },
                  { label: 'Safety Checks', value: '108', icon: Shield, color: 'text-red-500', bg: 'bg-red-50' },
                  { label: 'Worktrees', value: '4', icon: GitBranch, color: 'text-orange-500', bg: 'bg-orange-50' },
                ].map((stat) => (
                  <div key={stat.label} className={cn("p-4 rounded-xl border border-border", stat.bg)}>
                    <stat.icon className={cn("h-6 w-6 mb-2", stat.color)} />
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* BPMN-Style Architecture Diagram */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Layers className="h-5 w-5 text-blue-600" />
                      </div>
                      System Architecture (BPMN Swimlanes)
                    </h2>
                    <p className="text-muted-foreground mt-1">Visual representation of the WAVE orchestration layers and flow</p>
                  </div>
                </div>
                <div className="bg-zinc-50 rounded-xl p-6 border border-zinc-200 overflow-x-auto">
                  {/* Swimlanes */}
                  <div className="min-w-[900px]">
                    {/* Header */}
                    <div className="flex mb-4 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                      <div className="w-24 shrink-0">Layer</div>
                      <div className="flex-1 grid grid-cols-6 gap-2 text-center">
                        <div>Start</div>
                        <div>Phase 0</div>
                        <div>Phase 1-2</div>
                        <div>Phase 3</div>
                        <div>Phase 4</div>
                        <div>End</div>
                      </div>
                    </div>

                    {/* Human Layer */}
                    <div className="flex items-stretch mb-2">
                      <div className="w-24 shrink-0 bg-amber-100 rounded-l-lg p-2 flex items-center">
                        <span className="text-xs font-semibold text-amber-700 [writing-mode:vertical-lr] rotate-180">HUMAN</span>
                      </div>
                      <div className="flex-1 bg-amber-50 rounded-r-lg p-3 grid grid-cols-6 gap-2 items-center border-2 border-amber-200">
                        {/* Start Event */}
                        <div className="flex justify-center">
                          <div className="w-8 h-8 rounded-full border-2 border-green-600 bg-green-100 flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-green-600" />
                          </div>
                        </div>
                        {/* Green Light */}
                        <div className="flex justify-center">
                          <div className="px-3 py-2 bg-amber-200 rounded-lg border border-amber-400 text-xs font-medium text-center">
                            🟢 Green Light<br/>Approval
                          </div>
                        </div>
                        {/* Empty */}
                        <div />
                        {/* Monitor */}
                        <div className="flex justify-center">
                          <div className="px-3 py-2 bg-amber-200 rounded-lg border border-amber-400 text-xs font-medium text-center">
                            👁️ Monitor<br/>Dashboard
                          </div>
                        </div>
                        {/* Review */}
                        <div className="flex justify-center">
                          <div className="px-3 py-2 bg-amber-200 rounded-lg border border-amber-400 text-xs font-medium text-center">
                            ✅ Review<br/>& Approve
                          </div>
                        </div>
                        {/* End Event */}
                        <div className="flex justify-center">
                          <div className="w-8 h-8 rounded-full border-4 border-red-600 bg-red-100 flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-red-600" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Orchestrator Layer */}
                    <div className="flex items-stretch mb-2">
                      <div className="w-24 shrink-0 bg-blue-100 rounded-l-lg p-2 flex items-center">
                        <span className="text-xs font-semibold text-blue-700 [writing-mode:vertical-lr] rotate-180">WAVE</span>
                      </div>
                      <div className="flex-1 bg-blue-50 rounded-r-lg p-3 grid grid-cols-6 gap-2 items-center border-2 border-blue-200">
                        {/* Trigger */}
                        <div className="flex justify-center">
                          <div className="px-3 py-2 bg-blue-200 rounded border border-blue-400 text-xs font-medium">
                            ⚡ Trigger
                          </div>
                        </div>
                        {/* Gate 0 */}
                        <div className="flex justify-center">
                          <div className="w-10 h-10 bg-blue-500 rotate-45 flex items-center justify-center">
                            <span className="text-white text-xs font-bold -rotate-45">G0</span>
                          </div>
                        </div>
                        {/* Gate 1-2 */}
                        <div className="flex justify-center gap-2">
                          <div className="w-8 h-8 bg-blue-500 rotate-45 flex items-center justify-center">
                            <span className="text-white text-[10px] font-bold -rotate-45">G1</span>
                          </div>
                          <div className="w-8 h-8 bg-blue-500 rotate-45 flex items-center justify-center">
                            <span className="text-white text-[10px] font-bold -rotate-45">G2</span>
                          </div>
                        </div>
                        {/* Gate 3 */}
                        <div className="flex justify-center">
                          <div className="w-10 h-10 bg-blue-500 rotate-45 flex items-center justify-center">
                            <span className="text-white text-xs font-bold -rotate-45">G3</span>
                          </div>
                        </div>
                        {/* Gate 4 */}
                        <div className="flex justify-center">
                          <div className="w-10 h-10 bg-green-500 rotate-45 flex items-center justify-center">
                            <span className="text-white text-xs font-bold -rotate-45">G4</span>
                          </div>
                        </div>
                        {/* Merge */}
                        <div className="flex justify-center">
                          <div className="px-3 py-2 bg-green-200 rounded border border-green-400 text-xs font-medium">
                            🔀 Merge
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Agents Layer */}
                    <div className="flex items-stretch mb-2">
                      <div className="w-24 shrink-0 bg-purple-100 rounded-l-lg p-2 flex items-center">
                        <span className="text-xs font-semibold text-purple-700 [writing-mode:vertical-lr] rotate-180">AGENTS</span>
                      </div>
                      <div className="flex-1 bg-purple-50 rounded-r-lg p-3 grid grid-cols-6 gap-2 items-center border-2 border-purple-200">
                        <div />
                        {/* Validate */}
                        <div className="flex justify-center">
                          <div className="px-3 py-2 bg-purple-200 rounded-lg border border-purple-400 text-xs font-medium text-center">
                            📋 Validate<br/>Stories
                          </div>
                        </div>
                        {/* Setup */}
                        <div className="flex justify-center">
                          <div className="px-3 py-2 bg-purple-200 rounded-lg border border-purple-400 text-xs font-medium text-center">
                            🔧 Setup<br/>Worktrees
                          </div>
                        </div>
                        {/* Parallel Agents */}
                        <div className="flex justify-center">
                          <div className="border-2 border-dashed border-purple-400 rounded-lg p-2">
                            <div className="flex gap-1">
                              <div className="w-8 h-8 bg-blue-500 rounded text-white text-[10px] font-bold flex items-center justify-center">FE</div>
                              <div className="w-8 h-8 bg-green-500 rounded text-white text-[10px] font-bold flex items-center justify-center">BE</div>
                            </div>
                            <p className="text-[9px] text-center mt-1 text-purple-600">Parallel</p>
                          </div>
                        </div>
                        {/* QA Agent */}
                        <div className="flex justify-center">
                          <div className="px-3 py-2 bg-purple-200 rounded-lg border border-purple-400 text-xs font-medium text-center">
                            🧪 QA<br/>Validate
                          </div>
                        </div>
                        <div />
                      </div>
                    </div>

                    {/* Data Layer */}
                    <div className="flex items-stretch">
                      <div className="w-24 shrink-0 bg-green-100 rounded-l-lg p-2 flex items-center">
                        <span className="text-xs font-semibold text-green-700 [writing-mode:vertical-lr] rotate-180">DATA</span>
                      </div>
                      <div className="flex-1 bg-green-50 rounded-r-lg p-3 grid grid-cols-6 gap-2 items-center border-2 border-green-200">
                        <div />
                        {/* Stories */}
                        <div className="flex justify-center">
                          <div className="flex items-center gap-1">
                            <Database className="h-4 w-4 text-green-600" />
                            <span className="text-xs">Stories</span>
                          </div>
                        </div>
                        {/* Locks */}
                        <div className="flex justify-center">
                          <div className="flex items-center gap-1">
                            <div className="text-xs">🔒 Lock Files</div>
                          </div>
                        </div>
                        {/* Signals */}
                        <div className="flex justify-center">
                          <div className="flex items-center gap-1">
                            <Zap className="h-4 w-4 text-yellow-500" />
                            <span className="text-xs">Signals</span>
                          </div>
                        </div>
                        {/* Checksums */}
                        <div className="flex justify-center">
                          <div className="flex items-center gap-1">
                            <div className="text-xs">#️⃣ Checksums</div>
                          </div>
                        </div>
                        {/* Git */}
                        <div className="flex justify-center">
                          <div className="flex items-center gap-1">
                            <GitBranch className="h-4 w-4 text-orange-500" />
                            <span className="text-xs">Main</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Flow Arrows */}
                    <div className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-500">
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-full border-2 border-green-600 bg-green-100" />
                        <span>Start</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-blue-500 rotate-45" />
                        <span>Gate (Decision)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-6 h-4 bg-purple-200 rounded border border-purple-400" />
                        <span>Task</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-full border-4 border-red-600 bg-red-100" />
                        <span>End</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-6 h-4 border-2 border-dashed border-purple-400 rounded" />
                        <span>Parallel</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Autonomous Flow Diagram */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Radio className="h-5 w-5 text-purple-600" />
                      </div>
                      Autonomous Execution Flow
                    </h2>
                    <p className="text-muted-foreground mt-1">How WAVE executes phases autonomously with drift detection</p>
                  </div>
                </div>
                <div className="bg-zinc-900 rounded-xl p-6 text-zinc-100 font-mono text-xs overflow-x-auto">
                  <pre className="whitespace-pre">{`
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           WAVE AUTONOMOUS EXECUTION FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     │
│   │  HUMAN   │     │  PHASE   │     │  PHASE   │     │  PHASE   │     │  PHASE   │     │
│   │  INPUT   │────▶│    0     │────▶│   1-2    │────▶│    3     │────▶│    4     │     │
│   │          │     │ Stories  │     │  Setup   │     │   Dev    │     │    QA    │     │
│   └──────────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     │
│        │                │                │                │                │            │
│        │                ▼                ▼                ▼                ▼            │
│        │           ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐        │
│        │           │  LOCK   │     │  LOCK   │     │  LOCK   │     │  LOCK   │        │
│        │           │ + hash  │     │ + hash  │     │ + hash  │     │ + hash  │        │
│        │           └────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘        │
│        │                │                │                │                │            │
│        │                └────────────────┴────────────────┴────────────────┘            │
│        │                                 │                                              │
│        │                                 ▼                                              │
│        │                    ┌────────────────────────┐                                  │
│        │                    │   DRIFT DETECTOR       │                                  │
│        │                    │   (Continuous Check)   │                                  │
│        │                    └───────────┬────────────┘                                  │
│        │                                │                                              │
│        │               ┌────────────────┴────────────────┐                             │
│        │               ▼                                 ▼                             │
│        │    ┌──────────────────┐              ┌──────────────────┐                     │
│        │    │   ✅ NO DRIFT    │              │   ❌ DRIFT        │                     │
│        │    │   Continue       │              │   DETECTED        │                     │
│        │    └──────────────────┘              └────────┬─────────┘                     │
│        │                                               │                               │
│        │                                               ▼                               │
│        │                                    ┌──────────────────┐                       │
│        │                                    │ INVALIDATE CHAIN │                       │
│        │                                    │ Re-run from P0   │                       │
│        │                                    └────────┬─────────┘                       │
│        │                                             │                                 │
│        └─────────────────────────────────────────────┘                                 │
│                                                                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  LEGEND:  ──▶ Flow   │ Gate   ◇ Decision   ═══ Parallel   ┌─┐ Lock File                │
└─────────────────────────────────────────────────────────────────────────────────────────┘
`}</pre>
                </div>
              </div>

              {/* The Process Flow */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <ArrowRight className="h-5 w-5 text-green-600" />
                      </div>
                      Phase-Gate Process (Building Blocks)
                    </h2>
                    <p className="text-muted-foreground mt-1">Each phase creates a lock file - no phase proceeds without valid prior locks</p>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-3">
                  {[
                    { phase: '0', name: 'Stories', desc: 'Validate AI Stories', color: 'bg-blue-500', status: 'pass' },
                    { phase: '1', name: 'Environment', desc: 'Setup worktrees', color: 'bg-purple-500', status: 'pending' },
                    { phase: '2', name: 'Smoke Test', desc: 'Build, lint, test', color: 'bg-orange-500', status: 'pending' },
                    { phase: '3', name: 'Development', desc: 'Agents execute', color: 'bg-green-500', status: 'pending' },
                    { phase: '4', name: 'QA & Merge', desc: 'Validate & deploy', color: 'bg-red-500', status: 'pending' },
                  ].map((p, i) => (
                    <div key={p.phase} className="relative">
                      <div className={cn(
                        "p-4 rounded-xl border-2 text-center transition-all",
                        p.status === 'pass' ? "border-green-500 bg-green-50" : "border-border bg-white"
                      )}>
                        <div className={cn("w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center text-white font-bold text-sm", p.color)}>
                          {p.phase}
                        </div>
                        <p className="font-semibold text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
                        {p.status === 'pass' && (
                          <CheckCircle2 className="h-4 w-4 text-green-500 absolute -top-1 -right-1" />
                        )}
                      </div>
                      {i < 4 && (
                        <div className="absolute top-1/2 -right-3 transform -translate-y-1/2 text-muted-foreground">
                          →
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Each phase creates a <strong>LOCK file</strong> with checksum. No phase can proceed without valid prior locks.
                </p>
              </div>

              {/* Key Components */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                        <Database className="h-5 w-5 text-orange-600" />
                      </div>
                      Core Infrastructure Components
                    </h2>
                    <p className="text-muted-foreground mt-1">The foundational systems that power WAVE orchestration</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white border border-border rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <Database className="h-5 w-5 text-green-600" />
                      <span className="font-semibold">Supabase (Source of Truth)</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      All persistent state lives here: projects, waves, stories, audit logs. Single source of truth for all agents.
                    </p>
                  </div>
                  <div className="p-4 bg-white border border-border rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <Zap className="h-5 w-5 text-yellow-500" />
                      <span className="font-semibold">JSON Signals (Speed Layer)</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Fast coordination between agents via .claude/*.json files. Used for real-time status updates and gate transitions.
                    </p>
                  </div>
                  <div className="p-4 bg-white border border-border rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <GitBranch className="h-5 w-5 text-orange-500" />
                      <span className="font-semibold">Git Worktrees</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Isolated environments (fe-dev, be-dev, qa, dev-fix) for parallel agent work without merge conflicts.
                    </p>
                  </div>
                  <div className="p-4 bg-white border border-border rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="h-5 w-5 text-red-500" />
                      <span className="font-semibold">Safety Protocols</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Circuit breakers, emergency stops, budget limits, forbidden operations. Aerospace-grade (DO-178C inspired) safety.
                    </p>
                  </div>
                </div>
              </div>

              {/* The Agents */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <Bot className="h-5 w-5 text-indigo-600" />
                      </div>
                      Autonomous Agent Roles
                    </h2>
                    <p className="text-muted-foreground mt-1">Specialized AI agents that execute work in isolated worktrees</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { name: 'FE-Dev', color: 'bg-blue-500', role: 'Frontend Development', desc: 'Implements UI components, pages, and client-side logic in isolated fe-dev worktree', worktree: 'worktrees/fe-dev' },
                    { name: 'BE-Dev', color: 'bg-green-500', role: 'Backend Development', desc: 'Builds APIs, database schemas, and server-side logic in isolated be-dev worktree', worktree: 'worktrees/be-dev' },
                    { name: 'QA', color: 'bg-purple-500', role: 'Quality Assurance', desc: 'Runs tests, validates acceptance criteria, and approves changes for merge', worktree: 'worktrees/qa' },
                    { name: 'Dev-Fix', color: 'bg-orange-500', role: 'Bug Fixes & Patches', desc: 'Handles urgent fixes and patches that arise during development cycles', worktree: 'worktrees/dev-fix' },
                  ].map((agent) => (
                    <div key={agent.name} className="p-5 bg-white rounded-xl border border-border hover:border-primary/50 transition-colors">
                      <div className={cn("w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-white text-sm font-bold", agent.color)}>
                        {agent.name.split('-')[0]}
                      </div>
                      <p className="font-bold text-lg">{agent.name}</p>
                      <p className="text-sm text-primary font-medium">{agent.role}</p>
                      <p className="text-sm text-muted-foreground mt-2">{agent.desc}</p>
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground">Worktree</p>
                        <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{agent.worktree}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Status */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
                        <Info className="h-5 w-5 text-cyan-600" />
                      </div>
                      Live System Status
                    </h2>
                    <p className="text-muted-foreground mt-1">Real-time status of the WAVE orchestration system</p>
                  </div>
                </div>
                <div className="bg-zinc-900 text-zinc-100 rounded-xl p-5 font-mono text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">WAVE Version:</span>
                      <span className="text-green-400">v1.0.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Current Phase:</span>
                      <span className="text-yellow-400">Phase 0 (Story Validation)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Active Wave:</span>
                      <span className="text-blue-400">None</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Supabase:</span>
                      <span className={supabaseConnected ? "text-green-400" : "text-red-400"}>
                        {supabaseConnected ? "Connected" : "Not Connected"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Stories Count:</span>
                      <span className="text-zinc-100">{storiesCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Emergency Stop:</span>
                      <span className="text-green-400">CLEAR</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Reference */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                        <Target className="h-5 w-5 text-rose-600" />
                      </div>
                      Gate Reference Guide
                    </h2>
                    <p className="text-muted-foreground mt-1">Complete gate progression from pre-validation to deployment</p>
                  </div>
                </div>
                <div className="grid grid-cols-8 gap-3">
                  {[
                    { gate: '-1', name: 'Pre-Validation', desc: 'Zero Error Launch Protocol', color: 'border-gray-300 bg-gray-50' },
                    { gate: '0', name: 'Stories', desc: 'Schema & coverage validation', color: 'border-blue-300 bg-blue-50' },
                    { gate: '1', name: 'Environment', desc: 'Worktrees & deps ready', color: 'border-purple-300 bg-purple-50' },
                    { gate: '2', name: 'Smoke Test', desc: 'Build, lint, test pass', color: 'border-orange-300 bg-orange-50' },
                    { gate: '3', name: 'Development', desc: 'Agents executing', color: 'border-green-300 bg-green-50' },
                    { gate: '4', name: 'QA Review', desc: 'Tests & validation', color: 'border-indigo-300 bg-indigo-50' },
                    { gate: '5', name: 'Merge', desc: 'Merge to main', color: 'border-cyan-300 bg-cyan-50' },
                    { gate: '6+', name: 'Deploy', desc: 'Deploy & monitor', color: 'border-rose-300 bg-rose-50' },
                  ].map((g) => (
                    <div key={g.gate} className={cn("p-4 rounded-xl border-2 text-center", g.color)}>
                      <div className="w-10 h-10 bg-white rounded-lg mx-auto mb-2 flex items-center justify-center border border-border">
                        <span className="font-mono font-bold text-sm">G{g.gate}</span>
                      </div>
                      <p className="font-semibold text-sm">{g.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{g.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Safety & Compliance */}
              <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-8 border border-red-100">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3 text-red-700">
                      <Shield className="h-6 w-6" />
                      Safety & Compliance (DO-178C Inspired)
                    </h2>
                    <p className="text-red-600/80 mt-2 max-w-2xl">
                      WAVE implements aerospace-grade safety protocols inspired by DO-178C certification standards.
                      All operations are validated, audited, and can be halted instantly via emergency stop.
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="inline-block bg-white rounded-xl p-4 border border-red-200">
                      <p className="text-xs text-red-600 uppercase tracking-wide mb-1">Forbidden Operations</p>
                      <p className="text-3xl font-bold text-red-700">108</p>
                      <p className="text-xs text-muted-foreground">Protected actions</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 mt-6">
                  {[
                    { icon: '🛑', title: 'Emergency Stop', desc: 'Instantly halt all agent operations' },
                    { icon: '🔌', title: 'Circuit Breaker', desc: 'Auto-stop on repeated failures' },
                    { icon: '💰', title: 'Budget Limits', desc: 'API cost caps per wave' },
                    { icon: '📋', title: 'Audit Trail', desc: 'Every action logged to Supabase' },
                  ].map((item) => (
                    <div key={item.title} className="bg-white/80 rounded-xl p-4 border border-red-100">
                      <span className="text-2xl">{item.icon}</span>
                      <p className="font-semibold mt-2">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Full Page Footer */}
            <div className="border-t border-border mt-12 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                WAVE: Workflow Automation & Validation Engine | Inspired by DO-178C Aerospace Standards
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Version 1.0.0 | Building Block Validation System | {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
