import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const contactPath = join(__dirname, '..', '..', 'html', 'contact.html');
const sectorsPath = join(__dirname, '..', '..', 'html', 'sectors.html');
const contactJsPath = join(__dirname, '..', 'js', 'contact-site.js');

const contact = readFileSync(contactPath, 'utf8');
const sectors = readFileSync(sectorsPath, 'utf8');
const contactJs = readFileSync(contactJsPath, 'utf8');

const contactChecks = [
  ['contactTabParticipant', 'participant tab button'],
  ['contactTabPartner', 'partner tab button'],
  ['id="participantForm"', 'participant form'],
  ['id="partnerForm"', 'partner form'],
  ['participantFormSuccess', 'participant success message'],
  ['partnerFormSuccess', 'partner success message'],
  ['contact-site.js', 'contact-site.js script'],
  ['id="partner"', 'partner anchor section'],
  ['partners-section py-5 py-lg-11 py-xl-12 d-none', 'hidden partner logos section'],
];

for (const [needle, label] of contactChecks) {
  if (!contact.includes(needle)) {
    throw new Error(`contact.html missing ${label}`);
  }
}

if (!contactJs.includes('preventDefault')) {
  throw new Error('contact-site.js must handle UI-only form submit');
}

const sectorChecks = [
  ['id="sectorsPageGrid"', 'sectors page grid root'],
  ['sectors-site.js', 'sectors-site.js script'],
  ['renderSectorGrid', 'sectors grid init'],
  ['sector-photo-card', 'photo card styles'],
];

for (const [needle, label] of sectorChecks) {
  if (!sectors.includes(needle)) {
    throw new Error(`sectors.html missing ${label}`);
  }
}

if (sectors.includes('class="sector-card"')) {
  throw new Error('sectors.html still contains legacy static sector-card markup');
}

console.log('contact and sectors page validation passed');
