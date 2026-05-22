import React, { useState, useEffect } from "react";
import { useActivityStore, Activity } from "../store/activityStore";
import { useProgressStore } from "../store/progressStore";
import { usePresetStore, Preset } from "../store/presetStore";
import { MdEditor } from "../components/MdEditor";

export const AdminPage: React.FC = () => {
  const activities = useActivityStore((s) => s.activities);
  const addActivity = useActivityStore((s) => s.addActivity);
  const removeActivity = useActivityStore((s) => s.removeActivity);
  const updateActivity = useActivityStore((s) => s.updateActivity);
  const resetProgress = useProgressStore((s) => s.resetProgress);

  const presets = usePresetStore((s) => s.presets);
  const activePresetId = usePresetStore((s) => s.activePresetId);
  const addPreset = usePresetStore((s) => s.addPreset);
  const updatePreset = usePresetStore((s) => s.updatePreset);
  const removePreset = usePresetStore((s) => s.removePreset);
  const setActivePreset = usePresetStore((s) => s.setActivePreset);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);
  const [newPresetName, setNewPresetName] = useState("");
  const [newPresetIds, setNewPresetIds] = useState<string[]>([]);

  useEffect(() => {
    if (editingId === "new") {
      setTempTitle("New Activity");
    } else {
      const found = activities.find((a) => a.id === editingId);
      setTempTitle(found?.title || "");
    }
  }, [editingId, activities]);

  const handleSave = (content: string) => {
    if (isAdding || editingId === "new") {
      const colors = ["#F87171", "#60A5FA", "#A3E635", "#C084FC", "#FBBF24", "#F472B6"];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      addActivity({
        title: tempTitle || "New Activity",
        content,
        color: randomColor,
      });
      setIsAdding(false);
    } else if (editingId) {
      const activity = activities.find((a) => a.id === editingId);
      if (activity) {
        updateActivity({ ...activity, title: tempTitle, content });
      }
    }
    setEditingId(null);
  };

  const handleDeleteAll = () => {
    if (confirmClear) {
      localStorage.removeItem("balloon-activities");
      localStorage.removeItem("balloon-progress");
      window.location.reload();
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
    }
  };

  const handleResetProgress = () => {
    resetProgress();
    alert("Progress has been reset!");
  };

  return (
    <div className="h-full w-full bg-slate-100 overflow-y-auto px-6 pb-20 pt-24">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Activities Editor</h1>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleResetProgress}
              className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold py-2 px-4 rounded-full transition-all"
            >
              Reset Score
            </button>
            <button
              onClick={() => { setIsAdding(true); setEditingId("new"); }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full shadow-md"
            >
              + Add Activity
            </button>
          </div>
        </div>

        {confirmClear && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-xl">
            Are you sure? This will clear all activities and progress. Click "Delete All" in your activities to confirm.
          </div>
        )}

        {(editingId || isAdding) && (
          <div className="mb-8 bg-white p-5 rounded-2xl shadow-lg border-2 border-blue-200">
            <input
              type="text"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              className="text-xl font-bold text-slate-800 border-b-2 border-blue-200 focus:border-blue-500 outline-none p-2 w-full mb-4 placeholder-slate-300"
              placeholder="Activity Title"
            />
            <MdEditor
              key={editingId || "new"}
              initialValue={activities.find(a => a.id === editingId)?.content || ""}
              onSave={handleSave}
              onCancel={() => { setEditingId(null); setIsAdding(false); }}
            />
          </div>
        )}

        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="group flex items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 transition-all hover:shadow-md"
            >
              <div
                className="w-4 h-12 rounded-full mr-4 shadow-inner"
                style={{ backgroundColor: activity.color }}
              />
              <div className="flex-1 min-w-0 mr-4">
                <h3 className="font-bold text-slate-800 truncate">{activity.title}</h3>
                <p className="text-slate-500 text-sm truncate">{activity.content}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setIsAdding(false); setEditingId(activity.id); }}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  Edit
                </button>
                <button
                  onClick={() => removeActivity(activity.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ---- Presets Section ---- */}
        <div className="mt-10 mb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Class Presets</h2>

          {/* Preset editor */}
          {editingPreset !== null && (
            <div className="mb-6 bg-white p-5 rounded-2xl shadow-lg border-2 border-violet-200">
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                className="text-lg font-bold text-slate-800 border-b-2 border-violet-200 focus:border-violet-500 outline-none p-2 w-full mb-4 placeholder-slate-300"
                placeholder="Preset Name (e.g. Monday Class)"
              />
              <p className="text-sm text-slate-500 mb-3">Select activities for this preset:</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {activities.map((a) => (
                  <label
                    key={a.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={newPresetIds.includes(a.id)}
                      onChange={() => {
                        setNewPresetIds((ids) =>
                          ids.includes(a.id)
                            ? ids.filter((id) => id !== a.id)
                            : [...ids, a.id]
                        );
                      }}
                      className="w-4 h-4 accent-violet-500"
                    />
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: a.color }}
                    />
                    <span className="text-slate-700">{a.title}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {
                    if (!newPresetName.trim()) return;
                    if (editingPreset.id) {
                      updatePreset({ ...editingPreset, name: newPresetName, activityIds: newPresetIds });
                    } else {
                      addPreset(newPresetName, newPresetIds);
                    }
                    setEditingPreset(null);
                  }}
                  disabled={!newPresetName.trim() || newPresetIds.length === 0}
                  className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-5 rounded-full shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingPreset.id ? "Update" : "Create"}
                </button>
                <button
                  onClick={() => setEditingPreset(null)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-5 rounded-full"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Preset list */}
          <div className="space-y-3">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className={`group flex items-center bg-white p-4 rounded-xl shadow-sm border transition-all hover:shadow-md ${
                  activePresetId === preset.id ? "border-violet-400 ring-2 ring-violet-200" : "border-slate-200"
                }`}
              >
                <div className="flex-1 min-w-0 mr-4">
                  <h3 className="font-bold text-slate-800">{preset.name}</h3>
                  <p className="text-slate-500 text-sm">
                    {preset.activityIds.length} activities
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActivePreset(activePresetId === preset.id ? null : preset.id)}
                    className={`px-3 py-1 rounded-full text-sm font-bold transition-all ${
                      activePresetId === preset.id
                        ? "bg-violet-600 text-white"
                        : "bg-violet-100 text-violet-700 hover:bg-violet-200"
                    }`}
                  >
                    {activePresetId === preset.id ? "Active" : "Use"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingPreset(preset);
                      setNewPresetName(preset.name);
                      setNewPresetIds([...preset.activityIds]);
                    }}
                    className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removePreset(preset.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {editingPreset === null && (
            <button
              onClick={() => {
                setEditingPreset({ id: "", name: "", activityIds: [] });
                setNewPresetName("");
                setNewPresetIds([]);
              }}
              className="mt-4 bg-violet-100 hover:bg-violet-200 text-violet-700 font-bold py-2 px-6 rounded-full transition-all"
            >
              + New Preset
            </button>
          )}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={handleDeleteAll}
            className="text-sm text-slate-400 hover:text-red-500 transition-colors underline"
          >
            {confirmClear ? "Confirm Delete All (Click again on + Add above)" : "Delete all local data"}
          </button>
        </div>
      </div>
    </div>
  );
};
