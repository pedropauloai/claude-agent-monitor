import { sendEvent } from "../transport.js";

export function handleSubagentStart(stdinData: Record<string, unknown>): void {
  const sessionId = (stdinData["session_id"] as string) ?? "";
  const agentId = ((stdinData["agent_id"] as string) ?? sessionId) || "unknown";
  const agentType = (stdinData["agent_type"] as string) ?? "general-purpose";
  const workingDirectory = (stdinData["cwd"] as string) || process.cwd();

  sendEvent({
    hook: "SubagentStart",
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    agent_id: agentId,
    data: {
      agent_type: agentType,
      working_directory: workingDirectory,
    },
  });
}
