# goblindle

A daily guessing game for the guild's tabletop RPG campaigns. The UI is in
French.

Built with SvelteKit and Svelte 5, styled with Tailwind CSS, and prerendered to
a static site deployed on GitHub Pages.

## Quick start

```bash
npm install
npm run dev
```

## Commands

```bash
npm run dev      # dev server
npm run build    # static build into build/
npm run preview  # serve the production build
npm test         # unit tests
npm run lint     # eslint
```

## Data

Campaign data is hand-edited in `static/campaigns.json`; optional illustrations
go in `static/img/campaigns/`. See the [root README](../README.md) for the entry
format and the rules the loader enforces.

## License

Apache-2.0 — see [LICENSE](LICENSE).
