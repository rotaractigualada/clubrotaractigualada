/* ============================================ */
/* JS - Obrir/tancar els modals legals           */
/* (Avís legal i Política de privacitat)        */
/* Usa delegació d'esdeveniments: els enllaços   */
/* que i18n.js re-crea (innerHTML) continuen    */
/* funcionant                                   */
/* ============================================ */

document.addEventListener('DOMContentLoaded', function () {
  var modals = {
    'open-avis-legal': 'avisLegalModal',
    'open-politica-privacitat': 'politicaPrivacitatModal'
  };

  var activeModal = null;
  var lastTrigger = null; // element que ha obert el modal (hi tornem el focus en tancar)

  // Semàntica de diàleg per als lectors de pantalla
  document.querySelectorAll('.legal-modal-overlay').forEach(function (modal) {
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    var title = modal.querySelector('h2');
    if (title) {
      if (!title.id) title.id = modal.id + 'Title';
      modal.setAttribute('aria-labelledby', title.id);
    }
  });

  function openModal(modal) {
    lastTrigger = document.activeElement;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // evita scroll del fons
    activeModal = modal;
    // Mou el focus dins del modal en obrir-lo
    var firstFocusable = modal.querySelector('.legal-modal-close, a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) firstFocusable.focus();
  }

  function closeModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    activeModal = null;
    if (lastTrigger && typeof lastTrigger.focus === 'function' && document.contains(lastTrigger)) {
      lastTrigger.focus();
    }
    lastTrigger = null;
  }

  // Delegació a document: funciona encara que els elements es re-creïn
  document.addEventListener('click', function (e) {
    var trigger = e.target && e.target.closest ? e.target.closest('.open-avis-legal, .open-politica-privacitat') : null;
    if (!trigger) return;
    var cls = trigger.classList.contains('open-avis-legal') ? 'open-avis-legal' : 'open-politica-privacitat';
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