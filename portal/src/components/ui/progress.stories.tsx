import type { Meta, StoryObj } from '@storybook/react';
import { Progress } from './progress';
import { useState, useEffect } from 'react';
import { CheckCircle2, Clock, Download, Upload } from 'lucide-react';

/**
 * # Progress
 *
 * Progress indicator component built on Radix UI Progress primitive.
 * Shows completion status with smooth animations.
 *
 * ## Features
 * - Smooth value transitions
 * - Accessible ARIA attributes
 * - Customizable height and styling
 * - Support for 0-100 value range
 */

const meta: Meta<typeof Progress> = {
  title: 'Components/Progress',
  component: Progress,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Visual progress indicator with smooth transitions and accessibility support.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: 'Progress value (0-100)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 60,
    className: 'w-[300px]',
  },
};

export const Empty: Story = {
  args: {
    value: 0,
    className: 'w-[300px]',
  },
};

export const Half: Story = {
  args: {
    value: 50,
    className: 'w-[300px]',
  },
};

export const Complete: Story = {
  args: {
    value: 100,
    className: 'w-[300px]',
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="space-y-6 w-[400px] p-6 bg-background">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">0%</span>
        </div>
        <Progress value={0} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">25%</span>
        </div>
        <Progress value={25} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">50%</span>
        </div>
        <Progress value={50} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">75%</span>
        </div>
        <Progress value={75} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground font-medium">100%</span>
        </div>
        <Progress value={100} />
      </div>
    </div>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <div className="space-y-4 w-[400px] p-6 bg-background">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground font-medium">Uploading file...</span>
          <span className="text-muted-foreground">45%</span>
        </div>
        <Progress value={45} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground font-medium">Processing data</span>
          <span className="text-muted-foreground">78%</span>
        </div>
        <Progress value={78} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-green-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" />
            Complete
          </span>
          <span className="text-green-400">100%</span>
        </div>
        <Progress value={100} className="[&>div]:bg-green-500" />
      </div>
    </div>
  ),
};

export const Animated: Story = {
  render: () => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            return 0;
          }
          return prev + 1;
        });
      }, 50);

      return () => clearInterval(timer);
    }, []);

    return (
      <div className="space-y-2 w-[400px] p-6 bg-background">
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground font-medium">Loading...</span>
          <span className="text-muted-foreground">{progress}%</span>
        </div>
        <Progress value={progress} />
      </div>
    );
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-6 w-[400px] p-6 bg-background">
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Extra Small (h-1)</div>
        <Progress value={60} className="h-1" />
      </div>

      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Small (h-1.5)</div>
        <Progress value={60} className="h-1.5" />
      </div>

      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Default (h-2)</div>
        <Progress value={60} />
      </div>

      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Medium (h-3)</div>
        <Progress value={60} className="h-3" />
      </div>

      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Large (h-4)</div>
        <Progress value={60} className="h-4" />
      </div>
    </div>
  ),
};

export const CustomColors: Story = {
  render: () => (
    <div className="space-y-6 w-[400px] p-6 bg-background">
      <div className="space-y-2">
        <div className="text-sm text-foreground">Default (Primary)</div>
        <Progress value={60} />
      </div>

      <div className="space-y-2">
        <div className="text-sm text-green-400">Success (Green)</div>
        <Progress value={60} className="[&>div]:bg-green-500" />
      </div>

      <div className="space-y-2">
        <div className="text-sm text-amber-400">Warning (Amber)</div>
        <Progress value={60} className="[&>div]:bg-amber-500" />
      </div>

      <div className="space-y-2">
        <div className="text-sm text-red-400">Error (Red)</div>
        <Progress value={60} className="[&>div]:bg-red-500" />
      </div>

      <div className="space-y-2">
        <div className="text-sm text-blue-400">Info (Blue)</div>
        <Progress value={60} className="[&>div]:bg-blue-500" />
      </div>
    </div>
  ),
};

export const FileUpload: Story = {
  render: () => (
    <div className="space-y-4 w-[450px] p-6 bg-card border border-border rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
            <Upload className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">project-files.zip</div>
            <div className="text-xs text-muted-foreground">24.5 MB of 35.2 MB</div>
          </div>
        </div>
        <span className="text-sm text-muted-foreground">69%</span>
      </div>
      <Progress value={69} />
      <div className="text-xs text-muted-foreground">
        Uploading... About 15 seconds remaining
      </div>
    </div>
  ),
};

export const DownloadProgress: Story = {
  render: () => (
    <div className="space-y-4 w-[450px] p-6 bg-card border border-border rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <Download className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">Download in progress</div>
            <div className="text-xs text-muted-foreground">Installing dependencies...</div>
          </div>
        </div>
        <span className="text-sm text-blue-400">42%</span>
      </div>
      <Progress value={42} className="[&>div]:bg-blue-500" />
    </div>
  ),
};

export const MultiStep: Story = {
  render: () => (
    <div className="w-[500px] p-6 bg-card border border-border rounded-xl">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Installation Progress</h3>
          <p className="text-sm text-muted-foreground">Step 3 of 5</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-400 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Download packages
              </span>
              <span className="text-green-400">100%</span>
            </div>
            <Progress value={100} className="[&>div]:bg-green-500" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-400 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Extract files
              </span>
              <span className="text-green-400">100%</span>
            </div>
            <Progress value={100} className="[&>div]:bg-green-500" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground font-medium flex items-center gap-1">
                <Clock className="h-4 w-4 text-primary" />
                Install dependencies
              </span>
              <span className="text-muted-foreground">65%</span>
            </div>
            <Progress value={65} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Build project</span>
              <span className="text-muted-foreground">0%</span>
            </div>
            <Progress value={0} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Run tests</span>
              <span className="text-muted-foreground">0%</span>
            </div>
            <Progress value={0} />
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground font-medium">Overall Progress</span>
              <span className="text-muted-foreground">53%</span>
            </div>
            <Progress value={53} className="h-3" />
          </div>
        </div>
      </div>
    </div>
  ),
};

export const LoadingStates: Story = {
  render: () => (
    <div className="space-y-6 w-[400px] p-6 bg-background">
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">Indeterminate (0%)</div>
        <Progress value={0} className="animate-pulse" />
        <div className="text-xs text-muted-foreground">Loading...</div>
      </div>

      <div className="space-y-2">
        <div className="text-sm text-foreground">Starting (5%)</div>
        <Progress value={5} />
        <div className="text-xs text-muted-foreground">Initializing...</div>
      </div>

      <div className="space-y-2">
        <div className="text-sm text-foreground">In Progress (45%)</div>
        <Progress value={45} />
        <div className="text-xs text-muted-foreground">Processing...</div>
      </div>

      <div className="space-y-2">
        <div className="text-sm text-foreground">Almost Done (92%)</div>
        <Progress value={92} />
        <div className="text-xs text-muted-foreground">Finalizing...</div>
      </div>

      <div className="space-y-2">
        <div className="text-sm text-green-400 flex items-center gap-1">
          <CheckCircle2 className="h-4 w-4" />
          Complete
        </div>
        <Progress value={100} className="[&>div]:bg-green-500" />
      </div>
    </div>
  ),
};
