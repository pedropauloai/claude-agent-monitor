# Sprint 3 - SSE Pillar 2

Status: completed

---

## Context

### Motivation
Pillar 2 (PRD Tracker) already has its visual components (Kanban, SprintProgress, PRDOverview)
implemented in Sprint 1, but they rely solely on polling (HTTP requests every 15s). When an
agent completes a task or the Correlation Engine detects activity, the update takes up to 15
seconds to appear on the dashboard. This sprint adds SSE (Server-Sent Events) for Pillar 2,
bringing real-time updates to the project tracking components.

### Current Code State
Sprints 1 and 2 are complete. SSE already works for Pillar 1 (Agent Monitor) - agent events
(tool use, status change, errors) are transmitted in real time. Pillar 2 only receives data
via polling. Components like KanbanBoard and SprintProgress require manual refresh or have to
wait for the polling interval.

### Design Decisions
- Reuse the same existing SSE connection (endpoint `/api/events/stream`), adding new
  event types for Pillar 2 (task-updated, sprint-progress, etc)
- Do not create a separate SSE endpoint for Pillar 2 - simplicity over separation
- Dashboard components listen for specific event types and update local state via Zustand

### References
- PRD Section 5 - Pillar 2: PRD Tracker
- PRD Section 3.4 - SSE Architecture

---

## Tasks

### Section 1 - SSE for PRD Tracker
- [x] Add SSE real-time events for PRD Tracker (Pillar 2)
  Priority: high
  Tags: server, sse, prd-tracker
  Description: Add SSE event emission when PRD tasks change status, sprint progress updates, or the Correlation Engine makes a match. Event types: task-updated, task-created, sprint-progress-changed.

- [x] Integrate Dashboard SSE for Pillar 2 components
  Priority: high
  Tags: dashboard, sse, prd-tracker
  Description: Make KanbanBoard, SprintProgress, and PRDOverview components listen to SSE events and update in real time via Zustand stores. Remove polling dependency for status changes.
