# Sprint 4 - Agent Map v2: Mission Floor

Status: completed

---

## Context

### Motivation
Agent Map v1 (Sprint 2) uses a fixed-zone grid that wastes space and creates an artificial
abstraction. Zones like "Done Zone" and "Rest Area" occupy ~25% of the map without adding
useful information. The decision is to completely redesign the Agent Map with an open layout
called "Mission Floor" - inspired by OPES Big Brother (Andy Devdan). The new design prioritizes:
detailed sprites with 8 activity poses, activity labels showing exactly what each agent is doing,
visual parent-child hierarchy, and animated communication between agents. This is CAM's CORE
component - the product differentiator.

### Current Code State
Sprints 1-3 are complete. Agent Map v1 is working but with an unsatisfactory design.
Sprite infrastructure (CSS box-shadow rendering), SSE real-time, and tool mapping
already exists. The AgentMap component needs to be rewritten, not refactored.

### Design Decisions
- **Mission Floor (open layout)**: two areas - ActiveWorkspace (~80%) for active agents and
  InactiveBar (~20% bottom) for idle/done. No fixed zones.
- **8 activity poses**: CODING, READING, TERMINAL, TALKING, SEARCHING, MANAGING, IDLE,
  CELEBRATING. Each pose with 2-3 animation frames.
- **24x24 sprites**: upgrade from 16x16 to 24x24 pixels, 2x display (48x48px). Themed
  color palette based on agent name hash.
- **CSS box-shadow rendering**: kept from v1, proven performant.
- **Visual hierarchy**: main agent centered, subagents in semicircle, dashed lines connecting
  parent-child. Automatic positioning.
- **Activity labels**: text showing what the agent is doing (e.g., "Reading config.ts",
  "Running tests"). Replaces the zone concept.
- **Tool trail**: last 5 tools as mini colored badges below the label.

### References
- PRD Section 7.13 - AgentMap v2 "Mission Floor" (core PRD section)
- Sprint 2 - Agent Map v1 (superseded by this sprint)

---

## Tasks

### Section 1 - Sprite System
- [x] Define sprite data format with themed color palette
  Priority: critical
  Tags: agent-map, sprites, pixel-art
  Description: Define pose system as 2D pixel arrays with themed color palette per agent (name hash -> base color). Render via CSS box-shadow at 24x24 with 2x display (48x48px).

- [x] Create primary work poses (CODING, READING, TERMINAL)
  Priority: critical
  Tags: agent-map, sprites, poses
  Description: Create CODING (sitting and typing, code particles), READING (holding open scroll), TERMINAL (standing in front of green monitor). 2-3 animation frames each.

- [x] Create secondary work poses (TALKING, SEARCHING, MANAGING)
  Priority: high
  Tags: agent-map, sprites, poses
  Description: Create TALKING (with active speech bubble), SEARCHING (with glowing magnifying glass), MANAGING (in front of board/chart). 2-3 frames each.

- [x] Create state poses (IDLE, CELEBRATING) with transitions
  Priority: high
  Tags: agent-map, sprites, poses, animations
  Description: Create IDLE (sitting on floor, floating zZz), CELEBRATING (arms up, pixel confetti). Add 300ms crossfade transition between any pair of poses.

### Section 2 - Mission Floor Layout
- [x] Build MissionFloor component (replace AgentMapGrid)
  Priority: critical
  Tags: agent-map, layout, component
  Description: Build main component with two areas: ActiveWorkspace (~80%) and InactiveBar (~20% bottom). Add animated transition when agent moves between areas.

- [x] Build AgentCard component
  Priority: critical
  Tags: agent-map, component
  Description: Build card for each active agent containing animated pose sprite, name, activity label, tool trail (last 5 tools as mini badges), compact stats (tools, errors), and timer (active for Xm or idle Xs).

- [x] Build InactiveBar component
  Priority: high
  Tags: agent-map, component
  Description: Build bottom bar showing idle/done agents in miniature (24x24 sprite, name, last state). Click promotes agent back to workspace when it becomes active again.

- [x] Implement responsive layout with theme integration
  Priority: high
  Tags: agent-map, responsive, themes
  Description: Reorganize workspace at breakpoints (4 cols desktop -> 2 cols tablet -> 1 col mobile). Integrate with all 3 themes via theme-registry.

### Section 3 - Communication and Dynamics
- [x] Implement visual hierarchy (parent-child)
  Priority: high
  Tags: agent-map, hierarchy, visual
  Description: Draw thin dashed lines connecting parent to child agents. Center main agent, distribute subagents in semicircle. Apply automatic hierarchical positioning.

- [x] Add animated communication lines
  Priority: medium
  Tags: agent-map, communication, svg
  Description: Add SVG animated dashed lines (flowing particles) between agents exchanging SendMessage. Use sender's color. Show pixel art speech bubbles with 60-char preview, visible for 5s.

- [x] Add spawn and shutdown animations
  Priority: medium
  Tags: agent-map, animations
  Description: Spawn new agent with scale(0->1) effect from parent's position. Shutdown: sprite shrinks and slides smoothly into InactiveBar.

- [x] Add click interaction (AgentDetail + popup)
  Priority: medium
  Tags: agent-map, ux, interaction
  Description: Open AgentDetail side panel on clicking active agent. Show popup with last state and history on clicking inactive agent in the bar.

### Section 4 - Polish and Performance
- [x] Build tool trail component
  Priority: medium
  Tags: agent-map, component, tools
  Description: Render last 5 tools as mini colored badges below the activity label. Each tool type has its own color and abbreviation (Ed=blue, Rd=indigo, Bh=amber, Msg=purple, etc).

- [x] Build agent timer (real-time counter)
  Priority: medium
  Tags: agent-map, component, timer
  Description: Build real-time counter showing "active for 2m 15s" or "idle 45s". Update every second for active agents. Use compact formatting.

- [x] Implement hierarchical positioning (algorithm)
  Priority: high
  Tags: agent-map, algorithm, positioning
  Description: Implement algorithm that distributes agents in the workspace based on hierarchy (parent-child). Main in center, children around it, grandchildren near parents. Reposition smoothly when agents join/leave.

- [x] Optimize performance (React.memo, debounce, cleanup)
  Priority: high
  Tags: agent-map, performance, optimization
  Description: Apply React.memo to all sub-components, 100ms debounce on sync, clean up expired speech bubbles/lines, virtualize if > 10 active agents.
