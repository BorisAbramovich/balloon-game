import { serve } from "bun";
import indexHtml from "./index.html";
import {
  getActivities, addActivity, updateActivity, deleteActivity,
  getPresets, addPreset, updatePreset, deletePreset,
  getActivePreset, setActivePreset,
  exportData, importData,
  login, checkAuth, logout, requireAdmin,
} from "./src/api";

function guard(req: Request, handler: (req: Request) => Promise<Response>) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return handler(req);
}

const server = serve({
  port: parseInt(process.env.PORT || "3000"),
  routes: {
    "/": indexHtml,

    "/api/auth/login": {
      POST: (req) => login(req),
    },
    "/api/auth/check": {
      GET: (req) => checkAuth(req),
    },
    "/api/auth/logout": {
      POST: () => logout(),
    },

    "/api/activities": {
      GET: () => getActivities(),
      POST: (req) => guard(req, addActivity),
    },
    "/api/activities/:id": {
      PUT: (req) => guard(req, (r) => updateActivity(r, req.params.id)),
      DELETE: (req) => guard(req, () => deleteActivity(req.params.id)),
    },

    "/api/presets": {
      GET: () => getPresets(),
      POST: (req) => guard(req, addPreset),
    },
    "/api/presets/active": {
      GET: () => getActivePreset(),
      PUT: (req) => guard(req, setActivePreset),
    },
    "/api/presets/:id": {
      PUT: (req) => guard(req, (r) => updatePreset(r, req.params.id)),
      DELETE: (req) => guard(req, () => deletePreset(req.params.id)),
    },

    "/api/backup": {
      GET: (req) => { const d = requireAdmin(req); return d || exportData(); },
      POST: (req) => guard(req, importData),
    },
  },
  development: process.env.NODE_ENV !== "production" ? {
    hmr: true,
    console: true,
  } : false,
});

console.log(`Server running on http://localhost:${server.port}`);
