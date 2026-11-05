import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const docs = new URL('docs/', root);
const base = 'https://anonyfox.github.io/celestine/';
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date());

// Keep this list editorial: generated API pages and media are deliberately excluded.
const pages = [
  { path: '', output: 'index.html', sources: ['README.md'] },
  { path: 'accuracy/', output: 'accuracy/index.html', sources: ['scripts/bench/accuracy.mjs'] },
  { path: 'GUIDE.md', output: 'GUIDE.md', sources: ['GUIDE.md', 'docs/GUIDE.md'] },
  {
    path: 'COMPARISON.md',
    output: 'COMPARISON.md',
    sources: ['COMPARISON.md', 'docs/COMPARISON.md'],
  },
];

function lastmod(sources) {
  const source = sources.find((path) => existsSync(new URL(path, root)));
  if (source) {
    try {
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
  return today;
}

function escapeXml(value) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
  return value.replace(/[&<>"']/g, (character) => entities[character]);
}

mkdirSync(docs, { recursive: true });
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
