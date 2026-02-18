/**
 * Sprint Markdown Parser
 *
 * Parses sprint markdown files in the format:
 *
 * # Sprint X - Name
 * Status: completed | active | planned
 *
 * ## Section Name
 * - [x] Task title (completed)
 * - [ ] Task title (planned)
 *   Priority: high | medium | low
 *   Tags: tag1, tag2
 *   Description: Brief description
 */

export interface ParsedSprintTask {
  title: string;
  completed: boolean;
  priority: string;
  tags: string[];
  description: string;
  files: string[];
  section: string;
}

export interface ParsedSprint {
  name: string;
  status: string;
  sections: string[];
  tasks: ParsedSprintTask[];
}

const VALID_STATUSES = ['completed', 'active', 'planned'];
const VALID_PRIORITIES = ['critical', 'high', 'medium', 'low'];

export function parseSprintMarkdown(content: string): ParsedSprint {
  const lines = content.split('\n');

  let name = '';
  let status = 'planned';
  let currentSection = '';
  const sections: string[] = [];
  const tasks: ParsedSprintTask[] = [];

  let currentTask: ParsedSprintTask | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Parse sprint title: # Sprint X - Name
    const titleMatch = trimmed.match(/^#\s+(.+)$/);
    if (titleMatch && !trimmed.startsWith('##')) {
      name = titleMatch[1].trim();
      continue;
    }

    // Parse status line: Status: completed | active | planned
    const statusMatch = trimmed.match(/^Status:\s*(.+)$/i);
    if (statusMatch) {
      const parsed = statusMatch[1].trim().toLowerCase();
      if (VALID_STATUSES.includes(parsed)) {
        status = parsed;
      }
      continue;
    }

    // Parse section heading: ## Section Name
    const sectionMatch = trimmed.match(/^##\s+(.+)$/);
    if (sectionMatch) {
      // Save any pending task
      if (currentTask) {
        tasks.push(currentTask);
        currentTask = null;
      }
      currentSection = sectionMatch[1].trim();
      if (!sections.includes(currentSection)) {
        sections.push(currentSection);
      }
      continue;
    }

    // Parse task line: - [x] Task title OR - [ ] Task title
    const taskMatch = trimmed.match(/^-\s+\[([ xX])\]\s+(.+)$/);
    if (taskMatch) {
      // Save any pending task
      if (currentTask) {
        tasks.push(currentTask);
      }
      const completed = taskMatch[1].toLowerCase() === 'x';
      currentTask = {
        title: taskMatch[2].trim(),
        completed,
        priority: 'medium',
        tags: [],
        description: '',
        files: [],
        section: currentSection,
      };
      continue;
    }

    // Parse task metadata (indented lines after a task)
    if (currentTask) {
      const priorityMatch = trimmed.match(/^Priority:\s*(.+)$/i);
      if (priorityMatch) {
        const p = priorityMatch[1].trim().toLowerCase();
        if (VALID_PRIORITIES.includes(p)) {
          currentTask.priority = p;
        }
        continue;
      }

      const tagsMatch = trimmed.match(/^Tags:\s*(.+)$/i);
      if (tagsMatch) {
        currentTask.tags = tagsMatch[1]
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0);
        continue;
      }

      const descMatch = trimmed.match(/^Description:\s*(.+)$/i);
      if (descMatch) {
        currentTask.description = descMatch[1].trim();
        continue;
      }

      const filesMatch = trimmed.match(/^Files:\s*(.+)$/i);
      if (filesMatch) {
        currentTask.files = filesMatch[1]
          .split(',')
          .map((f) => f.trim())
          .filter((f) => f.length > 0);
        continue;
      }
    }
  }

  // Save final pending task
  if (currentTask) {
    tasks.push(currentTask);
  }

  return { name, status, sections, tasks };
}
