#!/usr/bin/env python3
"""Apply comfy space palette and featured projects grid updates."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML_DIR = ROOT / "html"

THEME_LINK = '  <link rel="stylesheet" href="../assets/css/she-orbits-theme.css" />\n'

GREY_OVERRIDE_PATTERNS = [
    re.compile(
        r"\s*\.bg-primary\s*\{\s*background-color:\s*#6B7280\s*!important;\s*\}\s*"
        r"\.text-primary\s*\{\s*color:\s*#9CA3AF\s*!important;\s*\}\s*"
        r"\.border-primary\s*\{\s*border-color:\s*#6B7280\s*!important;\s*\}\s*"
        r'\[style\*="#00F5FF"\]\s*\{\s*color:\s*#E5E7EB\s*!important;\s*\}\s*',
        re.DOTALL,
    ),
    re.compile(
        r"\s*:root\s*\{\s*--bs-primary:\s*#6B7280\s*!important;\s*--bs-primary-rgb:\s*107,\s*114,\s*128\s*!important;\s*\}\s*",
        re.DOTALL,
    ),
    re.compile(
        r"\s*\.bg-primary,\s*\.btn-primary\s*\{\s*background-color:\s*#6B7280\s*!important;\s*\}\s*"
        r"\.text-primary\s*\{\s*color:\s*#6B7280\s*!important;\s*\}\s*"
        r"\.border-primary\s*\{\s*border-color:\s*#6B7280\s*!important;\s*\}\s*"
        r"\.btn-primary:hover\s*\{\s*background-color:\s*#4B5563\s*!important;\s*\}\s*",
        re.DOTALL,
    ),
    re.compile(
        r"\s*\[style\*=\"#9fef00\"\],\s*\[style\*=\"159,\s*239,\s*0\"\]\s*\{\s*color:\s*#9CA3AF\s*!important;\s*\}\s*",
        re.DOTALL,
    ),
    re.compile(
        r"\s*\.round-36\.bg-primary,\s*\.round-45\.bg-primary,\s*\.round-52\.bg-primary,\s*\.round-64\.bg-primary\s*\{\s*background-color:\s*#6B7280\s*!important;\s*\}\s*",
        re.DOTALL,
    ),
    re.compile(
        r"\s*:root\s*\{\s*--bs-primary:\s*#6B7280\s*!important;\s*--bs-primary-rgb:\s*107,\s*114,\s*128\s*!important;\s*\}\s*"
        r"\.bg-primary,\s*\.btn-primary\s*\{\s*background-color:\s*#6B7280\s*!important;\s*\}\s*"
        r"\.text-primary\s*\{\s*color:\s*#6B7280\s*!important;\s*\}\s*"
        r"\.btn-primary:hover\s*\{\s*background-color:\s*#4B5563\s*!important;\s*\}\s*",
        re.DOTALL,
    ),
]

COLOR_REPLACEMENTS = {
    "#6B7280": "#6366f1",
    "#4B5563": "#4f46e5",
    "#9CA3AF": "#a5b4fc",
    "rgba(107, 114, 128,": "rgba(99, 102, 241,",
    "rgba(156, 163, 175,": "rgba(165, 180, 252,",
}

FEATURED_PROJECTS = [
    ("LUNA-W Satellite Mission", "Earth observation satellite built by an all-women engineering team.", "portfolio-img-1.jpg", ["Earth Observation", "Climate Monitoring"]),
    ("Mars Habitat Design Project", "Sustainable habitat concepts for long-duration Mars missions.", "portfolio-img-2.jpg", ["Space Architecture", "Life Support Systems"]),
    ("Asteroid Mining Research", "Research initiative exploring resource extraction from near-Earth objects.", "portfolio-img-3.jpg", ["Resource Extraction", "Deep Space Tech"]),
    ("Space Medicine Initiative", "Biomedical research advancing astronaut health and recovery.", "portfolio-img-4.jpg", ["Biomedical Research", "Astronaut Health"]),
    ("Quantum Communications Lab", "Secure space communications through quantum encryption research.", "portfolio-img-5.jpg", ["Quantum Tech", "Secure Comms"]),
    ("Space Debris Tracking System", "AI-assisted orbital monitoring to improve mission safety.", "portfolio-img-6.jpg", ["Orbital Safety", "AI Monitoring"]),
]


def build_featured_card(title, description, image, tags):
    tag_html = "".join(f'<span class="badge border">{tag}</span>' for tag in tags)
    return f"""            <article class="featured-project-card" data-aos="fade-up" data-aos-duration="1000">
              <div class="featured-project-image">
                <img src="../assets/images/portfolio/{image}" alt="{title}" loading="lazy">
                <div class="featured-project-overlay">
                  <span class="btn bg-primary round-64 rounded-circle hstack justify-content-center" aria-hidden="true">
                    <iconify-icon icon="lucide:arrow-up-right" class="fs-8 text-white"></iconify-icon>
                  </span>
                </div>
              </div>
              <div class="featured-project-body">
                <h3 class="featured-project-title">{title}</h3>
                <p class="mb-0 text-white text-opacity-70">{description}</p>
                <div class="featured-project-tags">{tag_html}</div>
              </div>
            </article>"""


def build_featured_grid():
    cards = "\n".join(build_featured_card(*item) for item in FEATURED_PROJECTS)
    return f"""        <div class="container px-3">
          <div class="featured-projects-grid" aria-label="Featured space missions">
{cards}
          </div>
        </div>"""


def apply_palette(text: str) -> str:
    if "she-orbits-theme.css" not in text:
        text = text.replace(
            '<link rel="stylesheet" href="../assets/css/styles.css" />',
            '<link rel="stylesheet" href="../assets/css/styles.css" />\n' + THEME_LINK,
            1,
        )

    for pattern in GREY_OVERRIDE_PATTERNS:
        text = pattern.sub("\n", text)

    for old, new in COLOR_REPLACEMENTS.items():
        text = text.replace(old, new)

    return text


def replace_featured_projects(text: str) -> str:
    pattern = re.compile(
        r'<div class="featured-projects-slider px-3">.*?</div>\s*</div>\s*</section>',
        re.DOTALL,
    )
    replacement = build_featured_grid() + "\n      </div>\n    </section>"
    if not pattern.search(text):
        return text
    return pattern.sub(replacement, text, count=1)


def update_file(path: Path) -> bool:
    original = path.read_text()
    updated = apply_palette(original)
    if path.name == "index.html":
        updated = replace_featured_projects(updated)
        updated = updated.replace(
            '  <link rel="stylesheet" href="../assets/libs/owl.carousel/dist/assets/owl.carousel.min.css">\n',
            "",
        )
        updated = updated.replace(
            '  <script src="../assets/libs/owl.carousel/dist/owl.carousel.min.js"></script>\n',
            "",
        )
    if updated != original:
        path.write_text(updated)
        return True
    return False


def main() -> None:
    redirect_stubs = {
        "courses.html",
        "fellowships.html",
        "internships.html",
        "events.html",
        "panels.html",
        "competitions.html",
        "conferences.html",
        "workshops.html",
        "404.html",
    }
    changed = []
    for path in sorted(HTML_DIR.glob("*.html")):
        if path.name in redirect_stubs:
            continue
        if update_file(path):
            changed.append(path.name)
    print("Updated:", ", ".join(changed) if changed else "none")


if __name__ == "__main__":
    main()
