export function summarizeWeeklyPerformance(storage = globalThis.localStorage, currentSeed = null) {
  if (!storage || typeof storage.length !== "number") {
    return { playedWeeklyGames: 0, totals: new Array(7).fill(0), max: 1 };
  }

  const totals = new Array(7).fill(0);
  let playedWeeklyGames = 0;

  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key || !key.startsWith("goblindle_v3_weekly_")) continue;
    if (currentSeed && key === `goblindle_v3_weekly_${currentSeed}`) continue;

    try {
      const raw = storage.getItem(key);
      if (!raw) continue;
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== "object") continue;

      const guessCount = Array.isArray(saved.guesses) ? saved.guesses.length : 0;
      const hasStarted = guessCount > 0;

      if (!saved.isOver) {
        if (!hasStarted) continue;
        playedWeeklyGames += 1;
        totals[6] += 1;
        continue;
      }

      playedWeeklyGames += 1;
      if (!saved.isWon) {
        totals[6] += 1;
        continue;
      }

      const bucket = Math.min(6, Math.max(1, guessCount));
      totals[bucket - 1] += 1;
    } catch {
      // Ignore malformed data rather than crashing the summary view.
    }
  }

  return {
    playedWeeklyGames,
    totals,
    max: Math.max(1, ...totals),
  };
}
