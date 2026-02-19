# Claude Agent Monitor (CAM)

Mission Control for Claude Code agents: real-time observability + visual PRD/Sprint tracking.

## Commands

```bash
pnpm dev          # Start all packages in dev mode (server:7890, dashboard:7891)
pnpm build        # Build all packages
pnpm typecheck    # Type-check all packages
pnpm lint         # Lint all packages
```

## Monorepo Structure

- `packages/shared` - Types, schemas (Zod), constants. MUST be built first.
- `packages/server` - Express + SQLite (better-sqlite3) + REST API + SSE on port 7890
- `packages/hook` - Ultra-light CLI binary. Uses ONLY native Node.js `http`. No dependencies.
- `packages/cli` - Commander.js CLI (`cam start`, `cam init`, `cam status`)
- `packages/dashboard` - React 19 + Vite + Tailwind CSS 4 + Zustand + Recharts + Framer Motion

## Code Style

- ESM only (`import/export`), never CommonJS. All imports use `.js` extension.
- Named exports only, no default exports (except React page components and App.tsx)
- TypeScript strict mode. No `any`. Use `unknown` + type guards.
- Shared types live in `@claudecam/shared`. NEVER duplicate types across packages.
- `@claudecam/hook` MUST remain zero-dependency (only native Node.js modules).

## Architecture Rules

- **SSE** for real-time server->dashboard. Never WebSockets.
- **SQLite WAL mode** for concurrent reads. All DB access through `packages/server/src/db/queries.ts`.
- **Zustand** for state. One store per domain: `session-store`, `project-store`, `theme-store`, `filter-store`, `kanban-store`.
- Dashboard proxies `/api/*` to server via Vite config.
- Three themes: `modern` (default), `pixel`, `terminal`. Components in `packages/dashboard/src/components/themes/{theme}/`.

## Testing

- Run single test: `pnpm --filter @claudecam/server test -- --grep "pattern"`
- Prefer integration tests over unit tests with heavy mocking.
- Test files colocated as `*.test.ts` next to source.

## Git

- Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- Branch naming: `feat/description`, `fix/description`
- NEVER commit `.env`, `*.sqlite`, `*.sqlite-wal`, `*.sqlite-shm`

## Critical Gotchas

- IMPORTANT: `@claudecam/shared` must be built before any other package. Run `pnpm --filter @claudecam/shared build` if you get import errors.
- IMPORTANT: `better-sqlite3` needs native binaries. If install fails, run `pnpm rebuild better-sqlite3`.
- IMPORTANT: Task status `pending` maps to Kanban column `planned`. Status `deferred` maps to `backlog`.
- Dashboard fetches data via polling (15s intervals). SSE is for real-time agent events only.
- Windows/MSYS2: Use forward slashes in paths. `fileURLToPath()` for `import.meta.url` conversions.

## References

- PRD.md - full project specification (read manually when needed, not auto-loaded)
- @packages/shared/src/types/ for all data models
- @packages/server/src/db/schema.sql for database schema
