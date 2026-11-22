# SHE ORBITS website (Astro)

Astro 7 · Bootstrap 5 (JS from npm, CSS build in `public/`) · Sass · Font Awesome · AOS · Swiper carousel (lazy). No jQuery anywhere.

```bash
npm install
npm run dev            # http://localhost:4321
npm run build          # validates content, then builds to dist/
npm run check:links    # every link / image / #anchor in dist/ must resolve
npm run content:new    # scaffold a new opportunity, sector, project or news item (interactive)
npm run images:optimize # compress/rename big images and fix references (docs/CONTENT-GUIDE.md §3)
```

Needs Node ≥ 22.23 (`.nvmrc`).

## Structure

```
src/
  content/
    opportunities/*.md      one file = one opportunity (page + card)        ← docs/CONTENT-GUIDE.md
    sectors/*.md            one file = one sector
    projects/*.md           one file = one project (card on /projects/, first 12 also on the home page)
    news/*.md               one file = one card in the home page news carousel
  data/
    opportunity-types.json  the 13 categories (menu, footer, hub sections)
    faq.json                FAQ shared by home + contact
    services.json           About page "Our Services" cards
    site.ts                 email, forms endpoint, sector interest form
  components/               SiteHeader, SiteFooter, PageBanner, SectorCard, ProgramCard, ResearchProjects,
                            FaqAccordion, ServicesGrid, NewsCard, ProjectCard, FeaturedProjectCard, Carousel (Swiper), Icon (Iconify → Font Awesome map), ScrollTop
  layouts/BaseLayout.astro  <head>, header, footer, scripts
  pages/                    index, about, mission-vision, contact, 404,
                            sectors/{index,[slug]}, opportunities/{index,[slug]}, projects/{index,[slug]}
  plugins/                  remark/rehype: ::slideshow ::video ::button, external links
  lib/content.ts            sorting, labels, CTA rules (Upcoming → Ongoing → Past)
  scripts/                  main.js (AOS, header, counters, menu, back-to-top…), forms.js, slideshow.js, carousel.js, vendor/liquid-effect-pro.js
  styles/                   main.scss + partials   ← docs/STYLES.md
public/
  assets/css/styles.css     your compiled Bootstrap build (served as-is)
  assets/images, videos     ← copy from the old site (see public/assets/README.md)
  sectors/sector-detail.html, opportunities/program-detail/   redirect old ?slug= URLs to the new pages
scripts/                    check-content, check-links, new-content, optimize-images, migrate-json-to-md
legacy/                     the original JSON (input for scripts/migrate-json-to-md.mjs)
.github/workflows/deploy.yml
```

## Deploy

Repo **Settings → Pages → Source: GitHub Actions**. Push to `main`: content check → build → link check → deploy.
Pull requests run the same checks without deploying. `public/CNAME` carries your custom domain (the canonical URL is read from it).

## Carousels

`<Carousel>` (src/components/Carousel.astro) wraps [Swiper](https://swiperjs.com): no jQuery, loaded only on pages that contain one
(`src/scripts/carousel.js`). Defaults: 1 slide on phones, 2 from 768 px, 3 from 1200 px; arrows/dots hide themselves when everything fits;
without JavaScript it falls back to a swipeable scroll-snap row. Pass `options` for autoplay or other Swiper settings
(autoplay is ignored for visitors who prefer reduced motion). The home page news section uses it.
