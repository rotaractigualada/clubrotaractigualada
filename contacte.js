/* contacte.js */
(function () {
  'use strict';

  // ── Reveal on scroll ────────────────────────
  const revealEls = document.querySelectorAll('.reveal-left, .reveal-right');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    // Navegadors sense IntersectionObserver: mostra-ho tot directament
    revealEls.forEach(function (el) { el.classList.add('active'); });
  }
})();
