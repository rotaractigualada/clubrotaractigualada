/* redirect-domini.js — Si la web s'obre des de la còpia antiga de
   GitHub Pages (*.github.io), porta el visitant a la web oficial
   mantenint la pàgina i l'àncora. A rotaractigualada.org no fa res.
   Es carrega al <head> perquè la redirecció sigui immediata. */
(function () {
  if (!/\.github\.io$/i.test(window.location.hostname)) return;
  var page = window.location.pathname.split('/').pop() || '';
  window.location.replace('https://rotaractigualada.org/' + page + window.location.search + window.location.hash);
})();
