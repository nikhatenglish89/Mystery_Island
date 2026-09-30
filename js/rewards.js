// World/level unlocking, stars, coins, gems, map pieces and achievements.
import { S } from './state.js';
import { saveAll } from './player.js';

export const worlds = () => S.data.levels.worlds;
export const allLevels = () => worlds().flatMap((w) => w.levels.map((l) => ({ ...l, world: w.id })));
export const worldById = (id) => worlds().find((w) => w.id === id);
export const worldOfLevel = (levelId) => worlds().find((w) => w.levels.some((l) => l.id === levelId));
export const levelById = (levelId) => allLevels().find((l) => l.id === levelId);

export const isDone = (levelId) => !!S.progress.levels[levelId]?.completed;
export const starsFor = (levelId) => S.progress.levels[levelId]?.stars || 0;
export const worldDoneCount = (w) => w.levels.filter((l) => isDone(l.id)).length;
export const totalStars = () => Object.values(S.progress.levels).reduce((n, l) => n + (l.stars || 0), 0);
export const totalDone = () => Object.values(S.progress.levels).filter((l) => l.completed).length;

export function isWorldUnlocked(worldId) {
  const ws = worlds();
  const i = ws.findIndex((w) => w.id === worldId);
  if (i <= 0) return true;
  if (worldDoneCount(ws[i - 1]) < ws[i - 1].levels.length) return false;
  // Final world additionally needs all four map pieces.
  if (i === ws.length - 1) return S.progress.mapPieces.length >= ws.length - 1;
  return true;
}
export function isLevelUnlocked(levelId) {
  const w = worldOfLevel(levelId);
  if (!w || !isWorldUnlocked(w.id)) return false;
  const i = w.levels.findIndex((l) => l.id === levelId);
  return i === 0 || isDone(w.levels[i - 1].id);
}
// The level the map should highlight: the first unfinished, unlocked level.
export function recommendedLevel() {
  for (const w of worlds()) {
    if (!isWorldUnlocked(w.id)) continue;
    const l = w.levels.find((x) => !isDone(x.id));
    if (l) return { world: w, level: l };
  }
  return null;
}
export function nextLevelAfter(levelId) {
  const w = worldOfLevel(levelId);
  const i = w.levels.findIndex((l) => l.id === levelId);
  if (i < w.levels.length - 1) return w.levels[i + 1];
  return null;
}

export function starsFromPenalty(penalty) { return penalty === 0 ? 3 : penalty <= 2 ? 2 : 1; }

const CHECKS = {
  levels_completed: (c) => totalDone() >= c.value,
  stars_total: (c) => totalStars() >= c.value,
  perfect_levels: (c) => Object.values(S.progress.levels).filter((l) => l.stars === 3).length >= c.value,
  world_complete: (c) => S.progress.worldsCompleted.includes(c.world),
  map_pieces: (c) => S.progress.mapPieces.length >= c.value,
  items_owned: (c) => S.rewards.owned.length >= c.value,
  engine_played: (c) => (S.progress.stats.engines[c.engine]?.played || 0) >= c.value,
  replays: (c) => S.progress.stats.replays >= c.value,
  coins_earned: (c) => S.progress.stats.coinsEarned >= c.value,
};

export function checkAchievements() {
  const fresh = [];
  for (const a of S.data.achievements.achievements) {
    if (S.ach.unlocked[a.id]) continue;
    if (CHECKS[a.cond.type]?.(a.cond)) {
      S.ach.unlocked[a.id] = Date.now();
      S.rewards.gems += a.gems || 0;
      fresh.push(a);
    }
  }
  return fresh;
}

// Called when the last round of a level is finished. Coins are earned on every completed level; gems only
// for finishing a world (and from achievements).
export async function completeLevel(levelId, { wrong, hints, seconds, engine }) {
  const cfg = S.data.rewards;
  const penalty = wrong + hints;
  const stars = starsFromPenalty(penalty);
  const prev = S.progress.levels[levelId];
  const replay = !!prev?.completed;
  const rec = prev || { stars: 0, plays: 0, completed: false };
  rec.stars = Math.max(rec.stars, stars); rec.plays += 1; rec.completed = true; rec.best = Math.max(rec.best || 0, stars);
  S.progress.levels[levelId] = rec;

  const coins = cfg.coinsPerLevel + stars * cfg.coinsPerStar;
  S.rewards.coins += coins; S.progress.stats.coinsEarned += coins;
  const st = S.progress.stats;
  st.playSeconds += Math.min(seconds, 3600); st.hints += hints; st.wrong += wrong; if (replay) st.replays += 1;
  const e = (st.engines[engine] ||= { played: 0, wrong: 0, hints: 0 });
  e.played += 1; e.wrong += wrong; e.hints += hints;

  const world = worldOfLevel(levelId);
  const out = { stars, coins, gems: 0, penalty, replay, worldCompleted: null, mapPiece: null, unlockedWorld: null, gameComplete: false, achievements: [] };
  if (worldDoneCount(world) === world.levels.length && !S.progress.worldsCompleted.includes(world.id)) {
    S.progress.worldsCompleted.push(world.id);
    out.worldCompleted = world;
    const ws = worlds();
    const isFinal = world.id === ws[ws.length - 1].id;
    if (world.mapPiece && !S.progress.mapPieces.includes(world.id)) { S.progress.mapPieces.push(world.id); out.mapPiece = world.mapPiece; }
    out.gems += cfg.gemsPerWorld;
    if (isFinal) { S.progress.gameComplete = true; out.gameComplete = true; out.gems += cfg.gemsForGame; }
    else out.unlockedWorld = ws[ws.findIndex((w) => w.id === world.id) + 1];
  }
  S.rewards.gems += out.gems;
  out.achievements = checkAchievements();
  out.gems += out.achievements.reduce((n, a) => n + (a.gems || 0), 0);
  await saveAll();
  return out;
}

export function itemById(id) { return S.data.rewards.items.find((i) => i.id === id); }
export async function buyItem(id) {
  const item = itemById(id);
  if (!item || S.rewards.owned.includes(id)) return { ok: false, reason: 'owned' };
  const key = item.currency === 'gems' ? 'gems' : 'coins';
  if (S.rewards[key] < item.price) return { ok: false, reason: 'funds' };
  S.rewards[key] -= item.price; S.rewards.owned.push(id);
  const fresh = checkAchievements();
  await saveAll();
  return { ok: true, item, achievements: fresh };
}
export async function toggleItem(id) {
  const item = itemById(id);
  if (!item || !S.rewards.owned.includes(id)) return { ok: false };
  if (item.slot === 'outfit') S.rewards.equipped.outfit = S.rewards.equipped.outfit === id ? null : id;
  else if (S.rewards.placed.includes(id)) S.rewards.placed = S.rewards.placed.filter((x) => x !== id);
  else if (S.rewards.placed.length >= S.data.rewards.maxPlaced) return { ok: false, reason: 'full' };
  else S.rewards.placed.push(id);
  await saveAll();
  return { ok: true };
}
