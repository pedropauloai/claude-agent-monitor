import type { ComponentType } from 'react';
import type { ThemeName } from '../stores/theme-store';

export interface ThemeComponents {
  Shell: ComponentType;
  AgentPanel: ComponentType;
  ActivityFeed: ComponentType;
  FileWatcher: ComponentType;
  StatsBar: ComponentType;
  AgentDetail: ComponentType;
  Timeline: ComponentType;
  Kanban: ComponentType;
  SprintProgress: ComponentType;
  PRDOverview: ComponentType;
  DependencyGraph: ComponentType;
  Burndown: ComponentType;
  ProjectSelector: ComponentType;
}

const registry = new Map<ThemeName, ThemeComponents>();

export function registerTheme(name: ThemeName, components: ThemeComponents): void {
  registry.set(name, components);
}

export function getThemeComponents(name: ThemeName): ThemeComponents | undefined {
  return registry.get(name);
}

export function getRegisteredThemes(): ThemeName[] {
  return Array.from(registry.keys());
}

/* ------------------------------------------------------------------ */
/*  Register built-in themes                                           */
/* ------------------------------------------------------------------ */

// -- Modern theme --
import { ModernShell } from '../components/themes/modern/ModernShell';
import { ModernAgentPanel } from '../components/themes/modern/ModernAgentPanel';
import { ModernActivityFeed } from '../components/themes/modern/ModernActivityFeed';
import { ModernFileWatcher } from '../components/themes/modern/ModernFileWatcher';
import { ModernStatsBar } from '../components/themes/modern/ModernStatsBar';
import { ModernAgentDetail } from '../components/themes/modern/ModernAgentDetail';
import { ModernTimeline } from '../components/themes/modern/ModernTimeline';
import { ModernKanban } from '../components/themes/modern/ModernKanban';
import { ModernSprintProgress } from '../components/themes/modern/ModernSprintProgress';
import { ModernPRDOverview } from '../components/themes/modern/ModernPRDOverview';
import { ModernDependencyGraph } from '../components/themes/modern/ModernDependencyGraph';
import { ModernBurndown } from '../components/themes/modern/ModernBurndown';
import { ModernProjectSelector } from '../components/themes/modern/ModernProjectSelector';

registerTheme('modern', {
  Shell: ModernShell,
  AgentPanel: ModernAgentPanel,
  ActivityFeed: ModernActivityFeed,
  FileWatcher: ModernFileWatcher,
  StatsBar: ModernStatsBar,
  AgentDetail: ModernAgentDetail,
  Timeline: ModernTimeline,
  Kanban: ModernKanban,
  SprintProgress: ModernSprintProgress,
  PRDOverview: ModernPRDOverview,
  DependencyGraph: ModernDependencyGraph,
  Burndown: ModernBurndown,
  ProjectSelector: ModernProjectSelector,
});

// -- Terminal theme --
import { TerminalShell } from '../components/themes/terminal/TerminalShell';
import { TerminalAgentPanel } from '../components/themes/terminal/TerminalAgentPanel';
import { TerminalActivityFeed } from '../components/themes/terminal/TerminalActivityFeed';
import { TerminalFileWatcher } from '../components/themes/terminal/TerminalFileWatcher';
import { TerminalStatsBar } from '../components/themes/terminal/TerminalStatsBar';
import { TerminalAgentDetail } from '../components/themes/terminal/TerminalAgentDetail';
import { TerminalTimeline } from '../components/themes/terminal/TerminalTimeline';
import { TerminalKanban } from '../components/themes/terminal/TerminalKanban';
import { TerminalSprintProgress } from '../components/themes/terminal/TerminalSprintProgress';
import { TerminalPRDOverview } from '../components/themes/terminal/TerminalPRDOverview';
import { TerminalDependencyGraph } from '../components/themes/terminal/TerminalDependencyGraph';
import { TerminalBurndown } from '../components/themes/terminal/TerminalBurndown';
import { TerminalProjectSelector } from '../components/themes/terminal/TerminalProjectSelector';

registerTheme('terminal', {
  Shell: TerminalShell,
  AgentPanel: TerminalAgentPanel,
  ActivityFeed: TerminalActivityFeed,
  FileWatcher: TerminalFileWatcher,
  StatsBar: TerminalStatsBar,
  AgentDetail: TerminalAgentDetail,
  Timeline: TerminalTimeline,
  Kanban: TerminalKanban,
  SprintProgress: TerminalSprintProgress,
  PRDOverview: TerminalPRDOverview,
  DependencyGraph: TerminalDependencyGraph,
  Burndown: TerminalBurndown,
  ProjectSelector: TerminalProjectSelector,
});

// -- Pixel Art theme --
import { PixelShell } from '../components/themes/pixel/PixelShell';
import { PixelAgentPanel } from '../components/themes/pixel/PixelAgentPanel';
import { PixelActivityFeed } from '../components/themes/pixel/PixelActivityFeed';
import { PixelFileWatcher } from '../components/themes/pixel/PixelFileWatcher';
import { PixelStatsBar } from '../components/themes/pixel/PixelStatsBar';
import { PixelAgentDetail } from '../components/themes/pixel/PixelAgentDetail';
import { PixelTimeline } from '../components/themes/pixel/PixelTimeline';
import { PixelKanban } from '../components/themes/pixel/PixelKanban';
import { PixelSprintProgress } from '../components/themes/pixel/PixelSprintProgress';
import { PixelPRDOverview } from '../components/themes/pixel/PixelPRDOverview';
import { PixelDependencyGraph } from '../components/themes/pixel/PixelDependencyGraph';
import { PixelBurndown } from '../components/themes/pixel/PixelBurndown';
import { PixelProjectSelector } from '../components/themes/pixel/PixelProjectSelector';

registerTheme('pixel', {
  Shell: PixelShell,
  AgentPanel: PixelAgentPanel,
  ActivityFeed: PixelActivityFeed,
  FileWatcher: PixelFileWatcher,
  StatsBar: PixelStatsBar,
  AgentDetail: PixelAgentDetail,
  Timeline: PixelTimeline,
  Kanban: PixelKanban,
  SprintProgress: PixelSprintProgress,
  PRDOverview: PixelPRDOverview,
  DependencyGraph: PixelDependencyGraph,
  Burndown: PixelBurndown,
  ProjectSelector: PixelProjectSelector,
});
