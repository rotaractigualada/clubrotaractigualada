/* correu.js — «Escriu-nos» de la pàgina Contacte.
   Dos formularis dins de la web (cap botó obre el programa de correu):
   - «Vull informació» (#form-info): dubtes, propostes…, a la persona triada
   - «Vull unir-me»    (#form-unir): sol·licitud per formar part del club
   Els envia form-handler.php. Aquest fitxer gestiona les pestanyes, la
   validació, l'enviament sense recarregar la pàgina i els missatges. */
(function () {
  'use strict';

  var box = document.getElementById('escriu-nos');
  if (!box) return;

  var forms = {
    info: document.getElementById('form-info'),
    unir: document.getElementById('form-unir')
  };
  var tabs = {
    info: document.getElementById('tab-info'),
    unir: document.getElementById('tab-unir')
  };
  var loadedAt = Date.now();
  var EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  var t = function (ca, en, es) {
    var l = document.documentElement.getAttribute('lang');
    return l === 'en' ? en : l === 'es' ? es : ca;
  };

  // ── Pestanyes «Vull informació» / «Vull unir-me» ──
  function select(kind, focusTab) {
    Object.keys(forms).forEach(function (k) {
      var on = k === kind;
      if (forms[k]) forms[k].hidden = !on;
      if (tabs[k]) {
        tabs[k].setAttribute('aria-selected', on ? 'true' : 'false');
        tabs[k].tabIndex = on ? 0 : -1;
      }
    });
    if (focusTab && tabs[kind]) tabs[kind].focus();
  }

  function show(kind) {
    select(kind);
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    var first = forms[kind] && forms[kind].querySelector('input[name="name"]');
    if (first) window.setTimeout(function () { first.focus({ preventScroll: true }); }, 450);
  }

  Object.keys(tabs).forEach(function (kind, i, all) {
    var tab = tabs[kind];
    if (!tab) return;
    tab.addEventListener('click', function () { select(kind); });
    tab.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      select(all[(i + 1) % all.length], true);
    });
  });

  // Enllaços a #uneix-te i #escriu-nos (capçalera, peu, «Com unir-se»…)
  function kindFromHash(hash) {
    return hash === '#uneix-te' ? 'unir' : hash === '#escriu-nos' ? 'info' : null;
  }
  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('a[href*="#uneix-te"], a[href*="#escriu-nos"]') : null;
    if (!link) return;
    var url = new URL(link.href, window.location.href);
    if (url.pathname !== window.location.pathname) return; // una altra pàgina: navega normal
    var kind = kindFromHash(url.hash);
    if (!kind) return;
    e.preventDefault();
    window.history.replaceState(null, '', url.hash);
    show(kind);
  });
  window.addEventListener('hashchange', function () {
    var kind = kindFromHash(window.location.hash);
    if (kind) show(kind);
  });

  // Targetes de correu de dalt: obren «Vull informació» amb la persona triada
  document.querySelectorAll('.contact-email-link[data-recipient]').forEach(function (card) {
    card.addEventListener('click', function (e) {
      e.preventDefault();
      var radio = forms.info && forms.info.querySelector('input[name="recipient"][value="' + card.getAttribute('data-recipient') + '"]');
      if (radio) radio.checked = true;
      show('info');
    });
  });

  // ── Comptadors de caràcters ──
  function updateCount(counter) {
    var field = document.getElementById(counter.getAttribute('data-for'));
    if (!field) return;
    var max = field.maxLength > 0 ? field.maxLength : 1000;
    counter.textContent = field.value.length + ' / ' + max + ' ' + t('caràcters', 'characters', 'caracteres');
    counter.style.color = field.value.length > max * 0.9 ? 'var(--pink)' : '';
  }
  box.querySelectorAll('.char-count[data-for]').forEach(function (counter) {
    var field = document.getElementById(counter.getAttribute('data-for'));
    if (field) field.addEventListener('input', function () { updateCount(counter); });
    // i18n.js reescriu el comptador en canviar d'idioma
    document.addEventListener('rotaract:lang', function () { updateCount(counter); });
  });

  // ── Errors accessibles als camps ──
  function setError(target, message) {
    var group = target.closest('.form-group');
    if (!group) return;
    var error = group.querySelector('.form-field-error');
    if (!error) {
      error = document.createElement('p');
      error.className = 'form-field-error';
      error.id = (target.id || target.getAttribute('aria-labelledby') || 'camp') + '-error';
      group.appendChild(error);
    }
    error.textContent = message;
    target.classList.add('input-invalid');
    target.setAttribute('aria-invalid', 'true');
    target.setAttribute('aria-describedby', error.id);
  }
  function clearError(target) {
    target.classList.remove('input-invalid');
    target.removeAttribute('aria-invalid');
    target.removeAttribute('aria-describedby');
    var group = target.closest('.form-group');
    var error = group && group.querySelector('.form-field-error');
    if (error) error.remove();
  }

  var MESSAGES = {
    name: function () { return t('Escriu el teu nom.', 'Enter your name.', 'Escribe tu nombre.'); },
    email: function () { return t('Escriu un correu electrònic vàlid.', 'Enter a valid email address.', 'Escribe un correo electrónico válido.'); },
    subject: function () { return t('Tria un assumpte.', 'Choose a subject.', 'Elige un asunto.'); },
    message: function () { return t('Escriu el teu missatge.', 'Write your message.', 'Escribe tu mensaje.'); },
    privacy: function () { return t('Has d\'acceptar la política de privacitat.', 'You must accept the privacy policy.', 'Debes aceptar la política de privacidad.'); },
    phone: function () { return t('El telèfon no és vàlid.', 'The phone number is not valid.', 'El teléfono no es válido.'); },
    age: function () { return t('L\'edat no és vàlida.', 'The age is not valid.', 'La edad no es válida.'); }
  };

  // Element on es marca l'error de cada camp
  function fieldTarget(form, name) {
    if (name === 'subject') return form.querySelector('[aria-labelledby="infoSubjectLabel"]');
    return form.querySelector('[name="' + name + '"]');
  }

  function validate(form) {
    var bad = [];
    var get = function (n) { var f = form.querySelector('[name="' + n + '"]'); return f ? f.value.trim() : ''; };
    if (!get('name')) bad.push('name');
    if (!EMAIL_REGEX.test(get('email'))) bad.push('email');
    if (form.querySelector('input[name="subject"]') && !form.querySelector('input[name="subject"]:checked')) bad.push('subject');
    if (!get('message')) bad.push('message');
    var phone = get('phone');
    if (phone && !/^[0-9+()\s.-]{6,30}$/.test(phone)) bad.push('phone');
    var age = get('age');
    if (age && (!/^\d{1,2}$/.test(age) || +age < 14)) bad.push('age');
    var privacy = form.querySelector('[name="privacy"]');
    if (privacy && !privacy.checked) bad.push('privacy');
    return bad;
  }

  function markErrors(form, names) {
    names.forEach(function (n) {
      var target = fieldTarget(form, n);
      if (target && MESSAGES[n]) setError(target, MESSAGES[n]());
    });
    var first = fieldTarget(form, names[0]);
    if (first && first.focus) first.focus();
  }

  function status(form, kind, text) {
    var el = form.querySelector('.form-status');
    if (!el) return;
    el.className = 'form-status form-status--' + kind;
    el.textContent = text;
    el.hidden = false;
  }

  function successText(form) {
    return form === forms.unir
      ? t('✅ Sol·licitud enviada! Et respondrem en menys de 48 hores. Gràcies per voler formar part del club.',
          '✅ Request sent! We will reply within 48 hours. Thank you for wanting to join the club.',
          '✅ ¡Solicitud enviada! Te responderemos en menos de 48 horas. Gracias por querer formar parte del club.')
      : t('✅ Missatge enviat! Et respondrem en menys de 48 hores.',
          '✅ Message sent! We will reply within 48 hours.',
          '✅ ¡Mensaje enviado! Te responderemos en menos de 48 horas.');
  }
  function errorText(code) {
    if (code === 'rate') {
      return t('Acabes d\'enviar un missatge. Espera uns segons i torna-ho a provar.',
               'You have just sent a message. Wait a few seconds and try again.',
               'Acabas de enviar un mensaje. Espera unos segundos y vuelve a intentarlo.');
    }
    return t('No s\'ha pogut enviar. Torna-ho a provar en uns minuts.',
             'It could not be sent. Please try again in a few minutes.',
             'No se ha podido enviar. Vuelve a intentarlo en unos minutos.');
  }

  // ── Enviament ──
  Object.keys(forms).forEach(function (kind) {
    var form = forms[kind];
    if (!form) return;

    form.querySelectorAll('input, textarea').forEach(function (field) {
      var clear = function () {
        clearError(field.type === 'radio' && field.name === 'subject' ? fieldTarget(form, 'subject') : field);
      };
      field.addEventListener('input', clear);
      field.addEventListener('change', clear);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = validate(form);
      if (bad.length) { markErrors(form, bad); return; }

      var button = form.querySelector('button[type="submit"]');
      var label = button && button.querySelector('.btn-submit__text');
      var original = label ? label.textContent : '';
      form.querySelector('[name="elapsed"]').value = String(Math.round((Date.now() - loadedAt) / 1000));
      if (button) { button.disabled = true; button.setAttribute('aria-busy', 'true'); }
      if (label) label.textContent = t('Enviant…', 'Sending…', 'Enviando…');
      form.querySelector('.form-status').hidden = true;

      var done = function () {
        if (button) { button.disabled = false; button.removeAttribute('aria-busy'); }
        if (label) label.textContent = original;
      };

      fetch(form.getAttribute('action'), {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form),
        credentials: 'same-origin'
      })
        .then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (data) {
            return { status: response.status, data: data };
          });
        })
        .then(function (result) {
          done();
          if (result.status === 200 && result.data.ok) {
            form.reset();
            box.querySelectorAll('.char-count[data-for]').forEach(updateCount);
            status(form, 'ok', successText(form));
          } else if (result.status === 400 && result.data.fields) {
            markErrors(form, result.data.fields);
          } else {
            status(form, 'error', errorText(result.data.error));
          }
        })
        .catch(function () {
          done();
          status(form, 'error', errorText());
        });
    });
  });

  // ── Estat inicial ──
  // Torna d'un enviament sense JavaScript: contacte.html?enviat=ok|error|camps#…
  var params = new URLSearchParams(window.location.search);
  var sent = params.get('enviat');
  var initial = kindFromHash(window.location.hash) || 'info';
  select(initial);
  if (sent && forms[initial]) {
    if (sent === 'ok') status(forms[initial], 'ok', successText(forms[initial]));
    else status(forms[initial], 'error', sent === 'camps'
      ? t('Revisa els camps marcats amb *.', 'Please check the fields marked with *.', 'Revisa los campos marcados con *.')
      : errorText());
    window.history.replaceState(null, '', window.location.pathname + window.location.hash);
  }
  if (kindFromHash(window.location.hash)) {
    window.setTimeout(function () { box.scrollIntoView({ block: 'start' }); }, 50);
  }
})();
