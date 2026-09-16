import { describe, expect, it, vi } from "vitest";
import { getCampaignImageUrl, getCampaignInitials } from "$lib/campaign-data";
import {
  CAMPAIGNS,
  RAW_CAMPAIGNS,
  RAW_GOBELINS,
  GOBELINS,
} from "./fixtures/campaigns";

// $app/paths is a SvelteKit build-time construct with no meaning to a bare
// Vitest run. The empty base matches a local build.
vi.mock("$app/paths", () => ({ asset: (p) => p, base: "" }));

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

describe("getCampaignForPeriod", () => {
  /** Period indices 0, 1, 2, … — one per week, which is what the cycle needs. */
  function indices(count, from = 0) {
    return Array.from({ length: count }, (_, i) => from + i);
  }

  it("is deterministic for a given index", async () => {
    const { mod } = await loadedModule();
    expect(mod.getCampaignForPeriod(29)).toBe(mod.getCampaignForPeriod(29));
  });

  it("always returns a campaign from the loaded list", async () => {
    const { mod } = await loadedModule();
    for (const index of [0, 1, 29, 42, 500]) {
      expect(CAMPAIGNS).toContainEqual(mod.getCampaignForPeriod(index));
    }
  });

  it("returns null before campaigns are loaded", async () => {
    const { mod } = await freshModule();
    expect(mod.getCampaignForPeriod(0)).toBeNull();
  });

  it("uses every campaign exactly once per cycle", async () => {
    const { mod } = await loadedModule();
    const n = CAMPAIGNS.length;
    const names = indices(n).map((i) => mod.getCampaignForPeriod(i).name);
    expect(new Set(names).size).toBe(n);
  });

  it("uses every campaign exactly once in the next cycle too", async () => {
    const { mod } = await loadedModule();
    const n = CAMPAIGNS.length;
    const names = indices(n, n).map((i) => mod.getCampaignForPeriod(i).name);
    expect(new Set(names).size).toBe(n);
  });

  it("never repeats on consecutive periods", async () => {
    const { mod } = await loadedModule();
    const names = indices(200).map((i) => mod.getCampaignForPeriod(i).name);
    const repeats = names.filter((name, i) => i > 0 && name === names[i - 1]);
    expect(repeats).toEqual([]);
  });

  /**
   * Regression test for a plain `hash(index) % n` selector: djb2 XORs the last
   * character last, so consecutive indices hashed to adjacent values and the
   * modulo preserved it — the answer marched straight down the file, a
   * different campaign each period but in file order.
   */
  it("does not march through the list in file order", async () => {
    const { mod } = await loadedModule(
      named(Array.from({ length: 14 }, (_, i) => `Campagne ${i}`)),
    );
    const list = await mod.loadCampaigns();
    const indexOf = (name) => list.findIndex((c) => c.name === name);
    const positions = indices(200).map((i) =>
      indexOf(mod.getCampaignForPeriod(i).name),
    );

    const adjacent = positions.filter(
      (idx, i) => i > 0 && Math.abs(idx - positions[i - 1]) === 1,
    );
    expect(adjacent.length).toBeLessThan(positions.length / 3);
  });

  /**
   * A device whose clock is set before the anchor produces a negative index.
   * Without the euclidean modulo this indexes past the start of the array and
   * the resulting undefined throws on `.name`, inside onMount, where it
   * surfaces as a data-loading failure.
   */
  it("handles a negative index", async () => {
    const { mod } = await loadedModule();
    for (const index of [-1, -3, -17, -200]) {
      expect(CAMPAIGNS).toContainEqual(mod.getCampaignForPeriod(index));
    }
  });

  /** Cycle 0 compares against "goblindle-cycle--1" — a phantom, but a valid seed. */
  it("survives the phantom cycle before the first one", async () => {
    const { mod } = await loadedModule();
    expect(CAMPAIGNS).toContainEqual(mod.getCampaignForPeriod(0));
  });

  it("handles a list too short to shuffle", async () => {
    const { mod } = await loadedModule(named(["Seule"]));
    const names = indices(5).map((i) => mod.getCampaignForPeriod(i).name);
    expect(names).toEqual(Array(5).fill("Seule"));
  });

  it("alternates rather than repeating with only two campaigns", async () => {
    const { mod } = await loadedModule(named(["Une", "Deux"]));
    const names = indices(10).map((i) => mod.getCampaignForPeriod(i).name);
    const repeats = names.filter((name, i) => i > 0 && name === names[i - 1]);
    expect(repeats).toEqual([]);
  });
});

describe("getCampaignForSeed", () => {
  it("is deterministic for a given seed", async () => {
    const { mod } = await loadedModule();
    const seed = "unlimited_1717171717_0.42";
    expect(mod.getCampaignForSeed(seed)).toBe(mod.getCampaignForSeed(seed));
  });

  it("always returns a campaign from the loaded list", async () => {
    const { mod } = await loadedModule();
    for (const seed of ["a", "b", "unlimited_1_0.5", "2026-07-23", ""]) {
      expect(CAMPAIGNS).toContainEqual(mod.getCampaignForSeed(seed));
    }
  });

  it("returns null before campaigns are loaded", async () => {
    const { mod } = await freshModule();
    expect(mod.getCampaignForSeed("unlimited_1_0.5")).toBeNull();
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

  // The base-path case needs a different $app/paths mock, and a mocked module
  // is evaluated once per test file — so it lives in campaign-image-base.test.js.
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
