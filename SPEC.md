# Ninja Timer — App Specification

A competition timer for **Ninja Israel** (נינג'ה ישראל) — a Ninja Warrior-style obstacle course reality show. Designed for on-set production crew to time contestants as they run through obstacles, log results, and export data.

**Language:** Hebrew (RTL)  
**Production URL:** https://ninja-timer.pages.dev/  
**Version:** 1.1.0

---

## App Flow

The app has three sequential stages:

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│  Stage 1: Setup     │ ──> │  Stage 2: Timer      │ ──> │ Stage 3: Export     │
│                     │     │                      │     │                     │
│ Pick obstacles      │     │ Time each player     │     │ Download Excel      │
│ Set competition     │     │ Log obstacle         │     │ with all runs       │
│   date & heat #     │     │   pass / fall        │     │                     │
│ Register players    │     │ Wall stage outcome   │     │                     │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
```

---

## Stage 1: Setup (בניית המסלול)

### Obstacle Pool

There are **56 real obstacles** from Ninja Israel defined in the system. Each obstacle has a Hebrew name and an English translation. Examples:

| Hebrew | English |
|--------|---------|
| הגלשנים | Slide Surfer |
| המטריות | Ring Around The Rosie |
| לצאת מהמסגרת | Close The Gap |
| שובר הלסתות | Jaw Breaker |
| הקימורים המסוכנים | Dangerous Curves |
| ... (56 total) | ... |

The full list is defined in `src/data.js` as `ALL_OBSTACLES`.

### User Actions

1. **Set competition date** — date picker, defaults to today.
2. **Set heat number** (מקצה) — auto-increments per date, can be overridden.
3. **Register players** — enter contestant names into an ordered list; duplicates are rejected.
4. **Select obstacles** — pick 3–10 obstacles from the pool and arrange them in run order (move up/down or remove). A search filter helps find obstacles in the pool.
5. **Add custom obstacles** — free-text entry for obstacles not in the predefined pool.
6. **Confirm** — press "התחל מקצה" (Start Heat) to proceed to Stage 2.

### Behavior

- Obstacle configuration and player list persist in `localStorage` for the current session.
- A "המשך תחרות" (Continue Heat) button allows resuming a previous heat if data exists.
- Heat numbering is tracked per date in a heat cache.

---

## Stage 2: Timer and Recording (טיימר)

### Layout

The timer screen has a header bar (date, heat info, stats, export button, new competition button), a runner section, and a live scoreboard below.

### Starting a Run

1. User selects a contestant from the registered player list (chip buttons) or types a new name.
2. Presses **"התחלת ריצה"** (Start Run).
3. The timer does NOT start yet — it waits for the first obstacle's "זינוק" (start) click.

### Obstacle Flow (Per Obstacle)

Each obstacle goes through this sequence:

```
[זינוק] → Timer starts (first obstacle only) → [עבר (Pass)] or [נפילה (Fall)]
```

1. **זינוק (Start Obstacle)** — operator clicks when the athlete begins the obstacle. On the first obstacle, this starts the global run timer.
2. **עבר (Pass)** — marks obstacle as completed, records split time, advances to next obstacle.
3. **נפילה (Fall)** — hold-to-confirm (1.2s), marks run as DNF, ends the run.

### Hold-to-Confirm

All "Fall" buttons require holding for 1.2 seconds to prevent accidental taps. The recorded timestamp is captured at **press start** (when the operator first touches), not at hold completion — this gives accurate competition times. Pass buttons (including the last obstacle) use a simple click.

### Timer Screen Layout

```
┌──────────────────────────────────────────────────┐
│  ⏱ בריצה                           00:45:12      │
│  [Contestant Name]                               │
│                                                  │
│  ── Progress Bar ──  3/6 מכשולים  50%            │
│                                                  │
│  ┌── Obstacle List ──────────────────────────┐   │
│  │ ✓ 1. הגלשנים         ז׳ 00:00:00  00:12:34│   │
│  │ ✓ 2. המטריות         ז׳ 00:12:50  00:25:67│   │
│  │ ► 3. שובר הלסתות     [🏁 זינוק]           │   │
│  │ 🔒 4. הקימורים                             │   │
│  │ 🔒 5. הפעמונים                             │   │
│  │ 🔒 6. הבניין                               │   │
│  │ 🧱 הקיר  🔒 נעול — סיימו את כל המכשולים    │   │
│  └────────────────────────────────────────────┘   │
│                                                  │
│  [→ ביטול ריצה]  [↩ ביטול הקלקה אחרונה]          │
└──────────────────────────────────────────────────┘
```

### Wall Stage (הקיר)

After all obstacles are passed:

1. The wall **unlocks** — a `WALL_UNLOCKED` event is recorded.
2. The timer **continues running** through the wall stage.
3. Three outcome buttons appear: **🔥 MEGA Wall**, **✓ Wall**, **✕ Failed**.
4. The operator watches the competitor's 3 wall attempts, then records the final outcome.
5. The elapsed time at button press is the total run time.

| Outcome | Meaning | Run Status |
|---------|---------|------------|
| **MEGA Wall** | Conquered the mega wall | Finished (best) |
| **Wall** | Conquered the regular wall | Finished |
| **Failed** | Failed all 3 wall attempts | DNF (`wallFailed: true`) — completed course but failed wall |

### Undo System

- **"ביטול הקלקה אחרונה"** — undoes the last action (pass, fall, start, or wall unlock).
- Undoing a fall restarts the timer.
- Undoing the wall unlock re-locks the wall and resumes normal run state.
- Undoing the first obstacle start stops the timer entirely.

### Event Types

| Type | Description |
|------|-------------|
| `STARTED` | Run created (time: 0) |
| `OBSTACLE_START` | Operator clicked "זינוק" for an obstacle |
| `PASSED` | Obstacle completed successfully |
| `FALL` | Contestant fell on an obstacle (includes `obstacleStartTime`) |
| `WALL_UNLOCKED` | All obstacles cleared, wall opened |
| `WALL_RESULT` | Wall outcome recorded (includes `wallResult` field) |
| `COMPLETED` | Run finished |

### Data Saved Per Run

```javascript
{
  contestantName: "יוסי כהן",
  startTime: "2026-07-08T10:30:00.000Z",
  events: [
    { time: 0,      type: "STARTED",        obstacle: null },
    { time: 0,      type: "OBSTACLE_START", obstacle: "הגלשנים" },
    { time: 12340,  type: "PASSED",         obstacle: "הגלשנים", obstacleStartTime: 0 },
    { time: 12340,  type: "OBSTACLE_START", obstacle: "המטריות" },
    { time: 24560,  type: "PASSED",         obstacle: "המטריות", obstacleStartTime: 12340 },
    // ...
    { time: 38900,  type: "WALL_UNLOCKED",  obstacle: null },
    { time: 52100,  type: "WALL_RESULT",    obstacle: null, wallResult: "MEGA_WALL" },
    { time: 52100,  type: "COMPLETED",      obstacle: null }
  ],
  totalTime: 52100,
  dnf: false,
  wallResult: "MEGA_WALL",
  wallAttempts: 3,
  megaWall: true,          // backward compat
  heatNumber: 1,
  startOrder: 3
}
```

### Live Scoreboard

Displayed below the runner section with real-time updates after each run:

```
דירוג | סדר | מתחרה | [obstacle splits...] | קיר | סה"כ
```

- Finishers ranked above fallers.
- Among finishers: sorted by total time (ascending).
- Among fallers: sorted by obstacles completed (descending), then by start time of fall obstacle (ascending).
- Top 3 get medal icons (🥇🥈🥉).

---

## Stage 3: Export (ייצוא)

### Trigger

- Export button is always available in the Stage 2 header bar.
- A dedicated export stage is also accessible via navigation.
- Does not require all contestants to finish.

### Excel Output

The exported file is a proper **`.xlsx` workbook** generated by the SheetJS library (`xlsx` npm package) with:

- RTL workbook view for Hebrew
- Merged headline row with competition title
- Column widths auto-set for readability

### Export Columns

```
תאריך | מקצה | דירוג | סדר | מתחרה | [per obstacle: זינוק, תוצאה] | זמן סה"כ | סיים? | תוצאת קיר
```

For each obstacle, two columns are generated:
- **זינוק** (start time) — when the operator started the obstacle
- **תוצאה** (result) — pass time, or **obstacle start time** with "(נפילה)" label for falls. This is intentional: the displayed time represents how far into the run the athlete reached that obstacle (their split at obstacle start), not when the fall was confirmed by the operator.

### Export Method

- In-browser `.xlsx` generation using SheetJS (`xlsx` npm package) with `XLSX.write` producing a binary array.
- File named with Hebrew convention: `תוצאות-נינגה-YYYY-MM-DD-מקצה-N.xlsx` (date is the competition date, not export date).
- Downloaded via Blob URL — no server required.

---

## Ranking System

### Tier 1: Finishers (completed all obstacles + wall result)

Ranked by **total time** (ascending) — lower time = higher rank.

### Tier 2: Fallers (fell during the run or failed wall)

1. Sorted by **obstacles completed** (descending) — more completed = higher rank.
2. Tiebreaker: sorted by **start time of the obstacle they fell on** (ascending) — the athlete who reached the obstacle earlier in the run is ranked higher, because it means they were faster up to that point.

### Wall-Failed Competitors

Competitors who cleared all obstacles but failed the wall are in Tier 2 with `wallFailed: true`. They completed N obstacles (all of them), so they always rank above regular fallers (who completed at most N-1).

---

## Design and Theme

### Visual Identity — Ninja Israel 2026

| Element | Color | Token |
|---------|-------|-------|
| Page background | Dark night | `--night` (#060810) |
| Card surfaces | Navy | `--navy` (#0A1430) |
| Input backgrounds | Deep navy | `--navy-deep` (#070D22) |
| Primary brand (shield blue) | Blue | `--blue` (#1E52E0) |
| Competition red (falls, danger) | Red | `--red` (#CC1A22) |
| Champion gold (finish, success) | Gold | `--gold` (#E8B500) |
| Display text | Chrome silver | `--chrome` (#C8D4F0) |
| Body text | Off-white | `--offwhite` (#D8E4F8) |
| Muted text | Gray | `--gray` (#5870A0) |

### Typography

| Context | Font | Weight |
|---------|------|--------|
| Page titles, buttons | Barlow Condensed | 800–900, UPPERCASE |
| Body text, labels (Hebrew) | Heebo | 400–700 |
| Timer digits | Courier New | 700, tabular-nums |

### Layout Principles

- **RTL Hebrew** throughout (`direction: rtl` on html/body).
- **Touch-first**: large buttons (min 44×44px touch targets), generous spacing.
- **Tablet/phone friendly**: responsive design for on-set devices.
- **Non-technical**: no menus, no settings. A production assistant can use it immediately.
- **High contrast**: readable under bright stage lighting.
- **No login, no accounts, no setup wizards.**
- **Gold = success** (not green). Green is never used as a success color.

---

## Technical Stack

| Technology | Purpose |
|------------|---------|
| HTML5 | Structure |
| CSS3 | Styling, animations, responsive layout, CSS custom properties |
| Vanilla JavaScript (ES modules) | Logic, timer, Excel generation |
| Vite | Dev server, bundling, hot reload |
| localStorage | Session persistence (obstacles, runs, heat data) |
| sessionStorage | Active session tracking |
| Blob API | In-browser file download |
| SheetJS (`xlsx`) | Proper `.xlsx` workbook generation |

### Dependencies: Vite (bundler) + `xlsx` (SheetJS, for Excel export). No frameworks. Intentionally simple.

---

## Security

- **Content Security Policy** (CSP) enforced via meta tag: scripts and styles from `'self'` only.
- **Local-only data**: all competition data stays in the browser. Zero outbound requests with app data.
- **No analytics, telemetry, cloud sync, or external API calls.**
- Export is a local file download via Blob URL — never uploaded.

---

## Data Persistence

- All session data (obstacle config, contestant runs, heat numbers, players) stored in `localStorage` with `ninja_timer_` prefix.
- Session tracking via `sessionStorage` to detect fresh page loads.
- Data survives page refresh but is scoped to the browser.
- Export to Excel is the permanent storage mechanism.
- "New competition" flow offers export-before-delete to prevent data loss.

---

## Deployment

- **Platform:** Cloudflare Pages (static Vite build)
- **URL:** https://ninja-timer.pages.dev/
- **Deploy command:**
  ```bash
  npx vite build
  npx wrangler pages deploy dist --project-name=ninja-timer --branch=master
  ```

---

## File Structure

```
Ninja_Timer/
├── index.html              # Entry point (RTL Hebrew, CSP, no external fonts)
├── public/
│   └── ninja-logo.png      # Brand logo (used as favicon + header)
├── src/
│   ├── main.js             # App entry point, routing between stages
│   ├── stage1-setup.js     # Obstacle selection, player registration, date/heat
│   ├── stage2-timer.js     # Timer, obstacle flow, wall stage, scoreboard
│   ├── stage3-export.js    # Export screen with run preview
│   ├── data.js             # localStorage CRUD, obstacle pool, ranking, Excel export
│   └── style.css           # All styles (Ninja Israel 2026 design system tokens)
├── docs/
│   ├── ranking-guidelines.md    # Official ranking rules and implementation
│   └── wall-finish-logic-design.md  # Wall stage design document
├── package.json
├── vite.config.js
├── .gitignore
├── SPEC.md                 # This file
└── .cursor/
    ├── rules/
    │   └── project-config.mdc
    └── skills/
        └── ninja-design-system/
            └── SKILL.md
```
