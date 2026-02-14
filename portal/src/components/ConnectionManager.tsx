import { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen,
  Github,
  Database,
  Globe,
  Loader2,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

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

interface GitHubDetailedStatus {
  currentBranch?: string;
  lastCommit?: {
    hash?: string;
    message?: string;
  } | null;
}

interface SupabaseDetailedStatus {
  connectionTest?: {
    success: boolean;
    message?: string;
  };
}

interface VercelDeployment {
  id: string;
  url: string;
  state: string;
  target?: string;
}

interface VercelDetailedStatus {
  deployments?: VercelDeployment[] | null;
}

interface DetailedStatus {
  github?: GitHubDetailedStatus;
  supabase?: SupabaseDetailedStatus;
  vercel?: VercelDetailedStatus;
}

interface ConnectionManagerProps {
  projectPath: string;
  onConnectionsChange?: (connections: Connections) => void;
  compact?: boolean;
}

const getStatusBadge = (status: string, connected: boolean) => {
  if (status === 'checking') {
    return <Badge variant="secondary">Checking...</Badge>;
  }
  if (connected) {
    return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Connected</Badge>;
  }
  if (status === 'config_only' || status === 'config_found') {
    return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">Config Found</Badge>;
  }
  return <Badge variant="outline">Not Connected</Badge>;
};

export function ConnectionManager({ projectPath, onConnectionsChange, compact = false }: ConnectionManagerProps) {
  const [connections, setConnections] = useState<Connections | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detailedStatus, setDetailedStatus] = useState<DetailedStatus>({});

  const detectConnections = useCallback(async () => {
    if (!projectPath) return;

    setLoading(true);
    try {
      const response = await fetch('/api/connections/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath })
      });

      const data = await response.json();
      if (data.success) {
        setConnections(data.connections);
        onConnectionsChange?.(data.connections);
      }
    } catch (err) {
      console.error('Failed to detect connections:', err);
    } finally {
      setLoading(false);
    }
  }, [projectPath, onConnectionsChange]);

  const fetchDetailedStatus = useCallback(async (service: 'github' | 'supabase' | 'vercel') => {
    if (!projectPath) return;

    try {
      const response = await fetch(`/api/connections/${service}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath })
      });

      const data = await response.json();
      setDetailedStatus(prev => ({ ...prev, [service]: data }));
    } catch (err) {
      console.error(`Failed to get ${service} status:`, err);
    }
  }, [projectPath]);

  useEffect(() => {
    detectConnections();
  }, [detectConnections]);

  const toggleExpand = (service: string) => {
    if (expanded === service) {
      setExpanded(null);
    } else {
      setExpanded(service);
      if (service !== 'local') {
        fetchDetailedStatus(service as 'github' | 'supabase' | 'vercel');
      }
    }
  };

  if (!connections) {
    return (
      <div className="flex items-center justify-center gap-2 p-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Detecting connections...</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center justify-center gap-4 p-3 bg-muted/30 rounded-xl">
        <div className="flex items-center gap-2">
          <FolderOpen className={`h-4 w-4 ${connections.local.connected ? 'text-green-500' : 'text-muted-foreground'}`} />
          <span className="text-sm">Local</span>
          <span className={`w-2 h-2 rounded-full ${connections.local.connected ? 'bg-green-500' : 'bg-muted-foreground'}`} />
        </div>
        <div className="flex items-center gap-2">
          <Github className={`h-4 w-4 ${connections.github.connected ? 'text-green-500' : 'text-muted-foreground'}`} />
          <span className="text-sm">GitHub</span>
          <span className={`w-2 h-2 rounded-full ${connections.github.connected ? 'bg-green-500' : 'bg-muted-foreground'}`} />
        </div>
        <div className="flex items-center gap-2">
          <Database className={`h-4 w-4 ${connections.supabase.connected ? 'text-green-500' : 'text-muted-foreground'}`} />
          <span className="text-sm">Supabase</span>
          <span className={`w-2 h-2 rounded-full ${connections.supabase.connected ? 'bg-green-500' : 'bg-muted-foreground'}`} />
        </div>
        <div className="flex items-center gap-2">
          <Globe className={`h-4 w-4 ${connections.vercel.connected ? 'text-green-500' : 'text-muted-foreground'}`} />
          <span className="text-sm">Vercel</span>
          <span className={`w-2 h-2 rounded-full ${connections.vercel.connected ? 'bg-green-500' : 'bg-muted-foreground'}`} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={detectConnections}
          disabled={loading}
          className="ml-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Project Connections
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={detectConnections}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Local Connection */}
      <div className="border rounded-lg overflow-hidden">
        <div
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
          onClick={() => toggleExpand('local')}
        >
          <div className="flex items-center gap-3">
            <FolderOpen className="h-5 w-5 text-blue-500" />
            <div>
              <div className="font-medium">Local Directory</div>
              <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                {connections.local.path}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(connections.local.status, connections.local.connected)}
            {expanded === 'local' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
        {expanded === 'local' && (
          <div className="border-t p-3 bg-muted/30">
            <div className="text-sm space-y-1">
              <div><strong>Path:</strong> {connections.local.path}</div>
              <div><strong>Status:</strong> {connections.local.connected ? 'Directory exists' : 'Directory not found'}</div>
            </div>
          </div>
        )}
      </div>

      {/* GitHub Connection */}
      <div className="border rounded-lg overflow-hidden">
        <div
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
          onClick={() => toggleExpand('github')}
        >
          <div className="flex items-center gap-3">
            <Github className="h-5 w-5" />
            <div>
              <div className="font-medium">GitHub</div>
              <div className="text-sm text-muted-foreground">
                {connections.github.connected ? connections.github.repo : 'Not connected'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(connections.github.status, connections.github.connected)}
            {expanded === 'github' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
        {expanded === 'github' && (
          <div className="border-t p-3 bg-muted/30">
            {connections.github.connected ? (
              <div className="text-sm space-y-2">
                <div><strong>Repository:</strong> {connections.github.repo}</div>
                {detailedStatus.github?.currentBranch && (
                  <div><strong>Branch:</strong> {detailedStatus.github.currentBranch}</div>
                )}
                {detailedStatus.github?.lastCommit && (
                  <div>
                    <strong>Last Commit:</strong>{' '}
                    <span className="font-mono text-xs">{detailedStatus.github.lastCommit.hash?.substring(0, 7)}</span>
                    {' - '}{detailedStatus.github.lastCommit.message}
                  </div>
                )}
                {connections.github.githubUrl && (
                  <a
                    href={connections.github.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-500 hover:underline"
                  >
                    Open in GitHub <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {connections.github.status === 'no_git' && (
                  <p>No git repository found. Initialize with <code className="bg-muted px-1 rounded">git init</code></p>
                )}
                {connections.github.status === 'no_remote' && (
                  <p>No remote origin configured. Add with <code className="bg-muted px-1 rounded">git remote add origin &lt;url&gt;</code></p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Supabase Connection */}
      <div className="border rounded-lg overflow-hidden">
        <div
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
          onClick={() => toggleExpand('supabase')}
        >
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-emerald-500" />
            <div>
              <div className="font-medium">Supabase</div>
              <div className="text-sm text-muted-foreground">
                {connections.supabase.connected ? connections.supabase.projectId : 'Not connected'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(connections.supabase.status, connections.supabase.connected)}
            {expanded === 'supabase' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
        {expanded === 'supabase' && (
          <div className="border-t p-3 bg-muted/30">
            {connections.supabase.connected ? (
              <div className="text-sm space-y-2">
                <div><strong>Project ID:</strong> {connections.supabase.projectId}</div>
                {detailedStatus.supabase?.connectionTest && (
                  <div>
                    <strong>Connection Test:</strong>{' '}
                    {detailedStatus.supabase.connectionTest.success ? (
                      <span className="text-green-500">Successful</span>
                    ) : (
                      <span className="text-yellow-500">{detailedStatus.supabase.connectionTest.message}</span>
                    )}
                  </div>
                )}
                {connections.supabase.dashboardUrl && (
                  <a
                    href={connections.supabase.dashboardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-500 hover:underline"
                  >
                    Open Dashboard <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                <p>No Supabase configuration found. Add to your <code className="bg-muted px-1 rounded">.env</code> file:</p>
                <pre className="mt-2 p-2 bg-muted rounded text-xs">
                  SUPABASE_URL=https://your-project.supabase.co{'\n'}
                  SUPABASE_ANON_KEY=your-anon-key
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Vercel Connection */}
      <div className="border rounded-lg overflow-hidden">
        <div
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
          onClick={() => toggleExpand('vercel')}
        >
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5" />
            <div>
              <div className="font-medium">Vercel</div>
              <div className="text-sm text-muted-foreground">
                {connections.vercel.connected
                  ? connections.vercel.projectId || 'Linked'
                  : 'Not connected'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(connections.vercel.status, connections.vercel.connected)}
            {expanded === 'vercel' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
        {expanded === 'vercel' && (
          <div className="border-t p-3 bg-muted/30">
            {connections.vercel.connected ? (
              <div className="text-sm space-y-2">
                {connections.vercel.projectId && (
                  <div><strong>Project ID:</strong> {connections.vercel.projectId}</div>
                )}
                {detailedStatus.vercel?.deployments && detailedStatus.vercel.deployments.length > 0 && (
                  <div>
                    <strong>Recent Deployments:</strong>
                    <ul className="mt-1 space-y-1">
                      {detailedStatus.vercel.deployments.slice(0, 3).map((d: VercelDeployment) => (
                        <li key={d.id} className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            d.state === 'READY' ? 'bg-green-500' :
                            d.state === 'ERROR' ? 'bg-red-500' : 'bg-yellow-500'
                          }`} />
                          <a
                            href={`https://${d.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline truncate max-w-[200px]"
                          >
                            {d.url}
                          </a>
                          <Badge variant="outline" className="text-xs">
                            {d.target || 'preview'}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {connections.vercel.dashboardUrl && (
                  <a
                    href={connections.vercel.dashboardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-500 hover:underline"
                  >
                    Open Dashboard <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                <p>No Vercel configuration found. Link with:</p>
                <pre className="mt-2 p-2 bg-muted rounded text-xs">
                  npx vercel link
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Connection Summary */}
      <div className="mt-4 p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Connected Services:</span>
          <span className="font-medium">
            {[
              connections.local.connected,
              connections.github.connected,
              connections.supabase.connected,
              connections.vercel.connected
            ].filter(Boolean).length} / 4
          </span>
        </div>
      </div>
    </div>
  );
}

export default ConnectionManager;
