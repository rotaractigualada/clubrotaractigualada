/* Tests amb navegador real (Playwright + Chromium) sobre el servidor PHP.
   Se salten si falta Playwright, el navegador o PHP.
   Instal·lació: npm install && npx playwright install chromium */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { hasPhp, startServer, PAGES, ROOT } from './helpers.mjs';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch { /* sense Playwright */ }

let browser;
let server;
let skip = !chromium ? 'Playwright no instal·lat' : !hasPhp() ? 'PHP no disponible' : false;

before(async () => {
  if (skip) return;
  try {
    browser = await chromium.launch();
  } catch (e) {
    skip = 'No es pot obrir Chromium: ' + e.message.split('\n')[0];
    return;
  }
  server = await startServer();
});
after(async () => {
  if (browser) await browser.close();
  if (server) server.stop();
});

/* Pàgina nova amb el bàner de cookies ja respost i sense recursos externs
   (fonts, Instagram…) perquè els tests no depenguin de la xarxa. */
async function open(path, viewport = { width: 1280, height: 900 }) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce', locale: 'ca-ES' });
  await context.addInitScript(() => {
    try { localStorage.setItem('rotaract-cookie-consent-v3', 'reject'); } catch (e) { /* res */ }
  });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(server.url + '/' + path, { waitUntil: 'load' });
  return { page, context, errors };
}

for (const file of PAGES) {
  test(`${file}: sense errors de JavaScript ni scroll horitzontal en mòbil`, async (t) => {
    if (skip) return t.skip(skip);
    const { page, context, errors } = await open(file, { width: 375, height: 800 });
    await page.waitForTimeout(300);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await context.close();
    assert.deepEqual(errors, []);
    assert.ok(overflow <= 0, `la pàgina desborda ${overflow}px en horitzontal`);
  });
}

test('menú mòbil: obre, tanca amb Escape i no és enfocable tancat', async (t) => {
  if (skip) return t.skip(skip);
  const { page, context } = await open('index.html', { width: 375, height: 800 });
  const inert = () => page.evaluate(() => document.getElementById('mobileNav').inert);
  assert.equal(await inert(), true);
  await page.click('#hamburger');
  assert.equal(await inert(), false);
  assert.equal(await page.getAttribute('#hamburger', 'aria-expanded'), 'true');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.getElementById('mobileNav').inert === true);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'hamburger');
  await context.close();
});

test('modals legals: rol de diàleg i el focus torna a l\'enllaç', async (t) => {
  if (skip) return t.skip(skip);
  const { page, context } = await open('index.html');
  await page.focus('footer .open-avis-legal');
  await page.keyboard.press('Enter');
  const modal = page.locator('#avisLegalModal');
  assert.equal(await modal.getAttribute('role'), 'dialog');
  assert.equal(await modal.getAttribute('aria-modal'), 'true');
  assert.ok(await modal.evaluate((m) => m.classList.contains('active')));
  await page.keyboard.press('Escape');
  assert.ok(await page.evaluate(() => document.activeElement.matches('footer .open-avis-legal')));
  await context.close();
});

test('escriu-nos: el botó prepara el correu amb la persona, el motiu i el missatge', async (t) => {
  if (skip) return t.skip(skip);
  const { page, context, errors } = await open('contacte.html');
  const href = () => page.getAttribute('#mailLink', 'href');
  assert.match(await href(), /^mailto:ayuda@rotaractigualada\.org\?subject=/);

  await page.click('label.subject-pill:has(input[name="to"][value="presidencia"])');
  await page.click('label.subject-pill:has(input[name="motiu"][value="unir"])');
  await page.fill('#contactMessage', 'Hola! Tinc 22 anys');
  const url = new URL(await href());
  assert.equal(url.protocol + url.pathname, 'mailto:gerard.lopez@rotary2202.org');
  assert.equal(url.searchParams.get('subject'), 'Rotaract Igualada · Vull unir-me al club');
  assert.equal(url.searchParams.get('body'), 'Hola! Tinc 22 anys');
  assert.equal((await page.locator('#recipientEmailDisplay').innerText()).trim(), 'gerard.lopez@rotary2202.org');
  assert.equal((await page.locator('#charCount').innerText()).trim(), '18 / 500 caràcters');
  const gmail = new URL(await page.getAttribute('#gmailLink', 'href'));
  assert.equal(gmail.searchParams.get('to'), 'gerard.lopez@rotary2202.org');
  assert.equal(gmail.searchParams.get('su'), 'Rotaract Igualada · Vull unir-me al club');
  assert.equal(await page.locator('form').count(), 0, 'ja no hi ha formulari');
  await context.close();
  assert.deepEqual(errors, []);
});

