# Ninja Israel — Ranking Guidelines

## 1. Official Ranking Rules

Competitors are divided into two tiers:

### Tier 1: Finishers (completed all obstacles)
- Ranked by **end time** — the timestamp when they finished the last obstacle.
- Lower end time = higher rank.

### Tier 2: Fallers (fell during the run)
- First sorted by **number of obstacles completed** — more completed obstacles = higher rank.
- If two competitors completed the same number of obstacles (fell on the same obstacle), ranked by the **start time of the obstacle they fell on** — lower start time = higher rank.

### Key Clarification
For fallers, the **start time** of the obstacle where they fell is the ranking value — NOT the time they actually fell, and NOT the total run time. A competitor who started that obstacle sooner ranks higher because their start time on that obstacle is earlier.

### Sorting Priority (complete)
```
1. Finishers above Fallers (always)
2. Among Finishers: sort by end_time ASC (fastest finish first)
3. Among Fallers:
   a. sort by obstacles_completed DESC (more completed = better)
   b. tiebreaker: sort by start_time_of_fall_obstacle ASC (earlier start = better)
```

---

## 2. Current Implementation

### Unified Ranking Function (`data.js`)

Both the live scoreboard and export use the shared `rankRuns()` function:

```javascript
function rankRuns(runs) {
  return [...runs].sort((a, b) => {
    if (a.dnf && !b.dnf) return 1;
    if (!a.dnf && b.dnf) return -1;
    if (!a.dnf && !b.dnf) return a.totalTime - b.totalTime;
    const aObs = getObstaclesCompleted(a);
    const bObs = getObstaclesCompleted(b);
    if (aObs !== bObs) return bObs - aObs;
    return getRankTime(a) - getRankTime(b);
  });
}
```

### `getRankTime` helper (`data.js`)

```javascript
function getRankTime(run) {
  if (run.dnf) {
    if (run.wallFailed) {
      const wallUnlock = run.events.find(e => e.type === 'WALL_UNLOCKED');
      if (wallUnlock) return wallUnlock.time;
    }
    const fallEvent = run.events.find(e => e.type === 'FALL');
    if (fallEvent && fallEvent.obstacleStartTime != null && isFinite(fallEvent.obstacleStartTime)) {
      return fallEvent.obstacleStartTime;
    }
  }
  return run.totalTime;
}
```

### `getObstaclesCompleted` helper (`data.js`)

```javascript
function getObstaclesCompleted(run) {
  return run.events.filter(e => e.type === 'PASSED').length;
}
```

### Data Structure (run events)

Each run stores events including:
- `{ type: 'OBSTACLE_START', obstacle: name, time: elapsed }` — when the competitor starts an obstacle
- `{ type: 'FALL', obstacle: name, time: elapsed, obstacleStartTime: ... }` — when they fall; stores `obstacleStartTime`
- `{ type: 'WALL_UNLOCKED', obstacle: null, time: elapsed }` — when the wall unlocks

The `obstacleStartTime` field on FALL events is the value used for ranking tiebreakers.

---

## 3. Ranking Logic Summary

All ranking functions are implemented in `data.js` and exported for use by both the scoreboard (`stage2-timer.js`) and the export function. See section 2 above for the actual implementation code.

---

## 4. Wall Stage as Obstacle

The wall stage is treated as an obstacle for ranking purposes:

- **Timer behavior**: The timer continues running after all regular obstacles are cleared and through the wall stage. It stops only when a wall result button is pressed.
- **WALL or MEGA_WALL**: Competitor is a finisher (Tier 1), ranked by `totalTime` (includes wall stage duration).
- **FAILED**: Competitor is a faller (Tier 2) with `dnf: true` and `wallFailed: true`. They completed all N regular obstacles but failed the wall. Their `obstaclesCompleted` = N (all regular passed), which is always higher than any regular faller (at most N-1), so they rank above regular fallers but below finishers.
- **Ranking value for wall-failers**: The start time of the wall obstacle = `WALL_UNLOCKED` event time.

### Scoreboard Display

- **All obstacle columns** on the live scoreboard show the **start time (זינוק)** of each obstacle — the moment the competitor began that obstacle. This applies to both passed and fallen obstacles.
- For obstacles where a competitor fell, the cell is highlighted in red to distinguish it from a pass, but the time shown is still the start time.
- For wall-failed competitors, the wall column shows the wall unlock time (start time of wall obstacle).
- The export (CSV) provides separate זינוק/תוצאה columns per obstacle for detailed analysis; the live scoreboard intentionally keeps only the start time for a compact view.

---

## 5. Implementation Status (Complete — Deployed)

| Location | Function | Behavior |
|----------|----------|----------|
| `data.js` | `getRankTime()` | Returns `fallEvent.obstacleStartTime` for regular DNF; `WALL_UNLOCKED` time for wall-failed |
| `data.js` | `getObstaclesCompleted()` | Counts `PASSED` events |
| `data.js` | `rankRuns()` | Unified sort: finishers by totalTime, fallers by obstacles DESC then start time ASC |
| `data.js` | `normalizeWallResult()` | Handles `wallFailed` flag and backward-compat with `megaWall` boolean |
| `data.js` | `downloadRunsCSV()` | Shows obstacle start time for falls; uses `rankRuns()` for ordering |
| `stage2-timer.js` | `unlockWall()` | Timer keeps running (no clearInterval) |
| `stage2-timer.js` | `handleWallResult()` | Records elapsed at button press; FAILED → `dnf: true, wallFailed: true` |
| `stage2-timer.js` | `renderScoreboard()` | Shows obstacle start times (זינוק) for all cells; fall cells highlighted red; uses `rankRuns()` |
