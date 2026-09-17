// Mode-agnostic game state machine with localStorage persistence

const STORAGE_KEY_PREFIX = "goblindle_v3_";
/**
 * Prefixes from earlier versions, swept on load so their state can never be
 * restored. v0.3 drops backward compatibility outright: games in progress and
 * unlimited statistics from v0.1 and v0.2 are discarded on first load.
 */
const STALE_KEY_PREFIXES = ["loldle_", "goblindle_v1_"];
const UNLIMITED_SEED_KEY = `${STORAGE_KEY_PREFIX}unlimited_seed`;

/**
 * Create a new game instance
 * @param {Object} config
 * @param {Object} config.target - Target campaign to guess
 * @param {Function} config.compareFn - (guess, target) => comparison results
 * @param {number} config.maxGuesses - Max allowed guesses; the game stops once this count is reached.
 * @param {string} config.mode - "weekly" or "unlimited"
 * @param {string} config.seed - Seed string for mode
 */
export function createGame(config) {
  const { target, compareFn, maxGuesses = 6, mode = "weekly", seed = "" } = config;

  // Try to restore saved state
  const saved = loadState(mode, seed);
  if (saved && saved.targetName === target.name) {
    return {
      target,
      compareFn,
      maxGuesses,
      mode,
      seed,
      guesses: saved.guesses,
      // Recomputed rather than restored: a saved results array was built against
      // whatever CLASSIC_ATTRIBUTES looked like when it was written, and against
      // the campaign values as they read at that moment.
      results: saved.guesses.map((g) => compareFn(g, target)),
      isOver: saved.isOver,
      isWon: saved.isWon,
    };
  }

  return {
    target,
    compareFn,
    maxGuesses,
    mode,
    seed,
    guesses: [],
    results: [],
    isOver: false,
    isWon: false,
  };
}

/** Submit a guess and return updated game state (immutable) */
export function submitGuess(game, campaign) {
  if (game.isOver) return null;
  if (game.guesses.some((g) => g.name === campaign.name)) return null;

  const result = game.compareFn(campaign, game.target);
  const guesses = [...game.guesses, campaign];
  const results = [...game.results, result];

  let isWon = false;
  let isOver = false;

  if (campaign.name === game.target.name) {
    isWon = true;
    isOver = true;
  } else if (game.maxGuesses > 0 && guesses.length >= game.maxGuesses) {
    isOver = true;
  }

  const updated = { ...game, guesses, results, isWon, isOver };
  saveState(updated);
  return updated;
}

/** Get or create a persistent seed for unlimited mode */
export function getOrCreateUnlimitedSeed() {
  try {
    const saved = localStorage.getItem(UNLIMITED_SEED_KEY);
    if (saved) return saved;
  } catch {
    // Ignore
  }
  return createNewUnlimitedSeed();
}

/** Create and persist a new unlimited seed */
function createNewUnlimitedSeed() {
  const seed = `unlimited_${Date.now()}_${Math.random()}`;
  try {
    localStorage.setItem(UNLIMITED_SEED_KEY, seed);
  } catch {
    // Ignore
  }
  return seed;
}

/** Clear unlimited mode saved state (for new game) */
export function clearUnlimitedState() {
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}unlimited_current`);
    localStorage.removeItem(UNLIMITED_SEED_KEY);
  } catch {
    // Ignore
  }
}

/** Save unlimited mode stats */
export function saveUnlimitedStats(game) {
  if (game.mode !== "unlimited" || !game.isOver) return;

  const key = `${STORAGE_KEY_PREFIX}unlimited_stats`;
  let stats;
  try {
    stats = JSON.parse(localStorage.getItem(key)) || createEmptyStats();
  } catch {
    stats = createEmptyStats();
  }

  stats.gamesPlayed++;
  if (game.isWon) {
    stats.gamesWon++;
    const guessCount = game.guesses.length;
    stats.guessDistribution[guessCount] = (stats.guessDistribution[guessCount] || 0) + 1;
  }
  stats.lastPlayed = Date.now();

  try {
    localStorage.setItem(key, JSON.stringify(stats));
  } catch {
    // Ignore
  }
}

/** Load unlimited stats */
export function loadUnlimitedStats() {
  try {
    return JSON.parse(localStorage.getItem(`${STORAGE_KEY_PREFIX}unlimited_stats`)) || createEmptyStats();
  } catch {
    return createEmptyStats();
  }
}

function createEmptyStats() {
  return { gamesPlayed: 0, gamesWon: 0, guessDistribution: {}, lastPlayed: null };
}

function saveState(game) {
  const key = getStorageKey(game.mode, game.seed);
  const data = {
    targetName: game.target.name,
    guesses: game.guesses,
    results: game.results,
    isOver: game.isOver,
    isWon: game.isWon,
    timestamp: Date.now(),
  };
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore
  }
}

function loadState(mode, seed) {
  const key = getStorageKey(mode, seed);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Whether a past period was started and never finished.
 *
 * saveState only ever runs from submitGuess, so a key existing at all means at
 * least one guess was made — an unfinished one is an abandoned week.
 *
 * Must be called BEFORE clearExpiredCache, which deletes precisely the keys
 * this reads. That ordering is the whole subtlety.
 */
export function hasAbandonedPeriod(currentSeed) {
  try {
    const currentKey = `${STORAGE_KEY_PREFIX}weekly_${currentSeed}`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (!key.startsWith(`${STORAGE_KEY_PREFIX}weekly_`)) continue;
      if (key === currentKey) continue;

      try {
        const saved = JSON.parse(localStorage.getItem(key));
        if (saved && !saved.isOver) return true;
      } catch {
        // A corrupt entry says nothing about whether the week was finished.
      }
    }
  } catch {
    // Ignore
  }
  return false;
}

/** Remove past periods from localStorage (keeps only the current one) */
export function clearExpiredCache(currentSeed) {
  try {
    const currentKey = `${STORAGE_KEY_PREFIX}weekly_${currentSeed}`;
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const isPastPeriod =
        key.startsWith(`${STORAGE_KEY_PREFIX}weekly_`) && key !== currentKey;
      // Retired key shapes go too — the sweep only ever covered its own, so
      // anything written before a rename would sit in localStorage forever.
      const isLegacy = STALE_KEY_PREFIXES.some((p) => key.startsWith(p));
      if (isPastPeriod || isLegacy) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore
  }
}

/**
 * Unlimited is the special case, and it is the one named explicitly.
 *
 * The polarity matters: with the seeded branch as the fallthrough, an unknown
 * mode gets its own key. The other way round it would land on
 * unlimited_current, silently sharing state with the unlimited game and being
 * wiped by clearUnlimitedState — which reads as "my progress vanishes
 * sometimes", not as a crash.
 */
function getStorageKey(mode, seed) {
  if (mode === "unlimited") return `${STORAGE_KEY_PREFIX}unlimited_current`;
  return `${STORAGE_KEY_PREFIX}weekly_${seed}`;
}
