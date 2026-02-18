import { useCallback, useEffect, useRef } from "react";
import * as api from "../lib/api.js";
import { useSessionStore } from "../stores/session-store.js";

export function useSession() {
  const { session, setSession, setProjectId } = useSessionStore();
  // Track whether user has manually selected a session (or initial load happened)
  const hasInitialized = useRef(false);

  const loadSession = useCallback(async () => {
    // If a session is already selected (initial load done or user picked one), don't override
    if (hasInitialized.current) return;

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
            hasInitialized.current = true;
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
        hasInitialized.current = true;
      }
    } catch {
      // API not available - retry on next interval
    }
  }, [setSession, setProjectId]);

  useEffect(() => {
    loadSession();
    // Keep polling only until initial session is found, then stop
    const interval = setInterval(loadSession, 15_000);
    return () => clearInterval(interval);
  }, [loadSession]);

  return { session, refreshSession: loadSession };
}
