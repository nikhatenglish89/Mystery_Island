#!/usr/bin/env node
// Generates data/levels.json and data/questions.json (5 worlds x 10 levels x 3 age bands).
// Run: node tools/generate-content.mjs
// The output is deterministic (seeded), so regenerating produces identical JSON.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BANDS = ['explorer', 'adventurer', 'master'];

// ---------- helpers ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const pick = (r, a) => a[Math.floor(r() * a.length)];
function shuf(r, a) {
  const x = a.slice();
  for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; }
  return x;
}
function mcq(r, prompt, correct, wrongs, extra = {}) {
  const w = [...new Set(wrongs.map(String))].filter((x) => x !== String(correct));
  const choices = shuf(r, [String(correct), ...w.slice(0, 3)]);
  return { prompt, choices, answer: choices.indexOf(String(correct)), ...extra };
}
function numWrongs(r, ans, bi) {
  const spreads = [[1, 2, 3, -1, -2], [1, 2, 10, -1, -10, 5, -2], [1, 10, 100, -10, -1, 20, -20, 2]][bi];
  const set = new Set();
  let guard = 0;
  while (set.size < 3 && guard++ < 80) {
    const v = ans + pick(r, spreads);
    if (v >= 0 && v !== ans) set.add(v);
  }
  return [...set];
}
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// ---------- number challenges ----------
const NAMES = ['Kiki', 'Captain Sam', 'Mia', 'Leo', 'Zara', 'Pip', 'Ravi', 'Nina'];
const ITEMS = ['shells', 'coins', 'gems', 'apples', 'stars'];
const N = {
  count(r, bi, ctx) {
    const n = [int(r, 2, 8), int(r, 5, 15), int(r, 10, 24)][bi];
    const e = pick(r, ctx.countEmoji);
    return mcq(r, `How many ${e} can you count?`, n, numWrongs(r, n, bi), {
      visual: { emoji: e, n },
      hint: 'Count them one by one. Try tapping each one as you count!',
    });
  },
  add(r, bi) {
    let a, b;
    if (bi === 0) { a = int(r, 1, 8); b = int(r, 1, 10 - a); }
    else if (bi === 1) { a = int(r, 11, 69); b = int(r, 5, 39); }
    else { a = int(r, 120, 560); b = int(r, 60, 399); }
    return mcq(r, `${a} + ${b} = ?`, a + b, numWrongs(r, a + b, bi), {
      hint: bi === 0 ? 'Start at the bigger number and count up.' : 'Add the ones first, then the tens (and hundreds).',
    });
  },
  sub(r, bi) {
    let a, b;
    if (bi === 0) { a = int(r, 3, 10); b = int(r, 1, a - 1); }
    else if (bi === 1) { a = int(r, 20, 99); b = int(r, 5, a - 5); }
    else { a = int(r, 250, 999); b = int(r, 100, a - 30); }
    return mcq(r, `${a} − ${b} = ?`, a - b, numWrongs(r, a - b, bi), {
      hint: bi === 0 ? 'Start at the big number and count back.' : 'Take away the tens first, then the ones.',
    });
  },
  compare(r, bi) {
    if (bi === 0) {
      const a = int(r, 1, 20); let b = int(r, 1, 20); if (b === a) b = a + 1;
      return mcq(r, `Which number is bigger: ${a} or ${b}?`, Math.max(a, b), [Math.min(a, b)], { hint: 'The bigger number is further along when you count up.' });
    }
    if (bi === 1) {
      const s = new Set(); while (s.size < 3) s.add(int(r, 10, 99));
      const [a, b, c] = [...s];
      return mcq(r, `Which is the smallest: ${a}, ${b} or ${c}?`, Math.min(a, b, c), [a, b, c], { hint: 'Look at the tens digit first.' });
    }
    let a, b, c, d;
    do { a = int(r, 3, 12); b = int(r, 3, 12); c = int(r, 3, 12); d = int(r, 3, 12); } while (a * b === c * d);
    const left = `${a} × ${b}`, right = `${c} × ${d}`;
    return mcq(r, `Which is bigger: ${left} or ${right}?`, a * b > c * d ? left : right, [a * b > c * d ? right : left], { hint: 'Work out each answer first, then compare.' });
  },
  mult(r, bi) {
    if (bi === 0) {
      const a = pick(r, [2, 5, 10]); const b = int(r, 1, 10);
      return mcq(r, `${a} × ${b} = ?`, a * b, numWrongs(r, a * b, bi), { hint: `Count in ${a}s, ${b} times.` });
    }
    if (bi === 1) {
      const a = int(r, 2, 10); const b = int(r, 2, 10);
      return mcq(r, `${a} × ${b} = ?`, a * b, numWrongs(r, a * b, bi), { hint: `Think of ${b} groups of ${a}.` });
    }
    const a = int(r, 6, 15), b = int(r, 4, 12), c = int(r, 3, 30);
    return mcq(r, `(${a} × ${b}) + ${c} = ?`, a * b + c, numWrongs(r, a * b + c, bi), { hint: 'Do the brackets first, then add.' });
  },
  missing(r, bi) {
    if (bi === 0) {
      const s = int(r, 4, 10); const a = int(r, 1, s - 1);
      return mcq(r, `? + ${a} = ${s}`, s - a, numWrongs(r, s - a, bi), { hint: `What do you add to ${a} to reach ${s}?` });
    }
    if (bi === 1) {
      if (r() < 0.5) { const a = int(r, 10, 50); const s = a + int(r, 5, 40); return mcq(r, `? + ${a} = ${s}`, s - a, numWrongs(r, s - a, bi), { hint: `Take ${a} away from ${s}.` }); }
      const b = int(r, 2, 9), q = int(r, 2, 9);
      return mcq(r, `? × ${b} = ${b * q}`, q, numWrongs(r, q, bi), { hint: `Divide ${b * q} by ${b}.` });
    }
    if (r() < 0.5) { const b = int(r, 6, 12), q = int(r, 6, 15); return mcq(r, `? × ${b} = ${b * q}`, q, numWrongs(r, q, bi), { hint: `Divide ${b * q} by ${b}.` }); }
    const a = int(r, 100, 400); const s = a + int(r, 50, 400);
    return mcq(r, `${s} − ? = ${a}`, s - a, numWrongs(r, s - a, bi), { hint: `How far is it from ${a} up to ${s}?` });
  },
  word(r, bi) {
    const name = pick(r, NAMES); const item = pick(r, ITEMS);
    if (bi === 0) {
      if (r() < 0.5) { const a = int(r, 1, 6), b = int(r, 1, 10 - a); return mcq(r, `${name} has ${a} ${item}. A friend gives ${b} more. How many ${item} now?`, a + b, numWrongs(r, a + b, 0), { hint: 'Put them together: add.' }); }
      const a = int(r, 4, 10), b = int(r, 1, a - 1); return mcq(r, `${name} has ${a} ${item} and gives away ${b}. How many are left?`, a - b, numWrongs(r, a - b, 0), { hint: 'Some go away: take away.' });
    }
    if (bi === 1) {
      if (r() < 0.5) { const a = int(r, 2, 9), b = int(r, 2, 9); return mcq(r, `There are ${a} boxes with ${b} ${item} in each box. How many ${item} in all?`, a * b, numWrongs(r, a * b, 1), { hint: 'Equal groups: multiply.' }); }
      const a = int(r, 30, 90), b = int(r, 5, a - 5); return mcq(r, `${name} had ${a} coins and spent ${b}. How many coins are left?`, a - b, numWrongs(r, a - b, 1), { hint: 'Spending means take away.' });
    }
    if (r() < 0.5) { const b = int(r, 4, 12), c = int(r, 2, 6), extra = int(r, 5, 30); const a = b * c + extra; return mcq(r, `${name} has ${a} coins. A map costs ${b} coins. How many coins are left after buying ${c} maps?`, extra, numWrongs(r, extra, 2), { hint: `First find the cost of ${c} maps, then take it away.` }); }
    const a = int(r, 12, 40), b = int(r, 3, 9), c = int(r, 10, 60);
    return mcq(r, `A ship sails ${a} km each day for ${b} days, then ${c} km more. How far does it sail in total?`, a * b + c, numWrongs(r, a * b + c, 2), { hint: 'Multiply first, then add the extra distance.' });
  },
  mixed(r, bi, ctx) {
    return N[pick(r, bi === 0 ? ['add', 'sub', 'missing'] : ['add', 'sub', 'mult', 'missing', 'word'])](r, bi, ctx);
  },
};

