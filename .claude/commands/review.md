Review recent code changes for quality and CAM conventions:

1. Run `git diff` to see uncommitted changes (or `git diff HEAD~1` for last commit)
2. For each changed file, check:
   - ESM imports with .js extensions
   - Types from @claudecam/shared (not duplicated locally)
   - No `any` types
   - No secrets or hardcoded credentials
   - SQL queries are parameterized (no string concatenation)
   - Dashboard components follow existing Zustand store patterns
3. Run `pnpm typecheck` to catch type errors
4. Report findings organized by severity: critical, warning, suggestion
