#!/usr/bin/env node
/**
 * Post-build check on dist/: every internal link, image, video, script and #anchor must resolve.
 *   node scripts/check-links.mjs [--warn-assets]
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';

const WARN_ASSETS = process.argv.includes('--warn-assets');
const DIST = 'dist';
const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
const pages = walk(DIST).filter((f) => f.endsWith('.html'));
const idsCache = new Map();
const idsOf = (file) => {
  if (!idsCache.has(file)) idsCache.set(file, new Set([...readFileSync(file, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  return idsCache.get(file);
};
const resolve = (path) => {
  const p = join(DIST, decodeURIComponent(path));
  if (existsSync(p) && statSync(p).isFile()) return p;
  if (existsSync(join(p, 'index.html'))) return join(p, 'index.html');
  return null;
};

const brokenPages = new Map();
const missingAssets = new Map();
for (const page of pages) {
  const html = readFileSync(page, 'utf8').replace(/<script[^>]*type="application\/json"[\s\S]*?<\/script>/g, '');
  const here = '/' + page.slice(DIST.length + 1).replace(/index\.html$/, '');
  for (const m of html.matchAll(/\b(?:href|src|poster)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(https?:|mailto:|tel:|javascript:|data:|\/\/)/.test(url)) continue;
    const [pathPart, hash] = url.split('#');
    const clean = pathPart.split('?')[0];
    const target = clean === '' ? page : clean.startsWith('/') ? resolve(clean) : resolve(join(dirname(here), clean));
    if (!target) {
      const isAsset = clean.startsWith('/assets/') || /\.(png|jpe?g|webp|gif|svg|mp4|webm|woff2?|css|js|pdf)$/i.test(clean);
      const bucket = isAsset ? missingAssets : brokenPages;
      (bucket.get(clean) ?? bucket.set(clean, new Set()).get(clean)).add(here);
      continue;
    }
    if (hash && target.endsWith('.html') && !idsOf(target).has(hash)) {
      const key = `${clean || here}#${hash}`;
      (brokenPages.get(key) ?? brokenPages.set(key, new Set()).get(key)).add(here + '  (anchor not found)');
    }
  }
}
const show = (map, label) => {
  console.log(`\n${label}: ${map.size}`);
  for (const [k, v] of [...map].slice(0, 40)) console.log(`  ${k}\n      on ${[...v].slice(0, 3).join(', ')}${v.size > 3 ? ` (+${v.size - 3} more)` : ''}`);
  if (map.size > 40) console.log(`  … ${map.size - 40} more`);
};
console.log(`Scanned ${pages.length} pages.`);
let fail = false;
if (brokenPages.size) { show(brokenPages, 'Broken links / anchors'); fail = true; }
if (missingAssets.size) { show(missingAssets, 'Missing files'); if (!WARN_ASSETS) fail = true; }
if (fail) process.exit(1);
console.log('Links OK');
