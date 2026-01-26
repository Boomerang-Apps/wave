/**
 * AlignmentReport Component
 *
 * Visualizes alignment between PRD, Stories, and Mockups.
 * Shows coverage scores, gaps, and actionable recommendations.
 */

import { useState } from 'react';
import {
  Link2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Layers,
  Image,
  ChevronDown,
  ChevronRight,
  Target,
  ArrowRight,
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface FeatureGap {
  featureId: string;
  featureName: string;
  domain: string;
  priority: string;
}

export interface StoryGap {
  storyId: string;
  title: string;
  domain: string;
}

export interface MissingRef {
  storyId: string;
  missingFile: string;
}

export interface DomainMismatch {
  featureId: string;
  storyId: string;
  featureDomain: string;
  storyDomain: string;
}

export interface PriorityMismatch {
  featureId: string;
  storyId: string;
  featurePriority: string;
  storyPriority: string;
}

export interface Recommendation {
  type: 'create_story' | 'add_mockup_ref' | 'fix_domain' | 'fix_priority' | 'remove_orphan';
  priority: 'high' | 'medium' | 'low';
  message: string;
  target: string;
}

export interface AlignmentReportData {
  valid: boolean;
  score: number;
  timestamp: string;
  scores: {
    prdStories: number;
    storyMockups: number;
    prdMockups: number;
  };
  coverage: {
    featuresWithStories: number;
    totalFeatures: number;
    featureCoverage: number;
    uiStoriesWithMockups: number;
    totalUIStories: number;
    mockupCoverage: number;
  };
  gaps: {
    featuresWithoutStories: FeatureGap[];
    storiesWithoutFeatures: StoryGap[];
    uiStoriesWithoutMockups: StoryGap[];
    missingMockupRefs: MissingRef[];
    domainMismatches: DomainMismatch[];
    priorityMismatches: PriorityMismatch[];
  };
  recommendations: Recommendation[];
}

export interface AlignmentReportProps {
  report: AlignmentReportData | null;
  loading?: boolean;
  onRunCheck?: () => void;
}

// ============================================
// Sub-components
// ============================================

function ScoreCard({
  label,
  score,
  maxScore,
  icon,
}: {
  label: string;
  score: number;
  maxScore: number;
  icon: React.ReactNode;
}) {
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const status = percentage >= 80 ? 'success' : percentage >= 60 ? 'warning' : 'error';

  const statusColors = {
    success: 'text-green-500 bg-green-500',
    warning: 'text-amber-500 bg-amber-500',
    error: 'text-red-500 bg-red-500',
  };

  return (
    <div className="bg-muted/30 rounded-xl p-4 border border-border">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-xs font-medium text-muted-foreground uppercase">{label}</span>
      </div>
      <div className="flex items-end gap-2 mb-2">
        <span className={cn("text-2xl font-bold", statusColors[status].split(' ')[0])}>
          {score}
        </span>
        <span className="text-sm text-muted-foreground">/ {maxScore}</span>
      </div>
      <div className="w-full bg-muted rounded-full h-1.5">
        <div
          className={cn("h-1.5 rounded-full transition-all", statusColors[status].split(' ')[1])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function CoverageCard({
  label,
  covered,
  total,
  percentage,
}: {
  label: string;
  covered: number;
  total: number;
  percentage: number;
}) {
  const status = percentage >= 80 ? 'success' : percentage >= 60 ? 'warning' : 'error';

  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">
          {covered} / {total}
        </span>
        <span
          className={cn(
            "px-2 py-0.5 rounded-full text-xs font-medium",
            status === 'success' ? 'bg-green-500/10 text-green-500' :
            status === 'warning' ? 'bg-amber-500/10 text-amber-500' :
            'bg-red-500/10 text-red-500'
          )}
        >
          {percentage.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

function GapItem({
  type,
  items,
  icon,
  emptyMessage,
}: {
  type: string;
  items: Array<{ id: string; name: string; detail?: string }>;
  icon: React.ReactNode;
  emptyMessage: string;
}) {
  const [expanded, setExpanded] = useState(items.length > 0 && items.length <= 3);

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg text-green-500">
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-sm">{emptyMessage}</span>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{type}</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500">
            {items.length}
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="p-3 space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-sm p-2 bg-background rounded-lg">
              <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <span className="font-medium">{item.id}</span>
                {item.name && <span className="text-muted-foreground ml-1">- {item.name}</span>}
                {item.detail && (
                  <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const priorityColors = {
    high: 'bg-red-500/10 text-red-500 border-red-500/20',
    medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  };

  const typeIcons = {
    create_story: <FileText className="h-4 w-4" />,
    add_mockup_ref: <Image className="h-4 w-4" />,
    fix_domain: <Layers className="h-4 w-4" />,
    fix_priority: <AlertTriangle className="h-4 w-4" />,
    remove_orphan: <XCircle className="h-4 w-4" />,
  };

  return (
    <div className={cn("flex items-start gap-3 p-3 rounded-lg border", priorityColors[rec.priority])}>
      <div className="shrink-0 mt-0.5">{typeIcons[rec.type]}</div>
      <div className="flex-1">
        <p className="text-sm">{rec.message}</p>
        <p className="text-xs opacity-70 mt-1">Target: {rec.target}</p>
      </div>
      <span className="text-xs font-medium uppercase">{rec.priority}</span>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function AlignmentReport({ report, loading, onRunCheck }: AlignmentReportProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground">Checking alignment...</span>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border border-dashed border-border rounded-xl">
        <Link2 className="h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-muted-foreground mb-4">No alignment report yet</p>
        {onRunCheck && (
          <button
            onClick={onRunCheck}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            Check Alignment
          </button>
        )}
      </div>
    );
  }

  const overallStatus = report.score >= 90 ? 'excellent' :
                        report.score >= 80 ? 'good' :
                        report.score >= 70 ? 'acceptable' :
                        report.score >= 50 ? 'poor' : 'failing';

  const statusConfig = {
    excellent: { color: 'text-green-500', bg: 'bg-green-500/10', label: 'Excellent' },
    good: { color: 'text-green-500', bg: 'bg-green-500/10', label: 'Good' },
    acceptable: { color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Acceptable' },
    poor: { color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Needs Work' },
    failing: { color: 'text-red-500', bg: 'bg-red-500/10', label: 'Failing' },
  };

  const totalGaps =
    report.gaps.featuresWithoutStories.length +
    report.gaps.storiesWithoutFeatures.length +
    report.gaps.uiStoriesWithoutMockups.length +
    report.gaps.missingMockupRefs.length +
    report.gaps.domainMismatches.length +
    report.gaps.priorityMismatches.length;

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className={cn("p-6 rounded-2xl border", statusConfig[overallStatus].bg)}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", statusConfig[overallStatus].bg)}>
              <Target className={cn("h-6 w-6", statusConfig[overallStatus].color)} />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Alignment Score</h3>
              <p className="text-sm text-muted-foreground">
                {new Date(report.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={cn("text-4xl font-bold", statusConfig[overallStatus].color)}>
              {report.score}
            </p>
            <p className={cn("text-sm font-medium", statusConfig[overallStatus].color)}>
              {statusConfig[overallStatus].label}
            </p>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-2">
          {report.valid ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          )}
          <span className="text-sm">
            {report.valid
              ? 'Alignment check passed - ready for development'
              : `${totalGaps} gaps found - review recommendations below`}
          </span>
        </div>
      </div>

      {/* Score Breakdown */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground uppercase mb-3">Score Breakdown</h4>
        <div className="grid grid-cols-3 gap-4">
          <ScoreCard
            label="PRD ↔ Stories"
            score={report.scores.prdStories}
            maxScore={50}
            icon={<FileText className="h-4 w-4" />}
          />
          <ScoreCard
            label="Stories ↔ Mockups"
            score={report.scores.storyMockups}
            maxScore={30}
            icon={<Layers className="h-4 w-4" />}
          />
          <ScoreCard
            label="PRD ↔ Mockups"
            score={report.scores.prdMockups}
            maxScore={20}
            icon={<Image className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* Coverage */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground uppercase mb-3">Coverage</h4>
        <div className="space-y-2">
          <CoverageCard
            label="Features with Stories"
            covered={report.coverage.featuresWithStories}
            total={report.coverage.totalFeatures}
            percentage={report.coverage.featureCoverage}
          />
          <CoverageCard
            label="UI Stories with Mockups"
            covered={report.coverage.uiStoriesWithMockups}
            total={report.coverage.totalUIStories}
            percentage={report.coverage.mockupCoverage}
          />
        </div>
      </div>

      {/* Gaps */}
      {totalGaps > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground uppercase mb-3">
            Identified Gaps ({totalGaps})
          </h4>
          <div className="space-y-3">
            <GapItem
              type="Features Without Stories"
              items={report.gaps.featuresWithoutStories.map(f => ({
                id: f.featureId,
                name: f.featureName,
                detail: `${f.domain} • ${f.priority}`,
              }))}
              icon={<FileText className="h-4 w-4 text-red-500" />}
              emptyMessage="All features have stories"
            />
            <GapItem
              type="Stories Without Features"
              items={report.gaps.storiesWithoutFeatures.map(s => ({
                id: s.storyId,
                name: s.title,
                detail: s.domain,
              }))}
              icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
              emptyMessage="All stories linked to features"
            />
            <GapItem
              type="UI Stories Without Mockups"
              items={report.gaps.uiStoriesWithoutMockups.map(s => ({
                id: s.storyId,
                name: s.title,
                detail: s.domain,
              }))}
              icon={<Image className="h-4 w-4 text-red-500" />}
              emptyMessage="All UI stories have mockup refs"
            />
            <GapItem
              type="Domain Mismatches"
              items={report.gaps.domainMismatches.map(m => ({
                id: `${m.featureId} → ${m.storyId}`,
                name: '',
                detail: `Feature: ${m.featureDomain} ≠ Story: ${m.storyDomain}`,
              }))}
              icon={<Layers className="h-4 w-4 text-amber-500" />}
              emptyMessage="All domains match"
            />
            <GapItem
              type="Priority Mismatches"
              items={report.gaps.priorityMismatches.map(m => ({
                id: `${m.featureId} → ${m.storyId}`,
                name: '',
                detail: `Feature: ${m.featurePriority} ≠ Story: ${m.storyPriority}`,
              }))}
              icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
              emptyMessage="All priorities match"
            />
          </div>
        </div>
      )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <h4 className="text-sm font-medium text-muted-foreground uppercase">
              Recommendations ({report.recommendations.length})
            </h4>
          </div>
          <div className="space-y-2">
            {report.recommendations.map((rec, i) => (
              <RecommendationCard key={i} rec={rec} />
            ))}
          </div>
        </div>
      )}

      {/* Re-run button */}
      {onRunCheck && (
        <div className="flex justify-center pt-4">
          <button
            onClick={onRunCheck}
            className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            Re-check Alignment
          </button>
        </div>
      )}
    </div>
  );
}

export default AlignmentReport;
