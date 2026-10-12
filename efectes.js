/* efectes.js — Rotaract Igualada
   Animacions de la interfície: onada en clicar els botons, targetes
   en 3D que segueixen el ratolí, barra de progrés de lectura i peu de
   pàgina animat. No toca cap contingut i respecta «reduir moviment». */
(function () {
  'use strict';

  var footer = document.querySelector('.footer');

  // ── Peu de pàgina: marca la pàgina actual als enllaços de navegació ──
  // (es fa sempre, també amb «reduir moviment»: és accessibilitat)
  if (footer) {
    var pageOf = function (path) {
      return path.endsWith('/') ? path + 'index.html' : path;
    };
    var current = pageOf(window.location.pathname);
    footer.querySelectorAll('.footer__links a[href$=".html"]').forEach(function (link) {
      if (pageOf(new URL(link.href).pathname) === current) link.setAttribute('aria-current', 'page');
    });
    // També als enllaços principals del menú mòbil
    document.querySelectorAll('.mobile-nav__link[href$=".html"], .mobile-nav__group-label[href$=".html"]').forEach(function (link) {
      if (pageOf(new URL(link.href).pathname) === current) link.setAttribute('aria-current', 'page');
    });
  }

  // ── Menú mòbil: «ROTARACT» en diagonal de fons (decoratiu) ──
  var mobileNav = document.getElementById('mobileNav');
  if (mobileNav) {
    var navMark = document.createElement('div');
    navMark.className = 'fx-nav-mark';
    navMark.setAttribute('aria-hidden', 'true');
    for (var r = 0; r < 8; r++) {
      var row = document.createElement('span');
      // Text repetit: en desplaçar-lo la meitat, el bucle no es nota
      row.textContent = new Array(9).join('ROTARACT ✦ ');
      navMark.appendChild(row);
    }
    mobileNav.insertBefore(navMark, mobileNav.firstChild);
  }

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  var BUTTONS = '.btn, .btn-submit, .contact-card__btn, .signup-process__cta-btn, .instagram-section__cta, ' +
    '.header__cta, .mobile-nav__cta, .act-filter-btn, .act-hero__tab-btn, .lang-menu__btn, .lang-menu__opt, .qc-card';
  var TILT = '.ig-post, .qc-card, .act-card, .junta-card, .soci-card, .aboutus__pillar, .galeria__item, .join-cta__step';
  var MAX_TILT = 6; // graus

  // L'element ha de poder contenir l'onada o la brillantor sense
  // canviar la seva posició si ja era absolut o fix.
  function host(el) {
    if (el.classList.contains('fx-host')) return;
    el.classList.add('fx-host');
    if (window.getComputedStyle(el).position === 'static') el.classList.add('fx-host-pos');
  }

  // ── Onada en clicar (delegació: també per a botons creats després) ──
  document.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    var btn = e.target.closest ? e.target.closest(BUTTONS) : null;
    if (!btn || btn.disabled) return;
    host(btn);
    var rect = btn.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height) * 2.2;
    var ripple = document.createElement('span');
    ripple.className = 'fx-ripple';
    ripple.setAttribute('aria-hidden', 'true');
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', function () { ripple.remove(); });
  });

  // ── Targetes 3D (només amb ratolí; al mòbil no tindria sentit) ──
  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (finePointer) {
    document.querySelectorAll(TILT).forEach(function (card) {
      var glare = null;
      var frame = null;

      // La classe s'afegeix en passar-hi el ratolí (no abans) per no
      // interferir amb les animacions d'aparició de les targetes.
      card.addEventListener('pointerenter', function () {
        card.classList.add('fx-tilt');
        host(card);
        if (!glare) {
          glare = document.createElement('span');
          glare.className = 'fx-glare';
          glare.setAttribute('aria-hidden', 'true');
          card.appendChild(glare);
        }
      });

      card.addEventListener('pointermove', function (e) {
        if (frame) return;
        frame = window.requestAnimationFrame(function () {
          frame = null;
          var rect = card.getBoundingClientRect();
          var x = (e.clientX - rect.left) / rect.width;  // 0 … 1
          var y = (e.clientY - rect.top) / rect.height;
          card.style.setProperty('--fx-ry', ((x - 0.5) * 2 * MAX_TILT).toFixed(2) + 'deg');
          card.style.setProperty('--fx-rx', ((0.5 - y) * 2 * MAX_TILT).toFixed(2) + 'deg');
          card.style.setProperty('--fx-mx', (x * 100).toFixed(1) + '%');
          card.style.setProperty('--fx-my', (y * 100).toFixed(1) + '%');
          card.classList.add('fx-tilting');
        });
      });

      card.addEventListener('pointerleave', function () {
        if (frame) { window.cancelAnimationFrame(frame); frame = null; }
        card.classList.remove('fx-tilting');
      });
    });
  }

  // ── Peu de pàgina: marca d'aigua, entrada en 3D i llum que segueix el ratolí ──
  if (footer) {
    var mark = document.createElement('span');
    mark.className = 'fx-footer-mark';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = 'Rotaract';
    footer.appendChild(mark);
  }
  if (footer && 'IntersectionObserver' in window) {
    footer.classList.add('fx-footer-ready');
    var footerObs = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      footer.classList.add('fx-footer-in');
      footerObs.disconnect();
    }, { threshold: 0.12 });
    footerObs.observe(footer);
  }
  if (footer && finePointer) {
    footer.addEventListener('pointermove', function (e) {
      var rect = footer.getBoundingClientRect();
      footer.style.setProperty('--fx-fx', (e.clientX - rect.left) + 'px');
      footer.style.setProperty('--fx-fy', (e.clientY - rect.top) + 'px');
    });
    footer.addEventListener('pointerleave', function () {
      footer.style.removeProperty('--fx-fx');
      footer.style.removeProperty('--fx-fy');
    });
  }

  // ── Barra de progrés de lectura ──
  var bar = document.createElement('div');
  bar.className = 'fx-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  var ticking = false;
  function updateProgress() {
    ticking = false;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    bar.style.transform = 'scaleX(' + ratio.toFixed(4) + ')';
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(updateProgress); }
  }, { passive: true });
  window.addEventListener('resize', updateProgress, { passive: true });
  updateProgress();
})();
