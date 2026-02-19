import { create } from 'zustand';
import type { PRDTaskStatus } from '@claudecam/shared';

export const KANBAN_COLUMNS: { id: PRDTaskStatus; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'planned', label: 'Planned' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
];

interface KanbanState {
  collapsedColumns: Set<PRDTaskStatus>;
  draggedTaskId: string | null;
  sprintFilter: string | null;
  agentFilter: string | null;
  priorityFilter: string | null;

  toggleColumn: (column: PRDTaskStatus) => void;
  setDraggedTask: (taskId: string | null) => void;
  setSprintFilter: (sprintId: string | null) => void;
  setAgentFilter: (agent: string | null) => void;
  setPriorityFilter: (priority: string | null) => void;
  resetFilters: () => void;
}

export const useKanbanStore = create<KanbanState>((set) => ({
  collapsedColumns: new Set(),
  draggedTaskId: null,
  sprintFilter: null,
  agentFilter: null,
  priorityFilter: null,

  toggleColumn: (column) =>
    set((state) => {
      const next = new Set(state.collapsedColumns);
      if (next.has(column)) next.delete(column);
      else next.add(column);
      return { collapsedColumns: next };
    }),

  setDraggedTask: (draggedTaskId) => set({ draggedTaskId }),
  setSprintFilter: (sprintFilter) => set({ sprintFilter }),
  setAgentFilter: (agentFilter) => set({ agentFilter }),
  setPriorityFilter: (priorityFilter) => set({ priorityFilter }),
  resetFilters: () =>
    set({ sprintFilter: null, agentFilter: null, priorityFilter: null }),
}));
