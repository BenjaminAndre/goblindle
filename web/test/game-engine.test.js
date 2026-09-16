import { describe, expect, it } from "vitest";
import {
  clearExpiredCache,
  clearUnlimitedState,
  createGame,
  getOrCreateUnlimitedSeed,
  loadUnlimitedStats,
  saveUnlimitedStats,
  submitGuess,
} from "$lib/game-engine";
import { GOBELINS, OMBRES } from "./fixtures/campaigns";

/** Minimal stand-in for compareCampaigns — the engine only stores what this returns. */
const compareFn = (guess, target) => [
  { key: "name", result: guess.name === target.name ? "correct" : "wrong" },
];

/** Synthesize a distinct non-target campaign. */
function other(name) {
  return { ...OMBRES, id: name, name };
}

function daily(overrides = {}) {
  return createGame({
    target: GOBELINS,
    compareFn,
    maxGuesses: 6,
    mode: "daily",
    seed: "2026-07-25",
    ...overrides,
  });
}

function unlimited(overrides = {}) {
  return createGame({
    target: GOBELINS,
    compareFn,
    maxGuesses: 0,
    mode: "unlimited",
    seed: "unlimited_123",
    ...overrides,
  });
}

describe("createGame", () => {
  it("starts empty and open", () => {
    const game = daily();
    expect(game.guesses).toEqual([]);
    expect(game.results).toEqual([]);
    expect(game.isOver).toBe(false);
    expect(game.isWon).toBe(false);
  });

  it("carries config through onto the game object", () => {
    expect(daily()).toMatchObject({
      target: GOBELINS,
      maxGuesses: 6,
      mode: "daily",
      seed: "2026-07-25",
    });
  });

  it("defaults to 6 guesses in daily mode when maxGuesses is omitted", () => {
    const game = createGame({ target: GOBELINS, compareFn });
    expect(game.maxGuesses).toBe(6);
    expect(game.mode).toBe("daily");
  });
});

describe("submitGuess", () => {
  it("appends the guess and its comparison result", () => {
    const game = submitGuess(daily(), OMBRES);
    expect(game.guesses).toEqual([OMBRES]);
    expect(game.results).toHaveLength(1);
  });

  it("does not mutate the game it was given", () => {
    const before = daily();
    submitGuess(before, OMBRES);
    expect(before.guesses).toHaveLength(0);
    expect(before.results).toHaveLength(0);
  });

  it("returns fresh array identities so reassignment is observable", () => {
    const before = daily();
    const after = submitGuess(before, OMBRES);
    expect(after).not.toBe(before);
    expect(after.guesses).not.toBe(before.guesses);
    expect(after.results).not.toBe(before.results);
  });

  it("rejects a duplicate guess with null", () => {
    const game = submitGuess(daily(), OMBRES);
    expect(submitGuess(game, OMBRES)).toBeNull();
  });

  it("rejects any guess once the game is over", () => {
    const game = submitGuess(daily(), GOBELINS);
    expect(game.isOver).toBe(true);
    expect(submitGuess(game, OMBRES)).toBeNull();
  });

  it("wins on the correct campaign", () => {
    expect(submitGuess(daily(), GOBELINS)).toMatchObject({
      isWon: true,
      isOver: true,
    });
  });

  it("still counts a win made with the final allowed guess", () => {
    let game = daily();
    for (const name of ["a", "b", "c", "d", "e"]) {
      game = submitGuess(game, other(name));
    }
    expect(game.isOver).toBe(false);

    game = submitGuess(game, GOBELINS);
    expect(game).toMatchObject({ isWon: true, isOver: true });
    expect(game.guesses).toHaveLength(6);
  });

  it("ends the game as a loss at maxGuesses wrong guesses", () => {
    let game = daily();
    for (const name of ["a", "b", "c", "d", "e", "f"]) {
      game = submitGuess(game, other(name));
    }
    expect(game).toMatchObject({ isOver: true, isWon: false });
    expect(game.guesses).toHaveLength(6);
  });

  it("never ends on guess count when maxGuesses is 0", () => {
    let game = unlimited();
    for (let i = 0; i < 10; i++) {
      game = submitGuess(game, other(`c${i}`));
    }
    expect(game.isOver).toBe(false);
    expect(game.guesses).toHaveLength(10);
  });
});

