/* Rotaract Igualada — interaccions principals */
document.addEventListener('DOMContentLoaded', () => {
  const revealEls = document.querySelectorAll('.reveal-left, .reveal-right');
  if ('IntersectionObserver' in window && revealEls.length) {
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.16 });

    revealEls.forEach((el) => revealObs.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('active'));
  }
});