test('escriu-nos: la pestanya «Uneix-te» obre el formulari d\'inscripció des del mateix lloc', async (t) => {
  if (skip) return t.skip(skip);
  const { page, context } = await open('contacte.html');
  // Amb el motiu «Vull unir-me» apareix l'avís del formulari d'inscripció
  assert.equal(await page.isVisible('#joinHint'), false);
  await page.click('label.subject-pill:has(input[name="motiu"][value="unir"])');
  assert.equal(await page.isVisible('#joinHint'), true);

  await page.click('#tab-unir');
  assert.equal(await page.getAttribute('#tab-unir', 'aria-selected'), 'true');
  assert.equal(await page.isVisible('#panel-correu'), false);
  await page.click('#panel-unir .open-signup-form');
  assert.equal(await page.isVisible('#signupFormModal'), true);
  await page.keyboard.press('Escape');

  // «Abans tens dubtes? Escriu-nos» torna al correu
  await page.click('#joinAsk');
  assert.equal(await page.isVisible('#panel-correu'), true);
  assert.ok(await page.isChecked('input[name="motiu"][value="unir"]'));
  await context.close();
});

test('escriu-nos: també a la portada, i en castellà l\'assumpte va en castellà', async (t) => {
  if (skip) return t.skip(skip);
  const { page, context } = await open('es/index.html');
  await page.click('label.subject-pill:has(input[name="motiu"][value="dubte"])');
  const url = new URL(await page.getAttribute('#mailLink', 'href'));
  assert.equal(url.protocol + url.pathname, 'mailto:ayuda@rotaractigualada.org');
  assert.equal(url.searchParams.get('subject'), 'Rotaract Igualada · Una duda');
  await context.close();
});

test('calendari: es pot triar un dia amb el teclat', async (t) => {
  if (skip) return t.skip(skip);
  const { page, context } = await open('activitats.html#calendari');
  const day = page.locator('.cal-day:not(.cal-day--empty)').nth(9);
  await day.focus();
  await page.keyboard.press('Enter');
  const selected = page.locator('.cal-day--selected');
  assert.equal(await selected.count(), 1);
  assert.equal(await selected.getAttribute('aria-pressed'), 'true');
  assert.ok(await page.evaluate(() => document.activeElement.classList.contains('cal-day--selected')));
  assert.match(await page.locator('#cal-events-list').innerText(), /Cap activitat/);
  await context.close();
});

test('pestanyes de directiu: aria-pressed segueix la pestanya activa', async (t) => {
  if (skip) return t.skip(skip);
  const { page, context } = await open('directiu.html');
  await page.click('.directiu-tabs__btn[data-tab="junta"]');
  assert.equal(await page.getAttribute('.directiu-tabs__btn[data-tab="junta"]', 'aria-pressed'), 'true');
  assert.equal(await page.getAttribute('.directiu-tabs__btn[data-tab="socis"]', 'aria-pressed'), 'false');
  assert.ok(await page.locator('#panel-junta').isVisible());
  await context.close();
});

test('canvi d\'idioma: el menú porta a /en/ i la tria es recorda', async (t) => {
  if (skip) return t.skip(skip);
  const { page, context } = await open('index.html');
  await page.click('.header__lang .lang-menu__btn');
  await page.click('.header__lang [data-lang-opt="en"]');
  await page.waitForURL('**/en/');
  assert.equal(await page.getAttribute('html', 'lang'), 'en');
  assert.equal((await page.locator('.hero__title').innerText()).trim(), 'ROTARACT CLUB OF IGUALADA');
  // Un enllaç a la versió catalana porta a l'anglesa (preferència desada)
  await page.goto(server.url + '/contacte.html#inscripcio');
  await page.waitForURL('**/en/contacte.html#inscripcio');
  assert.equal(await page.title(), 'Contact | Rotaract Club of Igualada');
  await context.close();
});

