/* redireccions.js — Es carrega al <head> de totes les pàgines (abans de
   pintar res) i decideix si cal portar el visitant a una altra adreça:

   1) Còpia antiga de GitHub Pages (*.github.io) → https://rotaractigualada.org,
      mantenint l'idioma, la pàgina i l'àncora.
   2) Idioma: cada versió té la seva adreça (arrel = català, /es/, /en/).
      - Si el visitant ja ha triat un idioma al menú, es respecta sempre.
      - Si no, a la primera visita d'una pàgina en català es fa servir
        l'idioma del navegador (gallec i basc → castellà; altres → anglès).
      - Els cercadors no es redirigeixen mai: indexen cada versió tal com és.
   Les adreces es fan a partir de la carpeta de la pàgina, no de l'arrel del
   servidor: així també funciona si la web s'obre des d'una carpeta de
   l'ordinador (VS Code amb Live Server o fent doble clic a l'arxiu). */
(function () {
  var LANGS = ['ca', 'es', 'en'];
  var loc = window.location;
  var onGithub = /\.github\.io$/i.test(loc.hostname);

  // Carpeta i fitxer de la pàgina (/es/contacte.html → /es/ i contacte.html)
  var dir = loc.pathname.replace(/[^/]*$/, '');
  var file = loc.pathname.slice(dir.length);
  if (!/\.html$/i.test(file)) file = '';
  // Des d'un arxiu de l'ordinador (file://) una carpeta no obre el seu index.html
  if (file === 'index.html' && loc.protocol !== 'file:') file = '';
  var last = dir.split('/').filter(Boolean).pop();
  var folder = (last === 'es' || last === 'en') ? last : 'ca';
  // Arrel de la web: la carpeta de la pàgina sense /es/ o /en/ («/» al servidor)
  var base = folder === 'ca' ? dir : dir.slice(0, -(folder.length + 1));

  function target(lang, origin, root) {
    return origin + root + (lang === 'ca' ? '' : lang + '/') + file + loc.search + loc.hash;
  }

  if (onGithub) {
    window.__rotaractRedirect = true; // analytics.js no compta aquesta pàgina
    loc.replace(target(folder, 'https://rotaractigualada.org', '/'));
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

  if (wanted && wanted !== folder) {
    window.__rotaractRedirect = true; // analytics.js no compta aquesta pàgina
    loc.replace(target(wanted, '', base));
  }
})();
