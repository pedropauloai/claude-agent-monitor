import { useCallback, useEffect } from "react";
import * as api from "../lib/api.js";
import { useSessionStore } from "../stores/session-store.js";

export function useSession() {
  const { session, setSession, setProjectId } = useSessionStore();

  const loadSession = useCallback(async () => {
    try {
      // 1. Try to find a registered project with active sessions
      try {
        const { registrations } = await api.getRegisteredProjects();
        if (registrations.length > 0) {
          const activeReg = registrations.find(r => r.project_status === "active") || registrations[0];
          setProjectId(activeReg.project_id);

          // Get active session for this project
          const { sessions } = await api.getSessions({ status: "active", limit: 10 });
          const activeSession = sessions.find((s: Record<string, unknown>) => s.status === "active");
          if (activeSession) {
            const { session: fullSession } = await api.getSession(activeSession.id);
            setSession(fullSession);
            return;
          }
        }
      } catch {
        // Registry not available, fall back
      }

      // 2. Fall back to latest active session
      setProjectId(null);
      const { sessions } = await api.getSessions({ status: "active", limit: 1 });
      if (sessions.length > 0) {
        const { session: latestSession } = await api.getSession(sessions[0].id);
        setSession(latestSession);
      }
    } catch {
      // API not available
    }
  }, [setSession, setProjectId]);

  useEffect(() => {
    loadSession();
    const interval = setInterval(loadSession, 15_000);
    return () => clearInterval(interval);
  }, [loadSession]);

  return { session, refreshSession: loadSession };
}
