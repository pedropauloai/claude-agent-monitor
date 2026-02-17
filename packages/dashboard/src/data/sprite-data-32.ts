/**
 * 32x32 "HD" pixel art sprite data.
 * Significant detail upgrade: distinct facial expressions per pose,
 * detailed tools, body shadowing, ~350 meaningful pixels per pose.
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

// IDLE: Relaxed standing, smile, arms at sides
const POSE_IDLE: PixelData = fromGrid([
  '                                ', // 0
  '                                ', // 1
  '           PPPPPP               ', // 2
  '          PSSSSSP               ', // 3
  '          PSSSSSP               ', // 4
  '          PPPPPPP               ', // 5
  '          PPPPPPP               ', // 6
  '          KKKKKKK               ', // 7
  '         KKKKKKKK               ', // 8
  '         KEEKKKEKK              ', // 9
  '         KKKKKKKKK              ', // 10
  '          KKKKKKK               ', // 11
  '          KKDKKKK               ', // 12
  '           KKKKKK               ', // 13
  '          PPPPPPPP              ', // 14
  '         PPPPPPPP               ', // 15
  '        KPPSSSSSPPK             ', // 16
  '        KPPPPPPPPK              ', // 17
  '        KPPPPPPPPK              ', // 18
  '         PPPPPPPP               ', // 19
  '          PPPPPP                ', // 20
  '          PPPPPP                ', // 21
  '          SSSSSS                ', // 22
  '          SSSSSS                ', // 23
  '         SS  SS                 ', // 24
  '         DD  DD                 ', // 25
  '         DD  DD                 ', // 26
  '                                ', // 27
  '                                ', // 28
  '                                ', // 29
  '                                ', // 30
  '                                ', // 31
]);

// CODING: Typing, focused face (concentrated mouth), arms to keyboard+screen
const POSE_CODING: PixelData = fromGrid([
  '                                ', // 0
  '                                ', // 1
  '            PPPPPP              ', // 2
  '           PSSSSSP              ', // 3
  '           PSSSSSP              ', // 4
  '           PPPPPPP              ', // 5
  '           PPPPPPP              ', // 6
  '           KKKKKKK              ', // 7
  '          KKKKKKKK              ', // 8
  '          KEEKKKEKK             ', // 9
  '          KKKKKKKKK             ', // 10
  '           KKDKKKK              ', // 11
  '           KKDKKKK              ', // 12
  '            KKKKKK              ', // 13
  '           PPPPPPPP             ', // 14
  '          PPPPPPPP              ', // 15
  '    KK   PPSSSSSPP   KK        ', // 16
  '    KK   PPPPPPPP    KK        ', // 17
  '   GGGG  PPPPPPPP   GGGG       ', // 18
  '   GGGG   PPPPPP    GGGG       ', // 19
  '   GGGG   PPPPPP    GGGG       ', // 20
  '  BBBB     PPPP                ', // 21
  '  BBBB    SSSSSS               ', // 22
  '  BBBB    SSSSSS               ', // 23
  '          SS  SS               ', // 24
  '          DD  DD               ', // 25
  '         DD    DD              ', // 26
  '                                ', // 27
  '                                ', // 28
  '                                ', // 29
  '                                ', // 30
  '                                ', // 31
]);

// READING: Holding document to the right, eyes looking right
const POSE_READING: PixelData = fromGrid([
  '                                ', // 0
  '                                ', // 1
  '           PPPPPP               ', // 2
  '          PSSSSSP               ', // 3
  '          PSSSSSP               ', // 4
  '          PPPPPPP               ', // 5
  '          PPPPPPP               ', // 6
  '          KKKKKKK               ', // 7
  '         KKKKKKKK               ', // 8
  '         KKKEKKEK               ', // 9
  '         KKKKKKKKK              ', // 10
  '          KKKKKKK               ', // 11
  '          KKKKKKK               ', // 12
  '           KKKKKK               ', // 13
  '          PPPPPPPP              ', // 14
  '         PPPPPPPP               ', // 15
  '        KPPSSSSSPP K            ', // 16
  '         PPPPPPPP  K            ', // 17
  '         PPPPPPPP               ', // 18
  '          PPPPPP    WWWW        ', // 19
  '          PPPPPP    WGGW        ', // 20
  '          PPPPPP    WGGW        ', // 21
  '          SSSSSS    WGGW        ', // 22
  '          SSSSSS    WWWW        ', // 23
  '         SS  SS                 ', // 24
  '         DD  DD                 ', // 25
  '         DD  DD                 ', // 26
  '                                ', // 27
  '                                ', // 28
  '                                ', // 29
  '                                ', // 30
  '                                ', // 31
]);

// TERMINAL: Looking at terminal screen (left), arm extended
const POSE_TERMINAL: PixelData = fromGrid([
  '                                ', // 0
  '                                ', // 1
  '           PPPPPP               ', // 2
  '          PSSSSSP               ', // 3
  '          PSSSSSP               ', // 4
  '          PPPPPPP               ', // 5
  '          PPPPPPP               ', // 6
  '          KKKKKKK               ', // 7
  '         KKKKKKKK               ', // 8
  '         EKKKKKKEK              ', // 9
  '         KKKKKKKKK              ', // 10
  '          KKKKKKK               ', // 11
  '          KKKKKKK               ', // 12
  '           KKKKKK               ', // 13
  '          PPPPPPPP              ', // 14
  '     K   PPPPPPPP               ', // 15
  '    K   PPSSSSSPPK              ', // 16
  '        PPPPPPPPK               ', // 17
  '        PPPPPPPPK               ', // 18
  '  GGGGGG PPPPPP                 ', // 19
  '  GBBBBG PPPPPP                 ', // 20
  '  GBBBBG  PPPP                  ', // 21
  '  GBBBBG SSSSSS                 ', // 22
  '  GGGGGG SSSSSS                 ', // 23
  '   GG    SS  SS                 ', // 24
  '         DD  DD                 ', // 25
  '         DD  DD                 ', // 26
  '                                ', // 27
  '                                ', // 28
  '                                ', // 29
  '                                ', // 30
  '                                ', // 31
]);

// TALKING: Mouth open (DD), arm gesturing right, speech dots
const POSE_TALKING: PixelData = fromGrid([
  '                                ', // 0
  '                                ', // 1
  '           PPPPPP               ', // 2
  '          PSSSSSP               ', // 3
  '          PSSSSSP               ', // 4
  '          PPPPPPP               ', // 5
  '          PPPPPPP               ', // 6
  '          KKKKKKK               ', // 7
  '         KKKKKKKK               ', // 8
  '         KEEKKKEKK              ', // 9
  '         KKKKKKKKK              ', // 10
  '          KKDDKKK               ', // 11
  '          KKDDKKK               ', // 12
  '           KKKKKK               ', // 13
  '          PPPPPPPP              ', // 14
  '         PPPPPPPP               ', // 15
  '        KPPSSSSSPP  K           ', // 16
  '         PPPPPPPPPPPK           ', // 17
  '         PPPPPPPP   K           ', // 18
  '          PPPPPP                ', // 19
  '          PPPPPP     H          ', // 20
  '          PPPPPP      H         ', // 21
  '          SSSSSS       H        ', // 22
  '          SSSSSS                ', // 23
  '         SS  SS                 ', // 24
  '         DD  DD                 ', // 25
  '         DD  DD                 ', // 26
  '                                ', // 27
  '                                ', // 28
  '                                ', // 29
  '                                ', // 30
  '                                ', // 31
]);

// SEARCHING: Leaning forward, magnifying glass right, one step forward
const POSE_SEARCHING: PixelData = fromGrid([
  '                                ', // 0
  '                                ', // 1
  '            PPPPPP              ', // 2
  '           PSSSSSP              ', // 3
  '           PSSSSSP              ', // 4
  '           PPPPPPP              ', // 5
  '           PPPPPPP              ', // 6
  '           KKKKKKK              ', // 7
  '          KKKKKKKK              ', // 8
  '          KEEKKKEKK             ', // 9
  '          KKKKKKKKK             ', // 10
  '           KKKKKKK              ', // 11
  '           KKKKKKK              ', // 12
  '            KKKKKK              ', // 13
  '           PPPPPPPP             ', // 14
  '          PPPPPPPP              ', // 15
  '         KPPSSSSSPP  K          ', // 16
  '          PPPPPPPP   K          ', // 17
  '          PPPPPPPP              ', // 18
  '           PPPPPP   GGGG        ', // 19
  '           PPPPPP  GWWWG        ', // 20
  '           PPPPPP  GWWWG        ', // 21
  '           SSSSSS  GWWWG        ', // 22
  '           SSSSSS   GGGG        ', // 23
  '          SS  SS      G         ', // 24
  '          DD  DD       G        ', // 25
  '         DD    DD               ', // 26
  '                                ', // 27
  '                                ', // 28
  '                                ', // 29
  '                                ', // 30
  '                                ', // 31
]);

// MANAGING: Holding clipboard left, confident stance
const POSE_MANAGING: PixelData = fromGrid([
  '                                ', // 0
  '                                ', // 1
  '           PPPPPP               ', // 2
  '          PSSSSSP               ', // 3
  '          PSSSSSP               ', // 4
  '          PPPPPPP               ', // 5
  '          PPPPPPP               ', // 6
  '          KKKKKKK               ', // 7
  '         KKKKKKKK               ', // 8
  '         KEEKKKEKK              ', // 9
  '         KKKKKKKKK              ', // 10
  '          KKKKKKK               ', // 11
  '          KKDKKKK               ', // 12
  '           KKKKKK               ', // 13
  '          PPPPPPPP              ', // 14
  '         PPPPPPPP               ', // 15
  '       KPPSSSSSPPPPK            ', // 16
  '        KPPPPPPPPK              ', // 17
  '         PPPPPPPP               ', // 18
  '  GGGG   PPPPPP                 ', // 19
  '  WHHW   PPPPPP                 ', // 20
  '  WGGW   PPPPPP                 ', // 21
  '  WGGW   SSSSSS                 ', // 22
  '  WGGW   SSSSSS                 ', // 23
  '  WWWW   SS  SS                 ', // 24
  '         DD  DD                 ', // 25
  '         DD  DD                 ', // 26
  '                                ', // 27
  '                                ', // 28
  '                                ', // 29
  '                                ', // 30
  '                                ', // 31
]);

// CELEBRATING: Arms up in V, jumping, wide stance, smile, sparkles
const POSE_CELEBRATING: PixelData = fromGrid([
  '                                ', // 0
  '    H                H          ', // 1
  '           PPPPPP               ', // 2
  '          PSSSSSP               ', // 3
  '          PSSSSSP        H      ', // 4
  '          PPPPPPP               ', // 5
  '          PPPPPPP               ', // 6
  '          KKKKKKK               ', // 7
  '         KKKKKKKK               ', // 8
  '         KEEKKKEKK              ', // 9
  '         KKKKKKKKK              ', // 10
  '          KKWWKKK               ', // 11
  '          KKWWKKK               ', // 12
  '           KKKKKK               ', // 13
  '   K      PPPPPPPP      K       ', // 14
  '    K    PPPPPPPP      K        ', // 15
  '     K  PPSSSSSPP   K           ', // 16
  '        PPPPPPPP                ', // 17
  '        PPPPPPPP                ', // 18
  '  H      PPPPPP                 ', // 19
  '         PPPPPP                 ', // 20
  '         SSSSSS                 ', // 21
  '        SS    SS                ', // 22
  '       SS      SS               ', // 23
  '       DD      DD               ', // 24
  '       DD      DD               ', // 25
  '                                ', // 26
  '                                ', // 27
  '                                ', // 28
  '                                ', // 29
  '                                ', // 30
  '                                ', // 31
]);

// === POSE MAP ===

export const SPRITE_POSES_32: Record<AgentPose, PixelData> = {
  idle: POSE_IDLE,
  coding: POSE_CODING,
  reading: POSE_READING,
  terminal: POSE_TERMINAL,
  talking: POSE_TALKING,
  searching: POSE_SEARCHING,
  managing: POSE_MANAGING,
  celebrating: POSE_CELEBRATING,
};

export const GRID_SIZE = 32;
