/* build-idiomes.mjs — Genera les versions en castellà (/es/) i anglès (/en/)
   a partir de les pàgines en català de l'arrel.

   Font única: els fitxers HTML de l'arrel (català) amb els textos traduïts
   als atributs data-en i al diccionari castellà d'i18n.js. Quan canviïs un
   text, edita només la versió catalana i torna a executar:

       npm run build:idiomes

   Què fa per a cada pàgina i idioma:
   - Tradueix el contingut amb la mateixa funció que fa servir la web
     (window.RotaractI18n.translateDom), sense executar cap altre script.
   - Ajusta els camins dels recursos (CSS, JS, imatges…) perquè funcionin
     des de la subcarpeta (../).
   - Posa l'adreça canònica, Open Graph i la descripció de l'idioma.
   - Afegeix les etiquetes hreflang (també a les pàgines catalanes).

   Ús: node scripts/build-idiomes.mjs [carpeta_de_sortida]
   (per defecte, l'arrel del projecte: escriu es/ i en/). */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] || ROOT;
const SITE = 'https://rotaractigualada.org';
const PAGES = ['index.html', 'nosaltres.html', 'activitats.html', 'directiu.html', 'contacte.html'];
const LANGS = ['es', 'en'];
const LOCALES = { ca: 'ca_ES', es: 'es_ES', en: 'en_GB' };

/* Descripcions per a cercadors i xarxes (les catalanes són a l'HTML) */
const META = {
  'index.html': {
    es: 'Rotaract Igualada: jóvenes comprometidos con proyectos sociales y de liderazgo en el Anoia. Descubre nuestras actividades, nuestra historia y cómo unirte.',
    en: 'Rotaract Igualada: young people committed to social and leadership projects in the Anoia region. Discover our activities, our story and how to join.'
  },
  'nosaltres.html': {
    es: 'Conoce la historia y los valores del Club Rotaract de Igualada, parte de la red de Rotary International, y descubre cómo colaboramos con Rotary Igualada.',
    en: 'Learn about the history and values of Rotaract Club Igualada, part of the Rotary International network, and how we work with Rotary Club Igualada.'
  },
  'activitats.html': {
    es: 'Actividades y proyectos solidarios, culturales, deportivos y de formación de Rotaract Igualada. Consulta el calendario e inscríbete.',
    en: 'Solidarity, cultural, sports and training activities and projects by Rotaract Igualada. Check the calendar and sign up.'
  },
  'directiu.html': {
    es: 'Conoce la junta directiva y los socios del Club Rotaract de Igualada, el club de jóvenes de Rotary en el Anoia.',
    en: 'Meet the board and members of Rotaract Club Igualada, Rotary\'s youth club in the Anoia region.'
  },
  'contacte.html': {
    es: 'Contacta con Rotaract Igualada. Escríbenos, únete al club o propón una colaboración.',
    en: 'Contact Rotaract Igualada. Write to us, join the club or propose a collaboration.'
  }
};
const IMAGE_ALT = {
  es: 'Los jóvenes del Club Rotaract de Igualada',
  en: 'The young members of Rotaract Club Igualada'
};

const pageUrl = (lang, page) =>
  SITE + (lang === 'ca' ? '/' : `/${lang}/`) + (page === 'index.html' ? '' : page);

/* Bloc hreflang (igual a les tres versions de cada pàgina) */
function hreflangBlock(page) {
  const links = ['ca', 'es', 'en']
    .map((l) => `  <link rel="alternate" hreflang="${l}" href="${pageUrl(l, page)}">`)
    .concat(`  <link rel="alternate" hreflang="x-default" href="${pageUrl('ca', page)}">`);
  return '  <!-- hreflang -->\n' + links.join('\n') + '\n  <!-- /hreflang -->\n';
}

/* Afegeix o actualitza el bloc hreflang a les pàgines catalanes (font) */
function updateSourceHreflang(page) {
  const file = join(ROOT, page);
  let html = readFileSync(file, 'utf8');
  const block = hreflangBlock(page);
  if (html.includes('<!-- hreflang -->')) {
    html = html.replace(/  <!-- hreflang -->\n[\s\S]*?  <!-- \/hreflang -->\n/, block);
  } else {
    html = html.replace(/(  <link rel="canonical"[^>]*>\n)/, `$1${block}`);
  }
  writeFileSync(file, html);
}

