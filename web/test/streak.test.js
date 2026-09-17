import { describe, expect, it } from "vitest";
import {
  breakStreak,
  emptyStreak,
  nextStreak,
  streakMessage,
  streakTiers,
} from "$lib/streak";

describe("nextStreak — first result ever", () => {
  it("starts at 1 on a win", () => {
    expect(nextStreak(null, 29, true)).toMatchObject({ current: 1, lastPeriod: 29 });
  });

  it("starts at 0 on a loss", () => {
    expect(nextStreak(null, 29, false)).toMatchObject({ current: 0, lastPeriod: 29 });
  });

  it("treats an empty streak the same as no streak", () => {
    expect(nextStreak(emptyStreak(), 29, true)).toMatchObject({ current: 1, lastPeriod: 29 });
  });

  /**
   * getCurrentPeriod genuinely returns negative indices before the 2026 anchor.
   * Branching on `periodIndex <= state.lastPeriod` against a null lastPeriod
   * would coerce to `<= 0` and silently refuse to record any of them.
   */
  it("records a negative period index", () => {
    expect(nextStreak(emptyStreak(), -3, true)).toMatchObject({ current: 1, lastPeriod: -3 });
    expect(nextStreak(null, -3, true)).toMatchObject({ current: 1, lastPeriod: -3 });
  });

  it("survives a malformed stored state", () => {
    expect(nextStreak({ current: 5 }, 29, true)).toMatchObject({ current: 1, lastPeriod: 29 });
    expect(nextStreak({ current: 5, lastPeriod: "29" }, 29, true)).toMatchObject({
      current: 1,
      lastPeriod: 29,
    });
  });
});

describe("nextStreak — running", () => {
  it("increments on a consecutive win", () => {
    const state = { current: 3, lastPeriod: 29 };
    expect(nextStreak(state, 30, true)).toMatchObject({ current: 4, lastPeriod: 30 });
  });

  it("resets to 0 on a loss", () => {
    const state = { current: 12, lastPeriod: 29 };
    expect(nextStreak(state, 30, false)).toMatchObject({ current: 0, lastPeriod: 30 });
  });

  it("restarts at 1 on the win after a loss", () => {
    const state = { current: 0, lastPeriod: 29 };
    expect(nextStreak(state, 30, true)).toMatchObject({ current: 1, lastPeriod: 30 });
  });
});

/**
 * The freeze rule: missing a Thursday costs nothing. Only losing, or
 * abandoning a week that was started, breaks a run.
 */
describe("nextStreak — skipped weeks freeze rather than break", () => {
  it("keeps counting across a one-week gap", () => {
    const state = { current: 4, lastPeriod: 29 };
    expect(nextStreak(state, 31, true)).toMatchObject({ current: 5, lastPeriod: 31 });
  });

  it("keeps counting across a long gap", () => {
    const state = { current: 4, lastPeriod: 29 };
    expect(nextStreak(state, 60, true)).toMatchObject({ current: 5, lastPeriod: 60 });
  });
});

describe("nextStreak — replays and bad clocks", () => {
  it("is idempotent for the same period", () => {
    const state = { current: 3, lastPeriod: 29 };
    const once = nextStreak(state, 29, true);
    expect(once).toEqual(state);
    expect(nextStreak(once, 29, true)).toEqual(state);
  });

  it("does not re-record a period that is already the last one, even on a loss", () => {
    const state = { current: 7, lastPeriod: 29 };
    expect(nextStreak(state, 29, false)).toEqual(state);
  });

  it("ignores a period index from before the last recorded one", () => {
    const state = { current: 7, lastPeriod: 29 };
    expect(nextStreak(state, 12, true)).toEqual(state);
    expect(nextStreak(state, 12, false)).toEqual(state);
  });
});

/**
 * `previous` is persisted alongside the count, not just returned: on a loss it
 * is the only number worth saying, and without it a reload would forget which
 * run had just been broken.
 */
describe("nextStreak — previous count", () => {
  it("carries the count from before the fold, so a loss can name what was lost", () => {
    const folded = nextStreak({ current: 12, lastPeriod: 29 }, 30, false);
    expect(folded.current).toBe(0);
    expect(folded.previous).toBe(12);
  });

  it("carries it on a win too", () => {
    expect(nextStreak({ current: 4, lastPeriod: 29 }, 30, true).previous).toBe(4);
  });

  it("is 0 for a first-ever result", () => {
    expect(nextStreak(null, 29, true).previous).toBe(0);
  });

  it("survives a round trip through emptyStreak", () => {
    expect(emptyStreak().previous).toBe(0);
  });
});

describe("breakStreak", () => {
  it("zeroes a running streak without advancing the period", () => {
    expect(breakStreak({ current: 9, lastPeriod: 29 })).toEqual({
      current: 0,
      lastPeriod: 29,
    });
  });

  it("leaves an already-zero streak alone", () => {
    const state = { current: 0, lastPeriod: 29 };
    expect(breakStreak(state)).toBe(state);
  });

  it("copes with no stored state", () => {
    expect(breakStreak(null)).toEqual(emptyStreak());
  });
});

describe("streakTiers", () => {
  it("is sorted descending with no duplicate thresholds", () => {
    const mins = streakTiers().map((t) => t.min);
    expect(mins).toEqual([...mins].sort((a, b) => b - a));
    expect(new Set(mins).size).toBe(mins.length);
  });

  it("covers every streak from 1 upward", () => {
    const tiers = streakTiers();
    for (let n = 1; n <= 250; n++) {
      expect(tiers.find((t) => n >= t.min)).toBeDefined();
    }
  });
});

describe("streakMessage — wins", () => {
  function win(current) {
    return streakMessage({ current, previous: current - 1, isWon: true });
  }

  it("stays singular at one week", () => {
    expect(win(1)).toContain("1 semaine d'affilée");
    expect(win(1)).not.toContain("semaines");
  });

  it("pluralises from two", () => {
    expect(win(2)).toContain("2 semaines d'affilée");
  });

  it("says nothing extra below the first tier", () => {
    expect(win(1)).toBe("1 semaine d'affilée.");
  });

  it("changes message at each threshold", () => {
    for (const min of streakTiers().map((t) => t.min)) {
      if (min === 1) continue;
      expect(win(min)).not.toBe(win(min - 1));
    }
  });

  it("keeps the same message between thresholds", () => {
    expect(win(10).slice(win(10).indexOf("."))).toBe(
      win(14).slice(win(14).indexOf(".")),
    );
  });

  it("always leads with the count", () => {
    for (const n of [1, 9, 10, 15, 20, 50, 100, 200, 500]) {
      expect(win(n).startsWith(`${n} semaine`)).toBe(true);
    }
  });
});

describe("streakMessage — losses", () => {
  it("names the run that just ended", () => {
    const msg = streakMessage({ current: 0, previous: 12, isWon: false });
    expect(msg).toContain("12 semaines");
  });

  it("does not dwell on a run of one", () => {
    expect(streakMessage({ current: 0, previous: 1, isWon: false })).toBe(
      "Série interrompue.",
    );
    expect(streakMessage({ current: 0, previous: 0, isWon: false })).toBe(
      "Série interrompue.",
    );
  });

  it("names a run of exactly two", () => {
    expect(streakMessage({ current: 0, previous: 2, isWon: false })).toContain(
      "2 semaines",
    );
  });
});
