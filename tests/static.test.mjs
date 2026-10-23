/* Comprovacions estàtiques de l'HTML (sense navegador ni servidor):
   enllaços i recursos locals, àncores, metadades SEO, versions per idioma
   (arrel = català, /es/, /en/) i accessibilitat bàsica. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname, normalize } from 'node:path';
import { ROOT, PAGES, read } from './helpers.mjs';

const SITE = 'https://rotaractigualada.org';
const VERSIONS = [
  { lang: 'ca', dir: '' },
  { lang: 'es', dir: 'es/' },
  { lang: 'en', dir: 'en/' }
];
const urlOf = (lang, page) => SITE + (lang === 'ca' ? '/' : `/${lang}/`) + (page === 'index.html' ? '' : page);

const stripComments = (html) => html.replace(/<!--[\s\S]*?-->/g, '');
const ids = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const attrs = (html, attr) => [...html.matchAll(new RegExp(`\\s${attr}="([^"]*)"`, 'g'))].map((m) => m[1]);

for (const { lang, dir } of VERSIONS) {
  for (const page of PAGES) {
    const file = dir + page;
    const html = stripComments(read(file));

    test(`${file}: els fitxers locals enllaçats existeixen`, () => {
      const srcset = attrs(html, 'srcset').flatMap((s) => s.split(',').map((p) => p.trim().split(/\s+/)[0]));
      const refs = [...attrs(html, 'href'), ...attrs(html, 'src'), ...srcset]
        .filter((u) => u && !/^(https?:|mailto:|tel:|#|data:)/.test(u))
        .map((u) => u.split(/[?#]/)[0])
        .filter(Boolean);
      for (const ref of refs) {
        const path = ref.startsWith('/') ? join(ROOT, ref) : normalize(join(ROOT, dirname(file), ref));
        assert.ok(existsSync(path), `${file} enllaça ${ref}, que no existeix`);
      }
    });

    test(`${file}: les àncores apunten a ids existents`, () => {
      for (const href of attrs(html, 'href')) {
        const m = href.match(/^([\w-]+\.html)?#(.+)$/);
        if (!m) continue;
        const target = m[1] ? read(dir + m[1]) : html;
        assert.ok(ids(target).has(m[2]), `${file}: ${href} no té destí`);
      }
    });

    test(`${file}: metadades SEO i idioma`, () => {
      assert.match(html, new RegExp(`<html lang="${lang}"`));
      assert.match(html, /<title[^>]*>[^<]{10,}<\/title>/);
      assert.match(html, /<meta name="description" content="[^"]{50,}">/);
      assert.ok(html.includes(`<link rel="canonical" href="${urlOf(lang, page)}">`), 'canonical d\'aquesta versió');
      assert.match(html, /<meta property="og:image" content="https:\/\//);
      for (const l of ['ca', 'es', 'en']) {
        assert.ok(html.includes(`hreflang="${l}" href="${urlOf(l, page)}"`), `falta hreflang ${l}`);
      }
      assert.ok(html.includes(`hreflang="x-default" href="${urlOf('ca', page)}"`), 'falta hreflang x-default');
      assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, 'ha de tenir exactament un <h1>');
    });

    test(`${file}: accessibilitat bàsica`, () => {
      for (const img of html.match(/<img\b[^>]*>/g) || []) {
        assert.match(img, /\salt="/, `imatge sense alt: ${img}`);
      }
      const idList = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
      const dups = idList.filter((v, i) => idList.indexOf(v) !== i);
      assert.deepEqual(dups, [], 'ids duplicats');
      assert.match(html, /class="skip-link" href="#contingut"/);
      assert.ok(ids(html).has('contingut'));
      assert.match(html, /id="mobileNav"[^>]*\sinert/, 'el menú mòbil tancat ha de ser inert');
      // Cap script inline executable (la CSP no ho permet)
      const inline = [...html.matchAll(/<script(?![^>]*\ssrc=)([^>]*)>/g)]
        .filter((m) => !/type="application\/ld\+json"/.test(m[1]));
      assert.deepEqual(inline.map((m) => m[0]), [], 'scripts inline bloquejats per la CSP');
    });
  }
}

test('sitemap.xml: les 15 adreces (3 idiomes) existeixen i porten alternates', () => {
  const xml = read('sitemap.xml');
  const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
  assert.equal(locs.length, PAGES.length * 3);
  for (const loc of locs) {
    const path = loc.replace(SITE + '/', '');
    const file = path === '' || path.endsWith('/') ? path + 'index.html' : path;
    assert.ok(existsSync(join(ROOT, file)), `${loc} no correspon a cap fitxer`);
  }
  assert.equal((xml.match(/hreflang="x-default"/g) || []).length, PAGES.length * 3);
});

test('robots.txt: permès i apunta al sitemap', () => {
  assert.match(read('robots.txt'), /Sitemap: https:\/\/rotaractigualada\.org\/sitemap\.xml/);
  // .htaccess bloqueja els .txt però ha de fer una excepció per a robots.txt
  assert.match(read('.htaccess'), /<Files "robots\.txt">\s*Require all granted/);
});

test('.htaccess: el directori de dades del formulari no és accessible', () => {
  assert.match(read('.htaccess'), /RedirectMatch 404 \^\/form-data/);
});

test('index.html: JSON-LD vàlid', () => {
  const m = read('index.html').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(m, 'falta el JSON-LD');
  const data = JSON.parse(m[1]);
  assert.equal(data['@context'], 'https://schema.org');
  assert.equal(data.url, 'https://rotaractigualada.org/');
});

test('index.html: publicacions d\'Instagram com a targetes pròpies (sense embed.js)', () => {
  const html = read('index.html');
  assert.ok(!html.includes('instagram.com/embed.js'), 'no ha de carregar el script d\'Instagram');
  const posts = [...html.matchAll(/<a class="ig-post" href="(https:\/\/www\.instagram\.com\/p\/[\w-]+\/)"[\s\S]*?<img src="([^"]+)"/g)];
  assert.ok(posts.length >= 3, 'hi ha d\'haver almenys 3 publicacions');
  for (const [, , img] of posts) assert.ok(existsSync(join(ROOT, img)), `falta la imatge ${img}`);
});

test('sense cookies: ni avís ni política de cookies, ni Google Analytics; estadístiques amb GoatCounter', () => {
  for (const { dir } of VERSIONS) {
    for (const page of PAGES) {
      const html = read(dir + page);
      assert.doesNotMatch(html, /politicaCookiesModal|open-politica-cookies/, `${dir + page}: encara té la política de cookies`);
      // La política de privacitat explica que no hi ha cookies
      assert.match(html, /id="politicaPrivacitatModal"[\s\S]*data-en="This website does not use cookies\./, `${dir + page}: la privacitat ha de dir que no hi ha cookies`);
    }
  }
  assert.doesNotMatch(read('legal-modals.js'), /cookies/i);
  for (const page of PAGES) {
    const html = read(page);
    assert.doesNotMatch(html, /cookie-banner/, `${page} encara carrega l'avís de cookies`);
    assert.doesNotMatch(html, /googletagmanager|google-analytics|gtag\(/, `${page} encara fa referència a Google Analytics`);
    assert.match(html, /<script src="analytics\.js(\?v=[0-9a-f]+)?"><\/script>/);
    assert.match(html, /GoatCounter/, `${page}: la política de privacitat ha d'explicar GoatCounter`);
  }
  const js = read('analytics.js');
  assert.match(js, /https:\/\/rotaractigualada\.goatcounter\.com\/count/);
  assert.doesNotMatch(js, /localStorage|document\.cookie/, 'analytics.js no ha de desar res al dispositiu');
  assert.match(js, /globalPrivacyControl/);
  const h = read('.htaccess');
  assert.doesNotMatch(h, /googletagmanager|google-analytics/);
  assert.match(h, /img-src 'self' data: https:\/\/rotaractigualada\.goatcounter\.com/);
  assert.match(h, /script-src 'self';/);
});

test('icones amb versió (?v=hash): quan canvien, navegadors i Google agafen les noves', () => {
  for (const page of PAGES) {
    const html = read(page);
    for (const icon of ['favicon\\.ico', 'favicon-96\\.png', 'favicon-192\\.png', 'apple-touch-icon\\.png']) {
      assert.match(html, new RegExp(`href="${icon}\\?v=[0-9a-f]{8}"`), `${page}: ${icon} sense versió (npm run build:idiomes)`);
    }
  }
});

test('tipografies servides des de la mateixa web (sense Google Fonts: no s\'envia la IP dels visitants a Google)', () => {
  for (const page of PAGES) {
    const html = read(page);
    assert.doesNotMatch(html, /fonts\.(googleapis|gstatic)\.com/, `${page} encara carrega Google Fonts`);
    assert.match(html, /<link rel="stylesheet" href="fonts\.css(\?v=[0-9a-f]+)?">/, `${page} no carrega fonts.css`);
  }
  const css = read('fonts.css');
  const files = [...css.matchAll(/url\(fonts\/([\w.-]+\.woff2)\)/g)].map((m) => m[1]);
  assert.ok(files.length >= 16, 'falten @font-face a fonts.css');
  for (const f of files) assert.ok(existsSync(join(ROOT, 'fonts', f)), `falta fonts/${f}`);
  for (const family of ['Montserrat', 'Poppins', 'Playfair Display']) assert.match(css, new RegExp(`font-family: '${family}'`));
  const h = read('.htaccess');
  assert.doesNotMatch(h, /fonts\.(googleapis|gstatic)\.com/);
  assert.match(h, /font-src 'self';/);
});

test('.htaccess: el logo dels correus es pot carregar des de Gmail i altres programes de correu', () => {
  const h = read('.htaccess');
  // La resta de la web continua amb «same-origin»; només el logo n'és l'excepció
  assert.match(h, /Header always set Cross-Origin-Resource-Policy "same-origin"/);
  assert.match(h, /<Files "logo-correu\.png">\s*<IfModule mod_headers\.c>\s*Header always set Cross-Origin-Resource-Policy "cross-origin"/);
  assert.ok(existsSync(join(ROOT, 'logo-correu.png')), 'falta logo-correu.png');
  assert.match(read('form-handler.php'), /SITE_URL \. '\/logo-correu\.png'/);
});

test('.htaccess: només form-handler.php i instagram-feed.php, fitxers ocults bloquejats i security.txt accessible', () => {
  const h = read('.htaccess');
  assert.match(h, /<FilesMatch "\\\.\(php/);
  // Els únics PHP permesos (el token d'Instagram és a form-data/, que dona 404)
  const allowed = [...h.matchAll(/<(?:Files|FilesMatch) "([^"]+)">\s*Require all granted/g)].map((m) => m[1]).filter((v) => /php/.test(v));
  assert.deepEqual(allowed, ['^(form-handler|instagram-feed)\\.php$']);
  assert.match(h, /RedirectMatch 404 \^\/form-data\(\/\|\$\)/);
  assert.match(read('instagram-feed.php'), /IG_TOKEN_FILE = __DIR__ \. '\/form-data\/instagram-token\.txt'/);
  assert.match(h, /RedirectMatch 404 \/\\\.\(\?!well-known/);
  assert.match(h, /form-action 'self'/);
  assert.doesNotMatch(h, /jotform/i);
  assert.match(h, /<Files "security\.txt">\s*Require all granted/);
  const sec = read('.well-known/security.txt');
  assert.match(sec, /^Contact: mailto:/m);
  const expires = sec.match(/^Expires: (.+)$/m);
  assert.ok(expires && new Date(expires[1]) > new Date(), 'security.txt caducat');
});

test('cap enllaç obre una aplicació externa de correu (mailto:)', () => {
  for (const { dir } of VERSIONS) {
    for (const page of PAGES) {
      assert.ok(!read(dir + page).includes('mailto:'), `${dir + page} té un enllaç mailto:`);
    }
  }
});

test('Contacte: dos formularis que s\'envien a form-handler.php', () => {
  const html = read('contacte.html');
  for (const id of ['form-info', 'form-unir']) {
    assert.match(html, new RegExp(`<form[^>]*id="${id}"[^>]*action="/form-handler\\.php" method="post"`));
  }
  assert.match(read('.htaccess'), /<FilesMatch "\^\(form-handler\|instagram-feed\)\\\.php\$">\s*Require all granted/);
});

/* Diccionaris castellans d'i18n.js (clau = text de data-en) */
function esMaps() {
  const src = read('i18n.js');
  const get = (name) => new Function('return ' + src.match(new RegExp(`var ${name} = (\\{[\\s\\S]*?\\n  \\});`))[1])();
  return { text: get('ES_MAP'), html: get('ES_MAP_HTML'), ph: get('ES_MAP_PH') };
}
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#0?39;|&#x27;/g, '\'').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

