/**
 * Pixel art sprite data for Mission Floor v2.
 * Re-exports from the resolution-specific data files for backward compatibility.
 *
 * Color key:
 *   'P' = primary (agent palette color)
 *   'S' = secondary (darker shade)
 *   'D' = dark outline (#1a1a2e)
 *   'E' = eye color (white)
 *   'K' = skin (#ffd5b4)
 *   'H' = highlight/accent (lighter shade)
 *   'G' = gray (tool/item color #9ca3af)
 *   'W' = white (#ffffff)
 *   'B' = screen/glow blue (#60a5fa)
 */

import type { AgentPose } from '@cam/shared';
import { SPRITE_POSES_16 } from '../../data/sprite-data-16.js';

type PixelData = [number, number, string][];

// Re-export 16x16 poses as the default SPRITE_POSES
export const SPRITE_POSES: Record<AgentPose, PixelData> = SPRITE_POSES_16;

// Legacy compatibility
export type SpriteFrame = 'idle' | 'working' | 'shutdown';
export const SPRITE_FRAMES: Record<SpriteFrame, PixelData> = {
  idle: SPRITE_POSES_16.idle,
  working: SPRITE_POSES_16.coding,
  shutdown: SPRITE_POSES_16.idle, // shutdown uses idle pose + zzZ overlay
};

/**
 * Generate CSS box-shadow string from pixel data.
 * Supports extended color palette for Mission Floor v2.
 */
export function generateBoxShadow(
  frame: PixelData,
  primaryColor: string,
  pixelSize: number = 2
): string {
  const secondaryColor = darkenColor(primaryColor, 0.3);
  const accentColor = lightenColor(primaryColor, 0.3);
  const outlineColor = '#1a1a2e';
  const eyeColor = '#ffffff';
  const skinColor = '#ffd5b4';
  const grayColor = '#9ca3af';
  const whiteColor = '#ffffff';
  const blueColor = '#60a5fa';

  const colorMap: Record<string, string> = {
    P: primaryColor,
    S: secondaryColor,
    H: accentColor,
    D: outlineColor,
    E: eyeColor,
    K: skinColor,
    G: grayColor,
    W: whiteColor,
    B: blueColor,
  };

  return frame
    .map(([x, y, c]) => {
      const color = colorMap[c] || primaryColor;
      return `${x * pixelSize}px ${y * pixelSize}px 0 0 ${color}`;
    })
    .join(', ');
}

/**
 * Generate box-shadow for a specific pose with a given palette.
 */
export function generatePoseBoxShadow(
  pose: AgentPose,
  primaryColor: string,
  pixelSize: number = 2
): string {
  const data = SPRITE_POSES[pose];
  return generateBoxShadow(data, primaryColor, pixelSize);
}

/**
 * Darken a hex/hsl color by a factor.
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

/**
 * Lighten a hex color by a factor (move toward white).
 */
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
