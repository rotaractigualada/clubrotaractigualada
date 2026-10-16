/* Tests de instagram-feed.php (Instagram automàtic de la portada).
   Fan servir una API d'Instagram de proves en local (RT_IG_API): mai es
   connecten a Instagram. Necessiten PHP; si no n'hi ha, se salten. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { hasPhp, startServer, ROOT } from './helpers.mjs';

const skip = !hasPhp() && 'PHP no disponible';
const TOKEN = 'IGAAtoken0000000000000000000000';
const NEW_TOKEN = 'IGAArefreshed1111111111111111111';
const JPEG = readFileSync(join(ROOT, 'instagram', 'post-1.jpg'));

/* API d'Instagram de proves: /me, /me/media, /refresh_access_token i imatges */
async function mockApi() {
  const api = { calls: [], fail: false, media: [] };
  const srv = createServer((req, res) => {
    const u = new URL(req.url, 'http://localhost');
    api.calls.push(u.pathname);
    const send = (code, body, type = 'application/json') => {
      res.writeHead(code, { 'Content-Type': type });
      res.end(Buffer.isBuffer(body) ? body : JSON.stringify(body));
    };
    if (api.fail) return send(500, { error: { message: 'Instagram no respon' } });
    if (u.pathname.startsWith('/img/')) return send(200, JPEG, 'image/jpeg');
    if (![TOKEN, NEW_TOKEN].includes(u.searchParams.get('access_token'))) return send(400, { error: { message: 'token' } });
    if (u.pathname === '/me/media') return send(200, { data: api.media });
    if (u.pathname === '/me') return send(200, { id: '1', username: 'rotaractigualada', media_count: 48, followers_count: 1234 });
    if (u.pathname === '/refresh_access_token') return send(200, { access_token: NEW_TOKEN, token_type: 'bearer', expires_in: 5184000 });
    send(404, {});
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  api.url = `http://127.0.0.1:${srv.address().port}`;
  api.close = () => srv.close();
  return api;
}

const media = (api) => [
  { id: '1001', media_type: 'CAROUSEL_ALBUM', media_url: `${api.url}/img/1.jpg`, permalink: 'https://www.instagram.com/p/AAA111/', timestamp: '2026-10-14T18:00:00+0000', caption: 'Castanyada   solidària\na la plaça 🌰 ' + 'molt '.repeat(40) },
  { id: '1002', media_type: 'VIDEO', thumbnail_url: `${api.url}/img/2.jpg`, media_url: 'https://video.example/2.mp4', permalink: 'https://www.instagram.com/reel/BBB222/', timestamp: '2026-10-10T10:00:00+0000', caption: 'Reel del Gran Recapte' },
  { id: '1003', media_type: 'IMAGE', media_url: `${api.url}/img/3.jpg`, permalink: 'https://www.instagram.com/p/CCC333/', timestamp: '2026-10-01T10:00:00+0000' },
  // No vàlides: id estrany, enllaç que no és d'Instagram, imatge per http d'un altre lloc
  { id: '../../x', media_type: 'IMAGE', media_url: `${api.url}/img/4.jpg`, permalink: 'https://www.instagram.com/p/DDD444/' },
  { id: '1005', media_type: 'IMAGE', media_url: `${api.url}/img/5.jpg`, permalink: 'https://evil.example/p/EEE555/' },
  { id: '1006', media_type: 'IMAGE', media_url: 'http://evil.example/6.jpg', permalink: 'https://www.instagram.com/p/FFF666/' }
];

const feed = (server) => fetch(server.url + '/instagram-feed.php');
const stateFile = (server) => join(server.dir, 'form-data', 'instagram', 'estat.json');
const readState = (server) => JSON.parse(readFileSync(stateFile(server), 'utf8'));
const writeState = (server, s) => writeFileSync(stateFile(server), JSON.stringify(s));
const imageSize = (file) => JSON.parse(spawnSync('php', ['-r', 'echo json_encode(array_slice(getimagesize($argv[1]), 0, 2));', file]).stdout.toString());

async function withFeed(fn, { token = TOKEN } = {}) {
  const api = await mockApi();
  const server = await startServer({ env: { RT_IG_API: api.url } });
  try {
    if (token) {
      mkdirSync(join(server.dir, 'form-data'), { recursive: true });
      writeFileSync(join(server.dir, 'form-data', 'instagram-token.txt'), token + '\n');
    }
    api.media = media(api);
    return await fn(server, api);
  } finally {
    server.stop();
    api.close();
  }
}

test('instagram-feed: sense token respon 204 i no es connecta enlloc', { skip }, () => withFeed(async (server, api) => {
  const res = await feed(server);
  assert.equal(res.status, 204);
  assert.deepEqual(api.calls, []);
  const post = await fetch(server.url + '/instagram-feed.php', { method: 'POST' });
  assert.equal(post.status, 405);
}, { token: null }));

test('instagram-feed: publicacions, perfil, imatges locals, còpia d\'una hora, Instagram caigut i renovació del token', { skip }, () => withFeed(async (server, api) => {
  // 1) Primera visita: consulta Instagram i desa les imatges
  let res = await feed(server);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /application\/json/);
  const data = await res.json();
  assert.deepEqual(data.profile, { username: 'rotaractigualada', posts: 48, followers: 1234 });
  assert.deepEqual(data.posts.map((p) => [p.url, p.img, p.type]), [
    ['https://www.instagram.com/p/AAA111/', 'instagram/auto/1001.jpg', 'carrusel'],
    ['https://www.instagram.com/reel/BBB222/', 'instagram/auto/1002.jpg', 'video'],
    ['https://www.instagram.com/p/CCC333/', 'instagram/auto/1003.jpg', 'foto']
  ], 'només les publicacions vàlides');
  assert.ok(data.posts[0].caption.startsWith('Castanyada solidària a la plaça 🌰'), 'espais junts');
  assert.ok([...data.posts[0].caption].length <= 140 && data.posts[0].caption.endsWith('…'), 'peu retallat');
  assert.equal(data.posts[1].date, '2026-10-10T10:00:00+0000');
  assert.equal(data.posts[2].caption, '');
  const auto = join(server.dir, 'instagram', 'auto');
  assert.deepEqual(readdirSync(auto).sort(), ['1001.jpg', '1002.jpg', '1003.jpg']);
  assert.deepEqual(imageSize(join(auto, '1001.jpg')), [640, 640], 'miniatures de 640 px');
  assert.ok(!existsSync(join(server.dir, 'x.jpg')) && !api.calls.includes('/img/6.jpg'));
  const img = await fetch(server.url + '/instagram/auto/1002.jpg');
  assert.equal(img.status, 200, 'les imatges es serveixen des de la web');

  // 2) Durant una hora no es torna a consultar Instagram
  const before = api.calls.length;
  res = await feed(server);
  assert.equal(res.status, 200);
  assert.equal(api.calls.length, before);

  // 3) Instagram caigut: es continua servint la còpia desada i no s'hi insisteix
  writeState(server, { ...readState(server), actualitzat: 0 });
  api.fail = true;
  res = await feed(server);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).posts.length, 3);
  assert.ok(readState(server).error, 'desa l\'error');
  const afterFail = api.calls.length;
  await feed(server);
  assert.equal(api.calls.length, afterFail, 'espera 10 minuts abans de tornar-ho a provar');

  // 4) Al cap d'una setmana renova el token i una publicació nova substitueix una d'antiga
  api.fail = false;
  const s = readState(server);
  delete s.error;
  writeState(server, { ...s, actualitzat: 0, token_desde: Math.floor(Date.now() / 1000) - 8 * 86400 });
  api.media = [{ id: '2001', media_type: 'IMAGE', media_url: `${api.url}/img/7.jpg`, permalink: 'https://www.instagram.com/p/GGG777/', caption: 'Nova' }, ...media(api).slice(0, 2)];
  res = await feed(server);
  const fresh = await res.json();
  assert.deepEqual(fresh.posts.map((p) => p.img), ['instagram/auto/2001.jpg', 'instagram/auto/1001.jpg', 'instagram/auto/1002.jpg']);
  assert.deepEqual(readdirSync(auto).sort(), ['1001.jpg', '1002.jpg', '2001.jpg'], 'esborra les imatges que ja no surten');
  assert.ok(api.calls.includes('/refresh_access_token'));
  assert.equal(readFileSync(join(server.dir, 'form-data', 'instagram-token.txt'), 'utf8').trim(), NEW_TOKEN);
}));

test('instagram-feed: si Instagram falla la primera vegada, respon 204 (la portada mostra les targetes fixes)', { skip }, () => withFeed(async (server, api) => {
  api.fail = true;
  const res = await feed(server);
  assert.equal(res.status, 204);
}));
