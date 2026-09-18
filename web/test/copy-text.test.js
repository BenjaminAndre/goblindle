import { describe, expect, it, vi } from "vitest";
import { copyTextToClipboard } from "$lib/copy-text";

describe("copyTextToClipboard", () => {
  it("uses the clipboard API when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    await copyTextToClipboard("hello world", {
      navigatorObj: { clipboard: { writeText } },
      documentObj: {
        body: { appendChild: vi.fn(), removeChild: vi.fn() },
        createElement: vi.fn(),
      },
    });

    expect(writeText).toHaveBeenCalledWith("hello world");
  });

  it("falls back to execCommand when clipboard access is unavailable", async () => {
    const execCommand = vi.fn(() => true);
    const appendChild = vi.fn();
    const removeChild = vi.fn();
    const textarea = { select: vi.fn(), value: "" };
    const createElement = vi.fn(() => textarea);

    await copyTextToClipboard("hello world", {
      navigatorObj: {},
      documentObj: {
        body: { appendChild, removeChild },
        createElement,
      },
      execCommand,
    });

    expect(createElement).toHaveBeenCalledWith("textarea");
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(appendChild).toHaveBeenCalledWith(textarea);
    expect(removeChild).toHaveBeenCalledWith(textarea);
  });
});
