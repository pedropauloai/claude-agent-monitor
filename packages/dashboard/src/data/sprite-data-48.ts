/**
 * 48x48 "Ultra" pixel art sprite data.
 * Maximum detail: expressive faces with eyes AND mouth, detailed tools,
 * projected shadows, lighting highlights, pose-specific accessories.
 * ~900 meaningful pixels per pose.
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

// IDLE: Relaxed standing, gentle smile, arms at sides, shadow below
const POSE_IDLE: PixelData = fromGrid([
  '                                                ', // 0
  '                                                ', // 1
  '                                                ', // 2
  '                PPPPPPPPP                        ', // 3
  '               PPPPPPPPPP                        ', // 4
  '              PPSSSSSSSSPP                       ', // 5
  '              PPSSSSSSSSPP                       ', // 6
  '              PPSSSSSSSSPP                       ', // 7
  '              PPPPPPPPPPPP                       ', // 8
  '              PPPPPPPPPPPP                       ', // 9
  '              PPPPPPPPPPPP                       ', // 10
  '              KKKKKKKKKKKK                       ', // 11
  '             KKKKKKKKKKKK                        ', // 12
  '             KKKKKKKKKKKK                        ', // 13
  '            KKEEKKKKKKEEKK                       ', // 14
  '            KKEEKKKKKKEEKK                       ', // 15
  '            KKKKKKKKKKKKKKK                      ', // 16
  '             KKKKKKKKKKKKK                       ', // 17
  '             KKKKKDKKKKKKK                       ', // 18
  '              KKKKKKKKKKK                        ', // 19
  '               KKKKKKKKK                         ', // 20
  '              PPPPPPPPPPPP                       ', // 21
  '             PPPPPPPPPPPP                        ', // 22
  '             PPPPPPPPPPPP                        ', // 23
  '           KKPPSSSSSSSSPPKK                      ', // 24
  '           KKPPSSSSSSSSPPKK                      ', // 25
  '           KKPPPPPPPPPPPPKK                      ', // 26
  '           KKPPPPPPPPPPPPKK                      ', // 27
  '            KPPPPPPPPPPPPK                       ', // 28
  '             PPPPPPPPPPPP                        ', // 29
  '              PPPPPPPPPP                         ', // 30
  '              PPPPPPPPPP                         ', // 31
  '              PPPPPPPPPP                         ', // 32
  '              SSSSSSSSSS                         ', // 33
  '              SSSSSSSSSS                         ', // 34
  '              SSSSSSSSSS                         ', // 35
  '             SSS    SSS                          ', // 36
  '             SSS    SSS                          ', // 37
  '            DDD      DDD                         ', // 38
  '            DDD      DDD                         ', // 39
  '            DDD      DDD                         ', // 40
  '                                                ', // 41
  '            DDDDDDDDDDDD                        ', // 42
  '                                                ', // 43
  '                                                ', // 44
  '                                                ', // 45
  '                                                ', // 46
  '                                                ', // 47
]);

// CODING: Concentrated face (DD mouth), arms to keyboard, screen left
const POSE_CODING: PixelData = fromGrid([
  '                                                ', // 0
  '                                                ', // 1
  '                                                ', // 2
  '                 PPPPPPPPP                       ', // 3
  '                PPPPPPPPPP                       ', // 4
  '               PPSSSSSSSSPP                      ', // 5
  '               PPSSSSSSSSPP                      ', // 6
  '               PPSSSSSSSSPP                      ', // 7
  '               PPPPPPPPPPPP                      ', // 8
  '               PPPPPPPPPPPP                      ', // 9
  '               PPPPPPPPPPPP                      ', // 10
  '               KKKKKKKKKKKK                      ', // 11
  '              KKKKKKKKKKKK                       ', // 12
  '              KKKKKKKKKKKK                       ', // 13
  '             KKEEKKKKKKEEKK                      ', // 14
  '             KKEEKKKKKKEEKK                      ', // 15
  '             KKKKKKKKKKKKKKK                     ', // 16
  '              KKKKDDDKKKKKK                      ', // 17
  '              KKKKDDDKKKKKK                      ', // 18
  '               KKKKKKKKKKK                       ', // 19
  '                KKKKKKKKK                        ', // 20
  '               PPPPPPPPPPPP                      ', // 21
  '              PPPPPPPPPPPP                       ', // 22
  '              PPPPPPPPPPPP                       ', // 23
  '     KKK    PPSSSSSSSSPP    KKK                  ', // 24
  '     KKK    PPSSSSSSSSPP    KKK                  ', // 25
  '    GGGGG   PPPPPPPPPPPP   GGGGG                 ', // 26
  '    GGGGG   PPPPPPPPPPPP   GGGGG                 ', // 27
  '    GGGGG    PPPPPPPPPP    GGGGG                 ', // 28
  '    GGGGG     PPPPPPPP                           ', // 29
  '              PPPPPPPPPP                         ', // 30
  '  BBBBB       PPPPPPPPPP                         ', // 31
  '  BBBBB       PPPPPPPPPP                         ', // 32
  '  BBBBB       SSSSSSSSSS                         ', // 33
  '  BBBBB       SSSSSSSSSS                         ', // 34
  '              SSSSSSSSSS                         ', // 35
  '             SSS    SSS                          ', // 36
  '            DDD      DDD                         ', // 37
  '            DDD      DDD                         ', // 38
  '           DDD        DDD                        ', // 39
  '                                                ', // 40
  '           DDDDDDDDDDDDDD                       ', // 41
  '                                                ', // 42
  '                                                ', // 43
  '                                                ', // 44
  '                                                ', // 45
  '                                                ', // 46
  '                                                ', // 47
]);

// READING: Holding document right, eyes looking right
const POSE_READING: PixelData = fromGrid([
  '                                                ', // 0
  '                                                ', // 1
  '                                                ', // 2
  '                PPPPPPPPP                        ', // 3
  '               PPPPPPPPPP                        ', // 4
  '              PPSSSSSSSSPP                       ', // 5
  '              PPSSSSSSSSPP                       ', // 6
  '              PPSSSSSSSSPP                       ', // 7
  '              PPPPPPPPPPPP                       ', // 8
  '              PPPPPPPPPPPP                       ', // 9
  '              PPPPPPPPPPPP                       ', // 10
  '              KKKKKKKKKKKK                       ', // 11
  '             KKKKKKKKKKKK                        ', // 12
  '             KKKKKKKKKKKK                        ', // 13
  '            KKKKEKKKKKEKK                        ', // 14
  '            KKKKEKKKKKEKK                        ', // 15
  '            KKKKKKKKKKKKKK                       ', // 16
  '             KKKKKKKKKKKK                        ', // 17
  '             KKKKKKKKKKKKK                       ', // 18
  '              KKKKKKKKKKK                        ', // 19
  '               KKKKKKKKK                         ', // 20
  '              PPPPPPPPPPPP                       ', // 21
  '             PPPPPPPPPPPP                        ', // 22
  '             PPPPPPPPPPPP                        ', // 23
  '           KKPPSSSSSSSSPP  KK                    ', // 24
  '           KKPPSSSSSSSSPP  KK                    ', // 25
  '            KPPPPPPPPPPPP  KK                    ', // 26
  '             PPPPPPPPPPPP                        ', // 27
  '              PPPPPPPPPP      WWWWWW             ', // 28
  '              PPPPPPPPPP      WWWWWW             ', // 29
  '              PPPPPPPPPP      WGGGWW             ', // 30
  '              PPPPPPPPPP      WGGGWW             ', // 31
  '              PPPPPPPPPP      WGGGWW             ', // 32
  '              SSSSSSSSSS      WGGGWW             ', // 33
  '              SSSSSSSSSS      WWWWWW             ', // 34
  '              SSSSSSSSSS      WWWWWW             ', // 35
  '             SSS    SSS                          ', // 36
  '             SSS    SSS                          ', // 37
  '            DDD      DDD                         ', // 38
  '            DDD      DDD                         ', // 39
  '            DDD      DDD                         ', // 40
  '                                                ', // 41
  '            DDDDDDDDDDDD                        ', // 42
  '                                                ', // 43
  '                                                ', // 44
  '                                                ', // 45
  '                                                ', // 46
  '                                                ', // 47
]);

// TERMINAL: Looking at terminal screen (left), arm extended to console
const POSE_TERMINAL: PixelData = fromGrid([
  '                                                ', // 0
  '                                                ', // 1
  '                                                ', // 2
  '                PPPPPPPPP                        ', // 3
  '               PPPPPPPPPP                        ', // 4
  '              PPSSSSSSSSPP                       ', // 5
  '              PPSSSSSSSSPP                       ', // 6
  '              PPSSSSSSSSPP                       ', // 7
  '              PPPPPPPPPPPP                       ', // 8
  '              PPPPPPPPPPPP                       ', // 9
  '              PPPPPPPPPPPP                       ', // 10
  '              KKKKKKKKKKKK                       ', // 11
  '             KKKKKKKKKKKK                        ', // 12
  '             KKKKKKKKKKKK                        ', // 13
  '            EEKKKKKKKKKEKK                       ', // 14
  '            EEKKKKKKKKKEKK                       ', // 15
  '            KKKKKKKKKKKKKK                       ', // 16
  '             KKKKKKKKKKKK                        ', // 17
  '             KKKKKKKKKKKK                        ', // 18
  '              KKKKKKKKKKK                        ', // 19
  '               KKKKKKKKK                         ', // 20
  '              PPPPPPPPPPPP                       ', // 21
  '        KK   PPPPPPPPPPPP                        ', // 22
  '       KK    PPPPPPPPPPPP                        ', // 23
  '      KK   PPSSSSSSSSPPKK                        ', // 24
  '            PPSSSSSSSSPPKK                       ', // 25
  '            PPPPPPPPPPPPKK                       ', // 26
  '            PPPPPPPPPPPP                         ', // 27
  '  GGGGGGGG   PPPPPPPPPP                          ', // 28
  '  GGGGGGGG   PPPPPPPPPP                          ', // 29
  '  GGBBBBGG   PPPPPPPPPP                          ', // 30
  '  GGBBBBGG   PPPPPPPPPP                          ', // 31
  '  GGBBBBGG   SSSSSSSSSS                          ', // 32
  '  GGBBBBGG   SSSSSSSSSS                          ', // 33
  '  GGGGGGGG   SSSSSSSSSS                          ', // 34
  '  GGGGGGGG  SSS    SSS                           ', // 35
  '    GGG     SSS    SSS                           ', // 36
  '    GGG    DDD      DDD                          ', // 37
  '           DDD      DDD                          ', // 38
  '           DDD      DDD                          ', // 39
  '                                                ', // 40
  '           DDDDDDDDDDDD                         ', // 41
  '                                                ', // 42
  '                                                ', // 43
  '                                                ', // 44
  '                                                ', // 45
  '                                                ', // 46
  '                                                ', // 47
]);

// TALKING: Mouth open (DDDD), arm gesturing right, speech dots
const POSE_TALKING: PixelData = fromGrid([
  '                                                ', // 0
  '                                                ', // 1
  '                                                ', // 2
  '                PPPPPPPPP                        ', // 3
  '               PPPPPPPPPP                        ', // 4
  '              PPSSSSSSSSPP                       ', // 5
  '              PPSSSSSSSSPP                       ', // 6
  '              PPSSSSSSSSPP                       ', // 7
  '              PPPPPPPPPPPP                       ', // 8
  '              PPPPPPPPPPPP                       ', // 9
  '              PPPPPPPPPPPP                       ', // 10
  '              KKKKKKKKKKKK                       ', // 11
  '             KKKKKKKKKKKK                        ', // 12
  '             KKKKKKKKKKKK                        ', // 13
  '            KKEEKKKKKKEEKK                       ', // 14
  '            KKEEKKKKKKEEKK                       ', // 15
  '            KKKKKKKKKKKKKKK                      ', // 16
  '             KKKKDDDDKKKKK                       ', // 17
  '             KKKKDDDDKKKKK                       ', // 18
  '              KKKKKKKKKKK                        ', // 19
  '               KKKKKKKKK                         ', // 20
  '              PPPPPPPPPPPP                       ', // 21
  '             PPPPPPPPPPPP                        ', // 22
  '             PPPPPPPPPPPP                        ', // 23
  '           KKPPSSSSSSSSPP   KKK                  ', // 24
  '           KKPPSSSSSSSSPPPPPPKKK                  ', // 25
  '            KPPPPPPPPPPPPPPPPKKK                  ', // 26
  '             PPPPPPPPPPPP   KKK                  ', // 27
  '              PPPPPPPPPP                         ', // 28
  '              PPPPPPPPPP                         ', // 29
  '              PPPPPPPPPP        HH               ', // 30
  '              PPPPPPPPPP         HH              ', // 31
  '              PPPPPPPPPP          HH             ', // 32
  '              SSSSSSSSSS           HH            ', // 33
  '              SSSSSSSSSS                         ', // 34
  '              SSSSSSSSSS                         ', // 35
  '             SSS    SSS                          ', // 36
  '             SSS    SSS                          ', // 37
  '            DDD      DDD                         ', // 38
  '            DDD      DDD                         ', // 39
  '            DDD      DDD                         ', // 40
  '                                                ', // 41
  '            DDDDDDDDDDDD                        ', // 42
  '                                                ', // 43
  '                                                ', // 44
  '                                                ', // 45
  '                                                ', // 46
  '                                                ', // 47
]);

// SEARCHING: Leaning forward, magnifying glass right, one step forward
const POSE_SEARCHING: PixelData = fromGrid([
  '                                                ', // 0
  '                                                ', // 1
  '                                                ', // 2
  '                 PPPPPPPPP                       ', // 3
  '                PPPPPPPPPP                       ', // 4
  '               PPSSSSSSSSPP                      ', // 5
  '               PPSSSSSSSSPP                      ', // 6
  '               PPSSSSSSSSPP                      ', // 7
  '               PPPPPPPPPPPP                      ', // 8
  '               PPPPPPPPPPPP                      ', // 9
  '               PPPPPPPPPPPP                      ', // 10
  '               KKKKKKKKKKKK                      ', // 11
  '              KKKKKKKKKKKK                       ', // 12
  '              KKKKKKKKKKKK                       ', // 13
  '             KKEEKKKKKKEEKK                      ', // 14
  '             KKEEKKKKKKEEKK                      ', // 15
  '             KKKKKKKKKKKKKKK                     ', // 16
  '              KKKKKKKKKKKKK                      ', // 17
  '              KKKKKKKKKKKKK                      ', // 18
  '               KKKKKKKKKKK                       ', // 19
  '                KKKKKKKKK                        ', // 20
  '               PPPPPPPPPPPP                      ', // 21
  '              PPPPPPPPPPPP                       ', // 22
  '              PPPPPPPPPPPP                       ', // 23
  '            KKPPSSSSSSSSPP  KKK                  ', // 24
  '            KKPPSSSSSSSSPP  KKK                  ', // 25
  '             KPPPPPPPPPPPP  KKK                  ', // 26
  '              PPPPPPPPPPPP                       ', // 27
  '               PPPPPPPPPP      GGGGG             ', // 28
  '               PPPPPPPPPP     GWWWWG             ', // 29
  '               PPPPPPPPPP     GWWWWG             ', // 30
  '               PPPPPPPPPP     GWWWWG             ', // 31
  '               PPPPPPPPPP     GWWWWG             ', // 32
  '               SSSSSSSSSS      GGGGG             ', // 33
  '               SSSSSSSSSS        GG              ', // 34
  '               SSSSSSSSSS         GG             ', // 35
  '              SSS    SSS           GG            ', // 36
  '             DDD      DDD                        ', // 37
  '             DDD      DDD                        ', // 38
  '            DDD        DDD                       ', // 39
  '                                                ', // 40
  '            DDDDDDDDDDDDDD                      ', // 41
  '                                                ', // 42
  '                                                ', // 43
  '                                                ', // 44
  '                                                ', // 45
  '                                                ', // 46
  '                                                ', // 47
]);

// MANAGING: Holding clipboard left, confident stance, slight smile
const POSE_MANAGING: PixelData = fromGrid([
  '                                                ', // 0
  '                                                ', // 1
  '                                                ', // 2
  '                PPPPPPPPP                        ', // 3
  '               PPPPPPPPPP                        ', // 4
  '              PPSSSSSSSSPP                       ', // 5
  '              PPSSSSSSSSPP                       ', // 6
  '              PPSSSSSSSSPP                       ', // 7
  '              PPPPPPPPPPPP                       ', // 8
  '              PPPPPPPPPPPP                       ', // 9
  '              PPPPPPPPPPPP                       ', // 10
  '              KKKKKKKKKKKK                       ', // 11
  '             KKKKKKKKKKKK                        ', // 12
  '             KKKKKKKKKKKK                        ', // 13
  '            KKEEKKKKKKEEKK                       ', // 14
  '            KKEEKKKKKKEEKK                       ', // 15
  '            KKKKKKKKKKKKKKK                      ', // 16
  '             KKKKKKKKKKKK                        ', // 17
  '             KKKKKDKKKKKKK                       ', // 18
  '              KKKKKKKKKKK                        ', // 19
  '               KKKKKKKKK                         ', // 20
  '              PPPPPPPPPPPP                       ', // 21
  '             PPPPPPPPPPPP                        ', // 22
  '             PPPPPPPPPPPP                        ', // 23
  '         KKPPSSSSSSSSSSPPPPKK                    ', // 24
  '          KKPPSSSSSSSSPPPPKK                     ', // 25
  '           KPPPPPPPPPPPPKK                       ', // 26
  '            PPPPPPPPPPPP                         ', // 27
  '  GGGGG      PPPPPPPPPP                          ', // 28
  '  GGGGG      PPPPPPPPPP                          ', // 29
  '  WHHWW      PPPPPPPPPP                          ', // 30
  '  WHHWW      PPPPPPPPPP                          ', // 31
  '  WGGWW      SSSSSSSSSS                          ', // 32
  '  WGGWW      SSSSSSSSSS                          ', // 33
  '  WGGWW      SSSSSSSSSS                          ', // 34
  '  WGGWW     SSS    SSS                           ', // 35
  '  WWWWW     SSS    SSS                           ', // 36
  '  WWWWW    DDD      DDD                          ', // 37
  '           DDD      DDD                          ', // 38
  '           DDD      DDD                          ', // 39
  '                                                ', // 40
  '           DDDDDDDDDDDD                         ', // 41
  '                                                ', // 42
  '                                                ', // 43
  '                                                ', // 44
  '                                                ', // 45
  '                                                ', // 46
  '                                                ', // 47
]);

// CELEBRATING: Arms up in V, jumping, wide stance, big smile, sparkles
const POSE_CELEBRATING: PixelData = fromGrid([
  '                                                ', // 0
  '                                                ', // 1
  '     H                          H                ', // 2
  '                PPPPPPPPP                        ', // 3
  '               PPPPPPPPPP                        ', // 4
  '              PPSSSSSSSSPP                       ', // 5
  '              PPSSSSSSSSPP           H            ', // 6
  '              PPSSSSSSSSPP                       ', // 7
  '              PPPPPPPPPPPP                       ', // 8
  '              PPPPPPPPPPPP                       ', // 9
  '              PPPPPPPPPPPP                       ', // 10
  '              KKKKKKKKKKKK                       ', // 11
  '             KKKKKKKKKKKK                        ', // 12
  '             KKKKKKKKKKKK                        ', // 13
  '            KKEEKKKKKKEEKK                       ', // 14
  '            KKEEKKKKKKEEKK                       ', // 15
  '            KKKKKKKKKKKKKKK                      ', // 16
  '             KKKKWWWWKKKKK                       ', // 17
  '             KKKKWWWWKKKKK                       ', // 18
  '              KKKKKKKKKKK                        ', // 19
  '               KKKKKKKKK                         ', // 20
  '    KKK       PPPPPPPPPPPP       KKK             ', // 21
  '     KKK     PPPPPPPPPPPP       KKK              ', // 22
  '      KKK    PPPPPPPPPPPP     KKK                ', // 23
  '       KKK PPSSSSSSSSPP    KKK                   ', // 24
  '           PPSSSSSSSSPP                          ', // 25
  '           PPPPPPPPPPPP                          ', // 26
  '            PPPPPPPPPPPP                         ', // 27
  '             PPPPPPPPPP                          ', // 28
  '  H          PPPPPPPPPP                          ', // 29
  '             PPPPPPPPPP                          ', // 30
  '             PPPPPPPPPP                          ', // 31
  '              SSSSSSSSSS                         ', // 32
  '              SSSSSSSSSS                         ', // 33
  '             SSS      SSS                        ', // 34
  '            SSS        SSS                       ', // 35
  '           SSS          SSS                      ', // 36
  '           DDD          DDD                      ', // 37
  '           DDD          DDD                      ', // 38
  '           DDD          DDD                      ', // 39
  '                                                ', // 40
  '          DDDDDDDDDDDDDDDD                      ', // 41
  '                                                ', // 42
  '                                                ', // 43
  '                                                ', // 44
  '                                                ', // 45
  '                                                ', // 46
  '                                                ', // 47
]);

// === POSE MAP ===

export const SPRITE_POSES_48: Record<AgentPose, PixelData> = {
  idle: POSE_IDLE,
  coding: POSE_CODING,
  reading: POSE_READING,
  terminal: POSE_TERMINAL,
  talking: POSE_TALKING,
  searching: POSE_SEARCHING,
  managing: POSE_MANAGING,
  celebrating: POSE_CELEBRATING,
};

export const GRID_SIZE = 48;
