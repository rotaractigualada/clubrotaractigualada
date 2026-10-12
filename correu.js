/* correu.js — «Escriu-nos»: botons «Copiar» de les adreces de correu.
   No hi ha formulari: cada adreça obre el programa de correu (mailto:)
   i, si qui visita la web no en té, la pot copiar.

   Per tornar al formulari antic (PHP), mira RESTAURAR-FORMULARI.md. */
(function () {
  'use strict';

  var t = function (ca, en, es) {
    var l = document.documentElement.getAttribute('lang');
    return l === 'en' ? en : l === 'es' ? es : ca;
  };

  document.querySelectorAll('.copy-email[data-email]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var email = btn.getAttribute('data-email');
      var original = btn.textContent;
      var done = function () {
        btn.textContent = t('Copiada!', 'Copied!', '¡Copiada!');
        window.setTimeout(function () { btn.textContent = original; }, 2000);
      };
      var ask = function () {
        window.prompt(t('Copia l\'adreça:', 'Copy the address:', 'Copia la dirección:'), email);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(done, ask);
      } else {
        ask();
      }
    });
  });
})();
