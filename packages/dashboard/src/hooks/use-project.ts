import { useEffect, useRef } from 'react';
import { useProjectStore } from '../stores/project-store';
import * as api from '../lib/api';

export function useProject() {
  const { projects, activeProject, setProjects, setActiveProject, setProjectsLoaded } = useProjectStore();
  const hasSetDefault = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchProjects() {
      try {
        const { projects: data } = await api.getProjects();
        if (!cancelled) {
          setProjects(data);
          setProjectsLoaded(true);
          // Define projeto padrao apenas uma vez (se nenhum foi selecionado)
          if (!hasSetDefault.current && data.length > 0) {
            const current = useProjectStore.getState().activeProject;
            if (!current) {
              setActiveProject(data[0]);
            }
            hasSetDefault.current = true;
          }
        }
      } catch {
        // ignore
      }
    }

    fetchProjects();
    const interval = setInterval(fetchProjects, 15_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [setProjects, setActiveProject]);

  return { projects, activeProject };
}
