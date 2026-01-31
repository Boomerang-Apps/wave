/**
 * BlueprintPage Component
 *
 * Foundation analysis page matching the Infrastructure/Git page style.
 * Shows project structure checks, documentation, mockups validation.
 */

import { useState } from 'react';
import {
  FolderTree,
  FileText,
  Image,
  Shield,
  Search,
  Filter,
  Play,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Maximize2,
  MoreVertical,
  X,
  Sparkles,
  GitBranch,
  Package,
  Zap
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Checkbox } from '../Checkbox';
import { IconBadge } from '../IconBadge';
import type { FoundationReport } from '../FoundationAnalysisProgress';

interface BlueprintCheck {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: 'pass' | 'fail' | 'warn' | 'pending';
  details: string;
  proof?: string;
  category: string;
}

interface BlueprintPageProps {
  projectPath: string;
  projectName: string;
  report: FoundationReport | null;
  isAnalyzing: boolean;
  onRunAnalysis: () => void;
  onViewDetails: () => void;
}

export function BlueprintPage({
  report,
  isAnalyzing,
  onRunAnalysis,
}: BlueprintPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChecks, setSelectedChecks] = useState<Set<string>>(new Set());
  const [flyoutCheck, setFlyoutCheck] = useState<BlueprintCheck | null>(null);

  // Convert report to checks
  const checks = getChecksFromReport(report);
  const filteredChecks = checks.filter(check =>
    check.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    check.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate status
  const passCount = checks.filter(c => c.status === 'pass').length;
  const failCount = checks.filter(c => c.status === 'fail').length;
  const warnCount = checks.filter(c => c.status === 'warn').length;
  const pendingCount = checks.filter(c => c.status === 'pending').length;
  const isReady = report?.validationStatus === 'ready';

  const toggleCheck = (id: string) => {
    setSelectedChecks(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const lastChecked = report?.timestamp
    ? new Date(report.timestamp).toLocaleTimeString()
    : null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[#fafafa]">Blueprint</h1>
          <p className="text-sm text-[#666]">{lastChecked || 'Not analyzed yet'}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Analysis Mode Badge */}
          <div className="px-3 py-1.5 bg-[#2e2e2e] rounded-lg text-sm text-[#a3a3a3] flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" />
            {report?.mode === 'existing' ? 'Existing Project' : report?.mode === 'monorepo' ? 'Monorepo' : 'New Project'}
          </div>
          {/* Status Badge */}
          {report ? (
            <div className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2",
              isReady
                ? "bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30"
                : "bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/30"
            )}>
              {isReady ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" />
              )}
              {isReady ? 'Ready' : 'Not Ready'}
              <span className="font-bold">{report.readinessScore}%</span>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 bg-[#3e3e3e]/50 text-[#666]">
              <Clock className="h-3.5 w-3.5" />
              Pending
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[#2e2e2e]" />

      {/* Section Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#2e2e2e] flex items-center justify-center">
          <FolderTree className="h-6 w-6 text-[#666]" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-[#fafafa]">Foundation Analysis</h2>
          <p className="text-sm text-[#666]">
            Validate project structure, documentation, mockups, and tech stack before development.
          </p>
        </div>
      </div>

      {/* Search, Filter, and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#666]" />
            <input
              type="text"
              placeholder="Search checks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-[240px] bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg text-sm text-[#fafafa] placeholder:text-[#666] focus:outline-none focus:border-[#3e3e3e]"
            />
          </div>
          {/* Filter Button */}
          <button className="flex items-center gap-2 px-3 py-2 bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg text-sm text-[#a3a3a3] hover:border-[#3e3e3e] hover:text-[#fafafa] transition-colors">
            <Filter className="h-4 w-4" />
            Filter
          </button>
        </div>

        {/* Run Analysis Button */}
        <button
          onClick={onRunAnalysis}
          disabled={isAnalyzing}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            isAnalyzing
              ? "bg-[#3b82f6]/20 text-[#3b82f6] cursor-wait"
              : "bg-[#fafafa] text-[#1e1e1e] hover:bg-[#e5e5e5]"
          )}
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Analyze Foundation
            </>
          )}
        </button>
      </div>

      {/* Checks Table */}
      <div className="bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2e2e2e]">
              <th className="w-10 px-4 py-3">
                <Checkbox
                  checked={selectedChecks.size === filteredChecks.length && filteredChecks.length > 0}
                  onChange={(checked: boolean) => {
                    if (checked) {
                      setSelectedChecks(new Set(filteredChecks.map(c => c.id)));
                    } else {
                      setSelectedChecks(new Set());
                    }
                  }}
                />
              </th>
              <th className="text-left text-xs font-medium text-[#666] uppercase tracking-wider px-4 py-3">Check</th>
              <th className="text-left text-xs font-medium text-[#666] uppercase tracking-wider px-4 py-3 w-[120px]">Status</th>
              <th className="text-left text-xs font-medium text-[#666] uppercase tracking-wider px-4 py-3">Details</th>
              <th className="text-right text-xs font-medium text-[#666] uppercase tracking-wider px-4 py-3 w-[100px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredChecks.map((check) => (
              <tr
                key={check.id}
                className="border-b border-[#2e2e2e] last:border-b-0 hover:bg-[#252525] transition-colors"
              >
                <td className="px-4 py-3">
                  <Checkbox
                    checked={selectedChecks.has(check.id)}
                    onChange={() => toggleCheck(check.id)}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <IconBadge icon={check.icon} size="xs" />
                    <span className="text-sm font-medium text-[#fafafa]">{check.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={check.status} />
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-[#888]">{check.details}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setFlyoutCheck(check)}
                      className="p-1.5 text-[#666] hover:text-[#a3a3a3] hover:bg-[#2e2e2e] rounded transition-colors"
                      title="View details"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                    <button
                      className="p-1.5 text-[#666] hover:text-[#a3a3a3] hover:bg-[#2e2e2e] rounded transition-colors"
                      title="More actions"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredChecks.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#2e2e2e] flex items-center justify-center">
                      <FolderTree className="h-6 w-6 text-[#666]" />
                    </div>
                    <p className="text-sm text-[#666]">
                      {report ? 'No checks match your search' : 'Run analysis to see foundation checks'}
                    </p>
                    {!report && (
                      <button
                        onClick={onRunAnalysis}
                        className="px-4 py-2 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-[#2563eb] transition-colors"
                      >
                        Start Analysis
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      {report && (
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Passed" value={passCount} color="green" />
          <StatCard label="Failed" value={failCount} color="red" />
          <StatCard label="Warnings" value={warnCount} color="yellow" />
          <StatCard label="Pending" value={pendingCount} color="gray" />
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-xs text-[#555]">
          Generated: {new Date().toLocaleString()} | Dashboard v1.0.0 | Foundation Validation System
        </p>
      </div>

      {/* Flyout Panel */}
      {flyoutCheck && (
        <CheckFlyout
          check={flyoutCheck}
          onClose={() => setFlyoutCheck(null)}
        />
      )}
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: 'pass' | 'fail' | 'warn' | 'pending' }) {
  const config = {
    pass: { bg: 'bg-[#22c55e]/20', text: 'text-[#22c55e]', label: 'Pass' },
    fail: { bg: 'bg-[#ef4444]/20', text: 'text-[#ef4444]', label: 'Fail' },
    warn: { bg: 'bg-[#f97316]/20', text: 'text-[#f97316]', label: 'Warning' },
    pending: { bg: 'bg-[#3e3e3e]', text: 'text-[#888]', label: 'Pending' },
  };
  const { bg, text, label } = config[status];

  return (
    <span className={cn("px-2 py-0.5 text-xs font-medium rounded-md", bg, text)}>
      {label}
    </span>
  );
}

// Stat Card Component
function StatCard({ label, value, color }: { label: string; value: number; color: 'green' | 'red' | 'yellow' | 'gray' }) {
  const colorClasses = {
    green: 'text-[#22c55e]',
    red: 'text-[#ef4444]',
    yellow: 'text-[#f97316]',
    gray: 'text-[#888]',
  };

  return (
    <div className="bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg p-4 text-center">
      <p className={cn("text-2xl font-bold", colorClasses[color])}>{value}</p>
      <p className="text-xs text-[#666] uppercase tracking-wide">{label}</p>
    </div>
  );
}

// Check Flyout Component
function CheckFlyout({ check, onClose }: { check: BlueprintCheck; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-[500px] max-w-[90vw] bg-[#1a1a1a] border-l border-[#2e2e2e] z-50 flex flex-col shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-[#2e2e2e]">
          <div className="flex items-center gap-3">
            <IconBadge icon={check.icon} size="sm" />
            <div>
              <h3 className="text-sm font-semibold text-[#fafafa]">{check.name}</h3>
              <p className="text-xs text-[#666]">{check.category}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#666] hover:text-[#fafafa] hover:bg-[#2e2e2e] rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between p-3 bg-[#252525] rounded-lg">
            <span className="text-sm text-[#a3a3a3]">Status</span>
            <StatusBadge status={check.status} />
          </div>

          {/* Details */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-[#666] uppercase tracking-wide">Details</h4>
            <p className="text-sm text-[#a3a3a3]">{check.details}</p>
          </div>

          {/* Proof */}
          {check.proof && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-[#666] uppercase tracking-wide">Proof</h4>
              <div className="p-3 bg-[#0a0a0a] rounded-lg font-mono text-xs text-[#888] whitespace-pre-wrap overflow-x-auto">
                {check.proof}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Helper: Convert report to checks
function getChecksFromReport(report: FoundationReport | null): BlueprintCheck[] {
  if (!report) {
    return [
      { id: 'structure', name: 'Project Structure', icon: <FolderTree className="h-3.5 w-3.5" />, status: 'pending', details: 'Run validation to check', category: 'Structure' },
      { id: 'documentation', name: 'Documentation', icon: <FileText className="h-3.5 w-3.5" />, status: 'pending', details: 'Run validation to check', category: 'Documentation' },
      { id: 'mockups', name: 'Design Mockups', icon: <Image className="h-3.5 w-3.5" />, status: 'pending', details: 'Run validation to check', category: 'Design' },
      { id: 'techstack', name: 'Tech Stack', icon: <Zap className="h-3.5 w-3.5" />, status: 'pending', details: 'Run validation to check', category: 'Tech Stack' },
      { id: 'compliance', name: 'Folder Compliance', icon: <Shield className="h-3.5 w-3.5" />, status: 'pending', details: 'Run validation to check', category: 'Compliance' },
      { id: 'packagejson', name: 'package.json', icon: <Package className="h-3.5 w-3.5" />, status: 'pending', details: 'Run validation to check', category: 'Config' },
      { id: 'gitrepo', name: 'Git Repository', icon: <GitBranch className="h-3.5 w-3.5" />, status: 'pending', details: 'Run validation to check', category: 'Version Control' },
    ];
  }

  const checks: BlueprintCheck[] = [];

  // Structure
  const structureStatus = report.analysis.structure?.status;
  checks.push({
    id: 'structure',
    name: 'Project Structure',
    icon: <FolderTree className="h-3.5 w-3.5" />,
    status: structureStatus === 'pass' || structureStatus === 'found' ? 'pass' : structureStatus === 'fail' ? 'fail' : 'warn',
    details: report.analysis.structure?.findings?.[0] || 'Project structure analyzed',
    proof: report.analysis.structure?.proof,
    category: 'Structure'
  });

  // Documentation
  const docsFound = report.analysis.documentation?.docsFound?.length || 0;
  checks.push({
    id: 'documentation',
    name: 'Documentation',
    icon: <FileText className="h-3.5 w-3.5" />,
    status: docsFound > 0 ? 'pass' : 'warn',
    details: docsFound > 0 ? `Found ${docsFound} documents` : 'No documentation found',
    proof: report.analysis.documentation?.docsFound?.map(d => `✓ ${d.name}`).join('\n'),
    category: 'Documentation'
  });

  // Mockups
  const mockupsCount = report.analysis.mockups?.count || 0;
  checks.push({
    id: 'mockups',
    name: 'Design Mockups',
    icon: <Image className="h-3.5 w-3.5" />,
    status: mockupsCount > 0 ? 'pass' : 'warn',
    details: mockupsCount > 0 ? `Found ${mockupsCount} mockups` : 'No mockups found',
    proof: report.analysis.mockups?.mockupsFound?.join('\n'),
    category: 'Design'
  });

  // Tech Stack
  const techStack = report.analysis.techstack?.techStack || [];
  checks.push({
    id: 'techstack',
    name: 'Tech Stack',
    icon: <Zap className="h-3.5 w-3.5" />,
    status: techStack.length > 0 ? 'pass' : 'warn',
    details: techStack.length > 0 ? techStack.join(', ') : 'No tech stack detected',
    proof: report.analysis.techstack?.proof,
    category: 'Tech Stack'
  });

  // Compliance
  const complianceScore = report.analysis.compliance?.complianceScore || 0;
  checks.push({
    id: 'compliance',
    name: 'Folder Compliance',
    icon: <Shield className="h-3.5 w-3.5" />,
    status: complianceScore >= 80 ? 'pass' : complianceScore >= 50 ? 'warn' : 'fail',
    details: `Compliance score: ${complianceScore}%`,
    proof: report.analysis.compliance?.findings?.join('\n'),
    category: 'Compliance'
  });

  // Package.json (from compliance findings)
  const hasPackageJson = report.analysis.compliance?.findings?.some(f => f.toLowerCase().includes('package.json'));
  checks.push({
    id: 'packagejson',
    name: 'package.json',
    icon: <Package className="h-3.5 w-3.5" />,
    status: hasPackageJson ? 'pass' : 'warn',
    details: hasPackageJson ? 'package.json present' : 'package.json not found',
    category: 'Config'
  });

  // Add issues as failed checks
  report.blockingReasons?.forEach((reason, i) => {
    checks.push({
      id: `blocking-${i}`,
      name: reason.split(':')[0] || 'Blocking Issue',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      status: 'fail',
      details: reason,
      category: 'Issues'
    });
  });

  return checks;
}

export default BlueprintPage;
