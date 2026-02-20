import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';
import type { ReactNode } from 'react';
import { useSettingsStore } from '../../stores/settings-store.js';
import type { ThemeName } from '../../stores/settings-store.js';

// === Interfaces ===

interface HorizontalLayoutProps {
  id?: string;
  children: ReactNode;
  locked?: boolean;
}

interface VerticalLayoutProps {
  id?: string;
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

// === Theme-aware handle styles ===

function getHandleClasses(theme: ThemeName, isHorizontal: boolean): string {
  switch (theme) {
    case 'pixel':
      return isHorizontal
        ? 'group relative flex items-center justify-center cursor-col-resize'
        : 'group relative flex items-center justify-center cursor-row-resize';
    case 'terminal':
      return isHorizontal
        ? 'group relative flex items-center justify-center cursor-col-resize'
        : 'group relative flex items-center justify-center cursor-row-resize';
    case 'modern':
    default:
      return isHorizontal
        ? 'group relative flex items-center justify-center cursor-col-resize transition-all duration-200'
        : 'group relative flex items-center justify-center cursor-row-resize transition-all duration-200';
  }
}

function getHandleStyle(theme: ThemeName, isHorizontal: boolean): React.CSSProperties {
  switch (theme) {
    case 'pixel':
      return isHorizontal
        ? {
            width: '8px',
            background: 'var(--pixel-surface, #222244)',
            borderLeft: '2px solid var(--pixel-border, #444477)',
            borderRight: '2px solid var(--pixel-border, #444477)',
          }
        : {
            height: '8px',
            background: 'var(--pixel-surface, #222244)',
            borderTop: '2px solid var(--pixel-border, #444477)',
            borderBottom: '2px solid var(--pixel-border, #444477)',
          };
    case 'terminal':
      return isHorizontal
        ? {
            width: '6px',
            background: '#0a0a0a',
            borderLeft: '1px solid #1a3a1a',
            borderRight: '1px solid #1a3a1a',
          }
        : {
            height: '6px',
            background: '#0a0a0a',
            borderTop: '1px solid #1a3a1a',
            borderBottom: '1px solid #1a3a1a',
          };
    case 'modern':
    default:
      return isHorizontal
        ? { width: '4px', background: 'rgba(100,100,100,0.15)', borderRadius: '2px' }
        : { height: '4px', background: 'rgba(100,100,100,0.15)', borderRadius: '2px' };
  }
}

function HandleIndicator({ theme, isHorizontal }: { theme: ThemeName; isHorizontal: boolean }) {
  switch (theme) {
    case 'pixel': {
      const dots = isHorizontal
        ? { flexDirection: 'column' as const, gap: '3px' }
        : { flexDirection: 'row' as const, gap: '3px' };
      return (
        <div className="flex" style={dots}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: '2px',
                height: '2px',
                background: 'var(--pixel-border-light, #5555aa)',
              }}
              className="group-hover:!bg-[var(--pixel-gold)]"
            />
          ))}
        </div>
      );
    }
    case 'terminal': {
      if (isHorizontal) {
        return (
          <div
            className="flex flex-col items-center gap-0 text-[8px] leading-none group-hover:text-[#00ff00]"
            style={{ color: '#1a3a1a', fontFamily: 'monospace' }}
          >
            <span>{'\u2502'}</span>
            <span>{'\u2502'}</span>
            <span>{'\u2502'}</span>
          </div>
        );
      }
      return (
        <div
          className="flex items-center gap-0 text-[8px] leading-none group-hover:text-[#00ff00]"
          style={{ color: '#1a3a1a', fontFamily: 'monospace' }}
        >
          <span>{'\u2550\u2550\u2550'}</span>
        </div>
      );
    }
    case 'modern':
    default: {
      const dots = isHorizontal
        ? { flexDirection: 'column' as const, gap: '2px' }
        : { flexDirection: 'row' as const, gap: '2px' };
      return (
        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={dots}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-full bg-white/20 group-hover:bg-blue-400/50"
              style={{ width: '3px', height: '3px' }}
            />
          ))}
        </div>
      );
    }
  }
}

// === Components ===

export function HorizontalLayout({ id, children }: HorizontalLayoutProps) {
  return (
    <PanelGroup
      direction="horizontal"
      {...(id ? { autoSaveId: id } : {})}
      className="flex-1 overflow-hidden"
    >
      {children}
    </PanelGroup>
  );
}

export function VerticalLayout({ id, children }: VerticalLayoutProps) {
  return (
    <PanelGroup
      direction="vertical"
      {...(id ? { autoSaveId: id } : {})}
      className="flex-1 flex flex-col overflow-hidden"
    >
      {children}
    </PanelGroup>
  );
}

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

export function ResizeHandle({
  direction = 'horizontal',
  disabled,
  className,
}: ResizeHandleProps) {
  const theme = useSettingsStore((s) => s.theme);

  const isHorizontal = direction === 'horizontal';

  return (
    <PanelResizeHandle
      disabled={disabled}
      className={`${getHandleClasses(theme, isHorizontal)}${className ? ` ${className}` : ''}${disabled ? ' pointer-events-none opacity-30' : ''}`}
      style={getHandleStyle(theme, isHorizontal)}
    >
      <HandleIndicator theme={theme} isHorizontal={isHorizontal} />
    </PanelResizeHandle>
  );
}
