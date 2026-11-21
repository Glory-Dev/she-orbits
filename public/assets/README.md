# Copy these from the old site

| Old site | → | This project |
|---|---|---|
| `assets/images/**` (incl. `backgrounds/`, `svgs/`, `logos/`, `services/`, `portfolio/`, `research-projects/`, `about-banner.mp4`) | → | `public/assets/images/` |
| `assets/videos/**` (if any) | → | `public/assets/videos/` |
| `assets/fonts/**` (if any) | → | `public/assets/fonts/` |
| `CNAME` | → | `public/CNAME` |

Do **not** copy `assets/libs/` (Bootstrap, jQuery, AOS, Owl, Iconify now come from npm), `assets/js/`,
`assets/data/*.json` (now markdown in `src/content/`), or `she-orbits-theme.css` (now Sass).
`public/assets/css/styles.css` is already included.

Run `npm run build && npm run check:links` afterwards: the link checker lists any file that is still missing.
