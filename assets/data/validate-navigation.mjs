import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlDir = join(__dirname, '..', '..', 'html');
const opportunitiesPath = join(__dirname, 'opportunities.json');
const opportunities = JSON.parse(readFileSync(opportunitiesPath, 'utf8'));
const expectedAnchors = new Set((opportunities.types || []).map((type) => type.anchor));

const htmlFiles = readdirSync(htmlDir).filter((file) => file.endsWith('.html'));
const requiredDesktopLinks = [
  'programs.html#ongoing-programs',
  'programs.html#ongoing-courses',
  'programs.html#ongoing-fellowships',
  'programs.html#ongoing-internships',
  'programs.html#upcoming-panels',
  'programs.html#upcoming-competitions',
  'programs.html#upcoming-events',
  'programs.html#upcoming-conferences',
  'programs.html#upcoming-workshops',
];

const redirectTargets = {
  'courses.html': 'ongoing-courses',
  'fellowships.html': 'ongoing-fellowships',
  'internships.html': 'ongoing-internships',
  'events.html': 'upcoming-events',
  'panels.html': 'upcoming-panels',
  'competitions.html': 'upcoming-competitions',
  'conferences.html': 'upcoming-conferences',
  'workshops.html': 'upcoming-workshops',
};

for (const anchor of expectedAnchors) {
  if (!requiredDesktopLinks.includes(`programs.html#${anchor}`)) {
    throw new Error(`Anchor ${anchor} missing from required nav links`);
  }
}

const redirectStubs = new Set([
  'courses.html',
  'fellowships.html',
  'internships.html',
  'events.html',
  'panels.html',
  'competitions.html',
  'conferences.html',
  'workshops.html',
]);

const pagesWithNav = htmlFiles.filter((file) => file !== '404.html' && !redirectStubs.has(file));

for (const file of pagesWithNav) {
  const content = readFileSync(join(htmlDir, file), 'utf8');

  if (!content.includes('dropdown-menu-opportunities')) {
    throw new Error(`${file} missing two-column Opportunities dropdown`);
  }

  if (file === 'programs.html' && !content.includes('banner-section')) {
    throw new Error('programs.html missing standard inner-page hero banner');
  }

  for (const link of requiredDesktopLinks) {
    if (!content.includes(`href="${link}"`)) {
      throw new Error(`${file} missing nav link: ${link}`);
    }
  }

  if (!content.includes('Upcoming</li>') && !content.includes('>Upcoming</div>')) {
    throw new Error(`${file} missing Upcoming navigation section`);
  }
}

for (const [stubFile, anchor] of Object.entries(redirectTargets)) {
  const stubPath = join(htmlDir, stubFile);
  const content = readFileSync(stubPath, 'utf8');
  const target = `programs.html#${anchor}`;

  if (!content.includes(target)) {
    throw new Error(`${stubFile} does not redirect to ${target}`);
  }
}

console.log('navigation validation passed');
