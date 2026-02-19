import { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Project } from '@claudecam/shared';
import { useProjectStore } from '../../stores/project-store.js';
import { useSessionStore } from '../../stores/session-store.js';
import { useSettingsStore } from '../../stores/settings-store.js';
import type { ThemeName } from '../../stores/settings-store.js';
import { formatPercent } from '../../lib/formatters.js';
import { deleteProject } from '../../lib/api.js';
import { ActiveIndicator } from './ActiveIndicator.js';
import { ConfirmModal } from '../shared/ConfirmModal.js';

interface ProjectSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenSettings: () => void;
}

function projectColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 55%)`;
}

function completionPercent(project: Project): number {
  if (project.totalTasks === 0) return 0;
  return Math.round((project.completedTasks / project.totalTasks) * 100);
}

// === Theme style helpers ===

function getSidebarStyle(theme: ThemeName): React.CSSProperties {
  switch (theme) {
    case 'pixel':
      return {
        background: 'var(--pixel-bg-dark, #0f0f1e)',
        borderRight: '3px solid var(--pixel-border, #444477)',
        fontFamily: "'Press Start 2P', monospace",
        imageRendering: 'pixelated',
      };
    case 'terminal':
      return {
        background: '#0a0a0a',
        borderRight: '1px solid #1a3a1a',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      };
    default:
      return {};
  }
}

function getSidebarClasses(theme: ThemeName): string {
  switch (theme) {
    case 'pixel':
    case 'terminal':
      return 'flex flex-col h-full shrink-0 select-none';
    case 'modern':
    default:
      return 'flex flex-col h-full bg-cam-surface border-r border-cam-border/50 shrink-0 select-none';
  }
}

function getHeaderStyle(theme: ThemeName): React.CSSProperties {
  switch (theme) {
    case 'pixel':
      return {
        borderBottom: '3px solid var(--pixel-border, #444477)',
        background: 'var(--pixel-surface, #222244)',
      };
    case 'terminal':
      return { borderBottom: '1px solid #1a3a1a' };
    default:
      return {};
  }
}

function getHeaderClasses(theme: ThemeName): string {
  switch (theme) {
    case 'pixel':
    case 'terminal':
      return 'flex items-center justify-between h-12 px-3 shrink-0';
    case 'modern':
    default:
      return 'flex items-center justify-between h-12 px-3 border-b border-cam-border/50 shrink-0';
  }
}

function getHeaderLabelStyle(theme: ThemeName): React.CSSProperties {
  switch (theme) {
    case 'pixel':
      return { fontSize: '7px', lineHeight: '12px', color: 'var(--pixel-gold, #ffd700)' };
    case 'terminal':
      return { fontSize: '11px', color: '#00ff00', textShadow: '0 0 4px rgba(0,255,0,0.4)' };
    default:
      return {};
  }
}

function getHeaderLabelClasses(theme: ThemeName): string {
  switch (theme) {
    case 'pixel':
    case 'terminal':
      return 'whitespace-nowrap overflow-hidden';
    case 'modern':
    default:
      return 'text-xs font-semibold text-cam-text tracking-tight whitespace-nowrap overflow-hidden';
  }
}

function getHeaderLabel(theme: ThemeName): string {
  switch (theme) {
    case 'pixel': return 'PROJECTS';
    case 'terminal': return '[PROJECTS]';
    default: return 'Projects';
  }
}

function getCollapseButtonClasses(theme: ThemeName): string {
  switch (theme) {
    case 'pixel':
      return 'p-1.5 pixel-btn';
    case 'terminal':
      return 'p-1.5';
    case 'modern':
    default:
      return 'p-1.5 rounded-md text-cam-text-muted hover:text-cam-text hover:bg-cam-surface-2 transition-colors';
  }
}

function getCollapseButtonStyle(theme: ThemeName): React.CSSProperties {
  switch (theme) {
    case 'pixel':
      return { color: 'var(--pixel-text, #e8e8ff)' };
    case 'terminal':
      return { color: '#00aa00' };
    default:
      return {};
  }
}

function getNavClasses(theme: ThemeName): string {
  switch (theme) {
    case 'pixel':
      return 'flex-1 overflow-y-auto overflow-x-hidden py-1 space-y-0.5 px-1 pixel-scrollbar';
    case 'terminal':
      return 'flex-1 overflow-y-auto overflow-x-hidden py-1 space-y-0 px-1 terminal-scrollbar';
    case 'modern':
    default:
      return 'flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-0.5 px-2';
  }
}

function getFooterClasses(theme: ThemeName): string {
  switch (theme) {
    case 'pixel':
    case 'terminal':
      return 'shrink-0 p-2';
    case 'modern':
    default:
      return 'shrink-0 border-t border-cam-border/50 p-2';
  }
}

function getFooterStyle(theme: ThemeName): React.CSSProperties {
  switch (theme) {
    case 'pixel':
      return { borderTop: '3px solid var(--pixel-border, #444477)' };
    case 'terminal':
      return { borderTop: '1px solid #1a3a1a' };
    default:
      return {};
  }
}

function getSettingsButtonClasses(theme: ThemeName, collapsed: boolean): string {
  const base = collapsed ? 'justify-center p-2' : 'px-3 py-2';
  switch (theme) {
    case 'pixel':
      return `flex items-center gap-2 w-full pixel-btn ${base}`;
    case 'terminal':
      return `flex items-center gap-2 w-full ${base}`;
    case 'modern':
    default:
      return `flex items-center gap-2 w-full rounded-md text-cam-text-muted hover:text-cam-text hover:bg-cam-surface-2 transition-colors ${base}`;
  }
}

function getSettingsButtonStyle(theme: ThemeName): React.CSSProperties {
  switch (theme) {
    case 'pixel':
      return { color: 'var(--pixel-text-muted, #8888bb)' };
    case 'terminal':
      return { color: '#00aa00', fontSize: '11px' };
    default:
      return {};
  }
}

function getSettingsLabel(theme: ThemeName): string {
  switch (theme) {
    case 'terminal': return '> config';
    default: return 'Settings';
  }
}

function getSettingsLabelClasses(theme: ThemeName): string {
  switch (theme) {
    case 'pixel':
      return 'whitespace-nowrap overflow-hidden';
    case 'terminal':
      return 'whitespace-nowrap overflow-hidden';
    case 'modern':
    default:
      return 'text-xs whitespace-nowrap overflow-hidden';
  }
}

function getSettingsLabelStyle(theme: ThemeName): React.CSSProperties {
  switch (theme) {
    case 'pixel':
      return { fontSize: '6px', lineHeight: '10px' };
    case 'terminal':
      return { fontSize: '11px' };
    default:
      return {};
  }
}

function getEmptyClasses(theme: ThemeName): string {
  switch (theme) {
    case 'pixel':
      return 'text-center px-2 py-4';
    case 'terminal':
      return 'text-center px-2 py-4';
    case 'modern':
    default:
      return 'text-[10px] text-cam-text-muted text-center px-2 py-4';
  }
}

function getEmptyStyle(theme: ThemeName): React.CSSProperties {
  switch (theme) {
    case 'pixel':
      return { fontSize: '6px', lineHeight: '12px', color: 'var(--pixel-text-muted, #8888bb)' };
    case 'terminal':
      return { fontSize: '10px', color: '#00aa00' };
    default:
      return {};
  }
}

export function ProjectSidebar({
  collapsed,
  onToggleCollapse,
  onOpenSettings,
}: ProjectSidebarProps) {
  const { projects, activeProject, setActiveProject, removeProject } = useProjectStore();
  const agents = useSessionStore((s) => s.agents);
  const events = useSessionStore((s) => s.events);
  const theme = useSettingsStore((s) => s.theme);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const handleDeleteProject = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteProject(deleteTarget.id);
      removeProject(deleteTarget.id);
    } catch {
      // Delete failed silently
    }
    setDeleteTarget(null);
  }, [deleteTarget, removeProject]);

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [projects]);

  const projectIdFromSession = useSessionStore((s) => s.projectId);

  function handleSelectProject(project: Project) {
    setActiveProject(project);
  }

  const hasRecentEvents = useMemo(() => {
    if (events.length === 0) return false;
    const latestEvent = events[0];
    if (!latestEvent?.timestamp) return false;
    const elapsed = Date.now() - new Date(latestEvent.timestamp).getTime();
    return elapsed < 5_000;
  }, [events]);

  const collapseIcon = theme === 'terminal' ? (
    <span style={{ fontSize: '11px', color: '#00aa00' }}>{collapsed ? '>' : '<'}</span>
  ) : theme === 'pixel' ? (
    <span style={{ fontSize: '8px', fontFamily: "'Press Start 2P', monospace" }}>{collapsed ? '\u25B6' : '\u25C0'}</span>
  ) : (
    <svg
      className={`w-4 h-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );

  const settingsIcon = theme === 'terminal' ? (
    <span style={{ fontSize: '11px', color: '#00aa00' }}>[*]</span>
  ) : theme === 'pixel' ? (
    <span style={{ fontSize: '8px', fontFamily: "'Press Start 2P', monospace", color: 'var(--pixel-text-muted)' }}>{'\u2699'}</span>
  ) : (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );

  return (
    <motion.aside
      className={getSidebarClasses(theme)}
      style={getSidebarStyle(theme)}
      animate={{ width: collapsed ? 56 : 224 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
      {/* Header */}
      <div className={getHeaderClasses(theme)} style={getHeaderStyle(theme)}>
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.span
              key="logo-text"
              className={getHeaderLabelClasses(theme)}
              style={getHeaderLabelStyle(theme)}
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
            >
              {getHeaderLabel(theme)}
            </motion.span>
          )}
        </AnimatePresence>

        <button
          onClick={onToggleCollapse}
          className={getCollapseButtonClasses(theme)}
          style={getCollapseButtonStyle(theme)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapseIcon}
        </button>
      </div>

      {/* Project list */}
      <nav className={getNavClasses(theme)}>
        {sortedProjects.length === 0 && !collapsed && (
          <p className={getEmptyClasses(theme)} style={getEmptyStyle(theme)}>
            {theme === 'terminal'
              ? '> no projects. run: cam init'
              : <>No registered projects. Use <code className="text-cam-accent">cam init</code> to get started.</>
            }
          </p>
        )}

        {sortedProjects.map((project) => {
          const isActive = activeProject?.id === project.id;
          const hasActiveSession = projectIdFromSession === project.id;
          const activeAgentCount = hasActiveSession ? agents.length : 0;
          const color = projectColor(project.name);
          const pct = completionPercent(project);

          return (
            <ProjectItem
              key={project.id}
              project={project}
              isActive={isActive}
              collapsed={collapsed}
              color={color}
              completionPct={pct}
              agentCount={activeAgentCount}
              hasNewEvents={hasActiveSession && hasRecentEvents}
              onSelect={handleSelectProject}
              onDelete={setDeleteTarget}
              theme={theme}
            />
          );
        })}
      </nav>

      {/* Footer */}
      <div className={getFooterClasses(theme)} style={getFooterStyle(theme)}>
        <button
          onClick={onOpenSettings}
          className={getSettingsButtonClasses(theme, collapsed)}
          style={getSettingsButtonStyle(theme)}
          title="Settings"
        >
          {settingsIcon}
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                key="settings-label"
                className={getSettingsLabelClasses(theme)}
                style={getSettingsLabelStyle(theme)}
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
              >
                {getSettingsLabel(theme)}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete project"
        message={`Are you sure you want to delete "${deleteTarget?.name ?? ''}"? All sprints and tasks will be permanently removed. This action cannot be undone.`}
        onConfirm={handleDeleteProject}
        onCancel={() => setDeleteTarget(null)}
      />
    </motion.aside>
  );
}

