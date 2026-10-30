// src/client/site.ts
function reveals() {
  const els = Array.from(document.querySelectorAll("[data-reveal]"));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) {
    els.forEach((e) => e.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
  );
  els.forEach((e) => io.observe(e));
  window.addEventListener("beforeprint", () => els.forEach((e) => e.classList.add("is-in")));
}
function timelineProgress() {
  const tl = document.querySelector("[data-progress]");
  if (!tl || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let raf = 0;
  const update = () => {
    raf = 0;
    const r = tl.getBoundingClientRect();
    const vh = window.innerHeight;
    const t = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
    tl.style.setProperty("--progress", `${Math.round(t * 100)}%`);
  };
  tl.style.setProperty("--progress", "0%");
  window.addEventListener("scroll", () => raf || (raf = requestAnimationFrame(update)), { passive: true });
  update();
}
function filters() {
  const group = document.querySelector("[data-filters]");
  const list = document.querySelector("[data-filter-list]");
  if (!group || !list) return;
  group.hidden = false;
  const buttons = Array.from(group.querySelectorAll("button[data-filter]"));
  const items = Array.from(list.querySelectorAll("li[data-groups]"));
  const count = group.querySelector("[data-filter-count]");
  const apply = (id) => {
    let n = 0;
    for (const li of items) {
      const show = id === "all" || (li.dataset.groups ?? "").split(" ").includes(id);
      li.hidden = !show;
      li.classList.add("is-in");
      if (show) n++;
    }
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === id)));
    if (count) count.textContent = `${n} project${n === 1 ? "" : "s"}`;
    const url = new URL(window.location.href);
    if (id === "all") url.searchParams.delete("filter");
    else url.searchParams.set("filter", id);
    history.replaceState(null, "", url);
  };
  buttons.forEach((b) => b.addEventListener("click", () => apply(b.dataset.filter)));
  const initial = new URLSearchParams(window.location.search).get("filter");
  if (initial && buttons.some((b) => b.dataset.filter === initial)) apply(initial);
}
function initSite() {
  reveals();
  timelineProgress();
  filters();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initSite);
else initSite();

