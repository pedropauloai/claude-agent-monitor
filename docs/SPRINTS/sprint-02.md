# Sprint 2 - Agent Map v1

Status: completed

---

> **NOTE**: This sprint was SUPERSEDED by Sprint 4 (Mission Floor). Agent Map v1 used a fixed-zone
> grid (7 activity zones) that was implemented and then discarded in favor of the open Mission Floor
> design. The infrastructure built here (activity labels, idle detection, SSE events, sprite rendering)
> was reused in Sprint 4. The 10 tasks below were completed but the final visual result is no longer
> in the codebase.

---

## Context

### Motivation
The Agent Map is CAM's differentiating feature - pixel art visualization of agents working in
real time. This sprint implements the first version (v1) with a fixed-zone approach: 7 areas
on the map representing activity types (Code Zone, Terminal Zone, File Zone, etc). The goal is
to create an intuitive visual representation of what each agent is doing.

### Current Code State
Sprint 1 is complete. Dashboard is functional with 3 themes, all core components implemented,
SSE real-time working, Pillar 2 (PRD Tracker) operational. The main visualization is missing:
the Agent Map.

### Design Decisions
- **Fixed-zone grid**: 7 zones representing activity categories. DISCARDED - fixed zones
  wasted ~25% of space with inactive areas (Done Zone, Rest Area).
- **CSS box-shadow rendering**: sprites rendered via CSS box-shadow (1 shadow per pixel).
  KEPT in Sprint 4.
- **Tool -> zone mapping**: each tool (Read, Edit, Bash, etc) mapped to a zone.
  DISCARDED - replaced by pose mapping in Sprint 4.
- **Zone-based sprite poses**: agent changed appearance based on zone. EVOLVED into
  8 zone-independent poses in Sprint 4.

### References
- PRD Section 7.13 - Agent Map (current version reflects v2, not v1)
- Sprint 4 - Agent Map v2: Mission Floor (replacement)

---

## Tasks

### Section 1 - Architecture and Sprites
- [x] Design AgentMap component architecture
  Priority: critical
  Tags: agent-map, architecture
  Description: Build base component structure with zone grid, state management, and SSE integration.

- [x] Create pixel art agent sprites
  Priority: critical
  Tags: agent-map, sprites, pixel-art
  Description: Create initial 16x16 sprites for agents with colors based on name hash.

- [x] Build map with 7 activity zones
  Priority: high
  Tags: agent-map, zones
  Description: Build layout with 7 zones (Code, Terminal, File, Search, Communication, Management, Rest).

- [x] Implement positioning system (tool -> zone)
  Priority: high
  Tags: agent-map, positioning
  Description: Implement tool-to-zone mapping (Edit->Code Zone, Bash->Terminal Zone, etc).

### Section 2 - Animations and Interactions
- [x] Implement agent state animations
  Priority: high
  Tags: agent-map, animations
  Description: Implement transition animations between zones, idle bounce, and spawn effect.

- [x] Implement visual interactions between agents
  Priority: medium
  Tags: agent-map, interactions
  Description: Add visual lines between interacting agents, proximity based on activity.

- [x] Integrate SSE (real-time)
  Priority: critical
  Tags: agent-map, sse, real-time
  Description: Move agents between zones in real time as SSE events arrive.

### Section 3 - UX and Performance
- [x] Add click on agent -> AgentDetail
  Priority: medium
  Tags: agent-map, ux
  Description: Open AgentDetail panel with agent details when clicking an agent on the map.

- [x] Ensure responsiveness and performance (60fps)
  Priority: high
  Tags: agent-map, performance
  Description: Make map responsive across different screen sizes, maintaining 60fps with React.memo and debounce.

- [x] Integrate AgentMap into all themes
  Priority: high
  Tags: agent-map, themes
  Description: Make AgentMap functional in all 3 themes (Modern, Pixel, Terminal) with adapted styles.
