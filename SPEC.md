# Ninja Timer -- App Specification

A competition timer for a **Ninja Warrior**-style obstacle course reality show. Designed for on-set production crew to time contestants as they run through obstacles, log events, and export results.

---

## App Flow

The app has three sequential stages:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Stage 1: Setup │ ──> │  Stage 2: Timer  │ ──> │ Stage 3: Export │
│                 │     │                  │     │                 │
│ Pick obstacles  │     │ Time each player │     │ Download CSV    │
│ Set their order │     │ Log obstacle     │     │ with all runs   │
│                 │     │ completions &    │     │                 │
│                 │     │ audit events     │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

---

## Stage 1: Obstacle Selection (Setup)

### Obstacle Pool

There are 10 predefined obstacles available:

| # | Name |
|---|------|
| 1 | Obstacle 1 |
| 2 | Obstacle 2 |
| 3 | Obstacle 3 |
| 4 | Obstacle 4 |
| 5 | Obstacle 5 |
| 6 | Obstacle 6 |
| 7 | Obstacle 7 |
| 8 | Obstacle 8 |
| 9 | Obstacle 9 |
| 10 | Obstacle 10 |

### User Actions

- Select which obstacles are included in this stage of the competition (any subset of the 10).
- Arrange the selected obstacles in the desired run order (drag-and-drop or move up/down buttons).
- Confirm the selection to proceed to Stage 2.

### Behavior

- The obstacle configuration persists for **all contestants** in the current session.
- The user can return to this screen to modify the course between sessions.

---

## Stage 2: Timer and Recording

### Starting a Run

1. User enters the **contestant name** (cast member).
2. Presses **Start** -- the timer begins immediately.

### Timer Screen Layout

```
┌──────────────────────────────────────────────┐
│              NINJA TIMER                     │
│                                              │
│         ┌──────────────────┐                 │
│         │    03:24.57      │  ← Live timer   │
│         └──────────────────┘                 │
│                                              │
│  Player: John Smith                          │
│  Current Obstacle: Obstacle 3 (3 of 6)      │
│                                              │
│  ┌──────────────┐    ┌──────────────┐        │
│  │              │    │              │        │
│  │   ✓ NEXT    │    │  ⚑ AUDIT    │        │
│  │  OBSTACLE   │    │   LOG       │        │
│  │              │    │              │        │
│  │  (GREEN)    │    │   (RED)     │        │
│  └──────────────┘    └──────────────┘        │
│                                              │
│  ── Live Event Log ──────────────────────    │
│  00:00.00  Timer started                     │
│  00:45.12  ✓ Passed Obstacle 1               │
│  01:22.87  ✓ Passed Obstacle 2               │
│  02:15.44  ⚑ Audit @ Obstacle 3             │
│  03:01.33  ✓ Passed Obstacle 3               │
│                                              │
└──────────────────────────────────────────────┘
```

### Buttons

| Button | Color | Action |
|--------|-------|--------|
| **Next Obstacle** | Green (`#28A745`) | Logs the current timestamp, marks the current obstacle as completed, advances to the next obstacle. When the last obstacle is passed, the run ends automatically. |
| **Audit Log** | Red (`#D8282B`) | Logs the current timestamp as an audit event on the current obstacle (e.g., a fall, penalty, retry, or any notable moment). Does NOT advance the obstacle. |

### Event Log

- Displayed as a scrolling list at the bottom of the timer screen.
- Each entry shows: `[elapsed time] [event type] [obstacle name]`
- Event types: `STARTED`, `PASSED`, `AUDIT`, `COMPLETED`

### Ending a Run

- The run ends automatically when the contestant passes the last obstacle.
- A **"Finish Run"** button is also available to manually end a run early (e.g., contestant falls out).
- After the run ends, the contestant's data is saved to the session.
- The user returns to the name entry screen to start the next contestant.

### Data Saved Per Run

