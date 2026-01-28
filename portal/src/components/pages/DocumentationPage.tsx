/**
 * DocumentationPage
 *
 * Shows project documentation files (PRD, CLAUDE.md, etc.)
 */

import { useState, useEffect } from 'react';
import { Plus, RefreshCw, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
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
            status: <span className="px-2 py-0.5 text-xs rounded-md bg-[#2d4a2d] text-[#5a9a5a]">Active</span>,
            type: <span className="text-[#a3a3a3]">Requirements</span>,
            validation: (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#5a9a5a]" />
                <span className="text-[#5a9a5a]">Valid</span>
              </div>
            ),
            lastModified: <span className="text-[#666]">1 hour ago</span>,
          },
        },
        {
          id: 'doc-2',
          name: 'CLAUDE.md',
          icon: 'file' as const,
          description: 'AI Agent protocol and guidelines',
          cells: {
            status: <span className="px-2 py-0.5 text-xs rounded-md bg-[#2d4a2d] text-[#5a9a5a]">Active</span>,
            type: <span className="text-[#a3a3a3]">Protocol</span>,
            validation: (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#5a9a5a]" />
                <span className="text-[#5a9a5a]">Valid</span>
              </div>
            ),
            lastModified: <span className="text-[#666]">2 days ago</span>,
          },
        },
        {
          id: 'doc-3',
          name: 'README.md',
          icon: 'file' as const,
          description: 'Project overview and setup instructions',
          cells: {
            status: <span className="px-2 py-0.5 text-xs rounded-md bg-[#4a4a2d] text-[#d97706]">Pending</span>,
            type: <span className="text-[#a3a3a3]">Overview</span>,
            validation: (
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-[#d97706]" />
                <span className="text-[#d97706]">Missing sections</span>
              </div>
            ),
            lastModified: <span className="text-[#666]">1 week ago</span>,
          },
        },
        {
          id: 'doc-4',
          name: 'ARCHITECTURE.md',
          icon: 'file' as const,
          description: 'System architecture and design decisions',
          cells: {
            status: <span className="px-2 py-0.5 text-xs rounded-md bg-[#2d4a2d] text-[#5a9a5a]">Active</span>,
            type: <span className="text-[#a3a3a3]">Architecture</span>,
            validation: (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#5a9a5a]" />
                <span className="text-[#5a9a5a]">Valid</span>
              </div>
            ),
            lastModified: <span className="text-[#666]">3 days ago</span>,
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
    { id: 'name', label: 'Name', width: '25%' },
    { id: 'status', label: 'Status', width: '10%' },
    { id: 'type', label: 'Type', width: '12%' },
    { id: 'validation', label: 'Validation', width: '18%' },
    { id: 'lastModified', label: 'Modified', width: '12%' },
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
      titleIcon={<FileText className="h-5 w-5 text-[#888]" />}
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
