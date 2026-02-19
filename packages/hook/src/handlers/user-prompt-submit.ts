import { MAX_INPUT_LENGTH } from "@claudecam/shared";
import { sendEvent } from "../transport.js";

export function handleUserPromptSubmit(
  stdinData: Record<string, unknown>,
): void {
  const sessionId = (stdinData["session_id"] as string) ?? "";
  const rawPrompt = (stdinData["prompt"] as string) ?? "";

  const prompt =
    rawPrompt.length > MAX_INPUT_LENGTH
      ? rawPrompt.slice(0, MAX_INPUT_LENGTH)
      : rawPrompt;

  sendEvent({
    hook: "UserPromptSubmit",
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    agent_id: sessionId || "main",
    data: {
      prompt,
    },
  });
}