/* ------------------------------------------------------------------ */
/* ProjectItem                                                         */
/* ------------------------------------------------------------------ */

interface ProjectItemProps {
  project: Project;
  isActive: boolean;
  collapsed: boolean;
  color: string;
  completionPct: number;
  agentCount: number;
  hasNewEvents: boolean;
  onSelect: (project: Project) => void;
  onDelete: (project: Project) => void;
  theme: ThemeName;
}

function ProjectItem({
  project,
  isActive,
  collapsed,
  color,
  completionPct,
  agentCount,
  hasNewEvents,
  onSelect,
  onDelete,
  theme,
}: ProjectItemProps) {
  const initial = project.name.charAt(0).toUpperCase();
  const isProjectActive = project.status === 'active';

  // === Collapsed mode ===
  if (collapsed) {
    const collapsedClasses = theme === 'pixel'
      ? `relative flex items-center justify-center w-full p-2 ${isActive ? 'pixel-border-accent' : 'pixel-btn'}`
      : theme === 'terminal'
        ? `relative flex items-center justify-center w-full p-2 ${isActive ? 'bg-[#0a1f0a] border border-[#00ff00]' : 'hover:bg-[#0a1f0a] border border-transparent'}`
        : `relative flex items-center justify-center w-full rounded-md p-2 transition-colors ${
            isActive ? 'bg-cam-accent/10 ring-1 ring-cam-accent/40' : 'hover:bg-cam-surface-2'
          }`;

    const avatarStyle: React.CSSProperties = theme === 'pixel'
      ? { backgroundColor: color, imageRendering: 'pixelated', borderRadius: 0, border: '2px solid var(--pixel-border)' }
      : theme === 'terminal'
        ? { backgroundColor: 'transparent', color: '#00ff00', border: '1px solid #00aa00', borderRadius: 0, fontFamily: 'monospace', fontSize: '12px' }
        : { backgroundColor: color };

    return (
      <motion.button
        onClick={() => onSelect(project)}
        className={collapsedClasses}
        title={`${project.name} (${completionPct}%)`}
        whileHover={{ scale: theme === 'pixel' ? 1 : 1.05 }}
        whileTap={{ scale: theme === 'pixel' ? 1 : 0.95 }}
      >
        <div
          className={`w-8 h-8 flex items-center justify-center text-xs font-bold text-white shrink-0 ${theme === 'modern' ? 'rounded-full' : ''}`}
          style={avatarStyle}
        >
          {initial}
        </div>

        {agentCount > 0 && (
          <span className="absolute top-1 right-1">
            <span className="relative flex h-2 w-2">
              {theme === 'terminal' ? (
                <span className="relative inline-flex h-2 w-2" style={{ background: '#00ff00', borderRadius: 0 }} />
              ) : (
                <>
                  <span className="absolute inline-flex h-full w-full rounded-full bg-cam-success opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cam-success" />
                </>
              )}
            </span>
          </span>
        )}
      </motion.button>
    );
  }

  // === Expanded mode ===
  if (theme === 'terminal') {
    return (
      <button
        onClick={() => onSelect(project)}
        className={`relative w-full text-left px-2 py-1.5 transition-colors ${
          isActive ? 'bg-[#0a1f0a]' : 'hover:bg-[#0a1f0a]'
        }`}
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          borderLeft: isActive ? '2px solid #00ff00' : '2px solid transparent',
        }}
      >
        <div className="flex items-center gap-1.5">
          <span style={{ color: isActive ? '#00ff00' : '#00aa00' }}>
            {isActive ? '>' : ' '}
          </span>
          <span style={{ color: '#00aa00' }}>[DIR]</span>
          <span
            className="truncate"
            style={{
              color: isActive ? '#00ff00' : '#00aa00',
              textShadow: isActive ? '0 0 4px rgba(0,255,0,0.4)' : 'none',
            }}
          >
            {project.name}
          </span>
          {agentCount > 0 && (
            <span style={{ color: '#00ff00', fontSize: '10px' }}>[{agentCount}]</span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5 ml-4">
          <span style={{ color: '#006600', fontSize: '10px' }}>
            {project.completedTasks}/{project.totalTasks}
          </span>
          <span style={{ color: '#006600', fontSize: '10px' }}>
            [{'\u2588'.repeat(Math.round(completionPct / 10))}{'\u2591'.repeat(10 - Math.round(completionPct / 10))}] {completionPct}%
          </span>
        </div>
        {/* Delete button - terminal theme */}
        <span
          onClick={(e) => { e.stopPropagation(); onDelete(project); }}
          className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 hover:opacity-100 transition-opacity"
          style={{ color: '#aa0000', fontSize: '10px', cursor: 'pointer' }}
          title="Delete project"
        >[DEL]</span>
      </button>
    );
  }

  if (theme === 'pixel') {
    return (
      <button
        onClick={() => onSelect(project)}
        className={`relative w-full text-left p-2 ${isActive ? 'pixel-border-accent' : 'pixel-btn'}`}
        style={{ fontFamily: "'Press Start 2P', monospace" }}
      >
        <div className="flex items-start gap-2">
          {/* Pixel avatar (square) */}
          <div
            className="w-6 h-6 flex items-center justify-center shrink-0 mt-0.5"
            style={{
              backgroundColor: color,
              border: '2px solid var(--pixel-border)',
              imageRendering: 'pixelated',
              fontSize: '7px',
              color: '#fff',
              fontWeight: 'bold',
            }}
          >
            {initial}
          </div>

          <div className="flex-1 min-w-0">
            {/* Name */}
            <div className="flex items-center gap-1">
              <span
                style={{
                  width: '4px',
                  height: '4px',
                  display: 'inline-block',
                  background: isProjectActive ? 'var(--pixel-green)' : 'var(--pixel-text-muted)',
                }}
              />
              <span
                className="truncate"
                style={{
                  fontSize: '6px',
                  lineHeight: '10px',
                  color: isActive ? 'var(--pixel-gold)' : 'var(--pixel-text)',
                }}
              >
                {project.name.toUpperCase()}
              </span>
            </div>

            {/* Progress */}
            <div className="flex items-center justify-between mt-1">
              <span style={{ fontSize: '6px', color: 'var(--pixel-text-muted)' }}>
                {project.completedTasks}/{project.totalTasks}
              </span>
              <span style={{ fontSize: '6px', color: 'var(--pixel-text-muted)' }}>
                {completionPct}%
              </span>
            </div>

            {/* Pixel progress bar */}
            <div
              className="w-full mt-1 pixel-bar-container"
              style={{ height: '6px' }}
            >
              <div
                className="pixel-bar-fill"
                style={{
                  width: `${completionPct}%`,
                  background: isActive ? 'var(--pixel-gold)' : 'var(--pixel-green)',
                  transition: 'width 0.3s steps(8)',
                }}
              />
            </div>
          </div>

          {agentCount > 0 && (
            <div className="shrink-0 mt-0.5">
              <span
                className="pixel-pulse"
                style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '6px',
                  background: 'var(--pixel-green)',
                  boxShadow: '0 0 4px var(--pixel-green)',
                }}
              />
            </div>
          )}
        </div>
        {/* Delete button - pixel theme */}
        <span
          onClick={(e) => { e.stopPropagation(); onDelete(project); }}
          className="absolute right-1 top-1 opacity-0 hover:opacity-100 transition-opacity"
          style={{ fontSize: '6px', color: '#ff4444', cursor: 'pointer', fontFamily: "'Press Start 2P', monospace" }}
          title="Delete project"
        >X</span>
      </button>
    );
  }

  // Modern (default)
  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(project)}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(project);
        }
      }}
      className={`relative w-full text-left rounded-lg p-2.5 transition-all duration-150 group cursor-pointer ${
        isActive
          ? 'bg-cam-accent/10 border-l-2 border-cam-accent'
          : 'border-l-2 border-transparent hover:bg-cam-surface-2'
      }`}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
          style={{ backgroundColor: color }}
        >
          {initial}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              isProjectActive ? 'bg-cam-success' : 'bg-cam-text-muted'
            }`} />
            <span className="text-xs font-medium text-cam-text truncate">
              {project.name}
            </span>
          </div>

          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-cam-text-muted font-mono">
              {project.completedTasks}/{project.totalTasks}
            </span>
            <span className="text-[10px] text-cam-text-muted">
              {formatPercent(project.completedTasks, project.totalTasks)}
            </span>
          </div>

          <div className="w-full h-1 bg-cam-surface-3 rounded-full overflow-hidden mt-1">
            <motion.div
              className="h-full bg-cam-accent rounded-full"
              initial={false}
              animate={{ width: `${completionPct}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>

        {agentCount > 0 && (
          <div className="shrink-0 mt-0.5">
            <ActiveIndicator agentCount={agentCount} hasNewEvents={hasNewEvents} />
          </div>
        )}
      </div>

      {/* Delete button - appears on hover (modern theme) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(project);
        }}
        className="absolute top-1.5 right-1.5 p-1 rounded-md text-cam-text-muted hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
        title="Delete project"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </motion.div>
  );
}
