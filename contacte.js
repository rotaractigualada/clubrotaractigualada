/* contacte.js */
(function () {
  'use strict';

  // ── Reveal on scroll ────────────────────────
  const revealEls = document.querySelectorAll('.reveal-left, .reveal-right');
  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealEls.forEach(function (el) { io.observe(el); });

  // ── Char count ──────────────────────────────
  const textarea  = document.getElementById('contactMessage');
  const charCount = document.getElementById('charCount');
  const MAX_CHARS = 500;

  if (textarea && charCount) {
    textarea.addEventListener('input', function () {
      const len = textarea.value.length;
      charCount.textContent = len + ' / ' + MAX_CHARS + ' ' + t('caràcters', 'characters', 'caracteres');
      if (len > MAX_CHARS * 0.9) {
        charCount.style.color = 'var(--pink)';
      } else {
        charCount.style.color = '';
      }
    });
  }

  // ── Targetes d'email: en lloc d'obrir el client de correu,
  // porten fins al formulari amb el destinatari ja indicat.
  document.querySelectorAll('.contact-email-link[data-email]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var email = link.getAttribute('data-email');
      var note = document.getElementById('recipientNote');
      var display = document.getElementById('recipientEmailDisplay');
      if (note && display) {
        display.textContent = email;
        note.hidden = false;
      }
      var targetForm = document.getElementById('contactForm');
      if (targetForm) {
        targetForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      var nameField = document.getElementById('contactName');
      if (nameField) {
        window.setTimeout(function () { nameField.focus({ preventScroll: true }); }, 400);
      }
    });
  });

  // ── Arribada des del peu de pàgina: contacte.html?correu=club ──
  // Els enllaços de correu del peu de totes les pàgines porten aquí.
  // Seguretat: l'adreça NO es llegeix mai de la URL (evita suplantacions);
  // només s'accepta una clau d'aquesta llista blanca.
  var DEST_EMAILS = { club: 'rotaractigualada@gmail.com' };
  var destKey = new URLSearchParams(window.location.search).get('correu');
  var destEmail = (destKey && Object.prototype.hasOwnProperty.call(DEST_EMAILS, destKey))
    ? DEST_EMAILS[destKey]
    : null;

  if (destEmail) {
    // Neteja el paràmetre perquè en recarregar no salti altre cop
    window.history.replaceState(null, '', window.location.pathname);

    var showRecipient = function () {
      var note = document.getElementById('recipientNote');
      var display = document.getElementById('recipientEmailDisplay');
      if (note && display) {
        display.textContent = destEmail;
        note.hidden = false;
      }
      var targetForm = document.getElementById('contactForm');
      if (targetForm) {
        targetForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      var nameField = document.getElementById('contactName');
      if (nameField) {
        window.setTimeout(function () { nameField.focus({ preventScroll: true }); }, 700);
      }
    };

    if (document.readyState === 'complete') {
      window.setTimeout(showRecipient, 200);
    } else {
      window.addEventListener('load', function () {
        window.setTimeout(showRecipient, 200);
      });
    }
  }

  // ── CSRF (doble submissió) ───────────────────
  // El token es carrega des de csrf.php (cookie HttpOnly) i s'envia
  // amb cada formulari; form-handler.php el valida. Si l'usuari envia
  // el formulari abans que el token arribi, esperem a obtenir-lo.
  var csrfToken = null;
  var csrfPromise = null;
  function ensureCsrf() {
    if (csrfToken) return Promise.resolve(csrfToken);
    if (csrfPromise) return csrfPromise;
    csrfPromise = fetch('csrf.php', { method: 'GET', credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (d) { csrfToken = (d && d.csrf) ? d.csrf : null; return csrfToken; })
      .catch(function () { csrfToken = null; return csrfToken; });
    return csrfPromise;
  }

  // ── Form submit ─────────────────────────────
  const form       = document.getElementById('contactForm');
  const submitBtn  = document.getElementById('submitBtn');
  const successMsg = document.getElementById('formSuccess');

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const getLang = function () {
    return document.documentElement.getAttribute('lang');
  };
  const t = function (ca, en, es) {
    var l = getLang();
    return l === 'en' ? en : l === 'es' ? (es || en) : ca;
  };

  function setFieldError(input, message) {
    const group = input.closest('.form-group');
    if (!group) return;
    let error = group.querySelector('.form-field-error');
    if (!error) {
      error = document.createElement('p');
      error.className = 'form-field-error';
      group.appendChild(error);
    }
    error.textContent = message;
    input.classList.add('input-invalid');
  }

  function clearFieldError(input) {
    input.classList.remove('input-invalid');
    const group = input.closest('.form-group');
    if (group) {
      const error = group.querySelector('.form-field-error');
      if (error) error.remove();
    }
  }

  if (form) {
    form.querySelectorAll('input, select, textarea').forEach(function (field) {
      field.addEventListener('input', function () { clearFieldError(field); });
      field.addEventListener('change', function () { clearFieldError(field); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const name    = form.querySelector('[name="name"]');
      const email   = form.querySelector('[name="email"]');
      const message = form.querySelector('[name="message"]');
      const privacy = form.querySelector('[name="privacy"], #contactPrivacy');
      const subject = form.querySelector('input[name="subject"]:checked');

      let valid = true;

      if (name && !name.value.trim()) {
        setFieldError(name, t('Escriu el teu nom.', 'Enter your name.', 'Escribe tu nombre.'));
        valid = false;
      }

      if (email && !email.value.trim()) {
        setFieldError(email, t('Escriu el teu correu electrònic.', 'Enter your email address.', 'Escribe tu correo electrónico.'));
        valid = false;
      } else if (email && !EMAIL_REGEX.test(email.value.trim())) {
        setFieldError(email, t('El correu electrònic no és vàlid.', 'The email address is not valid.', 'El correo electrónico no es válido.'));
        valid = false;
      }

      if (message && !message.value.trim()) {
        setFieldError(message, t('Escriu el teu missatge.', 'Write your message.', 'Escribe tu mensaje.'));
        valid = false;
      }

      if (!subject) {
        const subjectGroup = form.querySelector('.subject-pills');
        if (subjectGroup) {
          setFieldError(subjectGroup, t('Selecciona un assumpte.', 'Select a subject.', 'Selecciona un asunto.'));
        }
        valid = false;
      }

      if (privacy && !privacy.checked) {
        setFieldError(privacy, t('Has d\'acceptar la política de privacitat.', 'You must accept the privacy policy.', 'Debes aceptar la política de privacidad.'));
        valid = false;
      }

      if (!valid) return;

      // Backend propi: rep i envia els missatges (form-handler.php)
      var FORM_ENDPOINT = 'form-handler.php';
      var submitText = submitBtn.querySelector('.btn-submit__text');
      var originalText = submitText ? submitText.textContent : '';

      var submitError = form.querySelector('.form-submit-error');
      if (!submitError) {
        submitError = document.createElement('p');
        submitError.className = 'form-submit-error';
        submitError.setAttribute('role', 'alert');
        submitBtn.parentElement.appendChild(submitError);
      }
      submitError.hidden = true;

      function restoreSubmit() {
        submitBtn.disabled = false;
        if (submitText) submitText.textContent = originalText;
      }

      submitBtn.disabled = true;
      if (submitText) submitText.textContent = t('Enviant…', 'Sending…', 'Enviando…');

      ensureCsrf().then(function (token) {
        var data = new FormData(form);
        if (token) data.append('csrf_token', token);
        return fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: data
        });
      })
        .then(function (response) {
          if (!response.ok) throw new Error('HTTP ' + response.status);
          return response.json();
        })
        .then(function () {
          form.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]), select, textarea')
              .forEach(function (el) { el.value = ''; });
          form.querySelectorAll('input[type="radio"]')
              .forEach(function (el) { el.checked = false; });
          if (charCount) charCount.textContent = t('0 / 500 caràcters', '0 / 500 characters', '0 / 500 caracteres');
          var recipientNote = document.getElementById('recipientNote');
          if (recipientNote) recipientNote.hidden = true;
          restoreSubmit();
          if (successMsg) {
            successMsg.hidden = false;
            successMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            setTimeout(function () { successMsg.hidden = true; }, 6000);
          }
        })
        .catch(function () {
          submitError.textContent = t(
            'No s\'ha pogut enviar el missatge. Torna-ho a provar en uns minuts o escriu-nos a rotaractigualada@gmail.com.',
            'The message could not be sent. Try again in a few minutes or email us at rotaractigualada@gmail.com.',
            'No se ha podido enviar el mensaje. Inténtalo de nuevo en unos minutos o escríbenos a rotaractigualada@gmail.com.'
          );
          submitError.hidden = false;
          restoreSubmit();
        });
    });
  }
})();