/**
 * Canvas 2D sprite renderer with LRU cache.
 * Renders pixel art sprites to data URLs via OffscreenCanvas (with fallback).
 */

const MAX_CACHE_SIZE = 200;

/** LRU cache: Map maintains insertion order, we re-insert on access */
const spriteCache = new Map<string, string>();

/** Track access order for LRU eviction */
function cacheGet(key: string): string | undefined {
  const value = spriteCache.get(key);
  if (value !== undefined) {
    // Move to end (most recently used)
    spriteCache.delete(key);
    spriteCache.set(key, value);
  }
  return value;
}

function cacheSet(key: string, value: string): void {
  if (spriteCache.has(key)) {
    spriteCache.delete(key);
  } else if (spriteCache.size >= MAX_CACHE_SIZE) {
    // Evict least recently used (first entry)
    const firstKey = spriteCache.keys().next().value;
    if (firstKey !== undefined) {
      spriteCache.delete(firstKey);
    }
  }
  spriteCache.set(key, value);
}

/**
 * Simple hash for cache key generation.
 * Combines pose data identity, color, and sizes into a unique key.
 */
function buildCacheKey(
  poseId: string,
  gridSize: number,
  displaySize: number,
  primaryColor: string
): string {
  return `${poseId}:${gridSize}:${displaySize}:${primaryColor}`;
}

/** Feature detection for OffscreenCanvas */
let _canvasSupported: boolean | null = null;

export function isCanvasSupported(): boolean {
  if (_canvasSupported !== null) return _canvasSupported;

  try {
    if (typeof OffscreenCanvas !== 'undefined') {
      const test = new OffscreenCanvas(1, 1);
      const ctx = test.getContext('2d');
      _canvasSupported = ctx !== null;
    } else if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      _canvasSupported = ctx !== null;
    } else {
      _canvasSupported = false;
    }
  } catch {
    _canvasSupported = false;
  }

  return _canvasSupported;
}

/**
 * Color utilities (duplicated from sprite-data to avoid circular deps).
 */
function darkenColor(color: string, factor: number): string {
  if (color.startsWith('hsl')) {
    const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (match) {
      const h = parseInt(match[1]);
      const s = parseInt(match[2]);
      const l = Math.max(0, Math.round(parseInt(match[3]) * (1 - factor)));
      return `hsl(${h}, ${s}%, ${l}%)`;
    }
  }
  if (color.startsWith('#') && color.length >= 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const dr = Math.round(r * (1 - factor));
    const dg = Math.round(g * (1 - factor));
    const db = Math.round(b * (1 - factor));
    return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
  }
  return color;
}

function lightenColor(color: string, factor: number): string {
  if (color.startsWith('#') && color.length >= 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const lr = Math.min(255, Math.round(r + (255 - r) * factor));
    const lg = Math.min(255, Math.round(g + (255 - g) * factor));
    const lb = Math.min(255, Math.round(b + (255 - b) * factor));
    return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
  }
  return color;
}

/** Build color map from a primary color */
function buildColorMap(primaryColor: string): Record<string, string> {
  return {
    P: primaryColor,
    S: darkenColor(primaryColor, 0.3),
    H: lightenColor(primaryColor, 0.3),
    D: '#1a1a2e',
    E: '#ffffff',
    K: '#ffd5b4',
    G: '#9ca3af',
    W: '#ffffff',
    B: '#60a5fa',
  };
}

/** Parse color string to RGBA values for canvas fillStyle */
function resolveColor(colorKey: string, colorMap: Record<string, string>): string {
  return colorMap[colorKey] || colorMap['P'];
}

/**
 * Render pixel data to a data URL using Canvas 2D.
 *
 * @param pixels - Array of [x, y, colorKey] tuples (sparse pixel data)
 * @param gridSize - The grid dimension (e.g. 16 for 16x16)
 * @param displaySize - The output image size in CSS pixels (e.g. 96 for 16x16 at 6x scale)
 * @param primaryColor - The agent's primary palette color
 * @param poseId - Unique identifier for this pose (used in cache key)
 * @returns Data URL string (data:image/png;base64,...)
 */
export function renderSpriteToDataUrl(
  pixels: [number, number, string][],
  gridSize: number,
  displaySize: number,
  primaryColor: string,
  poseId: string = 'unknown'
): string {
  const cacheKey = buildCacheKey(poseId, gridSize, displaySize, primaryColor);

  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const colorMap = buildColorMap(primaryColor);
  const pixelScale = displaySize / gridSize;

  let canvas: HTMLCanvasElement | OffscreenCanvas;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

  try {
    if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(displaySize, displaySize);
      ctx = canvas.getContext('2d');
    } else {
      canvas = document.createElement('canvas');
      canvas.width = displaySize;
      canvas.height = displaySize;
      ctx = canvas.getContext('2d');
    }
  } catch {
    // Fallback to regular canvas
    canvas = document.createElement('canvas');
    canvas.width = displaySize;
    canvas.height = displaySize;
    ctx = canvas.getContext('2d');
  }

  if (!ctx) return '';

  // Disable image smoothing for crisp pixel art
  ctx.imageSmoothingEnabled = false;

  // Paint each pixel as a filled rectangle
  for (const [x, y, colorKey] of pixels) {
    ctx.fillStyle = resolveColor(colorKey, colorMap);
    ctx.fillRect(
      Math.round(x * pixelScale),
      Math.round(y * pixelScale),
      Math.ceil(pixelScale),
      Math.ceil(pixelScale)
    );
  }

  // Convert to data URL
  let dataUrl: string;
  if (canvas instanceof OffscreenCanvas) {
    // OffscreenCanvas doesn't have toDataURL, use convertToBlob workaround
    // For synchronous use, we draw onto a regular canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = displaySize;
    tempCanvas.height = displaySize;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.drawImage(canvas, 0, 0);
      dataUrl = tempCanvas.toDataURL('image/png');
    } else {
      dataUrl = '';
    }
  } else {
    dataUrl = canvas.toDataURL('image/png');
  }

  if (dataUrl) {
    cacheSet(cacheKey, dataUrl);
  }

  return dataUrl;
}

/** Clear the entire sprite cache (e.g. when resolution changes) */
export function clearSpriteCache(): void {
  spriteCache.clear();
}

/** Get current cache size (for debugging) */
export function getSpriteCacheSize(): number {
  return spriteCache.size;
}
