# Club Rotaract d'Igualada — web

Web estàtica (HTML, CSS i JavaScript sense framework ni compilació) amb un
petit backend en PHP per als dos formularis de Contacte («Vull informació» i
«Vull unir-me»). Es publica en un servidor Apache (fa servir `.htaccess`).
Cap enllaç de la web obre el programa de correu: tot es fa des de la pàgina.

## Estructura

| Fitxer | Funció |
| --- | --- |
| `index.html`, `nosaltres.html`, `activitats.html`, `directiu.html`, `contacte.html` | Pàgines |
| `rotaractigualada.css` | Estils comuns (totes les pàgines excepte contacte) |
| `contacte.css`, `activitats.css`, `directiu.css`, `legal-modals.css` | Estils propis de pàgina |
| `i18n.css` | Selector d'idioma |
| `nav.js` | Menú mòbil |
| `i18n.js` | Traducció català / anglès / castellà (atributs `data-en` + diccionari) |
| `legal-modals.js` | Modals d'avís legal i política de privacitat |
| `analytics.js` | Estadístiques de visites amb GoatCounter, sense cookies (només a rotaractigualada.org) |
| `correu.js` | «Escriu-nos» de Contacte: pestanyes «Vull informació» / «Vull unir-me», validació i enviament |
| `form-handler.php` | Backend dels formularis: validació, antispam, correu i còpia a `form-data/submissions.csv` |
| `rotaractigualada.js`, `contacte.js` | Animacions d'aparició |
| `activitats.js`, `directiu.js`, `nosaltres.js`, `scroll-top.js` | Interaccions de cada pàgina |
| `redireccions.js` | Al `<head>`: còpia de GitHub Pages → rotaractigualada.org, i idioma (tria desada o idioma del navegador) → `/`, `/es/` o `/en/` |
| `es/`, `en/` | Versions en castellà i anglès **generades** (no s'editen a mà) |
| `scripts/build-idiomes.mjs` | Genera `es/`, `en/`, les etiquetes hreflang i el `sitemap.xml` |
| `galeria.js`, `galeria/` | Galeria de fotos (Activitats → pestanya Galeria): un mosaic per àlbum i visor a pantalla completa (fotos en mides 800 i 1600 px) |
| `mapa.js`, `mapa.css`, `anoia.json`, `anoia.svg` | Mapa d'Igualada i l'Anoia (Nosaltres → On som) |
| `projectes.json`, `projectes.js` | Activitats del club per al mapa i el test de la portada |
| `instagram.css`, `instagram.js`, `instagram/` | Secció Instagram de la portada: perfil, destacades, publicacions i codi QR |
| `instagram-feed.php` | Instagram automàtic: últimes publicacions des de l'API d'Instagram (opcional, vegeu més avall) |
| `test-voluntari.js`, `test-voluntari.css` | Test «Quina àrea de Rotary et va més?» de la portada |
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

Cal PHP 8 (per als formularis):

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
- `tests/form-handler.test.mjs`: origen, validació dels dos formularis,
  honeypot, enviaments massa ràpids, límit d'enviaments, destinataris,
  protecció contra fórmules al CSV i retorn sense JavaScript.
- `tests/browser.test.mjs`: errors de JavaScript, desbordament en mòbil, menú
  mòbil, modals, «Escriu-nos», calendari amb teclat, pestanyes i canvi d'idioma.

Els tests copien la web a un directori temporal, així que no deixen dades
al repositori. Els tests de PHP o de navegador se salten si falta l'eina.

## Publicar

Puja els fitxers del lloc al servidor. **No cal** pujar `tests/`,
`node_modules/`, `package.json` ni `package-lock.json` (l'`.htaccess` els
bloqueja igualment si s'hi pugen). Abans de publicar, revisa els valors
marcats amb «CANVIA» a `.htaccess` i `sitemap.xml`.

## Mapa d'Igualada i l'Anoia

La secció «On som» de `nosaltres.html` té un mapa interactiu (`mapa.js`,
`mapa.css`) que només es carrega quan el visitant el demana. Fa servir
Leaflet (`vendor/leaflet-1.9.4/`, llicència BSD-2), les imatges
d'OpenStreetMap i els límits dels 33 municipis de l'Anoia (`anoia.json` i la
previsualització `anoia.svg`), extrets de les dades de l'IGN (CC BY 4.0) amb
el paquet `es-atlas`.

## Activitats del club (mapa i test «Quina àrea de Rotary et va més?»)

Les activitats que surten al resum i als números rosa del mapa d'«On som», i
les que el test de la portada recomana, són a `projectes.json` (les llegeix
`projectes.js`). Per afegir-ne una, copia un bloc i canvia'n les dades:

- `nom`: en català, castellà i anglès.
- `municipi`: un dels 33 de l'Anoia, escrit com al mapa (p. ex. «El Bruc»).
- `data` (i `fi`, si dura més d'un dia): `AAAA-MM-DD`. Quan passa la data,
  l'activitat surt sola com a «Feta»; abans, només se'n mostra el mes.
- `area` (opcional): l'àrea d'interès de Rotary on encaixa: `pau`,
  `malalties`, `aigua`, `maternoinfantil`, `educacio`, `economia` o `medi`.
  El test de la portada la mostra a «Al club ho treballem amb».
- `xifra` (opcional): el resultat, p. ex. «120 kg d'aliments».
- `estat` (opcional): `"cancel·lada"` perquè deixi de sortir, o `"feta"`.

`npm test` comprova que cada activitat té un municipi i una data vàlids, i
que l'àrea (si n'hi ha) és una de les 7 de Rotary. El calendari de la pàgina Activitats té les seves dades a
`activitats.js`.

El test de la portada té 7 preguntes amb 7 respostes cadascuna, una per a
cada àrea d'interès de Rotary, i diu l'àrea que més et va. Les preguntes i
els textos del resultat són a `index.html` (secció `#test`). No envia ni
desa cap resposta.

## Instagram (portada)

La secció Instagram de la portada té el perfil (amb el botó «Segueix-nos»),
les destacades (cercles que porten a apartats de la web), les publicacions i
un codi QR (només a l'ordinador). El QR és `instagram/qr-rotaractigualada.svg`;
la versió per imprimir (paradetes, cartells…) és `instagram/qr-rotaractigualada.png`.

**Publicacions fixes** (si no s'activa l'Instagram automàtic): són les
targetes `ig-post` d'`index.html`. Al comentari de l'HTML hi ha com canviar-les
(imatge quadrada a `instagram/`, enllaç del post i peu) i com afegir-hi el
tipus (`data-tipus="carrusel"` o `"video"`) i la data.

### Instagram automàtic (opcional)

Amb un token de l'API d'Instagram, `instagram-feed.php` posa sola a la portada
les 6 últimes publicacions i el nombre de publicacions i seguidors. Consulta
Instagram com a màxim un cop l'hora i desa les imatges a `instagram/auto/`, de
manera que els visitants no es connecten a Instagram. Per activar-lo:

1. El compte d'Instagram ha de ser **professional** (de creador o d'empresa;
   és gratuït). A l'app: Configuració → Tipus de compte i eines → Canvia a
   compte professional.
2. A [developers.facebook.com](https://developers.facebook.com/apps) → Crea
   una app → cas d'ús «Gestionar missatges i contingut a Instagram».
3. A l'app: «Configuració de l'API amb inici de sessió d'Instagram» →
   «Genera tokens d'accés» → afegeix el compte @rotaractigualada i copia el
   token. L'app pot quedar en mode de desenvolupament: només llegeix el vostre
   propi compte.
4. A Hostinger (Administrador d'arxius), dins `public_html/form-data/`, crea el
   fitxer `instagram-token.txt` i enganxa-hi el token (una sola línia).
   `form-data/` no es pot obrir des del web i els ZIP de la web no el toquen.
5. Obre <https://rotaractigualada.org/instagram-feed.php>: hi ha de sortir la
   llista de publicacions. La portada ja les mostra.

El token dura 60 dies, però `instagram-feed.php` el renova cada setmana tot
sol. Si la web passés 60 dies sense visites, caldria generar-ne un de nou
(pas 3). Si no hi ha token o Instagram falla, la portada mostra les
publicacions fixes.

## Estadístiques de visites

La web no fa servir cookies. Les visites es compten amb
[GoatCounter](https://www.goatcounter.com), que no desa res al dispositiu
ni l'adreça IP, i per això no cal ni avís ni política de cookies (la política
de privacitat ho explica). El panell és a
<https://rotaractigualada.goatcounter.com> (el codi del compte,
`rotaractigualada`, és a `analytics.js`). Només es compten les visites a
rotaractigualada.org, no les proves en local.
