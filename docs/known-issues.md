# Known Issues

## No undo after wall outcome

**Severity:** Medium  
**Component:** `src/stage2-timer.js` — `handleWallResult()`

When a wall outcome button (MEGA Wall / Wall / Failed) is clicked, the run is saved immediately and `activeRun` is cleared. There is no confirmation step and no way to reverse a mistaken click.

Unlike pass, fall, and wall-unlock actions — which all support "ביטול הקלקה אחרונה" (undo last action) — the wall outcome is final on click.

### Impact

An operator who accidentally taps the wrong wall result (e.g. "Failed" instead of "MEGA Wall") cannot recover. The run is persisted to localStorage and the timer resets to the contestant picker.

### Potential mitigations

- Add a confirmation dialog before committing the wall result.
- Keep `activeRun` in memory for a brief undo window after save, allowing the operator to revert and re-record.
- Add an undo path that removes the last saved run from localStorage and restores `activeRun` from its data.
