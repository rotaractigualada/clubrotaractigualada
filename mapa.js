/* mapa.js — Mapa interactiu d'Igualada (Nosaltres → Rotary Igualada).
   Privacitat: el mapa NO es carrega en obrir la pàgina. Només quan el
   visitant prem «Veure el mapa interactiu» es carrega Leaflet (des de la
   mateixa web, vendor/) i les imatges del mapa d'OpenStreetMap, que no fan
   servir cookies. Abans d'això no es connecta amb cap servei extern. */
(function () {
  'use strict';

  var box = document.getElementById('mapaIgualada');
  var btn = document.getElementById('mapaIgualadaBtn');
  if (!box || !btn) return;

  var script = document.currentScript;
  var base = new URL('vendor/leaflet-1.9.4/', script ? script.src : window.location.href).href;
  var IGUALADA = [41.5789, 1.6175];  // plaça de l'Ajuntament
  var BARCELONA = [41.3870, 2.1700]; // plaça de Catalunya

  var t = function (ca, en, es) {
    var l = document.documentElement.getAttribute('lang');
    return l === 'en' ? en : l === 'es' ? es : ca;
  };
  box.setAttribute('aria-label', t('Mapa d\'Igualada', 'Map of Igualada', 'Mapa de Igualada'));

  function load(tag, attrs) {
    return new Promise(function (resolve, reject) {
      var el = document.createElement(tag);
      Object.keys(attrs).forEach(function (k) { el[k] = attrs[k]; });
      el.onload = resolve;
      el.onerror = reject;
      document.head.appendChild(el);
    });
  }

  var label = btn.querySelector('span') || btn;
  var original = label.textContent;

  btn.addEventListener('click', function () {
    btn.disabled = true;
    label.textContent = t('Carregant el mapa…', 'Loading the map…', 'Cargando el mapa…');
    Promise.all([
      load('link', { rel: 'stylesheet', href: base + 'leaflet.css' }),
      window.L ? Promise.resolve() : load('script', { src: base + 'leaflet.js' })
    ]).then(show, function () {
      btn.disabled = false;
      label.textContent = original;
      box.querySelector('.mapa-igualada__note').textContent =
        t('No s\'ha pogut carregar el mapa. Torna-ho a provar.', 'The map could not be loaded. Please try again.', 'No se ha podido cargar el mapa. Vuelve a intentarlo.');
    });
  });

  function show() {
    var L = window.L;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var canvas = document.createElement('div');
    canvas.className = 'mapa-igualada__canvas';
    box.appendChild(canvas);
    box.classList.add('is-loaded');

    // Comença amb tot Catalunya i s'acosta fins a Igualada i Barcelona
    var map = L.map(canvas, { scrollWheelZoom: false }).setView([41.75, 1.75], 7);
    map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a>');
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'
    }).addTo(map);

    var pin = L.divIcon({
      className: 'mapa-pin',
      html: '<span class="mapa-pin__pulse"></span><span class="mapa-pin__dot"></span>',
      iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -14]
    });
    var dot = L.divIcon({ className: 'mapa-pin mapa-pin--small', html: '<span class="mapa-pin__dot"></span>', iconSize: [14, 14], iconAnchor: [7, 7] });

    var km = Math.round(map.distance(IGUALADA, BARCELONA) / 1000);
    L.polyline([IGUALADA, BARCELONA], { color: '#2f2f96', weight: 2.5, opacity: 0.75, dashArray: '6 8', interactive: false })
      .addTo(map)
      .bindTooltip(t(km + ' km en línia recta', km + ' km in a straight line', km + ' km en línea recta'),
        { permanent: true, direction: 'center', className: 'mapa-tooltip' });
    L.marker(BARCELONA, { icon: dot, keyboard: false, interactive: false }).addTo(map)
      .bindTooltip('Barcelona', { permanent: true, direction: 'right', offset: [10, 0], className: 'mapa-label' });
    var igualada = L.marker(IGUALADA, { icon: pin, title: 'Igualada', alt: 'Igualada' }).addTo(map)
      .bindPopup('<strong>Igualada</strong><br>' + t('Capital de l\'Anoia', 'Capital of the Anoia region', 'Capital del Anoia'));

    var target = L.latLngBounds([IGUALADA, BARCELONA]).pad(0.45);
    if (reduce) {
      map.fitBounds(target);
      igualada.openPopup();
    } else {
      map.once('moveend', function () { igualada.openPopup(); });
      map.flyToBounds(target, { duration: 1.8 });
    }

    // La roda del ratolí només fa zoom després de fer clic al mapa (no
    // atrapa el desplaçament de la pàgina)
    map.on('click', function () { map.scrollWheelZoom.enable(); });
    canvas.addEventListener('mouseleave', function () { map.scrollWheelZoom.disable(); });
  }
})();
