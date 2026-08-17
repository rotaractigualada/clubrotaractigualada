/* =============================================
   COOKIE-BANNER.JS — Rotaract Igualada
   Avís d'emmagatzematge local (RGPD / ePrivacy):
   - El lloc NO utilitza cookies: només localStorage
     per recordar la preferència d'idioma.
   - Es mostra l'avís en entrar a la pàgina fins
     que l'usuari accepta o rebutja; la decisió es
     desa a localStorage (rotaract-cookie-consent)
     i no es torna a mostrar.
   S'ha de carregar ABANS que i18n.js perquè el
   banner injectat es tradueixi automàticament.
   ============================================= */
(function () {
  'use strict';

  // Clau versionada: si ja existia la decisió del bàner
  // anterior (mateixa clau), el nou bàner es torna a mostrar.
  var STORAGE_KEY = 'rotaract-cookie-consent-v3';

  function getConsent() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function setConsent(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch (e) { /* sense persistència: no passa res greu */ }
  }

  /* Plantilla fixa i de confiança (contingut propi, sense entrada d'usuari) */
  var BANNER_HTML =
    '<div class="cookie-backdrop"></div>' +
    '<div id="cookieBanner" class="cookie-banner" role="dialog" aria-modal="true" aria-label="Cookie notice / Avís de cookies / Aviso de cookies">' +
      '<div class="cookie-banner__inner">' +
        '<p>' +
          '<span data-en="This website only uses technical storage to remember your language. If you accept, we use Google analytics cookies to understand how the website is used.">Aquest lloc web només fa servir emmagatzematge tècnic per recordar el teu idioma. Si acceptes, utilitzarem cookies d\'anàlisi de Google per entendre com es visita la web.</span> ' +
          '<a href="#" class="open-politica-cookies" data-en="Cookie policy">Política de cookies</a>' +
        '</p>' +
        '<div class="cookie-banner__actions">' +
          '<button type="button" class="cookie-banner__btn cookie-banner__btn--accept" data-cookie-action="accept"><span data-en="Accept">Acceptar</span></button>' +
          '<button type="button" class="cookie-banner__btn cookie-banner__btn--reject" data-cookie-action="reject"><span data-en="Reject">Rebutjar</span></button>' +
        '</div>' +
      '</div>' +
    '</div>';

  function hideBanner() {
    var banner = document.getElementById('cookieBanner');
    if (banner) banner.parentNode.removeChild(banner);
    var backdrop = document.querySelector('.cookie-backdrop');
    if (backdrop) backdrop.parentNode.removeChild(backdrop);
    document.body.classList.remove('cookie-open');
  }

  function showBanner() {
    var wrap = document.createElement('div');
    wrap.innerHTML = BANNER_HTML;
    var backdrop = wrap.firstElementChild;
    var banner = backdrop.nextElementSibling;

    banner.querySelectorAll('[data-cookie-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setConsent(btn.getAttribute('data-cookie-action'));
        if (btn.getAttribute('data-cookie-action') === 'accept') {
          window.dispatchEvent(new CustomEvent('consent:accepted'));
        }
        hideBanner();
      });
    });

    document.body.classList.add('cookie-open');
    document.body.appendChild(backdrop);
    document.body.appendChild(banner);
    var accept = banner.querySelector('.cookie-banner__btn--accept');
    if (accept) accept.focus();
  }

  // Tancar amb Escape (equival a rebutjar)
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var banner = document.getElementById('cookieBanner');
      if (banner) {
        setConsent('rejected');
        hideBanner();
      }
    }
  });

  function init() {
    if (!getConsent()) {
      showBanner();
    }
  }

  init();
})();