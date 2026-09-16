// Weekly streak: consecutive periods won.
//
// Skipping a week does nothing — the streak freezes rather than breaking, so
// missing a Thursday costs nothing. Losing breaks it, and so does abandoning a
// week that was started, which is what stops a player protecting a run by
// quitting at five guesses.

const STORAGE_KEY = "goblindle_v3_streak";

/**
 * Descending, so the first match wins. A table rather than an if-chain because
 * the thresholds are then assertable as data.
 */
const TIERS = [
  { min: 200, text: "Quatre ans. Il faut nous dire comment vous faites." },
  { min: 100, text: "Deux ans. Personne ne vérifie, mais quand même." },
  { min: 50, text: "Presque un an." },
  { min: 20, text: "Plus d'une rotation complète sans faute." },
  { min: 15, text: "Bientôt une rotation complète." },
  { min: 10, text: "Ça commence à se voir." },
  { min: 1, text: null },
];

/** The rule is not guessable from the numbers, so the panel states it. */
export const STREAK_RULE =
  "Passer une semaine ne casse pas la série ; abandonner une partie commencée, si.";

/**
 * Fold one finished period into the streak.
 *
 * The `<=` guard does three jobs at once: reloading a finished week cannot
 * increment twice, the same period cannot be counted twice, and a clock set
 * backwards cannot rewrite history.
 *
 * The first branch tests the *shape* of `lastPeriod`, never `periodIndex <=
 * state.lastPeriod` against a nullable — `<= null` coerces to `<= 0` and would
 * silently refuse every negative index, which getCurrentPeriod really does
 * return before the anchor.
 */
export function nextStreak(state, periodIndex, isWon) {
  if (!state || !Number.isInteger(state.lastPeriod)) {
    return { current: isWon ? 1 : 0, lastPeriod: periodIndex, previous: 0 };
  }

  if (periodIndex <= state.lastPeriod) return state;

  // No gap check on purpose: skipped weeks freeze the streak.
  return {
    current: isWon ? state.current + 1 : 0,
    lastPeriod: periodIndex,
    // Persisted, not just returned: on a loss it is the only interesting
    // number, and without it a reload would forget what was broken.
    previous: state.current,
  };
}

/** A started-but-unfinished week breaks the streak without advancing it. */
export function breakStreak(state) {
  if (!state || state.current === 0) return state ?? emptyStreak();
  return { ...state, current: 0 };
}

export function emptyStreak() {
  return { current: 0, lastPeriod: null, previous: 0 };
}

/**
 * The message under the result.
 *
 * `previous` matters on a loss: the new streak is 0, which carries no
 * information — the thing worth saying is what was just lost.
 */
export function streakMessage({ current, previous, isWon }) {
  if (!isWon) {
    return previous >= 2
      ? `Votre série de ${previous} semaines s'arrête là.`
      : "Série interrompue.";
  }

  // French pluralises from 2, so 1 stays singular.
  const count = `${current} semaine${current > 1 ? "s" : ""} d'affilée`;
  const tier = TIERS.find((t) => current >= t.min);
  if (!tier || !tier.text) return `${count}.`;
  return `${count}. ${tier.text}`;
}

/** Exposed so a test can assert the table is sorted and gap-free. */
export function streakTiers() {
  return TIERS.map((t) => ({ ...t }));
}

export function loadStreak() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStreak();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return emptyStreak();
    return {
      current: Number.isInteger(parsed.current) ? parsed.current : 0,
      lastPeriod: Number.isInteger(parsed.lastPeriod) ? parsed.lastPeriod : null,
      previous: Number.isInteger(parsed.previous) ? parsed.previous : 0,
    };
  } catch {
    return emptyStreak();
  }
}

export function saveStreak(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore
  }
}
