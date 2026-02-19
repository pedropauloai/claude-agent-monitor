import { MAX_INPUT_LENGTH, MAX_OUTPUT_LENGTH } from "@claudecam/shared";
import { sendEvent } from "../transport.js";

export function handlePostToolUse(stdinData: Record<string, unknown>): void {
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

  // tool_response comes as an object from Claude Code stdin
  const toolResponse = stdinData["tool_response"] as
    | Record<string, unknown>
    | undefined;
  let outputStr: string | undefined;
  if (toolResponse) {
    const raw = JSON.stringify(toolResponse);
    outputStr =
      raw.length > MAX_OUTPUT_LENGTH ? raw.slice(0, MAX_OUTPUT_LENGTH) : raw;
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

  // Check for error in tool_response
  let error: string | undefined;
  if (toolResponse) {
    const errMsg = toolResponse["error"] ?? toolResponse["error_message"];
    if (typeof errMsg === "string") {
      error =
        errMsg.length > MAX_OUTPUT_LENGTH
          ? errMsg.slice(0, MAX_OUTPUT_LENGTH)
          : errMsg;
    }
  }

  sendEvent({
    hook: "PostToolUse",
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    agent_id: sessionId || "main",
    data: {
      tool_name: toolName,
      tool_input: inputStr,
      tool_output: outputStr,
      file_path: filePath,
      error,
    },
  });
}
