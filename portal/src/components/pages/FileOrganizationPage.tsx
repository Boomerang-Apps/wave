/**
 * FileOrganizationPage
 *
 * Shows project folder structure with compliance status
 */

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle2, XCircle, Folder, FolderPlus } from 'lucide-react';
import { ContentPage } from '../ContentPage';
import type { TableColumn, TableRow, ActionButton } from '../ContentPage';

interface FileOrganizationPageProps {
  projectPath: string;
}

// Define expected WAVE folder structure (constant, outside component)
const expectedFolders = [
  { name: 'docs', description: 'Project documentation (PRD, specs, etc.)', required: true },
  { name: 'design_mockups', description: 'UI/UX design files and HTML prototypes', required: true },
  { name: 'src', description: 'Source code directory', required: false },
  { name: 'tests', description: 'Test files and fixtures', required: false },
  { name: '.wave', description: 'WAVE configuration and state', required: true },
];

export function FileOrganizationPage({ projectPath }: FileOrganizationPageProps) {
  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState<TableRow[]>([]);

  const scanFolders = useCallback(async () => {
    setLoading(true);
    try {
      // In a real implementation, this would call an API
      // For now, simulate folder detection
      const mockFolders: TableRow[] = expectedFolders.map((folder, idx) => ({
        id: `folder-${idx}`,
        name: folder.name,
        icon: 'folder' as const,
        description: folder.description,
        cells: {
          status: folder.required ? (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-[#5a9a5a]" />
              <span className="text-[#5a9a5a]">Found</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <XCircle className="h-4 w-4 text-[#666]" />
              <span className="text-[#666]">Optional</span>
            </div>
          ),
          required: folder.required ? (
            <span className="text-[#d97706]">Required</span>
          ) : (
            <span className="text-[#666]">Optional</span>
          ),
        },
        expandable: true,
        children: folder.name === 'docs' ? [
          {
            id: 'docs-prd',
            name: 'PRD.md',
            icon: 'file' as const,
            cells: {
              status: <span className="text-[#5a9a5a]">Found</span>,
              required: <span className="text-[#d97706]">Required</span>,
            },
          },
          {
            id: 'docs-claude',
            name: 'CLAUDE.md',
            icon: 'file' as const,
            cells: {
              status: <span className="text-[#5a9a5a]">Found</span>,
              required: <span className="text-[#d97706]">Required</span>,
            },
          },
        ] : undefined,
      }));

      setFolders(mockFolders);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    scanFolders();
  }, [projectPath, scanFolders]);

  const columns: TableColumn[] = [
    { id: 'name', label: 'Name', width: '50%' },
    { id: 'status', label: 'Status', width: '25%' },
    { id: 'required', label: 'Requirement', width: '25%' },
  ];

  const actions: ActionButton[] = [
    {
      id: 'refresh',
      label: 'Rescan',
      icon: <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />,
      onClick: scanFolders,
    },
    {
      id: 'create',
      label: 'Create Missing',
      icon: <FolderPlus className="h-4 w-4" />,
      onClick: () => console.log('Create missing folders'),
      variant: 'primary',
    },
  ];

  return (
    <ContentPage
      title="File Organization"
      description="Validate your project follows the WAVE folder structure for optimal AI agent performance."
      searchPlaceholder="Search folders..."
      actions={actions}
      columns={columns}
      rows={folders}
      emptyState={
        <div className="text-center py-8">
          <Folder className="h-12 w-12 text-[#3e3e3e] mx-auto mb-3" />
          <p className="text-[#666]">No project path configured</p>
        </div>
      }
    />
  );
}

export default FileOrganizationPage;
