/* nosaltres.js — Reveal on scroll i fallback d'imatges */
document.addEventListener('DOMContentLoaded', function () {
  /* ── Reveal on scroll ── */
  const els = document.querySelectorAll('.nosaltres-bloc__text, .nosaltres-bloc__visual');
  if ('IntersectionObserver' in window && els.length) {
    const obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('nos-visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { obs.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('nos-visible'); });
  }

  /* ── Fallback d'imatges: si una imatge no carrega, s'amaga
     (l'element que la substitueix es mostra via CSS) ── */
  document.querySelectorAll('img[data-fallback]').forEach(function (img) {
    img.addEventListener('error', function () {
      img.style.display = 'none';
    });
  });
});