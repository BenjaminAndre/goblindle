// Pure helpers behind the anecdote bubble.
//
// They live here rather than in the component because Vitest runs with
// environment "node" and no Svelte plugin, so a .svelte file cannot be imported
// by any test. Keeping the logic out of the markup is what makes it testable.

/** Gap in px between the trigger and the bubble. */
const OFFSET = 8;
/** Minimum clearance from the viewport edge. */
const MARGIN = 8;

/** One anecdote, or null when the field has none. */
export function pickNote(notes, rand = Math.random) {
  if (!Array.isArray(notes) || notes.length === 0) return null;
  if (notes.length === 1) return notes[0];

  // Clamped because an injected rand returning exactly 1 would index past the end.
  const index = Math.min(notes.length - 1, Math.floor(rand() * notes.length));
  return notes[index];
}

/**
 * Where to place the bubble, in viewport coordinates, for `position: fixed`.
 *
 * Above the trigger by preference: on a phone the thumb that opened a cell
 * covers whatever is rendered below it. Flips under only when there is no room
 * above, and is clamped so a bubble near an edge stays fully on screen.
 */
export function placePopup(trigger, popup, viewport) {
  const roomAbove = trigger.top;
  const roomBelow = viewport.height - (trigger.top + trigger.height);
  const needed = popup.height + OFFSET + MARGIN;

  const below = roomAbove < needed && roomBelow >= needed;
  const top = below
    ? trigger.top + trigger.height + OFFSET
    : trigger.top - popup.height - OFFSET;

  const centred = trigger.left + trigger.width / 2 - popup.width / 2;

  return {
    top: clamp(top, MARGIN, Math.max(MARGIN, viewport.height - popup.height - MARGIN)),
    left: clamp(centred, MARGIN, Math.max(MARGIN, viewport.width - popup.width - MARGIN)),
    placement: below ? "below" : "above",
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
