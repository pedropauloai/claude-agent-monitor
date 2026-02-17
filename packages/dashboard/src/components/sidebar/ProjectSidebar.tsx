import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Project } from '@cam/shared';
import { useProjectStore } from '../../stores/project-store.js';
import { useSessionStore } from '../../stores/session-store.js';
import { formatPercent } from '../../lib/formatters.js';
import { ActiveIndicator } from './ActiveIndicator.js';

interface ProjectSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenSettings: () => void;
}

/**
 * Gera uma cor HSL deterministica a partir do nome do projeto.
 * Usada para o circulo com a inicial do projeto.
 */
function projectColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 55%)`;
}

/**
 * Calcula a porcentagem de conclusao como numero (0-100).
 */
function completionPercent(project: Project): number {
  if (project.totalTasks === 0) return 0;
  return Math.round((project.completedTasks / project.totalTasks) * 100);
}

/**
 * Sidebar colapsavel que lista todos os projetos registrados.
 * Modo expandido mostra detalhes (nome, progresso, status).
 * Modo colapsado mostra apenas a inicial colorida de cada projeto.
 */
export function ProjectSidebar({
  collapsed,
  onToggleCollapse,
  onOpenSettings,
}: ProjectSidebarProps) {
  const { projects, activeProject, setActiveProject } = useProjectStore();
  const session = useSessionStore((s) => s.session);
  const agents = useSessionStore((s) => s.agents);
  const events = useSessionStore((s) => s.events);

  // Ordena: projetos ativos primeiro, depois por updatedAt mais recente
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [projects]);

  // Determina qual projeto tem sessao ativa (baseado no projectId da session store)
  const projectIdFromSession = useSessionStore((s) => s.projectId);

  function handleSelectProject(project: Project) {
    setActiveProject(project);
  }

  // Detecta se houve novos eventos nos ultimos 5 segundos
  const hasRecentEvents = useMemo(() => {
    if (events.length === 0) return false;
    const latestEvent = events[0];
    if (!latestEvent?.timestamp) return false;
    const elapsed = Date.now() - new Date(latestEvent.timestamp).getTime();
    return elapsed < 5_000;
  }, [events]);

  return (
    <motion.aside
      className="flex flex-col h-full bg-cam-surface border-r border-cam-border/50 shrink-0 select-none"
      animate={{ width: collapsed ? 56 : 224 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
      {/* Header: Logo + Collapse toggle */}
      <div className="flex items-center justify-between h-12 px-3 border-b border-cam-border/50 shrink-0">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.span
              key="logo-text"
              className="text-xs font-semibold text-cam-text tracking-tight whitespace-nowrap overflow-hidden"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
            >
              Projetos
            </motion.span>
          )}
        </AnimatePresence>

        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-md text-cam-text-muted hover:text-cam-text hover:bg-cam-surface-2 transition-colors"
          title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Project list (scrollable) */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-0.5 px-2">
        {sortedProjects.length === 0 && !collapsed && (
          <p className="text-[10px] text-cam-text-muted text-center px-2 py-4">
            Nenhum projeto registrado. Use <code className="text-cam-accent">cam init</code> para comecar.
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
            />
          );
        })}
      </nav>

      {/* Footer: Settings gear */}
      <div className="shrink-0 border-t border-cam-border/50 p-2">
        <button
          onClick={onOpenSettings}
          className={`flex items-center gap-2 w-full rounded-md text-cam-text-muted hover:text-cam-text hover:bg-cam-surface-2 transition-colors ${
            collapsed ? 'justify-center p-2' : 'px-3 py-2'
          }`}
          title="Configuracoes"
        >
          {/* Gear icon */}
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>

          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                key="settings-label"
                className="text-xs whitespace-nowrap overflow-hidden"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
              >
                Configuracoes
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}

/* ------------------------------------------------------------------ */
/* ProjectItem - item individual na lista de projetos                  */
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
}: ProjectItemProps) {
  const initial = project.name.charAt(0).toUpperCase();
  const isProjectActive = project.status === 'active';

  if (collapsed) {
    return (
      <motion.button
        onClick={() => onSelect(project)}
        className={`relative flex items-center justify-center w-full rounded-md p-2 transition-colors ${
          isActive
            ? 'bg-cam-accent/10 ring-1 ring-cam-accent/40'
            : 'hover:bg-cam-surface-2'
        }`}
        title={`${project.name} (${completionPct}%)`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Circulo com inicial */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ backgroundColor: color }}
        >
          {initial}
        </div>

        {/* Indicador de sessao ativa (bolinha verde no canto) */}
        {agentCount > 0 && (
          <span className="absolute top-1 right-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-cam-success opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cam-success" />
            </span>
          </span>
        )}
      </motion.button>
    );
  }

  return (
    <motion.button
      onClick={() => onSelect(project)}
      className={`relative w-full text-left rounded-lg p-2.5 transition-all duration-150 group ${
        isActive
          ? 'bg-cam-accent/10 border-l-2 border-cam-accent'
          : 'border-l-2 border-transparent hover:bg-cam-surface-2'
      }`}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start gap-2.5">
        {/* Circulo com inicial */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
          style={{ backgroundColor: color }}
        >
          {initial}
        </div>

        {/* Detalhes do projeto */}
        <div className="flex-1 min-w-0">
          {/* Nome + status dot */}
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              isProjectActive ? 'bg-cam-success' : 'bg-cam-text-muted'
            }`} />
            <span className="text-xs font-medium text-cam-text truncate">
              {project.name}
            </span>
          </div>

          {/* Contador de tarefas */}
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-cam-text-muted font-mono">
              {project.completedTasks}/{project.totalTasks}
            </span>
            <span className="text-[10px] text-cam-text-muted">
              {formatPercent(project.completedTasks, project.totalTasks)}
            </span>
          </div>

          {/* Barra de progresso */}
          <div className="w-full h-1 bg-cam-surface-3 rounded-full overflow-hidden mt-1">
            <motion.div
              className="h-full bg-cam-accent rounded-full"
              initial={false}
              animate={{ width: `${completionPct}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Indicador de sessao ativa */}
        {agentCount > 0 && (
          <div className="shrink-0 mt-0.5">
            <ActiveIndicator agentCount={agentCount} hasNewEvents={hasNewEvents} />
          </div>
        )}
      </div>
    </motion.button>
  );
}
