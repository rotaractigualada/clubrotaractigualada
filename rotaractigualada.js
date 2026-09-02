/* Rotaract Igualada — interaccions principals */
document.addEventListener('DOMContentLoaded', () => {
  const revealEls = document.querySelectorAll('.reveal-left, .reveal-right');
  if ('IntersectionObserver' in window && revealEls.length) {
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.16 });

    revealEls.forEach((el) => revealObs.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('active'));
  }

  const contactForm = document.getElementById('contactForm');
  const formSuccess = document.getElementById('formSuccess');

  // ── Targetes d'email: en lloc d'obrir el client de correu,
  // porten fins al formulari amb el destinatari ja indicat.
  document.querySelectorAll('.contact-email-link[data-email]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const email = link.getAttribute('data-email');
      const note = document.getElementById('recipientNote');
      const display = document.getElementById('recipientEmailDisplay');
      if (note && display) {
        display.textContent = email;
        note.hidden = false;
      }
      if (contactForm) {
        contactForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      const nameField = document.getElementById('contactName');
      if (nameField) {
        window.setTimeout(() => nameField.focus({ preventScroll: true }), 400);
      }
    });
  });

  if (!contactForm || !formSuccess) return;

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const getLang = () => document.documentElement.getAttribute('lang');
  const t = (ca, en, es) => {
    const l = getLang();
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

  const nameInput = document.getElementById('contactName');
  const emailInput = document.getElementById('contactEmail');
  const messageInput = document.getElementById('contactMessage');
  const subjectGroup = contactForm.querySelector('.subject-pills');
  const privacyCheck = document.getElementById('contactPrivacy');

  // ── CSRF (doble submissió) ─────────────────
  // Token de csrf.php (cookie HttpOnly); si l'usuari envia el
  // formulari abans que arribi, l'obtenim al moment.
  let csrfToken = null;
  let csrfPromise = null;
  function ensureCsrf() {
    if (csrfToken) return Promise.resolve(csrfToken);
    if (csrfPromise) return csrfPromise;
    csrfPromise = fetch('csrf.php', { method: 'GET', credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then((r) => r.json())
      .then((d) => { csrfToken = (d && d.csrf) ? d.csrf : null; return csrfToken; })
      .catch(() => { csrfToken = null; return csrfToken; });
    return csrfPromise;
  }

  [nameInput, emailInput, messageInput].forEach((field) => {
    if (field) field.addEventListener('input', () => clearFieldError(field));
  });
  contactForm.querySelectorAll('input[name="subject"]').forEach((radio) => {
    radio.addEventListener('change', () => clearFieldError(subjectGroup));
  });
  if (privacyCheck) privacyCheck.addEventListener('change', () => clearFieldError(privacyCheck));

  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();

    let valid = true;

    if (!nameInput || !nameInput.value.trim()) {
      setFieldError(nameInput, t('Escriu el teu nom complet.', 'Enter your full name.', 'Escribe tu nombre completo.'));
      valid = false;
    }

    if (!emailInput || !emailInput.value.trim()) {
      setFieldError(emailInput, t('Escriu el teu correu electrònic.', 'Enter your email address.', 'Escribe tu correo electrónico.'));
      valid = false;
    } else if (!EMAIL_REGEX.test(emailInput.value.trim())) {
      setFieldError(emailInput, t('El correu electrònic no és vàlid.', 'The email address is not valid.', 'El correo electrónico no es válido.'));
      valid = false;
    }

    if (!messageInput || !messageInput.value.trim()) {
      setFieldError(messageInput, t('Escriu el teu missatge.', 'Write your message.', 'Escribe tu mensaje.'));
      valid = false;
    }

    if (subjectGroup && !contactForm.querySelector('input[name="subject"]:checked')) {
      setFieldError(subjectGroup, t('Selecciona un assumpte.', 'Select a subject.', 'Selecciona un asunto.'));
      valid = false;
    }

    if (privacyCheck && !privacyCheck.checked) {
      setFieldError(privacyCheck, t('Has d\'acceptar la política de privacitat.', 'You must accept the privacy policy.', 'Debes aceptar la política de privacidad.'));
      valid = false;
    }

    if (!valid) return;

    const submitBtn = contactForm.querySelector('button[type="submit"]');
    if (!submitBtn) return;

    // Backend propi: rep i envia els missatges (form-handler.php)
    const FORM_ENDPOINT = 'form-handler.php';

    const label = submitBtn.querySelector('span[data-en]');
    const originalLabel = label ? label.textContent : '';

    let submitError = contactForm.querySelector('.form-submit-error');
    if (!submitError) {
      submitError = document.createElement('p');
      submitError.className = 'form-submit-error';
      submitError.setAttribute('role', 'alert');
      submitBtn.parentElement.appendChild(submitError);
    }

    function restoreSubmitButton() {
      submitBtn.disabled = false;
      submitBtn.removeAttribute('aria-busy');
      if (label) label.textContent = originalLabel;
    }

    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true');
    if (label) label.textContent = t('Enviant...', 'Sending...', 'Enviando...');
    submitError.hidden = true;

    ensureCsrf().then((token) => {
      const data = new FormData(contactForm);
      if (token) data.append('csrf_token', token);
      return fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: data
      });
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }
        return response.json();
      })
      .then(() => {
        contactForm.reset();
        const recipientNote = document.getElementById('recipientNote');
        if (recipientNote) recipientNote.hidden = true;
        formSuccess.style.display = 'block';
        restoreSubmitButton();
        window.setTimeout(() => {
          formSuccess.style.display = 'none';
        }, 4500);
      })
      .catch(() => {
        submitError.textContent = t(
          'No s\'ha pogut enviar el missatge. Torna-ho a provar en uns minuts o escriu-nos a rotaractigualada@gmail.com.',
          'The message could not be sent. Try again in a few minutes or email us at rotaractigualada@gmail.com.',
          'No se ha podido enviar el mensaje. Inténtalo de nuevo en unos minutos o escríbenos a rotaractigualada@gmail.com.'
        );
        submitError.hidden = false;
        restoreSubmitButton();
      });
  });
});