test('tots els textos amb data-en tenen traducció al castellà (i18n.js)', () => {
  const es = esMaps();
  for (const page of PAGES) {
    const html = stripComments(read(page));
    for (const m of html.matchAll(/<[^>]*\sdata-en="([^"]*)"[^>]*>/g)) {
      const key = decode(m[1]);
      const map = /\sdata-en-is-html/.test(m[0]) ? es.html : es.text;
      assert.ok(key in map, `${page}: falta la traducció al castellà de «${key}»`);
    }
    for (const m of html.matchAll(/\sdata-en-placeholder="([^"]*)"/g)) {
      assert.ok(decode(m[1]) in es.ph, `${page}: falta el placeholder en castellà «${m[1]}»`);
    }
  }
});

const AREES = ['aigua', 'economia', 'educacio', 'malalties', 'maternoinfantil', 'medi', 'pau'];

test('projectes.json: activitats vàlides (municipi de l\'Anoia, dates, àrea de Rotary i nom en 3 idiomes)', () => {
  const { activitats } = JSON.parse(read('projectes.json'));
  const municipis = new Set(JSON.parse(read('anoia.json')).features
    .filter((f) => !f.properties.comarca).map((f) => f.properties.name));
  const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) === d;
  assert.ok(Array.isArray(activitats) && activitats.length > 0, 'hi ha d\'haver activitats');
  for (const a of activitats) {
    const nom = a.nom && a.nom.ca;
    assert.ok(a.nom && a.nom.ca && a.nom.es && a.nom.en, `nom en català, castellà i anglès: ${JSON.stringify(a.nom)}`);
    assert.ok(municipis.has(a.municipi), `${nom}: «${a.municipi}» no és cap dels 33 municipis de l'Anoia (escriu-lo com al mapa)`);
    assert.ok(isDate(a.data), `${nom}: la data ha de ser AAAA-MM-DD i existir (${a.data})`);
    if (a.fi) assert.ok(isDate(a.fi) && a.fi >= a.data, `${nom}: la data de fi (${a.fi}) no és vàlida`);
    if ('area' in a) assert.ok(AREES.includes(a.area), `${nom}: l'àrea «${a.area}» no és cap de les 7 àrees de Rotary (${AREES.join(', ')})`);
    if (a.estat) assert.match(a.estat, /^(feta|cancel·lada)$/, `${nom}: estat «${a.estat}» (feta o cancel·lada)`);
  }
});

