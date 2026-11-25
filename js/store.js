/* store.js — everything that persists (localStorage): stars, purchases, gallery, work in progress. */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const KEY = 'arielle-dressup.v1';
  const fresh = () => ({ v: 1, points: 0, owned: {}, gallery: [], wip: null, mute: false, title: '', lastTheme: null, seenHelp: false });

  let data = fresh();
  let ok = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) data = Object.assign(fresh(), JSON.parse(raw));
  } catch (e) { ok = false; }

  let timer = null;
  function flush() {
    timer = null;
    if (!ok) return;
    try { window.localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* private mode / full: keep playing in memory */ }
  }
  const S = (DU.store = {
    get data() { return data; },
    save(now) { if (now) { clearTimeout(timer); flush(); } else if (!timer) timer = setTimeout(flush, 300); },
    addPoints(n) { data.points = Math.max(0, Math.round(data.points + n)); S.save(true); return data.points; },
    /* ownership keys: 'item:<id>' · 'hair:<id>' · 'hc:<color spec>' · 'bg:<id>' */
    owns(key) { return !!data.owned[key]; },
    buy(key, price) {
      if (data.owned[key]) return true;
      if (data.points < price) return false;
      data.points -= price; data.owned[key] = 1; S.save(true); return true;
    },
    upsertGallery(entry) {
      const i = data.gallery.findIndex((g) => g.id === entry.id);
      if (i >= 0) data.gallery[i] = entry; else data.gallery.unshift(entry);
      S.save(true);
    },
    removeGallery(id) { data.gallery = data.gallery.filter((g) => g.id !== id); S.save(true); },
    reset() { data = fresh(); S.save(true); },
  });
  window.addEventListener('pagehide', () => { if (timer) { clearTimeout(timer); flush(); } });
})();
