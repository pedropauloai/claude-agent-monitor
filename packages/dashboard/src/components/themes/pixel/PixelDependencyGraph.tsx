import { useMemo, useRef, useCallback, useEffect, useState } from 'react';
import { useProjectStore } from '../../../stores/project-store';
import type { PRDTask, PRDTaskStatus } from '@claudecam/shared';

// --- Constants ---

const NODE_WIDTH = 140;
const NODE_HEIGHT = 44;
const NODE_PAD_X = 36;
const NODE_PAD_Y = 20;
const MARGIN_TOP = 28;
const MARGIN_LEFT = 20;

// Pixel / 8-bit style status colors
const STATUS_COLORS: Record<string, string> = {
  backlog: '#6b7280',
  planned: '#457b9d',
  pending: '#f4a261',
  in_progress: '#2dce89',
  in_review: '#7c5cff',
  completed: '#ffd700',
  blocked: '#e63946',
  deferred: '#6b7280',
};

const STATUS_LABELS: Record<string, string> = {
  backlog: 'LOCKED',
  planned: 'AVAILABLE',
  pending: 'QUEUED',
  in_progress: 'LEARNING',
  in_review: 'TESTING',
  completed: 'MASTERED',
  blocked: 'SEALED',
  deferred: 'HIDDEN',
};

function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? '#6b7280';
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, ' ').toUpperCase();
}

// --- Types ---

interface GraphNode {
  id: string;
  title: string;
  status: PRDTaskStatus;
  col: number;
  row: number;
  x: number;
  y: number;
}

interface GraphEdge {
  fromId: string;
  toId: string;
}

// --- Layout helpers ---

