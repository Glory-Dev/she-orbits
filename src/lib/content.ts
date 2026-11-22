import { getCollection, type CollectionEntry } from 'astro:content';
import types from '../data/opportunity-types.json';

export type OpportunityType = { id: string; label: string; navLabel?: string; desc: string };
export const opportunityTypes = types as OpportunityType[];
export const typeLabel = (id: string) => opportunityTypes.find((t) => t.id === id)?.label ?? id;

export type Sector = CollectionEntry<'sectors'>;
export type Opportunity = CollectionEntry<'opportunities'>;

export const LIFECYCLE_LABEL: Record<string, string> = { ongoing: 'Ongoing', upcoming: 'Upcoming', past: 'Past', 'coming-soon': 'Coming Soon' };
export const SECTOR_STATUS_LABEL: Record<string, string> = { active: 'Active now', 'coming-soon': 'Coming soon' };

// Display order inside a section: Upcoming -> Ongoing -> Past -> anything else
const RANK: Record<string, number> = { upcoming: 0, ongoing: 1, past: 2 };
export const lifecycleRank = (s: string) => RANK[s] ?? 3;
export const lifecycleClass = (s: string) => (s in RANK ? `is-${s}` : '');

export async function getSectors(): Promise<Sector[]> {
  const all = await getCollection('sectors', (e) => !e.data.draft);
  return all.sort((a, b) => a.data.number - b.data.number);
}

export async function getOpportunities(): Promise<Opportunity[]> {
  const all = await getCollection('opportunities', (e) => !e.data.draft);
  return all.sort((a, b) => (a.data.order ?? 1000) - (b.data.order ?? 1000) || a.id.localeCompare(b.id));
}

export const byLifecycle = (list: Opportunity[]) =>
  list.slice().sort((a, b) => lifecycleRank(a.data.status) - lifecycleRank(b.data.status));

/** Only past ("Enroll Now") and upcoming ("Apply Now") opportunities get a CTA, and only when a form URL exists. */
export function cta(o: Opportunity) {
  const label = o.data.status === 'past' ? 'Enroll Now' : o.data.status === 'upcoming' ? 'Apply Now' : '';
  return label && o.data.form ? { label, url: o.data.form } : null;
}

export type Project = CollectionEntry<'projects'>;
export type NewsItem = CollectionEntry<'news'>;

export async function getProjects(): Promise<Project[]> {
  const all = await getCollection('projects', (e) => !e.data.draft);
  return all.sort((a, b) => (a.data.order ?? 1000) - (b.data.order ?? 1000) || a.id.localeCompare(b.id));
}

/** Newest dated item first; undated items follow in `order`. */
export async function getNews(): Promise<NewsItem[]> {
  const all = await getCollection('news', (e) => !e.data.draft);
  return all.sort(
    (a, b) => (b.data.date ?? '').localeCompare(a.data.date ?? '') || (a.data.order ?? 1000) - (b.data.order ?? 1000) || a.id.localeCompare(b.id),
  );
}

export const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
