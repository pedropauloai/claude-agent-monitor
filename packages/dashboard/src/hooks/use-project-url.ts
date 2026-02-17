import { useEffect } from 'react';
import { useProjectStore } from '../stores/project-store.js';

/**
 * Hook que sincroniza o projeto ativo com o parametro `project_id` na URL.
 *
 * - Na montagem: le `project_id` da URL e seleciona o projeto correspondente.
 * - Quando o projeto ativo muda: atualiza a URL via `history.replaceState`
 *   (sem recarregar a pagina).
 * - Se nao houver `project_id` na URL e os projetos ja estiverem carregados,
 *   nao altera a URL (permite que a selecao padrao aconteca normalmente).
 */
export function useProjectUrl() {
  const { projects, activeProject, setActiveProject } = useProjectStore();

  // Sincroniza URL -> store na montagem e quando projetos carregam
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('project_id');
    if (projectId && projects.length > 0) {
      const found = projects.find((p) => p.id === projectId);
      if (found && found.id !== activeProject?.id) {
        setActiveProject(found);
      }
    }
  }, [projects, activeProject, setActiveProject]);

  // Sincroniza store -> URL quando o projeto ativo muda
  useEffect(() => {
    if (activeProject) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('project_id') !== activeProject.id) {
        params.set('project_id', activeProject.id);
        window.history.replaceState({}, '', `?${params.toString()}`);
      }
    }
  }, [activeProject]);
}
