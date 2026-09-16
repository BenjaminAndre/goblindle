// Classic mode: compare two campaigns across 6 attributes

/**
 * Attributes displayed in order. The grid reads its column count from this
 * list, so adding an entry here is the whole change — see guess-grid.svelte.
 */
export const CLASSIC_ATTRIBUTES = [
  { key: "gm", label: "MJ", type: "exact" },
  { key: "game", label: "Jeu", type: "exact" },
  { key: "year", label: "Année", type: "numeric" },
  { key: "pj_max", label: "PJ max", type: "numeric" },
  { key: "duration", label: "Durée", type: "numeric", format: "years" },
  { key: "deaths", label: "Morts", type: "numeric" },
];

/** Compare guess campaign against target campaign */
export function compareCampaigns(guess, target) {
  return CLASSIC_ATTRIBUTES.map((attr) => {
    // `?? null`, never `|| ""` — 0 is a real answer (a campaign with no deaths),
    // and collapsing it to "" would render "—" and suppress the arrow.
    const guessVal = guess[attr.key] ?? null;
    const targetVal = target[attr.key] ?? null;

    const formatted = {
      guessValue: formatValue(attr, guessVal),
      targetValue: formatValue(attr, targetVal),
    };

    switch (attr.type) {
      case "exact":
        return {
          ...attr,
          ...formatted,
          // String(... ?? "") and not guessVal.toLowerCase(): a campaign may
          // legitimately omit a field, and a throw here would be swallowed
          // mid-guess and freeze the board.
          result:
            String(guessVal ?? "").toLowerCase() ===
            String(targetVal ?? "").toLowerCase()
              ? "correct"
              : "wrong",
        };

      case "numeric":
        return { ...attr, ...formatted, ...compareNumeric(guessVal, targetVal) };

      default:
        return { ...attr, ...formatted, result: "wrong" };
    }
  });
}

/**
 * Numeric comparison with a direction hint pointing toward the target.
 *
 * Coercion goes through toNumber rather than Number() directly, because
 * Number(null) is 0 — a missing value would otherwise compare as a legitimate
 * zero and draw an arrow that lies about a value nobody recorded.
 */
function compareNumeric(guessVal, targetVal) {
  const g = toNumber(guessVal);
  const t = toNumber(targetVal);

  if (!Number.isFinite(g) || !Number.isFinite(t)) return { result: "wrong" };
  if (g === t) return { result: "correct" };
  return { result: "wrong", direction: g < t ? "up" : "down" };
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return NaN;
  return Number(value);
}

/**
 * Values are authored in French, ready to display, so this switches on type
 * rather than on a second hardcoded list of keys.
 */
function formatValue(attr, value) {
  if (value === null || value === undefined || value === "") return "—";
  if (attr.format === "years") return formatYears(value);
  // String(), never toLocaleString() — French digit grouping would render the
  // year 2024 as "2 024".
  return String(value);
}

function formatYears(value) {
  const years = toNumber(value);
  if (!Number.isFinite(years)) return "—";
  if (years === 0) return "< 1 an";
  return years > 1 ? `${years} ans` : `${years} an`;
}
