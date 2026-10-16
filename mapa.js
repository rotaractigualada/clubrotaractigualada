/* mapa.js — Mapa interactiu d'Igualada i l'Anoia (Nosaltres → On som).
   Privacitat: el mapa NO es carrega en obrir la pàgina. Només quan el
   visitant prem «Veure el mapa interactiu» o fa una cerca, es carrega
   Leaflet (des de la mateixa web, vendor/), els límits dels 33 municipis
   (anoia.json, també de la web) i les imatges del mapa d'OpenStreetMap,
   que no fan servir cookies. Abans d'això no es connecta amb cap servei
   extern. El cercador busca entre els municipis de l'Anoia, sense cap
   servei de cerca de fora. */
(function () {
  'use strict';

  var box = document.getElementById('mapaIgualada');
  var openBtn = document.getElementById('mapaIgualadaBtn');
  if (!box || !openBtn) return;
  var form = document.getElementById('mapaCerca');
  var input = document.getElementById('mapaCercaInput');
  var tools = document.getElementById('mapaEines');
  var status = document.getElementById('mapaEstat');

  var script = document.currentScript;
  var here = script ? script.src : window.location.href;
  var LEAFLET = new URL('vendor/leaflet-1.9.4/', here).href;
  var DATA = new URL('anoia.json', here).href;
  var IGUALADA = [41.5789, 1.6175]; // plaça de l'Ajuntament
  var PINK = '#DA1A5D', BLUE = '#2F2F96';

  var t = function (ca, en, es) {
    var l = document.documentElement.getAttribute('lang');
    return l === 'en' ? en : l === 'es' ? es : ca;
  };
  box.setAttribute('aria-label', t('Mapa d\'Igualada i l\'Anoia', 'Map of Igualada and Anoia', 'Mapa de Igualada y el Anoia'));
  var say = function (text) { if (status) status.textContent = text; };

  // Per comparar noms sense accents, majúscules ni articles («el Bruc» = «bruc»)
  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[’'·.-]/g, ' ').replace(/^\s*(el|la|els|les|l)\s+/, '').replace(/\s+/g, ' ').trim();
  }

  function load(tag, attrs) {
    return new Promise(function (resolve, reject) {
      var el = document.createElement(tag);
      Object.keys(attrs).forEach(function (k) { el[k] = attrs[k]; });
      el.onload = resolve;
      el.onerror = reject;
      document.head.appendChild(el);
    });
  }

  var ready = null;   // promesa: el mapa carregat
  var api = null;     // { select, showAnoia }

  function ensureMap() {
    if (ready) return ready;
    openBtn.disabled = true;
    var label = openBtn.querySelector('span');
    var original = label.textContent;
    label.textContent = t('Carregant el mapa…', 'Loading the map…', 'Cargando el mapa…');
    ready = Promise.all([
      load('link', { rel: 'stylesheet', href: LEAFLET + 'leaflet.css' }),
      window.L ? Promise.resolve() : load('script', { src: LEAFLET + 'leaflet.js' }),
      fetch(DATA).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    ]).then(function (res) {
      api = build(res[2]);
      return api;
    }, function (err) {
      ready = null;
      openBtn.disabled = false;
      label.textContent = original;
      say(t('No s\'ha pogut carregar el mapa. Torna-ho a provar.', 'The map could not be loaded. Please try again.', 'No se ha podido cargar el mapa. Vuelve a intentarlo.'));
      throw err;
    });
    return ready;
  }

  function build(data) {
    var L = window.L;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var canvas = document.createElement('div');
    canvas.className = 'mapa-igualada__canvas';
    box.appendChild(canvas);
    box.classList.add('is-loaded');

    var map = L.map(canvas, { scrollWheelZoom: false, zoomSnap: 0.25 }).setView([41.75, 1.75], 7);
    map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a>');
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> · ' +
        t('Límits', 'Boundaries', 'Límites') + ' &copy; <a href="https://www.ign.es" target="_blank" rel="noopener noreferrer">IGN</a>'
    }).addTo(map);

    var styleBase = { color: BLUE, weight: 1, opacity: 0.45, fillColor: BLUE, fillOpacity: 0.05 };
    var styleHover = { weight: 2, opacity: 0.9, fillOpacity: 0.16 };
    var styleSel = { color: PINK, weight: 3, opacity: 1, fillColor: PINK, fillOpacity: 0.18 };
    var styleIgualada = { color: PINK, weight: 2, opacity: 0.9, fillColor: PINK, fillOpacity: 0.22 };

    var comarca = data.features.filter(function (f) { return f.properties.comarca; })[0];
    var municipis = data.features.filter(function (f) { return !f.properties.comarca; });
    var byName = {};
    var selected = null;

    function baseStyle(layer) {
      return layer.feature.properties.name === 'Igualada' ? styleIgualada : styleBase;
    }
    function restyle(layer) {
      layer.setStyle(L.extend({}, styleBase, baseStyle(layer), layer === selected ? styleSel : {}));
    }

    var layer = L.geoJSON({ type: 'FeatureCollection', features: municipis }, {
      style: function (f) { return f.properties.name === 'Igualada' ? styleIgualada : styleBase; },
      onEachFeature: function (f, l) {
        byName[norm(f.properties.name)] = l;
        l.bindTooltip(f.properties.name, { sticky: true, direction: 'top', className: 'mapa-label', offset: [0, -6] });
        l.on('mouseover', function () { if (l !== selected) l.setStyle(styleHover); });
        l.on('mouseout', function () { restyle(l); });
        l.on('click', function () { select(f.properties.name, true); });
      }
    }).addTo(map);
    var outline = L.geoJSON(comarca, { style: { color: BLUE, weight: 3, opacity: 0.85, fill: false }, interactive: false }).addTo(map);
    var anoiaBounds = outline.getBounds();

    var pin = L.divIcon({
      className: 'mapa-pin',
      html: '<span class="mapa-pin__pulse"></span><span class="mapa-pin__dot"></span>',
      iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -14]
    });
    var pinMarker = L.marker(IGUALADA, { icon: pin, title: 'Igualada', alt: 'Igualada', zIndexOffset: 1000 }).addTo(map);
    pinMarker.on('click', function () { select('Igualada', true); });
    var popup = L.popup({ closeButton: true, autoPanPadding: [20, 20] });

    function info(name, l) {
      if (name === 'Igualada') {
        return '<strong>Igualada</strong><br>' + t('Capital de l\'Anoia i seu del nostre club', 'Capital of Anoia and home of our club', 'Capital del Anoia y sede de nuestro club');
      }
      var km = Math.round(map.distance(IGUALADA, l.getBounds().getCenter()) / 1000);
      return '<strong>' + name + '</strong><br>' +
        t('A ' + km + ' km d\'Igualada en línia recta', km + ' km from Igualada in a straight line', 'A ' + km + ' km de Igualada en línea recta');
    }

    function select(name, fromMap) {
      var l = byName[norm(name)];
      if (!l) return false;
      var prev = selected;
      selected = l;
      if (prev) restyle(prev);
      restyle(l);
      l.bringToFront();
      var realName = l.feature.properties.name;
      var where = realName === 'Igualada' ? L.latLng(IGUALADA) : l.getBounds().getCenter();
      var open = function () { popup.setLatLng(where).setContent(info(realName, l)).openOn(map); };
      var target = l.getBounds().pad(realName === 'Igualada' ? 0.6 : 0.35);
      if (reduce || fromMap) { map.fitBounds(target, { maxZoom: 13 }); open(); }
      else { map.once('moveend', open); map.flyToBounds(target, { maxZoom: 13, duration: 1.2 }); }
      if (realName === 'Igualada') {
        say(t('Igualada: capital de l\'Anoia i seu del nostre club', 'Igualada: capital of Anoia and home of our club', 'Igualada: capital del Anoia y sede de nuestro club'));
      } else {
        var km = Math.round(map.distance(IGUALADA, l.getBounds().getCenter()) / 1000);
        say(t(realName + ': a ' + km + ' km d\'Igualada en línia recta', realName + ': ' + km + ' km from Igualada in a straight line', realName + ': a ' + km + ' km de Igualada en línea recta'));
      }
      return true;
    }

    function showAnoia() {
      if (selected) { var prev = selected; selected = null; restyle(prev); }
      map.closePopup();
      if (reduce) map.fitBounds(anoiaBounds, { padding: [16, 16] });
      else map.flyToBounds(anoiaBounds, { padding: [16, 16], duration: 1.2 });
      say(t('Comarca de l\'Anoia: 33 municipis', 'Anoia region: 33 towns', 'Comarca del Anoia: 33 municipios'));
    }

    // Entrada: de Catalunya a l'Anoia, i Igualada destacada
    if (reduce) {
      map.fitBounds(anoiaBounds, { padding: [16, 16] });
    } else {
      map.flyToBounds(anoiaBounds, { padding: [16, 16], duration: 1.8 });
    }
    map.once('moveend', function () {
      if (!selected) popup.setLatLng(IGUALADA).setContent(info('Igualada')).openOn(map);
    });

    // La roda del ratolí només fa zoom després de fer clic al mapa
    map.on('click', function () { map.scrollWheelZoom.enable(); });
    canvas.addEventListener('mouseleave', function () { map.scrollWheelZoom.disable(); });

    // Eines
    if (tools) {
      tools.hidden = false;
      var fs = tools.querySelector('[data-mapa="pantalla"]');
      if (fs && document.fullscreenEnabled && box.requestFullscreen) fs.hidden = false;
      tools.addEventListener('click', function (e) {
        var b = e.target.closest('[data-mapa]');
        if (!b) return;
        var what = b.getAttribute('data-mapa');
        if (what === 'igualada') select('Igualada');
        else if (what === 'anoia') showAnoia();
        else if (what === 'pantalla') {
          if (document.fullscreenElement) document.exitFullscreen();
          else box.requestFullscreen().catch(function () { /* el navegador no ho permet */ });
        }
      });
      document.addEventListener('fullscreenchange', function () {
        box.classList.toggle('is-fullscreen', document.fullscreenElement === box);
        setTimeout(function () { map.invalidateSize(); }, 150);
      });
    }
    say(t('Mapa carregat. Toca un municipi o fes servir el cercador.', 'Map loaded. Tap a town or use the search.', 'Mapa cargado. Toca un municipio o usa el buscador.'));
    return { select: select, showAnoia: showAnoia, names: municipis.map(function (f) { return f.properties.name; }) };
  }

  openBtn.addEventListener('click', function () { ensureMap().catch(function () {}); });

  if (form && input) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = input.value;
      if (!norm(q)) { input.focus(); return; }
      ensureMap().then(function (m) {
        if (m.select(q)) return;
        // Coincidència parcial: el primer municipi que comenci (o contingui) el text
        var n = norm(q);
        var hit = m.names.filter(function (x) { return norm(x).indexOf(n) === 0; })[0] ||
                  m.names.filter(function (x) { return norm(x).indexOf(n) !== -1; })[0];
        if (hit) { m.select(hit); input.value = hit; return; }
        say(t('No hem trobat «' + q + '» a l\'Anoia. Prova amb un altre nom, per exemple Calaf o Capellades.',
              'We could not find «' + q + '» in Anoia. Try another name, for example Calaf or Capellades.',
              'No hemos encontrado «' + q + '» en el Anoia. Prueba con otro nombre, por ejemplo Calaf o Capellades.'));
      }).catch(function () {});
    });
  }
})();
