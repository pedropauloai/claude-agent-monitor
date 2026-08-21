import { create } from "zustand";
import type { Session, Agent, AgentEvent } from "@claudecam/shared";

export type ConnectionStatus = "connected" | "disconnected" | "reconnecting";

interface SessionState {
  session: Session | null;
  projectId: string | null;
  agents: Agent[];
  events: AgentEvent[];
  selectedAgentId: string | null;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  lastHeartbeat: string | null;
  activityWindow: number;

  setSession: (session: Session | null) => void;
  setProjectId: (projectId: string | null) => void;
  setAgents: (agents: Agent[]) => void;
  addAgent: (agent: Agent) => void;
  updateAgent: (agentId: string, updates: Partial<Agent>) => void;
  setEvents: (events: AgentEvent[]) => void;
  addEvent: (event: AgentEvent) => void;
  selectAgent: (agentId: string | null) => void;
  setConnected: (connected: boolean) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setLastHeartbeat: (timestamp: string) => void;
  setActivityWindow: (ms: number) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  projectId: null,
  agents: [],
  events: [],
  selectedAgentId: null,
  isConnected: false,
  connectionStatus: "disconnected" as ConnectionStatus,
  lastHeartbeat: null,
  activityWindow: 300_000,

  setSession: (session) =>
    set((state) => {
      // When switching to a different session, clear stale events and agents
      const isSameSession = state.session?.id === session?.id;
      if (isSameSession) return { session };
      return { session, events: [], agents: [], selectedAgentId: null };
    }),

  setProjectId: (projectId) => set({ projectId }),

  setAgents: (agents) => set({ agents }),

  addAgent: (agent) =>
    set((state) => {
      const exists = state.agents.find((a) => a.id === agent.id);
      if (exists) {
        return {
          agents: state.agents.map((a) => (a.id === agent.id ? agent : a)),
        };
      }
      return { agents: [...state.agents, agent] };
    }),

  updateAgent: (agentId, updates) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId ? { ...a, ...updates } : a,
      ),
    })),

  setEvents: (events) => set({ events }),

  addEvent: (event) =>
    set((state) => {
      // Only accept events belonging to the current session
      if (state.session && event.sessionId !== state.session.id) return state;
      // Deduplicate: SSE project-level broadcast can deliver the same event
      // multiple times (once per session in the project)
      if (state.events.some((e) => e.id === event.id)) return state;
      return { events: [event, ...state.events].slice(0, 500) };
    }),

  selectAgent: (agentId) => set({ selectedAgentId: agentId }),

  setConnected: (isConnected) => set({ isConnected }),

  setConnectionStatus: (connectionStatus) =>
    set({
      connectionStatus,
      isConnected: connectionStatus === "connected",
    }),

  setLastHeartbeat: (lastHeartbeat) => set({ lastHeartbeat }),

  setActivityWindow: (activityWindow) => set({ activityWindow }),

  reset: () =>
    set({
      session: null,
      projectId: null,
      agents: [],
      events: [],
      selectedAgentId: null,
      isConnected: false,
      connectionStatus: "disconnected" as ConnectionStatus,
      lastHeartbeat: null,
      activityWindow: 300_000,
    }),
}));
