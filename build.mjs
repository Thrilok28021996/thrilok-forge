#!/usr/bin/env node
// Builds the static Thrilok Forge site into dist/.
// Reads projects.json, fetches stars/language from GitHub + Codeberg APIs
// (with graceful fallback so a rate limit never breaks a deploy),
// and renders index.html + styles.css.

import { readFile, mkdir, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist');

const LANGUAGE_COLORS = {
  Python: '#3572A5',
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Go: '#00ADD8',
  Rust: '#dea584',
  C: '#555555',
  'C++': '#f34b7d',
  'C#': '#178600',
  Java: '#b07219',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function parseRepoUrl(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname === 'github.com' || u.hostname === 'www.github.com' ? 'github'
    : u.hostname === 'codeberg.org' ? 'codeberg'
    : null;
  if (!host) return null;
  const segments = u.pathname.replace(/^\//, '').replace(/\.git$/, '').split('/').filter(Boolean);
  if (segments.length !== 2) return null;
  return { host, owner: segments[0], repo: segments[1] };
}

async function fetchJSON(url, headers = {}) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'thrilok-forge-build', Accept: 'application/json', ...headers },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

// Fetch stars + primary language; never throws — falls back to nulls.
async function fetchMetadata(project) {
  try {
    const parsed = parseRepoUrl(project.url);
    if (!parsed) {
      console.warn(`warn: unsupported repo URL, no metadata: ${project.url}`);
      return { stars: null, language: null };
    }
    if (parsed.host === 'github') {
      const headers = process.env.GITHUB_TOKEN
        ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
        : {};
      const data = await fetchJSON(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
        headers,
      );
      return {
        stars: typeof data.stargazers_count === 'number' ? data.stargazers_count : null,
        language: data.language || null,
      };
    }
    const data = await fetchJSON(
      `https://codeberg.org/api/v1/repos/${parsed.owner}/${parsed.repo}`,
    );
    return {
      stars: typeof data.stars_count === 'number' ? data.stars_count : null,
      language: data.language || null,
    };
  } catch (err) {
    console.warn(`warn: metadata fetch failed for ${project.url}: ${err.message} — using fallback`);
    return { stars: null, language: null };
  }
}

function formatStars(stars) {
  if (stars === null) return '—';
  if (stars >= 1000) return `${(stars / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(stars);
}

function renderCard(project, meta) {
  const title = escapeHtml(project.title);
  const description = escapeHtml(project.description);
  const href = escapeHtml(project.url);
  const stars = escapeHtml(formatStars(meta.stars));
  const tags = (project.tags ?? [])
    .map((tag) => `<li>${escapeHtml(tag)}</li>`)
    .join('');
  const language = meta.language
    ? `<span class="lang"><span class="lang-dot" style="background:${Object.hasOwn(LANGUAGE_COLORS, meta.language) ? LANGUAGE_COLORS[meta.language] : '#8b949e'}"></span>${escapeHtml(meta.language)}</span>`
    : '';
  return `      <li>
        <a class="card" href="${href}" target="_blank" rel="noopener noreferrer">
          <div class="card-head">
            <h2>${title}</h2>
            <span class="stars" title="Stars at last build">★ ${stars}</span>
          </div>
          <p class="card-desc">${description}</p>
          <ul class="tags">${tags}</ul>
          <div class="card-foot">
            ${language}
            <span class="view-repo">View repo →</span>
          </div>
        </a>
      </li>`;
}

function renderPage(site, cards) {
  const name = escapeHtml(site.name);
  const owner = escapeHtml(site.owner);
  const tagline = escapeHtml(site.tagline);
  const kofi = escapeHtml(site.kofi);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${tagline}">
  <meta property="og:title" content="${name} — ${owner}'s projects">
  <meta property="og:description" content="${tagline}">
  <meta property="og:type" content="website">
  <title>${name} — ${owner}'s projects</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚒️</text></svg>">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header class="site-header">
    <div class="brand-row">
      <div>
        <span class="brand">${name}</span>
        <p class="tagline">${tagline}</p>
      </div>
      <a class="kofi-button" href="${kofi}" target="_blank" rel="noopener noreferrer">☕ Support me on Ko-fi</a>
    </div>
  </header>
  <main>
    <ul class="grid">
${cards.join('\n')}
    </ul>
  </main>
  <footer class="site-footer">
    <p>© ${new Date().getFullYear()} ${owner} · Built by ${owner}</p>
    <a href="${kofi}" target="_blank" rel="noopener noreferrer">☕ Ko-fi</a>
  </footer>
</body>
</html>
`;
}

async function main() {
  const raw = await readFile(path.join(root, 'projects.json'), 'utf8');
  const { site, projects } = JSON.parse(raw);
  if (!site || typeof site !== 'object') {
    throw new Error('projects.json must contain a site object and a non-empty projects array');
  }
  for (const field of ['name', 'owner', 'tagline', 'kofi']) {
    if (typeof site[field] !== 'string' || site[field].trim() === '') {
      throw new Error(`projects.json: site."${field}" must be a non-empty string`);
    }
  }
  let kofiUrl;
  try {
    kofiUrl = new URL(site.kofi);
  } catch {
    throw new Error('projects.json: site."kofi" must be an absolute https:// URL');
  }
  if (kofiUrl.protocol !== 'https:') {
    throw new Error('projects.json: site."kofi" must be an absolute https:// URL');
  }
  if (!Array.isArray(projects) || projects.length === 0) {
    throw new Error('projects.json must contain a non-empty projects array');
  }
  for (const [i, p] of projects.entries()) {
    for (const field of ['url', 'title', 'description']) {
      if (typeof p?.[field] !== 'string' || p[field].trim() === '') {
        throw new Error(`projects.json: projects[${i}] needs a non-empty "${field}"`);
      }
    }
    if (!parseRepoUrl(p.url)) {
      throw new Error(`projects.json: projects[${i}] "url" must be a github.com or codeberg.org repo URL (exactly https://host/owner/repo)`);
    }
    if (p.tags !== undefined) {
      if (!Array.isArray(p.tags) || p.tags.some((t) => typeof t !== 'string' || t.trim() === '')) {
        throw new Error(`projects.json: projects[${i}] "tags" must be an array of non-empty strings`);
      }
    }
  }

  const metas = await Promise.all(projects.map((project) => fetchMetadata(project)));
  const cards = projects.map((project, i) => {
    const meta = metas[i];
    console.log(`  ${project.title}: stars=${meta.stars ?? 'fallback'} language=${meta.language ?? 'fallback'}`);
    return renderCard(project, meta);
  });

  await mkdir(dist, { recursive: true });
  await writeFile(path.join(dist, 'index.html'), renderPage(site, cards));
  await copyFile(path.join(root, 'styles.css'), path.join(dist, 'styles.css'));
  console.log(`built dist/index.html with ${cards.length} card(s)`);
}

main().catch((err) => {
  console.error(`build failed: ${err.message}`);
  process.exit(1);
});
