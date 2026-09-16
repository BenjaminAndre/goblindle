/**
 * Hand-written campaign fixtures, deliberately small so edits to
 * static/campaigns.json can never break the suite.
 *
 * Two shapes, because loadCampaigns normalises on the way in:
 *   RAW_*     — as authored, one nested { value, notes? } object per field
 *   the flat exports — what the rest of the app actually reads
 *
 * Chosen to exercise every compareCampaigns branch against GOBELINS as target:
 *   OMBRES   — same MJ, different game, older year, fewer PJ, more deaths
 *   TRONE    — different everything, newer year (direction "down")
 *   EPEE     — deaths: 0, the value that a falsy check would swallow
 *   SANS_MJ  — gm omitted entirely, the missing-value path through comparison
 */

export const RAW_GOBELINS = {
  campaign: {
    value: "La Campagne des Gobelins",
    notes: ["Née d'un one-shot d'initiation."],
  },
  gm: { value: "Benjamin" },
  game: { value: "Pathfinder 2e" },
  year: { value: 2024 },
  pj_max: { value: 6 },
  duration: { value: 2 },
  deaths: { value: 3, notes: ["Deux morts sur le même piège."] },
};

export const RAW_OMBRES = {
  campaign: { value: "Les Ombres d'Ébène" },
  gm: { value: "Benjamin" },
  game: { value: "Dungeons & Dragons 5e" },
  year: { value: 2021 },
  pj_max: { value: 5 },
  duration: { value: 3 },
  deaths: { value: 7 },
};

export const RAW_TRONE = {
  campaign: { value: "Le Trône de Cendres" },
  gm: { value: "Antoine" },
  game: { value: "Warhammer Fantasy" },
  year: { value: 2025 },
  pj_max: { value: 4 },
  duration: { value: 4 },
  deaths: { value: 12 },
};

export const RAW_EPEE = {
  campaign: { value: "L'Épée Brisée" },
  gm: { value: "Marion" },
  game: { value: "Dungeons & Dragons 5e" },
  year: { value: 2023 },
  pj_max: { value: 5 },
  duration: { value: 1 },
  deaths: { value: 0 },
};

/** A field omitted entirely — normalise turns it into null, not "". */
export const RAW_SANS_MJ = {
  campaign: { value: "Le Silence de Kaldir" },
  game: { value: "Blades in the Dark" },
  year: { value: 2024 },
  pj_max: { value: 4 },
  duration: { value: 1 },
  deaths: { value: 0 },
};

export const RAW_CAMPAIGNS = [
  RAW_GOBELINS,
  RAW_OMBRES,
  RAW_TRONE,
  RAW_EPEE,
  RAW_SANS_MJ,
];

/** The flat runtime shape, mirroring what normalise produces. */
export const GOBELINS = {
  campaign: "La Campagne des Gobelins",
  gm: "Benjamin",
  game: "Pathfinder 2e",
  year: 2024,
  pj_max: 6,
  duration: 2,
  deaths: 3,
  name: "La Campagne des Gobelins",
  id: "la-campagne-des-gobelins",
  notes: {
    campaign: ["Née d'un one-shot d'initiation."],
    deaths: ["Deux morts sur le même piège."],
  },
};

export const OMBRES = {
  campaign: "Les Ombres d'Ébène",
  gm: "Benjamin",
  game: "Dungeons & Dragons 5e",
  year: 2021,
  pj_max: 5,
  duration: 3,
  deaths: 7,
  name: "Les Ombres d'Ébène",
  id: "les-ombres-d-ebene",
  notes: {},
};

export const TRONE = {
  campaign: "Le Trône de Cendres",
  gm: "Antoine",
  game: "Warhammer Fantasy",
  year: 2025,
  pj_max: 4,
  duration: 4,
  deaths: 12,
  name: "Le Trône de Cendres",
  id: "le-trone-de-cendres",
  notes: {},
};

export const EPEE = {
  campaign: "L'Épée Brisée",
  gm: "Marion",
  game: "Dungeons & Dragons 5e",
  year: 2023,
  pj_max: 5,
  duration: 1,
  deaths: 0,
  name: "L'Épée Brisée",
  id: "l-epee-brisee",
  notes: {},
};

// `gm` is absent, not null: normalise only walks the keys the file actually
// has, and compareCampaigns coerces the missing key with `?? null`.
export const SANS_MJ = {
  campaign: "Le Silence de Kaldir",
  game: "Blades in the Dark",
  year: 2024,
  pj_max: 4,
  duration: 1,
  deaths: 0,
  name: "Le Silence de Kaldir",
  id: "le-silence-de-kaldir",
  notes: {},
};

/** Load order matters for getRandomCampaign cycle assertions. */
export const CAMPAIGNS = [GOBELINS, OMBRES, TRONE, EPEE, SANS_MJ];
