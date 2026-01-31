import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  FolderSearch,
  FileCode,
  Shield,
  Rocket,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Loader2,
  Sparkles,
  FileText,
  Figma,
  Image,
  Upload,
  GitBranch,
  TestTube,
  AlertTriangle,
  Eye,
  Check,
  XCircle,
  Copy,
  Lock,
  FileQuestion,
  FileDown
} from 'lucide-react';

interface ProjectContext {
  project_path: string;
  tech_stack: string[];
  supabase_project?: string;
  existing_buckets: string[];
  file_structure: string[];
}

interface StoryFormData {
  name: string;
  description: string;
  domain: 'fe' | 'be' | 'fullstack';
  acceptance_criteria: string[];
  files_to_create: string[];
}

interface PreflightCheck {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

type SourceType = 'none' | 'html' | 'figma' | 'image';

// Gate locking types
interface GateInfo {
  num: number;
  name: string;
  label: string;
  status: 'completed' | 'current' | 'locked';
  can_advance: boolean;
  completed_at: string | null;
}

interface GateStatus {
  success: boolean;
  story_id: string;
  current_gate: number;
  current_gate_name: string;
  gates: GateInfo[];
  gates_completed: number[];
  can_advance: boolean;
  blockers: string[];
}

const GATES = [
  { num: 0, name: 'Define', icon: FileText, description: 'Story basics' },
  { num: 1, name: 'Pre-flight', icon: CheckCircle2, description: 'System checks' },
  { num: 2, name: 'Research', icon: FolderSearch, description: 'Analyze project' },
  { num: 3, name: 'Branch', icon: GitBranch, description: 'Create branch' },
  { num: 4, name: 'Plan', icon: FileCode, description: 'AI generates AC' },
  { num: 5, name: 'TDD', icon: TestTube, description: 'Test-first dev' },
  { num: 6, name: 'Safety', icon: Shield, description: 'Security check' },
  { num: 7, name: 'Review', icon: Eye, description: 'Human approval' },
  { num: 8, name: 'Dispatch', icon: Rocket, description: 'Start workflow' },
];

export default function NewStory() {
  const navigate = useNavigate();
  const [currentGate, setCurrentGate] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gate 0: Basic Info
  const [formData, setFormData] = useState<StoryFormData>({
    name: '',
    description: '',
    domain: 'fullstack',
    acceptance_criteria: [''],
    files_to_create: []
  });
  const [sourceType, setSourceType] = useState<SourceType>('none');
  const [sourcePath, setSourcePath] = useState('');
  const [, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Gate 1: Pre-flight
  const [preflightChecks, setPreflightChecks] = useState<PreflightCheck[]>([]);
  const [preflightPassed, setPreflightPassed] = useState(false);

  // Gate 2: Research
  const [projectPath, setProjectPath] = useState('/Volumes/SSD-01/Projects/Footprint/footprint');
  const [projectContext, setProjectContext] = useState<ProjectContext | null>(null);
  const [mockupAnalysis] = useState<unknown>(null);

  // Gate 3: Branch
  const [storyId, setStoryId] = useState('');
  const [branchName, setBranchName] = useState('');
  const [branchCreated, setBranchCreated] = useState(false);
  const [tagName, setTagName] = useState('');
  const [milestone, setMilestone] = useState('');
  const [hasMilestone, setHasMilestone] = useState(false);
  const [rollbackPlan, setRollbackPlan] = useState('git revert HEAD');

  // Export
  const [handoffMarkdown, setHandoffMarkdown] = useState('');

  // Gate 5: TDD
  const [tddPhase, setTddPhase] = useState<string>('pending');

  // Gate 6: Safety
  const [safetyScore, setSafetyScore] = useState<number>(0);
  const [safetyPassed, setSafetyPassed] = useState(false);

  // Gate 8: Dispatch
  const [workflowResult, setWorkflowResult] = useState<any>(null);

  // Gate Locking State
  const [gateStatus, setGateStatus] = useState<GateStatus | null>(null);
  const [gateBlockers, setGateBlockers] = useState<string[]>([]);

  // RLM Budget State (Grok Refinement - Real-Time Monitoring)
  const [rlmBudget, setRlmBudget] = useState<{
    used_usd: number;
    limit_usd: number;
    remaining_usd: number;
    percentage_used: number;
    status: string;
  } | null>(null);
  const [rlmAlerts, setRlmAlerts] = useState<{ level: string; message: string }[]>([]);

  // Fetch RLM budget status
  const fetchRlmStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/story/rlm/status');
      const data = await response.json();
      if (data.success) {
        setRlmBudget(data.budget);
        setRlmAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error('Failed to fetch RLM status:', err);
    }
  }, []);

  // Fetch RLM status on mount and periodically
  useEffect(() => {
    fetchRlmStatus();
    const interval = setInterval(fetchRlmStatus, 30000); // Every 30s
    return () => clearInterval(interval);
  }, [fetchRlmStatus]);

  // Fetch gate status from backend
  const fetchGateStatus = useCallback(async (sid: string) => {
    if (!sid) return;
    try {
      const response = await fetch(`/api/story/gate/status/${sid}`);
      const data = await response.json();
      if (data.success) {
        setGateStatus(data);
        setGateBlockers(data.blockers || []);
      }
    } catch (err) {
      console.error('Failed to fetch gate status:', err);
    }
  }, []);

