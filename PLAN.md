# PLAN — Thrilok Forge

## Intent

**"Thrilok Forge"** — a personal-brand showcase site cataloging Thrilok's repos,
starting with two. Static site, no backend, no accounts, no payments.

- **URL:** `thrillokforge.pages.dev` (free Cloudflare Pages subdomain; custom
  domain attachable later)
- **Tagline:** "Things I build — AI experiments, tools, and plugins."
- **Brand:** header carries the name Thrilok; site name is Thrilok Forge
- **Seed cards (2):**
  - `curio` — https://github.com/Thrilok28021996/curio (Python MCP server,
    autonomous learning agent for LM Studio)
  - `lm-studio-plugins` — https://codeberg.org/thrilok/lm-studio-plugins
    (collection of LM Studio plugins, JavaScript)
- **Each card:** title, description, language badge, tags, star count,
  "View repo" button (opens GitHub/Codeberg in a new tab)
- **Site-wide Ko-fi button:** https://ko-fi.com/thriloke96 (header/footer)
- **Design:** dark, modern dev-brand look, responsive card grid
- **Language:** English only

## How

1. **Repo:** `thrillok-forge` on GitHub = source of truth. Codeberg
   pull-mirror (New Migration → "This repository will be a mirror"). Deploy
   wired to the GitHub repo.
2. **Content:** `projects.json` — entries: `url`, `title`, `description`,
   `tags`. Adding a project later = add one entry and push.
3. **Build:** one small Node script (`build.mjs`) reads `projects.json`,
   fetches stars + primary language from GitHub and Codeberg APIs at build
   time, renders static HTML into `dist/`. Falls back to stale/zero stars if
   an API call fails — a rate limit never breaks a deploy.
4. **Deploy:** Cloudflare Pages (free account required — user does the
   signup), build command `node build.mjs`, output dir `dist/`. Push →
   auto rebuild.
5. **Ship:** PR with evidence, user merges.

## Acceptance criteria

- [ ] Site live at `thrillokforge.pages.dev` showing 2 correct cards
- [ ] Card click opens the correct GitHub/Codeberg repo in a new tab
- [ ] Ko-fi button (site-wide) → `ko-fi.com/thriloke96`
- [ ] Adding an entry to `projects.json` + push → card appears with stars
- [ ] Codeberg pull-mirror exists with full history
- [ ] No auth, no payments, no search anywhere
- [ ] Repo gates pass (lint/build)

## Out of scope

Payments, accounts, search/tag filtering, per-plugin sub-cards, README
rendering, analytics, custom domain, multi-author listings.

## Decisions the user made

- Add projects by editing `projects.json` (option a) — no admin UI
- One card per repo, not per plugin
- Source repo mirrored: GitHub (truth) + Codeberg (pull-mirror)
- Free subdomain for now, custom domain later
- No accounts, no search, plain grid
- One site-wide Ko-fi button, not per-project
- Stars/language fetched automatically at build time
- Name: Thrilok Forge (chosen by assistant, user confirmed)

## Open risks

- Cloudflare account signup is a manual step for the user
- Build-time API calls hit unauthenticated rate limits on shared IPs —
  mitigated by optional `GITHUB_TOKEN` env var and graceful fallback
- Stars refresh per deploy, not live
