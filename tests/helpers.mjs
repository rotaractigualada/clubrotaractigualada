/* Utilitats comunes dels tests.
   startServer() copia el lloc a un directori temporal i hi arrenca
   `php -S`, perquè els enviaments del formulari (form-data/) no
   embrutin el repositori. */
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const PAGES = ['index.html', 'nosaltres.html', 'activitats.html', 'directiu.html', 'contacte.html'];

export function read(file) {
  return readFileSync(join(ROOT, file), 'utf8');
}

export function hasPhp() {
  return spawnSync('php', ['-v']).status === 0;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

export async function startServer() {
  const dir = mkdtempSync(join(tmpdir(), 'rotaract-web-'));
  for (const entry of readdirSync(ROOT)) {
    if (['node_modules', '.git', 'tests', 'form-data'].includes(entry)) continue;
    cpSync(join(ROOT, entry), join(dir, entry), { recursive: true });
  }
  const port = await freePort();
  const proc = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', dir], {
    stdio: 'ignore',
    // php -S és d'un sol fil: amb diversos workers, les connexions que el
    // navegador deixa obertes no bloquegen les peticions següents.
    env: { ...process.env, PHP_CLI_SERVER_WORKERS: '4' }
  });
  const url = `http://127.0.0.1:${port}`;
  // Espera que el servidor respongui
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(url + '/robots.txt');
      if (res.ok) break;
    } catch { /* encara arrencant */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  return {
    url,
    dir,
    stop() {
      proc.kill();
      rmSync(dir, { recursive: true, force: true });
    }
  };
}
