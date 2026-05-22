import { serve } from "bun";
import indexHtml from "./index.html";
import {
  getActivities, addActivity, updateActivity, deleteActivity,
  getPresets, addPreset, updatePreset, deletePreset,
  getActivePreset, setActivePreset,
} from "./src/api";

const server = serve({
  port: parseInt(process.env.PORT || "3000"),
  routes: {
    "/": indexHtml,

    "/api/activities": {
      GET: () => getActivities(),
      POST: (req) => addActivity(req),
    },
    "/api/activities/:id": {
      PUT: (req) => updateActivity(req, req.params.id),
      DELETE: (req) => deleteActivity(req.params.id),
    },

    "/api/presets": {
      GET: () => getPresets(),
      POST: (req) => addPreset(req),
    },
    "/api/presets/active": {
      GET: () => getActivePreset(),
      PUT: (req) => setActivePreset(req),
    },
    "/api/presets/:id": {
      PUT: (req) => updatePreset(req, req.params.id),
      DELETE: (req) => deletePreset(req.params.id),
    },
  },
  development: process.env.NODE_ENV !== "production" ? {
    hmr: true,
    console: true,
  } : false,
});

console.log(`Server running on http://localhost:${server.port}`);
