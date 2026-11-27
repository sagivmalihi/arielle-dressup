/* bike.js — her bikes: what a bike is made of, the choices of the workshop, and the bikes she owns.
   A bike is a small object (a "spec"):
     { paint, seat, wheel, frame, wheels, basket, streamers, flag, flagC, trail, bell, helmet, helmetC }
   paint = a colour or the id of a special paint (B.PAINTS) · seat = the saddle · wheel = rims and grips ·
   the others are ids from B.PARTS. The 3D bike is built from a spec in ride-bike.js; the workshop screen
   is ride-garage.js (both are fetched only when she rides or opens the workshop).
     DU.bike.cur() → the bike she rides now      DU.bike.list() / select(i) / add() / remove(i) / save(spec)
     DU.bike.owns(kind, id) / buy(kind, id)      ownership key in the store: 'bike:<kind>:<id>'
     DU.bike.ring(kind)                          the sound of her bell
     DU.bike.helmetOf(spec) → { c, style }       for DU.renderCharacter(state, { helmet }) */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const B = (DU.bike = {});
  const MAX_BIKES = 5;

  B.COLORS = ['#ff8fc0', '#ff5fa2', '#ff6b6b', '#ff9d4d', '#ffd54d', '#a3dc7f', '#63c98a', '#7de3e0', '#5aa9ff', '#8d76d8', '#b99cff', '#ffffff', '#c9ced6', '#3a3550'];
  /* special paints: colours that run along the bike. axis 'z' = from the back wheel to the front · 'y' = bottom to top · 'd' = slanted stripes */
  B.PAINTS = [
    { id: 'candy', name: 'סוכריה', price: 150, axis: 'd', hard: true, stops: ['#ff8fc0', '#ffffff'] },
    { id: 'sunset', name: 'שקיעה', price: 200, axis: 'z', stops: ['#8d76d8', '#ff5fa2', '#ff9d4d', '#ffd54d'] },
    { id: 'mermaid', name: 'בת ים', price: 200, axis: 'z', stops: ['#b99cff', '#5aa9ff', '#7de3e0', '#a3dc7f'] },
    { id: 'gold', name: 'זהב', price: 300, axis: 'y', stops: ['#f2a516', '#ffc93c', '#fff0b3', '#ffc93c'] },
    { id: 'rainbow', name: 'קשת', price: 400, axis: 'z', stops: ['#b99cff', '#5aa9ff', '#63c98a', '#ffd54d', '#ff9d4d', '#ff6b6b'] },
  ];
  B.PARTS = {
    frame: [
      { id: 'classic', name: 'קלאסית', price: 0 }, { id: 'sport', name: 'ספורט', price: 0 },
      { id: 'cruiser', name: 'טיולים', price: 200 }, { id: 'heart', name: 'לב', price: 400 },
    ],
    wheels: [
      { id: 'beads', name: 'חרוזים', price: 0 }, { id: 'star', name: 'כוכב', price: 0 }, { id: 'flower', name: 'פרח', price: 150 },
      { id: 'pinwheel', name: 'שבשבת', price: 200 }, { id: 'hearts', name: 'לבבות', price: 250 }, { id: 'rainbow', name: 'קשת', price: 300 },
    ],
    basket: [
      { id: 'flowers', name: 'סל פרחים', price: 0 }, { id: 'none', name: 'בלי סל', price: 0 },
      { id: 'lamp', name: 'פנס', price: 100 }, { id: 'teddy', name: 'דובי בסל', price: 250 },
    ],
    streamers: [
      { id: 'party', name: 'סרטים', price: 0 }, { id: 'none', name: 'בלי סרטים', price: 0 },
      { id: 'rainbow', name: 'סרטי קשת', price: 150 }, { id: 'pompom', name: 'פונפונים', price: 200 },
    ],
    flag: [
      { id: 'pennant', name: 'דגלון', price: 0 }, { id: 'none', name: 'בלי דגל', price: 0 }, { id: 'heart', name: 'לב', price: 100 },
      { id: 'star', name: 'כוכב', price: 100 }, { id: 'pinwheel', name: 'שבשבת', price: 200 }, { id: 'balloons', name: 'בלונים', price: 300 },
    ],
    trail: [
      { id: 'none', name: 'בלי שובל', price: 0 }, { id: 'sparkle', name: 'נצנצים', price: 0 }, { id: 'hearts', name: 'לבבות', price: 200 },
      { id: 'stars', name: 'כוכבים', price: 200 }, { id: 'bubbles', name: 'בועות', price: 250 }, { id: 'fire', name: 'טורבו', price: 350 },
      { id: 'rainbow', name: 'קשת', price: 500 },
    ],
    bell: [
      { id: 'ding', name: 'דינג דינג', price: 0 }, { id: 'horn', name: 'צופר', price: 0 }, { id: 'duck', name: 'ברווז', price: 100 },
      { id: 'cat', name: 'מיאו', price: 100 }, { id: 'magic', name: 'קסם', price: 150 },
    ],
    helmet: [
      { id: 'plain', name: 'כוכב', price: 0 }, { id: 'cat', name: 'חתולה', price: 0 }, { id: 'bow', name: 'פפיון', price: 100 },
      { id: 'bunny', name: 'ארנבת', price: 150 }, { id: 'dino', name: 'דינוזאור', price: 200 }, { id: 'unicorn', name: 'חד־קרן', price: 300 },
      { id: 'crown', name: 'כתר', price: 400 },
    ],
  };
  /* the pages of the workshop */
  B.TABS = [
    { id: 'paint', name: 'צבעים' }, { id: 'frame', name: 'שלדה' }, { id: 'wheels', name: 'גלגלים' }, { id: 'basket', name: 'סל' },
    { id: 'streamers', name: 'סרטים' }, { id: 'flag', name: 'דגל' }, { id: 'trail', name: 'שובל' }, { id: 'bell', name: 'פעמון' }, { id: 'helmet', name: 'קסדה' },
  ];
  B.DEFAULT = {
    v: 1, paint: '#ff8fc0', seat: '#8d76d8', wheel: '#7de3e0', frame: 'classic', wheels: 'beads', basket: 'flowers', streamers: 'party',
    flag: 'pennant', flagC: '#ff9d4d', trail: 'none', bell: 'ding', helmet: 'plain', helmetC: '#b99cff',
  };

  const HEX = /^#[0-9a-f]{6}$/i;
  B.paintDef = (paint) => B.PAINTS.find((p) => p.id === paint) || null;
  B.part = (kind, id) => (kind === 'paint' ? B.paintDef(id) : (B.PARTS[kind] || []).find((p) => p.id === id)) || null;
  /* a spec with every field present and valid */
  B.norm = function (spec) {
    const s = Object.assign({}, B.DEFAULT, spec || {});
    if (!HEX.test(s.paint) && !B.paintDef(s.paint)) s.paint = B.DEFAULT.paint;
    ['seat', 'wheel', 'flagC', 'helmetC'].forEach((k) => { if (!HEX.test(s[k])) s[k] = B.DEFAULT[k]; });
    Object.keys(B.PARTS).forEach((k) => { if (!B.part(k, s[k])) s[k] = B.DEFAULT[k]; });
    return s;
  };

  /* ---------- the bikes she has ---------- */
  const data = () => DU.store.data;
  B.list = function () {
    const d = data();
    if (!Array.isArray(d.bikes) || !d.bikes.length) d.bikes = [B.norm()];
    return d.bikes;
  };
  B.at = () => Math.max(0, Math.min(B.list().length - 1, data().bikeAt | 0));
  B.cur = () => B.norm(B.list()[B.at()]);
  B.save = function (spec) { B.list()[B.at()] = B.norm(spec); DU.store.save(); };
  B.select = function (i) { data().bikeAt = Math.max(0, Math.min(B.list().length - 1, i | 0)); DU.store.save(); };
  B.canAdd = () => B.list().length < MAX_BIKES;
  B.add = function (spec) {
    if (!B.canAdd()) return -1;
    B.list().push(B.norm(spec || B.random()));
    B.select(B.list().length - 1);
    return B.at();
  };
  B.remove = function (i) {
    const l = B.list();
    if (l.length < 2) return;
    l.splice(i, 1);
    B.select(Math.min(B.at(), l.length - 1));
  };

  /* ---------- what is hers ---------- */
  B.price = (kind, id) => { const p = B.part(kind, id); return p ? p.price || 0 : 0; };
  B.owns = (kind, id) => !B.price(kind, id) || DU.store.owns(`bike:${kind}:${id}`);
  B.buy = (kind, id) => B.owns(kind, id) || DU.store.buy(`bike:${kind}:${id}`, B.price(kind, id));
  /* a surprise bike, made only of what she already has */
  B.random = function () {
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const s = {};
    Object.keys(B.PARTS).forEach((k) => (s[k] = pick(B.PARTS[k].filter((p) => B.owns(k, p.id))).id));
    const paints = B.COLORS.concat(B.PAINTS.filter((p) => B.owns('paint', p.id)).map((p) => p.id));
    Object.assign(s, { paint: pick(paints), seat: pick(B.COLORS), wheel: pick(B.COLORS), flagC: pick(B.COLORS), helmetC: pick(B.COLORS.slice(0, 11)) });
    if (s.trail === 'none' && Math.random() < 0.6) s.trail = 'sparkle';
    return B.norm(s);
  };

  /* ---------- colours for flat pictures ---------- */
  B.paintCss = function (paint) {
    const p = B.paintDef(paint);
    if (!p) return paint;
    if (p.hard) return `repeating-linear-gradient(135deg, ${p.stops[0]} 0 7px, ${p.stops[1]} 7px 14px)`;
    return `linear-gradient(${p.axis === 'y' ? '0deg' : '90deg'}, ${p.stops.join(', ')})`;
  };
  B.paintHex = (paint) => { const p = B.paintDef(paint); return p ? p.stops[Math.min(1, p.stops.length - 1)] : paint; };
  B.helmetOf = (spec) => ({ c: (spec && spec.helmetC) || B.DEFAULT.helmetC, style: (spec && spec.helmet) || 'plain' });

  /* ---------- her bell ---------- */
  B.ring = function (kind) {
    const t = (f, o) => { if (DU.sound && DU.sound.tone) DU.sound.tone(f, o); };
    if (kind === 'horn') { [0, 0.2].forEach((at) => { t(311, { at, dur: 0.15, type: 'square', vol: 0.07 }); t(392, { at, dur: 0.15, type: 'square', vol: 0.06 }); }); return; }
    if (kind === 'duck') { [0, 0.17].forEach((at) => { t(640, { at, dur: 0.12, type: 'sawtooth', vol: 0.09, slide: 330 }); t(1280, { at, dur: 0.1, type: 'square', vol: 0.025, slide: 660 }); }); return; }
    if (kind === 'cat') { t(700, { dur: 0.26, type: 'triangle', vol: 0.14, slide: 1150 }); t(1150, { at: 0.24, dur: 0.3, type: 'triangle', vol: 0.12, slide: 560 }); return; }
    if (kind === 'magic') { [1047, 1319, 1568, 2093, 2637].forEach((f, i) => t(f, { at: i * 0.055, dur: 0.3, type: 'sine', vol: 0.1 })); for (let i = 0; i < 5; i++) t(2600 + Math.random() * 1500, { at: 0.3 + i * 0.05, dur: 0.09, type: 'sine', vol: 0.045 }); return; }
    t(2093, { dur: 0.5, type: 'sine', vol: 0.16 }); t(3136, { dur: 0.35, type: 'sine', vol: 0.06 });
    t(2093, { at: 0.16, dur: 0.6, type: 'sine', vol: 0.15 }); t(3136, { at: 0.16, dur: 0.4, type: 'sine', vol: 0.05 });
  };

  /* ---------- small drawn pictures (the same hand as icons.js) ---------- */
  const K = '#4b3878';
  const L = `stroke="${K}" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"`;
  const P = (d, fill, sw) => `<path d="${d}" fill="${fill || 'none'}" stroke="${K}" stroke-width="${sw || 2.8}" stroke-linejoin="round" stroke-linecap="round"/>`;
  const C = (x, y, r, fill, sw) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill || 'none'}"${sw === 0 ? '' : ` stroke="${K}" stroke-width="${sw || 2.8}"`}/>`;
  const S = (d, c, w) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const ICONS = {
    paint: () => P('M8 30C8 14 20 6 31 8C42 10 44 22 38 26C34 28 30 26 28 30C26 34 31 37 27 41C22 44 8 42 8 30Z', '#fff3ea') + C(16, 26, 3.4, '#ff7aae', 0) + C(22, 16, 3.4, '#ffd060', 0) + C(33, 15, 3.4, '#7de3e0', 0) + C(16, 35, 3.2, '#b99cff', 0),
    frame: () => C(11, 32, 8.5, '#fff') + C(37, 32, 8.5, '#fff') + S('M11 32L19 17H31L37 32M19 17L25 32H11', '#ff5f9e', 3.6) + S('M31 17L29 10.500H34.500M15.500 12H22.500', K, 3.2),
    wheels: () => C(24, 24, 17, '#fff6e6', 3.4) + C(24, 24, 11.5, '#bfe9ff', 2.2) + S('M24 12.500V35.500M12.500 24H35.500M16 16L32 32M32 16L16 32', K, 1.6) + C(24, 24, 3.4, '#ffd060', 2.2),
    basket: () => S('M9 22Q24 2 39 22', K, 3) + P('M7 21H41L37 41H11Z', '#ffd9a3') + S('M9.500 28H38.500M11 35H37M18 21L19.500 41M30 21L28.500 41', '#d9a25f', 2),
    streamers: () => P('M30 6H42V15H30Z', '#7de3e0') + S('M31 15Q24 22 27 31Q29 38 22 43', '#ff7aae', 3.4) + S('M35 15Q32 25 36 33Q38 39 34 43', '#ffd060', 3.4) + S('M29 14Q16 18 16 28Q16 35 9 38', '#b99cff', 3.4),
    flag: () => S('M12 44V5', K, 3.4) + P('M12 7L40 16L12 26Z', '#ff9d4d') + C(12, 5, 2.6, '#ffd060', 2),
    trail: () => P(DU.sparkleD(31, 17, 13), '#ffcc45') + P(DU.sparkleD(14, 30, 7.5), '#ff9ec4', 2.2) + P(DU.sparkleD(22, 41, 4.5), '#c9b3ff', 2) + S('M5 12H13M3 20H9', K, 2.6),
    bell: () => P('M9 34C13 31 12 26 13 20C14 13 18 9 24 9C30 9 34 13 35 20C36 26 35 31 39 34Z', '#ffd060') + P('M20 38C21 41 27 41 28 38') + S('M24 9V5', K, 2.8) + S('M17 17C18 14 20 13 22 12.500', '#fff', 2.4),
    helmet: () => P('M6 30C6 16 14 8 24 8C34 8 42 16 42 30Q33 26 24 26Q15 26 6 30Z', '#c9b3ff') + P('M6 30Q15 26 24 26Q33 26 42 30L41 35Q24 30 7 35Z', '#8b6cf0') + S('M24 10V21M15 12.500L17.500 22M33 12.500L30.500 22', K, 2.2) + S('M11 20Q13 14 18 12', '#fff', 2.4),
    wrench: () => P('M30 6A10 10 0 0 0 20.500 20L6 34.500A3.9 3.9 0 0 0 13.500 42L28 27.500A10 10 0 0 0 42 18L35 25L28.500 23L26.500 16.500L33.500 9.500Q32 6 30 6Z', '#c9ced6'),
    plus: () => C(24, 24, 17, '#fff') + S('M24 14V34M14 24H34', '#ff5f9e', 5.5),
    turn: () => S('M9 25A15 15 0 0 1 36 15', K, 4.2) + P('M38 6L38 18L26.500 16Z', '#c9b3ff', 2.2) + S('M39 23A15 15 0 0 1 12 33', K, 4.2) + P('M10 42L10 30L21.500 32Z', '#c9b3ff', 2.2),
    /* the sounds of the bell */
    'bell-ding': () => ICONS.bell() + S('M5 14L9 16M4 22H8.500M43 14L39 16M44 22H39.500', K, 2.4),
    'bell-horn': () => P('M10 19H18L34 9V39L18 29H10Z', '#ff9d4d') + P('M10 19H5V29H10', '#ffd060') + C(37, 24, 5.5, '#3a3550') + S('M41 14Q46 24 41 34', K, 2.6),
    'bell-duck': () => P('M14 24C14 14 22 9 29 12C35 14 36 22 33 26C40 28 42 34 39 39H12C6 39 6 31 12 30C13 28 14 26 14 24Z', '#ffe07a') + P('M33 18L43 19L35 24Z', '#ff9d4d') + C(27, 18, 1.9, K, 0),
    'bell-cat': () => P('M9 9L17 16Q24 13 31 16L39 9L40 26C40 35 33 41 24 41C15 41 8 35 8 26Z', '#ffd9a3') + C(17.500, 25, 2, K, 0) + C(30.500, 25, 2, K, 0) + P('M22 30L24 32L26 30Z', '#ff7aae', 1.8) + S('M24 32Q21 36 18 34M24 32Q27 36 30 34', K, 2),
    'bell-magic': () => S('M8 41L27 22', K, 7) + S('M8 41L27 22', '#b99cff', 2.8) + P(DU.starD(33, 15, 11, 5, 0.5, -75), '#ffcc45') + P(DU.sparkleD(12, 13, 5.5), '#ff9ec4', 2) + P(DU.sparkleD(41, 35, 4.5), '#7de3e0', 2),
    /* the trails */
    'trail-none': () => C(24, 24, 16, '#fff') + S('M13 35L35 13', '#e0457f', 3.8),
    'trail-sparkle': () => P(DU.sparkleD(30, 18, 13), '#fff6c2') + P(DU.sparkleD(13, 31, 8), '#ffe08a', 2.2) + P(DU.sparkleD(27, 40, 5), '#fff', 2),
    'trail-hearts': () => P(DU.heartD(30, 17, 11), '#ff7aae') + P(DU.heartD(14, 30, 7), '#ffb3d3', 2.2) + P(DU.heartD(28, 39, 4.5), '#ff5f9e', 2),
    'trail-stars': () => P(DU.starD(30, 18, 13), '#ffcc45') + P(DU.starD(13, 31, 8), '#7de3e0', 2.2) + P(DU.starD(27, 41, 5), '#ff9ec4', 2),
    'trail-bubbles': () => C(30, 18, 11, '#d6f0ff') + S('M24 15Q26 11 30 10.500', '#fff', 2.4) + C(13, 31, 7, '#e6f6ff', 2.2) + C(27, 40, 4, '#d6f0ff', 2),
    'trail-fire': () => P('M26 5C28 13 38 17 36 29C35 37 29 42 23 42C15 42 10 36 11 28C12 22 16 20 17 14C20 17 21 20 21 23C24 18 25 12 26 5Z', '#ff9d4d') + P('M24 23C26 27 30 29 29 34C28 38 26 40 23 40C19 40 17 37 18 33C19 30 21 29 21 26C23 26 24 25 24 23Z', '#ffe07a', 2),
    'trail-rainbow': () => ['#ff6b6b', '#ff9d4d', '#ffd54d', '#63c98a', '#5aa9ff', '#b99cff'].map((c, i) => S(`M${6 + i * 0.3} 40A${33 - i * 4.4} ${33 - i * 4.4} 0 0 1 ${39 - i * 4.1} ${7 + i * 0.3}`, c, 4.6)).join('') + S('M4 40A35.500 35.500 0 0 1 39.500 4.500', K, 2.6) + S('M30 40A9.500 9.500 0 0 1 39.500 30.500', K, 2.6),
  };
  B.icon = function (name) {
    const f = ICONS[name];
    return f ? `<svg class="du-ico" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${f()}</svg>` : '';
  };

  /* her bike as a flat picture, in her colours (it is parked in her room; viewBox 0 0 236 196) */
  B.sideSvg = function (spec, cls) {
    const s = B.norm(spec), Kd = '#4b3878', u = DU.uid('bk');
    const def = B.paintDef(s.paint);
    const defs = def ? `<defs><linearGradient id="${u}" gradientUnits="userSpaceOnUse" x1="54" y1="${def.axis === 'y' ? 150 : 0}" x2="${def.axis === 'y' ? 54 : 182}" y2="${def.axis === 'y' ? 60 : 0}">${def.stops.map((c, i) => `<stop offset="${i / (def.stops.length - 1)}" stop-color="${c}"/>`).join('')}</linearGradient></defs>` : '';
    const col = def ? `url(#${u})` : s.paint;
    const tube = (d) => `<path d="${d}" fill="none" stroke="${Kd}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
    const wheel = (x) => `<circle cx="${x}" cy="146" r="40" fill="#fff" fill-opacity=".55" stroke="${Kd}" stroke-width="7"/><circle cx="${x}" cy="146" r="33" fill="none" stroke="${s.wheel}" stroke-width="3.5"/>` +
      `<path d="M${x - 33} 146H${x + 33}M${x} 113V179M${x - 23} 123L${x + 23} 169M${x + 23} 123L${x - 23} 169" stroke="#c9b3ff" stroke-width="1.8"/><circle cx="${x}" cy="146" r="5" fill="#ffd060" stroke="${Kd}" stroke-width="2.5"/>`;
    const frames = {
      classic: 'M98 146L54 146L86 96M98 146L84 90M88 100L156 96M98 146L158 104M156 92L160 110L182 146',
      sport: 'M98 146L54 146L84 92M98 146L84 90M84 92L156 90M98 146L158 104M156 88L160 110L182 146',
      cruiser: 'M98 146L54 146L86 96M98 146L84 90M86 96Q120 124 156 92M98 146Q134 136 158 104M156 90L160 110L182 146',
      heart: 'M98 146L54 146L82 104M98 146C70 122 76 92 92 92C106 92 110 104 112 110C114 104 122 90 138 92C156 94 150 124 98 146M84 96L84 90M150 100L160 110L182 146',
    };
    const basket = s.basket === 'flowers' || s.basket === 'teddy'
      ? `<path d="M166 66h46l-5 32h-36Z" fill="#ffd9a3" stroke="${Kd}" stroke-width="4"/><path d="M169 77h40M171 88h36M180 66l2 32M196 66l-2 32" fill="none" stroke="#e0a868" stroke-width="2"/>` +
        (s.basket === 'flowers'
          ? `<circle cx="178" cy="58" r="8" fill="#ff7aae" stroke="${Kd}" stroke-width="3"/><circle cx="194" cy="54" r="9" fill="#ffd060" stroke="${Kd}" stroke-width="3"/><circle cx="206" cy="61" r="7" fill="#c9b3ff" stroke="${Kd}" stroke-width="3"/><circle cx="178" cy="58" r="2.4" fill="#fff"/><circle cx="194" cy="54" r="2.6" fill="#fff"/><circle cx="206" cy="61" r="2.2" fill="#fff"/>`
          : `<circle cx="180" cy="42" r="6" fill="#c99a6b" stroke="${Kd}" stroke-width="3"/><circle cx="202" cy="42" r="6" fill="#c99a6b" stroke="${Kd}" stroke-width="3"/><circle cx="191" cy="54" r="14" fill="#d9ab7a" stroke="${Kd}" stroke-width="3"/><circle cx="186" cy="52" r="1.8" fill="${Kd}"/><circle cx="196" cy="52" r="1.8" fill="${Kd}"/><ellipse cx="191" cy="59" rx="4.5" ry="3.4" fill="#f3dcc0"/>`)
      : s.basket === 'lamp' ? `<path d="M160 70h14v16h-14Z" fill="#c9ced6" stroke="${Kd}" stroke-width="3.5"/><path d="M174 68q9 10 0 20Z" fill="#fff6c4" stroke="${Kd}" stroke-width="3"/>` : '';
    const flag = s.flag === 'none' ? '' : `<path d="M40 104V26" stroke="${Kd}" stroke-width="4"/><path d="M40 104V26" stroke="#fff" stroke-width="1.6"/>` +
      (s.flag === 'balloons' ? `<circle cx="30" cy="20" r="11" fill="#ff7aae" stroke="${Kd}" stroke-width="3"/><circle cx="48" cy="14" r="11" fill="#ffd060" stroke="${Kd}" stroke-width="3"/>`
        : s.flag === 'heart' ? `<path d="${DU.heartD(26, 34, 12)}" fill="${s.flagC}" stroke="${Kd}" stroke-width="3"/>`
        : s.flag === 'star' ? `<path d="${DU.starD(25, 36, 13)}" fill="${s.flagC}" stroke="${Kd}" stroke-width="3"/>`
        : s.flag === 'pinwheel' ? `<path d="M40 26L28 12L40 14ZM40 26L54 14L52 26ZM40 26L52 40L40 38ZM40 26L26 38L28 26Z" fill="${s.flagC}" stroke="${Kd}" stroke-width="2.6"/>`
        : `<path d="M40 28L8 38L40 50Z" fill="${s.flagC}" stroke="${Kd}" stroke-width="3"/>`);
    return `<svg class="${cls || 'bike-side'}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 236 196" aria-hidden="true" focusable="false" stroke-linejoin="round" stroke-linecap="round">${defs}` +
      `<ellipse cx="118" cy="188" rx="96" ry="6" fill="#b98a6a" fill-opacity=".25"/>` + flag +
      wheel(54) + wheel(182) + tube(frames[s.frame] || frames.classic) +
      `<path d="M156 94L152 66L136 60" fill="none" stroke="${Kd}" stroke-width="7"/><path d="M136 60L128 58" fill="none" stroke="${s.wheel}" stroke-width="9"/>` +
      (s.streamers === 'none' ? '' : s.streamers === 'pompom' ? `<circle cx="124" cy="62" r="8" fill="#ff9ec4" stroke="${Kd}" stroke-width="2.6"/>` : `<path d="M128 60q-9 4 -10 16M126 57q-12 0 -16 12M127 62q-4 8 -2 16" fill="none" stroke="#ff9ec4" stroke-width="2.6"/>`) +
      `<path d="M66 78q14 -9 34 0q-3 9 -17 9q-13 0 -17 -9Z" fill="${s.seat}" stroke="${Kd}" stroke-width="4"/>` + basket +
      `<circle cx="98" cy="146" r="9" fill="#ffd060" stroke="${Kd}" stroke-width="3.5"/><path d="M98 146L112 162" stroke="${Kd}" stroke-width="5"/><rect x="104" y="159" width="18" height="7" rx="3" fill="${s.seat}" stroke="${Kd}" stroke-width="2.5"/>` +
      `</svg>`;
  };
})();
