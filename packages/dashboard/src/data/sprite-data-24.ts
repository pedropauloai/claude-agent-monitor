/**
 * 24x24 "Detailed" pixel art sprite data.
 * Upscaled from 16x16 with added detail: clearer facial features,
 * visible tools/accessories, smoother body proportions.
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

// Helper: convert a grid-string layout to sparse PixelData
function fromGrid(rows: string[]): PixelData {
  const pixels: PixelData = [];
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const c = rows[y][x];
      if (c !== ' ') {
        pixels.push([x, y, c]);
      }
    }
  }
  return pixels;
}

// IDLE: Relaxed standing, arms at sides
const POSE_IDLE: PixelData = fromGrid([
  //         111111111122222
  //123456789012345678901234
  '                        ', // 0
  '                        ', // 1
  '        PPPPP           ', // 2
  '       PSSSSP           ', // 3
  '       PPPPPP           ', // 4
  '       PPPPPP           ', // 5
  '       KKKKKK           ', // 6
  '      KKEKKEKK          ', // 7
  '      KKKKKKK           ', // 8
  '       KKKKKK           ', // 9
  '       PPPPPP           ', // 10
  '      PPSSSSPP          ', // 11
  '     KPPPPPPPPK         ', // 12
  '     KPPPPPPPPK         ', // 13
  '      PPPPPPPP          ', // 14
  '       PPPPPP           ', // 15
  '       SSSSSS           ', // 16
  '       SSSSSS           ', // 17
  '      DD  DD            ', // 18
  '      DD  DD            ', // 19
  '                        ', // 20
  '                        ', // 21
  '                        ', // 22
  '                        ', // 23
]);

// CODING: Typing at keyboard, arms forward
const POSE_CODING: PixelData = fromGrid([
  '                        ', // 0
  '                        ', // 1
  '         PPPPP          ', // 2
  '        PSSSSP          ', // 3
  '        PPPPPP          ', // 4
  '        PPPPPP          ', // 5
  '        KKKKKK          ', // 6
  '       KKEKKEKK         ', // 7
  '        KKDKKK          ', // 8
  '        KKKKKK          ', // 9
  '        PPPPPP          ', // 10
  '       PPSSSSPP         ', // 11
  '   KK PPPPPPPP KK      ', // 12
  '   KK PPPPPPPP KK      ', // 13
  '  GGGG PPPPPP GGGG     ', // 14
  '  GGGG  PPPP  GGGG     ', // 15
  ' BBB    SSSSSS         ', // 16
  ' BBB    SSSSSS         ', // 17
  '        DD  DD         ', // 18
  '       DD  DD          ', // 19
  '                        ', // 20
  '                        ', // 21
  '                        ', // 22
  '                        ', // 23
]);

// READING: Holding document, looking right
const POSE_READING: PixelData = fromGrid([
  '                        ', // 0
  '                        ', // 1
  '        PPPPP           ', // 2
  '       PSSSSP           ', // 3
  '       PPPPPP           ', // 4
  '       PPPPPP           ', // 5
  '       KKKKKK           ', // 6
  '      KKKEKKEKK         ', // 7
  '       KKKKKKK          ', // 8
  '       KKKKKK           ', // 9
  '       PPPPPP           ', // 10
  '      PPSSSSPP          ', // 11
  '     KPPPPPPPP K        ', // 12
  '      PPPPPPPP K        ', // 13
  '       PPPPPP   WWW     ', // 14
  '       PPPPPP   WGW     ', // 15
  '       SSSSSS   WGW     ', // 16
  '       SSSSSS   WGW     ', // 17
  '      DD  DD    WWW     ', // 18
  '      DD  DD            ', // 19
  '                        ', // 20
  '                        ', // 21
  '                        ', // 22
  '                        ', // 23
]);

// TERMINAL: Standing at console, screen glowing left
const POSE_TERMINAL: PixelData = fromGrid([
  '                        ', // 0
  '                        ', // 1
  '        PPPPP           ', // 2
  '       PSSSSP           ', // 3
  '       PPPPPP           ', // 4
  '       PPPPPP           ', // 5
  '       KKKKKK           ', // 6
  '      EKKKKKEK          ', // 7
  '       KKKKKK           ', // 8
  '       KKKKKK           ', // 9
  '       PPPPPP           ', // 10
  '    K PPSSSSPP          ', // 11
  '   K  PPPPPPPPK         ', // 12
  '      PPPPPPPPK         ', // 13
  '       PPPPPP           ', // 14
  ' GGGGG PPPPPP           ', // 15
  ' GBBG   SSSSSS          ', // 16
  ' GBBG   SSSSSS          ', // 17
  ' GGGGG DD  DD           ', // 18
  '  GG   DD  DD           ', // 19
  '                        ', // 20
  '                        ', // 21
  '                        ', // 22
  '                        ', // 23
]);

// TALKING: Arm gesturing outward, mouth open
const POSE_TALKING: PixelData = fromGrid([
  '                        ', // 0
  '                        ', // 1
  '        PPPPP           ', // 2
  '       PSSSSP           ', // 3
  '       PPPPPP           ', // 4
  '       PPPPPP           ', // 5
  '       KKKKKK           ', // 6
  '      KKEKKEKK          ', // 7
  '       KDDKKK           ', // 8
  '       KKKKKK           ', // 9
  '       PPPPPP           ', // 10
  '      PPSSSSPP          ', // 11
  '     KPPPPPPPP K        ', // 12
  '      PPPPPPPPPPK       ', // 13
  '       PPPPPP   K       ', // 14
  '       PPPPPP    H      ', // 15
  '       SSSSSS     H     ', // 16
  '       SSSSSS      H    ', // 17
  '      DD  DD            ', // 18
  '      DD  DD            ', // 19
  '                        ', // 20
  '                        ', // 21
  '                        ', // 22
  '                        ', // 23
]);

// SEARCHING: Holding magnifying glass, leaning forward
const POSE_SEARCHING: PixelData = fromGrid([
  '                        ', // 0
  '                        ', // 1
  '         PPPPP          ', // 2
  '        PSSSSP          ', // 3
  '        PPPPPP          ', // 4
  '        PPPPPP          ', // 5
  '        KKKKKK          ', // 6
  '       KKEKKEKK         ', // 7
  '        KKKKKK          ', // 8
  '        KKKKKK          ', // 9
  '        PPPPPP          ', // 10
  '       PPSSSSPP         ', // 11
  '      KPPPPPPPP K       ', // 12
  '       PPPPPPPP K       ', // 13
  '        PPPPPP          ', // 14
  '        PPPPPP  GGG     ', // 15
  '        SSSSSS GWWG     ', // 16
  '        SSSSSS GWWG     ', // 17
  '        DD  DD  GGG     ', // 18
  '       DD  DD    G      ', // 19
  '                        ', // 20
  '                        ', // 21
  '                        ', // 22
  '                        ', // 23
]);

// MANAGING: Holding clipboard, standing upright
const POSE_MANAGING: PixelData = fromGrid([
  '                        ', // 0
  '                        ', // 1
  '        PPPPP           ', // 2
  '       PSSSSP           ', // 3
  '       PPPPPP           ', // 4
  '       PPPPPP           ', // 5
  '       KKKKKK           ', // 6
  '      KKEKKEKK          ', // 7
  '       KKKKKK           ', // 8
  '       KKKKKK           ', // 9
  '       PPPPPP           ', // 10
  '      PPSSSSPP          ', // 11
  '    KPPPPPPPPPPK        ', // 12
  '     KPPPPPPPPK         ', // 13
  '       PPPPPP           ', // 14
  ' GGG   PPPPPP           ', // 15
  ' WHW   SSSSSS           ', // 16
  ' WGW   SSSSSS           ', // 17
  ' WGW  DD  DD            ', // 18
  ' WWW  DD  DD            ', // 19
  '                        ', // 20
  '                        ', // 21
  '                        ', // 22
  '                        ', // 23
]);

// CELEBRATING: Arms up in V, jumping, sparkles
const POSE_CELEBRATING: PixelData = fromGrid([
  '                        ', // 0
  '   H             H      ', // 1
  '        PPPPP           ', // 2
  '       PSSSSP           ', // 3
  '       PPPPPP     H     ', // 4
  '       PPPPPP           ', // 5
  '       KKKKKK           ', // 6
  '      KKEKKEKK          ', // 7
  '       KWWKKK           ', // 8
  '       KKKKKK           ', // 9
  '  K    PPPPPP    K      ', // 10
  '   K  PPSSSSPP  K       ', // 11
  '    K PPPPPPPP K        ', // 12
  '      PPPPPPPP          ', // 13
  '       PPPPPP           ', // 14
  ' H     PPPPPP           ', // 15
  '       SSSSSS           ', // 16
  '      SS  SS            ', // 17
  '     DD    DD           ', // 18
  '     DD    DD           ', // 19
  '                        ', // 20
  '                        ', // 21
  '                        ', // 22
  '                        ', // 23
]);

// === POSE MAP ===

export const SPRITE_POSES_24: Record<AgentPose, PixelData> = {
  idle: POSE_IDLE,
  coding: POSE_CODING,
  reading: POSE_READING,
  terminal: POSE_TERMINAL,
  talking: POSE_TALKING,
  searching: POSE_SEARCHING,
  managing: POSE_MANAGING,
  celebrating: POSE_CELEBRATING,
};

export const GRID_SIZE = 24;
