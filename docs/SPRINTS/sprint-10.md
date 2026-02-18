# Sprint 10 - Visual Polish

Status: completed

---

## Context

### Motivation
The current 16x16 sprites (CSS box-shadow) are charming but limited in detail and performance. Each sprite generates hundreds of divs with box-shadow, causing heavy re-paints in the browser. This sprint introduces a Canvas 2D renderer with smart caching, 4 resolution levels (16x16, 24x24, 32x32, 48x48), and ensures that all new Sprint 9 components (sidebar, settings modal, resizable panels) have consistent styling across all 3 themes.

### Current Code State
- `generateBoxShadow()` in `packages/dashboard/src/components/agent-map/` renders sprites via CSS box-shadow
- Sprite data only in 16x16 (`sprite-data-16.ts`) with ~60 pixels per pose
- 8 poses defined: IDLE, CODING, READING, TERMINAL, TALKING, SEARCHING, MANAGING, CELEBRATING
- Color palette: P(rimary), S(econdary), H(ighlight), D(ark), E(yes), K(sKin), G(ray), W(hite), B(lack)
- PixelCharacter and AgentCard use box-shadow directly
- New Sprint 9 components (SettingsModal, ProjectSidebar, ResizableLayout) without per-theme styling
- Relevant files: `packages/dashboard/src/components/agent-map/PixelCharacter.tsx`, `AgentCard.tsx`

### Design Decisions
- **OffscreenCanvas instead of box-shadow**: each sprite rendered once, cached as data URL, displayed as `<img>`
- **Cache by hash**: key = hash of (pose + color + resolution), invalidated when resolution changes in settings
- **`image-rendering: pixelated`**: CSS to keep pixels sharp when scaling
- **Lazy loading by resolution**: dynamic import of sprite data (`sprite-data-24.ts`, etc.), loads only the active resolution
- **Backward-compatibility**: fallback to box-shadow if Canvas is not available
- **Hybrid method for larger sprites**: upscale from 16x16 as base + manual refinement with additional details

### References
- PRD Section 10 - MVP Sprint 10 (lines 2054-2073)
- Sprint 9 (Dashboard Experience) - components that need theme integration
- PRD Section 7.13 - Agent Map v2 "Mission Floor" (visual system specification)

---

## Tasks

### Section 1 - Canvas Sprite Renderer (3 tasks)
- [x] Implement Canvas 2D sprite renderer with cache via OffscreenCanvas
  Priority: high
  Tags: dashboard, rendering
  Description: Replace CSS box-shadow with rendering via OffscreenCanvas. Function `renderSpriteToDataUrl(pixels, gridSize, displaySize, primaryColor)` that paints pixels on canvas and returns cached data URL. Cache key = hash of (pose + color + resolution). Use `image-rendering: pixelated` for sharp pixels.
  Files: packages/dashboard/src/components/agent-map/sprite-renderer.ts

- [x] Add sprite resolution config with lazy loading via dynamic import
  Priority: high
  Tags: dashboard, rendering
  Description: Dynamic import of sprite data by resolution. Load only the active resolution file. Fallback to 16x16 if larger resolution is not available. Invalidate cache when resolution changes in settings.
  Files: packages/dashboard/src/components/agent-map/sprite-data-24.ts, sprite-data-32.ts, sprite-data-48.ts

- [x] Update PixelCharacter and AgentCard to use Canvas renderer
  Priority: high
  Tags: dashboard, rendering
  Description: Replace generateBoxShadow with renderSpriteToDataUrl. Keep ALL existing CSS animations (container, not pixels). Keep pose overlays (coding particles, terminal cursor, confetti, zzz). Fallback to box-shadow if Canvas is not available.
  Files: packages/dashboard/src/components/agent-map/PixelCharacter.tsx, AgentCard.tsx

### Section 2 - High-Resolution Sprite Data (4 tasks)
- [x] Create sprite data 24x24 "Detailed" - 8 redesigned poses
  Priority: high
  Tags: dashboard, sprites
  Description: Redesign all 8 poses in 24x24 grid. Hybrid method: upscale from 16x16 as base + refinement with additional details (facial expression, tool in hand, clothing texture). ~150 pixels per pose. Same color palette.
  Files: packages/dashboard/src/components/agent-map/sprite-data-24.ts

- [x] Create sprite data 32x32 "HD" - 8 poses with visible detail
  Priority: medium
  Tags: dashboard, sprites
  Description: Redesign all 8 poses in 32x32 grid. Visible details: distinct facial expressions, detailed tools, body shading, textured clothing. ~350 pixels per pose.
  Files: packages/dashboard/src/components/agent-map/sprite-data-32.ts

- [x] Create sprite data 48x48 "Ultra" - 8 poses with maximum detail
  Priority: medium
  Tags: dashboard, sprites
  Description: Redesign all 8 poses in 48x48 grid. Maximum level: expressive face with eyes/mouth, tools with internal details, drop shadows, lighting highlights, per-pose accessories. ~900 pixels per pose.
  Files: packages/dashboard/src/components/agent-map/sprite-data-48.ts

- [x] Add sprite preview in Settings Modal with comparison
  Priority: medium
  Tags: dashboard, settings
  Description: Component that renders a sample agent at the selected resolution. Button to cycle through all 8 poses. Side-by-side comparison between current and selected resolution. Smooth transition animation. Resolution name with description.
  Files: packages/dashboard/src/components/shared/SettingsModal.tsx

### Section 3 - Theme Integration (3 tasks)
- [x] Integrate SettingsModal across all 3 themes with appropriate styling
  Priority: high
  Tags: dashboard, themes
  Description: Modern (glassmorphism, rounded corners, shadows), Pixel (pixel borders via box-shadow, Press Start 2P font, NES color palette), Terminal (box-drawing characters, green-on-black, monospace). Each theme with its own styling wrapper.
  Files: packages/dashboard/src/components/themes/modern/, pixel/, terminal/

- [x] Style resizable panels per theme
  Priority: medium
  Tags: dashboard, themes
  Description: Resize handles styled for each theme (subtle in Modern, pixel art in Pixel, ASCII characters in Terminal). Drag visual indicators consistent with the active theme.

- [x] Style project sidebar per theme
  Priority: medium
  Tags: dashboard, themes
  Description: Sidebar with consistent visual for each theme. Modern (lateral glassmorphism), Pixel (NES panel with pixelated border), Terminal (list with box-drawing characters).
