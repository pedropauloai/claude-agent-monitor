/**
 * 16x16 pixel art sprite data for Mission Floor v2.
 * Original resolution - the "Classic" sprite set.
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

export type PixelData = [number, number, string][];

// === 8 POSE SPRITES ===

// IDLE: Relaxed standing, arms at sides, breathing feel
const POSE_IDLE: PixelData = [
  // Hat/hair (row 2-4)
  [6, 2, 'P'], [7, 2, 'P'], [8, 2, 'P'], [9, 2, 'P'],
  [5, 3, 'P'], [6, 3, 'S'], [7, 3, 'S'], [8, 3, 'S'], [9, 3, 'S'], [10, 3, 'P'],
  [5, 4, 'P'], [6, 4, 'P'], [7, 4, 'P'], [8, 4, 'P'], [9, 4, 'P'], [10, 4, 'P'],
  // Face (row 5-7)
  [6, 5, 'K'], [7, 5, 'K'], [8, 5, 'K'], [9, 5, 'K'],
  [5, 6, 'K'], [6, 6, 'E'], [7, 6, 'K'], [8, 6, 'K'], [9, 6, 'E'], [10, 6, 'K'],
  [6, 7, 'K'], [7, 7, 'K'], [8, 7, 'K'], [9, 7, 'K'],
  // Body (row 8-11) - arms at sides
  [6, 8, 'P'], [7, 8, 'P'], [8, 8, 'P'], [9, 8, 'P'],
  [5, 9, 'P'], [6, 9, 'P'], [7, 9, 'S'], [8, 9, 'S'], [9, 9, 'P'], [10, 9, 'P'],
  [5, 10, 'K'], [6, 10, 'P'], [7, 10, 'P'], [8, 10, 'P'], [9, 10, 'P'], [10, 10, 'K'],
  [6, 11, 'P'], [7, 11, 'P'], [8, 11, 'P'], [9, 11, 'P'],
  // Legs (row 12-13)
  [6, 12, 'S'], [7, 12, 'S'], [8, 12, 'S'], [9, 12, 'S'],
  [5, 13, 'D'], [6, 13, 'D'], [9, 13, 'D'], [10, 13, 'D'],
];

// CODING: Typing at keyboard, arms forward, slight lean
const POSE_CODING: PixelData = [
  // Hat/hair (row 2-4) - slight forward tilt
  [7, 2, 'P'], [8, 2, 'P'], [9, 2, 'P'], [10, 2, 'P'],
  [6, 3, 'P'], [7, 3, 'S'], [8, 3, 'S'], [9, 3, 'S'], [10, 3, 'S'], [11, 3, 'P'],
  [6, 4, 'P'], [7, 4, 'P'], [8, 4, 'P'], [9, 4, 'P'], [10, 4, 'P'], [11, 4, 'P'],
  // Face (row 5-7) - focused, looking at screen
  [7, 5, 'K'], [8, 5, 'K'], [9, 5, 'K'], [10, 5, 'K'],
  [6, 6, 'K'], [7, 6, 'E'], [8, 6, 'K'], [9, 6, 'K'], [10, 6, 'E'], [11, 6, 'K'],
  [7, 7, 'K'], [8, 7, 'D'], [9, 7, 'K'], [10, 7, 'K'],
  // Body (row 8-11) - arms extended forward to keyboard
  [7, 8, 'P'], [8, 8, 'P'], [9, 8, 'P'], [10, 8, 'P'],
  [6, 9, 'P'], [7, 9, 'S'], [8, 9, 'S'], [9, 9, 'P'], [10, 9, 'P'], [11, 9, 'P'],
  [4, 10, 'K'], [5, 10, 'K'], [7, 10, 'P'], [8, 10, 'P'], [9, 10, 'P'], [11, 10, 'K'], [12, 10, 'K'],
  [3, 11, 'G'], [4, 11, 'G'], [5, 11, 'G'], [7, 11, 'P'], [8, 11, 'P'], [11, 11, 'G'], [12, 11, 'G'], [13, 11, 'G'],
  // Screen glow (small screen in front)
  [2, 9, 'B'], [3, 9, 'B'], [4, 9, 'B'],
  [2, 10, 'B'], [3, 10, 'B'], [4, 10, 'B'],
  // Legs (row 12-13)
  [7, 12, 'S'], [8, 12, 'S'], [9, 12, 'S'], [10, 12, 'S'],
  [6, 13, 'D'], [7, 13, 'D'], [10, 13, 'D'], [11, 13, 'D'],
];

// READING: Holding document up, examining it
const POSE_READING: PixelData = [
  // Hat/hair (row 2-4)
  [6, 2, 'P'], [7, 2, 'P'], [8, 2, 'P'], [9, 2, 'P'],
  [5, 3, 'P'], [6, 3, 'S'], [7, 3, 'S'], [8, 3, 'S'], [9, 3, 'S'], [10, 3, 'P'],
  [5, 4, 'P'], [6, 4, 'P'], [7, 4, 'P'], [8, 4, 'P'], [9, 4, 'P'], [10, 4, 'P'],
  // Face (row 5-7) - looking right at document
  [6, 5, 'K'], [7, 5, 'K'], [8, 5, 'K'], [9, 5, 'K'],
  [5, 6, 'K'], [6, 6, 'K'], [7, 6, 'E'], [8, 6, 'K'], [9, 6, 'K'], [10, 6, 'E'],
  [6, 7, 'K'], [7, 7, 'K'], [8, 7, 'K'], [9, 7, 'K'],
  // Body (row 8-11) - right arm holding document up
  [6, 8, 'P'], [7, 8, 'P'], [8, 8, 'P'], [9, 8, 'P'],
  [5, 9, 'P'], [6, 9, 'P'], [7, 9, 'S'], [8, 9, 'S'], [9, 9, 'P'], [10, 9, 'P'],
  [5, 10, 'K'], [6, 10, 'P'], [7, 10, 'P'], [8, 10, 'P'], [9, 10, 'P'], [11, 10, 'K'],
  [6, 11, 'P'], [7, 11, 'P'], [8, 11, 'P'], [9, 11, 'P'],
  // Document held in right hand
  [11, 5, 'W'], [12, 5, 'W'], [13, 5, 'W'],
  [11, 6, 'W'], [12, 6, 'G'], [13, 6, 'W'],
  [11, 7, 'W'], [12, 7, 'G'], [13, 7, 'W'],
  [11, 8, 'W'], [12, 8, 'G'], [13, 8, 'W'],
  [11, 9, 'W'], [12, 9, 'W'], [13, 9, 'W'],
  // Legs (row 12-13)
  [6, 12, 'S'], [7, 12, 'S'], [8, 12, 'S'], [9, 12, 'S'],
  [5, 13, 'D'], [6, 13, 'D'], [9, 13, 'D'], [10, 13, 'D'],
];

// TERMINAL: Standing at console, one arm on keyboard, screen glowing
const POSE_TERMINAL: PixelData = [
  // Hat/hair (row 2-4)
  [6, 2, 'P'], [7, 2, 'P'], [8, 2, 'P'], [9, 2, 'P'],
  [5, 3, 'P'], [6, 3, 'S'], [7, 3, 'S'], [8, 3, 'S'], [9, 3, 'S'], [10, 3, 'P'],
  [5, 4, 'P'], [6, 4, 'P'], [7, 4, 'P'], [8, 4, 'P'], [9, 4, 'P'], [10, 4, 'P'],
  // Face (row 5-7) - looking at terminal screen (left)
  [6, 5, 'K'], [7, 5, 'K'], [8, 5, 'K'], [9, 5, 'K'],
  [5, 6, 'E'], [6, 6, 'K'], [7, 6, 'K'], [8, 6, 'K'], [9, 6, 'E'], [10, 6, 'K'],
  [6, 7, 'K'], [7, 7, 'K'], [8, 7, 'K'], [9, 7, 'K'],
  // Body (row 8-11) - left arm extended to terminal
  [6, 8, 'P'], [7, 8, 'P'], [8, 8, 'P'], [9, 8, 'P'],
  [4, 9, 'K'], [5, 9, 'P'], [6, 9, 'P'], [7, 9, 'S'], [8, 9, 'S'], [9, 9, 'P'], [10, 9, 'P'],
  [3, 10, 'K'], [6, 10, 'P'], [7, 10, 'P'], [8, 10, 'P'], [9, 10, 'P'], [10, 10, 'K'],
  [6, 11, 'P'], [7, 11, 'P'], [8, 11, 'P'], [9, 11, 'P'],
  // Terminal screen (left side)
  [1, 7, 'G'], [2, 7, 'G'], [3, 7, 'G'], [4, 7, 'G'],
  [1, 8, 'G'], [2, 8, 'B'], [3, 8, 'B'], [4, 8, 'G'],
  [1, 9, 'G'], [2, 9, 'B'], [3, 9, 'B'], [4, 9, 'G'],
  [1, 10, 'G'], [2, 10, 'G'], [3, 10, 'G'], [4, 10, 'G'],
  // Terminal prompt >_
  [2, 11, 'G'], [3, 11, 'G'],
  // Legs (row 12-13)
  [6, 12, 'S'], [7, 12, 'S'], [8, 12, 'S'], [9, 12, 'S'],
  [5, 13, 'D'], [6, 13, 'D'], [9, 13, 'D'], [10, 13, 'D'],
];

// TALKING: One arm gesturing outward, mouth open
const POSE_TALKING: PixelData = [
  // Hat/hair (row 2-4)
  [6, 2, 'P'], [7, 2, 'P'], [8, 2, 'P'], [9, 2, 'P'],
  [5, 3, 'P'], [6, 3, 'S'], [7, 3, 'S'], [8, 3, 'S'], [9, 3, 'S'], [10, 3, 'P'],
  [5, 4, 'P'], [6, 4, 'P'], [7, 4, 'P'], [8, 4, 'P'], [9, 4, 'P'], [10, 4, 'P'],
  // Face (row 5-7) - mouth open (talking)
  [6, 5, 'K'], [7, 5, 'K'], [8, 5, 'K'], [9, 5, 'K'],
  [5, 6, 'K'], [6, 6, 'E'], [7, 6, 'K'], [8, 6, 'K'], [9, 6, 'E'], [10, 6, 'K'],
  [6, 7, 'K'], [7, 7, 'D'], [8, 7, 'D'], [9, 7, 'K'],
  // Body (row 8-11) - right arm extended outward gesturing
  [6, 8, 'P'], [7, 8, 'P'], [8, 8, 'P'], [9, 8, 'P'],
  [5, 9, 'P'], [6, 9, 'P'], [7, 9, 'S'], [8, 9, 'S'], [9, 9, 'P'], [10, 9, 'P'],
  [5, 10, 'K'], [6, 10, 'P'], [7, 10, 'P'], [8, 10, 'P'], [9, 10, 'P'], [10, 10, 'P'], [11, 10, 'K'],
  [6, 11, 'P'], [7, 11, 'P'], [8, 11, 'P'], [9, 11, 'P'], [12, 11, 'K'],
  // Speech indicator (small dots going right)
  [13, 10, 'H'], [14, 9, 'H'], [15, 8, 'H'],
  // Legs (row 12-13)
  [6, 12, 'S'], [7, 12, 'S'], [8, 12, 'S'], [9, 12, 'S'],
  [5, 13, 'D'], [6, 13, 'D'], [9, 13, 'D'], [10, 13, 'D'],
];

// SEARCHING: Holding magnifying glass, leaning forward
const POSE_SEARCHING: PixelData = [
  // Hat/hair (row 2-4) - leaning forward
  [7, 2, 'P'], [8, 2, 'P'], [9, 2, 'P'], [10, 2, 'P'],
  [6, 3, 'P'], [7, 3, 'S'], [8, 3, 'S'], [9, 3, 'S'], [10, 3, 'S'], [11, 3, 'P'],
  [6, 4, 'P'], [7, 4, 'P'], [8, 4, 'P'], [9, 4, 'P'], [10, 4, 'P'], [11, 4, 'P'],
  // Face (row 5-7) - squinting/focused
  [7, 5, 'K'], [8, 5, 'K'], [9, 5, 'K'], [10, 5, 'K'],
  [6, 6, 'K'], [7, 6, 'E'], [8, 6, 'K'], [9, 6, 'K'], [10, 6, 'E'], [11, 6, 'K'],
  [7, 7, 'K'], [8, 7, 'K'], [9, 7, 'K'], [10, 7, 'K'],
  // Body (row 8-11)
  [7, 8, 'P'], [8, 8, 'P'], [9, 8, 'P'], [10, 8, 'P'],
  [6, 9, 'P'], [7, 9, 'P'], [8, 9, 'S'], [9, 9, 'S'], [10, 9, 'P'], [11, 9, 'P'],
  [6, 10, 'K'], [7, 10, 'P'], [8, 10, 'P'], [9, 10, 'P'], [10, 10, 'P'], [11, 10, 'K'],
  [7, 11, 'P'], [8, 11, 'P'], [9, 11, 'P'], [10, 11, 'P'],
  // Magnifying glass (right hand, held forward)
  [12, 6, 'G'], [13, 5, 'G'], [14, 5, 'G'], [15, 5, 'G'],
  [12, 7, 'G'], [13, 6, 'W'], [14, 6, 'W'], [15, 6, 'G'],
  [13, 7, 'W'], [14, 7, 'W'], [15, 7, 'G'],
  [13, 8, 'G'], [14, 8, 'G'], [15, 8, 'G'],
  // Legs (row 12-13) - one step forward
  [7, 12, 'S'], [8, 12, 'S'], [9, 12, 'S'], [10, 12, 'S'],
  [7, 13, 'D'], [8, 13, 'D'], [10, 13, 'D'], [11, 13, 'D'],
];

// MANAGING: Holding clipboard, standing upright, professional
const POSE_MANAGING: PixelData = [
  // Hat/hair (row 2-4)
  [6, 2, 'P'], [7, 2, 'P'], [8, 2, 'P'], [9, 2, 'P'],
  [5, 3, 'P'], [6, 3, 'S'], [7, 3, 'S'], [8, 3, 'S'], [9, 3, 'S'], [10, 3, 'P'],
  [5, 4, 'P'], [6, 4, 'P'], [7, 4, 'P'], [8, 4, 'P'], [9, 4, 'P'], [10, 4, 'P'],
  // Face (row 5-7) - confident look
  [6, 5, 'K'], [7, 5, 'K'], [8, 5, 'K'], [9, 5, 'K'],
  [5, 6, 'K'], [6, 6, 'E'], [7, 6, 'K'], [8, 6, 'K'], [9, 6, 'E'], [10, 6, 'K'],
  [6, 7, 'K'], [7, 7, 'K'], [8, 7, 'K'], [9, 7, 'K'],
  // Body (row 8-11) - left arm holding clipboard against body
  [6, 8, 'P'], [7, 8, 'P'], [8, 8, 'P'], [9, 8, 'P'],
  [5, 9, 'P'], [6, 9, 'P'], [7, 9, 'S'], [8, 9, 'S'], [9, 9, 'P'], [10, 9, 'P'],
  [4, 10, 'K'], [5, 10, 'P'], [6, 10, 'P'], [7, 10, 'P'], [8, 10, 'P'], [9, 10, 'P'], [10, 10, 'K'],
  [6, 11, 'P'], [7, 11, 'P'], [8, 11, 'P'], [9, 11, 'P'],
  // Clipboard (held against left side of body)
  [2, 8, 'G'], [3, 8, 'G'], [4, 8, 'G'],
  [2, 9, 'W'], [3, 9, 'W'], [4, 9, 'W'],
  [2, 10, 'W'], [3, 10, 'G'], [4, 10, 'W'],
  [2, 11, 'W'], [3, 11, 'G'], [4, 11, 'W'],
  [2, 12, 'W'], [3, 12, 'W'], [4, 12, 'W'],
  // Checkmarks on clipboard
  [3, 9, 'H'],
  // Legs (row 12-13)
  [6, 12, 'S'], [7, 12, 'S'], [8, 12, 'S'], [9, 12, 'S'],
  [5, 13, 'D'], [6, 13, 'D'], [9, 13, 'D'], [10, 13, 'D'],
];

// CELEBRATING: Arms up in V, jumping, wide stance
const POSE_CELEBRATING: PixelData = [
  // Hat/hair (row 1-3) - higher up (jumping)
  [6, 1, 'P'], [7, 1, 'P'], [8, 1, 'P'], [9, 1, 'P'],
  [5, 2, 'P'], [6, 2, 'S'], [7, 2, 'S'], [8, 2, 'S'], [9, 2, 'S'], [10, 2, 'P'],
  [5, 3, 'P'], [6, 3, 'P'], [7, 3, 'P'], [8, 3, 'P'], [9, 3, 'P'], [10, 3, 'P'],
  // Face (row 4-6) - big smile
  [6, 4, 'K'], [7, 4, 'K'], [8, 4, 'K'], [9, 4, 'K'],
  [5, 5, 'K'], [6, 5, 'E'], [7, 5, 'K'], [8, 5, 'K'], [9, 5, 'E'], [10, 5, 'K'],
  [6, 6, 'K'], [7, 6, 'W'], [8, 6, 'W'], [9, 6, 'K'],
  // Body (row 7-9) - arms up in V shape
  [3, 6, 'K'], [4, 7, 'K'], [6, 7, 'P'], [7, 7, 'P'], [8, 7, 'P'], [9, 7, 'P'], [11, 7, 'K'], [12, 6, 'K'],
  [5, 8, 'P'], [6, 8, 'P'], [7, 8, 'S'], [8, 8, 'S'], [9, 8, 'P'], [10, 8, 'P'],
  [6, 9, 'P'], [7, 9, 'P'], [8, 9, 'P'], [9, 9, 'P'],
  // Legs (row 10-12) - wide jump stance, feet off ground
  [6, 10, 'S'], [7, 10, 'S'], [8, 10, 'S'], [9, 10, 'S'],
  [5, 11, 'S'], [6, 11, 'S'], [9, 11, 'S'], [10, 11, 'S'],
  [4, 12, 'D'], [5, 12, 'D'], [10, 12, 'D'], [11, 12, 'D'],
  // Stars/sparkles around
  [2, 3, 'H'], [13, 2, 'H'], [1, 8, 'H'], [14, 7, 'H'],
];

// === POSE MAP ===

export const SPRITE_POSES_16: Record<AgentPose, PixelData> = {
  idle: POSE_IDLE,
  coding: POSE_CODING,
  reading: POSE_READING,
  terminal: POSE_TERMINAL,
  talking: POSE_TALKING,
  searching: POSE_SEARCHING,
  managing: POSE_MANAGING,
  celebrating: POSE_CELEBRATING,
};

export const GRID_SIZE = 16;
