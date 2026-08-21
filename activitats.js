/* =============================================
   ACTIVITATS.JS — Rotaract Igualada
   Interactivitat: tabs, filtres, calendari, reveal
   ============================================= */

document.addEventListener('DOMContentLoaded', function () {

  /* ── Fallback d'imatges de targetes: si una foto no carrega,
     s'amaga i es mostra el placeholder (emoji) ── */
  document.querySelectorAll('.act-card__img-wrap img').forEach(function (img) {
    img.addEventListener('error', function () {
      img.style.display = 'none';
      const placeholder = img.nextElementSibling;
      if (placeholder) placeholder.style.display = 'flex';
    });
  });

  /* ── Sistema de Tabs ── */
  const tabBtns     = document.querySelectorAll('.act-hero__tab-btn');
  const tabSections = document.querySelectorAll('.act-tab-section');

  function showTab(tabId) {
    // Amaga totes les seccions
    tabSections.forEach(s => {
      s.classList.remove('act-tab-section--active');
    });

    // Desactiva tots els botons
    tabBtns.forEach(b => {
      b.classList.remove('act-hero__tab-btn--active');
    });

    // Activa la secció i el botó corresponents
    const targetSection = document.getElementById(tabId);
    const targetBtn     = document.querySelector(`[data-tab="${tabId}"]`);

    if (targetSection) targetSection.classList.add('act-tab-section--active');
    if (targetBtn)     targetBtn.classList.add('act-hero__tab-btn--active');

    // Actualitza la URL sense fer scroll.
    // Per a la pestanya per defecte ("programades") no afegim cap hash,
    // així l'URL es queda neta (activitats.html) i no hi ha risc que
    // cap navegador faci un salt d'ancoratge en tornar a carregar la pàgina.
    if (tabId === 'programades') {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    } else {
      history.replaceState(null, '', '#' + tabId);
    }

    // Trigger reveal per als elements de la nova secció activa
    triggerReveal();
  }

  // Clic als botons de tab
  tabBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      showTab(this.dataset.tab);
    });
  });

  // Llegeix el hash de la URL per mostrar la tab correcta
  function initTabFromHash() {
    const hash = window.location.hash.replace('#', '');
    const validTabs = ['programades', 'realitzades', 'calendari'];
    if (hash && validTabs.includes(hash)) {
      showTab(hash);
      // Entrada directa des d'una altra pàgina (p. ex. activitats.html#programades):
      // esperem que la pàgina estigui completament carregada (imatges, fonts...)
      // i fem scroll instantani fins a la secció.
      const goToSection = () => scrollToTab(hash, true);
      if (document.readyState === 'complete') {
        goToSection();
      } else {
        window.addEventListener('load', goToSection);
      }
    } else {
      showTab('programades');
    }
  }

  initTabFromHash();

  // Suport per a qualsevol enllaç que apunti a una tab (#programades, #realitzades, #calendari),
  // tant des del menú d'escriptori (dropdown del header) com del menú mòbil, encara que
  // l'enllaç inclogui "activitats.html" al davant (com passa amb els del header).
  const validTabs = ['programades', 'realitzades', 'calendari'];

  function isSamePageLink(href) {
    if (href.startsWith('#')) return true;
    const path = href.split('#')[0];
    if (!path) return true;
    const currentPage = window.location.pathname.split('/').pop() || 'activitats.html';
    return path === 'activitats.html' || path === currentPage;
  }

  function scrollToTab(tabId, instant) {
    const targetSection = document.getElementById(tabId);
    if (!targetSection) return;
    targetSection.scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'start' });
  }

  document
    .querySelectorAll('a[href*="#programades"], a[href*="#realitzades"], a[href*="#calendari"]')
    .forEach(link => {
      link.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        const hash = href.split('#')[1];
        if (validTabs.includes(hash) && isSamePageLink(href)) {
          e.preventDefault();
          showTab(hash);
          scrollToTab(hash);
        }
      });
    });

  // Si l'usuari navega amb endavant/enrere del navegador i el hash canvia
  window.addEventListener('hashchange', initTabFromHash);


  /* ── Reveal en scroll ── */
  function triggerReveal() {
    const revealEls = document.querySelectorAll('.act-reveal:not(.act-visible)');
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('act-visible');
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(el => revealObs.observe(el));
  }

  triggerReveal();


  /* ── Filtres d'activitats ── */
  const filterBtns = document.querySelectorAll('.act-filter-btn');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      const section  = this.dataset.section;
      const filter   = this.dataset.filter;
      const gridId   = section === 'prog' ? 'grid-programades' : 'grid-realitzades';
      const grid     = document.getElementById(gridId);

      document.querySelectorAll(`[data-section="${section}"]`).forEach(b => {
        b.classList.remove('act-filter-btn--active');
      });
      this.classList.add('act-filter-btn--active');

      grid.querySelectorAll('.act-card').forEach(card => {
        if (filter === 'all' || card.dataset.cat === filter) {
          card.classList.remove('act-card--hidden');
        } else {
          card.classList.add('act-card--hidden');
        }
      });
    });
  });


  /* ── Calendari interactiu ── */
  // Encara no hi ha cap activitat confirmada. Quan en tingueu,
  // afegiu-les aquí amb el mateix format que abans, per exemple:
  // '2026-09-15': [ { title: 'Nom', time: '10:00h', loc: 'Igualada', emoji: '🤝', cat: 'Solidari', link: 'contacte.html' } ]
  const events = {};

  const monthNames = {
    ca: ['Gener','Febrer','Març','Abril','Maig','Juny','Juliol','Agost','Setembre','Octubre','Novembre','Desembre'],
    en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
    es: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  };

  const getLang = function () {
    return document.documentElement.getAttribute('lang');
  };
  const t = function (ca, en, es) { return getLang() === 'en' ? en : getLang() === 'es' ? (es || en) : ca; };

  const today = new Date();
  let currentYear  = today.getFullYear();
  let currentMonth = today.getMonth();
  let selectedDay  = null;

  const calGrid   = document.getElementById('cal-grid');
  const calTitle  = document.getElementById('cal-title');
  const calEvents = document.getElementById('cal-events-list');

  function pad(n) { return String(n).padStart(2, '0'); }

  function renderCalendar() {
    calGrid.innerHTML = '';
    // Fix: abans es pintava monthNames[getLang()] sencer (tots els mesos
    // separats per comes) perquè l'array és veritatiu i el || no entrava mai.
    var names = monthNames[getLang()] || monthNames.ca;
    calTitle.textContent = names[currentMonth] + ' ' + currentYear;

    const firstDay    = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const offset      = (firstDay + 6) % 7;

    for (let i = 0; i < offset; i++) {
      const empty = document.createElement('div');
      empty.className = 'cal-day cal-day--empty';
      calGrid.appendChild(empty);
    }

    const today = new Date();

    for (let d = 1; d <= daysInMonth; d++) {
      const cell    = document.createElement('div');
      cell.className = 'cal-day';
      cell.textContent = d;

      const dateStr = `${currentYear}-${pad(currentMonth + 1)}-${pad(d)}`;

      if (
        today.getFullYear() === currentYear &&
        today.getMonth()    === currentMonth &&
        today.getDate()     === d
      ) {
        cell.classList.add('cal-day--today');
      }

      if (events[dateStr]) {
        cell.classList.add('cal-day--has-event');
      }

      if (selectedDay === dateStr) {
        cell.classList.add('cal-day--selected');
      }

      cell.addEventListener('click', function () {
        selectedDay = dateStr;
        renderCalendar();
        showEvents(dateStr);
      });

      calGrid.appendChild(cell);
    }
  }

  function showEvents(dateStr) {
    calEvents.innerHTML = '';
    const dayEvents = events[dateStr];

    if (!dayEvents || dayEvents.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'cal-events__empty';
      empty.textContent = t('Cap activitat aquest dia.', 'No activities on this day.', 'No hay actividades este día.');
      calEvents.appendChild(empty);
      return;
    }

    dayEvents.forEach(ev => {
      const item = document.createElement('div');
      item.className = 'cal-event-item';

      const icon = document.createElement('div');
      icon.className = 'cal-event-item__icon';
      icon.textContent = ev.emoji || '';

      const info = document.createElement('div');
      info.className = 'cal-event-item__info';

      const title = document.createElement('div');
      title.className = 'cal-event-item__title';
      title.textContent = ev.title || '';

      const meta = document.createElement('div');
      meta.className = 'cal-event-item__meta';
      meta.textContent = [ev.time, ev.loc, ev.cat].filter(Boolean).join(' · ');

      const link = document.createElement('a');
      link.className = 'cal-event-item__cta';
      link.href = ev.link || '#';
      link.textContent = t('Inscriu-te →', 'Sign up →', 'Inscríbete →');

      info.appendChild(title);
      info.appendChild(meta);
      info.appendChild(link);
      item.appendChild(icon);
      item.appendChild(info);
      calEvents.appendChild(item);
    });
  }

  document.getElementById('cal-prev').addEventListener('click', function () {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    selectedDay = null;
    calEvents.innerHTML = '<p class="cal-events__empty">' + t('Selecciona un dia per veure els detalls.', 'Select a day to see the details.', 'Selecciona un día para ver los detalles.') + '</p>';
    renderCalendar();
  });

  document.getElementById('cal-next').addEventListener('click', function () {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    selectedDay = null;
    calEvents.innerHTML = '<p class="cal-events__empty">' + t('Selecciona un dia per veure els detalls.', 'Select a day to see the details.', 'Selecciona un día para ver los detalles.') + '</p>';
    renderCalendar();
  });

  renderCalendar();

  // Si l'usuari canvia d'idioma, repinta el calendari
  // (el títol del mes es genera des d'aquí, no des de l'i18n)
  document.addEventListener('rotaract:lang', renderCalendar);

});