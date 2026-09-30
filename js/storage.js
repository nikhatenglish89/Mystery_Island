// Persistence layer. IndexedDB for structured game state; localStorage for small settings.
// Everything degrades to in-memory storage if the browser blocks either one, and `status`
// lets the UI say honestly that progress will not be saved.
const DB_NAME = 'mystery-island';
const STORES = ['profiles', 'progress', 'rewards', 'achievements', 'checkpoint'];
const mem = Object.fromEntries(STORES.map((s) => [s, new Map()]));
let db = null;

export const status = { idb: false, settings: false };

function keyOf(store, obj) { return store === 'profiles' ? obj.id : obj.profileId; }

export async function initStorage() {
  try {
    if (!('indexedDB' in window)) throw new Error('no indexedDB');
    db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        for (const s of STORES) req.result.createObjectStore(s, { keyPath: s === 'profiles' ? 'id' : 'profileId' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('blocked'));
    });
    // Prove we can actually write (Safari private mode can open a DB it cannot write to).
    await tx('checkpoint', 'readwrite', (s) => s.put({ profileId: '__probe__' }));
    await tx('checkpoint', 'readwrite', (s) => s.delete('__probe__'));
    status.idb = true;
  } catch {
    db = null; status.idb = false;
  }
  try {
    localStorage.setItem('mi:probe', '1'); localStorage.removeItem('mi:probe');
    status.settings = true;
  } catch { status.settings = false; }
}

function tx(store, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => resolve(req && 'result' in req ? req.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export async function get(store, key) {
  if (!db) return mem[store].get(key);
  try { return await tx(store, 'readonly', (s) => s.get(key)); } catch { return mem[store].get(key); }
}
export async function put(store, obj) {
  const copy = JSON.parse(JSON.stringify(obj));
  mem[store].set(keyOf(store, copy), copy);
  if (!db) return;
  try { await tx(store, 'readwrite', (s) => s.put(copy)); } catch { status.idb = false; }
}
export async function del(store, key) {
  mem[store].delete(key);
  if (!db) return;
  try { await tx(store, 'readwrite', (s) => s.delete(key)); } catch { status.idb = false; }
}
export async function all(store) {
  if (!db) return [...mem[store].values()];
  try { return await tx(store, 'readonly', (s) => s.getAll()); } catch { return [...mem[store].values()]; }
}
export async function clearAll() {
  for (const s of STORES) {
    mem[s].clear();
    if (db) { try { await tx(s, 'readwrite', (st) => st.clear()); } catch { /* ignore */ } }
  }
}

// ----- lightweight settings (localStorage) -----
const DEFAULTS = { audio: true, voice: true, analytics: true, lastProfile: null };
const memSettings = { ...DEFAULTS };
export function getSetting(key) {
  if (status.settings) {
    try {
      const raw = localStorage.getItem('mi:' + key);
      if (raw != null) return JSON.parse(raw);
    } catch { /* fall through */ }
  }
  return memSettings[key] ?? DEFAULTS[key];
}
export function setSetting(key, value) {
  memSettings[key] = value;
  if (!status.settings) return;
  try { localStorage.setItem('mi:' + key, JSON.stringify(value)); } catch { status.settings = false; }
}
export function clearSettings() {
  Object.assign(memSettings, DEFAULTS);
  if (!status.settings) return;
  try { for (const k of Object.keys(DEFAULTS)) localStorage.removeItem('mi:' + k); } catch { /* ignore */ }
}
