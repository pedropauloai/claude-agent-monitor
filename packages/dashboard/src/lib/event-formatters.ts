/**
 * Event Formatting Utilities
 *
 * Human-readable formatting for Activity Feed events.
 * Transforms raw JSON input/output into summaries that help
 * beginner developers understand what each tool is doing.
 */

/**
 * Format a tool name for display.
 *
 * - Standard tools (Edit, Write, Read, etc.) stay as-is
 * - MCP tools like "mcp__playwright__browser_take_screenshot"
 *   become "playwright: take_screenshot"
 * - Double underscores are cleaned up
 */
export function formatToolName(tool: string): string {
  if (!tool) return '';

  // Standard tools - keep as-is
  const standardTools = new Set([
    'Edit', 'Write', 'Read', 'Bash', 'Grep', 'Glob',
    'TaskCreate', 'TaskUpdate', 'TaskList', 'TaskGet',
    'SendMessage', 'WebFetch', 'WebSearch', 'NotebookEdit',
    'Task',
  ]);
  if (standardTools.has(tool)) return tool;

  // MCP tools: mcp__provider__action_name
  if (tool.startsWith('mcp__')) {
    const parts = tool.slice(5).split('__');
    if (parts.length >= 2) {
      const provider = parts[0];
      // Join remaining parts and clean up underscores for readability
      const action = parts.slice(1).join('_').replace(/_/g, ' ');
      // Capitalize first letter of action
      const cleanAction = action.charAt(0).toUpperCase() + action.slice(1);
      return `${provider}: ${cleanAction}`;
    }
    // Single part after mcp__
    return parts[0] || tool;
  }

  // Other tools with double underscores
  if (tool.includes('__')) {
    const parts = tool.split('__');
    return parts.join(': ');
  }

  return tool;
}

/**
 * Extract a filename from a file path (handles both / and \ separators).
 */
function extractFilenameFromPath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return parts[parts.length - 1] || filePath;
}

/**
 * Try to parse a string as JSON. Returns the parsed object or null.
 */
function tryParseJson(str: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(str);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Format event input into a human-readable summary based on tool type.
 *
 * Instead of showing raw JSON like {"file_path":"C:\\Users\\...","old_string":"..."},
 * shows a friendly description like "Editing file: schema.sql"
 */
export function formatEventInput(tool: string | undefined, rawInput: string): string {
  if (!rawInput) return '';

  const parsed = tryParseJson(rawInput);

  if (parsed && tool) {
    switch (tool) {
      case 'Edit': {
        const filePath = parsed['file_path'] as string | undefined;
        const oldStr = parsed['old_string'] as string | undefined;
        if (filePath) {
          const fname = extractFilenameFromPath(filePath);
          const preview = oldStr ? ` | "${truncateText(oldStr, 60)}"` : '';
          return `Editing file: ${fname}${preview}`;
        }
        break;
      }
      case 'Write': {
        const filePath = parsed['file_path'] as string | undefined;
        if (filePath) {
          return `Creating file: ${extractFilenameFromPath(filePath)}`;
        }
        break;
      }
      case 'Read': {
        const filePath = parsed['file_path'] as string | undefined;
        if (filePath) {
          const fname = extractFilenameFromPath(filePath);
          const offset = parsed['offset'] as number | undefined;
          const limit = parsed['limit'] as number | undefined;
          let extra = '';
          if (offset || limit) {
            const parts: string[] = [];
            if (offset) parts.push(`line ${offset}`);
            if (limit) parts.push(`${limit} lines`);
            extra = ` (${parts.join(', ')})`;
          }
          return `Reading file: ${fname}${extra}`;
        }
        break;
      }
      case 'Bash': {
        const command = parsed['command'] as string | undefined;
        if (command) {
          return `Command: ${truncateText(command, 120)}`;
        }
        break;
      }
      case 'Grep': {
        const pattern = parsed['pattern'] as string | undefined;
        const path = parsed['path'] as string | undefined;
        if (pattern) {
          const pathInfo = path ? ` in ${extractFilenameFromPath(path)}` : '';
          return `Searching: "${truncateText(pattern, 60)}"${pathInfo}`;
        }
        break;
      }
      case 'Glob': {
        const pattern = parsed['pattern'] as string | undefined;
        if (pattern) {
          return `Searching files: ${pattern}`;
        }
        break;
      }
      case 'Task':
      case 'TaskCreate': {
        const description = (parsed['description'] || parsed['subject'] || parsed['title']) as string | undefined;
        if (description) {
          return `Delegating task: ${truncateText(description, 100)}`;
        }
        break;
      }
      case 'TaskUpdate': {
        const status = parsed['status'] as string | undefined;
        const id = parsed['id'] as string | undefined;
        if (status) {
          const idInfo = id ? ` (${id.slice(0, 8)})` : '';
          return `Updating task${idInfo}: status -> ${status}`;
        }
        break;
      }
      case 'SendMessage': {
        const text = parsed['text'] as string | undefined;
        if (text) {
          return `Message: "${truncateText(text, 100)}"`;
        }
        break;
      }
      case 'WebFetch': {
        const url = parsed['url'] as string | undefined;
        if (url) {
          return `Fetching URL: ${truncateText(url, 100)}`;
        }
        break;
      }
      case 'WebSearch': {
        const query = parsed['query'] as string | undefined;
        if (query) {
          return `Searching: "${truncateText(query, 80)}"`;
        }
        break;
      }
      default: {
        // For MCP tools, try to extract meaningful fields
        const formatted = formatToolName(tool);
        const keys = Object.keys(parsed);
        if (keys.length > 0) {
          // Show first 2-3 key=value pairs
          const preview = keys.slice(0, 3).map(k => {
            const val = parsed[k];
            const strVal = typeof val === 'string' ? truncateText(val, 40) : String(val);
            return `${k}: ${strVal}`;
          }).join(' | ');
          return `${formatted} | ${preview}`;
        }
        return formatted;
      }
    }
  }

  // Fallback: just truncate the raw text
  return truncateText(rawInput, 200);
}

/**
 * Format event output for display. Truncates to maxLength with "..." indicator.
 */
export function formatEventOutput(rawOutput: string, maxLength = 300): string {
  if (!rawOutput) return '';

  // Try to parse JSON and pretty-print a summary
  const parsed = tryParseJson(rawOutput);
  if (parsed) {
    // If it's a simple result, extract the key info
    const result = parsed['result'] as string | undefined;
    if (result && typeof result === 'string') {
      return truncateText(result, maxLength);
    }

    // If output has an "error" field, highlight it
    const error = parsed['error'] as string | undefined;
    if (error) {
      return `Erro: ${truncateText(error, maxLength - 6)}`;
    }
  }

  return truncateText(rawOutput, maxLength);
}

/**
 * Truncate text to a max length, adding "..." if truncated.
 */
function truncateText(text: string, maxLength: number): string {
  // Remove excessive whitespace and newlines for display
  const cleaned = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength) + '...';
}
