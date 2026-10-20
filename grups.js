/* grups.js — Activitats → Grups de treball.
   Llegeix grups.json: posa «Grup actiu» i el referent a la targeta de cada
   àrea que ja té grup, i mostra els projectes dels grups amb la barra de
   donacions (recaptat respecte a l'objectiu). Mentre no hi ha cap projecte,
   es veu el missatge «Els grups s'estan formant». Les targetes de les àrees
   entren una darrere l'altra quan es veuen (no amb «reduir moviment»). */
(function () {
  'use strict';

  var root = document.getElementById('grups');
  if (!root) return;

  var script = document.currentScript;
  var DATA = new URL('grups.json', script ? script.src : window.location.href).href;
  var AREES = ['pau', 'malalties', 'aigua', 'maternoinfantil', 'educacio', 'economia', 'medi'];
  var LOCALES = { ca: 'ca-ES', es: 'es-ES', en: 'en-GB' };

  var lang = function () {
    var l = document.documentElement.getAttribute('lang');
    return l === 'en' || l === 'es' ? l : 'ca';
  };
  var t = function (ca, en, es) { var l = lang(); return l === 'en' ? en : l === 'es' ? es : ca; };
  var text = function (v) {
    if (!v) return '';
    return typeof v === 'string' ? v : (v[lang()] || v.ca || '');
  };
  var amount = function (v) { var n = Number(v); return isFinite(n) && n > 0 ? n : 0; };
  var euros = function (n) {
    try {
      return new Intl.NumberFormat(LOCALES[lang()], { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
    } catch (e) { return Math.round(n) + ' €'; }
  };
  var reduce = function () {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  };
  var areaEl = function (a) { return root.querySelector('.grups-area[data-area="' + a + '"]'); };

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  // Crida go() quan l'element es veu (la pestanya pot estar amagada en carregar)
  function whenSeen(node, go, threshold) {
    if (reduce() || !('IntersectionObserver' in window)) return go();
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); requestAnimationFrame(go); }
    }, { threshold: threshold });
    io.observe(node);
  }

  // Les àrees entren una darrere l'altra
  var arees = document.getElementById('grupsArees');
  if (arees && !reduce() && 'IntersectionObserver' in window) {
    Array.prototype.forEach.call(arees.children, function (li, i) { li.style.setProperty('--i', i); });
    arees.classList.add('grups-arees--anim');
    whenSeen(arees, function () { arees.classList.add('is-in'); }, 0.15);
  }

  var SVG = 'http://www.w3.org/2000/svg';
  var fine = function () {
    return !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  };
  var importText = function (r, o) { return euros(r) + t(' de ', ' of ', ' de ') + euros(o); };

  // La barra i l'anell s'omplen, i el percentatge i els euros compten fins
  // al valor (1,6 s, com les transicions del CSS)
  function grow(f) {
    var count = !reduce() && 'IntersectionObserver' in window;
    var paint = function (k) {
      f.pcts.forEach(function (n) { n.textContent = Math.round(f.pct * k) + '%'; });
      f.imp.textContent = importText(f.recaptat * k, f.objectiu);
    };
    paint(count ? 0 : 1);
    whenSeen(f.fill.parentNode, function () {
      f.fill.style.width = f.shown + '%';
      if (f.ring) f.ring.style.strokeDashoffset = String(100 - f.shown);
      if (!count) return;
      var start = null;
      var step = function (now) {
        if (start === null) start = now;
        var k = Math.min((now - start) / 1600, 1);
        paint(1 - Math.pow(1 - k, 3));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, 0.3);
  }

  function showGroups(grups) {
    grups.forEach(function (g) {
      if (!g || AREES.indexOf(g.area) < 0) return;
      var card = areaEl(g.area);
      var slot = card.querySelector('[data-grup]');
      slot.textContent = '';
      slot.appendChild(el('span', 'grups-area__badge', t('Grup actiu', 'Active group', 'Grupo activo')));
      if (g.referent) slot.appendChild(el('span', 'grups-area__referent', t('Referent: ', 'Lead: ', 'Referente: ') + g.referent));
      slot.hidden = false;
      card.classList.add('grups-area--actiu');
    });
  }

  // Escena 3D del projecte: la icona i els detalls suren a diferents
  // profunditats, i amb el ratolí l'escena s'inclina (només decorativa)
  function scene(p, area, shown) {
    var vis = el('div', 'grups-projecte__visual');
    vis.setAttribute('aria-hidden', 'true');
    var esc = el('div', 'grups-escena');
    var cos = el('div', 'grups-escena__cos');
    var areaEmoji = area.querySelector('.grups-area__emoji').textContent;
    var icona = typeof p.icona === 'string' && p.icona.trim() ? p.icona.trim() : areaEmoji;
    cos.appendChild(el('span', 'grups-escena__fons'));
    cos.appendChild(el('span', 'grups-escena__anell'));
    cos.appendChild(el('span', 'grups-escena__icona', icona));
    [icona === areaEmoji ? '⭐' : areaEmoji, '✨', '💙'].forEach(function (e, i) {
      cos.appendChild(el('span', 'grups-escena__bit grups-escena__bit--' + (i + 1), e));
    });
    var ring = null;
    var pct = null;
    if (shown != null) {
      var donut = el('span', 'grups-escena__donut');
      var svg = document.createElementNS(SVG, 'svg');
      svg.setAttribute('viewBox', '0 0 100 100');
      ['grups-escena__pista', 'grups-escena__progres'].forEach(function (cls) {
        var c = document.createElementNS(SVG, 'circle');
        c.setAttribute('class', cls);
        c.setAttribute('cx', '50');
        c.setAttribute('cy', '50');
        c.setAttribute('r', '42');
        c.setAttribute('pathLength', '100');
        svg.appendChild(c);
      });
      ring = svg.lastChild;
      donut.appendChild(svg);
      pct = el('span', 'grups-escena__pct');
      donut.appendChild(pct);
      cos.appendChild(donut);
    }
    cos.appendChild(el('span', 'grups-escena__llum'));
    esc.appendChild(cos);
    vis.appendChild(esc);

    if (fine() && !reduce()) {
      var frame = null;
      vis.addEventListener('pointermove', function (e) {
        if (frame) return;
        frame = requestAnimationFrame(function () {
          frame = null;
          var r = vis.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width;
          var y = (e.clientY - r.top) / r.height;
          esc.style.setProperty('--ry', ((x - 0.5) * 26).toFixed(2) + 'deg');
          esc.style.setProperty('--rx', ((0.5 - y) * 26).toFixed(2) + 'deg');
          esc.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
          esc.style.setProperty('--my', (y * 100).toFixed(1) + '%');
          esc.classList.add('is-tilt');
        });
      });
      vis.addEventListener('pointerleave', function () {
        if (frame) { cancelAnimationFrame(frame); frame = null; }
        esc.classList.remove('is-tilt');
        esc.style.setProperty('--rx', '0deg');
        esc.style.setProperty('--ry', '0deg');
      });
    }
    return { node: vis, ring: ring, pct: pct };
  }

  function projectCard(p, i) {
    var card = el('article', 'grups-projecte' + (i % 2 ? ' grups-projecte--reverse' : ''));
    card.setAttribute('data-area', p.area);
    var area = areaEl(p.area);
    var info = el('div', 'grups-projecte__text');
    var tags = el('div', 'grups-projecte__tags');
    var tag = el('span', 'grups-projecte__area');
    var emoji = el('span', null, area.querySelector('.grups-area__emoji').textContent);
    emoji.setAttribute('aria-hidden', 'true');
    tag.appendChild(emoji);
    tag.appendChild(document.createTextNode(' ' + area.querySelector('.grups-area__nom').textContent.trim()));
    tags.appendChild(tag);
    if (p.exemple === true) tags.appendChild(el('span', 'grups-projecte__exemple', t('Exemple', 'Example', 'Ejemplo')));
    info.appendChild(tags);
    info.appendChild(el('h4', 'grups-projecte__nom', text(p.nom)));
    info.appendChild(el('span', 'grups-projecte__divider'));
    if (text(p.descripcio)) info.appendChild(el('p', 'grups-projecte__desc', text(p.descripcio)));

    var objectiu = amount(p.objectiu);
    var vis;
    if (objectiu) {
      var recaptat = amount(p.recaptat);
      var pct = Math.round(recaptat / objectiu * 100);
      var shown = Math.min(pct, 100);
      vis = scene(p, area, shown);
      var fons = el('div', 'grups-fons');
      var xifres = el('div', 'grups-fons__xifres');
      var pctEl = el('span', 'grups-fons__pct', pct + '%');
      var imp = el('span', 'grups-fons__import', importText(recaptat, objectiu));
      xifres.appendChild(pctEl);
      xifres.appendChild(imp);
      fons.appendChild(xifres);
      var bar = el('div', 'grups-barra');
      bar.setAttribute('role', 'progressbar');
      bar.setAttribute('aria-label', t('Donacions recaptades', 'Donations raised', 'Donaciones recaudadas'));
      bar.setAttribute('aria-valuemin', '0');
      bar.setAttribute('aria-valuemax', '100');
      bar.setAttribute('aria-valuenow', String(shown));
      bar.setAttribute('aria-valuetext', pct + '% · ' + imp.textContent);
      var fill = el('span', 'grups-barra__fill');
      fill.setAttribute('aria-hidden', 'true');
      fill.appendChild(el('span', 'grups-barra__punta'));
      bar.appendChild(fill);
      fons.appendChild(bar);
      if (pct >= 100) {
        fons.appendChild(el('p', 'grups-fons__fet', t('Objectiu aconseguit! Gràcies a tothom 💙', 'Goal reached! Thank you all 💙', '¡Objetivo conseguido! Gracias a todos 💙')));
      } else {
        var falten = euros(objectiu - recaptat);
        fons.appendChild(el('p', 'grups-fons__falten', t(
          'Falten ' + falten + ' per arribar a l\'objectiu',
          falten + ' to go to reach the goal',
          'Faltan ' + falten + ' para llegar al objetivo'
        )));
      }
      info.appendChild(fons);
      grow({ fill: fill, ring: vis.ring, pcts: [pctEl, vis.pct], imp: imp, pct: pct, shown: shown, recaptat: recaptat, objectiu: objectiu });
    } else {
      vis = scene(p, area, null);
      info.appendChild(el('p', 'grups-projecte__prep', t('Projecte en preparació', 'Project in preparation', 'Proyecto en preparación')));
    }

    var btn = el('a', 'grups-projecte__btn');
    btn.href = 'contacte.html#escriu-nos';
    btn.appendChild(el('span', null, t('Vull col·laborar', 'I want to help', 'Quiero colaborar')));
    var arrow = document.createElementNS(SVG, 'svg');
    arrow.setAttribute('viewBox', '0 0 24 24');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.setAttribute('focusable', 'false');
    arrow.innerHTML = '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>';
    btn.appendChild(arrow);
    info.appendChild(btn);

    card.appendChild(info);
    card.appendChild(vis.node);
    // Entrada com als blocs de Nosaltres: el text i l'escena arriben dels costats
    if (!reduce() && 'IntersectionObserver' in window) {
      card.classList.add('grups-projecte--anim');
      whenSeen(card, function () { card.classList.add('is-in'); }, 0.2);
    }
    return card;
  }

  function showProjects(projectes) {
    var list = projectes.filter(function (p) { return p && text(p.nom) && AREES.indexOf(p.area) >= 0; });
    if (!list.length) return;
    var box = document.getElementById('grupsProjectes');
    box.textContent = '';
    list.forEach(function (p, i) { box.appendChild(projectCard(p, i)); });
    box.hidden = false;
    document.getElementById('grupsBuit').hidden = true;
  }

  fetch(DATA, { credentials: 'same-origin' })
    .then(function (r) { if (!r.ok) throw new Error('grups.json ' + r.status); return r.json(); })
    .then(function (data) {
      showGroups(Array.isArray(data.grups) ? data.grups : []);
      showProjects(Array.isArray(data.projectes) ? data.projectes : []);
    })
    .catch(function () { /* es queda el missatge «Els grups s'estan formant» */ });
})();
