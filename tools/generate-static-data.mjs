#!/usr/bin/env node
// Writes the small hand-authored JSON files: rewards, achievements, dialogue, config.
// (Kept as a script so the item/achievement tables are easy to edit and validate.)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const w = (f, o) => fs.writeFileSync(path.join(root, 'data', f), JSON.stringify(o, null, 1) + '\n');

const outfits = [
  ['hat-top', 'Top Hat', '🎩', 'coins', 25], ['hat-sun', 'Sun Hat', '👒', 'coins', 25], ['hat-cap', 'Explorer Cap', '🧢', 'coins', 20],
  ['hat-scholar', 'Scholar Cap', '🎓', 'coins', 30], ['hat-helmet', 'Adventure Helmet', '🪖', 'coins', 35], ['acc-shades', 'Cool Shades', '🕶️', 'coins', 30],
  ['acc-goggles', 'Diver Goggles', '🥽', 'coins', 40], ['acc-bow', 'Lucky Bow', '🎀', 'coins', 20], ['acc-scarf', 'Warm Scarf', '🧣', 'coins', 25],
  ['acc-star', 'Star Badge', '⭐', 'coins', 15], ['gem-crown', 'Golden Crown', '👑', 'gems', 8], ['gem-medal', 'Hero Medal', '🏅', 'gems', 5],
  ['gem-pin', 'Gem Pin', '💎', 'gems', 6], ['gem-wand', 'Star Wand', '🪄', 'gems', 7],
].map(([id, name, emoji, currency, price]) => ({ id, name, emoji, slot: 'outfit', currency, price }));
const decor = [
  ['tent', 'Camp Tent', '🏕️', 'coins', 40], ['fire', 'Campfire', '🔥', 'coins', 30], ['palm', 'Palm Tree', '🌴', 'coins', 25], ['canoe', 'Canoe', '🛶', 'coins', 45],
  ['anchor', 'Old Anchor', '⚓', 'coins', 30], ['crab', 'Pet Crab', '🦀', 'coins', 35], ['turtle', 'Pet Turtle', '🐢', 'coins', 40], ['parrot', 'Pet Parrot', '🦜', 'coins', 50],
  ['lantern', 'Lanterns', '🏮', 'coins', 30], ['kite', 'Kite', '🪁', 'coins', 20], ['mapwall', 'Map Wall', '🗺️', 'coins', 35], ['compass', 'Compass Stand', '🧭', 'coins', 30],
  ['chair', 'Camp Chair', '🪑', 'coins', 20], ['flowers', 'Flowers', '🌺', 'coins', 15], ['shells', 'Shell Collection', '🐚', 'coins', 20], ['flag', 'Pirate Flag', '🏴‍☠️', 'coins', 40],
  ['gem-chest', 'Treasure Chest', '💰', 'gems', 6], ['gem-ball', 'Crystal Ball', '🔮', 'gems', 8], ['gem-dragon', 'Baby Dragon', '🐉', 'gems', 10], ['gem-rainbow', 'Rainbow', '🌈', 'gems', 7],
].map(([id, name, emoji, currency, price]) => ({ id, name, emoji, slot: 'decor', currency, price }));
w('rewards.json', {
  version: 1,
  avatars: ['🧑‍🚀', '🧒', '👧', '👦', '🧙', '🦸', '🧜', '🥷'].map((emoji, i) => ({ id: `av${i + 1}`, emoji })),
  coinsPerLevel: 5, coinsPerStar: 5, gemsPerWorld: 5, gemsForGame: 10, maxPlaced: 8,
  items: [...outfits, ...decor],
});

