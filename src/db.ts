import { createClient } from "@libsql/client";

const isLocal = !process.env.TURSO_URL;

const client = createClient(
  isLocal
    ? { url: `file:${process.env.BALLOON_DB || "balloon.db"}` }
    : { url: process.env.TURSO_URL!, authToken: process.env.TURSO_AUTH_TOKEN! }
);

// Initialize schema
await client.executeMultiple(`
  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#60A5FA',
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS presets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS preset_activities (
    preset_id TEXT NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
    activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    PRIMARY KEY (preset_id, activity_id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Seed default activities if table is empty
const countResult = await client.execute("SELECT COUNT(*) as c FROM activities");
const count = Number(countResult.rows[0].c);
if (count === 0) {
  const defaults = [
    { id: "b1", title: "חימום ✨",  content: "## זמן להתמתח!\n\n- מתחו את הזרועות **מעל לראש**\n- החזיקו 10 שניות\n- תיהנו מהמתיחה!", color: "#F87171" },
    { id: "b2", title: "שתיה 💧",   content: "שתה **כוס מים** עכשיו.\n\nהגוף שלך זקוק למים 💚", color: "#60A5FA" },
    { id: "b3", title: "נשימה 🌬️", content: "### תרגיל נשימה\n\n1. שאפו עמוק למשך 4 שניות\n2. החזיקו למשך 7 שניות\n3. נשפו למשך 8 שניות\n\nחזרו 3 פעמים.", color: "#4ADE80" },
    { id: "b4", title: "מתיחה 🧘",  content: "עמדו זקוף והושיטו את הידיים _גבוה לשמיים_ ⬆️\n\nהחזיקו 10 שניות.", color: "#FBBF24" },
    { id: "b5", title: "חיוך 😁",   content: "> חיוך הוא קצר דרך בין שני אנשים\n\nמצאו משהו מצחיק וחייכו!", color: "#C084FC" },
  ];
  for (let i = 0; i < defaults.length; i++) {
    const a = defaults[i];
    await client.execute({
      sql: "INSERT INTO activities (id, title, content, color, sort_order) VALUES (?, ?, ?, ?, ?)",
      args: [a.id, a.title, a.content, a.color, i],
    });
  }
}

export default client;
