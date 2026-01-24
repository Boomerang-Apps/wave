/**
 * MockupDesignTab Component (Launch Sequence)
 *
 * Phase 2, Step 2.5: Mockup Tab UI Component
 *
 * Provides the UI for Step 0 of the launch sequence - validating HTML mockups.
 * Users can validate their design_mockups folder and lock mockups when ready.
 */

import React, { useState, useCallback } from 'react';

// ============================================
// Types
// ============================================

export interface MockupCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: Record<string, unknown>;
}

export interface MockupScreen {
  path?: string;
  name: string;
  title: string;
  summary: string;
}

export interface ValidationResult {
  status: 'ready' | 'blocked';
  checks: MockupCheck[];
  screens: MockupScreen[];
  timestamp?: string;
  persistError?: string;
}

export interface MockupDesignTabProps {
  projectPath: string;
  projectId: string;
  validationStatus: 'idle' | 'ready' | 'blocked';
  onValidationComplete: (status: 'ready' | 'blocked') => void;
}

// ============================================
// Status Indicator Component
// ============================================

function StatusIndicator({ status }: { status: 'idle' | 'ready' | 'blocked' | 'validating' }) {
  const colorClass = {
    idle: 'bg-muted-foreground',
    validating: 'bg-yellow-500',
    ready: 'bg-green-500/100',
    blocked: 'bg-red-500/100'
  }[status];

  return (
    <div
      data-testid="status-indicator"
      className={`w-3 h-3 rounded-full ${colorClass}`}
    />
  );
}

// ============================================
// Loading Spinner Component
// ============================================

function LoadingSpinner() {
  return (
    <div data-testid="loading-spinner" className="animate-spin h-4 w-4 border-2 border-border border-t-blue-600 rounded-full" />
  );
}

// ============================================
// Check Icon Components
// ============================================

function CheckPassIcon() {
  return (
    <svg data-testid="check-pass-icon" className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CheckFailIcon() {
  return (
    <svg data-testid="check-fail-icon" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CheckWarnIcon() {
  return (
    <svg data-testid="check-warn-icon" className="h-4 w-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

// ============================================
// Main Component
// ============================================

export function MockupDesignTab({
  projectPath,
  projectId,
  validationStatus: initialStatus,
  onValidationComplete
}: MockupDesignTabProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<'idle' | 'ready' | 'blocked'>(initialStatus);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Extract project name from path
  const projectName = projectPath.split('/').pop() || projectPath;

  const handleValidate = useCallback(async () => {
    setIsValidating(true);
    setError(null);

    try {
      const response = await fetch('/api/validate-mockups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectPath,
          projectId
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Server error');
      }

      const data: ValidationResult = await response.json();
      setValidationResult(data);
      setCurrentStatus(data.status);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsValidating(false);
    }
  }, [projectPath, projectId]);

  const handleLockMockups = useCallback(() => {
    onValidationComplete('ready');
  }, [onValidationComplete]);

  const displayStatus = isValidating ? 'validating' : currentStatus;

  return (
    <div className="p-6 space-y-6">
      {/* Header with Status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Mockup Design</h2>
          <p className="text-sm text-muted-foreground">
            Step 0: Validate HTML mockups in <span className="font-mono">{projectName}</span>
          </p>
        </div>
        <StatusIndicator status={displayStatus} />
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-sm text-blue-400">
          Before launching the WAVE agent system, you must validate your HTML mockups.
          Place your design files in the <code className="bg-blue-100 px-1 rounded">design_mockups</code> folder.
        </p>
      </div>

      {/* Validate Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleValidate}
          disabled={isValidating}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isValidating && <LoadingSpinner />}
          Validate Mockups
        </button>
      </div>

      {/* Progress Bar (shown during validation) */}
      {isValidating && (
        <div className="w-full bg-muted rounded-full h-2">
          <div
            role="progressbar"
            className="bg-primary h-2 rounded-full animate-pulse"
            style={{ width: '60%' }}
          />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-sm text-red-400">
            Error: {error}
          </p>
        </div>
      )}

      {/* Validation Results */}
      {validationResult && !error && (
        <div className="space-y-4">
          {/* Checks List */}
          <div className="border rounded-lg divide-y">
            <div className="px-4 py-2 bg-muted font-medium">
              Validation Checks
            </div>
            {validationResult.checks.map((check, index) => (
              <div key={index} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {check.status === 'pass' && <CheckPassIcon />}
                  {check.status === 'fail' && <CheckFailIcon />}
                  {check.status === 'warn' && <CheckWarnIcon />}
                  <span>{check.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">{check.message}</span>
              </div>
            ))}
          </div>

          {/* Screens List */}
          {validationResult.screens.length > 0 && (
            <div className="border rounded-lg divide-y">
              <div className="px-4 py-2 bg-muted font-medium">
                Detected Screens
              </div>
              {validationResult.screens.map((screen, index) => (
                <div key={index} className="px-4 py-3">
                  <div className="font-medium">{screen.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {screen.title} - {screen.summary}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Lock Mockups Button (only when ready) */}
          {currentStatus === 'ready' && (
            <button
              onClick={handleLockMockups}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
            >
              Lock Mockups
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default MockupDesignTab;
