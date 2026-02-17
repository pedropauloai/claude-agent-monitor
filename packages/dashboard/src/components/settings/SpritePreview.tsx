import { useState, useEffect, useMemo, useCallback } from 'react';
import type { AgentPose } from '@cam/shared';
import type { SpriteResolution } from '../../stores/settings-store.js';
import { loadSpriteData } from '../../data/sprite-loader.js';
import { renderSpriteToDataUrl, isCanvasSupported } from '../../services/sprite-renderer.js';

const ALL_POSES: AgentPose[] = [
  'idle', 'coding', 'reading', 'terminal',
  'talking', 'searching', 'managing', 'celebrating',
];

const POSE_LABELS: Record<AgentPose, string> = {
  idle: 'Parado',
  coding: 'Programando',
  reading: 'Lendo',
  terminal: 'Terminal',
  talking: 'Conversando',
  searching: 'Buscando',
  managing: 'Gerenciando',
  celebrating: 'Celebrando',
};

const RESOLUTION_INFO: Record<SpriteResolution, { label: string; description: string }> = {
  '16x16': { label: 'Classic 16x16', description: 'Estilo NES nostalgico' },
  '24x24': { label: 'Detailed 24x24', description: 'Mais detalhes visiveis' },
  '32x32': { label: 'HD 32x32', description: 'Alta definicao com expressoes' },
  '48x48': { label: 'Ultra 48x48', description: 'Maximo detalhe e acessorios' },
};

const PREVIEW_COLOR = '#3b82f6';

interface SpritePreviewProps {
  resolution: SpriteResolution;
}

export function SpritePreview({ resolution }: SpritePreviewProps) {
  const [poseIndex, setPoseIndex] = useState(0);
  const [spriteDataUrl, setSpriteDataUrl] = useState<string | null>(null);
  const canvasOk = useMemo(() => isCanvasSupported(), []);

  const currentPose = ALL_POSES[poseIndex];
  const gridSize = parseInt(resolution.split('x')[0], 10);

  // Scale: fit the sprite into ~96px display area for consistency
  const displaySize = Math.max(96, gridSize * 3);

  const cyclePose = useCallback(() => {
    setPoseIndex((prev) => (prev + 1) % ALL_POSES.length);
  }, []);

  // Load and render sprite when resolution or pose changes
  useEffect(() => {
    let cancelled = false;

    loadSpriteData(resolution).then((mod) => {
      if (cancelled) return;

      const pixelData = mod.poses[currentPose];
      if (!pixelData) return;

      if (canvasOk) {
        const url = renderSpriteToDataUrl(
          pixelData,
          mod.gridSize,
          displaySize,
          PREVIEW_COLOR,
          `preview_${currentPose}_${resolution}`
        );
        setSpriteDataUrl(url);
      } else {
        setSpriteDataUrl(null);
      }
    });

    return () => { cancelled = true; };
  }, [resolution, currentPose, canvasOk, displaySize]);

  const info = RESOLUTION_INFO[resolution];

  return (
    <div className="flex flex-col items-center gap-3 p-3 rounded-lg border border-cam-border bg-cam-surface-2">
      {/* Resolution label */}
      <div className="text-center">
        <span className="text-xs font-medium text-cam-accent">{info.label}</span>
        <span className="text-[10px] text-cam-text-muted ml-1.5">{info.description}</span>
      </div>

      {/* Sprite display */}
      <button
        onClick={cyclePose}
        className="relative flex items-center justify-center rounded-md bg-cam-bg/50 hover:bg-cam-bg/80 transition-colors cursor-pointer"
        style={{ width: `${displaySize + 16}px`, height: `${displaySize + 16}px` }}
        title="Clique para mudar a pose"
        aria-label={`Pose atual: ${POSE_LABELS[currentPose]}. Clique para trocar.`}
      >
        {spriteDataUrl ? (
          <img
            src={spriteDataUrl}
            alt={`Sprite ${currentPose}`}
            width={displaySize}
            height={displaySize}
            style={{ imageRendering: 'pixelated' }}
            className="transition-opacity duration-200"
          />
        ) : (
          <div
            className="flex items-center justify-center text-cam-text-muted text-[10px]"
            style={{ width: `${displaySize}px`, height: `${displaySize}px` }}
          >
            {gridSize}x{gridSize}
          </div>
        )}
      </button>

      {/* Pose label */}
      <span className="text-[10px] text-cam-text-secondary font-medium">
        {POSE_LABELS[currentPose]}
      </span>
    </div>
  );
}
