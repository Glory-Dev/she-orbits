#!/usr/bin/env node
/**
 * One-off (but re-runnable) migration: legacy JSON -> markdown content files.
 *
 *   node scripts/migrate-json-to-md.mjs [--sectors legacy/sectors.json] [--opportunities legacy/opportunities.json]
 *
 * Re-run it if the old site's JSON changed before you cut over. It overwrites
 * files in src/content/*, so don't run it after you start editing markdown by hand.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import TurndownService from 'turndown';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const sectorsFile = arg('sectors', 'legacy/sectors.json');
const oppsFile = arg('opportunities', 'legacy/opportunities.json');

const normPath = (p) => (p || '').replace(/^(\.{1,2}\/+)+/, '/').replace(/\/{2,}/g, '/');
const TYPE_FIXES = { panels: 'talks-panels' }; // legacy typo -> real type id
const q = (v) => JSON.stringify(String(v ?? '')); // JSON strings are valid YAML

// ---------- HTML -> markdown (only for the few records that embed HTML) ----------
const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', emDelimiter: '*' });
td.keep(['u']);
td.addRule('slideshow', {
  filter: (n) => n.nodeName === 'DIV' && n.hasAttribute('data-slideshow-folder'),
  replacement: (_c, n) => {
    const folder = normPath(n.getAttribute('data-slideshow-folder'));
    const alt = n.getAttribute('data-slideshow-alt') || '';
    return `\n\n::slideshow{folder="${folder}" alt="${alt.replace(/"/g, "'")}"}\n\n`;
  },
});
td.addRule('video', {
  filter: 'video',
  replacement: (_c, n) => {
    const src = n.getAttribute('src') || n.querySelector('source')?.getAttribute('src') || '';
    return `\n\n::video{src="${normPath(src)}"}\n\n`;
  },
});
// old pages used h3 (section) / h4 (sub-section); body headings now start at ##
td.addRule('h3', { filter: 'h3', replacement: (c) => `\n\n## ${c.trim()}\n\n` });
td.addRule('h4', { filter: 'h4', replacement: (c) => `\n\n### ${c.trim()}\n\n` });

const looksLikeHtml = (s) => /<[a-z][\s\S]*>/i.test(s);
const attr = (tag, name) => (tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i')) || [])[1] || '';

function detailToMarkdown(s) {
  if (!s) return '';
  if (!looksLikeHtml(s)) return s.trim();
  let html = s
    // turndown drops empty elements, so swap slideshow holders for text placeholders first
    .replace(/<div\b[^>]*data-slideshow-folder[^>]*>\s*<\/div>/gi, (tag) =>
      `<p>@@SLIDESHOW|${normPath(attr(tag, 'data-slideshow-folder'))}|${attr(tag, 'data-slideshow-alt')}@@</p>`)
    .replace(/<\/?u>/gi, '')                                   // underline: not part of the markdown format
    .replace(/<strong>([^<]*?)\s*<strong>/gi, '<strong>$1</strong>') // unclosed <strong> in the source
    .replace(/<(strong|b)>\s*<\/\1>/gi, '')                      // empty bold
    .replace(/&nbsp;/g, ' ');
  let md = td.turndown(html)
    .replace(/@@SLIDESHOW\|([^|]*)\|([^@]*)@@/g, (_m, f, a) => `::slideshow{folder="${f}" alt="${a.replace(/"/g, "'")}"}`)
    .replace(/\*{4,}/g, '')
    .replace(/^[ \t]+$/gm, '')
    .replace(/[ \t]+\n/g, '\n')                                // drop trailing spaces / hard breaks
    .replace(/\n{3,}/g, '\n\n');
  return md.trim();
}

// ---------- opportunities ----------
const opp = JSON.parse(readFileSync(oppsFile, 'utf8'));
const typeIds = new Set(opp.types.map((t) => t.id));
mkdirSync('src/data', { recursive: true });
// The header menu uses slightly different wording than the section titles for two types.
const NAV_LABELS = { 'missions-simulations': 'Missions & Simulations', 'astronaut-training': 'Astronaut Trainings' };
const typesOut = opp.types.map((t) => (NAV_LABELS[t.id] ? { ...t, navLabel: NAV_LABELS[t.id] } : t));
writeFileSync('src/data/opportunity-types.json', JSON.stringify(typesOut, null, 2) + '\n');

rmSync('src/content/opportunities', { recursive: true, force: true });
mkdirSync('src/content/opportunities', { recursive: true });
let nOpp = 0;
const warnings = [];
opp.opportunities.forEach((o, i) => {
  if (!(o && o.slug && o.title && o.type && o.lifecycle)) return; // legacy loader skipped empty placeholders
  const draft = !typeIds.has(o.type);
  if (draft) {
    warnings.push(`${o.slug}: type "${o.type}" is not in the types list -> written with draft: true, type: ${TYPE_FIXES[o.type] ?? '?'}`);
    o.type = TYPE_FIXES[o.type] ?? o.type;
  }
  const fm = [
    `title: ${q(o.title)}`,
    `type: ${q(o.type)}`,
    `status: ${q(o.lifecycle)}`,
    `image: ${q(normPath(o.image))}`,
    ...(o.form ? [`form: ${q(o.form)}`] : []),
    `order: ${(i + 1) * 10}`,
    ...(draft ? ['draft: true'] : []),
    `summary: ${q(o.description)}`,
  ];
  const body = [];
  const detail = detailToMarkdown(o.detail);
  if (detail) body.push(detail);
  if (o.topics?.length) body.push('## Topics covered\n\n' + o.topics.map((t) => `- ${t}`).join('\n'));
  if (o.sessions?.length) body.push('## Sessions & milestones\n\n' + o.sessions.map((t) => `- ${t}`).join('\n'));
  writeFileSync(join('src/content/opportunities', `${o.slug}.md`), `---\n${fm.join('\n')}\n---\n\n${body.join('\n\n')}\n`);
  nOpp++;
});

// ---------- sectors ----------
const sec = JSON.parse(readFileSync(sectorsFile, 'utf8')).sectors;
rmSync('src/content/sectors', { recursive: true, force: true });
mkdirSync('src/content/sectors', { recursive: true });
sec.forEach((s) => {
  const fm = [
    `title: ${q(s.name)}`,
    ...(s.shortName && s.shortName !== s.name ? [`cardTitle: ${q(s.shortName)}`] : []),
    `number: ${s.id}`,
    `status: ${q(s.status)}`,
    `image: ${q(normPath(s.image))}`,
    `summary: ${q(s.description)}`,
  ];
  writeFileSync(join('src/content/sectors', `${s.slug}.md`), `---\n${fm.join('\n')}\n---\n\n${(s.detail || '').trim()}\n`);
});

console.log(`Wrote ${nOpp} opportunities, ${sec.length} sectors, ${opp.types.length} types.`);
warnings.forEach((w) => console.warn('WARNING:', w));
