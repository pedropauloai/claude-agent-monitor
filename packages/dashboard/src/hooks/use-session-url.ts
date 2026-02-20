import { useEffect, useRef } from 'react';
import { useSessionStore } from '../stores/session-store.js';
import * as api from '../lib/api.js';

/**
 * Hook that syncs the active session with the `session_id` URL parameter.
 *
 * - On mount (once): reads `session_id` from URL and loads that session.
 *   Supports both full UUIDs and short 8-char prefixes.
 * - When the active session changes: updates URL via `history.replaceState`.
 *
 * Uses short 8-char IDs in the URL for readability (e.g., ?session_id=684bddbc).
 */
export function useSessionUrl() {
  const { session, setSession } = useSessionStore();
  const initialSyncDone = useRef(false);

  // URL -> store: once on mount, load session from URL param
  useEffect(() => {
    if (initialSyncDone.current) return;
    initialSyncDone.current = true;

    const params = new URLSearchParams(window.location.search);
    const sessionIdParam = params.get('session_id');
    if (!sessionIdParam) return;

    // Try to load the session directly (works for full UUIDs)
    loadSessionFromUrl(sessionIdParam);
  }, []);

  // store -> URL: when active session changes, update URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (!session) {
      // Session cleared (e.g. project switch) — remove session_id from URL
      if (params.has('session_id')) {
        params.delete('session_id');
        const qs = params.toString();
        window.history.replaceState({}, '', qs ? `?${qs}` : window.location.pathname);
      }
      return;
    }

    const shortId = session.id.slice(0, 8);
    const currentParam = params.get('session_id');

    // Only update if different (avoid unnecessary replaceState)
    if (currentParam !== shortId) {
      params.set('session_id', shortId);
      window.history.replaceState({}, '', `?${params.toString()}`);
    }
  }, [session?.id]);
}

async function loadSessionFromUrl(sessionIdParam: string) {
  const { setSession } = useSessionStore.getState();

  // If it looks like a full UUID, load directly
  if (sessionIdParam.length > 8) {
    try {
      const { session } = await api.getSession(sessionIdParam);
      if (session) {
        setSession(session);
        return;
      }
    } catch {
      // Session not found, try prefix search below
    }
  }

  // Short ID: search recent sessions for a prefix match
  try {
    const { sessions } = await api.getSessions({ limit: 50 });
    const match = sessions.find((s: { id: string }) =>
      s.id.startsWith(sessionIdParam)
    );
    if (match) {
      const { session } = await api.getSession(match.id);
      if (session) {
        setSession(session);
      }
    }
  } catch {
    // API not available
  }
}
