/* =============================================
   ANALYTICS.JS — Estadístiques de visites amb GoatCounter, sense cookies
   - No desa res al dispositiu (ni cookies ni emmagatzematge local) i no carrega
     cap script extern: envia una petició petita, com una imatge d'1×1,
     amb la pàgina, el títol, d'on ve el visitant i la mida de la pantalla.
   - GoatCounter no desa l'adreça IP (vegeu la política de privacitat).
   - Només compta a rotaractigualada.org: ni en local, ni als tests, ni a
     còpies de la web.
   - No compta qui té activat «no em segueixis» (Global Privacy Control o
     Do Not Track), ni navegadors automàtics, ni la pàgina que es redirigeix
     a un altre idioma (es compta la de destinació).
   Panell d'estadístiques: https://rotaractigualada.goatcounter.com
   ============================================= */
(function () {
  'use strict';

  var ENDPOINT = 'https://rotaractigualada.goatcounter.com/count';
  var HOSTS = ['rotaractigualada.org', 'www.rotaractigualada.org'];

  var nav = window.navigator;
  if (HOSTS.indexOf(window.location.hostname) === -1) return;
  if (window.__rotaractRedirect) return; // redireccions.js ja porta a una altra adreça
  if (nav.webdriver) return;
  if (nav.globalPrivacyControl || nav.doNotTrack === '1' || window.doNotTrack === '1') return;

  function send() {
    // La mateixa pàgina compta igual amb «/» que amb «/index.html»
    var path = window.location.pathname.replace(/index\.html$/, '') || '/';
    // Només interessa d'on ve el visitant, no la navegació dins de la web
    var ref = '';
    try {
      if (document.referrer && new URL(document.referrer).hostname !== window.location.hostname) ref = document.referrer;
    } catch (e) { /* referent no vàlid */ }
    var params = {
      p: path,
      t: document.title,
      r: ref,
      s: [window.screen.width, window.screen.height, window.devicePixelRatio || 1].join(','),
      rnd: Math.random().toString(36).slice(2)
    };
    var query = Object.keys(params).map(function (k) {
      return k + '=' + encodeURIComponent(params[k]);
    }).join('&');
    new Image().src = ENDPOINT + '?' + query;
  }

  // Les pàgines precarregades pel navegador només compten quan es mostren
  if (document.visibilityState === 'prerender') {
    document.addEventListener('visibilitychange', function onShow() {
      if (document.visibilityState !== 'visible') return;
      document.removeEventListener('visibilitychange', onShow);
      send();
    });
  } else {
    send();
  }
})();
