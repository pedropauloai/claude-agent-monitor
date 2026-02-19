import { create } from 'zustand';
import type {
  AgentZone,
  AgentAnimationState,
  AgentPose,
  AgentMapPosition,
  SpeechBubbleData,
  InteractionLineData,
} from '@claudecam/shared';

interface AgentMapState {
  positions: Map<string, AgentMapPosition>;
  speechBubbles: SpeechBubbleData[];
  interactionLines: InteractionLineData[];
  showLabels: boolean;
  showInteractions: boolean;
  displayMode: 'technical' | 'didactic';

  setAgentPosition: (agentId: string, zone: AgentZone, tool: string | null, activityLabel: string | null, pose?: AgentPose, parentAgentId?: string | null) => void;
  setAgentAnimation: (agentId: string, state: AgentAnimationState) => void;
  addSpeechBubble: (bubble: SpeechBubbleData) => void;
  removeSpeechBubble: (id: string) => void;
  addInteractionLine: (line: InteractionLineData) => void;
  removeInteractionLine: (id: string) => void;
  clearExpiredBubbles: (maxAgeMs: number) => void;
  clearExpiredLines: (maxAgeMs: number) => void;
  removeAgent: (agentId: string) => void;
  toggleLabels: () => void;
  toggleInteractions: () => void;
  setDisplayMode: (mode: 'technical' | 'didactic') => void;
  reset: () => void;
}

const MAX_INTERACTION_LINES = 5;

export const useAgentMapStore = create<AgentMapState>((set) => ({
  positions: new Map(),
  speechBubbles: [],
  interactionLines: [],
  showLabels: true,
  showInteractions: true,
  displayMode: 'technical',

  setAgentPosition: (agentId, zone, tool, activityLabel, pose, parentAgentId) =>
    set((state) => {
      const newPositions = new Map(state.positions);
      const current = newPositions.get(agentId);
      const previousZone = current?.zone ?? null;
      const animationState: AgentAnimationState =
        previousZone !== null && previousZone !== zone ? 'moving' : current?.animationState ?? 'idle';

      newPositions.set(agentId, {
        agentId,
        zone,
        previousZone,
        animationState,
        lastTool: tool,
        activityLabel,
        pose: pose ?? current?.pose ?? 'idle',
        parentAgentId: parentAgentId !== undefined ? parentAgentId : current?.parentAgentId ?? null,
      });
      return { positions: newPositions };
    }),

  setAgentAnimation: (agentId, animationState) =>
    set((state) => {
      const newPositions = new Map(state.positions);
      const current = newPositions.get(agentId);
      if (current) {
        newPositions.set(agentId, { ...current, animationState });
      }
      return { positions: newPositions };
    }),

  addSpeechBubble: (bubble) =>
    set((state) => ({
      speechBubbles: [...state.speechBubbles, bubble].slice(-10),
    })),

  removeSpeechBubble: (id) =>
    set((state) => ({
      speechBubbles: state.speechBubbles.filter((b) => b.id !== id),
    })),

  addInteractionLine: (line) =>
    set((state) => ({
      interactionLines: [...state.interactionLines, line].slice(-MAX_INTERACTION_LINES),
    })),

  removeInteractionLine: (id) =>
    set((state) => ({
      interactionLines: state.interactionLines.filter((l) => l.id !== id),
    })),

  clearExpiredBubbles: (maxAgeMs) =>
    set((state) => {
      const now = Date.now();
      return {
        speechBubbles: state.speechBubbles.filter((b) => now - b.timestamp < maxAgeMs),
      };
    }),

  clearExpiredLines: (maxAgeMs) =>
    set((state) => {
      const now = Date.now();
      return {
        interactionLines: state.interactionLines.filter((l) => now - l.timestamp < maxAgeMs),
      };
    }),

  removeAgent: (agentId) =>
    set((state) => {
      const newPositions = new Map(state.positions);
      newPositions.delete(agentId);
      return {
        positions: newPositions,
        speechBubbles: state.speechBubbles.filter(
          (b) => b.fromAgentId !== agentId && b.toAgentId !== agentId
        ),
        interactionLines: state.interactionLines.filter(
          (l) => l.fromAgentId !== agentId && l.toAgentId !== agentId
        ),
      };
    }),

  toggleLabels: () => set((state) => ({ showLabels: !state.showLabels })),
  toggleInteractions: () => set((state) => ({ showInteractions: !state.showInteractions })),
  setDisplayMode: (mode) => set({ displayMode: mode }),

  reset: () =>
    set({
      positions: new Map(),
      speechBubbles: [],
      interactionLines: [],
    }),
}));
