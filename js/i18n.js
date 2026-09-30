// All child-facing text lives in data/text.json and data/dialogue.json so other languages can be added
// without code changes.
let dict = {};

export async function loadText(base = 'data/') {
  const [text, dialogue] = await Promise.all([
    fetch(base + 'text.json').then((r) => r.json()),
    fetch(base + 'dialogue.json').then((r) => r.json()),
  ]);
  dict = { ...text, dialogue };
}

function lookup(key) {
  return key.split('.').reduce((o, k) => (o == null ? o : o[k]), dict);
}

// t('screens.map.title', {name: 'Sam'}) -> string with {name} replaced
export function t(key, vars = {}) {
  const s = lookup(key);
  if (typeof s !== 'string') return key;
  return s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
}

// kiki('correct') -> a random line from dialogue.kiki.correct
export function kiki(key) {
  const v = lookup('dialogue.kiki.' + key);
  if (Array.isArray(v)) return v[Math.floor(Math.random() * v.length)];
  return v ?? '';
}
export function kikiLines(key) {
  const v = lookup('dialogue.kiki.' + key);
  return Array.isArray(v) ? v : [v];
}
export const tList = (key) => lookup(key) || [];
