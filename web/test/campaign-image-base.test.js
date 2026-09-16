import { describe, expect, it, vi } from "vitest";
import { getCampaignImageUrl } from "$lib/campaign-data";

/**
 * A file of its own, because a mocked module is evaluated once per test file
 * and this one needs a non-empty base. vi.resetModules() does not help: it
 * clears the module registry, not the mock registry, so a vi.mock factory never
 * runs a second time and the original value survives.
 *
 * The rest of the data layer is covered in campaign-data.test.js, where the
 * base is empty.
 */
vi.mock("$app/paths", () => ({ asset: (p) => p, base: "/goblindle" }));

describe("getCampaignImageUrl under a deploy base path", () => {
  /**
   * Unlike the Data Dragon URL this replaced, the path is site-relative, so it
   * has to pick up the base path GitHub Pages serves the site from — set in
   * deploy.yml as BASE_PATH: /<repo-name>.
   */
  it("prefixes the base path", () => {
    expect(getCampaignImageUrl({ image: "gobelins.webp" })).toBe(
      "/goblindle/img/campaigns/gobelins.webp",
    );
  });

  it("still returns null when there is no image to link to", () => {
    expect(getCampaignImageUrl({})).toBeNull();
    expect(getCampaignImageUrl({ image: "  " })).toBeNull();
  });
});
