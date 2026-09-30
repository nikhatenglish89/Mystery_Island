// Profiles and per-profile saved data (progress, rewards, achievements, checkpoint).
import { S } from './state.js';
import * as store from './storage.js';

export const emptyProgress = (profileId) => ({
  profileId, levels: {}, mapPieces: [], worldsCompleted: [], gameComplete: false,
  stats: { playSeconds: 0, sessions: 0, hints: 0, wrong: 0, replays: 0, coinsEarned: 0, engines: {} },
});
export const emptyRewards = (profileId) => ({ profileId, coins: 0, gems: 0, owned: [], equipped: { outfit: null }, placed: [] });
export const emptyAch = (profileId) => ({ profileId, unlocked: {} });

export function validProgress(p) {
  return !!p && typeof p === 'object' && p.levels && typeof p.levels === 'object' && Array.isArray(p.mapPieces) && p.stats && typeof p.stats === 'object';
}
export function validRewards(r) {
  return !!r && typeof r.coins === 'number' && typeof r.gems === 'number' && Array.isArray(r.owned) && Array.isArray(r.placed) && r.equipped && typeof r.equipped === 'object';
}

export async function loadProfiles() {
  const list = await store.all('profiles');
  S.profiles = list.filter((p) => p && p.id && p.nickname).sort((a, b) => a.created - b.created);
  return S.profiles;
}

export function cleanNickname(raw) {
  return String(raw || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, S.data.config.nicknameMaxLength);
}

export async function createProfile({ nickname, band, avatar }) {
  const max = S.data.config.maxProfiles;
  if (S.profiles.length >= max) throw new Error('limit');
  const nick = cleanNickname(nickname);
  if (!nick) throw new Error('nickname');
  const id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const profile = { id, nickname: nick, band, avatar, created: Date.now() };
  await store.put('profiles', profile);
  await store.put('progress', emptyProgress(id));
  await store.put('rewards', emptyRewards(id));
  await store.put('achievements', emptyAch(id));
  S.profiles.push(profile);
  return profile;
}

// Returns {ok:false} when saved data is unreadable, so the UI can offer the Parent Area reset.
export async function selectProfile(id) {
  const profile = S.profiles.find((p) => p.id === id);
  if (!profile) return { ok: false };
  const [progress, rewards, ach] = await Promise.all([store.get('progress', id), store.get('rewards', id), store.get('achievements', id)]);
  if (progress && !validProgress(progress)) return { ok: false, corrupt: true };
  if (rewards && !validRewards(rewards)) return { ok: false, corrupt: true };
  S.profile = profile;
  S.progress = progress || emptyProgress(id);
  S.rewards = rewards || emptyRewards(id);
  S.ach = ach && ach.unlocked ? ach : emptyAch(id);
  S.progress.stats.sessions += 1;
  S.sessionStart = Date.now();
  store.setSetting('lastProfile', id);
  await saveAll();
  return { ok: true, profile };
}

export const saveProgress = () => store.put('progress', S.progress);
export const saveRewards = () => store.put('rewards', S.rewards);
export const saveAch = () => store.put('achievements', S.ach);
export const saveAll = () => Promise.all([saveProgress(), saveRewards(), saveAch()]);

export function leaveProfile() { S.profile = null; S.progress = null; S.rewards = null; S.ach = null; }

export async function resetProfileProgress(id) {
  await store.put('progress', emptyProgress(id));
  await store.put('rewards', emptyRewards(id));
  await store.put('achievements', emptyAch(id));
  await store.del('checkpoint', id);
  if (S.profile?.id === id) leaveProfile();
}
export async function removeProfile(id) {
  for (const s of ['progress', 'rewards', 'achievements', 'checkpoint', 'profiles']) await store.del(s, id);
  S.profiles = S.profiles.filter((p) => p.id !== id);
  if (S.profile?.id === id) leaveProfile();
  if (store.getSetting('lastProfile') === id) store.setSetting('lastProfile', null);
}
export async function eraseEverything() {
  await store.clearAll();
  store.clearSettings();
  S.profiles = []; leaveProfile();
}

export async function saveCheckpoint(cp) { await store.put('checkpoint', { profileId: S.profile.id, ...cp, savedAt: Date.now() }); }
export async function loadCheckpoint(id) { return store.get('checkpoint', id); }
export async function clearCheckpoint(id = S.profile?.id) { if (id) await store.del('checkpoint', id); }