describe("persistence — storage key contract", () => {
  it("writes daily state to exactly goblindle_v1_daily_<seed>", () => {
    submitGuess(daily(), OMBRES);
    expect(localStorage.getItem("goblindle_v1_daily_2026-07-25")).not.toBeNull();
  });

  it("writes unlimited state to exactly goblindle_v1_unlimited_current", () => {
    submitGuess(unlimited(), OMBRES);
    expect(localStorage.getItem("goblindle_v1_unlimited_current")).not.toBeNull();
  });

  it("ignores the seed when keying unlimited state", () => {
    submitGuess(unlimited({ seed: "unlimited_999" }), OMBRES);
    expect(localStorage.getItem("goblindle_v1_unlimited_current")).not.toBeNull();
    expect(localStorage.getItem("goblindle_v1_unlimited_unlimited_999")).toBeNull();
  });

  it("stores the target name, guesses, results and flags", () => {
    submitGuess(daily(), OMBRES);
    const saved = JSON.parse(localStorage.getItem("goblindle_v1_daily_2026-07-25"));
    expect(saved).toMatchObject({
      targetName: "La Campagne des Gobelins",
      guesses: [OMBRES],
      isOver: false,
      isWon: false,
    });
    expect(saved.results).toHaveLength(1);
  });
});

describe("persistence — restore on createGame", () => {
  it("restores an in-progress game for the same target", () => {
    submitGuess(daily(), OMBRES);
    const restored = daily();
    expect(restored.guesses).toEqual([OMBRES]);
    expect(restored.results).toHaveLength(1);
  });

  it("restores the over and won flags", () => {
    submitGuess(daily(), GOBELINS);
    expect(daily()).toMatchObject({ isOver: true, isWon: true });
  });

  it("discards saved state when the target changed — the date-rollover case", () => {
    submitGuess(daily(), OMBRES);
    const fresh = createGame({
      target: { ...OMBRES, name: "Une Autre Campagne" },
      compareFn,
      maxGuesses: 6,
      mode: "daily",
      seed: "2026-07-25",
    });
    expect(fresh.guesses).toEqual([]);
    expect(fresh.isOver).toBe(false);
  });

  it("starts fresh when storage holds malformed JSON", () => {
    localStorage.setItem("goblindle_v1_daily_2026-07-25", "{not json");
    expect(daily().guesses).toEqual([]);
  });

  /**
   * Results are recomputed rather than read back, so a restored game reflects
   * the current attribute list and the current campaign values — an edit to
   * campaigns.json cannot leave a player looking at arrows that contradict the
   * answer they are eventually shown.
   */
  it("recomputes results on restore instead of trusting the saved array", () => {
    submitGuess(daily(), OMBRES);

    const key = "goblindle_v1_daily_2026-07-25";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.results = [[{ key: "stale", result: "correct" }]];
    localStorage.setItem(key, JSON.stringify(saved));

    expect(daily().results).toEqual([compareFn(OMBRES, GOBELINS)]);
  });
});

describe("clearExpiredCache", () => {
  it("removes yesterday's daily entry but keeps today's", () => {
    localStorage.setItem("goblindle_v1_daily_2026-07-24", "{}");
    localStorage.setItem("goblindle_v1_daily_2026-07-25", "{}");

    clearExpiredCache("2026-07-25");

    expect(localStorage.getItem("goblindle_v1_daily_2026-07-24")).toBeNull();
    expect(localStorage.getItem("goblindle_v1_daily_2026-07-25")).not.toBeNull();
  });

  it("leaves unlimited keys untouched", () => {
    localStorage.setItem("goblindle_v1_unlimited_current", "{}");
    localStorage.setItem("goblindle_v1_unlimited_stats", "{}");
    localStorage.setItem("goblindle_v1_unlimited_seed", "s");

    clearExpiredCache("2026-07-25");

    expect(localStorage.getItem("goblindle_v1_unlimited_current")).not.toBeNull();
    expect(localStorage.getItem("goblindle_v1_unlimited_stats")).not.toBeNull();
    expect(localStorage.getItem("goblindle_v1_unlimited_seed")).not.toBeNull();
  });

  it("removes every stale daily entry, not just the first", () => {
    localStorage.setItem("goblindle_v1_daily_2026-07-20", "{}");
    localStorage.setItem("goblindle_v1_daily_2026-07-21", "{}");
    localStorage.setItem("goblindle_v1_daily_2026-07-22", "{}");

    clearExpiredCache("2026-07-25");

    expect(localStorage.length).toBe(0);
  });

  it("ignores unrelated keys", () => {
    localStorage.setItem("unrelated", "keep");
    clearExpiredCache("2026-07-25");
    expect(localStorage.getItem("unrelated")).toBe("keep");
  });

  /**
   * The sweep only ever covered its own prefix, so state written before the
   * rename would have sat in localStorage forever. It has to go: a saved
   * results array from the champion schema has a different column count and
   * would overflow the guess grid if it were ever restored.
   */
  it("sweeps keys left by earlier versions", () => {
    localStorage.setItem("loldle_daily_2026-07-25", "{}");
    localStorage.setItem("loldle_unlimited_current", "{}");
    localStorage.setItem("loldle_unlimited_stats", "{}");

    clearExpiredCache("2026-07-25");

    expect(localStorage.length).toBe(0);
  });
});

