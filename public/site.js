// CarbonLog website – shared behaviour for every page: mobile menu, copy buttons, reveal on scroll.
(() => {
  'use strict';

  // ---------- mobile menu ----------
  const btn = document.querySelector('.menu-btn');
  const menu = document.getElementById('navmenu');
  if (btn && menu) {
    const set = (open) => { menu.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open)); };
    btn.addEventListener('click', () => set(!menu.classList.contains('open')));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('open')) { set(false); btn.focus(); } });
  }

  // ---------- copy buttons: <button data-copy="#id-of-element-with-text"> ----------
  document.querySelectorAll('[data-copy]').forEach((b) => {
    b.addEventListener('click', () => {
      const src = document.querySelector(b.dataset.copy);
      if (!src) return;
      const text = 'value' in src ? src.value : src.textContent.trim();
      const done = (ok) => {
        const old = b.dataset.label || b.textContent;
        b.dataset.label = old;
        b.textContent = ok ? 'Copied' : 'Select and copy';
        setTimeout(() => { b.textContent = old; }, 1800);
      };
      const selectIt = () => {
        const r = document.createRange(); r.selectNodeContents(src);
        const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      };
      try {
        navigator.clipboard.writeText(text).then(() => done(true), () => { selectIt(); done(false); });
      } catch (err) { selectIt(); done(false); }
    });
  });

  // ---------- reveal on scroll (the resting state is already readable) ----------
  const rvs = [...document.querySelectorAll('.rv')];
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }, { threshold: .12 });
    rvs.forEach((el) => io.observe(el));
  } else rvs.forEach((el) => el.classList.add('in'));
})();
