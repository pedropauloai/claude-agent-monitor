import type { AgentZone, AgentAnimationState, AgentPose } from '@cam/shared';
import { TOOL_TO_ZONE_MAP, TOOL_TO_POSE_MAP } from '@cam/shared';
import type { AgentStatus } from '@cam/shared';

export function getAgentZone(
  tool: string | null | undefined,
  agentStatus: AgentStatus,
  lastEventMs: number,
  idleTimeoutMs = 30_000
): AgentZone {
  // 1. Terminal states always go to done
  if (agentStatus === 'completed' || agentStatus === 'shutdown') {
    return 'done';
  }

  // 2. If we have a recent tool, use it to determine zone
  if (tool && tool in TOOL_TO_ZONE_MAP && lastEventMs < idleTimeoutMs) {
    return TOOL_TO_ZONE_MAP[tool];
  }

  // 3. If agent has a tool but it's been a while, still show the tool zone
  //    briefly (up to 2x timeout) before going to rest
  if (tool && tool in TOOL_TO_ZONE_MAP && lastEventMs < idleTimeoutMs * 2) {
    return TOOL_TO_ZONE_MAP[tool];
  }

  // 4. If idle or no recent activity, go to rest
  if (agentStatus === 'idle' || lastEventMs > idleTimeoutMs * 2) {
    return 'rest';
  }

  // 5. Default: library zone (active agent with no specific tool)
  return 'library';
}

export function getAnimationFromStatus(
  agentStatus: AgentStatus,
  lastEventMs: number,
  idleTimeoutMs = 30_000
): AgentAnimationState {
  if (agentStatus === 'completed') return 'completed';
  if (agentStatus === 'shutdown') return 'shutdown';
  if (agentStatus === 'error') return 'error';

  // If recent activity, show working even if status hasn't updated yet
  if (lastEventMs < idleTimeoutMs) return 'working';

  if (agentStatus === 'idle') return 'idle';
  if (agentStatus === 'active' && lastEventMs > idleTimeoutMs) return 'idle';

  return 'working';
}

export function getZoneColor(zone: AgentZone): string {
  const colors: Record<AgentZone, string> = {
    library:   'from-indigo-500/20 to-indigo-600/10 border-indigo-500/30',
    workshop:  'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    terminal:  'from-amber-500/20 to-amber-600/10 border-amber-500/30',
    comms:     'from-purple-500/20 to-purple-600/10 border-purple-500/30',
    research:  'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30',
    taskboard: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
    rest:      'from-gray-500/20 to-gray-600/10 border-gray-500/30',
    done:      'from-green-500/20 to-green-600/10 border-green-500/30',
  };
  return colors[zone];
}

export function getZoneIconPixel(zone: AgentZone): string {
  const icons: Record<AgentZone, string> = {
    library:   '{}',
    workshop:  '/+',
    terminal:  '>_',
    comms:     '<<>>',
    research:  '?!',
    taskboard: '[]',
    rest:      'zZ',
    done:      '**',
  };
  return icons[zone];
}

/**
 * Generate a human-readable activity label from the last tool event.
 * Shows WHAT each agent is doing: "reading schema.sql", "editing index.ts", etc.
 */
export function generateActivityLabel(
  tool: string | null | undefined,
  input: string | null | undefined,
  agentStatus: AgentStatus,
  lastEventMs: number,
  idleTimeoutMs = 30_000
): string | null {
  // Terminal states
  if (agentStatus === 'completed') return 'completed';
  if (agentStatus === 'shutdown') return 'shutdown';

  // Idle state
  if (lastEventMs > idleTimeoutMs) {
    const secs = Math.round(lastEventMs / 1000);
    return `idle ${secs}s`;
  }

  if (!tool) return null;

  // Parse input for context
  let parsed: Record<string, unknown> | null = null;
  if (input) {
    try {
      parsed = typeof input === 'string' ? JSON.parse(input) : (input as Record<string, unknown>);
    } catch {
      // not JSON
    }
  }

  const fileName = extractFileName(parsed);

  switch (tool) {
    case 'Read':
      return fileName ? `reading ${fileName}` : 'reading file';
    case 'Glob':
      return parsed?.['pattern'] ? `searching ${shortStr(String(parsed['pattern']), 20)}` : 'searching files';
    case 'Grep':
      return parsed?.['pattern'] ? `grep "${shortStr(String(parsed['pattern']), 16)}"` : 'searching code';
    case 'Edit':
      return fileName ? `editing ${fileName}` : 'editing file';
    case 'Write':
      return fileName ? `writing ${fileName}` : 'writing file';
    case 'NotebookEdit':
      return 'editing notebook';
    case 'Bash': {
      const cmd = parsed?.['command'];
      if (typeof cmd === 'string') {
        return `$ ${shortStr(cmd.split('\n')[0], 24)}`;
      }
      return '$ running command';
    }
    case 'SendMessage': {
      const recipient = parsed?.['recipient'] ?? parsed?.['target_agent_id'];
      if (typeof recipient === 'string') {
        return `msg -> ${shortStr(recipient, 16)}`;
      }
      return 'sending message';
    }
    case 'TaskCreate':
      return 'creating task';
    case 'TaskUpdate':
      return 'updating task';
    case 'TaskList':
      return 'listing tasks';
    case 'TaskGet':
      return 'reading task';
    case 'WebSearch': {
      const query = parsed?.['query'];
      if (typeof query === 'string') {
        return `search "${shortStr(query, 18)}"`;
      }
      return 'web search';
    }
    case 'WebFetch':
      return 'fetching page';
    default:
      return `using ${tool}`;
  }
}

