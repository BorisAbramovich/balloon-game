import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Preset = {
  id: string;
  name: string;
  activityIds: string[];
};

type PresetStore = {
  presets: Preset[];
  activePresetId: string | null;
  addPreset: (name: string, activityIds: string[]) => void;
  updatePreset: (preset: Preset) => void;
  removePreset: (id: string) => void;
  setActivePreset: (id: string | null) => void;
};

export const usePresetStore = create<PresetStore>()(
  persist(
    (set) => ({
      presets: [],
      activePresetId: null,
      addPreset: (name, activityIds) =>
        set((state) => ({
          presets: [
            ...state.presets,
            { id: crypto.randomUUID(), name, activityIds },
          ],
        })),
      updatePreset: (updated) =>
        set((state) => ({
          presets: state.presets.map((p) =>
            p.id === updated.id ? updated : p
          ),
        })),
      removePreset: (id) =>
        set((state) => ({
          presets: state.presets.filter((p) => p.id !== id),
          activePresetId: state.activePresetId === id ? null : state.activePresetId,
        })),
      setActivePreset: (id) => set({ activePresetId: id }),
    }),
    { name: "balloon-preset-store" }
  )
);
