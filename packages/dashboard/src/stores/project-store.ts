import { create } from 'zustand';
import type { Project, Sprint, PRDTask } from '@claudecam/shared';

export type ViewMode = 'agents' | 'tracker';

interface ProjectState {
  projects: Project[];
  projectsLoaded: boolean;
  activeProject: Project | null;
  activeSprint: Sprint | null;
  sprints: Sprint[];
  tasks: PRDTask[];
  viewMode: ViewMode;
  selectedTaskId: string | null;

  setProjects: (projects: Project[]) => void;
  setProjectsLoaded: (loaded: boolean) => void;
  setActiveProject: (project: Project | null) => void;
  setActiveSprint: (sprint: Sprint | null) => void;
  setSprints: (sprints: Sprint[]) => void;
  setTasks: (tasks: PRDTask[]) => void;
  updateTask: (taskId: string, updates: Partial<PRDTask>) => void;
  updateActiveProject: (updates: Partial<Project>) => void;
  updateActiveSprint: (updates: Partial<Sprint>) => void;
  removeProject: (id: string) => void;
  setViewMode: (mode: ViewMode) => void;
  selectTask: (taskId: string | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  projectsLoaded: false,
  activeProject: null,
  activeSprint: null,
  sprints: [],
  tasks: [],
  viewMode: 'agents',
  selectedTaskId: null,

  setProjects: (projects) => set({ projects }),
  setProjectsLoaded: (projectsLoaded) => set({ projectsLoaded }),
  setActiveProject: (activeProject) => set({ activeProject }),
  setActiveSprint: (activeSprint) => set({ activeSprint }),
  setSprints: (sprints) => set({ sprints }),
  setTasks: (tasks) => set({ tasks }),
  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, ...updates } : t
      ),
    })),
  updateActiveProject: (updates) =>
    set((state) => ({
      activeProject: state.activeProject
        ? { ...state.activeProject, ...updates }
        : null,
    })),
  updateActiveSprint: (updates) =>
    set((state) => ({
      activeSprint: state.activeSprint
        ? { ...state.activeSprint, ...updates }
        : null,
    })),
  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      activeProject: state.activeProject?.id === id ? null : state.activeProject,
    })),
  setViewMode: (viewMode) => set({ viewMode }),
  selectTask: (selectedTaskId) => set({ selectedTaskId }),
}));
