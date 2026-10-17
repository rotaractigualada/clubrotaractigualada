/* test-voluntari.js — Test «Quina àrea de Rotary et va més?» de la portada.
   7 preguntes amb 7 respostes cadascuna: cada resposta (data-area) suma un
   punt a una de les 7 àrees d'interès de Rotary. El resultat mostra l'àrea
   que més et va (per què, què hi pots fer al club i què fa Rotary), la
   segona, la barreja de les 7 i les activitats del club d'aquesta àrea
   (camp «area» de projectes.json, a través de projectes.js). Es pot copiar
   el resultat per compartir-lo (no s'obre cap aplicació).
   Tot passa al navegador: no s'envia ni es desa cap resposta. */
(function () {
  'use strict';

  var quiz = document.getElementById('quiz');
  if (!quiz) return;

  var AREES = ['pau', 'malalties', 'aigua', 'maternoinfantil', 'educacio', 'economia', 'medi'];
  var SITE = 'https://rotaractigualada.org';

  var steps = {};
  quiz.querySelectorAll('[data-step]').forEach(function (el) { steps[el.getAttribute('data-step')] = el; });
  var questions = Array.prototype.slice.call(quiz.querySelectorAll('.quiz__q'));
  var $ = function (name) { return quiz.querySelector('[data-quiz="' + name + '"]'); };
  var num = $('num');
  var bar = $('bar');

  var answers = [];  // àrea triada a cada pregunta
  var current = 0;
  var busy = false;
  var top = null;    // àrea de l'últim resultat (per copiar-lo)

  var lang = function () {
    var l = document.documentElement.getAttribute('lang');
    return l === 'en' || l === 'es' ? l : 'ca';
  };
  var t = function (ca, en, es) { var l = lang(); return l === 'en' ? en : l === 'es' ? es : ca; };
  var reduce = function () {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  };

  function show(name) {
    Object.keys(steps).forEach(function (k) { steps[k].hidden = k !== name; });
    quiz.setAttribute('data-estat', name);
  }

  // Que el requadre es vegi sencer en canviar de pas (sobretot al mòbil)
  function keepInView() {
    var r = quiz.getBoundingClientRect();
    if (r.top < 0 || r.top > window.innerHeight * 0.6) {
      quiz.scrollIntoView({ block: 'start', behavior: reduce() ? 'auto' : 'smooth' });
    }
  }

  function ask(i) {
    current = i;
    questions.forEach(function (q, j) {
      q.hidden = j !== i;
      // Si torna enrere, es veu la resposta que havia triat
      q.querySelectorAll('.quiz__opt').forEach(function (b) {
        b.classList.remove('is-picked');
        b.setAttribute('aria-pressed', String(answers[j] === b.getAttribute('data-area')));
      });
    });
    num.textContent = i + 1;
    bar.style.width = (i / questions.length * 100) + '%';
    var q = questions[i];
    q.classList.remove('is-in');
    void q.offsetWidth; // reinicia l'animació d'entrada
    q.classList.add('is-in');
    keepInView();
    q.querySelector('.quiz__question').focus({ preventScroll: true });
  }

  var resEl = function (a) { return quiz.querySelector('.quiz__res[data-area="' + a + '"]'); };
  var text = function (el, sel) { return el.querySelector(sel).textContent.trim(); };
  var shortName = function (a) { return text(resEl(a), '.quiz__res-emoji') + ' ' + text(resEl(a), '.quiz__res-short'); };

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  // Punts de cada àrea; si hi ha empat, guanya la resposta més recent
  function ranking() {
    var score = {}, last = {};
    AREES.forEach(function (a) { score[a] = 0; last[a] = -1; });
    answers.forEach(function (a, i) { score[a] += 1; last[a] = i; });
    var order = AREES.slice().sort(function (a, b) { return score[b] - score[a] || last[b] - last[a]; });
    return { order: order, score: score };
  }

  function renderBars(r) {
    var bars = $('bars');
    bars.textContent = '';
    var fills = [];
    r.order.forEach(function (a, idx) {
      var pct = Math.round(r.score[a] / answers.length * 100);
      var li = el('li', 'quiz__bar' + (idx === 0 ? ' is-top' : ''));
      var label = el('span', 'quiz__bar-label');
      var emoji = el('span', null, text(resEl(a), '.quiz__res-emoji'));
      emoji.setAttribute('aria-hidden', 'true');
      label.appendChild(emoji);
      label.appendChild(document.createTextNode(' ' + text(resEl(a), '.quiz__res-short')));
      var track = el('span', 'quiz__bar-track');
      track.setAttribute('aria-hidden', 'true');
      var fill = el('span', 'quiz__bar-fill');
      track.appendChild(fill);
      li.appendChild(label);
      li.appendChild(el('span', 'quiz__bar-pct', pct + '%'));
      li.appendChild(track);
      bars.appendChild(li);
      fills.push([fill, pct]);
    });
    var grow = function () { fills.forEach(function (f) { f[0].style.width = f[1] + '%'; }); };
    if (reduce()) grow(); else requestAnimationFrame(function () { requestAnimationFrame(grow); });
  }

  // Activitats del club d'aquesta àrea (primer les que vindran)
  function renderActivities(area) {
    var acts = $('acts'), empty = $('empty');
    acts.hidden = true;
    empty.hidden = true;
    var P = window.RotaractProjectes;
    (P ? P.load() : Promise.resolve([])).catch(function () { return []; }).then(function (llista) {
      var mine = llista.filter(function (a) { return a.area === area; });
      var properes = mine.filter(function (a) { return !a.fet; });
      var pick = (properes.length ? properes : mine.slice().reverse()).slice(0, 3);
      acts.textContent = '';
      pick.forEach(function (a) {
        var li = el('li', 'quiz__act' + (a.fet ? ' is-fet' : ''));
        li.appendChild(el('span', 'quiz__act-date', (a.fet ? '✓ ' : '') + P.date(a)));
        li.appendChild(el('span', 'quiz__act-name', a.nom));
        acts.appendChild(li);
      });
      acts.hidden = !pick.length;
      empty.hidden = !!pick.length;
    });
  }

  function showResult() {
    var r = ranking();
    top = r.order[0];
    var second = r.score[r.order[1]] > 0 ? r.order[1] : null;

    bar.style.width = '100%';
    show('resultat');
    quiz.querySelectorAll('.quiz__res').forEach(function (x) { x.hidden = x.getAttribute('data-area') !== top; });

    // «La segona que més et va», just sota la frase de l'àrea
    var sec = $('second');
    if (second) {
      $('second-name').textContent = shortName(second);
      resEl(top).querySelector('.quiz__res-desc').insertAdjacentElement('afterend', sec);
    }
    sec.hidden = !second;

    renderBars(r);
    renderActivities(top);
    $('copied').textContent = '';

    celebrate(text(resEl(top), '.quiz__res-emoji'));
    keepInView();
    resEl(top).querySelector('.quiz__res-name').focus({ preventScroll: true });
  }

  // Text per compartir el resultat (es copia; no s'obre cap aplicació)
  function shareText() {
    var area = text(resEl(top), '.quiz__res-name');
    var emoji = text(resEl(top), '.quiz__res-emoji');
    var url = SITE + (lang() === 'ca' ? '/' : '/' + lang() + '/') + '#test';
    return t(
      'He fet el test de Rotaract Igualada i la meva àrea de Rotary és «' + area + '» ' + emoji + '. Descobreix la teva: ' + url,
      'I took the Rotaract Igualada test and my Rotary area of focus is «' + area + '» ' + emoji + '. Find yours: ' + url,
      'He hecho el test de Rotaract Igualada y mi área de Rotary es «' + area + '» ' + emoji + '. Descubre la tuya: ' + url
    );
  }

  function copyResult() {
    var msg = $('copied');
    var txt = shareText();
    var ok = function () { msg.textContent = t('Copiat! Ara el pots enganxar on vulguis.', 'Copied! You can now paste it wherever you like.', '¡Copiado! Ahora puedes pegarlo donde quieras.'); };
    var fail = function () { msg.textContent = t('No s\'ha pogut copiar. Torna-ho a provar.', 'It could not be copied. Please try again.', 'No se ha podido copiar. Vuelve a intentarlo.'); };
    var fallback = function () {
      var ta = document.createElement('textarea');
      ta.value = txt;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var done = false;
      try { done = document.execCommand('copy'); } catch (e) { /* no suportat */ }
      ta.remove();
      if (done) ok(); else fail();
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).then(ok, fallback);
    else fallback();
  }

  // Petita pluja d'emojis de l'àrea (decorativa)
  function celebrate(emoji) {
    if (reduce()) return;
    var box = el('div', 'quiz__confetti');
    box.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < 12; i++) {
      var s = el('span', null, emoji);
      s.style.setProperty('--x', Math.round(Math.random() * 360 - 180) + 'px');
      s.style.setProperty('--y', Math.round(-90 - Math.random() * 110) + 'px');
      s.style.setProperty('--r', Math.round(Math.random() * 120 - 60) + 'deg');
      s.style.animationDelay = Math.round(Math.random() * 220) + 'ms';
      box.appendChild(s);
    }
    steps.resultat.appendChild(box);
    setTimeout(function () { box.remove(); }, 1900);
  }

  function start() {
    answers = [];
    show('preguntes');
    ask(0);
  }

  quiz.addEventListener('click', function (e) {
    var opt = e.target.closest('.quiz__opt');
    if (opt) {
      if (busy) return;
      busy = true;
      answers[current] = opt.getAttribute('data-area');
      opt.classList.add('is-picked');
      setTimeout(function () {
        busy = false;
        if (current < questions.length - 1) ask(current + 1);
        else showResult();
      }, reduce() ? 0 : 280);
      return;
    }
    var btn = e.target.closest('[data-quiz]');
    if (!btn || busy) return;
    var what = btn.getAttribute('data-quiz');
    if (what === 'start' || what === 'again') start();
    else if (what === 'copy') copyResult();
    else if (what === 'back') {
      if (current > 0) ask(current - 1);
      else {
        show('inici');
        steps.inici.querySelector('[data-quiz="start"]').focus();
      }
    }
  });
})();
