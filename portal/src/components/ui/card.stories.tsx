import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
import { Button } from './button';
import { CheckCircle2, AlertCircle, Clock, TrendingUp, Users, Activity } from 'lucide-react';

/**
 * # Card
 *
 * Flexible container component for grouping related content.
 * Built with composable subcomponents for maximum flexibility.
 *
 * ## Subcomponents
 * - **Card**: Main container with rounded corners and shadow
 * - **CardHeader**: Header section with padding
 * - **CardTitle**: Styled title heading
 * - **CardDescription**: Muted description text
 * - **CardContent**: Main content area
 * - **CardFooter**: Footer section with flex layout
 */

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Versatile card container with composable subcomponents for headers, content, and footers.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground">
          This is the main content area of the card. You can put any content here.
        </p>
      </CardContent>
    </Card>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Create Project</CardTitle>
        <CardDescription>Deploy your new project in one-click.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Select a framework and start building your application.
        </p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button>Deploy</Button>
      </CardFooter>
    </Card>
  ),
};

export const Simple: Story = {
  render: () => (
    <Card className="w-[350px] p-6">
      <h3 className="font-semibold text-foreground mb-2">Simple Card</h3>
      <p className="text-sm text-muted-foreground">
        A card without using the subcomponents. Just add padding and content directly.
      </p>
    </Card>
  ),
};

export const StatCards: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-background">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">$45,231.89</div>
          <p className="text-xs text-muted-foreground">+20.1% from last month</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">+2,350</div>
          <p className="text-xs text-muted-foreground">+180.1% from last month</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Now</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">+573</div>
          <p className="text-xs text-muted-foreground">+201 since last hour</p>
        </CardContent>
      </Card>
    </div>
  ),
};

export const StatusCards: Story = {
  render: () => (
    <div className="grid grid-cols-1 gap-4 p-6 bg-background max-w-md">
      <Card className="border-green-500/50 bg-green-500/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            <CardTitle className="text-green-400">Success</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground">
            Your deployment was successful. All systems are operational.
          </p>
        </CardContent>
      </Card>

      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-400" />
            <CardTitle className="text-amber-400">Pending</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground">
            Your build is in progress. This may take a few minutes.
          </p>
        </CardContent>
      </Card>

      <Card className="border-red-500/50 bg-red-500/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <CardTitle className="text-red-400">Error</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground">
            Build failed. Please check your configuration and try again.
          </p>
        </CardContent>
      </Card>
    </div>
  ),
};

export const InteractiveCard: Story = {
  render: () => (
    <Card className="w-[350px] hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader>
        <CardTitle>Interactive Card</CardTitle>
        <CardDescription>Hover to see the effect</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This card has hover effects and can be made clickable for navigation or actions.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="ghost" className="w-full">View Details →</Button>
      </CardFooter>
    </Card>
  ),
};

export const FormCard: Story = {
  render: () => (
    <Card className="w-[400px]">
      <CardHeader>
        <CardTitle>Account Settings</CardTitle>
        <CardDescription>Make changes to your account here.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Name</label>
          <input
            type="text"
            placeholder="Enter your name"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Bio</label>
          <textarea
            placeholder="Tell us about yourself"
            rows={3}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground resize-none"
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button>Save Changes</Button>
      </CardFooter>
    </Card>
  ),
};

export const ListCard: Story = {
  render: () => (
    <Card className="w-[400px]">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Your latest actions and updates</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[
            { action: 'Deployed to production', time: '2 minutes ago', status: 'success' },
            { action: 'Updated configuration', time: '1 hour ago', status: 'info' },
            { action: 'Build completed', time: '3 hours ago', status: 'success' },
            { action: 'Merge request opened', time: '5 hours ago', status: 'info' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${item.status === 'success' ? 'bg-green-400' : 'bg-blue-400'}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{item.action}</p>
                <p className="text-xs text-muted-foreground">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="ghost" className="w-full">View All Activity</Button>
      </CardFooter>
    </Card>
  ),
};

export const GridLayout: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-background max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>24 active projects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">24</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>12 active members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">12</div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Project Overview</CardTitle>
          <CardDescription>Summary of all your projects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-400">18</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-400">4</div>
              <div className="text-xs text-muted-foreground">In Progress</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">2</div>
              <div className="text-xs text-muted-foreground">Planned</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  ),
};

export const CustomStyling: Story = {
  render: () => (
    <div className="grid grid-cols-1 gap-4 p-6 bg-background max-w-md">
      <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/50">
        <CardHeader>
          <CardTitle>Gradient Card</CardTitle>
          <CardDescription>Custom gradient background</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground">
            Cards can be customized with any Tailwind classes.
          </p>
        </CardContent>
      </Card>

      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle>Emphasized Border</CardTitle>
          <CardDescription>Thicker border for emphasis</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground">
            Use border utilities to create visual hierarchy.
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-2xl">
        <CardHeader>
          <CardTitle>Enhanced Shadow</CardTitle>
          <CardDescription>Larger shadow for depth</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground">
            Shadow utilities create elevation and depth.
          </p>
        </CardContent>
      </Card>
    </div>
  ),
};
