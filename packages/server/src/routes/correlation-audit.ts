import { Router } from "express";
import type { Request, Response } from "express";
import { correlationAuditQueries } from "../db/queries.js";

export const correlationAuditRouter = Router();

interface AuditRow {
  id: string;
  event_id: string;
  prd_task_id: string | null;
  session_id: string;
  agent_id: string;
  layer: string;
  score: number;
  matched: number;
  reason: string | null;
  timestamp: string;
  task_title?: string;
}

// GET /api/correlation-audit
correlationAuditRouter.get("/", (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query["limit"] as string) || 50;
    const offset = parseInt(req.query["offset"] as string) || 0;

    const rows = correlationAuditQueries
      .getRecent()
      .all(limit, offset) as AuditRow[];

    res.json({ entries: rows, limit, offset });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/correlation-audit/:eventId
correlationAuditRouter.get("/:eventId", (req: Request, res: Response) => {
  try {
    const eventId = req.params["eventId"]!;

    const rows = correlationAuditQueries
      .getByEvent()
      .all(eventId) as AuditRow[];

    res.json({ entries: rows });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});
