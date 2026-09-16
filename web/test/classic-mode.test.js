import { describe, expect, it } from "vitest";
import { CLASSIC_ATTRIBUTES, compareCampaigns } from "$lib/classic-mode";
import { EPEE, GOBELINS, OMBRES, SANS_MJ, TRONE } from "./fixtures/campaigns";

/** Pull one attribute's comparison out of the result array. */
function cell(guess, target, key) {
  return compareCampaigns(guess, target).find((r) => r.key === key);
}

describe("CLASSIC_ATTRIBUTES", () => {
  it("exposes 6 attributes with gm first and deaths last", () => {
    expect(CLASSIC_ATTRIBUTES).toHaveLength(6);
    expect(CLASSIC_ATTRIBUTES[0].key).toBe("gm");
    expect(CLASSIC_ATTRIBUTES[5].key).toBe("deaths");
  });

  it("keeps the display order the grid header depends on", () => {
    expect(CLASSIC_ATTRIBUTES.map((a) => a.key)).toEqual([
      "gm",
      "game",
      "year",
      "pj_max",
      "duration",
      "deaths",
    ]);
  });
});

describe("compareCampaigns — result shape", () => {
  it("returns one entry per attribute, carrying label and type through", () => {
    const results = compareCampaigns(OMBRES, GOBELINS);
    expect(results).toHaveLength(6);
    expect(results[0]).toMatchObject({ key: "gm", label: "MJ", type: "exact" });
  });
});

describe("compareCampaigns — exact", () => {
  it("marks an identical value correct", () => {
    expect(cell(OMBRES, GOBELINS, "gm").result).toBe("correct");
  });

  it("marks a differing value wrong", () => {
    expect(cell(TRONE, GOBELINS, "gm").result).toBe("wrong");
  });

  it("compares case-insensitively", () => {
    const shouty = { ...GOBELINS, gm: "BENJAMIN" };
    expect(cell(shouty, GOBELINS, "gm").result).toBe("correct");
  });

  it("treats a missing value as not matching a present one", () => {
    expect(cell(SANS_MJ, GOBELINS, "gm").result).toBe("wrong");
  });

  /**
   * A campaign may legitimately omit a field. Before the `?? null` fix this
   * branch reached .toLowerCase() on null, and the throw was swallowed inside
   * submitGuess — the guess vanished and the board stopped accepting input.
   */
  it("does not throw when a value is missing on either side", () => {
    expect(() => compareCampaigns(SANS_MJ, GOBELINS)).not.toThrow();
    expect(() => compareCampaigns(GOBELINS, SANS_MJ)).not.toThrow();
    expect(() => compareCampaigns(SANS_MJ, SANS_MJ)).not.toThrow();
  });

  it("marks two missing values correct", () => {
    expect(cell(SANS_MJ, SANS_MJ, "gm").result).toBe("correct");
  });
});

describe("compareCampaigns — numeric", () => {
  it("marks the same value correct with no direction hint", () => {
    const twin = { ...OMBRES, year: 2024 };
    const result = cell(twin, GOBELINS, "year");
    expect(result.result).toBe("correct");
    expect(result.direction).toBeUndefined();
  });

  it("points up when the guess is lower than the target", () => {
    expect(cell(OMBRES, GOBELINS, "year")).toMatchObject({
      result: "wrong",
      direction: "up",
    });
  });

  it("points down when the guess is higher than the target", () => {
    expect(cell(TRONE, GOBELINS, "year")).toMatchObject({
      result: "wrong",
      direction: "down",
    });
  });

  it("compares player counts and death counts the same way", () => {
    expect(cell(TRONE, GOBELINS, "pj_max")).toMatchObject({
      result: "wrong",
      direction: "up",
    });
    expect(cell(TRONE, GOBELINS, "deaths")).toMatchObject({
      result: "wrong",
      direction: "down",
    });
  });

  it("gives no direction when either value is unparseable", () => {
    const undated = { ...OMBRES, year: "" };
    const result = cell(undated, GOBELINS, "year");
    expect(result.result).toBe("wrong");
    expect(result.direction).toBeUndefined();
  });

  /**
   * Number(null) is 0, so a missing value used to compare as a legitimate zero
   * and draw an arrow claiming the target was higher than a count nobody ever
   * recorded.
   */
  it("gives no direction when one side is missing entirely", () => {
    const unknown = { ...GOBELINS, deaths: null };
    const result = cell(unknown, GOBELINS, "deaths");
    expect(result.result).toBe("wrong");
    expect(result.direction).toBeUndefined();
  });
});

/**
 * Zero is a real answer — a campaign where nobody died. Every one of these
 * failed before the falsy checks were replaced with explicit nullish ones.
 */
describe("compareCampaigns — zero is a value, not a blank", () => {
  it("renders zero deaths as 0 rather than an em dash", () => {
    expect(cell(EPEE, GOBELINS, "deaths").guessValue).toBe("0");
  });

  it("still points toward the target from zero", () => {
    expect(cell(EPEE, GOBELINS, "deaths")).toMatchObject({
      result: "wrong",
      direction: "up",
    });
  });

  it("marks zero against zero correct", () => {
    expect(cell(EPEE, SANS_MJ, "deaths").result).toBe("correct");
  });

  it("renders a zero player count as 0", () => {
    const solo = { ...GOBELINS, pj_max: 0 };
    expect(cell(solo, GOBELINS, "pj_max").guessValue).toBe("0");
  });
});

describe("compareCampaigns — value formatting", () => {
  it("renders a year without digit grouping", () => {
    // toLocaleString in a French locale would render this as "2 024".
    expect(cell(GOBELINS, GOBELINS, "year").guessValue).toBe("2024");
  });

  it("renders a duration in years", () => {
    expect(cell(GOBELINS, GOBELINS, "duration").guessValue).toBe("2 ans");
  });

  it("uses the singular for a one-year campaign", () => {
    expect(cell(EPEE, EPEE, "duration").guessValue).toBe("1 an");
  });

  it("renders a zero-year duration as less than a year", () => {
    const short = { ...GOBELINS, duration: 0 };
    expect(cell(short, GOBELINS, "duration").guessValue).toBe("< 1 an");
  });

  it("renders a missing value as an em dash", () => {
    expect(cell(SANS_MJ, SANS_MJ, "gm").guessValue).toBe("—");
  });

  it("renders an empty string as an em dash", () => {
    const blank = { ...GOBELINS, gm: "" };
    expect(cell(blank, GOBELINS, "gm").guessValue).toBe("—");
  });

  it("passes authored text through untouched", () => {
    expect(cell(GOBELINS, GOBELINS, "game").guessValue).toBe("Pathfinder 2e");
  });

  it("formats the target value the same way as the guess value", () => {
    expect(cell(OMBRES, GOBELINS, "game")).toMatchObject({
      guessValue: "Dungeons & Dragons 5e",
      targetValue: "Pathfinder 2e",
    });
  });
});
