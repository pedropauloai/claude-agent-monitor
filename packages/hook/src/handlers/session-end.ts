import { sendEvent } from "../transport.js";

export function handleSessionEnd(stdinData: Record<string, unknown>): void {
  const sessionId = (stdinData["session_id"] as string) ?? "";
  const workingDirectory = (stdinData["cwd"] as string) || process.cwd();

  sendEvent({
    hook: "SessionEnd",
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    agent_id: sessionId || "main",
    data: {
      working_directory: workingDirectory,
    },
  });
}
