import { useState } from 'react'
import { Search, Terminal, Code, Zap, Shield, GitBranch, TestTube, FileText, Clock, Layers, ChevronDown, Copy, Check, Calendar, AlertCircle, Users, CheckCircle, TrendingUp, Eye, Lock, Workflow, BarChart3, Palette, Box } from 'lucide-react'
import { cn } from '../lib/utils'

type CommandCategory =
  | 'core'
  | 'workflow'
  | 'story'
  | 'wave'
  | 'gates'
  | 'development'
  | 'git'
  | 'test'
  | 'validation'
  | 'quality'
  | 'design'
  | 'session'
  | 'agent'
  | 'strategic'
  | 'security'
  | 'performance'
  | 'specialized'

interface CommandArgument {
  name: string
  description: string
  required: boolean
}

interface CommandPhase {
  phase: string
  steps?: string[]
  description?: string
  checks?: string[]
}

interface Command {
  name: string
  description: string
  fullDescription?: string
  whenToRun?: string[]
  aliases?: string[]
  arguments?: CommandArgument[]
  category: CommandCategory
  tier?: 1 | 2 | 3
  priority?: string
  model?: string
  phases?: CommandPhase[]
  examples?: string[]
  relatedCommands?: string[]
  notes?: string[]
  lastUpdated?: string
  owner?: string
  orchestrates?: string[]
}