function computeDepths(
  tasks: PRDTask[],
  edgeMap: Map<string, string[]>
): Map<string, number> {
  const depths = new Map<string, number>();

  function resolve(id: string, visiting: Set<string>): number {
    if (depths.has(id)) return depths.get(id)!;
    if (visiting.has(id)) return 0;
    visiting.add(id);

    const deps = edgeMap.get(id) ?? [];
    const maxParent = deps.reduce((mx, depId) => {
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

export function PixelDependencyGraph() {
  const { tasks } = useProjectStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const { nodes, edges, svgWidth, svgHeight, isEmpty } = useMemo(() => {
    const edgeMap = new Map<string, string[]>();
    for (const t of tasks) {
      const combined = new Set<string>([...t.dependsOn, ...t.blockedBy]);
      edgeMap.set(t.id, Array.from(combined));
    }

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

    const depths = computeDepths(participantTasks, edgeMap);
    const columns = new Map<number, PRDTask[]>();
    for (const t of participantTasks) {
      const d = depths.get(t.id) ?? 0;
      if (!columns.has(d)) columns.set(d, []);
      columns.get(d)!.push(t);
    }

    const sortedCols = Array.from(columns.keys()).sort((a, b) => a - b);

    const graphNodes: GraphNode[] = [];
    for (const col of sortedCols) {
      const group = columns.get(col)!;
      const statusOrder: Record<string, number> = {
        blocked: 0, in_progress: 1, in_review: 2, pending: 3,
        planned: 4, backlog: 5, completed: 6, deferred: 7,
      };
      group.sort(
        (a, b) =>
          (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9) ||
          a.title.localeCompare(b.title)
      );

      group.forEach((t, row) => {
        const x = MARGIN_LEFT + col * (NODE_WIDTH + NODE_PAD_X);
        const y = MARGIN_TOP + row * (NODE_HEIGHT + NODE_PAD_Y);
        graphNodes.push({ id: t.id, title: t.title, status: t.status, col, row, x, y });
      });
    }

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

    const maxX = Math.max(...graphNodes.map((n) => n.x)) + NODE_WIDTH + MARGIN_LEFT;
    const maxY = Math.max(...graphNodes.map((n) => n.y)) + NODE_HEIGHT + MARGIN_TOP;

    return { nodes: graphNodes, edges: graphEdges, svgWidth: maxX, svgHeight: maxY, isEmpty: false };
  }, [tasks]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ left: 0, top: 0 });
  }, [nodes]);

  const nodeById = useMemo(() => {
    const m = new Map<string, GraphNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  const isEdgeHighlighted = useCallback(
    (e: GraphEdge) => hovered !== null && (e.fromId === hovered || e.toId === hovered),
    [hovered]
  );

  if (isEmpty) {
    return (
      <div className="p-4" style={{ borderBottom: '3px solid var(--pixel-border)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="pixel-text-xs" style={{ color: 'var(--pixel-gold)' }}>
            \🌲 SKILL TREE
          </span>
        </div>
        <div className="h-24 flex items-center justify-center">
          <p className="pixel-text-xs" style={{ color: 'var(--pixel-text-muted)' }}>
            NO SKILL DEPENDENCIES
          </p>
        </div>
      </div>
    );
  }

  const activeStatuses = Array.from(new Set(nodes.map((n) => n.status)));

  return (
    <div className="p-4" style={{ borderBottom: '3px solid var(--pixel-border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="pixel-text-xs" style={{ color: 'var(--pixel-gold)' }}>
          \🌲 SKILL TREE
        </span>
        <span className="pixel-text-xs" style={{ color: 'var(--pixel-text-dim)' }}>
          {nodes.length} SKILLS \u00B7 {edges.length} LINKS
        </span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
        {activeStatuses.map((s) => (
          <div key={s} className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-3"
              style={{ backgroundColor: statusColor(s), border: '1px solid #000' }}
            />
            <span className="pixel-text-xs" style={{ color: 'var(--pixel-text-dim)' }}>
              {statusLabel(s)}
            </span>
          </div>
        ))}
      </div>

      {/* Graph area */}
      <div
        ref={scrollRef}
        className="overflow-auto pixel-scrollbar pixel-card"
        style={{ maxHeight: 360, background: 'var(--pixel-bg-dark)' }}
      >
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="select-none"
        >
          {/* Defs: pixel arrow markers */}
          <defs>
            <marker id="pixel-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#444477" />
            </marker>
            <marker id="pixel-arrow-hl" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#ffd700" />
            </marker>
          </defs>

          {/* Edges */}
          {edges.map((e) => {
            const from = nodeById.get(e.fromId);
            const to = nodeById.get(e.toId);
            if (!from || !to) return null;

            const hl = isEdgeHighlighted(e);
            const x1 = from.x + NODE_WIDTH;
            const y1 = from.y + NODE_HEIGHT / 2;
            const x2 = to.x;
            const y2 = to.y + NODE_HEIGHT / 2;

            // Step-based path (pixelated feel: right-angle lines)
            const midX = (x1 + x2) / 2;
            const path = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;

            return (
              <path
                key={`${e.fromId}-${e.toId}`}
                d={path}
                fill="none"
                stroke={hl ? '#ffd700' : '#444477'}
                strokeWidth={hl ? 3 : 2}
                markerEnd={hl ? 'url(#pixel-arrow-hl)' : 'url(#pixel-arrow)'}
                opacity={hovered === null || hl ? 1 : 0.25}
              />
            );
          })}

          {/* Nodes (skill tree nodes) */}
          {nodes.map((node) => {
            const color = statusColor(node.status);
            const isHovered = hovered === node.id;
            const dimmed = hovered !== null && !isHovered &&
              !edges.some(
                (e) =>
                  (e.fromId === hovered && e.toId === node.id) ||
                  (e.toId === hovered && e.fromId === node.id)
              );
            const isMastered = node.status === 'completed';

            return (
              <g
                key={node.id}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'default' }}
                opacity={dimmed ? 0.3 : 1}
              >
                {/* Node background (pixel box) */}
                <rect
                  x={node.x}
                  y={node.y}
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  fill="#1a1a2e"
                  stroke={isHovered ? '#ffd700' : color}
                  strokeWidth={3}
                />
                {/* Inner highlight (top-left light) */}
                <rect
                  x={node.x + 3}
                  y={node.y + 3}
                  width={NODE_WIDTH - 6}
                  height={2}
                  fill="rgba(255,255,255,0.08)"
                />
                {/* Status dot */}
                <rect
                  x={node.x + 6}
                  y={node.y + NODE_HEIGHT / 2 - 4}
                  width={8}
                  height={8}
                  fill={color}
                />
                {/* Mastered sparkle */}
                {isMastered && (
                  <text x={node.x + NODE_WIDTH - 16} y={node.y + 14} fontSize={10} fill="#ffd700">
                    {'\u2B50'}
                  </text>
                )}
                {/* Title */}
                <text
                  x={node.x + 20}
                  y={node.y + 17}
                  fill="#e8e8ff"
                  fontSize={7}
                  fontFamily="'Press Start 2P', monospace"
                >
                  {node.title.length > 14 ? node.title.slice(0, 13) + '\u2026' : node.title}
                </text>
                {/* Status label */}
                <text
                  x={node.x + 20}
                  y={node.y + 32}
                  fill="#6666aa"
                  fontSize={6}
                  fontFamily="'Press Start 2P', monospace"
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
