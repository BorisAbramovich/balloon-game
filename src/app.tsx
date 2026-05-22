import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { GamePage } from "./pages/GamePage";
import { AdminPage } from "./pages/AdminPage";
import { useActivityStore } from "./store/activityStore";
import { usePresetStore } from "./store/presetStore";

function PinScreen({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  const submit = async () => {
    setChecking(true);
    setError(false);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    setChecking(false);
    if (res.ok) {
      onSuccess();
    } else {
      setError(true);
      setPin("");
    }
  };

  return (
    <div className="h-full w-full flex items-center justify-center bg-slate-100 pt-20">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-[90%] max-w-sm text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-slate-800 mb-6">Admin PIN</h2>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && pin.length > 0 && submit()}
          placeholder="Enter PIN"
          className={`text-center text-3xl tracking-[0.5em] font-mono w-full border-2 rounded-xl p-4 outline-none transition-colors ${
            error ? "border-red-400 bg-red-50" : "border-slate-200 focus:border-blue-400"
          }`}
          autoFocus
        />
        {error && (
          <p className="text-red-500 text-sm mt-2 font-bold">PIN incorrect</p>
        )}
        <button
          onClick={submit}
          disabled={pin.length === 0 || checking}
          className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {checking ? "..." : "Enter"}
        </button>
      </div>
    </div>
  );
}

function App() {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"game" | "admin">("game");
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    Promise.all([
      useActivityStore.getState().fetchActivities(),
      usePresetStore.getState().fetchPresets(),
      usePresetStore.getState().fetchActivePreset(),
    ]).then(() => setLoading(false));
  }, []);

  // Check existing auth cookie when trying to go to admin
  useEffect(() => {
    if (view === "admin" && !authed) {
      fetch("/api/auth/check").then(r => r.json()).then((data) => {
        if (data.authenticated) setAuthed(true);
      });
    }
    if (view === "game" && !loading) {
      useActivityStore.getState().fetchActivities();
      usePresetStore.getState().fetchPresets();
      usePresetStore.getState().fetchActivePreset();
    }
  }, [view]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-sky-100">
        <span className="text-2xl font-bold text-blue-600 animate-pulse">
          Loading Balloons...
        </span>
      </div>
    );
  }

  const showAdmin = view === "admin";

  return (
    <div className={`h-screen w-screen overflow-hidden transition-colors ${showAdmin ? 'bg-slate-100' : 'bg-sky-200'}`}>
      <nav className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center p-4">
        <div className="px-4 py-1 text-4xl font-bold bg-white/30 rounded-full">
          בלוני משימות
        </div>
        <div className="flex gap-2">
          {showAdmin && authed && (
            <button
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                setAuthed(false);
                setView("game");
              }}
              className="px-4 py-2 bg-red-100 text-red-700 font-bold rounded-full shadow-md hover:bg-red-200 active:scale-95 transition-transform"
            >
              🔓 Logout
            </button>
          )}
          <button
            onClick={() => setView(showAdmin ? "game" : "admin")}
            className="px-5 py-2 bg-white text-slate-700 font-bold rounded-full shadow-md hover:bg-sky-50 active:scale-95 transition-transform"
          >
            {showAdmin ? "▶ Play Game" : "🛠 Admin"}
          </button>
        </div>
      </nav>

      {showAdmin
        ? (authed ? <AdminPage /> : <PinScreen onSuccess={() => setAuthed(true)} />)
        : <GamePage />
      }
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
