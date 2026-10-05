/* Tests amb navegador real (Playwright + Chromium) sobre el servidor PHP.
   Se salten si falta Playwright, el navegador o PHP.
   Instal·lació: npm install && npx playwright install chromium */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hasPhp, startServer, PAGES } from './helpers.mjs';

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
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
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

test('formulari de contacte: validació al client amb errors accessibles', async (t) => {
  if (skip) return t.skip(skip);
  const { page, context } = await open('contacte.html');
  // Clicar l'etiqueta «Assumpte» no ha de seleccionar cap opció
  await page.click('#contactSubjectLabel');
  assert.equal(await page.locator('input[name="subject"]:checked').count(), 0);

  await page.click('#submitBtn');
  assert.equal(await page.getAttribute('#contactName', 'aria-invalid'), 'true');
  const errId = await page.getAttribute('#contactName', 'aria-describedby');
  assert.ok(errId && (await page.locator('#' + errId).isVisible()));

  await page.fill('#contactName', 'Anna');
  assert.equal(await page.getAttribute('#contactName', 'aria-invalid'), null);
  await context.close();
});

test('formulari de contacte: enviament complet fins al backend', async (t) => {
  if (skip) return t.skip(skip);
  const { page, context } = await open('contacte.html');
  await page.fill('#contactName', 'Anna');
  await page.fill('#contactSurname', 'Puig');
  await page.fill('#contactEmail', 'anna@example.com');
  await page.fill('#contactPhone', '600000000');
  await page.click('label.subject-pill:has(input[value="proposta"])');
  assert.ok(await page.isChecked('input[name="subject"][value="proposta"]'));
  await page.fill('#contactMessage', 'Una proposta de prova');
  await page.check('#contactPrivacy');
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/form-handler.php')),
    page.click('#submitBtn')
  ]);
  // En local mail() falla (500), però la tramesa ja s'ha desat al CSV:
  // vol dir que ha passat el CSRF i la validació del servidor.
  assert.ok([200, 500].includes(response.status()), 'estat ' + response.status());
  const csv = readFileSync(join(server.dir, 'form-data', 'submissions.csv'), 'utf8');
  assert.match(csv, /"Anna Puig";"anna@example\.com";"Proposta";"Una proposta de prova";"600000000";"General"/);
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

test('canvi d\'idioma: tradueix i es recorda en canviar de pàgina', async (t) => {
  if (skip) return t.skip(skip);
  const { page, context } = await open('index.html');
  await page.click('.header__lang .lang-menu__btn');
  await page.click('.header__lang [data-lang-opt="en"]');
  assert.equal(await page.getAttribute('html', 'lang'), 'en');
  assert.equal((await page.locator('.hero__title').innerText()).trim(), 'ROTARACT CLUB OF IGUALADA');
  await page.goto(server.url + '/contacte.html');
  assert.equal(await page.getAttribute('html', 'lang'), 'en');
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

test('targetes de correu: mostren l\'adreça i el missatge va a la persona triada', async (t) => {
  if (skip) return t.skip(skip);
  const { page, context } = await open('contacte.html');
  const cards = page.locator('.qc-card.contact-email-link');
  assert.deepEqual(
    (await cards.locator('.qc-card__text span').allInnerTexts()).map((x) => x.trim()),
    ['rotaractigualada@gmail.com', 'gerard.lopez@rotary2202.org', 'luca.santos@rotary2202.org']
  );
  await page.click('.qc-card[data-recipient="secretaria"]');
  assert.equal((await page.locator('#recipientEmailDisplay').innerText()).trim(), 'luca.santos@rotary2202.org');
  assert.equal(await page.inputValue('#contactRecipient'), 'secretaria');
  await context.close();
});
