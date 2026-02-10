/**
 * Flyout Component
 *
 * Slide-out panel with navigation, tabs, content areas, and actions.
 * Used for viewing/editing item details.
 *
 * Colors: Fill #1e1e1e, Border #2e2e2e, Hover #252525
 */

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Save,
  Trash2,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { StatusBadge } from './GridTable';
import type { ItemStatus } from './GridTable';

// ============================================================================
// Types
// ============================================================================

export interface FlyoutTab {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
}

export interface FlyoutAction {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}

export interface FlyoutField {
  id: string;
  label: string;
  value: string;
  type?: 'text' | 'password' | 'url' | 'number' | 'textarea';
  placeholder?: string;
  required?: boolean;
  description?: string;
  status?: 'valid' | 'invalid' | 'pending';
  readOnly?: boolean;
  onChange?: (value: string) => void;
  onTest?: () => Promise<boolean>;
}

export interface FlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  description?: string;
  status?: ItemStatus;
  tabs?: FlyoutTab[];
  fields?: FlyoutField[];
  actions?: FlyoutAction[];
  children?: ReactNode;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  width?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// ============================================================================
// Field Input Component
// ============================================================================

interface FieldInputProps {
  field: FlyoutField;
  onCopy?: () => void;
}

function FieldInput({ field, onCopy }: FieldInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [copied, setCopied] = useState(false);

  const handleTest = async () => {
    if (!field.onTest) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await field.onTest();
      setTestResult(result ? 'success' : 'error');
    } catch {
      setTestResult('error');
    }
    setIsTesting(false);
    setTimeout(() => setTestResult(null), 3000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(field.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  };

  const isPassword = field.type === 'password';
  const inputType = isPassword && !showPassword ? 'password' : 'text';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs font-medium text-[#a3a3a3]">
          {field.label}
          {field.required && <span className="text-[#ef4444]">*</span>}
          {field.status && (
            <span className={cn(
              "px-1.5 py-0.5 text-[10px] rounded",
              field.status === 'valid' ? "bg-[#22c55e]/10 text-[#22c55e]" :
              field.status === 'invalid' ? "bg-[#ef4444]/10 text-[#ef4444]" :
              "bg-[#f59e0b]/10 text-[#f59e0b]"
            )}>
              {field.status === 'valid' ? 'Valid' : field.status === 'invalid' ? 'Invalid' : 'Pending'}
            </span>
          )}
        </label>
      </div>

      <div className="relative flex items-center gap-2">
        {field.type === 'textarea' ? (
          <textarea
            value={field.value}
            onChange={(e) => field.onChange?.(e.target.value)}
            placeholder={field.placeholder}
            readOnly={field.readOnly}
            rows={4}
            className={cn(
              "flex-1 px-3 py-2 text-sm bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg text-[#fafafa] placeholder-[#666] focus:outline-none focus:border-[#3e3e3e] resize-none font-mono",
              field.readOnly && "opacity-60 cursor-not-allowed"
            )}
          />
        ) : (
          <input
            type={inputType}
            value={field.value}
            onChange={(e) => field.onChange?.(e.target.value)}
            placeholder={field.placeholder}
            readOnly={field.readOnly}
            className={cn(
              "flex-1 px-3 py-2 text-sm bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg text-[#fafafa] placeholder-[#666] focus:outline-none focus:border-[#3e3e3e]",
              isPassword && "font-mono tracking-wider",
              field.readOnly && "opacity-60 cursor-not-allowed"
            )}
          />
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {isPassword && (
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="p-2 text-[#666] hover:text-[#a3a3a3] hover:bg-[#2e2e2e] rounded-lg transition-colors"
              title={showPassword ? 'Hide' : 'Show'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}

          <button
            onClick={handleCopy}
            className="p-2 text-[#666] hover:text-[#a3a3a3] hover:bg-[#2e2e2e] rounded-lg transition-colors"
            title="Copy"
          >
            {copied ? <Check className="h-4 w-4 text-[#22c55e]" /> : <Copy className="h-4 w-4" />}
          </button>

          {field.onTest && (
            <button
              onClick={handleTest}
              disabled={isTesting}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg transition-colors",
                testResult === 'success' ? "bg-[#22c55e]/10 text-[#22c55e]" :
                testResult === 'error' ? "bg-[#ef4444]/10 text-[#ef4444]" :
                "bg-[#2e2e2e] text-[#a3a3a3] hover:text-[#fafafa]"
              )}
            >
              {isTesting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : testResult === 'success' ? (
                <Check className="h-3.5 w-3.5" />
              ) : testResult === 'error' ? (
                <AlertCircle className="h-3.5 w-3.5" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Test
            </button>
          )}
        </div>
      </div>

      {field.description && (
        <p className="text-xs text-[#666]">{field.description}</p>
      )}
    </div>
  );
}

// ============================================================================
// Main Flyout Component
// ============================================================================

export function Flyout({
  isOpen,
  onClose,
  title,
  icon,
  description,
  status,
  tabs,
  fields,
  actions,
  children,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  width = 'md',
  className
}: FlyoutProps) {
  const [activeTab, setActiveTab] = useState(tabs?.[0]?.id || '');

  // Reset active tab when tabs change
  useEffect(() => {
    if (tabs && tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
      // Defer state update to avoid setState in effect body
      Promise.resolve().then(() => setActiveTab(tabs[0].id));
    }
  }, [tabs, activeTab]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const widthClasses = {
    sm: 'w-[400px]',
    md: 'w-[500px]',
    lg: 'w-[600px]',
    xl: 'w-[700px]'
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Flyout Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full bg-[#1e1e1e] border-l border-[#2e2e2e] shadow-2xl z-50 flex flex-col",
          widthClasses[width],
          "animate-in slide-in-from-right duration-200",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e2e2e]">
          <div className="flex items-center gap-3">
            {/* Navigation */}
            {(hasPrevious || hasNext) && (
              <div className="flex items-center gap-1 mr-2">
                <button
                  onClick={onPrevious}
                  disabled={!hasPrevious}
                  className={cn(
                    "p-1 rounded transition-colors",
                    hasPrevious ? "text-[#666] hover:text-[#fafafa] hover:bg-[#2e2e2e]" : "text-[#444] cursor-not-allowed"
                  )}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={onNext}
                  disabled={!hasNext}
                  className={cn(
                    "p-1 rounded transition-colors",
                    hasNext ? "text-[#666] hover:text-[#fafafa] hover:bg-[#2e2e2e]" : "text-[#444] cursor-not-allowed"
                  )}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Icon & Title */}
            {icon && <span className="text-[#666]">{icon}</span>}
            <div>
              <h2 className="text-base font-semibold text-[#fafafa]">{title}</h2>
              {description && (
                <p className="text-xs text-[#666] mt-0.5">{description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {status && <StatusBadge status={status} />}
            <button
              onClick={onClose}
              className="p-1.5 text-[#666] hover:text-[#fafafa] hover:bg-[#2e2e2e] rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        {tabs && tabs.length > 1 && (
          <div className="flex items-center gap-1 px-5 py-2 border-b border-[#2e2e2e] bg-[#1a1a1a]">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                  activeTab === tab.id
                    ? "bg-[#2e2e2e] text-[#fafafa]"
                    : "text-[#666] hover:text-[#a3a3a3] hover:bg-[#252525]"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Tab Content */}
          {tabs && tabs.length > 0 ? (
            tabs.find(t => t.id === activeTab)?.content
          ) : (
            <>
              {/* Fields */}
              {fields && fields.length > 0 && (
                <div className="space-y-4">
                  {fields.map(field => (
                    <FieldInput key={field.id} field={field} />
                  ))}
                </div>
              )}

              {/* Custom Content */}
              {children}
            </>
          )}
        </div>

        {/* Actions */}
        {actions && actions.length > 0 && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#2e2e2e]">
            {actions.map(action => (
              <button
                key={action.id}
                onClick={action.onClick}
                disabled={action.disabled || action.loading}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  action.variant === 'primary'
                    ? "bg-[#fafafa] text-[#1e1e1e] hover:bg-[#e5e5e5]"
                    : action.variant === 'danger'
                    ? "bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444]/20"
                    : "bg-[#2e2e2e] text-[#a3a3a3] hover:text-[#fafafa]",
                  (action.disabled || action.loading) && "opacity-50 cursor-not-allowed"
                )}
              >
                {action.loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  action.icon
                )}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ============================================================================
// API Key Flyout (Specialized for API key management)
// ============================================================================

export interface APIKeyConfig {
  id: string;
  name: string;
  value: string;
  required: boolean;
  description: string;
  testEndpoint?: string;
  status?: 'valid' | 'invalid' | 'pending';
}

interface APIKeyFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: APIKeyConfig | null;
  onSave: (id: string, value: string) => Promise<void>;
  onTest?: (id: string, value: string) => Promise<boolean>;
  onDelete?: (id: string) => Promise<void>;
}

export function APIKeyFlyout({
  isOpen,
  onClose,
  apiKey,
  onSave,
  onTest,
  onDelete
}: APIKeyFlyoutProps) {
  const [value, setValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (apiKey) {
      setValue(apiKey.value);
    }
  }, [apiKey]);

  const handleSave = async () => {
    if (!apiKey) return;
    setIsSaving(true);
    try {
      await onSave(apiKey.id, value);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!apiKey || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(apiKey.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTest = async () => {
    if (!apiKey || !onTest) return false;
    return onTest(apiKey.id, value);
  };

  if (!apiKey) return null;

  return (
    <Flyout
      isOpen={isOpen}
      onClose={onClose}
      title={apiKey.name}
      description={apiKey.description}
      status={apiKey.status === 'valid' ? 'valid' : apiKey.status === 'invalid' ? 'invalid' : 'pending'}
      width="md"
      fields={[
        {
          id: apiKey.id,
          label: apiKey.name,
          value: value,
          type: 'password',
          required: apiKey.required,
          description: apiKey.description,
          status: apiKey.status,
          onChange: setValue,
          onTest: onTest ? handleTest : undefined
        }
      ]}
      actions={[
        ...(onDelete ? [{
          id: 'delete',
          label: 'Delete',
          icon: <Trash2 className="h-4 w-4" />,
          variant: 'danger' as const,
          onClick: handleDelete,
          loading: isDeleting
        }] : []),
        {
          id: 'save',
          label: 'Save',
          icon: <Save className="h-4 w-4" />,
          variant: 'primary' as const,
          onClick: handleSave,
          loading: isSaving
        }
      ]}
    />
  );
}

export default Flyout;
