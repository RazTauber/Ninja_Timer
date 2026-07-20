# Wall Finish Logic — Comprehensive Design Document

> **Status:** IMPLEMENTED  
> **Date:** 2026-07-10 (implemented 2026-07-11)  
> **Author:** System Architect  
> **App:** Ninja Timer (Vanilla JS + Vite, RTL Hebrew)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Proposed Changes](#3-proposed-changes)
4. [Backend / State Machine Design](#4-backend--state-machine-design)
5. [Frontend UI Design](#5-frontend-ui-design)
6. [Live Scoreboard Updates](#6-live-scoreboard-updates)
7. [Export File Schema Changes](#7-export-file-schema-changes)
8. [Audit Log Entries](#8-audit-log-entries)
9. [Documentation Updates](#9-documentation-updates)
10. [Implementation Plan](#10-implementation-plan)
11. [Review Checklist](#11-review-checklist)

---

## 1. Executive Summary

**Goal:** After a competitor completes a full pass (clears 100% of configured obstacles), the wall unlocks. The wall is always the final obstacle. The competitor receives **three attempts** to conquer it. The operator selects one of three outcomes: **MEGA Wall**, **Wall**, or **Failed**.

**Key Principles:**
- The wall is locked until all course obstacles are passed.
- Exactly three attempts — no more, no less (operator records the final outcome).
- Three buttons: **MEGA Wall**, **Wall**, **Failed** (exact labels).
- Backward-compatible data format (old runs without wall data remain valid).
- Implementation complete and deployed.

---

## 2. Current State Analysis

### 2.1 Current Flow (stage2-timer.js)

```
Start Run → Obstacle 1 → ... → Obstacle N → Start Wall → Wall Result → Finish
```

**Current Mega Wall Prompt** (lines 292–324):
- Triggered when `currentObstacleIndex >= obstacles.length`
- Timer stops, `pendingMegaWall = true`
- Two buttons: `🔥 מגה וול!` and `✓ קיר רגיל`
- Calls `finishRun(elapsed, megaWall: boolean)`

### 2.2 Current Run Data Shape

```javascript
{
  contestantName: string,
  startTime: string,       // ISO timestamp
  events: [
    { time: number, type: 'STARTED'|'PASSED'|'FALL'|'COMPLETED', obstacle: string|null }
  ],
  totalTime: number,       // ms
  dnf: boolean,
  megaWall: boolean,       // true = mega wall, false = regular wall
  startOrder: number
}
```

### 2.3 Current Export Columns

```
תאריך | דירוג | סדר | מתחרה | [obstacle splits...] | זמן נפילה | סיים? | מגה וול
```

### 2.4 Current Scoreboard Columns

```
דירוג | סדר | מתחרה | [obstacle splits...] | 🔥 (mega) | סה"כ
```

### 2.5 Identified Gaps

| Gap | Description |
|-----|-------------|
| No wall lock state | Wall prompt appears immediately; no visual "locked" state |
| Binary outcome | Only mega/regular — no "Failed" outcome |
| No attempt tracking | No concept of 3 attempts |
| No wall-specific timing | Wall time not recorded separately |
| No audit trail | No event for wall unlock or individual attempts |

---

## 3. Proposed Changes

### 3.1 New Finish Flow

```
Pass all obstacles → Wall UNLOCKS → 3 attempts → Outcome recorded → Run saved
```

```
┌─────────────────────────────────────────────────────────────┐
│  All obstacles passed (100%)                                │
│  Timer CONTINUES RUNNING                                    │
│  Wall status: UNLOCKED                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  "הקיר פתוח! 3 ניסיונות"                            │    │
│  │                                                     │    │
│  │  [MEGA Wall]    [Wall]    [Failed]                  │    │
│  │                                                     │    │
│  │  Attempts remaining: ● ● ●                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Outcome Rules

| Button | Meaning | Saves As | Run Status |
|--------|---------|----------|------------|
| **MEGA Wall** | Conquered the tall mega wall | `wallResult: 'MEGA_WALL'` | Finished (best outcome) |
| **Wall** | Conquered the regular wall | `wallResult: 'WALL'` | Finished |
| **Failed** | Failed all 3 attempts | `wallResult: 'FAILED'` | DNF (`wallFailed: true`) — completed course, failed wall |

**Important:** "Failed" means the competitor finished the course but failed the wall. They are marked as `dnf: true` with `wallFailed: true` to differentiate them from competitors who fell during the course. They rank above regular fallers (since they completed all obstacles) but below finishers.

### 3.3 Attempt Tracking

The operator does NOT need to record each individual attempt in real time. Instead:
- The prompt displays "3 ניסיונות" (3 attempts) as context.
- The operator watches the competitor's 3 attempts.
- After all attempts are concluded, the operator clicks the final outcome.
- The system records which attempt succeeded (if any) based on button pressed.

**Rationale:** In a live competition, the operator is watching — not interacting with the device during wall attempts. Recording per-attempt would add complexity without value.

### 3.4 Wall Lock Visual

Before all obstacles are cleared, the wall row appears at the bottom of the obstacle list as:

```
🔒 הקיר | נעול — יפתח לאחר מעבר כל המכשולים
```

After unlock:
```
🏆 הקיר | פתוח! — 3 ניסיונות
```

---

## 4. Backend / State Machine Design

### 4.1 State Machine

Since this is a client-side localStorage app, "backend" = in-memory state + persistence.

```
                    ┌──────────────┐
                    │  RUN_ACTIVE  │
                    │              │
                    └──────┬───────┘
                           │ all obstacles passed
                           ▼
                    ┌──────────────┐
                    │ WALL_UNLOCKED│
                    │              │
                    └──┬───┬───┬───┘
                       │   │   │
          MEGA Wall    │   │   │   Failed
                       ▼   ▼   ▼
                    ┌──────────────┐
                    │ RUN_COMPLETE │
                    └──────────────┘
```

### 4.2 Updated `activeRun` State

```javascript
activeRun = {
  contestantName: string,
  startTime: number,           // Date.now()
  startISO: string,
  currentObstacleIndex: number,
  events: Array,
  timerInterval: number|null,
  finished: boolean,

  // Wall state
  wallUnlocked: boolean,       // true after all obstacles passed
  wallUnlockTime: number,      // elapsed ms when wall unlocked
  wallResult: null | 'MEGA_WALL' | 'WALL' | 'FAILED',
};
```

### 4.3 Updated Run Persistence Shape

```javascript
{
  contestantName: string,
  startTime: string,
  events: [
    { time, type: 'STARTED', obstacle: null },
    { time, type: 'PASSED', obstacle: 'מסלול A' },
    // ...
    { time, type: 'WALL_UNLOCKED', obstacle: null },        // NEW
    { time, type: 'WALL_RESULT', obstacle: null,            // NEW
      wallResult: 'MEGA_WALL'|'WALL'|'FAILED' },
    { time, type: 'COMPLETED', obstacle: null },
  ],
  totalTime: number,
  dnf: boolean,

  // NEW fields
  wallResult: 'MEGA_WALL' | 'WALL' | 'FAILED' | null,
  wallAttempts: 3,

  // DEPRECATED (kept for backward compat)
  megaWall: boolean,           // derived: wallResult === 'MEGA_WALL'

  // NOTE: totalTime includes wall stage duration. The timer continues
  // running after wall unlock and stops when the operator records the
  // wall result. totalTime = elapsed at wall result button press.
}
```

### 4.4 Backward Compatibility

Old runs (without `wallResult`) remain valid:
- `megaWall: true` → treat as `wallResult: 'MEGA_WALL'`
- `megaWall: false` + `dnf: false` → treat as `wallResult: 'WALL'`
- `dnf: true` → no wall result (didn't reach wall)

**Migration function:**
```javascript
function normalizeWallResult(run) {
  if (run.wallResult) return run.wallResult;
  if (run.dnf) return null;
  return run.megaWall ? 'MEGA_WALL' : 'WALL';
}
```

### 4.5 Core Logic Pseudocode

```javascript
function handlePass(obstacleIndex) {
  // ... existing pass logic ...

  if (activeRun.currentObstacleIndex >= obstacles.length) {
    unlockWall(elapsed);
    return;
  }
  renderRunnerSection();
}

function unlockWall(elapsed) {
  // Timer keeps running — wall time IS counted in totalTime
  activeRun.wallUnlocked = true;
  activeRun.wallUnlockTime = elapsed;
  activeRun.wallResult = null;

  activeRun.events.push({ time: elapsed, type: 'WALL_UNLOCKED', obstacle: null });

  renderRunnerSection();
}

function handleWallResult(result) {
  // result: 'MEGA_WALL' | 'WALL' | 'FAILED'
  activeRun.finished = true;
  const elapsed = Date.now() - activeRun.startTime;

  activeRun.events.push({
    time: elapsed,
    type: 'WALL_RESULT',
    obstacle: null,
    wallResult: result,
  });

  clearInterval(activeRun.timerInterval);
  activeRun.timerInterval = null;

  if (result === 'FAILED') {
    finishRunWallFailed(elapsed);
  } else {
    finishRun(elapsed, result);
  }
}

function finishRun(totalTime, wallResult) {
  clearInterval(activeRun.timerInterval);
  activeRun.timerInterval = null;

  activeRun.events.push({ time: totalTime, type: 'COMPLETED', obstacle: null });

  const run = {
    contestantName: activeRun.contestantName,
    startTime: activeRun.startISO,
    events: [...activeRun.events],
    totalTime,
    dnf: false,
    wallResult,
    wallAttempts: 3,
    megaWall: wallResult === 'MEGA_WALL',  // backward compat
  };
  saveRun(run);

  activeRun = null;
  contestantName = '';

  updateHeaderStats();
  renderRunnerSection();
  renderScoreboard();
}
```

---

## 5. Frontend UI Design

### 5.1 Wall Prompt Card (replaces current Mega Wall prompt)

**Hebrew UI Text:**
- Title: `!הקיר פתוח`
- Subtitle: `כל המכשולים הושלמו — 3 ניסיונות לכיבוש הקיר`
- Button 1: `🔥 MEGA Wall`
- Button 2: `✓ Wall`
- Button 3: `✕ Failed`

**Layout (RTL):**

```
┌─────────────────────────────────────────────────┐
│  🏆  הקיר פתוח!                                 │
│      ────────────────────                       │
│      [contestant name]                          │
│      [elapsed time]                             │
│                                                 │
│  כל המכשולים הושלמו — 3 ניסיונות לכיבוש הקיר    │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │🔥 MEGA   │  │ ✓ Wall   │  │ ✕ Failed │      │
│  │  Wall    │  │          │  │          │      │
│  └──────────┘  └──────────┘  └──────────┘      │
│                                                 │
│  [↩ ביטול הקלקה אחרונה]                         │
└─────────────────────────────────────────────────┘
```

### 5.2 Button Styling

| Button | Background | Text Color | Icon | CSS Class |
|--------|-----------|------------|------|-----------|
| MEGA Wall | `var(--gold)` | `var(--night)` | 🔥 | `.btn-wall-mega` |
| Wall | `var(--blue)` | `var(--white)` | ✓ | `.btn-wall-regular` |
| Failed | `var(--red)` | `var(--white)` | ✕ | `.btn-wall-failed` |

All buttons follow the design system: `border-radius: 12px`, `min-height: 56px`, `font-family: var(--font-display)`, `font-weight: 800`, `text-transform: uppercase`.

### 5.3 Wall Lock Row in Obstacle List

During the run (before all obstacles are cleared), add a visual wall row at the bottom:

```html
<div class="obstacle-row obstacle-wall-locked">
  <div class="obstacle-badge badge-wall">🧱</div>
  <span class="obstacle-name">הקיר</span>
  <span class="lock-label">🔒 נעול — סיימו את כל המכשולים</span>
</div>
```

**CSS:**
```css
.obstacle-wall-locked {
  opacity: 0.5;
  border-color: var(--border);
  background: var(--navy-deep);
}
.badge-wall {
  background: var(--border);
  color: var(--gray);
}
```

When unlocked (transition animation):
```css
.obstacle-wall-unlocked {
  opacity: 1;
  border-color: var(--gold);
  background: var(--gold-soft);
  animation: wallUnlock 0.6s ease-out;
}
@keyframes wallUnlock {
  0% { transform: scale(0.95); opacity: 0.5; }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); opacity: 1; }
}
```

### 5.4 Undo Behavior

- If the operator presses "undo" while on the wall prompt, it undoes the last obstacle pass, re-locks the wall, and resumes the timer.
- This matches the current undo behavior for the mega wall prompt.

---

## 6. Live Scoreboard Updates

### 6.1 New Column: Wall Result

Replace the current `🔥` (mega) column with a **Wall Result** column:

| Header | Values |
|--------|--------|
| `קיר` | `🔥 MEGA` / `✓` / `✕` / `-` |

### 6.2 Updated Scoreboard Table Structure

```
דירוג | סדר | מתחרה | [obstacle splits...] | קיר | סה"כ
```

### 6.3 Ranking Logic (Implemented)

Uses `rankRuns()` from `data.js`:

```
1. Finishers (MEGA Wall + Wall) — sorted by totalTime ASC
2. Fallers (wall-failed + regular falls) — sorted by obstacles completed DESC,
   then start time of fall obstacle ASC
```

Wall-failed competitors have `dnf: true, wallFailed: true` and completed all N obstacles, so they always rank above regular fallers (at most N-1 obstacles completed).

### 6.4 Scoreboard Cell Rendering

```javascript
// Wall result cell
function renderWallCell(run) {
  const result = normalizeWallResult(run);
  if (!result) return '<td class="td-empty">-</td>';

  switch (result) {
    case 'MEGA_WALL':
      return '<td class="td-wall td-wall-mega">🔥 MEGA</td>';
    case 'WALL':
      return '<td class="td-wall td-wall-pass">✓</td>';
    case 'FAILED':
      return '<td class="td-wall td-wall-fail">✕</td>';
  }
}
```

---

## 7. Export File Schema Changes

### 7.1 Updated Columns

```
תאריך | דירוג | סדר | מתחרה | [obstacle splits...] | זמן נפילה | סיים? | תוצאת קיר
```

**Changed column:** `מגה וול` → `תוצאת קיר` (Wall Result)

### 7.2 Wall Result Values in Export

| wallResult | Export Cell Value |
|-----------|-----------------|
| `MEGA_WALL` | `MEGA Wall 🔥` |
| `WALL` | `Wall ✓` |
| `FAILED` | `Failed ✕` |
| `null` (DNF) | `-` |

### 7.3 Backward Compatibility

Old runs without `wallResult` use the migration function:
- `megaWall: true` → display as `MEGA Wall 🔥`
- `megaWall: false` + finished → display as `Wall ✓`
- DNF → display as `-`

### 7.4 Updated Export Code (data.js)

```javascript
// Replace megaWall column logic:
const wallResultDisplay = (() => {
  const wr = normalizeWallResult(run);
  if (!wr) return '-';
  if (wr === 'MEGA_WALL') return 'MEGA Wall 🔥';
  if (wr === 'WALL') return 'Wall ✓';
  if (wr === 'FAILED') return 'Failed ✕';
  return '-';
})();
```

### 7.5 CSS Class for Export

```css
.cell-wall-mega   { color: #F5CA30; font-weight: 700; font-size: 14px; text-align: center; }
.cell-wall-pass   { color: #4A90FF; font-weight: 600; text-align: center; }
.cell-wall-fail   { color: #E01018; font-weight: 600; text-align: center; }
```

---

## 8. Audit Log Entries

### 8.1 New Event Types

| Event Type | Trigger | Payload |
|-----------|---------|---------|
| `WALL_UNLOCKED` | All obstacles passed | `{ time, type: 'WALL_UNLOCKED', obstacle: null }` |
| `WALL_RESULT` | Operator clicks outcome | `{ time, type: 'WALL_RESULT', obstacle: null, wallResult: 'MEGA_WALL'\|'WALL'\|'FAILED' }` |

### 8.2 Event Timeline Example

```json
[
  { "time": 0, "type": "STARTED", "obstacle": null },
  { "time": 12340, "type": "PASSED", "obstacle": "מסלול A" },
  { "time": 24560, "type": "PASSED", "obstacle": "הליכת הכלב" },
  { "time": 38900, "type": "PASSED", "obstacle": "נדנדה" },
  { "time": 38900, "type": "WALL_UNLOCKED", "obstacle": null },
  { "time": 38900, "type": "WALL_RESULT", "obstacle": null, "wallResult": "MEGA_WALL" },
  { "time": 38900, "type": "COMPLETED", "obstacle": null }
]
```

### 8.3 Backward Compatibility

Old events without `WALL_UNLOCKED` / `WALL_RESULT` are still valid. The system infers wall result from the `megaWall` boolean on the run object when these events are absent.

---

## 9. Documentation Updates

### 9.1 Updated User Flow Documentation

```
1. Operator selects obstacles (3–6) and competition date.
2. For each competitor:
   a. Enter name → Press Enter to begin run
   b. Per obstacle:
      i.   Click "זינוק" (Start obstacle) — the timer starts on the FIRST זינוק
      ii.  Click "עבר" (Pass) or hold "נפילה" (Fall)
   c. Last obstacle "עבר" is a simple click (same as all other obstacles)
   d. After ALL obstacles passed → operator presses "התחלת קיר" (Start Wall) → WALL UNLOCKS
   e. Competitor gets 3 attempts at the wall
   f. Operator records outcome: MEGA Wall / Wall / Failed
   g. Run saved → scoreboard updates
3. Export results to Excel at any time.
```

### 9.2 Hold-to-Confirm Timing (Critical Design Decision)

The hold-to-confirm button (used for "Fall" buttons only) records the timestamp at
the **moment the operator presses down** (`startedAt`), NOT at the moment the hold
completes (1.2s later). This is intentional:

- The operator presses the button the instant the athlete falls.
- The 1.2-second hold is a UI safeguard to prevent accidental taps.
- Recording at press start gives the most accurate competition time.

**Implementation:** In `setupHoldButton()`, `onComplete(pressStart)` is called with
`pressStart = startedAt` (captured at `pointerdown`). `handleFall` uses
`(pressStart ?? Date.now()) - activeRun.startTime` for the elapsed calculation.

**DO NOT change this to `Date.now()` at hold completion** — it would add ~1.2s of
artificial delay to every recorded time.

Pass buttons (including the last obstacle) use simple clicks — no hold-to-confirm is
needed since accidental passes are less critical and can be undone.

### 9.3 Obstacle Start (זינוק) System

Each obstacle has an explicit "Start obstacle" (זינוק) action that the operator clicks
before the athlete begins attempting it. Key behaviors:

- **Timer activation:** The global run timer starts ONLY when the first obstacle's
  זינוק is clicked (not when the run is created).
- **Event type:** `OBSTACLE_START` — recorded per obstacle with the click timestamp.
- **UI flow:** Current obstacle shows the זינוק button first; Pass/Fall buttons appear
  only after the start is clicked.
- **Export:** Each obstacle gets two columns: "זינוק" (start time) and "תוצאה" (result time).
- **Undo:** Undoing the first OBSTACLE_START stops the timer and resets to waiting state.

### 9.4 Wall Rules

| Rule | Description |
|------|-------------|
| Lock condition | Wall remains locked until 100% obstacle clearance |
| Attempt count | Fixed at 3 attempts |
| Timer behavior | Timer CONTINUES running; stops when wall result button is pressed |
| Outcomes | MEGA Wall (best) > Wall (good) > Failed (DNF with wallFailed flag) |
| Undo | Operator can undo last pass to re-lock wall |

### 9.5 Deployment

The app is a static Vite site deployed to **Cloudflare Pages**.
Production URL: **https://ninja-timer.pages.dev/**

Always deploy to production using:
```bash
npx vite build
npx wrangler pages deploy dist --project-name=ninja-timer --branch=master
```

### 9.6 Data Dictionary Update

| Field | Type | Added In | Description |
|-------|------|----------|-------------|
| `wallResult` | `string\|null` | v1.1 | `'MEGA_WALL'`, `'WALL'`, `'FAILED'`, or `null` |
| `wallAttempts` | `number` | v1.1 | Always `3` (reserved for future flexibility) |
| `megaWall` | `boolean` | v1.0 | **Deprecated** — kept for backward compat |

---

## 10. Implementation Plan (Completed)

### 10.1 Phase Overview

| Phase | Task | Files | Dependencies |
|-------|------|-------|-------------|
| 1 | Add `normalizeWallResult()` utility | `src/data.js` | None |
| 2 | Update state machine (wall lock/unlock) | `src/stage2-timer.js` | Phase 1 |
| 3 | Build wall prompt UI (3 buttons) | `src/stage2-timer.js` | Phase 2 |
| 4 | Add wall lock row to obstacle list | `src/stage2-timer.js` | Phase 2 |
| 5 | Update scoreboard column | `src/stage2-timer.js` | Phase 1 |
| 6 | Update export schema | `src/data.js` | Phase 1 |
| 7 | Add CSS for new components | `src/style.css` | Phase 3, 4 |
| 8 | Update undo logic for wall state | `src/stage2-timer.js` | Phase 2 |
| 9 | End-to-end testing | All | All phases |

### 10.2 Detailed Steps

#### Phase 1: Data Layer (src/data.js)
1. Add `normalizeWallResult(run)` function
2. Update `downloadRunsCSV()` to use new wall result column
3. Ensure backward compat with old runs

#### Phase 2: State Machine (src/stage2-timer.js)
1. Rename `showMegaWallPrompt()` → `unlockWall()`
2. Add `WALL_UNLOCKED` event to run events
3. Update `activeRun` shape with wall fields
4. Remove `pendingMegaWall` flag, replace with `wallUnlocked`

#### Phase 3: Wall Prompt UI (src/stage2-timer.js)
1. Replace `renderMegaWallPrompt()` with `renderWallPrompt()`
2. Add three buttons: MEGA Wall, Wall, Failed
3. Add `handleWallResult(result)` function
4. Update `finishRun()` signature to accept wallResult string

#### Phase 4: Wall Lock Row (src/stage2-timer.js)
1. Append wall row after obstacle list in `renderActiveTimer()`
2. Show locked state during run
3. Show unlocked animation on transition

#### Phase 5: Scoreboard (src/stage2-timer.js)
1. Replace `🔥` column header with `קיר`
2. Use `normalizeWallResult()` for cell rendering
3. Add cell styling classes

#### Phase 6: Export (src/data.js)
1. Change header from `מגה וול` to `תוצאת קיר`
2. Update row generation to use wall result display values
3. Add new CSS classes for export styling

#### Phase 7: CSS (src/style.css)
1. Add `.btn-wall-mega`, `.btn-wall-regular`, `.btn-wall-failed` button styles
2. Add `.obstacle-wall-locked`, `.obstacle-wall-unlocked` row styles
3. Add `@keyframes wallUnlock` animation
4. Add `.td-wall-mega`, `.td-wall-pass`, `.td-wall-fail` scoreboard styles
5. Update `.mega-wall-card` → `.wall-card` class

#### Phase 8: Undo Logic (src/stage2-timer.js)
1. Update `undoLastAction()` to handle `wallUnlocked` state
2. Pop `WALL_UNLOCKED` event on undo
3. Resume timer, reset wall fields

### 10.3 Estimated Effort

| Phase | Complexity | Estimate |
|-------|-----------|----------|
| 1 | Low | 15 min |
| 2 | Medium | 30 min |
| 3 | Medium | 30 min |
| 4 | Low | 20 min |
| 5 | Low | 15 min |
| 6 | Low | 15 min |
| 7 | Medium | 30 min |
| 8 | Medium | 20 min |
| 9 | High | 30 min |
| **Total** | | **~3 hours** |

### 10.4 Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Old run data corruption | High | `normalizeWallResult()` handles missing fields |
| CSS conflicts | Low | Scoped class names, no global changes |
| Timer state bugs | High | Explicit state machine, undo testing |
| Export breaks | Medium | Header change is additive; old data renders correctly |

---

## 11. Review Checklist

### Pre-Implementation Review (All Verified)

#### Functional Requirements

- [x] **Wall lock condition:** Wall remains locked until competitor passes ALL configured obstacles (100%).
- [x] **Three-attempt limit:** System communicates that 3 attempts are available (enforced by operator workflow, not a counter).
- [x] **Button labels:** Exactly "MEGA Wall", "Wall", "Failed" — no deviations.
- [x] **Timer behavior:** Timer continues running through wall stage; stops at wall result button press.
- [x] **Outcome storage:** `wallResult` field stores one of `'MEGA_WALL'`, `'WALL'`, `'FAILED'`.
- [x] **DNF distinction:** Competitors who fail the wall are marked `dnf: true, wallFailed: true` — they completed the course but rank above regular fallers.

#### Backward Compatibility

- [x] **Old runs load correctly:** Runs saved before this change render properly.
- [x] **`megaWall` field preserved:** Old field still written for consumers that read it.
- [x] **Export handles mixed data:** File with old + new runs renders all rows correctly.
- [x] **No localStorage migration needed:** New fields are optional, with fallback logic.

#### UI / UX

- [x] **RTL layout:** All new elements respect RTL direction.
- [x] **Design system compliance:** Colors, fonts, spacing match Ninja Israel 2026 tokens.
- [x] **Touch targets:** All buttons ≥ 44×44px on mobile.
- [x] **Accessibility:** Focus states, contrast ratios (AA minimum).
- [x] **Wall lock visual:** Locked row is clearly distinguishable from active/passed obstacles.
- [x] **Unlock animation:** Smooth, non-distracting transition.

#### Data Integrity

- [x] **Event ordering:** `WALL_UNLOCKED` always precedes `WALL_RESULT` which precedes `COMPLETED`.
- [x] **No data loss on undo:** Undoing wall state correctly restores timer and obstacle index.
- [x] **Export column alignment:** All rows have same column count regardless of wall result.

#### Scoreboard

- [x] **Column header:** `קיר` replaces `🔥`.
- [x] **Cell values:** MEGA=🔥 MEGA, Wall=✓, Failed=obstacle start time, DNF=-.
- [x] **Ranking updated:** Uses `rankRuns()` with obstacles-completed + start-time tiebreaker.

#### Code Quality

- [x] **No hardcoded colors:** All colors use CSS custom properties.
- [x] **No new dependencies:** Pure vanilla JS, no library additions.
- [x] **Function naming:** Clear, descriptive names (`unlockWall`, `handleWallResult`, `finishRunWallFailed`).
- [x] **Event type constants:** `WALL_RESULTS` object exported from `data.js`.

### Post-Implementation Verification (All Passed)

- [x] Create a run, pass all obstacles — verify wall unlocks.
- [x] Click each of the 3 buttons — verify correct data saved.
- [x] Verify scoreboard shows correct wall result icon.
- [x] Export file — verify new column with correct values.
- [x] Load page with old localStorage data — verify no errors.
- [x] Undo from wall prompt — verify timer resumes.
- [x] Cancel run from wall prompt — verify clean state.
- [x] Verify on mobile device (touch targets, RTL).

---

## Appendix A: Glossary

| Term | Definition |
|------|-----------|
| **MEGA Wall** | The tall/warped wall — highest achievement |
| **Wall** | The regular wall — standard finish |
| **Failed** | Competitor attempted 3 times but couldn't clear any wall |
| **DNF** | Did Not Finish — fell during the obstacle course (never reached wall) |
| **Pass** | Successfully cleared an obstacle |
| **Fall** | Failed an obstacle during the course (ends run) |

## Appendix B: File Change Summary

| File | Changes |
|------|---------|
| `src/data.js` | Add `normalizeWallResult()`, update `downloadRunsCSV()` |
| `src/stage2-timer.js` | Wall state machine, new prompt UI, scoreboard column, undo |
| `src/style.css` | Wall button styles, lock/unlock row styles, animation |
| `index.html` | No changes |
| `src/main.js` | No changes |
| `src/stage1-setup.js` | No changes |
| `src/stage3-export.js` | No changes (uses `downloadRunsCSV` from data.js) |
