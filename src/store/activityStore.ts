import { create } from "zustand";

export type Activity = {
  id: string;
  title: string;
  content: string;
  color: string;
};

type ActivityStore = {
  activities: Activity[];
  loading: boolean;
  fetchActivities: () => Promise<void>;
  addActivity: (activity: Omit<Activity, "id">) => Promise<void>;
  removeActivity: (id: string) => Promise<void>;
  updateActivity: (activity: Activity) => Promise<void>;
};

export const useActivityStore = create<ActivityStore>()((set, get) => ({
  activities: [],
  loading: true,
  fetchActivities: async () => {
    const res = await fetch("/api/activities");
    const activities = await res.json();
    set({ activities, loading: false });
  },
  addActivity: async (newActivity) => {
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newActivity),
    });
    const created = await res.json();
    set((s) => ({ activities: [...s.activities, created] }));
  },
  removeActivity: async (id) => {
    await fetch(`/api/activities/${id}`, { method: "DELETE" });
    set((s) => ({ activities: s.activities.filter((a) => a.id !== id) }));
  },
  updateActivity: async (activity) => {
    await fetch(`/api/activities/${activity.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(activity),
    });
    set((s) => ({
      activities: s.activities.map((a) => (a.id === activity.id ? activity : a)),
    }));
  },
}));
