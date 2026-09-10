# SHE ORBITS

Marketing website for [SHE ORBITS](https://sheorbits.space) — a multidisciplinary Space & STEM global company empowering females across space sectors through education, research, mentorship, and international collaboration. Established September 2025.

Static site: HTML, Bootstrap 5, SCSS, and vanilla JavaScript. No build step is required to preview locally.

## Quick start

From the repository root:

```bash
python3 -m http.server 8080
```

Open [http://localhost:8080/html/index.html](http://localhost:8080/html/index.html).

## Project structure

```
SHE-ORBITS/
├── html/                 # Site pages
├── assets/
│   ├── css/              # Compiled CSS (styles.css, she-orbits-theme.css)
│   ├── scss/             # SCSS sources
│   ├── js/               # Site scripts
│   ├── data/             # JSON content + validators
│   └── images/           # Photos, logos, video backgrounds
└── scripts/              # One-off HTML maintenance utilities
```

## Pages

| Page | Purpose |
|------|---------|
| `index.html` | Homepage |
| `about.html` | About SHE ORBITS |
| `mission-vision.html` | Mission and vision |
| `programs.html` | Opportunities hub (9 anchor sections) |
| `program-detail.html` | Single opportunity detail (`?slug=`) |
| `sectors.html` | Sectors overview |
| `sector-detail.html` | Single sector detail (`?slug=`) |
| `contact.html` | Contact with participant / partner tabs, application forms (UI-only submit) |

Legacy opportunity URLs (`courses.html`, `fellowships.html`, etc.) redirect to anchored sections on `programs.html`.

## Data-driven content

Content for sectors and opportunities lives in JSON and is rendered client-side.

| File | Used by |
|------|---------|
| `assets/data/sectors.json` | `sectors-site.js` — homepage grid, sector detail |
| `assets/data/opportunities.json` | `opportunities-site.js` — homepage preview, programs hub, program detail, contact prefill |

### URL patterns

- Sector detail: `sector-detail.html?slug={slug}`
- Program detail: `program-detail.html?slug={slug}`
- Contact prefill: `contact.html?program={slug}&intent=interest|enroll`
- Partner inquiries: `contact.html?tab=partner` or `contact.html#partner`

## Validation

Run before committing content or navigation changes:

```bash
node assets/data/validate-sectors.mjs
node assets/data/validate-opportunities.mjs
node assets/data/validate-navigation.mjs
node assets/data/validate-palette.mjs
node assets/data/validate-contact.mjs
node assets/data/validate-revision-2.mjs
```

## Styles

- **Theme tokens:** `assets/scss/variables/_variables.scss` (comfy space palette — indigo primary, navy dark sections)
- **Global overrides:** `assets/css/she-orbits-theme.css`
- **Compiled base:** `assets/css/styles.css`

To recompile SCSS (if you use Sass locally):

```bash
sass assets/scss/styles.scss assets/css/styles.css
```

## Maintenance scripts

Optional utilities for bulk HTML updates:

- `scripts/apply-nav.py` — sync Opportunities navigation markup
- `scripts/apply-theme.py` — apply theme CSS links and palette cleanup

## Stack

- Bootstrap 5
- jQuery
- AOS (scroll animations)
- Iconify (icons)
- Owl Carousel (legacy; homepage featured projects use a static grid)

## Notes

- Forms are UI-only; submission backend is not included in this repo.
- Partner logos on the contact page use placeholder assets until final brand files are provided.
- Some sector images (IDs 11–30) use portfolio placeholders until dedicated sector photography is added.
