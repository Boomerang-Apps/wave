/**
 * GridTable Component
 *
 * Standardized grid/table layout with action bar, search, filter,
 * expandable rows with sub-items, and flyout support.
 *
 * Colors: Fill #1e1e1e, Border #2e2e2e, Hover #252525
 */

import { useState, useCallback, ReactNode } from 'react';
import {
  Search,
  Filter,
  Plus,
  RefreshCw,
  LayoutGrid,
  List,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Circle,
  Clock,
  Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';

// ============================================================================
// Types
// ============================================================================

export type ItemStatus = 'found' | 'pending' | 'missing' | 'error' | 'active' | 'inactive' | 'valid' | 'invalid' | 'configured' | 'not_configured';

export interface GridSubItem {
  id: string;
  name: string;
  status: ItemStatus;
  type?: string;
  size?: string;
  lastUpdate?: string;
  icon?: ReactNode;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface GridItem {
  id: string;
  name: string;
  description?: string;
  status: ItemStatus;
  type?: string;
  size?: string;
  lastUpdate?: string;
  icon?: ReactNode;
  subItems?: GridSubItem[];
  metadata?: Record<string, unknown>;
  actions?: GridItemAction[];
}

export interface GridItemAction {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

export interface GridTableProps {
  title?: string;
  items: GridItem[];
  onItemClick?: (item: GridItem) => void;
  onSubItemClick?: (item: GridItem, subItem: GridSubItem) => void;
  onAddItem?: () => void;
  onSync?: () => void;
  onFilter?: (filter: string) => void;
  addItemLabel?: string;
  syncLabel?: string;
  searchPlaceholder?: string;
  showCheckboxes?: boolean;
  showViewToggle?: boolean;
  isLoading?: boolean;
  emptyMessage?: string;
  selectedItems?: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
  className?: string;
}

// ============================================================================
// Status Badge Component
// ============================================================================

export function StatusBadge({ status }: { status: ItemStatus }) {
  const config = {
    found: { label: 'Found', color: 'text-[#22c55e]', bg: 'bg-[#22c55e]/10' },
    valid: { label: 'Valid', color: 'text-[#22c55e]', bg: 'bg-[#22c55e]/10' },
    configured: { label: 'Configured', color: 'text-[#22c55e]', bg: 'bg-[#22c55e]/10' },
    active: { label: 'Active', color: 'text-[#22c55e]', bg: 'bg-[#22c55e]/10' },
    pending: { label: 'Pending', color: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/10' },
    missing: { label: 'Missing', color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10' },
    error: { label: 'Error', color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10' },
    invalid: { label: 'Invalid', color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10' },
    inactive: { label: 'Inactive', color: 'text-[#666]', bg: 'bg-[#666]/10' },
    not_configured: { label: 'Not Configured', color: 'text-[#666]', bg: 'bg-[#666]/10' },
  };

  const { label, color, bg } = config[status] || config.pending;

  return (
    <span className={cn("px-2 py-0.5 text-[10px] font-medium rounded", bg, color)}>
      {label}
    </span>
  );
}

// ============================================================================
// Status Icon Component
// ============================================================================

function StatusIcon({ status }: { status: ItemStatus }) {
  switch (status) {
    case 'found':
    case 'valid':
    case 'configured':
    case 'active':
      return <CheckCircle2 className="h-3.5 w-3.5 text-[#22c55e]" />;
    case 'pending':
      return <Clock className="h-3.5 w-3.5 text-[#f59e0b]" />;
    case 'missing':
    case 'error':
    case 'invalid':
      return <AlertTriangle className="h-3.5 w-3.5 text-[#ef4444]" />;
    default:
      return <Circle className="h-3.5 w-3.5 text-[#666]" />;
  }
}

// ============================================================================
// Grid Row Component
// ============================================================================

interface GridRowProps {
  item: GridItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onItemClick?: (item: GridItem) => void;
  onSubItemClick?: (item: GridItem, subItem: GridSubItem) => void;
  showCheckbox: boolean;
  isSelected: boolean;
  onSelectionChange: (selected: boolean) => void;
  isLast: boolean;
}

function GridRow({
  item,
  isExpanded,
  onToggleExpand,
  onItemClick,
  onSubItemClick,
  showCheckbox,
  isSelected,
  onSelectionChange,
  isLast
}: GridRowProps) {
  const hasSubItems = item.subItems && item.subItems.length > 0;
  const [showActions, setShowActions] = useState(false);

  return (
    <>
      {/* Main Row */}
      <div
        className={cn(
          "grid grid-cols-[auto_auto_1fr_auto_auto_auto_auto_auto_auto] items-center gap-3 px-4 py-3 hover:bg-[#252525] transition-colors cursor-pointer",
          !isLast && !isExpanded && "border-b border-[#2e2e2e]"
        )}
      >
        {/* Checkbox */}
        {showCheckbox && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelectionChange(e.target.checked)}
            className="w-4 h-4 rounded border-[#2e2e2e] bg-[#1e1e1e] text-[#fafafa] focus:ring-0 focus:ring-offset-0"
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* Chevron */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasSubItems) onToggleExpand();
          }}
          className={cn(
            "p-1 rounded transition-colors",
            hasSubItems ? "hover:bg-[#2e2e2e] text-[#666]" : "text-transparent cursor-default"
          )}
        >
          {hasSubItems ? (
            isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {/* Icon */}
        <div className="flex items-center gap-3" onClick={() => onItemClick?.(item)}>
          {item.icon && <span className="text-[#666]">{item.icon}</span>}
          <div>
            <p className="text-sm text-[#fafafa] font-medium">{item.name}</p>
            {item.description && (
              <p className="text-xs text-[#666]">{item.description}</p>
            )}
          </div>
        </div>

        {/* Status */}
        <div onClick={() => onItemClick?.(item)}>
          <StatusBadge status={item.status} />
        </div>

        {/* Type */}
        <div onClick={() => onItemClick?.(item)}>
          {item.type && (
            <span className="text-xs text-[#666]">{item.type}</span>
          )}
        </div>

        {/* Size */}
        <div onClick={() => onItemClick?.(item)}>
          {item.size && (
            <span className="text-xs text-[#666]">{item.size}</span>
          )}
        </div>

        {/* Last Update */}
        <div onClick={() => onItemClick?.(item)}>
          {item.lastUpdate && (
            <span className="text-xs text-[#666]">{item.lastUpdate}</span>
          )}
        </div>

        {/* Flyout Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onItemClick?.(item);
          }}
          className="p-1.5 text-[#666] hover:text-[#fafafa] hover:bg-[#2e2e2e] rounded transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
        </button>

        {/* More Actions */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowActions(!showActions);
            }}
            className="p-1.5 text-[#666] hover:text-[#fafafa] hover:bg-[#2e2e2e] rounded transition-colors"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {showActions && item.actions && (
            <div className="absolute right-0 top-full mt-1 py-1 bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg shadow-xl z-10 min-w-[140px]">
              {item.actions.map(action => (
                <button
                  key={action.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick();
                    setShowActions(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-[#252525] transition-colors",
                    action.variant === 'danger' ? "text-[#ef4444]" : "text-[#a3a3a3]"
                  )}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sub Items */}
      {isExpanded && hasSubItems && (
        <div className={cn(!isLast && "border-b border-[#2e2e2e]")}>
          {item.subItems!.map((subItem, subIndex) => (
            <div
              key={subItem.id}
              className={cn(
                "grid grid-cols-[auto_auto_1fr_auto_auto_auto_auto_auto_auto] items-center gap-3 px-4 py-2.5 pl-14 hover:bg-[#252525] transition-colors cursor-pointer bg-[#1a1a1a]",
                subIndex !== item.subItems!.length - 1 && "border-b border-[#2e2e2e]/50"
              )}
              onClick={() => onSubItemClick?.(item, subItem)}
            >
              {/* Checkbox placeholder */}
              {showCheckbox && <div className="w-4" />}

              {/* No chevron for sub items */}
              <div className="w-6" />

              {/* Icon & Name */}
              <div className="flex items-center gap-3">
                {subItem.icon && <span className="text-[#555]">{subItem.icon}</span>}
                <div>
                  <p className="text-sm text-[#a3a3a3]">{subItem.name}</p>
                  {subItem.description && (
                    <p className="text-xs text-[#555]">{subItem.description}</p>
                  )}
                </div>
              </div>

              {/* Status */}
              <StatusBadge status={subItem.status} />

              {/* Type */}
              {subItem.type && <span className="text-xs text-[#555]">{subItem.type}</span>}

              {/* Size */}
              {subItem.size && <span className="text-xs text-[#555]">{subItem.size}</span>}

              {/* Last Update */}
              {subItem.lastUpdate && <span className="text-xs text-[#555]">{subItem.lastUpdate}</span>}

              {/* Flyout */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSubItemClick?.(item, subItem);
                }}
                className="p-1.5 text-[#555] hover:text-[#a3a3a3] hover:bg-[#2e2e2e] rounded transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>

              {/* More placeholder */}
              <div className="w-7" />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ============================================================================
// Main GridTable Component
// ============================================================================

export function GridTable({
  title,
  items,
  onItemClick,
  onSubItemClick,
  onAddItem,
  onSync,
  onFilter,
  addItemLabel = 'Add Item',
  syncLabel = 'Sync',
  searchPlaceholder = 'Search...',
  showCheckboxes = true,
  showViewToggle = true,
  isLoading = false,
  emptyMessage = 'No items found',
  selectedItems = new Set(),
  onSelectionChange,
  className
}: GridTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [localSelected, setLocalSelected] = useState<Set<string>>(selectedItems);

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleExpand = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const handleSelectionChange = useCallback((itemId: string, selected: boolean) => {
    setLocalSelected(prev => {
      const next = new Set(prev);
      if (selected) next.add(itemId);
      else next.delete(itemId);
      onSelectionChange?.(next);
      return next;
    });
  }, [onSelectionChange]);

  const selectAll = useCallback(() => {
    const allIds = new Set(filteredItems.map(i => i.id));
    setLocalSelected(allIds);
    onSelectionChange?.(allIds);
  }, [filteredItems, onSelectionChange]);

  const deselectAll = useCallback(() => {
    setLocalSelected(new Set());
    onSelectionChange?.(new Set());
  }, [onSelectionChange]);

  return (
    <div className={cn("bg-[#1e1e1e] rounded-xl border border-[#2e2e2e] overflow-hidden", className)}>
      {/* Action Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2e2e2e]">
        <div className="flex items-center gap-3">
          {title && (
            <h3 className="text-sm font-medium text-[#fafafa]">{title}</h3>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#666]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9 pr-3 py-1.5 text-xs bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg text-[#a3a3a3] placeholder-[#666] focus:outline-none focus:border-[#3e3e3e] w-48"
            />
          </div>

          {/* Filter */}
          {onFilter && (
            <button
              onClick={() => onFilter('')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#666] hover:text-[#a3a3a3] hover:bg-[#2e2e2e] rounded-lg transition-colors"
            >
              <Filter className="h-3.5 w-3.5" />
              Filter
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Add Item */}
          {onAddItem && (
            <button
              onClick={onAddItem}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#2e2e2e] text-[#a3a3a3] hover:text-[#fafafa] rounded-lg transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              {addItemLabel}
            </button>
          )}

          {/* Sync */}
          {onSync && (
            <button
              onClick={onSync}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#2e2e2e] text-[#a3a3a3] hover:text-[#fafafa] rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {syncLabel}
            </button>
          )}

          {/* View Toggle */}
          {showViewToggle && (
            <div className="flex items-center border border-[#2e2e2e] rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-1.5 transition-colors",
                  viewMode === 'list' ? "bg-[#2e2e2e] text-[#fafafa]" : "text-[#666] hover:text-[#a3a3a3]"
                )}
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-1.5 transition-colors",
                  viewMode === 'grid' ? "bg-[#2e2e2e] text-[#fafafa]" : "text-[#666] hover:text-[#a3a3a3]"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[auto_auto_1fr_auto_auto_auto_auto_auto_auto] items-center gap-3 px-4 py-2 border-b border-[#2e2e2e] bg-[#1a1a1a]">
        {showCheckboxes && (
          <input
            type="checkbox"
            checked={localSelected.size === filteredItems.length && filteredItems.length > 0}
            onChange={(e) => e.target.checked ? selectAll() : deselectAll()}
            className="w-4 h-4 rounded border-[#2e2e2e] bg-[#1e1e1e] text-[#fafafa] focus:ring-0 focus:ring-offset-0"
          />
        )}
        <div className="w-6" />
        <span className="text-[10px] font-medium text-[#666] uppercase tracking-wider">Name</span>
        <span className="text-[10px] font-medium text-[#666] uppercase tracking-wider">Status</span>
        <span className="text-[10px] font-medium text-[#666] uppercase tracking-wider">Type</span>
        <span className="text-[10px] font-medium text-[#666] uppercase tracking-wider">Size</span>
        <span className="text-[10px] font-medium text-[#666] uppercase tracking-wider">Updated</span>
        <span className="text-[10px] font-medium text-[#666] uppercase tracking-wider w-7"></span>
        <span className="text-[10px] font-medium text-[#666] uppercase tracking-wider w-7"></span>
      </div>

      {/* Items */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 text-[#666] animate-spin" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-[#666]">{emptyMessage}</p>
        </div>
      ) : (
        <div>
          {filteredItems.map((item, index) => (
            <GridRow
              key={item.id}
              item={item}
              isExpanded={expandedItems.has(item.id)}
              onToggleExpand={() => toggleExpand(item.id)}
              onItemClick={onItemClick}
              onSubItemClick={onSubItemClick}
              showCheckbox={showCheckboxes}
              isSelected={localSelected.has(item.id)}
              onSelectionChange={(selected) => handleSelectionChange(item.id, selected)}
              isLast={index === filteredItems.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default GridTable;