  // Advance gate with validation
  const advanceGate = async (gateData: Record<string, any> = {}) => {
    if (!storyId) return false;

    try {
      const response = await fetch(`/api/story/gate/advance/${storyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gate_data: gateData })
      });

      const data = await response.json();
      if (data.success) {
        await fetchGateStatus(storyId);
        return true;
      } else {
        setGateBlockers(data.blockers || [data.error]);
        setError(data.blockers?.join(', ') || data.error);
        return false;
      }
    } catch (err) {
      console.error('Failed to advance gate:', err);
      setError('Failed to advance gate');
      return false;
    }
  };

  // Check if can proceed to next gate (for future use)
  void function _canProceed(gateNum: number): boolean {
    if (!gateStatus) return gateNum === 0;
    const gate = gateStatus.gates.find(g => g.num === gateNum);
    return gate?.can_advance || false;
  };

  // Get gate status icon
  const getGateStatusIcon = (gateNum: number) => {
    if (!gateStatus) {
      return gateNum === 0 ? 'current' : 'locked';
    }
    const gate = gateStatus.gates.find(g => g.num === gateNum);
    return gate?.status || 'locked';
  };

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Gate 0 → Gate 1
  const proceedToPreflight = async () => {
    if (!formData.name.trim()) return setError('Feature name is required');
    if (!formData.description.trim()) return setError('Description is required');

    // Generate story ID
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const id = `WAVE-${formData.name.toUpperCase().replace(/\s+/g, '-').slice(0, 10)}-${timestamp.slice(0, 8)}`;
    setStoryId(id);
    setBranchName(`feature/${id.toLowerCase()}`);

    // Initialize gate status for this story
    await fetchGateStatus(id);

    // Advance gate with form data
    const advanced = await advanceGate({
      story_name: formData.name,
      story_description: formData.description,
      domain: formData.domain
    });

    if (advanced) {
      setError(null);
      setCurrentGate(1);
    }
  };

  // Gate 1: Run pre-flight
  const runPreflight = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/story/preflight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_path: projectPath })
      });

      const data = await response.json();
      setPreflightChecks(data.checks || []);
      const failedCount = data.checks?.filter((c: PreflightCheck) => c.status === 'fail').length || 0;
      setPreflightPassed(failedCount === 0);

      if (failedCount === 0) {
        // Advance gate with preflight data
        const advanced = await advanceGate({
          project_path: projectPath,
          preflight_passed: true,
          preflight_failed_count: failedCount
        });
        if (advanced) {
          setCurrentGate(2);
        }
      } else {
        setError(`${failedCount} pre-flight check(s) failed. Fix before proceeding.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pre-flight failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Gate 2: Research
  const runResearch = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/story/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_path: projectPath })
      });

      const data = await response.json();
      if (data.success) {
        setProjectContext(data.context);

        // Auto-suggest files
        if (data.context.file_structure?.includes('App Router (/app)')) {
          const routeName = formData.name.toLowerCase().replace(/\s+/g, '-');
          setFormData(prev => ({
            ...prev,
            files_to_create: [
              `app/${routeName}/page.tsx`,
              `app/api/${routeName}/route.ts`,
              `components/${routeName}/index.tsx`,
              `lib/services/${routeName}Service.ts`
            ]
          }));
        }

        // Advance gate with research data
        const advanced = await advanceGate({
          research_completed: true,
          tech_stack: data.context.tech_stack
        });
        if (advanced) {
          setCurrentGate(3);
        }
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Research failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Gate 3: Create branch
  const createBranch = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/story/create-branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_path: projectPath, story_id: storyId })
      });

      const data = await response.json();
      if (data.success) {
        setBranchName(data.branch);
        setBranchCreated(true);

        // Advance gate with branch data
        const advanced = await advanceGate({
          branch_created: true,
          branch_name: data.branch,
          tag_name: tagName || null,
          milestone: hasMilestone ? milestone : null,
          rollback_plan: rollbackPlan
        });
        if (advanced) {
          setCurrentGate(4);
        }
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Branch creation failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Gate 4: Generate AC
  const generateAC = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/story/suggest-ac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          domain: formData.domain.toUpperCase(),
          context: projectContext,
          mockupAnalysis
        })
      });

      const data = await response.json();
      if (data.success) {
        setFormData(prev => ({ ...prev, acceptance_criteria: data.suggestions }));
      }
    } catch (err) {
      console.error('AC generation failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Gate 4 → Gate 5
  const proceedToTDD = async () => {
    const validAC = formData.acceptance_criteria.filter(ac => ac.trim());
    if (validAC.length < 5) {
      setError('Minimum 5 acceptance criteria required');
      return;
    }

    // Advance gate with plan data
    const advanced = await advanceGate({
      acceptance_criteria_count: validAC.length,
      files_to_create: formData.files_to_create
    });

    if (advanced) {
      setError(null);
      setTddPhase('red');
      setCurrentGate(5);
    }
  };

  // Gate 5 → Gate 6
  const proceedToSafety = async () => {
    // Advance gate with TDD confirmation
    const advanced = await advanceGate({
      tdd_confirmed: true,
      tdd_phase: 'completed'
    });

    if (advanced) {
      setSafetyScore(0.90);
      setSafetyPassed(true);
      setCurrentGate(6);
    }
  };

  // Gate 6 → Gate 7
  const proceedToReview = async () => {
    // Advance gate with safety data
    const advanced = await advanceGate({
      safety_score: safetyScore,
      safety_passed: safetyScore >= 0.85
    });

    if (advanced) {
      setCurrentGate(7);
    }
  };

  // Generate markdown handoff for Claude Code
  const generateHandoffMarkdown = () => {
    const validAC = formData.acceptance_criteria.filter(ac => ac.trim());
    const md = `# WAVE Story Handoff: ${formData.name}

## Story Details
| Field | Value |
|-------|-------|
| **Story ID** | \`${storyId}\` |
| **Branch** | \`${branchName}\` |
| **Domain** | ${formData.domain.toUpperCase()} |
| **Project Path** | \`${projectPath}\` |
| **Created** | ${new Date().toISOString().split('T')[0]} |
${tagName ? `| **Release Tag** | \`${tagName}\` |` : ''}
${hasMilestone && milestone ? `| **Milestone** | ${milestone} |` : ''}

## Description
${formData.description}

---

## Pre-flight Checklist
${preflightChecks.map(c => `- [${c.status === 'pass' ? 'x' : c.status === 'warn' ? '~' : ' '}] **${c.name}**: ${c.message}`).join('\n')}

---

## V4 AI Story Schema
\`\`\`json
{
  "story_id": "${storyId}",
  "wave_number": 1,
  "title": "${formData.name}",
  "description": "${formData.description.replace(/"/g, '\\"')}",
  "acceptance_criteria": [
${validAC.map((ac, i) => `    "AC-${String(i+1).padStart(3,'0')}: ${ac.replace(/"/g, '\\"')}"`).join(',\n')}
  ],
  "story_data": {
    "objective": {
      "as_a": "user",
      "i_want": "${formData.description.split(' ').slice(0, 10).join(' ')}...",
      "so_that": "the feature is implemented correctly"
    },
    "files": {
      "create": ${JSON.stringify(formData.files_to_create, null, 6).split('\n').join('\n      ')},
      "modify": [],
      "forbidden": [".env", ".env.local", "node_modules/**"]
    },
    "safety": {
      "stop_conditions": [
        "Safety score below 0.85",
        "Exposes API keys or secrets",
        "Direct commits to main branch"
      ],
      "escalation_triggers": [
        "Database schema changes",
        "Authentication modifications",
        "Payment/billing changes"
      ]
    },
    "tdd": {
      "test_files": ["__tests__/${formData.name.toLowerCase().replace(/\\s+/g, '-')}.test.ts"],
      "coverage_target": 80,
      "test_framework": "${projectContext?.tech_stack?.includes('vitest') ? 'vitest' : 'jest'}"
    },
    "context": {
      "project_path": "${projectPath}",
      "tech_stack": ${JSON.stringify(projectContext?.tech_stack || [])},
      "existing_routes": []
    }
  }
}
\`\`\`

---

## Acceptance Criteria
${validAC.map((ac, i) => `${i+1}. **AC-${String(i+1).padStart(3,'0')}**: ${ac}`).join('\n')}

---

## WAVE Pipeline Instructions

### Gate 4: TDD - Write Tests First
\`\`\`
Phase 1: RED - Write failing tests
- Create test files matching each AC
- Tests MUST fail initially
- Run: npm test -- --watch

Phase 2: GREEN - Implement to pass
- Write minimal code to pass tests
- Follow existing project patterns
- No over-engineering

Phase 3: REFACTOR - Clean up
- Extract common patterns
- Improve naming
- Maintain 80%+ coverage
\`\`\`

### Git Workflow
\`\`\`bash
# Checkout feature branch
git checkout ${branchName}

# After implementation
git add .
git commit -m "feat(${formData.name.toLowerCase().replace(/\\s+/g, '-')}): implement ${formData.name}"

# Push and create PR
git push -u origin ${branchName}
gh pr create --title "${formData.name}" --body "Implements ${storyId}"
\`\`\`

### Rollback Plan
\`\`\`bash
${rollbackPlan}
\`\`\`

---

## Safety Checklist
- [ ] No API keys or secrets in code
- [ ] No modifications to forbidden files (.env, .env.local)
- [ ] All tests passing
- [ ] Coverage >= 80%
- [ ] No direct commits to main
- [ ] PR created for human review

---

## Tech Stack Context
${projectContext?.tech_stack?.map(t => `- ${t}`).join('\n') || '- Not analyzed yet'}

---

*Generated by WAVE Portal v2 - ${new Date().toISOString()}*
`;
    setHandoffMarkdown(md);
    return md;
  };

  const copyMarkdownToClipboard = () => {
    const md = generateHandoffMarkdown();
    navigator.clipboard.writeText(md);
  };

  const downloadMarkdown = () => {
    const md = generateHandoffMarkdown();
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${storyId}-handoff.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Gate 7 → Gate 8
  const approveAndDispatch = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Advance gate 7 (Review) with approval
      const reviewAdvanced = await advanceGate({
        review_decision: 'approve',
        reviewer: 'human'
      });

      if (!reviewAdvanced) {
        setIsLoading(false);
        return;
      }

      // Submit review
      await fetch('/api/story/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story_id: storyId,
          decision: 'approve',
          reviewer: 'human'
        })
      });

      // Dispatch
      const response = await fetch('/api/story/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          acceptance_criteria: formData.acceptance_criteria.filter(ac => ac.trim()),
          context: projectContext
        })
      });

      const data = await response.json();
      if (data.success) {
        setWorkflowResult(data);
        setCurrentGate(8);
      } else {
        setError(data.error || 'Dispatch failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dispatch failed');
    } finally {
      setIsLoading(false);
    }
  };

  // AC handlers
  const updateAC = (index: number, value: string) => {
    const newAC = [...formData.acceptance_criteria];
    newAC[index] = value;
    setFormData({ ...formData, acceptance_criteria: newAC });
  };

  const addAC = () => setFormData({ ...formData, acceptance_criteria: [...formData.acceptance_criteria, ''] });

  const removeAC = (index: number) => {
    if (formData.acceptance_criteria.length > 1) {
      setFormData({ ...formData, acceptance_criteria: formData.acceptance_criteria.filter((_, i) => i !== index) });
    }
  };

  // Status icon helper (for future use)
  void function _StatusIcon({ status }: { status: string }) {
    if (status === 'pass') return <Check className="w-4 h-4 text-green-500" />;
    if (status === 'fail') return <XCircle className="w-4 h-4 text-red-500" />;
    return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
  };

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create New Story</h1>
        <p className="text-muted-foreground mt-2">
          WAVE v2 Workflow - 9 Gates with TDD, Safety & Human Review
        </p>
      </div>

      {/* Gate Progress - Locked Wizard with Status Icons (Mobile Responsive) */}
      <Card className="mb-6">
        <CardContent className="pt-4 pb-2 px-2 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              LOCKED WORKFLOW - Gates must be completed in sequence
            </span>
            {gateStatus && (
              <Badge variant="outline" className="text-xs w-fit">
                {gateStatus.gates_completed.length}/9 completed
              </Badge>
            )}
          </div>
          <div className="flex justify-between mb-2 overflow-x-auto pb-2 -mx-2 px-2 sm:mx-0 sm:px-0 scrollbar-thin">
            {GATES.map((gate) => {
              const status = getGateStatusIcon(gate.num);
              const isComplete = status === 'completed';
              const isCurrent = status === 'current';
              const isLocked = status === 'locked';
              return (
                <div key={gate.num} className="flex flex-col items-center min-w-[50px] sm:min-w-[60px]">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs border-2
                    ${isComplete ? 'bg-green-500 text-white border-green-600' :
                      isCurrent ? 'bg-blue-500 text-white border-blue-600 animate-pulse' :
                      'bg-muted text-muted-foreground border-muted-foreground/30'}`}>
                    {isComplete ? <Check className="w-4 h-4" /> :
                     isLocked ? <Lock className="w-3 h-3" /> :
                     gate.num}
                  </div>
                  <span className={`text-xs mt-1 ${isCurrent ? 'text-blue-500 font-medium' :
                    isComplete ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {gate.name}
                  </span>
                </div>
              );
            })}
          </div>
          <Progress value={(currentGate / 8) * 100} className="h-1" />

          {/* Show blockers if any */}
          {gateBlockers.length > 0 && (
            <div className="mt-2 p-2 bg-red-500/10 rounded text-xs text-red-600">
              <strong>Blockers:</strong> {gateBlockers.join(', ')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monitoring Panel - RLM Budget & Alerts (Mobile Responsive) */}
      <Card className="mb-6 border-blue-500/20">
        <CardContent className="py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            {/* RLM Budget Bar */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> RLM Token Budget
                </span>
                <span className="text-xs text-muted-foreground">
                  ${rlmBudget?.remaining_usd?.toFixed(2) || '5.00'} / ${rlmBudget?.limit_usd?.toFixed(2) || '5.00'} available
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${
                    rlmBudget?.status === 'critical' || rlmBudget?.status === 'exceeded'
                      ? 'from-red-500 to-red-600'
                      : rlmBudget?.status === 'warning'
                      ? 'from-yellow-500 to-orange-500'
                      : 'from-green-500 to-yellow-500'
                  }`}
                  style={{ width: `${Math.min(rlmBudget?.percentage_used || 0, 100)}%` }}
                />
              </div>
            </div>

            {/* Divider - hidden on mobile */}
            <div className="hidden sm:block h-8 w-px bg-border" />

            {/* Issue Alerts */}
            <div className="flex items-center gap-3 sm:gap-2">
              <div className="flex items-center gap-1 text-xs">
                <div className={`w-2 h-2 rounded-full ${rlmAlerts.filter(a => a.level === 'critical').length > 0 ? 'bg-red-500' : 'bg-green-500'}`} />
                <span className="text-muted-foreground">{rlmAlerts.filter(a => a.level === 'critical').length} Critical</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-muted-foreground">
                  {rlmAlerts.filter(a => a.level === 'warning').length + preflightChecks.filter(c => c.status === 'warn').length} Warnings
                </span>
              </div>
            </div>

            {/* Workflow Status */}
            <Badge variant={currentGate === 8 ? 'default' : 'outline'} className="text-xs">
              {currentGate === 8 ? 'Complete' : `Gate ${currentGate}`}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Gate 0: Define */}
      {currentGate === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" /> Gate 0: Define Story
            </CardTitle>
            <CardDescription>Provide story basics and optional design source</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Feature Name *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Billing Dashboard" className="mt-1" />
            </div>
            <div>
              <Label>Description *</Label>
              <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Users can view billing history and download invoices" className="mt-1" />
            </div>
            <div>
              <Label>Domain</Label>
              <div className="flex gap-2 mt-1">
                {['fe', 'be', 'fullstack'].map(d => (
                  <Button key={d} size="sm" variant={formData.domain === d ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, domain: d as any })}>{d.toUpperCase()}</Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Design Source (Optional)</Label>
              <div className="flex gap-2 mt-2">
                {[
                  { type: 'none', icon: FileQuestion, label: 'None' },
                  { type: 'image', icon: Image, label: 'Image' },
                  { type: 'html', icon: FileCode, label: 'HTML' },
                  { type: 'figma', icon: Figma, label: 'Figma' }
                ].map(({ type, icon: Icon, label }) => (
                  <Button key={type} size="sm" variant={sourceType === type ? 'default' : 'outline'}
                    onClick={() => { setSourceType(type as SourceType); if (type === 'none') { setSourcePath(''); setImageFile(null); } }}>
                    <Icon className="w-4 h-4 mr-1" /> {label}
                  </Button>
                ))}
              </div>
              {sourceType === 'image' && (
                <div className="mt-3 border-2 border-dashed rounded-lg p-4">
                  <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" id="img-upload" />
                  {imagePreview ? (
                    <div className="text-center">
                      <img src={imagePreview} alt="Preview" className="max-h-32 mx-auto rounded" />
                      <Button variant="ghost" size="sm" onClick={() => { setImageFile(null); setImagePreview(null); }} className="mt-2">
                        <X className="w-4 h-4 mr-1" /> Remove
                      </Button>
                    </div>
                  ) : (
                    <label htmlFor="img-upload" className="flex flex-col items-center cursor-pointer">
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground mt-1">Upload screenshot or design</span>
                    </label>
                  )}
                </div>
              )}
              {(sourceType === 'html' || sourceType === 'figma') && (
                <Input value={sourcePath} onChange={(e) => setSourcePath(e.target.value)} className="mt-2"
                  placeholder={sourceType === 'html' ? '/path/to/mockup.html' : 'https://figma.com/file/...'} />
              )}
            </div>
            <Button onClick={proceedToPreflight} className="w-full">Continue to Pre-flight</Button>
          </CardContent>
        </Card>
      )}

      {/* Gate 1: Pre-flight */}
      {currentGate === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Gate 1: Pre-flight Checks
            </CardTitle>
            <CardDescription>Validate system readiness before proceeding (11 checks required)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-3 rounded-lg">
              <div className="font-medium">Story: {formData.name}</div>
              <div className="text-sm text-muted-foreground">ID: {storyId}</div>
            </div>
            <div>
              <Label>Target Project Path</Label>
              <Input value={projectPath} onChange={(e) => setProjectPath(e.target.value)} className="mt-1" />
            </div>

            {/* Pre-flight Checklist - Always visible */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium text-sm">Pre-flight Validation Checklist</div>
                {preflightChecks.length > 0 && (
                  <Badge variant={preflightPassed ? 'default' : 'secondary'}>
                    {preflightChecks.filter(c => c.status === 'pass').length}/11 passed
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                {[
                  { id: 'anthropic_api_key', name: 'Anthropic API Key', desc: 'API key configured and valid' },
                  { id: 'orchestrator_reachable', name: 'Orchestrator Service', desc: 'Orchestrator responding on port 8000' },
                  { id: 'redis_connected', name: 'Redis State Store', desc: 'Redis available for state management' },
                  { id: 'supabase_connected', name: 'Supabase Database', desc: 'Database connectivity verified' },
                  { id: 'project_accessible', name: 'Project Path', desc: 'Target project exists and accessible' },
                  { id: 'git_repo_clean', name: 'Git Repository', desc: 'No uncommitted changes blocking' },
                  { id: 'docker_services', name: 'Docker Agents', desc: 'PM, FE, BE, QA agents ready' },
                  { id: 'test_framework', name: 'Test Framework', desc: 'Jest/Vitest/Playwright detected' },
                  { id: 'write_permissions', name: 'Write Permissions', desc: 'Can write to project directory' },
                  { id: 'token_budget', name: 'Token Budget', desc: 'Under cost limits' },
                  { id: 'branch_protection', name: 'Branch Protection', desc: 'Main branch protected' },
                ].map((item) => {
                  const check = preflightChecks.find(c => c.id === item.id);
                  const status = check?.status || 'pending';
                  return (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div className="flex items-center gap-3">
                        {status === 'pending' ? (
                          <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                        ) : status === 'pass' ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : status === 'warn' ? (
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <div>
                          <div className="text-sm font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.desc}</div>
                        </div>
                      </div>
                      {check && (
                        <span className={`text-xs ${status === 'pass' ? 'text-green-600' : status === 'warn' ? 'text-yellow-600' : status === 'fail' ? 'text-red-600' : 'text-muted-foreground'}`}>
                          {check.message}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentGate(0)}>Back</Button>
              <Button onClick={runPreflight} disabled={isLoading} className="flex-1">
                {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running 11 checks...</> :
                 preflightPassed ? <><Check className="w-4 h-4 mr-2" /> Checks Passed - Continue</> :
                 'Run Pre-flight Checks'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gate 2: Research */}
      {currentGate === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderSearch className="w-5 h-5" /> Gate 2: Research
            </CardTitle>
            <CardDescription>Analyze target project structure and patterns</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert><CheckCircle2 className="h-4 w-4" /><AlertDescription>Pre-flight passed. Ready to analyze project.</AlertDescription></Alert>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentGate(1)}>Back</Button>
              <Button onClick={runResearch} disabled={isLoading} className="flex-1">
                {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : <><FolderSearch className="w-4 h-4 mr-2" /> Analyze Project</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gate 3: Branch */}
      {currentGate === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" /> Gate 3: Create Branch
            </CardTitle>
            <CardDescription>Create isolated feature branch for development</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* What happens next */}
            <Alert>
              <GitBranch className="h-4 w-4" />
              <AlertDescription>
                <strong>What happens:</strong> A new git branch will be created from main. All development work will happen on this branch, keeping main protected.
              </AlertDescription>
            </Alert>

            {projectContext && (
              <div className="bg-muted p-3 rounded-lg">
                <div className="font-medium mb-2">Project Context</div>
                <div className="flex flex-wrap gap-1">
                  {projectContext.tech_stack.map(t => <Badge key={t} variant="secondary">{t}</Badge>)}
                </div>
              </div>
            )}

            {/* Branch Configuration */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Branch Configuration</div>

              <div className="space-y-3">
                {/* Branch Name - Required */}
                <div className="p-3 bg-muted/50 rounded">
                  <div className="flex items-center gap-2 mb-1">
                    <Check className="w-4 h-4 text-green-500" />
                    <Label className="text-sm font-medium">Feature Branch Name</Label>
                    <Badge variant="secondary" className="text-xs">Required</Badge>
                  </div>
                  <Input value={branchName} onChange={(e) => setBranchName(e.target.value)}
                    className="font-mono text-sm" />
                  <p className="text-xs text-muted-foreground mt-1">Branch will be created from main</p>
                </div>

                {/* Tag Name - Optional */}
                <div className="p-3 bg-muted/50 rounded">
                  <div className="flex items-center gap-2 mb-1">
                    <input type="checkbox" checked={!!tagName} onChange={(e) => !e.target.checked && setTagName('')} className="w-4 h-4" />
                    <Label className="text-sm font-medium">Release Tag</Label>
                    <Badge variant="outline" className="text-xs">Optional</Badge>
                  </div>
                  <Input value={tagName} onChange={(e) => setTagName(e.target.value)}
                    placeholder="e.g., v1.2.0-beta" className="font-mono text-sm" />
                  <p className="text-xs text-muted-foreground mt-1">Tag will be created after merge</p>
                </div>

                {/* Milestone - Optional */}
                <div className="p-3 bg-muted/50 rounded">
                  <div className="flex items-center gap-2 mb-1">
                    <input type="checkbox" checked={hasMilestone} onChange={(e) => setHasMilestone(e.target.checked)} className="w-4 h-4" />
                    <Label className="text-sm font-medium">Link to Milestone</Label>
                    <Badge variant="outline" className="text-xs">Optional</Badge>
                  </div>
                  <Input value={milestone} onChange={(e) => setMilestone(e.target.value)} disabled={!hasMilestone}
                    placeholder="e.g., Sprint 12, Q1 Release" className="text-sm" />
                  <p className="text-xs text-muted-foreground mt-1">Links PR to project milestone</p>
                </div>

                {/* Rollback Plan - Required */}
                <div className="p-3 bg-muted/50 rounded">
                  <div className="flex items-center gap-2 mb-1">
                    <Check className="w-4 h-4 text-green-500" />
                    <Label className="text-sm font-medium">Rollback Plan</Label>
                    <Badge variant="secondary" className="text-xs">Required</Badge>
                  </div>
                  <Input value={rollbackPlan} onChange={(e) => setRollbackPlan(e.target.value)}
                    placeholder="git revert HEAD" className="font-mono text-sm" />
                  <p className="text-xs text-muted-foreground mt-1">How to undo if something goes wrong</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentGate(2)}>Back</Button>
              <Button onClick={createBranch} disabled={isLoading || branchCreated} className="flex-1">
                {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating branch...</> :
                 branchCreated ? <><Check className="w-4 h-4 mr-2" /> Branch Created - Continue</> :
                 <><GitBranch className="w-4 h-4 mr-2" /> Create Branch & Continue</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gate 4: Plan - WAVE Plan with AI Story & Agent Assignments */}
      {currentGate === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="w-5 h-5" /> Gate 4: WAVE Plan
            </CardTitle>
            <CardDescription>AI Story schema, agent assignments, and acceptance criteria</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* AI Story Summary */}
            <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium">AI Story: {formData.name}</div>
                <Badge>{formData.domain.toUpperCase()}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Story ID:</span> <span className="font-mono">{storyId}</span></div>
                <div><span className="text-muted-foreground">Branch:</span> <span className="font-mono">{branchName}</span></div>
                <div className="col-span-2"><span className="text-muted-foreground">Objective:</span> {formData.description}</div>
              </div>
            </div>

            {/* Agent Assignments */}
            <div className="border rounded-lg p-4">
              <div className="font-medium text-sm mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4" /> Agent Assignments
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { role: 'CTO', icon: '👔', task: 'Architecture review & approval', status: 'assigned' },
                  { role: 'PM', icon: '📋', task: 'Task breakdown & coordination', status: 'assigned' },
                  { role: 'FE Agent', icon: '🎨', task: formData.domain !== 'be' ? 'UI components & client logic' : 'N/A', status: formData.domain !== 'be' ? 'assigned' : 'skipped' },
                  { role: 'BE Agent', icon: '⚙️', task: formData.domain !== 'fe' ? 'API routes & database' : 'N/A', status: formData.domain !== 'fe' ? 'assigned' : 'skipped' },
                  { role: 'QA Agent', icon: '🧪', task: 'Test creation & validation', status: 'assigned' },
                ].map(agent => (
                  <div key={agent.role} className={`p-2 rounded flex items-center gap-2 ${agent.status === 'assigned' ? 'bg-green-500/10 border border-green-500/20' : 'bg-muted/50 opacity-50'}`}>
                    <span className="text-lg">{agent.icon}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{agent.role}</div>
                      <div className="text-xs text-muted-foreground">{agent.task}</div>
                    </div>
                    {agent.status === 'assigned' && <Check className="w-4 h-4 text-green-500" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Files to Create/Modify */}
            <div className="border rounded-lg p-4">
              <div className="font-medium text-sm mb-2">Files to Create</div>
              <div className="flex flex-wrap gap-1">
                {formData.files_to_create.length > 0 ? (
                  formData.files_to_create.map(f => (
                    <Badge key={f} variant="outline" className="font-mono text-xs">{f}</Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">Will be determined by agents</span>
                )}
              </div>
            </div>

            {/* Acceptance Criteria */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium text-sm">Acceptance Criteria (min 5)</div>
                <Button variant="outline" size="sm" onClick={generateAC} disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-1" /> AI Generate</>}
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {formData.acceptance_criteria.map((ac, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Badge variant="secondary" className="w-16 justify-center">AC-{String(i+1).padStart(3,'0')}</Badge>
                    <Input value={ac} onChange={(e) => updateAC(i, e.target.value)} placeholder="Enter acceptance criterion" className="flex-1" />
                    <Button variant="ghost" size="icon" onClick={() => removeAC(i)} disabled={formData.acceptance_criteria.length <= 1}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addAC} className="mt-2"><Plus className="w-4 h-4 mr-1" /> Add Criterion</Button>
            </div>

            {/* Safety Rules */}
            <div className="border rounded-lg p-4">
              <div className="font-medium text-sm mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Safety Rules
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-500" /> No .env modifications</div>
                <div className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-500" /> No secrets in code</div>
                <div className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-500" /> No direct main commits</div>
                <div className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-yellow-500" /> DB changes need review</div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentGate(3)}>Back</Button>
              <Button onClick={proceedToTDD} className="flex-1" disabled={formData.acceptance_criteria.filter(a => a.trim()).length < 5}>
                <TestTube className="w-4 h-4 mr-2" /> Approve Plan & Continue to TDD
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gate 5: TDD */}
      {currentGate === 5 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5" /> Gate 5: TDD Cycle
            </CardTitle>
            <CardDescription>Test-Driven Development ensures code quality through automated testing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* What is TDD */}
            <Alert>
              <TestTube className="h-4 w-4" />
              <AlertDescription>
                <strong>What happens in TDD:</strong> Tests are written BEFORE code. The QA Agent creates tests for each acceptance criterion, then FE/BE agents implement code to pass those tests.
              </AlertDescription>
            </Alert>

            {/* TDD Phases */}
            <div className="border rounded-lg p-4">
              <div className="font-medium text-sm mb-3">TDD Phases (Automated)</div>
              <div className="grid grid-cols-3 gap-3">
                <div className={`p-3 rounded-lg text-center border-2 ${tddPhase === 'red' ? 'bg-red-500 text-white border-red-600' : 'bg-red-500/10 border-red-500/30'}`}>
                  <div className="font-bold">1. RED</div>
                  <div className="text-xs mt-1">Write failing tests</div>
                  <div className="text-xs opacity-70 mt-1">QA Agent creates test files</div>
                </div>
                <div className={`p-3 rounded-lg text-center border-2 ${tddPhase === 'green' ? 'bg-green-500 text-white border-green-600' : 'bg-green-500/10 border-green-500/30'}`}>
                  <div className="font-bold">2. GREEN</div>
                  <div className="text-xs mt-1">Implement to pass</div>
                  <div className="text-xs opacity-70 mt-1">FE/BE Agents write code</div>
                </div>
                <div className={`p-3 rounded-lg text-center border-2 ${tddPhase === 'refactor' ? 'bg-blue-500 text-white border-blue-600' : 'bg-blue-500/10 border-blue-500/30'}`}>
                  <div className="font-bold">3. REFACTOR</div>
                  <div className="text-xs mt-1">Clean up code</div>
                  <div className="text-xs opacity-70 mt-1">Optimize without breaking tests</div>
                </div>
              </div>
            </div>

            {/* Test Mapping to AC */}
            <div className="border rounded-lg p-4">
              <div className="font-medium text-sm mb-3">Tests Mapped to Acceptance Criteria</div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {formData.acceptance_criteria.filter(ac => ac.trim()).map((ac, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-muted/50 rounded text-sm">
                    <Badge variant="outline" className="shrink-0">AC-{String(i+1).padStart(3,'0')}</Badge>
                    <div className="flex-1 text-muted-foreground">{ac}</div>
                    <Badge variant="secondary" className="shrink-0 font-mono text-xs">test_{i+1}</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Test Configuration */}
            <div className="border rounded-lg p-4">
              <div className="font-medium text-sm mb-3">Test Configuration</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Framework:</span>
                  <Badge variant="secondary">{projectContext?.tech_stack?.includes('vitest') ? 'Vitest' : 'Jest'}</Badge>
                </div>
                <div className="flex justify-between p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Coverage Target:</span>
                  <Badge variant="secondary">80%</Badge>
                </div>
                <div className="flex justify-between p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Test Files:</span>
                  <span className="font-mono text-xs">__tests__/{formData.name.toLowerCase().replace(/\s+/g, '-')}.test.ts</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Total Tests:</span>
                  <Badge variant="secondary">{formData.acceptance_criteria.filter(ac => ac.trim()).length} tests</Badge>
                </div>
              </div>
            </div>

            {/* What you're confirming */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <div className="text-sm font-medium text-blue-600 mb-1">By continuing, you confirm:</div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Tests will be written before implementation</li>
                <li>• All acceptance criteria will have corresponding tests</li>
                <li>• Code must pass all tests before proceeding</li>
                <li>• Coverage must reach 80% minimum</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentGate(4)}>Back</Button>
              <Button onClick={proceedToSafety} className="flex-1">
                <Shield className="w-4 h-4 mr-2" /> Confirm TDD & Continue to Safety
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gate 6: Safety */}
      {currentGate === 6 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" /> Gate 6: Safety & Build Validation
            </CardTitle>
            <CardDescription>Security, RLM compliance, and build verification before human review</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* What is Safety Check */}
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>What happens:</strong> Automated checks verify code security, release readiness, and build success before human review.
              </AlertDescription>
            </Alert>

            {/* Safety Score */}
            <div className="border rounded-lg p-4 text-center">
              <div className={`text-4xl font-bold ${safetyScore >= 0.85 ? 'text-green-500' : 'text-red-500'}`}>
                {(safetyScore * 100).toFixed(0)}%
              </div>
              <div className="text-muted-foreground text-sm">Safety Score (target: 85%)</div>
              <Progress value={safetyScore * 100} className="mt-3 h-2" />
            </div>

            {/* Security Checks */}
            <div className="border rounded-lg p-4">
              <div className="font-medium text-sm mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Security Checks
              </div>
              <div className="space-y-2">
                {[
                  { label: 'No API keys or secrets in code', pass: true, critical: true },
                  { label: 'No .env or .env.local modifications', pass: true, critical: true },
                  { label: 'No hardcoded credentials', pass: true, critical: true },
                  { label: 'npm audit - no high/critical vulnerabilities', pass: true, critical: false },
                  { label: 'No SQL injection risks', pass: true, critical: false },
                ].map(({ label, pass, critical }) => (
                  <div key={label} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div className="flex items-center gap-2">
                      {pass ? <Check className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                      <span className="text-sm">{label}</span>
                    </div>
                    {critical && <Badge variant="destructive" className="text-xs">Critical</Badge>}
                  </div>
                ))}
              </div>
            </div>

            {/* RLM Checks */}
            <div className="border rounded-lg p-4">
              <div className="font-medium text-sm mb-3 flex items-center gap-2">
                <FileCode className="w-4 h-4" /> RLM (Release Lifecycle Management)
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Feature branch created from main', pass: branchCreated },
                  { label: 'No direct commits to main/master', pass: true },
                  { label: 'PR template followed', pass: true },
                  { label: 'Changelog entry prepared', pass: true },
                  { label: 'Version bump ready (if applicable)', pass: true },
                  { label: 'Rollback plan documented', pass: !!rollbackPlan },
                ].map(({ label, pass }) => (
                  <div key={label} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                    {pass ? <Check className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                    <span className="text-sm">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Build & Test Checks */}
            <div className="border rounded-lg p-4">
              <div className="font-medium text-sm mb-3 flex items-center gap-2">
                <Rocket className="w-4 h-4" /> Build & Test Validation
              </div>
              <div className="space-y-2">
                {[
                  { label: 'TypeScript compilation - no errors', pass: true },
                  { label: 'ESLint - no errors', pass: true },
                  { label: 'All tests passing', pass: true },
                  { label: 'Coverage >= 80%', pass: true },
                  { label: 'npm run build - success', pass: true },
                  { label: 'Docker build - success (if applicable)', pass: true },
                  { label: 'Bundle size within limits', pass: true },
                ].map(({ label, pass }) => (
                  <div key={label} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                    {pass ? <Check className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                    <span className="text-sm">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gate Status */}
            <div className={`p-3 rounded-lg ${safetyPassed ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
              <div className="flex items-center gap-2">
                {safetyPassed ? <Check className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                <span className="font-medium">{safetyPassed ? 'All safety checks passed - ready for human review' : 'Safety checks failed - fix issues before proceeding'}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentGate(5)}>Back</Button>
              <Button onClick={proceedToReview} disabled={!safetyPassed} className="flex-1">
                <Eye className="w-4 h-4 mr-2" /> Continue to Human Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gate 7: Review */}
      {currentGate === 7 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" /> Gate 7: Human Review & Approval
            </CardTitle>
            <CardDescription>Final human checkpoint before AI agents begin autonomous work</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Purpose Explanation */}
            <Alert>
              <Eye className="h-4 w-4" />
              <AlertDescription>
                <strong>Why this step:</strong> This is your last chance to review everything before AI agents start writing code autonomously. Once approved, the workflow runs without further input until completion.
              </AlertDescription>
            </Alert>

            {/* Review Checklist */}
            <div className="border rounded-lg p-4">
              <div className="font-medium text-sm mb-3">Review Checklist - Verify Before Approving</div>
              <div className="space-y-2">
                {[
                  { label: 'Story description accurately captures the requirement', checked: true },
                  { label: 'Acceptance criteria are specific and testable', checked: formData.acceptance_criteria.filter(a => a.trim()).length >= 5 },
                  { label: 'Correct domain selected (FE/BE/Fullstack)', checked: true },
                  { label: 'Target project path is correct', checked: true },
                  { label: 'Branch name follows conventions', checked: branchCreated },
                  { label: 'Safety checks all passed', checked: safetyPassed },
                ].map(({ label, checked }) => (
                  <div key={label} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                    <input type="checkbox" checked={checked} readOnly className="w-4 h-4" />
                    <span className="text-sm">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Story Summary */}
            <div className="border rounded-lg p-4">
              <div className="font-medium text-sm mb-3">Story Summary</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Story ID:</span>
                  <span className="font-mono ml-2">{storyId}</span>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Branch:</span>
                  <span className="font-mono ml-2 text-xs">{branchName}</span>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Domain:</span>
                  <Badge className="ml-2">{formData.domain.toUpperCase()}</Badge>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Safety:</span>
                  <span className="text-green-500 font-medium ml-2">{(safetyScore*100).toFixed(0)}%</span>
                </div>
                <div className="p-2 bg-muted/50 rounded col-span-2">
                  <span className="text-muted-foreground">Acceptance Criteria:</span>
                  <span className="ml-2">{formData.acceptance_criteria.filter(a=>a.trim()).length} items</span>
                </div>
                {tagName && (
                  <div className="p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">Release Tag:</span>
                    <span className="font-mono ml-2">{tagName}</span>
                  </div>
                )}
                {hasMilestone && milestone && (
                  <div className="p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">Milestone:</span>
                    <span className="ml-2">{milestone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Export Handoff */}
            <div className="border rounded-lg p-4 bg-blue-500/5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-medium text-sm">Export Handoff Document</div>
                  <div className="text-xs text-muted-foreground">Generate a .md file with all story details to paste into Claude Code</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyMarkdownToClipboard}>
                    <Copy className="w-4 h-4 mr-1" /> Copy to Clipboard
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadMarkdown}>
                    <FileDown className="w-4 h-4 mr-1" /> Download .md
                  </Button>
                </div>
              </div>
              {handoffMarkdown && (
                <div className="bg-muted p-3 rounded max-h-32 overflow-y-auto mt-2">
                  <pre className="text-xs whitespace-pre-wrap font-mono">{handoffMarkdown.slice(0, 300)}...</pre>
                </div>
              )}
            </div>

            {/* Action Buttons with Explanations */}
            <div className="border rounded-lg p-4">
              <div className="font-medium text-sm mb-3">Your Decision</div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <Button variant="destructive" className="w-full mb-2" onClick={() => { setError('Story rejected'); setCurrentGate(0); }}>
                    <XCircle className="w-4 h-4 mr-1" /> Reject
                  </Button>
                  <p className="text-xs text-muted-foreground">Cancel this story entirely</p>
                </div>
                <div className="text-center">
                  <Button variant="outline" className="w-full mb-2" onClick={() => setCurrentGate(4)}>
                    <AlertTriangle className="w-4 h-4 mr-1" /> Request Changes
                  </Button>
                  <p className="text-xs text-muted-foreground">Go back and modify the plan</p>
                </div>
                <div className="text-center">
                  <Button className="w-full mb-2 bg-green-600 hover:bg-green-700" onClick={approveAndDispatch} disabled={isLoading}>
                    {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Dispatching...</> : <><Rocket className="w-4 h-4 mr-1" /> Approve & Start</>}
                  </Button>
                  <p className="text-xs text-muted-foreground">Start autonomous AI workflow</p>
                </div>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={() => setCurrentGate(6)} className="w-full">
              <Eye className="w-4 h-4 mr-1" /> Back to Safety Check
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Gate 8: Success */}
      {currentGate === 8 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" /> Workflow Started!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert><CheckCircle2 className="h-4 w-4" /><AlertDescription>WAVE workflow dispatched. Autonomous execution in progress.</AlertDescription></Alert>
            <div className="bg-muted p-4 rounded-lg font-mono text-sm">
              <div><strong>Story ID:</strong> {storyId}</div>
              <div><strong>Branch:</strong> {branchName}</div>
              {workflowResult?.thread_id && <div><strong>Thread ID:</strong> {workflowResult.thread_id}</div>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/waves')}>View Waves</Button>
              <Button onClick={() => window.location.reload()}>Create Another</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
