import { useState, useCallback, useRef, useEffect } from 'react';
import { MIN_ZOOM, MAX_ZOOM } from './scene-constants.js';

/**
 * Zoom & Pan state for the Agent Map.
 *
 * Controls:
 * - Mouse wheel → zoom toward cursor
 * - Click + drag on empty space → pan
 * - Double-click → reset to default
 *
 * NOTE: The CSS transform uses `transformOrigin: '0 0'` (top-left).
 * The zoom-toward-cursor math depends on this. If the transform origin
 * changes, the pan adjustment formulas must be updated too.
 */

interface ZoomPanState {
  zoom: number;
  panX: number;
  panY: number;
}

interface UseZoomPanResult {
  zoom: number;
  panX: number;
  panY: number;
  isPanning: boolean;
  /** CSS transform string for the content wrapper */
  transformStyle: string;
  /** Attach to the container's onMouseDown */
  handleMouseDown: (e: React.MouseEvent) => void;
  /** Reset zoom/pan to defaults */
  reset: () => void;
}

const DEFAULT_STATE: ZoomPanState = { zoom: 1, panX: 0, panY: 0 };

export function useZoomPan(
  container: HTMLDivElement | null,
): UseZoomPanResult {
  const [state, setState] = useState<ZoomPanState>(DEFAULT_STATE);
  const [isPanning, setIsPanning] = useState(false);

  // Use refs to avoid stale closures in global event handlers
  const stateRef = useRef(state);
  stateRef.current = state;
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // ---- Wheel zoom (attached via native listener for { passive: false }) ----
  useEffect(() => {
    if (!container) return;

    function onWheel(e: WheelEvent) {
      // Horizontal scroll → let browser handle it
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault(); // Must be non-passive to work
      e.stopPropagation(); // Prevent Spline canvas from intercepting wheel events

      const rect = container!.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      setState((prev) => {
        const factor = 1 - e.deltaY * 0.001;
        const newZoom = Math.round(
          Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev.zoom * factor)) * 100,
        ) / 100; // Round to 2 decimal places to avoid floating-point boundary stickiness

        if (newZoom === prev.zoom) return prev;

        const ratio = newZoom / prev.zoom;
        // Zoom toward cursor: adjust pan so the point under cursor stays fixed
        const newPanX = cursorX - ratio * (cursorX - prev.panX);
        const newPanY = cursorY - ratio * (cursorY - prev.panY);

        return { zoom: newZoom, panX: newPanX, panY: newPanY };
      });
    }

    // Capture phase so our zoom handler runs BEFORE the Spline canvas
    // can intercept the event. Non-passive to allow preventDefault.
    container.addEventListener('wheel', onWheel, { passive: false, capture: true });
    return () => container.removeEventListener('wheel', onWheel, { capture: true });
  }, [container]);

  // ---- Pan: mouse down ----
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only pan with left-click on empty space or middle-click
    const isOnAgent = (e.target as HTMLElement).closest('[data-agent-id]');
    if (e.button === 0 && isOnAgent) return; // left-click on agent = drag, not pan
    if (e.button !== 0 && e.button !== 1) return; // only left or middle

    isPanningRef.current = true;
    setIsPanning(true);

    const s = stateRef.current;
    panStartRef.current = { x: e.clientX, y: e.clientY, panX: s.panX, panY: s.panY };
    e.preventDefault();
  }, []);

  // ---- Global mouse move/up for pan (uses refs, no stale closures) ----
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isPanningRef.current) return;

      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;

      setState({
        zoom: stateRef.current.zoom,
        panX: panStartRef.current.panX + dx,
        panY: panStartRef.current.panY + dy,
      });
    }

    function onMouseUp() {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        setIsPanning(false);
      }
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []); // No deps needed — uses only refs

  const reset = useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);

  const transformStyle = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;

  return {
    zoom: state.zoom,
    panX: state.panX,
    panY: state.panY,
    isPanning,
    transformStyle,
    handleMouseDown,
    reset,
  };
}
