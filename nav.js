/* nav.js — Navegació mòbil compartida (totes les pàgines)
   - Obre/tanca el menú mòbil amb classe .is-open
   - Bloqueja el scroll del fons amb body.nav-open
   - Gestió d'aria-expanded / aria-hidden
   - Tancament amb Escape o clic a un enllaç del menú
*/
document.addEventListener('DOMContentLoaded', function () {
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobileNav');
  const mobileOverlay = document.getElementById('mobileOverlay');
  const mobileNavClose = document.getElementById('mobileNavClose');

  if (!hamburger || !mobileNav || !mobileOverlay || !mobileNavClose) return;

  function openNav() {
    mobileNav.classList.add('is-open');
    mobileOverlay.classList.add('is-open');
    hamburger.setAttribute('aria-expanded', 'true');
    mobileNav.setAttribute('aria-hidden', 'false');
    mobileOverlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('nav-open');
    mobileNavClose.focus();
  }

  function closeNav() {
    mobileNav.classList.remove('is-open');
    mobileOverlay.classList.remove('is-open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-open');
    // Endarrerim aria-hidden i el focus() perquè iOS Safari no talli una
    // navegació pendent en tocar un enllaç: si es fan a l'instant, Safari
    // treu el focus de l'enllaç tocat i cancel·la l'acció per defecte.
    setTimeout(function () {
      mobileNav.setAttribute('aria-hidden', 'true');
      mobileOverlay.setAttribute('aria-hidden', 'true');
      hamburger.focus();
    }, 0);
  }

  hamburger.addEventListener('click', openNav);
  mobileNavClose.addEventListener('click', closeNav);
  mobileOverlay.addEventListener('click', closeNav);

  mobileNav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closeNav);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && mobileNav.classList.contains('is-open')) {
      closeNav();
    }
  });
});