/* Servidor estàtic mínim per obrir les pàgines al navegador */
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript' };
function startStatic() {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = join(ROOT, path === '/' ? 'index.html' : path);
    if (!file.startsWith(ROOT) || !existsSync(file)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

/* sitemap.xml amb les tres versions de cada pàgina enllaçades entre si */
const PRIORITY = { 'index.html': ['monthly', '1.0'], 'nosaltres.html': ['yearly', '0.8'], 'activitats.html': ['weekly', '0.9'], 'directiu.html': ['monthly', '0.7'], 'contacte.html': ['yearly', '0.8'] };
function writeSitemap(dir) {
  const today = new Date().toISOString().slice(0, 10);
  const alternates = (page) => ['ca', 'es', 'en']
    .map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${pageUrl(l, page)}"/>`)
    .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl('ca', page)}"/>`).join('\n');
  const urls = [];
  for (const lang of ['ca', 'es', 'en']) {
    for (const page of PAGES) {
      const [freq, prio] = PRIORITY[page];
      urls.push(`  <url>\n    <loc>${pageUrl(lang, page)}</loc>\n${alternates(page)}\n    <lastmod>${today}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${prio}</priority>\n  </url>`);
    }
  }
  writeFileSync(join(dir, 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n<!-- Generat per scripts/build-idiomes.mjs -->\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
    + urls.join('\n') + '\n</urlset>\n');
}

async function main() {
  const { chromium } = await import('playwright');
  for (const page of PAGES) updateSourceHreflang(page);

  const server = await startStatic();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  try {
    for (const lang of LANGS) {
      mkdirSync(join(OUT, lang), { recursive: true });
      for (const page of PAGES) {
        const context = await browser.newContext();
        // Cap script de la pàgina s'executa: el DOM queda tal com és a l'HTML
        await context.route('**/*', (route) => {
          const url = route.request().url();
          if (!url.startsWith(base) || url.endsWith('.js')) return route.abort();
          return route.continue();
        });
        const tab = await context.newPage();
        await tab.goto(`${base}/${page}`, { waitUntil: 'domcontentloaded' });
        await tab.addScriptTag({ content: readFileSync(join(ROOT, 'i18n.js'), 'utf8') + '\n//# build' });

        await tab.evaluate(({ lang, page, meta, alt, canonical, locale }) => {
          window.RotaractI18n.translateDom(lang);
          // Treu l'script injectat per traduir
          document.querySelectorAll('script:not([src])').forEach((s) => {
            if (/\/\/# build/.test(s.textContent)) s.remove();
          });

          // Recursos relatius → ../ (els enllaços a altres pàgines .html es queden)
          const isLocalAsset = (v) => v && !/^(https?:|mailto:|tel:|#|data:|javascript:|\/)/i.test(v)
            && !/^[^?#]*\.html([?#].*)?$/i.test(v);
          document.querySelectorAll('[src],[href]').forEach((el) => {
            ['src', 'href'].forEach((a) => {
              const v = el.getAttribute(a);
              if (isLocalAsset(v)) el.setAttribute(a, '../' + v);
            });
          });
          document.querySelectorAll('[srcset]').forEach((el) => {
            el.setAttribute('srcset', el.getAttribute('srcset').split(',').map((part) => {
              const [u, ...rest] = part.trim().split(/\s+/);
              return [isLocalAsset(u) ? '../' + u : u, ...rest].join(' ');
            }).join(', '));
          });

          const setMeta = (sel, attr, value) => { const el = document.querySelector(sel); if (el) el.setAttribute(attr, value); };
          setMeta('link[rel="canonical"]', 'href', canonical);
          setMeta('meta[property="og:url"]', 'content', canonical);
          setMeta('meta[property="og:locale"]', 'content', locale);
          setMeta('meta[name="description"]', 'content', meta);
          setMeta('meta[property="og:description"]', 'content', meta);
          setMeta('meta[property="og:title"]', 'content', document.title);
          setMeta('meta[property="og:image:alt"]', 'content', alt);
        }, {
          lang,
          page,
          meta: META[page][lang],
          alt: IMAGE_ALT[lang],
          canonical: pageUrl(lang, page),
          locale: LOCALES[lang]
        });

        let html = await tab.content();
        html = html.replace(/^<!DOCTYPE html>/i,
          `<!DOCTYPE html>\n<!-- Generat automàticament per scripts/build-idiomes.mjs a partir de ${page}. No l'editis: canvia la versió catalana i torna a executar npm run build:idiomes. -->\n`);
        writeFileSync(join(OUT, lang, page), html.endsWith('\n') ? html : html + '\n');
        await context.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  writeSitemap(OUT);
  console.log(`Versions generades a ${join(OUT, 'es')} i ${join(OUT, 'en')}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
