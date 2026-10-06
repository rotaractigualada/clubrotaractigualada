# Club Rotaract d'Igualada — web

Web estàtica (HTML, CSS i JavaScript sense framework ni compilació) amb un
petit backend en PHP per al formulari de contacte. Es publica en un
servidor Apache (fa servir `.htaccess`).

## Estructura

| Fitxer | Funció |
| --- | --- |
| `index.html`, `nosaltres.html`, `activitats.html`, `directiu.html`, `contacte.html` | Pàgines |
| `rotaractigualada.css` | Estils comuns (totes les pàgines excepte contacte) |
| `contacte.css`, `activitats.css`, `directiu.css`, `legal-modals.css` | Estils propis de pàgina |
| `cookie-banner.css`, `i18n.css` | Bàner de cookies i selector d'idioma |
| `nav.js` | Menú mòbil |
| `i18n.js` | Traducció català / anglès / castellà (atributs `data-en` + diccionari) |
| `legal-modals.js` | Modals d'avís legal, privacitat, cookies i formulari d'inscripció (JotForm) |
| `cookie-banner.js`, `analytics.js` | Consentiment de cookies i Google Analytics (només si s'accepta) |
| `rotaractigualada.js`, `contacte.js` | Formularis de contacte (validació + enviament) |
| `activitats.js`, `directiu.js`, `nosaltres.js`, `scroll-top.js` | Interaccions de cada pàgina |
| `redireccions.js` | Al `<head>`: còpia de GitHub Pages → rotaractigualada.org, i idioma (tria desada o idioma del navegador) → `/`, `/es/` o `/en/` |
| `es/`, `en/` | Versions en castellà i anglès **generades** (no s'editen a mà) |
| `scripts/build-idiomes.mjs` | Genera `es/`, `en/`, les etiquetes hreflang i el `sitemap.xml` |
| `galeria.js`, `galeria/` | Mosaic de fotos de la portada i visor a pantalla completa (fotos en mides 800 i 1600 px) |
| `csrf.php`, `form-handler.php` | Backend del formulari: token CSRF, validació, correu i còpia a `form-data/submissions.csv` |
| `.htaccess` | HTTPS, capçaleres de seguretat (CSP), compressió, memòria cau i fitxers protegits |
| `sitemap.xml`, `robots.txt` | SEO |

## Idiomes

La web té tres versions amb adreça pròpia: català a l'arrel (`/`), castellà a
`/es/` i anglès a `/en/`. Google les indexa per separat (etiquetes `hreflang`)
i mostra a cada persona el títol en el seu idioma.

- **Només s'editen les pàgines catalanes de l'arrel.** Els textos en anglès van
  a l'atribut `data-en` de cada element i els castellans al diccionari
  `ES_MAP` d'`i18n.js`.
- Després de canviar textos, regenera les versions:
  ```bash
  npm run build:idiomes
  ```
  (actualitza `es/`, `en/`, els `hreflang`, el `sitemap.xml` i la versió
  `?v=…` dels CSS i JS; els tests avisen si les versions no estan al dia).
- **Executa-ho també després de canviar qualsevol CSS o JS**: la versió `?v=…`
  canvia i així els navegadors no fan servir la còpia antiga de la memòria cau.
- El menú d'idioma porta a la mateixa pàgina en l'altre idioma i desa la tria.
  A la primera visita es fa servir l'idioma del navegador.

## Executar en local

Cal PHP 8 (per al formulari):

```bash
php -S 127.0.0.1:8765      # o: npm start
```

i obrir <http://127.0.0.1:8765/>. En local `mail()` normalment no pot
enviar correu: el formulari mostrarà un error, però la tramesa es desa a
`form-data/submissions.csv` (ignorat per git).

## Tests

Necessiten Node.js 18+ i PHP. Els tests de navegador fan servir Playwright:

```bash
npm install
npx playwright install chromium   # només la primera vegada
npm test
```

- `tests/static.test.mjs`: enllaços i recursos locals, àncores, metadades SEO,
  `alt` de les imatges, ids duplicats, scripts inline (bloquejats per la CSP),
  sitemap i robots.txt.
- `tests/form-handler.test.mjs`: CSRF, origen, validació, honeypot, límit
  d'enviaments i protecció contra fórmules al CSV.
- `tests/browser.test.mjs`: errors de JavaScript, desbordament en mòbil, menú
  mòbil, modals, formulari, calendari amb teclat, pestanyes i canvi d'idioma.

Els tests copien la web a un directori temporal, així que no deixen dades
al repositori. Els tests de PHP o de navegador se salten si falta l'eina.

## Publicar

Puja els fitxers del lloc al servidor. **No cal** pujar `tests/`,
`node_modules/`, `package.json` ni `package-lock.json` (l'`.htaccess` els
bloqueja igualment si s'hi pugen). Abans de publicar, revisa els valors
marcats amb «CANVIA» a `.htaccess`, `sitemap.xml` i `form-handler.php`, i
l'identificador de GA4 a `analytics.js`.
