import { test, expect, describe, beforeAll, afterAll, beforeEach } from "bun:test";
import { $ } from "bun";

const PORT = 3199;
const BASE = `http://localhost:${PORT}`;
let proc: ReturnType<typeof Bun.spawn>;

// Login and get the auth cookie
async function getAuthCookie(): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin: "1234" }),
  });
  const cookie = res.headers.get("set-cookie")!;
  return cookie.split(";")[0]; // "admin_token=..."
}

// Helper for authed requests
async function authedFetch(path: string, opts: RequestInit = {}) {
  const cookie = await getAuthCookie();
  return fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      ...opts.headers,
      "Content-Type": "application/json",
      Cookie: cookie,
    },
  });
}

beforeAll(async () => {
  // Remove test DB if it exists
  await $`rm -f /home/boris/develop/game/test-balloon.db /home/boris/develop/game/test-balloon.db-wal /home/boris/develop/game/test-balloon.db-shm`.quiet();

  // Start server with test DB on a different port
  proc = Bun.spawn(["bun", "./index.ts"], {
    env: {
      ...process.env,
      PORT: String(PORT),
      ADMIN_PIN: "1234",
      BALLOON_DB: "test-balloon.db",
    },
    stdout: "ignore",
    stderr: "ignore",
  });

  // Wait for server to be ready
  for (let i = 0; i < 30; i++) {
    try {
      await fetch(`${BASE}/api/activities`);
      return;
    } catch {
      await Bun.sleep(100);
    }
  }
  throw new Error("Server failed to start");
});

afterAll(async () => {
  proc.kill();
  await $`rm -f /home/boris/develop/game/test-balloon.db /home/boris/develop/game/test-balloon.db-wal /home/boris/develop/game/test-balloon.db-shm`.quiet();
});

// ---- Auth ----

describe("Auth", () => {
  test("GET /api/auth/check returns false without cookie", async () => {
    const res = await fetch(`${BASE}/api/auth/check`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.authenticated).toBe(false);
  });

  test("POST /api/auth/login with wrong PIN returns 403", async () => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: "9999" }),
    });
    expect(res.status).toBe(403);
  });

  test("POST /api/auth/login with correct PIN returns 200 and sets cookie", async () => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: "1234" }),
    });
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie");
    expect(cookie).toContain("admin_token=");
    expect(cookie).toContain("HttpOnly");
  });

  test("GET /api/auth/check returns true with valid cookie", async () => {
    const cookie = await getAuthCookie();
    const res = await fetch(`${BASE}/api/auth/check`, {
      headers: { Cookie: cookie },
    });
    const data = await res.json();
    expect(data.authenticated).toBe(true);
  });

  test("POST /api/auth/logout clears the cookie", async () => {
    const res = await fetch(`${BASE}/api/auth/logout`, { method: "POST" });
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie");
    expect(cookie).toContain("Max-Age=0");
  });
});

// ---- Activities ----

