// Checks the generated content: 50 levels, every level has challenges for all 3 bands, and each challenge is well-formed and answerable.
import fs from 'node:fs';
const read = (f) => JSON.parse(fs.readFileSync(new URL('../data/' + f, import.meta.url), 'utf8'));
const levels = read('levels.json'), questions = read('questions.json').levels, rewards = read('rewards.json'), ach = read('achievements.json');
const BANDS = ['explorer', 'adventurer', 'master'];
const problems = [];
const bad = (m) => problems.push(m);
const ids = levels.worlds.flatMap((w) => w.levels.map((l) => l.id));
if (levels.worlds.length !== 5) bad('need 5 worlds');
for (const w of levels.worlds) if (w.levels.length !== 10) bad(`${w.id} needs 10 levels`);
if (ids.length !== 50 || new Set(ids).size !== 50) bad('need 50 unique levels');
let total = 0;
for (const w of levels.worlds) for (const l of w.levels) {
  for (const b of BANDS) {
    const list = questions[l.id]?.[b];
    if (!list?.length) { bad(`${l.id}/${b}: no challenges`); continue; }
    list.forEach((c, i) => {
      total++; const at = `${l.id}/${b}/${i + 1}`;
      if (!c.prompt || typeof c.prompt !== 'string') bad(`${at}: prompt`);
      if (!c.hint) bad(`${at}: hint`);
      switch (l.engine) {
        case 'number': case 'pattern-puzzle': case 'science-choice':
          if (c.type === 'order') { if (!Array.isArray(c.items) || c.items.length < 3) bad(`${at}: order items`); break; }
          if (!Array.isArray(c.choices) || c.choices.length < 2 || new Set(c.choices).size !== c.choices.length) bad(`${at}: choices`);
          else if (!(c.answer >= 0 && c.answer < c.choices.length)) bad(`${at}: answer index`);
          if (c.sequence && (!c.sequence.includes('?') || c.sequence.filter((x) => x === '?').length !== 1)) bad(`${at}: sequence needs one ?`);
          break;
        case 'word-builder': {
          const pool = [...c.letters]; for (const ch of c.word) { const k = pool.indexOf(ch); if (k < 0) { bad(`${at}: word not buildable`); break; } pool.splice(k, 1); }
          break;
        }
        case 'memory-sequence': if (!c.sequence?.every((i) => i >= 0 && i < c.palette.length)) bad(`${at}: memory sequence`); break;
        case 'object-hunt': if (c.count + c.decoyCount > 30 || c.decoys.includes(c.target)) bad(`${at}: hunt`); break;
        case 'maze-path':
          if (c.mode === 'compass') { const [x, y] = c.target; if (x < 0 || y < 0 || x >= c.w || y >= c.h || (x === c.start[0] && y === c.start[1])) bad(`${at}: compass target`); }
          else if (!(c.w >= 4 && c.seed)) bad(`${at}: maze`);
          break;
        case 'spot-difference': if (c.diffs >= c.rows * c.cols || c.pool.length < 2) bad(`${at}: spot`); break;
        default: bad(`${at}: unknown engine ${l.engine}`);
      }
    });
  }
}
const engines = new Set(levels.worlds.flatMap((w) => w.levels.map((l) => l.engine)));
if (engines.size !== 8) bad(`expected 8 engines in use, found ${engines.size}`);
const items = rewards.items; if (items.length < 30) bad('need 30+ cosmetic items'); if (new Set(items.map((i) => i.id)).size !== items.length) bad('duplicate item ids');
if (ach.achievements.length < 20) bad('need 20+ achievements');
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log(`content OK: ${ids.length} levels, ${total} challenges, ${engines.size} engines, ${items.length} items, ${ach.achievements.length} achievements`);
