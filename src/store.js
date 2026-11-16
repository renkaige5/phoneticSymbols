import { isTauri } from "@tauri-apps/api/core";

/**
 * 学习记录：按音标存「看过 / 答对 / 答错」。
 * 单文件离线版用 localStorage；Tauri 版写本机 SQLite。
 */
const STORAGE_KEY = "phonetic-progress-v1";
const CLASS_KEY = "phonetic-class-v1";

let mode = "local";
let db = null;
const map = {};
let klass = { done: {}, volumeOk: false, classmode: false, loop3: false };

function emptyRow() {
  return { seen: 0, correct: 0, wrong: 0, updatedAt: "" };
}

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function writeLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (error) {
    console.warn("本地存储不可用", error);
  }
}

async function writeRow(id, row) {
  if (mode === "sqlite" && db) {
    try {
      await db.execute(
        `INSERT INTO progress (id, seen, correct, wrong, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT(id) DO UPDATE SET
           seen = excluded.seen,
           correct = excluded.correct,
           wrong = excluded.wrong,
           updated_at = excluded.updated_at`,
        [id, row.seen, row.correct, row.wrong, row.updatedAt],
      );
      return;
    } catch (error) {
      console.warn("SQLite 写入失败，改用本地存储", error);
    }
  }
  writeLocal();
}

function readClass() {
  try {
    const raw = localStorage.getItem(CLASS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function writeClass() {
  try {
    localStorage.setItem(CLASS_KEY, JSON.stringify(klass));
  } catch (error) {
    console.warn("课堂记录写不进去", error);
  }
}

export function initClass() {
  const saved = readClass();
  klass = {
    done: saved.done || {},
    volumeOk: !!saved.volumeOk,
    classmode: !!saved.classmode,
    loop3: !!saved.loop3,
    lastLessonId: saved.lastLessonId || "",
  };
}

export function classPrefs() {
  return klass;
}

export function setPref(key, value) {
  klass[key] = value;
  writeClass();
}

export function markLessonDone(id) {
  klass.done[id] = new Date().toISOString();
  writeClass();
}

export function isLessonDone(id) {
  return !!(klass.done && klass.done[id]);
}

export function doneCount() {
  return Object.keys(klass.done || {}).length;
}

/** 本机答错次数，供老师看薄弱音。不含课时标记。 */
export function weakRows(limit) {
  const rows = [];
  Object.keys(map).forEach((key) => {
    if (key.indexOf("lesson:") === 0) return;
    const current = map[key];
    if (!current || !current.wrong) return;
    rows.push({ id: key, wrong: current.wrong, correct: current.correct || 0 });
  });
  rows.sort((a, b) => b.wrong - a.wrong);
  return rows.slice(0, limit || 5);
}

export function storageMode() {
  return mode;
}

export function progressMap() {
  return map;
}

export async function initStore() {
  initClass();
  Object.keys(map).forEach((key) => delete map[key]);
  if (isTauri()) {
    try {
      const Database = (await import("@tauri-apps/plugin-sql")).default;
      db = await Database.load("sqlite:progress.db");
      const rows = await db.select("SELECT id, seen, correct, wrong, updated_at FROM progress");
      rows.forEach((row) => {
        map[row.id] = {
          seen: row.seen,
          correct: row.correct,
          wrong: row.wrong,
          updatedAt: row.updated_at,
        };
      });
      mode = "sqlite";
      return mode;
    } catch (error) {
      console.warn("SQLite 不可用，改用本地存储", error);
    }
  }
  Object.assign(map, readLocal());
  mode = "local";
  db = null;
  return mode;
}

export function markSeen(id) {
  const current = map[id] || emptyRow();
  const next = Object.assign({}, current, {
    seen: current.seen + 1,
    updatedAt: new Date().toISOString(),
  });
  map[id] = next;
  return writeRow(id, next);
}

export function recordAnswer(id, correct) {
  const current = map[id] || emptyRow();
  const next = Object.assign({}, current, {
    seen: Math.max(current.seen, 1),
    correct: current.correct + (correct ? 1 : 0),
    wrong: current.wrong + (correct ? 0 : 1),
    updatedAt: new Date().toISOString(),
  });
  map[id] = next;
  return writeRow(id, next);
}

/** 学过的音标（看过或做过题）。 */
export function learnedIds() {
  // 兼容旧数据：以前按「lesson:xxx」存过学习进度，这些不是音标，跳过
  return Object.keys(map).filter((key) => key.indexOf("lesson:") !== 0 && map[key].seen > 0);
}

export async function resetProgress() {
  Object.keys(map).forEach((key) => delete map[key]);
  klass.done = {};
  writeClass();
  if (mode === "sqlite" && db) {
    try {
      await db.execute("DELETE FROM progress");
      return;
    } catch (error) {
      console.warn(error);
    }
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn(error);
  }
}
