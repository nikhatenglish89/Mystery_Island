# Mystery_Island
Mystery_Island is a child-friendly HTML5 adventure game in which players explore islands, solve educational mini-games, collect rewards and unlock a treasure story. The game is designed as a browser application that can be hosted through an existing WordPress website. Core gameplay must not depend on a backend, database server or paid API

## What is in the game

Built from the PRD and App Flow documents in [`docs/`](docs/):

- **5 worlds x 10 levels = 50 levels**: Pirate Beach, Mystery Jungle, Crystal Cave, Ancient Temple and Treasure Island. Levels unlock one after another; finishing a world awards a map piece (worlds 1-4) and unlocks the next; Treasure Island needs all four map pieces.
- **3 age bands** (Explorer 6-7, Adventurer 8-9, Master Explorer 10-12). Every level has its own question set for each band (about 410 challenges).
- **8 reusable mini-game engines** in `js/minigames/`: Number Challenge, Word Builder, Memory Sequence, Pattern Puzzle, Object Hunt, Maze/Path (including compass directions), Science Choice (including map reading and geography) and Spot the Difference.
- **Rewards**: 1-3 stars per level (fewer wrong tries and hints = more stars, replay to improve), coins on every level (spent in Explorer Camp), gems only for finishing a world and for achievements.
- **Explorer Camp** (34 cosmetic items), **Achievements** (31), **Kiki** the parrot companion, and a **Parent Area** behind a parent gate (per-profile progress, play time, skill stats, reset/remove explorer, erase all data, analytics switch).
- **Up to three explorer profiles per device** (nickname, age band and avatar only), saved in IndexedDB; small settings in localStorage. Refreshing mid-level restores the latest checkpoint.
- No backend, no accounts, no paid API. Nothing is sent anywhere unless the site owner turns on the optional analytics endpoint.

## Run it locally

It is a static site, so any static file server works (ES modules and `fetch` need http, not `file://`):

```
python3 -m http.server 8000
# open http://localhost:8000/
```

## Deploy under WordPress

Copy these into a folder such as `/games/mystery-island/` on the WordPress host and link to it from a page (direct navigation is preferred over an iframe):

```
index.html  manifest.webmanifest  service-worker.js  css/  js/  data/  assets/
```

`docs/`, `tools/` and `tests/` are not needed on the server. The game does not depend on any WordPress plugin or theme.

## Project layout

```
index.html
css/        base.css, map.css, game.css, responsive.css
js/         app, router, state, storage, player, rewards, audio, analytics, i18n, ui, util
js/screens/ splash, profiles (select/setup/tutorial), map (+world), level (intro/explore/play/reward/ending), camp, achievements, settings, parent
js/minigames/  the eight engines + common helpers
data/       levels, questions, rewards, achievements, dialogue, text (all UI text), config
assets/     ui/, characters/, worlds/, audio/ (see below)
tools/      generate-content.mjs, generate-static-data.mjs
tests/      validate-content.mjs, check-text.mjs, smoke.mjs
```

## Content is JSON

- `data/levels.json` and `data/questions.json` are **generated** by `node tools/generate-content.mjs` (deterministic, so output is stable). Edit the generator to change level themes, topics or difficulty, then re-run it. `data/rewards.json`, `achievements.json`, `dialogue.json` and `config.json` come from `node tools/generate-static-data.mjs`, or can be edited by hand.
- All child-facing text lives in `data/text.json` and `data/dialogue.json`, so another language (for example Hindi) can be added without code changes.

## Audio and Kiki's voice

Sound effects are synthesized in the browser, so no audio files are needed. Kiki's voice and question read-aloud currently use the browser's built-in speech synthesis as a stand-in. To use recorded English voice:

1. Put MP3 files in `assets/audio/voice/en/`. Names: `kiki_welcome.mp3`, `kiki_tutorial_1.mp3` ..., `intro_<levelId>.mp3` (for example `intro_pb-01.mp3`) and `q_<levelId>_<band>_<round>.mp3` (for example `q_pb-01_explorer_1.mp3`).
2. Set `"voiceFiles": true` under `audio` in `data/config.json`. Any missing file falls back to speech synthesis.

Audio only starts after the player's first tap (browser autoplay rules).

## Optional analytics and offline

- **Analytics** is off by default. To count anonymous, cookie-free events (level and world completion) with something like self-hosted Matomo, set `analytics.endpoint` in `data/config.json`. Events carry no names or device details, a parent can switch them off in the Parent Area, and failures are silent.
- **Offline / PWA** is optional for the MVP (planned for V1.2). `manifest.webmanifest` and `service-worker.js` are included; set `pwa.enabled` to `true` in `data/config.json` to register the service worker. The first visit always needs the network.

## Tests

```
node tests/validate-content.mjs   # structure and answerability of every challenge
node tests/check-text.mjs         # every UI text key exists
python3 -m http.server 8123 &
node tests/smoke.mjs http://localhost:8123 explorer   # plays all 50 levels in a real browser (needs Playwright)
```
