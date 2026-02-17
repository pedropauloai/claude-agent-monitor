import { Router } from "express";
import type { Request, Response } from "express";
import { projectRegistryQueries, projectQueries } from "../db/queries.js";

export const registryRouter = Router();

interface RegistryRow {
  working_directory: string;
  project_id: string;
  registered_at: string;
  prd_path: string | null;
  hooks_installed: number;
  project_name?: string;
  project_status?: string;
}

// POST /api/registry - Register a working directory to a project
registryRouter.post("/", (req: Request, res: Response) => {
  try {
    const { working_directory, project_id, prd_path } = req.body as {
      working_directory?: string;
      project_id?: string;
      prd_path?: string;
    };

    if (!working_directory || !project_id) {
      res
        .status(400)
        .json({ error: "working_directory and project_id are required" });
      return;
    }

    // Verify project exists
    const project = projectQueries.getById().get(project_id) as
      | Record<string, unknown>
      | undefined;
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    projectRegistryQueries
      .register()
      .run(working_directory, project_id, prd_path || null, 0);

    const registered = projectRegistryQueries
      .getByWorkingDir()
      .get(working_directory) as RegistryRow | undefined;

    res.status(201).json({ registry: registered });
  } catch {
    res.status(500).json({ error: "Failed to register project" });
  }
});

// GET /api/registry/lookup?dir=<path> - Look up project by working directory
registryRouter.get("/lookup", (req: Request, res: Response) => {
  try {
    const dir = req.query["dir"] as string | undefined;
    if (!dir) {
      res.status(400).json({ error: "dir query parameter required" });
      return;
    }

    const registry = projectRegistryQueries
      .getByWorkingDir()
      .get(dir) as RegistryRow | undefined;

    if (!registry) {
      // Try prefix match
      const prefix = projectRegistryQueries
        .getByWorkingDirPrefix()
        .get(dir) as RegistryRow | undefined;

      if (prefix) {
        res.json({ registry: prefix });
        return;
      }

      res.status(404).json({ error: "Directory not registered" });
      return;
    }

    res.json({ registry });
  } catch {
    res.status(500).json({ error: "Failed to lookup registry" });
  }
});

// GET /api/registry - List all registrations
registryRouter.get("/", (_req: Request, res: Response) => {
  try {
    const registrations = projectRegistryQueries
      .getAll()
      .all() as RegistryRow[];

    res.json({ registrations });
  } catch {
    res.status(500).json({ error: "Failed to list registrations" });
  }
});

// DELETE /api/registry?dir=<path> - Remove a registration
registryRouter.delete("/", (req: Request, res: Response) => {
  try {
    const dir = req.query["dir"] as string | undefined;
    if (!dir) {
      res.status(400).json({ error: "dir query parameter required" });
      return;
    }

    projectRegistryQueries.delete().run(dir);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete registration" });
  }
});
