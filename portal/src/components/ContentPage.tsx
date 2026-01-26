/**
 * ContentPage Component
 *
 * Devin-style content page template with:
 * - Title + description header
 * - Optional tabs
 * - Search bar + action buttons
 * - Content area (table/list)
 */

import { useState, ReactNode } from 'react';
import { Search, Plus, FolderPlus, Sparkles, ChevronDown, ChevronRight, FileText, Folder } from 'lucide-react';
import { cn } from '../lib/utils';

// Types
export interface ContentTab {
  id: string;
  label: string;
}

export interface ActionButton {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export interface TableColumn {
  id: string;
  label: string;
  width?: string;
}

export interface TableRow {
  id: string;
  name: string;
  icon?: 'file' | 'folder';
  description?: string;
  cells: Record<string, ReactNode>;
  children?: TableRow[];
  expandable?: boolean;
}

interface ContentPageProps {
  title: string;
  description?: string;
  tabs?: ContentTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  actions?: ActionButton[];
  columns?: TableColumn[];
  rows?: TableRow[];
  children?: ReactNode;
  emptyState?: ReactNode;
}

// Expandable Row Component
function ExpandableRow({
  row,
  columns,
  level = 0
}: {
  row: TableRow;
  columns: TableColumn[];
  level?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = row.children && row.children.length > 0;
  const Icon = row.icon === 'folder' ? Folder : FileText;

  return (
    <>
      <tr className="border-b border-[#2e2e2e] hover:bg-[#252525] transition-colors">
        <td className="py-3 px-4">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 20}px` }}>
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
            <Icon className="h-4 w-4 text-[#666]" />
            <span className="text-sm text-[#fafafa]">{row.name}</span>
          </div>
          {row.description && expanded && (
            <p className="text-xs text-[#666] mt-1 ml-9" style={{ paddingLeft: `${level * 20}px` }}>
              {row.description}
            </p>
          )}
        </td>
        {columns.slice(1).map((col) => (
          <td key={col.id} className="py-3 px-4 text-sm text-[#a3a3a3]">
            {row.cells[col.id]}
          </td>
        ))}
      </tr>
      {expanded && row.children?.map((child) => (
        <ExpandableRow key={child.id} row={child} columns={columns} level={level + 1} />
      ))}
    </>
  );
}

export function ContentPage({
  title,
  description,
  tabs,
  activeTab,
  onTabChange,
  searchPlaceholder = 'Search...',
  onSearch,
  actions,
  columns,
  rows,
  children,
  emptyState
}: ContentPageProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  return (
    <div className="h-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#fafafa]">{title}</h1>
        {description && (
          <p className="text-sm text-[#a3a3a3] mt-1">{description}</p>
        )}
      </div>

      {/* Tabs */}
      {tabs && tabs.length > 0 && (
        <div className="flex items-center gap-6 border-b border-[#2e2e2e] mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={cn(
                "pb-3 text-sm font-medium transition-colors relative",
                activeTab === tab.id
                  ? "text-[#fafafa]"
                  : "text-[#666] hover:text-[#a3a3a3]"
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#fafafa]" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Search + Actions Bar */}
      <div className="flex items-center justify-between gap-4 mb-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#666]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-4 py-2 bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg text-sm text-[#fafafa] placeholder-[#666] focus:outline-none focus:border-[#3e3e3e]"
          />
        </div>

        {/* Actions */}
        {actions && actions.length > 0 && (
          <div className="flex items-center gap-2">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={action.onClick}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  action.variant === 'primary'
                    ? "bg-[#fafafa] text-[#1e1e1e] hover:bg-[#e5e5e5]"
                    : "bg-[#2e2e2e] text-[#a3a3a3] hover:bg-[#3e3e3e] hover:text-[#fafafa]"
                )}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {children ? (
        children
      ) : columns && rows ? (
        <div className="bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg overflow-hidden">
          {/* Table Header */}
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2e2e2e]">
                {columns.map((col) => (
                  <th
                    key={col.id}
                    className="text-left py-3 px-4 text-xs font-medium text-[#666] uppercase tracking-wider"
                    style={{ width: col.width }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row) => (
                  <ExpandableRow key={row.id} row={row} columns={columns} />
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center">
                    {emptyState || (
                      <div className="text-[#666]">
                        <p className="text-sm">No items found</p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : emptyState ? (
        emptyState
      ) : null}
    </div>
  );
}

export default ContentPage;
