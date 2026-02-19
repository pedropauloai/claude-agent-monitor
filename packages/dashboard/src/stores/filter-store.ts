import { create } from "zustand";
import type { EventCategory } from "@claudecam/shared";

interface FilterState {
  agentFilter: string | null;
  toolFilter: string | null;
  categoryFilter: EventCategory | null;
  searchQuery: string;

  setAgentFilter: (agentId: string | null) => void;
  setToolFilter: (tool: string | null) => void;
  setCategoryFilter: (category: EventCategory | null) => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  agentFilter: null,
  toolFilter: null,
  categoryFilter: null,
  searchQuery: "",

  setAgentFilter: (agentFilter) => set({ agentFilter }),
  setToolFilter: (toolFilter) => set({ toolFilter }),
  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  resetFilters: () =>
    set({
      agentFilter: null,
      toolFilter: null,
      categoryFilter: null,
      searchQuery: "",
    }),
}));
