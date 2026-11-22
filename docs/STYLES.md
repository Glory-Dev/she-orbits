# Styles

```
public/assets/css/styles.css     ← your compiled Bootstrap 5.3 build + custom utilities (fs-16, round-52, py-xl-12 …),
                                    served as-is and linked BEFORE the Sass bundle (identical cascade to the old site)
src/styles/main.scss             ← single Sass entry point (Font Awesome + everything below)
  abstracts/_variables.scss      ← colour tokens
  base/_theme.scss               ← she-orbits-theme.css (primary override, fixed header, hero logo)
  base/_icons.scss               ← Font Awesome helpers
  components/                    ← banner, header, footer, cards   (from the old inline <style> blocks)
  pages/                         ← home, featured-projects, contact, mission-vision, sectors, opportunities, detail, markdown-body
  bootstrap.scss                 ← PHASE 2, not loaded (see below)
```

The old inline `<style>` blocks were duplicated on every page (185 unique rules in total); they now exist once.
Where pages disagreed, the merge was: nav rules = union of both variants; `.programs-grid` 3-up on the hub but 2-up
in the home preview (scoped to `.programs-preview-block`); `.program-detail-image` = the later of the two rules in the old file.

## Phase 2: drop the compiled `styles.css`

`styles.css` is a compiled Bootstrap build with a customised utility scale, so it can't be reproduced reliably without the
original Sass source. If you still have that source (or are happy to re-derive the tokens), port its `:root` variables into
`abstracts/_variables.scss`, import `src/styles/bootstrap.scss` first in `BaseLayout.astro` (it compiles today) and delete
`public/assets/css/styles.css`.