// ---------- pattern challenges ----------
const ODD_EMOJI = [
  ['🍎', '🍌', '🍇', '🍊', '🍓'], ['🐶', '🐱', '🐰', '🐻', '🦊'], ['🚗', '🚌', '🚲', '✈️', '🚂'],
  ['🐟', '🐙', '🐬', '🦀', '🐳'], ['🍰', '🍪', '🍩', '🍦', '🍫'],
];
const ODD_PAIRS = [
  [['🐶', '🐱', '🐰', '🐻', '🦊', '🐘'], ['🐟', '🐙', '🐬', '🦀']],
  [['🍎', '🍌', '🍇', '🍊'], ['🥕', '🌽', '🥦', '🥔']],
  [['🐦', '✈️', '🦋', '🦅'], ['🚗', '🐢', '🚲', '🚂']],
  [['🔥', '☀️', '🌋', '🍲'], ['❄️', '🧊', '⛄', '🍦']],
];
const ODD_WORDS = [
  [['Rose', 'Tulip', 'Daisy', 'Lily'], 'Carrot'], [['Mars', 'Venus', 'Saturn', 'Mercury'], 'Moon'],
  [['Red', 'Blue', 'Green', 'Yellow'], 'Circle'], [['Monday', 'Friday', 'Sunday', 'Tuesday'], 'January'],
  [['Pen', 'Pencil', 'Marker', 'Crayon'], 'Spoon'], [['Whale', 'Dolphin', 'Seal', 'Otter'], 'Shark'],
  [['2', '8', '14', '20'], '15'], [['10', '25', '40', '55'], '32'],
];
const RHYMES = {
  0: [
    ['CAT', ['HAT', 'MAT', 'BAT', 'RAT'], ['DOG', 'SUN', 'CUP', 'PIG']], ['SUN', ['FUN', 'RUN', 'BUN'], ['HAT', 'BED', 'CAR']],
    ['BEE', ['TREE', 'SEE', 'KNEE'], ['DOG', 'CUP', 'PEN']], ['DOG', ['LOG', 'FROG', 'HOG'], ['CAT', 'SUN', 'BED']],
    ['BED', ['RED', 'SHED', 'FED'], ['BUS', 'PIG', 'CAT']], ['STAR', ['CAR', 'FAR', 'JAR'], ['MOON', 'SUN', 'BOX']],
    ['PIG', ['BIG', 'DIG', 'WIG'], ['CAT', 'HEN', 'CUP']],
  ],
  1: [
    ['LIGHT', ['NIGHT', 'RIGHT', 'SIGHT'], ['LIST', 'LEAF', 'LOOK']], ['PLAY', ['DAY', 'STAY', 'WAY'], ['PLUM', 'PLAN', 'PLUS']],
    ['BOAT', ['COAT', 'GOAT', 'FLOAT'], ['BEAT', 'BOOT', 'BAT']], ['RAIN', ['TRAIN', 'BRAIN', 'CHAIN'], ['RUN', 'ROAD', 'RING']],
    ['CAKE', ['LAKE', 'SNAKE', 'SHAKE'], ['CAT', 'COOK', 'KITE']], ['MOON', ['SPOON', 'SOON', 'NOON'], ['MAIN', 'MOAN', 'MEAN']],
  ],
  2: [
    ['BRIGHT', ['KNIGHT', 'DELIGHT', 'POLITE'], ['BRUSH', 'BRIDGE', 'BREATH']], ['TREASURE', ['MEASURE', 'PLEASURE', 'LEISURE'], ['TRAIN', 'TREE', 'TRUCK']],
    ['CAVE', ['WAVE', 'BRAVE', 'SAVE'], ['CALF', 'COVE', 'CAVERN']], ['RIVER', ['SHIVER', 'QUIVER', 'DELIVER'], ['RAISIN', 'MOTHER', 'CARPET']],
    ['ISLAND', ['HIGHLAND', 'DRYLAND'], ['ISLE', 'INLAND', 'IDLE']], ['THROUGH', ['BLUE', 'CREW', 'SHOE'], ['THOUGH', 'TOUGH', 'COUGH']],
  ],
};
const P = {
  shapes(r, bi, ctx) {
    const pool = ctx.patternPool;
    const s = shuf(r, pool);
    let unit;
    if (bi === 0) unit = [s[0], s[1]];
    else if (bi === 1) unit = pick(r, [[s[0], s[1], s[2]], [s[0], s[0], s[1]], [s[0], s[1], s[1]]]);
    else unit = pick(r, [[s[0], s[1], s[2], s[3]], [s[0], s[0], s[1], s[2]], [s[0], s[1], s[0], s[2]]]);
    const total = [5, 7, 9][bi];
    const seq = Array.from({ length: total }, (_, i) => unit[i % unit.length]);
    const idx = bi < 2 ? total - 1 : int(r, 5, total - 2);
    const answer = seq[idx];
    const cells = seq.slice(0, bi < 2 ? idx + 1 : total).map((v, i) => (i === idx ? '?' : v));
    const wrongs = shuf(r, pool.filter((x) => x !== answer)).slice(0, 3);
    return mcq(r, bi < 2 ? 'What comes next in the pattern?' : 'What is the missing shape?', answer, wrongs, {
      sequence: cells, hint: 'Find the part that repeats, then carry it on.',
    });
  },
  letters(r, bi) {
    if (bi === 0) {
      const [a, b] = shuf(r, LETTERS.split('')).slice(0, 2);
      return mcq(r, 'Which letter comes next?', a, [b, ...shuf(r, LETTERS.split('').filter((x) => x !== a && x !== b)).slice(0, 2)], {
        sequence: [a, b, a, b, '?'], hint: 'The two letters take turns.',
      });
    }
    if (bi === 1) {
      const step = pick(r, [2, 3]); const s = int(r, 0, 25 - 4 * step);
      const seq = [0, 1, 2, 3].map((i) => LETTERS[s + i * step]); const ans = LETTERS[s + 4 * step];
      const wr = [LETTERS[s + 4 * step - 1], LETTERS[Math.min(25, s + 4 * step + 1)], LETTERS[s + 3 * step + 1]].filter((x) => x && x !== ans);
      return mcq(r, 'Which letter comes next?', ans, wr, { sequence: [...seq, '?'], hint: `Jump ${step} letters each time.` });
    }
    const a = int(r, 0, 8), b = int(r, 0, 8);
    const seq = [0, 1, 2, 3, 4].map((i) => (i % 2 === 0 ? LETTERS[a + i / 2] : LETTERS[25 - b - (i - 1) / 2]));
    const ans = LETTERS[25 - b - 2];
    const wr = shuf(r, [LETTERS[25 - b - 1], LETTERS[25 - b - 3], LETTERS[a + 3], LETTERS[a + 2]].filter((x) => x && x !== ans));
    return mcq(r, 'Two patterns are mixed together. Which letter comes next?', ans, wr, { sequence: [...seq, '?'], hint: 'Look at every second letter. One pattern goes up, one goes down.' });
  },
  numbers(r, bi, ctx) {
    let seq, ans, hint;
    if (bi === 0) {
      const step = pick(r, [1, 2, 5, 10]); const s = step === 1 ? int(r, 1, 5) : step;
      seq = [0, 1, 2, 3].map((i) => s + i * step); ans = s + 4 * step; hint = `Each number goes up by ${step}.`;
    } else if (bi === 1) {
      const t = ctx.grow ? pick(r, ['x2', 'x2', 'add']) : pick(r, ['add', 'add', 'down', 'x2']);
      if (t === 'add') { const st = pick(r, [3, 4, 6, 7, 8, 9]); const s = int(r, 1, 20); seq = [0, 1, 2, 3].map((i) => s + i * st); ans = s + 4 * st; hint = `Each number goes up by ${st}.`; }
      else if (t === 'down') { const st = int(r, 2, 5); const s = int(r, 30, 60); seq = [0, 1, 2, 3].map((i) => s - i * st); ans = s - 4 * st; hint = `Each number goes down by ${st}.`; }
      else { const s = pick(r, [1, 2, 3]); seq = [0, 1, 2, 3].map((i) => s * 2 ** i); ans = s * 16; hint = 'Each number is double the one before.'; }
    } else {
      const t = pick(r, ['x3', 'alt', 'square', 'fib']);
      if (t === 'x3') { const s = pick(r, [1, 2]); seq = [0, 1, 2, 3].map((i) => s * 3 ** i); ans = s * 81; hint = 'Each number is three times the one before.'; }
      else if (t === 'alt') { const d1 = int(r, 2, 4), d2 = int(r, 5, 8), s = int(r, 1, 10); seq = [s, s + d1, s + d1 + d2, s + 2 * d1 + d2, s + 2 * d1 + 2 * d2]; ans = s + 3 * d1 + 2 * d2; hint = 'The jumps take turns: two different sizes.'; }
      else if (t === 'square') { const o = int(r, 1, 4); seq = [0, 1, 2, 3].map((i) => (o + i) ** 2); ans = (o + 4) ** 2; hint = 'These are square numbers: 1×1, 2×2, 3×3…'; }
      else { const [a, b] = pick(r, [[1, 1], [2, 3], [1, 3]]); seq = [a, b]; for (let i = 2; i < 5; i++) seq.push(seq[i - 1] + seq[i - 2]); ans = seq[4] + seq[3]; hint = 'Add the two numbers before to get the next one.'; }
    }
    return mcq(r, 'Which number comes next?', ans, numWrongs(r, ans, bi), { sequence: [...seq, '?'], hint });
  },
  oddone(r, bi) {
    if (bi === 0) {
      const [a, b] = shuf(r, ODD_EMOJI).slice(0, 2);
      const three = shuf(r, a).slice(0, 3); const odd = pick(r, b);
      return mcq(r, 'Which one does not belong?', odd, three, { hint: 'Three of them are the same kind of thing.' });
    }
    if (bi === 1) {
      const [ga, gb] = pick(r, ODD_PAIRS); const flip = r() < 0.5;
      const A = flip ? gb : ga, B = flip ? ga : gb;
      return mcq(r, 'Which one does not belong?', pick(r, B), shuf(r, A).slice(0, 3), { hint: 'Think about what three of them have in common.' });
    }
    const [items, odd] = pick(r, ODD_WORDS);
    return mcq(r, 'Which one does not belong?', odd, items, { hint: 'Find the group that four of them share.' });
  },
  rhyme(r, bi) {
    const [w, rh, nr] = pick(r, RHYMES[bi]);
    return mcq(r, `Which word rhymes with ${w}?`, pick(r, rh), nr, { hint: 'Say the words out loud. Which one ends with the same sound?' });
  },
  mix(r, bi, ctx) {
    return P[pick(r, ['shapes', 'numbers', 'oddone', 'letters'])](r, bi, ctx);
  },
};

