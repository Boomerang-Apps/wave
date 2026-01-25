/**
 * MockupDesignTab Component (Launch Sequence)
 *
 * Step 0: Validate HTML mockups before any development
 * Uses standardized TabLayout components for consistent UI
 */

import { useState, useCallback } from 'react';
import { Palette, FileCode, Layout, CheckCircle2, XCircle, AlertTriangle, Lock, Database } from 'lucide-react';
import { InfoBox, KPICards, ActionBar, ResultSummary, ExpandableCard, TabContainer } from './TabLayout';

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
  validationStatus: 'idle' | 'validating' | 'ready' | 'blocked';
  onValidationComplete: (status: 'ready' | 'blocked') => void;
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
  const [currentStatus, setCurrentStatus] = useState<'idle' | 'validating' | 'ready' | 'blocked'>(initialStatus);
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

  // Calculate KPIs
  const passedChecks = validationResult?.checks.filter(c => c.status === 'pass').length || 0;
  const totalChecks = validationResult?.checks.length || 0;
  const screenCount = validationResult?.screens.length || 0;

  // Format timestamp
  const formatTimestamp = (ts?: string) => {
    if (!ts) return undefined;
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  };

  return (
    <TabContainer>
      {/* 1. INFO BOX */}
      <InfoBox
        title="Step 0: Mockup Design Validation"
        description={`Validate HTML mockups in the design_mockups folder before development begins. This ensures your visual designs are locked and ready for the agent system. Project: ${projectName}`}
        icon={<Palette className="h-4 w-4 text-blue-500" />}
      />

      {/* 2. KPI CARDS */}
      <KPICards
        items={[
          {
            label: 'Screens',
            value: screenCount,
            status: screenCount > 0 ? 'success' : 'neutral',
            icon: <Layout className="h-4 w-4" />
          },
          {
            label: 'Checks Passed',
            value: `${passedChecks}/${totalChecks}`,
            status: passedChecks === totalChecks && totalChecks > 0 ? 'success' : totalChecks > 0 ? 'warning' : 'neutral',
            icon: <CheckCircle2 className="h-4 w-4" />
          },
          {
            label: 'Status',
            value: currentStatus === 'ready' ? 'Ready' : currentStatus === 'blocked' ? 'Blocked' : 'Pending',
            status: currentStatus === 'ready' ? 'success' : currentStatus === 'blocked' ? 'error' : 'neutral',
          },
        ]}
      />

      {/* 3. ACTION BAR */}
      <ActionBar
        category="MOCKUP"
        title="Design Validation"
        description={`HTML mockups for ${projectName}`}
        statusBadge={validationResult ? {
          label: formatTimestamp(validationResult.timestamp) || 'Validated',
          icon: <Database className="h-3 w-3" />,
          variant: currentStatus === 'ready' ? 'success' : 'warning'
        } : undefined}
        primaryAction={{
          label: currentStatus === 'ready' ? 'Re-Validate' : 'Validate Mockups',
          onClick: handleValidate,
          loading: isValidating,
          icon: <FileCode className="h-4 w-4" />
        }}
        secondaryAction={currentStatus === 'ready' && !error ? {
          label: 'Lock & Continue',
          onClick: handleLockMockups,
          icon: <Lock className="h-4 w-4" />
        } : undefined}
      />

      {/* 4. RESULT SUMMARY */}
      {(validationResult || error) && (
        <ResultSummary
          status={error ? 'fail' : currentStatus === 'ready' ? 'pass' : currentStatus === 'blocked' ? 'fail' : 'pending'}
          message={error || (currentStatus === 'ready' ? 'All mockups validated successfully' : 'Some checks failed - review details below')}
          timestamp={formatTimestamp(validationResult?.timestamp)}
        />
      )}

      {/* 5. EXPANDABLE DETAIL CARDS */}
      {validationResult && !error && (
        <>
          {/* Validation Checks */}
          <ExpandableCard
            title="Validation Checks"
            subtitle={`${passedChecks} of ${totalChecks} checks passed`}
            icon={<CheckCircle2 className="h-4 w-4" />}
            status={passedChecks === totalChecks ? 'pass' : 'warn'}
            defaultExpanded={passedChecks < totalChecks}
          >
            <div className="space-y-2">
              {validationResult.checks.map((check, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    {check.status === 'pass' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {check.status === 'fail' && <XCircle className="h-4 w-4 text-red-500" />}
                    {check.status === 'warn' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                    <span className="text-sm">{check.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{check.message}</span>
                </div>
              ))}
            </div>
          </ExpandableCard>

          {/* Detected Screens */}
          {screenCount > 0 && (
            <ExpandableCard
              title="Detected Screens"
              subtitle={`${screenCount} HTML mockup${screenCount !== 1 ? 's' : ''} found`}
              icon={<Layout className="h-4 w-4" />}
              status="pass"
              defaultExpanded={false}
            >
              <div className="space-y-2">
                {validationResult.screens.map((screen, index) => (
                  <div key={index} className="py-2 border-b border-border last:border-0">
                    <div className="font-medium text-sm">{screen.name}</div>
                    <div className="text-xs text-muted-foreground">{screen.title} - {screen.summary}</div>
                  </div>
                ))}
              </div>
            </ExpandableCard>
          )}
        </>
      )}
    </TabContainer>
  );
}

export default MockupDesignTab;
