import { useEffect, useState, useCallback } from "react";
import type { SpeechBubbleData } from "@claudecam/shared";

interface SpeechBubbleProps {
  bubble: SpeechBubbleData;
  color: string;
}

/** Max characters to show in collapsed mode */
const COLLAPSED_LENGTH = 120;

/** Time before the bubble starts fading out (ms) */
const VISIBLE_DURATION_MS = 6_000;

/**
 * Pixel art styled speech bubble that appears above an agent.
 *
 * Features:
 * - Stepped pixel border (box-shadow based)
 * - Pixel art tail pointing down
 * - Auto-dismiss after 6 seconds with fade-out
 * - Click to expand/collapse long messages
 * - Full message always accessible
 */
export function SpeechBubble({ bubble, color }: SpeechBubbleProps) {
  const [exiting, setExiting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isLong = bubble.message.length > COLLAPSED_LENGTH;

  useEffect(() => {
    // Don't auto-dismiss if expanded
    if (expanded) return;
    const timer = setTimeout(() => setExiting(true), VISIBLE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [expanded]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isLong) {
        setExpanded((prev) => !prev);
        // Reset exit timer when expanding
        if (!expanded) {
          setExiting(false);
        }
      }
    },
    [isLong, expanded],
  );

  const displayMessage =
    expanded || !isLong
      ? bubble.message
      : bubble.message.slice(0, COLLAPSED_LENGTH) + "...";

  return (
    <div
      className={`speech-bubble ${exiting ? "speech-bubble-exit" : "speech-bubble-enter"} ${isLong ? "speech-bubble-expandable" : ""}`}
      style={
        {
          "--bubble-color": color,
          color: "#d4d4d8",
          pointerEvents: isLong ? "auto" : "none",
          cursor: isLong ? "pointer" : "default",
          maxWidth: expanded ? "400px" : "280px",
        } as React.CSSProperties
      }
      onClick={handleClick}
      title={isLong && !expanded ? "Click to expand" : undefined}
    >
      <span>{displayMessage}</span>
      {isLong && !expanded && (
        <span style={{ opacity: 0.5, fontSize: "10px", marginLeft: "4px" }}>
          [+]
        </span>
      )}
    </div>
  );
}
