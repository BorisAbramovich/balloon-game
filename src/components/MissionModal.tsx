import React, { useMemo } from "react";
import { marked } from "marked";
import { Activity } from "../store/activityStore";

marked.setOptions({ breaks: true, gfm: true });

const MissionModal: React.FC<{
  activity: Activity | null;
  onClose: () => void;
  onComplete: () => void;
}> = ({ activity, onClose, onComplete }) => {
  if (!activity) return null;

  const html = useMemo(
    () => marked.parse(activity.content || "") as string,
    [activity.content]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/30" onClick={onClose}>
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-6 animate-in fade-in zoom-in duration-300 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-12 h-12 rounded-full shadow-inner border-2 border-white shrink-0"
            style={{ backgroundColor: activity.color }}
          />
          <div dir="auto" className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-slate-800">{activity.title}</h2>
            <p className="text-sm text-slate-500">Mission Details</p>
          </div>
        </div>

        <div
          dir="auto"
          className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100 min-h-[150px] overflow-y-auto prose prose-slate max-w-none text-slate-700 leading-relaxed mission-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        <div className="flex justify-end gap-3 mt-auto">
          <button
            onClick={onClose}
            className="px-6 py-3 min-h-[44px] text-slate-600 font-bold bg-slate-100 rounded-lg hover:bg-slate-200"
          >
            ביטול
          </button>
          <button
            onClick={onComplete}
            className="px-6 py-3 min-h-[44px] bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 active:scale-95 transition-transform"
          >
            סיימתי ✓
          </button>
        </div>
      </div>
    </div>
  );
};

export default MissionModal;
