/**
 * DesignMockupsPage
 *
 * Shows design mockups and HTML prototypes
 */

import { useState, useEffect } from 'react';
import { Plus, RefreshCw, ExternalLink, Image, FileCode, Eye } from 'lucide-react';
import { ContentPage } from '../ContentPage';
import type { TableColumn, TableRow, ActionButton, ContentTab } from '../ContentPage';

interface DesignMockupsPageProps {
  projectPath: string;
}

export function DesignMockupsPage({ projectPath }: DesignMockupsPageProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('mockups');
  const [mockups, setMockups] = useState<TableRow[]>([]);

  const scanMockups = async () => {
    setLoading(true);
    try {
      // Simulate mockup detection
      const mockData: TableRow[] = [
        {
          id: 'mockup-1',
          name: 'dashboard.html',
          icon: 'file' as const,
          cells: {
            type: <span className="text-[#a3a3a3]">HTML Prototype</span>,
            screens: <span className="text-[#fafafa]">3 screens</span>,
            lastModified: <span className="text-[#666]">2 hours ago</span>,
            actions: (
              <button className="p-1.5 hover:bg-[#3e3e3e] rounded transition-colors">
                <Eye className="h-4 w-4 text-[#666]" />
              </button>
            ),
          },
        },
        {
          id: 'mockup-2',
          name: 'auth-flow.html',
          icon: 'file' as const,
          cells: {
            type: <span className="text-[#a3a3a3]">HTML Prototype</span>,
            screens: <span className="text-[#fafafa]">5 screens</span>,
            lastModified: <span className="text-[#666]">1 day ago</span>,
            actions: (
              <button className="p-1.5 hover:bg-[#3e3e3e] rounded transition-colors">
                <Eye className="h-4 w-4 text-[#666]" />
              </button>
            ),
          },
        },
        {
          id: 'mockup-3',
          name: 'settings-page.html',
          icon: 'file' as const,
          cells: {
            type: <span className="text-[#a3a3a3]">HTML Prototype</span>,
            screens: <span className="text-[#fafafa]">2 screens</span>,
            lastModified: <span className="text-[#666]">3 days ago</span>,
            actions: (
              <button className="p-1.5 hover:bg-[#3e3e3e] rounded transition-colors">
                <Eye className="h-4 w-4 text-[#666]" />
              </button>
            ),
          },
        },
      ];

      setMockups(mockData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scanMockups();
  }, [projectPath]);

  const tabs: ContentTab[] = [
    { id: 'mockups', label: 'Mockups' },
    { id: 'assets', label: 'Assets' },
  ];

  const columns: TableColumn[] = [
    { id: 'name', label: 'Name', width: '40%' },
    { id: 'type', label: 'Type', width: '20%' },
    { id: 'screens', label: 'Screens', width: '15%' },
    { id: 'lastModified', label: 'Modified', width: '15%' },
    { id: 'actions', label: '', width: '10%' },
  ];

  const actions: ActionButton[] = [
    {
      id: 'refresh',
      label: 'Rescan',
      icon: <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />,
      onClick: scanMockups,
    },
    {
      id: 'add',
      label: 'Add Mockup',
      icon: <Plus className="h-4 w-4" />,
      onClick: () => console.log('Add mockup'),
      variant: 'primary',
    },
  ];

  return (
    <ContentPage
      title="Design Mockups"
      description="HTML prototypes and design files that guide AI agent development."
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      searchPlaceholder="Search mockups..."
      actions={actions}
      columns={columns}
      rows={mockups}
      emptyState={
        <div className="text-center py-8">
          <Image className="h-12 w-12 text-[#3e3e3e] mx-auto mb-3" />
          <p className="text-[#666] mb-2">No mockups found</p>
          <p className="text-xs text-[#555]">Add HTML prototypes to design_mockups/</p>
        </div>
      }
    />
  );
}

export default DesignMockupsPage;
