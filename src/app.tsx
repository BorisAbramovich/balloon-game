import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { GamePage } from "./pages/GamePage";
import { AdminPage } from "./pages/AdminPage";
import { useActivityStore } from "./store/activityStore";

function App() {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"game" | "admin">("game");

  useEffect(() => {
    // Simulate a small load to ensure store has settled
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-sky-100">
        <span className="text-2xl font-bold text-blue-600 animate-pulse">
          Loading Balloons...
        </span>
      </div>
    );
  }

  return (
    <div className={`h-screen w-screen overflow-hidden transition-colors ${view === 'game' ? 'bg-sky-200' : 'bg-slate-100'}`}>
      <nav className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center p-4">
        <div className="px-4 py-1 text-lg font-bold bg-white/30 rounded-full">
          Balloon Missions
        </div>
        <button
          onClick={() => setView(view === "game" ? "admin" : "game")}
          className="px-5 py-2 bg-white text-slate-700 font-bold rounded-full shadow-md hover:bg-sky-50 active:scale-95 transition-transform"
        >
          {view === "game" ? "🛠 Admin" : "▶ Play Game"}
        </button>
      </nav>

      {view === "game" ? <GamePage /> : <AdminPage />}
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
