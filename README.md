# Thrilok Forge

Personal showcase site for [Thrilok](https://github.com/Thrilok28021996)'s
projects — a plain dark grid of cards, each linking out to its GitHub or
Codeberg repo, with a site-wide [Ko-fi](https://ko-fi.com/thriloke96)
support button. No accounts, no backend, no tracking.

**Live:** `thrillokforge.pages.dev` (Cloudflare Pages)

## How it works

- [`projects.json`](projects.json) — the only file you edit to add a project.
- [`build.mjs`](build.mjs) — reads `projects.json`, fetches stars and
  primary language from the GitHub/Codeberg APIs at build time, renders
  static HTML into `dist/`. If an API call fails (e.g. rate limit), the
  build still succeeds and the card shows `—` for stars.
- [`styles.css`](styles.css) — the dark theme, copied into `dist/`.

## Add a project

Append one entry to `projects.json` and push:

```json
{
  "url": "https://github.com/owner/repo",
  "title": "Repo name",
  "description": "One or two sentences for the card.",
  "tags": ["Tag", "Another tag"]
}
```

That's it — the rebuild picks up the card, its stars, and its language
automatically.

## Run locally

```bash
npm run build     # writes dist/
npm run check     # syntax-check build.mjs
open dist/index.html
```

## Deploy (Cloudflare Pages)

One-time setup:

1. Create a free account at <https://dash.cloudflare.com/sign-up> (no credit
   card).
2. **Workers & Pages → Create → Pages → Connect to Git** and authorize
   GitHub, picking this repository.
3. Build settings: build command `npm run build`, output directory `dist`.
4. Optional but recommended: add env var `GITHUB_TOKEN` (a read-only
   token) to raise the API rate limit for star fetches.
5. Every push to `main` now rebuilds and deploys automatically.

The site lives at `<project>.pages.dev`. A custom domain can be attached
later in the same dashboard.

## Repos

- **Source of truth:** GitHub.
- **Mirror:** Codeberg — create it as a *pull mirror* (Codeberg
  **Create → New Migration** → enter the GitHub URL → check **"This
  repository will be a mirror"**). Mirrors can only be created for repos
  that don't yet exist on Codeberg, and Codeberg keeps the full history
  even if GitHub disappears (syncing just stops).
