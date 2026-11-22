import { visit } from 'unist-util-visit';

/** External links open in a new tab; content images are responsive + lazy. */
export function rehypeSheOrbits() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      const p = (node.properties ||= {});
      if (node.tagName === 'a' && /^https?:\/\//i.test(String(p.href || ''))) {
        p.target = '_blank';
        p.rel = 'noopener noreferrer';
      }
      if (node.tagName === 'img') {
        p.loading ??= 'lazy';
        p.decoding ??= 'async';
        const cls = Array.isArray(p.className) ? p.className : p.className ? [p.className] : [];
        if (!cls.includes('detail-slide')) p.className = [...cls, 'img-fluid'];
      }
    });
  };
}