describe("unlimited seed", () => {
  it("creates and persists a seed on first call", () => {
    const seed = getOrCreateUnlimitedSeed();
    expect(seed).toMatch(/^unlimited_/);
    expect(localStorage.getItem("goblindle_v1_unlimited_seed")).toBe(seed);
  });

  it("returns the same seed on subsequent calls", () => {
    expect(getOrCreateUnlimitedSeed()).toBe(getOrCreateUnlimitedSeed());
  });

  it("clearUnlimitedState drops both the seed and the current game", () => {
    submitGuess(unlimited(), OMBRES);
    getOrCreateUnlimitedSeed();

    clearUnlimitedState();

    expect(localStorage.getItem("goblindle_v1_unlimited_current")).toBeNull();
    expect(localStorage.getItem("goblindle_v1_unlimited_seed")).toBeNull();
  });

  it("clearUnlimitedState preserves accumulated stats", () => {
    localStorage.setItem("goblindle_v1_unlimited_stats", '{"gamesPlayed":3}');
    clearUnlimitedState();
    expect(loadUnlimitedStats().gamesPlayed).toBe(3);
  });
});

describe("saveUnlimitedStats", () => {
  /**
   * Play an unlimited game to completion; `won` picks the ending.
   * Clears saved state first, mirroring handleNewGame — otherwise createGame
   * restores the previous finished game and submitGuess refuses to run.
   */
  function finish(won, wrongGuesses = 0) {
    clearUnlimitedState();
    let game = unlimited();
    for (let i = 0; i < wrongGuesses; i++) {
      game = submitGuess(game, other(`c${i}`));
    }
    if (won) game = submitGuess(game, GOBELINS);
    else game = { ...game, isOver: true };
    return game;
  }

  it("counts a played game", () => {
    saveUnlimitedStats(finish(false));
    expect(loadUnlimitedStats().gamesPlayed).toBe(1);
  });

  it("counts a win and records its guess count", () => {
    saveUnlimitedStats(finish(true, 2));
    expect(loadUnlimitedStats()).toMatchObject({
      gamesPlayed: 1,
      gamesWon: 1,
      guessDistribution: { 3: 1 },
    });
  });

  it("does not count a win when the game was lost", () => {
    saveUnlimitedStats(finish(false));
    expect(loadUnlimitedStats()).toMatchObject({
      gamesPlayed: 1,
      gamesWon: 0,
      guessDistribution: {},
    });
  });

  it("accumulates across games", () => {
    saveUnlimitedStats(finish(true, 1));
    saveUnlimitedStats(finish(true, 1));
    saveUnlimitedStats(finish(false));

    expect(loadUnlimitedStats()).toMatchObject({
      gamesPlayed: 3,
      gamesWon: 2,
      guessDistribution: { 2: 2 },
    });
  });

  it("stamps lastPlayed", () => {
    saveUnlimitedStats(finish(true, 0));
    expect(typeof loadUnlimitedStats().lastPlayed).toBe("number");
  });

  it("is a no-op for daily mode", () => {
    const game = submitGuess(daily(), GOBELINS);
    saveUnlimitedStats(game);
    expect(localStorage.getItem("goblindle_v1_unlimited_stats")).toBeNull();
  });

  it("is a no-op for an unfinished game", () => {
    saveUnlimitedStats(submitGuess(unlimited(), OMBRES));
    expect(localStorage.getItem("goblindle_v1_unlimited_stats")).toBeNull();
  });
});

describe("loadUnlimitedStats", () => {
  it("returns zeroed stats when nothing is stored", () => {
    expect(loadUnlimitedStats()).toEqual({
      gamesPlayed: 0,
      gamesWon: 0,
      guessDistribution: {},
      lastPlayed: null,
    });
  });

  it("returns zeroed stats when storage holds malformed JSON", () => {
    localStorage.setItem("goblindle_v1_unlimited_stats", "not json at all");
    expect(loadUnlimitedStats()).toMatchObject({
      gamesPlayed: 0,
      gamesWon: 0,
    });
  });
});
