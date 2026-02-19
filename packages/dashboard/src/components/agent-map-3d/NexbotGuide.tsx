import Spline from '@splinetool/react-spline';
import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { SPLINE_URLS } from './scene-constants.js';

/**
 * Minimal type for accessing Spline runtime internals.
 * Used to disable the watermark shader pass and adjust camera zoom.
 */
interface SplineInternals {
  _renderer?: {
    pipeline?: {
      setWatermark: (texture: null) => void;
      logoOverlayPass?: { enabled: boolean };
    };
  };
  play?: () => void;
  setZoom?: (zoom: number) => void;
}

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
 * NexbotGuide - Full-screen NEXBOT 3D robot for onboarding and empty states.
 *
 * Renders the Spline NEXBOT model filling the entire container with
 * instruction text overlaid at the bottom via gradient fade.
 * The robot follows the mouse cursor for an interactive feel.
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

    // Zoom in for a close-up of the robot's head
    try {
      internals.setZoom?.(1.8);
    } catch {
      // setZoom may not exist in all runtime versions
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
    <div className="relative w-full h-full overflow-hidden">
      {/* NEXBOT 3D Model — fills entire area */}
      <div
        ref={containerRef}
        className="absolute inset-0"
      >
        {/* Loading spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div
              className="w-10 h-10 border-2 rounded-full animate-spin"
              style={{
                borderColor: `${colors.accent}30`,
                borderTopColor: 'transparent',
              }}
            />
          </div>
        )}

        <Spline
          scene={SPLINE_URLS.main}
          onLoad={handleLoad}
          style={{
            width: '100%',
            height: '100%',
            opacity: isLoading ? 0 : 1,
            transition: 'opacity 0.8s ease-in',
          }}
        />
      </div>

      {/* Gradient overlay for text readability */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(10,10,18,0.95) 0%, rgba(10,10,18,0.6) 25%, transparent 50%)',
        }}
      />

      {/* Ambient glow */}
      {!isLoading && (
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-1000"
          style={{
            boxShadow: `inset 0 0 80px ${colors.accent}08, inset 0 0 160px ${colors.accent}04`,
          }}
        />
      )}

      {/* Instruction text — anchored to bottom */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-2.5 p-8 pb-10 pointer-events-none">
        <h3 className={`${colors.text} text-lg font-mono font-semibold`}>
          {title}
        </h3>
        {subtitle && (
          <p className="text-zinc-400 text-sm font-mono leading-relaxed max-w-md text-center">
            {subtitle}
          </p>
        )}
        <div className="pointer-events-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
