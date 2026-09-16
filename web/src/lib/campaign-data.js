// Data layer: load, normalise, search, and select campaigns

import { asset, base } from "$app/paths";

let campaigns = [];
let loadPromise = null;

/**
 * French articles and prepositions, skipped when deriving placeholder initials
 * so "Le Trône de Cendres" reads as "TC" rather than "LT".
 */
const INITIAL_STOP_WORDS = new Set([
  "la", "le", "les", "un", "une", "des", "du", "de", "d", "l",
  "et", "au", "aux", "the", "of",
]);

/**
 * Fetch, normalise, and validate the campaign list (deduplicated).
 *
 * The file is authored by hand in `static/campaigns.json` with one nested
 * `{ value, notes? }` object per field; `normalise` flattens that into the
 * shape the rest of the app reads.
 */
export async function loadCampaigns() {
  if (campaigns.length > 0) return campaigns;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const response = await fetch(asset("/campaigns.json"));
    if (!response.ok) {
      loadPromise = null;
      throw new Error(`Failed to load campaigns: ${response.status}`);
    }

    try {
      const raw = await response.json();
      // Checked before .map so a hand-edit that yields an object reports the
      // real problem rather than "raw.map is not a function".
      if (!Array.isArray(raw)) throw new Error("campaigns.json must be an array");
      campaigns = validate(raw.map((entry) => normalise(entry)));
    } catch (err) {
      loadPromise = null;
      throw err;
    }
    return campaigns;
  })();

  return loadPromise;
}

/**
 * Flatten one authored entry. Deliberately generic — it walks whatever keys the
 * file contains rather than naming them, so adding a field to campaigns.json
 * and to CLASSIC_ATTRIBUTES is the whole change.
 *
 * `value` is taken verbatim, including 0 and "", which are legitimate answers
 * (a campaign really can have zero deaths). Only a genuinely absent value
 * becomes null.
 */
function normalise(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Campaign entry must be an object");
  }

  const notes = {};
  const flat = {};

  for (const [key, field] of Object.entries(raw)) {
    const wrapped =
      field && typeof field === "object" && !Array.isArray(field)
        ? field
        : { value: field };

    flat[key] = wrapped.value ?? null;
    // An absent `notes` and an empty one are the same thing: no bubble.
    if (Array.isArray(wrapped.notes) && wrapped.notes.length) {
      notes[key] = wrapped.notes;
    }
  }

  if (typeof flat.campaign !== "string" || !flat.campaign.trim()) {
    throw new Error(
      `Campaign entry is missing a "campaign" name: ${JSON.stringify(raw).slice(0, 120)}`,
    );
  }

  flat.name = flat.campaign.trim();
  flat.id = slugify(flat.name);
  // Assigned last so an authored field literally named "notes" cannot clobber
  // the per-field map.
  flat.notes = notes;

  return flat;
}

/**
 * Reject a payload the UI cannot survive.
 *
 * Duplicate ids are the dangerous case: Svelte throws `each_key_duplicate` on a
 * repeated keyed-each key, and because guesses are deduplicated by name, two
 * same-slug campaigns are both guessable — the board would break mid-game,
 * after the guess had already been persisted. Failing at load turns that into
 * an error the author sees instead of a player.
 */
function validate(list) {
  if (!list.length) throw new Error("campaigns.json is empty");

  const seenIds = new Map();
  const seenNames = new Map();

  for (const campaign of list) {
    // Names first: two identical names also collide on id, and "duplicate name"
    // is the more useful thing to be told.
    if (seenNames.has(campaign.name.toLowerCase())) {
      throw new Error(`Duplicate campaign name "${campaign.name}"`);
    }
    const clash = seenIds.get(campaign.id);
    if (clash) {
      throw new Error(
        `Duplicate campaign id "${campaign.id}" — "${clash}" and "${campaign.name}" differ only by accents or punctuation; rename one`,
      );
    }
    seenIds.set(campaign.id, campaign.name);
    seenNames.set(campaign.name.toLowerCase(), campaign.name);
  }

  return list;
}

/** Accent-folding slug — without the NFD pass "L'Épée Brisée" becomes "l-p-e-bris-e". */
function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Filter campaigns for autocomplete (prefix-first, then substring) */
export function searchCampaigns(query, excludeNames = []) {
  if (!query) return [];
  const lower = query.toLowerCase();
  const excluded = new Set(excludeNames.map((n) => n.toLowerCase()));

  return campaigns
    .filter(
      (c) =>
        c.name.toLowerCase().includes(lower) &&
        !excluded.has(c.name.toLowerCase()),
    )
    .sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(lower) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(lower) ? 0 : 1;
      return aStarts - bStarts || a.name.localeCompare(b.name);
    })
    .slice(0, 8);
}

