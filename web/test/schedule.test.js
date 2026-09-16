import { describe, expect, it } from "vitest";
import {
  formatBoundaryDate,
  formatCountdown,
  getCurrentPeriod,
} from "$lib/schedule";

/**
 * getCurrentPeriod takes `now` as a parameter, so none of this needs fake
 * timers — every case is an explicit instant.
 *
 * All instants below are written in UTC and annotated with the Brussels wall
 * clock they correspond to. Rotation boundaries are Thursday 19:00 Brussels,
 * which is 18:00Z in winter (CET, +1) and 17:00Z in summer (CEST, +2).
 *
 * Reference dates, all verified Thursdays: 2026-01-01 (the anchor, index 0),
 * 2026-01-08 (1), 2026-03-26 (12), 2026-07-23 (29), 2026-10-22 (42).
 * EU transitions in 2026: Sunday 29 March and Sunday 25 October, both 01:00Z.
 */

const HOUR = 3_600_000;

describe("getCurrentPeriod — anchor arithmetic", () => {
  it("is index 0 at the anchor boundary", () => {
    // Thu 2026-01-01 19:00 CET
    const period = getCurrentPeriod(Date.UTC(2026, 0, 1, 18, 0, 0));
    expect(period.index).toBe(0);
    expect(period.seed).toBe("2026-01-01");
  });

  it("is index -1 one millisecond before the anchor", () => {
    expect(getCurrentPeriod(Date.UTC(2026, 0, 1, 18, 0, 0) - 1).index).toBe(-1);
  });

  it("advances one index per week", () => {
    // Thu 2026-01-08 19:00 CET
    expect(getCurrentPeriod(Date.UTC(2026, 0, 8, 18, 0, 0)).index).toBe(1);
    // Thu 2026-07-23 19:00 CEST
    expect(getCurrentPeriod(Date.UTC(2026, 6, 23, 17, 0, 0)).index).toBe(29);
    // Thu 2026-10-22 19:00 CEST
    expect(getCurrentPeriod(Date.UTC(2026, 9, 22, 17, 0, 0)).index).toBe(42);
  });
});

/**
 * These two are the whole point of using a fixed zone. An implementation that
 * treats the boundary as 19:00 UTC returns the *previous* period for both —
 * off by a whole week, not by an hour.
 */
describe("getCurrentPeriod — the boundary is Brussels time, not UTC", () => {
  it("has rolled over at 19:30 CEST, which is only 17:30 UTC", () => {
    const period = getCurrentPeriod(Date.UTC(2026, 6, 23, 17, 30, 0));
    expect(period.index).toBe(29);
    expect(period.seed).toBe("2026-07-23");
  });

  it("has rolled over at 19:30 CET, which is only 18:30 UTC", () => {
    const period = getCurrentPeriod(Date.UTC(2026, 0, 8, 18, 30, 0));
    expect(period.index).toBe(1);
    expect(period.seed).toBe("2026-01-08");
  });
});

describe("getCurrentPeriod — boundary exactness", () => {
  const boundary = Date.UTC(2026, 6, 23, 17, 0, 0); // Thu 23 Jul 19:00 CEST

  it("belongs to the new period at the boundary instant", () => {
    expect(getCurrentPeriod(boundary).index).toBe(29);
  });

  it("still belongs to the old period one millisecond earlier", () => {
    expect(getCurrentPeriod(boundary - 1).index).toBe(28);
    expect(getCurrentPeriod(boundary - 1).seed).toBe("2026-07-16");
  });
});

/**
 * A Brussels week is always 168 wall-clock hours but not always 168 real ones.
 * Deriving endsAt as "start + 168h", or converting it with the offset at `now`
 * rather than at the boundary, is an hour out for all seven days of these two.
 */
