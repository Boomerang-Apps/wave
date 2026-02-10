import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './input';
import { Button } from './button';
import { Label } from './label';
import { Mail, Lock, Search, Eye, EyeOff, Calendar } from 'lucide-react';
import { useState } from 'react';

/**
 * # Input
 *
 * Text input component with consistent styling and full form support.
 * Built on native HTML input with focus states and accessibility features.
 *
 * ## Features
 * - All native input types supported
 * - Focus ring styling
 * - Disabled state
 * - Placeholder text
 * - File upload support
 * - Full accessibility
 */

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Flexible input component with support for all HTML input types and consistent styling.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url', 'search', 'date', 'time', 'file'],
      description: 'Input type',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
};

export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'Enter your email',
  },
};

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter your password',
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled input',
    disabled: true,
  },
};

export const WithValue: Story = {
  args: {
    defaultValue: 'Pre-filled value',
  },
};

export const AllTypes: Story = {
  render: () => (
    <div className="space-y-4 w-[350px] p-6 bg-background">
      <div>
        <Label className="text-sm text-muted-foreground mb-1 block">Text</Label>
        <Input type="text" placeholder="Enter text" />
      </div>
      <div>
        <Label className="text-sm text-muted-foreground mb-1 block">Email</Label>
        <Input type="email" placeholder="email@example.com" />
      </div>
      <div>
        <Label className="text-sm text-muted-foreground mb-1 block">Password</Label>
        <Input type="password" placeholder="••••••••" />
      </div>
      <div>
        <Label className="text-sm text-muted-foreground mb-1 block">Number</Label>
        <Input type="number" placeholder="42" />
      </div>
      <div>
        <Label className="text-sm text-muted-foreground mb-1 block">Tel</Label>
        <Input type="tel" placeholder="+1 (555) 000-0000" />
      </div>
      <div>
        <Label className="text-sm text-muted-foreground mb-1 block">URL</Label>
        <Input type="url" placeholder="https://example.com" />
      </div>
      <div>
        <Label className="text-sm text-muted-foreground mb-1 block">Search</Label>
        <Input type="search" placeholder="Search..." />
      </div>
      <div>
        <Label className="text-sm text-muted-foreground mb-1 block">Date</Label>
        <Input type="date" />
      </div>
    </div>
  ),
};

export const WithLabels: Story = {
  render: () => (
    <div className="space-y-4 w-[350px] p-6 bg-background">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium text-foreground">Name</Label>
        <Input id="name" placeholder="Enter your name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
        <Input id="email" type="email" placeholder="email@example.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
        <Input id="password" type="password" placeholder="••••••••" />
      </div>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div className="space-y-4 w-[350px] p-6 bg-background">
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" type="email" placeholder="Email" />
      </div>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" type="password" placeholder="Password" />
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" type="search" placeholder="Search..." />
      </div>
      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" type="date" />
      </div>
    </div>
  ),
};

export const PasswordToggle: Story = {
  render: () => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="w-[350px] p-6 bg-background">
        <Label htmlFor="password-toggle" className="text-sm font-medium text-foreground mb-2 block">
          Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="password-toggle"
            className="pl-9 pr-9"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
    );
  },
};

export const WithButton: Story = {
  render: () => (
    <div className="space-y-4 w-[400px] p-6 bg-background">
      <div className="flex gap-2">
        <Input placeholder="Enter your email" type="email" />
        <Button>Subscribe</Button>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search..." />
        </div>
        <Button variant="secondary">Search</Button>
      </div>
    </div>
  ),
};

export const FormExample: Story = {
  render: () => (
    <div className="w-[400px] p-6 bg-card border border-border rounded-xl">
      <h3 className="text-lg font-semibold text-foreground mb-1">Sign In</h3>
      <p className="text-sm text-muted-foreground mb-6">Enter your credentials to continue</p>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-email" className="text-sm font-medium text-foreground">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="login-email"
              className="pl-9"
              type="email"
              placeholder="email@example.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password" className="text-sm font-medium text-foreground">
              Password
            </Label>
            <a href="#" className="text-xs text-primary hover:underline">
              Forgot password?
            </a>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="login-password"
              className="pl-9"
              type="password"
              placeholder="••••••••"
            />
          </div>
        </div>

        <Button className="w-full">Sign In</Button>

        <div className="text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <a href="#" className="text-primary hover:underline">
            Sign up
          </a>
        </div>
      </div>
    </div>
  ),
};

export const ValidationStates: Story = {
  render: () => (
    <div className="space-y-4 w-[350px] p-6 bg-background">
      <div className="space-y-2">
        <Label htmlFor="valid" className="text-sm font-medium text-foreground">Valid Input</Label>
        <Input
          id="valid"
          defaultValue="john@example.com"
          className="border-green-500 focus-visible:ring-green-500"
        />
        <p className="text-xs text-green-400">Email is valid</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="invalid" className="text-sm font-medium text-foreground">Invalid Input</Label>
        <Input
          id="invalid"
          defaultValue="invalid-email"
          className="border-red-500 focus-visible:ring-red-500"
        />
        <p className="text-xs text-red-400">Please enter a valid email</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="warning" className="text-sm font-medium text-foreground">Warning State</Label>
        <Input
          id="warning"
          defaultValue="short"
          className="border-amber-500 focus-visible:ring-amber-500"
        />
        <p className="text-xs text-amber-400">Password should be at least 8 characters</p>
      </div>
    </div>
  ),
};

export const FileUpload: Story = {
  render: () => (
    <div className="space-y-4 w-[400px] p-6 bg-background">
      <div className="space-y-2">
        <Label htmlFor="file" className="text-sm font-medium text-foreground">
          Upload File
        </Label>
        <Input id="file" type="file" />
        <p className="text-xs text-muted-foreground">
          Accepted formats: PDF, PNG, JPG (max 5MB)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="multiple" className="text-sm font-medium text-foreground">
          Multiple Files
        </Label>
        <Input id="multiple" type="file" multiple />
        <p className="text-xs text-muted-foreground">
          You can select multiple files
        </p>
      </div>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4 w-[350px] p-6 bg-background">
      <div>
        <Label className="text-sm text-muted-foreground mb-2 block">Small (h-8)</Label>
        <Input className="h-8 text-sm" placeholder="Small input" />
      </div>
      <div>
        <Label className="text-sm text-muted-foreground mb-2 block">Default (h-9)</Label>
        <Input placeholder="Default input" />
      </div>
      <div>
        <Label className="text-sm text-muted-foreground mb-2 block">Large (h-10)</Label>
        <Input className="h-10" placeholder="Large input" />
      </div>
    </div>
  ),
};

export const SearchBar: Story = {
  render: () => (
    <div className="w-full max-w-2xl p-6 bg-background">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          className="pl-12 h-12 text-base rounded-full"
          type="search"
          placeholder="Search for anything..."
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <Button size="sm" className="rounded-full">Search</Button>
        </div>
      </div>
    </div>
  ),
};