// ---------- word builder ----------
const WORDS = [
  ['CAT', '🐱'], ['DOG', '🐶'], ['SUN', '☀️'], ['BEE', '🐝'], ['PIG', '🐷'], ['HEN', '🐔'], ['COW', '🐮'], ['FISH', '🐟'],
  ['BIRD', '🐦'], ['FROG', '🐸'], ['CRAB', '🦀'], ['STAR', '⭐'], ['MOON', '🌙'], ['TREE', '🌳'], ['BOAT', '⛵'], ['SHIP', '🚢'],
  ['CAKE', '🍰'], ['EGG', '🥚'], ['KEY', '🔑'], ['MAP', '🗺️'], ['HAT', '🎩'], ['BOOK', '📖'], ['DUCK', '🦆'], ['LION', '🦁'],
  ['BEAR', '🐻'], ['FOX', '🦊'], ['OWL', '🦉'], ['BUS', '🚌'], ['CORN', '🌽'], ['PEAR', '🍐'], ['RAIN', '🌧️'], ['FIRE', '🔥'],
  ['APPLE', '🍎'], ['MANGO', '🥭'], ['LEMON', '🍋'], ['GRAPE', '🍇'], ['ZEBRA', '🦓'], ['TIGER', '🐯'], ['PANDA', '🐼'],
  ['SHARK', '🦈'], ['WHALE', '🐳'], ['SNAKE', '🐍'], ['PARROT', '🦜'], ['TURTLE', '🐢'], ['MONKEY', '🐒'], ['ORANGE', '🍊'],
  ['BANANA', '🍌'], ['CARROT', '🥕'], ['ANCHOR', '⚓'], ['CASTLE', '🏰'], ['ROCKET', '🚀'], ['PLANET', '🪐'], ['FLOWER', '🌸'],
  ['TOMATO', '🍅'], ['CACTUS', '🌵'], ['BASKET', '🧺'], ['SPIDER', '🕷️'], ['DRAGON', '🐉'], ['MAGNET', '🧲'],
  ['ELEPHANT', '🐘'], ['PINEAPPLE', '🍍'], ['BUTTERFLY', '🦋'], ['CROCODILE', '🐊'], ['DOLPHIN', '🐬'], ['GIRAFFE', '🦒'],
  ['OCTOPUS', '🐙'], ['PENGUIN', '🐧'], ['SCORPION', '🦂'], ['TREASURE', '💰'], ['VOLCANO', '🌋'], ['RAINBOW', '🌈'],
  ['UMBRELLA', '☂️'], ['TELESCOPE', '🔭'], ['MOUNTAIN', '⛰️'], ['CRYSTAL', '💎'], ['LANTERN', '🏮'], ['COMPASS', '🧭'],
  ['KANGAROO', '🦘'], ['FLAMINGO', '🦩'], ['HEDGEHOG', '🦔'], ['PYRAMID', '🔺'],
];
const WORD_TOPICS = {
  animals: ['CAT', 'DOG', 'BEE', 'PIG', 'HEN', 'COW', 'FISH', 'BIRD', 'FROG', 'CRAB', 'DUCK', 'LION', 'BEAR', 'FOX', 'OWL', 'ZEBRA', 'TIGER', 'PANDA', 'SHARK', 'WHALE', 'SNAKE', 'PARROT', 'TURTLE', 'MONKEY', 'DRAGON', 'SPIDER', 'ELEPHANT', 'BUTTERFLY', 'CROCODILE', 'DOLPHIN', 'GIRAFFE', 'OCTOPUS', 'PENGUIN', 'SCORPION', 'KANGAROO', 'FLAMINGO', 'HEDGEHOG'],
  food: ['EGG', 'CAKE', 'CORN', 'PEAR', 'APPLE', 'MANGO', 'LEMON', 'GRAPE', 'ORANGE', 'BANANA', 'CARROT', 'TOMATO', 'PINEAPPLE'],
  mixed: WORDS.map((w) => w[0]),
  island: ['SUN', 'MAP', 'KEY', 'BOAT', 'SHIP', 'CRAB', 'STAR', 'ANCHOR', 'CASTLE', 'COMPASS', 'TREASURE', 'VOLCANO', 'RAINBOW', 'CRYSTAL', 'LANTERN', 'MOUNTAIN', 'PARROT', 'TURTLE'],
};
function word(r, bi, ctx, idx, used) {
  const range = [[3, 4], [5, 6], [7, 9]][bi];
  const bank = WORD_TOPICS[ctx.wordTopic].filter((w) => w.length >= range[0] && w.length <= range[1] && !used.has(w));
  const pool = bank.length ? bank : WORD_TOPICS.mixed.filter((w) => w.length >= range[0] && w.length <= range[1] && !used.has(w));
  const w = pick(r, pool); used.add(w);
  const emoji = WORDS.find((x) => x[0] === w)[1];
  const extraN = [0, 2, 3][bi];
  const extras = shuf(r, LETTERS.split('').filter((l) => !w.includes(l))).slice(0, extraN);
  return {
    prompt: bi === 2 ? `Build the word for ${emoji}. It has ${w.length} letters.` : `Build the word for ${emoji}`,
    emoji, word: w, letters: shuf(r, [...w.split(''), ...extras]),
    hint: `It starts with the letter ${w[0]}.`,
  };
}

