/* props.js — MORE PROPS: a third batch of hand-held things, and the "side" slot: pets and
   things that stand on the ground next to her (right of the picture, drawn in front).
   Same conventions as acc-body.js: body coordinates, hand-held things hang off the
   left-of-picture hand (s = -1). Side props are drawn around x = R.cx + 215 on y = R.ground. */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const { n, p, ov } = DU;

  /* tagged template that rounds numbers:  d`M${x} ${y}` */
  const d = (s, ...v) => s.reduce((a, x, i) => a + x + (i < v.length ? (typeof v[i] === 'number' ? n(v[i]) : v[i]) : ''), '');
  const ell = (x, y, rx, ry, fill, line, sw = 2, extra = '') =>
    `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill || 'none'}"${line ? ` stroke="${line}" stroke-width="${sw}"` : ''}${extra ? ' ' + extra : ''}/>`;
  const circ = (x, y, r, fill, line, sw, extra) => ell(x, y, r, r, fill, line, sw, extra);
  const ln = (dd, line, sw = 2, extra = '') => p(dd, 'none', line, sw, extra);
  const rope = (dd, fill, line, w = 3.2) => ln(dd, line, w + 2.6) + ln(dd, fill, w);
  const rrect = (x0, y0, x1, y1, r) => d`M${x0 + r} ${y0}H${x1 - r}Q${x1} ${y0} ${x1} ${y0 + r}V${y1 - r}Q${x1} ${y1} ${x1 - r} ${y1}H${x0 + r}Q${x0} ${y1} ${x0} ${y1 - r}V${y0 + r}Q${x0} ${y0} ${x0 + r} ${y0}Z`;
  const rot = (a, x, y, svg) => `<g transform="rotate(${a} ${n(x)} ${n(y)})">${svg}</g>`;
  const mir = (svg) => `<g transform="scale(-1 1)">${svg}</g>`;
  const bothS = (svg) => svg + mir(svg); // mirror around the local x = 0
  const sparkles = (list, fill = '#fff') => list.map((q) => DU.sparkle(q[0], q[1], q[2], q[3] || fill, q[4] || 1)).join('');
  const GOLD = '#ffd24d', GOLD_L = '#b07a1e', GOLD_D = '#f0a92e', SILVER = '#e3e7f5', SILVER_L = '#8a90ad';
  const LEAF = '#7fcf7a', LEAF_L = '#3f8f4a', DARK = '#3a3346', WOOD = '#e9c98f', WOOD_L = '#9a6a2c', BROWN = '#a8703d', BROWN_L = '#5f3a1c';
  const HL = (x, y, rx, ry, a = 0, o = 0.6) => ell(x, y, rx, ry, '#fff', null, 0, `fill-opacity="${o}"${a ? ` transform="rotate(${a} ${n(x)} ${n(y)})"` : ''}`);

  /* ---------- frames ---------- */
  /* at the closed hand: +x points away from the body, +y down; r > 0 tilts "up" outward */
  const handG = (R, s, svg, r = 0) => {
    const h = R.hand(s);
    return `<g transform="translate(${n(h.x)} ${n(h.y)})${s < 0 ? ' scale(-1 1)' : ''}${r ? ` rotate(${n(r)})` : ''}">${svg}</g>`;
  };
  /* finger colour: skin, or the mittens when she wears them */
  function fingerSkin(ctx) {
    let sk = (ctx && ctx.sk) || { fill: '#ffe3d1', line: '#b98a80' };
    const gl = ctx && ctx.state && ctx.state.wear && ctx.state.wear.bracelet;
    if (gl && gl.id === 'br_gloves') { const c = gl.c || '#ff6f91'; sk = { fill: c, line: DU.line(c) }; }
    return sk;
  }
  const fingers = (ctx, list) => { const sk = fingerSkin(ctx); return list.map((q) => ell(q[0], q[1], 4.5, 3.1, sk.fill, sk.line, 1.5)).join(''); };
  /* next to her, standing on the ground: origin on the ground, y goes up into the negatives */
  const sideG = (R, svg, dx = 215) => `<g transform="translate(${n(R.cx + dx)} ${n(R.ground)})">${svg}</g>`;
  const shadow = (w, x = 0) => ell(x, 3, w, Math.max(5, w * 0.14), '#43206b', null, 0, 'fill-opacity=".15"');

  /* ---------- pet faces ---------- */
  const EYE = '#3a2a4a';
  const peye = (x, y, r = 9, col = EYE) =>
    ell(x, y, r * 0.84, r, col) + ell(x, y + r * 0.42, r * 0.5, r * 0.34, '#fff', null, 0, 'fill-opacity=".16"') +
    circ(x - r * 0.26, y - r * 0.36, r * 0.38, '#fff') + circ(x + r * 0.32, y + r * 0.44, r * 0.17, '#fff', null, 0, 'fill-opacity=".9"');
  const pblush = (x, y, rx = 7.5, ry = 4.2) => ell(x, y, rx, ry, '#ff7f9c', null, 0, 'fill-opacity=".5"');
  const fat = (dd, fill, line, w) => ln(dd, line, w + 4.8) + ln(dd, fill, w); // a thick rounded stroke with an outline (tails, stems)
  const balloonD = (bx, by, k = 1) =>
    d`M${bx} ${by - 44 * k}C${bx + 31 * k} ${by - 44 * k} ${bx + 38 * k} ${by - 9 * k} ${bx + 31 * k} ${by + 10 * k}C${bx + 25 * k} ${by + 30 * k} ${bx + 9 * k} ${by + 43 * k} ${bx} ${by + 45 * k}C${bx - 9 * k} ${by + 43 * k} ${bx - 25 * k} ${by + 30 * k} ${bx - 31 * k} ${by + 10 * k}C${bx - 38 * k} ${by - 9 * k} ${bx - 31 * k} ${by - 44 * k} ${bx} ${by - 44 * k}Z`;

  /* ================================================================== IN HER HAND */
  const hands = [
    {
      id: 'hd_balloons', slot: 'hand', name: 'צרור בלונים', tags: ['party', 'kawaii', 'pop'], color: '#ff6f91',
      draw(R, P) {
        const H = R.hand(-1), y0 = R.sY;
        const one = (bx, by, k, fill, line) =>
          p(d`M${bx} ${by + 44 * k}l${-5 * k} ${8.5 * k}h${10 * k}Z`, fill, line, 1.8) + p(balloonD(bx, by, k), fill, line, 2.4) +
          ov(d`M${bx + 14 * k} ${by - 38 * k}C${bx + 34 * k} ${by - 22 * k} ${bx + 34 * k} ${by + 14 * k} ${bx + 4 * k} ${by + 44 * k}C${bx + 12 * k} ${by + 40 * k} ${bx + 26 * k} ${by + 28 * k} ${bx + 31 * k} ${by + 10 * k}C${bx + 37 * k} ${by - 8 * k} ${bx + 32 * k} ${by - 30 * k} ${bx + 14 * k} ${by - 38 * k}Z`) +
          HL(bx - 13 * k, by - 20 * k, 6 * k, 11 * k, 22);
        const B = [[H.x - 114, y0 + 2, 0.9, '#5cc8ff'], [H.x - 58, y0 - 6, 0.95, '#ffd24d'], [H.x - 90, y0 + 84, 1, null]];
        let strings = '';
        B.forEach(([bx, by, k]) => (strings += d`M${H.x - 1} ${H.y + 4}Q${(H.x + bx) / 2 + 10} ${(H.y + by + 52 * k) / 2 + 26} ${bx} ${by + 52 * k}`));
        return ln(strings, '#8a8fa8', 1.6) + B.map(([bx, by, k, c]) => one(bx, by, k, c || P.fill, c ? DU.line(c) : P.line)).join('') +
          p(DU.starD(H.x - 89, y0 + 88, 10), '#fff', null, 0, 'fill-opacity=".5"') + DU.sparkle(H.x - 138, y0 + 62, 5, '#fff');
      },
    },
    {
      id: 'hd_kite', slot: 'hand', name: 'עפיפון', tags: ['nature', 'beach', 'sport'], color: '#ff6f91',
      draw(R, P) {
        const H = R.hand(-1), kx = H.x - 96, ky = R.sY + 30, c2 = DU.light(P.base, 0.55);
        const kite =
          ln('M0 54q14 12 2 28q-14 14 -2 30', '#8a8fa8', 1.6) +
          DU.bow(5, 76, 7, '#ffd24d') + DU.bow(-5, 106, 7, '#5cc8ff') +
          p('M0 -54L38 -8L0 56L-38 -8Z', P.fill, P.line, 2.4) + p('M0 -54L38 -8L0 -8Z', c2) + p('M0 -8L0 56L-38 -8Z', c2) +
          ov('M0 -8L38 -8L0 56Z') + ln('M0 -54V56M-38 -8H38', P.line, 1.7) + p('M0 -54L38 -8L0 56L-38 -8Z', 'none', P.line, 2.4) +
          p(DU.heartD(0, -10, 9), '#fff', null, 0, 'fill-opacity=".85"');
        return ln(d`M${H.x - 1} ${H.y + 2}Q${H.x - 20} ${H.y - 70} ${kx + 4} ${ky - 4}`, '#8a8fa8', 1.5) +
          `<g transform="translate(${n(kx)} ${n(ky)}) rotate(-16)">${kite}</g>`;
      },
    },
    {
      id: 'hd_palette', slot: 'hand', name: 'פלטת צבעים', tags: ['paris', 'school', 'kawaii'], color: '#ff6f91',
      draw(R, P) {
        const blob = (x, y, r, c) => ell(x, y, r, r * 0.82, c, DU.line(c), 1.3) + HL(x - r * 0.3, y - r * 0.3, r * 0.3, r * 0.2, 0, 0.7);
        return handG(R, -1,
          // the brush, tucked behind the palette
          rot(34, 26, -4, p('M-3 20L3 20L2.4 -58L-2.4 -58Z', '#8fd3f0', '#3f7fa8', 1.6) + `<rect x="-3.6" y="-70" width="7.2" height="13" rx="1.6" fill="${SILVER}" stroke="${SILVER_L}" stroke-width="1.3"/>` +
            p('M-3.6 -70C-5 -80 -2 -88 0 -93C2 -88 5 -80 3.6 -70Z', P.fill, P.line, 1.5)) +
          p('M-10 -4C-14 -34 14 -50 44 -46C70 -42 84 -22 78 0C72 22 46 32 20 28C12 26 14 16 6 14C-4 12 -8 6 -10 -4Z', WOOD, WOOD_L, 2.3) +
          ov('M78 0C72 22 46 32 20 28C12 26 14 16 6 14C30 22 62 18 78 0Z') +
          ell(6, 0, 6, 7.5, '#fff7ec', WOOD_L, 1.6) +
          blob(14, -27, 7, '#e0435f') + blob(32, -34, 7.5, '#ffd24d') + blob(51, -30, 7.5, '#3fbf9a') + blob(65, -17, 7.5, '#5cc8ff') + blob(63, 3, 7, '#b48cff') + blob(40, 8, 10, P.base),
          -8);
      },
    },
    {
      id: 'hd_camera', slot: 'hand', name: 'מצלמה', tags: ['paris', 'retro', 'pop', 'nature'], color: '#ff9ac1',
      draw(R, P) {
        const body = rrect(-27, 40, 27, 84, 7);
        return handG(R, -1,
          ln('M-3 8L-19 42M3 8L19 42', '#5a4a6a', 3) +
          `<rect x="6" y="34" width="13" height="8" rx="2" fill="#e0435f" stroke="#8c1f38" stroke-width="1.3"/>` +
          p(body, P.fill, P.line, 2.3) + p('M-27 60H27V77Q27 84 20 84H-20Q-27 84 -27 77Z', '#fffaf3') + ln('M-27 60H27', P.line, 1.3, 'stroke-opacity=".5"') +
          ov('M14 40H20Q27 40 27 47V77Q27 84 20 84H14Z') +
          circ(0, 62, 14, '#fff', P.line, 2) + circ(0, 62, 10.5, DARK) + circ(0, 62, 6, '#5a5470') + circ(-3.4, 58.6, 2.6, '#fff', null, 0, 'fill-opacity=".85"') +
          `<rect x="-22" y="45" width="10" height="7" rx="1.6" fill="#fff6c2" stroke="${P.line}" stroke-width="1.1"/>` + circ(19, 49, 2.6, DARK) +
          ln('M-21 70h5', '#ff6f91', 2.2) + ln('M-21 74h5', '#ffd24d', 2.2) + ln('M-21 78h5', '#5cc8ff', 2.2) +
          `<rect x="-14" y="80.5" width="28" height="2.4" rx="1" fill="${DARK}" fill-opacity=".55"/>` + DU.sparkle(31, 36, 5, '#fff'));
      },
    },
    {
      id: 'hd_racket', slot: 'hand', name: 'מחבט טניס', tags: ['sport', 'british'], color: '#5cc8ff',
      draw(R, P, ctx) {
        const head = DU.ellD(0, -84, 25, 32);
        let strings = '';
        for (let i = -4; i <= 4; i++) strings += d`M${i * 6} -118V-50M-26 ${-84 + i * 7}H26`;
        return handG(R, -1,
          p('M-4.6 24L4.6 24L4 -30L-4 -30Z', '#fffaf3', '#a79cc8', 1.6) + ln('M-4.4 16l8.8 -5M-4.4 6l8.8 -5M-4.4 -4l8.8 -5M-4.4 -14l8.8 -5', '#cfc6e6', 1.4) +
          `<rect x="-5.6" y="21" width="11.2" height="6" rx="2" fill="${P.fill}" stroke="${P.line}" stroke-width="1.3"/>` +
          ln('M-3 -30L-13 -56M3 -30L13 -56', P.line, 7) + ln('M-3 -30L-13 -56M3 -30L13 -56', P.fill, 3.8) +
          p(head, '#ffffff', null, 0, 'fill-opacity=".35"') + DU.clip(ctx.id('rk'), head, ln(strings, '#ffffff', 1.1, 'stroke-opacity=".95"')) +
          ln(head, P.line, 9) + ln(head, P.fill, 5.4) + ln('M-20 -104A25 32 0 0 1 4 -116', '#fff', 1.8, 'stroke-opacity=".7"') +
          circ(38, -22, 10, '#d9f24f', '#8fa82a', 1.7) + ln('M30 -27Q38 -22 31 -15M45 -28Q39 -22 46 -16', '#fff', 1.6) + HL(34.6, -26, 2.6, 1.8, -30, 0.7),
          26);
      },
    },
    {
      id: 'hd_skateboard', slot: 'hand', name: 'סקייטבורד', tags: ['sport', 'retro', 'rock'], color: '#b48cff',
      draw(R, P, ctx) {
        const deck = rrect(-17, -36, 17, 116, 17);
        const truck = (y) => `<rect x="-21" y="${y - 3}" width="42" height="6" rx="2" fill="${SILVER}" stroke="${SILVER_L}" stroke-width="1.3"/>` +
          bothS(`<rect x="19" y="${y - 8}" width="9" height="16" rx="3.6" fill="#fff6c2" stroke="#b89a3a" stroke-width="1.4"/>`);
        return handG(R, -1, '<g transform="translate(0 -14)">' +
          truck(-10) + truck(92) + p(deck, P.fill, P.line, 2.4) +
          DU.clip(ctx.id('sk'), deck, p('M-17 22L17 4V20L-17 38Z', '#ffffff', null, 0, 'fill-opacity=".75"') + p('M-17 44L17 26V34L-17 52Z', '#ffd24d') + ov('M6 -40H20V120H6Z')) +
          p(DU.starD(0, 76, 10), '#fff', P.line, 1.3) + p(DU.heartD(0, -16, 6.5), '#fff', null, 0, 'fill-opacity=".8"') +
          HL(-9, 100, 3, 9, 0, 0.4) + '</g>',
          -4);
      },
    },
    {
      id: 'hd_snowglobe', slot: 'hand', name: 'כדור שלג קסום', tags: ['winter', 'magic', 'kawaii'], price: 400, color: 'glitter:#5cc8ff', fixed: true,
      draw(R, P, ctx) {
        const glass = DU.ellD(4, -22, 24, 24);
        const snow = [[-8, -34], [2, -40], [14, -32], [-4, -20], [18, -18], [8, -26], [-12, -12], [12, -8], [-2, -30]].map((q) => circ(q[0], q[1], 1.5, '#fff')).join('');
        return {
          over: handG(R, -1,
            p(glass, '#dff4ff', null, 0, 'fill-opacity=".8"') +
            DU.clip(ctx.id('sg'), glass,
              ell(4, 4, 30, 12, '#ffffff') +
              p('M4 -40L14 -24H9L17 -10H-9L-1 -24H-6Z', '#3fbf9a', '#1f7a5c', 1.4) + `<rect x="2" y="-10" width="4" height="5" fill="${BROWN}"/>` + p(DU.starD(4, -42, 4.2), GOLD, GOLD_L, 0.9) +
              circ(-10, -10, 5, '#fff', '#a9b6d6', 1.1) + circ(-10, -17, 3.6, '#fff', '#a9b6d6', 1.1) + circ(-11, -17.6, 0.7, DARK) + circ(-9, -17.6, 0.7, DARK) + snow) +
            p(glass, 'none', SILVER_L, 2) + ln('M-12 -36A22 22 0 0 1 2 -43', '#fff', 2.6, 'stroke-opacity=".85"') +
            p('M-17 0L25 0L29 15Q4 20 -21 15Z', P.fill, P.line, 2.2) + ov('M14 0H25L29 15Q20 17 12 17.5Z') + ell(4, 0.5, 21, 3.6, '#fff', null, 0, 'fill-opacity=".45"') +
            fingers(ctx, [[-17, 5], [-17, 12]]) + sparkles([[34, -40, 5], [-24, -44, 4, '#fff7b8']])),
        };
      },
    },
    {
      id: 'hd_lantern', slot: 'hand', name: 'פנס נייר', tags: ['anime', 'sleepover', 'nature', 'magic'], color: '#ff6f91',
      draw(R, P, ctx) {
        const body = 'M36 0C18 4 14 20 14 34C14 48 18 62 36 66L56 66C74 62 78 48 78 34C78 20 74 4 56 0Z';
        return handG(R, -1,
          ln('M-6 8L46 -26', BROWN_L, 6) + ln('M-6 8L46 -26', '#c98e5a', 3.4) + ln('M46 -26V-6', '#8a8fa8', 1.5) +
          ln('M40 72v14M46 72v18M52 72v14', '#ffd24d', 2) +
          `<rect x="34" y="-7" width="24" height="8" rx="2.4" fill="${DARK}"/><rect x="34" y="65" width="24" height="8" rx="2.4" fill="${DARK}"/>` +
          p(body, P.fill, P.line, 2.3) + ell(46, 34, 20, 24, '#fff6c2', null, 0, 'fill-opacity=".7"') + ell(46, 36, 10, 13, '#ffffff', null, 0, 'fill-opacity=".7"') +
          DU.clip(ctx.id('ln'), body, ln('M10 12H82M10 23H82M10 34H82M10 45H82M10 56H82', P.line, 1.2, 'stroke-opacity=".4"') + ov('M60 -4H84V70H60Q72 34 60 -4Z')) +
          DU.flower(46, 34, 8, '#ffffff', '#ffb3cf') + p(body, 'none', P.line, 2.3) + sparkles([[88, 6, 4.4, '#fff7b8'], [6, 44, 3.6]]));
      },
    },
    {
      id: 'hd_magicbook', slot: 'hand', name: 'ספר קסמים', tags: ['magic', 'british'], price: 500, color: 'galaxy', fixed: true,
      draw(R, P) {
        return handG(R, -1,
          p('M-15 8L32 8L32 68L-15 68Z', '#fffaf0', '#b9ad98', 1.6) + ln('M-12 65.4H32M-12 62.6H32', '#d9cdb8', 1) +
          p('M27 60l0 15l4 -4l4 4l0 -15Z', '#ff6f91', '#a8305f', 1.2) +
          p('M-21 3L26 3Q30 3 30 7L30 63L-21 63Z', P.fill, P.line, 2.4) + p('M-21 3L-13 3L-13 63L-21 63Z', '#2a1f5c', null, 0, 'fill-opacity=".45"') +
          p('M30 49V63H16Z', GOLD, GOLD_L, 1.2) + p('M30 17V7Q30 3 26 3H16Z', GOLD, GOLD_L, 1.2) +
          p('M12 20A13 13 0 1 0 12 46A10 10 0 1 1 12 20Z', GOLD, GOLD_L, 1.3) + p(DU.starD(15, 33, 5.6), '#fff7b8', GOLD_L, 0.9) +
          `<rect x="24" y="29" width="10" height="8" rx="2" fill="${GOLD}" stroke="${GOLD_L}" stroke-width="1.2"/>` +
          sparkles([[-22, -16, 6, '#fff7b8'], [6, -30, 7.5], [34, -14, 5, '#e2d2ff'], [44, 18, 4, '#fff7b8'], [-30, 22, 4]]) +
          circ(-8, -6, 1.8, '#fff7b8') + circ(22, -40, 1.8, '#e2d2ff') + circ(40, -34, 1.4, '#fff'),
          -6);
      },
    },
    {
      id: 'hd_trophy', slot: 'hand', name: 'גביע', tags: ['sport', 'pop', 'party'], price: 600, color: 'gold', fixed: true,
      draw(R, P) {
        const cup = 'M-25 -68H25C25 -40 14 -22 4 -18L4 -16H-4L-4 -18C-14 -22 -25 -40 -25 -68Z';
        return handG(R, -1,
          `<rect x="-15" y="20" width="30" height="10" rx="2.4" fill="${BROWN}" stroke="${BROWN_L}" stroke-width="1.6"/><rect x="-9" y="22.6" width="18" height="4.6" rx="1.4" fill="${GOLD}" stroke="${GOLD_L}" stroke-width="1"/>` +
          p('M-4 22L4 22L3 -16L-3 -16Z', P.fill, P.line, 1.8) +
          bothS(ln('M25 -60q17 0 15 16q-2 13 -19 15', P.line, 8) + ln('M25 -60q17 0 15 16q-2 13 -19 15', GOLD, 4)) +
          p(cup, P.fill, P.line, 2.3) + ov('M10 -68H25C25 -40 14 -22 4 -18L4 -16H0C12 -30 14 -50 10 -68Z') +
          ell(0, -68, 25, 5.4, '#fff3b0', P.line, 1.8) + HL(-14, -48, 3.4, 13, 8, 0.6) +
          p(DU.starD(1, -44, 10), '#fff', GOLD_L, 1.1, 'fill-opacity=".9"') + sparkles([[-34, -80, 6], [34, -86, 5, '#fff7b8'], [44, -30, 4]]),
          30);
      },
    },
    {
      id: 'hd_popcorn', slot: 'hand', name: 'פופקורן', tags: ['party', 'sleepover', 'pop'], color: '#e0435f',
      draw(R, P, ctx) {
        const box = 'M-19 -24L19 -24L14 26L-14 26Z';
        const kernels = [[-14, -27, 7], [-3, -31, 8], [9, -29, 7.5], [16, -25, 6], [-8, -40, 7.5], [5, -42, 8], [-1, -51, 7], [14, -38, 6], [-17, -36, 5.6]];
        return {
          over: handG(R, -1,
            kernels.map((q) => circ(q[0], q[1], q[2] + 1.3, '#c9a86a')).join('') + kernels.map((q) => circ(q[0], q[1], q[2], '#fff6d8')).join('') +
            kernels.slice(0, 6).map((q) => circ(q[0] - 2, q[1] - 2, 1.8, '#ffe08a')).join('') +
            p(box, '#fffdf8', null) + DU.clip(ctx.id('pc'), box, p('M-13 -30H-5L-4 30H-11ZM3 -30H11L9 30H2Z', P.fill) + p('M-30 -30H-21L-18 30H-30ZM19 -30H30V30H16Z', P.fill) + ov('M8 -30H30V30H8Z')) +
            p(box, 'none', P.line, 2.2) + p('M-21 -27Q-10 -21 0 -27Q10 -21 21 -27L20 -21Q10 -15 0 -21Q-10 -15 -20 -21Z', '#fffdf8', P.line, 1.6) +
            circ(-1, 4, 8.5, '#fffdf8', P.line, 1.4) + p(DU.starD(-1, 4, 5.6), GOLD, GOLD_L, 0.9) +
            fingers(ctx, [[-17, -6], [-16.4, 2], [-15.6, 10]])),
        };
      },
    },
    {
      id: 'hd_bubbles', slot: 'hand', name: 'בועות סבון', tags: ['kawaii', 'nature', 'party', 'beach'], color: '#ff9ac1',
      draw(R, P) {
        const bub = (x, y, r) => circ(x, y, r, '#e6f8ff', '#8fd3f0', 1.4, 'fill-opacity=".5"') + ln(d`M${x - r * 0.62} ${y - r * 0.2}A${r * 0.68} ${r * 0.68} 0 0 1 ${x - r * 0.1} ${y - r * 0.66}`, '#fff', Math.max(1.2, r * 0.18)) +
          circ(x + r * 0.34, y + r * 0.36, r * 0.14, '#fff', null, 0, 'fill-opacity=".9"') + ln(d`M${x + r * 0.2} ${y + r * 0.72}A${r * 0.75} ${r * 0.75} 0 0 0 ${x + r * 0.72} ${y + r * 0.1}`, '#ffb3e0', 1.1, 'stroke-opacity=".7"');
        return handG(R, -1,
          p('M-2.6 22L2.6 22L2.2 -34L-2.2 -34Z', P.fill, P.line, 1.6) + ln('M0 16V-30', '#fff', 1.2, 'stroke-opacity=".5"') +
          circ(0, -47, 12.5, '#dff4ff', null, 0, 'fill-opacity=".55"') + ln(DU.ellD(0, -47, 12.5, 12.5), P.line, 5.6) + ln(DU.ellD(0, -47, 12.5, 12.5), P.fill, 3) +
          bub(14, -78, 9) + bub(40, -64, 5.5) + bub(-4, -106, 13) + bub(36, -108, 8) + bub(62, -90, 4.6) + bub(22, -138, 7) + bub(58, -132, 10) + bub(-22, -140, 4.6) +
          DU.sparkle(74, -112, 4, '#fff'),
          22);
      },
    },
    {
      id: 'hd_sparkler', slot: 'hand', name: 'זיקוק נוצץ', tags: ['party', 'pop', 'magic'], price: 400, color: 'gold', fixed: true,
      draw(R, P) {
        let rays = '', rays2 = '', dots = '';
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2 + 0.2, r1 = 9, r2 = i % 2 ? 26 : 38;
          (i % 2 ? (rays2 += d`M${Math.cos(a) * r1} ${-66 + Math.sin(a) * r1}L${Math.cos(a) * r2} ${-66 + Math.sin(a) * r2}`) : (rays += d`M${Math.cos(a) * r1} ${-66 + Math.sin(a) * r1}L${Math.cos(a) * r2} ${-66 + Math.sin(a) * r2}`));
          dots += circ(Math.cos(a + 0.2) * (r2 + 7), -66 + Math.sin(a + 0.2) * (r2 + 7), i % 2 ? 1.6 : 2.2, i % 3 ? '#fff7b8' : '#ffb3cf');
        }
        return handG(R, -1,
          ln('M0 20V-58', '#6b6480', 3.4) + ln('M0 20V-58', '#b9b4cc', 1.6) +
          circ(0, -66, 24, '#fff7b8', null, 0, 'fill-opacity=".35"') + ln(rays, '#ffb347', 3) + ln(rays, '#fff3a8', 1.5) + ln(rays2, '#ffd24d', 2.2) + dots +
          p(DU.starD(0, -66, 13, 8, 0.42), P.fill, P.line, 1.3) + circ(0, -66, 4.4, '#fff') +
          sparkles([[-34, -100, 6], [38, -96, 5, '#fff7b8'], [44, -44, 4.4], [-42, -52, 4, '#fff7b8'], [6, -116, 4.6]]),
          34);
      },
    },
    {
      id: 'hd_flag', slot: 'hand', name: 'דגלון', tags: ['sport', 'party', 'school'], color: '#ff6f91',
      draw(R, P) {
        const flag = 'M2 -96Q26 -100 46 -88Q58 -82 70 -80Q54 -70 42 -66Q24 -60 2 -58Z';
        return handG(R, -1,
          p('M-2.4 22L2.4 22L2.2 -98L-2.2 -98Z', '#fffaf3', '#a79cc8', 1.6) + circ(0, -102, 4.6, GOLD, GOLD_L, 1.3) +
          p(flag, P.fill, P.line, 2.2) + ov('M2 -76Q30 -72 70 -80Q54 -70 42 -66Q24 -60 2 -58Z') + ln('M8 -90Q28 -92 44 -84', '#fff', 2, 'stroke-opacity=".5"') +
          p(DU.starD(21, -78, 9), '#fff', null, 0, 'fill-opacity=".95"'),
          14);
      },
    },
    {
      id: 'hd_wateringcan', slot: 'hand', name: 'משפך', tags: ['nature', 'cowgirl'], color: '#7de3e0',
      draw(R, P) {
        const body = rrect(-22, 24, 26, 70, 9);
        const drop = (x, y, s = 1) => p(d`M${x} ${y - 6 * s}C${x + 5 * s} ${y} ${x + 4 * s} ${y + 5 * s} ${x} ${y + 5 * s}C${x - 4 * s} ${y + 5 * s} ${x - 5 * s} ${y} ${x} ${y - 6 * s}Z`, '#8fd8ff', '#3f8fc9', 1.1);
        return handG(R, -1,
          ln('M-12 26C-14 -8 18 -8 16 26', P.line, 7.6) + ln('M-12 26C-14 -8 18 -8 16 26', P.fill, 4.2) +
          p('M22 44L54 22L62 32L24 62Z', P.fill, P.line, 2.2) + ell(59, 26, 5, 10, DU.light(P.base, 0.4), P.line, 1.8, 'transform="rotate(-36 59 26)"') +
          circ(60.6, 22.6, 0.9, P.line) + circ(57.6, 26.6, 0.9, P.line) + circ(61.6, 29, 0.9, P.line) +
          p(body, P.fill, P.line, 2.4) + ov('M12 24H17Q26 24 26 33V61Q26 70 17 70H12Z') + ell(2, 25, 21, 4, DU.light(P.base, 0.5), P.line, 1.6) +
          DU.flower(1, 49, 9, '#ffffff', '#ffd24d') + HL(-15, 44, 2.6, 11, 0, 0.5) +
          drop(70, 44) + drop(78, 60, 0.85) + drop(66, 68, 0.75));
      },
    },
    {
      id: 'hd_shopping', slot: 'hand', name: 'שקיות קניות', tags: ['paris', 'pop', 'party'], color: '#ff9ac1',
      draw(R, P, ctx) {
        const b2 = 'M6 30L44 30L48 84L10 84Z', b1 = 'M-24 34L18 34L23 92L-29 92Z';
        return handG(R, -1,
          ln('M14 30C14 8 36 8 36 30', '#8a8fa8', 2) +
          p('M10 30l5 -9l5 7l5 -8l5 8l5 -7l4 9Z', '#fff7b8', '#c9a84a', 1.2) +
          p(b2, '#fffdf8', '#a79cc8', 2) + DU.clip(ctx.id('sb'), b2, ln('M0 40H60M0 52H60M0 64H60M0 76H60', '#b48cff', 5, 'stroke-opacity=".8"') + ov('M36 20H60V90H36Z')) + p(b2, 'none', '#7b5bd6', 2) +
          ln('M-14 34C-14 6 8 6 8 34', P.line, 4.4) + ln('M-14 34C-14 6 8 6 8 34', '#fffdf8', 2) +
          p('M-20 34l5 -10l6 8l6 -9l6 9l6 -8l5 10Z', '#ffffff', '#d9b8c6', 1.2) +
          p(b1, P.fill, P.line, 2.3) + ov('M8 34H18L23 92H10Z') + ln('M-24 42H18.6', P.line, 1.2, 'stroke-opacity=".4"') +
          p(DU.heartD(-3, 62, 12), '#fff', null, 0, 'fill-opacity=".92"') + DU.bow(-3, 38, 7, '#fff', P.line));
      },
    },
    {
      id: 'hd_flashlight', slot: 'hand', name: 'פנס', tags: ['sleepover', 'space', 'nature'], color: '#5cc8ff',
      draw(R, P) {
        return handG(R, -1,
          p('M-13 -47L-46 -132Q0 -148 46 -132L13 -47Z', '#fff6a8', null, 0, 'fill-opacity=".34"') + p('M-9 -47L-24 -124Q0 -132 24 -124L9 -47Z', '#ffffff', null, 0, 'fill-opacity=".32"') +
          p(rrect(-7.5, -30, 7.5, 24, 4), P.fill, P.line, 2.2) + ov('M2 -30H4Q7.5 -30 7.5 -26V20Q7.5 24 4 24H2Z') +
          `<rect x="-3.4" y="-14" width="6.8" height="11" rx="3" fill="#fffdf8" stroke="${P.line}" stroke-width="1.2"/>` + ln('M-7.5 12H7.5M-7.5 17H7.5', P.line, 1.1, 'stroke-opacity=".45"') +
          p('M-7.5 -30L-13.5 -44H13.5L7.5 -30Z', SILVER, SILVER_L, 2) + ell(0, -45, 13.5, 4.4, '#fff6a8', SILVER_L, 1.8) +
          sparkles([[-30, -104, 4.4], [26, -84, 3.6, '#fff7b8'], [4, -122, 4]]),
          42);
      },
    },
    {
      id: 'hd_candyfloss', slot: 'hand', name: 'שערות סבתא', tags: ['party', 'kawaii', 'retro'], color: '#ff9ac1',
      draw(R, P) {
        const puffs = [[-15, -52, 17], [14, -50, 18], [-20, -72, 16], [19, -74, 17], [0, -90, 16], [0, -64, 22]];
        const lt = DU.light(P.base, 0.5);
        return handG(R, -1,
          p('M-3.4 22L3.4 22L1.8 -40L-1.8 -40Z', '#fffaf3', '#a79cc8', 1.6) + ln('M-3 14l6 -4M-2.6 2l5.2 -4M-2.2 -10l4.4 -4', '#ff9ac1', 1.6) +
          puffs.map((q) => circ(q[0], q[1], q[2] + 2.3, P.line)).join('') + puffs.map((q) => circ(q[0], q[1], q[2], P.fill)).join('') +
          ln('M-22 -58q8 -10 18 -4M4 -52q10 -8 20 0M-14 -82q8 -8 16 -2M8 -78q8 -6 16 2M-6 -66q8 -6 14 0M-4 -98q6 -4 10 0', lt, 2.6) +
          HL(-22, -76, 4, 8, 20, 0.5) + sparkles([[30, -98, 5], [-34, -52, 4]]),
          14);
      },
    },
    {
      id: 'hd_balletshoes', slot: 'hand', name: 'נעלי בלט', tags: ['ballet'], color: '#ffb3cf',
      draw(R, P) {
        const shoe = p('M-8.6 -22C-12 -8 -11 18 -6.4 31L5.4 31C9.6 18 9.6 -8 7 -22Z', P.fill, P.line, 2.1) +
          ov('M3.4 -22H7C9.6 -8 9.6 18 5.4 31H1C5 16 5.4 -4 3.4 -22Z') + ell(-0.8, -21, 7.8, 4.2, DU.dark(P.base, 0.34), P.line, 1.6) +
          p('M-6.4 31Q-0.5 35.4 5.4 31L5 27H-6Z', DU.light(P.base, 0.45), P.line, 1.4) +
          ln('M-10 -8L8.4 2M9 -8L-9.6 2', DU.light(P.base, 0.5), 3) + ln('M-10 -8L8.4 2M9 -8L-9.6 2', P.line, 0.9, 'stroke-opacity=".5"') + HL(-4.6, 14, 2, 8, -4, 0.5);
        return handG(R, -1,
          ln('M-2 6C-12 20 -16 30 -15 46M3 6C12 22 17 36 16 54', P.line, 4.2) + ln('M-2 6C-12 20 -16 30 -15 46M3 6C12 22 17 36 16 54', DU.light(P.base, 0.35), 2.2) +
          `<g transform="translate(-14 66) rotate(9)">${shoe}</g><g transform="translate(16 74) rotate(-11)">${shoe}</g>` +
          DU.bow(0, 12, 8, DU.light(P.base, 0.3), P.line, true) + DU.sparkle(34, 44, 4.4, '#fff'));
      },
    },
    {
      id: 'hd_coconut', slot: 'hand', name: 'קוקוס טרופי', tags: ['hawaii', 'beach'], color: '#ff6f91',
      draw(R, P, ctx) {
        return {
          over: handG(R, -1,
            rot(18, 10, -12, ln('M10 -10V-56', P.line, 7) + ln('M10 -10V-56', P.fill, 4) + ln('M8 -20l4 -3M8 -32l4 -3M8 -44l4 -3', '#fff', 1.6)) +
            rot(-22, -6, -12, ln('M-6 -10V-46', BROWN_L, 2.2) +
              p('M-6 -48C-20 -48 -28 -40 -28 -34L-6 -38L16 -34C16 -40 8 -48 -6 -48Z', '#ffd24d', GOLD_L, 1.5) + p('M-6 -48C-12 -46 -14 -40 -14 -36.4L-6 -38L2 -36.4C2 -40 0 -46 -6 -48Z', '#ff9ac1')) +
            ell(2, 6, 24, 22, '#9a6a44', '#5a3a22', 2.3) + ov('M14 -12C26 -2 26 18 12 26C20 14 20 0 14 -12Z') +
            ln('M-16 -2q4 6 2 14M-8 12q5 4 4 12M12 4q4 6 1 14M-2 -2q3 4 2 8', '#5a3a22', 1.4, 'stroke-opacity=".55"') +
            ell(2, -11, 19, 6.4, '#fffaf0', '#5a3a22', 1.8) + ell(2, -10, 13, 3.6, '#dff4ff') +
            DU.flower(-9, 8, 7.5, '#ff6f91', '#ffd24d') +
            fingers(ctx, [[-21, 2], [-20, 10], [-17.6, 17.4]])),
        };
      },
    },
    {
      id: 'hd_pencil', slot: 'hand', name: 'עיפרון ענק', tags: ['school', 'british'], color: '#ffd24d',
      draw(R, P) {
        return handG(R, -1,
          p(rrect(-7.5, 34, 7.5, 47, 4), '#ff9ac1', '#a8305f', 1.8) + `<rect x="-7.5" y="26" width="15" height="9" fill="${SILVER}" stroke="${SILVER_L}" stroke-width="1.5"/>` + ln('M-7.5 29H7.5M-7.5 32H7.5', SILVER_L, 1) +
          p('M-7.5 26L7.5 26L7.5 -84L-7.5 -84Z', P.fill, P.line, 2.1) + p('M-2.6 26H2.6V-84H-2.6Z', DU.light(P.base, 0.4)) + ov('M4 26H7.5V-84H4Z') +
          p('M-7.5 -84L7.5 -84L0 -108Z', '#f3d2a0', WOOD_L, 1.8) + p('M-2.6 -99.6L2.6 -99.6L0 -108Z', DARK) + ln('M-7.5 -84q2.5 4 5 0t5 0t5 0', WOOD_L, 1.2) +
          p(DU.heartD(0, -34, 4.6), '#fff', null, 0, 'fill-opacity=".8"') + p(DU.starD(0, -58, 4.6), '#fff', null, 0, 'fill-opacity=".8"'),
          14);
      },
    },
    {
      id: 'hd_mirror', slot: 'hand', name: 'מראה קסומה', tags: ['princess', 'magic'], color: '#ff9ac1',
      draw(R, P) {
        let beads = '';
        for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; beads += circ(Math.cos(a) * 29.5, -62 + Math.sin(a) * 29.5, 4.6, P.fill, P.line, 1.3); }
        return handG(R, -1,
          p(rrect(-5, -32, 5, 24, 5), P.fill, P.line, 2.1) + ov('M1 -32H5V20Q5 24 1 24Z') + beads +
          circ(0, -62, 28, P.fill, P.line, 2.2) + circ(0, -62, 21.5, '#dff4ff', P.line, 1.6) +
          ln('M-12 -70L2 -80M-12 -58L10 -74', '#fff', 3.4, 'stroke-opacity=".85"') + circ(9, -52, 2.4, '#fff', null, 0, 'fill-opacity=".7"') +
          p(DU.heartD(0, -31, 7), GOLD, GOLD_L, 1.2) + sparkles([[30, -92, 6], [-36, -44, 4.4, '#fff7b8']]),
          18);
      },
    },
    {
      id: 'hd_dango', slot: 'hand', name: 'דנגו מתוק', tags: ['anime', 'kawaii'], color: '#ffb3cf', fixed: true,
      draw(R) {
        const ball = (y, c) => circ(0, y, 12.5, c, DU.line(c), 2) + ov(d`M6 ${y - 11}A12.5 12.5 0 0 1 -4 ${y + 12}A16 16 0 0 0 6 ${y - 11}Z`) + HL(-5, y - 5, 3.4, 2.4, -30, 0.75);
        return handG(R, -1,
          p('M-1.6 24L1.6 24L1.2 -86L-1.2 -86Z', WOOD, WOOD_L, 1.4) +
          ball(-28, '#b9e28c') + ball(-52, '#fffaf0') + ball(-76, '#ffb3cf') +
          circ(-4, -53, 1.4, EYE) + circ(4, -53, 1.4, EYE) + ln('M-2.4 -49.4q2.4 2.4 4.8 0', EYE, 1.2) +
          ell(-7.6, -49.6, 2.2, 1.4, '#ff7f9c', null, 0, 'fill-opacity=".6"') + ell(7.6, -49.6, 2.2, 1.4, '#ff7f9c', null, 0, 'fill-opacity=".6"') +
          DU.sparkle(18, -84, 4, '#fff'),
          20);
      },
    },
    {
      id: 'hd_umbrella', slot: 'hand', name: 'מטרייה סגורה', tags: ['british', 'paris', 'winter'], color: '#e0435f',
      draw(R, P, ctx) {
        const fab = 'M-9 -2Q-12 54 0 90Q12 54 9 -2Z';
        return handG(R, -1,
          ln('M0 -4V-24q0 -10 -10 -10q-9 0 -9 9', BROWN_L, 7.4) + ln('M0 -4V-24q0 -10 -10 -10q-9 0 -9 9', '#c98e5a', 4.2) +
          p('M-2 88L2 88L1 104L-1 104Z', SILVER, SILVER_L, 1.4) +
          p(fab, P.fill, P.line, 2.2) + DU.clip(ctx.id('um'), fab, ov('M2 -6H14V100H2Z') + ln('M-4 0Q-6 52 0 88M4 0Q6 52 0 88', P.line, 1.2, 'stroke-opacity=".45"')) +
          p('M-10 28Q0 33 10 28L10 36Q0 41 -10 36Z', DU.light(P.base, 0.35), P.line, 1.5) + circ(0, 34.5, 2.6, GOLD, GOLD_L, 1) +
          p('M-9 -2Q0 3 9 -2L8 4Q0 8 -8 4Z', DU.dark(P.base, 0.2), P.line, 1.4),
          -5);
      },
    },
  ];
  /* ================================================================== NEXT TO HER */
  /* the sitting-pet body all the small animals share */
  const sitBody = (F, L, w = 38, h = 80) => p(d`M${-w} 0C${-w - 8} ${-h * 0.42} ${-w * 0.8} ${-h * 0.97} 0 ${-h}C${w * 0.8} ${-h * 0.97} ${w + 8} ${-h * 0.42} ${w} 0Z`, F, L, 2.6);
  const frontLegs = (F, L, toe) => bothS(p('M-17 -2C-19 -24 -15 -44 -9.6 -46C-4 -44 -3 -22 -4 -2Z', F, L, 2.2) + (toe ? ln('M-12.6 -3v-5M-8.4 -3v-5', L, 1.2, 'stroke-opacity=".6"') : ''));
  const backPaws = (F, L) => bothS(ell(27, -5, 13, 8, F, L, 2.2) + ln('M23 -3v-5M29 -3v-5', L, 1.2, 'stroke-opacity=".6"'));
  const collar = (c, tag) => p('M-24 -77Q0 -66 24 -77L24 -70Q0 -58 -24 -70Z', c, DU.line(c), 1.6) + tag;

  const sides = [
    {
      id: 'sd_cat', slot: 'side', name: 'חתלתול', tags: ['kawaii', 'anime', 'sleepover', 'paris'], color: '#ffc27a',
      draw(R, P) {
        const F = P.fill, L = P.line, lt = DU.light(P.base, 0.62), dk = DU.dark(P.base, 0.22);
        return sideG(R, shadow(54) +
          fat('M30 -14C64 -10 76 -42 60 -64C54 -73 44 -70 47 -60', F, L, 12) + ln('M61 -62C55 -72 44 -70 47 -60', lt, 12) +
          sitBody(F, L) + ell(0, -30, 21, 27, lt) + backPaws(F, L) + frontLegs(F, L, true) +
          bothS(p('M-45 -126L-41 -172L-12 -148Z', F, L, 2.6) + p('M-39.6 -136L-37.6 -160L-21 -146Z', '#ffb3c7')) +
          ell(0, -112, 50, 43, F, L, 2.6) + ln('M-9 -151v10M0 -154v12M9 -151v10', dk, 3.4) + bothS(ln('M-49 -112h9M-48 -102h7', dk, 3)) +
          ell(0, -94, 20, 13, lt) +
          peye(-20, -113, 11) + peye(20, -113, 11) +
          p('M-4.4 -100.6L4.4 -100.6L0 -95Z', '#ff8fa5', '#b05a6e', 1) + ln('M0 -95v3M-7.4 -89.6q3.7 4.4 7.4 -2.4q3.7 6.8 7.4 2.4', '#8a4a5a', 1.8) +
          bothS(ln('M30 -98l19 -4M30 -93l18 3', '#ffffff', 1.5, 'stroke-opacity=".85"')) + pblush(-34, -98) + pblush(34, -98) +
          collar('#ff6f91', circ(0, -61, 6.6, GOLD, GOLD_L, 1.4) + ln('M-4 -61h8M0 -61v5', GOLD_L, 1.1)));
      },
    },
    {
      id: 'sd_dog', slot: 'side', name: 'כלבלב', tags: ['nature', 'cowgirl', 'british', 'sport', 'school'], color: '#e8b878',
      draw(R, P) {
        const F = P.fill, L = P.line, dk = DU.dark(P.base, 0.3), W = '#fffaf3';
        const ear = p('M38 -140C62 -136 68 -102 58 -80C52 -68 40 -74 38 -90C36 -106 32 -124 38 -140Z', dk, L, 2.4);
        return sideG(R, shadow(56) +
          fat('M32 -30C54 -40 64 -58 60 -76', F, L, 11) + ln('M70 -58q7 -7 4 -17M76 -48q8 -6 8 -16', L, 1.6, 'stroke-opacity=".45"') +
          sitBody(F, L, 40, 78) + p('M-19 -72Q0 -44 19 -72Q22 -30 0 -20Q-22 -30 -19 -72Z', W) + backPaws(F, L) + frontLegs(F, L, true) +
          ell(0, -112, 48, 42, F, L, 2.6) + ell(19, -117, 15, 16, dk) + ell(0, -97, 25, 18, W) +
          bothS(ear) + bothS(ell(19, -134, 4.2, 2.6, DU.light(P.base, 0.6))) +
          peye(-19, -117, 10) + peye(19, -117, 10) +
          ell(0, -104, 7.4, 5.4, '#3a2a3a') + HL(-2, -105.6, 2.2, 1.3, 0, 0.7) +
          ln('M0 -98.6V-93M-9 -92Q-4.5 -87.6 0 -93Q4.5 -87.6 9 -92', '#5a3a3a', 1.8) + p('M-4.4 -90.6Q-5.4 -79 0 -78Q5.4 -79 4.4 -90.6Z', '#ff8fa5', '#b05a6e', 1.2) + ln('M0 -89v6', '#b05a6e', 1) +
          pblush(-33, -98) + pblush(33, -98) +
          collar('#5cc8ff', p(DU.starD(0, -60, 7.4), GOLD, GOLD_L, 1.2)));
      },
    },
    {
      id: 'sd_bunny', slot: 'side', name: 'ארנבון', tags: ['kawaii', 'nature', 'magic', 'ballet'], color: '#fffaf5',
      draw(R, P) {
        const F = P.fill, L = P.line, PK = '#ffc1d4';
        return sideG(R, shadow(50) +
          circ(35, -17, 11.5, '#ffffff', L, 2.2) +
          p('M-31 -138C-41 -190 -35 -228 -22 -230C-9 -228 -7 -188 -9 -140Z', F, L, 2.6) + p('M-26 -148C-32 -186 -29 -214 -22 -216C-15 -214 -14 -186 -15.6 -148Z', PK) +
          p('M9 -140C7 -180 13 -206 26 -214C40 -219 57 -206 61 -190C50 -197 38 -193 34 -180C30 -166 32 -152 30 -138Z', F, L, 2.6) + p('M14.6 -148C14 -178 18 -198 27 -204C34 -207 42 -203 46 -198C38 -198 31 -192 28 -180C25.6 -168 26 -158 25 -148Z', PK) +
          sitBody(F, L, 34, 68) + bothS(ell(22, -5, 17, 8, F, L, 2.2) + ell(24, -4, 7, 3.4, PK)) +
          // the carrot she is saving for later
          p('M-9 -48Q0 -52 9 -48L1.4 -12Q0 -9 -1.4 -12Z', '#ff9a56', '#b8642a', 1.8) + ln('M-4.6 -40h6M-2 -31h5M-2.6 -22h4', '#b8642a', 1.2, 'stroke-opacity=".6"') +
          p('M0 -49C-8 -62 -14 -58 -11 -51ZM0 -49C0 -66 8 -64 5 -51ZM0 -49C10 -60 15 -54 9 -49Z', LEAF, LEAF_L, 1.4) +
          bothS(ell(10.6, -35, 7, 8.4, F, L, 2)) +
          ell(0, -104, 46, 42, F, L, 2.6) +
          peye(-19, -107, 10.5) + peye(19, -107, 10.5) +
          p(DU.heartD(0, -93, 4.6), '#ff8fa5', '#b05a6e', 1) + ln('M0 -88.6v3.4M-6.4 -82.6q3.2 3.6 6.4 -2.6q3.2 6.2 6.4 2.6', '#8a4a5a', 1.8) +
          pblush(-33, -93) + pblush(33, -93) + DU.bow(-22, -142, 11, '#ff9ac1', DU.line('#ff9ac1')));
      },
    },
    {
      id: 'sd_fox', slot: 'side', name: 'שועלון', tags: ['anime', 'nature', 'winter', 'magic'], color: '#ff9a56', fixed: true,
      draw(R) {
        const F = '#ff9a56', L = DU.line(F), W = '#fffaf3', DK = '#5a3a35';
        const tail = 'M26 -8C72 -4 94 -44 80 -86C76 -98 63 -100 61 -88C63 -62 51 -44 28 -36Z';
        return sideG(R, shadow(56) +
          p(tail, F, L, 2.6) + p('M80 -86C76 -98 63 -100 61 -88C62.6 -76 61 -66 57 -58C70 -58 83 -70 80 -86Z', W) + ln(tail, L, 2.6) +
          sitBody(F, L, 34, 72) + p('M-17 -66Q0 -40 17 -66Q20 -26 0 -18Q-20 -26 -17 -66Z', W) + backPaws(F, L) + frontLegs(F, L) +
          bothS(p('M-17 -2C-18 -12 -17.4 -18 -16.4 -21L-4.8 -21C-4 -14 -4 -8 -4 -2Z', DK)) +
          bothS(p('M-46 -128L-42 -180L-12 -146Z', F, L, 2.6) + p('M-44.6 -160L-42 -180L-30 -166Z', DK) + p('M-39.4 -136L-38.4 -156L-22 -146Z', '#ffe9d9')) +
          p('M0 -150C30 -150 48 -132 50 -112C58 -104 60 -96 56 -92C40 -76 20 -68 0 -68C-20 -68 -40 -76 -56 -92C-60 -96 -58 -104 -50 -112C-48 -132 -30 -150 0 -150Z', F, L, 2.6) +
          p('M-55 -92.6C-40 -77 -20 -69.4 0 -69.4C20 -69.4 40 -77 55 -92.6C44 -98 30 -100 20 -109C10 -100 0 -94 0 -94C0 -94 -10 -100 -20 -109C-30 -100 -44 -98 -55 -92.6Z', W) +
          peye(-20, -114, 10) + peye(20, -114, 10) + bothS(ln('M30 -122l6 -4', EYE, 1.8)) +
          ell(0, -91, 5.4, 3.8, DK) + ln('M0 -87.4v3M-6 -82q3 3.4 6 -2.4q3 5.8 6 2.4', DK, 1.7) +
          pblush(-36, -100) + pblush(36, -100));
      },
    },
    {
      id: 'sd_hamster', slot: 'side', name: 'אוגר', tags: ['kawaii', 'school', 'sleepover'], color: '#f2b06a',
      draw(R, P, ctx) {
        const C = '#fffaf3', L = DU.line('#e8c9a0'), body = 'M-46 0C-60 -32 -50 -90 0 -96C50 -90 60 -32 46 0C30 4 -30 4 -46 0Z', PW = '#ffd9c9';
        return sideG(R, shadow(52) +
          bothS(circ(35, -89, 12, P.fill, L, 2.2) + circ(35, -88, 6.4, '#ffb3c7')) +
          p(body, C, L, 2.6) +
          DU.clip(ctx.id('hm'), body, p('M-64 -44C-58 -90 -30 -104 0 -104C30 -104 58 -90 64 -44C44 -58 20 -62 0 -52C-20 -62 -44 -58 -64 -44Z', P.fill)) + p(body, 'none', L, 2.6) +
          bothS(ell(21, -3, 11, 5.4, PW, L, 1.6)) +
          peye(-18, -62, 8.6) + peye(18, -62, 8.6) +
          ell(-33, -46, 12, 8, '#ff7f9c', null, 0, 'fill-opacity=".42"') + ell(33, -46, 12, 8, '#ff7f9c', null, 0, 'fill-opacity=".42"') +
          p('M-3 -53.6L3 -53.6L0 -50Z', '#ff8fa5', '#b05a6e', 0.9) + ln('M0 -50v2.4M-5 -45.6q2.5 3 5 -2q2.5 5 5 2', '#8a4a5a', 1.6) +
          p('M0 -40C7 -33 7 -21 0 -15C-7 -21 -7 -33 0 -40Z', '#4a3a3a', '#2a2020', 1.2) + ln('M0 -37V-18', '#fff', 1.6, 'stroke-opacity=".8"') +
          bothS(ell(9.6, -26, 6, 5, PW, L, 1.5)));
      },
    },
    {
      id: 'sd_penguin', slot: 'side', name: 'פינגווין', tags: ['winter', 'kawaii'], color: '#ff6f91',
      draw(R, P) {
        const N = '#3d4d75', NL = DU.line(N), O = '#ffb347', OL = '#b8742a';
        return sideG(R, shadow(50) +
          bothS(ell(17, -2, 15, 6.4, O, OL, 1.8)) +
          p('M-46 -86C-66 -74 -70 -46 -58 -32C-52 -44 -47 -60 -44 -72Z', N, NL, 2.4) + p('M46 -90C70 -92 80 -112 74 -126C64 -116 54 -108 44 -104Z', N, NL, 2.4) +
          p('M-42 -6C-54 -52 -46 -124 0 -132C46 -124 54 -52 42 -6C30 1 -30 1 -42 -6Z', N, NL, 2.6) +
          p('M-28 -8C-37 -44 -33 -78 -23 -93C-32 -106 -23 -119 -10 -115C-4 -113 0 -106 0 -106C0 -106 4 -113 10 -115C23 -119 32 -106 23 -93C33 -78 37 -44 28 -8C16 -2 -16 -2 -28 -8Z', '#fffdf8') +
          peye(-13, -100, 8) + peye(13, -100, 8) +
          p('M-7.6 -89Q0 -94 7.6 -89Q0 -78 -7.6 -89Z', O, OL, 1.4) + pblush(-24, -86, 6.4, 3.8) + pblush(24, -86, 6.4, 3.8) +
          p('M20 -64L33 -67L38 -30L25 -27Z', P.fill, P.line, 2) + ln('M26 -36l11 -2', DU.light(P.base, 0.5), 3) + ln('M26.6 -28v6M30.6 -29v6M34.6 -30v6', P.line, 1.6) +
          p('M-38 -77Q0 -64 38 -77L39 -64Q0 -51 -39 -64Z', P.fill, P.line, 2) + ln('M-22 -71l-2 12M-6 -67l-1 12M10 -67l1 12M26 -72l2 12', DU.light(P.base, 0.5), 3));
      },
    },
    {
      id: 'sd_owl', slot: 'side', name: 'ינשוף חכם', tags: ['magic', 'school', 'british', 'nature'], color: '#b48cff',
      draw(R, P) {
        const F = P.fill, L = P.line, lt = DU.light(P.base, 0.6), dk = DU.dark(P.base, 0.22), O = '#ffb347', OL = '#b8742a';
        return sideG(R, shadow(52) +
          p(rrect(-46, -19, 46, 0, 3.6), '#e0435f', '#8c1f38', 2) + `<rect x="-40" y="-15" width="80" height="11" fill="#fffaf0"/>` + ln('M-40 -11.4H40M-40 -7.6H40', '#d9cdb8', 1) + p('M-46 -19H-34V0H-42.4Q-46 0 -46 -3.6Z', '#e0435f', '#8c1f38', 2) +
          p(rrect(-38, -36, 42, -19, 3.6), '#5cc8ff', '#2f7fb5', 2) + `<rect x="-32" y="-32" width="68" height="9.6" fill="#fffaf0"/>` + ln('M-32 -27.2H36', '#d9cdb8', 1) + p('M30 -36H38.4Q42 -36 42 -32.4V-19H30Z', '#5cc8ff', '#2f7fb5', 2) +
          bothS(p('M-37 -124L-42 -156L-15 -140Z', F, L, 2.4)) +
          p('M-40 -40C-52 -84 -46 -138 0 -144C46 -138 52 -84 40 -40C28 -32 -28 -32 -40 -40Z', F, L, 2.6) +
          ell(0, -70, 27, 31, lt) + ln('M-13 -82q4.4 5.4 8.8 0M4.2 -82q4.4 5.4 8.8 0M-4.4 -68q4.4 5.4 8.8 0M-15 -55q4.4 5.4 8.8 0M6.2 -55q4.4 5.4 8.8 0', dk, 1.7) +
          bothS(p('M43 -102C58 -84 56 -58 46 -45C40 -58 37 -78 39 -96Z', dk, L, 2.2)) +
          circ(-19, -110, 20, '#fffaf3', L, 1.8) + circ(19, -110, 20, '#fffaf3', L, 1.8) +
          peye(-19, -110, 12) + peye(19, -110, 12) + p('M-5.4 -99L5.4 -99L0 -88Z', O, OL, 1.3) + pblush(-36, -92, 6, 3.6) + pblush(36, -92, 6, 3.6) +
          ln('M-15 -40v5M-9.6 -40v5M9.6 -40v5M15 -40v5', O, 3.2) +
          p('M-25 -150L0 -161L25 -150L0 -139Z', DARK, '#1f1a2b', 1.6) + ln('M19 -150V-134', GOLD, 2) + circ(19, -132, 3, GOLD, GOLD_L, 1));
      },
    },
    {
      id: 'sd_unicorn', slot: 'side', name: 'חד־קרן קטן', tags: ['magic', 'princess', 'kawaii'], price: 900, color: '#ffffff', fixed: true,
      draw(R) {
        const W = '#fffdfb', L = '#b6a3cc', M = ['#ff9ac1', '#ffd24d', '#8bdc7a', '#7de3e0', '#b48cff'];
        const lock = (dd, c) => p(dd, c, DU.line(c), 1.8);
        return sideG(R, shadow(56) +
          lock('M28 -12C68 -8 90 -46 72 -84C63 -66 58 -50 30 -42Z', M[4]) + ln('M36 -24C58 -24 70 -42 68 -64', M[0], 5) + ln('M34 -34C50 -36 60 -48 62 -62', M[1], 3.6) +
          sitBody(W, L, 36, 74) + bothS(ell(27, -5, 13, 8, W, L, 2.2) + p('M17 -2.4Q27 -11 37 -2.4Q27 3.6 17 -2.4Z', '#ffb3d1')) +
          frontLegs(W, L) + bothS(p('M-17 -2C-17.6 -8 -17 -12 -16.4 -15L-4.6 -15C-4 -10 -4 -6 -4 -2Z', '#ffb3d1', '#c9789a', 1.4)) +
          lock('M30 -150C54 -140 64 -108 55 -76C46 -92 40 -112 22 -142Z', M[4]) + lock('M20 -155C42 -151 54 -130 51 -106C42 -122 32 -136 14 -146Z', M[3]) +
          bothS(p('M-41 -134L-39 -170L-18 -150Z', W, L, 2.4) + p('M-37 -140L-36 -158L-25 -148Z', '#ffc1d9')) +
          ell(0, -112, 46, 42, W, L, 2.6) + ell(0, -91, 25, 15.6, '#ffe3ee') + circ(-7.4, -91, 1.9, '#d98aa8') + circ(7.4, -91, 1.9, '#d98aa8') + ln('M-8.6 -84q8.6 5.4 17.2 0', '#b05a7e', 1.7) +
          p('M-9.6 -148L0 -204L9.6 -148Z', GOLD, GOLD_L, 2) + ln('M-7.6 -160l13.6 -5.4M-5.4 -173l10 -4M-3.2 -186l6 -2.6', GOLD_L, 1.6) +
          lock('M-30 -152C-41 -131 -53 -121 -51 -96C-41 -104 -32 -118 -23 -141Z', M[0]) + lock('M-15 -158C-27 -146 -37 -133 -35 -112C-25 -122 -16 -135 -7 -150Z', M[1]) + lock('M0 -156C-9 -147 -16 -138 -15 -124C-8 -131 -1 -140 7 -149Z', M[2]) +
          peye(-19, -117, 10.5, '#5a3a8a') + peye(19, -117, 10.5, '#5a3a8a') + bothS(ln('M29 -124l6 -3.4M30.6 -118l6.4 -1', EYE, 1.6)) +
          pblush(-33, -103) + pblush(33, -103) + p(DU.starD(-34, -92, 4.4), '#ffd24d') +
          sparkles([[-66, -168, 7], [70, -160, 6, '#fff7b8'], [62, -24, 4.6], [-60, -40, 4.6, '#ffd9ec'], [40, -196, 4.4]]));
      },
    },
    {
      id: 'sd_dragon', slot: 'side', name: 'דרקון קטן', tags: ['magic', 'pirate', 'space'], price: 800, color: '#7fdcb0', fixed: true,
      draw(R) {
        const G = '#7fdcb0', L = DU.line(G), B = '#fff3c4', S = '#ff9a56', SL = DU.line(S), WG = '#b48cff', WL = DU.line(WG);
        const wing = p('M-30 -66C-60 -100 -86 -98 -94 -74C-82 -78 -76 -70 -74 -60C-64 -66 -56 -60 -54 -50C-46 -56 -38 -54 -32 -46Z', WG, WL, 2.4) + ln('M-32 -64C-52 -84 -70 -88 -90 -76M-34 -58C-50 -70 -62 -70 -72 -62', WL, 1.4, 'stroke-opacity=".55"');
        return sideG(R, shadow(58) +
          bothS(wing) +
          fat('M28 -12C58 -8 78 -26 74 -52', G, L, 13) + p('M74 -52L61 -63L76 -82L89 -62Z', S, SL, 2) +
          sitBody(G, L, 38, 76) + p('M-21 -4C-27 -30 -19 -62 0 -64C19 -62 27 -30 21 -4Z', B) + ln('M-19 -18H19M-21.6 -32H21.6M-19 -46H19', '#e3c878', 1.7) +
          bothS(ell(27, -5, 14, 8, G, L, 2.2) + p('M17 -3l2.6 -6l2.6 6ZM24 -2l2.6 -6l2.6 6ZM31 -3l2.6 -6l2.6 6Z', '#fffdf8')) +
          bothS(p('M-35 -52C-46 -46 -46 -32 -37 -28C-30 -30 -28 -40 -30 -50Z', G, L, 2.2)) +
          bothS(p('M-46 -120L-68 -131L-51 -103Z', G, L, 2.2) + p('M-28 -144L-35 -174L-15 -151Z', B, '#b8a25a', 2)) +
          p('M-9 -150L0 -168L9 -150Z', S, SL, 1.8) +
          ell(0, -112, 48, 40, G, L, 2.6) + ell(0, -95, 27, 16, DU.light(G, 0.4)) + circ(-8, -98, 2, '#3a7a5c') + circ(8, -98, 2, '#3a7a5c') +
          peye(-20, -118, 10.5) + peye(20, -118, 10.5) +
          ln('M-13 -88Q0 -79 13 -88', '#3a7a5c', 2) + p('M6 -85.6l3 6.4l3 -8Z', '#fffdf8', '#3a7a5c', 0.8) +
          pblush(-36, -102) + pblush(36, -102) +
          p('M46 -96C55 -105 53 -117 48 -122C58 -120 67 -108 62 -95C59 -88 50 -88 46 -96Z', '#ffb347', '#c9541e', 1.4) + p('M51 -96C55 -100 55 -106 53 -110C58 -107 61 -101 58 -96C56 -93 53 -93 51 -96Z', '#fff3a8') +
          sparkles([[-70, -150, 5], [72, -150, 4.6, '#fff7b8']]));
      },
    },
    {
      id: 'sd_suitcase', slot: 'side', name: 'מזוודה', tags: ['paris', 'british', 'hawaii', 'beach'], color: '#ff9ac1',
      draw(R, P) {
        const body = rrect(-46, -152, 46, -12, 14), lt = DU.light(P.base, 0.45);
        return sideG(R, shadow(54) +
          ln('M-17 -150V-200H17V-150', SILVER_L, 7) + ln('M-17 -150V-200H17V-150', SILVER, 3.6) + p(rrect(-21, -207, 21, -194, 5.4), DARK, '#1f1a2b', 1.6) +
          bothS(circ(30, -7, 8.6, DARK, '#1f1a2b', 1.4) + circ(30, -7, 3.2, SILVER)) +
          p(body, P.fill, P.line, 2.6) + ov('M26 -152H32Q46 -152 46 -138V-26Q46 -12 32 -12H26Z') +
          ln('M-24 -148V-16M0 -148V-16M24 -148V-16', P.line, 1.5, 'stroke-opacity=".3"') +
          `<rect x="-46" y="-96" width="92" height="14" fill="${lt}"/>` + ln('M-46 -96H46M-46 -82H46', P.line, 1.3, 'stroke-opacity=".45"') +
          `<rect x="-9" y="-99" width="18" height="20" rx="3" fill="${GOLD}" stroke="${GOLD_L}" stroke-width="1.5"/><rect x="-4" y="-93" width="8" height="8" rx="1.6" fill="#fff7b8"/>` +
          p(DU.heartD(-23, -122, 9.6), '#e0435f', '#8c1f38', 1.2) + p(DU.starD(23, -50, 10.6), GOLD, GOLD_L, 1.2) + DU.flower(22, -124, 8.6, '#ffffff', '#ffd24d') +
          circ(-22, -50, 10, '#7de3e0', '#2f8f8c', 1.3) + ln('M-27 -50h10M-22 -55v10', '#fff', 1.8) + HL(-37, -132, 3, 12, 0, 0.45) +
          p('M17 -152l14 16l-7 7l-14 -16Z', '#fff6c2', '#b89a3a', 1.3) + circ(19.6, -146.4, 1.6, DARK));
      },
    },
    {
      id: 'sd_scooter', slot: 'side', name: 'קורקינט', tags: ['sport', 'retro', 'school'], color: '#5cc8ff',
      draw(R, P) {
        const wheel = (x) => circ(x, -15, 15, DARK, '#1f1a2b', 1.6) + circ(x, -15, 8.6, '#fff6c2', '#b89a3a', 1.3) + circ(x, -15, 2.6, DARK);
        return sideG(R, shadow(72) +
          ln('M40 -32q16 0 24 12', P.line, 6.4) + ln('M40 -32q16 0 24 12', P.fill, 3.4) +
          wheel(-58) + wheel(54) +
          p('M-42 -24H44Q54 -24 56 -15H-48Z', P.fill, P.line, 2.2) + ln('M-34 -20H40', '#fff', 2, 'stroke-opacity=".5"') +
          ln('M-58 -17L-45 -216', P.line, 9.6) + ln('M-58 -17L-45 -216', P.fill, 5.6) + ln('M-55.4 -52L-47.6 -176', '#fff', 1.6, 'stroke-opacity=".5"') +
          ln('M-70 -216H-20', '#1f1a2b', 9) + ln('M-70 -216H-20', DARK, 6) + ln('M-70 -216H-58M-32 -216H-20', '#ff6f91', 6.4) +
          ln('M-70 -216q-10 8 -6 22M-70 -216q-4 12 2 24M-70 -216q-14 2 -16 14', '#ffd24d', 1.8) + ln('M-70 -216q-8 14 -2 26', '#ff9ac1', 1.8) +
          circ(-38, -208, 5.6, GOLD, GOLD_L, 1.3) + p(DU.starD(6, -19.6, 3.6), '#fff'));
      },
    },
    {
      id: 'sd_surfboard', slot: 'side', name: 'גלשן', tags: ['beach', 'hawaii', 'sport'], color: '#7de3e0',
      draw(R, P, ctx) {
        const board = 'M0 -312C27 -282 37 -200 35 -120C33 -60 23 -18 13 -4L-13 -4C-23 -18 -33 -60 -35 -120C-37 -200 -27 -282 0 -312Z';
        return sideG(R, shadow(58) +
          rot(6, 0, 0, p(board, P.fill, P.line, 2.8) +
            DU.clip(ctx.id('sf'), board, ln('M0 -320V0', '#ffffff', 7) + p('M-40 -92L0 -112L40 -92V-74L0 -94L-40 -74Z', '#ffffff') + p('M-40 -62L0 -82L40 -62V-52L0 -72L-40 -52Z', '#ffd24d') + ov('M14 -320H40V0H14Z')) +
            p('M-22 -196C-34 -206 -38 -220 -30 -226C-22 -218 -18 -208 -18 -198Z', LEAF, LEAF_L, 1.3) + p('M22 -196C34 -206 38 -220 30 -226C22 -218 18 -208 18 -198Z', LEAF, LEAF_L, 1.3) +
            DU.flower(0, -200, 17, '#ff6f91', '#ffd24d') + HL(-18, -240, 4, 30, 6, 0.45) + p(board, 'none', P.line, 2.8)) +
          p('M-56 0Q-24 -26 8 -16Q36 -24 58 0Z', '#f3dcae', '#c9a86a', 2) + ln('M-30 -6q6 -4 12 0M14 -8q6 -3 12 1', '#c9a86a', 1.4, 'stroke-opacity=".6"') +
          p(DU.starD(40, -8, 10), '#ff9a56', '#b8642a', 1.5) + circ(38.6, -9.4, 1.2, '#fff') + circ(42, -6, 1.2, '#fff'));
      },
    },
    {
      id: 'sd_easel', slot: 'side', name: 'כן ציור', tags: ['paris', 'school', 'nature', 'kawaii'], color: '#e9c98f', fixed: true,
      draw(R, P, ctx) {
        const canvas = rrect(-46, -232, 46, -92, 3);
        const leg = (dd) => ln(dd, WOOD_L, 8.4) + ln(dd, WOOD, 5);
        return sideG(R, shadow(60) +
          leg('M0 -250L14 -24') + leg('M-10 -256L-54 0') + leg('M10 -256L54 0') +
          p(canvas, '#cdeeff', '#b9ad98', 2.2) +
          DU.clip(ctx.id('ea'), canvas,
            circ(24, -202, 14, '#ffd24d') +
            ln('M-48 -128A34 34 0 0 1 20 -128', '#ff6f91', 6) + ln('M-42 -128A28 28 0 0 1 14 -128', '#ffd24d', 6) + ln('M-36 -128A22 22 0 0 1 8 -128', '#5cc8ff', 6) +
            p('M-50 -124Q-16 -150 14 -132Q34 -122 50 -130V-90H-50Z', '#8bdc7a') + p('M-50 -108Q-10 -124 50 -106V-90H-50Z', '#6fc46a') +
            DU.flower(-26, -112, 7, '#ff9ac1') + DU.flower(-4, -104, 6, '#ffffff') + DU.flower(26, -108, 7, '#ffd24d', '#ff9a56') +
            ell(-22, -208, 16, 7, '#ffffff', null, 0, 'fill-opacity=".9"') + ell(-10, -212, 10, 6, '#ffffff', null, 0, 'fill-opacity=".9"')) +
          p(canvas, 'none', '#b9ad98', 2.2) +
          `<rect x="-52" y="-92" width="104" height="9" rx="2.4" fill="${WOOD}" stroke="${WOOD_L}" stroke-width="2"/><rect x="-8" y="-262" width="16" height="14" rx="2.4" fill="${WOOD}" stroke="${WOOD_L}" stroke-width="2"/>` +
          rot(-12, 34, -92, p('M32 -92L36 -92L35.4 -124L32.6 -124Z', '#8fd3f0', '#3f7fa8', 1.2) + p('M32.6 -124C31.6 -130 33 -134 34 -137C35 -134 36.4 -130 35.4 -124Z', '#ff6f91', '#a8305f', 1)) +
          p(DU.heartD(-36, -98.6, 4), '#ff6f91'));
      },
    },
    {
      id: 'sd_gifts', slot: 'side', name: 'ערימת מתנות', tags: ['party', 'winter', 'kawaii', 'princess'], color: '#ff6f91',
      draw(R, P, ctx) {
        const big = rrect(-56, -76, 30, 0, 5), dots = [[-44, -60], [-24, -64], [16, -62], [-36, -40], [8, -44], [-46, -18], [-28, -14], [16, -20]].map((q) => circ(q[0], q[1], 4, '#fff', null, 0, 'fill-opacity=".55"')).join('');
        const box = (x0, y0, x1, y1, c, rib) => p(rrect(x0, y0, x1, y1, 4), c, DU.line(c), 2.2) + `<rect x="${(x0 + x1) / 2 - 5}" y="${y0}" width="10" height="${y1 - y0}" fill="${rib}"/>` +
          ov(d`M${x1 - 10} ${y0}H${x1 - 4}Q${x1} ${y0} ${x1} ${y0 + 4}V${y1 - 4}Q${x1} ${y1} ${x1 - 4} ${y1}H${x1 - 10}Z`) + p(rrect(x0 - 3, y0 - 10, x1 + 3, y0 + 3, 3.4), c, DU.line(c), 2.2) + `<rect x="${(x0 + x1) / 2 - 5}" y="${y0 - 10}" width="10" height="13" fill="${rib}"/>`;
        return sideG(R, shadow(68, 4) +
          box(26, -52, 74, 0, '#7de3e0', '#ff9ac1') + DU.bow(50, -66, 13, '#ff9ac1', DU.line('#ff9ac1')) +
          p(big, P.fill, P.line, 2.4) + DU.clip(ctx.id('gf'), big, dots + ov('M14 -80H34V4H14Z')) + `<rect x="-20" y="-76" width="14" height="76" fill="${GOLD}"/>` + ln('M-20 -76V0M-6 -76V0', GOLD_L, 1.1) + p(big, 'none', P.line, 2.4) +
          p(rrect(-60, -90, 34, -74, 4), P.fill, P.line, 2.4) + `<rect x="-20" y="-90" width="14" height="16" fill="${GOLD}"/>` + ln('M-20 -90V-74M-6 -90V-74', GOLD_L, 1.1) +
          box(-40, -128, 6, -92, '#b48cff', '#ffd24d') + p(DU.starD(-30, -110, 5), '#fff', null, 0, 'fill-opacity=".7"') + p(DU.starD(-4, -104, 4), '#fff', null, 0, 'fill-opacity=".7"') +
          DU.bow(-17, -142, 16, '#ff6f91', DU.line('#ff6f91'), true) +
          sparkles([[58, -100, 6], [-70, -112, 5, '#fff7b8'], [84, -40, 4]]));
      },
    },
    {
      id: 'sd_snowman', slot: 'side', name: 'איש שלג', tags: ['winter'], color: '#e0435f',
      draw(R, P) {
        const S = '#fffdfb', SL = '#a9b6d6', lt = DU.light(P.base, 0.5);
        const ball = (y, r) => circ(0, y, r, S, SL, 2.6) + ov(d`M${r * 0.55} ${y - r * 0.82}A${r} ${r} 0 0 1 ${-r * 0.3} ${y + r * 0.96}A${r * 1.25} ${r * 1.25} 0 0 0 ${r * 0.55} ${y - r * 0.82}Z`, 'fill="#8fa8e0" fill-opacity=".2" stroke="none"');
        return sideG(R, shadow(62) +
          ln('M-34 -138L-78 -176M-64 -164l-12 5M-62 -162l-2 -13', BROWN_L, 5.4) + ln('M-34 -138L-78 -176M-64 -164l-12 5M-62 -162l-2 -13', BROWN, 2.6) +
          ln('M34 -138L74 -110M62 -118l12 -4M60 -120l2 12', BROWN_L, 5.4) + ln('M34 -138L74 -110M62 -118l12 -4M60 -120l2 12', BROWN, 2.6) +
          ball(-54, 56) + ball(-130, 41) + ball(-192, 32) +
          circ(0, -142, 4.6, DARK) + circ(0, -124, 4.6, DARK) + circ(0, -106, 4.6, DARK) +
          circ(-11, -199, 4.2, DARK) + circ(11, -199, 4.2, DARK) + circ(-12.4, -200.4, 1.3, '#fff') + circ(9.6, -200.4, 1.3, '#fff') +
          [[-13, -180], [-7, -176], [0, -174.6], [7, -176], [13, -180]].map((q) => circ(q[0], q[1], 1.9, DARK)).join('') +
          p('M-1 -193L28 -186L-1 -182Z', '#ff9a56', '#b8642a', 1.5) + pblush(-21, -186, 6, 3.6) + pblush(21, -186, 6, 3.6) +
          p('M14 -160L28 -164L34 -122L20 -119Z', P.fill, P.line, 2) + ln('M21 -130l12 -2.4', lt, 3.2) + ln('M21.6 -120v6M25.6 -121v6M29.6 -122v6', P.line, 1.6) +
          p('M-31 -173Q0 -158 31 -173L33 -160Q0 -145 -33 -160Z', P.fill, P.line, 2) + ln('M-18 -167l-2 11M-2 -163v11M14 -165l2 11', lt, 3.2) +
          p('M-29 -208C-29 -244 29 -244 29 -208Z', P.fill, P.line, 2.2) + p(rrect(-33, -217, 33, -203, 6), lt, P.line, 2) + ln('M-22 -216v12M-10 -216v12M2 -216v12M14 -216v12M26 -216v12', P.line, 1.1, 'stroke-opacity=".35"') +
          circ(0, -240, 10, '#fff', P.line, 2) + sparkles([[-60, -230, 5], [62, -200, 4.4, '#dff4ff'], [70, -60, 4]]));
      },
    },
    {
      id: 'sd_sandcastle', slot: 'side', name: 'ארמון חול', tags: ['beach', 'hawaii', 'princess'], color: '#ff6f91',
      draw(R, P) {
        const S = '#f6dba6', SL = '#b8935a', SD = '#e2c283';
        const flag = (x, y, c, l) => ln(d`M${x} ${y}v-26`, BROWN_L, 2.4) + p(d`M${x + 1} ${y - 26}l19 6l-19 7Z`, c, l, 1.4);
        const tower = (x0, x1, y) => p(d`M${x0} -20V${y}H${x0 + (x1 - x0) * 0.26}V${y + 9}H${x0 + (x1 - x0) * 0.74}V${y}H${x1}V-20Z`, S, SL, 2.2) + ov(d`M${x1 - 7} ${y + 9}H${x1}V-20H${x1 - 7}Z`) +
          p(d`M${(x0 + x1) / 2 - 4.4} ${y + 34}v-9q4.4 -6 8.8 0v9Z`, '#c9a26a');
        return sideG(R, shadow(84) +
          p('M-90 0Q-62 -28 0 -28Q62 -28 90 0Z', S, SL, 2.2) +
          flag(-2, -128, P.fill, P.line) + flag(-60, -106, '#ffd24d', GOLD_L) + flag(52, -106, '#5cc8ff', '#2f7fb5') +
          tower(-18, 16, -128) +
          p('M-52 -20V-76H-40V-66H-28V-76H-16V-66H-4V-76H8V-66H20V-76H32V-66H44V-76H50V-20Z', S, SL, 2.2) + ov('M36 -66H44V-76H50V-20H36Z') +
          tower(-76, -44, -106) + tower(36, 68, -106) +
          p('M-11 -20V-42Q0 -55 11 -42V-20Z', '#c9a26a', SL, 1.8) + ln('M0 -50V-20', SL, 1.2, 'stroke-opacity=".6"') +
          [[-34, -40], [28, -46], [-60, -52], [54, -44], [-20, -14], [40, -12], [-70, -8], [70, -10]].map((q) => circ(q[0], q[1], 1.8, SD)).join('') +
          p(DU.heartD(0, -98, 5), '#ff9ac1', '#b05a6e', 1) +
          p('M58 -34L88 -34L84 0L62 0Z', '#5cc8ff', '#2f7fb5', 2) + ln('M58 -34Q73 -58 88 -34', '#2f7fb5', 2.4) + ell(73, -34, 15, 3.4, '#8fd8ff', '#2f7fb5', 1.5) +
          p(DU.starD(-78, -6, 8), '#ff9a56', '#b8642a', 1.4));
      },
    },
    {
      id: 'sd_treasure', slot: 'side', name: 'תיבת אוצר', tags: ['pirate', 'magic', 'princess'], price: 500, color: '#a8703d', fixed: true,
      draw(R) {
        const W = '#a8703d', WL = BROWN_L, coin = (x, y) => ell(x, y, 9, 5.4, GOLD, GOLD_L, 1.3) + ell(x, y - 0.6, 5, 2.4, '#fff3b0');
        const gem = (x, y, c) => p(d`M${x} ${y - 9}L${x + 8} ${y - 2}L${x} ${y + 9}L${x - 8} ${y - 2}Z`, c, DU.line(c), 1.3) + p(d`M${x - 8} ${y - 2}H${x + 8}L${x} ${y - 9}Z`, '#fff', null, 0, 'fill-opacity=".4"');
        return sideG(R, shadow(70) +
          p('M-56 -60C-62 -128 46 -144 58 -84Z', '#8a5a2c', WL, 2.4) + p('M-48 -64C-52 -116 40 -128 50 -84Z', '#e0435f') + ln('M-30 -112L-24 -66M2 -124L8 -70M30 -120L34 -76', GOLD_D, 5) +
          [[-36, -66], [-18, -72], [0, -70], [18, -74], [36, -68], [-26, -80], [-6, -84], [14, -86], [30, -80], [4, -96], [-12, -94]].map((q) => coin(q[0], q[1])).join('') +
          gem(-30, -92, '#5cc8ff') + gem(24, -98, '#ff6f91') + gem(-2, -108, '#8bdc7a') +
          p('M34 -104l-6 -14l8 5l4 -9l4 9l8 -5l-6 14Z', GOLD, GOLD_L, 1.4) +
          p(rrect(-58, -60, 58, 0, 6), W, WL, 2.6) + ln('M-58 -40H58M-58 -20H58', WL, 1.2, 'stroke-opacity=".4"') + ov('M40 -60H52Q58 -60 58 -54V-6Q58 0 52 0H40Z') +
          `<rect x="-58" y="-62" width="116" height="11" rx="3" fill="${GOLD}" stroke="${GOLD_L}" stroke-width="1.6"/>` +
          bothS(`<rect x="26" y="-62" width="11" height="62" fill="${GOLD}" stroke="${GOLD_L}" stroke-width="1.5"/>` + circ(31.5, -30, 2, GOLD_L)) +
          p(rrect(-11, -52, 11, -28, 4), GOLD, GOLD_L, 1.8) + circ(0, -42, 3.4, DARK) + p('M-1.6 -42L1.6 -42L2.4 -33L-2.4 -33Z', DARK) +
          coin(74, -4) + coin(-72, -2) + [[-10, -56], [-4, -52], [3, -51], [10, -54]].map((q) => circ(q[0] + 56, q[1] + 4, 3, '#fffaf3', '#c9b9a8', 0.9)).join('') +
          sparkles([[-52, -124, 7], [58, -132, 6, '#fff7b8'], [4, -134, 5], [80, -40, 4.4, '#fff7b8'], [-76, -50, 4]]));
      },
    },
    {
      id: 'sd_telescope', slot: 'side', name: 'טלסקופ', tags: ['space', 'pirate', 'school', 'magic'], color: '#b48cff',
      draw(R, P) {
        const leg = (dd) => ln(dd, '#3a2f52', 8) + ln(dd, '#6b5a8f', 4.6);
        return sideG(R, shadow(58) +
          leg('M0 -150L6 -4') + leg('M0 -150L-48 0') + leg('M0 -150L48 0') + ln('M-26 -70H26', '#3a2f52', 3) +
          rot(-34, 0, -158,
            p(rrect(-84, -168, -50, -148, 4), DARK, '#1f1a2b', 1.6) +
            p(rrect(-56, -174, 44, -142, 6), P.fill, P.line, 2.4) + ov('M-56 -152H44V-148Q44 -142 38 -142H-50Q-56 -142 -56 -148Z') + ln('M-48 -168H36', '#fff', 2.4, 'stroke-opacity=".5"') +
            p(rrect(36, -180, 86, -136, 7), DU.light(P.base, 0.3), P.line, 2.4) + ov('M36 -150H86V-143Q86 -136 79 -136H43Q36 -136 36 -143Z') +
            `<rect x="-22" y="-176" width="9" height="36" rx="2" fill="${GOLD}" stroke="${GOLD_L}" stroke-width="1.4"/><rect x="32" y="-182" width="9" height="48" rx="2" fill="${GOLD}" stroke="${GOLD_L}" stroke-width="1.4"/>` +
            ell(86, -158, 6, 22, '#dff4ff', P.line, 2) + HL(85, -166, 2, 8, 0, 0.8) + p(DU.starD(6, -158, 6), '#fff', null, 0, 'fill-opacity=".85"')) +
          circ(0, -154, 9, GOLD, GOLD_L, 1.8) + circ(0, -154, 3, GOLD_L) +
          p(DU.starD(70, -268, 9), '#fff7b8', GOLD_L, 1.1) + sparkles([[30, -286, 6], [92, -230, 5, '#fff7b8'], [-6, -262, 4.4]]) + circ(52, -300, 2, '#fff') + circ(96, -276, 1.8, '#fff7b8'));
      },
    },
    {
      id: 'sd_sunflower', slot: 'side', name: 'חמנייה בעציץ', tags: ['nature', 'cowgirl', 'paris', 'school'], color: '#ff9a56',
      draw(R, P) {
        let petals = '';
        for (let i = 0; i < 16; i++) petals += ell(0, -37, 9.6, 19, i % 2 ? '#ffd24d' : '#ffc233', '#c9962a', 1.4, `transform="rotate(${i * 22.5})"`);
        const leaf = (s) => p(d`M0 0C${s * 30} -24 ${s * 58} -14 ${s * 64} 4C${s * 46} 18 ${s * 18} 16 0 0Z`, LEAF, LEAF_L, 2) + ln(d`M0 0Q${s * 30} -2 ${s * 58} 3`, LEAF_L, 1.3, 'stroke-opacity=".6"');
        return sideG(R, shadow(46) +
          ln('M0 -58C-7 -120 7 -180 0 -238', LEAF_L, 10) + ln('M0 -58C-7 -120 7 -180 0 -238', LEAF, 5.6) +
          `<g transform="translate(-2 -116)">${leaf(-1)}</g><g transform="translate(2 -160)">${leaf(1)}</g>` +
          `<g transform="translate(0 -250)">${petals}${circ(0, 0, 26, '#8a5a3a', '#5a3a22', 2)}${circ(0, 0, 26, '#5a3a22', null, 0, 'fill-opacity=".25"')}` +
          circ(-9, -4, 3.4, EYE) + circ(9, -4, 3.4, EYE) + circ(-10, -5.2, 1.1, '#fff') + circ(8, -5.2, 1.1, '#fff') + ln('M-6 6q6 6 12 0', EYE, 1.8) +
          ell(-15, 4, 4.4, 2.6, '#ff7f9c', null, 0, 'fill-opacity=".7"') + ell(15, 4, 4.4, 2.6, '#ff7f9c', null, 0, 'fill-opacity=".7"') + '</g>' +
          ell(0, -56, 30, 6, '#6b4a2c') +
          p('M-34 -54H34L28 0H-28Z', P.fill, P.line, 2.4) + ov('M16 -54H34L28 0H14Z') + p(rrect(-39, -66, 39, -50, 5.4), P.fill, P.line, 2.4) + ln('M-32 -61H30', '#fff', 2.2, 'stroke-opacity=".5"') +
          p(DU.heartD(0, -26, 9), '#fff', null, 0, 'fill-opacity=".85"'));
      },
    },
    {
      id: 'sd_campfire', slot: 'side', name: 'מדורה', tags: ['nature', 'cowgirl', 'sleepover', 'pirate'], color: '#ff9a56', fixed: true,
      draw(R) {
        const log = (a) => rot(a, 0, -14, p(rrect(-58, -24, 58, -4, 9), BROWN, BROWN_L, 2.2) + ell(58 - 5, -14, 5.4, 9, '#e9c98f', BROWN_L, 1.6) + ln('M-40 -18H20M-30 -10H34', BROWN_L, 1.2, 'stroke-opacity=".5"'));
        const stone = (x, rx, c) => ell(x, -5, rx, 9, c, '#6b6480', 1.8) + HL(x - rx * 0.3, -8, rx * 0.34, 2.4, 0, 0.45);
        return sideG(R, shadow(76) +
          ln('M30 -8L78 -100', BROWN_L, 5) + ln('M30 -8L78 -100', '#c98e5a', 2.4) +
          `<g transform="rotate(-27 78 -100)">${p(rrect(70, -120, 86, -96, 5), '#fffdf8', '#c9b9a8', 1.6)}<path d="M70 -115Q70 -120 75 -120H81Q86 -120 86 -115V-110H70Z" fill="#d9a05a" fill-opacity=".75"/></g>` +
          log(16) + log(-16) +
          p('M0 -138C24 -108 46 -90 42 -54C40 -28 22 -12 0 -12C-22 -12 -40 -28 -42 -54C-44 -74 -32 -86 -26 -102C-20 -90 -13 -84 -9 -92C-11 -108 -6 -124 0 -138Z', '#ff8a3c', '#c9541e', 2.2) +
          p('M2 -108C18 -88 30 -74 28 -50C26 -32 14 -20 0 -20C-14 -20 -26 -32 -28 -50C-29 -62 -22 -72 -17 -82C-12 -72 -7 -70 -5 -76C-6 -88 -2 -98 2 -108Z', '#ffc23c') +
          p('M0 -74C9 -62 15 -54 14 -42C13 -32 7 -26 0 -26C-7 -26 -13 -32 -14 -42C-14.6 -50 -10 -56 -7 -62C-4 -56 -2 -56 0 -74Z', '#fff3a8') +
          stone(-58, 15, '#b9b4cc') + stone(-28, 16, '#cfd3e6') + stone(4, 17, '#b9b4cc') + stone(36, 16, '#cfd3e6') + stone(62, 13, '#b9b4cc') +
          [[-30, -128, 2.6, '#ffc23c'], [26, -142, 2.2, '#ff8a3c'], [-10, -160, 2, '#ffc23c'], [38, -112, 1.8, '#fff3a8'], [-44, -100, 1.8, '#ff8a3c'], [10, -176, 1.6, '#fff3a8']].map((q) => circ(q[0], q[1], q[2], q[3])).join('') +
          sparkles([[-22, -150, 4.4, '#fff3a8'], [20, -160, 3.6, '#fff3a8']]));
      },
    },
    {
      id: 'sd_amp', slot: 'side', name: 'מגבר ומיקרופון', tags: ['rock', 'pop', 'party', 'retro'], color: '#e0435f',
      draw(R, P, ctx) {
        const head = DU.ellD(-66, -276, 13, 15);
        let mesh = '';
        for (let i = -4; i <= 4; i++) mesh += d`M${-66 + i * 5 - 18} -294l36 36M${-66 + i * 5 + 18} -294l-36 36`;
        const note = (x, y, c) => ell(x, y, 6, 4.4, c, DU.line(c), 1.2, `transform="rotate(-20 ${n(x)} ${n(y)})"`) + ln(d`M${x + 5} ${y - 1.6}v-19`, DU.line(c), 3.6) + ln(d`M${x + 5} ${y - 1.6}v-19`, c, 1.9) + p(d`M${x + 5} ${y - 21}q9 1 10 10q-4 -4.6 -10 -4.6Z`, c, DU.line(c), 1.2);
        return sideG(R, shadow(80, 16) +
          ln('M-10 -18C-32 -18 -30 -5 -52 -5', '#1f1a2b', 4.4) +
          ell(-58, -4, 26, 7, DARK, '#1f1a2b', 1.8) + ln('M-58 -6V-254', SILVER_L, 7) + ln('M-58 -6V-254', SILVER, 3.6) + `<rect x="-64" y="-150" width="12" height="14" rx="3" fill="${DARK}"/>` +
          rot(-24, -58, -254, p(rrect(-64, -262, -52, -226, 4), DARK, '#1f1a2b', 1.6)) +
          p(head, '#eef1fb', SILVER_L, 2.2) + DU.clip(ctx.id('am'), head, ln(mesh, '#aab2cf', 1.1)) + HL(-70, -282, 3.6, 4.6, 0, 0.8) +
          ln('M10 -108Q36 -124 62 -108', '#1f1a2b', 5.4) +
          p(rrect(-14, -106, 86, 0, 9), P.fill, P.line, 2.6) + ov('M66 -106H77Q86 -106 86 -97V-9Q86 0 77 0H66Z') +
          p(rrect(-6, -78, 78, -8, 6), DARK, '#1f1a2b', 1.6) + circ(36, -43, 28, '#5a5470', '#1f1a2b', 1.6) + circ(36, -43, 19, DARK) + circ(36, -43, 9, '#6b6480') + circ(36, -43, 3.6, SILVER) + HL(26, -54, 5, 3, -30, 0.35) +
          [0, 18, 36, 54].map((x) => circ(x + 9, -92, 5, SILVER, SILVER_L, 1.3) + ln(d`M${x + 9} -92l2.6 -3`, DARK, 1.4)).join('') + circ(78, -92, 2.6, '#8bdc7a') +
          p(DU.starD(-1, -14, 4.4), '#fff', null, 0, 'fill-opacity=".8"') +
          note(68, -150, '#ffd24d') + note(40, -184, '#b48cff') + DU.sparkle(92, -176, 5, '#fff'), 204);
      },
    },
    {
      id: 'sd_teddy', slot: 'side', name: 'דובי ענק', tags: ['sleepover', 'kawaii', 'party', 'ballet'], color: '#c98e5a',
      draw(R, P) {
        const F = P.fill, L = P.line, lt = DU.light(P.base, 0.55);
        return sideG(R, shadow(82) +
          bothS(circ(-45, -224, 23, F, L, 2.6) + circ(-45, -223, 12.6, lt)) +
          bothS(p('M-52 -106C-80 -98 -90 -66 -79 -46C-68 -43 -57 -57 -50 -78Z', F, L, 2.6)) +
          p('M-58 -10C-71 -62 -50 -128 0 -132C50 -128 71 -62 58 -10Z', F, L, 2.6) + ell(0, -60, 33, 38, lt) + ln('M0 -96V-28', L, 1.4, 'stroke-dasharray="4 5" stroke-opacity=".6"') +
          bothS(ell(-47, -23, 27, 25, F, L, 2.6) + ell(-47, -21, 15.6, 14.6, lt) + circ(-55, -34, 3.4, lt) + circ(-47, -38.6, 3.4, lt) + circ(-39, -34, 3.4, lt)) +
          ell(0, -178, 63, 55, F, L, 2.6) + ell(0, -160, 27, 21, lt) +
          ell(0, -168, 9.6, 7, '#4a3035') + HL(-2.6, -170, 2.8, 1.6, 0, 0.6) + ln('M0 -161V-152M-10 -148Q-5 -142.6 0 -152Q5 -142.6 10 -148', '#4a3035', 2) +
          peye(-25, -187, 10) + peye(25, -187, 10) + pblush(-41, -168, 9, 5) + pblush(41, -168, 9, 5) +
          DU.bow(0, -126, 24, '#ff6f91', DU.line('#ff6f91'), true) +
          p(DU.heartD(12, -52, 10), '#ff9ac1', '#b05a6e', 1.3) + ln('M2 -58l4 4M22 -46l-4 -4', '#b05a6e', 1.1));
      },
    },
    {
      id: 'sd_bike', slot: 'side', name: 'אופניים', tags: ['sport', 'nature', 'paris', 'retro'], color: '#ff9ac1',
      draw(R, P) {
        const wheel = (x) => {
          let sp = '';
          for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI; sp += d`M${x - Math.cos(a) * 36} ${-42 - Math.sin(a) * 36}L${x + Math.cos(a) * 36} ${-42 + Math.sin(a) * 36}`; }
          return ln(sp, SILVER_L, 1) + ln(DU.ellD(x, -42, 39, 39), '#1f1a2b', 7.6) + ln(DU.ellD(x, -42, 39, 39), '#5a5470', 4.4) + ln(DU.ellD(x, -42, 34, 34), '#fff6c2', 1.6) + circ(x, -42, 5, SILVER, SILVER_L, 1.4);
        };
        const fr = (dd) => ln(dd, P.line, 8.6) + ln(dd, P.fill, 5);
        return sideG(R, shadow(92) +
          wheel(-56) + wheel(58) +
          ln('M-96 -62A40 40 0 0 1 -30 -74', P.line, 5.6) + ln('M-96 -62A40 40 0 0 1 -30 -74', P.fill, 2.8) + ln('M22 -66A40 40 0 0 1 94 -66', P.line, 5.6) + ln('M22 -66A40 40 0 0 1 94 -66', P.fill, 2.8) +
          fr('M10 -100L58 -42L4 -42Z') + fr('M-46 -104L4 -42M10 -98L-44 -104') + fr('M-48 -118L-56 -42') + fr('M8 -112L4 -42') +
          ln('M10 -98L-44 -104', '#fff', 1.4, 'stroke-opacity=".5"') +
          ln('M-48 -118L-52 -134', SILVER_L, 5) + ln('M-70 -130Q-54 -140 -40 -132', '#1f1a2b', 7) + ln('M-70 -130Q-54 -140 -40 -132', DARK, 4.4) + ln('M-70 -130l5 -3', '#ff6f91', 6) +
          p('M-8 -112Q10 -122 28 -112Q14 -103 -8 -107Z', DARK, '#1f1a2b', 1.6) +
          circ(4, -42, 8, SILVER, SILVER_L, 1.6) + ln('M4 -42L17 -27', SILVER_L, 4) + `<rect x="10" y="-28" width="15" height="5" rx="2" fill="${DARK}"/>` +
          p('M-92 -128H-60L-64 -98H-88Z', WOOD, WOOD_L, 2) + ln('M-91 -118H-61M-90 -108H-63M-82 -128L-80 -98M-72 -128L-73 -98', WOOD_L, 1.2, 'stroke-opacity=".6"') +
          p('M-84 -128C-90 -140 -84 -146 -78 -138ZM-70 -128C-62 -142 -58 -136 -64 -128Z', LEAF, LEAF_L, 1.2) +
          DU.flower(-84, -136, 7.6, '#ff6f91', '#ffd24d') + DU.flower(-70, -140, 7, '#ffd24d', '#ff9a56') + DU.flower(-76, -129, 6, '#ffffff', '#ffd24d') +
          circ(-34, -126, 4.6, GOLD, GOLD_L, 1.2), 206);
      },
    },
  ];

  DU.addItems([...hands, ...sides]);
})();