/**
 * The campaign for a rotation period, by its index (0, 1, 2, … one per week).
 *
 * A shuffled cycle rather than `hash(index) % n`: djb2 XORs the last character
 * last, so consecutive indices hash to adjacent values and the modulo preserves
 * that — at these list sizes the plain version walks straight down the file, a
 * different campaign each period but in file order. A cycle gives every
 * campaign exactly once per n periods, reshuffled each time around.
 *
 * The index must step by 1 for that to hold. Keying off a date instead, with a
 * weekly seed stepping by 7, would advance `cycle` mid-rotation and leave the
 * repeat guard in `cyclePermutation` permanently dead.
 */
export function getCampaignForPeriod(index) {
  if (!campaigns.length) return null;
  const n = campaigns.length;

  const cycle = Math.floor(index / n);
  // Euclidean, not `index % n`: a device whose clock is set before the anchor
  // gives a negative index, and campaigns[-3].name throws inside onMount, where
  // it surfaces as a data-loading error and sends you hunting a fetch bug.
  const pos = ((index % n) + n) % n;
  return campaigns[cyclePermutation(n, cycle)[pos]];
}

/**
 * The campaign for an arbitrary seed string, for unlimited mode.
 *
 * One well-mixed draw — no cycle, no repeat avoidance, because unlimited games
 * have no sequence to speak of.
 */
export function getCampaignForSeed(seed) {
  if (!campaigns.length) return null;
  return campaigns[fmix32(hashString(String(seed))) % campaigns.length];
}

/**
 * The order campaigns are drawn in during one cycle.
 *
 * Successive cycles are independent shuffles, so the campaign closing one could
 * open the next — the one repeat a cycle is supposed to rule out. When that
 * happens the opener is swapped with its neighbour.
 *
 * Positions 0 and 1, specifically, and not 0 and n-1: the fix has to leave the
 * last position alone. Otherwise the previous cycle's true last element is not
 * the one this function can see, the comparison below is against the wrong
 * value, and the repeat it exists to prevent slips through anyway.
 *
 * Below n = 3 there is no neighbour to swap with, and the identity order is
 * already the only repeat-free one.
 */
function cyclePermutation(n, cycle) {
  if (n < 3) return Array.from({ length: n }, (_, i) => i);

  const perm = shuffledIndices(n, `goblindle-cycle-${cycle}`);
  // At cycle 0 this asks for "goblindle-cycle--1". The double hyphen looks like
  // a bug and is not: it is a valid seed for a cycle that is simply never
  // drawn, so the comparison below is against a phantom. Deterministic, and
  // cheaper than special-casing the first cycle.
  const previous = shuffledIndices(n, `goblindle-cycle-${cycle - 1}`);
  if (perm[0] === previous[n - 1]) {
    [perm[0], perm[1]] = [perm[1], perm[0]];
  }
  return perm;
}

/** Fisher-Yates over [0..n), seeded so the permutation is reproducible. */
function shuffledIndices(n, seed) {
  const rand = mulberry32(fmix32(hashString(seed)));
  const indices = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

/** Simple string hash (djb2) */
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

/** murmur3 finaliser — spreads djb2's near-sequential output across the range. */
function fmix32(h) {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Small seeded PRNG, enough to drive one shuffle. */
function mulberry32(a) {
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Illustration URL for a campaign, or null when none is set.
 *
 * Images are optional and live in `static/img/campaigns/`. Built from `base`
 * rather than a bare path so the GitHub Pages deploy, which serves the site
 * from /<repo>/, resolves them correctly.
 */
export function getCampaignImageUrl(campaign) {
  const file = campaign?.image;
  if (typeof file !== "string" || !file.trim()) return null;
  return `${base}/img/campaigns/${file.trim()}`;
}

/** Up to two initials, for the placeholder shown when a campaign has no image. */
export function getCampaignInitials(name) {
  const words = String(name ?? "")
    .split(/[\s'’-]+/)
    .filter(Boolean);
  const meaningful = words.filter(
    (w) => !INITIAL_STOP_WORDS.has(w.toLowerCase()),
  );
  const source = meaningful.length ? meaningful : words;

  return source
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}
