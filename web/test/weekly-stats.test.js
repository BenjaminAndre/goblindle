import { describe, expect, it } from "vitest";
import { summarizeWeeklyPerformance } from "$lib/weekly-stats";

describe("summarizeWeeklyPerformance", () => {
  it("counts wins by number of guesses and failures separately", () => {
    const storage = {
      length: 4,
      key(index) {
        return [
          "goblindle_v3_weekly_2026-09-17",
          "goblindle_v3_weekly_2026-09-25",
          "goblindle_v3_weekly_2026-10-02",
          "goblindle_v3_weekly_2026-10-09",
        ][index] ?? null;
      },
      getItem(key) {
        const payloads = {
          "goblindle_v3_weekly_2026-09-17": JSON.stringify({
            isOver: true,
            isWon: true,
            guesses: [{ name: "a" }, { name: "b" }, { name: "c" }],
          }),
          "goblindle_v3_weekly_2026-09-25": JSON.stringify({
            isOver: true,
            isWon: true,
            guesses: [{ name: "x" }, { name: "y" }],
          }),
          "goblindle_v3_weekly_2026-10-02": JSON.stringify({
            isOver: true,
            isWon: false,
            guesses: [{ name: "p" }, { name: "q" }],
          }),
          "goblindle_v3_weekly_2026-10-09": JSON.stringify({
            isOver: true,
            isWon: false,
            guesses: [{ name: "m" }],
          }),
        };
        return payloads[key] ?? null;
      },
    };

    expect(summarizeWeeklyPerformance(storage, "2026-10-16")).toEqual({
      playedWeeklyGames: 4,
      totals: [0, 1, 1, 0, 0, 0, 2],
      max: 2,
    });
  });

  it("treats a started-but-unfinished past week as a failure", () => {
    const storage = {
      length: 3,
      key(index) {
        return [
          "goblindle_v3_weekly_2026-09-17",
          "goblindle_v3_weekly_2026-09-25",
          "goblindle_v3_weekly_2026-10-02",
        ][index] ?? null;
      },
      getItem(key) {
        const payloads = {
          "goblindle_v3_weekly_2026-09-17": JSON.stringify({
            isOver: false,
            guesses: [{ name: "a" }],
          }),
          "goblindle_v3_weekly_2026-09-25": JSON.stringify({
            isOver: true,
            isWon: true,
            guesses: [{ name: "x" }],
          }),
          "goblindle_v3_weekly_2026-10-02": JSON.stringify({
            isOver: true,
            isWon: false,
            guesses: [{ name: "p" }, { name: "q" }],
          }),
        };
        return payloads[key] ?? null;
      },
    };

    expect(summarizeWeeklyPerformance(storage, "2026-10-09")).toEqual({
      playedWeeklyGames: 3,
      totals: [1, 0, 0, 0, 0, 0, 2],
      max: 2,
    });
  });
});
