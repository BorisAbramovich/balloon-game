import { Database } from "bun:sqlite";

const db = new Database("balloon.db", { create: true });

db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA foreign_keys = ON");

db.run(`
  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#60A5FA',
    sort_order INTEGER NOT NULL DEFAULT 0
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS presets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS preset_activities (
    preset_id TEXT NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
    activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    PRIMARY KEY (preset_id, activity_id)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )
`);

// Seed default activities if table is empty
const count = db.query("SELECT COUNT(*) as c FROM activities").get() as { c: number };
if (count.c === 0) {
  const insert = db.prepare("INSERT INTO activities (id, title, content, color, sort_order) VALUES (?, ?, ?, ?, ?)");
  const defaults = [
    { id: "b1", title: "חימום ✨",  content: "## זמן להתמתח!\n\n- מתחו את הזרועות **מעל לראש**\n- החזיקו 10 שניות\n- תיהנו מהמתיחה!", color: "#F87171" },
    { id: "b2", title: "שתיה 💧",   content: "שתה **כוס מים** עכשיו.\n\nהגוף שלך זקוק למים 💚", color: "#60A5FA" },
    { id: "b3", title: "נשימה 🌬️", content: "### תרגיל נשימה\n\n1. שאפו עמוק למשך 4 שניות\n2. החזיקו למשך 7 שניות\n3. נשפו למשך 8 שניות\n\nחזרו 3 פעמים.", color: "#4ADE80" },
    { id: "b4", title: "מתיחה 🧘",  content: "עמדו זקוף והושיטו את הידיים _גבוה לשמיים_ ⬆️\n\nהחזיקו 10 שניות.", color: "#FBBF24" },
    { id: "b5", title: "חיוך 😁",   content: "> חיוך הוא קצר דרך בין שני אנשים\n\nמצאו משהו מצחיק וחייכו!", color: "#C084FC" },
  ];
  defaults.forEach((a, i) => insert.run(a.id, a.title, a.content, a.color, i));
}

export default db;
