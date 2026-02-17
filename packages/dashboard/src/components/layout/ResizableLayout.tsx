import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';
import type { ReactNode } from 'react';

// === Interfaces ===

interface HorizontalLayoutProps {
  id: string;
  children: ReactNode;
  locked?: boolean;
}

interface VerticalLayoutProps {
  id: string;
  children: ReactNode;
  locked?: boolean;
}

interface ResizablePanelProps {
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  collapsedSize?: number;
  order?: number;
}

interface ResizeHandleProps {
  direction?: 'horizontal' | 'vertical';
  disabled?: boolean;
  className?: string;
}

// === Components ===

/**
 * HorizontalLayout - Paineis lado a lado (colunas).
 * Wraps PanelGroup with direction="horizontal" and autoSaveId for
 * automatic localStorage persistence of panel sizes.
 */
export function HorizontalLayout({ id, children, locked }: HorizontalLayoutProps) {
  return (
    <PanelGroup
      direction="horizontal"
      autoSaveId={id}
      className="flex-1 overflow-hidden"
    >
      {children}
    </PanelGroup>
  );
}

/**
 * VerticalLayout - Paineis empilhados (linhas).
 * Wraps PanelGroup with direction="vertical" and autoSaveId for
 * automatic localStorage persistence of panel sizes.
 */
export function VerticalLayout({ id, children, locked }: VerticalLayoutProps) {
  return (
    <PanelGroup
      direction="vertical"
      autoSaveId={id}
      className="flex-1 flex flex-col overflow-hidden"
    >
      {children}
    </PanelGroup>
  );
}

/**
 * ResizablePanel - Wrapper for individual panels inside a layout.
 * Passes through all sizing props to the underlying Panel component
 * and applies overflow-hidden by default.
 */
export function ResizablePanel({
  defaultSize,
  minSize,
  maxSize,
  children,
  className,
  collapsible,
  collapsedSize,
  order,
}: ResizablePanelProps) {
  return (
    <Panel
      defaultSize={defaultSize}
      minSize={minSize}
      maxSize={maxSize}
      collapsible={collapsible}
      collapsedSize={collapsedSize}
      order={order}
      className={`overflow-hidden${className ? ` ${className}` : ''}`}
    >
      {children}
    </Panel>
  );
}

/**
 * ResizeHandle - The draggable divider between panels.
 * Renders a thin line that expands on hover with accent color feedback.
 * When disabled, renders nothing (panels become fixed).
 */
export function ResizeHandle({
  direction = 'horizontal',
  disabled,
  className,
}: ResizeHandleProps) {
  if (disabled) {
    return null;
  }

  const isHorizontal = direction === 'horizontal';

  const handleClasses = isHorizontal
    ? 'w-px hover:w-1 bg-cam-border/50 hover:bg-cam-accent/50 transition-all cursor-col-resize'
    : 'h-px hover:h-1 bg-cam-border/50 hover:bg-cam-accent/50 transition-all cursor-row-resize';

  return (
    <PanelResizeHandle
      className={`${handleClasses}${className ? ` ${className}` : ''}`}
    />
  );
}
