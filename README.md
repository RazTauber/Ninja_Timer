# Ninja Timer

Competition timer for Ninja Israel 2026 — a Hebrew RTL web app for managing obstacle course heats, live scoring, and Excel export.

## Live Sites

| Site | URL | Purpose |
|------|-----|---------|
| Regular | https://ninja-timer.pages.dev/ | Standard competition heats with wall stage |
| Finals | https://ninja-timer-finals.pages.dev/ | Finals heats — countdown timer, no wall, simplified scoring |

## Quick Start

```bash
npm install
npm run dev        # Local dev server (regular mode)
```

## Build

```bash
npm run build          # Regular site → dist/
npm run build:finals   # Finals site → dist-finals/
```

## Deploy

Both sites are hosted on Cloudflare Pages. Deploy manually after building:

```bash
# Regular site
npm run build
npx wrangler pages deploy dist --project-name ninja-timer --branch master

# Finals site
npm run build:finals
npx wrangler pages deploy dist-finals --project-name ninja-timer-finals --branch master
```

## Architecture

The app uses a single codebase with a build-time environment variable to differentiate modes:

- **`VITE_APP_MODE=finals`** — enables finals behavior
- **`src/mode.js`** — exports `APP_MODE` flags used throughout the app:
  - `showFinalsBadge` — marquee ticker in header
  - `hasWallStage` — wall obstacle at end of course
  - `useCountdownTimer` — timer counts down from a configured limit

| Feature | Regular | Finals |
|---------|---------|--------|
| Timer | Counts up | Counts down from X minutes |
| Wall obstacle | Yes (MEGA/Wall/Failed) | No |
| Scoreboard times | Obstacle start time | Obstacle pass time |
| Export columns | 2 per obstacle + wall | 1 per obstacle, no wall |
| Visual indicator | None | Scrolling "FINALS" marquee |

## Tech Stack

- Vanilla JavaScript + Vite (no framework)
- RTL Hebrew, touch-first design
- localStorage for all data persistence
- Excel export via `xlsx-js-style`
- Cloudflare Pages for hosting

## Data

All competition data is stored in the browser's localStorage (per-origin). There is no server or database. The Excel export is the permanent record of results.

## Documentation

- [SPEC.md](SPEC.md) — Full product specification
- [docs/ranking-guidelines.md](docs/ranking-guidelines.md) — Ranking rules and implementation
- [docs/wall-finish-logic-design.md](docs/wall-finish-logic-design.md) — Wall stage design
- [docs/known-issues.md](docs/known-issues.md) — Known limitations
