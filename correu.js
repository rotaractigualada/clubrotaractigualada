/* correu.js — «Escriu-nos»: prepara un correu (mailto:) amb la persona
   destinatària, el motiu i el missatge triats. No hi ha formulari ni
   servidor: s'obre el programa de correu de qui visita la web, i si no
   en té, pot copiar l'adreça o obrir-lo amb Gmail.

   Per tornar al formulari antic (PHP), mira RESTAURAR-FORMULARI.md. */
(function () {
  'use strict';

  var composer = document.getElementById('escriu-nos');
  if (!composer) return;

  var MAX_CHARS = 500;
  var DEFAULT_EMAIL = 'ayuda@rotaractigualada.org';

  var t = function (ca, en, es) {
    var l = document.documentElement.getAttribute('lang');
    return l === 'en' ? en : l === 'es' ? es : ca;
  };

  // Assumpte del correu segons el motiu triat
  var SUBJECTS = {
    dubte:    function () { return t('Un dubte', 'A question', 'Una duda'); },
    proposta: function () { return t('Una proposta', 'A proposal', 'Una propuesta'); },
    unir:     function () { return t('Vull unir-me al club', 'I want to join the club', 'Quiero unirme al club'); },
    altre:    function () { return t('Consulta', 'Enquiry', 'Consulta'); }
  };

  var mailLink = document.getElementById('mailLink');
  var gmailLink = document.getElementById('gmailLink');
  var display = document.getElementById('recipientEmailDisplay');
  var message = document.getElementById('contactMessage');
  var charCount = document.getElementById('charCount');
  var copyBtn = document.getElementById('copyEmail');

  function checked(name) {
    return composer.querySelector('input[name="' + name + '"]:checked');
  }

  function currentEmail() {
    var to = checked('to');
    return (to && to.getAttribute('data-email')) || DEFAULT_EMAIL;
  }

  function update() {
    var email = currentEmail();
    var motiu = checked('motiu');
    var subject = 'Rotaract Igualada · ' + (motiu && SUBJECTS[motiu.value]
      ? SUBJECTS[motiu.value]()
      : t('Contacte des de la web', 'Contact from the website', 'Contacto desde la web'));
    var body = message ? message.value.trim() : '';

    var query = '?subject=' + encodeURIComponent(subject) +
      (body ? '&body=' + encodeURIComponent(body) : '');
    if (mailLink) mailLink.href = 'mailto:' + email + query;
    if (gmailLink) {
      gmailLink.href = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(email) +
        '&su=' + encodeURIComponent(subject) + (body ? '&body=' + encodeURIComponent(body) : '');
    }
    if (display) display.textContent = email;
    // Amb el motiu «Vull unir-me», recordem que hi ha el formulari d'inscripció
    var joinHint = document.getElementById('joinHint');
    if (joinHint) joinHint.hidden = !(motiu && motiu.value === 'unir');
    if (message && charCount) {
      var len = message.value.length;
      charCount.textContent = len + ' / ' + MAX_CHARS + ' ' + t('caràcters', 'characters', 'caracteres');
      charCount.style.color = len > MAX_CHARS * 0.9 ? 'var(--pink)' : '';
    }
  }

  // ── Pestanyes: «Escriu-nos» i «Uneix-te» (formulari d'inscripció) ──
  var tabs = Array.prototype.slice.call(composer.querySelectorAll('[role="tab"]'));
  function selectTab(tab, focus) {
    tabs.forEach(function (other) {
      var on = other === tab;
      other.setAttribute('aria-selected', on ? 'true' : 'false');
      other.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(other.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab); });
    tab.addEventListener('keydown', function (e) {
      var next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null;
      if (next === null) return;
      e.preventDefault();
      selectTab(tabs[(next + tabs.length) % tabs.length], true);
    });
  });

  // «Abans tens dubtes? Escriu-nos» torna al correu amb el motiu «Vull unir-me»
  var joinAsk = document.getElementById('joinAsk');
  if (joinAsk) {
    joinAsk.addEventListener('click', function () {
      var unir = composer.querySelector('input[name="motiu"][value="unir"]');
      if (unir) unir.checked = true;
      selectTab(document.getElementById('tab-correu'));
      update();
      if (message) message.focus();
    });
  }

  composer.addEventListener('change', update);
  composer.addEventListener('input', update);
  // i18n.js reescriu alguns textos en canviar d'idioma: ho tornem a calcular
  document.addEventListener('rotaract:lang', update);

  // ── Copiar l'adreça ─────────────────────────
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var email = currentEmail();
      var original = copyBtn.textContent;
      var done = function () {
        copyBtn.textContent = t('Copiada!', 'Copied!', '¡Copiada!');
        window.setTimeout(function () { copyBtn.textContent = original; }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(done, function () { window.prompt(t('Copia l\'adreça:', 'Copy the address:', 'Copia la dirección:'), email); });
      } else {
        window.prompt(t('Copia l\'adreça:', 'Copy the address:', 'Copia la dirección:'), email);
      }
    });
  }

  // ── Targetes de correu: trien la persona destinatària ──
  document.querySelectorAll('.contact-email-link[data-recipient]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var radio = composer.querySelector('input[name="to"][value="' + link.getAttribute('data-recipient') + '"]');
      if (!radio) return; // sense «Escriu-nos» l'enllaç funciona com sempre
      e.preventDefault();
      radio.checked = true;
      selectTab(document.getElementById('tab-correu'));
      update();
      composer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(function () { radio.focus({ preventScroll: true }); }, 400);
    });
  });

  update();
})();
