/* directiu.js — Sistema de tabs (Socis / Junta) */
document.addEventListener('DOMContentLoaded', function () {

  const tabBtns  = document.querySelectorAll('.directiu-tabs__btn');
  const panels   = document.querySelectorAll('.directiu-panel');

  function showTab(tabId, doScroll) {
    /* Botons */
    tabBtns.forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.tab === tabId);
    });

    /* Panells: amaga tots, mostra el correcte */
    panels.forEach(panel => {
      const isTarget = panel.id === 'panel-' + tabId;
      panel.classList.toggle('is-visible', isTarget);

      /* Reinicia l'animació de les cards quan el panell s'obre */
      if (isTarget) {
        const cards = panel.querySelectorAll('.soci-card, .junta-card');
        cards.forEach(c => c.classList.remove('dir-visible'));
        /* Petit retard perquè l'animació CSS tingui temps de reiniciar-se */
        requestAnimationFrame(() => {
          cards.forEach((c, i) => {
            setTimeout(() => c.classList.add('dir-visible'), i * 35);
          });
        });
      }
    });

    /* Desplaça fins a les tabs només quan ho demanem explícitament
       (clic a un botó de tab o enllaç amb #socis / #junta),
       mai en la càrrega inicial normal de la pàgina */
    if (doScroll) {
      document.getElementById('directiu-tabs').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /* Listener dels botons */
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab, true));
  });

  /* Els links del nav/mobile-nav també han de canviar el tab */
  document.querySelectorAll('a[href="#socis"]').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); showTab('socis', true); });
  });
  document.querySelectorAll('a[href="#junta"]').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); showTab('junta', true); });
  });

  /* Mostra el tab inicial segons l'enllaç d'entrada (#socis o #junta).
     Si no hi ha hash (entrada normal des del header/footer), no fem scroll:
     la pàgina s'ha de quedar dalt de tot. */
  const initialTab = (window.location.hash === '#junta') ? 'junta' : 'socis';
  showTab(initialTab, window.location.hash === '#junta' || window.location.hash === '#socis');

  /* Si l'usuari arriba amb un enllaç directe que canvia el hash
     (p. ex. navegant amb endavant/enrere del navegador) */
  window.addEventListener('hashchange', () => {
    const hashTab = (window.location.hash === '#junta') ? 'junta' : 'socis';
    showTab(hashTab, true);
  });
});