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


  const activePreset = presets.find((p) => p.id === activePresetId);
  const activities = useMemo(
    () => activePreset
      ? allActivities.filter((a) => activePreset.activityIds.includes(a.id))
      : allActivities,
    [allActivities, activePresetId]
  );

  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const clouds = useMemo(() => generateClouds(10), []);

  const completedCount = completedIds.filter((id) => activities.some((a) => a.id === id)).length;
  const allDone = activities.length > 0 && completedCount === activities.length;

  const confettiPieces = useMemo(() => {
    const colors = ["#F87171", "#FBBF24", "#4ADE80", "#60A5FA", "#C084FC", "#F472B6", "#FB923C", "#A78BFA"];
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      color: colors[i % colors.length],
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      size: 6 + Math.random() * 10,
      rotation: Math.random() * 360,
    }));
  }, []);
  
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
    return Math.round(Math.max(36, Math.min(130, sizeByScreen, sizeByCount) * 1.3));
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
    <div className="relative w-full h-full overflow-hidden bg-sky-200">
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

      <div className="absolute top-20 sm:top-6 left-1/2 -translate-x-1/2 z-40 bg-white/80 backdrop-blur px-5 py-2 sm:px-8 sm:py-3 rounded-full shadow-lg border border-white/60 transition-all">
        <span className="text-lg sm:text-2xl font-bold text-slate-700">
          🎈 <span className="text-blue-600">{completedCount}</span> / {activities.length}
        </span>
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

      {allDone && (
        <div className="splash-overlay fixed inset-0 z-50 bg-gradient-to-b from-sky-400/90 via-purple-400/90 to-pink-400/90 backdrop-blur-sm flex items-center justify-center">
          {confettiPieces.map((p) => (
            <div
              key={p.id}
              className="splash-confetti-piece"
              style={{
                left: p.left,
                backgroundColor: p.color,
                width: p.size,
                height: p.size,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                animationIterationCount: "infinite",
                borderRadius: Math.random() > 0.5 ? "50%" : "2px",
                transform: `rotate(${p.rotation}deg)`,
              }}
            />
          ))}

          <div className="splash-card absolute top-1/2 left-1/2 bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 sm:p-12 text-center max-w-md w-[90%]">
            <div className="text-6xl sm:text-8xl mb-4">
              🎉
            </div>
            <h1 className="splash-title text-4xl sm:text-5xl font-black mb-3" dir="auto">
              כל הכבוד!
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 mb-2" dir="auto">
              השלמתם את כל המשימות!
            </p>
            <div className="flex justify-center gap-2 my-4">
              {["🌟", "⭐", "🌟", "⭐", "🌟"].map((star, i) => (
                <span
                  key={i}
                  className="text-3xl sm:text-4xl"
                  style={{ animationDelay: `${0.3 + i * 0.15}s`, display: "inline-block" }}
                >
                  {star}
                </span>
              ))}
            </div>
            <button
              onClick={() => {
                useProgressStore.getState().resetProgress();
              }}
              className="mt-4 px-8 py-3 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white font-bold text-lg rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all"
              dir="auto"
            >
              🔄 שחק שוב
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
