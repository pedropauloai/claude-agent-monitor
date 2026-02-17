/**
 * Lazy loader for sprite data at different resolutions.
 * Uses dynamic import() to load only the active resolution file.
 */

import type { AgentPose } from '@cam/shared';
import type { SpriteResolution } from '../stores/settings-store.js';
import { clearSpriteCache } from '../services/sprite-renderer.js';

export type PixelData = [number, number, string][];

export interface SpriteDataModule {
  poses: Record<AgentPose, PixelData>;
  gridSize: number;
}

/** In-memory cache of loaded modules */
const moduleCache = new Map<SpriteResolution, SpriteDataModule>();

/** Track current resolution to detect changes */
let currentResolution: SpriteResolution | null = null;

/**
 * Load sprite data for a given resolution.
 * Uses dynamic import() so only the active resolution is bundled/loaded.
 * Falls back to 16x16 if the requested resolution is unavailable.
 */
export async function loadSpriteData(resolution: SpriteResolution): Promise<SpriteDataModule> {
  // If resolution changed, clear the canvas render cache
  if (currentResolution !== null && currentResolution !== resolution) {
    clearSpriteCache();
  }
  currentResolution = resolution;

  // Return cached module if available
  const cached = moduleCache.get(resolution);
  if (cached) return cached;

  let mod: SpriteDataModule;

  try {
    switch (resolution) {
      case '16x16': {
        const m = await import('./sprite-data-16.js');
        mod = { poses: m.SPRITE_POSES_16, gridSize: m.GRID_SIZE };
        break;
      }
      case '24x24': {
        const m24 = await import('./sprite-data-24.js');
        mod = { poses: m24.SPRITE_POSES_24, gridSize: m24.GRID_SIZE };
        break;
      }
      case '32x32': {
        const m32 = await import('./sprite-data-32.js');
        mod = { poses: m32.SPRITE_POSES_32, gridSize: m32.GRID_SIZE };
        break;
      }
      case '48x48': {
        const m48 = await import('./sprite-data-48.js');
        mod = { poses: m48.SPRITE_POSES_48, gridSize: m48.GRID_SIZE };
        break;
      }
      default:
        return loadSpriteData('16x16');
    }
  } catch {
    // If any import fails, fall back to 16x16
    if (resolution !== '16x16') {
      return loadSpriteData('16x16');
    }
    throw new Error('Failed to load base sprite data (16x16)');
  }

  moduleCache.set(resolution, mod);
  return mod;
}

/**
 * Get sprite data synchronously (only works if already loaded).
 * Returns null if the data hasn't been loaded yet.
 */
export function getSpriteDataSync(resolution: SpriteResolution): SpriteDataModule | null {
  return moduleCache.get(resolution) ?? null;
}

/**
 * Preload a resolution into cache (useful at app startup).
 */
export async function preloadSpriteData(resolution: SpriteResolution): Promise<void> {
  await loadSpriteData(resolution);
}
