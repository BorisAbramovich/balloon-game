import { create } from "zustand";
import { persist } from "zustand/middleware";

type ProgressStore = {
  completedIds: string[];
  completeActivity: (id: string) => void;
  resetProgress: () => void;
};

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      completedIds: [],
      completeActivity: (id) => {
        const { completedIds } = get();
        if (!completedIds.includes(id)) {
          set({ completedIds: [...completedIds, id] });
        }
      },
      resetProgress: () => set({ completedIds: [] }),
    }),
    { name: "balloon-progress" }
  )
);
