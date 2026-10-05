/* Tests del backend del formulari (csrf.php + form-handler.php).
   Necessiten PHP instal·lat; si no n'hi ha, se salten.
   En local mail() no pot enviar correu: form-handler respon 500
   {"error":"mail"} però abans ja ha desat la tramesa al CSV. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { hasPhp, startServer } from './helpers.mjs';

const skip = !hasPhp() && 'PHP no disponible';
let server;

before(async () => { if (!skip) server = await startServer(); });
after(() => { if (server) server.stop(); });

async function getCsrf() {
  const res = await fetch(server.url + '/csrf.php');
  const cookie = res.headers.get('set-cookie').split(';')[0];
  const { csrf } = await res.json();
  return { cookie, csrf };
}

function post(fields, { cookie, origin } = {}) {
  const body = new URLSearchParams(fields);
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (cookie) headers.Cookie = cookie;
  if (origin) headers.Origin = origin;
  return fetch(server.url + '/form-handler.php', { method: 'POST', body, headers });
}

const VALID = {
  name: 'Anna',
  email: 'anna@example.com',
  subject: 'dubte',
  message: 'Hola! Voldria informació.',
  privacy: '1'
};

test('GET no està permès', { skip }, async () => {
  const res = await fetch(server.url + '/form-handler.php');
  assert.equal(res.status, 405);
});

test('csrf.php retorna un token de 64 caràcters en una cookie HttpOnly', { skip }, async () => {
  const res = await fetch(server.url + '/csrf.php');
  const { csrf } = await res.json();
  assert.match(csrf, /^[a-f0-9]{64}$/);
  assert.match(res.headers.get('set-cookie'), /HttpOnly/i);
});

test('sense token CSRF es rebutja (403)', { skip }, async () => {
  const res = await post(VALID);
  assert.equal(res.status, 403);
});

test('amb Origin d\'un altre domini es rebutja (403)', { skip }, async () => {
  const { cookie, csrf } = await getCsrf();
  const res = await post({ ...VALID, csrf_token: csrf }, { cookie, origin: 'https://evil.example' });
  assert.equal(res.status, 403);
});

test('camps invàlids retornen 400 amb la llista de camps', { skip }, async () => {
  const { cookie, csrf } = await getCsrf();
  const res = await post({ csrf_token: csrf, name: '', email: 'no-es-correu', subject: 'hack', message: '' }, { cookie });
  assert.equal(res.status, 400);
  const json = await res.json();
  assert.deepEqual(json.fields.sort(), ['email', 'message', 'name', 'privacy', 'subject']);
});

test('honeypot: els bots reben 200 però no es desa res', { skip }, async () => {
  const { cookie, csrf } = await getCsrf();
  const res = await post({ ...VALID, csrf_token: csrf, website: 'http://spam' }, { cookie });
  assert.equal(res.status, 200);
  assert.equal(existsSync(join(server.dir, 'form-data', 'submissions.csv')), false);
});

test('una tramesa vàlida es desa amb cognoms i telèfon, i protegeix el CSV', { skip }, async () => {
  const { cookie, csrf } = await getCsrf();
  const res = await post({
    ...VALID,
    csrf_token: csrf,
    surname: 'Puig',
    phone: '+34 600 000 000',
    message: '=HYPERLINK("http://x")'
  }, { cookie });
  const json = await res.json();
  // 200 si el servidor té correu configurat; 500 "mail" en local
  assert.ok(res.status === 200 || json.error === 'mail', `resposta inesperada ${res.status} ${JSON.stringify(json)}`);

  const csv = readFileSync(join(server.dir, 'form-data', 'submissions.csv'), 'utf8');
  assert.match(csv, /"Anna Puig";"anna@example\.com";"Dubte";"'=HYPERLINK\(""http:\/\/x""\)";"'\+34 600 000 000";"General"/);

  // Límit d'enviaments: un segon enviament immediat es rebutja
  const again = await post({ ...VALID, csrf_token: csrf }, { cookie });
  assert.equal(again.status, 429);
});

test('destinatari: només claus de la llista blanca (una adreça inventada va al general)', { skip }, async () => {
  // Servidor nou: el límit d'enviaments del test anterior no hi afecta
  const srv = await startServer();
  try {
    const send = async (recipient) => {
      const res = await fetch(srv.url + '/csrf.php');
      const cookie = res.headers.get('set-cookie').split(';')[0];
      const { csrf } = await res.json();
      return fetch(srv.url + '/form-handler.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie },
        body: new URLSearchParams({ ...VALID, csrf_token: csrf, recipient })
      });
    };
    await send('presidencia');
    const csv = readFileSync(join(srv.dir, 'form-data', 'submissions.csv'), 'utf8');
    assert.match(csv, /;"Presidència"\n$/);
  } finally {
    srv.stop();
  }
  const srv2 = await startServer();
  try {
    const res = await fetch(srv2.url + '/csrf.php');
    const cookie = res.headers.get('set-cookie').split(';')[0];
    const { csrf } = await res.json();
    await fetch(srv2.url + '/form-handler.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie },
      body: new URLSearchParams({ ...VALID, csrf_token: csrf, recipient: 'atacant@evil.example' })
    });
    const csv = readFileSync(join(srv2.dir, 'form-data', 'submissions.csv'), 'utf8');
    assert.match(csv, /;"General"\n$/);
  } finally {
    srv2.stop();
  }
});
