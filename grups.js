/* grups.js — Activitats → Grups de treball.
   Llegeix grups.json: posa «Grup actiu» i el referent a la targeta de cada
   àrea que ja té grup, i mostra els projectes dels grups amb la barra de
   donacions (recaptat respecte a l'objectiu). Mentre no hi ha cap projecte,
   es veu el missatge «Els grups s'estan formant». */
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

  // La barra s'omple quan es veu (la pestanya pot estar amagada en carregar)
  function grow(fill, pct) {
    var go = function () { fill.style.width = pct + '%'; };
    if (reduce() || !('IntersectionObserver' in window)) return go();
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); requestAnimationFrame(go); }
    }, { threshold: 0.3 });
    io.observe(fill.parentNode);
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

  function projectCard(p) {
    var card = el('article', 'grups-projecte');
    var area = areaEl(p.area);
    var tag = el('span', 'grups-projecte__area');
    var emoji = el('span', null, area.querySelector('.grups-area__emoji').textContent);
    emoji.setAttribute('aria-hidden', 'true');
    tag.appendChild(emoji);
    tag.appendChild(document.createTextNode(' ' + area.querySelector('.grups-area__nom').textContent.trim()));
    card.appendChild(tag);
    card.appendChild(el('h4', 'grups-projecte__nom', text(p.nom)));
    if (text(p.descripcio)) card.appendChild(el('p', 'grups-projecte__desc', text(p.descripcio)));

    var objectiu = amount(p.objectiu);
    if (objectiu) {
      var recaptat = amount(p.recaptat);
      var pct = Math.round(recaptat / objectiu * 100);
      var shown = Math.min(pct, 100);
      var fons = el('div', 'grups-fons');
      var xifres = el('div', 'grups-fons__xifres');
      xifres.appendChild(el('span', 'grups-fons__pct', pct + '%'));
      xifres.appendChild(el('span', 'grups-fons__import', t(
        euros(recaptat) + ' de ' + euros(objectiu),
        euros(recaptat) + ' of ' + euros(objectiu),
        euros(recaptat) + ' de ' + euros(objectiu)
      )));
      fons.appendChild(xifres);
      var bar = el('div', 'grups-barra');
      bar.setAttribute('role', 'progressbar');
      bar.setAttribute('aria-label', t('Donacions recaptades', 'Donations raised', 'Donaciones recaudadas'));
      bar.setAttribute('aria-valuemin', '0');
      bar.setAttribute('aria-valuemax', '100');
      bar.setAttribute('aria-valuenow', String(shown));
      bar.setAttribute('aria-valuetext', pct + '% · ' + xifres.lastChild.textContent);
      var fill = el('span', 'grups-barra__fill');
      fill.setAttribute('aria-hidden', 'true');
      bar.appendChild(fill);
      fons.appendChild(bar);
      if (pct >= 100) fons.appendChild(el('p', 'grups-fons__fet', t('Objectiu aconseguit! Gràcies a tothom 💙', 'Goal reached! Thank you all 💙', '¡Objetivo conseguido! Gracias a todos 💙')));
      card.appendChild(fons);
      grow(fill, shown);
    } else {
      card.appendChild(el('p', 'grups-projecte__prep', t('Projecte en preparació', 'Project in preparation', 'Proyecto en preparación')));
    }

    var btn = el('a', 'grups-projecte__btn', t('Vull col·laborar', 'I want to help', 'Quiero colaborar'));
    btn.href = 'contacte.html#escriu-nos';
    card.appendChild(btn);
    return card;
  }

  function showProjects(projectes) {
    var list = projectes.filter(function (p) { return p && text(p.nom) && AREES.indexOf(p.area) >= 0; });
    if (!list.length) return;
    var box = document.getElementById('grupsProjectes');
    box.textContent = '';
    list.forEach(function (p) { box.appendChild(projectCard(p)); });
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
