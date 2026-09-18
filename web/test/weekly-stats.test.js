import { describe, expect, it } from "vitest";
import {
  loadWeeklyStats,
  recordAbandonedWeeklyPeriods,
  recordWeeklyResult,
  summarizeWeeklyPerformance,
  WEEKLY_OUTCOMES,
} from "$lib/weekly-stats";

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    get length() {
      return values.size;
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

describe("weekly stats", () => {
  it("stores the four activity outcomes and their counters", () => {
    const storage = createStorage();

    recordWeeklyResult("2026-09-03", { guessCount: 1, isWon: true }, storage);
    recordWeeklyResult("2026-09-10", { guessCount: 3, isWon: true }, storage);
    recordWeeklyResult("2026-09-17", { guessCount: 6, isWon: true }, storage);
    recordWeeklyResult("2026-09-24", { guessCount: 6, isWon: false }, storage);

    const stats = loadWeeklyStats(storage);
    expect(stats).toMatchObject({
      weekly_won_1_try: 1,
      weekly_won_2_try: 0,
      weekly_won_3_try: 1,
      weekly_won_4_try: 0,
      weekly_won_5_try: 0,
      weekly_won_6_try: 1,
      weekly_fails: 1,
    });
    expect(stats.periods).toEqual({
      "2026-09-03": WEEKLY_OUTCOMES.FIRST_TRY,
      "2026-09-10": WEEKLY_OUTCOMES.TWO_TO_FIVE_TRIES,
      "2026-09-17": WEEKLY_OUTCOMES.SIXTH_TRY,
      "2026-09-24": WEEKLY_OUTCOMES.FAILED,
    });
  });

  it("keeps every winning attempt count in its own performance bucket", () => {
    const storage = createStorage();
    for (let guessCount = 2; guessCount <= 5; guessCount += 1) {
      recordWeeklyResult(
        `2026-10-${String(guessCount).padStart(2, "0")}`,
        { guessCount, isWon: true },
        storage,
      );
    }

    expect(summarizeWeeklyPerformance(storage)).toMatchObject({
      playedWeeklyGames: 4,
      totals: [0, 1, 1, 1, 1, 0, 0],
      max: 1,
    });
  });

  it("counts an abandoned past week once and ignores the current week", () => {
    const storage = createStorage({
      "goblindle_v3_weekly_2026-09-03": JSON.stringify({
        isOver: false,
        guesses: [{ name: "a" }],
      }),
      "goblindle_v3_weekly_2026-09-10": JSON.stringify({
        isOver: false,
        guesses: [{ name: "b" }],
      }),
    });

    recordAbandonedWeeklyPeriods("2026-09-10", storage);
    recordAbandonedWeeklyPeriods("2026-09-10", storage);

    expect(loadWeeklyStats(storage)).toMatchObject({
      weekly_fails: 1,
      periods: { "2026-09-03": WEEKLY_OUTCOMES.FAILED },
    });
  });

  it("does not increment a completed period twice", () => {
    const storage = createStorage();

    recordWeeklyResult("2026-11-05", { guessCount: 1, isWon: true }, storage);
    recordWeeklyResult("2026-11-05", { guessCount: 6, isWon: false }, storage);

    expect(loadWeeklyStats(storage)).toMatchObject({
      weekly_won_1_try: 1,
      weekly_fails: 0,
    });
  });
});
