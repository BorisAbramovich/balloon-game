import db from "./db";

type Activity = { id: string; title: string; content: string; color: string };
type Preset = { id: string; name: string; activityIds: string[] };

const ADMIN_PIN = process.env.ADMIN_PIN || "1234";
const TOKEN_COOKIE = "admin_token";
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

// ---- Health ----

export async function healthCheck() {
  try {
    const result = await db.execute("SELECT COUNT(*) as c FROM activities");
    const count = Number(result.rows[0].c);
    return json({
      status: "ok",
      backend: process.env.TURSO_URL ? "turso" : "local",
      activities: count,
    });
  } catch (e: any) {
    return json({ status: "error", error: e.message, backend: process.env.TURSO_URL ? "turso" : "local" }, 500);
  }
}

// ---- Activities ----

export async function getActivities() {
  const result = await db.execute("SELECT id, title, content, color FROM activities ORDER BY sort_order");
  const rows = result.rows.map((r) => ({
    id: r.id as string,
    title: r.title as string,
    content: r.content as string,
    color: r.color as string,
  }));
  return json(rows);
}

export async function addActivity(req: Request) {
  const body = await req.json() as Omit<Activity, "id">;
  const id = crypto.randomUUID();
  const maxResult = await db.execute("SELECT COALESCE(MAX(sort_order), 0) as m FROM activities");
  const maxOrder = Number(maxResult.rows[0].m);
  await db.execute({
    sql: "INSERT INTO activities (id, title, content, color, sort_order) VALUES (?, ?, ?, ?, ?)",
    args: [id, body.title, body.content, body.color, maxOrder + 1],
  });
  return json({ id, ...body }, 201);
}

export async function updateActivity(req: Request, id: string) {
  const body = await req.json() as Partial<Activity>;
  await db.execute({
    sql: "UPDATE activities SET title = COALESCE(?, title), content = COALESCE(?, content), color = COALESCE(?, color) WHERE id = ?",
    args: [body.title ?? null, body.content ?? null, body.color ?? null, id],
  });
  return json({ ok: true });
}

export async function deleteActivity(id: string) {
  await db.execute({ sql: "DELETE FROM activities WHERE id = ?", args: [id] });
  return json({ ok: true });
}

// ---- Presets ----

export async function getPresets() {
  const presetsResult = await db.execute("SELECT id, name FROM presets");
  const result: Preset[] = [];
  for (const p of presetsResult.rows) {
    const paResult = await db.execute({
      sql: "SELECT activity_id FROM preset_activities WHERE preset_id = ?",
      args: [p.id as string],
    });
    result.push({
      id: p.id as string,
      name: p.name as string,
      activityIds: paResult.rows.map((r) => r.activity_id as string),
    });
  }
  return json(result);
}

export async function addPreset(req: Request) {
  const body = await req.json() as { name: string; activityIds: string[] };
  const id = crypto.randomUUID();
  await db.execute({ sql: "INSERT INTO presets (id, name) VALUES (?, ?)", args: [id, body.name] });
  for (const aid of body.activityIds) {
    await db.execute({
      sql: "INSERT INTO preset_activities (preset_id, activity_id) VALUES (?, ?)",
      args: [id, aid],
    });
  }
  return json({ id, ...body }, 201);
}

export async function updatePreset(req: Request, id: string) {
  const body = await req.json() as { name: string; activityIds: string[] };
  await db.execute({ sql: "UPDATE presets SET name = ? WHERE id = ?", args: [body.name, id] });
  await db.execute({ sql: "DELETE FROM preset_activities WHERE preset_id = ?", args: [id] });
  for (const aid of body.activityIds) {
    await db.execute({
      sql: "INSERT INTO preset_activities (preset_id, activity_id) VALUES (?, ?)",
      args: [id, aid],
    });
  }
  return json({ ok: true });
}

export async function deletePreset(id: string) {
  await db.execute({ sql: "DELETE FROM presets WHERE id = ?", args: [id] });
  return json({ ok: true });
}

// ---- Active Preset ----

export async function getActivePreset() {
  const result = await db.execute("SELECT value FROM settings WHERE key = 'active_preset_id'");
  const row = result.rows[0];
  return json({ activePresetId: row?.value ?? null });
}

export async function setActivePreset(req: Request) {
  const body = await req.json() as { activePresetId: string | null };
  if (body.activePresetId === null) {
    await db.execute("DELETE FROM settings WHERE key = 'active_preset_id'");
  } else {
    await db.execute({
      sql: "INSERT INTO settings (key, value) VALUES ('active_preset_id', ?) ON CONFLICT(key) DO UPDATE SET value = ?",
      args: [body.activePresetId, body.activePresetId],
    });
  }
  return json({ ok: true });
}

// ---- Export / Import ----

export async function exportData() {
  const actResult = await db.execute("SELECT id, title, content, color, sort_order FROM activities ORDER BY sort_order");
  const activities = actResult.rows.map((r) => ({
    id: r.id, title: r.title, content: r.content, color: r.color, sort_order: r.sort_order,
  }));

  const presetsResult = await db.execute("SELECT id, name FROM presets");
  const presets = [];
  for (const p of presetsResult.rows) {
    const paResult = await db.execute({
      sql: "SELECT activity_id FROM preset_activities WHERE preset_id = ?",
      args: [p.id as string],
    });
    presets.push({
      id: p.id, name: p.name,
      activityIds: paResult.rows.map((r) => r.activity_id as string),
    });
  }

  const activeResult = await db.execute("SELECT value FROM settings WHERE key = 'active_preset_id'");
  const activeRow = activeResult.rows[0];

  return json({
    activities,
    presets,
    activePresetId: activeRow?.value ?? null,
  });
}

export async function importData(req: Request) {
  const body = await req.json() as {
    activities: { id: string; title: string; content: string; color: string; sort_order?: number }[];
    presets: { id: string; name: string; activityIds: string[] }[];
    activePresetId: string | null;
  };

  await db.execute("DELETE FROM preset_activities");
  await db.execute("DELETE FROM presets");
  await db.execute("DELETE FROM activities");
  await db.execute("DELETE FROM settings WHERE key = 'active_preset_id'");

  for (let i = 0; i < body.activities.length; i++) {
    const a = body.activities[i];
    await db.execute({
      sql: "INSERT INTO activities (id, title, content, color, sort_order) VALUES (?, ?, ?, ?, ?)",
      args: [a.id, a.title, a.content, a.color, a.sort_order ?? i],
    });
  }

  for (const p of body.presets) {
    await db.execute({ sql: "INSERT INTO presets (id, name) VALUES (?, ?)", args: [p.id, p.name] });
    for (const aid of p.activityIds) {
      await db.execute({
        sql: "INSERT INTO preset_activities (preset_id, activity_id) VALUES (?, ?)",
        args: [p.id, aid],
      });
    }
  }

  if (body.activePresetId) {
    await db.execute({
      sql: "INSERT INTO settings (key, value) VALUES ('active_preset_id', ?)",
      args: [body.activePresetId],
    });
  }

  return json({ ok: true });
}
