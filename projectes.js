/* projectes.js — Llegeix projectes.json (activitats del club) per al mapa
   de «On som» i el test «Amb quina àrea de Rotary connectes més?».
   - Una activitat és «feta» quan ja ha passat la data (o la data de fi), o
     si té "estat": "feta". Les que tenen "estat": "cancel·lada" no surten.
   - Retorna els textos en l'idioma de la pàgina.
   Ús: RotaractProjectes.load().then(function (llista) { … }) */
(function () {
  'use strict';

  var script = document.currentScript;
  var DATA = new URL('projectes.json', script ? script.src : window.location.href).href;
  var LOCALES = { ca: 'ca-ES', es: 'es-ES', en: 'en-GB' };
  var cache = null;

  function lang() {
    var l = document.documentElement.getAttribute('lang');
    return l === 'en' || l === 'es' ? l : 'ca';
  }
  function text(v) {
    if (!v) return '';
    return typeof v === 'string' ? v : (v[lang()] || v.ca || '');
  }
  function day(iso) {
    var p = String(iso).split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }

  function load() {
    if (cache) return cache;
    cache = fetch(DATA, { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('projectes.json ' + r.status); return r.json(); })
      .then(function (data) {
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        return (data.activitats || [])
          .filter(function (a) { return a && a.nom && /^\d{4}-\d{2}-\d{2}$/.test(a.data || '') && !/^cancel/i.test(a.estat || ''); })
          .map(function (a) {
            var start = day(a.data);
            var end = a.fi ? day(a.fi) : start;
            return {
              nom: text(a.nom),
              municipi: a.municipi || 'Igualada',
              inici: start,
              fi: end,
              fet: a.estat ? /^fet/i.test(a.estat) : end < today,
              area: a.area || '',
              xifra: text(a.xifra)
            };
          })
          .sort(function (x, y) { return x.inici - y.inici; });
      });
    cache.catch(function () { cache = null; });
    return cache;
  }

  /* Data per mostrar: les fetes amb el dia; les futures, només mes i any */
  function date(p) {
    var opts = p.fet ? { day: 'numeric', month: 'short', year: 'numeric' } : { month: 'long', year: 'numeric' };
    try { return new Intl.DateTimeFormat(LOCALES[lang()], opts).format(p.inici); } catch (e) { return p.inici.toISOString().slice(0, 10); }
  }

  window.RotaractProjectes = { load: load, date: date };
})();
