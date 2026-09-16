import { describe, expect, it } from "vitest";
import { pickNote, placePopup } from "$lib/notes";

describe("pickNote", () => {
  it("returns the only note when there is one", () => {
    expect(pickNote(["Une anecdote."])).toBe("Une anecdote.");
  });

  it("picks by the injected random source", () => {
    const notes = ["a", "b", "c"];
    expect(pickNote(notes, () => 0)).toBe("a");
    expect(pickNote(notes, () => 0.5)).toBe("b");
    expect(pickNote(notes, () => 0.99)).toBe("c");
  });

  it("clamps a random source that returns exactly 1", () => {
    expect(pickNote(["a", "b"], () => 1)).toBe("b");
  });

  it("returns null when there is nothing to show", () => {
    expect(pickNote([])).toBeNull();
    expect(pickNote(undefined)).toBeNull();
    expect(pickNote(null)).toBeNull();
    expect(pickNote("pas un tableau")).toBeNull();
  });

  it("only ever returns a note from the list", () => {
    const notes = ["a", "b", "c", "d"];
    for (let i = 0; i < 200; i++) {
      expect(notes).toContain(pickNote(notes));
    }
  });
});

describe("placePopup", () => {
  const viewport = { width: 400, height: 800 };
  const popup = { width: 280, height: 100 };

  it("sits above the trigger when there is room", () => {
    const trigger = { top: 400, left: 160, width: 62, height: 48 };
    const pos = placePopup(trigger, popup, viewport);

    expect(pos.placement).toBe("above");
    expect(pos.top).toBe(400 - 100 - 8);
  });

  it("flips below when the trigger is near the top", () => {
    const trigger = { top: 10, left: 160, width: 62, height: 48 };
    const pos = placePopup(trigger, popup, viewport);

    expect(pos.placement).toBe("below");
    expect(pos.top).toBe(10 + 48 + 8);
  });

  it("stays above when there is room neither way", () => {
    const tall = { width: 280, height: 700 };
    const trigger = { top: 300, left: 160, width: 62, height: 48 };
    expect(placePopup(trigger, tall, viewport).placement).toBe("above");
  });

  it("centres horizontally on the trigger", () => {
    const trigger = { top: 400, left: 100, width: 100, height: 48 };
    expect(placePopup(trigger, popup, viewport).left).toBe(150 - 140);
  });

  it("clamps to the left edge", () => {
    const trigger = { top: 400, left: 0, width: 62, height: 48 };
    expect(placePopup(trigger, popup, viewport).left).toBe(8);
  });

  it("clamps to the right edge", () => {
    const trigger = { top: 400, left: 380, width: 62, height: 48 };
    expect(placePopup(trigger, popup, viewport).left).toBe(400 - 280 - 8);
  });

  it("never places the popup off the top", () => {
    const trigger = { top: 0, left: 160, width: 62, height: 48 };
    expect(placePopup(trigger, popup, viewport).top).toBeGreaterThanOrEqual(8);
  });

  it("keeps the popup on screen when it is taller than the viewport", () => {
    const huge = { width: 280, height: 900 };
    const trigger = { top: 400, left: 160, width: 62, height: 48 };
    expect(placePopup(trigger, huge, viewport).top).toBe(8);
  });
});
