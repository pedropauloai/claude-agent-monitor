import { useEffect, useRef } from 'react';
import { useProjectStore } from '../stores/project-store.js';

/**
 * Hook que sincroniza o projeto ativo com o parametro `project_id` na URL.
 *
 * - Na montagem (uma unica vez): le `project_id` da URL e seleciona o projeto.
 * - Quando o projeto ativo muda: atualiza a URL via `history.replaceState`.
 *
 * IMPORTANTE: a sincronizacao URL->store acontece apenas UMA VEZ (na montagem).
 * Depois disso, apenas store->URL roda. Isso evita o loop infinito que acontecia
 * quando activeProject estava nos deps do primeiro useEffect.
 */
export function useProjectUrl() {
  const { projects, activeProject, setActiveProject } = useProjectStore();
  const initialSyncDone = useRef(false);

  // URL -> store: apenas uma vez quando os projetos carregam
  useEffect(() => {
    if (initialSyncDone.current || projects.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('project_id');
    if (projectId) {
      const found = projects.find((p) => p.id === projectId);
      if (found) {
        setActiveProject(found);
      }
    }
    initialSyncDone.current = true;
  }, [projects, setActiveProject]);

  // store -> URL: quando o projeto ativo muda
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