test('portada: test «Amb quina àrea de Rotary connectes més?» entre Instagram i Uneix-te: 7 preguntes amb una resposta per àrea i un resultat per àrea', () => {
  const html = stripComments(read('index.html'));
  const pos = (id) => html.indexOf(`id="${id}"`);
  assert.ok(pos('instagram') < pos('test') && pos('test') < pos('contacte'), 'el test va entre Instagram i Uneix-te');
  const sec = html.slice(pos('test'), pos('contacte'));
  const steps = sec.split('<div class="quiz__step');
  const questions = steps.find((x) => x.includes('data-step="preguntes"')).split('<div class="quiz__q"').slice(1);
  assert.equal(questions.length, 7, '7 preguntes');
  // Preguntes per a tothom, no només per a qui viu a Igualada
  for (const q of questions) assert.doesNotMatch(q, /Igualada|Anoia|comarca|€/, 'preguntes sense referències locals ni diners');
  questions.forEach((q, i) => {
    const arees = [...q.matchAll(/class="quiz__opt" data-area="(\w+)"/g)].map((m) => m[1]).sort();
    assert.deepEqual(arees, AREES, `pregunta ${i + 1}: una resposta de cada àrea de Rotary`);
  });
  const result = steps.find((x) => x.includes('data-step="resultat"'));
  const blocks = result.split('<div class="quiz__res" ').slice(1);
  assert.deepEqual(blocks.map((b) => b.match(/^data-area="(\w+)" hidden>/)[1]).sort(), AREES, 'un resultat per àrea');
  for (const b of blocks) {
    const area = b.match(/^data-area="(\w+)"/)[1];
    assert.equal((b.match(/<ul class="quiz__chips">([\s\S]*?)<\/ul>/)[1].match(/<li>/g) || []).length, 3, `${area}: 3 motius`);
    assert.equal((b.match(/<ul class="quiz__ideas">([\s\S]*?)<\/ul>/)[1].match(/<li>/g) || []).length, 3, `${area}: 3 idees per al club`);
    assert.match(b, /class="quiz__area-fact"/, `${area}: dada de Rotary`);
    assert.match(b, /<p class="quiz__area-source">[\s\S]*?<a href="https:\/\/www\.(rotary|endpolio)\.org\/[^"]+" target="_blank" rel="noopener noreferrer">/, `${area}: la dada enllaça la font oficial`);
    assert.match(b, /class="quiz__res-short" hidden>/, `${area}: nom curt per a la barreja`);
  }
  assert.match(result, /href="contacte\.html#uneix-te"/, 'el resultat porta a «Uneix-te»');
  assert.match(result, /data-quiz="copy"/, 'es pot copiar el resultat');
  assert.match(html, /<script src="projectes\.js[^"]*"><\/script>\s*<script src="test-voluntari\.js/);
});

