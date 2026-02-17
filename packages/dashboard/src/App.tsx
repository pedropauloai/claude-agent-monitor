import { Shell } from "./components/layout/Shell";
import { ToastContainer } from "./components/shared/ToastContainer";
import { useSession } from "./hooks/use-session";
import { useSSE } from "./hooks/use-sse";
import { useProject } from "./hooks/use-project";
import { useSprint } from "./hooks/use-sprint";
import { useTasks } from "./hooks/use-tasks";
import { useAgentMapSync } from "./hooks/use-agent-map-sync";
import { useProjectUrl } from "./hooks/use-project-url.js";
import { useSettingsSync } from "./hooks/use-settings-sync.js";

export default function App() {
  const { session } = useSession();
  useSSE(session?.id);
  useProject();
  useSprint();
  useTasks();
  useAgentMapSync();
  useProjectUrl();
  useSettingsSync();

  return (
    <>
      <Shell />
      <ToastContainer />
    </>
  );
}
