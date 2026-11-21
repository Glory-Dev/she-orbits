/**
 * Custom markdown syntax for content files (see docs/CONTENT-GUIDE.md):
 *
 *   ::slideshow{folder="/assets/images/my-event/day-1" alt="Day 1"}
 *   ::video{src="/assets/videos/recap.mp4"}
 *   ::button[Apply now]{href="https://forms.gle/..."}
 *
 * Slideshow images are discovered at BUILD time by listing public/<folder>
 * (natural sort: slide-2.jpg before slide-10.jpg), so authors just drop images in a folder.
 */
import { visit } from 'unist-util-visit';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const IMG = /\.(jpe?g|png|webp|gif|avif)$/i;
const NOT_WEB = /\.(tiff?|heic|heif|bmp|psd)$/i;
const natural = (a, b) => a.localeCompare(b, undefined, { numeric: true });
const el = (tagName, properties = {}, children = []) => ({ type: 'element', tagName, properties, children });
const txt = (value) => ({ type: 'text', value });

export function listSlides(folder, root = process.cwd()) {
  const dir = join(root, 'public', folder);
  if (!existsSync(dir)) return null;
  const all = readdirSync(dir);
  const skipped = all.filter((f) => NOT_WEB.test(f));
  if (skipped.length) console.warn(`[slideshow] ${folder}: skipped non-web images (${skipped.slice(0, 3).join(', ')}${skipped.length > 3 ? '…' : ''}). Run: npm run images:optimize`);
  return all.filter((f) => IMG.test(f)).sort(natural).map((f) => `${folder.replace(/\/$/, '')}/${f}`);
}

export function remarkSheOrbits() {
  return (tree, file) => {
    const where = file?.path ? file.path.split('/src/content/')[1] || file.path : 'markdown';
    const raw = (node) => String(file?.value ?? '').slice(node.position?.start.offset, node.position?.end.offset);

    visit(tree, (node, index, parent) => {
      if (!['leafDirective', 'textDirective', 'containerDirective'].includes(node.type)) return;
      const a = node.attributes || {};

      if (node.type === 'leafDirective' && node.name === 'video') {
        node.data = {
          hName: 'video',
          hProperties: { controls: true, preload: 'metadata', className: ['detail-video'], src: a.src },
          hChildren: [],
        };
        node.children = [];
        return;
      }

      if (node.type === 'leafDirective' && node.name === 'slideshow') {
        const folder = a.folder;
        const slides = folder ? listSlides(folder) : null;
        if (!slides || !slides.length) {
          console.warn(`[slideshow] ${where}: no images found in public${folder} - block skipped`);
          parent.children.splice(index, 1);
          return [visit.SKIP ?? 'skip', index];
        }
        const alt = a.alt || 'Slide';
        const multiple = slides.length > 1;
        const stage = el('div', { className: ['detail-slideshow-stage'] }, [
          // Only the first slide gets a real src; the rest carry data-src and are fetched on demand by
          // src/scripts/slideshow.js, so a slideshow of 10 large photos costs one image on page load.
          ...slides.map((src, i) =>
            el('img', {
              ...(i === 0 ? { src: encodeURI(src), loading: 'eager', fetchpriority: 'high' } : { dataSrc: encodeURI(src) }),
              alt: `${alt} – slide ${i + 1}`,
              className: ['detail-slide', ...(i === 0 ? ['is-active'] : [])],
              decoding: 'async',
            })),
          ...(multiple ? [
            el('button', { type: 'button', className: ['detail-slide-btn', 'is-prev'], ariaLabel: 'Previous slide' }, [txt('❮')]),
            el('button', { type: 'button', className: ['detail-slide-btn', 'is-next'], ariaLabel: 'Next slide' }, [txt('❯')]),
            el('span', { className: ['detail-slide-counter'] }, [txt(`1 / ${slides.length}`)]),
          ] : []),
        ]);
        node.data = { hName: 'div', hProperties: { className: ['detail-slideshow'], dataSlideshow: '' }, hChildren: [stage] };
        node.children = [];
        return;
      }

      if (node.type === 'leafDirective' && node.name === 'button') {
        const label = (node.children || []).map((c) => c.value || '').join('') || a.href;
        node.data = {
          hName: 'p',
          hProperties: {},
          hChildren: [el('a', { href: a.href, className: ['btn', 'btn-primary', 'text-white'] }, [txt(label)])],
        };
        node.children = [];
        return;
      }

      // Anything else that merely *looks* like a directive (e.g. "Time:UTC") is turned back into plain text.
      if (parent && typeof index === 'number') {
        parent.children.splice(index, 1, { type: 'text', value: raw(node) });
        return [visit.SKIP ?? 'skip', index + 1];
      }
    });
  };
}
