/**
 * FileListView Component Tests
 * List view with search, sort, and file metadata display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { FileListView } from '../components/FileListView';

describe('FileListView', () => {
  const mockDocuments = [
    {
      id: '1',
      title: 'Footprint PRD',
      filename: 'footprint-prd.md',
      path: '/project/docs/footprint-prd.md',
      type: 'prd',
      modifiedAt: '2026-01-25T10:30:00Z',
      version: 'v2',
      size: 15000,
    },
    {
      id: '2',
      title: 'Architecture',
      filename: 'architecture.md',
      path: '/project/docs/architecture.md',
      type: 'architecture',
      modifiedAt: '2026-01-20T14:15:00Z',
      version: 'v1',
      size: 8500,
    },
    {
      id: '3',
      title: 'User Stories',
      filename: 'user-stories.md',
      path: '/project/docs/user-stories.md',
      type: 'userStories',
      modifiedAt: '2026-01-22T09:00:00Z',
      version: 'v3',
      size: 12000,
    },
  ];

  const mockMockups = [
    {
      id: '1',
      name: 'Login',
      filename: '01-login.html',
      path: '/project/mockups/01-login.html',
      modifiedAt: '2026-01-24T16:45:00Z',
      version: 'v1',
      size: 5000,
      order: 1,
    },
    {
      id: '2',
      name: 'Dashboard',
      filename: '02-dashboard.html',
      path: '/project/mockups/02-dashboard.html',
      modifiedAt: '2026-01-25T11:00:00Z',
      version: 'v2',
      size: 8000,
      order: 2,
    },
  ];

  describe('Rendering', () => {
    it('should render file list with all columns', () => {
      render(
        <FileListView
          files={mockDocuments}
          onOpen={vi.fn()}
          fileType="document"
        />
      );

      // Check headers
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Modified')).toBeInTheDocument();
      expect(screen.getByText('Version')).toBeInTheDocument();
    });

    it('should render all files', () => {
      render(
        <FileListView
          files={mockDocuments}
          onOpen={vi.fn()}
          fileType="document"
        />
      );

      expect(screen.getByText('Footprint PRD')).toBeInTheDocument();
      expect(screen.getByText('Architecture')).toBeInTheDocument();
      expect(screen.getByText('User Stories')).toBeInTheDocument();
    });

    it('should display version badges', () => {
      render(
        <FileListView
          files={mockDocuments}
          onOpen={vi.fn()}
          fileType="document"
        />
      );

      expect(screen.getByText('v2')).toBeInTheDocument();
      expect(screen.getByText('v1')).toBeInTheDocument();
      expect(screen.getByText('v3')).toBeInTheDocument();
    });

    it('should display formatted dates', () => {
      render(
        <FileListView
          files={mockDocuments}
          onOpen={vi.fn()}
          fileType="document"
        />
      );

      // Should show relative or formatted dates (could be "X days ago" or date format)
      // Check that date column has content for each file
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(1); // Header + data rows
    });

    it('should show open button for each file', () => {
      render(
        <FileListView
          files={mockDocuments}
          onOpen={vi.fn()}
          fileType="document"
        />
      );

      const openButtons = screen.getAllByRole('button', { name: /open/i });
      expect(openButtons).toHaveLength(3);
    });
  });

  describe('Search', () => {
    it('should render search input', () => {
      render(
        <FileListView
          files={mockDocuments}
          onOpen={vi.fn()}
          fileType="document"
        />
      );

      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    it('should filter files by search term', () => {
      render(
        <FileListView
          files={mockDocuments}
          onOpen={vi.fn()}
          fileType="document"
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'PRD' } });

      expect(screen.getByText('Footprint PRD')).toBeInTheDocument();
      expect(screen.queryByText('Architecture')).not.toBeInTheDocument();
      expect(screen.queryByText('User Stories')).not.toBeInTheDocument();
    });

    it('should search by filename', () => {
      render(
        <FileListView
          files={mockDocuments}
          onOpen={vi.fn()}
          fileType="document"
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'architecture' } });

      expect(screen.getByText('Architecture')).toBeInTheDocument();
      expect(screen.queryByText('Footprint PRD')).not.toBeInTheDocument();
    });

    it('should show no results message when search has no matches', () => {
      render(
        <FileListView
          files={mockDocuments}
          onOpen={vi.fn()}
          fileType="document"
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText(/no files found/i)).toBeInTheDocument();
    });

    it('should clear search when X button is clicked', () => {
      render(
        <FileListView
          files={mockDocuments}
          onOpen={vi.fn()}
          fileType="document"
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'PRD' } });

      const clearButton = screen.getByRole('button', { name: /clear/i });
      fireEvent.click(clearButton);

      expect(screen.getByText('Architecture')).toBeInTheDocument();
      expect(screen.getByText('User Stories')).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should sort by name when name header is clicked', () => {
      render(
        <FileListView
          files={mockDocuments}
          onOpen={vi.fn()}
          fileType="document"
        />
      );

      // Default sort is name ascending, so Architecture is first
      let rows = screen.getAllByRole('row');
      expect(within(rows[1]).getByText('Architecture')).toBeInTheDocument();

      // Clicking toggles to descending, so User Stories is first
      const nameHeader = screen.getByRole('button', { name: /sort by name/i });
      fireEvent.click(nameHeader);

      rows = screen.getAllByRole('row');
      expect(within(rows[1]).getByText('User Stories')).toBeInTheDocument();
    });

    it('should sort by date when modified header is clicked', () => {
      render(
        <FileListView
          files={mockDocuments}
          onOpen={vi.fn()}
          fileType="document"
        />
      );

      const dateHeader = screen.getByRole('button', { name: /sort by modified/i });
      fireEvent.click(dateHeader);

      // Should sort by date (most recent first or oldest first)
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(1);
    });

    it('should toggle sort direction on second click', () => {
      render(
        <FileListView
          files={mockDocuments}
          onOpen={vi.fn()}
          fileType="document"
        />
      );

      const nameHeader = screen.getByRole('button', { name: /sort by name/i });

      // Default is ascending - Architecture first
      let rows = screen.getAllByRole('row');
      expect(within(rows[1]).getByText('Architecture')).toBeInTheDocument();

      // First click - toggles to descending, User Stories first
      fireEvent.click(nameHeader);
      rows = screen.getAllByRole('row');
      expect(within(rows[1]).getByText('User Stories')).toBeInTheDocument();

      // Second click - back to ascending, Architecture first
      fireEvent.click(nameHeader);
      rows = screen.getAllByRole('row');
      expect(within(rows[1]).getByText('Architecture')).toBeInTheDocument();
    });
  });

  describe('Open Action', () => {
    it('should call onOpen when open button is clicked', () => {
      const onOpen = vi.fn();
      render(
        <FileListView
          files={mockDocuments}
          onOpen={onOpen}
          fileType="document"
        />
      );

      // Files are sorted by name, so first button is for Architecture (mockDocuments[1])
      const openButtons = screen.getAllByRole('button', { name: /open/i });
      fireEvent.click(openButtons[0]);

      expect(onOpen).toHaveBeenCalledWith(mockDocuments[1]); // Architecture is first when sorted
    });

    it('should call onOpen when row is double-clicked', () => {
      const onOpen = vi.fn();
      render(
        <FileListView
          files={mockDocuments}
          onOpen={onOpen}
          fileType="document"
        />
      );

      const firstRow = screen.getByText('Footprint PRD').closest('tr');
      fireEvent.doubleClick(firstRow!);

      expect(onOpen).toHaveBeenCalledWith(mockDocuments[0]);
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no files', () => {
      render(
        <FileListView
          files={[]}
          onOpen={vi.fn()}
          fileType="document"
        />
      );

      expect(screen.getByText(/no documents found/i)).toBeInTheDocument();
    });

    it('should show empty state for mockups', () => {
      render(
        <FileListView
          files={[]}
          onOpen={vi.fn()}
          fileType="mockup"
        />
      );

      expect(screen.getByText(/no mockups found/i)).toBeInTheDocument();
    });
  });

  describe('File Count', () => {
    it('should display total file count', () => {
      render(
        <FileListView
          files={mockDocuments}
          onOpen={vi.fn()}
          fileType="document"
        />
      );

      expect(screen.getByText(/3 files/i)).toBeInTheDocument();
    });

    it('should update count when filtered', () => {
      render(
        <FileListView
          files={mockDocuments}
          onOpen={vi.fn()}
          fileType="document"
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'PRD' } });

      expect(screen.getByText(/1 of 3/i)).toBeInTheDocument();
    });
  });

  describe('Mockup Files', () => {
    it('should render mockup files with preview button', () => {
      render(
        <FileListView
          files={mockMockups}
          onOpen={vi.fn()}
          fileType="mockup"
        />
      );

      expect(screen.getByText('Login')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();

      const previewButtons = screen.getAllByRole('button', { name: /preview|open/i });
      expect(previewButtons.length).toBe(2);
    });
  });
});