describe("Activities", () => {
  test("GET /api/activities returns seeded defaults", async () => {
    const res = await fetch(`${BASE}/api/activities`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(5);
    expect(data[0]).toHaveProperty("id");
    expect(data[0]).toHaveProperty("title");
    expect(data[0]).toHaveProperty("content");
    expect(data[0]).toHaveProperty("color");
  });

  test("POST /api/activities requires auth", async () => {
    const res = await fetch(`${BASE}/api/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test", content: "x", color: "#000" }),
    });
    expect(res.status).toBe(401);
  });

  test("POST /api/activities creates a new activity when authed", async () => {
    const res = await authedFetch("/api/activities", {
      method: "POST",
      body: JSON.stringify({ title: "New Test", content: "test content", color: "#FF0000" }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.title).toBe("New Test");
    expect(data.color).toBe("#FF0000");

    // Verify it appears in the list
    const listRes = await fetch(`${BASE}/api/activities`);
    const list = await listRes.json();
    expect(list.some((a: any) => a.title === "New Test")).toBe(true);
  });

  test("PUT /api/activities/:id requires auth", async () => {
    const res = await fetch(`${BASE}/api/activities/b1`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Hacked" }),
    });
    expect(res.status).toBe(401);
  });

  test("PUT /api/activities/:id updates an activity when authed", async () => {
    const res = await authedFetch("/api/activities/b1", {
      method: "PUT",
      body: JSON.stringify({ title: "Updated Title" }),
    });
    expect(res.status).toBe(200);

    const listRes = await fetch(`${BASE}/api/activities`);
    const list = await listRes.json();
    const updated = list.find((a: any) => a.id === "b1");
    expect(updated.title).toBe("Updated Title");
  });

  test("DELETE /api/activities/:id requires auth", async () => {
    const res = await fetch(`${BASE}/api/activities/b5`, { method: "DELETE" });
    expect(res.status).toBe(401);
  });

  test("DELETE /api/activities/:id removes an activity when authed", async () => {
    const res = await authedFetch("/api/activities/b5", { method: "DELETE" });
    expect(res.status).toBe(200);

    const listRes = await fetch(`${BASE}/api/activities`);
    const list = await listRes.json();
    expect(list.some((a: any) => a.id === "b5")).toBe(false);
  });
});

// ---- Presets ----

describe("Presets", () => {
  let presetId: string;

  test("GET /api/presets returns empty array initially", async () => {
    const res = await fetch(`${BASE}/api/presets`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  test("POST /api/presets requires auth", async () => {
    const res = await fetch(`${BASE}/api/presets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Monday", activityIds: ["b1", "b2"] }),
    });
    expect(res.status).toBe(401);
  });

  test("POST /api/presets creates a preset when authed", async () => {
    const res = await authedFetch("/api/presets", {
      method: "POST",
      body: JSON.stringify({ name: "Monday Class", activityIds: ["b1", "b2"] }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.name).toBe("Monday Class");
    expect(data.activityIds).toEqual(["b1", "b2"]);
    presetId = data.id;
  });

  test("GET /api/presets returns created preset with activity IDs", async () => {
    const res = await fetch(`${BASE}/api/presets`);
    const data = await res.json();
    const found = data.find((p: any) => p.id === presetId);
    expect(found).toBeDefined();
    expect(found.name).toBe("Monday Class");
    expect(found.activityIds).toContain("b1");
    expect(found.activityIds).toContain("b2");
  });

  test("PUT /api/presets/:id updates a preset when authed", async () => {
    const res = await authedFetch(`/api/presets/${presetId}`, {
      method: "PUT",
      body: JSON.stringify({ name: "Tuesday Class", activityIds: ["b2", "b3"] }),
    });
    expect(res.status).toBe(200);

    const listRes = await fetch(`${BASE}/api/presets`);
    const list = await listRes.json();
    const updated = list.find((p: any) => p.id === presetId);
    expect(updated.name).toBe("Tuesday Class");
    expect(updated.activityIds).toEqual(["b2", "b3"]);
  });

  test("DELETE /api/presets/:id removes a preset when authed", async () => {
    const res = await authedFetch(`/api/presets/${presetId}`, { method: "DELETE" });
    expect(res.status).toBe(200);

    const listRes = await fetch(`${BASE}/api/presets`);
    const list = await listRes.json();
    expect(list.some((p: any) => p.id === presetId)).toBe(false);
  });
});

// ---- Active Preset ----

describe("Active Preset", () => {
  let presetId: string;

  beforeEach(async () => {
    // Create a preset to use
    const res = await authedFetch("/api/presets", {
      method: "POST",
      body: JSON.stringify({ name: "Temp", activityIds: ["b1"] }),
    });
    const data = await res.json();
    presetId = data.id;
  });

  test("GET /api/presets/active returns null initially", async () => {
    const res = await fetch(`${BASE}/api/presets/active`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.activePresetId).toBeNull();
  });

  test("PUT /api/presets/active requires auth", async () => {
    const res = await fetch(`${BASE}/api/presets/active`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activePresetId: presetId }),
    });
    expect(res.status).toBe(401);
  });

  test("PUT /api/presets/active sets and clears active preset", async () => {
    // Set active
    let res = await authedFetch("/api/presets/active", {
      method: "PUT",
      body: JSON.stringify({ activePresetId: presetId }),
    });
    expect(res.status).toBe(200);

    let data = await (await fetch(`${BASE}/api/presets/active`)).json();
    expect(data.activePresetId).toBe(presetId);

    // Clear active
    res = await authedFetch("/api/presets/active", {
      method: "PUT",
      body: JSON.stringify({ activePresetId: null }),
    });
    expect(res.status).toBe(200);

    data = await (await fetch(`${BASE}/api/presets/active`)).json();
    expect(data.activePresetId).toBeNull();
  });
});

// ---- Backup / Restore ----

describe("Backup", () => {
  test("GET /api/backup requires auth", async () => {
    const res = await fetch(`${BASE}/api/backup`);
    expect(res.status).toBe(401);
  });

  test("POST /api/backup requires auth", async () => {
    const res = await fetch(`${BASE}/api/backup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activities: [], presets: [], activePresetId: null }),
    });
    expect(res.status).toBe(401);
  });

  test("Export and import round-trips data correctly", async () => {
    // Export current state
    const exportRes = await authedFetch("/api/backup");
    expect(exportRes.status).toBe(200);
    const backup = await exportRes.json();
    expect(backup.activities).toBeDefined();
    expect(backup.presets).toBeDefined();
    expect(Array.isArray(backup.activities)).toBe(true);

    const originalCount = backup.activities.length;

    // Import a custom dataset
    const customData = {
      activities: [
        { id: "t1", title: "Test A", content: "aaa", color: "#111", sort_order: 0 },
        { id: "t2", title: "Test B", content: "bbb", color: "#222", sort_order: 1 },
      ],
      presets: [
        { id: "p1", name: "Test Preset", activityIds: ["t1", "t2"] },
      ],
      activePresetId: "p1",
    };

    const importRes = await authedFetch("/api/backup", {
      method: "POST",
      body: JSON.stringify(customData),
    });
    expect(importRes.status).toBe(200);

    // Verify the imported data
    const activitiesRes = await fetch(`${BASE}/api/activities`);
    const activities = await activitiesRes.json();
    expect(activities.length).toBe(2);
    expect(activities[0].title).toBe("Test A");
    expect(activities[1].title).toBe("Test B");

    const presetsRes = await fetch(`${BASE}/api/presets`);
    const presets = await presetsRes.json();
    expect(presets.length).toBe(1);
    expect(presets[0].name).toBe("Test Preset");
    expect(presets[0].activityIds).toEqual(["t1", "t2"]);

    const activeRes = await fetch(`${BASE}/api/presets/active`);
    const active = await activeRes.json();
    expect(active.activePresetId).toBe("p1");

    // Restore original data
    const restoreRes = await authedFetch("/api/backup", {
      method: "POST",
      body: JSON.stringify(backup),
    });
    expect(restoreRes.status).toBe(200);

    // Verify restoration
    const restoredRes = await fetch(`${BASE}/api/activities`);
    const restored = await restoredRes.json();
    expect(restored.length).toBe(originalCount);
  });
});

// ---- HTML Page ----

describe("Frontend", () => {
  test("GET / returns HTML page", async () => {
    const res = await fetch(BASE);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("<!DOCTYPE html>");
    expect(text).toContain("Balloon Game");
  });
});
