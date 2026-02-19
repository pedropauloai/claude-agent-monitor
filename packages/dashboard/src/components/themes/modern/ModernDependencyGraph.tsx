import { useMemo, useRef, useCallback, useEffect, useState } from 'react';
import { useProjectStore } from '../../../stores/project-store';
import type { PRDTask, PRDTaskStatus } from '@claudecam/shared';

// --- Constants ---

const NODE_WIDTH = 160;
const NODE_HEIGHT = 48;
const NODE_PAD_X = 40;
const NODE_PAD_Y = 24;
const MARGIN_TOP = 32;
const MARGIN_LEFT = 24;

// Status colours used for node borders, dots, and edge strokes.
const STATUS_COLORS: Record<string, string> = {
  backlog: '#6b7280',
  planned: '#3b82f6',
  pending: '#eab308',
  in_progress: '#10b981',
  in_review: '#a855f7',
  completed: '#22c55e',
  blocked: '#ef4444',
  deferred: '#6b7280',
};

function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? '#6b7280';
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

// --- Types ---

interface GraphNode {
  id: string;
  title: string;
  status: PRDTaskStatus;
  col: number; // depth column (left-to-right)
  row: number; // row within column
  x: number;
  y: number;
}

interface GraphEdge {
  fromId: string;
  toId: string;
}

// --- Layout helpers ---

/**
 * Compute the topological depth of each task.
 * Tasks with no dependencies live at depth 0; a task that depends on
 * depth-N tasks lives at depth N+1.
 */
function computeDepths(
  tasks: PRDTask[],
  edgeMap: Map<string, string[]>
): Map<string, number> {
  const depths = new Map<string, number>();

  function resolve(id: string, visiting: Set<string>): number {
    if (depths.has(id)) return depths.get(id)!;
    if (visiting.has(id)) return 0; // cycle guard
    visiting.add(id);

    const deps = edgeMap.get(id) ?? [];
    const maxParent = deps.reduce((mx, depId) => {
      // only count deps that are in the task set
      if (!edgeMap.has(depId) && !tasks.some((t) => t.id === depId)) return mx;
      return Math.max(mx, resolve(depId, visiting));
    }, -1);
    const d = maxParent + 1;
    depths.set(id, d);
    return d;
  }

  const visiting = new Set<string>();
  for (const t of tasks) {
    resolve(t.id, visiting);
  }
  return depths;
}

// --- Component ---

