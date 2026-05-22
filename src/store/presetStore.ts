import { create } from "zustand";

export type Preset = {
  id: string;
  name: string;
  activityIds: string[];
};

type PresetStore = {
  presets: Preset[];
  activePresetId: string | null;
  fetchPresets: () => Promise<void>;
  fetchActivePreset: () => Promise<void>;
  addPreset: (name: string, activityIds: string[]) => Promise<void>;
  updatePreset: (preset: Preset) => Promise<void>;
  removePreset: (id: string) => Promise<void>;
  setActivePreset: (id: string | null) => Promise<void>;
};

export const usePresetStore = create<PresetStore>()((set) => ({
  presets: [],
  activePresetId: null,
  fetchPresets: async () => {
    const res = await fetch("/api/presets");
    const presets = await res.json();
    set({ presets });
  },
  fetchActivePreset: async () => {
    const res = await fetch("/api/presets/active");
    const { activePresetId } = await res.json();
    set({ activePresetId });
  },
  addPreset: async (name, activityIds) => {
    const res = await fetch("/api/presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, activityIds }),
    });
    const created = await res.json();
    set((s) => ({ presets: [...s.presets, created] }));
  },
  updatePreset: async (preset) => {
    await fetch(`/api/presets/${preset.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: preset.name, activityIds: preset.activityIds }),
    });
    set((s) => ({
      presets: s.presets.map((p) => (p.id === preset.id ? preset : p)),
    }));
  },
  removePreset: async (id) => {
    await fetch(`/api/presets/${id}`, { method: "DELETE" });
    set((s) => ({
      presets: s.presets.filter((p) => p.id !== id),
      activePresetId: s.activePresetId === id ? null : s.activePresetId,
    }));
  },
  setActivePreset: async (id) => {
    await fetch("/api/presets/active", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activePresetId: id }),
    });
    set({ activePresetId: id });
  },
}));
