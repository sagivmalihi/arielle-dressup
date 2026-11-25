/* acc-head.js — hats, hair accessories, glasses and earrings.
   Everything here is drawn in head coordinates (origin between the eyes, skull top y=-108,
   chin y=+90; the hair cap reaches y≈-126 and x≈±92). Hats are seen a little from above:
   their rim dips over the forehead (centre ≈ y -42…-50) and hugs the head at the sides. */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const { n, p, ov, sym } = DU;
  const SH = DU.SH, SH2 = DU.SH2, HL = DU.HL;

  /* ---------- little helpers ---------- */
  const ell = (cx, cy, rx, ry, fill, line, sw = 2.4, extra = '') =>
    `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill || 'none'}"${line ? ` stroke="${line}" stroke-width="${sw}"` : ''}${extra ? ' ' + extra : ''}/>`;
  const circ = (cx, cy, r, fill, line, sw = 2, extra = '') => ell(cx, cy, r, r, fill, line, sw, extra);
  const glint = (cx, cy, r) => `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(r)}" ry="${n(r * 0.7)}" fill="#fff" fill-opacity=".8" transform="rotate(-30 ${n(cx)} ${n(cy)})"/>`;
  const rot = (deg, x, y, svg) => `<g transform="rotate(${deg} ${n(x)} ${n(y)})">${svg}</g>`;
  /* a fluffy (scalloped) ball outline — pompoms, ear muffs */
  function fluffD(cx, cy, r, k = 9, amp = 0.22) {
    let d = '';
    for (let i = 0; i <= k; i++) {
      const a = (i / k) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (!i) d += `M${n(x)} ${n(y)}`;
      else {
        const am = ((i - 0.5) / k) * Math.PI * 2 - Math.PI / 2;
        d += `Q${n(cx + Math.cos(am) * r * (1 + amp))} ${n(cy + Math.sin(am) * r * (1 + amp))} ${n(x)} ${n(y)}`;
      }
    }
    return d + 'Z';
  }
  const pom = (cx, cy, r, fill, line) =>
    p(fluffD(cx, cy, r), fill, line, 2.2) + ov(`M${n(cx - r * 0.75)} ${n(cy + r * 0.2)}Q${n(cx)} ${n(cy + r * 1.25)} ${n(cx + r * 0.85)} ${n(cy + r * 0.1)}Q${n(cx)} ${n(cy + r * 0.7)} ${n(cx - r * 0.75)} ${n(cy + r * 0.2)}Z`) +
    ell(cx - r * 0.3, cy - r * 0.38, r * 0.3, r * 0.2, '#fff', null, 0, 'fill-opacity=".55"');
  const leaf = (x, y, len, deg, fill = '#7ccf7a') =>
    `<g transform="translate(${n(x)} ${n(y)}) rotate(${deg})"><path d="M0 0Q${n(len * 0.5)} ${n(-len * 0.42)} ${n(len)} 0Q${n(len * 0.5)} ${n(len * 0.42)} 0 0Z" fill="${fill}" stroke="${DU.line(fill)}" stroke-width="1.5"/><path d="M${n(len * 0.15)} 0H${n(len * 0.8)}" fill="none" stroke="${DU.line(fill)}" stroke-width="1" stroke-opacity=".5"/></g>`;
  /* a frame drawn as an outlined stroke: dark line under, color on top */
  const frame = (d, P, w = 3.6, lens = '') =>
    (lens ? `<path d="${d}" ${lens}/>` : '') + `<path d="${d}" fill="none" stroke="${P.line}" stroke-width="${w + 2.8}"/><path d="${d}" fill="none" stroke="${P.fill}" stroke-width="${w}"/>`;
  const CLEAR = 'fill="#ffffff" fill-opacity=".18"';
  const contrast = (P, a, b) => (DU.lum(P.base) > 0.72 ? a : b);
  /* soft shadow a hat throws on the fringe (kept inside the hair so it never tints the background) */
  const brimShade = (y) => ov(`M-82 ${y - 6}Q0 ${y + 6} 82 ${y - 6}Q0 ${y + 22} -82 ${y - 6}Z`, SH);
  const gem = (x, y, r, c) =>
    `<path d="M${n(x)} ${n(y - r)}L${n(x + r * 0.85)} ${n(y)}L${n(x)} ${n(y + r)}L${n(x - r * 0.85)} ${n(y)}Z" fill="${c}" stroke="${DU.line(c)}" stroke-width="1.3"/><path d="M${n(x)} ${n(y - r)}L${n(x - r * 0.85)} ${n(y)}L${n(x)} ${n(y - r * 0.1)}Z" fill="#fff" fill-opacity=".55"/>`;

  const STRAW = '#f6dea6', STRAW_L = '#a67c45';

  DU.addItems([
    /* ======================= HATS ======================= */
    {
      id: 'hat_sun', slot: 'hat', name: 'כובע קש', tags: ['beach', 'nature'], price: 0, color: '#ff6f91', coversTop: true,
      draw(R, P) {
        let o = brimShade(-44);
        o += ell(0, -70, 150, 25, STRAW, STRAW_L);
        o += ell(0, -69, 130, 19.5, 'none', STRAW_L, 1.4, 'stroke-opacity=".3"') + ell(0, -68, 110, 14.5, 'none', STRAW_L, 1.4, 'stroke-opacity=".3"');
        o += ov('M-150 -70A150 25 0 0 0 150 -70A150 17 0 0 1 -150 -70Z', HL);
        const crown = sym(0, [[0, -158], [46, -158, 78, -142, 81, -104], [83, -92, 83, -82, 83, -74], [60, -60, 30, -57, 0, -57]]);
        o += p(crown, STRAW, STRAW_L);
        o += p('M-58 -146Q0 -160 58 -146M-74 -124Q0 -140 74 -124M-80 -104Q0 -120 80 -104', 'none', STRAW_L, 1.4, 'stroke-opacity=".3"');
        o += ov(sym(0, [[0, -158], [46, -158, 78, -142, 81, -104], [70, -128, 40, -146, 0, -146]]), HL);
        const band = sym(0, [[0, -80], [30, -80, 62, -84, 82, -95], [83, -86, 83, -80, 83, -74], [60, -60, 30, -57, 0, -57]]);
        o += p(band, P.fill, P.line, 2.2) + ov('M-83 -80Q0 -60 83 -80L83 -74Q0 -54 -83 -74Z', SH);
        o += DU.bow(60, -74, 16, P.fill, P.line, true);
        return o;
      },
    },
    {
      id: 'hat_cap', slot: 'hat', name: 'כובע מצחייה', tags: ['sport', 'school'], price: 0, color: '#5cc8ff', coversTop: true,
      draw(R, P) {
        const bill = 'M-80 -66Q-76 -42 0 -40Q76 -42 80 -66Q0 -50 -80 -66Z';
        let o = brimShade(-40);
        o += p(bill, P.fill, P.line) + ov(bill, SH) + ov('M-70 -50Q0 -38 70 -50Q0 -44 -70 -50Z', HL);
        const crown = sym(0, [[0, -138], [52, -138, 93, -114, 96, -64], [70, -57, 34, -55, 0, -55]]);
        o += p(crown, P.fill, P.line);
        o += ov(sym(0, [[0, -138], [52, -138, 93, -114, 96, -64], [84, -70], [80, -108, 46, -128, 0, -128]]), SH);
        o += p('M0 -138Q-36 -112 -40 -57M0 -138Q36 -112 40 -57', 'none', P.line, 1.5, 'stroke-opacity=".45"');
        o += ell(0, -138, 8, 3.6, DU.light(P.base, 0.25), P.line, 1.8);
        o += DU.star(0, -92, 13, '#fff', P.line, 1.8);
        o += ov('M-70 -106Q-52 -128 -22 -132Q-50 -118 -62 -96Z', HL);
        return o;
      },
    },
    {
      id: 'hat_beanie', slot: 'hat', name: 'כובע צמר', tags: ['winter'], price: 0, color: '#ff6f91', coversTop: true,
      draw(R, P) {
        const soft = DU.light(P.base, 0.72);
        let o = brimShade(-44);
        o += pom(0, -159, 21, soft, DU.line(DU.mix(P.base, '#ffffff', 0.4)));
        const dome = sym(0, [[0, -144], [58, -144, 97, -114, 98, -66], [70, -58, 34, -54, 0, -54]]);
        o += p(dome, P.fill, P.line);
        o += p('M0 -144V-60M-24 -141Q-34 -100 -34 -60M24 -141Q34 -100 34 -60M-48 -132Q-66 -100 -66 -66M48 -132Q66 -100 66 -66M-70 -118Q-88 -96 -90 -70M70 -118Q88 -96 90 -70', 'none', P.line, 1.5, 'stroke-opacity=".3"');
        o += ov(sym(0, [[0, -144], [58, -144, 97, -114, 98, -66], [86, -70], [84, -110, 50, -134, 0, -134]]), SH);
        const band = sym(0, [[0, -68], [36, -68, 72, -72, 99, -80], [103, -72, 103, -58, 99, -50], [72, -44, 36, -42, 0, -42]]);
        o += p(band, P.fill, P.line) + ov(band, HL);
        let ribs = '';
        for (let x = -88; x <= 88; x += 16) { const dy = 10 * (x / 96) * (x / 96); ribs += `M${x} ${n(-66 - dy)}L${n(x * 1.01)} ${n(-44 - dy * 0.8)}`; }
        o += p(ribs, 'none', P.line, 1.5, 'stroke-opacity=".4"');
        return o;
      },
    },
    {
      id: 'hat_beret', slot: 'hat', name: 'ברט', tags: ['school', 'party'], price: 0, color: '#e0435f', coversTop: true,
      draw(R, P) {
        const body = 'M-93 -70C-108 -106 -86 -148 -30 -156C28 -164 98 -150 112 -112C119 -92 106 -76 92 -70C50 -56 -40 -54 -93 -70Z';
        let o = brimShade(-50);
        o += p('M-8 -154q1 -10 9 -12', 'none', P.line, 5.4) + p('M-8 -154q1 -10 9 -12', 'none', P.fill, 2.6);
        o += p(body, P.fill, P.line);
        o += ov('M-93 -70C-60 -84 40 -90 112 -112C119 -92 106 -76 92 -70C50 -56 -40 -54 -93 -70Z', SH);
        o += ov('M-84 -112C-72 -138 -40 -148 -6 -150C-40 -140 -64 -126 -74 -100Z', HL);
        o += p('M40 -152Q70 -140 84 -116M-60 -146Q-84 -128 -90 -100', 'none', P.line, 1.5, 'stroke-opacity=".35"');
        const band = 'M-93 -72Q0 -52 92 -72L92 -63Q0 -43 -93 -63Z';
        o += p(band, P.fill, P.line, 2.2) + ov(band, SH2);
        return o;
      },
    },
    {
      id: 'hat_bucket', slot: 'hat', name: 'כובע טמבל', tags: ['beach', 'nature'], price: 0, color: '#ffd24d', coversTop: true,
      draw(R, P) {
        let o = brimShade(-44);
        const brim = sym(0, [[0, -84], [30, -84, 60, -86, 86, -92], [100, -76, 110, -62, 114, -52], [76, -43, 38, -41, 0, -41]]);
        o += p(brim, P.fill, P.line) + ov(sym(0, [[0, -60], [30, -60, 62, -64, 94, -77], [87, -84], [58, -73, 28, -70, 0, -70]]), SH) + ov('M-108 -52Q0 -38 108 -52L104 -57Q0 -44 -104 -57Z', HL);
        o += p('M-104 -58Q0 -44 104 -58', 'none', P.line, 1.5, 'stroke-opacity=".5" stroke-dasharray="5 4.5"');
        o += p('M-94 -70Q0 -57 94 -70', 'none', P.line, 1.5, 'stroke-opacity=".5" stroke-dasharray="5 4.5"');
        const crown = sym(0, [[0, -146], [42, -147, 66, -143, 70, -134], [79, -114, 85, -96, 87, -84], [58, -73, 28, -70, 0, -70]]);
        o += p(crown, P.fill, P.line);
        o += ov(sym(0, [[0, -146], [42, -147, 66, -143, 70, -134], [79, -114, 85, -96, 87, -84], [76, -90], [70, -118, 40, -134, 0, -134]]), SH);
        o += ov('M-62 -132Q-30 -142 6 -142Q-30 -134 -56 -112Z', HL);
        o += DU.flower(42, -104, 11, '#ffffff', contrast(P, '#ff9ac1', '#ffd54d'));
        return o;
      },
    },
    {
      id: 'hat_party', slot: 'hat', name: 'כובע מסיבה', tags: ['party'], price: 0, color: '#b48cff',
      draw(R, P, ctx) {
        const cone = 'M-44 -114L3 -183L46 -114Q1 -98 -44 -114Z';
        const dots = [[-18, -126, 6, '#fff'], [14, -134, 5, '#ffe066'], [-4, -148, 4.6, '#ffe066'], [26, -112, 5.5, '#fff'], [-30, -108, 4.5, '#ffe066'], [8, -108, 5, '#ff9ac1'], [5, -164, 3.6, '#fff'], [-12, -106, 0, '#fff']]
          .map((q) => (q[2] ? circ(q[0], q[1], q[2], q[3]) : '')).join('');
        let o = p(cone, P.fill, P.line);
        o += DU.clip(ctx.id('pc'), cone, dots + ov('M3 -183L46 -114Q30 -106 14 -104Z', SH) + ov('M-44 -114L3 -183L-14 -112Z', HL));
        o += p(cone, 'none', P.line);
        // frill
        let fr = '';
        for (let i = 0; i <= 8; i++) { const t = i / 8, x = -44 + 90 * t, y = -114 + 15 * Math.sin(Math.PI * t) ; fr += circ(x, y + 1, 6.4, '#fff', DU.line(DU.light(P.base, 0.4)), 1.5); }
        o += fr;
        o += pom(3, -185, 10.5, '#ffe066', '#b98a1e');
        return rot(-9, 0, -112, o);
      },
    },
    {
      id: 'hat_witch', slot: 'hat', name: 'כובע קוסמת', tags: ['magic'], price: 0, color: '#7b5bd6', coversTop: true,
      draw(R, P) {
        const trim = contrast(P, '#7b5bd6', '#ffd24d');
        let o = brimShade(-48);
        o += ell(0, -72, 134, 22, P.fill, P.line) + ov('M-134 -72A134 22 0 0 0 134 -72A134 14 0 0 1 -134 -72Z', HL) + ov('M-134 -72A134 22 0 0 1 134 -72A134 12 0 0 0 -134 -72Z', SH);
        const cone = 'M-77 -77C-60 -118 -38 -156 -10 -176C8 -190 36 -194 58 -179C40 -181 27 -173 23 -161C46 -136 66 -106 77 -77Q0 -57 -77 -77Z';
        o += p(cone, P.fill, P.line);
        o += ov('M23 -161C46 -136 66 -106 77 -77Q40 -66 10 -64C30 -100 30 -136 6 -164Z', SH);
        o += ov('M-62 -104C-48 -134 -30 -154 -8 -170C-26 -146 -40 -122 -46 -98Z', HL);
        o += p('M-2 -170Q12 -168 23 -161M-30 -144Q-10 -140 6 -144', 'none', P.line, 1.5, 'stroke-opacity=".4"');
        const band = 'M-77 -77L-70 -95Q0 -75 70 -95L77 -77Q0 -57 -77 -77Z';
        o += p(band, trim, DU.line(trim), 2.2) + ov('M-77 -77L-74 -84Q0 -64 74 -84L77 -77Q0 -57 -77 -77Z', SH);
        o += DU.star(0, -67, 11, '#fff7c2', DU.line(trim), 1.8);
        o += p('M57 -179q3 8 2 15', 'none', P.line, 1.5) + DU.star(59, -156, 7.5, '#ffe58a', '#b98a1e', 1.5);
        return o;
      },
    },
    {
      id: 'hat_earmuffs', slot: 'hat', name: 'מחממי אוזניים', tags: ['winter'], price: 0, color: '#ff9ac1',
      draw(R, P) {
        const band = 'M-95 4C-102 -72 -62 -132 0 -132C62 -132 102 -72 95 4';
        const bc = DU.dark(P.base, 0.18);
        let o = p(band, 'none', DU.line(bc), 9.6) + p(band, 'none', bc, 5.2) + p('M-60 -112Q-30 -130 0 -130', 'none', '#fff', 1.8, 'stroke-opacity=".5"');
        const muff = (s) => p(fluffD(s * 94, 14, 25, 10, 0.2), P.fill, P.line, 2.3) +
          ov(`M${s * 94 - 20} 20Q${s * 94} 46 ${s * 94 + 20} 20Q${s * 94} 34 ${s * 94 - 20} 20Z`) +
          ell(s * 94, 12, 13, 13, DU.light(P.base, 0.45), null, 0, 'fill-opacity=".7"') + glint(s * 94 - 8, 2, 5);
        return o + muff(-1) + muff(1);
      },
    },
    {
      id: 'hat_hood', slot: 'hat', name: 'כובע דובי', tags: ['sleepover', 'winter'], price: 0, color: '#c99a6b', coversTop: true,
      draw(R, P) {
        const soft = contrast(P, '#ffe9d2', DU.light(P.base, 0.62)), dk = '#4a2f33';
        const eye = DU.lum(P.base) < 0.32 ? DU.light(P.base, 0.8) : dk;
        let o = brimShade(-50);
        o += DU.both(0, circ(63, -124, 25, P.fill, P.line, 2.4) + circ(63, -123, 13.5, soft) + ov('M40 -118A25 25 0 0 0 86 -116Q64 -100 40 -118Z'));
        const hood = sym(0, [[0, -142], [60, -142, 101, -110, 101, -56], [104, -20, 104, 12, 98, 36], [94, 50, 80, 52, 74, 42], [75, 12, 76, -14, 70, -36], [52, -47, 24, -51, 0, -51]]);
        o += p(hood, P.fill, P.line);
        o += ov(sym(0, [[0, -142], [60, -142, 101, -110, 101, -56], [104, -20, 104, 12, 98, 36], [94, 50, 80, 52, 74, 42], [88, 30, 94, -20, 90, -58], [86, -104, 50, -132, 0, -132]]), SH);
        o += ov('M-70 -112Q-46 -134 -12 -136Q-44 -124 -60 -98Z', HL);
        // little bear face
        o += ell(0, -78, 19, 13.5, soft, null) + p('M-5 -84Q0 -87 5 -84Q3 -78 0 -77Q-3 -78 -5 -84Z', dk) + p('M0 -77v4M-6 -70q3 3 6 -3q3 6 6 3', 'none', dk, 1.7);
        o += DU.both(0, ell(27, -92, 3.8, 4.8, eye) + circ(26, -93.6, 1.3, DU.lum(P.base) < 0.32 ? dk : '#fff') + ell(42, -80, 7, 4.2, '#ff8fa5', null, 0, 'fill-opacity=".55"'));
        // tassels
        o += DU.both(0, p('M86 48v16', 'none', P.line, 2) + pom(86, 70, 8.5, soft, P.line));
        return o;
      },
    },
    {
      id: 'hat_crown', slot: 'hat', name: 'כתר זהב', tags: ['princess'], price: 700, color: 'gold', fixed: true,
      draw(R, P, ctx) {
        const G = ctx.paint('gold', [-60, -172, 90, 86]);
        const d = 'M-49 -104L-55 -147L-39 -127L-27 -157L-13 -129L0 -168L13 -129L27 -157L39 -127L55 -147L49 -104Q0 -89 -49 -104Z';
        let o = p(d, G.fill, '#a86a12', 2.4);
        o += ov('M-49 -104L-55 -147L-39 -127L-36 -112Q0 -98 36 -112L39 -127L55 -147L49 -104Q0 -89 -49 -104Z', 'fill="#c97a12" fill-opacity=".28" stroke="none"');
        o += p('M-50.5 -117Q0 -102 50.5 -117', 'none', '#a86a12', 1.6);
        o += [[-55, -148], [-27, -158], [0, -169], [27, -158], [55, -148]].map((q) => circ(q[0], q[1], 5, '#ffe9a0', '#a86a12', 1.6)).join('');
        o += ell(0, -103, 7, 8, '#ff5f8a', '#a11d47', 1.5) + ell(-1.8, -105.5, 2.2, 2.8, '#fff', null, 0, 'fill-opacity=".7"');
        o += gem(-25, -106, 6, '#5cc8ff') + gem(25, -106, 6, '#5cc8ff') + circ(-41, -109, 3.4, '#c9a2ff', '#6b4bb0', 1.2) + circ(41, -109, 3.4, '#c9a2ff', '#6b4bb0', 1.2);
        o += ov('M-46 -108L-51 -140L-41 -127Z', HL) + ov('M-6 -140L0 -160L3 -136Z', HL);
        o += DU.sparkle(-70, -150, 8, '#fff') + DU.sparkle(68, -168, 6, '#fff7b8') + DU.sparkle(20, -178, 5, '#fff') + DU.sparkle(-34, -176, 4, '#fff7b8');
        return o;
      },
    },
    {
      id: 'hat_wizard', slot: 'hat', name: 'כובע כוכבים', tags: ['magic', 'party'], price: 500, color: 'galaxy', fixed: true, coversTop: true,
      draw(R, P, ctx) {
        const G = ctx.paint('galaxy', [-100, -192, 170, 184]);
        const ln = '#22164f';
        const cone = 'M-93 -68C-78 -116 -50 -158 -14 -178C6 -190 36 -190 51 -172C59 -162 63 -150 61 -138C53 -150 41 -156 30 -155C56 -128 80 -98 93 -68Q0 -46 -93 -68Z';
        let o = brimShade(-46);
        o += p(cone, G.fill, ln);
        o += ov('M30 -155C56 -128 80 -98 93 -68Q50 -56 14 -54C40 -90 40 -126 12 -162Z', SH);
        o += ov('M-78 -92C-62 -132 -40 -156 -12 -172C-34 -148 -52 -118 -60 -88Z', HL);
        const Y = '#ffe58a';
        o += [[-34, -108, 9], [26, -124, 7], [-8, -148, 6], [50, -90, 7.5], [-60, -84, 5.5], [8, -92, 5]].map((q) => `<path d="${DU.starD(q[0], q[1], q[2])}" fill="${Y}"/>`).join('');
        o += DU.sparkle(-14, -128, 4.5, '#fff') + DU.sparkle(34, -148, 3.6, '#fff') + DU.sparkle(-44, -138, 3.5, '#fff') + DU.sparkle(66, -108, 3.5, '#fff') +
          circ(14, -110, 1.6, '#fff') + circ(-22, -92, 1.6, '#fff') + circ(6, -166, 1.5, '#fff') + circ(36, -100, 1.4, '#fff');
        o += `<path d="M-4 -116A11 11 0 1 0 9 -99A13 13 0 0 1 -4 -116Z" fill="${Y}"/>`;
        const rim = sym(0, [[0, -72], [36, -72, 72, -78, 95, -86], [101, -78, 101, -64, 96, -56], [70, -48, 34, -44, 0, -44]]);
        o += p(rim, '#f6ecff', '#6a4aa8') + ov('M-96 -60Q0 -42 96 -60L96 -56Q0 -36 -96 -56Z', SH);
        o += [-72, -36, 0, 36, 72].map((x, i) => DU.sparkle(x, -59 - 9 * (x / 96) * (x / 96), i % 2 ? 4 : 5.5, i % 2 ? '#c9a2ff' : '#ffd24d')).join('');
        o += p('M60 -140v10', 'none', ln, 1.5) + DU.star(60, -121, 10, Y, '#b98a1e', 1.6) + DU.sparkle(77, -140, 5, '#fff');
        return o;
      },
    },

    /* ======================= HAIR ACCESSORIES ======================= */
    {
      id: 'ha_bow', slot: 'hairacc', name: 'סרט גדול', tags: ['party', 'school'], price: 0, color: '#ff6f91',
      draw(R, P) {
        return rot(14, 44, -112, DU.bow(44, -112, 38, P.fill, P.line, true) + ov('M16 -118Q26 -134 40 -122Q28 -124 22 -112Z', HL) + ov('M52 -122Q66 -136 78 -120Q66 -126 58 -114Z', HL));
      },
    },
    {
      id: 'ha_twobows', slot: 'hairacc', name: 'שני סרטים', tags: ['school', 'sleepover'], price: 0, color: '#b48cff',
      draw(R, P) {
        return rot(-32, -66, -98, DU.bow(-66, -98, 21, P.fill, P.line)) + rot(32, 66, -98, DU.bow(66, -98, 21, P.fill, P.line));
      },
    },
    {
      id: 'ha_headband', slot: 'hairacc', name: 'קשת', tags: ['school', 'sport'], price: 0, color: '#ff9ac1',
      draw(R, P) {
        const d = 'M-94 -30C-93 -86 -52 -116 0 -116C52 -116 93 -86 94 -30L83 -30C81 -78 46 -103 0 -103C-46 -103 -81 -78 -83 -30Z';
        return p(d, P.fill, P.line) + ov('M-80 -62C-68 -92 -36 -108 0 -110C-32 -104 -58 -88 -72 -58Z', HL) + ov('M94 -30C93 -86 52 -116 0 -116C50 -110 84 -80 86 -30Z', SH);
      },
    },
    {
      id: 'ha_catears', slot: 'hairacc', name: 'אוזני חתול', tags: ['party', 'magic'], price: 0, color: '#3a3346',
      draw(R, P) {
        const pink = DU.lum(P.base) > 0.8 ? '#ff9ac1' : '#ffc1d9';
        const ear = p('M24 -117C35 -141 52 -160 70 -170C80 -147 86 -116 85 -86C66 -93 43 -104 24 -117Z', P.fill, P.line) +
          `<path d="M40 -117C47 -133 57 -146 67 -154C73 -138 76 -118 76 -100C64 -104 51 -110 40 -117Z" fill="${pink}"/>` +
          ov('M67 -154C73 -138 76 -118 76 -100L70 -103C70 -120 68 -138 64 -150Z', SH) +
          p('M30 -116l-4 -7M37 -111l-3 -8M79 -90l5 -6', 'none', P.line, 1.6, 'stroke-opacity=".7"');
        const band = 'M-92 -40C-88 -88 -50 -112 0 -112C50 -112 88 -88 92 -40';
        return p(band, 'none', P.line, 6.6) + p(band, 'none', P.fill, 3.4) + DU.both(0, ear);
      },
    },
    {
      id: 'ha_bunny', slot: 'hairacc', name: 'אוזני ארנב', tags: ['party', 'sleepover'], price: 0, color: '#ffffff',
      draw(R, P) {
        const pink = DU.lum(P.base) > 0.8 ? '#ffb3cd' : '#ffd3e2';
        const up = p('M-17 -112C-24 -146 -16 -182 0 -186C16 -182 24 -146 17 -112Z', P.fill, P.line) +
          `<path d="M-8 -116C-13 -144 -8 -170 0 -173C8 -170 13 -144 8 -116Z" fill="${pink}"/>` + ov('M0 -186C16 -182 24 -146 17 -112L11 -113C16 -146 12 -172 0 -180Z', SH);
        // the other ear folds over at the tip
        const flop = p('M-17 -112C-22 -134 -21 -152 -15 -164L15 -160C19 -146 19 -128 17 -112Z', P.fill, P.line) +
          `<path d="M-8 -116C-12 -134 -11 -150 -7 -160L8 -158C11 -146 11 -130 8 -116Z" fill="${pink}"/>` +
          ov('M-15 -164L15 -160L17 -148Q0 -150 -18 -153Z', SH) +
          p('M-15 -164C-12 -179 4 -185 18 -177C33 -168 43 -150 39 -134C37 -127 30 -127 27 -134C24 -146 20 -154 15 -160Z', P.fill, P.line) +
          ov('M18 -177C33 -168 43 -150 39 -134C37 -127 30 -127 27 -134C32 -148 28 -164 18 -177Z', SH);
        const band = 'M-92 -40C-88 -88 -50 -112 0 -112C50 -112 88 -88 92 -40';
        return p(band, 'none', P.line, 6.6) + p(band, 'none', P.fill, 3.4) +
          `<g transform="translate(-34 0) rotate(-13 0 -112)">${up}</g><g transform="translate(34 0) rotate(13 0 -112)">${flop}</g>` +
          DU.bow(0, -112, 13, '#ff9ac1', '#a8456a');
      },
    },
    {
      id: 'ha_flower', slot: 'hairacc', name: 'פרח', tags: ['beach', 'nature'], price: 0, color: '#ff6f91',
      draw(R, P) {
        return leaf(70, -64, 30, -150) + leaf(74, -52, 28, 60) + leaf(80, -62, 24, -30) +
          DU.flower(72, -60, 23, P.fill, contrast(P, '#ffb347', '#ffd54d'), 5) + circ(69, -63, 2.4, '#fff', null, 0, 'fill-opacity=".7"');
      },
    },
    {
      id: 'ha_clips', slot: 'hairacc', name: 'סיכות', tags: ['school', 'sleepover'], price: 0, color: '#ff6f91',
      draw(R, P) {
        return rot(-14, -58, -62, DU.star(-58, -62, 12.5, '#ffd54d', '#a87412', 1.9) + circ(-61, -65, 2.2, '#fff', null, 0, 'fill-opacity=".8"')) +
          rot(-20, -72, -36, DU.heart(-72, -36, 10, P.fill, P.line, 1.9) + circ(-76, -40, 2, '#fff', null, 0, 'fill-opacity=".8"')) +
          p('M56 -66l22 6', 'none', P.line, 7.4) + p('M56 -66l22 6', 'none', DU.light(P.base, 0.35), 4.4);
      },
    },
    {
      id: 'ha_flowercrown', slot: 'hairacc', name: 'זר פרחים', tags: ['nature', 'princess'], price: 0, color: '#ff9ac1',
      draw(R, P) {
        const yAt = (x) => -57 - 11 * (x / 94) * (x / 94);
        let o = p('M-94 -68Q0 -46 94 -68', 'none', '#4f9d5d', 5) ;
        [-80, -52, -22, 22, 52, 80].forEach((x, i) => { o += leaf(x, yAt(x) - 2, 17, i % 2 ? -50 : -130) + leaf(x, yAt(x) + 3, 14, i % 2 ? 130 : 50); });
        const cols = [P.fill, '#ffffff', DU.light(P.base, 0.45), '#fff2a8'];
        [[-91, 10, 2], [-64, 12.5, 1], [-34, 13, 0], [0, 16, 1], [34, 13, 0], [64, 12.5, 2], [91, 10, 1]].forEach((q, i) => {
          const c = cols[q[2] === 0 ? 0 : q[2] === 1 ? 1 : 2];
          o += DU.flower(q[0], yAt(q[0]) - 1, q[1], c, c === '#ffffff' ? '#ffd54d' : '#fff2a8', i % 2 ? 6 : 5);
        });
        return o;
      },
    },
    {
      id: 'ha_sleepmask', slot: 'hairacc', name: 'מסכת שינה', tags: ['sleepover'], price: 0, color: '#b48cff',
      draw(R, P) {
        const strap = DU.dark(P.base, 0.2);
        let o = DU.both(0, p('M58 -82L93 -72L92 -60L58 -66Z', strap, DU.line(strap), 2));
        const mask = sym(0, [[0, -89], [30, -94, 60, -91, 65, -74], [68, -58, 52, -49, 35, -49], [20, -49, 10, -55, 0, -60]]);
        o += p(mask, P.fill, P.line) + ov(sym(0, [[0, -62], [10, -56, 20, -50, 35, -50], [52, -50, 66, -58, 65, -74], [60, -58, 40, -56, 0, -66]]), SH);
        o += p(sym(0, [[0, -84], [28, -88, 54, -86, 59, -73], [61, -62, 49, -55, 35, -55], [22, -55, 12, -60, 0, -65]]), 'none', '#fff', 1.4, 'stroke-opacity=".7" stroke-dasharray="3.5 3.5"');
        const lash = contrast(P, '#7b5bd6', '#ffffff');
        o += DU.both(0, p('M22 -72Q33 -62 46 -72M26 -67l-3 5M34 -65v6M42 -67l3 5', 'none', lash, 2.4));
        return o;
      },
    },
    {
      id: 'ha_sweatband', slot: 'hairacc', name: 'סרט ספורט', tags: ['sport'], price: 0, color: '#3fbf9a',
      draw(R, P) {
        const band = sym(0, [[0, -68], [34, -68, 70, -72, 93, -78], [95, -72, 95, -64, 92, -58], [70, -52, 34, -48, 0, -48]]);
        return p(band, P.fill, P.line) + p('M-93 -71.5Q0 -52.5 93 -71.5M-93 -65Q0 -46 93 -65', 'none', contrast(P, '#5cc8ff', '#ffffff'), 2.6, 'stroke-opacity=".9"') +
          ov('M-92 -62Q0 -42 92 -62L92 -58Q0 -38 -92 -58Z', SH);
      },
    },
    {
      id: 'ha_tiara', slot: 'hairacc', name: 'טיארה', tags: ['princess', 'party'], price: 500, color: 'silver', fixed: true,
      draw(R, P, ctx) {
        const S = ctx.paint('silver', [-64, -150, 80, 70]);
        const ln = '#6d76a0';
        const d = sym(0, [[0, -146], [5, -128, 9, -118, 13, -113], [16, -118, 19, -124, 23, -128], [27, -116, 31, -108, 35, -103], [38, -107, 41, -110, 45, -113], [52, -104, 58, -94, 63, -80], [42, -93, 21, -94, 0, -94]]);
        let o = p(d, S.fill, ln, 2.2);
        o += ov(sym(0, [[0, -146], [5, -128, 9, -118, 13, -113], [10, -104], [0, -104]]), HL) + p('M-58 -88Q0 -110 58 -88', 'none', ln, 1.5, 'stroke-opacity=".6"');
        o += DU.heart(0, -116, 9.5, '#ff6f91', '#a11d47', 1.6) + ell(-3, -119, 2.2, 1.6, '#fff', null, 0, 'fill-opacity=".8"');
        o += DU.both(0, gem(23, -110, 6, '#5cc8ff') + circ(45, -101, 3.6, '#c9a2ff', '#6b4bb0', 1.2) + circ(23, -129, 3.2, '#fff', ln, 1.3) + circ(45, -114, 2.8, '#fff', ln, 1.3));
        o += circ(0, -147, 4, '#fff', ln, 1.4);
        o += DU.sparkle(-36, -138, 7, '#fff') + DU.sparkle(40, -134, 5, '#fff') + DU.sparkle(14, -154, 4, '#e3f4ff');
        return o;
      },
    },
    {
      id: 'ha_unicorn', slot: 'hairacc', name: 'קרן חד-קרן', tags: ['magic'], price: 600, color: 'mermaid', fixed: true,
      draw(R, P, ctx) {
        const H = ctx.paint('mermaid', [-18, -190, 30, 86]);
        const ln = '#7a5aa8';
        const horn = 'M-15 -110Q-6 -154 1 -188Q8 -154 15 -110Q0 -101 -15 -110Z';
        let stripes = '';
        for (let y = -108; y > -188; y -= 14) stripes += `M-18 ${y}Q0 ${y - 3} 18 ${y - 15}`;
        const ear = p('M24 -115Q28 -142 44 -150Q54 -130 51 -106Q38 -108 24 -115Z', '#fff', '#a79cc8', 2.2) + `<path d="M32 -116Q35 -134 43 -140Q48 -126 46 -111Z" fill="#ffc1d9"/>`;
        let o = DU.both(0, ear);
        o += p(horn, H.fill, ln, 2.2) + DU.clip(ctx.id('uh'), horn, p(stripes, 'none', ln, 1.8, 'stroke-opacity=".55"') + ov('M-15 -110Q-6 -154 1 -188L1 -104Z', HL));
        o += leaf(-22, -106, 16, 200) + leaf(22, -106, 16, -20);
        o += DU.flower(-20, -108, 10, '#ff9ac1', '#fff2a8') + DU.flower(20, -108, 10, '#c9a2ff', '#fff2a8') + DU.flower(0, -103, 11.5, '#ffffff', '#ffd54d', 6);
        o += DU.sparkle(-22, -164, 6.5, '#fff') + DU.sparkle(22, -150, 5, '#fff7b8') + DU.sparkle(17, -180, 4, '#fff') + DU.sparkle(-28, -138, 3.5, '#ffe1f0');
        return o;
      },
    },
    {
      id: 'ha_halo', slot: 'hairacc', name: 'הילה', tags: ['magic'], price: 400, color: 'gold', fixed: true,
      draw(R, P, ctx) {
        const G = ctx.paint('gold', [-50, -172, 60, 28]);
        let o = ell(0, -156, 60, 19, '#fff3b0', null, 0, 'fill-opacity=".28"');
        o += ell(0, -156, 46, 11.5, 'none', '#b07a18', 10) + ell(0, -156, 46, 11.5, 'none', G.fill, 6.2);
        o += p('M-40 -161Q-20 -170 6 -170', 'none', '#fff', 2, 'stroke-opacity=".8"');
        o += DU.sparkle(-62, -170, 7, '#fff') + DU.sparkle(60, -146, 6, '#fff7b8') + DU.sparkle(34, -176, 4.5, '#fff') + DU.sparkle(-30, -134, 3.6, '#fff7b8');
        return o;
      },
    },

    /* ======================= GLASSES ======================= */
    {
      id: 'gl_round', slot: 'glasses', name: 'משקפיים עגולים', tags: ['school'], price: 0, color: '#3a3346',
      draw(R, P) {
        const lens = frame(DU.ellD(38, 9, 28, 28), P, 3.4, CLEAR) + p('M20 -6l9 -9M26 2l5 -5', 'none', '#fff', 2.6, 'stroke-opacity=".75"') + frame('M66 3L83 -3', P, 3);
        return frame('M-10.5 3Q0 -5 10.5 3', P, 3) + DU.both(0, lens);
      },
    },
    {
      id: 'gl_square', slot: 'glasses', name: 'משקפיים מרובעים', tags: ['school'], price: 0, color: '#e0435f',
      draw(R, P) {
        const d = 'M21 -15H55Q66 -15 66 -4V20Q66 31 55 31H21Q10 31 10 20V-4Q10 -15 21 -15Z';
        const lens = frame(d, P, 3.6, CLEAR) + p('M19 -5l9 -7M24 3l5 -4', 'none', '#fff', 2.6, 'stroke-opacity=".75"') + frame('M66 -2L83 -6', P, 3);
        return frame('M-10 3Q0 -3 10 3', P, 3) + DU.both(0, lens);
      },
    },
    {
      id: 'gl_sun', slot: 'glasses', name: 'משקפי שמש', tags: ['beach'], price: 0, color: '#3a3346',
      draw(R, P) {
        const d = 'M9 -12Q38 -21 68 -14Q73 8 62 24Q48 36 30 32Q10 26 8 3Z';
        const lens = frame(d, P, 3.8, 'fill="#241a3a" fill-opacity=".55"') + p('M18 -6l12 -8M27 0l6 -4', 'none', '#fff', 2.8, 'stroke-opacity=".7"') + frame('M68 -8L84 -8', P, 3.2);
        return frame('M-9 -4Q0 -10 9 -4', P, 3.4) + DU.both(0, lens);
      },
    },
    {
      id: 'gl_heart', slot: 'glasses', name: 'משקפי לב', tags: ['party', 'beach'], price: 0, color: '#ff6f91',
      draw(R, P) {
        const d = DU.heartD(39, 8, 31);
        const lens = frame(d, P, 3.6, `fill="${P.fill}" fill-opacity=".3"`) + p('M22 -8l7 -7M27 -1l4 -4', 'none', '#fff', 2.6, 'stroke-opacity=".8"') + frame('M67 -4L84 -8', P, 3);
        return frame('M-12 -2Q0 -8 12 -2', P, 3) + DU.both(0, lens);
      },
    },
    {
      id: 'gl_ski', slot: 'glasses', name: 'משקפי סקי', tags: ['winter', 'sport'], price: 0, color: '#5cc8ff',
      draw(R, P, ctx) {
        const L = ctx.paint('sunset', [-66, -104, 100, 52]);
        const strapC = DU.dark(P.base, 0.3);
        let o = DU.both(0, p('M66 -96L94 -84L94 -62L66 -68Z', strapC, DU.line(strapC), 2) + p('M68 -84L94 -73', 'none', '#fff', 2.4, 'stroke-opacity=".8"'));
        const fr = sym(0, [[0, -106], [34, -109, 62, -106, 72, -98], [80, -90, 78, -70, 68, -62], [50, -54, 26, -56, 13, -64], [8, -70, 4, -72, 0, -72]]);
        const ln = sym(0, [[0, -98], [30, -101, 54, -99, 63, -93], [69, -87, 68, -74, 61, -69], [46, -63, 28, -64, 17, -71], [10, -78, 5, -80, 0, -80]]);
        o += p(fr, P.fill, P.line) + ov(sym(0, [[0, -72], [4, -72, 8, -70, 13, -64], [26, -56, 50, -54, 68, -62], [78, -70, 80, -90, 72, -98], [72, -76, 50, -64, 0, -76]]), SH);
        o += p(ln, L.fill, '#7a3f5a', 1.8) + ov(ln, 'fill="#ffffff" fill-opacity=".12" stroke="none"');
        o += p('M-50 -90l14 -6M-44 -80l22 -10M22 -92l10 -4', 'none', '#fff', 3, 'stroke-opacity=".7"');
        return o;
      },
    },
    {
      id: 'gl_star', slot: 'glasses', name: 'משקפי כוכב', tags: ['party', 'magic'], price: 400, color: 'glitter:#ffb400', fixed: true,
      draw(R, P) {
        const d = DU.starD(39.5, 9, 36, 5, 0.63);
        const lens = `<path d="${d}" fill="#fff2a8" fill-opacity=".28"/><path d="${d}" fill="none" stroke="#9a5a10" stroke-width="7.6"/><path d="${d}" fill="none" stroke="${P.fill}" stroke-width="4.8"/>` +
          p('M24 -6l7 -7M29 1l4 -4', 'none', '#fff', 2.6, 'stroke-opacity=".8"') + `<path d="M70 0L85 -5" fill="none" stroke="#9a5a10" stroke-width="5.6"/><path d="M70 0L85 -5" fill="none" stroke="#ffc933" stroke-width="3"/>`;
        return `<path d="M-8 2Q0 -3 8 2" fill="none" stroke="#9a5a10" stroke-width="5.6"/><path d="M-8 2Q0 -3 8 2" fill="none" stroke="#ffc933" stroke-width="3"/>` +
          DU.both(0, lens) + DU.sparkle(76, -30, 7, '#fff') + DU.sparkle(-78, -26, 5.5, '#fff') + DU.sparkle(-2, -22, 4, '#fff7b8') + DU.sparkle(62, 44, 4, '#fff');
      },
    },

    /* ======================= EARRINGS (lobes ≈ ±85, 31) ======================= */
    {
      id: 'ear_studs', slot: 'earrings', name: 'עגילים קטנים', tags: [], price: 0, color: '#ffd24d',
      draw(R, P) { return DU.both(0, circ(85, 32, 5.6, P.fill, P.line, 1.8) + circ(83.4, 30.4, 1.7, '#fff', null, 0, 'fill-opacity=".85"')); },
    },
    {
      id: 'ear_hoops', slot: 'earrings', name: 'חישוקים', tags: ['party'], price: 0, color: '#ffd24d',
      draw(R, P) {
        return DU.both(0, circ(86, 44, 12, 'none', P.line, 5.6) + circ(86, 44, 12, 'none', P.fill, 3) + p('M77 38A12 12 0 0 1 84 32.4', 'none', '#fff', 1.6, 'stroke-opacity=".8"') + circ(85, 31, 2.6, P.fill, P.line, 1.4));
      },
    },
    {
      id: 'ear_stars', slot: 'earrings', name: 'כוכבים', tags: ['magic', 'party'], price: 0, color: '#ffd24d',
      draw(R, P) {
        return DU.both(0, p('M85 32v8', 'none', P.line, 1.6) + circ(85, 31, 2.6, P.fill, P.line, 1.4) + DU.star(85, 49, 10.5, P.fill, P.line, 1.8) + circ(82.5, 46.5, 1.8, '#fff', null, 0, 'fill-opacity=".85"'));
      },
    },
    {
      id: 'ear_hearts', slot: 'earrings', name: 'לבבות', tags: ['party'], price: 0, color: '#ff6f91',
      draw(R, P) {
        return DU.both(0, p('M85 32v7', 'none', P.line, 1.6) + circ(85, 31, 2.6, P.fill, P.line, 1.4) + DU.heart(85, 47, 9, P.fill, P.line, 1.8) + circ(81.5, 44, 1.8, '#fff', null, 0, 'fill-opacity=".85"'));
      },
    },
    {
      id: 'ear_pearls', slot: 'earrings', name: 'פנינים', tags: ['princess'], price: 0, color: '#fff4ee', fixed: true,
      draw() {
        const ln = '#b79aa6';
        return DU.both(0, circ(85, 31, 3.4, '#fff4ee', ln, 1.4) + p('M85 34v5', 'none', ln, 1.4) + circ(85, 46, 7.6, '#fff4ee', ln, 1.8) +
          `<path d="M79 49A7.6 7.6 0 0 0 92 48Q86 52 79 49Z" fill="#f2b8c9" fill-opacity=".6"/>` + circ(82.6, 43.2, 2.3, '#fff'));
      },
    },
    {
      id: 'ear_flowers', slot: 'earrings', name: 'פרחים', tags: ['nature', 'beach'], price: 0, color: '#ff9ac1',
      draw(R, P) { return DU.both(0, DU.flower(86, 38, 10.5, P.fill, contrast(P, '#ffb347', '#ffd54d'), 5)); },
    },
    {
      id: 'ear_gems', slot: 'earrings', name: 'יהלומים', tags: ['princess', 'party'], price: 450, color: 'glitter:#5cc8ff', fixed: true,
      draw(R, P) {
        const ln = '#2f6f9a';
        const drop = 'M85 40L93 52Q93 63 85 66Q77 63 77 52Z';
        return DU.both(0, gem(85, 32, 5, '#ffffff') + p(drop, P.fill, ln, 1.8) + p('M77 52H93M85 40L81 52L85 66L89 52Z', 'none', '#fff', 1.1, 'stroke-opacity=".8"') +
          `<path d="M85 40L77 52H81Z" fill="#fff" fill-opacity=".5"/>`) + DU.sparkle(100, 40, 5.5, '#fff') + DU.sparkle(-101, 58, 4.5, '#fff') + DU.sparkle(-72, 34, 3, '#e3f4ff');
      },
    },
  ]);
})();