test('galeria: el visor s\'obre, navega amb les fletxes i torna el focus', async (t) => {
  if (skip) return t.skip(skip);
  const { page, context, errors } = await open('index.html');
  const items = page.locator('#galeriaGrid .galeria__item');
  assert.ok((await items.count()) >= 1);
  // Les imatges de la graella existeixen
  const broken = await page.evaluate(async () => {
    const imgs = [...document.querySelectorAll('#galeriaGrid img')];
    await Promise.all(imgs.map((i) => (i.loading = 'eager', i.decode().catch(() => {}))));
    return imgs.filter((i) => !i.naturalWidth).map((i) => i.src);
  });
  assert.deepEqual(broken, []);

  await items.first().focus();
  await page.keyboard.press('Enter');
  const box = page.locator('.lightbox');
  await page.waitForFunction(() => document.querySelector('.lightbox').classList.contains('is-open'));
  assert.equal(await box.getAttribute('role'), 'dialog');
  assert.ok(await page.evaluate(() => document.activeElement.classList.contains('lightbox__close')));
  assert.match(await page.locator('.lightbox__counter').innerText(), /^1 \//);
  await page.keyboard.press('ArrowRight');
  assert.match(await page.locator('.lightbox__counter').innerText(), /^2 \//);
  await page.keyboard.press('Escape');
  assert.ok(!(await box.evaluate((b) => b.classList.contains('is-open'))));
  assert.ok(await page.evaluate(() => document.activeElement.matches('#galeriaGrid .galeria__item')));
  assert.deepEqual(errors, []);
  await context.close();
});

test('targetes de correu: mostren l\'adreça i trien la persona a l\'Escriu-nos', async (t) => {
  if (skip) return t.skip(skip);
  const { page, context } = await open('contacte.html');
  const cards = page.locator('.qc-card.contact-email-link');
  assert.deepEqual(
    (await cards.locator('.qc-card__text span').allInnerTexts()).map((x) => x.trim()),
    ['ayuda@rotaractigualada.org', 'gerard.lopez@rotary2202.org', 'luca.santos@rotary2202.org']
  );
  await page.click('.qc-card[data-recipient="secretaria"]');
  assert.ok(await page.isChecked('input[name="to"][value="secretaria"]'));
  assert.equal((await page.locator('#recipientEmailDisplay').innerText()).trim(), 'luca.santos@rotary2202.org');
  assert.match(await page.getAttribute('#mailLink', 'href'), /^mailto:luca\.santos@rotary2202\.org\?/);
  await context.close();
});

test('còpia de GitHub Pages: redirigeix a rotaractigualada.org mantenint la pàgina i l\'idioma', async (t) => {
  if (skip) return t.skip(skip);
  const context = await browser.newContext({ locale: 'ca-ES' });
  // Simula la web servida des de github.io amb els fitxers locals
  await context.route('https://rotaractigualada.github.io/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/clubrotaractigualada/', '/') || '/';
    const res = await fetch(server.url + path);
    await route.fulfill({ status: res.status, headers: { 'content-type': res.headers.get('content-type') || 'text/html' }, body: Buffer.from(await res.arrayBuffer()) });
  });
  const visited = [];
  await context.route('https://rotaractigualada.org/**', (route) => {
    visited.push(route.request().url());
    route.fulfill({ status: 200, contentType: 'text/html', body: '<p>oficial</p>' });
  });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1|rotaractigualada\.)/, (route) => route.abort());
  const page = await context.newPage();
  await page.goto('https://rotaractigualada.github.io/clubrotaractigualada/nosaltres.html#rotaract-igualada');
  await page.waitForURL('https://rotaractigualada.org/**');
  assert.equal(page.url(), 'https://rotaractigualada.org/nosaltres.html#rotaract-igualada');
  await page.goto('https://rotaractigualada.github.io/clubrotaractigualada/es/contacte.html');
  await page.waitForURL('https://rotaractigualada.org/es/**');
  assert.equal(page.url(), 'https://rotaractigualada.org/es/contacte.html');
  await context.close();
});