// ---------- memory / hunt / maze / spot ----------
function memory(r, bi, ctx, idx) {
  const size = [4, 5, 6][bi];
  const len = [[2, 3, 4], [3, 4, 5], [5, 6, 7]][bi][idx] + (ctx.extraLen || 0);
  const seq = [];
  for (let i = 0; i < len; i++) {
    let v; let g = 0;
    do { v = int(r, 0, size - 1); g++; } while (g < 20 && i >= 2 && seq[i - 1] === v && seq[i - 2] === v);
    seq.push(v);
  }
  return { prompt: 'Watch the order, then repeat it!', palette: ctx.memPalette.slice(0, size), sequence: seq, hint: 'Watch closely. Say the order out loud as you go.' };
}
function hunt(r, bi, ctx, idx) {
  const t = ctx.hunt[idx % ctx.hunt.length];
  const count = [int(r, 3, 4), int(r, 5, 6), int(r, 7, 8)][bi];
  const decoyCount = [5, 9, 13][bi];
  const decoys = bi === 2 ? [...t.look, ...t.decoys] : t.decoys;
  return {
    prompt: `Find ${count} ${t.name} ${t.emoji}`, target: t.emoji, count, decoys: decoys.slice(0, bi === 2 ? 5 : 4), decoyCount,
    seed: int(r, 1, 1000000), hint: `Look for the ${t.emoji} shape. Tap only the ones that match.`,
  };
}
function maze(r, bi, ctx, idx) {
  const size = [4, 6, 8][bi] + idx;
  return { mode: 'maze', prompt: 'Guide the explorer to the goal!', w: size, h: size, seed: int(r, 1, 1000000), player: ctx.maze.player, goal: ctx.maze.goal, hint: 'The glowing cells show the way for a few steps.' };
}
const DIRS = { North: [0, -1], East: [1, 0], South: [0, 1], West: [-1, 0] };
function compass(r, bi, ctx, idx) {
  const size = [5, 6, 7][bi];
  const nSteps = [1, 2, 3][bi] + (ctx.extraSteps || 0);
  const cap = [3, 4, 5][bi];
  let pos, steps, guard = 0;
  do {
    pos = [int(r, 0, size - 1), int(r, 0, size - 1)]; steps = []; let last = null; let cur = pos.slice(); let ok = true;
    for (let s = 0; s < nSteps; s++) {
      const options = Object.keys(DIRS).filter((d) => {
        if (last && (d === last || DIRS[d][0] === -DIRS[last][0] && DIRS[d][1] === -DIRS[last][1])) return false;
        const nx = cur[0] + DIRS[d][0], ny = cur[1] + DIRS[d][1];
        return nx >= 0 && ny >= 0 && nx < size && ny < size;
      });
      if (!options.length) { ok = false; break; }
      const d = pick(r, options); let max = 0; let x = cur[0], y = cur[1];
      while (max < cap) { x += DIRS[d][0]; y += DIRS[d][1]; if (x < 0 || y < 0 || x >= size || y >= size) break; max++; }
      const n = int(r, 1, max); cur = [cur[0] + DIRS[d][0] * n, cur[1] + DIRS[d][1] * n]; steps.push({ dir: d, n }); last = d;
    }
    if (ok && (cur[0] !== pos[0] || cur[1] !== pos[1])) { var target = cur; break; }
  } while (guard++ < 100);
  const text = steps.map((s) => `${s.n} step${s.n > 1 ? 's' : ''} ${s.dir}`).join(', then ');
  const decor = shuf(r, ctx.compassDecor); const marks = []; let di = 0;
  for (let k = 0; k < 6 && di < decor.length; k++) {
    const x = int(r, 0, size - 1), y = int(r, 0, size - 1);
    if ((x === pos[0] && y === pos[1]) || (x === target[0] && y === target[1]) || marks.some((m) => m.x === x && m.y === y)) continue;
    marks.push({ x, y, emoji: decor[di++] });
  }
  return {
    mode: 'compass', prompt: `Start at ${ctx.maze.player}. Walk ${text}. Where do you end up?`, w: size, h: size, start: pos, steps, target, landmarks: marks, player: ctx.maze.player,
    hint: 'North is up, East is right, South is down and West is left.',
  };
}
function spot(r, bi, ctx, idx) {
  const cfg = [[{ rows: 3, cols: 3, d: 2 }, { rows: 3, cols: 4, d: 2 }], [{ rows: 3, cols: 4, d: 3 }, { rows: 4, cols: 4, d: 3 }], [{ rows: 4, cols: 5, d: 4 }, { rows: 5, cols: 5, d: 5 }]][bi][idx];
  return { prompt: `Find ${cfg.d} differences!`, rows: cfg.rows, cols: cfg.cols, pool: ctx.spotPool, seed: int(r, 1, 1000000), diffs: cfg.d, hint: 'Compare the two pictures one row at a time.' };
}

