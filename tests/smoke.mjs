// End-to-end smoke test: plays the whole game (all 50 levels) in a real browser for one age band.
// Needs Playwright (npm i -D playwright) and a static server, e.g.:
//   python3 -m http.server 8123 &   then   node tests/smoke.mjs http://localhost:8123 explorer
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright')); }

const base = process.argv[2] || 'http://localhost:8123';
const band = process.argv[3] || 'explorer';
const maxLevels = Number(process.argv[4] || 50);
const questions = JSON.parse(fs.readFileSync(new URL('../data/questions.json', import.meta.url))).levels;
const levels = JSON.parse(fs.readFileSync(new URL('../data/levels.json', import.meta.url))).worlds.flatMap((w) => w.levels);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 420, height: 860 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('requestfailed', (r) => errors.push('requestfailed: ' + r.url()));
const fail = async (msg) => { await page.screenshot({ path: `/tmp/claude/fail-${band}.png` }).catch(() => {}); console.error('FAIL:', msg); console.error(errors.join('\n')); await browser.close(); process.exit(1); };

await page.goto(base + '/index.html');
await page.getByRole('button', { name: /Let's go/ }).click();
await page.locator('#nick').fill('Tester');
await page.locator('.choice.band').nth(['explorer', 'adventurer', 'master'].indexOf(band)).click();
await page.getByRole('button', { name: 'Start Adventure' }).click();
for (let i = 0; i < 3; i++) await page.locator('.btn-primary').click();
await page.waitForSelector('.level-intro');

async function solve(level, ch) {
  const eng = level.engine;
  if (eng === 'number' || eng === 'pattern-puzzle' || (eng === 'science-choice' && ch.type !== 'order')) {
    await page.locator('.choice').nth(ch.answer).click();
  } else if (eng === 'science-choice') {
    for (const item of ch.items) await page.locator('.tile:not([disabled])').getByText(item, { exact: true }).first().click();
  } else if (eng === 'word-builder') {
    for (const c of ch.word) await page.locator('.tile.letter:not([disabled])', { hasText: new RegExp('^' + c + '$') }).first().click();
  } else if (eng === 'memory-sequence') {
    await page.waitForFunction(() => /Your turn/.test(document.querySelector('.mem-status')?.textContent || ''), null, { timeout: 30000 });
    for (const i of ch.sequence) await page.locator('.pad').nth(i).click();
  } else if (eng === 'object-hunt') {
    const targets = page.locator(`.hunt-item[aria-label="${ch.target}"]:not([disabled])`);
    const n = await targets.count();
    if (n < ch.count) throw new Error('not enough targets ' + n);
    for (let i = 0; i < ch.count; i++) await page.locator(`.hunt-item[aria-label="${ch.target}"]:not([disabled])`).first().click();
  } else if (eng === 'spot-difference') {
    for (let i = 0; i < ch.diffs; i++) {
      await page.locator('.btn-hint').click();
      await page.locator('.spot-grid.tappable .spot-cell.pulse').first().click({ force: true });
    }
  } else if (eng === 'maze-path' && ch.mode === 'compass') {
    await page.locator('.ccell').nth(ch.target[1] * ch.w + ch.target[0]).click();
  } else if (eng === 'maze-path') {
    for (let guard = 0; guard < 80; guard++) {
      if (await page.locator('.feedback:not(.hidden)').count()) break;
      await page.locator('.btn-hint').click();
      const idx = await page.locator('.maze-cell').evaluateAll((els) => els.map((e, i) => (e.classList.contains('hintcell') ? i : -1)).filter((i) => i >= 0));
      for (const i of idx) { await page.locator('.maze-cell').nth(i).click(); if (await page.locator('.feedback:not(.hidden)').count()) break; }
    }
  }
}

let played = 0;
for (const level of levels.slice(0, maxLevels)) {
  if (!(await page.locator('.level-intro').count())) await fail('expected level intro before ' + level.id);
  const title = await page.locator('h1').first().textContent();
  if (!title.includes(level.title)) await fail(`level order: expected ${level.title}, got ${title}`);
  await page.getByRole('button', { name: 'Start' }).click();
  await page.locator('.prop.glow').click({ force: true });
  await page.waitForSelector('.page.play');
  const rounds = questions[level.id][band];
  for (let r = 0; r < rounds.length; r++) {
    await page.waitForFunction((n) => document.querySelectorAll('.rdot.done').length === n && !!document.querySelector('.stage > *') && document.querySelector('.feedback')?.classList.contains('hidden'), r);
    try { await solve(level, rounds[r]); } catch (e) { await fail(`${level.id} round ${r + 1}: ${e.message}`); }
    try { await page.waitForSelector('.feedback:not(.hidden) .btn', { timeout: 8000 }); } catch { await fail(`${level.id} round ${r + 1}: no success feedback`); }
    await page.locator('.feedback .btn').click();
  }
  await page.waitForSelector('.page.reward', { timeout: 8000 }).catch(() => fail('no reward screen after ' + level.id));
  played++;
  const next = page.getByRole('button', { name: /Next level|Open the treasure|Treasure Map/ }).first();
  const label = await next.textContent();
  if (/Open the treasure/.test(label)) { await next.click(); await page.waitForSelector('.ending'); console.log('ending reached'); break; }
  await next.click();
  if (/Treasure Map/.test(label)) { // end of a world: go through the map to the next world and level
    await page.waitForSelector('.map-page');
    await page.getByRole('button', { name: /^Play$/ }).click();
  }
}
if (played === 50) {
  await page.goto(base + '/index.html'); // reload; progress must persist
  await page.getByRole('button', { name: /Let's go/ }).click();
  await page.locator('.profile-card').first().click();
  await page.waitForSelector('.map-page');
  const done = await page.locator('.world-node.complete').count();
  if (done !== 5) await fail('expected 5 completed worlds after reload, got ' + done);
}
const bad = errors.filter((e) => !/speech|AudioContext/i.test(e));
if (bad.length) await fail('browser errors');
console.log(`OK band=${band} levels played=${played}`);
await browser.close();
