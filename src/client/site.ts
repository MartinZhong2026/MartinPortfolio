/**
 * Progressive enhancement shared by every page: scroll reveals, the timeline
 * progress line and the /work filters. Everything works without this file.
 */

function reveals() {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach((e) => e.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  );
  els.forEach((e) => io.observe(e));
  // Safety net: never leave content hidden (e.g. printing, odd scroll containers).
  window.addEventListener('beforeprint', () => els.forEach((e) => e.classList.add('is-in')));
}

function timelineProgress() {
  const tl = document.querySelector<HTMLElement>('[data-progress]');
  if (!tl || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let raf = 0;
  const update = () => {
    raf = 0;
    const r = tl.getBoundingClientRect();
    const vh = window.innerHeight;
    const t = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
    tl.style.setProperty('--progress', `${Math.round(t * 100)}%`);
  };
  tl.style.setProperty('--progress', '0%');
  window.addEventListener('scroll', () => (raf ||= requestAnimationFrame(update)), { passive: true });
  update();
}

function filters() {
  const group = document.querySelector<HTMLElement>('[data-filters]');
  const list = document.querySelector<HTMLElement>('[data-filter-list]');
  if (!group || !list) return;
  group.hidden = false;
  const buttons = Array.from(group.querySelectorAll<HTMLButtonElement>('button[data-filter]'));
  const items = Array.from(list.querySelectorAll<HTMLElement>('li[data-groups]'));
  const count = group.querySelector<HTMLElement>('[data-filter-count]');
  const apply = (id: string) => {
    let n = 0;
    for (const li of items) {
      const show = id === 'all' || (li.dataset.groups ?? '').split(' ').includes(id);
      li.hidden = !show;
      li.classList.add('is-in');
      if (show) n++;
    }
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === id)));
    if (count) count.textContent = `${n} project${n === 1 ? '' : 's'}`;
    const url = new URL(window.location.href);
    if (id === 'all') url.searchParams.delete('filter');
    else url.searchParams.set('filter', id);
    history.replaceState(null, '', url);
  };
  buttons.forEach((b) => b.addEventListener('click', () => apply(b.dataset.filter!)));
  const initial = new URLSearchParams(window.location.search).get('filter');
  if (initial && buttons.some((b) => b.dataset.filter === initial)) apply(initial);
}

export function initSite() {
  // Life moved out of About onto its own page.
  if (location.pathname === '/about/' && location.hash === '#outside') location.replace('/life/');
  reveals();
  timelineProgress();
  filters();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSite);
else initSite();
