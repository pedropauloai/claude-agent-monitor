# Sprint 9 - Dashboard Experience

Status: completed

---

## Context

### Motivation
The dashboard assumes a single project, has controls scattered across 3 different places (main header, Agent Map header, Activity Feed header), and the Event Timeline appears in all views without context. This sprint transforms the dashboard into a professional and customizable experience: multi-project navigation, unified settings system via modal, resizable panels, and cleanup of visual redundancies.

### Current Code State
- `theme-store.ts`, `filter-store.ts`, `session-store.ts` have settings scattered across 3 separate stores
- Main header contains ThemeSwitcher + ActivityWindowSelector (controls that should be in settings)
- AgentMapHeader has duplicate toggles (Labels, Didactic/Technical, Lines)
- Event Timeline renders globally across all views
- No concept of sidebar or navigation between projects
- Fixed layout without panel resizing
- Relevant files: `packages/dashboard/src/components/themes/modern/ModernShell.tsx`, all theme headers

### Design Decisions
- **Unified store**: `useSettingsStore` with Zustand persist (key `cam-settings`) consolidates all settings
- **SettingsModal with 4 tabs**: Appearance, Agent Map, Activity Feed, Advanced - accessible via gear icon or Ctrl+,
- **react-resizable-panels**: library chosen for panels, with persistence via `autoSaveId` and lock/unlock via Ctrl+L
- **Collapsible sidebar**: project list with activity indicator, toggle via Ctrl+B
- **Clean header**: only logo, ConnectionIndicator, ProjectPicker, and gear icon
- **Contextual timeline**: only appears when explicitly selected, no longer global

### References
- PRD Section 10 - MVP Sprint 9 (lines 2024-2052)
- Sprint 8 (Project-First Architecture) as prerequisite for multi-project
- 13 new files created, 1967 lines added (MEMORY.md)

---

## Tasks

### Section 1 - Multi-Project Navigation (3 tasks)
- [x] Implement collapsible project sidebar
  Priority: high
  Tags: dashboard, sidebar
  Description: Collapsible side list with all registered projects. Each item shows name, status (active/inactive), and task count. Sorting: active first, then by last activity. Button to collapse into icon mode.
  Files: packages/dashboard/src/components/shared/ProjectSidebar.tsx

- [x] Add project switcher with context and URL sync
  Priority: high
  Tags: dashboard, navigation
  Description: Clicking a project in the sidebar switches the entire dashboard context (kanban, agents, timeline, Agent Map). Smooth transition between projects. URL updates with project_id for bookmarking/sharing.
  Files: packages/dashboard/src/hooks/use-project-url.ts

- [x] Add active project indicator with animation
  Priority: medium
  Tags: dashboard, ux
  Description: Visual badge on the project with a running Claude session. Pulse animation when events arrive in real time. Active agent counter in the badge.
  Files: packages/dashboard/src/components/shared/ActiveIndicator.tsx

### Section 2 - Settings Infrastructure (3 tasks)
- [x] Create unified useSettingsStore with Zustand persist
  Priority: high
  Tags: dashboard, state
  Description: Consolidate settings from theme-store, filter-store, session-store, and agent-map-store into a single persisted store. localStorage key `cam-settings`. Migrate reads from all components.
  Files: packages/dashboard/src/stores/settings-store.ts

- [x] Build SettingsModal component with tab navigation
  Priority: high
  Tags: dashboard, settings
  Description: Modal overlay with 4 tabs. Responsive layout, closes with Escape or click outside. Works in all 3 themes with appropriate styling (glassmorphism Modern, pixel borders Pixel, box-drawing Terminal).
  Files: packages/dashboard/src/components/shared/SettingsModal.tsx

- [x] Add gear icon to header + Ctrl+Comma shortcut
  Priority: medium
  Tags: dashboard, ux
  Description: Replace ThemeSwitcher and ActivityWindowSelector in the header with a single gear icon. Ctrl+, shortcut to open modal from anywhere. Badge on the icon if there are non-default settings.
  Files: packages/dashboard/src/stores/ui-store.ts, packages/dashboard/src/hooks/use-keyboard-shortcuts.ts

### Section 3 - Settings Modal Content (4 tasks)
- [x] Implement Appearance tab - theme, accent color, sprite resolution
  Priority: high
  Tags: dashboard, settings
  Description: Theme selector (Modern/Pixel/Terminal) with visual preview, color picker for accent color (8 colors + custom hex), sprite resolution selector with live preview.

- [x] Implement Agent Map tab - labels, lines, bubbles, window
  Priority: medium
  Tags: dashboard, settings
  Description: Toggles for activity labels, communication lines, speech bubble mode (Technical/Didactic), activity window selector (1m/3m/5m/10m).

- [x] Implement Activity Feed tab - follow mode, hide polling
  Priority: medium
  Tags: dashboard, settings
  Description: Toggle follow mode (auto-scroll), toggle hide polling (hide repetitive TaskList/TaskGet), editable list of tools considered "polling", toggle to group repetitive events.

- [x] Implement Advanced tab - limits, lock, reset
  Priority: medium
  Tags: dashboard, settings
  Description: Max events in memory (default 500), speech bubble timeout (default 5s), max communication lines (default 5), "Restore Defaults" button with confirmation.

### Section 4 - Resizable Panels (3 tasks)
- [x] Integrate resizable panel system with react-resizable-panels
  Priority: high
  Tags: dashboard, layout
  Description: Integrate react-resizable-panels for dragging borders between panels. Minimum and maximum width/height per panel. Visual resize cursor. Double-click to reset to default size.
  Files: packages/dashboard/src/components/shared/ResizableLayout.tsx

- [x] Add layout persistence in localStorage
  Priority: medium
  Tags: dashboard, layout
  Description: Save panel sizes in localStorage (key `cam-layout`). Restore on reopen. Different layouts per view. Reset to default available in settings.

- [x] Add lock/unlock panels with Ctrl+L
  Priority: low
  Tags: dashboard, layout
  Description: Toggle in settings to lock/unlock resizing. Borders not draggable when locked. Subtle visual indicator. Ctrl+L shortcut for quick toggle.
  Files: packages/dashboard/src/hooks/use-keyboard-shortcuts.ts

### Section 5 - Layout Cleanup (3 tasks)
- [x] Clean up main header - remove redundant controls
  Priority: high
  Tags: dashboard, cleanup
  Description: Remove ThemeSwitcher and ActivityWindowSelector from the header. Keep only logo/title, ConnectionIndicator, ProjectPicker, and gear icon. Significantly cleaner header.
  Files: packages/dashboard/src/components/themes/modern/ModernShell.tsx

- [x] Clean up Agent Map header - move toggles to settings
  Priority: medium
  Tags: dashboard, cleanup
  Description: Remove Labels, Didactic/Technical, and Lines toggles from AgentMapHeader. Components read settings directly from useSettingsStore. Header keeps only title + agent count.

- [x] Make Event Timeline contextual - remove global display
  Priority: medium
  Tags: dashboard, cleanup
  Description: Remove Event Timeline from persistent global display. Timeline only appears as a dedicated panel when selected, or as a side panel within specific views.
