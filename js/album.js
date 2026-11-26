/* album.js — three small systems that reward playing:
   DU.album    a sticker album: one page per challenge theme, 8 stickers each. A sticker is earned by
               finishing a character who wears that item; a full page pays a prize.
   DU.secrets  hidden combinations (wizard hat + wand…) that set off a little magic in the editor.
   DU.bgfx     living backgrounds: a gentle ambient effect for every background.
   Everything here is HTML + CSS (css/album.css); the girl herself moves only through DU.pose / DU.motion. */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const N = (v) => Math.round(v * 100) / 100;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = () => DU.store.data;
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const rnd = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const snd = (name) => { try { DU.sound && DU.sound.play(name); } catch (e) { /* never break on sound */ } };
  const tone = (f, o) => { try { DU.sound && DU.sound.tone && DU.sound.tone(f, o); } catch (e) { /* ignore */ } };

  /* ================= one catalog item drawn by itself (a sticker) ================= */
  const LAYER = {
    wings: 'back', socks: 'socks', shoes: 'shoes', bottom: 'body', top: 'body', dress: 'body', bracelet: 'wrist', bag: 'held', hand: 'held',
    necklace: 'over', earrings: 'head', glasses: 'head', hairacc: 'head', hat: 'head', side: 'front',
  };
  function itemAlone(id) {
    const it = DU.itemById[id];
    if (!it) return '';
    const R = DU.rig({ h: 0, m: 0 }), uid = DU.uid('al'), defs = [];
    let idc = 0;
    const ctx = {
      uid, R, sk: DU.skinPaint('#ffe3d1'), tucked: false, hasBottom: false, defs,
      state: { wear: { [it.slot]: { id } }, body: { h: 0, m: 0 }, tuck: true },
      id: (nm = 'i') => `${uid}${nm}${idc++}`,
      paint(spec, box) { const P = DU.paint(spec, ctx.id('p'), box || [R.cx - 130, R.sY - 20, 260, R.ground - R.sY]); if (P.defs) defs.push(P.defs); return P; },
    };
    const isHead = ['earrings', 'glasses', 'hairacc', 'hat'].includes(it.slot);
    let out;
    try { out = it.draw(R, ctx.paint(it.color || '#ff9ac1', isHead ? [-110, -200, 220, 330] : null), ctx); } catch (e) { out = ''; }
    if (typeof out === 'string') out = { [LAYER[it.slot] || 'body']: out };
    out = out || {};
    let s = '';
    ['back', 'socks', 'shoes', 'body', 'sleeves', 'wrist', 'held', 'over', 'front'].forEach((k) => (s += out[k] || ''));
    const headT = `translate(${R.cx} ${N(R.headY)}) scale(${R.hs})`;
    ['headBack', 'head'].forEach((k) => { if (out[k]) s += `<g transform="${headT}">${out[k]}</g>`; });
    return `<g stroke-linejoin="round" stroke-linecap="round" fill="none"><defs>${defs.join('')}</defs>${s}</g>`;
  }
  /* the svg starts with the slot's usual thumbnail box; fitAll() then crops it to the drawing itself */
  function sticker(id) {
    const it = DU.itemById[id];
    const box = (it && DU.THUMB_BOX && DU.THUMB_BOX[it.slot]) || '0 0 750 1000';
    return `<svg class="al-art" xmlns="http://www.w3.org/2000/svg" viewBox="${box}" data-fit="1" data-slot="${it ? it.slot : ''}" aria-hidden="true">${itemAlone(id)}</svg>`;
  }
  function fitAll(root) {
    root.querySelectorAll('svg[data-fit]').forEach((svg) => {
      svg.removeAttribute('data-fit');
      try {
        let bb = svg.firstElementChild.getBBox();
        if ((svg.dataset.slot === 'earrings' || svg.dataset.slot === 'bracelet') && bb.x < 375 && bb.x + bb.width > 375 && bb.width > bb.height * 1.6) bb = { x: 375 + (bb.width / 2) * 0.35, y: bb.y, width: (bb.width / 2) * 0.65, height: bb.height }; // one of the pair
        if (bb.width > 2 && bb.height > 2) {
          const pad = Math.max(bb.width, bb.height) * 0.07 + 4;
          svg.setAttribute('viewBox', `${N(bb.x - pad)} ${N(bb.y - pad)} ${N(bb.width + pad * 2)} ${N(bb.height + pad * 2)}`);
        }
      } catch (e) { /* not laid out: keep the thumbnail box */ }
    });
  }

  /* ================= small drawn icons (plum outline, pastel fill) ================= */
  const IL = 'stroke="#4b3878" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"';
  const STAR5 = (x, y, r) => DU.starD(x, y, r, 5, 0.52);
  const IC = {
    star: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR5(12, 12.6, 9.6)}" fill="#ffcc45" stroke="#d9941f" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
    secret: `<svg viewBox="0 0 28 24" aria-hidden="true"><path d="${DU.sparkleD(12, 12.5, 9.5)}" fill="#ffcc45" ${IL}/><path d="${DU.sparkleD(22.5, 6, 4)}" fill="#fff" ${IL}/><path d="${DU.sparkleD(23, 19, 3)}" fill="#c9b3ff" ${IL}/></svg>`,
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5L7.5 12L14.5 19" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5L16.5 12L9.5 19" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#2fc7a0" stroke="#1c8f73" stroke-width="1.6"/><path d="M7 12.5L10.6 16L17 8.6" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    book: `<svg viewBox="0 0 28 24" aria-hidden="true"><path d="M14 6C11 3.5 6 3.5 3 5v14c3 -1.5 8 -1.5 11 1c3 -2.5 8 -2.5 11 -1V5c-3 -1.5 -8 -1.5 -11 1Z" fill="#ffe3ef" ${IL}/><path d="M14 6v14" fill="none" ${IL}/><path d="${DU.heartD(8.5, 10, 3.2)}" fill="#ff7aae"/><path d="${STAR5(19.5, 12.5, 3.6)}" fill="#ffcc45"/></svg>`,
  };
  const BADGES = [
    () => DU.flower(20, 20, 17, '#ffb3d3', '#ffd060', 5),
    () => `<path d="${STAR5(20, 21, 17)}" fill="#ffd060" stroke="#e0a22a" stroke-width="2" stroke-linejoin="round"/><circle cx="20" cy="21" r="4.5" fill="#fff6c9"/>`,
    () => `<path d="${DU.heartD(20, 21, 15)}" fill="#ff8fbd" stroke="#e0437f" stroke-width="2" stroke-linejoin="round"/><path d="M12 15q3 -5 7 -3" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-opacity=".8"/>`,
    () => DU.flower(20, 20, 17, '#c9b3ff', '#fff6c9', 6),
    () => `<circle cx="20" cy="20" r="15" fill="#9fe3d0" stroke="#3fa98a" stroke-width="2"/><path d="${DU.sparkleD(20, 20, 10)}" fill="#fff"/>`,
  ];
  const chestSvg = (open) =>
    `<svg class="al-chest${open ? ' open' : ''}" viewBox="0 0 68 60" aria-hidden="true"><ellipse cx="34" cy="55" rx="27" ry="4" fill="#5a2d6e" opacity=".18"/>` +
    (open
      ? `<path d="M10 30L13 9Q34 1 55 9L58 30Z" fill="#c9adff" stroke="#4b3878" stroke-width="2.4" stroke-linejoin="round"/><path d="M15 30L17.500 12.500Q34 6.500 50.500 12.500L53 30Z" fill="#6d4bb5"/>` +
        `<path d="${STAR5(21, 23, 7.500)}" fill="#ffcc45" stroke="#d9941f" stroke-width="1.4" stroke-linejoin="round"/><path d="${STAR5(34, 17, 9.500)}" fill="#ffe08a" stroke="#d9941f" stroke-width="1.4" stroke-linejoin="round"/><path d="${STAR5(47, 23, 7.500)}" fill="#ffcc45" stroke="#d9941f" stroke-width="1.4" stroke-linejoin="round"/>`
      : `<path d="M7 31V22Q7 9 21 9H47Q61 9 61 22V31Z" fill="#c9adff" stroke="#4b3878" stroke-width="2.4" stroke-linejoin="round"/><path d="M15 10.5V31h7V9.2ZM46 9.2V31h7V10.5Z" fill="#ffd060" stroke="#c98d1e" stroke-width="1.6" stroke-linejoin="round"/>`) +
    `<rect x="7" y="29" width="54" height="25" rx="5" fill="#b08cf5" stroke="#4b3878" stroke-width="2.4"/><path d="M15 30v23.5h7V30ZM46 30v23.5h7V30Z" fill="#ffd060" stroke="#c98d1e" stroke-width="1.6" stroke-linejoin="round"/>` +
    (open ? '' : `<rect x="27.5" y="24" width="13" height="14" rx="3.5" fill="#ffd060" stroke="#c98d1e" stroke-width="2"/><circle cx="34" cy="29.5" r="2.2" fill="#4b3878"/><path d="M34 30v4" stroke="#4b3878" stroke-width="2.2" stroke-linecap="round"/>`) +
    `<path d="${DU.sparkleD(61, 8, 5)}" fill="#ffcc45"/><path d="${DU.sparkleD(6, 14, 3.6)}" fill="#fff"/></svg>`;

  /* ================= the album ================= */
  const PRIZE = 300;
  const SLOT_ORDER = ['dress', 'top', 'bottom', 'shoes', 'hat', 'hairacc', 'hand', 'bag', 'necklace', 'glasses', 'socks', 'earrings', 'bracelet', 'wings', 'side'];
  const SLOT_NAMES = {
    top: 'חולצות', bottom: 'מכנסיים וחצאיות', dress: 'שמלות', shoes: 'נעליים', socks: 'גרביים', hat: 'כובעים', hairacc: 'לשיער', glasses: 'משקפיים',
    earrings: 'עגילים', necklace: 'שרשראות', bracelet: 'צמידים', bag: 'תיקים', hand: 'ביד', side: 'לידה', wings: 'כנפיים',
  };
  let PAGES = null;
  /* One page per theme: 8 items that carry the theme's tag — one from each kind of item in turn
     (starting at a different kind on every page, so the pages are not all alike), 7 free ones and
     one rare one from the shop when the theme has any. Items used on earlier pages come last,
     and the items most typical of the theme come first. */
  /* The pages as first published. They are written down here so that adding items to the catalog later
     never reshuffles a page (stickers are kept by item id). A theme that is not listed gets a computed page. */
  const FROZEN = {
    beach: 'dr_swim top_aloha bt_hula sh_sandals hat_sun ha_hibiscus hd_icecream dr_mermaid',
    party: 'hat_party ha_bunny hd_balloon bag_cross nk_heart gl_heart sk_frill wg_cattail',
    school: 'nk_tie gl_round sk_ankle br_watch sd_hamster dr_school top_sailor bt_plaid',
    winter: 'br_gloves sd_snowman dr_winter top_coat bt_snow sh_rain hat_beanie sh_ice',
    magic: 'bt_tutu sh_ballet hat_witch ha_foxears hd_wand sk_stripes ear_moon ha_halo',
    sport: 'ha_sweatband hd_pompom bag_sport nk_medal gl_ski sk_neon br_scrunchie sh_roller',
    princess: 'sk_tights ear_pearls br_lace sd_sandcastle dr_princess top_puff bt_long hat_crown',
    nature: 'wg_parrot sd_bunny dr_fairy top_plaid bt_wide sh_boots hat_bucket dr_butterfly',
    sleepover: 'bt_pj sh_uggs hat_hood ha_sleepmask hd_pillow bag_teddy sk_fuzzy br_scrunchie',
    anime: 'hd_fan bag_randoseru nk_bell sk_cat ear_bows wg_foxtail sd_cat dr_kimono',
    british: 'sk_argyle sd_owl dr_tartan top_blazer bt_bermuda sh_loafers hat_boater hd_magicbook',
    paris: 'sd_suitcase dr_paris top_ruffle bt_tiered sh_wedge hat_newsboy ha_scarf hd_baguette',
    hawaii: 'sh_flipflops hat_flowerpot ha_flower hd_ukulele bag_tote nk_lei gl_flower ear_flowers',
    cowgirl: 'nk_sheriff gl_aviator ear_feather br_friend sd_sunflower dr_prairie top_vest bt_fringe',
    kawaii: 'ear_hearts br_bows wg_foxtail sd_penguin dr_party top_bunny bt_tiered ha_rainbow',
    rock: 'top_leather bt_denimskirt sh_platform hat_headphones hd_guitar bag_guitar nk_choker gl_star',
    pop: 'hat_headphones hd_lightstick nk_boa gl_shutter ear_bolt br_neon sd_amp hat_idol',
    retro: 'nk_headphones gl_cat sk_legwarm ear_cherry br_bangles sd_scooter dr_disco sh_roller',
    ballet: 'br_bows sd_teddy dr_ballet top_wrap bt_ballet sh_ballet ha_balletcrown wg_ribbons',
    pirate: 'top_pirate bt_pirate sh_pirate hat_pirate ha_feather hd_spyglass bag_treasure sd_treasure',
    space: 'ha_antenna hd_rocket gl_visor ear_stars br_cuffs sd_telescope dr_space bag_rocket',
  };
  function pages() {
    if (PAGES) return PAGES;
    const used = {};
    PAGES = DU.THEMES.map((t, ti) => {
      if (FROZEN[t.id]) {
        const ids = FROZEN[t.id].split(' ').filter((id) => DU.itemById[id]);
        if (ids.length) { ids.forEach((id) => (used[id] = (used[id] || 0) + 1)); return { id: t.id, name: t.name, kind: t.kind, items: ids }; }
      }
      const all = DU.items.filter((i) => i.tags.includes(t.id));
      // not yet on another page first, then the things most typical of this theme (few other tags)
      const byUse = (a, b) => (used[a.id] || 0) - (used[b.id] || 0) || a.tags.length - b.tags.length;
      const free = all.filter((i) => !i.price), shop = all.filter((i) => i.price).sort((a, b) => byUse(a, b) || a.price - b.price);
      const rare = shop.length ? 1 : 0;
      const order = SLOT_ORDER.map((_, i) => SLOT_ORDER[(i + ti * 4) % SLOT_ORDER.length]);
      const lists = order.map((s) => free.filter((i) => i.slot === s).sort(byUse)).filter((l) => l.length);
      const pick = [];
      for (let round = 0; round < 10 && pick.length < 8 - rare; round++) lists.forEach((l) => { if (l[round] && pick.length < 8 - rare) pick.push(l[round]); });
      shop.forEach((i) => { if (pick.length < 8) pick.push(i); });
      pick.forEach((i) => (used[i.id] = (used[i.id] || 0) + 1));
      return { id: t.id, name: t.name, kind: t.kind, items: pick.map((i) => i.id) };
    }).filter((p) => p.items.length);
    return PAGES;
  }
  const got = (id) => !!store().album[id];
  const haveOn = (p) => p.items.filter(got).length;
  const full = (p) => haveOn(p) === p.items.length;

  const album = (DU.album = {
    PRIZE,
    pages,
    count() {
      let have = 0, total = 0;
      pages().forEach((p) => { have += haveOn(p); total += p.items.length; });
      return { have, total };
    },
    /* she was finished wearing these things → new stickers, and prizes for pages that are now full */
    collect(state) {
      const d = store(), ps = pages();
      const onPages = {};
      ps.forEach((p) => p.items.forEach((id) => (onPages[id] = 1)));
      const fresh = [], done = [];
      const wear = (state && state.wear) || {};
      Object.keys(wear).forEach((slot) => {
        const id = wear[slot] && wear[slot].id;
        if (id && onPages[id] && !d.album[id]) { d.album[id] = 1; fresh.push(id); }
      });
      ps.forEach((p) => { if (full(p) && !d.albumDone[p.id]) { d.albumDone[p.id] = 1; done.push(p.id); } });
      const stars = done.length * PRIZE;
      if (stars) DU.store.addPoints(stars);
      if (fresh.length || done.length) DU.store.save(true);
      return { fresh, done, stars };
    },
    html() { return '<div class="al-root"><div class="al-strip" role="tablist"></div><div class="al-main"></div><p class="al-tip"></p></div>'; },
    mount(el) { mountAlbum(el); },
    sticker, // other screens may want a sticker picture of an item
  });

  const TIP = 'לובשים, לוחצים ״סיימתי״, והמדבקה נדבקת באלבום!';
  /* the picture on a page's tab: its most recognisable item */
  const TAB_SLOTS = ['dress', 'hat', 'top', 'hand', 'hairacc', 'bag', 'shoes', 'bottom', 'glasses', 'necklace', 'wings', 'side', 'socks', 'bracelet', 'earrings'];
  const tabPic = (p) => p.items.slice().sort((a, b) => TAB_SLOTS.indexOf(DU.itemById[a].slot) - TAB_SLOTS.indexOf(DU.itemById[b].slot))[0];
  function bestPage() {
    const ps = pages(), last = store().lastTheme;
    let best = 0, bestScore = -1;
    ps.forEach((p, i) => {
      const h = haveOn(p);
      // a page in progress first (the fullest one), then the theme she played last, then a finished page
      const score = full(p) ? 50 : h ? 100 + h + (p.id === last ? 0.5 : 0) : p.id === last ? 60 : 0;
      if (score > bestScore) { bestScore = score; best = i; }
    });
    return best;
  }
  function slotHtml(id, i) {
    const it = DU.itemById[id] || { name: '' };
    const rot = [-5, 4, -3, 5, 3, -4, 6, -2][i % 8];
    return got(id)
      ? `<button type="button" class="al-slot got" data-al="peel" style="--r:${rot}deg" aria-label="${esc(it.name)}"><span class="al-stk">${sticker(id)}</span><small>${esc(it.name)}</small>${it.price ? `<i class="al-rare">${IC.star}</i>` : ''}</button>`
      : `<button type="button" class="al-slot miss" data-al="miss" data-id="${id}" aria-label="עוד לא מצאת"><span class="al-stk ghost">${sticker(id)}</span><small>?</small>${it.price ? `<i class="al-rare">${IC.star}</i>` : ''}</button>`;
  }
  function pageHtml(p, pi) {
    const have = haveOn(p), n = p.items.length, half = Math.ceil(n / 2), isDone = !!store().albumDone[p.id];
    return `<button type="button" class="al-arrow" data-al="prev" aria-label="הדף הקודם">${IC.prev}</button>
      <div class="al-book" data-page="${p.id}">
        <div class="al-page al-pr">
          <i class="al-tape al-t1"></i>
          <div class="al-head"><svg viewBox="0 0 40 40" aria-hidden="true">${BADGES[pi % BADGES.length]()}</svg><div><span>${p.kind === 'style' ? 'סגנון' : 'אתגר'}</span><b>${esc(p.name)}</b></div></div>
          <div class="al-grid">${p.items.slice(0, half).map((id, i) => slotHtml(id, i)).join('')}</div>
          <div class="al-prog"><span>${have} מתוך ${n}</span><div class="al-bar"><i style="width:${(have / n) * 100}%"></i></div></div>
        </div>
        <div class="al-rings" aria-hidden="true">${'<i></i>'.repeat(7)}</div>
        <div class="al-page al-pl">
          <i class="al-tape al-t2"></i>
          <div class="al-grid">${p.items.slice(half).map((id, i) => slotHtml(id, i + half)).join('')}</div>
          <div class="al-prize ${isDone ? 'done' : ''}">${chestSvg(isDone)}<p>${isDone ? `כל הכבוד!<br><b>קיבלת ${PRIZE} כוכבים!</b>` : `עוד ${n - have} וזוכים<br><b>ב־${PRIZE} כוכבים!</b>`}</p></div>
        </div>
      </div>
      <button type="button" class="al-arrow" data-al="next" aria-label="הדף הבא">${IC.next}</button>`;
  }
  function secretsHtml() {
    const list = secrets.list, found = list.filter((s) => store().secrets[s.id]).length;
    const card = (s) => {
      const ok = !!store().secrets[s.id];
      const pics = s.need.map((alts) => `<span class="al-stk ${ok ? '' : 'ghost'}">${sticker((ok && alts.find((id) => DU.itemById[id] && !DU.itemById[id].price)) || alts[0])}</span>`).join('<em>+</em>');
      return `<div class="al-sec ${ok ? 'found' : ''}"><div class="al-formula">${pics}</div><b>${ok ? esc(s.name) : '???'}</b><small>${ok ? IC.check : esc(s.hint)}</small></div>`;
    };
    return `<div class="al-secrets">
      <div class="al-sechead">${IC.secret}<div><b>הסודות שלי</b><span>${found} מתוך ${list.length} · לובשים שילוב סודי וקורה קסם! כל סוד חדש שווה ${secrets.STARS} כוכבים</span></div></div>
      <div class="al-secgrid">${list.map(card).join('')}</div>
    </div>`;
  }
  function mountAlbum(host) {
    const root = host.querySelector('.al-root') || host;
    const strip = root.querySelector('.al-strip'), main = root.querySelector('.al-main'), tip = root.querySelector('.al-tip');
    if (!strip || !main) return;
    const ps = pages();
    let cur = bestPage(); // index into ps, or -1 = the secrets page
    strip.innerHTML =
      `<button type="button" class="al-tab al-sectab" role="tab" data-al="go" data-i="-1"><span class="al-tabpic">${IC.secret}</span><b>סודות</b><small>${secrets.list.filter((s) => store().secrets[s.id]).length}/${secrets.list.length}</small></button>` +
      `<div class="al-tabs">${ps.map((p, i) => `<button type="button" class="al-tab ${full(p) ? 'full' : ''}" role="tab" data-al="go" data-i="${i}"><span class="al-tabpic">${sticker(tabPic(p))}</span><b>${esc(p.name)}</b><small>${haveOn(p)}/${p.items.length}</small></button>`).join('')}</div>`;
    const sizeBook = () => { const b = main.querySelector('.al-book'); if (b) b.style.setProperty('--u', N(b.clientWidth / 100) + 'px'); };
    const show = (i, dir) => {
      cur = i;
      main.innerHTML = i < 0 ? secretsHtml() : pageHtml(ps[i], i);
      main.classList.toggle('sec', i < 0);
      sizeBook();
      fitAll(main);
      if (tip) { tip.textContent = i < 0 ? 'רמז: נסי ללבוש דברים שמתאימים זה לזה' : TIP; tip.classList.remove('hint'); }
      strip.querySelectorAll('.al-tab').forEach((t) => {
        const on = +t.dataset.i === i;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on && t.scrollIntoView && dir !== 0) { try { t.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) { /* old browsers */ } }
      });
      const tgt = main.firstElementChild && (main.querySelector('.al-book') || main.firstElementChild);
      if (tgt && dir) { tgt.classList.remove('flip-n', 'flip-p'); void tgt.offsetWidth; tgt.classList.add(dir > 0 ? 'flip-n' : 'flip-p'); }
    };
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-al]');
      if (!b || !root.contains(b)) return;
      const act = b.dataset.al;
      if (act === 'go') { const i = +b.dataset.i; if (i !== cur) { snd('tab'); show(i, i > cur ? 1 : -1); } }
      else if (act === 'next' || act === 'prev') { snd('tab'); const d = act === 'next' ? 1 : -1; show((Math.max(cur, 0) + d + ps.length) % ps.length, d); }
      else if (act === 'peel') { snd('tap'); b.classList.remove('peel'); void b.offsetWidth; b.classList.add('peel'); }
      else if (act === 'miss') {
        snd('locked'); b.classList.remove('no'); void b.offsetWidth; b.classList.add('no');
        const it = DU.itemById[b.dataset.id];
        if (tip && it) { tip.textContent = it.price ? 'זאת מדבקה נדירה: הפריט הזה מחכה בחנות' : `את זה מחפשים ב״${SLOT_NAMES[it.slot] || 'אביזרים'}״`; tip.classList.remove('hint'); void tip.offsetWidth; tip.classList.add('hint'); }
      }
    });
    if ('ResizeObserver' in window) new ResizeObserver(sizeBook).observe(main);
    else window.addEventListener('resize', () => { if (main.isConnected) sizeBook(); });
    show(cur, 0);
    fitAll(strip);
    const on = strip.querySelector('.al-tab[aria-selected="true"]');
    if (on) { const tabs = strip.querySelector('.al-tabs'); try { tabs.scrollLeft += on.getBoundingClientRect().left - tabs.getBoundingClientRect().left - (tabs.clientWidth - on.offsetWidth) / 2; } catch (e) { /* ignore */ } }
  }

  /* ================= secrets ================= */
  /* need: every group must be satisfied; a group is a list of alternatives (any one of them worn). */
  const SECRETS = [
    { id: 'wizard', name: 'קוסמת אמיתית', hint: 'כובע של קסמים ומשהו קסום ביד', need: [['hat_wizard', 'hat_witch'], ['hd_wand', 'hd_starwand']], fx: 'stars', veil: 'night' },
    { id: 'cat', name: 'מיאו!', hint: 'אוזניים של חתולה ועוד משהו חתולי', need: [['ha_catears'], ['sk_cat', 'sh_cat', 'gl_cat', 'wg_cattail']], fx: 'hearts' },
    { id: 'fox', name: 'שועלה ערמומית', hint: 'אוזניים כתומות וזנב מאחור', need: [['ha_foxears'], ['wg_foxtail']], fx: 'leaves' },
    { id: 'pirate', name: 'אהוי, פיראטית!', hint: 'כובע של שודדי ים, עין אחת מכוסה ומשקפת', need: [['hat_pirate'], ['gl_eyepatch'], ['hd_spyglass']], fx: 'coins' },
    { id: 'japan', name: 'פרח דובדבן', hint: 'שמלה מיפן ומשהו שעושה רוח', need: [['dr_kimono'], ['hd_fan']], fx: 'petals' },
    { id: 'paris', name: 'בונז׳ור!', hint: 'כובע של ציירת ולחם ארוך', need: [['hat_beret'], ['hd_baguette']], fx: 'hearts' },
    { id: 'cowgirl', name: 'יי־הא!', hint: 'כובע של בוקרים וחבל', need: [['hat_cowboy'], ['hd_lasso']], fx: 'stars' },
    { id: 'space', name: 'שלוש, שתיים, אחת… המראה!', hint: 'קסדת חלל וטיל ביד', need: [['hat_space'], ['hd_rocket']], fx: 'stars', veil: 'night' },
    { id: 'ballet', name: 'בלרינה על הבמה', hint: 'כתר של בלרינה ונעלי בלט', need: [['ha_balletcrown'], ['sh_ballet']], fx: 'sparkles' },
    { id: 'hawaii', name: 'אלוהה!', hint: 'שרשרת פרחים וגיטרה קטנטנה', need: [['nk_lei'], ['hd_ukulele']], fx: 'petals' },
    { id: 'rock', name: 'כוכבת רוק', hint: 'גיטרה ומשקפי שמש', need: [['hd_guitar'], ['gl_sun', 'gl_aviator', 'gl_shutter', 'gl_star']], fx: 'notes' },
    { id: 'dj', name: 'המסיבה מתחילה!', hint: 'אוזניות ומוזיקה בקולי קולות', need: [['hat_headphones', 'nk_headphones'], ['hd_boombox']], fx: 'notes' },
    { id: 'pop', name: 'כוכבת פופ', hint: 'מיקרופון ובגד נוצץ של הופעות', need: [['hd_mic'], ['dr_disco', 'top_sparkle', 'dr_star', 'dr_idol', 'top_idol']], fx: 'confetti' },
    { id: 'sleep', name: 'לילה טוב…', hint: 'פיג׳מה, כרית ומשהו לשינה', need: [['dr_pj', 'top_pj', 'dr_onesie'], ['hd_pillow'], ['sh_slippers', 'ha_sleepmask']], fx: 'stars', veil: 'night' },
    { id: 'bunny', name: 'ארנבונת', hint: 'אוזניים ארוכות ועוד משהו של ארנב', need: [['ha_bunny'], ['top_bunny', 'bag_bunny']], fx: 'hearts' },
    { id: 'bear', name: 'חיבוק דובי', hint: 'אוזני דובי ודובי ביד', need: [['ha_bearears'], ['bag_teddy']], fx: 'hearts' },
    { id: 'champ', name: 'אלופה!', hint: 'מדליה על הצוואר וכדור או פונפון', need: [['nk_medal'], ['hd_ball', 'hd_pompom']], fx: 'confetti' },
    { id: 'tea', name: 'מסיבת תה', hint: 'כוס תה ובגד בריטי מהודר', need: [['hd_teacup'], ['dr_tartan', 'top_blazer', 'hat_boater', 'hat_tophat']], fx: 'hearts' },
    { id: 'sweet', name: 'מתוקה מדבש', hint: 'כובע תות ומשהו מתוק ביד', need: [['hat_strawberry'], ['hd_icecream', 'hd_lollipop', 'hd_boba']], fx: 'candy' },
    { id: 'sailor', name: 'כל הסיפון!', hint: 'כובע מלחים ובגד של מלחים', need: [['hat_sailor'], ['dr_sailor', 'top_sailor', 'nk_sailorscarf']], fx: 'bubbles' },
    { id: 'princess', name: 'נסיכה אמיתית', hint: 'שמלת נסיכה וכתר מהחנות', need: [['dr_princess'], ['hat_crown', 'ha_tiara']], fx: 'sparkles' },
    { id: 'fairy', name: 'פיית היער', hint: 'שמלת פיה וכנפיים מהחנות', need: [['dr_fairy'], ['wg_fairy', 'wg_butterfly']], fx: 'sparkles' },
    { id: 'mermaid', name: 'בת הים', hint: 'שמלת בת ים מהחנות וצדף', need: [['dr_mermaid'], ['nk_shell', 'ear_shell', 'br_shells']], fx: 'bubbles' },
    { id: 'ice', name: 'מלכת הקרח', hint: 'כתר קרח ועוד פריט קרח מהחנות', need: [['hat_icecrown'], ['sh_ice', 'dr_ice']], fx: 'snow' },
  ];
  const secrets = (DU.secrets = {
    STARS: 100,
    /* keep only real item ids; a secret whose group ends up empty is dropped */
    list: SECRETS.map((s) => Object.assign({}, s, { need: s.need.map((g) => g.filter((id) => DU.itemById && DU.itemById[id])) })).filter((s) => s.need.every((g) => g.length)),
    active(state) {
      const worn = {};
      const wear = (state && state.wear) || {};
      Object.keys(wear).forEach((k) => { if (wear[k] && wear[k].id) worn[wear[k].id] = 1; });
      return secrets.list.filter((s) => s.need.every((g) => g.some((id) => worn[id]))).map((s) => s.id);
    },
    celebrate,
  });

  /* ---------- particles shared by the secrets and the living backgrounds ---------- */
  const svg20 = (inner) => `<svg viewBox="-10 -10 20 20" aria-hidden="true">${inner}</svg>`;
  const SH = {
    star: (c) => svg20(`<path d="${DU.fx ? DU.fx.STAR : DU.sparkleD(0, 0, 10)}" fill="${c}"/>`),
    star5: (c) => svg20(`<path d="${STAR5(0, 0.6, 9.4)}" fill="${c}" stroke="rgba(190,120,20,.5)" stroke-width=".8" stroke-linejoin="round"/>`),
    heart: (c) => svg20(`<path d="M0 8C-10 1 -10 -8 -4.5 -8C-2 -8 0 -6 0 -4.5C0 -6 2 -8 4.5 -8C10 -8 10 1 0 8Z" fill="${c}"/><path d="M-5.6 -4.6q1.4 -2 3.2 -1.6" fill="none" stroke="#fff" stroke-width="1.2" stroke-linecap="round" stroke-opacity=".7"/>`),
    petal: (c) => svg20(`<path d="M0 -9C7 -7 8 3 0 10C-8 3 -7 -7 0 -9Z" fill="${c}" stroke="rgba(255,120,170,.55)" stroke-width=".7"/>`),
    leaf: (c) => svg20(`<path d="M0 -10C8 -6 8 6 0 10C-8 6 -8 -6 0 -10Z" fill="${c}"/><path d="M0 -8V8" stroke="rgba(60,90,40,.35)" stroke-width="1" stroke-linecap="round"/>`),
    note: (c) => svg20(`<ellipse cx="-3" cy="6" rx="4.2" ry="3.2" transform="rotate(-20 -3 6)" fill="${c}"/><path d="M0.4 6.4V-8.5L8.5 -10V-5.2L2.6 -4V6.4Z" fill="${c}"/>`),
    bubble: () => svg20('<circle r="8.6" fill="rgba(255,255,255,.2)" stroke="rgba(255,255,255,.85)" stroke-width="1.2"/><path d="M-5 -3.5q1.6 -3 4.6 -3.4" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>'),
    snow: () => '<span class="fx-dot" style="background:radial-gradient(#fff 38%,rgba(255,255,255,0) 72%)"></span>',
    mote: (c) => `<span class="fx-dot" style="background:radial-gradient(${c} 30%,rgba(255,255,255,0) 70%)"></span>`,
    conf: (c) => svg20(`<rect x="-7" y="-3.5" width="14" height="7" rx="1.6" fill="${c}"/>`),
    candy: (c) => svg20(`<rect x="-8" y="-3" width="16" height="6" rx="3" fill="${c}"/><path d="M-4 -1.2h6" stroke="#fff" stroke-width="1.2" stroke-linecap="round" stroke-opacity=".7"/>`),
    coin: () => svg20('<circle r="8.4" fill="#ffd24d" stroke="#d9941f" stroke-width="1.4"/><circle r="5" fill="none" stroke="#fff3b0" stroke-width="1.4"/>'),
    cloud: () => '<svg viewBox="0 0 60 30" aria-hidden="true"><path d="M10 26a8 8 0 0 1 1 -15.9a12 12 0 0 1 22.5 -3.6a10 10 0 0 1 16.500 8.500a6.500 6.500 0 0 1 -1 11Z" fill="#fff" fill-opacity=".8"/></svg>',
    fly: (c) => svg20(`<g class="fx-flap"><path d="M0 0C-4 -9 -10 -8 -9 -2C-8.500 2 -3 2 0 0C-3 1 -7 3 -6 7C-5 10 -1 6 0 0Z" fill="${c}" stroke="rgba(90,50,120,.5)" stroke-width=".6"/><path d="M0 0C4 -9 10 -8 9 -2C8.500 2 3 2 0 0C3 1 7 3 6 7C5 10 1 6 0 0Z" fill="${c}" stroke="rgba(90,50,120,.5)" stroke-width=".6"/></g><path d="M0 -3V5" stroke="#5b4a86" stroke-width="1.4" stroke-linecap="round"/>`),
  };
  const lerp = (a, r) => a[0] + (a[1] - a[0]) * r;
  /* things that travel through the layer. dir: 'fall' | 'rise'. o: { n, size [min,max] (fraction of the layer width),
     dur [min,max] s, colors, shape, spin: 'flutter' | 'sway' | 'tumble' | 'none', drift (fraction of width) } */
  function travel(r, dir, o) {
    let s = '';
    for (let i = 0; i < o.n; i++) {
      const dur = lerp(o.dur, r()), c = o.colors ? o.colors[i % o.colors.length] : '#fff';
      s += `<b class="fx-p fx-${dir}" style="left:${N(2 + r() * 94)}%;--dx:calc(var(--fxw) * ${N((r() - 0.35) * (o.drift == null ? 0.3 : o.drift))});animation-duration:${N(dur)}s;animation-delay:${N(-r() * dur)}s">` +
        `<i class="fx-${o.spin || 'flutter'}" style="--s:${N(lerp(o.size, r()))};animation-duration:${N(1.8 + r() * 2.2)}s;animation-delay:${N(-r() * 3)}s">${SH[o.shape](c)}</i></b>`;
    }
    return s;
  }
  /* things that stay in place and glow. o: { n, size, dur, colors, shape, box [x0,y0,x1,y1] in %, kind: 'twinkle' | 'pulse' | 'wander' } */
  function glow(r, o) {
    let s = '';
    const b = o.box || [4, 4, 96, 60];
    for (let i = 0; i < o.n; i++) {
      const dur = lerp(o.dur || [2, 3.6], r()), c = o.colors ? o.colors[i % o.colors.length] : '#fff';
      s += `<i class="fx-g fx-${o.kind || 'twinkle'}" style="left:${N(b[0] + r() * (b[2] - b[0]))}%;top:${N(b[1] + r() * (b[3] - b[1]))}%;--s:${N(lerp(o.size, r()))};${o.op ? `--o:${o.op};` : ''}animation-duration:${N(dur)}s;animation-delay:${N(-r() * dur)}s">${SH[o.shape](c)}</i>`;
    }
    return s;
  }
  const clouds = (r, n, box) => {
    let s = '';
    for (let i = 0; i < n; i++) s += `<i class="fx-g fx-drift" style="left:${N(box[0] + r() * (box[2] - box[0]))}%;top:${N(box[1] + r() * (box[3] - box[1]))}%;--s:${N(0.2 + r() * 0.14)};animation-duration:${N(16 + r() * 14)}s;animation-delay:${N(-r() * 14)}s">${SH.cloud()}</i>`;
    return s;
  };
  const shooting = (n) => {
    let s = '';
    for (let i = 0; i < n; i++) s += `<i class="fx-g fx-shoot" style="left:${8 + i * 34}%;top:${6 + i * 9}%;animation-duration:${7 + i * 2.6}s;animation-delay:${-1 - i * 3.7}s"><svg viewBox="-160 -70 180 90" aria-hidden="true"><path d="M0 0L-150 -62" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-opacity=".28"/><path d="M0 0L-90 -37" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-opacity=".5"/><path d="M0 0L-40 -16" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="${DU.sparkleD(0, 0, 15)}" fill="#fff6c9"/></svg></i>`;
    return s;
  };
  const rays = (n) => {
    let s = '';
    for (let i = 0; i < n; i++) s += `<i class="fx-ray" style="left:${12 + i * 27}%;animation-duration:${5 + i * 1.3}s;animation-delay:${-i * 1.7}s"></i>`;
    return s;
  };
  const bands = (cols) => cols.map((c, i) => `<i class="fx-band" style="top:${4 + i * 9}%;background:radial-gradient(ellipse at 50% 50%,${c} 0%,rgba(255,255,255,0) 68%);animation-duration:${6 + i * 2}s;animation-delay:${-i * 2.3}s"></i>`).join('');

  const PINKS = ['#ff9ec4', '#ffb7d2', '#ffd0e2'], GOLD = ['#fff6c9', '#ffe08a', '#ffffff'], PARTY = ['#ff5fa2', '#ffd24d', '#8b6cf0', '#5cc8ff', '#2fc7a0', '#ff9a56'];
  /* one recipe per background: what moves there (kept to about two dozen elements) */
  const RECIPES = {
    bedroom: (r) => glow(r, { n: 8, size: [0.03, 0.055], shape: 'star', colors: GOLD, box: [5, 4, 95, 55], dur: [2.6, 4.6] }),
    beach: (r) => clouds(r, 2, [0, 3, 70, 16]) + glow(r, { n: 11, size: [0.025, 0.05], shape: 'star', box: [3, 55, 97, 74], dur: [1.6, 3.2] }),
    stage: (r) => glow(r, { n: 8, size: [0.09, 0.2], shape: 'mote', colors: ['rgba(255,214,107,.9)', 'rgba(255,143,192,.9)', 'rgba(185,156,255,.9)'], kind: 'pulse', box: [2, 2, 90, 55], dur: [3, 5.5] }) + glow(r, { n: 6, size: [0.03, 0.05], shape: 'star', box: [6, 6, 94, 60] }),
    forest: (r) => travel(r, 'fall', { n: 7, size: [0.04, 0.06], dur: [9, 15], shape: 'leaf', colors: ['#8fd16a', '#b9e07a', '#f2c14e'] }) + glow(r, { n: 7, size: [0.035, 0.055], shape: 'mote', colors: ['rgba(255,244,150,.95)'], kind: 'wander', box: [5, 30, 92, 82], dur: [5, 9] }),
    classroom: (r) => travel(r, 'rise', { n: 10, size: [0.012, 0.024], dur: [14, 24], shape: 'mote', colors: ['rgba(255,255,255,.95)', 'rgba(255,240,180,.95)'], spin: 'sway', drift: 0.2 }),
    snow: (r) => travel(r, 'fall', { n: 15, size: [0.022, 0.05], dur: [7, 13], shape: 'snow', spin: 'sway', drift: 0.2 }),
    garden: (r) => travel(r, 'fall', { n: 8, size: [0.035, 0.055], dur: [9, 15], shape: 'petal', colors: ['#ffd0e2', '#ffffff', '#ffe9a8'] }) + glow(r, { n: 3, size: [0.07, 0.09], shape: 'fly', colors: ['#ffb3d3', '#c9b3ff', '#ffe08a'], kind: 'wander', box: [6, 22, 86, 66], dur: [9, 14], op: 1 }),
    castle: (r) => glow(r, { n: 11, size: [0.03, 0.06], shape: 'star', colors: GOLD, box: [4, 4, 96, 70], dur: [2.2, 4] }),
    gym: (r) => travel(r, 'rise', { n: 8, size: [0.012, 0.022], dur: [14, 22], shape: 'mote', colors: ['rgba(255,255,255,.95)'], spin: 'sway', drift: 0.2 }) + glow(r, { n: 4, size: [0.03, 0.05], shape: 'star', box: [6, 6, 94, 50] }),
    nightsky: (r) => glow(r, { n: 13, size: [0.025, 0.055], shape: 'star', colors: GOLD, box: [3, 3, 97, 62], dur: [1.8, 3.6] }) + shooting(2),
    hearts: (r) => travel(r, 'rise', { n: 10, size: [0.04, 0.075], dur: [9, 16], shape: 'heart', colors: ['#ff8fbd', '#ffb3d3', '#ffffff', '#ff6f9d'], spin: 'sway', drift: 0.16 }),
    clouds: (r) => clouds(r, 4, [-6, 4, 78, 70]) + glow(r, { n: 5, size: [0.03, 0.05], shape: 'star', box: [6, 6, 94, 70] }),
    rainbow: (r) => clouds(r, 2, [0, 6, 70, 40]) + glow(r, { n: 10, size: [0.03, 0.06], shape: 'star', colors: ['#ffffff', '#fff6c9', '#ffd0e2'], box: [4, 4, 96, 72], dur: [1.8, 3.4] }),
    candy: (r) => travel(r, 'fall', { n: 12, size: [0.03, 0.05], dur: [9, 16], shape: 'candy', colors: PARTY, spin: 'tumble', drift: 0.16 }),
    undersea: (r) => rays(3) + travel(r, 'rise', { n: 11, size: [0.025, 0.06], dur: [8, 15], shape: 'bubble', spin: 'sway', drift: 0.12 }),
    space: (r) => glow(r, { n: 12, size: [0.022, 0.05], shape: 'star', colors: ['#ffffff', '#cfe6ff', '#fff6c9'], box: [3, 3, 97, 70], dur: [1.6, 3.4] }) + shooting(2),
    ballroom: (r) => glow(r, { n: 7, size: [0.08, 0.16], shape: 'mote', colors: ['rgba(255,236,170,.9)', 'rgba(255,255,255,.85)'], kind: 'pulse', box: [2, 2, 90, 50], dur: [3, 5] }) + glow(r, { n: 8, size: [0.03, 0.055], shape: 'star', colors: GOLD, box: [4, 4, 96, 66] }),
    tokyo: (r) => travel(r, 'fall', { n: 12, size: [0.035, 0.06], dur: [8, 14], shape: 'petal', colors: PINKS }),
    london: (r) => clouds(r, 3, [-6, 3, 76, 22]) + travel(r, 'fall', { n: 6, size: [0.035, 0.05], dur: [10, 16], shape: 'leaf', colors: ['#f2a14e', '#e8743b', '#f2c14e'] }),
    paris: (r) => travel(r, 'fall', { n: 7, size: [0.035, 0.055], dur: [9, 15], shape: 'petal', colors: PINKS }) + travel(r, 'rise', { n: 3, size: [0.04, 0.055], dur: [12, 18], shape: 'heart', colors: ['#ff8fbd', '#ffb3d3'], spin: 'sway', drift: 0.1 }),
    ranch: (r) => clouds(r, 3, [-6, 3, 76, 24]) + travel(r, 'rise', { n: 7, size: [0.012, 0.024], dur: [13, 22], shape: 'mote', colors: ['rgba(255,236,170,.95)'], spin: 'sway', drift: 0.25 }),
    ship: (r) => clouds(r, 2, [0, 3, 70, 18]) + glow(r, { n: 10, size: [0.025, 0.05], shape: 'star', box: [3, 50, 97, 66], dur: [1.6, 3.2] }),
    moon: (r) => glow(r, { n: 11, size: [0.022, 0.05], shape: 'star', colors: ['#ffffff', '#fff6c9'], box: [3, 3, 97, 55], dur: [1.8, 3.6] }) + shooting(1) + travel(r, 'rise', { n: 5, size: [0.012, 0.022], dur: [16, 24], shape: 'mote', colors: ['rgba(255,255,255,.9)'], spin: 'sway', drift: 0.2 }),
    studio: (r) => glow(r, { n: 6, size: [0.09, 0.17], shape: 'mote', colors: ['rgba(255,255,255,.9)', 'rgba(255,214,235,.9)'], kind: 'pulse', box: [2, 2, 90, 50], dur: [2.6, 4.6] }) + glow(r, { n: 7, size: [0.03, 0.055], shape: 'star', box: [5, 5, 95, 62], dur: [1.4, 2.8] }),
    disco: (r) => glow(r, { n: 8, size: [0.1, 0.2], shape: 'mote', colors: ['rgba(255,95,162,.85)', 'rgba(92,200,255,.85)', 'rgba(255,210,77,.85)', 'rgba(139,108,240,.85)'], kind: 'pulse', box: [0, 0, 88, 60], dur: [1.6, 3] }) + travel(r, 'rise', { n: 5, size: [0.045, 0.06], dur: [8, 13], shape: 'note', colors: ['#ffffff', '#ffd24d', '#ff8fc0'], spin: 'sway', drift: 0.14 }),
    luau: (r) => glow(r, { n: 8, size: [0.03, 0.05], shape: 'mote', colors: ['rgba(255,200,110,.95)', 'rgba(255,240,150,.95)'], kind: 'wander', box: [4, 20, 94, 78], dur: [5, 9] }) + travel(r, 'fall', { n: 5, size: [0.035, 0.05], dur: [10, 16], shape: 'petal', colors: ['#ff8fbd', '#ffd0e2', '#ffb347'] }),
    sweets: (r) => travel(r, 'fall', { n: 9, size: [0.03, 0.048], dur: [10, 17], shape: 'candy', colors: PARTY, spin: 'tumble', drift: 0.14 }) + travel(r, 'rise', { n: 3, size: [0.04, 0.055], dur: [12, 18], shape: 'heart', colors: ['#ff8fbd', '#ffffff'], spin: 'sway', drift: 0.1 }),
    aurora: (r) => bands(['rgba(120,255,214,.55)', 'rgba(170,140,255,.5)', 'rgba(120,220,255,.45)']) + glow(r, { n: 8, size: [0.022, 0.045], shape: 'star', box: [3, 3, 97, 50], dur: [1.8, 3.6] }) + travel(r, 'fall', { n: 6, size: [0.02, 0.04], dur: [9, 14], shape: 'snow', spin: 'sway', drift: 0.2 }),
  };
  const sizeLayer = (el) => { el.style.setProperty('--fxw', (el.clientWidth || 300) + 'px'); el.style.setProperty('--fxh', (el.clientHeight || 400) + 'px'); };
  DU.bgfx = {
    RECIPES,
    mount(layerEl, bgId) {
      if (!layerEl) return;
      layerEl.innerHTML = '';
      layerEl.classList.add('fx-layer');
      const make = RECIPES[bgId];
      if (!make || reduced()) return;
      let seed = 7;
      for (let i = 0; i < String(bgId).length; i++) seed = (seed * 31 + String(bgId).charCodeAt(i)) % 2147483646 || 7;
      sizeLayer(layerEl);
      layerEl.innerHTML = make(rnd(seed));
      if (!layerEl._fxRO && 'ResizeObserver' in window) { layerEl._fxRO = new ResizeObserver(() => sizeLayer(layerEl)); layerEl._fxRO.observe(layerEl); }
    },
  };

  /* ---------- a secret was found: banner, particles, a cheer ---------- */
  const FX = {
    stars: { shape: 'star5', colors: ['#ffd24d', '#fff6c9', '#ffffff'], dir: 'rise' },
    hearts: { shape: 'heart', colors: ['#ff6f9d', '#ffb3d3', '#ffffff'], dir: 'rise' },
    notes: { shape: 'note', colors: ['#8b6cf0', '#ff5fa2', '#ffd24d', '#ffffff'], dir: 'rise' },
    bubbles: { shape: 'bubble', dir: 'rise' },
    snow: { shape: 'snow', dir: 'fall', spin: 'sway' },
    petals: { shape: 'petal', colors: PINKS, dir: 'fall' },
    leaves: { shape: 'leaf', colors: ['#f2a14e', '#f2c14e', '#8fd16a'], dir: 'fall' },
    confetti: { shape: 'conf', colors: PARTY, dir: 'fall', spin: 'tumble' },
    sparkles: { shape: 'star', colors: ['#ffffff', '#fff6c9', '#ffd0e2'], dir: 'rise' },
    candy: { shape: 'candy', colors: PARTY, dir: 'fall', spin: 'tumble' },
    coins: { shape: 'coin', dir: 'fall', spin: 'tumble' },
  };
  const VEILS = {
    night: 'radial-gradient(ellipse at 50% 30%,rgba(120,90,220,.55),rgba(30,20,90,.82))',
  };
  let celebrateSeed = 11;
  function celebrate(stageEl, id, firstTime) {
    const sec = secrets.list.find((s) => s.id === id);
    if (!stageEl || !sec) return;
    // one celebration at a time: a new one replaces what is still on screen
    stageEl.querySelectorAll('.sx-layer, .sx-veil').forEach((e) => e.remove());
    const fx = FX[sec.fx] || FX.stars, still = reduced();
    const layer = document.createElement('div');
    layer.className = 'sx-layer fx-layer' + (firstTime ? ' first' : '');
    layer.style.setProperty('--fxw', (stageEl.clientWidth || 300) + 'px');
    layer.style.setProperty('--fxh', (stageEl.clientHeight || 400) + 'px');
    const r = rnd((celebrateSeed = (celebrateSeed * 48271) % 2147483646 || 11));
    layer.innerHTML =
      (still ? '' : travel(r, fx.dir, { n: 16, size: [0.05, 0.085], dur: [2.2, 3.4], shape: fx.shape, colors: fx.colors, spin: fx.spin || 'sway', drift: 0.2 })) +
      `<div class="sx-banner"><b>גילית סוד!</b><span>${esc(sec.name)}</span>${firstTime ? `<em>${IC.star}<i dir="ltr">+${secrets.STARS}</i></em>` : ''}</div>`;
    stageEl.appendChild(layer);
    // a tint between the background and the girl (night for the wizard…)
    const fxEl = stageEl.querySelector('.art-fx');
    let veil = null;
    if (sec.veil && VEILS[sec.veil] && fxEl && !still) {
      veil = document.createElement('i');
      veil.className = 'sx-veil';
      veil.style.background = VEILS[sec.veil];
      veil.innerHTML = glow(r, { n: 9, size: [0.03, 0.06], shape: 'star', colors: GOLD, box: [4, 4, 96, 64], dur: [1.2, 2.2] });
      veil.style.setProperty('--fxw', (stageEl.clientWidth || 300) + 'px');
      fxEl.appendChild(veil);
    }
    if (DU.fx && !still) DU.fx.burst(layer, 50, 44, { count: 16, spread: 38, size: 5.5, shape: fx.shape === 'heart' ? 'heart' : 'star', colors: fx.colors || undefined, z: 2 });
    // she cheers (the app may redraw her at any moment, so always look the svg up again)
    const girl = () => stageEl.querySelector('.art-char svg');
    const svg = girl();
    if (svg && DU.pose && !still) {
      try {
        DU.pose(svg, DU.safePose ? DU.safePose(DU.app && DU.app.state, 'cheer') : 'cheer', 350);
        if (DU.setEyes) DU.setEyes(svg, 'happy');
        if (DU.setMouth) DU.setMouth(svg, 'big');
        if (DU.motion && DU.motion.hop) DU.motion.hop(svg, 22, 420);
      } catch (e) { /* a cheer is never worth an error */ }
      setTimeout(() => {
        if (girl() !== svg || !svg.isConnected) return; // she was redrawn: already standing normally
        try { DU.pose(svg, 'rest', 380); DU.setEyes(svg); DU.setMouth(svg); } catch (e) { /* ignore */ }
      }, 1700);
    }
    if (firstTime) [0, 4, 7, 12, 16].forEach((st, i) => tone(784 * Math.pow(2, st / 12), { at: i * 0.085, dur: 0.42, type: 'triangle', vol: 0.16 }));
    else [0, 7].forEach((st, i) => tone(880 * Math.pow(2, st / 12), { at: i * 0.09, dur: 0.3, type: 'sine', vol: 0.14 }));
    snd('star');
    setTimeout(() => { layer.classList.add('out'); if (veil) veil.classList.add('out'); }, 2600);
    setTimeout(() => { layer.remove(); if (veil) veil.remove(); }, 3150);
  }
})();
