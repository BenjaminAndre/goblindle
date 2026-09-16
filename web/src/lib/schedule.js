// When the weekly campaign rotates: Thursday 19:00 in Brussels, just before a session.

const TIME_ZONE = "Europe/Brussels";
const WEEK = 604_800_000;

/**
 * Thursday 2026-01-01 19:00 Brussels, expressed as a pseudo-UTC wall-clock value.
 *
 * Everything here works in wall-clock space, which is what makes it correct
 * across daylight saving: a Brussels week is always exactly 168 wall-clock
 * hours, even the ones that are 167 or 169 real ones.
 */
const ANCHOR_LOCAL = Date.UTC(2026, 0, 1, 19, 0, 0);

/**
 * Locale pinned to en-US on purpose: the host locale can carry a numbering
 * system or calendar that makes the parts unparseable (Arabic-Indic digits, a
 * Japanese era year).
 */
const OFFSET_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  timeZoneName: "longOffset",
});

const BOUNDARY_FMT = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});

/**
 * The zone's offset in ms at an instant: +3600000 in CET, +7200000 in CEST.
 *
 * Read straight off `longOffset` rather than by formatting the date and
 * re-parsing it as UTC. That round trip drops whatever seconds and
 * milliseconds `Date.now()` carried, which is invisible in a week index but
 * puts the countdown up to a minute out — and it sidesteps the `hour12`
 * midnight quirk, where a formatter can render 00:00 as hour 24.
 */
function offsetAt(instant) {
  const part = OFFSET_FMT.formatToParts(instant).find(
    (p) => p.type === "timeZoneName",
  );
  const match = /^GMT([+-])(\d{2}):(\d{2})$/.exec(part ? part.value : "");
  // A zone sitting at exactly UTC formats as a bare "GMT".
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 3600000 + Number(match[3]) * 60000);
}

/**
 * Turn a wall-clock value back into a real instant.
 *
 * The second probe is insurance rather than necessity: EU transitions happen at
 * 01:00 UTC on a Sunday, more than three days from any Thursday 19:00, so a
 * rotation boundary is never ambiguous or skipped and the first probe already
 * lands on the right side of it.
 */
function instantFromLocal(localMs) {
  const probe = localMs - offsetAt(localMs);
  return localMs - offsetAt(probe);
}

/**
 * The rotation period covering `now`.
 *
 * `seed` is an opaque storage key — it is never parsed back into a date, and
 * the period is identified by `index` alone.
 */
export function getCurrentPeriod(now = Date.now()) {
  const localNow = now + offsetAt(now);
  const index = Math.floor((localNow - ANCHOR_LOCAL) / WEEK);
  const localStart = ANCHOR_LOCAL + index * WEEK;

  return {
    index,
    // UTC getters on a pseudo-UTC value read back the Brussels wall clock.
    seed: new Date(localStart).toISOString().slice(0, 10),
    // Converted with the offset at the boundary, not at `now`: the week
    // containing a transition is 167 or 169 hours long, and using today's
    // offset would put the countdown an hour out for all seven days.
    endsAt: instantFromLocal(localStart + WEEK),
  };
}

/** "jeudi 17 septembre" — the static label paired with the ticking countdown. */
export function formatBoundaryDate(instant) {
  return BOUNDARY_FMT.format(instant);
}

/**
 * Remaining time, in French. Subordinate units are zero-padded so the string
 * holds its width as it ticks; the leading one is not.
 *
 * j/h/min/s are unit symbols — they never take a plural.
 */
export function formatCountdown(ms) {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  if (days > 0) return `${days} j ${pad(hours)} h ${pad(minutes)} min`;
  if (hours > 0) return `${hours} h ${pad(minutes)} min`;
  if (minutes > 0) return `${minutes} min ${pad(seconds)} s`;
  return `${seconds} s`;
}

function pad(n) {
  return String(n).padStart(2, "0");
}