describe("getCurrentPeriod — weeks that are not 168 hours", () => {
  it("handles the 167-hour spring week", () => {
    const start = Date.UTC(2026, 2, 26, 18, 0, 0); // Thu 26 Mar 19:00 CET
    const period = getCurrentPeriod(start);

    expect(period.index).toBe(12);
    expect(period.seed).toBe("2026-03-26");
    // Thu 2 Apr 19:00 CEST
    expect(period.endsAt).toBe(Date.UTC(2026, 3, 2, 17, 0, 0));
    expect(period.endsAt - start).toBe(167 * HOUR);
  });

  it("handles the 169-hour autumn week", () => {
    const start = Date.UTC(2026, 9, 22, 17, 0, 0); // Thu 22 Oct 19:00 CEST
    const period = getCurrentPeriod(start);

    expect(period.index).toBe(42);
    expect(period.seed).toBe("2026-10-22");
    // Thu 29 Oct 19:00 CET
    expect(period.endsAt).toBe(Date.UTC(2026, 9, 29, 18, 0, 0));
    expect(period.endsAt - start).toBe(169 * HOUR);
  });

  it("keeps the same period across the transition inside a week", () => {
    // Sunday 29 March 14:00 CEST — the clocks went forward that morning.
    const period = getCurrentPeriod(Date.UTC(2026, 2, 29, 12, 0, 0));
    expect(period.index).toBe(12);
    expect(period.seed).toBe("2026-03-26");
  });

  it("gives an ordinary week exactly 168 hours", () => {
    const start = Date.UTC(2026, 6, 23, 17, 0, 0);
    expect(getCurrentPeriod(start).endsAt - start).toBe(168 * HOUR);
  });
});

/**
 * Regression test for reading the offset by formatting an instant and
 * re-parsing it as UTC: that route drops whatever seconds and milliseconds
 * Date.now() carried, which never moves the index but leaves the countdown up
 * to a minute wrong.
 */
describe("getCurrentPeriod — sub-minute hygiene", () => {
  it("gives the same boundary whatever the seconds and milliseconds", () => {
    const base = Date.UTC(2026, 6, 23, 17, 0, 0);
    const clean = getCurrentPeriod(base + 12 * HOUR);
    const messy = getCurrentPeriod(base + 12 * HOUR + 56_789);

    expect(messy.endsAt).toBe(clean.endsAt);
    expect(messy.index).toBe(clean.index);
  });
});

describe("formatBoundaryDate", () => {
  it("names the day in French, in Brussels time", () => {
    const label = formatBoundaryDate(Date.UTC(2026, 0, 8, 18, 0, 0));
    expect(label).toContain("jeudi");
    expect(label).toContain("janvier");
    expect(label).toContain("8");
  });

  it("reads the date in Brussels, not in the host zone", () => {
    // 20:00 UTC is Thursday 21:00 in Brussels but already Friday 10:00 in the
    // UTC+14 zone this suite pins, so only the Brussels reading says jeudi 8.
    const label = formatBoundaryDate(Date.UTC(2026, 0, 8, 20, 0, 0));
    expect(label).toContain("jeudi");
    expect(label).toContain("8");
    expect(label).not.toContain("vendredi");
  });
});

describe("formatCountdown", () => {
  it("shows days, hours and minutes when more than a day remains", () => {
    expect(formatCountdown(2 * 86_400_000 + 5 * HOUR + 13 * 60_000)).toBe(
      "2 j 05 h 13 min",
    );
  });

  it("shows hours and minutes under a day", () => {
    expect(formatCountdown(5 * HOUR + 13 * 60_000)).toBe("5 h 13 min");
  });

  it("shows minutes and seconds under an hour", () => {
    expect(formatCountdown(13 * 60_000 + 22_000)).toBe("13 min 22 s");
  });

  it("shows seconds alone under a minute", () => {
    expect(formatCountdown(22_000)).toBe("22 s");
  });

  it("pads subordinate units but not the leading one", () => {
    expect(formatCountdown(86_400_000)).toBe("1 j 00 h 00 min");
    expect(formatCountdown(HOUR)).toBe("1 h 00 min");
    expect(formatCountdown(60_000)).toBe("1 min 00 s");
  });

  it("floors rather than rounding, so 59.6s never renders as 60", () => {
    expect(formatCountdown(59_999)).toBe("59 s");
    expect(formatCountdown(3_599_999)).toBe("59 min 59 s");
  });

  it("clamps zero and negatives", () => {
    expect(formatCountdown(0)).toBe("0 s");
    expect(formatCountdown(999)).toBe("0 s");
    expect(formatCountdown(-5000)).toBe("0 s");
  });
});