const A = (id, name, desc, emoji, gems, cond) => ({ id, name, description: desc, emoji, gems, cond });
w('achievements.json', {
  version: 1,
  achievements: [
    A('first-steps', 'First Steps', 'Finish your first level', '👣', 1, { type: 'levels_completed', value: 1 }),
    A('getting-started', 'Getting Started', 'Finish 5 levels', '🌱', 1, { type: 'levels_completed', value: 5 }),
    A('explorer', 'Explorer', 'Finish 10 levels', '🧭', 2, { type: 'levels_completed', value: 10 }),
    A('trailblazer', 'Trailblazer', 'Finish 25 levels', '🔥', 3, { type: 'levels_completed', value: 25 }),
    A('island-legend', 'Island Legend', 'Finish all 50 levels', '🏆', 5, { type: 'levels_completed', value: 50 }),
    A('star-collector', 'Star Collector', 'Collect 10 stars', '⭐', 1, { type: 'stars_total', value: 10 }),
    A('star-hoarder', 'Star Hoarder', 'Collect 50 stars', '🌟', 2, { type: 'stars_total', value: 50 }),
    A('star-master', 'Star Master', 'Collect 100 stars', '✨', 3, { type: 'stars_total', value: 100 }),
    A('perfect', 'Perfect!', 'Get 3 stars on a level', '💯', 1, { type: 'perfect_levels', value: 1 }),
    A('flawless-five', 'Flawless Five', 'Get 3 stars on 5 levels', '🎯', 2, { type: 'perfect_levels', value: 5 }),
    A('perfectionist', 'Perfectionist', 'Get 3 stars on 20 levels', '👑', 3, { type: 'perfect_levels', value: 20 }),
    A('beach-boss', 'Beach Boss', 'Finish Pirate Beach', '🏖️', 2, { type: 'world_complete', world: 'pb' }),
    A('jungle-explorer', 'Jungle Explorer', 'Finish Mystery Jungle', '🌴', 2, { type: 'world_complete', world: 'mj' }),
    A('cave-crawler', 'Cave Crawler', 'Finish Crystal Cave', '💎', 2, { type: 'world_complete', world: 'cc' }),
    A('temple-raider', 'Temple Raider', 'Finish Ancient Temple', '🛕', 2, { type: 'world_complete', world: 'at' }),
    A('treasure-finder', 'Treasure Finder', 'Finish Treasure Island', '💰', 5, { type: 'world_complete', world: 'ti' }),
    A('map-maker', 'Map Maker', 'Collect 2 map pieces', '🗺️', 1, { type: 'map_pieces', value: 2 }),
    A('whole-map', 'The Whole Map', 'Collect all 4 map pieces', '🧩', 3, { type: 'map_pieces', value: 4 }),
    A('shopper', 'Camp Shopper', 'Get your first Camp item', '🛍️', 1, { type: 'items_owned', value: 1 }),
    A('designer', 'Camp Designer', 'Own 5 Camp items', '🏕️', 2, { type: 'items_owned', value: 5 }),
    A('fashion', 'Fashion Explorer', 'Own 12 Camp items', '🎩', 3, { type: 'items_owned', value: 12 }),
    A('number-ninja', 'Number Ninja', 'Play 10 number challenges', '🔢', 1, { type: 'engine_played', engine: 'number', value: 10 }),
    A('word-wizard', 'Word Wizard', 'Play 8 word builders', '🔤', 1, { type: 'engine_played', engine: 'word-builder', value: 8 }),
    A('memory-master', 'Memory Master', 'Play 8 memory games', '🧠', 1, { type: 'engine_played', engine: 'memory-sequence', value: 8 }),
    A('pattern-pro', 'Pattern Pro', 'Play 10 pattern puzzles', '🔴', 1, { type: 'engine_played', engine: 'pattern-puzzle', value: 10 }),
    A('sharp-eyes', 'Sharp Eyes', 'Play 6 spot-the-difference games', '👀', 1, { type: 'engine_played', engine: 'spot-difference', value: 6 }),
    A('treasure-hunter', 'Treasure Hunter', 'Play 6 object hunts', '🔍', 1, { type: 'engine_played', engine: 'object-hunt', value: 6 }),
    A('path-finder', 'Path Finder', 'Play 8 maze and compass games', '🧭', 1, { type: 'engine_played', engine: 'maze-path', value: 8 }),
    A('science-whiz', 'Science Whiz', 'Play 8 science and geography games', '🔬', 1, { type: 'engine_played', engine: 'science-choice', value: 8 }),
    A('practice', 'Practice Makes Perfect', 'Replay levels 3 times', '🔁', 1, { type: 'replays', value: 3 }),
    A('rich-pirate', 'Rich Pirate', 'Earn 500 coins in total', '🪙', 2, { type: 'coins_earned', value: 500 }),
  ],
});

w('dialogue.json', {
  kiki: {
    name: 'Kiki',
    welcome: ['Squawk! I am Kiki. Welcome, explorer! Let us find the treasure together.'],
    tutorial: [
      'Tap the glowing things to discover a challenge.',
      'If an answer is wrong, do not worry. You can try again or ask me for a hint.',
      'Finish levels to earn stars and coins. Finish a whole world to win a map piece!',
    ],
    exploreTap: ['Ooh, nice! But that is not the glowing one.', 'Squawk! Keep looking for the sparkle.', 'Fun! Now find the glowing thing.'],
    correct: ['Squawk! Great job!', 'You got it! Well done, explorer!', 'Brilliant thinking!', 'Yes! Just right!'],
    retry: ['Not quite. Try again, you can do it!', 'Nearly! Have another go.', 'Good try! Let us try once more.'],
    hint: ['Here is a little hint for you!', 'Kiki has a tip!'],
    levelComplete: ['You did it! Another level finished!', 'What a great explorer you are!'],
    worldComplete: ['You finished the whole world! Here is a map piece!'],
    gameComplete: ['You found the treasure! You are the greatest explorer of Mystery Island!'],
    parentNote: ['Grown-ups only, please!'],
  },
});

w('config.json', {
  version: 1,
  gameName: 'Mystery Island',
  ageBands: [
    { id: 'explorer', name: 'Explorer', ages: '6–7' },
    { id: 'adventurer', name: 'Adventurer', ages: '8–9' },
    { id: 'master', name: 'Master Explorer', ages: '10–12' },
  ],
  maxProfiles: 3,
  nicknameMaxLength: 12,
  // Optional anonymous analytics. Leave endpoint empty to disable (default).
  // Example for a self-hosted cookieless Matomo: "https://yourdomain.com/matomo/matomo.php"
  analytics: { endpoint: '', siteId: '' },
  // Set voiceFiles true once recorded audio exists in assets/audio/voice/en/<key>.mp3.
  audio: { voiceFiles: false, voicePath: 'assets/audio/voice/en/' },
  // Offline / PWA is optional for the MVP (V1.2). Flip to true to register service-worker.js.
  pwa: { enabled: false },
});
console.log('static data written');
