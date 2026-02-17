import express from "express";
import cors from "cors";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_SERVER_PORT,
  DEFAULT_BIND_HOST,
  AGENT_IDLE_TIMEOUT_MS,
} from "@cam/shared";
import { initDb, closeDb } from "./db/index.js";
import { sseManager } from "./services/sse-manager.js";
import { agentQueries } from "./db/queries.js";
import { cleanupStaleSessions } from "./services/event-processor.js";

// Routes
import { eventsRouter } from "./routes/events.js";
import { sessionsRouter } from "./routes/sessions.js";
import { agentsRouter } from "./routes/agents.js";
import { filesRouter } from "./routes/files.js";
import { statsRouter } from "./routes/stats.js";
import { streamRouter } from "./routes/stream.js";
import { projectsRouter } from "./routes/projects.js";
import { sprintsRouter } from "./routes/sprints.js";
import { tasksRouter } from "./routes/tasks.js";
import { parsePrdRouter } from "./routes/parse-prd.js";
import { correlationAuditRouter } from "./routes/correlation-audit.js";
import { registryRouter } from "./routes/registry.js";
import { getSessionsForProject } from "./services/project-router.js";

export function createApp() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      connections: sseManager.getConnectionCount(),
    });
  });

  // Pilar 1 routes
  app.use("/api/events", eventsRouter);
  app.use("/api/sessions", sessionsRouter);
  app.use("/api/sessions", agentsRouter); // /api/sessions/:id/agents
  app.use("/api/sessions", filesRouter); // /api/sessions/:id/files
  app.use("/api/sessions", statsRouter); // /api/sessions/:id/stats
  app.use("/api/sessions", eventsRouter); // /api/sessions/:id/events (mounted on eventsRouter)
  app.use("/api/stream", streamRouter);

  // Correlation audit log
  app.use("/api/correlation-audit", correlationAuditRouter);

  // Project registry (Sprint 8 - Project-First Architecture)
  app.use("/api/registry", registryRouter);

  // Pilar 2 routes
  app.use("/api/projects", projectsRouter);
  app.use("/api/projects", sprintsRouter); // /api/projects/:id/sprints
  app.use("/api/projects", tasksRouter); // /api/projects/:id/tasks
  app.use("/api/parse-prd", parsePrdRouter);

  // Serve dashboard static files in production mode
  const dashboardPath = process.env["CAM_DASHBOARD_PATH"];
  if (dashboardPath && existsSync(dashboardPath)) {
    app.use(express.static(dashboardPath));
    // SPA fallback: serve index.html for non-API routes
    app.get("*", (_req, res) => {
      res.sendFile(join(dashboardPath, "index.html"));
    });
  }

  return app;
}

export function startServer(options?: { port?: number; dbPath?: string }) {
  const port = options?.port ?? DEFAULT_SERVER_PORT;

  // Initialize database
  initDb(options?.dbPath);

  const app = createApp();

  // Connect SSE Manager to Project Router for project-level filtering
  sseManager.setProjectSessionResolver(getSessionsForProject);

  const bindHost = process.env["CAM_BIND_HOST"] || DEFAULT_BIND_HOST;
  const server = app.listen(port, bindHost, () => {
    console.log(
      `Claude Agent Monitor server running at http://${bindHost}:${port}`,
    );
    console.log(`  API:    http://localhost:${port}/api/health`);
    console.log(`  SSE:    http://localhost:${port}/api/stream`);
    console.log(`  Events: POST http://localhost:${port}/api/events`);
  });

  // Idle detection: periodically check for agents that went stale
  const idleCheckInterval = setInterval(() => {
    try {
      const cutoff = new Date(Date.now() - AGENT_IDLE_TIMEOUT_MS).toISOString();
      const staleAgents = agentQueries.getActiveStale().all(cutoff) as Array<
        Record<string, unknown>
      >;

      for (const agent of staleAgents) {
        const agentId = agent["id"] as string;
        const sessionId = agent["session_id"] as string;
        const now = new Date().toISOString();

        agentQueries.updateStatus().run("idle", now, agentId, sessionId);
        sseManager.broadcast(
          "agent_status",
          {
            agent: agentId,
            sessionId,
            status: "idle",
            previousStatus: "active",
          },
          sessionId,
        );
      }
    } catch {
      // DB not ready yet or query error, skip silently
    }
  }, AGENT_IDLE_TIMEOUT_MS);

  // Stale session cleanup: mark sessions with no activity in 10 minutes as completed
  const staleCleanupInterval = setInterval(cleanupStaleSessions, 60_000);

  // Graceful shutdown
  const shutdown = () => {
    console.log("\nShutting down...");
    clearInterval(idleCheckInterval);
    clearInterval(staleCleanupInterval);
    sseManager.shutdown();
    server.close(() => {
      closeDb();
      process.exit(0);
    });

    // Force exit after 5 seconds
    setTimeout(() => {
      process.exit(1);
    }, 5000);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return server;
}

// Start server when run directly
const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith("index.ts") ||
    process.argv[1].endsWith("index.js"));

if (isMain) {
  const port = parseInt(process.env["CAM_PORT"] || "") || DEFAULT_SERVER_PORT;
  const dbPath = process.env["CAM_DB_PATH"] || undefined;
  startServer({ port, dbPath });
}
