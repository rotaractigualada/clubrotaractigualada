/* Tests amb navegador real (Playwright + Chromium) sobre el servidor PHP.
   Se salten si falta Playwright, el navegador o PHP.
   Instal·lació: npm install && npx playwright install chromium */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

/* Pàgina nova sense recursos externs (Instagram, mapes, estadístiques…)
   perquè els tests no depenguin de la xarxa. */
async function open(path, viewport = { width: 1280, height: 900 }) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce', locale: 'ca-ES' });
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

test('menú mòbil: els idiomes no queden tapats per «Uneix-te» i es poden triar', async (t) => {
  if (skip) return t.skip(skip);
  const { page, context } = await open('index.html', { width: 375, height: 800 });
  await page.click('#hamburger');
  await page.click('.mobile-nav .lang-menu__btn');
  const covered = await page.evaluate(() => [...document.querySelectorAll('.mobile-nav .lang-menu__opt')]
    .filter((opt) => {
      opt.scrollIntoView({ block: 'center' });
      const r = opt.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !opt.contains(hit);
    })
    .map((opt) => opt.dataset.langOpt));
  assert.deepEqual(covered, [], 'opcions tapades: ' + covered.join(', '));
  await page.click('.mobile-nav [data-lang-opt="es"]');
  await page.waitForURL('**/es/');
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

test('escriu-nos: pestanyes «Vull informació» / «Vull unir-me» i validació accessible', async (t) => {
  if (skip) return t.skip(skip);
  const { page, context, errors } = await open('contacte.html');
  assert.equal(await page.isVisible('#form-info'), true);
  assert.equal(await page.isVisible('#form-unir'), false);
  // Errors accessibles en enviar buit
  await page.click('#form-info button[type="submit"]');
  assert.equal(await page.getAttribute('#infoName', 'aria-invalid'), 'true');
  const errId = await page.getAttribute('#infoName', 'aria-describedby');
  assert.ok(errId && (await page.locator('#' + errId).isVisible()));
  await page.fill('#infoName', 'Anna');
  assert.equal(await page.getAttribute('#infoName', 'aria-invalid'), null);
  // Canvi de pestanya
  await page.click('#tab-unir');
  assert.equal(await page.getAttribute('#tab-unir', 'aria-selected'), 'true');
  assert.equal(await page.isVisible('#form-unir'), true);
  assert.equal(await page.isVisible('#form-info'), false);
  await context.close();
  assert.deepEqual(errors, []);
});

test('escriu-nos: «Vull unir-me» s\'envia fins al servidor i mostra el resultat', async (t) => {
  if (skip) return t.skip(skip);
  const { page, context } = await open('contacte.html#uneix-te');
  assert.equal(await page.isVisible('#form-unir'), true, '#uneix-te obre la pestanya «Vull unir-me»');
  await page.fill('#unirName', 'Pau');
  await page.fill('#unirSurname', 'Vila');
  await page.fill('#unirEmail', 'pau@example.com');
  await page.fill('#unirAge', '23');
  await page.fill('#unirMessage', 'Vull fer voluntariat');
  await page.check('#unirPrivacy');
  await page.waitForTimeout(3100); // el servidor ignora els enviaments de menys de 3 s (bots)
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/form-handler.php')),
    page.click('#form-unir button[type="submit"]')
  ]);
  // En local mail() falla (500), però la tramesa ja s'ha desat al CSV
  assert.ok([200, 500].includes(response.status()), 'estat ' + response.status());
  await page.waitForSelector('#form-unir .form-status:not([hidden])');
  const csv = readFileSync(join(server.dir, 'form-data', 'submissions.csv'), 'utf8');
  assert.match(csv, /"Pau Vila";"pau@example\.com";"Uneix-te";"Vull fer voluntariat";"";"General";"23"/);
  await context.close();
});
test('portada: la zona «Uneix-te» porta als formularis de Contacte (en castellà)', async (t) => {
  if (skip) return t.skip(skip);
  const { page, context } = await open('es/index.html');
  const zone = page.locator('#contacte.join-cta');
  assert.equal((await zone.locator('.join-cta__title').innerText()).trim(), '¿Quieres formar parte del club?');
  assert.equal(await zone.locator('a[href="contacte.html#uneix-te"]').count(), 1);
  assert.equal(await zone.locator('a[href="contacte.html#escriu-nos"]').count(), 1);
  assert.equal(await zone.locator('.join-cta__step').count(), 3);
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

test('galeria (Activitats → Galeria): àlbums, el visor s\'obre, navega amb les fletxes i torna el focus', async (t) => {
  if (skip) return t.skip(skip);
  const { page, context, errors } = await open('activitats.html#galeria');
  // L'enllaç directe obre la pestanya Galeria
  assert.equal(await page.isVisible('#galeria'), true);
  assert.equal(await page.isVisible('#programades'), false);
  assert.equal(await page.getAttribute('[data-tab="galeria"]', 'aria-pressed'), 'true');
  const album = page.locator('#galeria .galeria-album').first();
  const items = album.locator('.galeria__item');
  const n = await items.count();
  assert.ok(n >= 1);
  assert.equal(await album.locator('[data-galeria-count]').innerText(), n === 1 ? '1 FOTO' : `${n} FOTOS`);
  // Les imatges de la galeria existeixen
  const broken = await page.evaluate(async () => {
    const imgs = [...document.querySelectorAll('#galeria .galeria__grid img')];
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
  assert.equal(await page.locator('.lightbox__counter').innerText(), `1 / ${n}`);
  await page.keyboard.press('ArrowRight');
  assert.match(await page.locator('.lightbox__counter').innerText(), /^2 \//);
  await page.keyboard.press('Escape');
  assert.ok(!(await box.evaluate((b) => b.classList.contains('is-open'))));
  assert.ok(await page.evaluate(() => document.activeElement.matches('#galeria .galeria__item')));
  assert.deepEqual(errors, []);
  await context.close();
});

test('targetes de correu: mostren l\'adreça i trien la persona al formulari (sense obrir cap aplicació)', async (t) => {
  if (skip) return t.skip(skip);
  const { page, context } = await open('contacte.html');
  const cards = page.locator('.quick-channels a.qc-card.contact-email-link');
  assert.deepEqual(
    (await cards.locator('.qc-card__text span').allInnerTexts()).map((x) => x.trim()),
    ['rotaractigualada@gmail.com', 'gerard.lopez@rotary2202.org', 'luca.santos@rotary2202.org']
  );
  await page.click('#tab-unir');
  await page.click('.qc-card[data-recipient="secretaria"]');
  assert.equal(await page.isVisible('#form-info'), true);
  assert.ok(await page.isChecked('#form-info input[name="recipient"][value="secretaria"]'));
  await context.close();
});

test('procés d\'inscripció: «Accedeix al formulari» obre «Vull unir-me»', async (t) => {
  if (skip) return t.skip(skip);
  const { page, context } = await open('contacte.html');
  await page.click('.signup-process__cta-btn');
  assert.equal(await page.isVisible('#form-unir'), true);
  assert.equal(await page.getAttribute('#tab-unir', 'aria-selected'), 'true');
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
  assert.equal(await list.locator('a').getAttribute('href'), '#galeria');
  assert.match(await list.locator('a').innerText(), /Veure les fotos/);
  // «Veure les fotos» obre la pestanya Galeria
  await list.locator('a').click();
  await page.waitForFunction(() => document.getElementById('galeria').classList.contains('act-tab-section--active'));
  assert.equal(await page.isVisible('#calendari'), false);
  assert.match(page.url(), /#galeria$/);
  await context.close();
});

/* Estadístiques (GoatCounter): la web es «serveix» a https://rotaractigualada.org
   des del servidor de prova i es recullen les peticions a GoatCounter. */
async function openAsProduction(path, { locale = 'ca-ES', init } = {}) {
  const context = await browser.newContext({ locale, reducedMotion: 'reduce' });
  await context.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  if (init) await context.addInitScript(init);
  const counts = [];
  await context.route(/^https?:\/\/(?!127\.0\.0\.1|rotaractigualada\.org)/, (route) => {
    const url = route.request().url();
    if (url.startsWith('https://rotaractigualada.goatcounter.com/count?')) {
      counts.push(new URL(url).searchParams);
      return route.fulfill({ status: 200, contentType: 'image/gif', body: Buffer.from('R0lGODlhAQABAAAAACw=', 'base64') });
    }
    return route.abort();
  });
  await context.route('https://rotaractigualada.org/**', async (route) => {
    const u = new URL(route.request().url());
    route.fulfill({ response: await route.fetch({ url: server.url + u.pathname + u.search }) });
  });
  const page = await context.newPage();
  await page.goto('https://rotaractigualada.org/' + path, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  return { page, context, counts };
}

test('estadístiques: a rotaractigualada.org es compta la visita a GoatCounter, sense cookies', async (t) => {
  if (skip) return t.skip(skip);
  const { page, context, counts } = await openAsProduction('nosaltres.html');
  assert.equal(counts.length, 1, 'una sola visita comptada');
  assert.equal(counts[0].get('p'), '/nosaltres.html');
  assert.match(counts[0].get('t'), /Nosaltres/);
  assert.equal(counts[0].get('r'), '');
  assert.match(counts[0].get('s'), /^\d+,\d+,[\d.]+$/);
  await page.goto('https://rotaractigualada.org/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(300);
  assert.equal(counts.length, 2);
  assert.equal(counts[1].get('p'), '/', '«/index.html» compta com «/»');
  assert.equal(counts[1].get('r'), '', 'la navegació dins de la web no compta com a procedència');
  assert.deepEqual(await context.cookies(), [], 'cap cookie');
  await context.close();
});

test('estadístiques: la pàgina que es redirigeix a un altre idioma no compta dues vegades', async (t) => {
  if (skip) return t.skip(skip);
  const { page, context, counts } = await openAsProduction('', { locale: 'es-ES' });
  await page.waitForURL('**/es/');
  await page.waitForTimeout(300);
  assert.deepEqual(counts.map((c) => c.get('p')), ['/es/']);
  await context.close();
});

test('estadístiques: no es compta qui té activat «no em segueixis» (GPC) ni les proves en local', async (t) => {
  if (skip) return t.skip(skip);
  const gpc = await openAsProduction('index.html', { init: () => { Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => true }); } });
  assert.equal(gpc.counts.length, 0);
  await gpc.context.close();
  const { page, context } = await open('index.html');
  const sent = [];
  page.on('request', (r) => { if (r.url().includes('goatcounter')) sent.push(r.url()); });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(300);
  assert.deepEqual(sent, []);
  assert.equal(await page.locator('#cookieBanner').count(), 0, 'sense avís de cookies');
  await context.close();
});

test('nosaltres: el mapa d\'Igualada i l\'Anoia només es carrega quan es demana, amb municipis i cercador', async (t) => {
  if (skip) return t.skip(skip);
  const { page, context, errors } = await open('nosaltres.html');
  const ext = [];
  page.on('request', (r) => { if (!r.url().startsWith(server.url)) ext.push(r.url()); });
  await page.reload({ waitUntil: 'load' });
  // El mapa és després de «Rotaract Igualada»
  assert.ok(await page.evaluate(() => {
    const ri = document.getElementById('rotaract-igualada');
    return !!ri && ri.nextElementSibling && ri.nextElementSibling.id === 'on-som' && !document.querySelector('#rotary-igualada .mapa-igualada');
  }), 'la secció «On som» va just després de Rotaract Igualada');
  await page.locator('#mapaIgualada').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  assert.deepEqual(ext, [], 'abans de demanar-lo no es connecta amb cap servei extern');
  assert.equal(await page.locator('#mapaEines').isVisible(), false);
  // Cercar un municipi també obre el mapa
  await page.fill('#mapaCercaInput', 'calaf');
  await page.press('#mapaCercaInput', 'Enter');
  await page.waitForSelector('#mapaIgualada .leaflet-container');
  await page.waitForFunction(() => /Calaf/.test(document.querySelector('.leaflet-popup-content')?.textContent || ''));
  await page.waitForFunction(() => /^Calaf\s*A \d+ km d'Igualada en línia recta$/.test(document.querySelector('.leaflet-popup-content')?.textContent.trim() || ''));
  assert.equal(await page.locator('#mapaIgualada path.leaflet-interactive').count(), 33, 'els 33 municipis de l\'Anoia');
  assert.equal(await page.locator('#mapaEines').isVisible(), true);
  // Sense accents ni article: «bruc» → El Bruc
  await page.fill('#mapaCercaInput', 'bruc');
  await page.press('#mapaCercaInput', 'Enter');
  await page.waitForFunction(() => /El Bruc/.test(document.querySelector('.leaflet-popup-content')?.textContent || ''));
  // Un nom que no és de l'Anoia
  await page.fill('#mapaCercaInput', 'Manresa');
  await page.press('#mapaCercaInput', 'Enter');
  await page.waitForFunction(() => /No hem trobat/.test(document.getElementById('mapaEstat').textContent));
  // Eina «Igualada»
  await page.click('[data-mapa="igualada"]');
  await page.waitForFunction(() => /seu del nostre club/.test(document.querySelector('.leaflet-popup-content')?.textContent || ''));
  assert.ok(ext.length > 0 && ext.every((u) => u.startsWith('https://tile.openstreetmap.org/')), 'només OpenStreetMap: ' + ext.filter((u) => !u.startsWith('https://tile.openstreetmap.org/')).join(', '));
  assert.deepEqual(await context.cookies(), []);
  await context.close();
  assert.deepEqual(errors, []);
});

/* Activitats de projectes.json, amb les mateixes regles que projectes.js
   (els tests no depenen de la data d'avui) */
function activitats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = (d) => { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd); };
  return JSON.parse(readFileSync(join(ROOT, 'projectes.json'), 'utf8')).activitats
    .filter((a) => !/^cancel/i.test(a.estat || ''))
    .map((a) => ({ ...a, fet: a.estat ? /^fet/i.test(a.estat) : day(a.fi || a.data) < today }))
    .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
}

test('nosaltres: activitats del club al costat del mapa i, amb el mapa obert, números per municipi i filtres', async (t) => {
  if (skip) return t.skip(skip);
  const acts = activitats();
  const fetes = acts.filter((a) => a.fet);
  const properes = acts.filter((a) => !a.fet);
  const igualada = acts.filter((a) => a.municipi === 'Igualada');
  const { page, context, errors } = await open('nosaltres.html');
  const ext = [];
  page.on('request', (r) => { if (!r.url().startsWith(server.url)) ext.push(r.url()); });
  await page.reload({ waitUntil: 'load' });
  // Resum al costat del mapa (sense obrir-lo ni connectar-se enlloc)
  await page.waitForSelector('#mapaImpacte:not([hidden])');
  assert.equal(await page.textContent('[data-impacte="fetes"]'), String(fetes.length));
  assert.equal(await page.textContent('[data-impacte="properes"]'), String(properes.length));
  if (properes.length) assert.equal(await page.textContent('[data-impacte="nom"]'), properes[0].nom.ca);
  assert.deepEqual(ext, [], 'el resum no es connecta amb cap servei extern');
  // «Veure-les al mapa» obre el mapa a Igualada amb la llista
  await page.click('#mapaImpacteBtn');
  await page.waitForSelector('.mapa-projectes--igualada .mapa-projectes__num');
  assert.equal(await page.textContent('.mapa-projectes--igualada .mapa-projectes__num'), String(igualada.length));
  await page.waitForFunction((n) => document.querySelectorAll('.leaflet-popup-content .mapa-acts__item').length === n, igualada.length);
  assert.match(await page.textContent('.leaflet-popup-content'), /seu del nostre club/);
  assert.equal(await page.locator('.leaflet-popup-content .mapa-acts__item.is-fet').count(), igualada.filter((a) => a.fet).length);
  // Filtres: Fetes / Properament / Totes
  const badge = async () => (await page.locator('.mapa-projectes--igualada').count())
    ? Number(await page.textContent('.mapa-projectes--igualada .mapa-projectes__num')) : 0;
  await page.click('[data-filtre="fetes"]');
  assert.equal(await page.getAttribute('[data-filtre="fetes"]', 'aria-pressed'), 'true');
  assert.equal(await page.getAttribute('[data-filtre="totes"]', 'aria-pressed'), 'false');
  assert.equal(await badge(), igualada.filter((a) => a.fet).length);
  assert.equal(await page.locator('.leaflet-popup-content .mapa-acts__item:not(.is-fet)').count(), 0);
  assert.match(await page.textContent('#mapaEstat'), new RegExp('^Activitats fetes: ' + fetes.length + '$'));
  await page.click('[data-filtre="properament"]');
  assert.equal(await badge(), igualada.filter((a) => !a.fet).length);
  assert.equal(await page.locator('.leaflet-popup-content .mapa-acts__item.is-fet').count(), 0);
  await page.click('[data-filtre="totes"]');
  assert.equal(await badge(), igualada.length);
  // Amb el teclat: Enter sobre el número obre la llista
  await page.click('[data-mapa="anoia"]');
  await page.waitForFunction(() => !document.querySelector('.leaflet-popup-content'));
  await page.focus('.mapa-projectes--igualada');
  await page.keyboard.press('Enter');
  await page.waitForFunction((n) => document.querySelectorAll('.leaflet-popup-content .mapa-acts__item').length === n, igualada.length);
  assert.ok(ext.every((u) => u.startsWith('https://tile.openstreetmap.org/')), 'només OpenStreetMap: ' + ext.join(', '));
  assert.deepEqual(await context.cookies(), []);
  await context.close();
  assert.deepEqual(errors, []);
});

test('portada: el test «Quin voluntari ets?» dona un perfil, la barreja i activitats del club, i porta a Uneix-te', async (t) => {
  if (skip) return t.skip(skip);
  const acts = activitats();
  const { page, context, errors } = await open('index.html');
  const ext = [];
  page.on('request', (r) => { if (!r.url().startsWith(server.url)) ext.push(r.url()); });
  const answer = async (q, perfil) => {
    await page.click(`.quiz__q[data-q="${q}"] .quiz__opt[data-perfil="${perfil}"]`);
  };
  await page.click('[data-quiz="start"]');
  assert.equal(await page.isVisible('.quiz__q[data-q="1"]'), true);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'quizQ1', 'el focus va a la pregunta');
  // Enrere: es veu la resposta triada i es pot canviar
  await answer(1, 'medi');
  await page.waitForSelector('.quiz__q[data-q="2"]:not([hidden])');
  assert.equal(await page.textContent('[data-quiz="num"]'), '2');
  await page.click('[data-quiz="back"]');
  await page.waitForSelector('.quiz__q[data-q="1"]:not([hidden])');
  assert.equal(await page.getAttribute('.quiz__q[data-q="1"] [data-perfil="medi"]', 'aria-pressed'), 'true');
  await answer(1, 'salut');
  await answer(2, 'salut');
  await answer(3, 'medi');
  await answer(4, 'salut');
  await answer(5, 'salut');
  await page.waitForSelector('[data-step="resultat"]:not([hidden])');
  assert.equal(await page.locator('.quiz__perfil:not([hidden])').count(), 1);
  assert.equal(await page.isVisible('.quiz__perfil[data-perfil="salut"]'), true);
  assert.match(await page.evaluate(() => document.activeElement.textContent), /Energia saludable/);
  assert.deepEqual(await page.locator('.quiz__bar-pct').allTextContents(), ['80%', '20%', '0%', '0%', '0%']);
  assert.match(await page.textContent('.quiz__bar.is-top'), /Energia saludable/);
  // Activitats del club del mateix perfil (primer les que vindran)
  const salut = acts.filter((a) => a.perfil === 'salut');
  const expected = (salut.some((a) => !a.fet) ? salut.filter((a) => !a.fet) : salut.slice().reverse()).slice(0, 3).map((a) => a.nom.ca);
  await page.waitForFunction(() => !document.querySelector('[data-quiz="acts"]').hidden || !document.querySelector('[data-quiz="empty"]').hidden);
  assert.deepEqual(await page.locator('.quiz__act-name').allTextContents(), expected);
  assert.equal(await page.getAttribute('.quiz__actions a.btn--primary', 'href'), 'contacte.html#uneix-te');
  // Torna a començar; un perfil sense activitats mostra el missatge
  await page.click('[data-quiz="again"]');
  for (let q = 1; q <= 5; q++) await answer(q, 'generacions');
  await page.waitForSelector('.quiz__perfil[data-perfil="generacions"]:not([hidden])');
  assert.deepEqual(await page.locator('.quiz__bar-pct').allTextContents(), ['100%', '0%', '0%', '0%', '0%']);
  if (!acts.some((a) => a.perfil === 'generacions')) {
    await page.waitForSelector('[data-quiz="empty"]:not([hidden])');
    assert.equal(await page.locator('.quiz__act').count(), 0);
  }
  // No s'envia ni es desa res
  assert.deepEqual(ext, []);
  assert.deepEqual(await page.evaluate(() => [Object.keys(localStorage), Object.keys(sessionStorage)]), [[], []]);
  assert.deepEqual(await context.cookies(), []);
  await context.close();
  assert.deepEqual(errors, []);
});

test('portada en castellà: el test surt traduït, també la barreja de perfils', async (t) => {
  if (skip) return t.skip(skip);
  const { page, context, errors } = await open('es/index.html');
  assert.equal(await page.textContent('#quizTitle'), '¿Qué voluntario eres?');
  await page.click('[data-quiz="start"]');
  for (let q = 1; q <= 5; q++) await page.click(`.quiz__q[data-q="${q}"] .quiz__opt[data-perfil="motor"]`);
  await page.waitForSelector('.quiz__perfil[data-perfil="motor"]:not([hidden])');
  assert.equal((await page.textContent('.quiz__perfil[data-perfil="motor"] .quiz__perfil-name')).trim(), 'Motor del equipo');
  assert.match(await page.textContent('.quiz__bar.is-top'), /Motor del equipo/);
  assert.equal(await page.getAttribute('.quiz__actions a.btn--primary', 'href'), 'contacte.html#uneix-te');
  await context.close();
  assert.deepEqual(errors, []);
});

test('portada: Instagram (perfil, destacades i QR); sense Instagram automàtic es veuen les targetes fixes', async (t) => {
  if (skip) return t.skip(skip);
  const { page, context, errors } = await open('index.html');
  const ext = [];
  const feed = [];
  page.on('request', (r) => {
    if (!r.url().startsWith(server.url)) ext.push(r.url());
    if (r.url().includes('instagram-feed.php')) feed.push(r.url());
  });
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(feed.length, 1, 'demana les publicacions automàtiques a la mateixa web');
  assert.equal(await page.locator('.ig-grid .ig-post').count(), 3);
  assert.equal(await page.locator('.ig-grid[data-ig-auto]').count(), 0);
  assert.equal(await page.isVisible('[data-ig="stats"]'), false, 'sense dades no es mostren xifres');
  assert.equal(await page.isVisible('.ig-qr__img'), true, 'el QR es veu a l\'ordinador');
  assert.equal(await page.locator('.ig-qr__img').evaluate((i) => i.complete && i.naturalWidth > 0), true);
  assert.equal(await page.getAttribute('.ig-profile__follow', 'href'), 'https://www.instagram.com/rotaractigualada/');
  // Les destacades porten a la web (Galeria → pestanya Galeria d'Activitats)
  await page.click('.ig-highlight[href="activitats.html#galeria"]');
  await page.waitForURL(/activitats\.html#galeria$/);
  await page.waitForFunction(() => document.getElementById('galeria')?.classList.contains('act-tab-section--active'));
  assert.deepEqual(ext, [], 'no es connecta amb Instagram fins que no es clica un enllaç');
  await context.close();
  assert.deepEqual(errors, []);
});

test('portada: amb l\'Instagram automàtic hi surten les últimes publicacions, el tipus, la data i les xifres', async (t) => {
  if (skip) return t.skip(skip);
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', locale: 'ca-ES' });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
  const day = 86400000;
  const posts = [
    { url: 'https://www.instagram.com/p/AAA111/', img: 'instagram/auto/1001.jpg', caption: 'Castanyada solidària', date: new Date(Date.now() - day).toISOString(), type: 'carrusel' },
    { url: 'https://www.instagram.com/reel/BBB222/', img: 'instagram/auto/1002.jpg', caption: 'Reel del Gran Recapte', date: '2026-01-15T10:00:00+0000', type: 'video' },
    { url: 'https://www.instagram.com/p/CCC333/', img: 'instagram/auto/1003.jpg', caption: '', date: '', type: 'foto' },
    { url: 'https://evil.example/p/x/', img: 'instagram/auto/1004.jpg', caption: 'no', type: 'foto' },
    { url: 'https://www.instagram.com/p/DDD444/', img: 'https://evil.example/x.jpg', caption: 'no', type: 'foto' }
  ];
  await context.route('**/instagram-feed.php', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ profile: { username: 'rotaractigualada', posts: 48, followers: 12345 }, posts })
  }));
  await context.route(/\/instagram\/auto\/\d+\.jpg$/, (route) => route.fulfill({
    status: 200, contentType: 'image/jpeg', body: readFileSync(join(ROOT, 'instagram', 'post-1.jpg'))
  }));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(server.url + '/index.html', { waitUntil: 'load' });
  await page.waitForSelector('.ig-grid[data-ig-auto]');
  const tiles = page.locator('.ig-grid .ig-post');
  assert.equal(await tiles.count(), 3, 'només les publicacions vàlides');
  assert.deepEqual(await tiles.evaluateAll((as) => as.map((a) => [a.getAttribute('href'), a.getAttribute('data-tipus'), a.target])), [
    ['https://www.instagram.com/p/AAA111/', 'carrusel', '_blank'],
    ['https://www.instagram.com/reel/BBB222/', 'video', '_blank'],
    ['https://www.instagram.com/p/CCC333/', null, '_blank']
  ]);
  assert.equal(await tiles.nth(0).locator('.ig-post__date').textContent(), 'ahir');
  assert.match(await tiles.nth(1).locator('.ig-post__date').textContent(), /^15 (de )?gen\.? (del )?2026$/);
  assert.equal(await tiles.nth(2).locator('img').getAttribute('alt'), 'Publicació de @rotaractigualada a Instagram');
  assert.equal(await page.locator('.ig-grid img').evaluateAll((imgs) => imgs.every((i) => i.src.startsWith(location.origin + '/instagram/auto/'))), true);
  assert.equal(await page.isVisible('[data-ig="stats"]'), true);
  assert.equal(await page.textContent('[data-ig="posts"]'), '48');
  assert.equal(await page.textContent('[data-ig="followers"]'), '12.345');
  await context.close();
  assert.deepEqual(errors, []);
});

test('portada en mòbil: Instagram com a l\'app (sense QR), destacades que es poden lliscar', async (t) => {
  if (skip) return t.skip(skip);
  const { page, context, errors } = await open('index.html', { width: 375, height: 800 });
  await page.locator('#instagram').scrollIntoViewIfNeeded();
  assert.equal(await page.isVisible('.ig-qr'), false, 'al mòbil no cal el QR');
  const list = await page.locator('.ig-highlights__list').evaluate((l) => {
    const first = l.querySelector('li').getBoundingClientRect();
    return { scrolls: l.scrollWidth > l.clientWidth, firstVisible: first.left >= l.getBoundingClientRect().left - 1 };
  });
  assert.deepEqual(list, { scrolls: true, firstVisible: true });
  const follow = await page.locator('.ig-profile__follow').boundingBox();
  const card = await page.locator('.ig-card').boundingBox();
  assert.ok(follow.width > card.width * 0.75, 'el botó «Segueix-nos» ocupa tota l\'amplada');
  await context.close();
  assert.deepEqual(errors, []);
});
