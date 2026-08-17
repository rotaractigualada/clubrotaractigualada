/* =============================================
   ANALYTICS.JS — Google Analytics 4 (GA4)
   Amb consentiment RGPD:
   - Només carrega el script de Google si l'usuari
     ha acceptat les cookies d'anàlisi (clau
     rotaract-cookie-consent-v3 = "accept").
   - Si ha rebutjat (o encara no ha decidit),
     NO es carrega res: cap sol·licitud a Google.
   ============================================= */
(function () {
  'use strict';

  // ← Posa aquí el teu ID de GA4 (Google Analytics →
  //   Administrador → Fluxos de dades → el teu flux).
  //   Exemple: 'G-AB12CD34EF'. Deixa'l tal qual fins
  //   que el tinguis: el seguiment no s'activarà.
  var MEASUREMENT_ID = 'G-XXXXXXXXXX';

  var CONSENT_KEY = 'rotaract-cookie-consent-v3';

  function hasConsent() {
    try { return localStorage.getItem(CONSENT_KEY) === 'accept'; } catch (e) { return false; }
  }

  function loadGtag() {
    if (document.getElementById('ga4-gtag')) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', MEASUREMENT_ID);

    var s = document.createElement('script');
    s.id = 'ga4-gtag';
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
    document.head.appendChild(s);
  }

  function tryLoad() {
    if (!hasConsent()) return;
    if (MEASUREMENT_ID.indexOf('G-XX') === 0) return; // ID encara pendent: no carregar
    loadGtag();
  }

  // Si l'usuari accepta en aquesta mateixa visita (esdeveniment del bàner)
  window.addEventListener('consent:accepted', tryLoad);

  // Visitants que ja havien acceptat en visites anteriors
  tryLoad();
})();