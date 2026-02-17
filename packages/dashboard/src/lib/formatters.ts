export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;

  if (diff < 1000) return 'just now';
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86400_000)}d ago`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export function formatElapsedTime(startIso: string, endIso?: string): string {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const totalSeconds = Math.floor((end - start) / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${String(minutes).padStart(2, '0')}m`);
  parts.push(`${String(seconds).padStart(2, '0')}s`);

  return parts.join(' ');
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

export function truncatePath(path: string, maxLength = 40): string {
  if (path.length <= maxLength) return path;
  const parts = path.split('/');
  if (parts.length <= 2) return `...${path.slice(-maxLength + 3)}`;
  return `.../${parts.slice(-2).join('/')}`;
}

export function getToolIcon(tool: string): string {
  const icons: Record<string, string> = {
    Edit: 'pencil',
    Write: 'file-plus',
    Read: 'eye',
    Bash: 'terminal',
    Grep: 'search',
    Glob: 'folder-search',
    TaskCreate: 'plus-circle',
    TaskUpdate: 'refresh-cw',
    TaskList: 'list',
    TaskGet: 'info',
    SendMessage: 'message-circle',
    NotebookEdit: 'book',
    WebFetch: 'globe',
    WebSearch: 'search',
  };
  return icons[tool] || 'circle';
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'text-cam-success',
    idle: 'text-cam-warning',
    error: 'text-cam-error',
    completed: 'text-cam-info',
    shutdown: 'text-cam-text-muted',
  };
  return colors[status] || 'text-cam-text-muted';
}

export function getStatusDotColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-cam-success',
    idle: 'bg-cam-warning',
    error: 'bg-cam-error',
    completed: 'bg-cam-info',
    shutdown: 'bg-cam-text-muted',
  };
  return colors[status] || 'bg-cam-text-muted';
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    tool_call: 'text-cam-accent',
    file_change: 'text-cam-success',
    command: 'text-amber-400',
    message: 'text-purple-400',
    lifecycle: 'text-cam-info',
    error: 'text-cam-error',
    compact: 'text-cam-text-muted',
    notification: 'text-cam-warning',
  };
  return colors[category] || 'text-cam-text-secondary';
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };
  return colors[priority] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}

export function getTaskStatusColor(status: string): string {
  const colors: Record<string, string> = {
    backlog: 'bg-gray-500/20 text-gray-400',
    planned: 'bg-blue-500/20 text-blue-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
    in_progress: 'bg-emerald-500/20 text-emerald-400',
    in_review: 'bg-purple-500/20 text-purple-400',
    completed: 'bg-green-500/20 text-green-400',
    blocked: 'bg-red-500/20 text-red-400',
    deferred: 'bg-gray-500/20 text-gray-500',
  };
  return colors[status] || 'bg-gray-500/20 text-gray-400';
}

export function generateIdenticon(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 60%)`;
}

/**
 * Extracts a short sprint label from a prdSection string.
 *
 * Examples:
 * - "Sprint 1 - Core Infrastructure" -> "S1"
 * - "Sprint 10 - Visual Polish"      -> "S10"
 * - "v1.1 - Intelligence"            -> "v1.1"
 * - null / undefined / ""            -> ""
 */
export function extractSprintLabel(prdSection: string | undefined | null): string {
  if (!prdSection) return '';

  // Match "Sprint <number>"
  const sprintMatch = prdSection.match(/^Sprint\s+(\d+)/i);
  if (sprintMatch) return `S${sprintMatch[1]}`;

  // Match version-style labels like "v1.1 - ..."
  const versionMatch = prdSection.match(/^(v[\d.]+)/i);
  if (versionMatch) return versionMatch[1];

  return '';
}
