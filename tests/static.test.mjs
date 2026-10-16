/* Comprovacions estàtiques de l'HTML (sense navegador ni servidor):
   enllaços i recursos locals, àncores, metadades SEO, versions per idioma
   (arrel = català, /es/, /en/) i accessibilitat bàsica. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
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

test('sense cookies: ni avís de cookies ni Google Analytics; estadístiques amb GoatCounter', () => {
  for (const page of PAGES) {
    const html = read(page);
    assert.doesNotMatch(html, /cookie-banner/, `${page} encara carrega l'avís de cookies`);
    assert.doesNotMatch(html, /googletagmanager|google-analytics|gtag\(/, `${page} encara fa referència a Google Analytics`);
    assert.match(html, /<script src="analytics\.js(\?v=[0-9a-f]+)?"><\/script>/);
    assert.match(html, /GoatCounter/, `${page}: la política de cookies ha d'explicar GoatCounter`);
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

test('.htaccess: només form-handler.php, fitxers ocults bloquejats i security.txt accessible', () => {
  const h = read('.htaccess');
  assert.match(h, /<FilesMatch "\\\.\(php/);
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
  assert.match(read('.htaccess'), /<Files "form-handler\.php">\s*Require all granted/);
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

const PERFILS = ['generacions', 'medi', 'motor', 'salut', 'social'];

test('projectes.json: activitats vàlides (municipi de l\'Anoia, dates, perfil del test i nom en 3 idiomes)', () => {
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
    assert.ok(PERFILS.includes(a.perfil), `${nom}: el perfil «${a.perfil}» no és cap dels del test`);
    if (a.estat) assert.match(a.estat, /^(feta|cancel·lada)$/, `${nom}: estat «${a.estat}» (feta o cancel·lada)`);
  }
});

test('portada: test «Quin voluntari ets?» entre Instagram i Uneix-te, amb 5 preguntes i un resultat per perfil', () => {
  const html = stripComments(read('index.html'));
  const pos = (id) => html.indexOf(`id="${id}"`);
  assert.ok(pos('instagram') < pos('test') && pos('test') < pos('contacte'), 'el test va entre Instagram i Uneix-te');
  const sec = html.slice(pos('test'), pos('contacte'));
  const questions = sec.split('<div class="quiz__q"').slice(1);
  assert.equal(questions.length, 5, '5 preguntes');
  questions.forEach((q, i) => {
    const perfils = [...q.split('<div class="quiz__step')[0].matchAll(/class="quiz__opt" data-perfil="(\w+)"/g)].map((m) => m[1]).sort();
    assert.deepEqual(perfils, PERFILS, `pregunta ${i + 1}: una resposta de cada perfil`);
  });
  for (const p of PERFILS) assert.match(sec, new RegExp(`class="quiz__perfil" data-perfil="${p}" hidden`), `resultat del perfil ${p}`);
  assert.match(sec, /href="contacte\.html#uneix-te"/, 'el resultat porta a «Uneix-te»');
  assert.match(html, /<script src="projectes\.js[^"]*"><\/script>\s*<script src="test-voluntari\.js/);
});

test('.htaccess: la web pot llegir els .json que fa servir (mapa i activitats), però no la resta', () => {
  const h = read('.htaccess');
  const granted = [...h.matchAll(/<(Files|FilesMatch) "([^"]+)">\s*Require all granted/g)]
    .map(([, kind, v]) => (kind === 'Files' ? (f) => f === v : (f) => new RegExp(v).test(f)));
  const allowed = (f) => granted.some((ok) => ok(f));
  // .json que demana el JavaScript de la web
  const used = new Set();
  for (const js of ['mapa.js', 'projectes.js', 'test-voluntari.js']) {
    for (const m of read(js).matchAll(/['"]([\w-]+\.json)['"]/g)) used.add(m[1]);
  }
  assert.ok(used.has('anoia.json') && used.has('projectes.json'));
  for (const f of used) {
    assert.ok(existsSync(join(ROOT, f)), `falta ${f}`);
    assert.ok(allowed(f), `${f}: el bloqueig de .json de l'.htaccess el deixaria en 403`);
  }
  for (const f of ['package.json', 'package-lock.json', 'composer.json', 'dades.json']) {
    assert.ok(!allowed(f), `${f} no hauria de ser públic`);
  }
});
