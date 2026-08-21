/* ============================================ */
/* JS - Obrir/tancar els modals legals           */
/* (Avís legal, Política de privacitat, Cookies) */
/* Usa delegació d'esdeveniments: els enllaços   */
/* que i18n.js re-crea (innerHTML) o que el      */
/* bàner de cookies injecta continuen funcionant */
/* ============================================ */

document.addEventListener('DOMContentLoaded', function () {
  var modals = {
    'open-avis-legal': 'avisLegalModal',
    'open-politica-privacitat': 'politicaPrivacitatModal',
    'open-politica-cookies': 'politicaCookiesModal',
    'open-signup-form': 'signupFormModal'
  };

  var activeModal = null;

  // ── Formulari d'inscripció (JotForm) ──
  // S'injecta com a iframe triant el formulari segons l'idioma
  // seleccionat a la web (cada idioma té el seu propi formulari).
  var SIGNUP_FORMS = {
    ca: { id: '262316885101050', title: 'Formulari d\'inscripció' },
    es: { id: '262317185797065', title: 'Formulario de inscripción' },
    en: { id: '262317031291044', title: 'Registration Form' }
  };

  function injectSignupForm(modal) {
    var embed = modal.querySelector('#signupFormEmbed');
    if (!embed) return;
    var lang = document.documentElement.getAttribute('lang');
    var form = SIGNUP_FORMS[lang] || SIGNUP_FORMS.en;
    embed.innerHTML = '';
    var frame = document.createElement('iframe');
    frame.id = 'JotFormIFrame-' + form.id;
    frame.src = 'https://form.jotform.com/' + form.id;
    frame.setAttribute('title', form.title);
    frame.setAttribute('allowtransparency', 'true');
    frame.setAttribute('allowfullscreen', 'true');
    frame.setAttribute('allow', 'geolocation; microphone; camera');
    frame.style.minWidth = '100%';
    frame.style.maxWidth = '100%';
    frame.style.height = '539px';
    frame.style.border = 'none';
    frame.addEventListener('load', function () {
      window.scrollTo(0, 0);
    });
    embed.appendChild(frame);
  }

  // Auto-ajusta l'alçada de l'iframe amb el protocol postMessage de
  // JotForm (setHeight). Sense això, amb alçada fixa i sense scroll,
  // no es poden veure totes les preguntes del formulari.
  function handleJotFormMessage(e) {
    if (e.origin !== 'https://form.jotform.com') return;
    if (typeof e.data !== 'string') return;
    var args = e.data.split(':');
    if (args[0] !== 'setHeight') return;
    var height = parseInt(args[1], 10);
    if (isNaN(height)) return;
    var frame = null;
    if (args.length > 2) {
      // El darrer fragment sol ser l'ID del formulari remitent
      frame = document.getElementById('JotFormIFrame-' + args[args.length - 1]);
    }
    if (!frame && activeModal && activeModal.id === 'signupFormModal') {
      frame = activeModal.querySelector('.signup-modal__embed iframe');
    }
    if (frame) frame.style.height = height + 'px';
  }
  window.addEventListener('message', handleJotFormMessage, false);

  function openModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // evita scroll del fons
    activeModal = modal;
    if (modal.id === 'signupFormModal') {
      injectSignupForm(modal);
    }
    // Mou el focus dins del modal en obrir-lo
    var firstFocusable = modal.querySelector('.legal-modal-close, a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) firstFocusable.focus();
  }

  function closeModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    activeModal = null;
  }

  // Delegació a document: funciona encara que els elements es re-creïn
  document.addEventListener('click', function (e) {
    var trigger = e.target && e.target.closest ? e.target.closest('.open-avis-legal, .open-politica-privacitat, .open-politica-cookies, .open-signup-form') : null;
    if (!trigger) return;
    var cls = null;
    if (trigger.classList.contains('open-avis-legal')) {
      cls = 'open-avis-legal';
    } else if (trigger.classList.contains('open-politica-privacitat')) {
      cls = 'open-politica-privacitat';
    } else if (trigger.classList.contains('open-politica-cookies')) {
      cls = 'open-politica-cookies';
    } else {
      cls = 'open-signup-form';
    }
    var modal = document.getElementById(modals[cls]);
    if (!modal) return;
    e.preventDefault();
    openModal(modal);
  });

  // Tancar amb el botó X o clicant fora del contingut
  document.querySelectorAll('.legal-modal-overlay').forEach(function (modal) {
    var closeBtn = modal.querySelector('.legal-modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        closeModal(modal);
      });
    }
    modal.addEventListener('click', function (e) {
      if (e.target === modal) {
        closeModal(modal);
      }
    });
  });

  // Tancar amb la tecla Escape (qualsevol modal obert) i trampa de focus
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && activeModal) {
      closeModal(activeModal);
      return;
    }
    if (e.key === 'Tab' && activeModal) {
      var focusables = activeModal.querySelectorAll(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
});