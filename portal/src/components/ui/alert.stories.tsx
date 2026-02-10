import type { Meta, StoryObj } from '@storybook/react';
import { Alert, AlertTitle, AlertDescription } from './alert';
import { Terminal, AlertCircle, CheckCircle2, Info } from 'lucide-react';

/**
 * # Alert
 *
 * Alert component for displaying important messages and notifications.
 * Built with composable subcomponents for title and description.
 *
 * ## Variants
 * - **default**: Standard alert styling
 * - **destructive**: For error and critical messages
 *
 * ## Subcomponents
 * - **Alert**: Main container
 * - **AlertTitle**: Bold title text
 * - **AlertDescription**: Description text
 */

const meta: Meta<typeof Alert> = {
  title: 'Components/Alert',
  component: Alert,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Flexible alert component for notifications and important messages.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive'],
      description: 'Alert variant',
      table: {
        defaultValue: { summary: 'default' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Alert className="max-w-md">
      <Terminal className="h-4 w-4" />
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>
        You can add components to your app using the cli.
      </AlertDescription>
    </Alert>
  ),
};

export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive" className="max-w-md">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        Your session has expired. Please log in again.
      </AlertDescription>
    </Alert>
  ),
};

export const Success: Story = {
  render: () => (
    <Alert className="max-w-md border-green-500/50 bg-green-500/10">
      <CheckCircle2 className="h-4 w-4 text-green-400" />
      <AlertTitle className="text-green-400">Success</AlertTitle>
      <AlertDescription className="text-foreground">
        Your changes have been saved successfully.
      </AlertDescription>
    </Alert>
  ),
};

export const InfoAlert: Story = {
  render: () => (
    <Alert className="max-w-md border-blue-500/50 bg-blue-500/10">
      <Info className="h-4 w-4 text-blue-400" />
      <AlertTitle className="text-blue-400">Information</AlertTitle>
      <AlertDescription className="text-foreground">
        This feature is currently in beta testing.
      </AlertDescription>
    </Alert>
  ),
};

export const Warning: Story = {
  render: () => (
    <Alert className="max-w-md border-amber-500/50 bg-amber-500/10">
      <AlertCircle className="h-4 w-4 text-amber-400" />
      <AlertTitle className="text-amber-400">Warning</AlertTitle>
      <AlertDescription className="text-foreground">
        Your API key will expire in 7 days. Please renew it to avoid service interruption.
      </AlertDescription>
    </Alert>
  ),
};

export const WithoutIcon: Story = {
  render: () => (
    <Alert className="max-w-md">
      <AlertTitle>Update Available</AlertTitle>
      <AlertDescription>
        A new version of the application is available. Click here to update.
      </AlertDescription>
    </Alert>
  ),
};

export const WithoutTitle: Story = {
  render: () => (
    <Alert className="max-w-md">
      <Terminal className="h-4 w-4" />
      <AlertDescription>
        This is a simple alert with just a description and an icon.
      </AlertDescription>
    </Alert>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4 max-w-2xl">
      <Alert>
        <Terminal className="h-4 w-4" />
        <AlertTitle>Default Alert</AlertTitle>
        <AlertDescription>
          Standard alert for general information and notifications.
        </AlertDescription>
      </Alert>

      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Destructive Alert</AlertTitle>
        <AlertDescription>
          Used for errors, failures, and critical warnings.
        </AlertDescription>
      </Alert>

      <Alert className="border-green-500/50 bg-green-500/10">
        <CheckCircle2 className="h-4 w-4 text-green-400" />
        <AlertTitle className="text-green-400">Success Alert</AlertTitle>
        <AlertDescription className="text-foreground">
          Custom styled alert for success messages.
        </AlertDescription>
      </Alert>

      <Alert className="border-amber-500/50 bg-amber-500/10">
        <AlertCircle className="h-4 w-4 text-amber-400" />
        <AlertTitle className="text-amber-400">Warning Alert</AlertTitle>
        <AlertDescription className="text-foreground">
          Custom styled alert for warnings and attention.
        </AlertDescription>
      </Alert>

      <Alert className="border-blue-500/50 bg-blue-500/10">
        <Info className="h-4 w-4 text-blue-400" />
        <AlertTitle className="text-blue-400">Info Alert</AlertTitle>
        <AlertDescription className="text-foreground">
          Custom styled alert for informational messages.
        </AlertDescription>
      </Alert>
    </div>
  ),
};

export const RealWorldExamples: Story = {
  render: () => (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Build Status</h3>
        <Alert className="border-green-500/50 bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          <AlertTitle className="text-green-400">Build Successful</AlertTitle>
          <AlertDescription className="text-foreground">
            Your application was deployed successfully to production. View deployment at{' '}
            <a href="#" className="text-primary hover:underline">app.example.com</a>
          </AlertDescription>
        </Alert>
      </div>

      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">System Maintenance</h3>
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <Info className="h-4 w-4 text-amber-400" />
          <AlertTitle className="text-amber-400">Scheduled Maintenance</AlertTitle>
          <AlertDescription className="text-foreground">
            The system will be down for maintenance on Sunday, February 15th from 2:00 AM to 4:00 AM EST.
            Please save your work before this time.
          </AlertDescription>
        </Alert>
      </div>

      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Error Notification</h3>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Payment Failed</AlertTitle>
          <AlertDescription>
            We couldn't process your payment. Please check your payment method and try again.
            If the problem persists, contact support at support@example.com.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  ),
};
