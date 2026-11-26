/* fabric.js — "הבד שלי": design your own fabric, and put a sticker on a shirt.
   1. A colour spec "pat:<kind>:<bg>:<fg>:<size 1-3>" works everywhere a colour works
      (DU.paint / DU.swatchCss are wrapped), e.g. "pat:hearts:#bdf0dc:#ffffff:2".
   2. DU.stickerSvg(R, id) draws a sticker on the chest of a top / dress (render.js calls it
      when state.wear.top.st / state.wear.dress.st is set).
   3. DU.fabric.open({ host, state, slot, onChange }) — the little studio. It writes
      state.wear[slot].c and state.wear[slot].st and calls onChange() after every change.
   Art rules: plain SVG only (no filters, text, classes), because the picture is also saved as a PNG. */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const n = DU.n;

  /* ================= the prints ================= */
  const KINDS = [
    { id: 'dots', name: 'נקודות' }, { id: 'stripes', name: 'פסים' }, { id: 'hearts', name: 'לבבות' }, { id: 'plaid', name: 'משבצות' },
    { id: 'stars', name: 'כוכבים' }, { id: 'flowers', name: 'פרחים' }, { id: 'zigzag', name: 'זיגזג' }, { id: 'checks', name: 'ריבועים' },
  ];
  const KIND_IDS = KINDS.map((k) => k.id);
  const SIZE = [0.7, 1, 1.42];
  const HEX = /^#[0-9a-f]{6}$/i;
  const hex = (c, d) => (HEX.test(c || '') ? c.toLowerCase() : d);

  /* one repeat of a print: { W, H, inner }. Motifs sit on a half-drop (brick) grid. */
  function tile(kind, bg, fg, k) {
    const f = `fill="${fg}"`;
    let W, H, inner;
    const two = (T, fn) => fn(T / 4, T / 4, 0) + fn((T * 3) / 4, (T * 3) / 4, 1);
    if (kind === 'stripes') {
      W = H = 17 * k;
      inner = `<rect width="${n(W)}" height="${n(H * 0.42)}" ${f}/><rect y="${n(H * 0.62)}" width="${n(W)}" height="${n(H * 0.075)}" ${f} fill-opacity=".6"/>`;
    } else if (kind === 'hearts') {
      W = H = 27 * k;
      inner = `<path d="${two(W, (x, y) => DU.heartD(x, y + W * 0.01, W * 0.165))}" ${f}/>`;
    } else if (kind === 'plaid') {
      W = H = 31 * k;
      const T = W, b = T * 0.3, a = T * 0.08, l = T * 0.045, lx = T * 0.66;
      const thin = DU.lum(bg) > 0.8 ? DU.mix(fg, '#ffffff', 0.55) : '#ffffff';
      inner =
        `<rect x="${n(a)}" width="${n(b)}" height="${n(T)}" ${f} fill-opacity=".42"/><rect y="${n(a)}" width="${n(T)}" height="${n(b)}" ${f} fill-opacity=".42"/>` +
        `<rect x="${n(a)}" y="${n(a)}" width="${n(b)}" height="${n(b)}" ${f} fill-opacity=".3"/>` +
        `<rect x="${n(lx)}" width="${n(l)}" height="${n(T)}" fill="${thin}" fill-opacity=".8"/><rect y="${n(lx)}" width="${n(T)}" height="${n(l)}" fill="${thin}" fill-opacity=".8"/>` +
        `<rect x="${n(lx + T * 0.13)}" width="${n(l * 0.55)}" height="${n(T)}" ${f} fill-opacity=".7"/><rect y="${n(lx + T * 0.13)}" width="${n(T)}" height="${n(l * 0.55)}" ${f} fill-opacity=".7"/>`;
    } else if (kind === 'stars') {
      W = H = 30 * k;
      inner = `<path d="${two(W, (x, y, i) => DU.starD(x, y, W * (i ? 0.14 : 0.19), 5, 0.47, i ? -72 : -90))}" ${f}/>`;
    } else if (kind === 'flowers') {
      W = H = 34 * k;
      const T = W, mid = DU.lum(fg) > 0.75 && DU.lum(bg) > 0.75 ? '#ff8fb8' : DU.lum(fg) > 0.6 ? '#ffc83d' : '#fff3b0';
      inner = two(T, (x, y, i) =>
        [0, 72, 144, 216, 288].map((d) => {
          const r = ((d + i * 36 - 90) * Math.PI) / 180;
          return `<circle cx="${n(x + Math.cos(r) * T * 0.1)}" cy="${n(y + Math.sin(r) * T * 0.1)}" r="${n(T * 0.082)}" ${f}/>`;
        }).join('') + `<circle cx="${n(x)}" cy="${n(y)}" r="${n(T * 0.058)}" fill="${mid}"/>`);
    } else if (kind === 'zigzag') {
      W = 24 * k; H = 21 * k;
      const zz = (y0, th) => `M0 ${n(y0 + H * 0.26)}L${n(W / 2)} ${n(y0)}L${n(W)} ${n(y0 + H * 0.26)}V${n(y0 + H * 0.26 + th)}L${n(W / 2)} ${n(y0 + th)}L0 ${n(y0 + H * 0.26 + th)}Z`;
      inner = `<path d="${zz(H * 0.06, H * 0.27)}" ${f}/><path d="${zz(H * 0.57, H * 0.075)}" ${f} fill-opacity=".6"/>`;
    } else if (kind === 'checks') {
      W = H = 21 * k;
      inner = `<rect width="${n(W / 2)}" height="${n(H / 2)}" ${f}/><rect x="${n(W / 2)}" y="${n(H / 2)}" width="${n(W / 2)}" height="${n(H / 2)}" ${f}/>`;
    } else { // dots
      W = H = 22 * k;
      inner = two(W, (x, y) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(W * 0.165)}" ${f}/>`);
    }
    return { W, H, inner: `<rect width="${n(W)}" height="${n(H)}" fill="${bg}"/>` + inner };
  }
  function patternDef(id, f, ox, oy) {
    const t = tile(f.kind, f.bg, f.fg, SIZE[f.size - 1] || 1);
    // the repeat is anchored on (ox, oy), so one column of motifs runs down the middle of the garment
    return `<pattern id="${id}" width="${n(t.W)}" height="${n(t.H)}" patternUnits="userSpaceOnUse" x="${n(ox - t.W / 4)}" y="${n(oy - t.H / 4)}">${t.inner}</pattern>`;
  }

  const isPat = (s) => typeof s === 'string' && s.slice(0, 4) === 'pat:';
  /* "pat:hearts:#bdf0dc:#ffffff:2" → { kind, bg, fg, size } (null when it is not a fabric spec) */
  function parse(spec) {
    if (!isPat(spec)) return null;
    const a = spec.split(':');
    return { kind: KIND_IDS.includes(a[1]) ? a[1] : 'dots', bg: hex(a[2], '#ffc1d9'), fg: hex(a[3], '#ffffff'), size: Math.max(1, Math.min(3, Math.round(+a[4]) || 2)) };
  }
  const make = (f) => `pat:${KIND_IDS.includes(f.kind) ? f.kind : 'dots'}:${hex(f.bg, '#ffc1d9')}:${hex(f.fg, '#ffffff')}:${Math.max(1, Math.min(3, Math.round(+f.size) || 2))}`;

  /* --- every colour in the game goes through DU.paint, so wrapping it is enough --- */
  const basePaint = DU.paint, baseSwatch = DU.swatchCss;
  DU.paint = function (spec, id, box) {
    const f = parse(spec);
    if (!f) return basePaint(spec, id, box);
    const ox = box ? box[0] + box[2] / 2 : 375, oy = box ? box[1] + 96 : 516;
    return { fill: `url(#${id})`, line: DU.line(f.bg), base: f.bg, defs: patternDef(id, f, ox, oy) };
  };
  /* CSS background for a swatch button (no double quotes: it sits inside style="…") */
  DU.swatchCss = function (spec) {
    const f = parse(spec);
    if (!f) return baseSwatch(spec);
    const t = tile(f.kind, f.bg, f.fg, 0.62);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${n(t.W)}" height="${n(t.H)}" viewBox="0 0 ${n(t.W)} ${n(t.H)}">${t.inner}</svg>`;
    return `url('data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, '%27')}') 50% 50% / ${n(t.W)}px ${n(t.H)}px repeat ${f.bg}`;
  };

  /* ================= stickers (drawn around 0,0; about 34 units wide, die-cut white edge) ================= */
  const W7 = 'stroke="#fff" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"';
  const ART = {
    heart: (() => { const d = DU.heartD(0, 1, 12.5); return `<path d="${d}" fill="#fff" ${W7}/><path d="${d}" fill="#ff5f8f"/><path d="M-7.5 -4.5q1 -4.5 5 -4.5" fill="none" stroke="#fff" stroke-width="2.4" stroke-opacity=".8" stroke-linecap="round"/>`; })(),
    star: (() => { const d = DU.starD(0, 1, 14.5, 5, 0.5); return `<path d="${d}" fill="#fff" ${W7}/><path d="${d}" fill="#ffc83d" stroke="#ffc83d" stroke-width="2" stroke-linejoin="round"/><path d="M-4.5 -3.5q2 -4 4.5 -6.5" fill="none" stroke="#fff" stroke-width="2.2" stroke-opacity=".85" stroke-linecap="round"/>`; })(),
    cat: (() => {
      const head = 'M-12.5 -11L-6.5 -6.5Q0 -8.6 6.5 -6.5L12.5 -11L12.2 0.5Q12 11 0 11Q-12 11 -12.2 0.5Z';
      return `<path d="${head}" fill="#fff" ${W7}/><path d="${head}" fill="#ffb565" stroke="#ffb565" stroke-width="2" stroke-linejoin="round"/>` +
        '<path d="M-10.5 -8.2L-7.2 -5.6L-10.4 -4Z M10.5 -8.2L7.2 -5.6L10.4 -4Z" fill="#ff8fb0"/>' +
        '<ellipse cx="-5" cy="0.6" rx="1.7" ry="2.3" fill="#3a2a46"/><ellipse cx="5" cy="0.6" rx="1.7" ry="2.3" fill="#3a2a46"/>' +
        '<path d="M-1.6 4.2h3.2L0 6Z" fill="#ff6f91"/><path d="M0 6q-2 3 -4.2 1.4M0 6q2 3 4.2 1.4" fill="none" stroke="#3a2a46" stroke-width="1.2" stroke-linecap="round"/>' +
        '<path d="M-8 4.6h-6M-8 6.8l-5.4 1.6M8 4.6h6M8 6.8l5.4 1.6" fill="none" stroke="#fff" stroke-width="1.1" stroke-linecap="round" stroke-opacity=".9"/>';
    })(),
    rainbow: (() => {
      const arc = (r) => `M${-r} 6A${r} ${r} 0 0 1 ${r} 6`;
      return `<path d="${arc(10.5)}" fill="none" stroke="#fff" stroke-width="17" stroke-linecap="round"/>` +
        `<path d="${arc(14)}" fill="none" stroke="#ff6f91" stroke-width="3.8"/><path d="${arc(10.4)}" fill="none" stroke="#ffc83d" stroke-width="3.8"/><path d="${arc(6.8)}" fill="none" stroke="#5cc8ff" stroke-width="3.8"/>` +
        '<path d="M-19 8.5a3.6 3.6 0 0 1 3 -5.6a4.4 4.4 0 0 1 8 1.4a3 3 0 0 1 -1 4.2Z M9 8.5a3 3 0 0 1 -1 -4.2a4.4 4.4 0 0 1 8 -1.4a3.6 3.6 0 0 1 3 5.6Z" fill="#fff"/>';
    })(),
    flower: (() => {
      const pts = [0, 72, 144, 216, 288].map((d) => { const r = ((d - 90) * Math.PI) / 180; return [n(Math.cos(r) * 7.8), n(Math.sin(r) * 7.8 + 0.5)]; });
      return pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9.6" fill="#fff"/>`).join('') +
        pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6.3" fill="#ff8fc0"/>`).join('') +
        pts.map(([x, y]) => `<circle cx="${n(x * 0.92 - 1.2)}" cy="${n(y * 0.92 - 1.4)}" r="2" fill="#fff" fill-opacity=".45"/>`).join('') +
        '<circle cx="0" cy="0.5" r="4.9" fill="#ffd24d"/><circle cx="-1.3" cy="-0.8" r="1.5" fill="#fff" fill-opacity=".7"/>';
    })(),
    bolt: (() => {
      const d = 'M3.5 -15L-9.5 2.2H-1.6L-4.6 15.5L10 -3.2H1.8Z';
      return `<path d="${d}" fill="#fff" ${W7}/><path d="${d}" fill="#ffd24d" stroke="#f5a623" stroke-width="1.6" stroke-linejoin="round"/><path d="M1 -10.5L-5.2 -1.6" fill="none" stroke="#fff" stroke-width="2" stroke-opacity=".8" stroke-linecap="round"/>`;
    })(),
  };
  const STICKERS = [
    { id: 'heart', name: 'לב' }, { id: 'star', name: 'כוכב' }, { id: 'cat', name: 'חתול' },
    { id: 'rainbow', name: 'קשת' }, { id: 'flower', name: 'פרח' }, { id: 'bolt', name: 'ברק' },
  ];
  /* body coordinates: the middle of the chest */
  const stickerAt = (R) => ({ x: R.cx, y: R.sY + 62, s: 1.02 + (R.m || 0) * 0.035 });
  DU.stickerSvg = function (R, id) {
    const art = ART[id];
    if (!art) return '';
    const a = stickerAt(R);
    return `<g transform="translate(${n(a.x)} ${n(a.y)}) scale(${n(a.s)})"><g data-stk="${id}">${art}</g></g>`;
  };

  /* ================= the studio ================= */
  const ICON = {
    spool: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7.2" y="6" width="9.6" height="12" fill="#ff5fa2"/><path d="M7.2 9h9.6M7.2 12h9.6M7.2 15h9.6" stroke="#fff" stroke-opacity=".65" stroke-width="1"/><rect x="4.6" y="3" width="14.8" height="3.6" rx="1.6" fill="#c9894e"/><rect x="4.6" y="17.4" width="14.8" height="3.6" rx="1.6" fill="#c9894e"/><path d="M16.8 13.6q4.4 0.6 4.2 5.6" fill="none" stroke="#ff5fa2" stroke-width="1.4" stroke-linecap="round"/></svg>',
    dice: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4.6" fill="#8b6cf0"/><rect x="3.5" y="3.5" width="17" height="8" rx="4.6" fill="#fff" fill-opacity=".16"/><circle cx="8.3" cy="8.3" r="1.7" fill="#fff"/><circle cx="15.7" cy="8.3" r="1.7" fill="#fff"/><circle cx="12" cy="12" r="1.7" fill="#fff"/><circle cx="8.3" cy="15.7" r="1.7" fill="#fff"/><circle cx="15.7" cy="15.7" r="1.7" fill="#fff"/></svg>',
    none: '<svg viewBox="-20 -20 40 40" aria-hidden="true"><circle r="11" fill="none" stroke="#b9aed6" stroke-width="3"/><path d="M-7.8 7.8L7.8 -7.8" stroke="#b9aed6" stroke-width="3" stroke-linecap="round"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 12.6l4.2 4.2L18.6 7.4" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };
  const stickerIcon = (id) => `<svg viewBox="-22 -20 44 40" aria-hidden="true"><g ${id === 'rainbow' ? 'transform="translate(0 -4)"' : ''}>${ART[id].replace(/fill="#fff" stroke="#fff" stroke-width="7"/g, 'fill="#efe8ff" stroke="#efe8ff" stroke-width="7"').replace('stroke="#fff" stroke-width="17"', 'stroke="#efe8ff" stroke-width="17"')}</g></svg>`;
  const SIZE_NAMES = ['קטן', 'בינוני', 'גדול'];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* which part of her the preview looks at: [x0, y0, x1, y1] in body coordinates */
  function focusRect(R, slot) {
    const { cx, sY, ground, headY, waistY, hipY } = R;
    switch (slot) {
      case 'top': return [cx - 125, sY - 150, cx + 125, hipY + 70];
      case 'bottom': return [cx - 135, waistY - 150, cx + 135, ground + 16];
      case 'dress': return [cx - 150, sY - 120, cx + 150, ground - 40];
      case 'shoes': return [cx - 82, ground - 150, cx + 82, ground + 22];
      case 'socks': return [cx - 96, ground - 290, cx + 96, ground + 22];
      case 'hat': case 'hairacc': return [cx - 165, headY - 262, cx + 165, headY + 150];
      case 'glasses': case 'earrings': return [cx - 135, headY - 150, cx + 135, headY + 150];
      case 'necklace': return [cx - 125, sY - 150, cx + 125, sY + 150];
      case 'bracelet': return [cx - 140, sY + 20, cx + 140, sY + 280];
      case 'bag': return [cx - 110, sY - 80, cx + 190, sY + 340];
      case 'hand': return [cx - 235, sY - 170, cx + 95, sY + 310];
      case 'wings': return [cx - 285, sY - 240, cx + 285, sY + 340];
      case 'side': return [cx + 70, ground - 350, cx + 330, ground + 26];
      default: return [cx - 190, headY - 200, cx + 190, ground + 20];
    }
  }
  function focusBox(state, slot, ar) {
    const R = DU.rig(state.body), sc = DU.charScale(state);
    const [x0, y0, x1, y1] = focusRect(R, slot);
    let w = (x1 - x0) * sc, h = (y1 - y0) * sc;
    const mx = 375 + ((x0 + x1) / 2 - 375) * sc, my = DU.FEET_Y + ((y0 + y1) / 2 - 950) * sc;
    let my2 = my;
    if (w / h < ar) w = h * ar;
    else {
      // a tall preview: spend the extra room on more of HER (below a hat, above her shoes), not on empty table
      const h2 = w / ar, extra = h2 - h, up = ['shoes', 'socks', 'bottom', 'side'].includes(slot), mid = ['dress', 'wings', 'bag', 'hand', 'bracelet'].includes(slot);
      my2 = my + (mid ? 0 : up ? -extra * 0.42 : extra * 0.42);
      h = h2;
    }
    return { vb: `${n(mx - w / 2)} ${n(my2 - h / 2)} ${n(w)} ${n(h)}`, mx, my: my2, w, h, R, sc };
  }

  function open(o) {
    o = o || {};
    const host = o.host, state = o.state, slot = o.slot;
    const w = state && state.wear && state.wear[slot];
    const it = w && DU.itemById[w.id];
    if (!host || !w || !it) return { close() {} };
    const canStick = slot === 'top' || slot === 'dress';
    const snd = (name) => { try { if (DU.sound) DU.sound.play(name); } catch (e) { /* never break on a sound */ } };
    const tone = (st) => { try { if (DU.sound && DU.sound.tone) DU.sound.tone(523 * Math.pow(2, st / 12), { type: 'triangle', dur: 0.16, vol: 0.17, slide: 784 * Math.pow(2, st / 12) }); else snd('tap'); } catch (e) { /* ignore */ } };
    const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const contrast = (bg) => (DU.lum(bg) > 0.82 ? '#ff6f91' : '#ffffff');

    // where we start: her current colour or fabric
    const cur0 = w.c || it.color;
    const p0 = parse(cur0);
    const plain0 = hex(cur0, null) || hex(basePaint(cur0, 'x', [0, 0, 1, 1]).base, '#ff9ac1');
    const f = p0 ? Object.assign({}, p0) : { kind: 'plain', bg: plain0, fg: contrast(plain0), size: 2 };
    let lastKind = p0 ? p0.kind : 'dots';
    const PAL = DU.PALETTE.map((c) => c.toLowerCase());
    const row = (list, part, sel) => list.map((c) => `<button type="button" class="fab-sw" data-fab="${part}" data-v="${c}" style="background:${c}" aria-label="צבע" aria-pressed="${String(c === sel)}"></button>`).join('');
    const withCur = (c) => (PAL.includes(c) ? PAL : [c].concat(PAL));
    const FG_PAL = ['#ffffff'].concat(PAL.filter((c) => c !== '#ffffff')); // white prints first: the favourite

    host.innerHTML = `
      <div class="fab" dir="rtl">
        <div class="fab-panel">
          <div class="fab-head"><span class="fab-title">${ICON.spool}<span>הבד שלי</span></span><span class="fab-item">${esc(it.name)}</span></div>
          <div class="fab-block"><div class="fab-label">דוגמה</div>
            <div class="fab-tiles">
              <button type="button" class="fab-tile" data-fab="kind" data-v="plain" aria-label="חלק" aria-pressed="false"></button>
              ${KINDS.map((k) => `<button type="button" class="fab-tile" data-fab="kind" data-v="${k.id}" aria-label="${k.name}" aria-pressed="false"></button>`).join('')}
              <button type="button" class="fab-tile fab-dice" data-fab="surprise" aria-label="בד בהפתעה">${ICON.dice}<span>הפתעה</span></button>
            </div></div>
          <div class="fab-block"><div class="fab-label">צבע הבד</div><div class="fab-sws" data-row="bg">${row(withCur(f.bg), 'bg', f.bg)}</div></div>
          <div class="fab-block"><div class="fab-label">צבע הדוגמה</div><div class="fab-sws" data-row="fg">${row(FG_PAL, 'fg', f.fg)}</div></div>
          <div class="fab-line"><div class="fab-label">גודל</div><div class="fab-opts">${[1, 2, 3].map((v) => `<button type="button" class="fab-opt" data-fab="size" data-v="${v}" aria-label="${SIZE_NAMES[v - 1]}" aria-pressed="false"><i style="width:${[22, 40, 60][v - 1]}%;height:${[22, 40, 60][v - 1]}%"></i></button>`).join('')}</div></div>
          ${canStick ? `<div class="fab-line"><div class="fab-label">מדבקה</div><div class="fab-opts fab-stks"><button type="button" class="fab-opt" data-fab="sticker" data-v="" aria-label="בלי מדבקה" aria-pressed="false">${ICON.none}</button>${STICKERS.map((s) => `<button type="button" class="fab-opt" data-fab="sticker" data-v="${s.id}" aria-label="${s.name}" aria-pressed="false">${stickerIcon(s.id)}</button>`).join('')}</div></div>` : ''}
          <div class="fab-foot"><button type="button" class="btn mint fab-done" data-act="close">${ICON.check}<span>מוכן</span></button></div>
        </div>
        <div class="fab-stage"><div class="fab-art"></div><div class="fab-tape"></div></div>
      </div>`;

    const root = host.querySelector('.fab'), art = host.querySelector('.fab-art'), stage = host.querySelector('.fab-stage');
    const press = (part, val) => host.querySelectorAll(`[data-fab="${part}"]`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === String(val))));

    let lastFocus = null;
    function draw() {
      const box = art.getBoundingClientRect();
      const ar = box.width > 20 && box.height > 20 ? box.width / box.height : 0.62;
      lastFocus = focusBox(state, slot, ar);
      art.innerHTML = DU.renderCard(state, { noBg: true, viewBox: lastFocus.vb, par: 'xMidYMid meet' });
    }
    const swatchSvg = (kind) => {
      if (kind === 'plain') return `<svg viewBox="0 0 96 50" preserveAspectRatio="none" aria-hidden="true"><rect width="96" height="50" fill="${f.bg}"/></svg>`;
      const id = DU.uid('fs');
      const def = patternDef(id, { kind, bg: f.bg, fg: f.fg, size: 2 }, 48, 25).replace('<pattern ', '<pattern patternTransform="translate(48 25) scale(1.3) translate(-48 -25)" ');
      return `<svg viewBox="0 0 96 50" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>${def}</defs><rect width="96" height="50" fill="url(#${id})"/></svg>`;
    };
    function sync() {
      press('kind', f.kind); press('bg', f.bg); press('fg', f.kind === 'plain' ? '' : f.fg); press('size', f.kind === 'plain' ? '' : f.size);
      if (canStick) press('sticker', w.st || '');
      host.querySelectorAll('.fab-tile[data-fab="kind"]').forEach((b) => (b.innerHTML = swatchSvg(b.dataset.v)));
      root.classList.toggle('fab-plain', f.kind === 'plain');
    }
    /* where the item sits in the preview, in % of the stage */
    function spot(dy) {
      const a = art.getBoundingClientRect(), s = stage.getBoundingClientRect();
      if (!lastFocus || !s.width) return [50, 50];
      let px = 50, py = 46;
      if (dy != null) { // the sticker: the chest
        const k = stickerAt(lastFocus.R), fb = lastFocus;
        const cy = DU.FEET_Y + (k.y - 950) * fb.sc, cx = 375 + (k.x - 375) * fb.sc;
        const scale = Math.min(a.width / fb.w, a.height / fb.h);
        px = ((a.left - s.left) + a.width / 2 + (cx - fb.mx) * scale) / s.width * 100;
        py = ((a.top - s.top) + a.height / 2 + (cy - fb.my) * scale) / s.height * 100;
      }
      return [px, py];
    }
    function pop(kind) {
      if (reduced()) return;
      art.classList.remove('fab-pop'); void art.offsetWidth; art.classList.add('fab-pop');
      const [x, y] = kind === 'sticker' ? spot(0) : spot();
      if (DU.fx && DU.fx.burst) DU.fx.burst(stage, x, y, kind === 'sticker' ? { count: 9, spread: 20, size: 5 } : { count: 11, spread: 30, size: 5.5 });
    }
    function stickerIn() {
      const g = art.querySelector('[data-stk]');
      if (!g || reduced() || !(DU.motion && DU.motion.tween)) return;
      DU.motion.tween(380, (e) => g.setAttribute('transform', `scale(${n(Math.max(0.02, e) * 10) / 10 || 0.02}) rotate(${n((1 - e) * -40)})`), DU.motion.ease.back).done.then(() => g.removeAttribute('transform'));
    }
    /* bring the chosen colours to the middle of their rows (works the same in RTL and LTR) */
    function centre(smooth) {
      host.querySelectorAll('.fab-sws').forEach((r) => {
        const b = r.querySelector('[aria-pressed="true"]'); if (!b) return;
        const rb = r.getBoundingClientRect(), bb = b.getBoundingClientRect();
        const d = bb.left + bb.width / 2 - (rb.left + rb.width / 2);
        if (Math.abs(d) < 2) return;
        if (smooth && r.scrollBy) r.scrollBy({ left: d, behavior: 'smooth' }); else r.scrollLeft += d;
      });
    }
    function commit() {
      w.c = f.kind === 'plain' ? f.bg : make(f);
      if (o.onChange) { try { o.onChange(); } catch (e) { console.error(e); } }
    }
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const NICE_BG = ['#bdf0dc', '#ffc1d9', '#dccbff', '#bfe6ff', '#fff2a8', '#ffffff', '#3a4a8f', '#ff6f91', '#7de3e0', '#3a3346', '#ff9a56', '#b48cff'];
    const NICE_FG = ['#ffffff', '#ff5fa2', '#8b6cf0', '#2fb3a0', '#ffd24d', '#e0435f', '#3a4a8f', '#5cc8ff'];

    function onClick(ev) {
      const b = ev.target.closest('[data-fab]');
      if (!b || !host.contains(b)) return;
      const part = b.dataset.fab, v = b.dataset.v;
      if (part === 'sticker') {
        if (v) w.st = v; else delete w.st;
        if (v) { tone(7); } else snd('off');
        draw(); sync();
        if (v) { stickerIn(); pop('sticker'); }
        if (o.onChange) { try { o.onChange(); } catch (e) { console.error(e); } }
        return;
      }
      if (part === 'surprise') {
        let bg, fg, kind, guard = 0;
        do { bg = pick(NICE_BG); fg = pick(NICE_FG); } while ((bg === fg || Math.abs(DU.lum(bg) - DU.lum(fg)) < 0.2) && ++guard < 60);
        do { kind = pick(KIND_IDS); } while (kind === f.kind && KIND_IDS.length > 1);
        Object.assign(f, { kind, bg, fg, size: 1 + Math.floor(Math.random() * 3) });
        lastKind = kind;
        const rowEl = host.querySelector('[data-row="bg"]');
        if (rowEl && !rowEl.querySelector(`[data-v="${bg}"]`)) rowEl.insertAdjacentHTML('afterbegin', row([bg], 'bg', bg));
        const fgRow = host.querySelector('[data-row="fg"]');
        if (fgRow && !fgRow.querySelector(`[data-v="${fg}"]`)) fgRow.insertAdjacentHTML('afterbegin', row([fg], 'fg', fg));
        snd('pick'); tone(12);
      } else if (part === 'kind') {
        if (f.kind === v) return;
        f.kind = v;
        if (v !== 'plain') { lastKind = v; if (f.fg === f.bg) f.fg = contrast(f.bg); }
        tone(v === 'plain' ? -2 : KIND_IDS.indexOf(v));
      } else if (part === 'bg') {
        f.bg = v;
        if (f.fg === v) f.fg = contrast(v) === v ? '#ff6f91' : contrast(v);
        tone(2);
      } else if (part === 'fg') {
        f.fg = v;
        if (f.kind === 'plain') f.kind = lastKind;
        if (f.bg === v) f.bg = v === '#ffffff' ? '#ffc1d9' : '#ffffff';
        tone(5);
      } else if (part === 'size') {
        f.size = +v || 2;
        if (f.kind === 'plain') f.kind = lastKind;
        tone(+v * 3);
      } else return;
      commit(); draw(); sync(); pop();
      centre(!reduced());
    }
    host.addEventListener('click', onClick);
    let rz = 0;
    const onResize = () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { if (host.isConnected) draw(); else window.removeEventListener('resize', onResize); }); };
    window.addEventListener('resize', onResize);

    draw(); sync();
    // the modal animates in; measure again once it has its final size
    requestAnimationFrame(() => { if (host.isConnected) draw(); });
    centre(false);

    return { close() { host.removeEventListener('click', onClick); window.removeEventListener('resize', onResize); host.innerHTML = ''; } };
  }

  DU.fabric = { KINDS, STICKERS, make, parse, open, isPat };
})();
