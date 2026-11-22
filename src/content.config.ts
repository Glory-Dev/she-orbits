import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import types from './data/opportunity-types.json';

const typeIds = types.map((t) => t.id) as [string, ...string[]];
const assetPath = z.string().regex(/^\/assets\/.+/, 'must start with /assets/  (files live in public/assets/…)');

/** src/content/sectors/<slug>.md  ->  /sectors/<slug>/ */
const sectors = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/sectors' }),
  schema: z.object({
    title: z.string().min(2),
    cardTitle: z.string().optional(), // shorter/alternate title used on cards; defaults to title
    number: z.number().int().positive(), // order + the "Sector 07" label
    status: z.enum(['active', 'coming-soon']),
    image: assetPath,
    summary: z.string().min(10),
    draft: z.boolean().default(false),
  }),
});

/** src/content/opportunities/<slug>.md  ->  /opportunities/<slug>/ */
const opportunities = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/opportunities' }),
  schema: z.object({
    title: z.string().min(2),
    type: z.enum(typeIds),
    status: z.enum(['ongoing', 'upcoming', 'coming-soon', 'past']),
    home: z.boolean().default(false),
    image: assetPath,
    summary: z.string().default(''), // card text; may be empty for "coming soon" placeholders
    form: z.string().url().optional(), // application / enrolment link (shown for upcoming + past)
    order: z.number().int().optional(), // lower = earlier within its status group
    draft: z.boolean().default(false),
  }),
});

/** src/content/projects/<slug>.md  ->  /projects/<slug>/ */
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string().min(2),
    image: assetPath,
    keywords: z.array(z.string()).default([]),
    imagePosition: z.string().regex(/^[a-z0-9% .-]+$/i).optional(), // CSS object-position when the picture is cropped
    summary: z.string().min(10), // the project description (card + top of the page)
    order: z.number().int().optional(),
    draft: z.boolean().default(false),
  }),
});

/** src/content/news/<slug>.md  ->  a card on the home page (links out to the original article) */
const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string().min(2),
    source: z.string().min(2), // publisher shown on the card, e.g. NASA
    url: z.string().url(),
    image: assetPath,
    imagePosition: z.string().regex(/^[a-z0-9% .-]+$/i).optional(), // CSS object-position, e.g. "center 30%"
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use YYYY-MM-DD').optional(),
    summary: z.string().min(10),
    order: z.number().int().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { sectors, opportunities, projects, news };
