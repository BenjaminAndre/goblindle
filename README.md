# goblindle

A daily guessing game for the guild's tabletop RPG campaigns, in the style of
LoLdle: name the campaign of the day from its MJ, system, year, player count,
duration and body count.

| Directory | What it is |
| --- | --- |
| [`web/`](./web/) | The SvelteKit app, prerendered and deployed to GitHub Pages |

## Campaign data

Everything lives in **[`web/static/campaigns.json`](./web/static/campaigns.json)**,
edited by hand. There is no scraper and no generated copy — that file is the
source of truth, and it is served to the browser exactly as written.

One entry per campaign. `notes` is optional on every field, and `image` is
optional entirely:

```json
{
  "campaign": {
    "value": "La Campagne des Gobelins",
    "notes": ["Née d'un one-shot d'initiation."]
  },
  "image":    { "value": "gobelins.webp" },
  "gm":       { "value": "Benjamin" },
  "game":     { "value": "Pathfinder 2e" },
  "year":     { "value": 2024 },
  "pj_max":   { "value": 6 },
  "duration": { "value": 2 },
  "deaths":   { "value": 3 }
}
```

- `year` is the year the campaign started; `duration` is its length in whole
  years; `pj_max` is the largest the party ever got; `deaths` counts PC deaths.
- `0` is a real answer — a campaign where nobody died is `"deaths": { "value": 0 }`,
  not an omitted field.
- Optional illustrations go in `web/static/img/campaigns/`, and `image.value` is
  just the filename. Campaigns without one get a tile showing their initials.
- `notes` show up as a "?" bubble on that field's cell, one anecdote picked at
  random each time it opens. A field with no notes gets no bubble, so the
  affordance never promises something that isn't there. Write one note per
  entry in the array; several on the same field means the bubble varies.

Campaign names must be distinct even after accents and punctuation are stripped
— "La Quête du Roi" and "La Quete du Roi" collide. The app refuses to start on a
duplicate rather than breaking mid-game, so you will see the problem
immediately.

## The weekly rotation

The campaign changes every **Thursday at 19:00, Europe/Brussels** — just before
a session. The zone is fixed rather than the player's own, so everyone gets the
same campaign at the same moment, and a player abroad is not out of step. The
schedule lives in [`web/src/lib/schedule.js`](./web/src/lib/schedule.js); moving
the day or the hour means moving the anchor constant there.

Each campaign comes up exactly once per rotation, so with 16 campaigns the whole
set is used in 16 weeks before any repeat. A longer list means a longer cycle —
and more anecdotes to show.

Adding or removing a campaign reshuffles the rotation, which changes the current
answer and resets any game in progress. Edit between Thursdays rather than
mid-week.

## Logo

`logo_gg.png` at the repo root is the master copy of the club badge — 700×691,
with transparency. It is never deployed: `adapter-static` only copies
`web/static/`, so it costs nothing at runtime.

`web/static/logo.png` (192×192, the favicon and the header badge) and
`web/static/apple-touch-icon.png` (180×180, flattened onto the logo's own
off-white because iOS composites transparency onto black) are **derived from
it**. Regenerate them from the master, never from each other.

## Adding an attribute

The guessed attributes are listed once, in
[`web/src/lib/classic-mode.js`](./web/src/lib/classic-mode.js). Add a field to
every campaign in `campaigns.json`, add a matching entry to
`CLASSIC_ATTRIBUTES`, and the grid column follows automatically.

## License

Apache-2.0 — see [LICENSE](./web/LICENSE).
