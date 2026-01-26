/**
 * TabLayout Components
 *
 * Standardized layout components for consistent tab design across all steps.
 * Following the 5-section pattern:
 * 1. InfoBox - What is this step
 * 2. KPICards - Metrics/Progress
 * 3. MainCTA - Primary action button
 * 4. ResultSummary - Status after validation
 * 5. ExpandableCard - Progressive disclosure details
 */

import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, Info, CheckCircle2, XCircle, Clock, AlertTriangle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// 1. INFO BOX - Step description
// ============================================

interface InfoBoxProps {
  title: string;
  description: string;
  icon?: ReactNode;
}

export function InfoBox({ title, description, icon }: InfoBoxProps) {
  return (
    <div className="bg-blue-500/10 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
          {icon || <Info className="h-4 w-4 text-blue-500" />}
        </div>
        <div>
          <h3 className="font-semibold text-blue-500 mb-1">{title}</h3>
          <p className="text-sm text-blue-500/80">{description}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 2. KPI CARDS - Metrics display
// ============================================

interface KPIItem {
  label: string;
  value: string | number;
  status?: 'success' | 'warning' | 'error' | 'neutral';
  icon?: ReactNode;
}

interface KPICardsProps {
  items: KPIItem[];
  progress?: {
    label: string;
    value: number;
    max: number;
  };
}

export function KPICards({ items, progress }: KPICardsProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success': return 'text-green-500';
      case 'warning': return 'text-amber-500';
      case 'error': return 'text-red-500';
      default: return 'text-foreground';
    }
  };

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {items.map((item, index) => (
        <div key={index} className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            {item.icon && <span className="text-muted-foreground">{item.icon}</span>}
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{item.label}</span>
          </div>
          <p className={cn("text-2xl font-bold", getStatusColor(item.status))}>{item.value}</p>
        </div>
      ))}
      {progress && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{progress.label}</span>
            <span className="text-sm font-semibold">{Math.round((progress.value / progress.max) * 100)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${(progress.value / progress.max) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// 3. ACTION BAR - Full-width CTA section
// ============================================

interface ActionBarProps {
  category: string;
  title: string;
  description?: string;
  statusBadge?: {
    label: string;
    icon?: ReactNode;
    variant?: 'info' | 'success' | 'warning';
  };
  primaryAction: {
    label: string;
    onClick: () => void;
    loading?: boolean;
    disabled?: boolean;
    icon?: ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
    disabled?: boolean;
  };
}

export function ActionBar({
  category,
  title,
  description,
  statusBadge,
  primaryAction,
  secondaryAction
}: ActionBarProps) {
  const badgeVariants = {
    info: 'bg-blue-500/10 text-blue-500',
    success: 'bg-green-500/10 text-green-500',
    warning: 'bg-amber-500/10 text-amber-500',
  };

  return (
    <div className="flex items-center justify-between p-5 border border-border bg-card rounded-2xl mb-6">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{category}</span>
        <div>
          <span className="font-semibold">{title}</span>
          {description && <span className="text-muted-foreground ml-2 text-sm">{description}</span>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {statusBadge && (
          <span className={cn(
            "text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium",
            badgeVariants[statusBadge.variant || 'info']
          )}>
            {statusBadge.icon}
            {statusBadge.label}
          </span>
        )}
        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:opacity-90 flex items-center gap-2"
          >
            {secondaryAction.icon}
            {secondaryAction.label}
          </button>
        )}
        <button
          onClick={primaryAction.onClick}
          disabled={primaryAction.loading || primaryAction.disabled}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {primaryAction.loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
              Processing...
            </>
          ) : (
            <>
              {primaryAction.icon}
              {primaryAction.label}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ============================================
// 3b. MAIN CTA - Centered button (legacy, kept for compatibility)
// ============================================

interface MainCTAProps {
  label: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  variant?: 'primary' | 'success' | 'warning';
}

export function MainCTA({ label, onClick, loading, disabled, icon, variant = 'primary' }: MainCTAProps) {
  const variantStyles = {
    primary: 'bg-primary hover:bg-primary/90 text-primary-foreground',
    success: 'bg-green-500 hover:bg-green-600 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white',
  };

  return (
    <div className="flex justify-center mb-6">
      <button
        onClick={onClick}
        disabled={loading || disabled}
        className={cn(
          "px-8 py-3 rounded-xl font-semibold text-sm transition-all flex items-center gap-2",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variantStyles[variant]
        )}
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
            Processing...
          </>
        ) : (
          <>
            {icon}
            {label}
          </>
        )}
      </button>
    </div>
  );
}

// ============================================
// 4. RESULT SUMMARY - Status after validation
// ============================================

interface ResultSummaryProps {
  status: 'pass' | 'fail' | 'warn' | 'pending' | 'idle';
  message: string;
  timestamp?: string;
  mdFile?: {
    name: string;
    path: string;
  };
  onViewFile?: () => void;
}

export function ResultSummary({ status, message, timestamp, mdFile, onViewFile }: ResultSummaryProps) {
  const statusConfig = {
    pass: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10', label: 'PASSED' },
    fail: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'FAILED' },
    warn: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'WARNING' },
    pending: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted', label: 'PENDING' },
    idle: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted', label: 'NOT RUN' },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn("rounded-xl p-4 mb-6", config.bg)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className={cn("h-5 w-5", config.color)} />
          <div>
            <div className="flex items-center gap-2">
              <span className={cn("text-xs font-bold uppercase", config.color)}>{config.label}</span>
              {timestamp && (
                <span className="text-xs text-muted-foreground">· {timestamp}</span>
              )}
            </div>
            <p className={cn("text-sm", config.color)}>{message}</p>
          </div>
        </div>
        {mdFile && (
          <button
            onClick={onViewFile}
            className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg text-xs hover:bg-muted transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            {mdFile.name}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// 5. EXPANDABLE CARD - Progressive disclosure
// ============================================

interface ExpandableCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  status?: 'pass' | 'fail' | 'warn' | 'pending';
  defaultExpanded?: boolean;
  expanded?: boolean; // Controlled mode
  onExpandChange?: (expanded: boolean) => void; // Callback for controlled mode
  children: ReactNode;
  badge?: string;
}

export function ExpandableCard({
  title,
  subtitle,
  icon,
  status,
  defaultExpanded = false,
  expanded: controlledExpanded,
  onExpandChange,
  children,
  badge
}: ExpandableCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);

  // Use controlled or uncontrolled mode
  const isControlled = controlledExpanded !== undefined;
  const expanded = isControlled ? controlledExpanded : internalExpanded;

  const handleToggle = () => {
    const newValue = !expanded;
    if (isControlled) {
      onExpandChange?.(newValue);
    } else {
      setInternalExpanded(newValue);
    }
  };

  const statusIcon = {
    pass: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    fail: <XCircle className="h-4 w-4 text-red-500" />,
    warn: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    pending: <Clock className="h-4 w-4 text-muted-foreground" />,
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden mb-3 bg-card">
      <button
        onClick={handleToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          {icon && (
            <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-500/20">
              {icon}
            </span>
          )}
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-medium">{title}</span>
              {badge && (
                <span className="px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground">{badge}</span>
              )}
            </div>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {status && statusIcon[status]}
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-border bg-muted/30">
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================
// TAB CONTAINER - Wrapper for consistent spacing
// ============================================

interface TabContainerProps {
  children: ReactNode;
}

export function TabContainer({ children }: TabContainerProps) {
  return (
    <div className="space-y-6">
      {children}
    </div>
  );
}

// ============================================
// SECTION DIVIDER - Visual separator
// ============================================

interface SectionDividerProps {
  label?: string;
}

export function SectionDivider({ label }: SectionDividerProps) {
  if (!label) {
    return <div className="border-t border-border my-6" />;
  }

  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 border-t border-border" />
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className="flex-1 border-t border-border" />
    </div>
  );
}

export default {
  InfoBox,
  KPICards,
  ActionBar,
  MainCTA,
  ResultSummary,
  ExpandableCard,
  TabContainer,
  SectionDivider,
};