test('idioma: la primera visita porta a la versió de l\'idioma del navegador', async (t) => {
  if (skip) return t.skip(skip);
  const cases = [
    ['ca-ES', '/', "Inici | Club Rotaract d'Igualada"],
    ['es-ES', '/es/', 'Inicio | Club Rotaract de Igualada'],
    ['en-GB', '/en/', 'Home | Rotaract Club of Igualada'],
    ['fr-FR', '/en/', 'Home | Rotaract Club of Igualada']
  ];
  for (const [locale, path, title] of cases) {
    const context = await browser.newContext({ locale });
    await context.addInitScript(() => {
      try { localStorage.setItem('rotaract-cookie-consent-v3', 'reject'); } catch (e) { /* res */ }
    });
    await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
    const page = await context.newPage();
    await page.goto(server.url + '/');
    await page.waitForURL((u) => new URL(u).pathname === path);
    await page.waitForLoadState('load');
    assert.equal(await page.title(), title, locale);
    await context.close();
  }
  // Una adreça d'idioma concreta (/en/) no es redirigeix si no hi ha cap tria desada
  const context = await browser.newContext({ locale: 'es-ES' });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
  const page = await context.newPage();
  await page.goto(server.url + '/en/nosaltres.html');
  await page.waitForTimeout(300);
  assert.equal(new URL(page.url()).pathname, '/en/nosaltres.html');
  await context.close();
});

test('idioma: els cercadors (Googlebot) no es redirigeixen i veuen cada versió tal com és', async (t) => {
  if (skip) return t.skip(skip);
  const context = await browser.newContext({
    locale: 'en-US',
    userAgent: 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
  });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
  const page = await context.newPage();
  await page.goto(server.url + '/index.html');
  await page.waitForTimeout(300);
  assert.equal(new URL(page.url()).pathname, '/index.html');
  assert.equal(await page.getAttribute('html', 'lang'), 'ca');
  assert.equal(await page.title(), "Inici | Club Rotaract d'Igualada");
  await page.goto(server.url + '/es/');
  assert.equal(await page.title(), 'Inicio | Club Rotaract de Igualada');
  await context.close();
});

test('versions /es/ i /en/: sense errors ni recursos trencats', async (t) => {
  if (skip) return t.skip(skip);
  for (const dir of ['es', 'en']) {
    for (const file of PAGES) {
      const context = await browser.newContext({ locale: dir === 'es' ? 'es-ES' : 'en-GB', viewport: { width: 375, height: 800 } });
      await context.addInitScript(() => {
        try { localStorage.setItem('rotaract-cookie-consent-v3', 'reject'); } catch (e) { /* res */ }
      });
      await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
      const page = await context.newPage();
      const errors = [];
      const broken = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('response', (r) => { if (r.status() >= 400) broken.push(r.status() + ' ' + r.url()); });
      await page.goto(`${server.url}/${dir}/${file}`, { waitUntil: 'load' });
      assert.equal(await page.getAttribute('html', 'lang'), dir);
      assert.deepEqual(errors, [], `${dir}/${file}`);
      assert.deepEqual(broken, [], `${dir}/${file}`);
      await context.close();
    }
  }
});

test('les versions /es/ i /en/ estan al dia (npm run build:idiomes)', async (t) => {
  if (skip) return t.skip(skip);
  const { mkdtempSync, readFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { execFileSync } = await import('node:child_process');
  const out = mkdtempSync(join(tmpdir(), 'idiomes-'));
  try {
    execFileSync(process.execPath, [join(ROOT, 'scripts', 'build-idiomes.mjs'), out], { stdio: 'ignore' });
    for (const dir of ['es', 'en']) {
      for (const file of PAGES) {
        assert.equal(readFileSync(join(out, dir, file), 'utf8'), readFileSync(join(ROOT, dir, file), 'utf8'),
          `${dir}/${file} no està al dia: executa npm run build:idiomes`);
      }
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('calendari: la presentació del 24 de setembre de 2026 hi surt', async (t) => {
  if (skip) return t.skip(skip);
  const { page, context } = await open('activitats.html#calendari');
  // Navega fins al mes de l'activitat (endavant o enrere segons la data d'avui)
  const target = '[data-date="2026-09-24"]';
  for (let i = 0; i < 36 && !(await page.locator(target).count()); i++) {
    const shown = await page.locator('.cal-day:not(.cal-day--empty)').first().getAttribute('data-date');
    await page.click(shown > '2026-09-24' ? '#cal-prev' : '#cal-next');
  }
  const day = page.locator(target);
  assert.ok((await day.getAttribute('class')).includes('cal-day--has-event'));
  await day.click();
  const list = page.locator('#cal-events-list');
  assert.match(await list.innerText(), /Presentació del club al sopar col·loqui de Rotary Igualada/);
  assert.match(await list.innerText(), /Ses Oliveres, Igualada/);
  assert.equal(await list.locator('a').getAttribute('href'), 'index.html#galeria');
  assert.match(await list.locator('a').innerText(), /Veure les fotos/);
  await context.close();
});
