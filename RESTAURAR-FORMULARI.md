# Com tornar al formulari de contacte antic

El 12 d'octubre de 2026 el formulari de contacte (PHP) es va substituir per
l'apartat **«Escriu-nos»**, que prepara un correu (`mailto:`) amb la persona
destinatària, el motiu i el missatge, i té una pestanya **«Uneix-te»** que
obre el formulari d'inscripció (JotForm). El formulari antic fallava de vegades
(la pàgina es quedava en blanc en enviar).

## On és la versió antiga

L'última versió de la web **amb el formulari** és el commit
**`2cf1ca22383195a3f05e1178cf775fe5a6207733`** de la branca `main`
(«Merge pull request #15», 9 d'octubre de 2026).

Es pot descarregar sencera des de:
<https://github.com/rotaractigualada/clubrotaractigualada/archive/2cf1ca22383195a3f05e1178cf775fe5a6207733.zip>

## Què va canviar

| Abans (formulari) | Ara («Escriu-nos») |
| --- | --- |
| `csrf.php`, `form-handler.php` (enviament i còpia a `form-data/submissions.csv`) | Eliminats: la web ja no rep dades |
| Formulari a `contacte.html` i a la portada (`index.html`, `#contactForm`) | Bloc `#escriu-nos` amb pestanyes «Escriu-nos» i «Uneix-te» |
| Lògica a `contacte.js` i `rotaractigualada.js` | Lògica a `correu.js` |
| `tests/form-handler.test.mjs` | Eliminat; proves noves a `tests/browser.test.mjs` |
| Política de privacitat: dades del formulari i còpia al servidor | Política de privacitat: dades rebudes per correu |
| Enllaços del peu: `contacte.html?correu=club` | Enllaços del peu: `mailto:ayuda@rotaractigualada.org` |

## Per tornar-hi

Amb git, recupera els fitxers de la versió antiga i regenera els idiomes:

```bash
git checkout 2cf1ca2 -- index.html contacte.html nosaltres.html activitats.html directiu.html \
  contacte.js rotaractigualada.js i18n.js contacte.css rotaractigualada.css \
  csrf.php form-handler.php tests/form-handler.test.mjs tests/browser.test.mjs package.json README.md
git rm correu.js RESTAURAR-FORMULARI.md
npm run build:idiomes
npm test
```

Després revisa `form-handler.php` (adreces i remitent) i puja la web a Hostinger.
