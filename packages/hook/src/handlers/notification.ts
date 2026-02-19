import { MAX_OUTPUT_LENGTH } from "@claudecam/shared";
import { sendEvent } from "../transport.js";

export function handleNotification(stdinData: Record<string, unknown>): void {
  const sessionId = (stdinData["session_id"] as string) ?? "";
  const rawMessage = (stdinData["message"] as string) ?? "";

  const message =
    rawMessage.length > MAX_OUTPUT_LENGTH
      ? rawMessage.slice(0, MAX_OUTPUT_LENGTH)
      : rawMessage;

  sendEvent({
    hook: "Notification",
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    agent_id: sessionId || "main",
    data: {
      message,
      level: "info",
    },
  });
}
