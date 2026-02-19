import { Router } from 'express';
import type { Request, Response, Router as RouterType } from 'express';
import { parsePrdRequestSchema } from '@claudecam/shared';
import { parsePrd } from '../services/prd-parser.js';

export const parsePrdRouter: RouterType = Router();

// POST /api/parse-prd - Parse a PRD without creating a project
parsePrdRouter.post('/', (req: Request, res: Response) => {
  try {
    const parsed = parsePrdRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      return;
    }

    const { content, method } = parsed.data;
    const result = parsePrd(content, method);

    res.json({
      sections: result.sections.map(s => ({
        title: s.title,
        level: s.level,
        taskCount: 0,
      })),
      suggested_tasks: result.suggestedTasks.map(t => ({
        title: t.title,
        description: t.description,
        priority: t.priority,
        complexity: t.complexity,
        dependsOn: t.dependsOn,
        prdSection: t.prdSection,
        prdLineStart: t.prdLineStart,
        prdLineEnd: t.prdLineEnd,
      })),
      suggested_sprints: result.suggestedSprints,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
