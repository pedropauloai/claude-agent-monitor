import Spline from '@splinetool/react-spline';
import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { SPLINE_URLS } from './scene-constants.js';

/**
 * Minimal type for accessing Spline runtime internals.
 * Used to disable the watermark shader pass.
 */
interface SplineInternals {
  _renderer?: {
    pipeline?: {
      setWatermark: (texture: null) => void;
      logoOverlayPass?: { enabled: boolean };
    };
  };
  play?: () => void;
}

/** Visual size of the NEXBOT guide in pixels */
const GUIDE_SIZE = 160;
/** Internal render scale for crisp rendering */
const RENDER_SCALE = 2;
const RENDER_SIZE = GUIDE_SIZE * RENDER_SCALE;

const VARIANT_STYLES = {
  default: { accent: '#8b5cf6', text: 'text-violet-400' },
  warning: { accent: '#f59e0b', text: 'text-amber-400' },
  error:   { accent: '#ef4444', text: 'text-red-400' },
  success: { accent: '#22c55e', text: 'text-emerald-400' },
  pulse:   { accent: '#10b981', text: 'text-emerald-400' },
} as const;

interface NexbotGuideProps {
  /** Main instruction heading */
  title: string;
  /** Secondary description text */
  subtitle?: string;
  /** Color variant for accent styling */
  variant?: keyof typeof VARIANT_STYLES;
  /** Additional content below the instructions */
  children?: ReactNode;
}

/**
 * NexbotGuide - Standalone NEXBOT 3D robot for onboarding and empty states.
 *
 * Renders a Spline NEXBOT model centered with instruction text below.
 * The robot follows the mouse cursor for an interactive feel.
 * Used in all Agent Map empty states to give a professional, branded experience.
 */
export function NexbotGuide({
  title,
  subtitle,
  variant = 'default',
  children,
}: NexbotGuideProps) {
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const colors = VARIANT_STYLES[variant];

  const handleLoad = useCallback((app: unknown) => {
    const internals = app as SplineInternals;

    // Disable the watermark shader pass
    try {
      const pipeline = internals._renderer?.pipeline;
      if (pipeline?.logoOverlayPass) {
        pipeline.logoOverlayPass.enabled = false;
      }
      pipeline?.setWatermark(null);
    } catch {
      // Internal API may change between runtime versions
    }

    // Restart animation loop after pipeline modification
    try {
      internals.play?.();
    } catch {
      // play() may not exist in all runtime versions
    }

    setIsLoading(false);
  }, []);

  // Forward global pointer events to the Spline canvas so the robot
  // tracks the mouse even when the cursor is outside its canvas.
  useEffect(() => {
    if (isLoading) return;
    const container = containerRef.current;
    if (!container) return;

    const canvas = container.querySelector('canvas');
    if (!canvas) return;

    let isOverCanvas = false;

    function onEnter() { isOverCanvas = true; }
    function onLeave() { isOverCanvas = false; }

    function onGlobalPointerMove(e: PointerEvent) {
      if (isOverCanvas) return;
      canvas!.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: e.clientX,
          clientY: e.clientY,
          pointerId: 1,
          pointerType: 'mouse',
          bubbles: false,
        }),
      );
    }

    canvas.addEventListener('pointerenter', onEnter);
    canvas.addEventListener('pointerleave', onLeave);
    window.addEventListener('pointermove', onGlobalPointerMove);

    return () => {
      canvas.removeEventListener('pointerenter', onEnter);
      canvas.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('pointermove', onGlobalPointerMove);
    };
  }, [isLoading]);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 px-6">
      {/* NEXBOT 3D Model */}
      <div
        ref={containerRef}
        className="relative overflow-hidden shrink-0"
        style={{ width: GUIDE_SIZE, height: GUIDE_SIZE }}
      >
        {/* Loading spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div
              className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{
                borderColor: `${colors.accent}30`,
                borderTopColor: 'transparent',
              }}
            />
          </div>
        )}

        {/* Spline canvas at 2x for crisp rendering */}
        <div
          style={{
            width: RENDER_SIZE,
            height: RENDER_SIZE,
            transform: `scale(${1 / RENDER_SCALE})`,
            transformOrigin: 'top left',
          }}
        >
          <Spline
            scene={SPLINE_URLS.main}
            onLoad={handleLoad}
            style={{
              width: '100%',
              height: '100%',
              opacity: isLoading ? 0 : 1,
              transition: 'opacity 0.5s ease-in',
            }}
          />
        </div>

        {/* Ambient glow around the robot */}
        {!isLoading && (
          <div
            className="absolute inset-[-6px] rounded-2xl pointer-events-none transition-all duration-700"
            style={{
              boxShadow: `0 0 20px ${colors.accent}25, 0 0 40px ${colors.accent}10`,
            }}
          />
        )}
      </div>

      {/* Instruction text */}
      <div className="flex flex-col items-center gap-2 max-w-sm text-center">
        <h3 className={`${colors.text} text-sm font-mono font-semibold`}>
          {title}
        </h3>
        {subtitle && (
          <p className="text-zinc-500 text-xs font-mono leading-relaxed">
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
