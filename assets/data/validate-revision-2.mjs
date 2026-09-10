import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');
const htmlDir = join(root, 'html');

function read(relPath) {
  return readFileSync(join(root, relPath), 'utf8');
}

function assertIncludes(haystack, needle, label) {
  if (!haystack.includes(needle)) {
    throw new Error(`Missing ${label}: ${needle}`);
  }
}

function assertNotIncludes(haystack, needle, label) {
  if (haystack.includes(needle)) {
    throw new Error(`Unexpected ${label}: ${needle}`);
  }
}

const about = read('../../about/about.html');
const mission = read('../../mission-vision/mission-vision.html');
const index = read('../../index.html');
const contact = read('../../contact/contact.html');

assertIncludes(about, 'multidisciplinary Space &amp; STEM global company', 'about company description');
assertIncludes(about, 'E&amp;D TSI Astronaut Candidate and Aerospace Engineer Asmaa Hossam', 'about founder line');
assertIncludes(about, 'established in September 2025', 'about establishment date');
assertIncludes(about, 'data-target="1500"', 'about girls engaged counter');
assertIncludes(about, 'data-target="150"', 'about workshops counter');
assertIncludes(about, 'data-target="7"', 'about continents counter');
assertIncludes(about, 'Space Professional Training', 'about services list');
assertNotIncludes(about, 'non-profit organization dedicated to empowering girls aged 13 to 25', 'old about intro');

assertIncludes(mission, 'bridge the gender gap in the global space ecosystem', 'mission statement');
assertIncludes(mission, 'A Universe of Equal Opportunities', 'vision heading');
assertIncludes(mission, 'equally represented at every level of the global space industry', 'vision body');
assertIncludes(mission, 'Strategic Roadmap 2025–2030', 'roadmap title');
assertIncludes(mission, 'Our Vision for 2030', 'north star goal');
assertNotIncludes(mission, 'non-profit organization dedicated to inspiring', 'old mission body');

assertIncludes(index, 'banner-hero-logo', 'hero-corner SHE ORBITS logo');
assertIncludes(index, 'logo-light.svg?v=she-orbits-8', 'hero SHE ORBITS logo asset');
assertNotIncludes(index, 'header-brand-logo', 'logo must not live in sticky header');
assertIncludes(read('assets/css/she-orbits-theme.css'), 'position: fixed !important', 'navbar follows the user while scrolling');
assertNotIncludes(index, 'logo-container', 'homepage header logo must not shift navbar');
assertNotIncludes(read('assets/js/custom.js'), 'updateHeaderLogoContrast', 'sticky logo contrast logic removed');
assertIncludes(read('assets/images/logos/logo-light.svg'), 'SHE ORBITS', 'logo-light brand text');
assertNotIncludes(read('assets/images/logos/logo-light.svg'), 'Studiova', 'logo-light template brand');
assertIncludes(index, '500+', 'homepage girls engaged card');
assertIncludes(index, 'Girls Engaged Globally', 'homepage girls engaged label');
assertIncludes(index, 'Our Research Projects', 'research projects section');
assertIncludes(index, 'Cyber-Resilient Satellite Collision Avoidance', 'research project 1');
assertIncludes(index, 'What is SHE ORBITS?', 'homepage FAQ addition');
assertIncludes(index, 'Aerospace, Space industry and space exploration', 'hero caption');
assertNotIncludes(index, 'Global Partner Organizations', 'old partners card');
assertNotIncludes(index, 'non-profit space organization', 'old homepage footer non-profit');

assertIncludes(contact, 'contact@sheorbitscompany.com', 'contact email');
assertIncludes(contact, '+20 (101) 471-7368', 'contact phone');
assertIncludes(contact, '90+ Countries', 'global reach');
assertIncludes(contact, 'What is SHE ORBITS?', 'contact FAQ addition');

const htmlFiles = readdirSync(htmlDir).filter((name) => name.endsWith('.html'));
for (const name of htmlFiles) {
  const html = readFileSync(join(htmlDir, name), 'utf8');
  assertNotIncludes(html, 'mdi:facebook', `${name} facebook icon`);
  assertNotIncludes(html, 'mdi:twitter', `${name} twitter icon`);
  assertNotIncludes(html, '555-1234', `${name} old phone`);
  assertNotIncludes(html, 'info@sheorbits.space', `${name} old email`);
  assertNotIncludes(html, 'info@sheorbits.org', `${name} old org email`);
}

const sitePagesWithFooter = ['index.html', 'about.html', 'mission-vision.html', 'contact.html', 'sectors.html'];
for (const name of sitePagesWithFooter) {
  const html = read(`${name}`);
  assertIncludes(html, 'Stay Connected with SHE ORBITS', `${name} stay connected heading`);
  assertIncludes(html, 'https://discord.com/invite/JucgMJ76wS', `${name} discord invite`);
  assertIncludes(html, 'contact@sheorbitscompany.com', `${name} footer email`);
}

console.log('revision-2 content validation passed');
