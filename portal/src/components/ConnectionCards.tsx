/**
 * ConnectionCards Component
 *
 * Displays Local/GitHub/Supabase/Vercel connections as detailed cards
 * showing analysis status, when analyzed, and issues to fix.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen,
  Github,
  Database,
  Globe,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface ConnectionStatus {
  connected: boolean;
  status: string;
  message?: string;
  [key: string]: unknown;
}

interface Connections {
  local: ConnectionStatus & { path: string };
  github: ConnectionStatus & {
    repo?: string | null;
    remoteUrl?: string;
    currentBranch?: string;
    githubUrl?: string;
    lastCommit?: {
      hash: string;
      message: string;
      author: string;
      date: string;
    } | null;
  };
  supabase: ConnectionStatus & {
    projectId?: string | null;
    url?: string;
    dashboardUrl?: string | null;
  };
  vercel: ConnectionStatus & {
    projectId?: string | null;
    orgId?: string | null;
    dashboardUrl?: string | null;
    deployments?: Array<{
      id: string;
      url: string;
      state: string;
      createdAt: number;
      target: string;
    }> | null;
  };
}

interface ConnectionCardData {
  id: 'local' | 'github' | 'supabase' | 'vercel';
  name: string;
  icon: React.ReactNode;
  connected: boolean;
  status: string;
  subtitle: string;
  lastAnalyzed?: string;
  issues?: string[];
  externalUrl?: string | null;
  color: string;
}

interface ConnectionCardsProps {
  projectPath: string;
  layout?: 'horizontal' | 'grid';
  showIssues?: boolean;
  onConnectionsLoaded?: (connections: Connections) => void;
}

// ============================================
// Helper Functions
// ============================================

function getTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function getStatusIcon(connected: boolean, status: string) {
  if (status === 'checking') {
    return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
  }
  if (connected) {
    return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  }
  if (status === 'config_only' || status === 'config_found') {
    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  }
  return <XCircle className="h-4 w-4 text-muted-foreground" />;
}

// ============================================
// Sub-components
// ============================================

function ConnectionCard({
  card,
  expanded,
  onToggle
}: {
  card: ConnectionCardData;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "border rounded-xl overflow-hidden transition-all cursor-pointer",
        card.connected
          ? "border-green-500/30 bg-green-500/5"
          : card.status === 'config_only' || card.status === 'config_found'
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-border bg-muted/20",
        expanded && "ring-2 ring-blue-500/30"
      )}
      onClick={onToggle}
    >
      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              card.connected ? `bg-${card.color}/20` : "bg-muted"
            )}>
              {card.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{card.name}</span>
                {getStatusIcon(card.connected, card.status)}
              </div>
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                {card.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Status Info */}
        <div className="mt-3 flex items-center gap-4 text-xs">
          {card.lastAnalyzed ? (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Analyzed {getTimeAgo(card.lastAnalyzed)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Not analyzed</span>
            </div>
          )}

          {card.issues && card.issues.length > 0 && (
            <div className="flex items-center gap-1 text-amber-500">
              <AlertCircle className="h-3 w-3" />
              <span>{card.issues.length} issues</span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-border/50 p-4 bg-muted/30">
          {card.issues && card.issues.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-amber-500">Issues to fix:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {card.issues.slice(0, 5).map((issue, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                    <span>{issue}</span>
                  </li>
                ))}
                {card.issues.length > 5 && (
                  <li className="text-muted-foreground/60">
                    +{card.issues.length - 5} more issues
                  </li>
                )}
              </ul>
            </div>
          ) : card.connected ? (
            <p className="text-xs text-green-500 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              All checks passed
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {card.status === 'no_git' && "Initialize git repository to connect"}
              {card.status === 'no_remote' && "Add remote origin to connect to GitHub"}
              {card.status === 'not_found' && "Configure environment variables to connect"}
              {card.status === 'not_linked' && "Run 'vercel link' to connect"}
            </p>
          )}

          {card.externalUrl && (
            <a
              href={card.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-3 inline-flex items-center gap-1 text-xs text-blue-500 hover:underline"
            >
              Open Dashboard <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function ConnectionCards({
  projectPath,
  layout = 'horizontal',
  onConnectionsLoaded
}: ConnectionCardsProps) {
  const [connections, setConnections] = useState<Connections | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  const detectConnections = useCallback(async () => {
    if (!projectPath) return;

    setLoading(true);
    try {
      const response = await fetch('/api/connections/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath })
      });

      // Handle undefined response or failed fetch
      if (!response || !response.ok) {
        console.error('Failed to detect connections: Invalid response');
        return;
      }

      const data = await response.json();
      if (data?.success) {
        setConnections(data.connections);
        setLastRefresh(new Date().toISOString());
        onConnectionsLoaded?.(data.connections);
      }
    } catch (err) {
      console.error('Failed to detect connections:', err);
    } finally {
      setLoading(false);
    }
  }, [projectPath, onConnectionsLoaded]);

  useEffect(() => {
    detectConnections();
  }, [detectConnections]);

  if (!connections && loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span>Detecting connections...</span>
      </div>
    );
  }

  if (!connections) {
    return null;
  }

  // Build card data
  const cards: ConnectionCardData[] = [
    {
      id: 'local',
      name: 'Local',
      icon: <FolderOpen className={cn("h-5 w-5", connections.local.connected ? "text-blue-500" : "text-muted-foreground")} />,
      connected: connections.local.connected,
      status: connections.local.status,
      subtitle: connections.local.path?.split('/').pop() || 'Not connected',
      lastAnalyzed: lastRefresh || undefined,
      issues: !connections.local.connected ? ['Directory not accessible'] : undefined,
      color: 'blue-500'
    },
    {
      id: 'github',
      name: 'GitHub',
      icon: <Github className={cn("h-5 w-5", connections.github.connected ? "text-white" : "text-muted-foreground")} />,
      connected: connections.github.connected,
      status: connections.github.status,
      subtitle: connections.github.repo || 'Not connected',
      lastAnalyzed: connections.github.lastCommit?.date || undefined,
      issues: !connections.github.connected
        ? connections.github.status === 'no_git'
          ? ['No git repository initialized']
          : connections.github.status === 'no_remote'
          ? ['No remote origin configured']
          : undefined
        : undefined,
      externalUrl: connections.github.githubUrl,
      color: 'white'
    },
    {
      id: 'supabase',
      name: 'Supabase',
      icon: <Database className={cn("h-5 w-5", connections.supabase.connected ? "text-emerald-500" : "text-muted-foreground")} />,
      connected: connections.supabase.connected,
      status: connections.supabase.status,
      subtitle: connections.supabase.projectId || 'Not connected',
      lastAnalyzed: lastRefresh || undefined,
      issues: !connections.supabase.connected
        ? ['Missing SUPABASE_URL in environment', 'Missing SUPABASE_ANON_KEY in environment']
        : undefined,
      externalUrl: connections.supabase.dashboardUrl,
      color: 'emerald-500'
    },
    {
      id: 'vercel',
      name: 'Vercel',
      icon: <Globe className={cn("h-5 w-5", connections.vercel.connected ? "text-white" : "text-muted-foreground")} />,
      connected: connections.vercel.connected,
      status: connections.vercel.status,
      subtitle: connections.vercel.projectId || 'Not connected',
      lastAnalyzed: connections.vercel.deployments?.[0]?.createdAt
        ? new Date(connections.vercel.deployments[0].createdAt).toISOString()
        : undefined,
      issues: !connections.vercel.connected
        ? ['Project not linked to Vercel']
        : undefined,
      externalUrl: connections.vercel.dashboardUrl,
      color: 'white'
    }
  ];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Project Connections
        </h3>
        <button
          onClick={detectConnections}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <RefreshCw className={cn("h-4 w-4 text-muted-foreground", loading && "animate-spin")} />
        </button>
      </div>

      {/* Cards */}
      <div className={cn(
        layout === 'grid'
          ? "grid grid-cols-2 gap-3"
          : "grid grid-cols-4 gap-3"
      )}>
        {cards.map((card) => (
          <ConnectionCard
            key={card.id}
            card={card}
            expanded={expandedCard === card.id}
            onToggle={() => setExpandedCard(expandedCard === card.id ? null : card.id)}
          />
        ))}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
        <span>
          {cards.filter(c => c.connected).length}/{cards.length} connected
        </span>
        {lastRefresh && (
          <span>Last checked {getTimeAgo(lastRefresh)}</span>
        )}
      </div>
    </div>
  );
}

export default ConnectionCards;
