/**
 * HierarchicalSidebar Component
 *
 * Devin-style hierarchical navigation sidebar with expandable sections
 */

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

export type ItemStatus = 'complete' | 'warning' | 'pending' | 'active';

export interface NavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  status?: ItemStatus;
  badge?: string;
}

export interface NavSection {
  id: string;
  label: string;
  icon?: React.ReactNode;
  status?: ItemStatus;
  items: NavItem[];
  defaultExpanded?: boolean;
}

interface HierarchicalSidebarProps {
  sections: NavSection[];
  activeItem: string | null;
  onItemClick: (sectionId: string, itemId: string) => void;
  projectName?: string;
}

function NavSectionComponent({
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
      {/* Section Header - Devin style: text + chevron on right */}
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

      {/* Section Items */}
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
                  <span className={cn(
                    "flex-shrink-0 [&>svg]:h-4 [&>svg]:w-4",
                    isActive ? "text-[#fafafa]" : "text-[#666]"
                  )}>
                    {item.icon}
                  </span>
                )}
                <span className="flex-1 text-sm truncate">{item.label}</span>
                {item.badge && (
                  <span className={cn(
                    "px-2 py-0.5 text-xs rounded-md",
                    item.badge === 'New'
                      ? "bg-[#2d4a2d] text-[#5a9a5a]"
                      : "bg-[#3e3e3e] text-[#888]"
                  )}>
                    {item.badge}
                  </span>
                )}
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
  activeItem,
  onItemClick,
  projectName
}: HierarchicalSidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-[50px] z-40 w-[260px] bg-[#1a1a1a] border-r border-[#2e2e2e] flex flex-col">
      {/* Header */}
      <div className="h-14 flex items-center px-4 border-b border-[#2e2e2e]">
        <div className="truncate">
          <p className="text-xs text-[#666] uppercase tracking-wider">Project</p>
          {projectName && (
            <p className="text-sm text-[#fafafa] truncate font-medium">{projectName}</p>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {sections.map((section) => (
          <NavSectionComponent
            key={section.id}
            section={section}
            activeItem={activeItem}
            onItemClick={onItemClick}
          />
        ))}
      </nav>
    </aside>
  );
}

export default HierarchicalSidebar;
