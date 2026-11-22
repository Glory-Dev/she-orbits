// jQuery-free carousel (Swiper). Loaded only on pages that contain a <Carousel>.
import { Swiper } from 'swiper';
import { Navigation, Pagination, Autoplay, A11y, Keyboard } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/a11y';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const DEFAULTS = {
  slidesPerView: 1,
  spaceBetween: 24,
  watchOverflow: true, // no arrows/dots when everything already fits
  keyboard: { enabled: true, onlyInViewport: true },
  breakpoints: { 768: { slidesPerView: 2 }, 1200: { slidesPerView: 3 } },
};

document.querySelectorAll('[data-carousel]').forEach((root) => {
  let custom = {};
  try { custom = JSON.parse(root.dataset.carousel || '{}'); } catch { /* ignore bad JSON */ }
  if (reduceMotion) delete custom.autoplay;
  new Swiper(root.querySelector('.swiper'), {
    modules: [Navigation, Pagination, Autoplay, A11y, Keyboard],
    ...DEFAULTS,
    ...custom,
    navigation: { prevEl: root.querySelector('.carousel-prev'), nextEl: root.querySelector('.carousel-next') },
    pagination: { el: root.querySelector('.carousel-dots'), clickable: true },
    a11y: { prevSlideMessage: 'Previous slide', nextSlideMessage: 'Next slide' },
  });
  root.classList.add('is-ready');
});
