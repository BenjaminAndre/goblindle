import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCampaignImageUrl,
  getCampaignInitials,
  getTodaySeed,
} from "$lib/campaign-data";
import {
  CAMPAIGNS,
  RAW_CAMPAIGNS,
  RAW_GOBELINS,
  GOBELINS,
} from "./fixtures/campaigns";

// $app/paths is a SvelteKit build-time construct with no meaning to a bare
// Vitest run. The empty base matches a local build. `mocks` is hoisted so the
// factory can read it, and the factory re-runs after vi.resetModules() — which
// is how the base-path test below swaps the value for one import.
const mocks = vi.hoisted(() => ({ base: "" }));
vi.mock("$app/paths", () => ({ asset: (p) => p, base: mocks.base }));

/**
 * `campaigns` is module-private with no reset export, so each group gets a fresh
 * module instance instead of adding production code for testability.
 */
async function freshModule({
  campaigns = RAW_CAMPAIGNS,
  ok = true,
  status = 200,
} = {}) {
  vi.resetModules();
  const fetchMock = vi.fn(async () => ({
    ok,
    status,
    json: async () => campaigns,
  }));
  vi.stubGlobal("fetch", fetchMock);
  const mod = await import("$lib/campaign-data");
  return { mod, fetchMock };
}

/** Load a module instance with its campaign list already populated. */
async function loadedModule(campaigns = RAW_CAMPAIGNS) {
  const { mod, fetchMock } = await freshModule({ campaigns });
  await mod.loadCampaigns();
  return { mod, fetchMock };
}

/** Raw entries differing only by name, for search and cycle assertions. */
function named(names) {
  return names.map((name) => ({ ...RAW_GOBELINS, campaign: { value: name } }));
}

