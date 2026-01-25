/**
 * BestPracticesSection Component Tests (Gate 0 Enhancement)
 * Collapsible section showing folder structure recommendations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BestPracticesSection } from '../components/BestPracticesSection';

describe('BestPracticesSection', () => {
  const defaultDeviations = [
    {
      type: 'missing',
      path: 'docs',
      severity: 'error',
      message: 'Required folder missing: docs',
      suggestion: 'Create docs directory for PRD and planning documents'
    },
    {
      type: 'missing',
      path: 'mockups',
      severity: 'error',
      message: 'Required folder missing: mockups',
      suggestion: 'Create mockups directory for design assets'
    },
    {
      type: 'missing',
      path: 'src',
      severity: 'warning',
      message: 'Recommended folder missing: src',
      suggestion: 'Consider adding src for source code'
    }
  ];

  const defaultReorganizationPlan = {
    actions: [
      { action: 'create', folder: 'docs', priority: 'critical' },
      { action: 'move', file: 'PRD.md', destination: 'docs/PRD.md', priority: 'critical' }
    ],
    isOrganized: false,
    estimatedMinutes: 5,
    duplicates: { prd: [], architecture: [], hasDuplicates: false }
  };

  describe('Rendering', () => {
    it('should render collapsed by default', () => {
      render(
        <BestPracticesSection
          deviations={defaultDeviations}
          reorganizationPlan={defaultReorganizationPlan}
          complianceScore={60}
        />
      );

      expect(screen.getByText(/Best Practices/i)).toBeInTheDocument();
      // When collapsed, the container has max-h-0 and opacity-0
      const contentContainer = screen.getByText(/Required folder missing: docs/).closest('.transition-all');
      expect(contentContainer).toHaveClass('max-h-0');
    });

    it('should expand when clicked', () => {
      render(
        <BestPracticesSection
          deviations={defaultDeviations}
          reorganizationPlan={defaultReorganizationPlan}
          complianceScore={60}
        />
      );

      const header = screen.getByRole('button', { name: /Best Practices/i });
      fireEvent.click(header);

      expect(screen.getByText(/Required folder missing: docs/)).toBeVisible();
    });

    it('should show compliance score badge', () => {
      render(
        <BestPracticesSection
          deviations={defaultDeviations}
          reorganizationPlan={defaultReorganizationPlan}
          complianceScore={75}
        />
      );

      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should show issue count', () => {
      render(
        <BestPracticesSection
          deviations={defaultDeviations}
          reorganizationPlan={defaultReorganizationPlan}
          complianceScore={60}
        />
      );

      // 3 total issues (2 errors + 1 warning)
      expect(screen.getByText(/3 issues/i)).toBeInTheDocument();
    });
  });

  describe('Deviations Display', () => {
    it('should show error deviations with red styling', () => {
      render(
        <BestPracticesSection
          deviations={defaultDeviations}
          reorganizationPlan={defaultReorganizationPlan}
          complianceScore={60}
          defaultExpanded={true}
        />
      );

      const errorItem = screen.getByText(/Required folder missing: docs/);
      expect(errorItem.closest('[data-severity="error"]')).toBeInTheDocument();
    });

    it('should show warning deviations with amber styling', () => {
      render(
        <BestPracticesSection
          deviations={defaultDeviations}
          reorganizationPlan={defaultReorganizationPlan}
          complianceScore={60}
          defaultExpanded={true}
        />
      );

      const warningItem = screen.getByText(/Recommended folder missing: src/);
      expect(warningItem.closest('[data-severity="warning"]')).toBeInTheDocument();
    });

    it('should show suggestions for each deviation', () => {
      render(
        <BestPracticesSection
          deviations={defaultDeviations}
          reorganizationPlan={defaultReorganizationPlan}
          complianceScore={60}
          defaultExpanded={true}
        />
      );

      expect(screen.getByText(/Create docs directory/)).toBeInTheDocument();
    });
  });

  describe('Reorganization Plan', () => {
    it('should show action count', () => {
      render(
        <BestPracticesSection
          deviations={defaultDeviations}
          reorganizationPlan={defaultReorganizationPlan}
          complianceScore={60}
          defaultExpanded={true}
        />
      );

      expect(screen.getByText(/2 actions/i)).toBeInTheDocument();
    });

    it('should show estimated time', () => {
      render(
        <BestPracticesSection
          deviations={defaultDeviations}
          reorganizationPlan={defaultReorganizationPlan}
          complianceScore={60}
          defaultExpanded={true}
        />
      );

      expect(screen.getByText(/~5 min/i)).toBeInTheDocument();
    });

    it('should show copy commands button', () => {
      render(
        <BestPracticesSection
          deviations={defaultDeviations}
          reorganizationPlan={defaultReorganizationPlan}
          complianceScore={60}
          defaultExpanded={true}
        />
      );

      expect(screen.getByRole('button', { name: /Copy Commands/i })).toBeInTheDocument();
    });
  });

  describe('Recommended Structure', () => {
    it('should show recommended folder structure', () => {
      render(
        <BestPracticesSection
          deviations={defaultDeviations}
          reorganizationPlan={defaultReorganizationPlan}
          complianceScore={60}
          defaultExpanded={true}
        />
      );

      // Click to show structure
      const structureTab = screen.getByRole('tab', { name: /Structure/i });
      fireEvent.click(structureTab);

      expect(screen.getByText(/docs\//)).toBeInTheDocument();
      expect(screen.getByText(/mockups\//)).toBeInTheDocument();
    });
  });

  describe('Well-Organized Project', () => {
    it('should show success state when no deviations', () => {
      render(
        <BestPracticesSection
          deviations={[]}
          reorganizationPlan={{
            actions: [],
            isOrganized: true,
            estimatedMinutes: 0,
            duplicates: { prd: [], architecture: [], hasDuplicates: false }
          }}
          complianceScore={100}
        />
      );

      expect(screen.getByText(/100%/)).toBeInTheDocument();
      expect(screen.getByText(/0 issues/i)).toBeInTheDocument();
    });
  });

  describe('Duplicate Detection', () => {
    it('should show duplicate warning when detected', () => {
      const planWithDuplicates = {
        ...defaultReorganizationPlan,
        duplicates: {
          prd: ['PRD.md', 'Footprint PRD.md'],
          architecture: [],
          hasDuplicates: true,
          suggestion: 'Consider consolidating into a single master document'
        }
      };

      render(
        <BestPracticesSection
          deviations={defaultDeviations}
          reorganizationPlan={planWithDuplicates}
          complianceScore={60}
          defaultExpanded={true}
        />
      );

      expect(screen.getByText(/Duplicate documents detected/i)).toBeInTheDocument();
    });
  });
});
