import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..');
const htmlDir = join(rootDir, 'html');
const themePath = join(rootDir, 'assets', 'css', 'she-orbits-theme.css');
const variablesPath = join(rootDir, 'assets', 'scss', 'variables', '_variables.scss');

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

const theme = readFileSync(themePath, 'utf8');
const variables = readFileSync(variablesPath, 'utf8');

if (theme.includes('--bs-dark: #8aa3e0')) {
  throw new Error('she-orbits-theme.css uses lavender for --bs-dark text token');
}

if (!theme.includes('--bs-dark: #1f2a2e')) {
  throw new Error('she-orbits-theme.css missing readable --bs-dark token');
}

if (!variables.includes('$primary: $space-indigo')) {
  throw new Error('_variables.scss missing indigo primary assignment');
}

if (variables.includes('$nebula-cyan: #00F5FF')) {
  throw new Error('_variables.scss still defines bright cyan token');
}

const htmlFiles = readdirSync(htmlDir).filter((file) => file.endsWith('.html'));
const pagesWithTheme = htmlFiles.filter((file) => file !== '404.html' && !redirectStubs.has(file));

for (const file of pagesWithTheme) {
  const content = readFileSync(join(htmlDir, file), 'utf8');

  if (!content.includes('she-orbits-theme.css')) {
    throw new Error(`${file} missing she-orbits-theme.css link`);
  }

  if (content.includes('#6B7280')) {
    throw new Error(`${file} still contains grey primary override #6B7280`);
  }

  if (content.includes('#00F5FF')) {
    throw new Error(`${file} still contains bright cyan #00F5FF`);
  }
}

const indexHtml = readFileSync(join(htmlDir, 'index.html'), 'utf8');

if (indexHtml.includes('featured-projects-slider') || indexHtml.includes('owl-carousel owl-theme')) {
  throw new Error('index.html featured projects section still uses carousel markup');
}

if (!indexHtml.includes('featured-projects-grid')) {
  throw new Error('index.html missing featured-projects-grid');
}

console.log('palette and featured projects validation passed');
