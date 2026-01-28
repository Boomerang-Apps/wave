/**
 * HierarchicalSidebar Component
 *
 * Devin-style hierarchical navigation sidebar with expandable sections.
 * Supports dual modes: Simple (guided) and Advanced (full control).
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, Check, Circle, AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { IconBadge } from './IconBadge';
import { useMode } from '../contexts/ModeContext';

export type ItemStatus = 'complete' | 'warning' | 'pending' | 'active';

export interface NavItem {
  id: string;
  label: string;
  simpleLabel?: string;
  icon?: React.ReactNode;
  status?: ItemStatus;
  badge?: string;
  advancedOnly?: boolean;
  description?: string;
}

export interface NavSection {
  id: string;
  label: string;
  simpleLabel?: string;
  icon?: React.ReactNode;
  status?: ItemStatus;
  items: NavItem[];
  defaultExpanded?: boolean;
  advancedOnly?: boolean;
  description?: string;
}

interface HierarchicalSidebarProps {
  sections: NavSection[];
  simpleSections?: NavSection[];
  activeItem: string | null;
  onItemClick: (sectionId: string, itemId: string) => void;
  projectName?: string;
}

// Status indicator component
function StatusIndicator({ status, size = 'sm' }: { status?: ItemStatus; size?: 'sm' | 'md' }) {
  if (!status) return null;

  const sizeClasses = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  const iconSize = size === 'md' ? 'h-3 w-3' : 'h-2.5 w-2.5';
  const dotSize = size === 'md' ? 'h-2 w-2' : 'h-1.5 w-1.5';

  if (status === 'complete') {
    return (
      <div className={cn(sizeClasses, "rounded-full bg-[#22c55e]/20 flex items-center justify-center flex-shrink-0")}>
        <Check className={cn(iconSize, "text-[#22c55e]")} />
      </div>
    );
  }

  if (status === 'warning') {
    return (
      <div className={cn(sizeClasses, "rounded-full bg-[#f97316]/20 flex items-center justify-center flex-shrink-0")}>
        <AlertTriangle className={cn(iconSize, "text-[#f97316]")} />
      </div>
    );
  }

  return (
    <div className={cn(sizeClasses, "rounded-full border-2 border-[#3e3e3e] flex items-center justify-center flex-shrink-0")}>
      <Circle className={cn(dotSize, "text-[#666]")} />
    </div>
  );
}

// Simple Mode Section Component - Clean, well-aligned
function SimpleModeSection({
  section,
  activeItem,
  onItemClick
}: {
  section: NavSection;
  activeItem: string | null;
  onItemClick: (sectionId: string, itemId: string) => void;
}) {
  const [expanded, setExpanded] = useState(section.defaultExpanded ?? true);
  const visibleItems = section.items.filter(item => !item.advancedOnly);

  // Calculate progress
  const completedCount = visibleItems.filter(item => item.status === 'complete').length;
  const totalCount = visibleItems.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="mb-2">
      {/* Section Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-2 py-2 flex items-center gap-3 text-left rounded-lg hover:bg-[#252525] transition-colors"
      >
        {/* Progress Ring */}
        <div className="relative w-7 h-7 flex-shrink-0">
          <svg className="w-7 h-7 transform -rotate-90" viewBox="0 0 28 28">
            <circle
              cx="14"
              cy="14"
              r="12"
              stroke="#2e2e2e"
              strokeWidth="2.5"
              fill="none"
            />
            <circle
              cx="14"
              cy="14"
              r="12"
              stroke={progress === 100 ? "#22c55e" : "#3b82f6"}
              strokeWidth="2.5"
              fill="none"
              strokeDasharray={`${progress * 0.75} 75`}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
        </div>

        {/* Section Title */}
        <div className="flex-1 min-w-0 pr-1">
          <span className="text-sm font-medium text-[#fafafa] block truncate">
            {section.simpleLabel || section.label}
          </span>
          {section.description && (
            <span className="text-[11px] text-[#666] block truncate">
              {section.description}
            </span>
          )}
        </div>

        {/* Chevron */}
        <ChevronRight
          className={cn(
            "h-4 w-4 text-[#555] transition-transform flex-shrink-0",
            expanded && "rotate-90"
          )}
        />
      </button>

      {/* Section Items */}
      {expanded && (
        <div className="mt-1 ml-4 pl-4 border-l border-[#2e2e2e]">
          {visibleItems.map((item) => {
            const itemKey = `${section.id}:${item.id}`;
            const isActive = itemKey === activeItem;

            return (
              <button
                key={item.id}
                onClick={() => onItemClick(section.id, item.id)}
                className={cn(
                  "w-full px-2 py-2 flex items-center gap-2.5 text-left transition-all rounded-md mb-0.5",
                  isActive
                    ? "bg-[#2a2a2a] text-[#fafafa]"
                    : "text-[#888] hover:text-[#fafafa] hover:bg-[#252525]"
                )}
              >
                {/* Icon */}
                {item.icon && (
                  <div className="w-6 h-6 rounded bg-[#252525] flex items-center justify-center flex-shrink-0">
                    <div className="[&>svg]:w-3.5 [&>svg]:h-3.5 text-[#888]">
                      {item.icon}
                    </div>
                  </div>
                )}

                {/* Text */}
                <div className="flex-1 min-w-0 pr-1">
                  <span className="text-[13px] block truncate">
                    {item.simpleLabel || item.label}
                  </span>
                  {item.description && (
                    <span className="text-[10px] text-[#555] block truncate">
                      {item.description}
                    </span>
                  )}
                </div>

                {/* Status */}
                <StatusIndicator status={item.status} size="sm" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Advanced Mode Section Component - Compact style
function AdvancedModeSection({
  section,
  activeItem,
  onItemClick
}: {
  section: NavSection;
  activeItem: string | null;
  onItemClick: (sectionId: string, itemId: string) => void;
}) {
  const [expanded, setExpanded] = useState(section.defaultExpanded ?? true);

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between text-left group"
      >
        <span className="text-sm font-medium text-[#a3a3a3] group-hover:text-[#fafafa] transition-colors">
          {section.label}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-[#666] transition-transform",
            !expanded && "-rotate-90"
          )}
        />
      </button>

      {expanded && (
        <div className="mt-0.5 space-y-0.5">
          {section.items.map((item) => {
            const itemKey = `${section.id}:${item.id}`;
            const isActive = itemKey === activeItem;

            return (
              <button
                key={item.id}
                onClick={() => onItemClick(section.id, item.id)}
                className={cn(
                  "w-full px-3 py-2 flex items-center gap-3 text-left transition-colors rounded-lg",
                  isActive
                    ? "bg-[#2a2a2a] text-[#fafafa]"
                    : "text-[#888] hover:text-[#fafafa] hover:bg-[#252525]"
                )}
              >
                {item.icon && (
                  <IconBadge
                    icon={item.icon}
                    size="xs"
                  />
                )}
                <span className="flex-1 text-sm truncate">{item.label}</span>
                {item.badge && (
                  <span className={cn(
                    "px-2 py-0.5 text-xs rounded-md",
                    item.badge === 'New'
                      ? "bg-[#22c55e]/20 text-[#22c55e]"
                      : "bg-[#3e3e3e] text-[#888]"
                  )}>
                    {item.badge}
                  </span>
                )}
                <StatusIndicator status={item.status} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function HierarchicalSidebar({
  sections,
  simpleSections,
  activeItem,
  onItemClick,
  projectName
}: HierarchicalSidebarProps) {
  const { isSimple } = useMode();

  const displaySections = isSimple
    ? (simpleSections || sections.filter(s => !s.advancedOnly))
    : sections;

  return (
    <aside className={cn(
      "flex-shrink-0 bg-[#1a1a1a] border-r border-[#2e2e2e] flex flex-col overflow-y-auto",
      isSimple ? "w-[260px]" : "w-[260px]"
    )}>
      {/* Simple Mode Header */}
      {isSimple && (
        <div className="px-4 py-3 border-b border-[#2e2e2e]">
          <div className="flex items-center gap-2 text-[#22c55e]">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Guided Mode</span>
          </div>
          <p className="text-[11px] text-[#555] mt-0.5">
            Follow the steps to build your app
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2 overflow-y-auto">
        {displaySections.map((section) => (
          isSimple ? (
            <SimpleModeSection
              key={section.id}
              section={section}
              activeItem={activeItem}
              onItemClick={onItemClick}
            />
          ) : (
            <AdvancedModeSection
              key={section.id}
              section={section}
              activeItem={activeItem}
              onItemClick={onItemClick}
            />
          )
        ))}
      </nav>

      {/* Simple Mode Footer */}
      {isSimple && (
        <div className="px-3 py-2 border-t border-[#2e2e2e]">
          <p className="text-[10px] text-[#555] text-center">
            Need help? Click any step for guidance
          </p>
        </div>
      )}
    </aside>
  );
}

export default HierarchicalSidebar;
