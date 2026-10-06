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
