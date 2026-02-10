import type { Meta, StoryObj } from '@storybook/react';
import { Label } from './label';
import { Input } from './input';
// TODO: Add these components when available
// import { Checkbox } from './checkbox';
// import { RadioGroup, RadioGroupItem } from './radio-group';
// import { Switch } from './switch';

/**
 * # Label
 *
 * Accessible label component built on Radix UI Label primitive.
 * Automatically associates with form controls for accessibility.
 *
 * ## Features
 * - Automatic accessibility attributes
 * - Works with peer utilities for disabled states
 * - Supports all native label props
 * - Consistent typography sizing
 */

const meta: Meta<typeof Label> = {
  title: 'Components/Label',
  component: Label,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Form label component with built-in accessibility and peer-state styling.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    htmlFor: {
      control: 'text',
      description: 'ID of the associated form control',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Label',
  },
};

export const WithInput: Story = {
  render: () => (
    <div className="space-y-2 w-[300px]">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="email@example.com" />
    </div>
  ),
};

// TODO: Uncomment when Checkbox component is available
// export const WithCheckbox: Story = {
//   render: () => (
//     <div className="flex items-center space-x-2">
//       <Checkbox id="terms" />
//       <Label htmlFor="terms" className="cursor-pointer">
//         Accept terms and conditions
//       </Label>
//     </div>
//   ),
// };

// TODO: Uncomment when RadioGroup component is available
// export const WithRadioGroup: Story = {
//   render: () => (
//     <div className="space-y-3 w-[300px]">
//       <Label>Notification Preferences</Label>
//       <RadioGroup defaultValue="all">
//         <div className="flex items-center space-x-2">
//           <RadioGroupItem value="all" id="all" />
//           <Label htmlFor="all" className="font-normal cursor-pointer">
//             All notifications
//           </Label>
//         </div>
//         <div className="flex items-center space-x-2">
//           <RadioGroupItem value="mentions" id="mentions" />
//           <Label htmlFor="mentions" className="font-normal cursor-pointer">
//             Mentions only
//           </Label>
//         </div>
//         <div className="flex items-center space-x-2">
//           <RadioGroupItem value="none" id="none" />
//           <Label htmlFor="none" className="font-normal cursor-pointer">
//             None
//           </Label>
//         </div>
//       </RadioGroup>
//     </div>
//   ),
// };

// TODO: Uncomment when Switch component is available
// export const WithSwitch: Story = {
//   render: () => (
//     <div className="flex items-center space-x-2">
//       <Switch id="airplane-mode" />
//       <Label htmlFor="airplane-mode" className="cursor-pointer">
//         Airplane Mode
//       </Label>
//     </div>
//   ),
// };

export const Required: Story = {
  render: () => (
    <div className="space-y-2 w-[300px]">
      <Label htmlFor="username">
        Username <span className="text-destructive">*</span>
      </Label>
      <Input id="username" placeholder="johndoe" required />
    </div>
  ),
};

export const WithHelper: Story = {
  render: () => (
    <div className="space-y-2 w-[300px]">
      <Label htmlFor="password">Password</Label>
      <Input id="password" type="password" placeholder="••••••••" />
      <p className="text-xs text-muted-foreground">
        Must be at least 8 characters long
      </p>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="space-y-2 w-[300px]">
      <Label htmlFor="disabled-input" className="text-muted-foreground">
        Disabled Field
      </Label>
      <Input id="disabled-input" placeholder="Cannot edit" disabled />
    </div>
  ),
};

export const FormExample: Story = {
  render: () => (
    <div className="w-[400px] space-y-6 p-6 bg-card border border-border rounded-xl">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Profile Settings</h3>
        <p className="text-sm text-muted-foreground">Update your profile information</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">
            Full Name <span className="text-destructive">*</span>
          </Label>
          <Input id="name" placeholder="John Doe" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email-form">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input id="email-form" type="email" placeholder="john@example.com" />
          <p className="text-xs text-muted-foreground">
            We'll never share your email with anyone else.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <textarea
            id="bio"
            rows={4}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground resize-none"
            placeholder="Tell us about yourself..."
          />
          <p className="text-xs text-muted-foreground">
            Brief description for your profile. Max 200 characters.
          </p>
        </div>

        {/* TODO: Add Checkbox and Switch examples when components are available */}
      </div>
    </div>
  ),
};

export const InlineLabels: Story = {
  render: () => (
    <div className="space-y-4 w-[400px] p-6 bg-background">
      <div className="flex items-center gap-4">
        <Label htmlFor="inline-1" className="w-24 text-right">
          Name:
        </Label>
        <Input id="inline-1" placeholder="John Doe" />
      </div>

      <div className="flex items-center gap-4">
        <Label htmlFor="inline-2" className="w-24 text-right">
          Email:
        </Label>
        <Input id="inline-2" type="email" placeholder="john@example.com" />
      </div>

      <div className="flex items-center gap-4">
        <Label htmlFor="inline-3" className="w-24 text-right">
          Phone:
        </Label>
        <Input id="inline-3" type="tel" placeholder="+1 (555) 000-0000" />
      </div>
    </div>
  ),
};

export const ValidationStates: Story = {
  render: () => (
    <div className="space-y-6 w-[350px] p-6 bg-background">
      <div className="space-y-2">
        <Label htmlFor="valid" className="text-green-400">
          Valid Email
        </Label>
        <Input
          id="valid"
          defaultValue="john@example.com"
          className="border-green-500 focus-visible:ring-green-500"
        />
        <p className="text-xs text-green-400">Email is valid</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="invalid" className="text-red-400">
          Invalid Email
        </Label>
        <Input
          id="invalid"
          defaultValue="invalid-email"
          className="border-red-500 focus-visible:ring-red-500"
        />
        <p className="text-xs text-red-400">Please enter a valid email</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="warning" className="text-amber-400">
          Weak Password
        </Label>
        <Input
          id="warning"
          type="password"
          defaultValue="short"
          className="border-amber-500 focus-visible:ring-amber-500"
        />
        <p className="text-xs text-amber-400">Password should be at least 8 characters</p>
      </div>
    </div>
  ),
};

export const OptionalVsRequired: Story = {
  render: () => (
    <div className="space-y-4 w-[350px] p-6 bg-background">
      <div className="space-y-2">
        <Label htmlFor="required-1">
          Email <span className="text-destructive">*</span>
        </Label>
        <Input id="required-1" type="email" placeholder="Required field" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="optional-1">
          Phone <span className="text-muted-foreground text-xs ml-1">(optional)</span>
        </Label>
        <Input id="optional-1" type="tel" placeholder="Optional field" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="required-2">
          Password <span className="text-destructive">*</span>
        </Label>
        <Input id="required-2" type="password" placeholder="Required field" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="optional-2">
          Company <span className="text-muted-foreground text-xs ml-1">(optional)</span>
        </Label>
        <Input id="optional-2" placeholder="Optional field" />
      </div>
    </div>
  ),
};
