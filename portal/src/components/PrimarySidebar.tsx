/**
 * PrimarySidebar Component
 *
 * Narrow icon-only sidebar (50px) - Linear-style navigation
 */

import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Waves,
  ScrollText,
  Settings,
  Activity,
  Network,
  Terminal
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: typeof LayoutDashboard;
  path: string;
  label: string;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, path: '/', label: 'Dashboard' },
  { icon: FolderKanban, path: '/projects', label: 'Projects' },
  { icon: Waves, path: '/waves', label: 'Waves' },
  { icon: ScrollText, path: '/stories', label: 'Stories' },
  { icon: Activity, path: '/activity', label: 'Activity' },
  { icon: Network, path: '/architecture', label: 'Architecture' },
  { icon: Terminal, path: '/commands', label: 'Commands' },
];

export function PrimarySidebar() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-[50px] bg-[#1e1e1e] border-r border-[#2e2e2e] flex flex-col">
      {/* Logo */}
      <div className="h-14 flex items-center justify-center border-b border-[#2e2e2e]">
        <div className="w-8 h-8 rounded-lg bg-[#2e2e2e] flex items-center justify-center">
          <span className="text-[#fafafa] font-bold text-sm">W</span>
        </div>
      </div>

      {/* Navigation Icons */}
      <nav className="flex-1 flex flex-col items-center py-3 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                active
                  ? "bg-[#2e2e2e] text-[#fafafa]"
                  : "text-[#666] hover:text-[#a3a3a3] hover:bg-[#2e2e2e]"
              )}
              title={item.label}
            >
              <Icon className="h-4 w-4" />
            </Link>
          );
        })}
      </nav>

      {/* Bottom - Settings */}
      <div className="pb-3 flex flex-col items-center gap-1">
        <Link
          to="/settings"
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
            location.pathname === '/settings'
              ? "bg-[#2e2e2e] text-[#fafafa]"
              : "text-[#666] hover:text-[#a3a3a3] hover:bg-[#2e2e2e]"
          )}
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>
    </aside>
  );
}

export default PrimarySidebar;
