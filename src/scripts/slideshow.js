// Wires up the slideshows rendered at build time by the markdown plugin (::slideshow{...}).
// Slides after the first are fetched on demand (data-src) so big galleries don't block the page.
const load = (img) => {
  if (img && !img.getAttribute('src') && img.dataset.src) {
    img.loading = 'eager';
    img.src = img.dataset.src;
  }
};

document.querySelectorAll('[data-slideshow]').forEach((holder) => {
  const slides = [...holder.querySelectorAll('.detail-slide')];
  if (slides.length < 2) return;
  const counter = holder.querySelector('.detail-slide-counter');
  const stage = holder.querySelector('.detail-slideshow-stage');
  let index = 0;
  const at = (n) => slides[(n + slides.length) % slides.length];

  const go = (n) => {
    index = (n + slides.length) % slides.length;
    load(at(index));
    slides.forEach((s, i) => s.classList.toggle('is-active', i === index));
    counter.textContent = `${index + 1} / ${slides.length}`;
    load(at(index + 1)); // warm the neighbours
    load(at(index - 1));
  };

  holder.querySelector('.is-prev').addEventListener('click', () => go(index - 1));
  holder.querySelector('.is-next').addEventListener('click', () => go(index + 1));
  holder.setAttribute('tabindex', '0');
  holder.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') go(index + 1);
    if (e.key === 'ArrowLeft') go(index - 1);
  });

  let startX = null;
  stage.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const diff = e.changedTouches[0].clientX - startX;
    startX = null;
    if (Math.abs(diff) > 40) go(diff < 0 ? index + 1 : index - 1);
  });

  // when the slideshow approaches the viewport, fetch the second slide so "next" is instant
  new IntersectionObserver((entries, obs) => {
    if (entries.some((e) => e.isIntersecting)) { load(at(1)); obs.disconnect(); }
  }, { rootMargin: '400px' }).observe(holder);
});