// ---------- science / geography ----------
const q = (t, c, w1, w2, w3) => [t, c, w1, w2, w3];
const SCI = {
  space: {
    0: [q('Which gives us light and warmth in the day?', 'The Sun', 'The Moon', 'A cloud', 'A tree'), q('What can we see in the sky at night?', 'The Moon and stars', 'A rainbow', 'A big sun', 'A rainbow and a kite'), q('Which planet do we live on?', 'Earth', 'Mars', 'Jupiter', 'Venus'), q('The Moon goes around the…', 'Earth', 'The Sun', 'Mars', 'A cloud'), q('Which of these is a star?', 'The Sun', 'Earth', 'The Moon', 'Mars'), q('How many moons does Earth have?', '1', '2', '3', '0')],
    1: [q('Which planet is closest to the Sun?', 'Mercury', 'Venus', 'Earth', 'Mars'), q('Which planet is known as the Red Planet?', 'Mars', 'Venus', 'Jupiter', 'Saturn'), q('Which is the biggest planet?', 'Jupiter', 'Saturn', 'Earth', 'Mars'), q('A group of stars that makes a picture is a…', 'Constellation', 'Comet', 'Orbit', 'Crater'), q('What makes day and night on Earth?', 'Earth spinning', 'The Moon blocking the Sun', 'Clouds covering the sky', 'The Sun turning off'), q('Which planet has famous rings?', 'Saturn', 'Mars', 'Earth', 'Mercury')],
    2: [q('About how long does Earth take to go around the Sun?', '365 days', '30 days', '24 hours', '7 days'), q('What force keeps planets in orbit around the Sun?', 'Gravity', 'Friction', 'Magnetism', 'Sound'), q('Which planet is the hottest?', 'Venus', 'Mercury', 'Mars', 'Jupiter'), q('A light-year is a measure of…', 'Distance', 'Time', 'Speed', 'Weight'), q('What is the name of our galaxy?', 'The Milky Way', 'Andromeda', 'Orion', 'Sirius'), q('Which planet spins on its side?', 'Uranus', 'Mars', 'Venus', 'Neptune')],
  },
  nature: {
    0: [q('What do plants need to grow?', 'Water and sunlight', 'Sweets and toys', 'Only darkness', 'Plastic'), q('Which animal gives us milk?', 'Cow', 'Fish', 'Snake', 'Frog'), q('Which animal has a long trunk?', 'Elephant', 'Lion', 'Rabbit', 'Duck'), q('Which of these can fly?', 'Bird', 'Cow', 'Dog', 'Turtle'), q('Where do fish live?', 'In water', 'In trees', 'In the sky', 'In the sand'), q('Which part of a plant is under the ground?', 'Roots', 'Leaves', 'Flowers', 'Petals')],
    1: [q('Animals that eat only plants are called…', 'Herbivores', 'Carnivores', 'Omnivores', 'Predators'), q('What do bees collect from flowers?', 'Nectar', 'Sand', 'Seeds', 'Stones'), q('Which gas do plants take in from the air?', 'Carbon dioxide', 'Oxygen', 'Helium', 'Smoke'), q('A baby frog is called a…', 'Tadpole', 'Cub', 'Chick', 'Kitten'), q('Which animal is a mammal?', 'Dolphin', 'Shark', 'Crab', 'Turtle'), q('A caterpillar turning into a butterfly is called…', 'Metamorphosis', 'Migration', 'Hibernation', 'Evaporation')],
    2: [q('What process do plants use to make food from sunlight?', 'Photosynthesis', 'Respiration', 'Digestion', 'Pollination'), q('Which part of a cell holds its genetic material?', 'Nucleus', 'Cytoplasm', 'Cell wall', 'Vacuole'), q('Animals that eat both plants and animals are…', 'Omnivores', 'Herbivores', 'Carnivores', 'Decomposers'), q('Which animal group do frogs belong to?', 'Amphibians', 'Reptiles', 'Mammals', 'Insects'), q('The study of living things is called…', 'Biology', 'Geology', 'Chemistry', 'Astronomy'), q('Which of these is a producer in a food chain?', 'Grass', 'Rabbit', 'Fox', 'Hawk')],
  },
  weather: {
    0: [q('What falls from clouds when it rains?', 'Water', 'Sand', 'Sugar', 'Paper'), q('Which weather is very cold and white?', 'Snow', 'Sunshine', 'Wind', 'Fog'), q('What keeps you dry in the rain?', 'An umbrella', 'Sunglasses', 'A swimsuit', 'A kite'), q('What makes a rainbow?', 'Sun and rain', 'Snow and wind', 'Moon and stars', 'Only clouds'), q('Ice is…', 'Frozen water', 'Hot sand', 'Warm milk', 'Green paint'), q('What moves the leaves on a tree?', 'Wind', 'Snow', 'Moonlight', 'Sand')],
    1: [q('What happens to water when it freezes?', 'It turns into ice', 'It turns into steam', 'It disappears', 'It turns into sand'), q('Water vapour is…', 'Water as a gas', 'Water as ice', 'Dirty water', 'Salty water'), q('Water heating up and rising into the air is called…', 'Evaporation', 'Condensation', 'Freezing', 'Melting'), q('Which tool measures temperature?', 'Thermometer', 'Ruler', 'Compass', 'Scale'), q('Which cloud is tall and dark and brings thunderstorms?', 'Cumulonimbus', 'Cirrus', 'Stratus', 'Mist'), q('What is lightning?', 'A big spark of electricity', 'Very fast wind', 'Ice falling', 'Moon glow')],
    2: [q('At what temperature does water boil at sea level?', '100°C', '50°C', '0°C', '200°C'), q('Water vapour cooling into droplets is called…', 'Condensation', 'Evaporation', 'Precipitation', 'Erosion'), q('What are the three main states of matter?', 'Solid, liquid, gas', 'Hot, cold, warm', 'Rock, sand, soil', 'Ice, snow, hail'), q('Which instrument measures air pressure?', 'Barometer', 'Thermometer', 'Anemometer', 'Hygrometer'), q('The layer of gases around Earth is called the…', 'Atmosphere', 'Crust', 'Core', 'Mantle'), q('Which state of matter has a fixed shape?', 'Solid', 'Liquid', 'Gas', 'Steam')],
  },
  body: {
    0: [q('How many eyes do you have?', '2', '1', '3', '5'), q('Which body part do we use to smell?', 'Nose', 'Ears', 'Feet', 'Knees'), q('What do we use to hear?', 'Ears', 'Eyes', 'Nose', 'Toes'), q('What helps us chew food?', 'Teeth', 'Hair', 'Toes', 'Elbows'), q('Which part pumps blood around our body?', 'Heart', 'Hand', 'Ear', 'Knee'), q('How many fingers are on one hand?', '5', '4', '6', '10')],
    1: [q('Which bones protect your brain?', 'Skull', 'Ribs', 'Spine', 'Knee'), q('Which organ helps you breathe?', 'Lungs', 'Stomach', 'Kidney', 'Skin'), q('Which sense do we use our tongue for?', 'Taste', 'Smell', 'Sight', 'Hearing'), q('What is the largest organ of the human body?', 'Skin', 'Heart', 'Brain', 'Stomach'), q('About how many bones does an adult have?', '206', '100', '50', '500'), q('Which vitamin do we get from sunshine?', 'Vitamin D', 'Vitamin A', 'Vitamin C', 'Vitamin K')],
    2: [q('Which blood cells carry oxygen?', 'Red blood cells', 'White blood cells', 'Platelets', 'Plasma'), q('What does the small intestine mainly do?', 'Absorbs nutrients', 'Pumps blood', 'Makes bones', 'Filters air'), q('Which part of the brain helps with balance?', 'Cerebellum', 'Cerebrum', 'Skull', 'Nerve'), q('How many chambers does the human heart have?', '4', '2', '3', '6'), q('Which organs filter waste from the blood?', 'Kidneys', 'Lungs', 'Heart', 'Stomach'), q('Which tube carries food to the stomach?', 'Oesophagus', 'Windpipe', 'Artery', 'Vein')],
  },
  geo: {
    0: [q('Which direction does the Sun rise?', 'East', 'West', 'North', 'South'), q('Which direction is up on most maps?', 'North', 'South', 'East', 'West'), q('What do we use to find directions?', 'A compass', 'A spoon', 'A ball', 'A hat'), q('Which is bigger?', 'An ocean', 'A pond', 'A puddle', 'A cup'), q('What colour is the sea on most maps?', 'Blue', 'Red', 'Pink', 'Black'), q('A map shows us…', 'Where places are', 'What to eat', 'How to sing', 'Who is tall')],
    1: [q('Which is the largest ocean?', 'Pacific', 'Atlantic', 'Indian', 'Arctic'), q('Which continent is Egypt in?', 'Africa', 'Asia', 'Europe', 'South America'), q('Which continent is India in?', 'Asia', 'Africa', 'Europe', 'Antarctica'), q('What is the opposite of North?', 'South', 'East', 'West', 'Up'), q('Land surrounded by water is called an…', 'Island', 'Desert', 'Valley', 'Mountain'), q('Which is the coldest place on Earth?', 'Antarctica', 'The Sahara', 'The Amazon', 'Australia')],
    2: [q('Which line divides Earth into Northern and Southern halves?', 'The Equator', 'The Prime Meridian', 'The Tropic of Cancer', 'The Date Line'), q('How many continents are there?', '7', '5', '6', '8'), q('What is the capital of India?', 'New Delhi', 'Mumbai', 'Kolkata', 'Chennai'), q('What is the capital of Japan?', 'Tokyo', 'Osaka', 'Kyoto', 'Beijing'), q('Which is the largest hot desert in the world?', 'The Sahara', 'The Gobi', 'The Thar', 'The Kalahari'), q('Which mountain is highest above sea level?', 'Mount Everest', 'K2', 'Kilimanjaro', 'Mont Blanc')],
  },
};
const ORD = {
  space: [
    ['Put the day in order', ['🌅 Sunrise', '☀️ Noon', '🌇 Sunset', '🌙 Night']],
    ['Put these planets in order from the Sun', ['Mercury', 'Venus', 'Earth', 'Mars']],
    ['Put the planets in order from the Sun', ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']],
  ],
  nature: [
    ['Put the plant growing in order', ['🌰 Seed', '🌱 Sprout', '🌿 Plant', '🌸 Flower']],
    ['Put the butterfly life cycle in order', ['Egg', 'Caterpillar', 'Chrysalis', 'Butterfly']],
    ['Put this food chain in order, starting with the plant', ['Grass', 'Grasshopper', 'Frog', 'Snake', 'Hawk']],
  ],
  weather: [
    ['Put this rainy day in order', ['🌤️ Sunny', '☁️ Cloudy', '🌧️ Rain', '🌈 Rainbow']],
    ['Put the water cycle in order', ['Evaporation', 'Condensation', 'Precipitation', 'Collection']],
    ['Put the layers of the atmosphere in order from the ground up', ['Troposphere', 'Stratosphere', 'Mesosphere', 'Thermosphere']],
  ],
  body: [
    ['Put growing up in order', ['👶 Baby', '🧒 Child', '🧑 Teenager', '🧓 Adult']],
    ['Put the frog life cycle in order', ['Egg', 'Tadpole', 'Froglet', 'Frog']],
    ['Put the journey of food in order', ['Mouth', 'Oesophagus', 'Stomach', 'Small intestine', 'Large intestine']],
  ],
};
const DIR8 = [['North', 0, -1], ['North-East', 1, -1], ['East', 1, 0], ['South-East', 1, 1], ['South', 0, 1], ['South-West', -1, 1], ['West', -1, 0], ['North-West', -1, -1]];
const MAP_ICONS = ['🏝️', '🌴', '⚓', '🏰', '🌋', '🛖', '⛰️', '🦜', '⛵', '🗿'];
function maplook(r, bi) {
  const size = [3, 4, 5][bi];
  const dirs = bi === 2 ? DIR8 : DIR8.filter((d) => d[1] === 0 || d[2] === 0);
  let out;
  for (let g = 0; g < 200 && !out; g++) {
    const [name, dx, dy] = pick(r, dirs);
    const dist = int(r, 1, bi === 0 ? 2 : 3);
    const ax = int(r, 0, size - 1), ay = int(r, 0, size - 1);
    const bx = ax + dx * dist, by = ay + dy * dist;
    if (bx < 0 || by < 0 || bx >= size || by >= size) continue;
    const [ea, eb] = shuf(r, MAP_ICONS);
    const flip = bi > 0 && r() < 0.5;
    out = flip
      ? { A: eb, B: ea, from: { x: bx, y: by }, to: { x: ax, y: ay }, name: DIR8.find((d) => d[1] === -dx && d[2] === -dy)[0] }
      : { A: ea, B: eb, from: { x: ax, y: ay }, to: { x: bx, y: by }, name };
  }
  const wrongs = shuf(r, dirs.map((d) => d[0]).filter((n) => n !== out.name)).slice(0, 3);
  return mcq(r, `Which direction is ${out.B} from ${out.A}?`, out.name, wrongs, {
    map: { w: size, h: size, cells: [{ ...out.from, emoji: out.A }, { ...out.to, emoji: out.B }] },
    hint: 'North is up, East is right, South is down and West is left. Start at the first picture.',
  });
}
function scienceChoice(r, bi, topic, used) {
  const bank = SCI[topic][bi];
  let item, g = 0;
  do { item = pick(r, bank); g++; } while (used.has(item[0]) && g < 30);
  used.add(item[0]);
  return mcq(r, item[0], item[1], item.slice(2), { hint: 'Think about what you have learned. You can also rule out answers that seem silly.' });
}
function scienceOrder(r, bi, topic) {
  const [prompt, items] = ORD[topic][bi];
  return { type: 'order', prompt: `${prompt}. Tap them one by one.`, items, hint: 'Tap the one that comes first.' };
}
function science(r, bi, ctx, idx, used) {
  const s = ctx.sci;
  const four = ['space', 'nature', 'weather', 'body'];
  if (four.includes(s)) return idx < 2 ? scienceChoice(r, bi, s, used) : scienceOrder(r, bi, s);
  if (s === 'mixed') return idx < 2 ? scienceChoice(r, bi, pick(r, four), used) : scienceOrder(r, bi, pick(r, four));
  if (s === 'geo') return scienceChoice(r, bi, 'geo', used);
  if (s === 'maplook') return maplook(r, bi);
  if (s === 'geomix') return idx === 1 ? maplook(r, bi) : scienceChoice(r, bi, 'geo', used);
  throw new Error('unknown science topic ' + s);
}

// ---------- world data ----------
const WORLDS = [
  {
    id: 'pb', name: 'Pirate Beach', emoji: '🏖️', theme: 'Shipwreck / beach', learning: 'Counting, basic maths and observation',
    description: 'A sunny beach with a wrecked pirate ship. Count, add and spot clues!', color: '#f2c14e', mapPiece: 'Map piece 1',
    ctx: { countEmoji: ['🪙', '🐚', '⭐', '🐠'], patternPool: ['🔴', '🔵', '🟡', '🟢', '🟣', '🟠'], memPalette: ['🐚', '🦀', '⭐', '🐠', '🌴', '⛵'], hunt: [{ emoji: '🐚', name: 'shells', decoys: ['🦀', '⭐', '🌴', '🐠', '🍀'], look: ['🌀', '🍥', '🥥'] }, { emoji: '🦀', name: 'crabs', decoys: ['🐚', '🐠', '⭐', '🐙', '🌴'], look: ['🦞', '🦐', '🐜'] }], maze: { player: '🦜', goal: '🗝️' }, spotPool: ['🐚', '🦀', '⛵', '🌴', '🐠', '⭐'], compassDecor: ['🌴', '🐚', '⛵', '🦀'] },
    levels: [
      ['Shell Seeker', 'object-hunt', 'hunt', '🐚', 'Kiki spotted shiny shells on the sand. Can you find them all?'],
      ['Coin Counting', 'number', 'count', '🪙', 'Pirates dropped coins on the beach. Let us count them!'],
      ['Sandcastle Sums', 'number', 'add', '🏰', 'The tide is coming. Add up the sandcastle bricks!'],
      ['Treasure Takeaway', 'number', 'sub', '🧺', 'Some treasure washed away. How much is left?'],
      ['Spot the Sailor', 'spot-difference', 'spot', '⛵', 'Two ship pictures look the same, but they are not. Find the differences!'],
      ['Shipwreck Patterns', 'pattern-puzzle', 'shapes', '🚢', 'The old ship has a pattern lock. Finish the pattern to open it.'],
      ['Bigger or Smaller', 'number', 'compare', '⚖️', 'Weigh the treasure piles. Which one is bigger?'],
      ['Parrot Path', 'maze-path', 'maze', '🦜', 'Help the parrot find the golden key on the beach maze!'],
      ['Crab Conga', 'memory-sequence', 'memory', '🦀', 'The crabs are dancing. Copy their moves in the same order!'],
      ['Captain\'s Chest', 'number', 'mixed', '🧰', 'The captain\'s chest has a number lock. Solve the sums to open it!'],
    ],
  },
  {
    id: 'mj', name: 'Mystery Jungle', emoji: '🌴', theme: 'Jungle / river', learning: 'Words, spelling, patterns and logic',
    description: 'A misty jungle full of riddles, rivers and hidden things.', color: '#3fa34d', mapPiece: 'Map piece 2',
    ctx: { countEmoji: ['🍌', '🦋', '🐸'], patternPool: ['🍃', '🌺', '🦋', '🍌', '🐸', '🌴'], memPalette: ['🍃', '🌺', '🦋', '🍌', '🐸', '🐒'], hunt: [{ emoji: '🍎', name: 'apples', decoys: ['🍌', '🍇', '🍊', '🍓'], look: ['🍅', '🍒', '🌶️'] }, { emoji: '🍌', name: 'bananas', decoys: ['🍎', '🍇', '🍊', '🍐'], look: ['🌙', '🥒', '🌽'] }], maze: { player: '🐒', goal: '🍌' }, spotPool: ['🦋', '🐛', '🐸', '🌺', '🍄', '🦜'], compassDecor: ['🌴', '🦋', '🐸', '🍄'], wordTopic: 'animals' },
    levels: [
      ['Animal Words', 'word-builder', 'word:animals', '🐒', 'Jungle animals hid behind letters. Build their names!'],
      ['Vine Patterns', 'pattern-puzzle', 'shapes', '🌿', 'The vines grow in patterns. Finish each one to swing across!'],
      ['Hidden Fruits', 'object-hunt', 'hunt', '🍎', 'Kiki is hungry! Find the hidden fruits in the leaves.'],
      ['Spelling River', 'word-builder', 'word:food', '🌊', 'Stepping stones with letters cross the river. Spell the food words!'],
      ['Odd One Out', 'pattern-puzzle', 'oddone', '🧐', 'One of these things does not belong. Can you spot it?'],
      ['Trail Maze', 'maze-path', 'maze', '🐒', 'The jungle trail twists and turns. Help the monkey reach the banana!'],
      ['Rhyme Time', 'pattern-puzzle', 'rhyme', '🎵', 'The parrots sing in rhymes. Find the word that rhymes!'],
      ['Bug Difference', 'spot-difference', 'spot', '🐛', 'Two jungle pictures hide tiny differences. Find them all!'],
      ['Letter Patterns', 'pattern-puzzle', 'letters', '🔤', 'Ancient stones show letter patterns. Which letter comes next?'],
      ['Jungle Chief', 'word-builder', 'word:mixed', '🪶', 'The Jungle Chief asks you to spell the last secret words.'],
    ],
  },
  {
    id: 'cc', name: 'Crystal Cave', emoji: '💎', theme: 'Cave / crystals', learning: 'Memory and sequences',
    description: 'Glowing crystals hum in the dark. Remember the order to light the way!', color: '#8e6bd8', mapPiece: 'Map piece 3',
    ctx: { countEmoji: ['💎', '🔮'], patternPool: ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠'], memPalette: ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠'], hunt: [{ emoji: '💎', name: 'gems', decoys: ['🪙', '⭐', '🔮', '🍀'], look: ['🔷', '💠', '🧊'] }, { emoji: '⭐', name: 'stars', decoys: ['💎', '🔮', '🍀', '🪙'], look: ['🌟', '✨', '🟡'] }], maze: { player: '🦇', goal: '💎' }, spotPool: ['💎', '🔮', '🦇', '🍄', '🔦', '🪨'], compassDecor: ['💎', '🦇', '🍄', '🔦'] },
    levels: [
      ['Crystal Echo', 'memory-sequence', 'memory', '🔔', 'The crystals ring in order. Listen, watch and repeat!'],
      ['Glow Sequence', 'pattern-puzzle', 'numbers', '✨', 'Numbers glow on the cave wall. Which number comes next?'],
      ['Gem Hunt', 'object-hunt', 'hunt', '💎', 'Real gems hide among the sparkles. Can you find them?'],
      ['Missing Number', 'number', 'missing', '🔢', 'A number fell off the cave door. Find the missing one!'],
      ['Long Echo', 'memory-sequence', 'memory+2', '🎶', 'The echo is longer this time. Stay focused!'],
      ['Cave Tunnel', 'maze-path', 'maze', '🦇', 'Follow the twisty tunnels to the crystal at the end.'],
      ['Crystal Differences', 'spot-difference', 'spot', '🔮', 'Two crystal caves look alike. Find what changed!'],
      ['Pattern Lock', 'pattern-puzzle', 'grow', '🔒', 'A growing pattern locks the door. Find the rule!'],
      ['Bat Signals', 'memory-sequence', 'memory+1', '🦇', 'The bats flash signals in the dark. Copy them!'],
      ['Crystal Heart', 'pattern-puzzle', 'mix', '💜', 'The Crystal Heart mixes up every kind of pattern. You can do it!'],
    ],
  },
  {
    id: 'at', name: 'Ancient Temple', emoji: '🛕', theme: 'Ancient mechanisms', learning: 'Science, maths and logic',
    description: 'Old machines and symbols guard the temple. Use science and logic!', color: '#d9822b', mapPiece: 'Map piece 4',
    ctx: { countEmoji: ['🏺', '🔥'], patternPool: ['🔺', '🟦', '⭕', '⭐', '🌀', '🔶'], memPalette: ['🔺', '🟦', '⭕', '⭐', '🌀', '🔶'], hunt: [{ emoji: '🏺', name: 'jars', decoys: ['🪔', '🗿', '🔥'], look: ['🍯', '⚱️'] }], maze: { player: '🦎', goal: '🔑' }, spotPool: ['🗿', '🏺', '🐍', '🔥', '🪔', '🦂'], compassDecor: ['🗿', '🏺', '🐍', '🔥'] },
    levels: [
      ['Solar Symbols', 'science-choice', 'sci:space', '☀️', 'The temple ceiling shows the sky. Answer the star riddles!'],
      ['Temple Multiplication', 'number', 'mult', '✖️', 'Stone wheels turn when you solve the times tables.'],
      ['Stone Sequences', 'pattern-puzzle', 'numbers', '🪨', 'Carved numbers form a secret sequence. Which number is next?'],
      ['Nature\'s Secrets', 'science-choice', 'sci:nature', '🌿', 'Temple gardens hold secrets about plants and animals.'],
      ['Mechanism Maze', 'maze-path', 'maze', '⚙️', 'Slide through the old mechanism to reach the golden key.'],
      ['Water and Weather', 'science-choice', 'sci:weather', '💧', 'The water channel needs you to know how weather works.'],
      ['Rune Differences', 'spot-difference', 'spot', '🗿', 'Two rune walls look alike. Find what changed!'],
      ['Riddle of Numbers', 'number', 'word', '📜', 'The stone tablet asks number riddles. Read carefully!'],
      ['Body and Senses', 'science-choice', 'sci:body', '🧠', 'A statue asks how your body and senses work.'],
      ['Temple Guardian', 'science-choice', 'sci:mixed', '🛡️', 'The Temple Guardian asks a bit of everything. Show what you know!'],
    ],
  },
  {
    id: 'ti', name: 'Treasure Island', emoji: '🏝️', theme: 'Final adventure', learning: 'Mixed skills and geography',
    description: 'The final island. Read the map, follow the compass and open the treasure lock!', color: '#2b8fd9', mapPiece: '',
    ctx: { countEmoji: ['💰', '🪙'], patternPool: ['🔴', '🔵', '🟡', '🟢', '🟣', '🟠'], memPalette: ['🔑', '🔒', '💰', '🧭', '🗺️', '⚓'], hunt: [{ emoji: '💰', name: 'treasure bags', decoys: ['📦', '🎁', '🧰', '🪙'], look: ['👛', '🎒', '🛍️'] }, { emoji: '🧭', name: 'compasses', decoys: ['⏰', '🗺️', '🔭', '🪙'], look: ['🕰️', '🧿', '⌚'] }], maze: { player: '🏴‍☠️', goal: '💰' }, spotPool: ['💰', '🗺️', '🧭', '⚓', '🏴‍☠️', '🦜'], compassDecor: ['🌴', '⚓', '🗻', '🦜', '🐚'], wordTopic: 'island' },
    levels: [
      ['Compass Rose', 'maze-path', 'compass', '🧭', 'Learn the compass! North is up. Follow the directions to the spot.'],
      ['Map Reading', 'science-choice', 'sci:maplook', '🗺️', 'Look at the island map and say which way things are.'],
      ['Lost Coins', 'number', 'mixed', '🪙', 'Coins were lost all over the island. Solve the sums to get them back!'],
      ['Island Words', 'word-builder', 'word:island', '🔤', 'Build the words that describe the island.'],
      ['Continents and Oceans', 'science-choice', 'sci:geo', '🌍', 'Kiki wants to know about our whole world. Answer her geography quiz!'],
      ['Follow the Compass', 'maze-path', 'compass+1', '🧭', 'A longer trail of compass directions leads to buried treasure.'],
      ['Memory Locks', 'memory-sequence', 'memory+1', '🔐', 'The treasure gate remembers a secret order. Repeat it!'],
      ['Treasure Trail', 'object-hunt', 'hunt', '💰', 'Treasure is hidden among lookalikes. Find the real thing!'],
      ['Secret Map', 'science-choice', 'sci:geomix', '📍', 'The secret map mixes geography and directions. Read it carefully!'],
      ['The Treasure Lock', 'maze-path', 'compass+2', '🏆', 'The final lock needs a long compass path. Follow it to the treasure!'],
    ],
  },
];

