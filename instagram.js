/* instagram.js — Portada, secció Instagram.
   Si el servidor té l'Instagram automàtic activat (instagram-feed.php, vegeu
   el README), hi posa les últimes publicacions i el nombre de publicacions i
   seguidors. Les imatges es serveixen des de la mateixa web (instagram/auto/):
   el visitant no es connecta a Instagram fins que no clica un enllaç.
   Si no està activat o falla, es queden les targetes fixes de l'HTML. */
(function () {
  'use strict';

  var grid = document.querySelector('[data-ig="grid"]');
  if (!grid || !window.fetch) return;

  var script = document.currentScript;
  var base = script ? script.src : window.location.href;
  var FEED = new URL('instagram-feed.php', base).href;
  var LOCALES = { ca: 'ca-ES', es: 'es-ES', en: 'en-GB' };

  var lang = function () {
    var l = document.documentElement.getAttribute('lang');
    return l === 'en' || l === 'es' ? l : 'ca';
  };
  var t = function (ca, en, es) { var l = lang(); return l === 'en' ? en : l === 'es' ? es : ca; };

  // «avui», «fa 3 dies» o la data (16 d'oct. del 2026)
  function when(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    var days = Math.floor((Date.now() - d.getTime()) / 86400000);
    try {
      if (days >= 0 && days < 7) {
        return new Intl.RelativeTimeFormat(LOCALES[lang()], { numeric: 'auto' }).format(-days, 'day');
      }
      return new Intl.DateTimeFormat(LOCALES[lang()], { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
    } catch (e) {
      return iso.slice(0, 10);
    }
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function post(p) {
    if (!/^https:\/\/www\.instagram\.com\/[\w./-]+$/.test(p.url || '') || !/^instagram\/auto\/\d+\.jpg$/.test(p.img || '')) return null;
    var a = el('a', 'ig-post');
    a.href = p.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    if (p.type === 'carrusel' || p.type === 'video') a.setAttribute('data-tipus', p.type);
    var media = el('span', 'ig-post__media');
    var img = el('img');
    img.src = new URL(p.img, base).href;
    img.width = 640;
    img.height = 640;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = p.caption || t('Publicació de @rotaractigualada a Instagram', 'Post by @rotaractigualada on Instagram', 'Publicación de @rotaractigualada en Instagram');
    media.appendChild(img);
    var overlay = el('span', 'ig-post__overlay');
    if (p.caption) overlay.appendChild(el('span', 'ig-post__caption', p.caption));
    var date = when(p.date || '');
    if (date) {
      var time = el('time', 'ig-post__date', date);
      time.dateTime = p.date;
      overlay.appendChild(time);
    }
    overlay.appendChild(el('span', 'ig-post__more', t('Veure a Instagram', 'View on Instagram', 'Ver en Instagram')));
    a.appendChild(media);
    a.appendChild(overlay);
    return a;
  }

  function stats(profile) {
    var box = document.querySelector('[data-ig="stats"]');
    if (!box || !profile) return;
    var fmt = function (n) {
      try { return new Intl.NumberFormat(LOCALES[lang()]).format(n); } catch (e) { return String(n); }
    };
    var any = false;
    [['posts', profile.posts], ['followers', profile.followers]].forEach(function (s) {
      if (typeof s[1] !== 'number' || s[1] < 0) return;
      box.querySelector('[data-ig="' + s[0] + '"]').textContent = fmt(s[1]);
      box.querySelector('[data-ig="' + s[0] + '-wrap"]').hidden = false;
      any = true;
    });
    box.hidden = !any;
  }

  fetch(FEED, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
    .then(function (r) { return r.status === 200 ? r.json() : null; })
    .then(function (data) {
      if (!data || !Array.isArray(data.posts)) return;
      var nodes = data.posts.slice(0, 6).map(post).filter(Boolean);
      if (!nodes.length) return;
      grid.textContent = '';
      nodes.forEach(function (n) { grid.appendChild(n); });
      grid.setAttribute('data-ig-auto', '');
      stats(data.profile);
    })
    .catch(function () { /* es queden les publicacions de l'HTML */ });
})();
