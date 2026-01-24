/**
 * TDD Tests for Mockup Design Tab Component (Launch Sequence)
 *
 * Phase 2, Step 2.5: Mockup Tab UI Component
 *
 * Tests the MockupDesignTab component that provides the UI for
 * Step 0 of the launch sequence - validating HTML mockups.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
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

  const defaultProps: MockupDesignTabProps = {
    projectPath: '/project/my-app',
    projectId: 'project-123',
    validationStatus: 'idle',
    onValidationComplete: vi.fn()
  };

  // ============================================
  // Initial Render Tests
  // ============================================

  describe('initial render', () => {
    it('should render info box explaining Step 0', () => {
      render(<MockupDesignTab {...defaultProps} />);

      expect(screen.getByText(/mockup design/i)).toBeInTheDocument();
    });

    it('should display project path', () => {
      render(<MockupDesignTab {...defaultProps} projectPath="/project/my-app" />);

      expect(screen.getByText(/my-app/)).toBeInTheDocument();
    });

    it('should show validate button', () => {
      render(<MockupDesignTab {...defaultProps} />);

      expect(screen.getByRole('button', { name: /validate/i })).toBeInTheDocument();
    });

    it('should show idle status indicator when status is idle', () => {
      render(<MockupDesignTab {...defaultProps} validationStatus="idle" />);

      expect(screen.getByTestId('status-indicator')).toHaveClass('bg-gray-400');
    });
  });

  // ============================================
  // Validation Button Tests
  // ============================================

  describe('validate button', () => {
    it('should call API when validate button clicked', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'ready', checks: [], screens: [] })
      });

      render(<MockupDesignTab {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /validate/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/validate-mockups',
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    it('should disable button while validating', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'ready', checks: [], screens: [] })
        }), 100))
      );

      render(<MockupDesignTab {...defaultProps} />);

      const button = screen.getByRole('button', { name: /validate/i });
      fireEvent.click(button);

      expect(button).toBeDisabled();
    });

    it('should show loading spinner while validating', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'ready', checks: [], screens: [] })
        }), 100))
      );

      render(<MockupDesignTab {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /validate/i }));

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  // ============================================
  // Progress Display Tests
  // ============================================

  describe('progress display', () => {
    it('should show progress bar during validation', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'ready', checks: [], screens: [] })
        }), 100))
      );

      render(<MockupDesignTab {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /validate/i }));

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  // ============================================
  // Results Display Tests
  // ============================================

  describe('results display', () => {
    it('should display validation results after completion', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          status: 'ready',
          checks: [
            { name: 'Mockup Folder', status: 'pass', message: 'Found' },
            { name: 'HTML Files', status: 'pass', message: 'Found 3 files' }
          ],
          screens: []
        })
      });

      render(<MockupDesignTab {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /validate/i }));

      await waitFor(() => {
        expect(screen.getByText('Mockup Folder')).toBeInTheDocument();
        expect(screen.getByText('HTML Files')).toBeInTheDocument();
      });
    });

    it('should display screen list when mockups found', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          status: 'ready',
          checks: [],
          screens: [
            { name: 'home.html', title: 'Home Page', summary: '2 forms, 3 buttons' },
            { name: 'about.html', title: 'About Us', summary: '1 form' }
          ]
        })
      });

      render(<MockupDesignTab {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /validate/i }));

      await waitFor(() => {
        expect(screen.getByText('home.html')).toBeInTheDocument();
        expect(screen.getByText('about.html')).toBeInTheDocument();
      });
    });

    it('should show pass/fail icons for checks', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          status: 'blocked',
          checks: [
            { name: 'Mockup Folder', status: 'fail', message: 'Not found' }
          ],
          screens: []
        })
      });

      render(<MockupDesignTab {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /validate/i }));

      await waitFor(() => {
        expect(screen.getByTestId('check-fail-icon')).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // Lock Mockups Button Tests
  // ============================================

  describe('lock mockups button', () => {
    it('should show Lock Mockups button when status is ready', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          status: 'ready',
          checks: [{ name: 'Mockup Folder', status: 'pass', message: 'Found' }],
          screens: [{ name: 'home.html', title: 'Home', summary: '' }]
        })
      });

      render(<MockupDesignTab {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /validate/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /lock mockups/i })).toBeInTheDocument();
      });
    });

    it('should not show Lock Mockups button when status is blocked', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          status: 'blocked',
          checks: [{ name: 'Mockup Folder', status: 'fail', message: 'Not found' }],
          screens: []
        })
      });

      render(<MockupDesignTab {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /validate/i }));

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /lock mockups/i })).not.toBeInTheDocument();
      });
    });

    it('should call onValidationComplete when Lock Mockups clicked', async () => {
      const onComplete = vi.fn();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          status: 'ready',
          checks: [],
          screens: [{ name: 'home.html', title: 'Home', summary: '' }]
        })
      });

      render(<MockupDesignTab {...defaultProps} onValidationComplete={onComplete} />);

      fireEvent.click(screen.getByRole('button', { name: /validate/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /lock mockups/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /lock mockups/i }));

      expect(onComplete).toHaveBeenCalledWith('ready');
    });
  });

  // ============================================
  // Status Indicator Tests
  // ============================================

  describe('status indicator', () => {
    it('should show green indicator when status is ready', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'ready', checks: [], screens: [] })
      });

      render(<MockupDesignTab {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /validate/i }));

      await waitFor(() => {
        expect(screen.getByTestId('status-indicator')).toHaveClass('bg-green-500');
      });
    });

    it('should show red indicator when status is blocked', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'blocked', checks: [], screens: [] })
      });

      render(<MockupDesignTab {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /validate/i }));

      await waitFor(() => {
        expect(screen.getByTestId('status-indicator')).toHaveClass('bg-red-500');
      });
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================

  describe('error handling', () => {
    it('should display error message on API failure', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' })
      });

      render(<MockupDesignTab {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /validate/i }));

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('should display error on network failure', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      render(<MockupDesignTab {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /validate/i }));

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should allow retry after error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: 'ready', checks: [], screens: [] })
        });

      render(<MockupDesignTab {...defaultProps} />);

      // First attempt fails
      fireEvent.click(screen.getByRole('button', { name: /validate/i }));

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      // Retry button should be available
      const retryButton = screen.getByRole('button', { name: /retry|validate/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByTestId('status-indicator')).toHaveClass('bg-green-500');
      });
    });
  });
});
