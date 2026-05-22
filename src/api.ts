import db from "./db";

type Activity = { id: string; title: string; content: string; color: string };
type Preset = { id: string; name: string; activityIds: string[] };

const ADMIN_PIN = process.env.ADMIN_PIN || "1234";
const TOKEN_COOKIE = "admin_token";
// Simple HMAC-like token: hash the PIN so we don't store it in the cookie
const VALID_TOKEN = new Bun.CryptoHasher("sha256").update(`balloon-admin:${ADMIN_PIN}`).digest("hex");

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie") || "";
  const match = header.split(";").map(c => c.trim()).find(c => c.startsWith(`${name}=`));
  return match ? match.split("=")[1] : null;
}

export function isAdmin(req: Request): boolean {
  return getCookie(req, TOKEN_COOKIE) === VALID_TOKEN;
}

function unauthorized() {
  return json({ error: "Unauthorized" }, 401);
}

export function requireAdmin(req: Request): Response | null {
  if (!isAdmin(req)) return unauthorized();
  return null;
}

export async function login(req: Request) {
  const body = await req.json() as { pin: string };
  if (body.pin !== ADMIN_PIN) {
    return json({ error: "Wrong PIN" }, 403);
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `${TOKEN_COOKIE}=${VALID_TOKEN}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`,
    },
  });
}

export function checkAuth(req: Request) {
  return json({ authenticated: isAdmin(req) });
}

export function logout() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `${TOKEN_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`,
    },
  });
}

// ---- Activities ----

export function getActivities() {
  const rows = db.query("SELECT id, title, content, color FROM activities ORDER BY sort_order").all() as Activity[];
  return json(rows);
}

export async function addActivity(req: Request) {
  const body = await req.json() as Omit<Activity, "id">;
  const id = crypto.randomUUID();
  const maxOrder = db.query("SELECT COALESCE(MAX(sort_order), 0) as m FROM activities").get() as { m: number };
  db.run(
    "INSERT INTO activities (id, title, content, color, sort_order) VALUES (?, ?, ?, ?, ?)",
    [id, body.title, body.content, body.color, maxOrder.m + 1]
  );
  return json({ id, ...body }, 201);
}

export async function updateActivity(req: Request, id: string) {
  const body = await req.json() as Partial<Activity>;
  db.run(
    "UPDATE activities SET title = COALESCE(?, title), content = COALESCE(?, content), color = COALESCE(?, color) WHERE id = ?",
    [body.title ?? null, body.content ?? null, body.color ?? null, id]
  );
  return json({ ok: true });
}

export function deleteActivity(id: string) {
  db.run("DELETE FROM activities WHERE id = ?", [id]);
  return json({ ok: true });
}

// ---- Presets ----

export function getPresets() {
  const presets = db.query("SELECT id, name FROM presets").all() as { id: string; name: string }[];
  const result: Preset[] = presets.map((p) => {
    const activityIds = (
      db.query("SELECT activity_id FROM preset_activities WHERE preset_id = ?").all(p.id) as { activity_id: string }[]
    ).map((r) => r.activity_id);
    return { ...p, activityIds };
  });
  return json(result);
}

export async function addPreset(req: Request) {
  const body = await req.json() as { name: string; activityIds: string[] };
  const id = crypto.randomUUID();
  db.run("INSERT INTO presets (id, name) VALUES (?, ?)", [id, body.name]);
  const insert = db.prepare("INSERT INTO preset_activities (preset_id, activity_id) VALUES (?, ?)");
  for (const aid of body.activityIds) {
    insert.run(id, aid);
  }
  return json({ id, ...body }, 201);
}

export async function updatePreset(req: Request, id: string) {
  const body = await req.json() as { name: string; activityIds: string[] };
  db.run("UPDATE presets SET name = ? WHERE id = ?", [body.name, id]);
  db.run("DELETE FROM preset_activities WHERE preset_id = ?", [id]);
  const insert = db.prepare("INSERT INTO preset_activities (preset_id, activity_id) VALUES (?, ?)");
  for (const aid of body.activityIds) {
    insert.run(id, aid);
  }
  return json({ ok: true });
}

export function deletePreset(id: string) {
  db.run("DELETE FROM presets WHERE id = ?", [id]);
  return json({ ok: true });
}

// ---- Active Preset ----

export function getActivePreset() {
  const row = db.query("SELECT value FROM settings WHERE key = 'active_preset_id'").get() as { value: string } | null;
  return json({ activePresetId: row?.value ?? null });
}

export async function setActivePreset(req: Request) {
  const body = await req.json() as { activePresetId: string | null };
  if (body.activePresetId === null) {
    db.run("DELETE FROM settings WHERE key = 'active_preset_id'");
  } else {
    db.run(
      "INSERT INTO settings (key, value) VALUES ('active_preset_id', ?) ON CONFLICT(key) DO UPDATE SET value = ?",
      [body.activePresetId, body.activePresetId]
    );
  }
  return json({ ok: true });
}
