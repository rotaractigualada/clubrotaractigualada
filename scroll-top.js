/* scroll-top.js — Evita que el navegador recordi/restauri un scroll antic
   en navegar entre pàgines. Es carrega en el <head>. */
if ('scrollRestoration' in history) { history.scrollRestoration = 'manual'; }
if (!window.location.hash) { window.scrollTo(0, 0); }