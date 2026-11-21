#!/usr/bin/env node
/** Interactive scaffold:  npm run content:new  -> creates a valid, ready-to-edit .md file. */
import { createInterface } from 'node:readline/promises';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { stdin, stdout } from 'node:process';

const rl = createInterface({ input: stdin, output: stdout });
const ask = async (q, def = '') => ((await rl.question(def ? `${q} [${def}]: ` : `${q}: `)).trim() || def);
const pick = async (q, options) => {
  options.forEach((o, i) => console.log(`  ${i + 1}) ${o}`));
  const a = await ask(q, '1');
  return options[Number(a) - 1] ?? (options.includes(a) ? a : options[0]);
};
const slugify = (s) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const q = (v) => JSON.stringify(v);

console.log('\nWhat are you adding?');
const kind = await pick('Choose', ['opportunity', 'sector', 'project', 'news']);
const title = await ask('Title');
const slug = await ask('URL name (lowercase-with-dashes)', slugify(title));
let fm, dir;
if (kind === 'opportunity') {
  const types = JSON.parse(readFileSync('src/data/opportunity-types.json', 'utf8')).map((t) => t.id);
  console.log('\nCategory:'); const type = await pick('Choose', types);
  console.log('\nStatus:'); const status = await pick('Choose', ['upcoming', 'ongoing', 'past', 'coming-soon']);
  const image = await ask('Card image (path under public/)', '/assets/images/services/');
  const form = await ask('Application/enrolment form URL (optional)');
  const summary = await ask('One-sentence summary for the card');
  dir = 'src/content/opportunities';
  fm = [`title: ${q(title)}`, `type: ${q(type)}`, `status: ${q(status)}`, `image: ${q(image)}`, ...(form ? [`form: ${q(form)}`] : []), `summary: ${q(summary)}`];
} else if (kind === 'project') {
  const image = await ask('Image (path under public/)', '/assets/images/projects/');
  const keywords = (await ask('Keywords, comma separated')).split(',').map((k) => k.trim()).filter(Boolean);
  const summary = await ask('Project description (a short paragraph)');
  dir = 'src/content/projects';
  fm = [`title: ${q(title)}`, `image: ${q(image)}`, `keywords: ${JSON.stringify(keywords)}`, `summary: ${q(summary)}`];
} else if (kind === 'news') {
  const source = await ask('Publisher (e.g. NASA)');
  const url = await ask('Link to the original article');
  const date = await ask('Date YYYY-MM-DD (optional, newest shows first)');
  const image = await ask('Image (path under public/)', '/assets/images/news/');
  const summary = await ask('Two-sentence summary');
  dir = 'src/content/news';
  fm = [`title: ${q(title)}`, `source: ${q(source)}`, `url: ${q(url)}`, ...(date ? [`date: ${q(date)}`] : []), `image: ${q(image)}`, `summary: ${q(summary)}`];
} else {
  const number = await ask('Sector number (next free number)');
  console.log('\nStatus:'); const status = await pick('Choose', ['active', 'coming-soon']);
  const image = await ask('Image (path under public/)', '/assets/images/');
  const summary = await ask('Short description');
  dir = 'src/content/sectors';
  fm = [`title: ${q(title)}`, `number: ${Number(number)}`, `status: ${q(status)}`, `image: ${q(image)}`, `summary: ${q(summary)}`];
}
rl.close();
const file = `${dir}/${slug}.md`;
if (existsSync(file)) { console.error(`\n${file} already exists. Pick another URL name.`); process.exit(1); }
const body = kind === 'news' ? '' : kind === 'project' ? '' : kind === 'opportunity'
  ? 'Write the full description here. Plain paragraphs are fine.\n\n## Topics covered\n\n- First topic\n- Second topic\n\n## Sessions & milestones\n\n- Week 1: …\n'
  : 'Write the longer description here.\n';
if (kind === 'news') console.log('(news items only use the fields above; no text needed)');
writeFileSync(file, `---\n${fm.join('\n')}\n---\n\n${body}`);
console.log(`\nCreated ${file}\nNext: edit it, add images under public/assets/, then run  npm run build  (or just push).`);
