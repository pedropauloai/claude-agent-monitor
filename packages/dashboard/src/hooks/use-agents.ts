import { useEffect } from "react";
import * as api from "../lib/api.js";
import { useSessionStore } from "../stores/session-store.js";

export function useAgents() {
  const { session, projectId, agents, setAgents } = useSessionStore();

  useEffect(() => {
    if (!session?.id && !projectId) return;

    const load = async () => {
      try {
        if (projectId) {
          const { agents: data } = await api.getProjectAgents(projectId);
          setAgents(data);
        } else if (session?.id) {
          const { agents: data } = await api.getAgents(session.id);
          setAgents(data);
        }
      } catch {
        // ignore
      }
    };
    load();
    const interval = setInterval(load, 15_000);
    return () => clearInterval(interval);
  }, [session?.id, projectId, setAgents]);

  return agents;
}
