export interface HookHandler {
  type: 'command';
  command: string;
  timeout?: number;
}

export interface HookEntry {
  matcher?: string;
  hooks: HookHandler[];
}

export interface HooksConfig {
  PreToolUse: HookEntry[];
  PostToolUse: HookEntry[];
  Notification: HookEntry[];
  Stop: HookEntry[];
  SubagentStop: HookEntry[];
  PreCompact: HookEntry[];
}

const CAM_HOOK_MARKER = 'cam-hook';

export function generateHooksConfig(): HooksConfig {
  return {
    PreToolUse: [
      {
        matcher: '*',
        hooks: [{ type: 'command', command: 'cam-hook pre-tool-use' }],
      },
    ],
    PostToolUse: [
      {
        matcher: '*',
        hooks: [{ type: 'command', command: 'cam-hook post-tool-use' }],
      },
    ],
    Notification: [
      {
        matcher: '*',
        hooks: [{ type: 'command', command: 'cam-hook notification' }],
      },
    ],
    Stop: [
      {
        hooks: [{ type: 'command', command: 'cam-hook stop' }],
      },
    ],
    SubagentStop: [
      {
        hooks: [{ type: 'command', command: 'cam-hook subagent-stop' }],
      },
    ],
    PreCompact: [
      {
        hooks: [{ type: 'command', command: 'cam-hook pre-compact' }],
      },
    ],
  };
}

export function mergeHooks(
  existing: Record<string, unknown>,
  camHooks: HooksConfig,
): Record<string, unknown> {
  const existingHooks = (existing.hooks ?? {}) as Record<string, HookEntry[]>;
  const merged: Record<string, HookEntry[]> = {};

  for (const [hookType, entries] of Object.entries(camHooks)) {
    const existingEntries = existingHooks[hookType] ?? [];

    // Filter out any existing CAM hooks to avoid duplicates
    const nonCamEntries = existingEntries.filter(
      (entry) => !isCamHook(entry),
    );

    // Append CAM hooks at the end
    merged[hookType] = [...nonCamEntries, ...entries];
  }

  // Preserve hook types not managed by CAM (and remove legacy PostCompact)
  for (const [hookType, entries] of Object.entries(existingHooks)) {
    if (!(hookType in camHooks) && hookType !== 'PostCompact') {
      merged[hookType] = entries;
    }
  }

  return {
    ...existing,
    hooks: merged,
  };
}

export function removeCamHooks(
  settings: Record<string, unknown>,
): Record<string, unknown> {
  const hooks = (settings.hooks ?? {}) as Record<string, HookEntry[]>;
  const cleaned: Record<string, HookEntry[]> = {};

  for (const [hookType, entries] of Object.entries(hooks)) {
    const nonCamEntries = entries.filter((entry) => !isCamHook(entry));
    if (nonCamEntries.length > 0) {
      cleaned[hookType] = nonCamEntries;
    }
  }

  const result = { ...settings };
  if (Object.keys(cleaned).length > 0) {
    result.hooks = cleaned;
  } else {
    delete result.hooks;
  }

  return result;
}

export function isCamHook(entry: HookEntry): boolean {
  // Check new format: hooks array with command containing marker
  if (entry.hooks && Array.isArray(entry.hooks)) {
    return entry.hooks.some(
      (h) => h.type === 'command' && h.command.includes(CAM_HOOK_MARKER),
    );
  }
  // Legacy format fallback: direct command field
  const legacy = entry as unknown as Record<string, string>;
  if (typeof legacy['command'] === 'string') {
    return legacy['command'].includes(CAM_HOOK_MARKER);
  }
  return false;
}

export function listConfiguredCamHooks(
  settings: Record<string, unknown>,
): Array<{ hookType: string; command: string }> {
  const hooks = (settings.hooks ?? {}) as Record<string, HookEntry[]>;
  const result: Array<{ hookType: string; command: string }> = [];

  for (const [hookType, entries] of Object.entries(hooks)) {
    for (const entry of entries) {
      if (isCamHook(entry)) {
        // Extract command from hooks array
        const cmd = entry.hooks?.find(
          (h) => h.type === 'command' && h.command.includes(CAM_HOOK_MARKER),
        );
        if (cmd) {
          result.push({ hookType, command: cmd.command });
        }
      }
    }
  }

  return result;
}

export const HOOK_TYPE_DESCRIPTIONS: Record<string, string> = {
  PreToolUse: 'Before each tool call (all tools)',
  PostToolUse: 'After each tool call (all tools)',
  Notification: 'When Claude Code sends a notification',
  Stop: 'When the main agent stops',
  SubagentStop: 'When a sub-agent (teammate) stops',
  PreCompact: 'Before context compaction',
};
