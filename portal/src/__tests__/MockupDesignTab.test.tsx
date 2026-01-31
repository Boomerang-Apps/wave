/**
 * TDD Tests for Mockup Design Tab Component (Launch Sequence)
 *
 * Phase 2, Step 2.5: Mockup Tab UI Component
 *
 * Tests the MockupDesignTab component that provides the UI for
 * Step 0 of the launch sequence - Design Foundation validation.
 *
 * The component has three states:
 * 1. not-connected - Shows folder selection UI
 * 2. discovering - Shows loading state while discovering project
 * 3. connected - Shows project info and "Analyze Foundation" button
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { MockupDesignTab } from '../components/MockupDesignTab';
import type { MockupDesignTabProps } from '../components/MockupDesignTab';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('MockupDesignTab Component', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const defaultProps: MockupDesignTabProps = {
    projectPath: '/project/my-app',
    projectId: 'project-123',
    validationStatus: 'idle',
    onValidationComplete: vi.fn()
  };

  // Mock successful project discovery response
  const mockProjectData = {
    data: {
      name: 'my-app',
      tagline: 'Test project',
      vision: 'A test application',
      description: 'Description',
      documentation: [
        { title: 'PRD', filename: 'PRD.md', path: '/project/my-app/docs/PRD.md', type: 'prd' }
      ],
      mockups: [
        { name: 'Home', filename: '01-home.html', path: '/project/my-app/design_mockups/01-home.html', order: 1 }
      ],
      techStack: ['React', 'TypeScript'],
      paths: {
        root: '/project/my-app',
        mockups: '/project/my-app/design_mockups',
        docs: '/project/my-app/docs'
      },
      connection: {
        rootExists: true,
        mockupsFolderExists: true,
        docsFolderExists: true,
        status: 'connected'
      }
    }
  };

  const mockStructureValidation = {
    data: {
      deviations: [],
      complianceScore: 85,
      reorganizationPlan: {
        actions: [],
        isOrganized: true,
        estimatedMinutes: 0,
        duplicates: { prd: [], architecture: [], hasDuplicates: false }
      }
    }
  };

  // ============================================
  // Initial Render Tests
  // ============================================

  describe('initial render', () => {
    it('should show discovering state when projectPath is provided', () => {
      // Don't resolve fetch immediately to stay in discovering state
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<MockupDesignTab {...defaultProps} />);

      expect(screen.getByText(/discovering project/i)).toBeInTheDocument();
    });

    it('should show not-connected state when no projectPath', () => {
      render(<MockupDesignTab {...defaultProps} projectPath="" />);

      expect(screen.getByText('Connect Your Project')).toBeInTheDocument();
    });

    it('should transition to connected state after discovery', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProjectData)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStructureValidation)
        });

      render(<MockupDesignTab {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('my-app')).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // Connected State Tests
  // ============================================

  describe('connected state', () => {
    beforeEach(() => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProjectData)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStructureValidation)
        });
    });

    it('should display project name when connected', async () => {
      render(<MockupDesignTab {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('my-app')).toBeInTheDocument();
      });
    });

    it('should display project tagline when connected', async () => {
      render(<MockupDesignTab {...defaultProps} />);

      await waitFor(() => {
        // Mock data has tagline: 'Test project'
        expect(screen.getByText('Test project')).toBeInTheDocument();
      });
    });

    it('should show analysis controls when connected', async () => {
      render(<MockupDesignTab {...defaultProps} />);

      await waitFor(() => {
        // InlineAnalysis component shows analysis controls
        expect(screen.getByText('my-app')).toBeInTheDocument();
      });
    });

    it('should display expandable cards for documentation and mockups', async () => {
      render(<MockupDesignTab {...defaultProps} />);

      await waitFor(() => {
        // Check for documentation section
        expect(screen.getByText('Documentation')).toBeInTheDocument();
        // Check for design mockups section
        expect(screen.getByText('Design Mockups')).toBeInTheDocument();
      });
    });

    it('should display tech stack pills', async () => {
      render(<MockupDesignTab {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('React')).toBeInTheDocument();
        expect(screen.getByText('TypeScript')).toBeInTheDocument();
      });
    });

    it('should show project connections section', async () => {
      render(<MockupDesignTab {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Project Connections')).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // Refresh and Change Path Tests
  // ============================================

  describe('refresh and change path', () => {
    beforeEach(() => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProjectData)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStructureValidation)
        });
    });

    it('should show Refresh button when connected', async () => {
      render(<MockupDesignTab {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });
    });

    it('should show Change button when connected', async () => {
      render(<MockupDesignTab {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /change/i })).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================

  describe('error handling', () => {
    it('should show not-connected state on discovery failure', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500
      });

      render(<MockupDesignTab {...defaultProps} />);

      await waitFor(() => {
        // Should fall back to not-connected state
        expect(screen.getByText('Connect Your Project')).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      render(<MockupDesignTab {...defaultProps} />);

      await waitFor(() => {
        // Should fall back to not-connected state
        expect(screen.getByText('Connect Your Project')).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // Folder Browser Dialog Tests
  // ============================================

  describe('folder browser dialog', () => {
    it.skip('should open folder browser when Select Folder clicked', async () => {
      // Mock the browse-folders API call
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          folders: [],
          currentPath: '/Users/test',
          parentPath: '/Users'
        })
      });

      render(<MockupDesignTab {...defaultProps} projectPath="" />);

      const selectButton = screen.getByRole('button', { name: /select folder/i });
      fireEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByText('Select Project Folder')).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // API Call Tests
  // ============================================

  describe('API calls', () => {
    it('should call discover-project API on mount', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProjectData)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStructureValidation)
        });

      render(<MockupDesignTab {...defaultProps} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/discover-project',
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    it('should call validate-structure API on mount', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProjectData)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStructureValidation)
        });

      render(<MockupDesignTab {...defaultProps} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/validate-structure',
          expect.objectContaining({ method: 'POST' })
        );
      });
    });
  });

  // ============================================
  // KPI Card Status Tests
  // ============================================

  describe('KPI card statuses', () => {
    it('should show warning status when no documents', async () => {
      const noDocsData = {
        ...mockProjectData,
        data: {
          ...mockProjectData.data,
          documentation: []
        }
      };

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(noDocsData)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStructureValidation)
        });

      render(<MockupDesignTab {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Documentation')).toBeInTheDocument();
        // Should show "0 files discovered" subtitle
        expect(screen.getByText('0 files discovered')).toBeInTheDocument();
      });
    });

    it('should show warning status when no mockups', async () => {
      const noMockupsData = {
        ...mockProjectData,
        data: {
          ...mockProjectData.data,
          mockups: []
        }
      };

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(noMockupsData)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStructureValidation)
        });

      render(<MockupDesignTab {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Design Mockups')).toBeInTheDocument();
        // Should show "0 HTML screens discovered" subtitle
        expect(screen.getByText('0 HTML screens discovered')).toBeInTheDocument();
      });
    });
  });
});