function extractFileName(parsed: Record<string, unknown> | null): string | null {
  if (!parsed) return null;

  // Check tool_input wrapper
  const toolInput = parsed['tool_input'] as Record<string, unknown> | undefined;
  const source = toolInput ?? parsed;

  const filePath = source['file_path'] ?? source['path'] ?? source['filePath'] ?? source['notebook_path'];
  if (typeof filePath !== 'string') return null;

  // Extract just the filename from the path
  const parts = filePath.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || filePath;
}

function shortStr(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1) + '\u2026';
}

/**
 * Mission Floor v2: Determine the agent's visual pose based on tool + status.
 * Poses are more granular than zones - they show WHAT the agent is doing visually.
 */
export function getAgentPose(
  tool: string | null | undefined,
  agentStatus: AgentStatus,
  lastEventMs: number,
  idleTimeoutMs = 30_000
): AgentPose {
  // Terminal: celebrating or idle (shutdown uses idle pose + zzZ overlay)
  if (agentStatus === 'completed') return 'celebrating';
  if (agentStatus === 'shutdown') return 'idle';

  // Idle: no recent activity
  if (lastEventMs > idleTimeoutMs) return 'idle';

  // Error: show the last tool pose but with error overlay
  if (agentStatus === 'error' && tool && tool in TOOL_TO_POSE_MAP) {
    return TOOL_TO_POSE_MAP[tool];
  }

  // Active: map tool to pose
  if (tool && tool in TOOL_TO_POSE_MAP) {
    return TOOL_TO_POSE_MAP[tool];
  }

  // Default: idle when no tool context
  return 'idle';
}

/**
 * Generate an educational/didactic description for what an agent is doing.
 * Aimed at beginners learning about software development.
 * Explains WHAT the tool does and WHY it's being used.
 */
export function generateDidacticDescription(
  tool: string | null | undefined,
  input: string | null | undefined,
  agentStatus: AgentStatus,
  lastEventMs: number,
  idleTimeoutMs = 30_000
): string | null {
  // Terminal states
  if (agentStatus === 'completed') return 'Work finished! This agent completed all its tasks';
  if (agentStatus === 'shutdown') return 'Shutting down... this agent was stopped after completing its work';

  // Idle state
  if (lastEventMs > idleTimeoutMs) {
    const secs = Math.round(lastEventMs / 1000);
    return `Resting... waiting for new instructions (${secs}s idle)`;
  }

  if (!tool) return null;

  // Parse input for context
  let parsed: Record<string, unknown> | null = null;
  if (input) {
    try {
      parsed = typeof input === 'string' ? JSON.parse(input) : (input as Record<string, unknown>);
    } catch {
      // not JSON
    }
  }

  const fileName = extractFileName(parsed);

  switch (tool) {
    case 'Read':
      return fileName
        ? `Reading file ${fileName} to understand existing code`
        : 'Reading a project file to understand its structure';
    case 'Glob': {
      const pattern = parsed?.['pattern'];
      return typeof pattern === 'string'
        ? `Searching files with pattern ${shortStr(String(pattern), 25)} - this helps find where the relevant code is`
        : 'Searching project files by name or extension';
    }
    case 'Grep': {
      const pattern = parsed?.['pattern'];
      return typeof pattern === 'string'
        ? `Searching code for '${shortStr(String(pattern), 25)}' - grep finds text occurrences within files`
        : 'Searching for text occurrences within project files';
    }
    case 'Edit':
      return fileName
        ? `Editing ${fileName} - modifying existing code with surgical precision`
        : 'Editing a file - changing specific parts of the code';
    case 'Write':
      return fileName
        ? `Creating file ${fileName} - writing new code from scratch`
        : 'Creating a new file in the project';
    case 'NotebookEdit':
      return 'Editing a Jupyter Notebook - tool used for interactive code';
    case 'Bash': {
      const cmd = parsed?.['command'];
      if (typeof cmd === 'string') {
        const shortCommand = shortStr(cmd.split('\n')[0], 30);
        return `Running in terminal: ${shortCommand} - commands that interact with the system`;
      }
      return 'Running a command in the system terminal';
    }
    case 'SendMessage': {
      const recipient = parsed?.['recipient'] ?? parsed?.['target_agent_id'];
      if (typeof recipient === 'string') {
        return `Sending message to ${shortStr(recipient, 20)} - agents communicate to coordinate work`;
      }
      return 'Communicating with another team agent';
    }
    case 'TaskCreate':
      return 'Creating a new task - breaking work into smaller manageable pieces';
    case 'TaskUpdate':
      return 'Updating task status - keeping the progress board in sync';
    case 'TaskList':
      return 'Checking the task list - seeing what is done and what remains';
    case 'TaskGet':
      return 'Reading details of a specific task';
    case 'WebSearch': {
      const query = parsed?.['query'];
      if (typeof query === 'string') {
        return `Searching the web: '${shortStr(query, 25)}' - looking for information and documentation`;
      }
      return 'Doing a web search to find relevant information';
    }
    case 'WebFetch':
      return 'Fetching a web page to extract information';
    default:
      return `Using tool ${tool} to move the work forward`;
  }
}
