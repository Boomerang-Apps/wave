/**
 * TopNavigation Component
 *
 * Minimal top bar with workspace and project dropdowns
 * Devin-style dark theme
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Building2, Folder, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Workspace {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

interface TopNavigationProps {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  onWorkspaceChange: (workspace: Workspace) => void;
  projects: Project[];
  currentProject: Project | null;
  onProjectChange: (project: Project) => void;
  onNewProject?: () => void;
}

function Dropdown({
  label,
  icon: Icon,
  value,
  options,
  onSelect,
  onNew
}: {
  label: string;
  icon: typeof Building2;
  value: string | null;
  options: { id: string; name: string }[];
  onSelect: (option: { id: string; name: string }) => void;
  onNew?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors",
          "bg-[#1e1e1e] border border-[#2e2e2e] hover:border-[#3e3e3e]",
          "text-sm text-[#a3a3a3] hover:text-[#fafafa]"
        )}
      >
        <Icon className="h-3.5 w-3.5 text-[#666]" />
        <span className="max-w-[120px] truncate">
          {value || label}
        </span>
        <ChevronDown className={cn(
          "h-3.5 w-3.5 text-[#666] transition-transform",
          open && "rotate-180"
        )} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg shadow-xl z-50 py-1">
          <div className="px-3 py-1.5 text-xs text-[#666] uppercase tracking-wider">
            {label}
          </div>
          <div className="max-h-60 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  onSelect(option);
                  setOpen(false);
                }}
                className={cn(
                  "w-full px-3 py-2 flex items-center gap-2 text-left text-sm transition-colors",
                  option.name === value
                    ? "bg-[#2e2e2e] text-[#fafafa]"
                    : "text-[#a3a3a3] hover:bg-[#252525] hover:text-[#fafafa]"
                )}
              >
                <Icon className="h-3.5 w-3.5 text-[#666]" />
                <span className="flex-1 truncate">{option.name}</span>
                {option.name === value && (
                  <Check className="h-3.5 w-3.5 text-[#5a9a5a]" />
                )}
              </button>
            ))}
          </div>
          {onNew && (
            <>
              <div className="border-t border-[#2e2e2e] my-1" />
              <button
                onClick={() => {
                  onNew();
                  setOpen(false);
                }}
                className="w-full px-3 py-2 flex items-center gap-2 text-left text-sm text-[#a3a3a3] hover:bg-[#252525] hover:text-[#fafafa] transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New {label}</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function TopNavigation({
  workspaces,
  currentWorkspace,
  onWorkspaceChange,
  projects,
  currentProject,
  onProjectChange,
  onNewProject
}: TopNavigationProps) {
  return (
    <header className="fixed top-0 left-[250px] right-0 z-30 h-14 bg-[#1e1e1e] border-b border-[#2e2e2e] flex items-center px-4 gap-3">
      {/* Workspace Dropdown */}
      <Dropdown
        label="Workspace"
        icon={Building2}
        value={currentWorkspace?.name || null}
        options={workspaces}
        onSelect={onWorkspaceChange}
      />

      {/* Separator */}
      <span className="text-[#2e2e2e]">/</span>

      {/* Project Dropdown */}
      <Dropdown
        label="Project"
        icon={Folder}
        value={currentProject?.name || null}
        options={projects}
        onSelect={onProjectChange}
        onNew={onNewProject}
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side - can add user menu, notifications etc */}
    </header>
  );
}

export default TopNavigation;
