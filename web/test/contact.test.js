import { describe, expect, it } from "vitest";
import { buildContactAddress, buildContactMailto } from "$lib/contact";

describe("buildContactAddress", () => {
  it("assembles the contribution address", () => {
    expect(buildContactAddress()).toBe("gobelindle@gmail.com");
  });
});

describe("buildContactMailto", () => {
  it("is a mailto for that address", () => {
    expect(buildContactMailto()).toMatch(/^mailto:gobelindle@gmail\.com\?/);
  });

  it("prefills a subject and a body", () => {
    const url = buildContactMailto();
    expect(url).toContain("subject=");
    expect(url).toContain("body=");
  });

  it("percent-encodes the body, newlines included", () => {
    const body = new URL(buildContactMailto()).searchParams.get("body");
    expect(body).toContain("\n");
    expect(body).toContain("Campagne manquante");
    // Raw newlines in a mailto query would truncate the body in some clients.
    expect(buildContactMailto()).not.toContain("\n");
  });
});
