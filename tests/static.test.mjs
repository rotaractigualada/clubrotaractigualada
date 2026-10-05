/* Comprovacions estàtiques de l'HTML (sense navegador ni servidor):
   enllaços i recursos locals, àncores, metadades SEO i accessibilitat bàsica. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, PAGES, read } from './helpers.mjs';

const stripComments = (html) => html.replace(/<!--[\s\S]*?-->/g, '');
const ids = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const attrs = (html, attr) => [...html.matchAll(new RegExp(`\\s${attr}="([^"]*)"`, 'g'))].map((m) => m[1]);

for (const page of PAGES) {
  const html = stripComments(read(page));

  test(`${page}: els fitxers locals enllaçats existeixen`, () => {
    const refs = [...attrs(html, 'href'), ...attrs(html, 'src')]
      .filter((u) => u && !/^(https?:|mailto:|tel:|#|data:)/.test(u))
      .map((u) => u.split(/[?#]/)[0])
      .filter(Boolean);
    for (const ref of refs) {
      assert.ok(existsSync(join(ROOT, ref)), `${page} enllaça ${ref}, que no existeix`);
    }
  });

  test(`${page}: les àncores apunten a ids existents`, () => {
    for (const href of attrs(html, 'href')) {
      const m = href.match(/^([\w-]+\.html)?#(.+)$/);
      if (!m) continue;
      const target = m[1] ? read(m[1]) : html;
      assert.ok(ids(target).has(m[2]), `${page}: ${href} no té destí`);
    }
  });

  test(`${page}: metadades SEO bàsiques`, () => {
    assert.match(html, /<html lang="ca">/);
    assert.match(html, /<title>[^<]{10,}<\/title>/);
    assert.match(html, /<meta name="description" content="[^"]{50,}">/);
    assert.match(html, /<link rel="canonical" href="https:\/\/rotaractigualada\.org\//);
    assert.match(html, /<meta property="og:image" content="https:\/\//);
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, 'ha de tenir exactament un <h1>');
  });

  test(`${page}: accessibilitat bàsica`, () => {
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

test('sitemap.xml: cada URL correspon a una pàgina existent', () => {
  const xml = read('sitemap.xml');
  const locs = [...xml.matchAll(/<loc>https:\/\/rotaractigualada\.org\/([^<]*)<\/loc>/g)].map((m) => m[1] || 'index.html');
  assert.equal(locs.length, PAGES.length);
  for (const loc of locs) assert.ok(PAGES.includes(loc), `${loc} no és una pàgina`);
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
