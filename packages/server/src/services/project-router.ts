import {
  projectRegistryQueries,
  sessionProjectBindingQueries,
} from "../db/queries.js";

/**
 * Project Router: Routes incoming events to the correct project
 * based on working_directory matching against the project registry.
 *
 * Matching strategy:
 *   1. Exact match on working_directory
 *   2. Prefix match (longest matching directory wins)
 *
 * This replaces the old session_groups approach with a simpler
 * project-first architecture where working_directory = project identifier.
 */

interface RegistryRow {
  working_directory: string;
  project_id: string;
  registered_at: string;
  prd_path: string | null;
  hooks_installed: number;
}

interface BindingRow {
  session_id: string;
  project_id: string;
  bound_at: string;
}

/**
 * Look up the project ID for a given working directory.
 * Tries exact match first, then prefix match.
 */
export function getProjectByWorkingDir(workingDir: string): string | null {
  const exact = projectRegistryQueries
    .getByWorkingDir()
    .get(workingDir) as RegistryRow | undefined;
  if (exact) return exact.project_id;

  const prefix = projectRegistryQueries
    .getByWorkingDirPrefix()
    .get(workingDir) as RegistryRow | undefined;
  if (prefix) return prefix.project_id;

  return null;
}

/**
 * Bind a session to a project based on working directory.
 * If the session is already bound, returns the existing project ID.
 * If the working directory is not registered, returns null.
 */
export function bindSessionToProject(
  sessionId: string,
  workingDirectory: string,
): string | null {
  const projectId = getProjectByWorkingDir(workingDirectory);
  if (!projectId) return null;

  const existing = sessionProjectBindingQueries
    .getBySession()
    .get(sessionId) as BindingRow | undefined;
  if (existing) return existing.project_id;

  const now = new Date().toISOString();
  sessionProjectBindingQueries.bind().run(sessionId, projectId, now);
  return projectId;
}

/**
 * Get the project ID for a session that is already bound.
 */
export function getProjectForSession(sessionId: string): string | null {
  const binding = sessionProjectBindingQueries
    .getBySession()
    .get(sessionId) as BindingRow | undefined;
  return binding ? binding.project_id : null;
}

/**
 * Get all session IDs that belong to a project.
 * Used by SSE Manager for project-level filtering.
 */
export function getSessionsForProject(projectId: string): string[] {
  const bindings = sessionProjectBindingQueries
    .getByProject()
    .all(projectId) as BindingRow[];
  return bindings.map((b) => b.session_id);
}
