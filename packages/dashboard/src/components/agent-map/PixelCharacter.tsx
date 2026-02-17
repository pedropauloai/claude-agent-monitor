import { useMemo, useState, useEffect } from 'react';
import type { AgentAnimationState, AgentPose } from '@cam/shared';
import { SPRITE_POSES, SPRITE_FRAMES, generateBoxShadow, type SpriteFrame } from './sprite-data';
import { renderSpriteToDataUrl, isCanvasSupported } from '../../services/sprite-renderer.js';
import { loadSpriteData, getSpriteDataSync } from '../../data/sprite-loader.js';
import { useSettingsStore } from '../../stores/settings-store.js';

interface PixelCharacterProps {
  color: string;
  animationState: AgentAnimationState;
  pose?: AgentPose;
  pixelSize?: number;
}

/** Legacy: map animation state to old 3-frame system */
function getFrameForState(state: AgentAnimationState): SpriteFrame {
  switch (state) {
    case 'working':
    case 'moving':
    case 'talking':
      return 'working';
    case 'shutdown':
      return 'shutdown';
    case 'idle':
    case 'error':
    case 'completed':
    default:
      return 'idle';
  }
}

/** Get the pixel data and pose key for current state */
function getSpriteInfo(
  pose: AgentPose | undefined,
  animationState: AgentAnimationState
): { data: [number, number, string][]; poseId: string } {
  if (pose) {
    return { data: SPRITE_POSES[pose], poseId: pose };
  }
  const frame = getFrameForState(animationState);
  return { data: SPRITE_FRAMES[frame], poseId: `legacy_${frame}` };
}

export function PixelCharacter({ color, animationState, pose, pixelSize = 2 }: PixelCharacterProps) {
  const spriteResolution = useSettingsStore((s) => s.spriteResolution);
  const canvasOk = useMemo(() => isCanvasSupported(), []);

  // Load sprite data for current resolution (async)
  const [loadedData, setLoadedData] = useState(() => getSpriteDataSync(spriteResolution));

  useEffect(() => {
    let cancelled = false;
    loadSpriteData(spriteResolution).then((mod) => {
      if (!cancelled) setLoadedData(mod);
    });
    return () => { cancelled = true; };
  }, [spriteResolution]);

  // Determine sprite data and grid size
  const effectiveGridSize = loadedData?.gridSize ?? 16;
  const effectivePoses = loadedData?.poses;

  // Get pixel data for current pose
  const { data: defaultData, poseId } = useMemo(
    () => getSpriteInfo(pose, animationState),
    [pose, animationState]
  );

  // Use loaded resolution data if available, otherwise fall back to default 16x16
  const pixelData = useMemo(() => {
    if (effectivePoses && pose) {
      return effectivePoses[pose];
    }
    return defaultData;
  }, [effectivePoses, pose, defaultData]);

  const spriteWidth = effectiveGridSize * pixelSize;
  const spriteHeight = effectiveGridSize * pixelSize;

  // Canvas rendering path
  const dataUrl = useMemo(() => {
    if (!canvasOk) return null;
    return renderSpriteToDataUrl(
      pixelData,
      effectiveGridSize,
      Math.max(spriteWidth, spriteHeight),
      color,
      `${poseId}_${spriteResolution}`
    );
  }, [canvasOk, pixelData, effectiveGridSize, spriteWidth, spriteHeight, color, poseId, spriteResolution]);

  // CSS box-shadow fallback
  const boxShadow = useMemo(() => {
    if (canvasOk && dataUrl) return undefined;
    return generateBoxShadow(pixelData, color, pixelSize);
  }, [canvasOk, dataUrl, pixelData, color, pixelSize]);

  return (
    <div
      className="pixel-character"
      style={{
        width: `${spriteWidth}px`,
        height: `${spriteHeight}px`,
      }}
    >
      {canvasOk && dataUrl ? (
        <img
          src={dataUrl}
          alt=""
          width={spriteWidth}
          height={spriteHeight}
          style={{
            imageRendering: 'pixelated',
            display: 'block',
          }}
        />
      ) : (
        <div
          style={{
            width: `${pixelSize}px`,
            height: `${pixelSize}px`,
            boxShadow,
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />
      )}
    </div>
  );
}
