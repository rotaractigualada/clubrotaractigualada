/* noticies.js — Inici → Notícies.
   Llegeix noticies.json i mostra les últimes notícies (les més noves
   primer) en targetes que avancen soles. S'aturen amb el ratolí, el focus,
   el dit, el botó de pausa o «reduir moviment». Cada notícia s'obre en una
   finestra i té la seva adreça (#noticia-ID) per compartir-la.
   Una notícia surt a partir de la seva data («data») i fins a «fins».
   Sense cap notícia (o si no es pot llegir el fitxer), la secció no surt. */
(function () {
  'use strict';

  var section = document.getElementById('noticies');
  if (!section) return;

  var script = document.currentScript;
  var DATA = new URL('noticies.json', script ? script.src : window.location.href).href;
  var MAX = 8;
  var INTERVAL = 5500;                 // ms entre avanç i avanç
  var PREFIX = '#noticia-';
  var LOCALES = { ca: 'ca-ES', es: 'es-ES', en: 'en-GB' };
  var CATS = {
    club: ['Club', 'Club', 'Club'],
    activitat: ['Activitat', 'Activity', 'Actividad'],
    projecte: ['Projecte', 'Project', 'Proyecto'],
    districte: ['Districte', 'District', 'Distrito'],
    rotary: ['Rotary', 'Rotary', 'Rotary']
  };
  var ICONS = { club: '✨', activitat: '📅', projecte: '💡', districte: '🌍', rotary: '⚙️' };

  var lang = function () {
    var l = document.documentElement.getAttribute('lang');
    return l === 'en' || l === 'es' ? l : 'ca';
  };
  var t = function (ca, en, es) { var l = lang(); return l === 'en' ? en : l === 'es' ? es : ca; };
  var text = function (v) {
    if (!v) return '';
    return typeof v === 'string' ? v : (v[lang()] || v.ca || '');
  };
  var reduce = function () {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var today = function () { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var dateText = function (iso) {
    var p = iso.split('-').map(Number);
    try {
      return new Intl.DateTimeFormat(LOCALES[lang()], { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(p[0], p[1] - 1, p[2]));
    } catch (e) { return iso; }
  };
  var catName = function (c) { var n = CATS[c]; return t(n[0], n[1], n[2]); };

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  // Enllaços: pàgines de la web (relatives, en l'idioma de la pàgina) o adreces https
  function safeLink(url) {
    if (typeof url !== 'string' || !url) return null;
    if (/^https:\/\//i.test(url)) return { href: url, external: true };
    if (/^[\w./-]+(\.html)?(#[\w-]+)?$/.test(url) && url.indexOf('//') < 0) return { href: url, external: false };
    return null;
  }
  // Imatges: sempre des de l'arrel de la web (també a /es/ i /en/)
  var imageUrl = function (path) { return /^[\w./-]+\.(jpe?g|png|webp)$/i.test(path || '') ? new URL(path, DATA).href : null; };

  function isValid(n) {
    return n && typeof n.id === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(n.id) &&
      /^\d{4}-\d{2}-\d{2}$/.test(n.data || '') && CATS[n.categoria] && text(n.titol);
  }
  function isCurrent(n) {
    var d = today();
    return n.data <= d && (!n.fins || !/^\d{4}-\d{2}-\d{2}$/.test(n.fins) || n.fins >= d);
  }

  var track = document.getElementById('newsTrack');
  var dotsBox = document.getElementById('newsDots');
  var controls = document.getElementById('newsControls');
  var btnPrev = controls.querySelector('[data-news="prev"]');
  var btnNext = controls.querySelector('[data-news="next"]');
  var btnPause = controls.querySelector('[data-news="pause"]');
  var modal = document.getElementById('newsModal');
  var news = [];        // notícies que es poden obrir (també les de més enllà de les 8 de la portada)

  function media(n, cls) {
    var box = el('div', cls);
    var src = imageUrl(n.imatge);
    if (src) {
      var img = el('img');
      img.src = src;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      box.appendChild(img);
    } else {
      var icon = el('span', cls + '-icon', typeof n.icona === 'string' && n.icona.trim() ? n.icona.trim() : ICONS[n.categoria]);
      icon.setAttribute('aria-hidden', 'true');
      box.appendChild(icon);
      box.classList.add('is-icon');
    }
    return box;
  }

  function card(n) {
    var li = el('li', 'news-card');
    li.setAttribute('data-cat', n.categoria);
    var m = media(n, 'news-card__media');
    m.appendChild(el('span', 'news-chip news-chip--' + n.categoria, catName(n.categoria)));
    li.appendChild(m);
    var body = el('div', 'news-card__body');
    var time = el('time', 'news-card__date', dateText(n.data));
    time.setAttribute('datetime', n.data);
    body.appendChild(time);
    body.appendChild(el('h3', 'news-card__title', text(n.titol)));
    if (text(n.resum)) body.appendChild(el('p', 'news-card__text', text(n.resum)));
    var more = el('a', 'news-card__more');
    more.href = PREFIX + n.id;
    more.appendChild(el('span', null, t('Llegeix-ne més', 'Read more', 'Leer más')));
    var hidden = el('span', 'visually-hidden', ': ' + text(n.titol));
    more.appendChild(hidden);
    more.insertAdjacentHTML('beforeend', '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>');
    body.appendChild(more);
    li.appendChild(body);
    return li;
  }

  // ── Carrusel ──
  var cards = [];
  var current = 0;
  var userPaused = false;
  var hover = false;
  var focusIn = false;
  var inView = true;
  var touchUntil = 0;
  var timer = null;

  var step = function () {
    if (cards.length < 2) return track.clientWidth;
    return cards[1].offsetLeft - cards[0].offsetLeft;
  };
  var maxIndex = function () {
    var s = step();
    return s > 0 ? Math.max(0, Math.round((track.scrollWidth - track.clientWidth) / s)) : 0;
  };

  function goTo(i, smooth) {
    var max = maxIndex();
    current = i > max ? 0 : i < 0 ? max : i;
    track.scrollTo({ left: current * step(), behavior: smooth === false || reduce() ? 'auto' : 'smooth' });
    paintDots();
  }

  function buildDots() {
    dotsBox.textContent = '';
    var max = maxIndex();
    var scrollable = max > 0;
    controls.hidden = !scrollable;
    dotsBox.hidden = !scrollable;
    btnPause.hidden = !scrollable || reduce();
    if (!scrollable) return;
    for (var i = 0; i <= max; i++) {
      var d = el('button', 'news__dot');
      d.type = 'button';
      d.setAttribute('aria-label', t('Ves a la notícia ', 'Go to news item ', 'Ir a la noticia ') + (i + 1));
      d.addEventListener('click', (function (k) { return function () { goTo(k); }; })(i));
      dotsBox.appendChild(d);
    }
    paintDots();
  }

  function paintDots() {
    var dots = dotsBox.children;
    for (var i = 0; i < dots.length; i++) {
      if (i === current) dots[i].setAttribute('aria-current', 'true');
      else dots[i].removeAttribute('aria-current');
    }
  }

  function paused() {
    return userPaused || hover || focusIn || !inView || document.hidden || reduce() ||
      Date.now() < touchUntil || modal.open;
  }

  function paintPause() {
    btnPause.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
    btnPause.setAttribute('aria-label', userPaused
      ? t('Torna a moure les notícies', 'Resume the news', 'Vuelve a mover las noticias')
      : t('Atura el moviment de les notícies', 'Pause the news', 'Detén el movimiento de las noticias'));
  }

  function startCarousel() {
    btnPrev.setAttribute('aria-label', t('Notícia anterior', 'Previous news item', 'Noticia anterior'));
    btnNext.setAttribute('aria-label', t('Notícia següent', 'Next news item', 'Noticia siguiente'));
    paintPause();
    buildDots();
    btnPrev.addEventListener('click', function () { goTo(current - 1); });
    btnNext.addEventListener('click', function () { goTo(current + 1); });
    btnPause.addEventListener('click', function () { userPaused = !userPaused; paintPause(); });

    var frame = null;
    track.addEventListener('scroll', function () {
      if (frame) return;
      frame = requestAnimationFrame(function () {
        frame = null;
        var s = step();
        if (s > 0) { current = Math.min(Math.round(track.scrollLeft / s), maxIndex()); paintDots(); }
      });
    }, { passive: true });

    section.addEventListener('mouseenter', function () { hover = true; });
    section.addEventListener('mouseleave', function () { hover = false; });
    section.addEventListener('focusin', function () { focusIn = true; });
    section.addEventListener('focusout', function (e) { if (!section.contains(e.relatedTarget)) focusIn = false; });
    track.addEventListener('touchstart', function () { touchUntil = Date.now() + 10000; }, { passive: true });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { inView = entries[0].isIntersecting; }, { threshold: 0.35 }).observe(track);
    }
    var resizeT = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeT);
      resizeT = setTimeout(function () { buildDots(); goTo(Math.min(current, maxIndex()), false); }, 150);
    });
    timer = setInterval(function () {
      if (!paused() && maxIndex() > 0) goTo(current >= maxIndex() ? 0 : current + 1);
    }, INTERVAL);
  }

  // ── Finestra de la notícia ──
  var lastFocus = null;
  var openId = null;

  function openNews(id) {
    var n = news.filter(function (x) { return x.id === id; })[0];
    if (!n) return false;
    openId = id;
    var box = document.getElementById('newsModalMedia');
    box.textContent = '';
    box.className = 'news-modal__media';
    var m = media(n, 'news-modal__media');
    while (m.firstChild) box.appendChild(m.firstChild);
    if (m.classList.contains('is-icon')) box.classList.add('is-icon');
    var cat = document.getElementById('newsModalCat');
    cat.className = 'news-chip news-chip--' + n.categoria;
    cat.textContent = catName(n.categoria);
    var date = document.getElementById('newsModalDate');
    date.textContent = dateText(n.data);
    date.setAttribute('datetime', n.data);
    document.getElementById('newsModalTitle').textContent = text(n.titol);
    var body = document.getElementById('newsModalText');
    body.textContent = '';
    (text(n.text) || text(n.resum)).split(/\n\s*\n/).forEach(function (para) {
      if (para.trim()) body.appendChild(el('p', null, para.trim()));
    });
    var a = document.getElementById('newsModalLink');
    var link = n.enllac && safeLink(n.enllac.url);
    if (link && text(n.enllac.text)) {
      a.href = link.href;
      a.textContent = text(n.enllac.text) + (link.external ? ' ↗' : ' →');
      if (link.external) { a.target = '_blank'; a.rel = 'noopener noreferrer'; } else { a.removeAttribute('target'); a.removeAttribute('rel'); }
      a.hidden = false;
    } else {
      a.hidden = true;
    }
    if (!modal.open) {
      lastFocus = document.activeElement;
      if (typeof modal.showModal === 'function') modal.showModal(); else modal.setAttribute('open', '');
      document.documentElement.classList.add('news-open');
    }
    modal.scrollTop = 0;
    return true;
  }

  function closeNews() {
    if (!modal.open) return;
    if (typeof modal.close === 'function') modal.close(); else { modal.removeAttribute('open'); onClosed(); }
  }

  function onClosed() {
    document.documentElement.classList.remove('news-open');
    if (window.location.hash === PREFIX + openId && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    var back = openId && track.querySelector('a[href="' + PREFIX + openId + '"]');
    openId = null;
    if (back) back.focus({ preventScroll: true });
    else if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  modal.addEventListener('close', onClosed);
  modal.querySelector('[data-news="close"]').addEventListener('click', closeNews);
  modal.querySelector('[data-news="close"]').setAttribute('aria-label', t('Tanca la notícia', 'Close the news item', 'Cierra la noticia'));
  modal.addEventListener('click', function (e) { if (e.target === modal) closeNews(); });   // clic fora del requadre

  function fromHash() {
    var h = window.location.hash;
    if (h.indexOf(PREFIX) === 0) {
      if (!openNews(decodeURIComponent(h.slice(PREFIX.length)))) closeNews();
    } else {
      closeNews();
    }
  }

  fetch(DATA, { credentials: 'same-origin' })
    .then(function (r) { if (!r.ok) throw new Error('noticies.json ' + r.status); return r.json(); })
    .then(function (data) {
      news = (Array.isArray(data.noticies) ? data.noticies : []).filter(isValid).filter(isCurrent)
        .sort(function (a, b) { return a.data < b.data ? 1 : a.data > b.data ? -1 : 0; });
      if (!news.length) return;
      news.slice(0, MAX).forEach(function (n) { cards.push(track.appendChild(card(n))); });
      section.hidden = false;
      startCarousel();
      window.addEventListener('hashchange', fromHash);
      fromHash();
    })
    .catch(function () { /* sense notícies: la secció es queda amagada */ });
})();
