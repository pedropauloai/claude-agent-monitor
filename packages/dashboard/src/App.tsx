import { Shell } from "./components/layout/Shell";
import { ToastContainer } from "./components/shared/ToastContainer";
import { useSession } from "./hooks/use-session";
import { useSSE } from "./hooks/use-sse";
import { useProject } from "./hooks/use-project";
import { useSprint } from "./hooks/use-sprint";
import { useTasks } from "./hooks/use-tasks";
import { useAgentMapSync } from "./hooks/use-agent-map-sync";

export default function App() {
  const { session } = useSession();
  useSSE(session?.id);
  useProject();
  useSprint();
  useTasks();
  useAgentMapSync();

  return (
    <>
      <Shell />
      <ToastContainer />
    </>
  );
}