export {
  initSite
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vc3JjL2NsaWVudC9zaXRlLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvKipcbiAqIFByb2dyZXNzaXZlIGVuaGFuY2VtZW50IHNoYXJlZCBieSBldmVyeSBwYWdlOiBzY3JvbGwgcmV2ZWFscywgdGhlIHRpbWVsaW5lXG4gKiBwcm9ncmVzcyBsaW5lIGFuZCB0aGUgL3dvcmsgZmlsdGVycy4gRXZlcnl0aGluZyB3b3JrcyB3aXRob3V0IHRoaXMgZmlsZS5cbiAqL1xuXG5mdW5jdGlvbiByZXZlYWxzKCkge1xuICBjb25zdCBlbHMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KCdbZGF0YS1yZXZlYWxdJykpO1xuICBjb25zdCByZWR1Y2UgPSB3aW5kb3cubWF0Y2hNZWRpYSgnKHByZWZlcnMtcmVkdWNlZC1tb3Rpb246IHJlZHVjZSknKS5tYXRjaGVzO1xuICBpZiAocmVkdWNlIHx8ICEoJ0ludGVyc2VjdGlvbk9ic2VydmVyJyBpbiB3aW5kb3cpKSB7XG4gICAgZWxzLmZvckVhY2goKGUpID0+IGUuY2xhc3NMaXN0LmFkZCgnaXMtaW4nKSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IGlvID0gbmV3IEludGVyc2VjdGlvbk9ic2VydmVyKFxuICAgIChlbnRyaWVzKSA9PiB7XG4gICAgICBmb3IgKGNvbnN0IGUgb2YgZW50cmllcykge1xuICAgICAgICBpZiAoZS5pc0ludGVyc2VjdGluZykge1xuICAgICAgICAgIGUudGFyZ2V0LmNsYXNzTGlzdC5hZGQoJ2lzLWluJyk7XG4gICAgICAgICAgaW8udW5vYnNlcnZlKGUudGFyZ2V0KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgeyByb290TWFyZ2luOiAnMHB4IDBweCAtOCUgMHB4JywgdGhyZXNob2xkOiAwLjA1IH0sXG4gICk7XG4gIGVscy5mb3JFYWNoKChlKSA9PiBpby5vYnNlcnZlKGUpKTtcbiAgLy8gU2FmZXR5IG5ldDogbmV2ZXIgbGVhdmUgY29udGVudCBoaWRkZW4gKGUuZy4gcHJpbnRpbmcsIG9kZCBzY3JvbGwgY29udGFpbmVycykuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdiZWZvcmVwcmludCcsICgpID0+IGVscy5mb3JFYWNoKChlKSA9PiBlLmNsYXNzTGlzdC5hZGQoJ2lzLWluJykpKTtcbn1cblxuZnVuY3Rpb24gdGltZWxpbmVQcm9ncmVzcygpIHtcbiAgY29uc3QgdGwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yPEhUTUxFbGVtZW50PignW2RhdGEtcHJvZ3Jlc3NdJyk7XG4gIGlmICghdGwgfHwgd2luZG93Lm1hdGNoTWVkaWEoJyhwcmVmZXJzLXJlZHVjZWQtbW90aW9uOiByZWR1Y2UpJykubWF0Y2hlcykgcmV0dXJuO1xuICBsZXQgcmFmID0gMDtcbiAgY29uc3QgdXBkYXRlID0gKCkgPT4ge1xuICAgIHJhZiA9IDA7XG4gICAgY29uc3QgciA9IHRsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGNvbnN0IHZoID0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgIGNvbnN0IHQgPSBNYXRoLm1pbigxLCBNYXRoLm1heCgwLCAodmggKiAwLjg1IC0gci50b3ApIC8gKHIuaGVpZ2h0ICsgdmggKiAwLjM1KSkpO1xuICAgIHRsLnN0eWxlLnNldFByb3BlcnR5KCctLXByb2dyZXNzJywgYCR7TWF0aC5yb3VuZCh0ICogMTAwKX0lYCk7XG4gIH07XG4gIHRsLnN0eWxlLnNldFByb3BlcnR5KCctLXByb2dyZXNzJywgJzAlJyk7XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdzY3JvbGwnLCAoKSA9PiAocmFmIHx8PSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodXBkYXRlKSksIHsgcGFzc2l2ZTogdHJ1ZSB9KTtcbiAgdXBkYXRlKCk7XG59XG5cbmZ1bmN0aW9uIGZpbHRlcnMoKSB7XG4gIGNvbnN0IGdyb3VwID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcjxIVE1MRWxlbWVudD4oJ1tkYXRhLWZpbHRlcnNdJyk7XG4gIGNvbnN0IGxpc3QgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yPEhUTUxFbGVtZW50PignW2RhdGEtZmlsdGVyLWxpc3RdJyk7XG4gIGlmICghZ3JvdXAgfHwgIWxpc3QpIHJldHVybjtcbiAgZ3JvdXAuaGlkZGVuID0gZmFsc2U7XG4gIGNvbnN0IGJ1dHRvbnMgPSBBcnJheS5mcm9tKGdyb3VwLnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEJ1dHRvbkVsZW1lbnQ+KCdidXR0b25bZGF0YS1maWx0ZXJdJykpO1xuICBjb25zdCBpdGVtcyA9IEFycmF5LmZyb20obGlzdC5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PignbGlbZGF0YS1ncm91cHNdJykpO1xuICBjb25zdCBjb3VudCA9IGdyb3VwLnF1ZXJ5U2VsZWN0b3I8SFRNTEVsZW1lbnQ+KCdbZGF0YS1maWx0ZXItY291bnRdJyk7XG4gIGNvbnN0IGFwcGx5ID0gKGlkOiBzdHJpbmcpID0+IHtcbiAgICBsZXQgbiA9IDA7XG4gICAgZm9yIChjb25zdCBsaSBvZiBpdGVtcykge1xuICAgICAgY29uc3Qgc2hvdyA9IGlkID09PSAnYWxsJyB8fCAobGkuZGF0YXNldC5ncm91cHMgPz8gJycpLnNwbGl0KCcgJykuaW5jbHVkZXMoaWQpO1xuICAgICAgbGkuaGlkZGVuID0gIXNob3c7XG4gICAgICBsaS5jbGFzc0xpc3QuYWRkKCdpcy1pbicpO1xuICAgICAgaWYgKHNob3cpIG4rKztcbiAgICB9XG4gICAgYnV0dG9ucy5mb3JFYWNoKChiKSA9PiBiLnNldEF0dHJpYnV0ZSgnYXJpYS1wcmVzc2VkJywgU3RyaW5nKGIuZGF0YXNldC5maWx0ZXIgPT09IGlkKSkpO1xuICAgIGlmIChjb3VudCkgY291bnQudGV4dENvbnRlbnQgPSBgJHtufSBwcm9qZWN0JHtuID09PSAxID8gJycgOiAncyd9YDtcbiAgICBjb25zdCB1cmwgPSBuZXcgVVJMKHdpbmRvdy5sb2NhdGlvbi5ocmVmKTtcbiAgICBpZiAoaWQgPT09ICdhbGwnKSB1cmwuc2VhcmNoUGFyYW1zLmRlbGV0ZSgnZmlsdGVyJyk7XG4gICAgZWxzZSB1cmwuc2VhcmNoUGFyYW1zLnNldCgnZmlsdGVyJywgaWQpO1xuICAgIGhpc3RvcnkucmVwbGFjZVN0YXRlKG51bGwsICcnLCB1cmwpO1xuICB9O1xuICBidXR0b25zLmZvckVhY2goKGIpID0+IGIuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiBhcHBseShiLmRhdGFzZXQuZmlsdGVyISkpKTtcbiAgY29uc3QgaW5pdGlhbCA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCkuZ2V0KCdmaWx0ZXInKTtcbiAgaWYgKGluaXRpYWwgJiYgYnV0dG9ucy5zb21lKChiKSA9PiBiLmRhdGFzZXQuZmlsdGVyID09PSBpbml0aWFsKSkgYXBwbHkoaW5pdGlhbCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbml0U2l0ZSgpIHtcbiAgcmV2ZWFscygpO1xuICB0aW1lbGluZVByb2dyZXNzKCk7XG4gIGZpbHRlcnMoKTtcbn1cblxuaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgPT09ICdsb2FkaW5nJykgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGluaXRTaXRlKTtcbmVsc2UgaW5pdFNpdGUoKTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFLQSxTQUFTLFVBQVU7QUFDakIsUUFBTSxNQUFNLE1BQU0sS0FBSyxTQUFTLGlCQUE4QixlQUFlLENBQUM7QUFDOUUsUUFBTSxTQUFTLE9BQU8sV0FBVyxrQ0FBa0MsRUFBRTtBQUNyRSxNQUFJLFVBQVUsRUFBRSwwQkFBMEIsU0FBUztBQUNqRCxRQUFJLFFBQVEsQ0FBQyxNQUFNLEVBQUUsVUFBVSxJQUFJLE9BQU8sQ0FBQztBQUMzQztBQUFBLEVBQ0Y7QUFDQSxRQUFNLEtBQUssSUFBSTtBQUFBLElBQ2IsQ0FBQyxZQUFZO0FBQ1gsaUJBQVcsS0FBSyxTQUFTO0FBQ3ZCLFlBQUksRUFBRSxnQkFB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
