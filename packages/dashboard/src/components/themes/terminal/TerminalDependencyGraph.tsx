import { useMemo } from 'react';
import { useProjectStore } from '../../../stores/project-store';
import type { PRDTask, PRDTaskStatus } from '@claudecam/shared';

const STATUS_CHARS: Record<string, string> = {
  backlog: '.',
  planned: '-',
  pending: '~',
  in_progress: '*',
  in_review: '?',
  completed: '+',
  blocked: '!',
  deferred: '_',
};

const STATUS_COLORS: Record<string, string> = {
  backlog: 'terminal-dim',
  planned: 'text-[#00ccff]',
  pending: 'terminal-muted',
  in_progress: 'text-[#00ff00]',
  in_review: 'terminal-muted',
  completed: 'text-[#00ff00]',
  blocked: 'terminal-error',
  deferred: 'terminal-dim',
};

interface TreeNode {
  task: PRDTask;
  children: TreeNode[];
  depth: number;
}

export function TerminalDependencyGraph() {
  const { tasks } = useProjectStore();

  const { roots, edgeCount, nodeCount } = useMemo(() => {
    // Build dependency edges: task depends on the tasks listed in dependsOn + blockedBy
    const edgeMap = new Map<string, Set<string>>();
    const reverseMap = new Map<string, Set<string>>(); // parent -> children who depend on parent
    const taskMap = new Map<string, PRDTask>();

    for (const t of tasks) {
      taskMap.set(t.id, t);
      const combined = new Set([...t.dependsOn, ...t.blockedBy]);
      edgeMap.set(t.id, combined);
    }

    // Identify tasks that participate in dependencies
    const participantIds = new Set<string>();
    let edges = 0;
    for (const t of tasks) {
      const deps = edgeMap.get(t.id) ?? new Set();
      if (deps.size > 0) {
        participantIds.add(t.id);
        for (const d of deps) {
          participantIds.add(d);
          edges++;
          if (!reverseMap.has(d)) reverseMap.set(d, new Set());
          reverseMap.get(d)!.add(t.id);
        }
      }
    }

    if (participantIds.size === 0) {
      return { roots: [] as TreeNode[], edgeCount: 0, nodeCount: 0 };
    }

    // Find root nodes (no dependencies on other participating tasks)
    const rootIds = new Set<string>();
    for (const id of participantIds) {
      const deps = edgeMap.get(id) ?? new Set();
      const hasParentInGraph = Array.from(deps).some((d) => participantIds.has(d));
      if (!hasParentInGraph) {
        rootIds.add(id);
      }
    }

    // If no roots found (cycle), just take first few participants
    if (rootIds.size === 0) {
      const first = Array.from(participantIds).slice(0, 3);
      for (const id of first) rootIds.add(id);
    }

    // Build tree (with cycle detection)
    const visited = new Set<string>();
    function buildTree(id: string, depth: number): TreeNode | null {
      if (visited.has(id) || depth > 6) return null;
      visited.add(id);

      const task = taskMap.get(id);
      if (!task) return null;

      const childIds = reverseMap.get(id) ?? new Set();
      const children: TreeNode[] = [];
      for (const childId of childIds) {
        if (participantIds.has(childId)) {
          const node = buildTree(childId, depth + 1);
          if (node) children.push(node);
        }
      }

      return { task, children, depth };
    }

    const treeRoots: TreeNode[] = [];
    for (const rootId of rootIds) {
      const node = buildTree(rootId, 0);
      if (node) treeRoots.push(node);
    }

    return { roots: treeRoots, edgeCount: edges, nodeCount: participantIds.size };
  }, [tasks]);

  if (roots.length === 0) {
    return (
      <div className="p-3 border-b border-[#1a3a1a] font-mono text-[11px]">
        <span className="terminal-muted">{'## DEPENDENCIES ##'}</span>
        <div className="terminal-dim text-center py-3">
          {'> No task dependencies'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 border-b border-[#1a3a1a] font-mono text-[11px]">
      <div className="flex items-center justify-between mb-2">
        <span className="terminal-muted">{'## DEPENDENCIES ##'}</span>
        <span className="terminal-dim text-[10px]">
          {nodeCount} tasks {'\u00B7'} {edgeCount} links
        </span>
      </div>

      {/* ASCII tree */}
      <div className="bg-[#050505] border border-[#1a3a1a] p-2 overflow-auto terminal-scrollbar max-h-[280px]">
        {roots.map((root, i) => (
          <TreeBranch
            key={root.task.id}
            node={root}
            prefix=""
            isLast={i === roots.length - 1}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[9px]">
        {Object.entries(STATUS_CHARS)
          .filter(([status]) => tasks.some((t) => t.status === status))
          .map(([status, ch]) => (
            <span key={status} className={STATUS_COLORS[status] || 'terminal-dim'}>
              [{ch}] {status.replace(/_/g, ' ')}
            </span>
          ))}
      </div>
    </div>
  );
}

function TreeBranch({
  node,
  prefix,
  isLast,
}: {
  node: TreeNode;
  prefix: string;
  isLast: boolean;
}) {
  const branch = isLast ? '\u2514\u2500' : '\u251C\u2500';
  const childPrefix = prefix + (isLast ? '  ' : '\u2502 ');
  const statusChar = STATUS_CHARS[node.task.status] || '?';
  const statusColor = STATUS_COLORS[node.task.status] || 'terminal-dim';

  const titleTrunc = node.task.title.length > 30
    ? node.task.title.slice(0, 27) + '...'
    : node.task.title;

  return (
    <div className="text-[10px]">
      <div className="flex items-center gap-0 whitespace-nowrap">
        <span className="terminal-dim">{prefix}{branch}</span>
        <span className={`font-bold ${statusColor}`}>[{statusChar}]</span>
        <span className="text-[#00cc00] ml-1">{titleTrunc}</span>
        {node.task.assignedAgent && (
          <span className="terminal-dim ml-1">@{node.task.assignedAgent}</span>
        )}
      </div>
      {node.children.map((child, i) => (
        <TreeBranch
          key={child.task.id}
          node={child}
          prefix={childPrefix}
          isLast={i === node.children.length - 1}
        />
      ))}
    </div>
  );
}
