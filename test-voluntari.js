/* test-voluntari.js — Test «Quin voluntari ets?» de la portada.
   Cinc preguntes; cada resposta suma un punt a un perfil (medi, social,
   salut, generacions o motor). En acabar es mostra el perfil guanyador,
   la barreja dels cinc i les activitats del club del mateix perfil
   (projectes.json, a través de projectes.js).
   Tot passa al navegador: no s'envia ni es desa cap resposta. */
(function () {
  'use strict';

  var quiz = document.getElementById('quiz');
  if (!quiz) return;

  var PERFILS = ['medi', 'social', 'salut', 'generacions', 'motor'];
  var steps = {};
  quiz.querySelectorAll('[data-step]').forEach(function (el) { steps[el.getAttribute('data-step')] = el; });
  var questions = Array.prototype.slice.call(quiz.querySelectorAll('.quiz__q'));
  var num = quiz.querySelector('[data-quiz="num"]');
  var bar = quiz.querySelector('[data-quiz="bar"]');
  var bars = quiz.querySelector('[data-quiz="bars"]');
  var acts = quiz.querySelector('[data-quiz="acts"]');
  var empty = quiz.querySelector('[data-quiz="empty"]');

  var answers = [];  // perfil triat a cada pregunta
  var current = 0;
  var busy = false;

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
        b.setAttribute('aria-pressed', String(answers[j] === b.getAttribute('data-perfil')));
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

  function profileEl(perfil) {
    return quiz.querySelector('.quiz__perfil[data-perfil="' + perfil + '"]');
  }

  function result() {
    var score = {};
    var last = {};
    PERFILS.forEach(function (p) { score[p] = 0; last[p] = -1; });
    answers.forEach(function (p, i) { score[p] += 1; last[p] = i; });
    // Guanya qui té més punts; si hi ha empat, el de la resposta més recent
    var order = PERFILS.slice().sort(function (a, b) { return score[b] - score[a] || last[b] - last[a]; });
    var top = order[0];

    bar.style.width = '100%';
    show('resultat');
    quiz.querySelectorAll('.quiz__perfil').forEach(function (el) {
      el.hidden = el.getAttribute('data-perfil') !== top;
    });

    // La barreja dels cinc perfils
    bars.textContent = '';
    var fills = [];
    order.forEach(function (p) {
      var el = profileEl(p);
      var pct = Math.round(score[p] / answers.length * 100);
      var li = document.createElement('li');
      li.className = 'quiz__bar' + (p === top ? ' is-top' : '');
      var label = document.createElement('span');
      label.className = 'quiz__bar-label';
      var emoji = document.createElement('span');
      emoji.setAttribute('aria-hidden', 'true');
      emoji.textContent = el.querySelector('.quiz__perfil-emoji').textContent;
      label.appendChild(emoji);
      label.appendChild(document.createTextNode(' ' + el.querySelector('.quiz__perfil-name').textContent));
      var value = document.createElement('span');
      value.className = 'quiz__bar-pct';
      value.textContent = pct + '%';
      var track = document.createElement('span');
      track.className = 'quiz__bar-track';
      track.setAttribute('aria-hidden', 'true');
      var fill = document.createElement('span');
      fill.className = 'quiz__bar-fill';
      track.appendChild(fill);
      li.appendChild(label);
      li.appendChild(value);
      li.appendChild(track);
      bars.appendChild(li);
      fills.push([fill, pct]);
    });
    var grow = function () { fills.forEach(function (f) { f[0].style.width = f[1] + '%'; }); };
    if (reduce()) grow(); else requestAnimationFrame(function () { requestAnimationFrame(grow); });

    // Activitats del club del mateix perfil: primer les que vindran
    acts.hidden = true;
    empty.hidden = true;
    var P = window.RotaractProjectes;
    (P ? P.load() : Promise.resolve([])).catch(function () { return []; }).then(function (llista) {
      var mine = llista.filter(function (a) { return a.perfil === top; });
      var properes = mine.filter(function (a) { return !a.fet; });
      var pick = (properes.length ? properes : mine.slice().reverse()).slice(0, 3);
      acts.textContent = '';
      pick.forEach(function (a) {
        var li = document.createElement('li');
        li.className = 'quiz__act' + (a.fet ? ' is-fet' : '');
        var when = document.createElement('span');
        when.className = 'quiz__act-date';
        when.textContent = (a.fet ? '✓ ' : '') + P.date(a);
        var name = document.createElement('span');
        name.className = 'quiz__act-name';
        name.textContent = a.nom;
        li.appendChild(when);
        li.appendChild(name);
        acts.appendChild(li);
      });
      acts.hidden = !pick.length;
      empty.hidden = !!pick.length;
    });

    celebrate(profileEl(top).querySelector('.quiz__perfil-emoji').textContent);
    keepInView();
    profileEl(top).querySelector('.quiz__perfil-name').focus({ preventScroll: true });
  }

  // Petita pluja d'emojis del perfil (decorativa)
  function celebrate(emoji) {
    if (reduce()) return;
    var box = document.createElement('div');
    box.className = 'quiz__confetti';
    box.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < 12; i++) {
      var s = document.createElement('span');
      s.textContent = emoji;
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
      answers[current] = opt.getAttribute('data-perfil');
      opt.classList.add('is-picked');
      setTimeout(function () {
        busy = false;
        if (current < questions.length - 1) ask(current + 1);
        else { answers.length = questions.length; result(); }
      }, reduce() ? 0 : 280);
      return;
    }
    var btn = e.target.closest('[data-quiz]');
    if (!btn || busy) return;
    var what = btn.getAttribute('data-quiz');
    if (what === 'start' || what === 'again') start();
    else if (what === 'back') {
      if (current > 0) ask(current - 1);
      else {
        show('inici');
        steps.inici.querySelector('[data-quiz="start"]').focus();
      }
    }
  });
})();
