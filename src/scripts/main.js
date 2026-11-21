// Site-wide behaviour. Replaces custom.js + the inline jQuery/scripts of the old pages. No jQuery.
import Dropdown from 'bootstrap/js/dist/dropdown';
import 'bootstrap/js/dist/collapse';
import AOS from 'aos';
import 'aos/dist/aos.css';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ---- AOS (scroll animations) ----
AOS.init({ once: true });

// ---- header compact state after 60px; back-to-top button appears after 400px ----
const header = $('header');
const scrollBtn = $('#scrollToTopBtn');
const onScroll = () => {
  header?.classList.toggle('fixed-header', window.scrollY >= 60);
  scrollBtn?.classList.toggle('is-visible', window.scrollY > 400);
};
scrollBtn?.addEventListener('click', () =>
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ---- mobile menu: expandable "Opportunities" submenu + close button ----
$$('[data-submenu-toggle]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const submenu = link.nextElementSibling;
    if (submenu?.classList.contains('submenu')) {
      submenu.classList.toggle('show');
      link.classList.toggle('show');
    }
  });
});
$$('.dropdown-menu .btn-close').forEach((btn) => {
  btn.addEventListener('click', () => {
    const toggle = btn.closest('.btn-group')?.querySelector('[data-bs-toggle="dropdown"]');
    if (toggle) Dropdown.getOrCreateInstance(toggle).hide();
  });
});

// ---- number counters (.count) — was jQuery .animate with "swing" easing ----
$$('.count').forEach((el) => {
  const target = parseFloat(el.textContent);
  if (Number.isNaN(target)) return;
  const duration = 1000;
  const start = performance.now();
  const tick = (now) => {
    const p = Math.min((now - start) / duration, 1);
    const eased = 0.5 - Math.cos(p * Math.PI) / 2; // jQuery "swing"
    el.textContent = Math.ceil(target * eased);
    if (p < 1) requestAnimationFrame(tick);
  };
  el.textContent = '0';
  requestAnimationFrame(tick);
});

// ---- home: twinkling stars ----
const stars = $('#starsContainer');
if (stars) {
  for (let i = 0; i < 50; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 100 + '%';
    star.style.animationDelay = Math.random() * 3 + 's';
    star.style.opacity = Math.random() * 0.5 + 0.3;
    stars.appendChild(star);
  }
}

// ---- page-specific modules, loaded only where needed ----
if ($('#contactForm, #participantForm, #partnerForm')) import('./forms.js');
if ($('[data-slideshow]')) import('./slideshow.js');
if ($('[data-carousel]')) import('./carousel.js');
if (document.body.hasAttribute('data-fluid-cursor') && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  import('./vendor/liquid-effect-pro.js');
}
