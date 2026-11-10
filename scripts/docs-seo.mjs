import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const docs = new URL('docs/', root);
const base = 'https://anonyfox.github.io/celestine/';
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date());

// Keep this list editorial; module landing pages are discovered below.
// Individual API symbols, media and site-verification HTML are excluded.
const pages = [
  { path: '', output: 'index.html', sources: ['doc/landing.md', 'typedoc.json'] },
  { path: 'accuracy/', output: 'accuracy/index.html', sources: ['scripts/bench/accuracy.mjs'] },
  { path: 'documents/GUIDE.html', output: 'documents/GUIDE.html', sources: ['docs/GUIDE.md'] },
  {
    path: 'documents/COMPARISON.html',
    output: 'documents/COMPARISON.html',
    sources: ['docs/COMPARISON.md'],
  },
  {
    path: 'examples/browser-natal-chart.html',
    output: 'examples/browser-natal-chart.html',
    sources: ['examples/browser-natal-chart.html'],
  },
];

function lastmod(sources) {
  const source = sources.find((path) => existsSync(new URL(path, root)));
  if (source) {
    try {
      const dirty = execFileSync('git', ['status', '--porcelain', '--', source], {
        cwd: fileURLToPath(root),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      if (dirty) return statSync(new URL(source, root)).mtime.toISOString().slice(0, 10);
      const date = execFileSync('git', ['log', '-1', '--format=%cs', '--', source], {
        cwd: fileURLToPath(root),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    } catch {
      // Source archives may not contain Git history.
    }
  }
  return source ? statSync(new URL(source, root)).mtime.toISOString().slice(0, 10) : today;
}

function escapeXml(value) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
  return value.replace(/[&<>"']/g, (character) => entities[character]);
}

// Facts from README.md: introduction and the sampled JPL Horizons precision checks.
const siteTitle =
  'Celestine: TypeScript astrology and astronomy library (zero runtime dependencies, JPL Horizons checked)';
const description =
  'MIT-licensed TypeScript astrology and astronomy library for charts, houses, aspects, transits, stations, progressions and events. Zero runtime dependencies, browser and Node support, with positions checked against JPL Horizons fixtures.';

function updateMetadata(output, title) {
  const file = new URL(output, docs);
  if (!existsSync(file)) return;
  const canonical = base + output.replace(/(^|\/)index\.html$/, '$1');
  const metadata = [
    `<title>${escapeXml(title)}</title>`,
    `<meta name="description" content="${escapeXml(description)}"/>`,
    `<link rel="canonical" href="${escapeXml(canonical)}"/>`,
    ...Object.entries({ title, description, type: 'website', url: canonical }).map(
      ([property, content]) => `<meta property="og:${property}" content="${escapeXml(content)}"/>`,
    ),
  ].join('');
  // Replace owned metadata rather than append duplicates, including on repeated builds.
  const html = readFileSync(file, 'utf8')
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\b[^>]*>/gi, (tag) =>
      /\b(?:name|property)\s*=\s*["'](?:description|og:(?:title|description|type|url))["']/i.test(
        tag,
      )
        ? ''
        : tag,
    )
    .replace(/<link\b[^>]*>/gi, (tag) => (/\brel\s*=\s*["']canonical["']/i.test(tag) ? '' : tag))
    .replace(/<\/head>/i, `${metadata}</head>`);
  writeFileSync(file, html, 'utf8');
}

mkdirSync(docs, { recursive: true });
// Publish the standalone CDN demo alongside the API docs (no generated HTML edits).
mkdirSync(new URL('examples/', docs), { recursive: true });
copyFileSync(
  new URL('examples/browser-natal-chart.html', root),
  new URL('examples/browser-natal-chart.html', docs),
);
// Give each destination a static route back to the documentation home.
for (const { output } of pages) {
  if (output === 'index.html') continue;
  const file = new URL(output, docs);
  if (!existsSync(file)) throw new Error(`Missing docs destination: ${output}`);
  const title = readFileSync(file, 'utf8').match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
  updateMetadata(output, title || siteTitle);
  const html = readFileSync(file, 'utf8')
    .replace(/<nav aria-label="Documentation home">[\s\S]*?<\/nav>/g, '')
    .replace(
      /<body\b[^>]*>/i,
      '$&<nav aria-label="Documentation home"><a href="../index.html">Celestine documentation</a></nav>',
    );
  writeFileSync(file, html, 'utf8');
}
updateMetadata('index.html', siteTitle);
for (const output of ['modules.html', 'hierarchy.html']) {
  if (existsSync(new URL(output, docs))) {
    updateMetadata(output, `API reference | ${siteTitle}`);
    pages.push({ path: output, output, sources: ['src/index.ts', 'README.md'] });
  }
}
const modules = new URL('modules/', docs);
if (existsSync(modules)) {
  for (const entry of readdirSync(modules, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
    const name = entry.name.slice(0, -5).replace(/^index\./, '');
    const output = `modules/${entry.name}`;
    updateMetadata(output, `${name} API | ${siteTitle}`);
    pages.push({
      path: output,
      output,
      sources: [name === 'index' ? 'src/index.ts' : `src/${name}/index.ts`, 'README.md'],
    });
  }
}
const urls = pages
  .filter(({ output }) => {
    const file = new URL(output, docs);
    return existsSync(file) && statSync(file).isFile();
  })
  .map(
    ({ path, sources }) =>
      `  <url><loc>${escapeXml(base + path)}</loc><lastmod>${escapeXml(lastmod(sources))}</lastmod></url>`,
  );
writeFileSync(
  new URL('sitemap.xml', docs),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
  'utf8',
);
writeFileSync(
  new URL('robots.txt', docs),
  `User-agent: *\nAllow: /\n\nSitemap: ${base}sitemap.xml\n`,
  'utf8',
);

const verification = new URL('doc/site-verification/', root);
if (existsSync(verification)) {
  for (const entry of readdirSync(verification, { withFileTypes: true })) {
    if (entry.isFile() && entry.name !== '.gitkeep') {
      copyFileSync(new URL(entry.name, verification), new URL(entry.name, docs));
    }
  }
}

console.log(`Docs SEO: ${urls.length} URLs in sitemap.xml`);
