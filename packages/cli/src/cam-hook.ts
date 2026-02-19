#!/usr/bin/env node

/**
 * Thin wrapper that delegates to @claudecam/hook's entry point.
 * This ensures cam-hook is available in PATH when claudecam is installed globally.
 * The @claudecam/hook index.ts reads process.argv and stdin at module level.
 */
import "@claudecam/hook";
