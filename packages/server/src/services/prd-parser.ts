import { randomUUID } from 'node:crypto';
import type { PRDSection, PRDTask } from '@claudecam/shared';

interface ParsedPRD {
  sections: PRDSection[];
  suggestedTasks: SuggestedTask[];
  suggestedSprints: SuggestedSprint[];
}

interface SuggestedTask {
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  complexity: number;
  dependsOn: string[];
  prdSection: string;
  prdLineStart: number;
  prdLineEnd: number;
  tags: string[];
}

interface SuggestedSprint {
  name: string;
  taskIndices: number[];
}

function estimatePriority(text: string): 'critical' | 'high' | 'medium' | 'low' {
  const lower = text.toLowerCase();
  if (lower.includes('critical') || lower.includes('essencial') || lower.includes('obrigatorio')) return 'critical';
  if (lower.includes('high') || lower.includes('alta') || lower.includes('importante') || lower.includes('core')) return 'high';
  if (lower.includes('low') || lower.includes('baixa') || lower.includes('nice to have') || lower.includes('bonus')) return 'low';
  return 'medium';
}

function estimateComplexity(text: string): number {
  const lower = text.toLowerCase();
  const complexKeywords = ['integrar', 'database', 'auth', 'security', 'migration', 'refactor', 'architecture', 'engine', 'parser', 'graph'];
  const simpleKeywords = ['rename', 'color', 'text', 'label', 'icon', 'style', 'typo', 'comment', 'readme'];

  let score = 5;
  for (const kw of complexKeywords) {
    if (lower.includes(kw)) score += 1;
  }
  for (const kw of simpleKeywords) {
    if (lower.includes(kw)) score -= 1;
  }
  return Math.max(1, Math.min(10, score));
}

function extractTags(text: string): string[] {
  const tags: string[] = [];
  const lower = text.toLowerCase();
  if (lower.includes('frontend') || lower.includes('ui') || lower.includes('dashboard') || lower.includes('component')) tags.push('frontend');
  if (lower.includes('backend') || lower.includes('server') || lower.includes('api') || lower.includes('database')) tags.push('backend');
  if (lower.includes('test') || lower.includes('spec')) tags.push('testing');
  if (lower.includes('doc') || lower.includes('readme')) tags.push('docs');
  if (lower.includes('cli') || lower.includes('command')) tags.push('cli');
  if (lower.includes('config') || lower.includes('setup') || lower.includes('init')) tags.push('infra');
  return tags;
}

export function parseStructured(content: string): ParsedPRD {
  const lines = content.split('\n');
  const sections: PRDSection[] = [];
  const tasks: SuggestedTask[] = [];
  const sprintMap = new Map<string, number[]>();

  let currentSection: { title: string; content: string[]; level: number; startLine: number } | null = null;
  let sectionOrder = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      // Finalize previous section
      if (currentSection) {
        sections.push({
          id: randomUUID(),
          title: currentSection.title,
          content: currentSection.content.join('\n'),
          order: sectionOrder++,
          level: currentSection.level,
          taskIds: [],
          completionPercent: 0,
        });
      }

      currentSection = {
        title: headingMatch[2].trim(),
        content: [],
        level: headingMatch[1].length,
        startLine: i + 1,
      };
      continue;
    }

    if (currentSection) {
      currentSection.content.push(line);
    }

    // Detect checkbox tasks: - [ ] Task name or - [x] Task name
    const checkboxMatch = line.match(/^\s*-\s*\[([ xX])\]\s+(.+)/);
    if (checkboxMatch) {
      const isCompleted = checkboxMatch[1].toLowerCase() === 'x';
      const taskTitle = checkboxMatch[2].trim();
      const sectionTitle = currentSection?.title || 'General';

      const task: SuggestedTask = {
        title: taskTitle,
        description: taskTitle,
        priority: estimatePriority(taskTitle),
        complexity: estimateComplexity(taskTitle),
        dependsOn: [],
        prdSection: sectionTitle,
        prdLineStart: i + 1,
        prdLineEnd: i + 1,
        tags: extractTags(taskTitle),
      };

      tasks.push(task);

      // Group by section for sprint suggestions
      if (!sprintMap.has(sectionTitle)) {
        sprintMap.set(sectionTitle, []);
      }
      sprintMap.get(sectionTitle)!.push(tasks.length - 1);
    }
  }

  // Finalize last section
  if (currentSection) {
    sections.push({
      id: randomUUID(),
      title: currentSection.title,
      content: currentSection.content.join('\n'),
      order: sectionOrder,
      level: currentSection.level,
      taskIds: [],
      completionPercent: 0,
    });
  }

  // Build sprint suggestions from section groupings
  const suggestedSprints: SuggestedSprint[] = [];
  for (const [sectionName, indices] of sprintMap) {
    if (indices.length > 0) {
      suggestedSprints.push({
        name: sectionName,
        taskIndices: indices,
      });
    }
  }

  // If no sprints were detected, create a single "MVP" sprint
  if (suggestedSprints.length === 0 && tasks.length > 0) {
    suggestedSprints.push({
      name: 'MVP',
      taskIndices: tasks.map((_, i) => i),
    });
  }

  return { sections, suggestedTasks: tasks, suggestedSprints };
}

export function parsePrd(content: string, method: string = 'structured'): ParsedPRD {
  if (method === 'structured' || method === 'manual') {
    return parseStructured(content);
  }

  // ai_assisted falls back to structured for now
  return parseStructured(content);
}