const COMMANDS: Command[] = [
  // TIER 1: CORE COMMANDS
  {
    name: '/go',
    description: 'Start session (preflight + status + wave-status)',
    fullDescription: 'Single command to start development session with all necessary checks and mode selection',
    whenToRun: [
      'Start of every development session',
      'After pulling changes',
      'When beginning new work'
    ],
    aliases: ['/start', '/begin'],
    category: 'core',
    tier: 1,
    priority: 'P0 (CRITICAL)',
    model: 'Sonnet',
    orchestrates: ['preflight', 'status', 'wave-status'],
    arguments: [
      { name: 'quick', description: 'Skip prompts, use defaults from last session', required: false },
      { name: 'story <id>', description: 'Start session and immediately load story', required: false },
      { name: '--no-checks', description: 'Skip health checks (use with caution)', required: false },
      { name: '--verbose', description: 'Show detailed check output', required: false }
    ],
    phases: [
      { phase: 'System Health Check', checks: ['Build status', 'Test status', 'Git status'] },
      { phase: 'Pre-flight Authorization', checks: ['GO/NO-GO decision'] },
      { phase: 'Mode Selection', checks: ['Autonomous vs Single-Thread'] },
      { phase: 'Context Loading', checks: ['Wave status', 'Available stories'] },
      { phase: 'Ready State', checks: ['Display next action'] }
    ],
    examples: [
      '/go',
      '/go quick',
      '/go story AUTH-BE-001',
      '/go --verbose'
    ],
    relatedCommands: ['/preflight', '/wave-status', '/status'],
    notes: [
      'Always run at start of session',
      'Creates .claude/signals/session-start-{timestamp}.json',
      'Interactive mode selection if Docker not available'
    ],
    lastUpdated: '2026-02-01'
  },
  {
    name: '/done',
    description: 'Complete work (story-audit + commit + gate-check)',
    fullDescription: 'Comprehensive completion orchestrator that validates work completion, runs audits, and prepares for next steps',
    whenToRun: [
      'After completing story implementation',
      'After all tests passing',
      'Before creating PR',
      'End of work session'
    ],
    aliases: ['/complete', '/finished'],
    category: 'core',
    tier: 1,
    priority: 'P0 (CRITICAL)',
    model: 'Sonnet',
    orchestrates: ['story-audit', 'commit', 'gate-check'],
    arguments: [
      { name: 'story-id', description: 'Story ID to complete', required: false },
      { name: '--skip-audit', description: 'Skip story audit (not recommended)', required: false },
      { name: '--no-commit', description: 'Skip commit creation', required: false },
      { name: '--verbose', description: 'Show detailed check output', required: false }
    ],
    phases: [
      { phase: 'Story Audit', checks: ['Schema compliance', 'AC implementation', 'Contract adherence'] },
      { phase: 'Gate Verification', checks: ['Gate status', 'Blocker identification'] },
      { phase: 'Commit Preparation', checks: ['Uncommitted changes', 'Commit message generation'] },
      { phase: 'Next Action', checks: ['Display recommended next steps'] }
    ],
    examples: [
      '/done',
      '/done AUTH-BE-001',
      '/done --verbose',
      '/done --skip-audit'
    ],
    relatedCommands: ['/story-audit', '/commit', '/gate-check', '/pr'],
    notes: [
      'Validates implementation against story definition',
      'Automatically generates commit message',
      'Identifies next gate or blocker'
    ],
    lastUpdated: '2026-02-01'
  },
  {
    name: '/end',
    description: 'End session (handoff + status + save state)',
    fullDescription: 'Session termination orchestrator that creates handoff documentation, saves state, and prepares for next session',
    whenToRun: [
      'End of work session',
      'Before switching contexts',
      'After major milestone',
      'Before extended break'
    ],
    aliases: ['/finish', '/stop'],
    category: 'session',
    tier: 1,
    priority: 'P0 (CRITICAL)',
    model: 'Sonnet',
    orchestrates: ['handoff', 'status', 'wave-status'],
    arguments: [
      { name: '--quick', description: 'Skip handoff creation', required: false },
      { name: '--save-state', description: 'Save detailed state for resume', required: false },
      { name: '--no-push', description: 'Do not push commits to remote', required: false }
    ],
    phases: [
      { phase: 'State Collection', checks: ['Work in progress', 'Uncommitted changes', 'Active blockers'] },
      { phase: 'Handoff Generation', checks: ['Session summary', 'Next actions', 'Context preservation'] },
      { phase: 'Cleanup', checks: ['Push commits', 'Update signals', 'Close logs'] }
    ],
    examples: [
      '/end',
      '/end --quick',
      '/end --save-state',
      '/end --no-push'
    ],
    relatedCommands: ['/handoff', '/go', '/status'],
    notes: [
      'Creates handoff document in .claude/handoffs/',
      'Preserves context for next session',
      'Pushes uncommitted work if approved'
    ],
    lastUpdated: '2026-02-01'
  },
  {
    name: '/agent',
    description: 'Multi-Agent Orchestration - spawn, monitor, coordinate agents',
    fullDescription: 'Manage WAVE multi-agent system with 7 specialized agent types for parallel development',
    whenToRun: [
      'When spawning domain-specific agents',
      'Monitoring active agent progress',
      'Coordinating multi-agent workflows',
      'Troubleshooting agent issues'
    ],
    aliases: ['/agents'],
    category: 'agent',
    tier: 1,
    priority: 'P1 (HIGH)',
    model: 'Sonnet',
    arguments: [
      { name: 'list', description: 'List all active agents (default)', required: false },
      { name: 'spawn <type>', description: 'Spawn a specific agent (cto, pm, fe-dev-1, fe-dev-2, be-dev-1, be-dev-2, qa)', required: false },
      { name: 'status <id>', description: 'Check agent status', required: false },
      { name: 'kill <id>', description: 'Terminate agent', required: false },
      { name: 'logs <id>', description: 'View agent logs', required: false },
      { name: 'assign <id> <story>', description: 'Assign story to agent', required: false }
    ],
    examples: [
      '/agent',
      '/agent list',
      '/agent spawn fe-dev-1',
      '/agent status agent-123',
      '/agent assign agent-123 AUTH-BE-001'
    ],
    relatedCommands: ['/escalate', '/wave-status', '/docker'],
    notes: [
      'Agent types: cto, pm, fe-dev-1, fe-dev-2, be-dev-1, be-dev-2, qa',
      'Lifecycle: SPAWNED → IDLE → ASSIGNED → WORKING → COMPLETED',
      'Blocked agents auto-escalate to human'
    ],
    lastUpdated: '2026-01-29'
  },

  // WORKFLOW ORCHESTRATION
  {
    name: '/story',
    description: 'Story execution workflow',
    fullDescription: 'Execute a story with TDD, research validation, and full traceability through all gates',
    whenToRun: [
      'Start implementing a story',
      'After Gate 0 passed for wave',
      'When story dependencies resolved'
    ],
    aliases: ['/exec-story'],
    category: 'story',
    tier: 1,
    priority: 'P0 (CRITICAL)',
    model: 'Sonnet',
    arguments: [
      { name: 'story-id', description: 'Story ID (e.g., AUTH-BE-001)', required: true },
      { name: '--tdd', description: 'Enforce strict TDD cycle', required: false },
      { name: '--skip-research', description: 'Skip research validation', required: false }
    ],
    phases: [
      { phase: 'Preparation', checks: ['Load story', 'Validate schema', 'Check dependencies'] },
      { phase: 'Branching', checks: ['Create feature branch', 'Verify workspace'] },
      { phase: 'TDD Implementation', checks: ['RED: Write test', 'GREEN: Implement', 'REFACTOR: Clean'] },
      { phase: 'Validation', checks: ['Run tests', 'Build check', 'Schema audit'] },
      { phase: 'Gates', checks: ['Gate 1-3', 'QA validation', 'Code review'] }
    ],
    examples: [
      '/story AUTH-BE-001',
      '/story UI-FE-003 --tdd',
      '/story DATA-BE-005 --skip-research'
    ],
    relatedCommands: ['/execute-story', '/tdd', '/done', '/gate-check'],
    notes: [
      'Requires .claude/config.json (run /wave-init)',
      'Story must pass research validation',
      'Creates feature branch automatically'
    ],
    lastUpdated: '2026-02-01'
  },
  {
    name: '/execute-story',
    description: 'Full Wave V2 Protocol story execution (Gate 0-7)',
    fullDescription: 'Complete story execution from Gate 0 through Gate 7 following aerospace safety protocol',
    whenToRun: [
      'Execute story with full protocol',
      'Production-critical stories',
      'When full traceability required'
    ],
    aliases: ['/exec'],
    category: 'story',
    tier: 1,
    priority: 'P0 (CRITICAL)',
    model: 'Sonnet',
    arguments: [
      { name: 'story-id', description: 'Story ID (e.g., AUTH-BE-001)', required: true }
    ],
    phases: [
      { phase: 'Phase 0: Preparation', checks: ['Load story', 'Validate schema', 'Verify research', 'Check dependencies'] },
      { phase: 'Phase 1: Branching', checks: ['Create feature branch', 'Set up tracking'] },
      { phase: 'Phase 2: TDD Implementation', checks: ['RED-GREEN-REFACTOR per AC'] },
      { phase: 'Phase 3: Gates 1-3', checks: ['Self-review', 'Build', 'Tests'] },
      { phase: 'Phase 4: Gates 4-6', checks: ['QA', 'PM', 'Architecture'] },
      { phase: 'Phase 5: Gate 7', checks: ['CTO merge approval'] }
    ],
    examples: [
      '/execute-story AUTH-BE-001',
      '/execute-story UI-FE-003'
    ],
    relatedCommands: ['/story', '/gate-check', '/done'],
    notes: [
      'Full aerospace-grade protocol',
      'All 8 gates must pass',
      'Complete traceability maintained'
    ],
    lastUpdated: '2026-01-31'
  },
  {
    name: '/wave-status',
    description: 'Progress dashboard for waves and stories',
    fullDescription: 'Real-time visibility into wave execution progress, story status, and blockers',
    whenToRun: [
      'Start of session (/go orchestrates this)',
      'Check overall progress',
      'Identify blockers',
      'Plan next work'
    ],
    aliases: ['/ws', '/progress'],
    category: 'wave',
    tier: 1,
    priority: 'P1 (HIGH)',
    model: 'Haiku',
    arguments: [
      { name: 'wave <N>', description: 'Show specific wave status', required: false },
      { name: 'all', description: 'Show all waves status', required: false }
    ],
    examples: [
      '/wave-status',
      '/wave-status wave 1',
      '/wave-status all'
    ],
    relatedCommands: ['/go', '/status', '/launch-wave'],
    notes: [
      'Shows completion percentage',
      'Identifies blockers',
      'Displays critical path'
    ],
    lastUpdated: '2026-01-31'
  },
  {
    name: '/wave-init',
    description: 'Initialize Wave V2 framework in any project',
    fullDescription: 'Set up Wave V2 aerospace safety protocol structure with auto-detection of project type',
    whenToRun: [
      'First time using Wave in a project',
      'Setting up new project',
      'Migrating to Wave V2'
    ],
    aliases: ['/init'],
    category: 'wave',
    tier: 1,
    priority: 'P1 (HIGH)',
    model: 'Sonnet',
    arguments: [
      { name: 'project-type', description: 'Project type hint (nextjs, python, go, rust)', required: false }
    ],
    phases: [
      { phase: 'Directory Structure', checks: ['.claude/, planning/, stories/, contracts/'] },
      { phase: 'Project Detection', checks: ['Detect build system', 'Detect test framework'] },
      { phase: 'Config Generation', checks: ['Create .claude/config.json'] }
    ],
    examples: [
      '/wave-init',
      '/wave-init nextjs',
      '/wave-init python'
    ],
    relatedCommands: ['/wave-start', '/preflight'],
    notes: [
      'Auto-detects project type',
      'Creates complete directory structure',
      'Generates project-specific config'
    ],
    lastUpdated: '2026-01-31'
  },
  {
    name: '/wave-start',
    description: 'Batch wave dispatch - start wave execution',
    fullDescription: 'Start multi-agent wave execution with Docker orchestration',
    whenToRun: [
      'Launch new wave with multiple stories',
      'Start parallel agent execution',
      'Begin batch processing'
    ],
    aliases: ['/start-wave'],
    category: 'wave',
    tier: 1,
    priority: 'P1 (HIGH)',
    model: 'Sonnet',
    arguments: [
      { name: 'wave <N>', description: 'Wave number to start', required: true },
      { name: '--fe-only', description: 'Frontend-only wave', required: false },
      { name: '--be-only', description: 'Backend-only wave', required: false }
    ],
    examples: [
      '/wave-start wave 1',
      '/wave-start wave 2 --fe-only'
    ],
    relatedCommands: ['/wave-status', '/agent', '/docker'],
    notes: [
      'Requires Docker running',
      'Spawns multiple agents',
      'Monitors progress automatically'
    ],
    lastUpdated: '2026-01-29'
  },
  {
    name: '/launch-wave',
    description: 'Start wave execution with orchestration',
    fullDescription: 'Launch wave with full orchestration and monitoring',
    whenToRun: [
      'Start new wave',
      'Resume paused wave',
      'Restart failed wave'
    ],
    aliases: ['/launch'],
    category: 'wave',
    tier: 1,
    priority: 'P1 (HIGH)',
    model: 'Sonnet',
    arguments: [
      { name: 'wave <N>', description: 'Wave number', required: true }
    ],
    examples: [
      '/launch-wave wave 1',
      '/launch-wave wave 2'
    ],
    relatedCommands: ['/wave-start', '/wave-status'],
    lastUpdated: '2026-01-31'
  },

  // STRATEGIC & ANALYSIS
  {
    name: '/status',
    description: 'CTO situational awareness dashboard',
    fullDescription: 'Comprehensive project health, technical debt, risks, and strategic recommendations',
    whenToRun: [
      'Start of development cycle',
      'Weekly project check',
      'Before major decisions',
      'Planning sessions'
    ],
    aliases: ['/dash', '/dashboard'],
    category: 'strategic',
    tier: 1,
    priority: 'P1 (HIGH)',
    model: 'Sonnet',
    arguments: [
      { name: 'quick', description: 'Fast summary', required: false },
      { name: 'full', description: 'Complete analysis (default)', required: false }
    ],
    examples: [
      '/status',
      '/status quick',
      '/status full'
    ],
    relatedCommands: ['/cto', '/wave-status', '/branch-health'],
    notes: [
      'Shows project health metrics',
      'Identifies technical debt',
      'Provides strategic recommendations'
    ],
    lastUpdated: '2026-02-08'
  },
  {
    name: '/cto',
    description: 'CTO advisor & strategic analysis',
    fullDescription: 'Comprehensive CTO-level analysis with project health, technical debt, risks, and execution planning',
    whenToRun: [
      'Start of new development cycle',
      'Before major releases',
      'Weekly project health check',
      'When deciding what to work on next'
    ],
    aliases: ['/advisor', '/strategy', '/recommend'],
    category: 'strategic',
    tier: 1,
    priority: 'P0 (CRITICAL)',
    model: 'Opus',
    arguments: [
      { name: 'full', description: 'Complete analysis (default)', required: false },
      { name: 'quick', description: 'Fast executive summary (~2 min)', required: false },
      { name: 'health', description: 'Project health metrics only', required: false },
      { name: 'debt', description: 'Technical debt analysis only', required: false },
      { name: 'risks', description: 'Risk assessment only', required: false },
      { name: 'roadmap', description: 'Strategic roadmap recommendations', required: false },
      { name: 'next', description: 'What should I do next?', required: false },
      { name: 'plan', description: 'Execution plan compliance check', required: false },
      { name: '--strict', description: 'Strict mode: fail on any deviation', required: false }
    ],
    phases: [
      { phase: 'Project Health', checks: ['Build status', 'Test coverage', 'Dependencies', 'Git health'] },
      { phase: 'Technical Debt', checks: ['Code quality', 'Documentation gaps', 'Test gaps'] },
      { phase: 'Risk Assessment', checks: ['Security vulnerabilities', 'Performance issues', 'Architecture concerns'] },
      { phase: 'Strategic Recommendations', checks: ['Priority actions', 'Resource allocation', 'Timeline'] }
    ],
    examples: [
      '/cto',
      '/cto quick',
      '/cto health',
      '/cto next',
      '/cto plan --strict'
    ],
    relatedCommands: ['/status', '/security', '/test', '/harden', '/wave-status', '/branch-health'],
    notes: [
      'Uses Opus model for deep analysis',
      'Provides actionable recommendations',
      'Tracks execution plan compliance'
    ],
    owner: 'CTO',
    lastUpdated: '2026-02-03'
  },
  {
    name: '/prd',
    description: 'PRD analysis & compliance verification',
    fullDescription: 'Comprehensive analysis of codebase against PRD and AI Stories, identifying gaps and missing requirements',
    whenToRun: [
      'Start of new wave/milestone',
      'Before major releases',
      'Quarterly product review',
      'After completing wave'
    ],
    aliases: ['/prd-check', '/requirements', '/compliance'],
    category: 'strategic',
    tier: 2,
    priority: 'P1 (CRITICAL)',
    model: 'Sonnet',
    arguments: [
      { name: 'full', description: 'Complete PRD analysis (default)', required: false },
      { name: 'quick', description: 'Fast compliance summary', required: false },
      { name: 'gaps', description: 'Gap analysis only', required: false },
      { name: 'stories', description: 'Story coverage analysis', required: false },
      { name: 'missing', description: 'Identify missing stories', required: false },
      { name: 'coverage', description: 'Code-to-requirements traceability', required: false },
      { name: 'drift', description: 'Detect requirement drift', required: false },
      { name: 'report', description: 'Generate formal compliance report', required: false }
    ],
    examples: [
      '/prd',
      '/prd quick',
      '/prd gaps',
      '/prd missing'
    ],
    relatedCommands: ['/cto', '/story-audit', '/trace'],
    notes: [
      'Identifies PRD vs implementation gaps',
      'Finds missing user stories',
      'Tracks requirement drift'
    ],
    lastUpdated: '2026-02-03'
  },

  // GATE COMMANDS
  {
    name: '/gate-0',
    description: 'Pre-flight authorization (CTO)',
    fullDescription: 'GO/NO-GO decision before starting wave based on readiness checks',
    whenToRun: [
      'Before starting new wave',
      'After planning complete'
    ],
    category: 'gates',
    tier: 1,
    priority: 'P0 (CRITICAL)',
    model: 'Opus',
    owner: 'CTO',
    phases: [
      { phase: 'Story Validation', checks: ['All stories have Schema V4.1', 'Research validated', 'Dependencies clear'] },
      { phase: 'System Readiness', checks: ['Docker running', 'Tests passing', 'Build green'] },
      { phase: 'Risk Assessment', checks: ['Hazards identified', 'Rollback prepared'] },
      { phase: 'GO/NO-GO Decision', checks: ['All checks pass'] }
    ],
    examples: ['/gate-0', '/gate-0 wave 1'],
    relatedCommands: ['/preflight', '/wave-init'],
    notes: [
      'Must pass before wave can start',
      'Requires CTO approval',
      'Creates signal file on pass'
    ],
    lastUpdated: '2026-02-10'
  },
  {
    name: '/gate-1',
    description: 'Self-verification (Agent)',
    fullDescription: 'Agent self-reviews implementation before proceeding',
    whenToRun: [
      'After completing story implementation',
      'Before requesting code review'
    ],
    category: 'gates',
    tier: 1,
    priority: 'P1 (HIGH)',
    model: 'Sonnet',
    owner: 'Agent',
    phases: [
      { phase: 'Contract Compliance', checks: ['Follows contracts', 'Stays in ownedPaths'] },
      { phase: 'AC Coverage', checks: ['All ACs implemented', 'Tests reference ACs'] },
      { phase: 'Code Quality', checks: ['No TODO/FIXME', 'No console.log'] }
    ],
    examples: ['/gate-1', '/gate-1 AUTH-BE-001'],
    relatedCommands: ['/story-audit', '/done'],
    lastUpdated: '2026-02-10'
  },
  {
    name: '/gate-2',
    description: 'Build verification (Agent)',
    fullDescription: 'Verify build passes with type-check and linter',
    whenToRun: [
      'After Gate 1 passes',
      'Before running tests'
    ],
    category: 'gates',
    tier: 1,
    priority: 'P1 (HIGH)',
    model: 'Haiku',
    owner: 'Agent',
    phases: [
      { phase: 'Type Check', checks: ['No TypeScript errors'] },
      { phase: 'Lint', checks: ['No linter errors'] },
      { phase: 'Production Build', checks: ['Build succeeds'] }
    ],
    examples: ['/gate-2', '/gate-2 AUTH-BE-001'],
    relatedCommands: ['/build', '/test'],
    lastUpdated: '2026-02-10'
  },
  {
    name: '/gate-3',
    description: 'Test verification (Agent)',
    fullDescription: 'Verify all tests pass with coverage thresholds met',
    whenToRun: [
      'After Gate 2 passes',
      'Before QA review'
    ],
    category: 'gates',
    tier: 1,
    priority: 'P0 (CRITICAL)',
    model: 'Sonnet',
    owner: 'Agent',
    phases: [
      { phase: 'Test Execution', checks: ['All tests pass', 'Coverage >70%'] },
      { phase: 'Test Quality', checks: ['Tests reference ACs', 'Edge cases covered'] }
    ],
    examples: ['/gate-3', '/gate-3 AUTH-BE-001'],
    relatedCommands: ['/test', '/tdd'],
    lastUpdated: '2026-02-10'
  },
  {
    name: '/gate-4',
    description: 'QA acceptance (QA Agent)',
    fullDescription: 'QA validates implementation against acceptance criteria',
    whenToRun: [
      'After Gate 3 passes',
      'Before PM review'
    ],
    category: 'gates',
    tier: 1,
    priority: 'P0 (CRITICAL)',
    model: 'Haiku',
    owner: 'QA',
    phases: [
      { phase: 'Functional Testing', checks: ['All ACs validated', 'Edge cases tested'] },
      { phase: 'Regression Testing', checks: ['No existing functionality broken'] },
      { phase: 'Acceptance', checks: ['Sign off or reject with reasons'] }
    ],
    examples: ['/gate-4', '/gate-4 AUTH-BE-001'],
    relatedCommands: ['/qa', '/test'],
    lastUpdated: '2026-02-10'
  },
  {
    name: '/gate-5',
    description: 'PM validation (PM Agent)',
    fullDescription: 'PM validates requirements met and user value delivered',
    whenToRun: [
      'After Gate 4 passes',
      'Before architecture review'
    ],
    category: 'gates',
    tier: 1,
    priority: 'P1 (HIGH)',
    model: 'Sonnet',
    owner: 'PM',
    phases: [
      { phase: 'Requirements Check', checks: ['Story requirements met', 'User value clear'] },
      { phase: 'Documentation', checks: ['User docs updated', 'Release notes drafted'] }
    ],
    examples: ['/gate-5', '/gate-5 AUTH-BE-001'],
    relatedCommands: ['/story-audit', '/prd'],
    lastUpdated: '2026-02-10'
  },
  {
    name: '/gate-6',
    description: 'Architecture review (CTO)',
    fullDescription: 'CTO reviews architecture, design patterns, and technical decisions',
    whenToRun: [
      'After Gate 5 passes',
      'Before merge approval'
    ],
    category: 'gates',
    tier: 1,
    priority: 'P1 (HIGH)',
    model: 'Opus',
    owner: 'CTO',
    phases: [
      { phase: 'Architecture Review', checks: ['Design patterns appropriate', 'Scalability considered'] },
      { phase: 'Technical Debt', checks: ['No new debt introduced', 'Existing debt addressed'] },
      { phase: 'Security & Performance', checks: ['No security concerns', 'Performance acceptable'] }
    ],
    examples: ['/gate-6', '/gate-6 AUTH-BE-001'],
    relatedCommands: ['/cto', '/security', '/perf'],
    lastUpdated: '2026-02-10'
  },
  {
    name: '/gate-7',
    description: 'Merge authorization (CTO)',
    fullDescription: 'Final CTO approval to merge to main branch',
    whenToRun: [
      'After Gate 6 passes',
      'Ready to merge to main'
    ],
    category: 'gates',
    tier: 1,
    priority: 'P0 (CRITICAL)',
    model: 'Opus',
    owner: 'CTO',
    phases: [
      { phase: 'Final Review', checks: ['All gates passed', 'No blockers'] },
      { phase: 'Merge Authorization', checks: ['Approve or reject with reasons'] }
    ],
    examples: ['/gate-7', '/gate-7 AUTH-BE-001'],
    relatedCommands: ['/pr', '/git'],
    lastUpdated: '2026-02-10'
  },
  {
    name: '/gate-check',
    description: 'Verify specific gate status',
    fullDescription: 'Check gate status for story or wave',
    whenToRun: [
      'Check gate progress',
      'Verify gate passed',
      'Debug gate failures'
    ],
    category: 'gates',
    tier: 2,
    priority: 'P2 (MEDIUM)',
    model: 'Haiku',
    arguments: [
      { name: 'gate <N>', description: 'Gate number (0-7)', required: false },
      { name: 'story-id', description: 'Story ID to check', required: false }
    ],
    examples: [
      '/gate-check',
      '/gate-check gate 3',
      '/gate-check AUTH-BE-001'
    ],
    relatedCommands: ['/gate-0', '/gate-7', '/wave-status'],
    lastUpdated: '2026-01-31'
  },
  {
    name: '/preflight',
    description: 'Pre-flight authorization checks',
    fullDescription: 'Comprehensive readiness checks before starting work',
    whenToRun: [
      'Start of session (via /go)',
      'Before starting wave',
      'After major changes'
    ],
    aliases: ['/pre-flight'],
    category: 'gates',
    tier: 1,
    priority: 'P1 (HIGH)',
    model: 'Sonnet',
    phases: [
      { phase: 'System Health', checks: ['Build green', 'Tests passing', 'Git clean'] },
      { phase: 'Dependencies', checks: ['All deps installed', 'No vulnerabilities'] },
      { phase: 'Configuration', checks: ['Env vars set', 'Config valid'] }
    ],
    examples: [
      '/preflight',
      '/preflight wave 1',
      '/preflight --verbose'
    ],
    relatedCommands: ['/go', '/gate-0', '/status'],
    notes: [
      'Orchestrated by /go',
      'GO/NO-GO decision',
      'Creates signal file'
    ],
    lastUpdated: '2026-01-31'
  },

  // QUALITY & TESTING
  {
    name: '/test',
    description: 'Test execution & coverage',
    fullDescription: 'Execute tests with coverage: unit, integration, E2E, and coverage thresholds',
    whenToRun: [
      'After implementation',
      'Before commit',
      'During TDD cycle',
      'CI validation'
    ],
    aliases: ['/tests', '/coverage', '/jest', '/vitest'],
    category: 'test',
    tier: 2,
    priority: 'P0 (CRITICAL)',
    model: 'Sonnet',
    arguments: [
      { name: 'unit', description: 'Unit tests only', required: false },
      { name: 'integration', description: 'Integration tests only', required: false },
      { name: 'e2e', description: 'E2E tests (Playwright)', required: false },
      { name: 'coverage', description: 'Generate coverage report', required: false },
      { name: 'watch', description: 'Watch mode', required: false },
      { name: '<pattern>', description: 'Run tests matching pattern', required: false },
      { name: '--ci', description: 'CI mode (strict thresholds)', required: false },
      { name: '--update', description: 'Update snapshots', required: false },
      { name: '--verbose', description: 'Verbose output', required: false }
    ],
    examples: [
      '/test',
      '/test unit',
      '/test e2e',
      '/test coverage',
      '/test --ci'
    ],
    relatedCommands: ['/tdd', '/build', '/gate-3'],
    notes: [
      'Minimum coverage: 70%',
      'Supports Vitest, Jest, Playwright',
      'CI mode fails on threshold violations'
    ],
    lastUpdated: '2026-02-01'
  },
  {
    name: '/build',
    description: 'Build validation (type-check, lint, prod build)',
    fullDescription: 'Complete build validation ensuring code is ready for commit or deployment',
    whenToRun: [
      'Before commit',
      'Before PR creation',
      'After major changes',
      'CI validation locally'
    ],
    aliases: ['/b'],
    category: 'development',
    tier: 2,
    priority: 'P2 (MEDIUM)',
    model: 'Haiku',
    arguments: [
      { name: '--type-check', description: 'Type-check only', required: false },
      { name: '--lint', description: 'Linter only', required: false },
      { name: '--prod', description: 'Production build only', required: false },
      { name: '--fix', description: 'Auto-fix lint issues', required: false },
      { name: '--verbose', description: 'Detailed output', required: false }
    ],
    examples: [
      '/build',
      '/build --type-check',
      '/build --lint --fix',
      '/build --prod'
    ],
    relatedCommands: ['/commit', '/pr', '/gate-2'],
    notes: [
      'Runs type-check, lint, and build',
      'Can auto-fix lint issues',
      'Required for Gate 2'
    ],
    lastUpdated: '2026-01-29'
  },
  {
    name: '/tdd',
    description: 'Test-Driven Development cycle guidance',
    fullDescription: 'Execute RED-GREEN-REFACTOR TDD cycle for acceptance criteria',
    whenToRun: [
      'Implementing new features',
      'When AC requires test-first',
      'Enforcing TDD discipline'
    ],
    category: 'test',
    tier: 2,
    priority: 'P1 (HIGH)',
    model: 'Sonnet',
    arguments: [
      { name: 'story-id', description: 'Story ID or Story-ID/AC{N}', required: true }
    ],
    phases: [
      { phase: 'RED', description: 'Write a failing test', checks: ['Test FAILS for right reason'] },
      { phase: 'GREEN', description: 'Write minimum code to pass', checks: ['Test PASSES'] },
      { phase: 'REFACTOR', description: 'Clean up the code', checks: ['Test still PASSES'] }
    ],
    examples: [
      '/tdd AUTH-BE-001',
      '/tdd AUTH-BE-001/AC1'
    ],
    relatedCommands: ['/test', '/story', '/execute-story'],
    notes: [
      'Enforces strict RED-GREEN-REFACTOR',
      'Test must fail before implementation',
      'All tests must reference AC IDs'
    ],
    lastUpdated: '2026-01-31'
  },
  {
    name: '/qa',
    description: 'QA validation checklist runner',
    fullDescription: 'Execute QA validation checklist against deployment (preview or production)',
    whenToRun: [
      'After PR creation',
      'After deployment to preview',
      'Before production release',
      'Regression testing'
    ],
    aliases: ['/test-qa'],
    category: 'test',
    tier: 2,
    priority: 'P0 (CRITICAL)',
    model: 'Haiku',
    arguments: [
      { name: 'url', description: 'Preview/deployment URL', required: false },
      { name: 'checklist', description: 'Path to checklist file', required: false },
      { name: '--wave <n>', description: 'Wave number', required: false },
      { name: '--report', description: 'Generate detailed report', required: false }
    ],
    examples: [
      '/qa',
      '/qa https://preview.vercel.app',
      '/qa --wave 1 --report'
    ],
    relatedCommands: ['/gate-4', '/test', '/harden'],
    notes: [
      'Auto-detects Vercel preview URL',
      'Loads checklist from .claude/',
      'Generates pass/fail report'
    ],
    lastUpdated: '2026-01-29'
  },
  {
    name: '/harden',
    description: 'Production hardening & quality gate',
    fullDescription: 'Comprehensive post-completion quality gate: security, performance, code quality, accessibility',
    whenToRun: [
      'Before PR to main',
      'Before deployment',
      'After major features',
      'Weekly on full codebase'
    ],
    aliases: ['/quality', '/production-check', '/hardening'],
    category: 'quality',
    tier: 2,
    priority: 'P0 (CRITICAL)',
    model: 'Sonnet',
    arguments: [
      { name: 'quick', description: 'Fast essential checks (~2 min)', required: false },
      { name: 'security', description: 'Security checks only', required: false },
      { name: 'performance', description: 'Performance checks only', required: false },
      { name: 'quality', description: 'Code quality checks only', required: false },
      { name: 'a11y', description: 'Accessibility checks only', required: false },
      { name: 'production', description: 'Production readiness only', required: false },
      { name: '--fix', description: 'Auto-fix what\'s possible', required: false },
      { name: '--ci', description: 'CI mode (exit codes)', required: false },
      { name: '--report', description: 'Generate HTML report', required: false }
    ],
    examples: [
      '/harden',
      '/harden quick',
      '/harden security',
      '/harden --fix',
      '/harden --ci'
    ],
    relatedCommands: ['/security', '/perf', '/a11y', '/test', '/build'],
    notes: [
      'Runs security, perf, quality, a11y',
      'Can auto-fix issues',
      'Required before production'
    ],
    lastUpdated: '2026-02-01'
  },
  {
    name: '/a11y',
    description: 'Accessibility audit (WCAG 2.1)',
    fullDescription: 'Focused accessibility analysis: WCAG compliance, screen readers, keyboard nav, color contrast',
    whenToRun: [
      'Part of /harden',
      'Standalone accessibility checks',
      'Before UI releases',
      'CI mode for failing on issues'
    ],
    aliases: ['/accessibility', '/wcag', '/aria'],
    category: 'quality',
    tier: 2,
    priority: 'P1 (HIGH)',
    model: 'Sonnet',
    arguments: [
      { name: 'contrast', description: 'Color contrast only', required: false },
      { name: 'keyboard', description: 'Keyboard navigation only', required: false },
      { name: 'aria', description: 'ARIA attributes only', required: false },
      { name: 'forms', description: 'Form accessibility only', required: false },
      { name: '--fix', description: 'Auto-fix where possible', required: false }
    ],
    examples: [
      '/a11y',
      '/a11y contrast',
      '/a11y keyboard',
      '/a11y --fix'
    ],
    relatedCommands: ['/harden', '/design-system', '/perf'],
    notes: [
      'Uses axe-core and Lighthouse',
      'WCAG 2.1 Level AA required',
      'Can auto-fix some issues'
    ],
    lastUpdated: '2026-02-01'
  },
  {
    name: '/perf',
    description: 'Performance analysis (Lighthouse, bundle, vitals)',
    fullDescription: 'Focused performance analysis: bundle size, Lighthouse scores, Core Web Vitals',
    whenToRun: [
      'Part of /harden',
      'After UI changes',
      'Before releases',
      'Performance optimization'
    ],
    aliases: ['/performance', '/lighthouse', '/bundle'],
    category: 'performance',
    tier: 2,
    priority: 'P1 (HIGH)',
    model: 'Sonnet',
    arguments: [
      { name: 'bundle', description: 'Bundle size analysis only', required: false },
      { name: 'lighthouse', description: 'Lighthouse CI only', required: false },
      { name: 'vitals', description: 'Core Web Vitals only', required: false },
      { name: 'images', description: 'Image optimization check', required: false },
      { name: '--fix', description: 'Auto-optimize images', required: false }
    ],
    examples: [
      '/perf',
      '/perf bundle',
      '/perf lighthouse',
      '/perf --fix'
    ],
    relatedCommands: ['/harden', '/a11y', '/build'],
    notes: [
      'Bundle size threshold: <300KB gzipped',
      'Lighthouse: >90 score required',
      'Checks LCP, FID, CLS'
    ],
    lastUpdated: '2026-02-01'
  },
  {
    name: '/security',
    description: 'Security scan (deps, secrets, OWASP)',
    fullDescription: 'Focused security analysis: dependency vulnerabilities, secret detection, OWASP patterns',
    whenToRun: [
      'Part of /harden',
      'Before deployments',
      'Weekly security audits',
      'After dependency updates'
    ],
    aliases: ['/sec', '/audit-security', '/vuln'],
    category: 'security',
    tier: 2,
    priority: 'P1 (HIGH)',
    model: 'Sonnet',
    arguments: [
      { name: 'deps', description: 'Dependency vulnerabilities only', required: false },
      { name: 'secrets', description: 'Secret detection only', required: false },
      { name: 'owasp', description: 'OWASP pattern check only', required: false },
      { name: 'headers', description: 'HTTP security headers only', required: false },
      { name: '--fix', description: 'Auto-fix where possible', required: false }
    ],
    examples: [
      '/security',
      '/security deps',
      '/security secrets',
      '/security --fix'
    ],
    relatedCommands: ['/harden', '/keys', '/ci'],
    notes: [
      'Uses npm audit, gitleaks, semgrep',
      '0 critical/high vulnerabilities allowed',
      'Checks SQL injection, XSS, auth patterns'
    ],
    lastUpdated: '2026-02-01'
  },

  // GIT OPERATIONS
  {
    name: '/git',
    description: 'Git operations suite (status, sync, cleanup)',
    fullDescription: 'Comprehensive git operations with safety checks: status, sync, stash, undo, log, diff',
    whenToRun: [
      'Check git status',
      'Sync with remote',
      'Clean up repository',
      'Enhanced git operations'
    ],
    aliases: ['/g', '/repo'],
    category: 'git',
    tier: 2,
    priority: 'P1 (HIGH)',
    model: 'Sonnet',
    arguments: [
      { name: 'status', description: 'Detailed status with recommendations', required: false },
      { name: 'sync', description: 'Sync with remote (fetch + rebase)', required: false },
      { name: 'cleanup', description: 'Clean up local repository', required: false },
      { name: 'stash [action]', description: 'Stash management', required: false },
      { name: 'undo [action]', description: 'Undo operations safely', required: false },
      { name: 'log [scope]', description: 'Enhanced log views', required: false },
      { name: 'diff [scope]', description: 'Enhanced diff views', required: false },
      { name: 'blame <file>', description: 'Annotated blame', required: false }
    ],
    examples: [
      '/git',
      '/git status',
      '/git sync',
      '/git cleanup',
      '/git stash',
      '/git log'
    ],
    relatedCommands: ['/branch', '/commit', '/pr', '/branch-health'],
    notes: [
      'Enhanced git with safety checks',
      'Provides recommendations',
      'Simplifies complex operations'
    ],
    lastUpdated: '2026-02-01'
  },
  {
    name: '/branch',
    description: 'Git branching operations',
    fullDescription: 'Manage feature branches following Wave V2 conventions with workspace branches',
    whenToRun: [
      'Creating feature branches',
      'Switching branches',
      'Checking branch status',
      'Cleaning up branches'
    ],
    category: 'git',
    tier: 2,
    priority: 'P1 (HIGH)',
    model: 'Sonnet',
    arguments: [
      { name: 'create <story-id>', description: 'Create feature branch', required: false },
      { name: 'switch <story-id>', description: 'Switch to feature branch', required: false },
      { name: 'status', description: 'Branch status', required: false },
      { name: 'cleanup', description: 'Clean up merged branches', required: false }
    ],
    examples: [
      '/branch create AUTH-BE-001',
      '/branch switch AUTH-BE-001',
      '/branch status',
      '/branch cleanup'
    ],
    relatedCommands: ['/git', '/commit', '/pr', '/branch-health'],
    notes: [
      'Uses workspace branches',
      'Feature branch format: feature/{STORY-ID}',
      'Auto-tracks remote'
    ],
    lastUpdated: '2026-01-29'
  },
  {
    name: '/branch-health',
    description: 'Branch health analysis (stale, PRs, drift)',
    fullDescription: 'Comprehensive repository branch health: stale branches, PR status, merge readiness, drift detection',
    whenToRun: [
      'Part of /preflight',
      'Weekly maintenance',
      'Before PRs',
      'Repository cleanup'
    ],
    aliases: ['/bh', '/branch-audit', '/repo-health'],
    category: 'git',
    tier: 2,
    priority: 'P1 (HIGH)',
    model: 'Sonnet',
    arguments: [
      { name: 'stale', description: 'Stale branch detection only', required: false },
      { name: 'prs', description: 'PR status analysis only', required: false },
      { name: 'drift', description: 'Branch drift analysis only', required: false },
      { name: 'metrics', description: 'Team metrics only', required: false },
      { name: '--cleanup', description: 'Generate cleanup recommendations', required: false },
      { name: '--fix', description: 'Auto-cleanup (with confirmation)', required: false }
    ],
    examples: [
      '/branch-health',
      '/branch-health stale',
      '/branch-health prs',
      '/branch-health --cleanup'
    ],
    relatedCommands: ['/branch', '/git', '/pr', '/ci'],
    notes: [
      'Detects stale branches (>30 days)',
      'Analyzes PR status',
      'Identifies drift from main'
    ],
    lastUpdated: '2026-02-01'
  },
  {
    name: '/commit',
    description: 'Standardized git commit',
    fullDescription: 'Create standardized commits with enforced format, story ID linking, and co-author attribution',
    whenToRun: [
      'After completing logical unit of work',
      'Before switching tasks',
      'After passing local tests',
      'Before creating PR'
    ],
    aliases: ['/c'],
    category: 'git',
    tier: 1,
    priority: 'P1 (HIGH)',
    model: 'Haiku',
    arguments: [
      { name: 'message', description: 'Commit description', required: false },
      { name: '--story', description: 'Story ID', required: false },
      { name: '--no-verify', description: 'Skip pre-commit hooks', required: false },
      { name: '--amend', description: 'Amend previous commit', required: false }
    ],
    examples: [
      '/commit',
      '/commit "Add login validation"',
      '/commit --story AUTH-BE-001',
      '/commit --amend'
    ],
    relatedCommands: ['/pr', '/build', '/test', '/done'],
    notes: [
      'Format: <type>(<story-id>): <description>',
      'Auto-detects story ID from branch',
      'Adds Co-Authored-By attribution'
    ],
    lastUpdated: '2026-01-29'
  },
  {
    name: '/pr',
    description: 'Create pull request',
    fullDescription: 'Create PR with standardized format, summary from commits, test plan from ACs',
    whenToRun: [
      'After story implementation complete',
      'After all tests passing',
      'After local validation',
      'Before requesting code review'
    ],
    aliases: ['/pull-request'],
    category: 'git',
    tier: 1,
    priority: 'P1 (HIGH)',
    model: 'Haiku',
    arguments: [
      { name: '--base', description: 'Target branch (main or staging)', required: false },
      { name: '--title', description: 'PR title', required: false },
      { name: '--draft', description: 'Create as draft PR', required: false },
      { name: '--no-push', description: 'Create PR without pushing', required: false }
    ],
    examples: [
      '/pr',
      '/pr --base main',
      '/pr --draft',
      '/pr --title "Add authentication"'
    ],
    relatedCommands: ['/commit', '/build', '/test', '/done'],
    notes: [
      'Auto-generates title and description',
      'Includes test plan from ACs',
      'Links to story and issues'
    ],
    lastUpdated: '2026-01-29'
  },
  {
    name: '/ci',
    description: 'CI/CD pipeline validation',
    fullDescription: 'Validate CI config, check pipeline status, simulate CI runs locally',
    whenToRun: [
      'Part of /harden',
      'Before PRs',
      'Troubleshooting CI failures',
      'After CI config changes'
    ],
    aliases: ['/cicd', '/pipeline', '/actions', '/workflow'],
    category: 'development',
    tier: 2,
    priority: 'P1 (HIGH)',
    model: 'Sonnet',
    arguments: [
      { name: 'check', description: 'Verify CI config exists and valid', required: false },
      { name: 'status', description: 'Show GitHub Actions status', required: false },
      { name: 'validate', description: 'Validate workflow YAML files', required: false },
      { name: 'run [workflow]', description: 'Trigger workflow manually', required: false },
      { name: 'logs [run-id]', description: 'View workflow run logs', required: false },
      { name: 'badge', description: 'Generate status badges', required: false },
      { name: 'local', description: 'Run CI checks locally', required: false }
    ],
    examples: [
      '/ci',
      '/ci check',
      '/ci status',
      '/ci local'
    ],
    relatedCommands: ['/test', '/build', '/harden', '/gate-2'],
    notes: [
      'Validates GitHub Actions YAML',
      'Can run checks locally',
      'Shows pipeline status'
    ],
    lastUpdated: '2026-02-01'
  },

  // DESIGN & UI
  {
    name: '/design-system',
    description: 'Design system management (tokens, Storybook)',
    fullDescription: 'Comprehensive design system management: detect systems, validate consistency, sync to Storybook',
    whenToRun: [
      'After design updates',
      'Syncing tokens to Storybook',
      'Design system audit',
      'Component consistency check'
    ],
    aliases: ['/ds', '/tokens'],
    category: 'design',
    tier: 2,
    priority: 'P2 (MEDIUM)',
    model: 'Sonnet',
    arguments: [
      { name: 'detect', description: 'Detect design systems in use', required: false },
      { name: 'audit', description: 'Full consistency audit', required: false },
      { name: 'sync storybook', description: 'Sync tokens to Storybook theme', required: false },
      { name: 'storybook', description: 'Generate component stories', required: false },
      { name: 'init', description: 'Initialize design system structure', required: false },
      { name: 'validate', description: 'Validate tokens and components', required: false },
      { name: 'sync mockups', description: 'Sync from mockup files', required: false }
    ],
    examples: [
      '/design-system detect',
      '/design-system audit',
      '/design-system sync storybook'
    ],
    relatedCommands: ['/ui-trace', '/design-verify', '/a11y'],
    notes: [
      'Detects shadcn/ui, Tailwind, Radix UI',
      'Syncs tokens to Storybook',
      'Validates consistency'
    ],
    lastUpdated: '2026-02-01'
  },
  {
    name: '/design-verify',
    description: 'Visual design-to-code validation',
    fullDescription: 'Validate implementation matches design mockups and specifications',
    whenToRun: [
      'After UI implementation',
      'Before designer review',
      'Design QA'
    ],
    category: 'design',
    tier: 2,
    priority: 'P2 (MEDIUM)',
    model: 'Sonnet',
    examples: [
      '/design-verify',
      '/design-verify --story AUTH-BE-001'
    ],
    relatedCommands: ['/design-system', '/ui-trace', '/a11y'],
    lastUpdated: '2026-02-01'
  },
  {
    name: '/ui-trace',
    description: 'UI story to component traceability',
    fullDescription: 'Validate bidirectional traceability: AI UI Stories ↔ Storybook components',
    whenToRun: [
      'After UI story implementation',
      'Storybook coverage audit',
      'Component documentation gap analysis'
    ],
    aliases: ['/component-trace', '/storybook-trace'],
    category: 'design',
    tier: 2,
    priority: 'P2 (MEDIUM)',
    model: 'Sonnet',
    arguments: [
      { name: 'stories', description: 'Only check story → component refs', required: false },
      { name: 'components', description: 'Only check component → Storybook coverage', required: false },
      { name: 'wave <N>', description: 'Trace only Wave N UI stories', required: false },
      { name: '--fix', description: 'Generate missing stories/components list', required: false }
    ],
    examples: [
      '/ui-trace',
      '/ui-trace stories',
      '/ui-trace components',
      '/ui-trace wave 1'
    ],
    relatedCommands: ['/design-system', '/story-audit', '/trace'],
    notes: [
      'Checks story → component references',
      'Validates component → Storybook coverage',
      'Identifies orphaned stories'
    ],
    lastUpdated: '2026-02-01'
  },

  // DEVELOPMENT TOOLS
  {
    name: '/docker',
    description: 'WAVE container management',
    fullDescription: 'Manage WAVE Docker containers: Redis, Dozzle, orchestrator, agent images',
    whenToRun: [
      'Session start (check status)',
      'Troubleshooting connections',
      'Deploying orchestrator',
      'Building agent images'
    ],
    aliases: ['/dk'],
    category: 'development',
    tier: 2,
    priority: 'P1 (HIGH)',
    model: 'Haiku',
    arguments: [
      { name: 'status', description: 'Show all container status (default)', required: false },
      { name: 'ready', description: 'Full readiness check with dependencies', required: false },
      { name: 'start', description: 'Start all WAVE containers', required: false },
      { name: 'stop', description: 'Stop all WAVE containers', required: false },
      { name: 'restart', description: 'Restart all containers', required: false },
      { name: 'logs <container>', description: 'View container logs', required: false },
      { name: 'build', description: 'Build agent Docker image', required: false },
      { name: 'deploy', description: 'Deploy orchestrator', required: false }
    ],
    examples: [
      '/docker',
      '/docker ready',
      '/docker start',
      '/docker logs orchestrator'
    ],
    relatedCommands: ['/agent', '/wave-start', '/preflight'],
    notes: [
      'Manages Redis, Dozzle, orchestrator',
      'Checks image, dependencies, connectivity',
      'Required for multi-agent execution'
    ],
    lastUpdated: '2026-02-01'
  },
  {
    name: '/keys',
    description: 'Credential validation & setup',
    fullDescription: 'Comprehensive credential management: audit, validate connectivity, guide setup',
    whenToRun: [
      'Session start',
      'After adding new services',
      'Troubleshooting API errors',
      'Setting up project'
    ],
    aliases: ['/creds', '/credentials', '/apikeys'],
    category: 'development',
    tier: 2,
    priority: 'P1 (HIGH)',
    model: 'Haiku',
    arguments: [
      { name: 'audit', description: 'Compare .env.example vs actual (default)', required: false },
      { name: 'validate', description: 'Test actual API connectivity', required: false },
      { name: 'setup', description: 'Interactive guide for missing keys', required: false },
      { name: '--quick', description: 'Just show set/unset, no API calls', required: false },
      { name: '--verbose', description: 'Show detailed validation info', required: false }
    ],
    examples: [
      '/keys',
      '/keys audit',
      '/keys validate',
      '/keys setup'
    ],
    relatedCommands: ['/preflight', '/security', '/docker'],
    notes: [
      'Compares .env.example with actual env',
      'Tests API connectivity',
      'Provides setup guidance'
    ],
    lastUpdated: '2026-02-01'
  },
  {
    name: '/fix',
    description: 'Research-driven fix protocol',
    fullDescription: 'Systematic bug fix protocol with research, root cause analysis, and validation',
    whenToRun: [
      'Fixing bugs',
      'Troubleshooting issues',
      'Error investigation',
      'Systematic debugging'
    ],
    category: 'development',
    tier: 1,
    priority: 'P1 (HIGH)',
    model: 'Sonnet',
    arguments: [
      { name: 'description', description: 'Bug description or error message', required: true }
    ],
    phases: [
      { phase: 'Research', checks: ['Gather error context', 'Review logs', 'Check related code'] },
      { phase: 'Root Cause Analysis', checks: ['Identify root cause', 'Reproduce issue'] },
      { phase: 'Fix Implementation', checks: ['Implement fix', 'Add tests'] },
      { phase: 'Validation', checks: ['Verify fix works', 'No regression'] }
    ],
    examples: [
      '/fix "Login fails with 500 error"',
      '/fix "UI crashes on mobile"'
    ],
    relatedCommands: ['/test', '/debug', '/trace'],
    notes: [
      'Systematic debugging approach',
      'Requires root cause analysis',
      'Must add regression tests'
    ],
    lastUpdated: '2026-02-10'
  },

  // DOCUMENTATION & TRACKING
  {
    name: '/story-audit',
    description: 'Post-completion Schema V4.1 compliance',
    fullDescription: 'Verify completed story implementations match Schema V4.1 definitions',
    whenToRun: [
      'After marking stories complete',
      'Before Gate 5 (PM Validation)',
      'Before Gate 7 (Merge)',
      'End of wave review'
    ],
    category: 'validation',
    tier: 2,
    priority: 'P1 (HIGH)',
    model: 'Sonnet',
    arguments: [
      { name: 'wave <N>', description: 'All completed stories in wave N', required: false },
      { name: 'wave all', description: 'All completed stories across all waves', required: false },
      { name: '<story-id>', description: 'Specific story', required: false },
      { name: 'recent', description: 'Stories completed in last 7 days', required: false },
      { name: 'today', description: 'Stories completed today', required: false }
    ],
    examples: [
      '/story-audit',
      '/story-audit wave 1',
      '/story-audit AUTH-BE-001',
      '/story-audit recent'
    ],
    relatedCommands: ['/done', '/schema-validate', '/gate-5'],
    notes: [
      'Post-implementation audit',
      'Validates implementation matches story',
      'Different from /schema-validate (pre-implementation)'
    ],
    lastUpdated: '2026-02-01'
  },
  {
    name: '/story-create',
    description: 'Create new AI story',
    fullDescription: 'Create new AI story following Schema V4.1',
    whenToRun: [
      'Adding new user story',
      'Planning new features',
      'Breaking down epics'
    ],
    category: 'story',
    tier: 2,
    priority: 'P2 (MEDIUM)',
    model: 'Sonnet',
    examples: [
      '/story-create',
      '/story-create --template auth'
    ],
    relatedCommands: ['/schema-validate', '/story', '/prd'],
    lastUpdated: '2026-01-31'
  },
  {
    name: '/schema-validate',
    description: 'AI story Schema V4.1 validation',
    fullDescription: 'Validate story JSON structure against Schema V4.1 before implementation',
    whenToRun: [
      'Before implementing story',
      'After creating new story',
      'Before Gate 0',
      'Story file validation'
    ],
    category: 'validation',
    tier: 2,
    priority: 'P1 (HIGH)',
    model: 'Haiku',
    arguments: [
      { name: 'story-id', description: 'Story ID or path to story JSON', required: true }
    ],
    examples: [
      '/schema-validate AUTH-BE-001',
      '/schema-validate stories/wave1/AUTH-BE-001.json'
    ],
    relatedCommands: ['/story-audit', '/story-create', '/validate-research'],
    notes: [
      'Pre-implementation validation',
      'Checks JSON structure only',
      'Different from /story-audit (post-implementation)'
    ],
    lastUpdated: '2026-01-31'
  },
  {
    name: '/validate-research',
    description: 'Validate story research (PFC-K)',
    fullDescription: 'Validate story research phase completion and quality',
    whenToRun: [
      'After research phase',
      'Before implementation',
      'Gate 0 prerequisite'
    ],
    category: 'validation',
    tier: 2,
    priority: 'P1 (HIGH)',
    model: 'Sonnet',
    arguments: [
      { name: 'story-id', description: 'Story ID', required: true }
    ],
    examples: [
      '/validate-research AUTH-BE-001'
    ],
    relatedCommands: ['/research', '/schema-validate', '/gate-0'],
    lastUpdated: '2026-01-31'
  },
  {
    name: '/research',
    description: 'Validate story research (PFC-K)',
    fullDescription: 'Execute research phase for story with PFC-K methodology',
    whenToRun: [
      'Before story implementation',
      'Understanding requirements',
      'Technical discovery'
    ],
    category: 'validation',
    tier: 2,
    priority: 'P1 (HIGH)',
    model: 'Sonnet',
    arguments: [
      { name: 'story-id', description: 'Story ID', required: true }
    ],
    examples: [
      '/research AUTH-BE-001'
    ],
    relatedCommands: ['/validate-research', '/story', '/execute-story'],
    lastUpdated: '2026-01-31'
  },
  {
    name: '/trace',
    description: 'View/update traceability matrix',
    fullDescription: 'Maintain traceability matrix linking requirements to implementation',
    whenToRun: [
      'After story completion',
      'Traceability audit',
      'Compliance reporting'
    ],
    category: 'validation',
    tier: 2,
    priority: 'P2 (MEDIUM)',
    model: 'Sonnet',
    arguments: [
      { name: 'view', description: 'View traceability matrix', required: false },
      { name: 'update', description: 'Update traceability matrix', required: false },
      { name: 'story-id', description: 'Specific story', required: false }
    ],
    examples: [
      '/trace',
      '/trace view',
      '/trace update AUTH-BE-001'
    ],
    relatedCommands: ['/ui-trace', '/story-audit', '/prd'],
    lastUpdated: '2026-01-31'
  },
  {
    name: '/report',
    description: 'Progress report generation',
    fullDescription: 'Generate progress reports for stakeholders',
    whenToRun: [
      'End of sprint',
      'Weekly status update',
      'Stakeholder reporting'
    ],
    category: 'session',
    tier: 2,
    priority: 'P2 (MEDIUM)',
    model: 'Sonnet',
    arguments: [
      { name: 'wave <N>', description: 'Wave number', required: false },
      { name: 'daily', description: 'Daily report', required: false },
      { name: 'weekly', description: 'Weekly report', required: false }
    ],
    examples: [
      '/report',
      '/report wave 1',
      '/report weekly'
    ],
    relatedCommands: ['/wave-status', '/status', '/handoff'],
    lastUpdated: '2026-01-29'
  },
  {
    name: '/handoff',
    description: 'Session handoff generator',
    fullDescription: 'Create handoff documentation preserving context for next session',
    whenToRun: [
      'End of session (via /end)',
      'Before extended break',
      'Context preservation'
    ],
    category: 'session',
    tier: 1,
    priority: 'P1 (HIGH)',
    model: 'Sonnet',
    examples: [
      '/handoff',
      '/handoff --quick'
    ],
    relatedCommands: ['/end', '/go', '/status'],
    notes: [
      'Orchestrated by /end',
      'Creates .claude/handoffs/ document',
      'Preserves full context'
    ],
    lastUpdated: '2026-01-31'
  },

  // SPECIALIZED COMMANDS
  {
    name: '/anomaly',
    description: 'Report an anomaly',
    fullDescription: 'Document defects, issues, unexpected behavior for tracking and resolution',
    whenToRun: [
      'During development when issues discovered',
      'During testing',
      'Bug reporting'
    ],
    category: 'specialized',
    tier: 2,
    priority: 'P2 (MEDIUM)',
    model: 'Haiku',
    arguments: [
      { name: 'story-id summary', description: 'Story ID and summary', required: true }
    ],
    examples: [
      '/anomaly AUTH-BE-001 "Login fails with special chars"'
    ],
    relatedCommands: ['/fix', '/test', '/gate-4'],
    notes: [
      'Classifications: Critical, Major, Minor, Trivial',
      'Tracked in anomaly log',
      'Must be resolved before merge'
    ],
    lastUpdated: '2026-01-31'
  },
  {
    name: '/escalate',
    description: 'Auto-escalation to human',
    fullDescription: 'Escalate blocked work or complex decisions to human oversight',
    whenToRun: [
      'Agent blocked',
      'Complex decisions required',
      'Ambiguous requirements',
      'Permission needed'
    ],
    category: 'specialized',
    tier: 2,
    priority: 'P1 (HIGH)',
    model: 'Sonnet',
    arguments: [
      { name: 'reason', description: 'Reason for escalation', required: true }
    ],
    examples: [
      '/escalate "Unclear AC requirements"',
      '/escalate "Need architecture decision"'
    ],
    relatedCommands: ['/agent', '/cto', '/status'],
    notes: [
      'Pauses work until resolved',
      'Creates escalation signal',
      'Notifies appropriate owner'
    ],
    lastUpdated: '2026-01-29'
  },
  {
    name: '/gap-analysis',
    description: 'Identify missing requirements and gaps',
    fullDescription: 'Analyze gaps between requirements and implementation',
    whenToRun: [
      'After wave completion',
      'Before major release',
      'Requirements review'
    ],
    category: 'specialized',
    tier: 2,
    priority: 'P2 (MEDIUM)',
    model: 'Sonnet',
    examples: [
      '/gap-analysis',
      '/gap-analysis wave 1'
    ],
    relatedCommands: ['/prd', '/story-audit', '/trace'],
    lastUpdated: '2026-01-31'
  },
  {
    name: '/hazard',
    description: 'Analyze story hazards',
    fullDescription: 'Identify and analyze potential hazards and risks in story',
    whenToRun: [
      'During planning',
      'Before implementation',
      'Risk assessment'
    ],
    category: 'specialized',
    tier: 2,
    priority: 'P2 (MEDIUM)',
    model: 'Sonnet',
    arguments: [
      { name: 'story-id', description: 'Story ID', required: true }
    ],
    examples: [
      '/hazard AUTH-BE-001'
    ],
    relatedCommands: ['/gate-0', '/safety', '/security'],
    lastUpdated: '2026-01-31'
  },
  {
    name: '/protocol-verify',
    description: 'Wave V2 compliance verification',
    fullDescription: 'Verify full Wave V2 protocol compliance',
    whenToRun: [
      'End of wave',
      'Before major release',
      'Compliance audit'
    ],
    category: 'specialized',
    tier: 2,
    priority: 'P2 (MEDIUM)',
    model: 'Sonnet',
    examples: [
      '/protocol-verify',
      '/protocol-verify wave 1'
    ],
    relatedCommands: ['/wave-status', '/gate-check', '/story-audit'],
    lastUpdated: '2026-01-31'
  },
  {
    name: '/rearchitect',
    description: 'Analyze and reorganize folder structure',
    fullDescription: 'Analyze current architecture and propose reorganization',
    whenToRun: [
      'Major refactoring',
      'Architecture review',
      'Technical debt cleanup'
    ],
    category: 'specialized',
    tier: 2,
    priority: 'P2 (MEDIUM)',
    model: 'Opus',
    examples: [
      '/rearchitect',
      '/rearchitect --analyze-only'
    ],
    relatedCommands: ['/cto', '/gate-6', '/gap-analysis'],
    lastUpdated: '2026-01-31'
  },
  {
    name: '/rlm',
    description: 'Token budget & learning monitor',
    fullDescription: 'Monitor token usage and learning patterns',
    whenToRun: [
      'Session monitoring',
      'Cost tracking',
      'Learning analysis'
    ],
    category: 'specialized',
    tier: 2,
    priority: 'P3 (LOW)',
    model: 'Haiku',
    examples: [
      '/rlm',
      '/rlm session',
      '/rlm wave 1'
    ],
    relatedCommands: ['/rlm-verify', '/status'],
    lastUpdated: '2026-01-29'
  },
  {
    name: '/rlm-verify',
    description: 'Requirements lifecycle management verification',
    fullDescription: 'Verify requirements lifecycle management compliance',
    whenToRun: [
      'Requirements audit',
      'Compliance check',
      'RLM validation'
    ],
    category: 'specialized',
    tier: 2,
    priority: 'P2 (MEDIUM)',
    model: 'Sonnet',
    examples: [
      '/rlm-verify',
      '/rlm-verify wave 1'
    ],
    relatedCommands: ['/rlm', '/prd', '/trace'],
    lastUpdated: '2026-01-31'
  },
  {
    name: '/rollback',
    description: 'Execute rollback procedure',
    fullDescription: 'Execute emergency rollback with safety checks',
    whenToRun: [
      'Production incident',
      'Failed deployment',
      'Emergency rollback needed'
    ],
    category: 'specialized',
    tier: 2,
    priority: 'P0 (CRITICAL)',
    model: 'Sonnet',
    arguments: [
      { name: 'target', description: 'Rollback target (commit/tag)', required: true }
    ],
    examples: [
      '/rollback v1.2.3',
      '/rollback abc123'
    ],
    relatedCommands: ['/safety', '/gate-7', '/deploy'],
    notes: [
      'Emergency use only',
      'Requires approval',
      'Creates rollback report'
    ],
    lastUpdated: '2026-01-31'
  },
  {
    name: '/safety',
    description: 'Constitutional AI check',
    fullDescription: 'Verify Constitutional AI safety compliance',
    whenToRun: [
      'Before deployment',
      'Safety audit',
      'Compliance check'
    ],
    category: 'specialized',
    tier: 2,
    priority: 'P1 (HIGH)',
    model: 'Opus',
    examples: [
      '/safety',
      '/safety audit'
    ],
    relatedCommands: ['/security', '/gate-0', '/harden'],
    lastUpdated: '2026-01-29'
  }
]

