import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Activity = {
  id: string;
  title: string;
  content: string;
  color: string;
};

export const DEFAULT_ACTIVITIES: Activity[] = [
  { id: "b1", title: "חימום ✨",  content: "## זמן להתמתח!\n\n- מתחו את הזרועות **מעל לראש**\n- החזיקו 10 שניות\n- תיהנו מהמתיחה!", color: "#F87171" },
  { id: "b2", title: "שתיה 💧",   content: "שתה **כוס מים** עכשיו.\n\nהגוף שלך זקוק למים 💚", color: "#60A5FA" },
  { id: "b3", title: "נשימה 🌬️", content: "### תרגיל נשימה\n\n1. שאפו עמוק למשך 4 שניות\n2. החזיקו למשך 7 שניות\n3. נשפו למשך 8 שניות\n\nחזרו 3 פעמים.", color: "#4ADE80" },
  { id: "b4", title: "מתיחה 🧘",  content: "עמדו זקוף והושיטו את הידיים _גבוה לשמיים_ ⬆️\n\nהחזיקו 10 שניות.", color: "#FBBF24" },
  { id: "b5", title: "חיוך 😁",   content: "> חיוך הוא קצר דרך בין שני אנשים\n\nמצאו משהו מצחיק וחייכו!", color: "#C084FC" },
];

type ActivityStore = {
  activities: Activity[];
  addActivity: (activity: Omit<Activity, "id">) => void;
  removeActivity: (id: string) => void;
  updateActivity: (activity: Activity) => void;
};

export const useActivityStore = create<ActivityStore>()(
  persist(
    (set, get) => ({
      activities: DEFAULT_ACTIVITIES,
      addActivity: (newActivity) =>
        set((state) => ({
          activities: [
            ...state.activities,
            { ...newActivity, id: crypto.randomUUID() },
          ],
        })),
      removeActivity: (id) =>
        set((state) => ({
          activities: state.activities.filter((activity) => activity.id !== id),
        })),
      updateActivity: (updatedActivity) =>
        set((state) => ({
          activities: state.activities.map((activity) =>
            activity.id === updatedActivity.id ? updatedActivity : activity
          ),
        })),
    }),
    {
      name: "balloon-activity-store",
      // Force defaults if store is corrupted or empty
      onRehydrateStorage: () => (state) => {
        if (!state || state.activities.length === 0) {
          state?.activities.push(...DEFAULT_ACTIVITIES);
        }
      },
    }
  )
);