const ROUNDS = { number: 3, 'word-builder': 3, 'memory-sequence': 3, 'pattern-puzzle': 3, 'science-choice': 3, 'object-hunt': 2, 'maze-path': 2, 'spot-difference': 2 };
const ROUND_OVERRIDES = { 'ti-10': 3, 'ti-06': 3 };

function buildChallenge(engine, topicFull, worldCtx, bi, r, idx, state) {
  const [topic, mod] = topicFull.split(/[:+]/).length > 1 ? [topicFull.split(/[:+]/)[0], topicFull.split(/[:+]/)[1]] : [topicFull, ''];
  const ctx = { ...worldCtx };
  if (engine === 'number') return N[topic](r, bi, ctx);
  if (engine === 'pattern-puzzle') { ctx.grow = topic === 'grow'; return P[topic === 'grow' ? 'numbers' : topic](r, bi, ctx); }
  if (engine === 'word-builder') { ctx.wordTopic = mod || ctx.wordTopic || 'mixed'; return word(r, bi, ctx, idx, state.usedWords); }
  if (engine === 'memory-sequence') { ctx.extraLen = topicFull.includes('+') ? Number(mod) : 0; return memory(r, bi, ctx, idx); }
  if (engine === 'object-hunt') return hunt(r, bi, ctx, idx);
  if (engine === 'maze-path') {
    if (topic === 'compass') { ctx.extraSteps = topicFull.includes('+') ? Number(mod) : 0; return compass(r, bi, ctx, idx); }
    return maze(r, bi, ctx, idx);
  }
  if (engine === 'spot-difference') return spot(r, bi, ctx, idx);
  if (engine === 'science-choice') { ctx.sci = mod; return science(r, bi, ctx, idx, state.usedQ); }
  throw new Error('unknown engine ' + engine);
}

