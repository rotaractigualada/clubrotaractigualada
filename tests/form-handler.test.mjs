/* Tests del backend dels formularis de Contacte (form-handler.php):
   «Vull informació» (tipus=info) i «Vull unir-me» (tipus=unir).
   Necessiten PHP instal·lat; si no n'hi ha, se salten.
   En local mail() no pot enviar correu: form-handler respon 500
   {"error":"mail"} però abans ja ha desat la tramesa al CSV. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { hasPhp, startServer } from './helpers.mjs';

const skip = !hasPhp() && 'PHP no disponible';

/* Cada test fa servir un servidor nou: el límit d'enviaments per IP
   d'un test no afecta els altres. */
async function withServer(fn) {
  const server = await startServer();
  try { return await fn(server); } finally { server.stop(); }
}

function post(server, fields, { json = true, origin, referer } = {}) {
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (json) headers.Accept = 'application/json';
  if (origin) headers.Origin = origin;
  if (referer) headers.Referer = referer;
  return fetch(server.url + '/form-handler.php', {
    method: 'POST', headers, body: new URLSearchParams(fields), redirect: 'manual'
  });
}

const csv = (server) => readFileSync(join(server.dir, 'form-data', 'submissions.csv'), 'utf8');

const INFO = { tipus: 'info', name: 'Anna', email: 'anna@example.com', subject: 'dubte', message: 'Hola! Voldria informació.', privacy: '1', elapsed: '12' };
const UNIR = { tipus: 'unir', name: 'Pau', surname: 'Vila', email: 'pau@example.com', phone: '+34 600 000 000', age: '22', message: 'M\'agradaria fer voluntariat.', privacy: '1', elapsed: '20' };

test('GET no està permès', { skip }, () => withServer(async (server) => {
  const res = await fetch(server.url + '/form-handler.php');
  assert.equal(res.status, 405);
}));

test('des d\'un altre domini es rebutja (403)', { skip }, () => withServer(async (server) => {
  assert.equal((await post(server, INFO, { origin: 'https://evil.example' })).status, 403);
  assert.equal((await post(server, INFO, { referer: 'https://evil.example/x' })).status, 403);
}));

test('informació: camps invàlids retornen 400 amb la llista de camps', { skip }, () => withServer(async (server) => {
  const res = await post(server, { tipus: 'info', name: '', email: 'no-es-correu', subject: 'hack', message: '' });
  assert.equal(res.status, 400);
  const json = await res.json();
  assert.deepEqual(json.fields.sort(), ['email', 'message', 'name', 'privacy', 'subject']);
}));

test('unir-se: camps invàlids retornen 400 (edat i telèfon inclosos)', { skip }, () => withServer(async (server) => {
  const res = await post(server, { ...UNIR, message: '', age: 'abc', phone: 'xx' });
  assert.equal(res.status, 400);
  assert.deepEqual((await res.json()).fields.sort(), ['age', 'message', 'phone']);
}));

test('honeypot i enviaments massa ràpids: responen 200 però no es desa res', { skip }, () => withServer(async (server) => {
  assert.equal((await post(server, { ...INFO, website: 'http://spam' })).status, 200);
  assert.equal((await post(server, { ...INFO, elapsed: '1' })).status, 200);
  assert.equal(existsSync(join(server.dir, 'form-data', 'submissions.csv')), false);
}));

test('informació: tramesa vàlida desada (amb protecció del CSV) i límit d\'enviaments', { skip }, () => withServer(async (server) => {
  const res = await post(server, { ...INFO, recipient: 'presidencia', message: '=HYPERLINK("http://x")' });
  const json = await res.json();
  // 200 si el servidor té correu configurat; 500 "mail" en local
  assert.ok(res.status === 200 || json.error === 'mail', `resposta inesperada ${res.status} ${JSON.stringify(json)}`);
  assert.match(csv(server), /;"Anna";"anna@example\.com";"Dubte";"'=HYPERLINK\(""http:\/\/x""\)";"";"Presidència";""\n$/);
  // Un segon enviament immediat es rebutja
  assert.equal((await post(server, INFO)).status, 429);
}));

test('informació: només destinataris de la llista blanca (una adreça inventada va al general)', { skip }, () => withServer(async (server) => {
  await post(server, { ...INFO, recipient: 'atacant@evil.example' });
  assert.match(csv(server), /;"General";""\n$/);
}));

test('unir-se: la sol·licitud es desa amb cognoms, telèfon i edat, i va al club', { skip }, () => withServer(async (server) => {
  const res = await post(server, UNIR);
  const json = await res.json();
  assert.ok(res.status === 200 || json.error === 'mail', `resposta inesperada ${res.status}`);
  assert.match(csv(server), /;"Pau Vila";"pau@example\.com";"Uneix-te";"M'agradaria fer voluntariat\.";"'\+34 600 000 000";"General";"22"\n$/);
}));

test('sense JavaScript: l\'enviament normal torna a Contacte (mai una pàgina en blanc)', { skip }, () => withServer(async (server) => {
  // (primer l'invàlid: els enviaments vàlids activen el límit d'enviaments)
  const bad = await post(server, { tipus: 'info' }, { json: false });
  assert.equal(bad.status, 303);
  assert.equal(bad.headers.get('location'), '/contacte.html?enviat=camps#escriu-nos');
  const ok = await post(server, UNIR, { json: false, referer: server.url + '/es/contacte.html' });
  assert.equal(ok.status, 303);
  assert.match(ok.headers.get('location'), /^\/es\/contacte\.html\?enviat=(ok|error)#uneix-te$/);
}));
