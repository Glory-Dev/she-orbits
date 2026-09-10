import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, 'sectors.json');
const raw = JSON.parse(readFileSync(dataPath, 'utf8'));
const sectors = raw.sectors || [];

const requiredFields = ['id', 'slug', 'shortName', 'name', 'image', 'description', 'detail', 'status'];
const allowedStatus = new Set(['active', 'coming-soon']);
const slugs = new Set();
const ids = new Set();
const activeSlugs = new Set([
  'stem',
  'space-industry',
  'space-navigation',
  'space-communications',
  'space-technology',
  'space-medicine',
  'space-architecture',
  'space-environment',
  'earth-observation',
  'satellite-cubesats',
  'space-law',
  'ai-data-science',
  'space-arts',
  'astrobiology',
  'astrophysics',
  'gnss-gis',
]);

if (sectors.length !== 30) {
  throw new Error(`Expected 30 sectors, found ${sectors.length}`);
}

for (const sector of sectors) {
  for (const field of requiredFields) {
    if (!(field in sector)) {
      throw new Error(`Sector ${sector.slug || 'unknown'} missing field: ${field}`);
    }
  }

  if (!allowedStatus.has(sector.status)) {
    throw new Error(`Sector ${sector.slug} has invalid status: ${sector.status}`);
  }

  if (slugs.has(sector.slug)) {
    throw new Error(`Duplicate slug: ${sector.slug}`);
  }

  if (ids.has(sector.id)) {
    throw new Error(`Duplicate id: ${sector.id}`);
  }

  slugs.add(sector.slug);
  ids.add(sector.id);
}

const activeCount = sectors.filter((sector) => sector.status === 'active').length;
if (activeCount !== activeSlugs.size) {
  throw new Error(`Expected ${activeSlugs.size} active sectors, found ${activeCount}`);
}

for (const slug of activeSlugs) {
  const sector = sectors.find((item) => item.slug === slug);
  if (!sector || sector.status !== 'active') {
    throw new Error(`Expected active flagship sector missing or inactive: ${slug}`);
  }
}

for (const sector of sectors) {
  const imagePath = sector.image.replace(/^\.\.\//, '');
  const absolutePath = join(__dirname, '..', '..', imagePath);
  readFileSync(absolutePath);
}

console.log('sectors.json validation passed');
