# Migration notes

## Verified (automated, against your original files)
* Visible text of **about, mission-vision, contact, 404** is word-for-word identical to the originals; the **home** page is
  identical except for the two sections the old JS filled in at runtime (sectors grid, upcoming programs).
* Header menu text identical. Hub sections, card order, Apply/Enroll buttons, home "upcoming" list and the 31 sector cards
  match the old JS logic exactly. 0 broken internal links or anchors. 0 Iconify references left.
* Slideshow directive tested with fixture images (natural sort, counter, buttons).
* **Not verified:** nothing was run in a browser (no visual comparison, no JS execution) and your images were not available,
  so every `/assets/images/...` file is reported missing by `check:links` until you copy them.

## Decisions to confirm
1. **Footer wording** differed between pages ("women" vs "girls"). I used the sectors-page version everywhere, with the full
   footer on every page (the dark pages used to have a tiny one), a live © year, and all 13 categories linked with working
   anchors (the sectors-page footer linked to ids like `#ongoing-programs` that don't exist).
2. **`panels-coming-soon`** had `type: "panels"`, which is not a category, so the old hub never showed it. It is kept as
   `draft: true` (type `talks-panels`). Remove `draft` to publish it.
3. **Partner form** previously showed "success" and **discarded the data**. It now posts to the same Google Apps Script as the
   participant form with `formType=partner`. Check that script handles it.
4. **Contact validation:** the old page also sent the participant form when it was invalid (two competing handlers). Now: validate → send.
5. **Detail pages** were client-rendered by `sectors-site.js` / `opportunities-site.js`; the new templates reproduce that markup and
   labels ("Topics covered", "Sessions & milestones", "Sign your interest", "Apply Now"/"Enroll Now").
6. Old detail URLs (`/sectors/sector-detail.html?slug=…`, `/opportunities/program-detail/?slug=…`) redirect to the new pages.

## Behaviour changes (small, intentional)
* Home link is no longer hard-coded "active" on every page; the mobile submenu CSS now applies on the dark pages (it was missing there).
* Mobile menu ✕ button now closes the menu. 404 now loads the theme (it didn't, so it used the default lime primary).
* Fluid cursor is skipped for `prefers-reduced-motion`.
* `world-space-week-2025/2026`: raw HTML became markdown. Underline and per-heading `style="color:white"` can't be expressed
  in markdown, so those sub-headings use the indigo `###` style.

## Removed as dead code
NewsAPI loader on the home page (functions were commented out; static news cards are what showed), `smooth-cursor.js`
(not referenced by any page), `apply-theme.py` (old build helper), Owl CSS/JS includes on pages that never used it,
`*-load-error` styles, `@keyframes` duplicate (the later `twinkle` definition won in the old CSS and is the one kept).

## Icons (Font Awesome Free)
`arrow-up-right` isn't in the free set → rotated `arrow-right`; `telescope` → `binoculars`; `sparkles` → `wand-magic-sparkles`.
One file to change: `src/components/Icon.astro`.

## Things I noticed in the source (not changed)
* Hub title **"Missions Simulations"** (missing "&"); the menu says "Missions & Simulations". Fix in `opportunity-types.json`.
* Home copy says "30 interdisciplinary" sectors; there are 31.
* NASA links carry `?utm_source=chatgpt.com`.
* Five placeholder opportunities have an empty description (allowed; cards show no text).

---

# Round 2 notes (projects, news, carousel, images)

* **Carousel:** Owl + jQuery removed (packages, script, component). `Carousel.astro` uses Swiper.
* **Back-to-top button:** it never hid because of Bootstrap's `hstack` class (`display:flex !important` beats the inline
  `display:none` the script set), and nothing made it `position: fixed`, so it just sat at the end of the page. Now fixed
  bottom-right, fades in after 400 px of scrolling, keyboard-focusable, respects reduced motion.
* **Home sectors:** only two rows show (1 column → 2 cards, 2 columns → 4, 3 → 6, 4 → 8) followed by "Discover More Sectors" → `/sectors/`.
* **Projects:** new `/projects/` page + 14 project pages from `Projects_Section.docx`, added to the header (desktop + mobile) and footer.
  Slugs are shortened by hand (the titles are very long); the full titles are kept in each file.
* **News:** the three hard-coded cards (Artemis III, Roman Telescope, …) were replaced by the 3 items in `News_new.docx`,
  now `src/content/news/*.md`, restyled as cards in a carousel. The DLR link in the document ended in a dangling `?utm_source`; I removed it.
* **Our Services (About):** the 16-item bullet list is now an icon card grid driven by `src/data/services.json` (same wording, same order).
* **WSW26:** the page text already matched `WSW26.docx` (94.7 % identical, the rest being image placeholders). Changed: title
  ("World Space Week 2026: Rocket Revolution"), the card summary (it said SHE ORBITS *will* host the week), and the generic
  "Topics covered / Sessions & milestones" lists were removed (they came from the old JSON and aren't in your document).
  In the document the 7th roadmap is labelled "Day 7"; I treated it as Roadmap 07 (Space Policy, Business & Entrepreneurship).
  The placeholders map to image slots: `(Day N. RR)` → `day-N/`, `ROADMAP 0N` → `roadmap-N/`, `(Session)` → `sessions.png`.
* **Images:** `npm run images:optimize` (see CONTENT-GUIDE §3). The 17 pictures from your documents went through it: 12.0 MB → 1.2 MB.
  Slideshows now load only the first picture up front and the rest on demand, accept any file name/extension and encode spaces.

## To check
* **Research projects + Projects are now one list** (`src/content/projects/`, 37 files): your 14 new projects first (orders 10-140),
  then the 23 former home research cards (orders 150-370, content unchanged: title, description → summary, tags → keywords). The home
  section shows the first 12 by `order`; reorder by changing those numbers. The old inline "Discover More" expand/collapse is replaced by a
  "Discover More Projects" button to `/projects/`. The old JSON is kept in `legacy/research-projects.json`.
  The 23 old cards use the pictures already in your site (`assets/images/research-projects/…` and `portfolio/…`): copy them to `public/assets/images/`.
  Cards are now 4:3 (they were square) so wide pictures aren't cropped as hard; use `imagePosition` per project if one needs adjusting.
* The news pictures' alt text in the document names Space.com and India Today, so they look copied from those sites. Check the
  usage rights before publishing (the NASA and project images likewise).
* News items have no dates yet (the document gave none). Add `date: "YYYY-MM-DD"` to each so the newest shows first.
