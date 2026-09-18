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

export function resetWeeklyStats(storage = globalThis.localStorage) {
  const stats = emptyStats();
  saveWeeklyStats(stats, storage);
  return stats;
}

export function setWeeklyCounters(counters = {}, { clearHistory = false } = {}, storage = globalThis.localStorage) {
  const current = loadWeeklyStats(storage);
  const stats = emptyStats();

  for (const key of COUNTER_KEYS) {
    const value = counters[key] ?? (clearHistory ? 0 : current[key]);
    stats[key] = Number.isInteger(value) && value >= 0 ? value : 0;
  }
  stats.periods = clearHistory ? {} : current.periods;
  saveWeeklyStats(stats, storage);
  return stats;
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

function firstThursdayOfSeptember(year) {
  const date = new Date(Date.UTC(year, 8, 1));
  date.setUTCDate(date.getUTCDate() + (4 - date.getUTCDay() + 7) % 7);
  return date;
}

export function fakeWeeklyHistory({ from = 2026, through = 2029, clear = true } = {}, storage = globalThis.localStorage) {
  const stats = clear ? emptyStats() : loadWeeklyStats(storage);
  let weekIndex = 0;

  for (let year = from; year < through; year += 1) {
    const seasonStart = firstThursdayOfSeptember(year);
    const seasonEnd = firstThursdayOfSeptember(year + 1);

    for (
      const date = new Date(seasonStart);
      date < seasonEnd;
      date.setUTCDate(date.getUTCDate() + 7)
    ) {
      const seed = date.toISOString().slice(0, 10);
      if (!stats.periods[seed]) {
        let outcome;
        let guessCount = 0;
        if (weekIndex % 20 === 0) {
          outcome = WEEKLY_OUTCOMES.FIRST_TRY;
          guessCount = 1;
        } else if (weekIndex % 11 === 0) {
          outcome = WEEKLY_OUTCOMES.SIXTH_TRY;
          guessCount = 6;
        } else if (weekIndex % 7 === 0) {
          outcome = WEEKLY_OUTCOMES.FAILED;
        } else {
          outcome = WEEKLY_OUTCOMES.TWO_TO_FIVE_TRIES;
          guessCount = 2 + (weekIndex % 4);
        }

        stats.periods[seed] = outcome;
        stats[incrementFor(outcome, guessCount)] += 1;
      }
      weekIndex += 1;
    }
  }

  saveWeeklyStats(stats, storage);
  return stats;
}

export function installWeeklyDataTools() {
  if (typeof window === "undefined") return null;

  const tools = {
    read: () => loadWeeklyStats(),
    reset: () => resetWeeklyStats(),
    setCounters: (counters, options) => setWeeklyCounters(counters, options),
    record: (seed, guessCount, isWon = true) =>
      recordWeeklyResult(seed, { guessCount, isWon }),
    fakeHistory: (options) => fakeWeeklyHistory(options),
  };

  window.goblindleWeekly = tools;
  return tools;
}