```
{
  contestantName: "John Smith",
  startTime: "2026-07-08T10:30:00.000Z",
  events: [
    { time: 0,      type: "STARTED",  obstacle: null },
    { time: 45120,   type: "PASSED",   obstacle: "Obstacle 1" },
    { time: 82870,   type: "PASSED",   obstacle: "Obstacle 2" },
    { time: 135440,  type: "AUDIT",    obstacle: "Obstacle 3" },
    { time: 181330,  type: "PASSED",   obstacle: "Obstacle 3" },
    { time: 204570,  type: "COMPLETED", obstacle: null }
  ],
  totalTime: 204570
}
```

---

## Stage 3: Export

### Trigger

- After all contestants have completed their runs, the user navigates to the Export screen.
- Available at any time via a navigation button (does not require all contestants to finish).

### CSV Output

The exported CSV file contains one row per event, grouped by contestant:

```csv
Contestant,Event #,Event Type,Obstacle,Elapsed Time (s),Timestamp
John Smith,1,STARTED,,0.000,2026-07-08T10:30:00.000Z
John Smith,2,PASSED,Obstacle 1,45.120,2026-07-08T10:30:45.120Z
John Smith,3,PASSED,Obstacle 2,82.870,2026-07-08T10:31:22.870Z
John Smith,4,AUDIT,Obstacle 3,135.440,2026-07-08T10:32:15.440Z
John Smith,5,PASSED,Obstacle 3,181.330,2026-07-08T10:33:01.330Z
John Smith,6,COMPLETED,,204.570,2026-07-08T10:33:24.570Z
Jane Doe,1,STARTED,,0.000,2026-07-08T10:35:00.000Z
...
```

### Export Method

- In-browser CSV generation using JavaScript `Blob` and download link.
- File is named with the date: `ninja_timer_results_2026-07-08.csv`
- No server required.

---

## Design and Theme

### Visual Identity

Inspired by **American Ninja Warrior** branding:

| Element | Color | Hex |
|---------|-------|-----|
| Background | Dark navy/black | `#0D1117` |
| Primary accent | Ninja Blue (brand blue) | `#284C88` |
| Danger / Audit | Ninja Red (brand red) | `#D8282B` |
| Success / Next | Green | `#28A745` |
| Text | White | `#FFFFFF` |
| Timer display | Electric blue glow | `#4DA3FF` |
| Secondary text | Light gray | `#8B949E` |

### Typography

- Bold, athletic sans-serif font (e.g., `"Rajdhani"`, `"Oswald"`, or `"Bebas Neue"` from Google Fonts).
- Timer display: large monospace numerals for readability.

### Layout Principles

- **Touch-first**: large buttons (minimum 80px tall), generous tap targets.
- **Tablet/phone friendly**: works on devices used on set.
- **Non-technical**: no menus, no settings, no jargon. A production assistant should be able to use it immediately.
- **High contrast**: easily readable under bright stage lighting or outdoors.
- **No login, no accounts, no setup wizards.**

---

## Technical Stack

| Technology | Purpose |
|------------|---------|
| HTML5 | Structure |
| CSS3 | Styling, animations, responsive layout |
| Vanilla JavaScript | Logic, timer, CSV generation |
| Vite | Dev server, bundling, hot reload |
| localStorage | Session persistence (survives page refresh) |
| Blob API | In-browser CSV file generation and download |

### No external dependencies beyond Vite. No frameworks. Intentionally simple.

---

## Data Persistence

- All session data (obstacle config, contestant runs) stored in `localStorage`.
- Data survives page refresh but is cleared when the browser storage is cleared.
- Export to CSV is the permanent storage mechanism.

---

## File Structure (planned)

```
Ninja_Timer/
├── index.html
├── src/
│   ├── main.js          # App entry point, routing between stages
│   ├── stage1-setup.js  # Obstacle selection logic
│   ├── stage2-timer.js  # Timer, event logging, buttons
│   ├── stage3-export.js # CSV generation and download
│   ├── data.js          # localStorage read/write, data models
│   └── style.css        # All styles, Ninja Warrior theme
├── package.json
├── vite.config.js
├── .gitignore
├── SPEC.md              # This file
└── .cursor/
    └── rules/
        └── project-config.mdc
```
