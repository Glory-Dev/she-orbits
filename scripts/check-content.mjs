#!/usr/bin/env node
/**
 * Validates every markdown file in src/content/* with friendly messages, and flags image files that are
 * too heavy for the web. Runs before every build (npm run build) and in CI.
 *
 *   node scripts/check-content.mjs [--warn-assets]
 *
 * --warn-assets  report missing image/video/slideshow files as warnings instead of errors
 *                (handy while you are still copying /assets from the old site).
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import matter from 'gray-matter';

const WARN_ASSETS = process.argv.includes('--warn-assets');
const IMG = /\.(jpe?g|png|webp|gif|avif)$/i;
const types = JSON.parse(readFileSync('src/data/opportunity-types.json', 'utf8')).map((t) => t.id);
const errors = [];
const warnings = [];
const err = (f, m) => errors.push(`${f}\n    ✗ ${m}`);
const warn = (f, m) => warnings.push(`${f}\n    ! ${m}`);
const asset = (f, m) => (WARN_ASSETS ? warn : err)(f, m);

const SPECS = {
  opportunities: {
    required: ['title', 'type', 'status', 'image'],
    optional: ['summary', 'form', 'order', 'draft'],
    enums: { type: types, status: ['ongoing', 'upcoming', 'coming-soon', 'past'] },
    urls: ['form'],
  },
  sectors: {
    required: ['title', 'number', 'status', 'image', 'summary'],
    optional: ['cardTitle', 'draft'],
    enums: { status: ['active', 'coming-soon'] },
    urls: [],
  },
  projects: {
    required: ['title', 'image', 'summary'],
    optional: ['keywords', 'imagePosition', 'order', 'draft'],
    enums: {},
    urls: [],
  },
  news: {
    required: ['title', 'source', 'url', 'image', 'summary'],
    optional: ['imagePosition', 'date', 'order', 'draft'],
    enums: {},
    urls: ['url'],
    bodyIgnored: true,
  },
};

const publicFile = (p) => existsSync(join('public', p));
const publicDirImages = (p) => (existsSync(join('public', p)) ? readdirSync(join('public', p)).filter((f) => IMG.test(f)) : null);
let total = 0;
const numbers = new Map();

for (const [collection, spec] of Object.entries(SPECS)) {
  const dir = join('src/content', collection);
  if (!existsSync(dir)) continue;
  for (const name of readdirSync(dir)) {
    if (name.startsWith('_')) continue; // templates / work in progress
    const rel = `${dir}/${name}`;
    if (!name.endsWith('.md')) { warn(rel, 'ignored: only .md files are used'); continue; }
    total++;
    const slug = name.slice(0, -3);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) err(rel, `file name "${slug}" must be lowercase letters, numbers and dashes only (it becomes the URL)`);

    let parsed;
    try { parsed = matter(readFileSync(rel, 'utf8')); }
    catch (e) { err(rel, `front matter is not valid YAML: ${e.message.split('\n')[0]}`); continue; }
    const d = parsed.data;
    for (const k of spec.required) if (d[k] === undefined || d[k] === '') err(rel, `missing required field "${k}"`);
    for (const k of Object.keys(d)) if (![...spec.required, ...spec.optional].includes(k)) warn(rel, `unknown field "${k}" (typo?). Allowed: ${[...spec.required, ...spec.optional].join(', ')}`);
    for (const [k, allowed] of Object.entries(spec.enums)) if (d[k] !== undefined && !allowed.includes(d[k])) err(rel, `"${k}: ${d[k]}" is not valid. Use one of: ${allowed.join(', ')}`);
    for (const k of spec.urls) if (d[k]) { try { new URL(d[k]); } catch { err(rel, `${k} must be a full URL starting with https:// (got "${d[k]}")`); } }
    if (d.image) {
      if (!String(d.image).startsWith('/assets/')) err(rel, `image must start with /assets/ (got "${d.image}")`);
      else if (!publicFile(d.image)) asset(rel, `image not found: public${d.image}`);
    }
    if (d.order !== undefined && !Number.isInteger(d.order)) err(rel, '"order" must be a whole number');
    if (d.keywords !== undefined && !(Array.isArray(d.keywords) && d.keywords.every((k) => typeof k === 'string'))) err(rel, '"keywords" must be a list of words, e.g. keywords: ["CubeSat", "Orbits"]');
    if (d.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(d.date instanceof Date ? d.date.toISOString().slice(0, 10) : d.date))) err(rel, '"date" must look like 2026-11-03');
    if (d.imagePosition !== undefined && !/^[a-z0-9% .-]+$/i.test(String(d.imagePosition))) err(rel, '"imagePosition" must be CSS like "center 30%"');
    if (collection === 'sectors' && d.number !== undefined) {
      if (!Number.isInteger(d.number) || d.number < 1) err(rel, '"number" must be a positive whole number');
      if (numbers.has(d.number)) err(rel, `sector number ${d.number} is already used by ${numbers.get(d.number)}`);
      numbers.set(d.number, name);
    }
    if (collection === 'opportunities' && d.status === 'upcoming' && !d.form) warn(rel, 'status is "upcoming" but there is no "form" link, so no Apply button will show');

    // ---- body ----
    const body = parsed.content;
    if (spec.bodyIgnored && body.trim()) warn(rel, 'news items only use the fields above: the text below them is not shown');
    body.split('\n').forEach((line, i) => {
      const at = `${rel}:${i + 1 + (parsed.matter ? parsed.matter.split('\n').length + 1 : 0)}`;
      if (/^# [^#]/.test(line)) warn(at, 'avoid a "# Heading" in the body: the page title is already the H1. Start with "## "');
      const dir_ = line.match(/^::(\w+)(\[[^\]]*\])?\{([^}]*)\}\s*$/);
      if (/^::\w/.test(line) && !dir_) { err(at, `malformed directive: ${line.trim()}  (expected ::name{key="value"})`); return; }
      if (dir_) {
        const attrs = Object.fromEntries([...dir_[3].matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
        if (dir_[1] === 'slideshow') {
          if (!attrs.folder) err(at, 'slideshow needs folder="/assets/images/..."');
          else {
            const imgs = publicDirImages(attrs.folder);
            if (imgs === null) asset(at, `slideshow folder not found: public${attrs.folder}`);
            else if (!imgs.length) asset(at, `slideshow folder has no web images: public${attrs.folder}`);
          }
        } else if (dir_[1] === 'video') {
          if (!attrs.src) err(at, 'video needs src="/assets/videos/..."');
          else if (!publicFile(attrs.src)) asset(at, `video not found: public${attrs.src}`);
        } else if (dir_[1] === 'button') {
          if (!attrs.href) err(at, 'button needs href="https://..."');
        } else err(at, `unknown directive ::${dir_[1]} (available: slideshow, video, button)`);
      }
      for (const m of line.matchAll(/!\[[^\]]*\]\((\/[^)\s]+)\)/g)) if (!publicFile(m[1])) asset(at, `image not found: public${m[1]}`);
    });
  }
}

// ---- image weight / hygiene (the usual reason a gallery "doesn't load") ----
const MB = 1048576;
const walk = (d) => (existsSync(d) ? readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)])) : []);
const heavy = [], huge = [], odd = [], nonWeb = [];
for (const f of walk('public/assets/images')) {
  const ext = extname(f).toLowerCase();
  if (/\.(tiff?|heic|heif|bmp|psd)$/.test(ext)) { nonWeb.push(f); continue; }
  if (!/\.(png|jpe?g|webp|gif|avif)$/.test(ext)) continue;
  const size = statSync(f).size;
  if (size > 15 * MB) huge.push(`${f} (${(size / MB).toFixed(1)} MB)`);
  else if (size > 1.5 * MB) heavy.push(`${f} (${(size / MB).toFixed(1)} MB)`);
  if (/[A-Z\s()]/.test(basename(f))) odd.push(f);
}
const list = (a) => a.slice(0, 5).map((x) => `      ${x}`).join('\n') + (a.length > 5 ? `\n      … and ${a.length - 5} more` : '');
if (huge.length) err('public/assets/images', `${huge.length} image(s) over 15 MB (browsers and GitHub uploads choke on these). Run: npm run images:optimize\n${list(huge)}`);
if (heavy.length) warn('public/assets/images', `${heavy.length} image(s) over 1.5 MB will load slowly. Run: npm run images:optimize\n${list(heavy)}`);
if (nonWeb.length) warn('public/assets/images', `${nonWeb.length} file(s) in a format browsers can't show (TIFF/HEIC/BMP/PSD). Run: npm run images:optimize\n${list(nonWeb)}`);
if (odd.length) warn('public/assets/images', `${odd.length} file name(s) with capitals, spaces or brackets can break links on GitHub Pages (case-sensitive). npm run images:optimize renames them\n${list(odd)}`);

console.log(`Checked ${total} content files.`);
if (warnings.length) console.log(`\n${warnings.length} warning(s):\n` + warnings.map((w) => '  ' + w).join('\n'));
if (errors.length) { console.error(`\n${errors.length} problem(s) to fix:\n` + errors.map((e) => '  ' + e).join('\n') + '\n'); process.exit(1); }
console.log('Content OK');
