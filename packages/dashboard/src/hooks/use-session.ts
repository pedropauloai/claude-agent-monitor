import { useCallback, useEffect, useRef } from "react";
import * as api from "../lib/api.js";
import { useSessionStore } from "../stores/session-store.js";

/**
 * Check if URL has a session_id parameter, meaning the session URL hook
 * will handle session selection.
 */
function hasSessionIdInUrl(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.has('session_id');
}

export function useSession() {
  const { session, setSession, setProjectId } = useSessionStore();
  // Track whether user has manually selected a session (or initial load happened)
  const hasInitialized = useRef(false);

  // When session is reset to null (e.g. project switch), allow re-initialization
  useEffect(() => {
    if (session === null) {
      hasInitialized.current = false;
    }
  }, [session]);

  const loadSession = useCallback(async () => {
    // If a session is already selected (initial load done or user picked one), don't override
    if (hasInitialized.current) return;

    // If URL has session_id, let use-session-url handle session selection
    if (hasSessionIdInUrl()) {
      hasInitialized.current = true;
      return;
    }

    try {
      // 1. Try to find a registered project and its sessions
      try {
        const { registrations } = await api.getRegisteredProjects();
        if (registrations.length > 0) {
          const activeReg = registrations.find(r => r.project_status === "active") || registrations[0];
          setProjectId(activeReg.project_id);

          // Get sessions for this project (filtered by project_id)
          const { sessions } = await api.getProjectSessions(activeReg.project_id);

          if (sessions.length > 0) {
            // Only auto-select active sessions — completed sessions show the welcome screen
            const activeSession = sessions.find((s: Record<string, unknown>) => s.status === "active");
            if (activeSession) {
              const { session: fullSession } = await api.getSession(activeSession.id as string);
              setSession(fullSession);
              hasInitialized.current = true;
              return;
            }
          }

          // Project exists but has no sessions yet.
          // Keep polling so we auto-detect new sessions.
          return;
        }
      } catch {
        // Registry API not available — fall through to global fallback
      }

      // 2. Fallback: latest active session globally (no project filter)
      setProjectId(null);
      const { sessions } = await api.getSessions({ status: "active", limit: 1 });
      if (sessions.length > 0) {
        const { session: latestSession } = await api.getSession(sessions[0].id);
        setSession(latestSession);
        hasInitialized.current = true;
      }
      // No active sessions — keep polling (show welcome screen)
    } catch {
      // API not available - retry on next interval
    }
  }, [setSession, setProjectId]);

  useEffect(() => {
    loadSession();
    const interval = setInterval(loadSession, 15_000);
    return () => clearInterval(interval);
  }, [loadSession]);

  return { session, refreshSession: loadSession };
}
