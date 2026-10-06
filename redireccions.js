/* redireccions.js — Es carrega al <head> de totes les pàgines (abans de
   pintar res) i decideix si cal portar el visitant a una altra adreça:

   1) Còpia antiga de GitHub Pages (*.github.io) → https://rotaractigualada.org,
      mantenint l'idioma, la pàgina i l'àncora.
   2) Idioma: cada versió té la seva adreça (arrel = català, /es/, /en/).
      - Si el visitant ja ha triat un idioma al menú, es respecta sempre.
      - Si no, a la primera visita d'una pàgina en català es fa servir
        l'idioma del navegador (gallec i basc → castellà; altres → anglès).
      - Els cercadors no es redirigeixen mai: indexen cada versió tal com és. */
(function () {
  var LANGS = ['ca', 'es', 'en'];
  var loc = window.location;
  var parts = loc.pathname.split('/').filter(Boolean);
  var onGithub = /\.github\.io$/i.test(loc.hostname);
  if (onGithub) parts.shift(); // treu el nom del repositori del camí

  var folder = (parts[0] === 'es' || parts[0] === 'en') ? parts[0] : 'ca';
  var file = parts.length && /\.html$/i.test(parts[parts.length - 1]) ? parts[parts.length - 1] : '';
  if (file === 'index.html') file = '';

  function target(lang, origin) {
    return origin + (lang === 'ca' ? '/' : '/' + lang + '/') + file + loc.search + loc.hash;
  }

  if (onGithub) {
    loc.replace(target(folder, 'https://rotaractigualada.org'));
    return;
  }

  if (/bot|crawl|spider|slurp|lighthouse|facebookexternalhit|whatsapp|preview/i.test(navigator.userAgent || '')) return;

  var saved = null;
  try { saved = localStorage.getItem('rotaract-lang'); } catch (e) { /* sense localStorage */ }

  var wanted = null;
  if (saved && LANGS.indexOf(saved) !== -1) {
    wanted = saved;
  } else if (folder === 'ca') {
    var prefs = (navigator.languages && navigator.languages.length)
      ? navigator.languages
      : [navigator.language || ''];
    var map = { ca: 'ca', es: 'es', gl: 'es', eu: 'es', en: 'en' };
    wanted = 'en';
    for (var i = 0; i < prefs.length; i++) {
      var code = String(prefs[i] || '').toLowerCase().split('-')[0];
      if (map[code]) { wanted = map[code]; break; }
    }
  }

  if (wanted && wanted !== folder) loc.replace(target(wanted, ''));
})();
