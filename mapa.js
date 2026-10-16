/* mapa.js — Mapa interactiu d'Igualada i l'Anoia (Nosaltres → On som).
   Privacitat: el mapa NO es carrega en obrir la pàgina. Només quan el
   visitant prem «Veure el mapa interactiu» o fa una cerca, es carrega
   Leaflet (des de la mateixa web, vendor/), els límits dels 33 municipis
   (anoia.json, també de la web) i les imatges del mapa d'OpenStreetMap,
   que no fan servir cookies. Abans d'això no es connecta amb cap servei
   extern. El cercador busca entre els municipis de l'Anoia, sense cap
   servei de cerca de fora.
   Activitats del club: es llegeixen de projectes.json (mateixa web, amb
   projectes.js). Es resumeixen al costat del mapa i, amb el mapa obert,
   cada municipi on n'hi ha porta un número rosa amb la llista. */
(function () {
  'use strict';

  var box = document.getElementById('mapaIgualada');
  var openBtn = document.getElementById('mapaIgualadaBtn');
  if (!box || !openBtn) return;
  var form = document.getElementById('mapaCerca');
  var input = document.getElementById('mapaCercaInput');
  var tools = document.getElementById('mapaEines');
  var status = document.getElementById('mapaEstat');
  var impacte = document.getElementById('mapaImpacte');
  var impacteBtn = document.getElementById('mapaImpacteBtn');
  var filtres = document.getElementById('mapaFiltres');
  var P = window.RotaractProjectes;

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
  var reduceMotion = function () {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  };
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' };
  var esc = function (v) { return String(v).replace(/[&<>"']/g, function (c) { return ESC[c]; }); };
  var nActs = function (n) {
    return n === 1
      ? t('1 activitat del club', '1 club activity', '1 actividad del club')
      : t(n + ' activitats del club', n + ' club activities', n + ' actividades del club');
  };
  // Activitats del club (si no es poden llegir, el mapa funciona igual)
  var projectes = function () {
    return P ? P.load().catch(function () { return []; }) : Promise.resolve([]);
  };

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
      fetch(DATA).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }),
      projectes()
    ]).then(function (res) {
      api = build(res[2], res[3]);
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

  function build(data, llista) {
    var L = window.L;
    var reduce = reduceMotion();
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

    // Activitats per municipi, segons el filtre (totes, fetes o properament)
    var filtre = 'totes';
    var perMunicipi = {};
    llista.forEach(function (p) {
      var k = norm(p.municipi);
      (perMunicipi[k] = perMunicipi[k] || []).push(p);
    });
    function visibles(name) {
      return (perMunicipi[norm(name)] || []).filter(function (p) {
        return filtre === 'totes' || (filtre === 'fetes' ? p.fet : !p.fet);
      });
    }
    var maxActs = 1;

    // Com més activitats, més rosa el municipi (Igualada sempre destacada)
    function styleFor(name) {
      if (name === 'Igualada') return styleIgualada;
      var n = visibles(name).length;
      if (!n) return styleBase;
      return { color: PINK, weight: 1.5, opacity: 0.75, fillColor: PINK, fillOpacity: 0.08 + 0.2 * n / maxActs };
    }
    function restyle(layer) {
      layer.setStyle(L.extend({}, styleBase, styleFor(layer.feature.properties.name), layer === selected ? styleSel : {}));
    }

    var layer = L.geoJSON({ type: 'FeatureCollection', features: municipis }, {
      style: function (f) { return L.extend({}, styleBase, styleFor(f.properties.name)); },
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
    // Amb el teclat: Enter (o espai) sobre un punt o un número l'obre
    function onKey(e, name) {
      var key = e.originalEvent && e.originalEvent.key;
      if (key !== 'Enter' && key !== ' ') return;
      e.originalEvent.preventDefault();
      select(name, true);
    }
    pinMarker.on('keypress', function (e) { onKey(e, 'Igualada'); });
    var popup = L.popup({
      closeButton: true,
      autoPanPadding: [20, 20],
      maxWidth: 290,
      maxHeight: Math.max(170, Math.min(270, box.clientHeight - 130))
    });

    // Llista d'activitats d'un municipi (per a la finestra del mapa)
    function llistaHtml(items) {
      if (!items.length) return '';
      return '<div class="mapa-acts"><p class="mapa-acts__title">' + esc(nActs(items.length)) + '</p><ul class="mapa-acts__list">' +
        items.map(function (p) {
          return '<li class="mapa-acts__item' + (p.fet ? ' is-fet' : '') + '">' +
            '<span class="mapa-acts__ico" aria-hidden="true"></span>' +
            '<span class="mapa-acts__body"><span class="mapa-acts__name">' + esc(p.nom) + '</span>' +
            '<span class="mapa-acts__when">' + esc((p.fet ? t('Feta', 'Done', 'Hecha') : t('Properament', 'Coming soon', 'Próximamente')) + ' · ' + P.date(p)) + '</span>' +
            (p.xifra ? '<span class="mapa-acts__xifra">' + esc(p.xifra) + '</span>' : '') +
            '</span></li>';
        }).join('') + '</ul></div>';
    }

    function info(name, l, ambLlista) {
      var html;
      if (name === 'Igualada') {
        html = '<strong>Igualada</strong><br>' + t('Capital de l\'Anoia i seu del nostre club', 'Capital of Anoia and home of our club', 'Capital del Anoia y sede de nuestro club');
      } else {
        var km = Math.round(map.distance(IGUALADA, l.getBounds().getCenter()) / 1000);
        html = '<strong>' + esc(name) + '</strong><br>' +
          t('A ' + km + ' km d\'Igualada en línia recta', km + ' km from Igualada in a straight line', 'A ' + km + ' km de Igualada en línea recta');
      }
      if (ambLlista) html += llistaHtml(visibles(name));
      return html;
    }

    // Números rosa: quantes activitats del club hi ha a cada municipi
    var badges = {};
    function badgeIcon(n, igualada) {
      return L.divIcon({
        className: 'mapa-projectes' + (igualada ? ' mapa-projectes--igualada' : ''),
        html: '<span class="mapa-projectes__num">' + n + '</span>',
        iconSize: [26, 26],
        // A Igualada, el número va enganxat al punt, a dalt a la dreta
        iconAnchor: igualada ? [-3, 31] : [13, 13]
      });
    }
    Object.keys(perMunicipi).forEach(function (k) {
      var l = byName[k];
      if (!l) return; // municipi mal escrit a projectes.json: no surt al mapa
      var name = l.feature.properties.name;
      var m = L.marker(name === 'Igualada' ? IGUALADA : l.getBounds().getCenter(), {
        icon: badgeIcon(0, name === 'Igualada'), keyboard: true, riseOnHover: true, zIndexOffset: 1200
      });
      m.on('click', function () { select(name, true); });
      m.on('keypress', function (e) { onKey(e, name); });
      badges[name] = m;
    });

    function refresh() {
      maxActs = 1;
      Object.keys(badges).forEach(function (name) { maxActs = Math.max(maxActs, visibles(name).length); });
      Object.keys(badges).forEach(function (name) {
        var n = visibles(name).length;
        var m = badges[name];
        if (!n) { m.remove(); return; }
        m.setIcon(badgeIcon(n, name === 'Igualada'));
        if (!map.hasLayer(m)) m.addTo(map);
        var el = m.getElement();
        var label = name + ': ' + nActs(n);
        el.title = label;
        el.setAttribute('aria-label', label);
      });
      layer.eachLayer(restyle);
      if (selected && map.hasLayer(popup)) {
        popup.setContent(info(selected.feature.properties.name, selected, true));
      }
    }
    refresh();

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
      var open = function () { popup.setLatLng(where).setContent(info(realName, l, true)).openOn(map); };
      var target = l.getBounds().pad(realName === 'Igualada' ? 0.6 : 0.35);
      if (reduce || fromMap) { map.fitBounds(target, { maxZoom: 13 }); open(); }
      else { map.once('moveend', open); map.flyToBounds(target, { maxZoom: 13, duration: 1.2 }); }
      var n = visibles(realName).length;
      var extra = n ? ' · ' + nActs(n) : '';
      if (realName === 'Igualada') {
        say(t('Igualada: capital de l\'Anoia i seu del nostre club', 'Igualada: capital of Anoia and home of our club', 'Igualada: capital del Anoia y sede de nuestro club') + extra);
      } else {
        var km = Math.round(map.distance(IGUALADA, l.getBounds().getCenter()) / 1000);
        say(t(realName + ': a ' + km + ' km d\'Igualada en línia recta', realName + ': ' + km + ' km from Igualada in a straight line', realName + ': a ' + km + ' km de Igualada en línea recta') + extra);
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
      if (selected) return;
      var n = visibles('Igualada').length;
      popup.setLatLng(IGUALADA).setContent(info('Igualada') + (n
        ? '<span class="mapa-acts__hint">' + esc(nActs(n) + ' · ' + t('toca el número rosa per veure-les', 'tap the pink number to see them', 'toca el número rosa para verlas')) + '</span>'
        : '')).openOn(map);
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
    // Filtres de les activitats
    if (filtres && Object.keys(badges).length) {
      filtres.hidden = false;
      filtres.setAttribute('aria-label', t('Filtra les activitats del club', 'Filter the club activities', 'Filtra las actividades del club'));
      filtres.addEventListener('click', function (e) {
        var b = e.target.closest('[data-filtre]');
        if (!b) return;
        filtre = b.getAttribute('data-filtre');
        filtres.querySelectorAll('[data-filtre]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        refresh();
        var total = Object.keys(badges).reduce(function (sum, name) { return sum + visibles(name).length; }, 0);
        say(filtre === 'fetes'
          ? t('Activitats fetes: ' + total, 'Activities done: ' + total, 'Actividades hechas: ' + total)
          : filtre === 'properament'
            ? t('Activitats que vindran: ' + total, 'Upcoming activities: ' + total, 'Próximas actividades: ' + total)
            : t('Totes les activitats del club: ' + total, 'All club activities: ' + total, 'Todas las actividades del club: ' + total));
      });
    }

    say(t('Mapa carregat. Toca un municipi o fes servir el cercador.', 'Map loaded. Tap a town or use the search.', 'Mapa cargado. Toca un municipio o usa el buscador.'));
    return { select: select, showAnoia: showAnoia, names: municipis.map(function (f) { return f.properties.name; }) };
  }

  openBtn.addEventListener('click', function () { ensureMap().catch(function () {}); });

  // Resum de les activitats del club, al costat del mapa
  var focus = 'Igualada'; // on porta «Veure-les al mapa»: el municipi amb més activitats
  function countUp(el, n) {
    if (!n || reduceMotion() || !('IntersectionObserver' in window)) { el.textContent = n; return; }
    el.textContent = '0';
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      var t0 = performance.now();
      (function step(now) {
        var k = Math.min(1, (now - t0) / 900);
        el.textContent = Math.round(n * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    });
    io.observe(el);
  }
  if (impacte) {
    projectes().then(function (llista) {
      if (!llista.length) return;
      var q = function (key) { return impacte.querySelector('[data-impacte="' + key + '"]'); };
      var properes = llista.filter(function (p) { return !p.fet; });
      countUp(q('fetes'), llista.length - properes.length);
      countUp(q('properes'), properes.length);
      if (properes.length) {
        q('quan').textContent = P.date(properes[0]);
        q('nom').textContent = properes[0].nom;
        q('seguent').hidden = false;
      }
      var compte = {};
      llista.forEach(function (p) {
        compte[p.municipi] = (compte[p.municipi] || 0) + 1;
        if (compte[p.municipi] > (compte[focus] || 0)) focus = p.municipi;
      });
      impacte.hidden = false;
    });
  }
  if (impacteBtn) {
    impacteBtn.addEventListener('click', function () {
      box.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'center' });
      ensureMap().then(function (m) { m.select(focus); }).catch(function () {});
    });
  }

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
