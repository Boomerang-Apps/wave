import type { Meta, StoryObj } from '@storybook/react';
import { ModeProvider } from '../contexts/ModeContext';
import { ModeSwitch } from './ModeSwitch';

const meta: Meta<typeof ModeSwitch> = {
  title: 'Components/ModeSwitch',
  component: ModeSwitch,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ModeProvider>
        <div className="flex items-center gap-4">
          <Story />
          <span className="text-sm text-muted-foreground">Click to toggle Simple/Pro mode</span>
        </div>
      </ModeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ModeSwitch>;

export const Default: Story = {};
