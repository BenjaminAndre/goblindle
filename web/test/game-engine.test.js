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

function weekly(overrides = {}) {
  return createGame({
    target: GOBELINS,
    compareFn,
    maxGuesses: 6,
    mode: "weekly",
    seed: "2026-07-23",
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
    const game = weekly();
    expect(game.guesses).toEqual([]);
    expect(game.results).toEqual([]);
    expect(game.isOver).toBe(false);
    expect(game.isWon).toBe(false);
  });

  it("carries config through onto the game object", () => {
    expect(weekly()).toMatchObject({
      target: GOBELINS,
      maxGuesses: 6,
      mode: "weekly",
      seed: "2026-07-23",
    });
  });

  it("defaults to 6 guesses in weekly mode when maxGuesses is omitted", () => {
    const game = createGame({ target: GOBELINS, compareFn });
    expect(game.maxGuesses).toBe(6);
    expect(game.mode).toBe("weekly");
  });
});

describe("submitGuess", () => {
  it("appends the guess and its comparison result", () => {
    const game = submitGuess(weekly(), OMBRES);
    expect(game.guesses).toEqual([OMBRES]);
    expect(game.results).toHaveLength(1);
  });

  it("does not mutate the game it was given", () => {
    const before = weekly();
    submitGuess(before, OMBRES);
    expect(before.guesses).toHaveLength(0);
    expect(before.results).toHaveLength(0);
  });

  it("returns fresh array identities so reassignment is observable", () => {
    const before = weekly();
    const after = submitGuess(before, OMBRES);
    expect(after).not.toBe(before);
    expect(after.guesses).not.toBe(before.guesses);
    expect(after.results).not.toBe(before.results);
  });

  it("rejects a duplicate guess with null", () => {
    const game = submitGuess(weekly(), OMBRES);
    expect(submitGuess(game, OMBRES)).toBeNull();
  });

  it("rejects any guess once the game is over", () => {
    const game = submitGuess(weekly(), GOBELINS);
    expect(game.isOver).toBe(true);
    expect(submitGuess(game, OMBRES)).toBeNull();
  });

  it("wins on the correct campaign", () => {
    expect(submitGuess(weekly(), GOBELINS)).toMatchObject({
      isWon: true,
      isOver: true,
    });
  });

  it("still counts a win made with the final allowed guess", () => {
    let game = weekly();
    for (const name of ["a", "b", "c", "d", "e"]) {
      game = submitGuess(game, other(name));
    }
    expect(game.isOver).toBe(false);

    game = submitGuess(game, GOBELINS);
    expect(game).toMatchObject({ isWon: true, isOver: true });
    expect(game.guesses).toHaveLength(6);
  });

  it("ends the game as a loss at maxGuesses wrong guesses", () => {
    let game = weekly();
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
  it("writes weekly state to exactly goblindle_v1_weekly_<seed>", () => {
    submitGuess(weekly(), OMBRES);
    expect(localStorage.getItem("goblindle_v1_weekly_2026-07-23")).not.toBeNull();
  });

  it("writes unlimited state to exactly goblindle_v1_unlimited_current", () => {
    submitGuess(unlimited(), OMBRES);
    expect(localStorage.getItem("goblindle_v1_unlimited_current")).not.toBeNull();
  });

  /**
   * The seeded branch is the fallthrough on purpose. The other polarity would
   * send an unrecognised mode to unlimited_current, where it silently shares
   * state with the unlimited game and gets wiped by clearUnlimitedState — a bug
   * that reads as "my progress sometimes vanishes" rather than as a crash.
   */
  it("gives an unknown mode its own key rather than the unlimited one", () => {
    submitGuess(weekly({ mode: "bogus", seed: "x" }), OMBRES);
    expect(localStorage.getItem("goblindle_v1_unlimited_current")).toBeNull();
    expect(localStorage.getItem("goblindle_v1_weekly_x")).not.toBeNull();
  });

  it("ignores the seed when keying unlimited state", () => {
    submitGuess(unlimited({ seed: "unlimited_999" }), OMBRES);
    expect(localStorage.getItem("goblindle_v1_unlimited_current")).not.toBeNull();
    expect(localStorage.getItem("goblindle_v1_unlimited_unlimited_999")).toBeNull();
  });

  it("stores the target name, guesses, results and flags", () => {
    submitGuess(weekly(), OMBRES);
    const saved = JSON.parse(localStorage.getItem("goblindle_v1_weekly_2026-07-23"));
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
    submitGuess(weekly(), OMBRES);
    const restored = weekly();
    expect(restored.guesses).toEqual([OMBRES]);
    expect(restored.results).toHaveLength(1);
  });

  it("restores the over and won flags", () => {
    submitGuess(weekly(), GOBELINS);
    expect(weekly()).toMatchObject({ isOver: true, isWon: true });
  });

  it("discards saved state when the target changed — the period-rollover case", () => {
    submitGuess(weekly(), OMBRES);
    const fresh = createGame({
      target: { ...OMBRES, name: "Une Autre Campagne" },
      compareFn,
      maxGuesses: 6,
      mode: "weekly",
      seed: "2026-07-23",
    });
    expect(fresh.guesses).toEqual([]);
    expect(fresh.isOver).toBe(false);
  });

  it("starts fresh when storage holds malformed JSON", () => {
    localStorage.setItem("goblindle_v1_weekly_2026-07-23", "{not json");
    expect(weekly().guesses).toEqual([]);
  });

  /**
   * Results are recomputed rather than read back, so a restored game reflects
   * the current attribute list and the current campaign values — an edit to
   * campaigns.json cannot leave a player looking at arrows that contradict the
   * answer they are eventually shown.
   */
  it("recomputes results on restore instead of trusting the saved array", () => {
    submitGuess(weekly(), OMBRES);

    const key = "goblindle_v1_weekly_2026-07-23";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.results = [[{ key: "stale", result: "correct" }]];
    localStorage.setItem(key, JSON.stringify(saved));

    expect(weekly().results).toEqual([compareFn(OMBRES, GOBELINS)]);
  });
});

describe("clearExpiredCache", () => {
  it("removes a past period but keeps the current one", () => {
    localStorage.setItem("goblindle_v1_weekly_2026-07-16", "{}");
    localStorage.setItem("goblindle_v1_weekly_2026-07-23", "{}");

    clearExpiredCache("2026-07-23");

    expect(localStorage.getItem("goblindle_v1_weekly_2026-07-16")).toBeNull();
    expect(localStorage.getItem("goblindle_v1_weekly_2026-07-23")).not.toBeNull();
  });

  it("leaves unlimited keys untouched", () => {
    localStorage.setItem("goblindle_v1_unlimited_current", "{}");
    localStorage.setItem("goblindle_v1_unlimited_stats", "{}");
    localStorage.setItem("goblindle_v1_unlimited_seed", "s");

    clearExpiredCache("2026-07-23");

    expect(localStorage.getItem("goblindle_v1_unlimited_current")).not.toBeNull();
    expect(localStorage.getItem("goblindle_v1_unlimited_stats")).not.toBeNull();
    expect(localStorage.getItem("goblindle_v1_unlimited_seed")).not.toBeNull();
  });

  it("removes every past period, not just the first", () => {
    localStorage.setItem("goblindle_v1_weekly_2026-07-02", "{}");
    localStorage.setItem("goblindle_v1_weekly_2026-07-09", "{}");
    localStorage.setItem("goblindle_v1_weekly_2026-07-16", "{}");

    clearExpiredCache("2026-07-23");

    expect(localStorage.length).toBe(0);
  });

  it("ignores unrelated keys", () => {
    localStorage.setItem("unrelated", "keep");
    clearExpiredCache("2026-07-23");
    expect(localStorage.getItem("unrelated")).toBe("keep");
  });

  /**
   * The sweep only ever covered its own prefix, so state written before the
   * rename would have sat in localStorage forever. It has to go: a saved
   * results array from the champion schema has a different column count and
   * would overflow the guess grid if it were ever restored.
   */
  it("sweeps keys left by earlier versions", () => {
    localStorage.setItem("loldle_daily_2026-07-23", "{}");
    localStorage.setItem("loldle_unlimited_current", "{}");
    localStorage.setItem("loldle_unlimited_stats", "{}");

    clearExpiredCache("2026-07-23");

    expect(localStorage.length).toBe(0);
  });

  /**
   * The retired shape has to go while the unlimited keys stay: a saved results
   * array from the daily schema was built against a different rotation, and the
   * bluntest way to retire it — bumping the shared prefix — would take
   * unlimited_stats and unlimited_seed down with it.
   */
  it("sweeps the retired daily shape without touching unlimited state", () => {
    localStorage.setItem("goblindle_v1_daily_2026-07-23", "{}");
    localStorage.setItem("goblindle_v1_unlimited_seed", "s");
    localStorage.setItem("goblindle_v1_unlimited_stats", "{}");

    clearExpiredCache("2026-07-23");

    expect(localStorage.getItem("goblindle_v1_daily_2026-07-23")).toBeNull();
    expect(localStorage.getItem("goblindle_v1_unlimited_seed")).not.toBeNull();
    expect(localStorage.getItem("goblindle_v1_unlimited_stats")).not.toBeNull();
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

  it("is a no-op for weekly mode", () => {
    const game = submitGuess(weekly(), GOBELINS);
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
