/**
 * GridPage Component
 *
 * Full page layout with header, KPI cards, and GridTable.
 * Standardized wrapper for all content pages.
 *
 * Colors: Fill #1e1e1e, Border #2e2e2e, Hover #252525
 */

import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { GridTable } from './GridTable';
import type { GridItem, GridSubItem, ItemStatus } from './GridTable';
import { Flyout } from './Flyout';
import type { FlyoutTab, FlyoutAction, FlyoutField } from './Flyout';

// ============================================================================
// Types
// ============================================================================

export interface KPICard {
  id: string;
  label: string;
  value: string | number;
  icon?: ReactNode;
  status?: 'success' | 'warning' | 'error' | 'neutral';
  change?: string;
}

export interface GridPageSection {
  id: string;
  name: string;
  description?: string;
  icon?: ReactNode;
  status: ItemStatus;
  items: GridPageItem[];
  expanded?: boolean;
}

export interface GridPageItem {
  id: string;
  name: string;
  description?: string;
  status: ItemStatus;
  type?: string;
  value?: string;
  command?: string;
  icon?: ReactNode;
  copyable?: boolean;
  editable?: boolean;
  testable?: boolean;
  metadata?: Record<string, unknown>;
}

export interface GridPageProps {
  // Header
  title: string;
  timestamp?: string;
  description?: string;
  stepNumber?: number;
  stepTitle?: string;

  // Status
  overallStatus?: 'ready' | 'not_ready' | 'warning';
  statusMessage?: string;

  // KPI Cards
  kpiCards?: KPICard[];

  // Content
  sections: GridPageSection[];

  // Actions
  onSync?: () => Promise<void>;
  onExport?: () => void;
  onRunValidation?: () => Promise<void>;

  // Flyout
  flyoutTitle?: string;
  flyoutTabs?: FlyoutTab[];
  flyoutFields?: FlyoutField[];
  flyoutActions?: FlyoutAction[];

  // Customization
  headerActions?: ReactNode;
  className?: string;
}

// ============================================================================
// KPI Card Component
// ============================================================================