test('.htaccess: la web pot llegir els .json que fa servir (mapa i activitats), però no la resta', () => {
  const h = read('.htaccess');
  const granted = [...h.matchAll(/<(Files|FilesMatch) "([^"]+)">\s*Require all granted/g)]
    .map(([, kind, v]) => (kind === 'Files' ? (f) => f === v : (f) => new RegExp(v).test(f)));
  const allowed = (f) => granted.some((ok) => ok(f));
  // .json que demana el JavaScript de la web
  const used = new Set();
  for (const js of ['mapa.js', 'projectes.js', 'test-voluntari.js', 'grups.js']) {
    for (const m of read(js).matchAll(/['"]([\w-]+\.json)['"]/g)) used.add(m[1]);
  }
  assert.ok(used.has('anoia.json') && used.has('projectes.json') && used.has('grups.json'));
  for (const f of used) {
    assert.ok(existsSync(join(ROOT, f)), `falta ${f}`);
    assert.ok(allowed(f), `${f}: el bloqueig de .json de l'.htaccess el deixaria en 403`);
  }
  for (const f of ['package.json', 'package-lock.json', 'composer.json', 'dades.json']) {
    assert.ok(!allowed(f), `${f} no hauria de ser públic`);
  }
});

test('la galeria és a Activitats (pestanya Galeria) i no a la portada; els menús hi porten', () => {
  const home = stripComments(read('index.html'));
  assert.doesNotMatch(home, /class="galeria__grid|galeria\.js/, 'la portada ja no té la galeria');
  const act = stripComments(read('activitats.html'));
  assert.match(act, /<button type="button" class="act-hero__tab-btn" data-tab="galeria">/);
  assert.match(act, /<section class="act-section act-section--light act-tab-section" id="galeria">[\s\S]*class="galeria-album"[\s\S]*class="galeria__grid galeria__grid--mosaic"/);
  assert.match(act, /<script src="galeria\.js[^"]*"><\/script>/);
  assert.match(act, /<a href="#galeria" class="act-btn act-btn--primary act-feature__cta">/, '«Veure les fotos» porta a la pestanya');
  assert.match(read('activitats.js'), /validTabs\s*=\s*\[[^\]]*'galeria'/);
  for (const page of PAGES) {
    const html = stripComments(read(page));
    assert.doesNotMatch(html, /index\.html#galeria/, `${page}: encara enllaça la galeria de la portada`);
    assert.match(html, /<li><a href="activitats\.html#galeria" class="mobile-nav__sublink" data-en="Gallery">Galeria<\/a><\/li>/, `${page}: menú mòbil`);
    assert.match(html, /<li><a href="activitats\.html#galeria" data-en="Gallery">Galeria<\/a><\/li>[\s\S]*<li><a href="activitats\.html#galeria" data-en="Gallery">Galeria<\/a><\/li>/, `${page}: menú d'escriptori i peu`);
  }
});

test('dades estructurades de la portada: el club, la web, l\'Instagram i el perfil de Google', () => {
  for (const page of ['index.html', 'es/index.html', 'en/index.html']) {
    const blocks = [...read(page).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    const ngo = blocks.find((b) => b['@type'] === 'NGO');
    assert.ok(ngo, `${page}: falta el bloc NGO`);
    assert.equal(ngo.name, "Club Rotaract d'Igualada");
    assert.equal(ngo.url, 'https://rotaractigualada.org/');
    assert.ok(ngo.sameAs.includes('https://www.instagram.com/rotaractigualada/'), `${page}: Instagram a sameAs`);
    assert.ok(ngo.sameAs.some((u) => /^https:\/\/maps\.app\.goo\.gl\/\w+$/.test(u)), `${page}: perfil de Google (Maps) a sameAs`);
    const site = blocks.find((b) => b['@type'] === 'WebSite');
    assert.ok(site && site.url === 'https://rotaractigualada.org/', `${page}: falta el bloc WebSite`);
    assert.equal(site.publisher['@id'], ngo['@id'], `${page}: la web la publica el club`);
    assert.match(read(page), /<meta name="description" content="(Web oficial|Official website)/, `${page}: la descripció diu que és la web oficial`);
  }
});

test('portada: Instagram amb perfil, destacades, publicacions, QR i Instagram automàtic', () => {
  const html = stripComments(read('index.html'));
  const start = html.indexOf('id="instagram"');
  const sec = html.slice(start, html.indexOf('</section>', start));
  const PROFILE = 'https://www.instagram.com/rotaractigualada/';
  // Perfil i botó de seguir (enllaç normal: s'obre a Instagram en una pestanya nova)
  assert.match(sec, /<h2 class="ig-profile__user" id="igTitle">@rotaractigualada<\/h2>/);
  assert.match(sec, new RegExp(`<a class="ig-profile__follow" href="${PROFILE}" target="_blank" rel="noopener noreferrer">`));
  // Destacades: 7 enllaços dins la mateixa web (els destins els comprova el test d'àncores)
  const highlights = [...sec.matchAll(/<a class="ig-highlight" href="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(highlights.length, 7);
  for (const href of highlights) assert.doesNotMatch(href, /^https?:/, `${href}: les destacades porten a la web`);
  // Publicacions fixes (3 o 6) i el contenidor que omple instagram.js
  const posts = sec.match(/<a class="ig-post" href="https:\/\/www\.instagram\.com\/p\/[\w-]+\/" target="_blank" rel="noopener noreferrer"/g) || [];
  assert.ok([3, 6].includes(posts.length), `3 o 6 publicacions (n'hi ha ${posts.length})`);
  assert.match(sec, /<div class="ig-grid" data-ig="grid">/);
  assert.match(html, /<script src="instagram\.js[^"]*"><\/script>/);
  assert.match(html, /<link rel="stylesheet" href="instagram\.css[^"]*">/);
  // QR (SVG a la web, PNG per imprimir) que porta al perfil
  assert.match(sec, /<img class="ig-qr__img" src="instagram\/qr-rotaractigualada\.svg"[^>]*alt="[^"]+"/);
  assert.match(sec, /<a class="ig-qr__download" href="instagram\/qr-rotaractigualada\.png" download="[^"]+\.png">/);
  const svg = read('instagram/qr-rotaractigualada.svg');
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"[\s\S]*<\/svg>\s*$/);
  assert.doesNotMatch(svg, /(?:href|src)="https?:/, 'el QR no carrega res de fora');
  assert.ok(readFileSync(join(ROOT, 'instagram', 'qr-rotaractigualada.png')).subarray(1, 4).toString() === 'PNG');
});

test('avís legal i privacitat: dades de l\'entitat omplertes (sense «[…]»), en els 3 idiomes', () => {
  for (const { lang, dir } of VERSIONS) {
    for (const page of PAGES) {
      const html = stripComments(read(dir + page));
      const legal = html.slice(html.indexOf('id="avisLegalModal"'));
      assert.doesNotMatch(legal, /\[[^\]<>]{3,}\]/, `${dir + page}: encara hi ha dades per omplir`);
      const privacy = legal.indexOf('id="politicaPrivacitatModal"');
      for (const [name, part] of [['avís legal', legal.slice(0, privacy)], ['privacitat', legal.slice(privacy)]]) {
        assert.match(part, />[^<]*Camí Ral, 4-10, 08700 Igualada \(Barcelona\)/, `${dir + page}: domicili social a ${name}`);
      }
      assert.match(legal, lang === 'en' ? /Register of Associations of the Generalitat de Catalunya/ : lang === 'es' ? /Registro de Asociaciones de la Generalitat de Catalunya/ : /Registre d'Associacions de la Generalitat de Catalunya/);
    }
  }
});

test('grups de treball: pestanya a Activitats amb les 7 àrees, els menús hi porten i grups.json és vàlid', () => {
  const act = stripComments(read('activitats.html'));
  assert.match(act, /<button type="button" class="act-hero__tab-btn" data-tab="grups">/);
  const sec = act.slice(act.indexOf('<section class="act-section act-section--light act-tab-section" id="grups">'));
  assert.ok(sec.length < act.length, 'falta la secció #grups');
  assert.deepEqual([...sec.matchAll(/<li class="grups-area" data-area="(\w+)">/g)].map((m) => m[1]).sort(), AREES, 'una targeta per àrea');
  assert.match(sec, /<a href="index\.html#test" class="grups-area__link">/, 'porta al test de la portada');
  assert.match(sec, /id="grupsProjectes" hidden><\/div>[\s\S]*id="grupsBuit"/, 'projectes i missatge mentre no n\'hi ha');
  assert.match(sec, /href="contacte\.html#uneix-te"/);
  assert.match(sec, /<a href="contacte\.html#escriu-nos" class="grups-cta__empresa">/, 'botó per a entitats i empreses');
  assert.match(act, /<script src="grups\.js[^"]*"><\/script>/);
  assert.match(read('activitats.js'), /validTabs\s*=\s*\[[^\]]*'grups'/);
  for (const page of PAGES) {
    const html = stripComments(read(page));
    assert.match(html, /<li><a href="activitats\.html#grups" class="mobile-nav__sublink" data-en="Work groups">Grups de treball<\/a><\/li>/, `${page}: menú mòbil`);
    assert.match(html, /<li><a href="activitats\.html#grups" data-en="Work groups">Grups de treball<\/a><\/li>[\s\S]*<li><a href="activitats\.html#grups" data-en="Work groups">Grups de treball<\/a><\/li>/, `${page}: menú d'escriptori i peu`);
  }

  const { grups, projectes } = JSON.parse(read('grups.json'));
  assert.ok(Array.isArray(grups) && Array.isArray(projectes), 'grups.json: «grups» i «projectes» han de ser llistes');
  const fets = new Set();
  for (const g of grups) {
    assert.ok(AREES.includes(g.area), `grup: l'àrea «${g.area}» no és cap de les 7 àrees de Rotary (${AREES.join(', ')})`);
    assert.ok(!fets.has(g.area), `hi ha dos grups de l'àrea «${g.area}»`);
    fets.add(g.area);
    assert.ok(typeof g.referent === 'string' && g.referent.trim(), `grup de ${g.area}: falta el nom del referent`);
  }
  for (const p of projectes) {
    const nom = p.nom && p.nom.ca;
    assert.ok(p.nom && p.nom.ca && p.nom.es && p.nom.en, `projecte: nom en català, castellà i anglès: ${JSON.stringify(p.nom)}`);
    assert.ok(AREES.includes(p.area), `${nom}: l'àrea «${p.area}» no és cap de les 7 àrees de Rotary`);
    if (p.descripcio) assert.ok(p.descripcio.ca && p.descripcio.es && p.descripcio.en, `${nom}: descripció en català, castellà i anglès`);
    if (p.objectiu != null) assert.ok(typeof p.objectiu === 'number' && p.objectiu > 0, `${nom}: l'objectiu ha de ser un número d'euros més gran que 0`);
    if (p.recaptat != null) assert.ok(typeof p.recaptat === 'number' && p.recaptat >= 0, `${nom}: el recaptat ha de ser un número d'euros`);
    if (p.exemple != null) assert.equal(typeof p.exemple, 'boolean', `${nom}: «exemple» ha de ser true o false`);
    if (p.icona != null) assert.ok(typeof p.icona === 'string' && p.icona.trim().length <= 8, `${nom}: «icona» ha de ser un emoji`);
  }
});
