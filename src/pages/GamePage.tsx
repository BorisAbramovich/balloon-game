import React, { useEffect, useMemo, useRef, useState } from "react";
import { useActivityStore } from "../store/activityStore";
import { useProgressStore } from "../store/progressStore";
import { usePresetStore } from "../store/presetStore";
import { Balloon } from "../components/Balloon";
import MissionModal from "../components/MissionModal";

interface CloudData {
  id: number;
  top: string;
  width: number;
  height: number;
  opacity: number;
  duration: number;
  delay: number;
}

function generateClouds(count: number): CloudData[] {
  return Array.from({ length: count }, (_, i) => {
    const layer = i % 3; // 0 = far back, 1 = mid, 2 = closer
    const baseW = [120, 160, 200][layer];
    const scale = 0.7 + Math.random() * 0.8;
    return {
      id: i,
      top: `${8 + Math.random() * 55}%`,
      width: Math.round(baseW * scale),
      height: Math.round(baseW * scale * (0.3 + Math.random() * 0.15)),
      opacity: [0.25, 0.4, 0.55][layer],
      duration: [80, 55, 35][layer] + Math.random() * 20,
      delay: -Math.random() * 80,
    };
  });
}

export const GamePage: React.FC = () => {
  const allActivities = useActivityStore((s) => s.activities);
  const completedIds = useProgressStore((s) => s.completedIds);
  const presets = usePresetStore((s) => s.presets);
  const activePresetId = usePresetStore((s) => s.activePresetId);
  const setActivePreset = usePresetStore((s) => s.setActivePreset);

  const activePreset = presets.find((p) => p.id === activePresetId);
  const activities = useMemo(
    () => activePreset
      ? allActivities.filter((a) => activePreset.activityIds.includes(a.id))
      : allActivities,
    [allActivities, activePresetId]
  );

  const [presetMenuOpen, setPresetMenuOpen] = useState(false);
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const clouds = useMemo(() => generateClouds(10), []);
  
  const gameDataRef = useRef({
    positions: new Map<string, { x: number; y: number }>(),
    velocities: new Map<string, { x: number; y: number }>(),
  });

  useEffect(() => {
    const store = gameDataRef.current;
    store.positions.clear();
    store.velocities.clear();
    
    const r = Math.min(window.innerWidth, window.innerHeight) / 9;
    activities.forEach(activity => {
      const x = Math.random() * (window.innerWidth - 2 * r) + r;
      const y = Math.random() * (window.innerHeight - 2 * r) + r;
      
      store.positions.set(activity.id, { x, y });
      store.velocities.set(activity.id, {
        x: (Math.random() - 0.5) * 0.6,
        y: (Math.random() - 0.5) * 0.6,
      });
    });
  }, [activities]);

  // Responsive balloon radius based on screen size and number of balloons.
  // Smaller on phones, bigger on big screens, and slightly smaller when there are many balloons.
  const getRadius = () => {
    const minDim = Math.min(window.innerWidth, window.innerHeight);
    const n = Math.max(activities.length, 1);
    // Aim: balloons take up a reasonable fraction of the screen
    const sizeByScreen = minDim / 9;          // ~36px on a 320px phone, ~107px on 1080p
    const sizeByCount  = minDim / Math.sqrt(n * 4); // shrink as more balloons appear
    return Math.round(Math.max(28, Math.min(100, sizeByScreen, sizeByCount)));
  };

  useEffect(() => {
    let rafId: number;
    let lastTime = 0;
    const targetDt = 1000 / 60; // physics tuned for 60fps

    const loop = (time: number) => {
      if (!lastTime) lastTime = time;
      const elapsed = time - lastTime;
      lastTime = time;
      // Scale physics so it behaves the same on 60Hz, 120Hz, 240Hz
      const dt = Math.min(elapsed, 50) / targetDt; // clamp to avoid spiral on tab-return

      const store = gameDataRef.current;
      const radius = getRadius();
      const bounds = radius;
      const { innerWidth, innerHeight } = window;
      const maxSpeed = 0.8;
      const minSpeed = 0.1;
      const damping = -0.5;

      store.positions.forEach((pos, id) => {
        const vel = store.velocities.get(id);
        if (!vel) return;

        // Gentle air drag
        const drag = Math.pow(0.998, dt);
        vel.x *= drag;
        vel.y *= drag;

        // Continuous gentle wandering
        vel.x += (Math.random() - 0.5) * 0.04 * dt;
        vel.y += (Math.random() - 0.5) * 0.04 * dt;

        // Occasional gentle nudge
        if (Math.random() < 0.003 * dt) {
          vel.x += (Math.random() - 0.5) * 0.6;
          vel.y += (Math.random() - 0.5) * 0.6;
        }

        // Cap velocity
        const speed = Math.hypot(vel.x, vel.y);
        if (speed > maxSpeed) {
          vel.x = (vel.x / speed) * maxSpeed;
          vel.y = (vel.y / speed) * maxSpeed;
        }
        if (speed < minSpeed) {
          const a = Math.random() * Math.PI * 2;
          vel.x += Math.cos(a) * 0.08;
          vel.y += Math.sin(a) * 0.08;
        }

        pos.x += vel.x * dt;
        pos.y += vel.y * dt;

        // Bounce with damping
        if (pos.x < bounds) { pos.x = bounds; vel.x *= damping; }
        if (pos.x > innerWidth - bounds) { pos.x = innerWidth - bounds; vel.x *= damping; }
        if (pos.y < bounds) { pos.y = bounds; vel.y *= damping; }
        if (pos.y > innerHeight - bounds) { pos.y = innerHeight - bounds; vel.y *= damping; }
      });

      setTick((t) => t + 1);
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-sky-200" onClick={() => presetMenuOpen && setPresetMenuOpen(false)}>
      {clouds.map((c) => (
        <div
          key={c.id}
          className="cloud"
          style={{
            top: c.top,
            "--cloud-start": `-${c.width}px`,
            "--cloud-end": `${window.innerWidth + c.width}px`,
            "--cloud-duration": `${c.duration}s`,
            animationDuration: `${c.duration}s`,
            animationDelay: `${c.delay}s`,
          } as React.CSSProperties}
        >
          <div
            className="cloud-shape"
            style={{ width: c.width, height: c.height, opacity: c.opacity }}
          />
        </div>
      ))}

      <div className="absolute top-20 sm:top-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2">
        {presets.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setPresetMenuOpen(!presetMenuOpen)}
              className="bg-white/80 backdrop-blur px-4 py-2 sm:px-5 sm:py-3 rounded-full shadow-lg border border-white/60 text-sm sm:text-base font-bold text-slate-600 hover:bg-white transition-all whitespace-nowrap"
            >
              {activePreset ? activePreset.name : "All"}
              <span className="ml-1 text-xs">&#9662;</span>
            </button>
            {presetMenuOpen && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl border border-slate-200 py-1 min-w-[160px] z-50">
                <button
                  onClick={() => { setActivePreset(null); setPresetMenuOpen(false); }}
                  className={`w-full text-right px-4 py-2 text-sm hover:bg-sky-50 transition-colors ${!activePresetId ? "font-bold text-blue-600" : "text-slate-700"}`}
                >
                  All Activities
                </button>
                {presets.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setActivePreset(p.id); setPresetMenuOpen(false); }}
                    className={`w-full text-right px-4 py-2 text-sm hover:bg-sky-50 transition-colors ${activePresetId === p.id ? "font-bold text-blue-600" : "text-slate-700"}`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="bg-white/80 backdrop-blur px-5 py-2 sm:px-8 sm:py-3 rounded-full shadow-lg border border-white/60 transition-all">
          <span className="text-lg sm:text-2xl font-bold text-slate-700">
            🎈 <span className="text-blue-600">{completedIds.filter((id) => activities.some((a) => a.id === id)).length}</span> / {activities.length}
          </span>
        </div>
      </div>

      {gameDataRef.current.positions.size > 0 ? (
        activities.map((activity) => {
          const pos = gameDataRef.current.positions.get(activity.id);
          if (!pos) return null;

          return (
            <Balloon
              key={activity.id}
              activity={activity}
              radius={getRadius()}
              isSelected={selectedId === activity.id}
              onClick={() => setSelectedId(activity.id)}
              isCompleted={completedIds.includes(activity.id)}
              x={pos.x}
              y={pos.y}
            />
          );
        })
      ) : (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/50 p-8 rounded-2xl text-center">
          <h2 className="text-2xl font-bold text-slate-700">Initializing...</h2>
        </div>
      )}

      <button
        onClick={() => {
          if (completedIds.length === 0) return;
          if (confirm("לאפס את כל המשימות השלמות?")) {
            useProgressStore.getState().resetProgress();
          }
        }}
        disabled={completedIds.length === 0}
        className="absolute left-1/2 -translate-x-1/2 z-40 px-6 py-3 bg-white/80 backdrop-blur text-slate-700 font-bold rounded-full shadow-lg border border-white/60 hover:bg-white active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)" }}
      >
        ↻ אפס התקדמות
      </button>

      {selectedId && (
        <MissionModal
          activity={activities.find(a => a.id === selectedId) || null}
          onClose={() => setSelectedId(null)}
          onComplete={() => {
            useProgressStore.getState().completeActivity(selectedId);
            setSelectedId(null);
          }}
        />
      )}
    </div>
  );
};
