import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { PrimarySidebar } from './PrimarySidebar';

const meta: Meta<typeof PrimarySidebar> = {
  title: 'Components/PrimarySidebar',
  component: PrimarySidebar,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/']}>
        <div style={{ height: '100vh', position: 'relative' }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PrimarySidebar>;

export const Default: Story = {};

export const OnProjectsPage: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/projects']}>
        <div style={{ height: '100vh', position: 'relative' }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
};

export const OnWavesPage: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/waves']}>
        <div style={{ height: '100vh', position: 'relative' }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
};

export const OnSettingsPage: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/settings']}>
        <div style={{ height: '100vh', position: 'relative' }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
};
