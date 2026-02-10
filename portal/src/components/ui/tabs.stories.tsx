import type { Meta, StoryObj } from '@storybook/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Home, User, Settings, Bell, Mail, FileText } from 'lucide-react';

/**
 * # Tabs
 *
 * Tabbed interface component built on Radix UI Tabs primitive.
 * Organize content into switchable panels with keyboard navigation.
 *
 * ## Subcomponents
 * - **Tabs**: Root container with value management
 * - **TabsList**: Container for tab triggers
 * - **TabsTrigger**: Individual tab button
 * - **TabsContent**: Content panel for each tab
 *
 * ## Features
 * - Keyboard navigation (Arrow keys, Home, End)
 * - Automatic ARIA attributes
 * - Controlled or uncontrolled state
 * - Active tab styling
 */

const meta: Meta<typeof Tabs> = {
  title: 'Components/Tabs',
  component: Tabs,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Tabbed interface with composable subcomponents and full keyboard support.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    defaultValue: {
      control: 'text',
      description: 'Default active tab',
    },
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
      description: 'Tab list orientation',
      table: {
        defaultValue: { summary: 'horizontal' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="tab1" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        <TabsTrigger value="tab3">Tab 3</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">
        <p className="text-sm text-muted-foreground">Content for Tab 1</p>
      </TabsContent>
      <TabsContent value="tab2">
        <p className="text-sm text-muted-foreground">Content for Tab 2</p>
      </TabsContent>
      <TabsContent value="tab3">
        <p className="text-sm text-muted-foreground">Content for Tab 3</p>
      </TabsContent>
    </Tabs>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <Tabs defaultValue="home" className="w-[400px]">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="home" className="gap-2">
          <Home className="h-4 w-4" />
          Home
        </TabsTrigger>
        <TabsTrigger value="profile" className="gap-2">
          <User className="h-4 w-4" />
          Profile
        </TabsTrigger>
        <TabsTrigger value="settings" className="gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </TabsTrigger>
      </TabsList>
      <TabsContent value="home" className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Home</h3>
        <p className="text-sm text-muted-foreground">Welcome to your dashboard</p>
      </TabsContent>
      <TabsContent value="profile" className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Profile</h3>
        <p className="text-sm text-muted-foreground">Manage your profile settings</p>
      </TabsContent>
      <TabsContent value="settings" className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Settings</h3>
        <p className="text-sm text-muted-foreground">Configure your preferences</p>
      </TabsContent>
    </Tabs>
  ),
};

export const WithCards: Story = {
  render: () => (
    <Tabs defaultValue="account" className="w-[500px]">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Make changes to your account here. Click save when you're done.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" defaultValue="John Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" defaultValue="@johndoe" />
            </div>
            <Button>Save changes</Button>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="password">
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              Change your password here. After saving, you'll be logged out.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current">Current password</Label>
              <Input id="current" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new">New password</Label>
              <Input id="new" type="password" />
            </div>
            <Button>Save password</Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
};

export const FullWidth: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-[600px]">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">2,345</div>
              <p className="text-xs text-muted-foreground">+12% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">$45,231</div>
              <p className="text-xs text-muted-foreground">+8% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Active Now</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">+573</div>
              <p className="text-xs text-muted-foreground">+201 since last hour</p>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
      <TabsContent value="analytics">
        <p className="text-sm text-muted-foreground">Analytics content goes here</p>
      </TabsContent>
      <TabsContent value="reports">
        <p className="text-sm text-muted-foreground">Reports content goes here</p>
      </TabsContent>
      <TabsContent value="notifications">
        <p className="text-sm text-muted-foreground">Notifications content goes here</p>
      </TabsContent>
    </Tabs>
  ),
};

export const IconOnly: Story = {
  render: () => (
    <Tabs defaultValue="home" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="home">
          <Home className="h-4 w-4" />
        </TabsTrigger>
        <TabsTrigger value="notifications">
          <Bell className="h-4 w-4" />
        </TabsTrigger>
        <TabsTrigger value="messages">
          <Mail className="h-4 w-4" />
        </TabsTrigger>
        <TabsTrigger value="profile">
          <User className="h-4 w-4" />
        </TabsTrigger>
      </TabsList>
      <TabsContent value="home">
        <p className="text-sm text-muted-foreground">Home feed</p>
      </TabsContent>
      <TabsContent value="notifications">
        <p className="text-sm text-muted-foreground">Your notifications</p>
      </TabsContent>
      <TabsContent value="messages">
        <p className="text-sm text-muted-foreground">Your messages</p>
      </TabsContent>
      <TabsContent value="profile">
        <p className="text-sm text-muted-foreground">Your profile</p>
      </TabsContent>
    </Tabs>
  ),
};

