import { MAX_INPUT_LENGTH } from "@claudecam/shared";
import { sendEvent } from "../transport.js";

export function handlePreToolUse(stdinData: Record<string, unknown>): void {
  const toolName = (stdinData["tool_name"] as string) ?? "unknown";
  const sessionId = (stdinData["session_id"] as string) ?? "";

  // tool_input comes as an object from Claude Code stdin
  const toolInput = stdinData["tool_input"] as
    | Record<string, unknown>
    | undefined;
  let inputStr: string | undefined;
  if (toolInput) {
    const raw = JSON.stringify(toolInput);
    inputStr =
      raw.length > MAX_INPUT_LENGTH ? raw.slice(0, MAX_INPUT_LENGTH) : raw;
  }

  // Extract file_path from tool_input
  let filePath: string | undefined;
  if (toolInput) {
    if (typeof toolInput["file_path"] === "string") {
      filePath = toolInput["file_path"];
    } else if (typeof toolInput["path"] === "string") {
      filePath = toolInput["path"];
    }
  }

  sendEvent({
    hook: "PreToolUse",
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    agent_id: sessionId || "main",
    data: {
      tool_name: toolName,
      tool_input: inputStr,
      file_path: filePath,
    },
  });
}
