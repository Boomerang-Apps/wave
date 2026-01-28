/**
 * DesignMockupsPage
 *
 * Shows design mockups and HTML prototypes
 */

import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Image, Play, Layout } from 'lucide-react';
import { ContentPage } from '../ContentPage';
import type { TableColumn, TableRow, ActionButton, ContentTab } from '../ContentPage';

interface DesignMockupsPageProps {
  projectPath: string;
}

interface ScreenData {
  id: string;
  name: string;
  description: string;
}

interface MockupData {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'pending' | 'draft';
  lastModified: string;
  filePath: string;
  size?: string;
  isNew?: boolean;
  screens?: ScreenData[];
}

export function DesignMockupsPage({ projectPath }: DesignMockupsPageProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('mockups');
  const [mockupsData, setMockupsData] = useState<MockupData[]>([]);

  // Open mockup in browser
  const openMockup = (filePath: string, anchor?: string) => {
    // Construct the file URL for the mockup
    let mockupUrl = `file://${projectPath}/design_mockups/${filePath}`;
    if (anchor) {
      mockupUrl += `#${anchor}`;
    }
    window.open(mockupUrl, '_blank');
  };

  // Launch all active prototypes
  const launchPrototypes = () => {
    const activeMockups = mockupsData.filter(m => m.status === 'active');
    if (activeMockups.length > 0) {
      // Open the first active mockup (usually the main dashboard)
      openMockup(activeMockups[0].filePath);
    } else if (mockupsData.length > 0) {
      openMockup(mockupsData[0].filePath);
    }
  };

  const scanMockups = async () => {
    setLoading(true);
    try {
      // Simulate mockup detection - in production, this would call an API
      const mockData: MockupData[] = [
        {
          id: 'mockup-1',
          name: 'dashboard.html',
          description: 'Main dashboard layout with navigation and widgets',
          status: 'active',
          lastModified: '2 hours ago',
          filePath: 'dashboard.html',
          size: '24 KB',
          isNew: true,
          screens: [
            { id: 'screen-1-1', name: 'Overview', description: 'Main dashboard overview with KPIs' },
            { id: 'screen-1-2', name: 'Analytics', description: 'Analytics and charts view' },
            { id: 'screen-1-3', name: 'Activity Feed', description: 'Recent activity timeline' },
          ],
        },
        {
          id: 'mockup-2',
          name: 'auth-flow.html',
          description: 'Authentication flow including login, signup, and password reset',
          status: 'active',
          lastModified: '1 day ago',
          filePath: 'auth-flow.html',
          size: '18 KB',
          screens: [
            { id: 'screen-2-1', name: 'Login', description: 'User login form' },
            { id: 'screen-2-2', name: 'Sign Up', description: 'New user registration' },
            { id: 'screen-2-3', name: 'Forgot Password', description: 'Password reset flow' },
            { id: 'screen-2-4', name: 'Two-Factor Auth', description: '2FA verification screen' },
            { id: 'screen-2-5', name: 'Success', description: 'Login success confirmation' },
          ],
        },
        {
          id: 'mockup-3',
          name: 'settings-page.html',
          description: 'User settings and preferences page',
          status: 'pending',
          lastModified: '3 days ago',
          filePath: 'settings-page.html',
          size: '12 KB',
          screens: [
            { id: 'screen-3-1', name: 'Profile', description: 'User profile settings' },
            { id: 'screen-3-2', name: 'Preferences', description: 'App preferences and themes' },
          ],
        },
      ];

      setMockupsData(mockData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scanMockups();
  }, [projectPath]);

  // Convert mockup data to table rows with clickable names and children
  const mockups: TableRow[] = mockupsData.map(mockup => ({
    id: mockup.id,
    name: mockup.name,
    customIcon: <Image className="h-4 w-4" />,
    description: mockup.description,
    url: `file://${projectPath}/design_mockups/${mockup.filePath}`,
    badge: mockup.isNew ? 'New' : undefined,
    cells: {
      status: (
        <span className={`px-2 py-0.5 text-xs rounded-md ${
          mockup.status === 'active'
            ? 'bg-[#22c55e]/20 text-[#22c55e]'
            : mockup.status === 'pending'
            ? 'bg-[#f97316]/20 text-[#f97316]'
            : 'bg-[#3e3e3e] text-[#888]'
        }`}>
          {mockup.status === 'active' ? 'Active' : mockup.status === 'pending' ? 'Pending' : 'Draft'}
        </span>
      ),
      type: <span className="text-[#a3a3a3]">HTML Prototype</span>,
      screens: <span className="text-[#fafafa]">{mockup.screens?.length || 0} screens</span>,
      lastModified: <span className="text-[#666]">{mockup.lastModified}</span>,
    },
    // Add child rows for screens
    children: mockup.screens?.map(screen => ({
      id: screen.id,
      name: screen.name,
      customIcon: <Layout className="h-4 w-4" />,
      description: screen.description,
      url: `file://${projectPath}/design_mockups/${mockup.filePath}#${screen.name.toLowerCase().replace(/\s+/g, '-')}`,
      cells: {
        status: <span className="text-[#666]">—</span>,
        type: <span className="text-[#666]">Screen</span>,
        screens: <span className="text-[#666]">—</span>,
        lastModified: <span className="text-[#666]">—</span>,
      },
    })),
  }));

  const tabs: ContentTab[] = [
    { id: 'mockups', label: 'Mockups' },
    { id: 'assets', label: 'Assets' },
  ];

  const columns: TableColumn[] = [
    { id: 'name', label: 'Name', width: '35%' },
    { id: 'status', label: 'Status', width: '10%' },
    { id: 'type', label: 'Type', width: '15%' },
    { id: 'screens', label: 'Screens', width: '10%' },
    { id: 'lastModified', label: 'Modified', width: '15%' },
  ];

  const actions: ActionButton[] = [
    {
      id: 'refresh',
      label: 'Rescan',
      icon: <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />,
      onClick: scanMockups,
    },
    {
      id: 'launch',
      label: 'Launch Prototype',
      icon: <Play className="h-4 w-4" />,
      onClick: launchPrototypes,
      variant: 'primary',
    },
    {
      id: 'add',
      label: 'Add Mockup',
      icon: <Plus className="h-4 w-4" />,
      onClick: () => console.log('Add mockup'),
    },
  ];

  return (
    <ContentPage
      title="Design Mockups"
      titleIcon={<Image className="h-5 w-5 text-[#888]" />}
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