describe("loadCampaigns", () => {
  it("fetches the static campaigns file and returns the normalised list", async () => {
    const { mod, fetchMock } = await freshModule();
    await expect(mod.loadCampaigns()).resolves.toEqual(CAMPAIGNS);
    expect(fetchMock).toHaveBeenCalledWith("/campaigns.json");
  });

  it("serves later calls from the cache without refetching", async () => {
    const { mod, fetchMock } = await loadedModule();
    await mod.loadCampaigns();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("is single-flight — concurrent callers share one fetch", async () => {
    const { mod, fetchMock } = await freshModule();
    const [first, second] = await Promise.all([
      mod.loadCampaigns(),
      mod.loadCampaigns(),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });

  it("rejects with the status code when the response is not ok", async () => {
    const { mod } = await freshModule({ ok: false, status: 404 });
    await expect(mod.loadCampaigns()).rejects.toThrow(
      "Failed to load campaigns: 404",
    );
  });

  it("clears the in-flight promise on failure so a retry can succeed", async () => {
    const { mod, fetchMock } = await freshModule({ ok: false, status: 500 });
    await expect(mod.loadCampaigns()).rejects.toThrow();

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => RAW_CAMPAIGNS,
    });

    await expect(mod.loadCampaigns()).resolves.toEqual(CAMPAIGNS);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("clears the in-flight promise when validation fails, so a fixed file loads", async () => {
    const { mod, fetchMock } = await freshModule({ campaigns: [] });
    await expect(mod.loadCampaigns()).rejects.toThrow("empty");

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => RAW_CAMPAIGNS,
    });
    await expect(mod.loadCampaigns()).resolves.toEqual(CAMPAIGNS);
  });
});

describe("loadCampaigns — validation", () => {
  it("rejects a payload that is not an array", async () => {
    const { mod } = await freshModule({ campaigns: { nope: true } });
    await expect(mod.loadCampaigns()).rejects.toThrow("must be an array");
  });

  it("rejects an empty list", async () => {
    const { mod } = await freshModule({ campaigns: [] });
    await expect(mod.loadCampaigns()).rejects.toThrow("empty");
  });

  it("rejects an entry with no campaign name", async () => {
    const { mod } = await freshModule({
      campaigns: [{ gm: { value: "Benjamin" } }],
    });
    await expect(mod.loadCampaigns()).rejects.toThrow(/missing a "campaign"/);
  });

  it("rejects an entry whose campaign name is blank", async () => {
    const { mod } = await freshModule({ campaigns: [{ campaign: { value: "  " } }] });
    await expect(mod.loadCampaigns()).rejects.toThrow(/missing a "campaign"/);
  });

  it("rejects duplicate names", async () => {
    const { mod } = await freshModule({ campaigns: named(["Kaldir", "Kaldir"]) });
    await expect(mod.loadCampaigns()).rejects.toThrow("Duplicate campaign name");
  });

  /**
   * The failure this guards against is not cosmetic: Svelte throws
   * each_key_duplicate on a repeated keyed-each key, and guesses are
   * deduplicated by name, so both would be guessable and the board would break
   * mid-game — after the guess had already been written to localStorage.
   */
  it("rejects names that collide only after accent folding", async () => {
    const { mod } = await freshModule({
      campaigns: named(["La Quête du Roi", "La Quete du Roi"]),
    });
    await expect(mod.loadCampaigns()).rejects.toThrow("Duplicate campaign id");
  });
});

describe("loadCampaigns — normalisation", () => {
  async function normaliseOne(raw) {
    const { mod } = await freshModule({ campaigns: [raw] });
    const [only] = await mod.loadCampaigns();
    return only;
  }

  it("flattens { value } wrappers onto the campaign", async () => {
    const c = await normaliseOne(RAW_GOBELINS);
    expect(c).toMatchObject({ gm: "Benjamin", year: 2024, deaths: 3 });
  });

  it("keeps 0 as a value rather than treating it as missing", async () => {
    const c = await normaliseOne({
      campaign: { value: "Sans Morts" },
      deaths: { value: 0 },
    });
    expect(c.deaths).toBe(0);
  });

  it("keeps an empty string as a value", async () => {
    const c = await normaliseOne({
      campaign: { value: "MJ Inconnu" },
      gm: { value: "" },
    });
    expect(c.gm).toBe("");
  });

  it("turns an explicitly null value into null", async () => {
    const c = await normaliseOne({
      campaign: { value: "MJ Nul" },
      gm: { value: null },
    });
    expect(c.gm).toBeNull();
  });

  it("accepts a bare scalar in place of a { value } wrapper", async () => {
    const c = await normaliseOne({ campaign: { value: "Brut" }, deaths: 4 });
    expect(c.deaths).toBe(4);
  });

  it("derives name and an accent-folded id", async () => {
    const c = await normaliseOne({ campaign: { value: "L'Épée Brisée" } });
    expect(c).toMatchObject({ name: "L'Épée Brisée", id: "l-epee-brisee" });
  });

  it("trims a padded campaign name", async () => {
    const c = await normaliseOne({ campaign: { value: "  Kaldir  " } });
    expect(c.name).toBe("Kaldir");
  });

  it("collects notes into a map keyed by field", async () => {
    const c = await normaliseOne(RAW_GOBELINS);
    expect(c.notes).toEqual(GOBELINS.notes);
  });

  it("omits fields whose notes are absent or empty", async () => {
    const c = await normaliseOne({
      campaign: { value: "Sobre" },
      gm: { value: "Marion", notes: [] },
      game: { value: "Blades in the Dark" },
    });
    expect(c.notes).toEqual({});
  });

  it("ignores a notes value that is not an array", async () => {
    const c = await normaliseOne({
      campaign: { value: "Mal Typé", notes: "une anecdote" },
    });
    expect(c.notes).toEqual({});
  });

  it("does not let a field named notes clobber the notes map", async () => {
    const c = await normaliseOne({
      campaign: { value: "Piège", notes: ["gardée"] },
      notes: { value: "un champ nommé notes" },
    });
    expect(c.notes).toEqual({ campaign: ["gardée"] });
  });
});

describe("searchCampaigns", () => {
  it("returns nothing for an empty query", async () => {
    const { mod } = await loadedModule();
    expect(mod.searchCampaigns("")).toEqual([]);
  });

  it("matches case-insensitively on a substring", async () => {
    const { mod } = await loadedModule();
    expect(mod.searchCampaigns("GOBELINS").map((c) => c.name)).toEqual([
      "La Campagne des Gobelins",
    ]);
  });

  it("sorts prefix matches ahead of substring matches", async () => {
    const { mod } = await loadedModule(
      named(["Le Chant de Kaldir", "Kaldir", "Kaldirion"]),
    );
    // "Kaldir"/"Kaldirion" start with "kald"; "Le Chant de Kaldir" only contains it
    expect(mod.searchCampaigns("kald").map((c) => c.name)).toEqual([
      "Kaldir",
      "Kaldirion",
      "Le Chant de Kaldir",
    ]);
  });

  it("sorts alphabetically within each tier", async () => {
    const { mod } = await loadedModule(named(["Azur", "Aube", "Aatrox"]));
    expect(mod.searchCampaigns("a").map((c) => c.name)).toEqual([
      "Aatrox",
      "Aube",
      "Azur",
    ]);
  });

  it("caps the result at 8", async () => {
    const { mod } = await loadedModule(
      named(["Aa", "Ab", "Ac", "Ad", "Ae", "Af", "Ag", "Ah", "Ai", "Aj"]),
    );
    expect(mod.searchCampaigns("a")).toHaveLength(8);
  });

  it("filters excluded names case-insensitively", async () => {
    const { mod } = await loadedModule(named(["Kaldir", "Kaldirion"]));
    expect(mod.searchCampaigns("kald", ["kALDIRION"]).map((c) => c.name)).toEqual([
      "Kaldir",
    ]);
  });

  it("returns an empty list when nothing matches", async () => {
    const { mod } = await loadedModule();
    expect(mod.searchCampaigns("zzzz")).toEqual([]);
  });
});

describe("getRandomCampaign", () => {
  const DAY_MS = 86400000;

  function seedForDay(day) {
    return new Date(day * DAY_MS).toISOString().slice(0, 10);
  }

  /** Days since the epoch for the first day of the cycle covering 2026-01-01. */
  function cycleStart(n) {
    return Math.ceil(Date.UTC(2026, 0, 1) / DAY_MS / n) * n;
  }

  /** Daily seeds for `count` consecutive days from a cycle boundary. */
  function consecutiveSeeds(count, n = CAMPAIGNS.length) {
    const start = cycleStart(n);
    return Array.from({ length: count }, (_, i) => seedForDay(start + i));
  }

  it("is deterministic for a given seed", async () => {
    const { mod } = await loadedModule();
    expect(mod.getRandomCampaign("2026-07-25")).toBe(
      mod.getRandomCampaign("2026-07-25"),
    );
  });

  it("always returns a campaign from the loaded list", async () => {
    const { mod } = await loadedModule();
    for (const seed of ["a", "b", "2026-07-25", "unlimited_1_0.5", ""]) {
      expect(CAMPAIGNS).toContainEqual(mod.getRandomCampaign(seed));
    }
  });

  it("returns null before campaigns are loaded", async () => {
    const { mod } = await freshModule();
    expect(mod.getRandomCampaign("2026-07-25")).toBeNull();
  });

  it("uses every campaign exactly once per cycle", async () => {
    const { mod } = await loadedModule();
    const n = CAMPAIGNS.length;
    // Anchored to a cycle boundary — an arbitrary n-day window straddles two
    // cycles and would legitimately repeat.
    const names = consecutiveSeeds(n).map((s) => mod.getRandomCampaign(s).name);
    expect(new Set(names).size).toBe(n);
  });

  it("uses every campaign exactly once in the next cycle too", async () => {
    const { mod } = await loadedModule();
    const n = CAMPAIGNS.length;
    const names = consecutiveSeeds(2 * n)
      .slice(n)
      .map((s) => mod.getRandomCampaign(s).name);
    expect(new Set(names).size).toBe(n);
  });

  it("never repeats on consecutive days", async () => {
    const { mod } = await loadedModule();
    const seeds = consecutiveSeeds(200);
    const names = seeds.map((s) => mod.getRandomCampaign(s).name);
    const repeats = names.filter((name, i) => i > 0 && name === names[i - 1]);
    expect(repeats).toEqual([]);
  });

  /**
   * Regression test for the plain `djb2(seed) % n` selector: djb2 XORs the last
   * character last, so consecutive dates hashed to adjacent values and the
   * modulo preserved it — the answer marched straight down the file, a
   * different campaign each day but in file order.
   */
  it("does not march through the list in file order", async () => {
    const { mod } = await loadedModule(
      named(Array.from({ length: 14 }, (_, i) => `Campagne ${i}`)),
    );
    const list = await mod.loadCampaigns();
    const indexOf = (name) => list.findIndex((c) => c.name === name);
    const seeds = consecutiveSeeds(200, list.length);
    const indices = seeds.map((s) => indexOf(mod.getRandomCampaign(s).name));

    const adjacent = indices.filter(
      (idx, i) => i > 0 && Math.abs(idx - indices[i - 1]) === 1,
    );
    expect(adjacent.length).toBeLessThan(indices.length / 3);
  });

  it("handles a list too short to shuffle", async () => {
    const { mod } = await loadedModule(named(["Seule"]));
    const seeds = consecutiveSeeds(5, 1);
    expect(seeds.map((s) => mod.getRandomCampaign(s).name)).toEqual(
      Array(5).fill("Seule"),
    );
  });

  it("alternates rather than repeating with only two campaigns", async () => {
    const { mod } = await loadedModule(named(["Une", "Deux"]));
    const names = consecutiveSeeds(10, 2).map(
      (s) => mod.getRandomCampaign(s).name,
    );
    const repeats = names.filter((name, i) => i > 0 && name === names[i - 1]);
    expect(repeats).toEqual([]);
  });

  it("still selects for a non-date seed, as unlimited mode passes", async () => {
    const { mod } = await loadedModule();
    const picked = mod.getRandomCampaign("unlimited_1717171717_0.42");
    expect(CAMPAIGNS).toContainEqual(picked);
  });
});

describe("getTodaySeed", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats as YYYY-MM-DD", () => {
    vi.setSystemTime(new Date("2026-07-25T09:00:00Z"));
    expect(getTodaySeed()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("reflects the local date, not the UTC date", () => {
    // 18:00 UTC is already the next day in UTC+7 and still the same day in UTC,
    // so this instant fails any implementation that reaches for UTC getters.
    vi.setSystemTime(new Date("2026-07-25T18:00:00Z"));
    // en-CA renders as YYYY-MM-DD — an independent derivation of the same date.
    expect(getTodaySeed()).toBe(new Date().toLocaleDateString("en-CA"));
  });

  it("zero-pads single-digit months and days", () => {
    vi.setSystemTime(new Date(2026, 0, 5, 12, 0, 0));
    expect(getTodaySeed()).toBe("2026-01-05");
  });

  it("advances by one day across a local midnight", () => {
    vi.setSystemTime(new Date(2026, 6, 25, 23, 59, 0));
    const before = getTodaySeed();
    vi.setSystemTime(new Date(2026, 6, 26, 0, 1, 0));
    expect(getTodaySeed()).not.toBe(before);
    expect(getTodaySeed()).toBe("2026-07-26");
  });
});

describe("getCampaignImageUrl", () => {
  it("builds a path under the static image folder", () => {
    expect(getCampaignImageUrl({ image: "gobelins.webp" })).toBe(
      "/img/campaigns/gobelins.webp",
    );
  });

  it("returns null when the campaign has no image", () => {
    expect(getCampaignImageUrl(GOBELINS)).toBeNull();
    expect(getCampaignImageUrl({ image: "" })).toBeNull();
    expect(getCampaignImageUrl({ image: "   " })).toBeNull();
    expect(getCampaignImageUrl(undefined)).toBeNull();
  });

  /**
   * Unlike the Data Dragon URL this replaced, the path is site-relative, so it
   * must pick up the base path the Pages deploy serves the site from.
   */
  it("goes through the base path", async () => {
    mocks.base = "/goblindle";
    vi.resetModules();
    try {
      const mod = await import("$lib/campaign-data");
      expect(mod.getCampaignImageUrl({ image: "gobelins.webp" })).toBe(
        "/goblindle/img/campaigns/gobelins.webp",
      );
    } finally {
      mocks.base = "";
      vi.resetModules();
    }
  });
});

describe("getCampaignInitials", () => {
  it("skips French articles and prepositions", () => {
    expect(getCampaignInitials("La Campagne des Gobelins")).toBe("CG");
    expect(getCampaignInitials("Le Trône de Cendres")).toBe("TC");
  });

  it("splits on apostrophes", () => {
    expect(getCampaignInitials("L'Épée Brisée")).toBe("ÉB");
  });

  it("falls back to the raw words when every word is a stop word", () => {
    expect(getCampaignInitials("Le Des")).toBe("LD");
  });

  it("caps at two letters", () => {
    expect(getCampaignInitials("L'Aube des Six Royaumes")).toBe("AS");
  });

  it("returns an empty string for an empty name", () => {
    expect(getCampaignInitials("")).toBe("");
    expect(getCampaignInitials(null)).toBe("");
  });
});
