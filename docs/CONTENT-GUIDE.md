# Adding and editing pages (no code)

Everything that grows over time is **one markdown file**: opportunities, sectors, projects and news. Add a file → it
gets its card (and its own page, except news) automatically. Nothing else to edit.

| What | Where the file goes | Page it creates |
|---|---|---|
| Opportunity | `src/content/opportunities/<url-name>.md` | `/opportunities/<url-name>/` |
| Sector | `src/content/sectors/<url-name>.md` | `/sectors/<url-name>/` |
| Project | `src/content/projects/<url-name>.md` | `/projects/<url-name>/` |
| News item | `src/content/news/<url-name>.md` | a card in the home page news carousel (links out to the article) |

`<url-name>` = lowercase letters, numbers and dashes (`python-for-orbital-mechanics.md`). It becomes the URL.

## 1. The structure of a file

```markdown
---
title: "Python for Orbital Mechanics"
type: "courses"
status: "upcoming"
image: "/assets/images/services/python-orbits.jpg"
form: "https://forms.gle/xxxx"
summary: "Learn to simulate orbits in Python — no experience needed."
---

Longer description, as many paragraphs as you like.

## Topics covered

- Kepler's laws
- Numerical integration

## Sessions & milestones

- Week 1: Setup and basics
```

Copy a ready-made file from `docs/templates/`, or run `npm run content:new` and answer the questions.

### Opportunity fields (between the `---` lines)

| Field | Required | Values |
|---|---|---|
| `title` | yes | text |
| `type` | yes | one of the categories in `src/data/opportunity-types.json` |
| `status` | yes | `upcoming`, `ongoing`, `past`, `coming-soon` |
| `image` | yes | path starting `/assets/` (file lives in `public/assets/...`) |
| `summary` | recommended | 1–2 sentences for the card (can be empty for "coming soon") |
| `form` | optional | full `https://` link. Upcoming → **Apply Now**, past → **Enroll Now**. No link → no button |
| `order` | optional | whole number; lower shows first within the same status |
| `draft` | optional | `true` hides it everywhere (keep it saved, publish later) |

Cards are grouped by category, then shown **Upcoming → Ongoing → Past → Coming soon**.

### Sector fields

`title`, `number` (unique, sets the order), `status` (`active` / `coming-soon`), `image`, `summary` are required.
`cardTitle` (shorter name for cards) and `draft` are optional.

### Project fields

`title`, `image`, `summary` (the project description) are required. `keywords` is a list: `keywords: ["CubeSat", "Orbits"]`.
`imagePosition` (e.g. `"center 30%"`), `order` (lower first) and `draft` are optional. Text below the `---` is optional extra detail.
**Projects and the home page are the same list:** the home "Our Research Projects" section shows the first 12 projects by `order`
(then a "Discover More Projects" button to `/projects/`, which lists all of them). To feature a project on the home page, give it a low `order`.
Template: `docs/templates/project.md`.

### News fields

`title`, `source` (publisher, e.g. NASA), `url` (the original article), `image`, `summary` are required.
Optional: `date: "2026-11-03"` (newest dated item shows first; undated items follow in `order`), `imagePosition`
(CSS like `"center 30%"`, picks which part of a tall picture is kept when it is cropped), `draft`.
The home page shows the 9 newest in a carousel; arrows and dots appear by themselves when there are more than fit.
News files have no body text. Template: `docs/templates/news.md`.

## 2. What you can write in the body

Standard markdown:

| You type | You get |
|---|---|
| plain paragraphs | paragraphs |
| `## Heading` | a section heading (**start at `##`**, the page title is already the main heading) |
| `### Sub-heading` | a smaller indigo sub-heading |
| `- item` / `1. item` | list |
| `**bold**`, `*italic*` | bold, italic |
| `[text](https://…)` | link (external links open in a new tab) |
| `![description](/assets/images/x.jpg)` | image |

Three extras, each **on its own line**:

```markdown
::video{src="/assets/videos/recap.mp4"}

::slideshow{folder="/assets/images/my-event/day-1" alt="Day 1 highlights"}

::button[Apply now]{href="https://forms.gle/xxxx"}
```

**Slideshows:** put the pictures in a folder under `public/assets/images/…` and point `folder` at it. Every image in
the folder is used, in natural order (`slide-1.jpg, slide-2.jpg, slide-10.jpg`). Add or remove pictures — no markdown change.

## 3. Pictures: compress them first

Big photos are the usual reason a page "doesn't load" (a 10 MB PNG × 10 slides). Browsers also can't show TIFF/HEIC, and
GitHub's web uploader rejects files over 25 MB. One command fixes all of it:

```bash
npm run images:optimize                                           # every image under public/assets/images
npm run images:optimize -- public/assets/images/world-space-week-2026   # just one folder
npm run images:optimize -- --dry-run                              # preview, change nothing
```

For each PNG/JPG/TIFF it makes a clean `.webp` next to it (longest side 1600 px, quality 80; typically **90–95 % smaller**),
fixes phone-photo rotation, renames it safely (`Day 1 (2).PNG` → `day-1-2.webp`), moves the big original to
`assets-originals/` (git-ignored, so it isn't deployed; keep it as your backup) and **updates any `/assets/...` reference in
the markdown for you**. Options: `--width=2000`, `--quality=85`.

Rules of thumb: aim for **under 300 KB per picture**; name files so they sort the way you want them shown
(`01.jpg`, `02.jpg`… or `slide-1.jpg`, `slide-2.jpg`…); slideshows show images in file-name order.
`npm run build` warns about anything over 1.5 MB and fails on anything over 15 MB.

Slideshows only download the first picture up front and fetch the next ones when someone clicks, so long galleries stay fast.

## 4. Publishing (GitHub, no tools needed)

1. In the repo, open `src/content/opportunities/` (or `sectors/`) → **Add file → Upload files** (or **Create new file**).
2. Upload **optimized** images (section 3) into `public/assets/images/…` the same way.
3. Commit. For a review first, choose **Create a new branch / Open a pull request**.
4. GitHub Actions runs automatically:
   * **Content check** — tells you in plain English what's wrong (missing field, unknown category, image not found…).
   * **Build + link check**.
   * On `main` the site is deployed (about a minute).

If something fails, open the red ✗ in the **Actions** tab; the message names the file and the problem.

## 5. Preview on your computer

```bash
npm install
npm run dev            # live preview at http://localhost:4321
npm run build && npm run check:links
```

> After adding **images to a slideshow folder** without editing the `.md`, delete the `.astro` folder (or save the
> `.md` again) so the preview refreshes. CI builds are always clean.

## 6. Common tasks

* **New category** (e.g. "Hackathons"): add an entry to `src/data/opportunity-types.json` (`id`, `label`, `desc`). It
  appears in the menu, footer and listing page automatically. Then use its `id` as `type:`.
* **Move to past:** change `status: "upcoming"` to `"past"`.
* **Hide temporarily:** add `draft: true`.
* **Rename the URL:** rename the file (old links will break; keep the old file as a draft if needed).
