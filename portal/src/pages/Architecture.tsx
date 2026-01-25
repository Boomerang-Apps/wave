import { useState } from 'react'
import {
  Bot,
  Shield,
  GitBranch,
  Layers,
  Radio,
  Target,
  ArrowRight,
  FileJson,
  Brain,
} from 'lucide-react'
import { cn } from '../lib/utils'

type TabId = 'overview' | 'agents' | 'gates' | 'domains' | 'phases' | 'approval' | 'signals' | 'rlm'

export function Architecture() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  const tabs = [
    { id: 'overview' as TabId, label: 'Overview', icon: Radio },
    { id: 'agents' as TabId, label: '7 Agents', icon: Bot },
    { id: 'gates' as TabId, label: '8 Gates', icon: Target },
    { id: 'domains' as TabId, label: 'Domains', icon: Layers },
    { id: 'phases' as TabId, label: 'Phases', icon: GitBranch },
    { id: 'approval' as TabId, label: 'Approval (L0-L5)', icon: Shield },
    { id: 'signals' as TabId, label: 'Signals', icon: FileJson },
    { id: 'rlm' as TabId, label: 'RLM', icon: Brain },
  ]

  return (
    <div className="max-w-[1440px] mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between py-4 mb-6 border-b border-border">
        <div>
          <h1 className="text-lg font-semibold">WAVE Architecture</h1>
          <p className="text-sm text-muted-foreground">Autonomous Agent Orchestration System · v1.0.0</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-green-500/15 text-green-400 rounded-full text-xs font-medium">7 Agents</span>
          <span className="px-3 py-1 bg-blue-500/15 text-blue-400 rounded-full text-xs font-medium">8 Gates</span>
          <span className="px-3 py-1 bg-purple-500/15 text-purple-400 rounded-full text-xs font-medium">DO-178C Inspired</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-muted p-1.5 rounded-2xl mb-8 inline-flex flex-wrap gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all rounded-xl',
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-8">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            {/* Hero */}
            <div className="bg-gradient-to-r from-background to-card rounded-2xl p-8 text-white">
              <div className="max-w-3xl">
                <h2 className="text-3xl font-bold mb-4">WAVE Framework</h2>
                <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                  <strong className="text-white">WAVE</strong> (Workflow Automation & Validation Engine) is an{' '}
                  <strong className="text-blue-400">Air Traffic Controller</strong> for AI agents.
                  It orchestrates 7 autonomous agents through 8 gates with aerospace-grade safety protocols.
                </p>
                <div className="flex items-center gap-4">
                  <div className="px-4 py-2 bg-card/10 rounded-lg flex items-center gap-2">
                    <Bot className="h-4 w-4 text-green-400" />
                    <span className="text-sm">7 Specialized Agents</span>
                  </div>
                  <div className="px-4 py-2 bg-card/10 rounded-lg flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-400" />
                    <span className="text-sm">8-Gate Protocol</span>
                  </div>
                  <div className="px-4 py-2 bg-card/10 rounded-lg flex items-center gap-2">
                    <Shield className="h-4 w-4 text-red-400" />
                    <span className="text-sm">108 Forbidden Ops</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-6 gap-4">
              {[
                { label: 'Agents', value: '7', color: 'bg-blue-500/10 text-blue-400' },
                { label: 'Gates', value: '8', color: 'bg-purple-500/10 text-purple-400' },
                { label: 'Phases', value: '6', color: 'bg-green-500/10 text-green-400' },
                { label: 'Approval Levels', value: '6', color: 'bg-orange-500/10 text-orange-600' },
                { label: 'Domains', value: '4', color: 'bg-cyan-500/10 text-cyan-600' },
                { label: 'Forbidden Ops', value: '108', color: 'bg-red-500/10 text-red-400' },
              ].map((stat) => (
                <div key={stat.label} className={cn("p-4 rounded-xl border border-border", stat.color.split(' ')[0])}>
                  <p className={cn("text-3xl font-bold", stat.color.split(' ')[1])}>{stat.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Architecture Diagram */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-6">System Architecture</h3>
              <div className="bg-muted rounded-xl p-6 font-mono text-sm overflow-x-auto">
                <pre className="text-zinc-700">{`
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           WAVE FRAMEWORK v2.0                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                         HUMAN LAYER (L1 Approval)                        │   │
│   │   [Green Light] ──► [Monitor Dashboard] ──► [Review & Approve]          │   │
│   └───────────────────────────────────┬─────────────────────────────────────┘   │
│                                       │                                          │
│   ┌───────────────────────────────────▼─────────────────────────────────────┐   │
│   │                         CTO AGENT (Opus 4.5)                             │   │
│   │   [Architecture] [Schema Approval] [L2 Decisions] [Escalations]         │   │
│   └───────────────────────────────────┬─────────────────────────────────────┘   │
│                                       │                                          │
│   ┌───────────────────────────────────▼─────────────────────────────────────┐   │
│   │                          PM AGENT (Opus 4.5)                             │   │
│   │   [Story Assignment] [Orchestration] [L3 Decisions] [Merge Approval]    │   │
│   └───────────────────────────────────┬─────────────────────────────────────┘   │
│                                       │                                          │
│   ┌───────────────────────────────────▼─────────────────────────────────────┐   │
│   │                        DEVELOPMENT AGENTS                                │   │
│   │                                                                          │   │
│   │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │   │
│   │   │  FE-Dev-1    │  │  FE-Dev-2    │  │  BE-Dev-1    │  │  BE-Dev-2  │  │   │
│   │   │  (Sonnet 4)  │  │  (Sonnet 4)  │  │  (Sonnet 4)  │  │ (Sonnet 4) │  │   │
│   │   │  Wave 1 FE   │  │  Wave 2 FE   │  │  Wave 1 BE   │  │ Wave 2 BE  │  │   │
│   │   └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │   │
│   │                                                                          │   │
│   └───────────────────────────────────┬─────────────────────────────────────┘   │
│                                       │                                          │
│   ┌───────────────────────────────────▼─────────────────────────────────────┐   │
│   │                          QA AGENT (Haiku 4)                              │   │
│   │   [Build] [TypeCheck] [Lint] [Test] [Acceptance Criteria] [L4 Review]   │   │
│   └───────────────────────────────────┬─────────────────────────────────────┘   │
│                                       │                                          │
│                              ┌────────▼────────┐                                 │
│                              │    Dev-Fix      │◄──── Retry Loop (max 3)        │
│                              │   (Sonnet 4)    │                                 │
│                              │   Gate 4.5      │                                 │
│                              └─────────────────┘                                 │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│   DATA LAYER                                                                     │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│   │  Supabase   │  │  Signals    │  │  Worktrees  │  │  RLM (P Variable)   │   │
│   │  (Source)   │  │  (.claude/) │  │  (Isolated) │  │  (Context Manager)  │   │
│   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
                `}</pre>
              </div>
            </div>
          </>
        )}

        {/* AGENTS TAB */}
        {activeTab === 'agents' && (
          <>
            <div className="bg-card border border-border rounded-2xl p-6 mb-6">
              <h3 className="text-xl font-bold mb-2">The 7 WAVE Agents</h3>
              <p className="text-muted-foreground">Specialized AI agents that work autonomously within their domains</p>
            </div>

            {/* Agent Hierarchy */}
            <div className="bg-gradient-to-b from-background to-card rounded-2xl p-8 text-white mb-6">
              <h4 className="text-lg font-semibold mb-6 text-muted-foreground">Agent Hierarchy</h4>
              <div className="flex flex-col items-center gap-4">
                <div className="px-6 py-3 bg-amber-500/20 border border-amber-500/50 rounded-xl text-amber-300 font-medium">
                  Human (L1 Approval)
                </div>
                <div className="w-px h-6 bg-border" />
                <div className="px-6 py-3 bg-purple-500/100/20 border border-purple-500/50 rounded-xl text-purple-300 font-medium">
                  CTO Agent (Opus 4.5) - L2
                </div>
                <div className="w-px h-6 bg-border" />
                <div className="px-6 py-3 bg-blue-500/100/20 border border-blue-500/50 rounded-xl text-blue-300 font-medium">
                  PM Agent (Opus 4.5) - L3
                </div>
                <div className="w-px h-6 bg-border" />
                <div className="flex gap-4">
                  <div className="px-4 py-2 bg-green-500/100/20 border border-green-500/50 rounded-lg text-green-300 text-sm">FE-Dev-1</div>
                  <div className="px-4 py-2 bg-green-500/100/20 border border-green-500/50 rounded-lg text-green-300 text-sm">FE-Dev-2</div>
                  <div className="px-4 py-2 bg-cyan-500/100/20 border border-cyan-500/50 rounded-lg text-cyan-300 text-sm">BE-Dev-1</div>
                  <div className="px-4 py-2 bg-cyan-500/100/20 border border-cyan-500/50 rounded-lg text-cyan-300 text-sm">BE-Dev-2</div>
                </div>
                <div className="w-px h-6 bg-border" />
                <div className="flex gap-4">
                  <div className="px-6 py-3 bg-orange-500/100/20 border border-orange-500/50 rounded-xl text-orange-300 font-medium">
                    QA Agent (Haiku 4) - L4
                  </div>
                  <div className="px-6 py-3 bg-red-500/100/20 border border-red-500/50 rounded-xl text-red-300 font-medium">
                    Dev-Fix (Gate 4.5)
                  </div>
                </div>
              </div>
            </div>

            {/* Agent Cards */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: 'CTO', model: 'Opus 4.5', role: 'Chief Technology Officer', gates: 'Pre-flight, Escalations', color: 'bg-purple-500/100', desc: 'Architecture decisions, technical oversight, schema approvals, L2 decisions' },
                { name: 'PM', model: 'Opus 4.5', role: 'Project Manager', gates: '0, 5-6, 7', color: 'bg-blue-500/100', desc: 'Story assignment, orchestration, merge approvals, L3 decisions' },
                { name: 'FE-Dev-1', model: 'Sonnet 4', role: 'Frontend Developer (Wave 1)', gates: '2-3', color: 'bg-green-500/100', desc: 'Implements Wave 1 frontend features in isolated worktree' },
                { name: 'FE-Dev-2', model: 'Sonnet 4', role: 'Frontend Developer (Wave 2)', gates: '2-3', color: 'bg-green-500', desc: 'Implements Wave 2 frontend features (may depend on Wave 1)' },
                { name: 'BE-Dev-1', model: 'Sonnet 4', role: 'Backend Developer (Wave 1)', gates: '2-3', color: 'bg-cyan-500/100', desc: 'Implements Wave 1 backend/API features in isolated worktree' },
                { name: 'BE-Dev-2', model: 'Sonnet 4', role: 'Backend Developer (Wave 2)', gates: '2-3', color: 'bg-cyan-600', desc: 'Implements Wave 2 backend/API features' },
                { name: 'QA', model: 'Haiku 4', role: 'Quality Assurance', gates: '4', color: 'bg-orange-500/100', desc: 'Validation (build, typecheck, lint, test), acceptance criteria, L4 review' },
                { name: 'Dev-Fix', model: 'Sonnet 4', role: 'Bug Fix Agent', gates: '4.5', color: 'bg-red-500/100', desc: 'Handles retry loop when QA rejects (max 3 retries before escalation)' },
              ].map((agent) => (
                <div key={agent.name} className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold", agent.color)}>
                      {agent.name.substring(0, 2)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold">{agent.name}</h4>
                        <span className="px-2 py-0.5 bg-muted rounded text-xs font-mono">{agent.model}</span>
                      </div>
                      <p className="text-sm text-primary font-medium">{agent.role}</p>
                      <p className="text-sm text-muted-foreground mt-2">{agent.desc}</p>
                      <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Active Gates:</span>
                        <span className="px-2 py-0.5 bg-blue-500/15 text-blue-400 rounded text-xs font-medium">{agent.gates}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* GATES TAB */}
        {activeTab === 'gates' && (
          <>
            <div className="bg-card border border-border rounded-2xl p-6 mb-6">
              <h3 className="text-xl font-bold mb-2">The 8-Gate Protocol</h3>
              <p className="text-muted-foreground">Sequential gates that control the flow of autonomous development</p>
            </div>

            {/* Gate Flow */}
            <div className="bg-background rounded-2xl p-8 mb-6">
              <div className="flex items-center justify-between overflow-x-auto pb-4">
                {[
                  { gate: '0', name: 'Stories', status: 'pass' },
                  { gate: '1', name: 'Planning', status: 'pass' },
                  { gate: '2', name: 'Dev', status: 'active' },
                  { gate: '3', name: 'Complete', status: 'pending' },
                  { gate: '4', name: 'QA', status: 'pending' },
                  { gate: '4.5', name: 'Fix', status: 'pending' },
                  { gate: '5-6', name: 'Review', status: 'pending' },
                  { gate: '7', name: 'Merge', status: 'pending' },
                ].map((g, i) => (
                  <div key={g.gate} className="flex items-center">
                    <div className={cn(
                      "w-16 h-16 rounded-xl flex flex-col items-center justify-center text-white font-bold transition-all",
                      g.status === 'pass' ? 'bg-green-500/100' :
                      g.status === 'active' ? 'bg-blue-500/100 ring-4 ring-blue-500/30' :
                      'bg-muted'
                    )}>
                      <span className="text-xs opacity-70">Gate</span>
                      <span className="text-lg">{g.gate}</span>
                    </div>
                    {i < 7 && (
                      <ArrowRight className="h-5 w-5 mx-2 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Gate Details */}
            <div className="space-y-4">
              {[
                { gate: '0', name: 'Story Assignment', trigger: 'PM reads stories', agent: 'PM', signal: 'signal-gate0-assignments.json', desc: 'Stories are assigned to agents based on domain and wave' },
                { gate: '1', name: 'Planning', trigger: 'Agents read stories', agent: 'All Dev', signal: '(internal)', desc: 'Agents analyze stories and plan implementation approach' },
                { gate: '2', name: 'Development', trigger: 'PM/Orchestrator', agent: 'FE/BE Dev', signal: '(ongoing)', desc: 'Agents implement features in isolated worktrees' },
                { gate: '3', name: 'Development Complete', trigger: 'FE/BE Dev', agent: 'Dev Agents', signal: 'signal-wave{N}-gate3-{agent}-complete.json', desc: 'Development agents signal completion of their stories' },
                { gate: '4', name: 'QA Validation', trigger: 'QA Agent', agent: 'QA', signal: 'signal-wave{N}-gate4-approved.json', desc: 'QA runs build, typecheck, lint, tests, validates acceptance criteria' },
                { gate: '4.5', name: 'Dev Fix (Retry)', trigger: 'Orchestrator', agent: 'Dev-Fix', signal: 'signal-wave{N}-gate4.5-fixed.json', desc: 'If QA rejects, Dev-Fix agent attempts to fix issues (max 3 retries)' },
                { gate: '5-6', name: 'Review & Merge Prep', trigger: 'PM', agent: 'PM', signal: '(internal)', desc: 'PM reviews changes and prepares for merge to main' },
                { gate: '7', name: 'Final Approval & Merge', trigger: 'PM/Orchestrator', agent: 'PM', signal: 'signal-wave{N}-gate7-merge-approved.json', desc: 'Final approval, merge to main branch, deployment trigger' },
              ].map((g) => (
                <div key={g.gate} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-blue-500/15 rounded-xl flex items-center justify-center">
                      <span className="font-bold text-blue-400">G{g.gate}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-lg">{g.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{g.desc}</p>
                      <div className="flex gap-4 mt-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Trigger: </span>
                          <span className="font-medium">{g.trigger}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Agent: </span>
                          <span className="font-medium">{g.agent}</span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{g.signal}</code>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* DOMAINS TAB */}
        {activeTab === 'domains' && (
          <>
            <div className="bg-card border border-border rounded-2xl p-6 mb-6">
              <h3 className="text-xl font-bold mb-2">Domain Architecture</h3>
              <p className="text-muted-foreground">Domain boundaries prevent cross-domain conflicts and maintain code ownership</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {[
                {
                  name: 'Frontend',
                  id: 'frontend',
                  agents: ['FE-Dev-1', 'FE-Dev-2'],
                  color: 'bg-green-500/100',
                  owned: ['src/app/** (except api)', 'src/components/**', 'src/hooks/**', 'src/styles/**', 'public/**'],
                  forbidden: ['src/app/api/**', 'prisma/**', '.env*'],
                },
                {
                  name: 'Backend',
                  id: 'backend',
                  agents: ['BE-Dev-1', 'BE-Dev-2'],
                  color: 'bg-cyan-500/100',
                  owned: ['src/app/api/**', 'src/lib/server/**', 'src/lib/db/**', 'prisma/schema.prisma'],
                  forbidden: ['src/components/**', 'src/hooks/**', 'src/styles/**'],
                },
                {
                  name: 'Shared',
                  id: 'shared',
                  agents: ['CTO'],
                  color: 'bg-purple-500/100',
                  owned: ['src/lib/types/**', 'src/lib/utils/**', 'src/lib/constants/**'],
                  forbidden: ['Domain-specific files'],
                },
                {
                  name: 'Infrastructure',
                  id: 'infrastructure',
                  agents: ['Human Only'],
                  color: 'bg-amber-500',
                  owned: ['.github/**', 'docker/**', 'terraform/**', 'CI/CD configs'],
                  forbidden: ['All agents forbidden'],
                },
              ].map((domain) => (
                <div key={domain.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className={cn("px-5 py-4 text-white", domain.color)}>
                    <h4 className="font-bold text-lg">{domain.name} Domain</h4>
                    <p className="text-white/80 text-sm">ID: {domain.id}</p>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Agents</p>
                      <div className="flex gap-2">
                        {domain.agents.map((a) => (
                          <span key={a} className="px-2 py-1 bg-muted rounded text-sm font-medium">{a}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-green-400 uppercase tracking-wide mb-2">Owned Paths</p>
                      <div className="space-y-1">
                        {domain.owned.map((p) => (
                          <code key={p} className="block text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded font-mono">{p}</code>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-red-400 uppercase tracking-wide mb-2">Forbidden Paths</p>
                      <div className="space-y-1">
                        {domain.forbidden.map((p) => (
                          <code key={p} className="block text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded font-mono">{p}</code>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* PHASES TAB */}
        {activeTab === 'phases' && (
          <>
            <div className="bg-card border border-border rounded-2xl p-6 mb-6">
              <h3 className="text-xl font-bold mb-2">Building Block Phases</h3>
              <p className="text-muted-foreground">Hard enforcement phase gates with lock files and drift detection</p>
            </div>

            <div className="space-y-4">
              {[
                { phase: '-1', name: 'Pre-Validation', validator: 'pre-validate.sh', purpose: 'Zero Error Launch Protocol', checks: ['Emergency stop clear', 'Budget available', 'Previous wave complete'] },
                { phase: '0', name: 'Story Validation', validator: 'pre-flight.sh', purpose: 'Stories, Gap Analysis, Wave Planning', checks: ['Stories valid JSON', 'Required fields present', 'No coverage gaps'] },
                { phase: '1', name: 'Infrastructure', validator: 'phase1-validator.sh', purpose: '10 Ping Tests', checks: ['Worktrees exist', 'Docker available', 'APIs reachable'] },
                { phase: '2', name: 'Smoke Test', validator: 'phase2-validator.sh', purpose: 'Build, Lint, Test', checks: ['pnpm build passes', 'TypeCheck clean', 'Tests pass'] },
                { phase: '3', name: 'Development', validator: 'phase3-validator.sh', purpose: 'Agent signals', checks: ['FE completion signal', 'BE completion signal', 'No conflicts'] },
                { phase: '4', name: 'QA/Merge', validator: 'phase4-validator.sh', purpose: 'QA approval, merge', checks: ['QA approved', 'All tests pass', 'Merged to main'] },
              ].map((p) => (
                <div key={p.phase} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-purple-500/15 rounded-xl flex items-center justify-center">
                      <span className="font-bold text-purple-400">P{p.phase}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-bold text-lg">{p.name}</h4>
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{p.validator}</code>
                      </div>
                      <p className="text-sm text-muted-foreground">{p.purpose}</p>
                      <div className="flex gap-2 mt-3">
                        {p.checks.map((c) => (
                          <span key={c} className="px-2 py-1 bg-muted/50 rounded text-xs">{c}</span>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-border">
                        <code className="text-xs text-muted-foreground font-mono">Creates: .claude/locks/phase-{p.phase}.lock</code>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* APPROVAL TAB */}
        {activeTab === 'approval' && (
          <>
            <div className="bg-card border border-border rounded-2xl p-6 mb-6">
              <h3 className="text-xl font-bold mb-2">6-Level Approval Matrix (L0-L5)</h3>
              <p className="text-muted-foreground">Aerospace-grade approval hierarchy inspired by DO-178C</p>
            </div>

            <div className="space-y-4">
              {[
                { level: 'L0', name: 'FORBIDDEN', approver: 'NONE', color: 'bg-red-500/100', desc: 'Never allowed - 108 forbidden operations', examples: ['DROP DATABASE', 'rm -rf', 'git push --force', 'cat .env'] },
                { level: 'L1', name: 'HUMAN ONLY', approver: 'Human', color: 'bg-amber-500', desc: 'Requires explicit human approval', examples: ['Merge to main', 'Database migrations', 'New dependencies', 'Production deploy'] },
                { level: 'L2', name: 'CTO APPROVAL', approver: 'CTO Agent', color: 'bg-purple-500/100', desc: 'CTO agent can approve', examples: ['New modules', 'Shared interfaces', 'API response formats', 'Schema changes'] },
                { level: 'L3', name: 'PM APPROVAL', approver: 'PM Agent', color: 'bg-blue-500/100', desc: 'PM agent can approve', examples: ['Story assignment', 'Gate transitions', 'Cross-domain coordination'] },
                { level: 'L4', name: 'QA REVIEW', approver: 'QA Agent', color: 'bg-orange-500/100', desc: 'QA agent validates', examples: ['Code quality', 'Test validation', 'Acceptance criteria'] },
                { level: 'L5', name: 'AUTO-ALLOWED', approver: 'NONE', color: 'bg-green-500/100', desc: 'Automatically allowed within domain', examples: ['Read files in domain', 'Write to assigned domain', 'Run tests', 'Commit to feature branch'] },
              ].map((l) => (
                <div key={l.level} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className={cn("px-5 py-3 text-white flex items-center justify-between", l.color)}>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-xl">{l.level}</span>
                      <span className="font-medium">{l.name}</span>
                    </div>
                    <span className="px-3 py-1 bg-card/20 rounded-full text-sm">{l.approver}</span>
                  </div>
                  <div className="p-5">
                    <p className="text-sm text-muted-foreground mb-3">{l.desc}</p>
                    <div className="flex flex-wrap gap-2">
                      {l.examples.map((e) => (
                        <code key={e} className="text-xs bg-muted px-2 py-1 rounded font-mono">{e}</code>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* SIGNALS TAB */}
        {activeTab === 'signals' && (
          <>
            <div className="bg-card border border-border rounded-2xl p-6 mb-6">
              <h3 className="text-xl font-bold mb-2">Signal Protocol</h3>
              <p className="text-muted-foreground">JSON signal files for inter-agent communication in .claude/ directory</p>
            </div>

            {/* Signal Structure */}
            <div className="bg-background rounded-xl p-6 mb-6">
              <h4 className="text-white font-semibold mb-4">Standard Signal Structure</h4>
              <pre className="text-sm text-muted-foreground font-mono">{`{
  "wave": 1,
  "gate": 3,
  "agent": "fe-dev-1",
  "status": "COMPLETE",
  "token_usage": {
    "input_tokens": 15000,
    "output_tokens": 3500,
    "total_tokens": 18500,
    "estimated_cost_usd": 0.0975,
    "model": "claude-sonnet-4-20250514"
  },
  "timestamp": "2026-01-16T10:30:00Z"
}`}</pre>
            </div>

            {/* Signal Types */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: 'Gate 3 Complete', file: 'signal-wave{N}-gate3-{agent}-complete.json', creator: 'FE/BE Dev', color: 'bg-green-500/15 text-green-400' },
                { name: 'Gate 4 Approved', file: 'signal-wave{N}-gate4-approved.json', creator: 'QA', color: 'bg-green-500/15 text-green-400' },
                { name: 'Gate 4 Rejected', file: 'signal-wave{N}-gate4-rejected.json', creator: 'QA', color: 'bg-red-500/15 text-red-400' },
                { name: 'Gate 4.5 Retry', file: 'signal-wave{N}-gate4.5-retry.json', creator: 'Orchestrator', color: 'bg-orange-500/15 text-orange-700' },
                { name: 'Gate 4.5 Fixed', file: 'signal-wave{N}-gate4.5-fixed.json', creator: 'Dev-Fix', color: 'bg-blue-500/15 text-blue-400' },
                { name: 'Gate 7 Approval', file: 'signal-wave{N}-gate7-merge-approved.json', creator: 'PM', color: 'bg-purple-500/15 text-purple-400' },
                { name: 'Escalation', file: 'signal-wave{N}-ESCALATION.json', creator: 'Orchestrator', color: 'bg-red-500/15 text-red-400' },
                { name: 'L1 Approval', file: 'signal-wave{N}-L1-APPROVAL-*.json', creator: 'Human', color: 'bg-amber-500/10 text-amber-700' },
              ].map((s) => (
                <div key={s.name} className={cn("p-4 rounded-xl", s.color)}>
                  <h5 className="font-semibold">{s.name}</h5>
                  <code className="text-xs font-mono block mt-1 opacity-80">{s.file}</code>
                  <p className="text-xs mt-2">Created by: {s.creator}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* RLM TAB */}
        {activeTab === 'rlm' && (
          <>
            <div className="bg-card border border-border rounded-2xl p-6 mb-6">
              <h3 className="text-xl font-bold mb-2">RLM Integration (Recursive Language Model)</h3>
              <p className="text-muted-foreground">Persistent context and 80-90% token reduction via the P Variable</p>
            </div>

            {/* P Variable */}
            <div className="bg-background rounded-xl p-6 mb-6">
              <h4 className="text-white font-semibold mb-4">The P Variable (.claude/P.json)</h4>
              <pre className="text-sm text-muted-foreground font-mono overflow-x-auto">{`{
  "meta": {
    "project_name": "my-app",
    "project_root": "/path/to/project",
    "generated_at": "2026-01-18T...",
    "context_hash": "src:abc123,stories:def456"
  },
  "codebase": {
    "structure": ["src/", "src/components/", ...],
    "file_count": 150,
    "source_extensions": ["ts", "tsx", "js"]
  },
  "wave_state": {
    "current_wave": 3,
    "wave_type": "FE_ONLY",
    "stories": ["AUTH-FE-001.json", ...],
    "signals": ["signal-wave3-gate3-fe-complete.json", ...]
  },
  "agent_memory": {
    "memory_dir": "/path/.claude/agent-memory",
    "available_memories": []
  }
}`}</pre>
            </div>

            {/* Query Functions */}
            <div className="bg-card border border-border rounded-xl p-6 mb-6">
              <h4 className="font-semibold mb-4">Query Functions</h4>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { func: 'peek(P, path, start, end)', desc: 'Peek at file contents by line range' },
                  { func: 'search(P, pattern)', desc: 'Search for patterns across codebase' },
                  { func: 'list_files(P, glob)', desc: 'List files matching glob pattern' },
                  { func: 'get_story(P, story_id)', desc: 'Get story details by ID' },
                  { func: 'get_memory(P, agent)', desc: 'Get agent memory and decisions' },
                  { func: 'get_constraints(P)', desc: 'Get project constraints' },
                ].map((q) => (
                  <div key={q.func} className="p-3 bg-muted/30 rounded-lg">
                    <code className="text-sm font-mono text-primary">{q.func}</code>
                    <p className="text-xs text-muted-foreground mt-1">{q.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* RLM Scripts */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h4 className="font-semibold mb-4">RLM Scripts</h4>
              <div className="space-y-2">
                {[
                  { script: 'load-project-variable.sh', desc: 'Generate P variable from project state' },
                  { script: 'query-variable.py', desc: 'Python query interface for P variable' },
                  { script: 'memory-manager.sh', desc: 'Save/load agent decisions and constraints' },
                  { script: 'snapshot-variable.sh', desc: 'Save wave snapshots for rollback' },
                  { script: 'restore-variable.sh', desc: 'Restore from previous snapshots' },
                ].map((s) => (
                  <div key={s.script} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{s.script}</code>
                    <span className="text-sm text-muted-foreground">{s.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
