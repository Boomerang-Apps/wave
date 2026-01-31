/**
 * ContentPage Component
 *
 * Standardized content page template with:
 * - Title + description header
 * - Optional tabs
 * - Action bar: Search, Filter, Add Item, Sync, View Toggle
 * - Grid with: checkbox, chevron, icon, name, status, type, size, last update, flyout, more actions
 * - Enhanced flyout panel with tabs support
 *
 * Colors: Fill #1e1e1e, Border #2e2e2e, Hover #252525
 */

import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Search,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  ExternalLink,
  Maximize2,
  X,
  Copy,
  Terminal,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Filter,
  Plus,
  RefreshCw,
  List,
  LayoutGrid,
  MoreHorizontal,
  Save,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  Loader2,
  Check
} from 'lucide-react';
import { cn } from '../lib/utils';
import { MarkdownPreviewModal } from './MarkdownPreviewModal';

// ============================================================================
// Types
// ============================================================================

export interface ContentTab {
  id: string;
  label: string;
  icon?: ReactNode;
}

export interface ActionButton {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}

export interface TableColumn {
  id: string;
  label: string;
  width?: string;
}

export type RowStatus = 'pass' | 'fail' | 'warn' | 'pending' | 'found' | 'missing' | 'valid' | 'invalid' | 'configured' | 'active' | 'inactive';

export interface TableRow {
  id: string;
  name: string;
  icon?: 'file' | 'folder';
  customIcon?: ReactNode;
  description?: string;
  status?: RowStatus;
  type?: string;
  size?: string;
  lastUpdate?: string;
  cells: Record<string, ReactNode>;
  children?: TableRow[];
  expandable?: boolean;
  url?: string;
  badge?: string;
  filePath?: string;
  command?: string;
  output?: string;
  fixGuide?: string;
  codeSnippet?: string;
  value?: string;
  editable?: boolean;
  copyable?: boolean;
  testable?: boolean;
  onTest?: () => Promise<boolean>;
  onSave?: (value: string) => Promise<void>;
  metadata?: Record<string, unknown>;
}

export interface FlyoutTab {
  id: string;
  label: string;
  icon?: ReactNode;
  content?: ReactNode;
}

interface ContentPageProps {
  title: string;
  titleIcon?: ReactNode;
  description?: string;
  tabs?: ContentTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  actions?: ActionButton[];
  customActions?: ReactNode;
  columns?: TableColumn[];
  rows?: TableRow[];
  children?: ReactNode;
  emptyState?: ReactNode;
  onRowSelect?: (rowId: string, selected: boolean) => void;
  onRowExpand?: (row: TableRow) => void;
  renderFlyout?: (row: TableRow) => ReactNode;
  // New props for enhanced functionality
  onAddItem?: () => void;
  addItemLabel?: string;
  onSync?: () => Promise<void>;
  syncLabel?: string;
  showViewToggle?: boolean;
  showCheckboxes?: boolean;
  flyoutTabs?: FlyoutTab[];
  onFlyoutSave?: (row: TableRow, value: string) => Promise<void>;
  onFlyoutDelete?: (row: TableRow) => Promise<void>;
  isLoading?: boolean;
}

// ============================================================================
// Status Badge Component
// ============================================================================

