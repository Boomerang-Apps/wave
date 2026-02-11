import type { Meta, StoryObj } from '@storybook/react';
import { HumanReviewBanner } from './HumanReviewBanner';
import type { HumanReviewItem } from './HumanReviewBanner';

const noop = () => {};

const meta: Meta<typeof HumanReviewBanner> = {
  title: 'Components/HumanReviewBanner',
  component: HumanReviewBanner,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  args: {
    onApprove: noop,
    onReject: noop,
  },
};

export default meta;
type Story = StoryObj<typeof HumanReviewBanner>;

const singleItem: HumanReviewItem[] = [
  {
    id: 'esc-001',
    type: 'Gate 6 Architecture Review',
    reason: 'Security vulnerability detected in auth middleware — requires human verification',
    safety_score: 0.62,
    created_at: '2026-02-08T10:30:00Z',
  },
];

const multipleItems: HumanReviewItem[] = [
  {
    id: 'esc-001',
    type: 'Gate 4 QA Acceptance',
    reason: 'Edge case failure in payment flow — potential data loss',
    safety_score: 0.55,
    created_at: '2026-02-08T09:00:00Z',
  },
  {
    id: 'esc-002',
    type: 'Gate 6 Architecture Review',
    reason: 'New dependency introduces 3 transitive vulnerabilities',
    safety_score: 0.71,
    created_at: '2026-02-08T10:15:00Z',
  },
  {
    id: 'esc-003',
    type: 'Emergency Stop Triggered',
    reason: 'Agent attempted to modify production configuration file',
    safety_score: 0.3,
    created_at: '2026-02-08T10:45:00Z',
  },
];

export const SingleItem: Story = {
  args: {
    items: singleItem,
  },
};

export const MultipleItems: Story = {
  args: {
    items: multipleItems,
  },
};

export const NoSafetyScore: Story = {
  args: {
    items: [
      {
        id: 'esc-004',
        type: 'Manual Hold',
        reason: 'Developer requested manual review before merge',
        created_at: '2026-02-08T11:00:00Z',
      },
    ],
  },
};

export const Empty: Story = {
  args: {
    items: [],
  },
};