function KPICardComponent({ card }: { card: KPICard }) {
  const statusColors = {
    success: 'text-[#22c55e]',
    warning: 'text-[#f59e0b]',
    error: 'text-[#ef4444]',
    neutral: 'text-[#fafafa]'
  };

  return (
    <div className="p-4 bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        {card.icon && <span className="text-[#666]">{card.icon}</span>}
        <span className="text-xs text-[#666] uppercase tracking-wider">{card.label}</span>
      </div>
      <p className={cn(
        "text-2xl font-bold",
        card.status ? statusColors[card.status] : statusColors.neutral
      )}>
        {card.value}
      </p>
      {card.change && (
        <p className="text-xs text-[#666] mt-1">{card.change}</p>
      )}
    </div>
  );
}

// ============================================================================
// Status Banner Component
// ============================================================================

function StatusBanner({
  status,
  message,
  onAction,
  actionLabel,
  isLoading
}: {
  status: 'success' | 'warning' | 'error';
  message: string;
  onAction?: () => void;
  actionLabel?: string;
  isLoading?: boolean;
}) {
  const config = {
    success: {
      bg: 'bg-[#22c55e]/10',
      border: 'border-[#22c55e]/20',
      text: 'text-[#22c55e]',
      icon: <CheckCircle2 className="h-4 w-4" />
    },
    warning: {
      bg: 'bg-[#f59e0b]/10',
      border: 'border-[#f59e0b]/20',
      text: 'text-[#f59e0b]',
      icon: <AlertTriangle className="h-4 w-4" />
    },
    error: {
      bg: 'bg-[#ef4444]/10',
      border: 'border-[#ef4444]/20',
      text: 'text-[#ef4444]',
      icon: <AlertTriangle className="h-4 w-4" />
    }
  };

  const { bg, border, text, icon } = config[status];

  return (
    <div className={cn("flex items-center justify-between p-4 rounded-xl border", bg, border)}>
      <div className="flex items-center gap-3">
        <span className={text}>{icon}</span>
        <span className={cn("text-sm font-medium", text)}>{message}</span>
      </div>
      {onAction && actionLabel && (
        <button
          onClick={onAction}
          disabled={isLoading}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            "bg-[#fafafa] text-[#1e1e1e] hover:bg-[#e5e5e5]",
            isLoading && "opacity-50 cursor-not-allowed"
          )}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Section Header Bar Component
// ============================================================================

function SectionHeaderBar({
  title,
  subtitle,
  itemCount,
  onSync,
  onExport,
  isSyncing
}: {
  title: string;
  subtitle?: string;
  itemCount?: number;
  onSync?: () => void;
  onExport?: () => void;
  isSyncing?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl">
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-[#666] uppercase tracking-wider">{title}</span>
        {subtitle && (
          <>
            <span className="text-[#2e2e2e]">|</span>
            <span className="text-sm text-[#a3a3a3]">{subtitle}</span>
          </>
        )}
        {itemCount !== undefined && (
          <span className="px-2 py-0.5 text-xs bg-[#2e2e2e] text-[#666] rounded">
            {itemCount} items
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onSync && (
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#2e2e2e] text-[#a3a3a3] hover:text-[#fafafa] rounded-lg transition-colors disabled:opacity-50"
          >
            {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Reload
          </button>
        )}
        {onExport && (
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#2e2e2e] text-[#a3a3a3] hover:text-[#fafafa] rounded-lg transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main GridPage Component
// ============================================================================

export function GridPage({
  title,
  timestamp,
  description,
  stepNumber,
  stepTitle,
  overallStatus,
  statusMessage,
  kpiCards,
  sections,
  onSync,
  onExport,
  onRunValidation,
  headerActions,
  className
}: GridPageProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GridItem | null>(null);
  const [flyoutOpen, setFlyoutOpen] = useState(false);

  // Convert sections to GridItems
  const gridItems: GridItem[] = sections.map(section => ({
    id: section.id,
    name: section.name,
    description: section.description,
    status: section.status,
    icon: section.icon,
    type: `${section.items.length} items`,
    subItems: section.items.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description || item.command,
      status: item.status,
      type: item.type,
      icon: item.icon
    }))
  }));

  const handleSync = async () => {
    if (!onSync) return;
    setIsSyncing(true);
    try {
      await onSync();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleValidation = async () => {
    if (!onRunValidation) return;
    setIsValidating(true);
    try {
      await onRunValidation();
    } finally {
      setIsValidating(false);
    }
  };

  const handleItemClick = (item: GridItem) => {
    setSelectedItem(item);
    setFlyoutOpen(true);
  };

  const handleSubItemClick = (item: GridItem, subItem: GridSubItem) => {
    // Find the full item data from sections
    const section = sections.find(s => s.id === item.id);
    const fullItem = section?.items.find(i => i.id === subItem.id);

    if (fullItem) {
      setSelectedItem({
        id: fullItem.id,
        name: fullItem.name,
        description: fullItem.description,
        status: fullItem.status,
        type: fullItem.type,
        icon: fullItem.icon,
        metadata: {
          command: fullItem.command,
          value: fullItem.value,
          copyable: fullItem.copyable,
          editable: fullItem.editable,
          testable: fullItem.testable,
          ...fullItem.metadata
        }
      });
      setFlyoutOpen(true);
    }
  };

  // Determine banner status
  const bannerStatus = overallStatus === 'ready' ? 'success' :
                       overallStatus === 'warning' ? 'warning' : 'error';

  return (
    <div className={cn("space-y-6", className)}>
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#fafafa]">{title}</h1>
          {timestamp && (
            <p className="text-sm text-[#666] mt-1">{timestamp}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {headerActions}
          <span className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium",
            overallStatus === 'ready' ? "bg-[#22c55e]/10 text-[#22c55e]" :
            overallStatus === 'warning' ? "bg-[#f59e0b]/10 text-[#f59e0b]" :
            "bg-[#ef4444]/10 text-[#ef4444]"
          )}>
            {overallStatus === 'ready' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            {overallStatus === 'ready' ? 'Ready' : 'Not Ready'}
          </span>
        </div>
      </div>

      {/* Step Info Banner */}
      {stepNumber && stepTitle && (
        <div className="p-5 bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#2e2e2e] text-xs font-bold text-[#fafafa]">
              {stepNumber}
            </span>
            <h2 className="text-base font-semibold text-[#3b82f6]">{stepTitle}</h2>
          </div>
          {description && (
            <p className="text-sm text-[#666] ml-9">{description}</p>
          )}
        </div>
      )}

      {/* KPI Cards */}
      {kpiCards && kpiCards.length > 0 && (
        <div className={cn(
          "grid gap-4",
          kpiCards.length === 4 ? "grid-cols-4" :
          kpiCards.length === 3 ? "grid-cols-3" :
          kpiCards.length === 2 ? "grid-cols-2" :
          "grid-cols-1"
        )}>
          {kpiCards.map(card => (
            <KPICardComponent key={card.id} card={card} />
          ))}
        </div>
      )}

      {/* Section Header Bar */}
      <SectionHeaderBar
        title={title.toUpperCase()}
        subtitle={`${sections.reduce((acc, s) => acc + s.items.length, 0)} checks configured`}
        onSync={onSync ? handleSync : undefined}
        onExport={onExport}
        isSyncing={isSyncing}
      />

      {/* Status Banner */}
      {statusMessage && (
        <StatusBanner
          status={bannerStatus}
          message={statusMessage}
          onAction={onRunValidation ? handleValidation : undefined}
          actionLabel={onRunValidation ? 'Run Validation' : undefined}
          isLoading={isValidating}
        />
      )}

      {/* Grid Table */}
      <GridTable
        items={gridItems}
        onItemClick={handleItemClick}
        onSubItemClick={handleSubItemClick}
        onSync={onSync ? handleSync : undefined}
        showCheckboxes={true}
        isLoading={isSyncing}
        emptyMessage="No items configured"
        searchPlaceholder={`Search ${title.toLowerCase()}...`}
      />

      {/* Flyout */}
      <Flyout
        isOpen={flyoutOpen}
        onClose={() => setFlyoutOpen(false)}
        title={selectedItem?.name || ''}
        description={selectedItem?.description}
        status={selectedItem?.status}
        icon={selectedItem?.icon}
        width="md"
      >
        {selectedItem?.metadata?.command ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[#666] uppercase tracking-wider">Command</label>
              <div className="mt-2 p-3 bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg font-mono text-sm text-[#a3a3a3]">
                {`${selectedItem.metadata.command}`}
              </div>
            </div>
            {selectedItem.metadata.value ? (
              <div>
                <label className="text-xs font-medium text-[#666] uppercase tracking-wider">Value</label>
                <div className="mt-2 p-3 bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg font-mono text-sm text-[#a3a3a3]">
                  {`${selectedItem.metadata.value}`}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Flyout>
    </div>
  );
}

export default GridPage;
