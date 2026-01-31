/**
 * LiveExecutionView Component
 *
 * Real-time view of agent execution with:
 * - Live output streaming
 * - Step progress indicators
 * - Pause/Resume/Stop controls
 * - Approval prompts for escalations
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  Square,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Terminal,
  ChevronDown,
  ChevronRight,
  Clock,
  MessageSquare,
  X,
  Check,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { cn } from '../lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface ExecutionStep {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'error' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  result?: unknown;
  error?: string;
}

export interface OutputLine {
  timestamp: string;
  content: string;
  level: 'info' | 'warn' | 'error' | 'success' | 'debug';
}

export interface ApprovalRequest {
  id: string;
  type: 'confirmation' | 'choice' | 'input';
  title: string;
  description: string;
  options?: { label: string; value: string }[];
  defaultValue?: string;
  risk?: 'low' | 'medium' | 'high';
}

export interface ExecutionSession {
  id: string;
  projectPath: string;
  agentType: string;
  taskDescription?: string;
  status: 'running' | 'paused' | 'completed' | 'error' | 'stopped' | 'waiting_approval';
  startedAt: string;
  completedAt?: string;
  steps: ExecutionStep[];
  currentStep?: ExecutionStep | null;
  output: OutputLine[];
  approvalPending?: ApprovalRequest | null;
  result?: unknown;
  error?: string;
}

interface LiveExecutionViewProps {
  sessionId: string;
  onClose?: () => void;
  onComplete?: (result: unknown) => void;
  className?: string;
}

// ============================================================================
// Sub-Components
// ============================================================================

function StepIndicator({ step, isActive }: { step: ExecutionStep; isActive: boolean }) {
  const statusConfig = {
    pending: { icon: Clock, color: 'text-[#666]', bg: 'bg-[#2e2e2e]' },
    running: { icon: Loader2, color: 'text-[#3b82f6]', bg: 'bg-[#3b82f6]/20', animate: true },
    completed: { icon: CheckCircle2, color: 'text-[#22c55e]', bg: 'bg-[#22c55e]/20' },
    error: { icon: AlertCircle, color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/20' },
    skipped: { icon: ChevronRight, color: 'text-[#666]', bg: 'bg-[#2e2e2e]' }
  };

  const config = statusConfig[step.status];
  const Icon = config.icon;

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg transition-all",
      isActive ? "bg-[#1e1e1e] border border-[#3b82f6]/30" : "bg-transparent"
    )}>
      <div className={cn("p-2 rounded-lg", config.bg)}>
        <Icon className={cn(
          "h-4 w-4",
          config.color,
          'animate' in config && config.animate && "animate-spin"
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium truncate",
          step.status === 'completed' ? "text-[#22c55e]" :
          step.status === 'error' ? "text-[#ef4444]" :
          step.status === 'running' ? "text-[#3b82f6]" :
          "text-[#a3a3a3]"
        )}>
          {step.name}
        </p>
        {step.description && (
          <p className="text-xs text-[#666] truncate">{step.description}</p>
        )}
      </div>
      {step.completedAt && step.startedAt && (
        <span className="text-xs text-[#666]">
          {((new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime()) / 1000).toFixed(1)}s
        </span>
      )}
    </div>
  );
}

function OutputTerminal({ lines, maxHeight = 300 }: { lines: OutputLine[]; maxHeight?: number }) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines, autoScroll]);

  const levelColors = {
    info: 'text-[#a3a3a3]',
    warn: 'text-[#f59e0b]',
    error: 'text-[#ef4444]',
    success: 'text-[#22c55e]',
    debug: 'text-[#666]'
  };

  return (
    <div className="bg-[#0a0a0a] border border-[#2e2e2e] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e1e] border-b border-[#2e2e2e]">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-[#666]" />
          <span className="text-xs font-medium text-[#a3a3a3]">Output</span>
        </div>
        <label className="flex items-center gap-2 text-xs text-[#666] cursor-pointer">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="w-3 h-3"
          />
          Auto-scroll
        </label>
      </div>
      <div
        ref={terminalRef}
        className="p-4 font-mono text-xs overflow-y-auto"
        style={{ maxHeight }}
      >
        {lines.length === 0 ? (
          <p className="text-[#666]">Waiting for output...</p>
        ) : (
          lines.map((line, i) => (
            <div key={i} className="flex gap-2 py-0.5">
              <span className="text-[#444] select-none">
                {new Date(line.timestamp).toLocaleTimeString()}
              </span>
              <span className={levelColors[line.level]}>{line.content}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ApprovalDialog({
  request,
  onRespond
}: {
  request: ApprovalRequest;
  onRespond: (approved: boolean, response?: string) => void;
}) {
  const [inputValue, setInputValue] = useState(request.defaultValue || '');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const riskColors = {
    low: 'border-[#22c55e]/30 bg-[#22c55e]/5',
    medium: 'border-[#f59e0b]/30 bg-[#f59e0b]/5',
    high: 'border-[#ef4444]/30 bg-[#ef4444]/5'
  };

  return (
    <div className={cn(
      "p-4 rounded-xl border",
      request.risk ? riskColors[request.risk] : "border-[#3b82f6]/30 bg-[#3b82f6]/5"
    )}>
      <div className="flex items-start gap-3 mb-4">
        <div className={cn(
          "p-2 rounded-lg",
          request.risk === 'high' ? "bg-[#ef4444]/20" :
          request.risk === 'medium' ? "bg-[#f59e0b]/20" :
          "bg-[#3b82f6]/20"
        )}>
          <MessageSquare className={cn(
            "h-5 w-5",
            request.risk === 'high' ? "text-[#ef4444]" :
            request.risk === 'medium' ? "text-[#f59e0b]" :
            "text-[#3b82f6]"
          )} />
        </div>
        <div>
          <h4 className="text-sm font-medium text-[#fafafa]">{request.title}</h4>
          <p className="text-xs text-[#a3a3a3] mt-1">{request.description}</p>
        </div>
      </div>

      {/* Input type: text input */}
      {request.type === 'input' && (
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter your response..."
          className="w-full px-3 py-2 bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg text-sm text-[#fafafa] placeholder-[#666] mb-4"
        />
      )}

      {/* Choice type: option buttons */}
      {request.type === 'choice' && request.options && (
        <div className="flex flex-wrap gap-2 mb-4">
          {request.options.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedOption(option.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                selectedOption === option.value
                  ? "bg-[#3b82f6] text-white"
                  : "bg-[#2e2e2e] text-[#a3a3a3] hover:bg-[#3e3e3e]"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onRespond(false)}
          className="flex items-center gap-2 px-4 py-2 bg-[#2e2e2e] text-[#a3a3a3] rounded-lg text-sm font-medium hover:bg-[#3e3e3e] transition-colors"
        >
          <X className="h-4 w-4" />
          Reject
        </button>
        <button
          onClick={() => {
            const response = request.type === 'input' ? inputValue :
                           request.type === 'choice' ? selectedOption || '' : '';
            onRespond(true, response);
          }}
          disabled={request.type === 'choice' && !selectedOption}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            (request.type !== 'choice' || selectedOption)
              ? "bg-[#22c55e] text-white hover:bg-[#16a34a]"
              : "bg-[#2e2e2e] text-[#666] cursor-not-allowed"
          )}
        >
          <Check className="h-4 w-4" />
          Approve
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function LiveExecutionView({
  sessionId,
  onClose,
  onComplete,
  className
}: LiveExecutionViewProps) {
  const [session, setSession] = useState<ExecutionSession | null>(null);
  const [connected, setConnected] = useState(false);
  const [, setError] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState(true);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Connect to SSE stream
  useEffect(() => {
    const connect = () => {
      const eventSource = new EventSource(`/api/execution/stream/${sessionId}`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setConnected(true);
        setError(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'state') {
            setSession(data.session);
          } else if (data.type === 'ping') {
            // Keep-alive, ignore
          } else {
            // Update session based on event
            setSession(prev => {
              if (!prev) return prev;

              switch (data.type) {
                case 'step_start':
                  return {
                    ...prev,
                    currentStep: data.data.step,
                    steps: [...prev.steps, { ...data.data.step, status: 'running', startedAt: data.timestamp }]
                  };
                case 'step_complete':
                  return {
                    ...prev,
                    currentStep: null,
                    steps: prev.steps.map((s, i) =>
                      i === prev.steps.length - 1
                        ? { ...s, status: 'completed', completedAt: data.timestamp, result: data.data.result }
                        : s
                    )
                  };
                case 'output':
                  return {
                    ...prev,
                    output: [...prev.output, {
                      timestamp: data.timestamp,
                      content: data.data.content,
                      level: data.data.level || 'info'
                    }]
                  };
                case 'approval_required':
                  return {
                    ...prev,
                    status: 'waiting_approval',
                    approvalPending: data.data
                  };
                case 'approval_response':
                  return {
                    ...prev,
                    status: 'running',
                    approvalPending: null
                  };
                case 'status_change':
                  return {
                    ...prev,
                    status: data.status
                  };
                case 'complete':
                  if (onComplete) onComplete(data.data.result);
                  return {
                    ...prev,
                    status: 'completed',
                    completedAt: data.timestamp,
                    result: data.data.result
                  };
                case 'error':
                  return {
                    ...prev,
                    status: 'error',
                    error: data.data.error
                  };
                default:
                  return prev;
              }
            });
          }
        } catch (e) {
          console.error('Failed to parse SSE event:', e);
        }
      };

      eventSource.onerror = () => {
        setConnected(false);
        setError('Connection lost. Reconnecting...');
        eventSource.close();
        setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      eventSourceRef.current?.close();
    };
  }, [sessionId, onComplete]);

  // Control handlers
  const handleControl = useCallback(async (action: 'pause' | 'resume' | 'stop') => {
    try {
      await fetch(`/api/execution/control/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
    } catch (e) {
      console.error('Control action failed:', e);
    }
  }, [sessionId]);

  const handleApproval = useCallback(async (approved: boolean, response?: string) => {
    try {
      await fetch(`/api/execution/approve/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, response })
      });
    } catch (e) {
      console.error('Approval failed:', e);
    }
  }, [sessionId]);

  if (!session) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <Loader2 className="h-8 w-8 text-[#3b82f6] animate-spin" />
      </div>
    );
  }

  const statusConfig = {
    running: { label: 'Running', color: 'text-[#3b82f6]', bg: 'bg-[#3b82f6]/20', icon: Zap },
    paused: { label: 'Paused', color: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/20', icon: Pause },
    completed: { label: 'Completed', color: 'text-[#22c55e]', bg: 'bg-[#22c55e]/20', icon: CheckCircle2 },
    error: { label: 'Error', color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/20', icon: AlertCircle },
    stopped: { label: 'Stopped', color: 'text-[#666]', bg: 'bg-[#2e2e2e]', icon: Square },
    waiting_approval: { label: 'Waiting for Approval', color: 'text-[#a855f7]', bg: 'bg-[#a855f7]/20', icon: MessageSquare }
  };

  const status = statusConfig[session.status];
  const StatusIcon = status.icon;

  return (
    <div className={cn("bg-[#0a0a0a] border border-[#2e2e2e] rounded-2xl overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#1e1e1e] border-b border-[#2e2e2e]">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", status.bg)}>
            <StatusIcon className={cn("h-5 w-5", status.color, session.status === 'running' && "animate-pulse")} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-[#fafafa]">
              {session.agentType} Agent
            </h3>
            <p className="text-xs text-[#666]">
              {status.label}
              {!connected && ' (Reconnecting...)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Control Buttons */}
          {session.status === 'running' && (
            <>
              <button
                onClick={() => handleControl('pause')}
                className="p-2 text-[#f59e0b] hover:bg-[#f59e0b]/10 rounded-lg transition-colors"
                title="Pause"
              >
                <Pause className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleControl('stop')}
                className="p-2 text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg transition-colors"
                title="Stop"
              >
                <Square className="h-4 w-4" />
              </button>
            </>
          )}
          {session.status === 'paused' && (
            <>
              <button
                onClick={() => handleControl('resume')}
                className="p-2 text-[#22c55e] hover:bg-[#22c55e]/10 rounded-lg transition-colors"
                title="Resume"
              >
                <Play className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleControl('stop')}
                className="p-2 text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg transition-colors"
                title="Stop"
              >
                <Square className="h-4 w-4" />
              </button>
            </>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-[#666] hover:text-[#fafafa] hover:bg-[#2e2e2e] rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Task Description */}
        {session.taskDescription && (
          <div className="p-3 bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg">
            <p className="text-xs text-[#666] mb-1">Task</p>
            <p className="text-sm text-[#fafafa]">{session.taskDescription}</p>
          </div>
        )}

        {/* Approval Dialog */}
        {session.approvalPending && (
          <ApprovalDialog
            request={session.approvalPending}
            onRespond={handleApproval}
          />
        )}

        {/* Steps Progress */}
        {session.steps.length > 0 && (
          <div>
            <button
              onClick={() => setShowSteps(!showSteps)}
              className="flex items-center gap-2 text-sm font-medium text-[#a3a3a3] hover:text-[#fafafa] mb-2"
            >
              {showSteps ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Steps ({session.steps.filter(s => s.status === 'completed').length}/{session.steps.length})
            </button>
            {showSteps && (
              <div className="space-y-1">
                {session.steps.map((step, i) => (
                  <StepIndicator
                    key={step.id || i}
                    step={step}
                    isActive={session.currentStep?.id === step.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Output Terminal */}
        <OutputTerminal lines={session.output} maxHeight={250} />

        {/* Error Display */}
        {session.error && (
          <div className="flex items-start gap-3 p-4 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-xl">
            <AlertTriangle className="h-5 w-5 text-[#ef4444] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[#ef4444]">Execution Error</p>
              <p className="text-xs text-[#ef4444]/80 mt-1">{session.error}</p>
            </div>
          </div>
        )}

        {/* Completion Status */}
        {session.status === 'completed' && (
          <div className="flex items-center gap-3 p-4 bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-xl">
            <CheckCircle2 className="h-5 w-5 text-[#22c55e]" />
            <div>
              <p className="text-sm font-medium text-[#22c55e]">Execution Complete</p>
              <p className="text-xs text-[#22c55e]/80">
                Finished in {session.completedAt && session.startedAt
                  ? ((new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 1000).toFixed(1)
                  : '?'}s
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer with timing info */}
      <div className="px-4 py-3 bg-[#1e1e1e] border-t border-[#2e2e2e] text-xs text-[#666]">
        <div className="flex items-center justify-between">
          <span>Started: {new Date(session.startedAt).toLocaleTimeString()}</span>
          <span>Session: {session.id.slice(0, 12)}...</span>
        </div>
      </div>
    </div>
  );
}

export default LiveExecutionView;
