import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, 'opportunities.json');
const raw = JSON.parse(readFileSync(dataPath, 'utf8'));
const types = raw.types || [];
const opportunities = raw.opportunities || [];

const requiredTypeFields = ['id', 'label', 'lifecycle', 'anchor', 'sectionTitle', 'sectionDescription'];
const requiredOpportunityFields = [
  'slug',
  'title',
  'type',
  'lifecycle',
  'image',
  'description',
  'detail',
  'topics',
  'sessions',
  'featuredOnHome'
];
const allowedLifecycle = new Set(['ongoing', 'upcoming']);
const typeIds = new Set();
const anchors = new Set();
const slugs = new Set();

const expectedAnchors = [
  'ongoing-programs',
  'ongoing-courses',
  'ongoing-fellowships',
  'ongoing-internships',
  'upcoming-panels',
  'upcoming-competitions',
  'upcoming-events',
  'upcoming-conferences',
  'upcoming-workshops'
];

if (types.length !== 9) {
  throw new Error(`Expected 9 opportunity types, found ${types.length}`);
}

for (const type of types) {
  for (const field of requiredTypeFields) {
    if (!(field in type)) {
      throw new Error(`Type ${type.id || 'unknown'} missing field: ${field}`);
    }
  }

  if (!allowedLifecycle.has(type.lifecycle)) {
    throw new Error(`Type ${type.id} has invalid lifecycle: ${type.lifecycle}`);
  }

  if (typeIds.has(type.id)) {
    throw new Error(`Duplicate type id: ${type.id}`);
  }

  if (anchors.has(type.anchor)) {
    throw new Error(`Duplicate anchor: ${type.anchor}`);
  }

  typeIds.add(type.id);
  anchors.add(type.anchor);
}

for (const anchor of expectedAnchors) {
  if (!anchors.has(anchor)) {
    throw new Error(`Missing expected anchor: ${anchor}`);
  }
}

for (const opportunity of opportunities) {
  for (const field of requiredOpportunityFields) {
    if (!(field in opportunity)) {
      throw new Error(`Opportunity ${opportunity.slug || 'unknown'} missing field: ${field}`);
    }
  }

  if (!allowedLifecycle.has(opportunity.lifecycle)) {
    throw new Error(`Opportunity ${opportunity.slug} has invalid lifecycle: ${opportunity.lifecycle}`);
  }

  if (!typeIds.has(opportunity.type)) {
    throw new Error(`Opportunity ${opportunity.slug} references unknown type: ${opportunity.type}`);
  }

  if (!Array.isArray(opportunity.topics) || opportunity.topics.length === 0) {
    throw new Error(`Opportunity ${opportunity.slug} must include at least one topic`);
  }

  if (!Array.isArray(opportunity.sessions) || opportunity.sessions.length === 0) {
    throw new Error(`Opportunity ${opportunity.slug} must include at least one session`);
  }

  if (slugs.has(opportunity.slug)) {
    throw new Error(`Duplicate slug: ${opportunity.slug}`);
  }

  slugs.add(opportunity.slug);

  const imagePath = opportunity.image.replace(/^\.\.\//, '');
  const absolutePath = join(__dirname, '..', '..', imagePath);
  readFileSync(absolutePath);
}

for (const type of types) {
  const count = opportunities.filter((item) => item.type === type.id).length;
  if (count === 0) {
    throw new Error(`Type ${type.id} has no opportunities`);
  }
}

const featuredCount = opportunities.filter((item) => item.featuredOnHome).length;
if (featuredCount < 4) {
  throw new Error(`Expected at least 4 featured homepage opportunities, found ${featuredCount}`);
}

console.log('opportunities.json validation passed');
