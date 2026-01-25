/**
 * FileListView Component
 *
 * List view for files with:
 * - Search functionality
 * - Sortable columns (name, date, version)
 * - File metadata display (timestamp, version)
 * - Open action button
 */

import { useState, useMemo } from 'react';
import {
  Search,
  X,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Play,
  FileText,
  Layout,
  FolderOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileItem {
  id?: string;
  title?: string;
  name?: string;
  filename: string;
  path: string;
  type?: string;
  modifiedAt?: string;
  version?: string;
  size?: number;
  order?: number;
}

export interface FileListViewProps {
  files: FileItem[];
  onOpen: (file: FileItem) => void;
  fileType: 'document' | 'mockup';
  className?: string;
}

type SortField = 'name' | 'modified' | 'version';
type SortDirection = 'asc' | 'desc';

/**
 * Format date for display
 */
function formatDate(isoString: string | undefined): string {
  if (!isoString) return '-';

  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Today
  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  // Yesterday
  if (diffDays === 1) {
    return 'Yesterday';
  }

  // Within a week
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  // Otherwise show date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Get display name for a file
 */
function getDisplayName(file: FileItem): string {
  return file.title || file.name || file.filename;
}

export function FileListView({
  files,
  onOpen,
  fileType,
  className,
}: FileListViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Filter files by search term
  const filteredFiles = useMemo(() => {
    if (!searchTerm.trim()) return files;

    const term = searchTerm.toLowerCase();
    return files.filter(file => {
      const name = getDisplayName(file).toLowerCase();
      const filename = file.filename.toLowerCase();
      return name.includes(term) || filename.includes(term);
    });
  }, [files, searchTerm]);

  // Sort files
  const sortedFiles = useMemo(() => {
    const sorted = [...filteredFiles];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = getDisplayName(a).localeCompare(getDisplayName(b));
          break;
        case 'modified':
          const dateA = a.modifiedAt ? new Date(a.modifiedAt).getTime() : 0;
          const dateB = b.modifiedAt ? new Date(b.modifiedAt).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'version':
          const versionA = a.version || 'v0';
          const versionB = b.version || 'v0';
          comparison = versionA.localeCompare(versionB, undefined, { numeric: true });
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [filteredFiles, sortField, sortDirection]);

  // Handle sort click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Render sort indicator
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="w-4" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
  };

  // Empty states
  if (files.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12", className)}>
        <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          {fileType === 'document' ? 'No documents found' : 'No mockups found'}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {fileType === 'document'
            ? 'Add .md files to docs/ folder'
            : 'Add HTML files to design_mockups/ folder'}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search and count bar */}
      <div className="flex items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-9 pr-9 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              aria-label="clear"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-background rounded transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* File count */}
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {searchTerm ? (
            <>{sortedFiles.length} of {files.length} files</>
          ) : (
            <>{files.length} files</>
          )}
        </span>
      </div>

      {/* No results after search */}
      {sortedFiles.length === 0 && searchTerm && (
        <div className="flex flex-col items-center justify-center py-8">
          <Search className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No files found for "{searchTerm}"</p>
          <button
            onClick={clearSearch}
            className="mt-2 text-sm text-blue-500 hover:underline"
          >
            Clear search
          </button>
        </div>
      )}

      {/* File list table */}
      {sortedFiles.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">
                  <button
                    onClick={() => handleSort('name')}
                    aria-label="Sort by Name"
                    className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Name
                    <SortIndicator field="name" />
                  </button>
                </th>
                <th className="text-left p-3 hidden sm:table-cell">
                  <button
                    onClick={() => handleSort('modified')}
                    aria-label="Sort by Modified"
                    className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Modified
                    <SortIndicator field="modified" />
                  </button>
                </th>
                <th className="text-left p-3 hidden md:table-cell">
                  <button
                    onClick={() => handleSort('version')}
                    aria-label="Sort by Version"
                    className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Version
                    <SortIndicator field="version" />
                  </button>
                </th>
                <th className="text-right p-3 w-24">
                  <span className="text-sm font-medium text-muted-foreground">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedFiles.map((file, index) => (
                <tr
                  key={file.id || file.path || index}
                  role="row"
                  onDoubleClick={() => onOpen(file)}
                  className="border-t border-border hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        fileType === 'document'
                          ? "bg-blue-500/10 text-blue-500"
                          : "bg-purple-500/10 text-purple-500"
                      )}>
                        {fileType === 'document' ? (
                          <FileText className="h-4 w-4" />
                        ) : (
                          <Layout className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {getDisplayName(file)}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {file.filename}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(file.modifiedAt)}
                    </span>
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-full",
                      file.version && file.version !== 'v1'
                        ? "bg-blue-500/10 text-blue-500"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {file.version || 'v1'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen(file);
                      }}
                      aria-label="Open"
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                        fileType === 'document'
                          ? "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                          : "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20"
                      )}
                    >
                      {fileType === 'mockup' ? (
                        <>
                          <Play className="h-3.5 w-3.5" />
                          Preview
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default FileListView;