export function ModernDependencyGraph() {
  const { tasks, selectTask } = useProjectStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  // Build graph data ---------------------------------------------------------

  const { nodes, edges, svgWidth, svgHeight, isEmpty } = useMemo(() => {
    // Merge dependsOn + blockedBy into a single "depends-on" edge map.
    // Both arrays express "this task cannot start until X finishes".
    const edgeMap = new Map<string, string[]>();
    for (const t of tasks) {
      const combined = new Set<string>([...t.dependsOn, ...t.blockedBy]);
      edgeMap.set(t.id, Array.from(combined));
    }

    // Only include tasks that participate in at least one dependency edge.
    const participantIds = new Set<string>();
    for (const t of tasks) {
      const deps = edgeMap.get(t.id) ?? [];
      if (deps.length > 0) {
        participantIds.add(t.id);
        for (const d of deps) participantIds.add(d);
      }
    }

    const participantTasks = tasks.filter((t) => participantIds.has(t.id));

    if (participantTasks.length === 0) {
      return { nodes: [] as GraphNode[], edges: [] as GraphEdge[], svgWidth: 0, svgHeight: 0, isEmpty: true };
    }

    // Compute depths / columns
    const depths = computeDepths(participantTasks, edgeMap);

    // Group tasks by their depth column
    const columns = new Map<number, PRDTask[]>();
    for (const t of participantTasks) {
      const d = depths.get(t.id) ?? 0;
      if (!columns.has(d)) columns.set(d, []);
      columns.get(d)!.push(t);
    }

    // Sort columns keys
    const sortedCols = Array.from(columns.keys()).sort((a, b) => a - b);

    // Build nodes with positions
    const graphNodes: GraphNode[] = [];
    for (const col of sortedCols) {
      const group = columns.get(col)!;
      // Sort within column: blocked first, then in_progress, then by title
      const statusOrder: Record<string, number> = {
        blocked: 0,
        in_progress: 1,
        in_review: 2,
        pending: 3,
        planned: 4,
        backlog: 5,
        completed: 6,
        deferred: 7,
      };
      group.sort(
        (a, b) =>
          (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9) ||
          a.title.localeCompare(b.title)
      );

      group.forEach((t, row) => {
        const x = MARGIN_LEFT + col * (NODE_WIDTH + NODE_PAD_X);
        const y = MARGIN_TOP + row * (NODE_HEIGHT + NODE_PAD_Y);
        graphNodes.push({
          id: t.id,
          title: t.title,
          status: t.status,
          col,
          row,
          x,
          y,
        });
      });
    }

    // Build edges
    const graphEdges: GraphEdge[] = [];
    const nodeIds = new Set(graphNodes.map((n) => n.id));
    for (const t of participantTasks) {
      const deps = edgeMap.get(t.id) ?? [];
      for (const depId of deps) {
        if (nodeIds.has(depId)) {
          graphEdges.push({ fromId: depId, toId: t.id });
        }
      }
    }

    // Compute SVG canvas size
    const maxX = Math.max(...graphNodes.map((n) => n.x)) + NODE_WIDTH + MARGIN_LEFT;
    const maxY = Math.max(...graphNodes.map((n) => n.y)) + NODE_HEIGHT + MARGIN_TOP;

    return { nodes: graphNodes, edges: graphEdges, svgWidth: maxX, svgHeight: maxY, isEmpty: false };
  }, [tasks]);

  // Keep scroll in view on first render
  useEffect(() => {
    scrollRef.current?.scrollTo({ left: 0, top: 0 });
  }, [nodes]);

  // Quick look-up
  const nodeById = useMemo(() => {
    const m = new Map<string, GraphNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  // Highlight edges connected to hovered node
  const isEdgeHighlighted = useCallback(
    (e: GraphEdge) => hovered !== null && (e.fromId === hovered || e.toId === hovered),
    [hovered]
  );

  // --- Empty state ----------------------------------------------------------

  if (isEmpty) {
    return (
      <div className="p-4 border-b border-cam-border/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-wider text-cam-text-muted font-medium">
            Dependencies
          </span>
        </div>
        <div className="h-24 flex items-center justify-center">
          <p className="text-[10px] text-cam-text-muted">No task dependencies</p>
        </div>
      </div>
    );
  }

  // --- Legend items ----------------------------------------------------------

  const activeStatuses = Array.from(new Set(nodes.map((n) => n.status)));

  // --- Render ---------------------------------------------------------------

  return (
    <div className="p-4 border-b border-cam-border/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider text-cam-text-muted font-medium">
          Dependencies
        </span>
        <span className="text-[9px] text-cam-text-muted">
          {nodes.length} tasks &middot; {edges.length} links
        </span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
        {activeStatuses.map((s) => (
          <div key={s} className="flex items-center gap-1">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: statusColor(s) }}
            />
            <span className="text-[9px] text-cam-text-muted capitalize">{statusLabel(s)}</span>
          </div>
        ))}
      </div>

      {/* Graph area */}
      <div
        ref={scrollRef}
        className="overflow-auto modern-scrollbar rounded border border-cam-border/20 bg-cam-surface/40"
        style={{ maxHeight: 360 }}
      >
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="select-none"
        >
          {/* Defs: arrow markers */}
          <defs>
            {/* Default (dim) arrow */}
            <marker
              id="dep-arrow"
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#4a4a4a" />
            </marker>
            {/* Highlighted arrow */}
            <marker
              id="dep-arrow-hl"
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#60a5fa" />
            </marker>
          </defs>

          {/* Edges (drawn first so they sit behind nodes) */}
          {edges.map((e) => {
            const from = nodeById.get(e.fromId);
            const to = nodeById.get(e.toId);
            if (!from || !to) return null;

            const hl = isEdgeHighlighted(e);

            // Start from the right-centre of the source node
            const x1 = from.x + NODE_WIDTH;
            const y1 = from.y + NODE_HEIGHT / 2;
            // End at the left-centre of the target node
            const x2 = to.x;
            const y2 = to.y + NODE_HEIGHT / 2;

            // Use a cubic bezier for a smooth curve
            const dx = Math.abs(x2 - x1);
            const cpOffset = Math.max(dx * 0.4, 30);

            const path = `M ${x1} ${y1} C ${x1 + cpOffset} ${y1}, ${x2 - cpOffset} ${y2}, ${x2} ${y2}`;

            return (
              <path
                key={`${e.fromId}-${e.toId}`}
                d={path}
                fill="none"
                stroke={hl ? '#60a5fa' : '#3a3a3a'}
                strokeWidth={hl ? 1.5 : 1}
                strokeDasharray={hl ? undefined : undefined}
                markerEnd={hl ? 'url(#dep-arrow-hl)' : 'url(#dep-arrow)'}
                opacity={hovered === null || hl ? 1 : 0.25}
                className="transition-opacity duration-150"
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const color = statusColor(node.status);
            const dimmed = hovered !== null && hovered !== node.id &&
              !edges.some(
                (e) =>
                  (e.fromId === hovered && e.toId === node.id) ||
                  (e.toId === hovered && e.fromId === node.id)
              );

            return (
              <g
                key={node.id}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => selectTask(node.id)}
                style={{ cursor: 'pointer' }}
                opacity={dimmed ? 0.35 : 1}
                className="transition-opacity duration-150"
              >
                {/* Background rect */}
                <rect
                  x={node.x}
                  y={node.y}
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx={6}
                  fill="#191919"
                  stroke={color}
                  strokeWidth={hovered === node.id ? 1.5 : 1}
                />
                {/* Status dot */}
                <circle
                  cx={node.x + 12}
                  cy={node.y + NODE_HEIGHT / 2}
                  r={4}
                  fill={color}
                />
                {/* Title (truncated) */}
                <text
                  x={node.x + 22}
                  y={node.y + 18}
                  fill="#d4d4d4"
                  fontSize={10}
                  fontFamily="Inter, system-ui, sans-serif"
                  fontWeight={500}
                >
                  {node.title.length > 18 ? node.title.slice(0, 17) + '\u2026' : node.title}
                </text>
                {/* Status label */}
                <text
                  x={node.x + 22}
                  y={node.y + 34}
                  fill="#737373"
                  fontSize={8}
                  fontFamily="Inter, system-ui, sans-serif"
                  style={{ textTransform: 'capitalize' }}
                >
                  {statusLabel(node.status)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
