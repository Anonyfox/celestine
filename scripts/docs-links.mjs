import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const docs = new URL('../docs/', import.meta.url);
const home = new URL('index.html', docs);
const base = 'https://anonyfox.github.io/celestine/';
const html = readFileSync(home, 'utf8');
const sitemap = readFileSync(new URL('sitemap.xml', docs), 'utf8');
const destinations = [
  'modules.html',
  'accuracy/',
  'documents/COMPARISON.html',
  'documents/GUIDE.html',
  'examples/browser-natal-chart.html',
];
function links(page) {
  return [...page.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/gi)]
    .filter(([tag]) => !/\brel="[^"]*nofollow/i.test(tag))
    .map(([, href]) => href);
}
for (const destination of destinations) {
  assert(links(html).includes(destination), `Missing followed home link: ${destination}`);
  const output = destination.endsWith('/') ? `${destination}index.html` : destination;
  const file = new URL(output, docs);
  assert(statSync(file).isFile(), `Missing file: ${output}`);
  const page = readFileSync(file, 'utf8');
  assert(
    links(page).some((href) => [home.href, base].includes(new URL(href, file).href)),
    output,
  );
  assert(
    sitemap.includes(`<loc>${base}${destination}</loc>`),
    `Missing sitemap URL: ${destination}`,
  );
}
for (const output of [
  'index.html',
  ...destinations.map((path) => (path.endsWith('/') ? `${path}index.html` : path)),
]) {
  const page = readFileSync(new URL(output, docs), 'utf8');
  for (const pattern of [
    /<title>[^<]+<\/title>/,
    /rel="canonical"/,
    /property="og:title"/,
    /property="og:url"/,
  ]) {
    assert(pattern.test(page), `Missing metadata in ${output}: ${pattern}`);
  }
}
console.log(
  `Docs links: ${destinations.length} destinations resolve, link home, and appear in sitemap; metadata present.`,
);
