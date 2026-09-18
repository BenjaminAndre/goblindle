import { describe, expect, it } from "vitest";
import { markdownToHtml } from "$lib/markdown";

describe("markdownToHtml", () => {
  it("renders headings and list items in html", () => {
    const html = markdownToHtml(`# Changelog\n\n- First item\n- Second item`);

    expect(html).toContain("<h1>Changelog</h1>");
    expect(html).toContain("<li>First item</li>");
    expect(html).toContain("<li>Second item</li>");
  });

  it("escapes html in source text", () => {
    const html = markdownToHtml("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});
