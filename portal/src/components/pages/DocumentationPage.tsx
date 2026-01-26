/**
 * DocumentationPage
 *
 * Shows project documentation files (PRD, CLAUDE.md, etc.)
 */

import { useState, useEffect } from 'react';
import { Plus, RefreshCw, FileText, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { ContentPage } from '../ContentPage';
import type { TableColumn, TableRow, ActionButton, ContentTab } from '../ContentPage';

interface DocumentationPageProps {
  projectPath: string;
}

export function DocumentationPage({ projectPath }: DocumentationPageProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('docs');
  const [documents, setDocuments] = useState<TableRow[]>([]);

  const scanDocuments = async () => {
    setLoading(true);
    try {
      // Simulate document detection
      const mockData: TableRow[] = [
        {
          id: 'doc-1',
          name: 'PRD.md',
          icon: 'file' as const,
          description: 'Product Requirements Document - defines features and requirements',
          cells: {
            type: <span className="text-[#a3a3a3]">Requirements</span>,
            status: (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#5a9a5a]" />
                <span className="text-[#5a9a5a]">Valid</span>
              </div>
            ),
            lastModified: <span className="text-[#666]">1 hour ago</span>,
            actions: (
              <button className="p-1.5 hover:bg-[#3e3e3e] rounded transition-colors">
                <ExternalLink className="h-4 w-4 text-[#666]" />
              </button>
            ),
          },
        },
        {
          id: 'doc-2',
          name: 'CLAUDE.md',
          icon: 'file' as const,
          description: 'AI Agent protocol and guidelines',
          cells: {
            type: <span className="text-[#a3a3a3]">Protocol</span>,
            status: (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#5a9a5a]" />
                <span className="text-[#5a9a5a]">Valid</span>
              </div>
            ),
            lastModified: <span className="text-[#666]">2 days ago</span>,
            actions: (
              <button className="p-1.5 hover:bg-[#3e3e3e] rounded transition-colors">
                <ExternalLink className="h-4 w-4 text-[#666]" />
              </button>
            ),
          },
        },
        {
          id: 'doc-3',
          name: 'README.md',
          icon: 'file' as const,
          description: 'Project overview and setup instructions',
          cells: {
            type: <span className="text-[#a3a3a3]">Overview</span>,
            status: (
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-[#d97706]" />
                <span className="text-[#d97706]">Missing sections</span>
              </div>
            ),
            lastModified: <span className="text-[#666]">1 week ago</span>,
            actions: (
              <button className="p-1.5 hover:bg-[#3e3e3e] rounded transition-colors">
                <ExternalLink className="h-4 w-4 text-[#666]" />
              </button>
            ),
          },
        },
        {
          id: 'doc-4',
          name: 'ARCHITECTURE.md',
          icon: 'file' as const,
          description: 'System architecture and design decisions',
          cells: {
            type: <span className="text-[#a3a3a3]">Architecture</span>,
            status: (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#5a9a5a]" />
                <span className="text-[#5a9a5a]">Valid</span>
              </div>
            ),
            lastModified: <span className="text-[#666]">3 days ago</span>,
            actions: (
              <button className="p-1.5 hover:bg-[#3e3e3e] rounded transition-colors">
                <ExternalLink className="h-4 w-4 text-[#666]" />
              </button>
            ),
          },
        },
      ];

      setDocuments(mockData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scanDocuments();
  }, [projectPath]);

  const tabs: ContentTab[] = [
    { id: 'docs', label: 'Documents' },
    { id: 'templates', label: 'Templates' },
  ];

  const columns: TableColumn[] = [
    { id: 'name', label: 'Name', width: '40%' },
    { id: 'type', label: 'Type', width: '15%' },
    { id: 'status', label: 'Status', width: '20%' },
    { id: 'lastModified', label: 'Modified', width: '15%' },
    { id: 'actions', label: '', width: '10%' },
  ];

  const actions: ActionButton[] = [
    {
      id: 'refresh',
      label: 'Rescan',
      icon: <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />,
      onClick: scanDocuments,
    },
    {
      id: 'add',
      label: 'Add Document',
      icon: <Plus className="h-4 w-4" />,
      onClick: () => console.log('Add document'),
      variant: 'primary',
    },
  ];

  return (
    <ContentPage
      title="Documentation"
      description="Project documents that define requirements, architecture, and AI agent protocols."
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      searchPlaceholder="Search documents..."
      actions={actions}
      columns={columns}
      rows={documents}
      emptyState={
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-[#3e3e3e] mx-auto mb-3" />
          <p className="text-[#666] mb-2">No documentation found</p>
          <p className="text-xs text-[#555]">Add PRD.md and CLAUDE.md to docs/</p>
        </div>
      }
    />
  );
}

export default DocumentationPage;
