/* galeria.js — Mosaic de fotos de la portada
   - Entrada escalonada de les fotos en fer scroll
   - Visor a pantalla completa (lightbox): teclat (←/→/Esc),
     botons, lliscament en mòbil i focus atrapat dins del visor.
   Sense JavaScript, cada foto és un enllaç a la imatge gran. */
document.addEventListener('DOMContentLoaded', function () {
  var grid = document.getElementById('galeriaGrid');
  if (!grid) return;
  var items = Array.prototype.slice.call(grid.querySelectorAll('.galeria__item'));
  if (!items.length) return;

  var getLang = function () { return document.documentElement.getAttribute('lang'); };
  var t = function (ca, en, es) {
    var l = getLang();
    return l === 'en' ? en : l === 'es' ? es : ca;
  };

  /* ── Entrada escalonada ── */
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('IntersectionObserver' in window && !reduceMotion) {
    grid.classList.add('galeria__grid--anim');
    items.forEach(function (item, i) { item.style.setProperty('--i', i); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        // Mostra aquesta foto i totes les anteriors: si l'usuari salta
        // directament més avall, les de dalt no es queden invisibles.
        var upTo = items.indexOf(entry.target);
        for (var k = 0; k <= upTo; k++) {
          items[k].classList.add('is-visible');
          io.unobserve(items[k]);
        }
      });
    }, { threshold: 0.15 });
    items.forEach(function (item) { io.observe(item); });
  }

  /* ── Visor (lightbox) ── */
  var ICON = {
    close: '<path d="M18 6L6 18"/><path d="M6 6l12 12"/>',
    prev: '<polyline points="15 18 9 12 15 6"/>',
    next: '<polyline points="9 18 15 12 9 6"/>'
  };
  function button(cls, icon) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'lightbox__btn ' + cls;
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + icon + '</svg>';
    return b;
  }

  var box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.hidden = true;

  var btnClose = button('lightbox__close', ICON.close);
  var btnPrev = button('lightbox__prev', ICON.prev);
  var btnNext = button('lightbox__next', ICON.next);
  var figure = document.createElement('figure');
  figure.className = 'lightbox__figure';
  var img = document.createElement('img');
  img.className = 'lightbox__img';
  var caption = document.createElement('figcaption');
  caption.className = 'lightbox__caption';
  caption.id = 'lightboxCaption';
  var counter = document.createElement('span');
  counter.className = 'lightbox__counter';
  var captionText = document.createElement('span');
  caption.appendChild(counter);
  caption.appendChild(captionText);
  figure.appendChild(img);
  figure.appendChild(caption);
  box.appendChild(btnClose);
  box.appendChild(btnPrev);
  box.appendChild(figure);
  box.appendChild(btnNext);
  box.setAttribute('aria-labelledby', caption.id);
  document.body.appendChild(box);

  var current = 0;
  var lastFocus = null;

  function updateLabels() {
    btnClose.setAttribute('aria-label', t('Tancar', 'Close', 'Cerrar'));
    btnPrev.setAttribute('aria-label', t('Foto anterior', 'Previous photo', 'Foto anterior'));
    btnNext.setAttribute('aria-label', t('Foto següent', 'Next photo', 'Foto siguiente'));
  }

  function show(index) {
    current = (index + items.length) % items.length;
    var item = items[current];
    var thumb = item.querySelector('img');
    var cap = item.querySelector('.galeria__caption');
    img.classList.add('is-loading');
    img.onload = function () { img.classList.remove('is-loading'); };
    img.src = item.getAttribute('href');
    img.alt = thumb ? thumb.alt : '';
    captionText.textContent = cap ? cap.textContent : '';
    counter.textContent = (current + 1) + ' / ' + items.length;
    // Precarrega la següent foto perquè el pas sigui instantani
    var next = new Image();
    next.src = items[(current + 1) % items.length].getAttribute('href');
  }

  function open(index) {
    lastFocus = document.activeElement;
    updateLabels();
    show(index);
    box.hidden = false;
    btnClose.focus();
    // Força un reflow perquè la transició d'entrada (opacitat) s'apliqui
    void box.offsetWidth;
    box.classList.add('is-open');
    document.body.classList.add('lightbox-open');
  }

  function close() {
    box.classList.remove('is-open');
    document.body.classList.remove('lightbox-open');
    window.setTimeout(function () {
      if (!box.classList.contains('is-open')) box.hidden = true;
    }, 300);
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  items.forEach(function (item, i) {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      open(i);
    });
  });

  btnClose.addEventListener('click', close);
  btnPrev.addEventListener('click', function () { show(current - 1); });
  btnNext.addEventListener('click', function () { show(current + 1); });

  // Clic al fons fosc (fora de la foto) tanca el visor
  box.addEventListener('click', function (e) {
    if (e.target === box || e.target === figure) close();
  });

  document.addEventListener('keydown', function (e) {
    if (!box.classList.contains('is-open')) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowLeft') { show(current - 1); return; }
    if (e.key === 'ArrowRight') { show(current + 1); return; }
    if (e.key === 'Tab') {
      var focusables = [btnClose, btnPrev, btnNext];
      var idx = focusables.indexOf(document.activeElement);
      e.preventDefault();
      var nextIdx = e.shiftKey ? (idx <= 0 ? focusables.length - 1 : idx - 1) : (idx + 1) % focusables.length;
      focusables[nextIdx].focus();
    }
  });

  // Lliscament horitzontal en pantalles tàctils
  var touchX = null;
  box.addEventListener('touchstart', function (e) {
    touchX = e.touches.length === 1 ? e.touches[0].clientX : null;
  }, { passive: true });
  box.addEventListener('touchend', function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
  }, { passive: true });

  // Si es canvia d'idioma amb el visor obert, actualitza textos
  document.addEventListener('rotaract:lang', function () {
    updateLabels();
    if (box.classList.contains('is-open')) show(current);
  });
});
