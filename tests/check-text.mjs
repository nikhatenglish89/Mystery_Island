// Verifies every t('...') key used in js/ exists in data/text.json (and dynamic key families are complete).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const text = JSON.parse(fs.readFileSync(path.join(root, 'data/text.json'), 'utf8'));
const look = (k) => k.split('.').reduce((o, p) => (o == null ? o : o[p]), text);
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); f.isDirectory() ? walk(p) : p.endsWith('.js') && files.push(p); } })(path.join(root, 'js'));
const missing = new Set();
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\bt\(\s*'([\w.]+)'\s*[,)]/g)) if (typeof look(m[1]) !== 'string') missing.add(`${m[1]}  (${path.relative(root, f)})`);
  for (const m of src.matchAll(/'((?:screens|common|games|errors|hud)\.[\w.]*\w)'/g)) if (look(m[1]) == null) missing.add(`${m[1]}  (${path.relative(root, f)})`);
}
const config = JSON.parse(fs.readFileSync(path.join(root, 'data/config.json'), 'utf8'));
const levels = JSON.parse(fs.readFileSync(path.join(root, 'data/levels.json'), 'utf8'));
for (const b of config.ageBands) if (!look(`screens.setup.band.${b.id}`)) missing.add(`screens.setup.band.${b.id}`);
for (const w of levels.worlds) for (const l of w.levels) for (const k of ['how', 'category', 'name']) if (!look(`engines.${l.engine}.${k}`)) missing.add(`engines.${l.engine}.${k}`);
if (missing.size) { console.error('Missing text keys:\n' + [...missing].join('\n')); process.exit(1); }
console.log('text keys OK');
