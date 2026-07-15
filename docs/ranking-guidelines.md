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

## 2. Review of Current App Components

### Live Scoreboard (`stage2-timer.js`, lines 664–669)

```javascript
const sortedRuns = [...runs].sort((a, b) => {
  if (a.dnf && !b.dnf) return 1;
  if (!a.dnf && b.dnf) return -1;
  if (a.dnf && b.dnf) return getRankTime(a) - getRankTime(b);
  return a.totalTime - b.totalTime;
});
```

**Issues:**
- DNF ranking uses `getRankTime(run)` which returns `run.totalTime` (the time they fell).
- Does NOT consider the number of obstacles completed.
- Does NOT use the start time of the fall obstacle.

### Export Logic (`data.js`, lines 264–270)

```javascript
const sortedForRank = [...runs].sort((a, b) => {
  if (a.dnf && !b.dnf) return 1;
  if (!a.dnf && b.dnf) return -1;
  if (a.dnf && b.dnf) return getRankTime(a) - getRankTime(b);
  return a.totalTime - b.totalTime;
});
```

**Same issues** as the scoreboard.

### `getRankTime` helper (`data.js`, line 255–257)

```javascript
function getRankTime(run) {
  return run.totalTime;
}
```

**Issue:** Returns `totalTime` (fall time) instead of the start time of the obstacle where the competitor fell.

### Data Structure (run events)

Each run stores events including:
- `{ type: 'OBSTACLE_START', obstacle: name, time: elapsed }` — when the competitor starts an obstacle
- `{ type: 'FALL', obstacle: name, time: elapsed, obstacleStartTime: ... }` — when they fall; already stores `obstacleStartTime`

The `obstacleStartTime` field already exists on FALL events (set in `stage2-timer.js` line 524). This is the value needed for ranking.

---

## 3. Revised Ranking Logic

### New `getRankTime` function

```javascript
function getRankTime(run) {
  // For DNF runs: return the START TIME of the obstacle they fell on
  const fallEvent = run.events.find(e => e.type === 'FALL');
  if (fallEvent && fallEvent.obstacleStartTime !== undefined) {
    return fallEvent.obstacleStartTime;
  }
  // Fallback: return totalTime (should not happen for properly recorded runs)
  return run.totalTime;
}
```

### New `getObstaclesCompleted` helper

```javascript
function getObstaclesCompleted(run) {
  return run.events.filter(e => e.type === 'PASSED').length;
}
```

### New sorting function (used in both scoreboard and export)

```javascript
function rankRuns(runs) {
  return [...runs].sort((a, b) => {
    // Tier 1 vs Tier 2
    if (a.dnf && !b.dnf) return 1;
    if (!a.dnf && b.dnf) return -1;

    // Both finishers: sort by end time (totalTime) ASC
    if (!a.dnf && !b.dnf) return a.totalTime - b.totalTime;

    // Both fallers: sort by obstacles completed DESC, then start time ASC
    const aCompleted = getObstaclesCompleted(a);
    const bCompleted = getObstaclesCompleted(b);
    if (aCompleted !== bCompleted) return bCompleted - aCompleted;

    // Same number completed: sort by start time of fall obstacle ASC
    return getRankTime(a) - getRankTime(b);
  });
}
```

---

## 4. Wall Stage as Obstacle

The wall stage is treated as an obstacle for ranking purposes:

- **Timer behavior**: The timer continues running after all regular obstacles are cleared and through the wall stage. It stops only when a wall result button is pressed.
- **WALL or MEGA_WALL**: Competitor is a finisher (Tier 1), ranked by `totalTime` (includes wall stage duration).
- **FAILED**: Competitor is a faller (Tier 2) with `dnf: true` and `wallFailed: true`. They completed all N regular obstacles but failed the wall. Their `obstaclesCompleted` = N (all regular passed), which is always higher than any regular faller (at most N-1), so they rank above regular fallers but below finishers.
- **Ranking value for wall-failers**: The start time of the wall obstacle = `WALL_UNLOCKED` event time.

### Scoreboard Display

For obstacles where a competitor fell, the scoreboard displays the **start time** of that obstacle (when they began it), not the time they fell. This matches the ranking tiebreaker logic.

---

## 5. Implementation Status (Completed)

| Location | Change |
|----------|--------|
| `data.js` `getRankTime()` | Returns `fallEvent.obstacleStartTime` for regular DNF; `WALL_UNLOCKED` time for wall-failed |
| `data.js` `getObstaclesCompleted()` | Counts `PASSED` events |
| `data.js` `rankRuns()` | Unified sort: finishers by totalTime, fallers by obstacles DESC then start time ASC |
| `data.js` `normalizeWallResult()` | Handles `wallFailed` flag |
| `data.js` `downloadRunsCSV` | Shows obstacle start time for falls; uses `rankRuns()` |
| `stage2-timer.js` `unlockWall()` | Timer keeps running (no clearInterval) |
| `stage2-timer.js` `handleWallResult()` | Records elapsed at button press; FAILED → DNF |
| `stage2-timer.js` scoreboard | Shows `obstacleStartTime` for fall cells |
