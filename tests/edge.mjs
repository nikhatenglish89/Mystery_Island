// Edge cases from the App Flow doc: checkpoint restore after refresh, three-profile limit, parent gate + reset, corrupt data.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright')); }
const base = process.argv[2] || 'http://localhost:8123';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 420, height: 860 } })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
const check = (ok, msg) => { if (!ok) { console.error('FAIL:', msg, errors); process.exit(1); } console.log('ok -', msg); };

await page.goto(base + '/index.html');
const start = () => page.getByRole('button', { name: /Let's go/ }).click();
async function addProfile(nick, first) {
  if (!first) await page.getByText('Add explorer').click();
  await page.locator('#nick').fill(nick); await page.locator('.choice.band').first().click();
  await page.getByRole('button', { name: 'Start Adventure' }).click(); await page.waitForSelector('.tutorial-box');
}
await start(); await addProfile('Ann', true);
// 1. checkpoint restore
const go = (n, p = {}) => page.evaluate(([n, p]) => import('/js/router.js').then((m) => m.go(n, p)), [n, p]);
await go('play', { levelId: 'pb-02', round: 0, wrong: 0, hints: 0, seconds: 0 });
await page.waitForSelector('.page.play');
const ans = await page.evaluate(() => fetch('data/questions.json').then((r) => r.json()).then((q) => q.levels['pb-02'].explorer[0].answer));
await page.locator('.choice').nth(ans).click();
await page.locator('.feedback .btn').click();
await page.waitForFunction(() => document.querySelectorAll('.rdot.done').length === 1);
await page.reload(); await start();
await page.locator('.profile-card').first().click();
await page.waitForSelector('.page.play');
check((await page.locator('.rdot.done').count()) === 1, 'refresh mid-level restores round 2 checkpoint');
// leaving on purpose clears the checkpoint
await page.getByRole('button', { name: /Leave/ }).click(); await page.getByRole('button', { name: 'Leave level' }).click();
await page.waitForSelector('.world-page');
await page.reload(); await start(); await page.locator('.profile-card').first().click();
await page.waitForSelector('.map-page');
check(true, 'leaving a level clears its checkpoint');
// 2. profile limit
await page.getByRole('button', { name: 'Switch' }).click();
await page.getByText('Add explorer').click(); await page.locator('#nick').fill('Ben'); await page.locator('.choice.band').nth(1).click();
await page.getByRole('button', { name: 'Start Adventure' }).click(); await page.waitForSelector('.tutorial-box');
await go('profiles'); await page.getByText('Add explorer').click(); await page.locator('#nick').fill('Cy'); await page.locator('.choice.band').nth(2).click();
await page.getByRole('button', { name: 'Start Adventure' }).click(); await page.waitForSelector('.tutorial-box');
await go('profiles');
check((await page.locator('.profile-card:not(.add)').count()) === 3, 'three profiles saved');
await page.getByText('Add explorer').click();
check(await page.getByRole('dialog', { name: /Three explorers is the limit/ }).isVisible(), 'fourth explorer is refused with an explanation');
await page.getByRole('button', { name: 'OK' }).click();
// 3. parent gate and remove
await page.getByRole('button', { name: 'Parent Area' }).click();
const hold = page.getByRole('button', { name: 'Press and hold' });
const box = await hold.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.waitForTimeout(400); await page.mouse.up();
check(!(await page.locator('.gate-box input').count()), 'a short tap does not open the gate');
await page.mouse.down(); await page.waitForTimeout(1800); await page.mouse.up();
await page.waitForSelector('.gate-box input');
const words = (await page.locator('.gate-box .lead').textContent()).split(': ')[1];
const ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' '); const TENS = ',,twenty,thirty,forty,fifty,sixty,seventy,eighty,ninety'.split(',');
const parse = (w) => { let n = 0; const [h, rest] = w.split(' hundred'); n = ONES.indexOf(h) * 100; const r = (rest || '').replace(/^ and /, '').trim(); if (r) { const [t, o] = r.split('-'); n += ONES.includes(t) ? ONES.indexOf(t) : TENS.indexOf(t) * 10 + (o ? ONES.indexOf(o) : 0); } return n; };
await page.locator('.gate-box input').fill('123'); await page.getByRole('button', { name: 'Open' }).click();
check(await page.locator('.gate-box .error').isVisible().catch(() => false) || !!(await page.locator('.gate-box input').count()), 'wrong gate answer keeps the gate closed');
const words2 = (await page.locator('.gate-box .lead').textContent()).split(': ')[1];
await page.locator('.gate-box input').fill(String(parse(words2))); await page.getByRole('button', { name: 'Open' }).click();
await page.waitForSelector('.dash-page');
check((await page.locator('.dash-card').count()) === 4, 'dashboard shows 3 explorers + settings');
await page.getByRole('button', { name: 'Remove explorer' }).first().click();
await page.getByRole('button', { name: 'Remove explorer' }).last().click();
await page.waitForFunction(() => document.querySelectorAll('.dash-card').length === 3);
check(true, 'parent can remove an explorer after confirming');
// 4. corrupt saved data
await go('profiles');
await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('mystery-island', 1); r.onsuccess = () => { const db = r.result; const t = db.transaction('progress', 'readwrite'); const st = t.objectStore('progress'); st.getAll().onsuccess = (e) => { for (const rec of e.target.result) st.put({ profileId: rec.profileId, levels: 'broken' }); }; t.oncomplete = res; }; }));
await page.reload(); await start(); await page.locator('.profile-card').first().click();
await page.getByRole('dialog').waitFor({ timeout: 5000 }).catch(() => {});
check(await page.getByRole('dialog', { name: /Saved game problem/ }).isVisible(), 'corrupt data is reported, not hidden');
await page.getByRole('button', { name: 'OK' }).click(); await page.waitForSelector('.gate-box');
check(errors.length === 0, 'no page errors');
await browser.close();
