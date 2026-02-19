import { MAX_INPUT_LENGTH, MAX_OUTPUT_LENGTH } from "@claudecam/shared";
import { sendEvent } from "../transport.js";

export function handlePostToolUseFailure(
  stdinData: Record<string, unknown>,
): void {
  const toolName = (stdinData["tool_name"] as string) ?? "unknown";
  const sessionId = (stdinData["session_id"] as string) ?? "";

  // Extract tool_input
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

  // Extract error message - could come from various fields
  let error: string | undefined;
  const errorSources = [
    stdinData["error"],
    stdinData["error_message"],
    stdinData["tool_response"],
  ];
  for (const src of errorSources) {
    if (typeof src === "string") {
      error =
        src.length > MAX_OUTPUT_LENGTH ? src.slice(0, MAX_OUTPUT_LENGTH) : src;
      break;
    }
    if (typeof src === "object" && src !== null) {
      const obj = src as Record<string, unknown>;
      const msg = obj["error"] ?? obj["error_message"] ?? obj["message"];
      if (typeof msg === "string") {
        error =
          msg.length > MAX_OUTPUT_LENGTH
            ? msg.slice(0, MAX_OUTPUT_LENGTH)
            : msg;
        break;
      }
    }
  }

  sendEvent({
    hook: "PostToolUseFailure",
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    agent_id: sessionId || "main",
    data: {
      tool_name: toolName,
      tool_input: inputStr,
      file_path: filePath,
      error: error ?? "Unknown tool failure",
    },
  });
}