const levelsOut = { version: 1, bands: BANDS, worlds: [] };
const questionsOut = { version: 1, levels: {} };
for (const w of WORLDS) {
  const world = { id: w.id, name: w.name, emoji: w.emoji, theme: w.theme, learning: w.learning, description: w.description, color: w.color, mapPiece: w.mapPiece, levels: [] };
  w.levels.forEach((L, i) => {
    const id = `${w.id}-${String(i + 1).padStart(2, '0')}`;
    const [title, engine, topicFull, clue, intro] = L;
    world.levels.push({ id, index: i + 1, title, engine, clue, intro });
    const rounds = ROUND_OVERRIDES[id] || ROUNDS[engine];
    questionsOut.levels[id] = {};
    BANDS.forEach((band, bi) => {
      const r = mulberry32(hash(`${id}:${band}`));
      const state = { usedWords: new Set(), usedQ: new Set() };
      const list = []; const seen = new Set();
      for (let idx = 0; idx < rounds; idx++) {
        let c, tries = 0;
        do { c = buildChallenge(engine, topicFull, w.ctx, bi, r, idx, state); tries++; } while (seen.has(JSON.stringify([c.prompt, c.sequence, c.word, c.seed])) && tries < 40 && !['memory-sequence', 'object-hunt', 'maze-path', 'spot-difference'].includes(engine));
        seen.add(JSON.stringify([c.prompt, c.sequence, c.word, c.seed]));
        list.push(c);
      }
      questionsOut.levels[id][band] = list;
    });
  });
  levelsOut.worlds.push(world);
}
fs.writeFileSync(path.join(root, 'data/levels.json'), JSON.stringify(levelsOut, null, 1) + '\n');
fs.writeFileSync(path.join(root, 'data/questions.json'), JSON.stringify(questionsOut) + '\n');
const total = Object.values(questionsOut.levels).reduce((n, b) => n + BANDS.reduce((m, k) => m + b[k].length, 0), 0);
console.log(`Wrote ${levelsOut.worlds.reduce((n, w) => n + w.levels.length, 0)} levels and ${total} challenges.`);
