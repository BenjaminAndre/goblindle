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
- `notes` are not displayed yet. They are carried through to the app keyed by
  field, ready for the per-cell hover bubble planned for v0.2.

Campaign names must be distinct even after accents and punctuation are stripped
— "La Quête du Roi" and "La Quete du Roi" collide. The app refuses to start on a
duplicate rather than breaking mid-game, so you will see the problem
immediately.

Adding a campaign changes the rotation, which changes today's answer and resets
any game already in progress. Edit between days rather than mid-day.

## Adding an attribute

The guessed attributes are listed once, in
[`web/src/lib/classic-mode.js`](./web/src/lib/classic-mode.js). Add a field to
every campaign in `campaigns.json`, add a matching entry to
`CLASSIC_ATTRIBUTES`, and the grid column follows automatically.

## License

Apache-2.0 — see [LICENSE](./web/LICENSE).