// Category icon mapping
const categoryIcons: Record<CommandCategory, any> = {
  core: Zap,
  workflow: Workflow,
  story: FileText,
  wave: Layers,
  gates: CheckCircle,
  development: Code,
  git: GitBranch,
  test: TestTube,
  validation: Shield,
  quality: TrendingUp,
  design: Palette,
  session: Clock,
  agent: Users,
  strategic: Eye,
  security: Lock,
  performance: BarChart3,
  specialized: Box
}

// Category labels
const categoryLabels: Record<CommandCategory, string> = {
  core: 'Core',
  workflow: 'Workflow',
  story: 'Story',
  wave: 'Wave',
  gates: 'Gates',
  development: 'Development',
  git: 'Git',
  test: 'Testing',
  validation: 'Validation',
  quality: 'Quality',
  design: 'Design',
  session: 'Session',
  agent: 'Agent',
  strategic: 'Strategic',
  security: 'Security',
  performance: 'Performance',
  specialized: 'Specialized'
}

export function CommandsReference() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<CommandCategory | 'all' | 'important'>('all')
  const [expandedCommands, setExpandedCommands] = useState<Set<string>>(new Set())
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null)
  const [copiedExample, setCopiedExample] = useState<string | null>(null)

  // Important commands for essential workflows
  const importantCommandNames = [
    '/wave-status', '/status', '/gate-0', '/branch',
    '/tdd', '/test', '/commit', '/gate-1', '/gate-2', '/gate-3',
    '/gate-4', '/gate-5', '/gate-6', '/gate-7',
    '/pr', '/done', '/go', '/end',
    '/emergency-stop', '/escalate', '/rollback'
  ]

  const filteredCommands = COMMANDS.filter((cmd) => {
    const matchesSearch =
      cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.aliases?.some(alias => alias.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesCategory =
      selectedCategory === 'all' ||
      (selectedCategory === 'important' && importantCommandNames.includes(cmd.name)) ||
      cmd.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  const toggleCommand = (commandName: string) => {
    const newExpanded = new Set(expandedCommands)
    if (newExpanded.has(commandName)) {
      newExpanded.delete(commandName)
    } else {
      newExpanded.add(commandName)
    }
    setExpandedCommands(newExpanded)
  }

  const copyToClipboard = async (text: string, type: 'command' | 'example', id: string) => {
    await navigator.clipboard.writeText(text)
    if (type === 'command') {
      setCopiedCommand(id)
      setTimeout(() => setCopiedCommand(null), 2000)
    } else {
      setCopiedExample(id)
      setTimeout(() => setCopiedExample(null), 2000)
    }
  }

  const categories = Array.from(new Set(COMMANDS.map(cmd => cmd.category)))

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Terminal className="h-8 w-8 text-[#5e6ad2]" />
            <h1 className="text-3xl font-bold text-[#fafafa]">Commands Reference</h1>
          </div>
          <p className="text-[#a3a3a3]">
            Complete reference for all WAVE V2 commands, hooks, and skills with detailed usage examples
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#666]" />
            <input
              type="text"
              placeholder="Search commands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg text-[#fafafa] placeholder:text-[#666] focus:outline-none focus:border-[#5e6ad2]"
            />
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                selectedCategory === 'all'
                  ? "bg-[#5e6ad2] text-white"
                  : "bg-[#2e2e2e] text-[#a3a3a3] hover:bg-[#3e3e3e] hover:text-[#fafafa]"
              )}
            >
              All Commands ({COMMANDS.length})
            </button>
            <button
              onClick={() => setSelectedCategory('important')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                selectedCategory === 'important'
                  ? "bg-amber-500 text-white"
                  : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 border border-amber-500/30"
              )}
            >
              <Zap className="h-3.5 w-3.5" />
              ⭐ Important Commands (21)
            </button>
            {categories.sort().map((category) => {
              const Icon = categoryIcons[category]
              const count = COMMANDS.filter(cmd => cmd.category === category).length
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    selectedCategory === category
                      ? "bg-[#5e6ad2] text-white"
                      : "bg-[#2e2e2e] text-[#a3a3a3] hover:bg-[#3e3e3e] hover:text-[#fafafa]"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {categoryLabels[category]} ({count})
                </button>
              )
            })}
          </div>
        </div>

        {/* Important Commands Workflow Guide */}
        {selectedCategory === 'important' && (
          <div className="mb-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-3">
              <Zap className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-amber-400 font-semibold mb-1">Essential WAVE Workflow Commands</h3>
                <p className="text-sm text-[#a3a3a3] mb-3">
                  CTO-recommended commands organized by workflow stage. Run gates in order (0→1→2→3→4→5→6→7) - never skip!
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Before Starting */}
              <div className="bg-[#1e1e1e] border border-amber-500/20 rounded p-3">
                <h4 className="text-amber-400 font-semibold mb-2 flex items-center gap-1.5">
                  <span className="inline-block w-5 h-5 rounded-full bg-amber-500/20 text-center leading-5">🚀</span>
                  Before Starting
                </h4>
                <div className="space-y-1 text-[#a3a3a3] font-mono text-[10px]">
                  <div>/wave-status</div>
                  <div>/status</div>
                  <div>/gate-0</div>
                  <div>/branch create</div>
                </div>
              </div>

              {/* During Development */}
              <div className="bg-[#1e1e1e] border border-amber-500/20 rounded p-3">
                <h4 className="text-amber-400 font-semibold mb-2 flex items-center gap-1.5">
                  <span className="inline-block w-5 h-5 rounded-full bg-amber-500/20 text-center leading-5">💻</span>
                  During Development
                </h4>
                <div className="space-y-1 text-[#a3a3a3] font-mono text-[10px]">
                  <div>/tdd</div>
                  <div>/test unit</div>
                  <div>/commit</div>
                  <div>/gate-1 → /gate-2 → /gate-3</div>
                </div>
              </div>

              {/* When Finishing */}
              <div className="bg-[#1e1e1e] border border-amber-500/20 rounded p-3">
                <h4 className="text-amber-400 font-semibold mb-2 flex items-center gap-1.5">
                  <span className="inline-block w-5 h-5 rounded-full bg-amber-500/20 text-center leading-5">✅</span>
                  When Finishing
                </h4>
                <div className="space-y-1 text-[#a3a3a3] font-mono text-[10px]">
                  <div>/test (full suite)</div>
                  <div>/gate-4 → /gate-5 → /gate-6</div>
                  <div>/gate-7 (merge approval)</div>
                  <div>/pr create & /done</div>
                </div>
              </div>
            </div>

            {/* Emergency Commands Footer */}
            <div className="mt-3 pt-3 border-t border-amber-500/20 flex items-center justify-between text-[10px]">
              <div className="text-[#a3a3a3]">
                <span className="text-red-400 font-semibold">🚨 Emergency:</span>
                <code className="ml-2 text-red-400">/emergency-stop</code>
                <code className="ml-2 text-red-400">/escalate</code>
                <code className="ml-2 text-red-400">/rollback</code>
              </div>
              <div className="text-[#666]">
                <span className="text-amber-400">⚠️</span> Never skip gates - Quality over speed
              </div>
            </div>
          </div>
        )}

        {/* Results count */}
        <div className="mb-4 text-sm text-[#666]">
          {filteredCommands.length} {filteredCommands.length === 1 ? 'command' : 'commands'} found
        </div>

        {/* Commands list */}
        <div className="space-y-3">
          {filteredCommands.map((cmd) => {
            const isExpanded = expandedCommands.has(cmd.name)
            const Icon = categoryIcons[cmd.category]

            return (
              <div
                key={cmd.name}
                className="bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg overflow-hidden hover:border-[#3e3e3e] transition-colors"
              >
                {/* Command header */}
                <button
                  onClick={() => toggleCommand(cmd.name)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[#2e2e2e] transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Icon className="h-5 w-5 text-[#5e6ad2] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-[#fafafa] font-mono font-semibold">{cmd.name}</code>
                        {cmd.tier && (
                          <span className={cn(
                            "px-1.5 py-0.5 text-[10px] font-medium rounded",
                            cmd.tier === 1 ? "bg-[#5e6ad2]/20 text-[#5e6ad2]" :
                            cmd.tier === 2 ? "bg-[#4cb782]/20 text-[#4cb782]" :
                            "bg-[#666]/20 text-[#a3a3a3]"
                          )}>
                            Tier {cmd.tier}
                          </span>
                        )}
                        {cmd.priority && (
                          <span className={cn(
                            "px-1.5 py-0.5 text-[10px] font-medium rounded",
                            cmd.priority.includes('P0') || cmd.priority.includes('CRITICAL') ? "bg-red-500/20 text-red-400" :
                            cmd.priority.includes('P1') || cmd.priority.includes('HIGH') ? "bg-amber-500/20 text-amber-400" :
                            "bg-[#666]/20 text-[#a3a3a3]"
                          )}>
                            {cmd.priority}
                          </span>
                        )}
                        {cmd.model && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-[#666]/20 text-[#a3a3a3]">
                            {cmd.model}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#a3a3a3] truncate">{cmd.description}</p>
                      {cmd.aliases && cmd.aliases.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-xs text-[#666]">Aliases:</span>
                          {cmd.aliases.map(alias => (
                            <code key={alias} className="text-xs text-[#666] font-mono">{alias}</code>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        copyToClipboard(cmd.name, 'command', cmd.name)
                      }}
                      className="p-2 rounded hover:bg-[#2e2e2e] transition-colors flex-shrink-0"
                      title="Copy command"
                    >
                      {copiedCommand === cmd.name ? (
                        <Check className="h-4 w-4 text-[#4cb782]" />
                      ) : (
                        <Copy className="h-4 w-4 text-[#666]" />
                      )}
                    </button>
                  </div>
                  <ChevronDown className={cn(
                    "h-5 w-5 text-[#666] transition-transform flex-shrink-0 ml-2",
                    isExpanded && "rotate-180"
                  )} />
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-[#2e2e2e] space-y-4">
                    {/* Full description */}
                    {cmd.fullDescription && (
                      <div className="pt-4">
                        <p className="text-sm text-[#d0d6e0]">{cmd.fullDescription}</p>
                      </div>
                    )}

                    {/* When to run */}
                    {cmd.whenToRun && cmd.whenToRun.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-[#fafafa] mb-2 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-[#5e6ad2]" />
                          When to Use
                        </h4>
                        <ul className="space-y-1">
                          {cmd.whenToRun.map((item, idx) => (
                            <li key={idx} className="text-sm text-[#a3a3a3] flex items-start gap-2">
                              <span className="text-[#5e6ad2] mt-1">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Arguments */}
                    {cmd.arguments && cmd.arguments.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-[#fafafa] mb-2">Arguments</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-[#2e2e2e]">
                                <th className="text-left py-2 pr-4 text-[#a3a3a3] font-normal">Name</th>
                                <th className="text-left py-2 pr-4 text-[#a3a3a3] font-normal">Description</th>
                                <th className="text-left py-2 text-[#a3a3a3] font-normal">Required</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cmd.arguments.map((arg, idx) => (
                                <tr key={idx} className="border-b border-[#2e2e2e] last:border-0">
                                  <td className="py-2 pr-4">
                                    <code className="text-[#5e6ad2] font-mono text-xs">{arg.name}</code>
                                  </td>
                                  <td className="py-2 pr-4 text-[#a3a3a3]">{arg.description}</td>
                                  <td className="py-2">
                                    <span className={cn(
                                      "px-2 py-0.5 text-xs rounded",
                                      arg.required
                                        ? "bg-amber-500/20 text-amber-400"
                                        : "bg-[#4cb782]/20 text-[#4cb782]"
                                    )}>
                                      {arg.required ? 'Yes' : 'No'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Phases */}
                    {cmd.phases && cmd.phases.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-[#fafafa] mb-2">Workflow Phases</h4>
                        <div className="space-y-2">
                          {cmd.phases.map((phase, idx) => (
                            <div key={idx} className="bg-[#252525] rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#5e6ad2]/20 text-[#5e6ad2] text-xs font-semibold">
                                  {idx + 1}
                                </span>
                                <span className="text-sm font-medium text-[#fafafa]">{phase.phase}</span>
                              </div>
                              {phase.description && (
                                <p className="text-sm text-[#a3a3a3] ml-7 mb-1">{phase.description}</p>
                              )}
                              {phase.checks && phase.checks.length > 0 && (
                                <ul className="ml-7 space-y-0.5">
                                  {phase.checks.map((check, checkIdx) => (
                                    <li key={checkIdx} className="text-xs text-[#a3a3a3] flex items-start gap-1.5">
                                      <CheckCircle className="h-3 w-3 text-[#4cb782] mt-0.5 flex-shrink-0" />
                                      <span>{check}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Examples */}
                    {cmd.examples && cmd.examples.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-[#fafafa] mb-2">Examples</h4>
                        <div className="space-y-2">
                          {cmd.examples.map((example, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-[#252525] rounded-lg p-2">
                              <code className="flex-1 text-sm font-mono text-[#d0d6e0]">{example}</code>
                              <button
                                onClick={() => copyToClipboard(example, 'example', `${cmd.name}-${idx}`)}
                                className="p-1.5 rounded hover:bg-[#2e2e2e] transition-colors flex-shrink-0"
                                title="Copy example"
                              >
                                {copiedExample === `${cmd.name}-${idx}` ? (
                                  <Check className="h-3.5 w-3.5 text-[#4cb782]" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5 text-[#666]" />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Related commands */}
                    {cmd.relatedCommands && cmd.relatedCommands.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-[#fafafa] mb-2">Related Commands</h4>
                        <div className="flex flex-wrap gap-2">
                          {cmd.relatedCommands.map(relCmd => (
                            <code key={relCmd} className="px-2 py-1 bg-[#252525] text-[#5e6ad2] text-xs font-mono rounded">
                              {relCmd}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {cmd.notes && cmd.notes.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-[#fafafa] mb-2 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-400" />
                          Important Notes
                        </h4>
                        <ul className="space-y-1">
                          {cmd.notes.map((note, idx) => (
                            <li key={idx} className="text-sm text-[#a3a3a3] flex items-start gap-2">
                              <span className="text-amber-400 mt-1">⚠</span>
                              <span>{note}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Metadata footer */}
                    <div className="pt-3 border-t border-[#2e2e2e] flex items-center gap-4 text-xs text-[#666]">
                      {cmd.owner && (
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          <span>Owner: {cmd.owner}</span>
                        </div>
                      )}
                      {cmd.model && (
                        <div className="flex items-center gap-1.5">
                          <Zap className="h-3.5 w-3.5" />
                          <span>Model: {cmd.model}</span>
                        </div>
                      )}
                      {cmd.lastUpdated && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Updated: {cmd.lastUpdated}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {filteredCommands.length === 0 && (
          <div className="text-center py-12">
            <Terminal className="h-12 w-12 text-[#666] mx-auto mb-4" />
            <p className="text-[#a3a3a3] mb-2">No commands found</p>
            <p className="text-sm text-[#666]">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  )
}
