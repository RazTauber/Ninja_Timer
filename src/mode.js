/**
 * App mode detection — "finals" vs "regular" (default).
 * Set at build time via VITE_APP_MODE environment variable.
 */
export const isFinalsMode = import.meta.env.VITE_APP_MODE === 'finals';

export const APP_MODE = {
  showFinalsBadge: isFinalsMode,
  hasWallStage: !isFinalsMode,
  useCountdownTimer: isFinalsMode,
};