export const Vertical: Story = {
  render: () => (
    <Tabs defaultValue="general" orientation="vertical" className="flex w-[600px] gap-4">
      <TabsList className="flex-col h-auto">
        <TabsTrigger value="general" className="w-full justify-start">
          <Settings className="h-4 w-4 mr-2" />
          General
        </TabsTrigger>
        <TabsTrigger value="notifications" className="w-full justify-start">
          <Bell className="h-4 w-4 mr-2" />
          Notifications
        </TabsTrigger>
        <TabsTrigger value="privacy" className="w-full justify-start">
          <User className="h-4 w-4 mr-2" />
          Privacy
        </TabsTrigger>
        <TabsTrigger value="billing" className="w-full justify-start">
          <FileText className="h-4 w-4 mr-2" />
          Billing
        </TabsTrigger>
      </TabsList>
      <div className="flex-1">
        <TabsContent value="general" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Manage your general account settings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">General settings content</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notifications" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Notification settings content</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="privacy" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>Control your privacy preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Privacy settings content</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="billing" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Billing Settings</CardTitle>
              <CardDescription>Manage your billing and subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Billing settings content</p>
            </CardContent>
          </Card>
        </TabsContent>
      </div>
    </Tabs>
  ),
};

export const Compact: Story = {
  render: () => (
    <Tabs defaultValue="all" className="w-[400px]">
      <TabsList className="h-8">
        <TabsTrigger value="all" className="text-xs px-2">All</TabsTrigger>
        <TabsTrigger value="active" className="text-xs px-2">Active</TabsTrigger>
        <TabsTrigger value="pending" className="text-xs px-2">Pending</TabsTrigger>
        <TabsTrigger value="archived" className="text-xs px-2">Archived</TabsTrigger>
      </TabsList>
      <TabsContent value="all">
        <p className="text-sm text-muted-foreground">All items</p>
      </TabsContent>
      <TabsContent value="active">
        <p className="text-sm text-muted-foreground">Active items</p>
      </TabsContent>
      <TabsContent value="pending">
        <p className="text-sm text-muted-foreground">Pending items</p>
      </TabsContent>
      <TabsContent value="archived">
        <p className="text-sm text-muted-foreground">Archived items</p>
      </TabsContent>
    </Tabs>
  ),
};

export const WithCounts: Story = {
  render: () => (
    <Tabs defaultValue="all" className="w-[500px]">
      <TabsList>
        <TabsTrigger value="all" className="gap-2">
          All
          <span className="ml-1 rounded bg-muted-foreground/20 px-1.5 py-0.5 text-xs">
            24
          </span>
        </TabsTrigger>
        <TabsTrigger value="active" className="gap-2">
          Active
          <span className="ml-1 rounded bg-green-500/20 px-1.5 py-0.5 text-xs text-green-400">
            12
          </span>
        </TabsTrigger>
        <TabsTrigger value="pending" className="gap-2">
          Pending
          <span className="ml-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-400">
            8
          </span>
        </TabsTrigger>
        <TabsTrigger value="closed" className="gap-2">
          Closed
          <span className="ml-1 rounded bg-muted-foreground/20 px-1.5 py-0.5 text-xs">
            4
          </span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="all">
        <p className="text-sm text-muted-foreground">Showing all 24 items</p>
      </TabsContent>
      <TabsContent value="active">
        <p className="text-sm text-muted-foreground">Showing 12 active items</p>
      </TabsContent>
      <TabsContent value="pending">
        <p className="text-sm text-muted-foreground">Showing 8 pending items</p>
      </TabsContent>
      <TabsContent value="closed">
        <p className="text-sm text-muted-foreground">Showing 4 closed items</p>
      </TabsContent>
    </Tabs>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Tabs defaultValue="tab1" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="tab1">Available</TabsTrigger>
        <TabsTrigger value="tab2" disabled>Disabled</TabsTrigger>
        <TabsTrigger value="tab3">Available</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">
        <p className="text-sm text-muted-foreground">This tab is available</p>
      </TabsContent>
      <TabsContent value="tab2">
        <p className="text-sm text-muted-foreground">This tab is disabled</p>
      </TabsContent>
      <TabsContent value="tab3">
        <p className="text-sm text-muted-foreground">This tab is available</p>
      </TabsContent>
    </Tabs>
  ),
};

export const RealWorldExample: Story = {
  render: () => (
    <div className="w-[700px] p-6 bg-card border border-border rounded-xl">
      <h2 className="text-2xl font-bold text-foreground mb-6">Project Dashboard</h2>
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">73%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  22 of 30 tasks completed
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Team Size</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">8</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active contributors
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Due Date</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">12d</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Time remaining
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <div className="font-medium text-foreground">Update documentation</div>
                <div className="text-sm text-muted-foreground">Due in 2 days</div>
              </div>
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                In Progress
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <div className="font-medium text-foreground">Fix login bug</div>
                <div className="text-sm text-muted-foreground">Due tomorrow</div>
              </div>
              <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded">
                Pending
              </span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="team">
          <p className="text-sm text-muted-foreground">Team members content</p>
        </TabsContent>

        <TabsContent value="activity">
          <p className="text-sm text-muted-foreground">Recent activity content</p>
        </TabsContent>
      </Tabs>
    </div>
  ),
};
