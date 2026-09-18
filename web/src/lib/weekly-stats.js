const STORAGE_KEY = "goblindle_v3_weekly_stats";

const COUNTER_KEYS = [
  "weekly_won_1_try",
  "weekly_won_2_try",
  "weekly_won_3_try",
  "weekly_won_4_try",
  "weekly_won_5_try",
  "weekly_won_6_try",
  "weekly_fails",
];

export const WEEKLY_OUTCOMES = {
  FIRST_TRY: "first_try",
  TWO_TO_FIVE_TRIES: "two_to_five",
  SIXTH_TRY: "sixth_try",
  FAILED: "failed",
};

function emptyStats() {
  return {
    weekly_won_1_try: 0,
    weekly_won_2_try: 0,
    weekly_won_3_try: 0,
    weekly_won_4_try: 0,
    weekly_won_5_try: 0,
    weekly_won_6_try: 0,
    weekly_fails: 0,
    periods: {},
  };
}

function normalizeStats(value) {
  const stats = emptyStats();
  if (!value || typeof value !== "object") return stats;

  for (const key of COUNTER_KEYS) {
    stats[key] = Number.isInteger(value[key]) && value[key] >= 0 ? value[key] : 0;
  }

  if (value.periods && typeof value.periods === "object") {
    for (const [seed, outcome] of Object.entries(value.periods)) {
      if (Object.values(WEEKLY_OUTCOMES).includes(outcome)) {
        stats.periods[seed] = outcome;
      }
    }
  }

  return stats;
}

export function loadWeeklyStats(storage = globalThis.localStorage) {
  try {
    return normalizeStats(JSON.parse(storage?.getItem(STORAGE_KEY) || "null"));
  } catch {
    return emptyStats();
  }
}

function saveWeeklyStats(stats, storage = globalThis.localStorage) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(stats));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("goblindle:state-changed"));
    }
  } catch {
    // Ignore storage access errors.
  }
}

function outcomeFor(guessCount, isWon) {
  if (!isWon) return WEEKLY_OUTCOMES.FAILED;
  if (guessCount === 1) return WEEKLY_OUTCOMES.FIRST_TRY;
  if (guessCount >= 2 && guessCount <= 5) return WEEKLY_OUTCOMES.TWO_TO_FIVE_TRIES;
  return WEEKLY_OUTCOMES.SIXTH_TRY;
}

function incrementFor(outcome, guessCount) {
  if (outcome === WEEKLY_OUTCOMES.FAILED) return "weekly_fails";
  if (outcome === WEEKLY_OUTCOMES.FIRST_TRY) return "weekly_won_1_try";
  if (outcome === WEEKLY_OUTCOMES.SIXTH_TRY) return "weekly_won_6_try";
  return `weekly_won_${guessCount}_try`;
}

export function recordWeeklyResult(
  seed,
  { guessCount = 0, isWon = false } = {},
  storage = globalThis.localStorage,
) {
  const stats = loadWeeklyStats(storage);
  if (!seed || stats.periods[seed]) return stats;

  const outcome = outcomeFor(guessCount, isWon);
  stats.periods[seed] = outcome;
  stats[incrementFor(outcome, guessCount)] += 1;
  saveWeeklyStats(stats, storage);
  return stats;
}

export function recordAbandonedWeeklyPeriods(currentSeed, storage = globalThis.localStorage) {
  if (!storage || typeof storage.length !== "number") return loadWeeklyStats(storage);

  const stats = loadWeeklyStats(storage);
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key || !key.startsWith("goblindle_v3_weekly_")) continue;
    if (key === STORAGE_KEY) continue;
    const seed = key.slice("goblindle_v3_weekly_".length);
    if (!seed || seed === currentSeed || stats.periods[seed]) continue;

    try {
      const saved = JSON.parse(storage.getItem(key));
      if (saved && !saved.isOver && Array.isArray(saved.guesses) && saved.guesses.length > 0) {
        stats.periods[seed] = WEEKLY_OUTCOMES.FAILED;
        stats.weekly_fails += 1;
      }
    } catch {
      // Ignore malformed weekly saves.
    }
  }

  saveWeeklyStats(stats, storage);
  return stats;
}

export function summarizeWeeklyPerformance(storage = globalThis.localStorage) {
  const stats = loadWeeklyStats(storage);
  const totals = [
    stats.weekly_won_1_try,
    stats.weekly_won_2_try,
    stats.weekly_won_3_try,
    stats.weekly_won_4_try,
    stats.weekly_won_5_try,
    stats.weekly_won_6_try,
    stats.weekly_fails,
  ];

  return {
    playedWeeklyGames: totals.reduce((sum, value) => sum + value, 0),
    totals,
    max: Math.max(1, ...totals),
    stats,
  };
}