function StatusBadge({ status }: { status: RowStatus }) {
  const config: Record<RowStatus, { label: string; color: string; bg: string }> = {
    pass: { label: 'Pass', color: 'text-[#22c55e]', bg: 'bg-[#22c55e]/10' },
    found: { label: 'Found', color: 'text-[#22c55e]', bg: 'bg-[#22c55e]/10' },
    valid: { label: 'Valid', color: 'text-[#22c55e]', bg: 'bg-[#22c55e]/10' },
    configured: { label: 'Configured', color: 'text-[#22c55e]', bg: 'bg-[#22c55e]/10' },
    active: { label: 'Active', color: 'text-[#22c55e]', bg: 'bg-[#22c55e]/10' },
    fail: { label: 'Failed', color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10' },
    missing: { label: 'Missing', color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10' },
    invalid: { label: 'Invalid', color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10' },
    warn: { label: 'Warning', color: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/10' },
    pending: { label: 'Pending', color: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/10' },
    inactive: { label: 'Inactive', color: 'text-[#666]', bg: 'bg-[#666]/10' }
  };

  const { label, color, bg } = config[status] || config.pending;

  return (
    <span className={cn("px-2 py-0.5 text-[10px] font-medium rounded", bg, color)}>
      {label}
    </span>
  );
}

// ============================================================================
// Enhanced Flyout Panel Component
// ============================================================================

function FlyoutPanel({
  row,
  onClose,
  isClosing,
  renderContent,
  tabs,
  onSave,
  onDelete,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext
}: {
  row: TableRow;
  onClose: () => void;
  isClosing: boolean;
  renderContent?: (row: TableRow) => ReactNode;
  tabs?: FlyoutTab[];
  onSave?: (value: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}) {
  const [activeTab, setActiveTab] = useState(tabs?.[0]?.id || 'details');
  const [editValue, setEditValue] = useState(row.value || '');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(editValue);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTest = async () => {
    if (!row.onTest) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await row.onTest();
      setTestResult(result ? 'success' : 'error');
    } catch {
      setTestResult('error');
    }
    setIsTesting(false);
    setTimeout(() => setTestResult(null), 3000);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const DefaultIcon = row.icon === 'folder' ? Folder : FileText;

  return (
    <div
      className={cn(
        "fixed inset-y-0 right-0 w-[800px] max-w-[90vw] bg-[#1e1e1e] border-l border-[#2e2e2e] z-50 flex flex-col shadow-2xl",
        "transition-transform duration-300 ease-out",
        isClosing ? "translate-x-full" : "translate-x-0"
      )}
    >
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#2e2e2e]">
        <div className="flex items-center gap-2">
          {/* Navigation arrows */}
          {(hasPrevious || hasNext) && (
            <>
              <button
                onClick={onPrevious}
                disabled={!hasPrevious}
                className={cn(
                  "p-1 rounded transition-colors",
                  hasPrevious ? "text-[#666] hover:text-[#fafafa] hover:bg-[#2e2e2e]" : "text-[#444] cursor-not-allowed"
                )}
              >
                <ChevronDown className="h-4 w-4 rotate-90" />
              </button>
              <button
                onClick={onNext}
                disabled={!hasNext}
                className={cn(
                  "p-1 rounded transition-colors",
                  hasNext ? "text-[#666] hover:text-[#fafafa] hover:bg-[#2e2e2e]" : "text-[#444] cursor-not-allowed"
                )}
              >
                <ChevronDown className="h-4 w-4 -rotate-90" />
              </button>
            </>
          )}
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-[#666] hover:text-[#fafafa] hover:bg-[#2e2e2e] rounded-lg transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Header with Icon, Title, Description */}
      <div className="px-5 py-4 border-b border-[#2e2e2e]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-[#2e2e2e] flex items-center justify-center text-[#666]">
              {row.customIcon || <DefaultIcon className="h-6 w-6" />}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#fafafa]">{row.name}</h3>
              {row.description && (
                <p className="text-sm text-[#666] mt-1">{row.description}</p>
              )}
            </div>
          </div>
          {row.status && <StatusBadge status={row.status} />}
        </div>
      </div>

      {/* Tabs */}
      {tabs && tabs.length > 1 && (
        <div className="flex items-center gap-1 px-5 py-2 border-b border-[#2e2e2e] bg-[#1a1a1a]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                activeTab === tab.id
                  ? "bg-[#2e2e2e] text-[#fafafa]"
                  : "text-[#666] hover:text-[#a3a3a3] hover:bg-[#252525]"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {renderContent ? renderContent(row) : tabs?.find(t => t.id === activeTab)?.content || (
          <div className="space-y-6">
            {/* Status Card */}
            {row.status && (
              <div className={cn(
                "rounded-xl p-4 flex items-center gap-3 border",
                row.status === 'pass' || row.status === 'found' || row.status === 'valid' || row.status === 'configured' || row.status === 'active'
                  ? "bg-[#22c55e]/5 border-[#22c55e]/20"
                  : row.status === 'fail' || row.status === 'missing' || row.status === 'invalid'
                  ? "bg-[#ef4444]/5 border-[#ef4444]/20"
                  : "bg-[#f59e0b]/5 border-[#f59e0b]/20"
              )}>
                {row.status === 'pass' || row.status === 'found' || row.status === 'valid' || row.status === 'configured' || row.status === 'active'
                  ? <CheckCircle2 className="h-5 w-5 text-[#22c55e]" />
                  : row.status === 'fail' || row.status === 'missing' || row.status === 'invalid'
                  ? <XCircle className="h-5 w-5 text-[#ef4444]" />
                  : <AlertTriangle className="h-5 w-5 text-[#f59e0b]" />}
                <div>
                  <p className={cn(
                    "text-sm font-medium",
                    row.status === 'pass' || row.status === 'found' || row.status === 'valid' || row.status === 'configured' || row.status === 'active'
                      ? "text-[#22c55e]"
                      : row.status === 'fail' || row.status === 'missing' || row.status === 'invalid'
                      ? "text-[#ef4444]"
                      : "text-[#f59e0b]"
                  )}>
                    <StatusBadge status={row.status} />
                  </p>
                </div>
              </div>
            )}

            {/* Editable Value Field */}
            {row.editable && (
              <div className="space-y-2">
                <label className="flex items-center justify-between text-xs font-medium text-[#a3a3a3]">
                  <span>Value</span>
                  {row.testable && (
                    <button
                      onClick={handleTest}
                      disabled={isTesting}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors",
                        testResult === 'success' ? "bg-[#22c55e]/10 text-[#22c55e]" :
                        testResult === 'error' ? "bg-[#ef4444]/10 text-[#ef4444]" :
                        "text-[#666] hover:text-[#a3a3a3]"
                      )}
                    >
                      {isTesting ? <Loader2 className="h-3 w-3 animate-spin" /> :
                       testResult === 'success' ? <Check className="h-3 w-3" /> :
                       testResult === 'error' ? <XCircle className="h-3 w-3" /> :
                       <RefreshCw className="h-3 w-3" />}
                      Test
                    </button>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg text-[#fafafa] font-mono focus:outline-none focus:border-[#3e3e3e]"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-2 text-[#666] hover:text-[#a3a3a3] hover:bg-[#2e2e2e] rounded-lg transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleCopy(editValue)}
                    className="p-2 text-[#666] hover:text-[#a3a3a3] hover:bg-[#2e2e2e] rounded-lg transition-colors"
                  >
                    {copied ? <Check className="h-4 w-4 text-[#22c55e]" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Command Section */}
            {row.command && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-[#666]">
                  <Terminal className="h-3.5 w-3.5" />
                  Command
                </div>
                <div className="relative">
                  <pre className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg p-3 text-sm font-mono text-[#a3a3a3] overflow-x-auto">
                    <code>{row.command}</code>
                  </pre>
                  <button
                    onClick={() => handleCopy(row.command || '')}
                    className="absolute top-2 right-2 p-1.5 rounded bg-[#2e2e2e] hover:bg-[#3e3e3e] text-[#666] hover:text-[#fafafa] transition-colors"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-[#22c55e]" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Output Section */}
            {row.output && (
              <div className="space-y-2">
                <span className="text-xs font-medium text-[#666]">Output</span>
                <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg p-3 max-h-48 overflow-y-auto">
                  <pre className="text-xs font-mono text-[#888] whitespace-pre-wrap">{row.output}</pre>
                </div>
              </div>
            )}

            {/* Code Snippet Section */}
            {row.codeSnippet && (
              <div className="space-y-2">
                <span className="text-xs font-medium text-[#666]">Code</span>
                <div className="relative">
                  <pre className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg p-3 text-sm font-mono text-[#a3a3a3] overflow-x-auto">
                    <code>{row.codeSnippet}</code>
                  </pre>
                  <button
                    onClick={() => handleCopy(row.codeSnippet || '')}
                    className="absolute top-2 right-2 p-1.5 rounded bg-[#2e2e2e] hover:bg-[#3e3e3e] text-[#666] hover:text-[#fafafa] transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Fix Guide Section */}
            {row.fixGuide && (
              <div className="space-y-2">
                <span className="text-xs font-medium text-[#666]">How to Fix</span>
                <div className="bg-[#252525] border border-[#2e2e2e] rounded-lg p-3">
                  <p className="text-sm text-[#a3a3a3] whitespace-pre-wrap">{row.fixGuide}</p>
                </div>
              </div>
            )}

            {/* Details Section */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-[#666]">Details</span>
              <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg divide-y divide-[#2e2e2e]">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-[#666]">Name</span>
                  <span className="text-sm text-[#fafafa]">{row.name}</span>
                </div>
                {row.type && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-[#666]">Type</span>
                    <span className="text-sm text-[#a3a3a3]">{row.type}</span>
                  </div>
                )}
                {row.size && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-[#666]">Size</span>
                    <span className="text-sm text-[#a3a3a3]">{row.size}</span>
                  </div>
                )}
                {row.lastUpdate && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-[#666]">Last Update</span>
                    <span className="text-sm text-[#a3a3a3]">{row.lastUpdate}</span>
                  </div>
                )}
                {row.cells && Object.entries(row.cells).filter(([key]) =>
                  !['status', 'message', 'type', 'size', 'lastUpdate'].includes(key)
                ).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-[#666] capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="text-sm text-[#a3a3a3]">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions Footer */}
      {(onSave || onDelete) && (
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#2e2e2e]">
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#ef4444]/10 text-[#ef4444] rounded-lg hover:bg-[#ef4444]/20 transition-colors disabled:opacity-50"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete
            </button>
          )}
          {onSave && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#fafafa] text-[#1e1e1e] rounded-lg hover:bg-[#e5e5e5] transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Expandable Row Component
// ============================================================================

function ExpandableRow({
  row,
  columns,
  level = 0,
  selectedRows,
  onSelect,
  onExpand,
  onMarkdownPreview,
  showCheckboxes
}: {
  row: TableRow;
  columns: TableColumn[];
  level?: number;
  selectedRows: Set<string>;
  onSelect: (rowId: string) => void;
  onExpand: (row: TableRow) => void;
  onMarkdownPreview?: (filePath: string, fileName: string) => void;
  showCheckboxes?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const hasChildren = row.children && row.children.length > 0;
  const DefaultIcon = row.icon === 'folder' ? Folder : FileText;
  const isSelected = selectedRows.has(row.id);
  const isMarkdownFile = row.name.endsWith('.md') && row.filePath;

  return (
    <>
      <tr className={cn(
        "border-b border-[#2e2e2e] hover:bg-[#252525] transition-colors",
        isSelected && "bg-[#252525]"
      )}>
        {/* Checkbox + Chevron + Icon + Name */}
        <td className="py-3 px-4">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 20}px` }}>
            {/* Checkbox */}
            {showCheckboxes && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onSelect(row.id)}
                className="w-4 h-4 rounded border border-[#3e3e3e] bg-[#1e1e1e] checked:bg-[#fafafa] checked:border-[#fafafa] focus:ring-0 focus:ring-offset-0 cursor-pointer appearance-none relative before:content-[''] before:absolute before:inset-0 before:flex before:items-center before:justify-center checked:before:content-['✓'] before:text-[10px] before:font-bold checked:before:text-[#1e1e1e]"
              />
            )}

            {/* Chevron */}
            {hasChildren ? (
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-0.5 hover:bg-[#3e3e3e] rounded transition-colors"
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4 text-[#666]" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-[#666]" />
                )}
              </button>
            ) : (
              <span className="w-5" />
            )}

            {/* Icon */}
            <span className="text-[#666]">
              {row.customIcon || <DefaultIcon className="h-4 w-4" />}
            </span>

            {/* Name */}
            {isMarkdownFile && onMarkdownPreview ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkdownPreview(row.filePath!, row.name);
                }}
                className="text-sm text-[#fafafa] hover:text-[#3b82f6] transition-colors flex items-center gap-1.5"
              >
                <span>{row.name}</span>
                {row.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-[#3b82f6]/20 text-[#3b82f6]">
                    {row.badge}
                  </span>
                )}
              </button>
            ) : row.url ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(row.url, '_blank');
                }}
                className="text-sm text-[#fafafa] hover:text-[#3b82f6] transition-colors flex items-center gap-1.5"
              >
                <span>{row.name}</span>
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100" />
              </button>
            ) : (
              <div>
                <span className="text-sm text-[#fafafa] flex items-center gap-1.5">
                  {row.name}
                  {row.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-[#3b82f6]/20 text-[#3b82f6]">
                      {row.badge}
                    </span>
                  )}
                </span>
                {row.description && (
                  <span className="text-xs text-[#666] block mt-0.5">{row.description}</span>
                )}
              </div>
            )}
          </div>
        </td>

        {/* Status */}
        <td className="py-3 px-4">
          {row.status && <StatusBadge status={row.status} />}
        </td>

        {/* Type */}
        <td className="py-3 px-4 text-sm text-[#666]">
          {row.type || row.cells?.type}
        </td>

        {/* Size */}
        <td className="py-3 px-4 text-sm text-[#666]">
          {row.size || row.cells?.size}
        </td>

        {/* Last Update */}
        <td className="py-3 px-4 text-sm text-[#666]">
          {row.lastUpdate || row.cells?.lastUpdate}
        </td>

        {/* Other columns */}
        {columns.slice(5).map((col) => (
          <td key={col.id} className="py-3 px-4 text-sm text-[#a3a3a3]">
            {row.cells?.[col.id]}
          </td>
        ))}

        {/* Actions: Flyout + More */}
        <td className="py-3 px-4">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => onExpand(row)}
              className="p-1.5 rounded hover:bg-[#3e3e3e] text-[#666] hover:text-[#fafafa] transition-colors"
              title="Open details"
            >
              <Maximize2 className="h-4 w-4" />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-1.5 rounded hover:bg-[#3e3e3e] text-[#666] hover:text-[#fafafa] transition-colors"
                title="More actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {showActions && (
                <div className="absolute right-0 top-full mt-1 py-1 bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg shadow-xl z-10 min-w-[140px]">
                  <button
                    onClick={() => {
                      onExpand(row);
                      setShowActions(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#a3a3a3] hover:bg-[#252525] transition-colors"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  {row.copyable !== false && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(row.value || row.command || row.name);
                        setShowActions(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#a3a3a3] hover:bg-[#252525] transition-colors"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </button>
                  )}
                  <button
                    onClick={() => setShowActions(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#ef4444] hover:bg-[#252525] transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </td>
      </tr>

      {/* Children rows */}
      {expanded && row.children?.map((child) => (
        <ExpandableRow
          key={child.id}
          row={child}
          columns={columns}
          level={level + 1}
          selectedRows={selectedRows}
          onSelect={onSelect}
          onExpand={onExpand}
          onMarkdownPreview={onMarkdownPreview}
          showCheckboxes={showCheckboxes}
        />
      ))}
    </>
  );
}

// ============================================================================
// Main ContentPage Component
// ============================================================================

export function ContentPage({
  title,
  titleIcon,
  description,
  tabs,
  activeTab,
  onTabChange,
  searchPlaceholder = 'Search...',
  onSearch,
  actions,
  customActions,
  columns,
  rows,
  children,
  emptyState,
  onRowSelect,
  onRowExpand,
  renderFlyout,
  onAddItem,
  addItemLabel = 'Add Item',
  onSync,
  syncLabel = 'Sync',
  showViewToggle = true,
  showCheckboxes = true,
  flyoutTabs,
  onFlyoutSave,
  onFlyoutDelete,
  isLoading = false
}: ContentPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [flyoutRow, setFlyoutRow] = useState<TableRow | null>(null);
  const [flyoutIndex, setFlyoutIndex] = useState(-1);
  const [isClosing, setIsClosing] = useState(false);
  const [markdownPreview, setMarkdownPreview] = useState<{ filePath: string; fileName: string } | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isSyncing, setIsSyncing] = useState(false);

  // Default columns if not provided
  const defaultColumns: TableColumn[] = [
    { id: 'name', label: 'Name' },
    { id: 'status', label: 'Status', width: '100px' },
    { id: 'type', label: 'Type', width: '120px' },
    { id: 'size', label: 'Size', width: '100px' },
    { id: 'lastUpdate', label: 'Updated', width: '120px' }
  ];

  const effectiveColumns = columns || defaultColumns;

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  const handleRowSelect = (rowId: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowId)) {
      newSelected.delete(rowId);
    } else {
      newSelected.add(rowId);
    }
    setSelectedRows(newSelected);
    onRowSelect?.(rowId, newSelected.has(rowId));
  };

  const handleRowExpand = (row: TableRow) => {
    const index = rows?.findIndex(r => r.id === row.id) ?? -1;
    setFlyoutIndex(index);
    setIsClosing(false);
    setFlyoutRow(row);
    onRowExpand?.(row);
  };

  const handleCloseFlyout = () => {
    setIsClosing(true);
    setTimeout(() => {
      setFlyoutRow(null);
      setFlyoutIndex(-1);
      setIsClosing(false);
    }, 300);
  };

  const handlePreviousRow = () => {
    if (flyoutIndex > 0 && rows) {
      const newIndex = flyoutIndex - 1;
      setFlyoutIndex(newIndex);
      setFlyoutRow(rows[newIndex]);
    }
  };

  const handleNextRow = () => {
    if (rows && flyoutIndex < rows.length - 1) {
      const newIndex = flyoutIndex + 1;
      setFlyoutIndex(newIndex);
      setFlyoutRow(rows[newIndex]);
    }
  };

  const handleMarkdownPreview = (filePath: string, fileName: string) => {
    setMarkdownPreview({ filePath, fileName });
  };

  const handleSync = async () => {
    if (!onSync) return;
    setIsSyncing(true);
    try {
      await onSync();
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter rows based on search
  const filteredRows = rows?.filter(row =>
    row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    row.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full relative">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          {titleIcon && (
            <div className="w-10 h-10 rounded-xl bg-[#2e2e2e] flex items-center justify-center">
              {titleIcon}
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold text-[#fafafa]">{title}</h1>
            {description && (
              <p className="text-sm text-[#666] mt-1">{description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      {tabs && tabs.length > 0 && (
        <div className="flex items-center gap-1 mb-4 border-b border-[#2e2e2e]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative",
                activeTab === tab.id
                  ? "text-[#fafafa]"
                  : "text-[#666] hover:text-[#a3a3a3]"
              )}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#fafafa]" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-4 mb-4">
        {/* Left: Search + Filter */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#666]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg text-sm text-[#fafafa] placeholder-[#666] focus:outline-none focus:border-[#3e3e3e]"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg text-sm text-[#666] hover:text-[#a3a3a3] hover:border-[#3e3e3e] transition-colors">
            <Filter className="h-4 w-4" />
            Filter
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Add Item */}
          {onAddItem && (
            <button
              onClick={onAddItem}
              className="flex items-center gap-2 px-3 py-2 bg-[#2e2e2e] text-[#a3a3a3] hover:text-[#fafafa] rounded-lg text-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              {addItemLabel}
            </button>
          )}

          {/* Sync */}
          {onSync && (
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-3 py-2 bg-[#2e2e2e] text-[#a3a3a3] hover:text-[#fafafa] rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {syncLabel}
            </button>
          )}

          {/* Custom Actions */}
          {customActions}

          {/* Standard Action Buttons */}
          {actions?.map((action) => (
            <button
              key={action.id}
              onClick={action.onClick}
              disabled={action.disabled || action.loading}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                action.variant === 'primary'
                  ? "bg-[#fafafa] text-[#1e1e1e] hover:bg-[#e5e5e5]"
                  : action.variant === 'danger'
                  ? "bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444]/20"
                  : "bg-[#2e2e2e] text-[#a3a3a3] hover:text-[#fafafa]",
                (action.disabled || action.loading) && "opacity-50 cursor-not-allowed"
              )}
            >
              {action.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : action.icon}
              {action.label}
            </button>
          ))}

          {/* View Toggle */}
          {showViewToggle && (
            <div className="flex items-center border border-[#2e2e2e] rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-2 transition-colors",
                  viewMode === 'list' ? "bg-[#2e2e2e] text-[#fafafa]" : "text-[#666] hover:text-[#a3a3a3]"
                )}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-2 transition-colors",
                  viewMode === 'grid' ? "bg-[#2e2e2e] text-[#fafafa]" : "text-[#666] hover:text-[#a3a3a3]"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {children ? (
        children
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-[#666] animate-spin" />
        </div>
      ) : filteredRows && filteredRows.length > 0 ? (
        <div className="bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2e2e2e] bg-[#1a1a1a]">
                <th className="text-left py-3 px-4 text-[10px] font-medium text-[#666] uppercase tracking-wider">
                  <span className="inline-flex items-center gap-3">
                    {showCheckboxes && (
                      <input
                        type="checkbox"
                        checked={filteredRows.length > 0 && selectedRows.size === filteredRows.length}
                        onChange={() => {
                          if (selectedRows.size === filteredRows.length) {
                            setSelectedRows(new Set());
                          } else {
                            setSelectedRows(new Set(filteredRows.map(r => r.id)));
                          }
                        }}
                        className="w-4 h-4 rounded border border-[#3e3e3e] bg-[#1e1e1e] checked:bg-[#fafafa] checked:border-[#fafafa] focus:ring-0 focus:ring-offset-0 cursor-pointer appearance-none relative before:content-[''] before:absolute before:inset-0 before:flex before:items-center before:justify-center checked:before:content-['✓'] before:text-[10px] before:font-bold checked:before:text-[#1e1e1e]"
                      />
                    )}
                    <span className="ml-6">Name</span>
                  </span>
                </th>
                <th className="text-left py-3 px-4 text-[10px] font-medium text-[#666] uppercase tracking-wider w-[100px]">Status</th>
                <th className="text-left py-3 px-4 text-[10px] font-medium text-[#666] uppercase tracking-wider w-[120px]">Type</th>
                <th className="text-left py-3 px-4 text-[10px] font-medium text-[#666] uppercase tracking-wider w-[100px]">Size</th>
                <th className="text-left py-3 px-4 text-[10px] font-medium text-[#666] uppercase tracking-wider w-[120px]">Updated</th>
                {effectiveColumns.slice(5).map((col) => (
                  <th key={col.id} className="text-left py-3 px-4 text-[10px] font-medium text-[#666] uppercase tracking-wider" style={{ width: col.width }}>
                    {col.label}
                  </th>
                ))}
                <th className="text-right py-3 px-4 text-[10px] font-medium text-[#666] uppercase tracking-wider w-[80px]"></th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <ExpandableRow
                  key={row.id}
                  row={row}
                  columns={effectiveColumns}
                  selectedRows={selectedRows}
                  onSelect={handleRowSelect}
                  onExpand={handleRowExpand}
                  onMarkdownPreview={handleMarkdownPreview}
                  showCheckboxes={showCheckboxes}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl py-12 text-center">
          {emptyState || (
            <div className="text-[#666]">
              <p className="text-sm">No items found</p>
            </div>
          )}
        </div>
      )}

      {/* Flyout Panel */}
      {flyoutRow && (
        <>
          <div
            className={cn(
              "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
              isClosing ? "opacity-0" : "opacity-100"
            )}
            onClick={handleCloseFlyout}
          />
          <FlyoutPanel
            row={flyoutRow}
            onClose={handleCloseFlyout}
            isClosing={isClosing}
            renderContent={renderFlyout}
            tabs={flyoutTabs}
            onSave={onFlyoutSave ? (value) => onFlyoutSave(flyoutRow, value) : undefined}
            onDelete={onFlyoutDelete ? () => onFlyoutDelete(flyoutRow) : undefined}
            onPrevious={handlePreviousRow}
            onNext={handleNextRow}
            hasPrevious={flyoutIndex > 0}
            hasNext={rows ? flyoutIndex < rows.length - 1 : false}
          />
        </>
      )}

      {/* Markdown Preview Modal */}
      {markdownPreview && (
        <MarkdownPreviewModal
          filePath={markdownPreview.filePath}
          fileName={markdownPreview.fileName}
          onClose={() => setMarkdownPreview(null)}
        />
      )}
    </div>
  );
}

export default ContentPage;
