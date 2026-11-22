
// @ts-check
import { defineConfig } from 'astro/config';
import { existsSync, readFileSync } from 'node:fs';
import { unified } from '@astrojs/markdown-remark';
import remarkDirective from 'remark-directive';
import { remarkSheOrbits } from './src/plugins/remark-she-orbits.mjs';
import { rehypeSheOrbits } from './src/plugins/rehype-she-orbits.mjs';

// The canonical URL comes from public/CNAME (GitHub Pages custom domain).
// Override with SITE_URL for previews.
function resolveSite() {
  if (process.env.SITE_URL) return process.env.SITE_URL;

  if (existsSync('./public/CNAME')) {
    const host = readFileSync('./public/CNAME', 'utf8').trim();
    if (host) return `https://${host}`;
  }

  return 'https://glory-dev.github.io';
}

export default defineConfig({
  site: resolveSite(),
  base: '/',

  output: 'static',
  trailingSlash: 'always',

  build: {
    format: 'directory',
  },

  markdown: {
    processor: unified({
      remarkPlugins: [remarkDirective, remarkSheOrbits],
      rehypePlugins: [rehypeSheOrbits],
    }),
  },

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          quietDeps: true,
          silenceDeprecations: [
            'import',
            'global-builtin',
            'color-functions',
            'mixed-decls',
            'if-function',
          ],
        },
      },
    },
  },
});
