/* acc-head2.js — MORE hats, hair accessories, glasses and earrings (style-challenge pieces too).
   Same rules as acc-head.js: head coordinates (origin between the eyes, skull top y=-108,
   chin y=+90; the hair cap reaches y≈-126 and x≈±92; eyes at (±38, 9); ear lobes ≈ (±85, 31)).
   Hats are seen a little from above: the rim dips over the forehead and hugs the head at the sides.
   Nothing here goes higher than y ≈ -186 (the tallest girl has little headroom). */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const { n, p, ov, sym } = DU;
  const SH = DU.SH, SH2 = DU.SH2, HL = DU.HL;

  /* ---------- little helpers (same as acc-head.js) ---------- */
  const ell = (cx, cy, rx, ry, fill, line, sw = 2.4, extra = '') =>
    `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill || 'none'}"${line ? ` stroke="${line}" stroke-width="${sw}"` : ''}${extra ? ' ' + extra : ''}/>`;
  const circ = (cx, cy, r, fill, line, sw = 2, extra = '') => ell(cx, cy, r, r, fill, line, sw, extra);
  const glint = (cx, cy, r) => `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(r)}" ry="${n(r * 0.7)}" fill="#fff" fill-opacity=".8" transform="rotate(-30 ${n(cx)} ${n(cy)})"/>`;
  const rot = (deg, x, y, svg) => `<g transform="rotate(${deg} ${n(x)} ${n(y)})">${svg}</g>`;
  const at = (x, y, deg, svg, sc = 1) => `<g transform="translate(${n(x)} ${n(y)}) rotate(${deg})${sc !== 1 ? ` scale(${sc})` : ''}">${svg}</g>`;
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
  const frame = (d, P, w = 3.6, lens = '') =>
    (lens ? `<path d="${d}" ${lens}/>` : '') + `<path d="${d}" fill="none" stroke="${P.line}" stroke-width="${w + 2.8}"/><path d="${d}" fill="none" stroke="${P.fill}" stroke-width="${w}"/>`;
  const CLEAR = 'fill="#ffffff" fill-opacity=".18"';
  const contrast = (P, a, b) => (DU.lum(P.base) > 0.72 ? a : b);
  const brimShade = (y) => ov(`M-82 ${y - 6}Q0 ${y + 6} 82 ${y - 6}Q0 ${y + 22} -82 ${y - 6}Z`, SH);
  const gem = (x, y, r, c) =>
    `<path d="M${n(x)} ${n(y - r)}L${n(x + r * 0.85)} ${n(y)}L${n(x)} ${n(y + r)}L${n(x - r * 0.85)} ${n(y)}Z" fill="${c}" stroke="${DU.line(c)}" stroke-width="1.3"/><path d="M${n(x)} ${n(y - r)}L${n(x - r * 0.85)} ${n(y)}L${n(x)} ${n(y - r * 0.1)}Z" fill="#fff" fill-opacity=".55"/>`;
  /* an outlined stroke: dark under, colour on top (bands, straps, springs) */
  const cord = (d, fill, line, w = 3.2) => p(d, 'none', line, w + 2.8) + p(d, 'none', fill, w);
  /* several shapes as ONE fluffy silhouette (fur trims, clouds) */
  const blob = (cs, fill, line, sw = 2) =>
    cs.map((c) => circ(c[0], c[1], c[2], fill, line, sw * 2)).join('') + cs.map((c) => circ(c[0], c[1], c[2], fill)).join('');
  /* a feather lying along +x from (0,0), length len */
  function feather(len, fill, line, tip) {
    const w = len * 0.2;
    const d = `M0 0C${n(len * 0.18)} ${n(-w)} ${n(len * 0.68)} ${n(-w * 1.15)} ${n(len)} 0C${n(len * 0.7)} ${n(w * 1.05)} ${n(len * 0.22)} ${n(w)} 0 0Z`;
    let o = p(d, fill, line, 1.9);
    if (tip) o += `<path d="M${n(len * 0.7)} ${n(-w * 0.86)}Q${n(len * 0.9)} ${n(-w * 0.5)} ${n(len)} 0Q${n(len * 0.88)} ${n(w * 0.5)} ${n(len * 0.7)} ${n(w * 0.78)}Q${n(len * 0.78)} 0 ${n(len * 0.7)} ${n(-w * 0.86)}Z" fill="${tip}"/>`;
    o += p(`M${n(-len * 0.12)} 0H${n(len * 0.92)}`, 'none', line, 1.5);
    let barbs = '';
    for (let i = 1; i <= 4; i++) { const x = len * (0.16 + i * 0.15); barbs += `M${n(x)} 0l${n(len * 0.09)} ${n(-w * 0.72)}M${n(x)} 0l${n(len * 0.09)} ${n(w * 0.66)}`; }
    return o + p(barbs, 'none', line, 1.1, 'stroke-opacity=".45"');
  }
  /* a little butterfly centred on (0,0), about 40 wide */
  function bfly(c1, c2, line) {
    const up = `M0 -1C-3 -15 -17 -19 -21 -9C-23 0 -11 5 0 1Z`, lo = `M0 1C-11 2 -17 9 -12 15C-7 19 -2 10 0 3Z`;
    const side = p(up, c1, line, 1.6) + p(lo, c2, line, 1.6) + circ(-13, -8, 2.6, '#fff', null, 0, 'fill-opacity=".8"') + circ(-9, 10, 1.7, '#fff', null, 0, 'fill-opacity=".8"');
    return side + `<g transform="scale(-1 1)">${side}</g>` + ell(0, 1, 2, 8, line) + p('M-1 -6Q-5 -13 -8 -14M1 -6Q5 -13 8 -14', 'none', line, 1.2);
  }
  /* a hibiscus: five broad petals, a dark throat and a long stamen */
  function hibiscus(x, y, r, P) {
    const petal = `M0 0C${n(-r * 0.62)} ${n(-r * 0.3)} ${n(-r * 0.66)} ${n(-r * 0.98)} 0 ${n(-r)}C${n(r * 0.66)} ${n(-r * 0.98)} ${n(r * 0.62)} ${n(-r * 0.3)} 0 0Z`;
    let o = '';
    for (let i = 0; i < 5; i++) o += `<g transform="rotate(${i * 72 + 12})">${p(petal, P.fill, P.line, 1.8)}${p(`M0 ${n(-r * 0.25)}V${n(-r * 0.8)}`, 'none', P.line, 1.1, 'stroke-opacity=".4"')}</g>`;
    const dk = DU.dark(P.base, 0.35), st = contrast(P, '#ff9a56', '#ffd54d');
    o += circ(0, 0, r * 0.24, dk) + p(`M0 0Q${n(r * 0.3)} ${n(-r * 0.3)} ${n(r * 0.66)} ${n(-r * 0.52)}`, 'none', DU.line(st), 4.4) + p(`M0 0Q${n(r * 0.3)} ${n(-r * 0.3)} ${n(r * 0.66)} ${n(-r * 0.52)}`, 'none', st, 2.4) +
      circ(r * 0.7, -r * 0.56, 2.6, st, DU.line(st), 1) + circ(r * 0.56, -r * 0.6, 2, st, DU.line(st), 1) + circ(r * 0.72, -r * 0.4, 2, st, DU.line(st), 1);
    return `<g transform="translate(${n(x)} ${n(y)})">${o}</g>`;
  }
  const cloud = (x, y, k) => blob([[x - 9 * k, y + 2 * k, 7 * k], [x, y - 3 * k, 9 * k], [x + 10 * k, y + 2 * k, 7 * k]], '#ffffff', '#a79cc8', 1.6);

  const STRAW = '#f6dea6', STRAW_L = '#a67c45';
  const GOLD = '#ffd24d', GOLD_L = '#a87412';
  const HEADBAND = 'M-92 -40C-88 -88 -50 -112 0 -112C50 -112 88 -88 92 -40';

  DU.addItems([
    /* ======================= HATS ======================= */
    {
      id: 'hat_boater', slot: 'hat', name: 'כובע קש בריטי', tags: ['british', 'paris'], price: 0, color: '#3a4a8f', coversTop: true,
      draw(R, P) {
        let o = brimShade(-48);
        o += ell(0, -72, 136, 21, STRAW, STRAW_L);
        o += ell(0, -71, 118, 16, 'none', STRAW_L, 1.4, 'stroke-opacity=".3"') + ell(0, -70, 100, 11.5, 'none', STRAW_L, 1.4, 'stroke-opacity=".3"');
        o += ov('M-136 -72A136 21 0 0 0 136 -72A136 14 0 0 1 -136 -72Z', HL);
        const wall = 'M-83 -78L-79 -127Q0 -113 79 -127L83 -78Q0 -60 -83 -78Z';
        o += p(wall, STRAW, STRAW_L) + ov('M40 -120Q62 -122 79 -127L83 -78Q64 -68 44 -66Z', SH);
        o += p('M-80 -112Q0 -97 80 -112', 'none', STRAW_L, 1.4, 'stroke-opacity=".3"');
        const band = 'M-83 -78L-81 -103Q0 -87 81 -103L83 -78Q0 -60 -83 -78Z';
        o += p(band, P.fill, P.line, 2.2) + p('M-82 -91Q0 -74 82 -91', 'none', contrast(P, '#e0435f', '#ffffff'), 3.4, 'stroke-opacity=".9"');
        o += ov('M-83 -78L-82.5 -84Q0 -66 82.5 -84L83 -78Q0 -60 -83 -78Z', SH);
        o += ell(0, -127, 79, 13.5, DU.light(STRAW, 0.3), STRAW_L) + ell(0, -127, 62, 9.5, 'none', STRAW_L, 1.3, 'stroke-opacity=".3"') + ell(0, -127, 42, 6, 'none', STRAW_L, 1.3, 'stroke-opacity=".3"');
        o += DU.bow(66, -88, 15, P.fill, P.line, true);
        return o;
      },
    },
    {
      id: 'hat_cowboy', slot: 'hat', name: 'כובע בוקרים', tags: ['cowgirl'], price: 0, color: '#b9814a', coversTop: true,
      draw(R, P) {
        const dk = DU.dark(P.base, 0.3);
        let o = brimShade(-44);
        const brim = 'M-148 -106C-160 -74 -104 -46 0 -44C104 -46 160 -74 148 -106C130 -84 84 -69 0 -69C-84 -69 -130 -84 -148 -106Z';
        o += p(brim, P.fill, P.line);
        o += ov('M-148 -106C-130 -84 -84 -69 0 -69C84 -69 130 -84 148 -106C134 -76 90 -60 0 -60C-90 -60 -134 -76 -148 -106Z', SH);
        o += ov('M-136 -74C-104 -52 -60 -48 0 -47C60 -48 104 -52 136 -74C104 -57 60 -52 0 -52C-60 -52 -104 -57 -136 -74Z', HL);
        o += p('M-142 -92C-140 -70 -98 -54 0 -52C98 -54 140 -70 142 -92', 'none', P.line, 1.4, 'stroke-opacity=".4" stroke-dasharray="5 4.5"');
        const crown = 'M-81 -74C-87 -112 -75 -150 -44 -158C-26 -162 -12 -153 0 -146C12 -153 26 -162 44 -158C75 -150 87 -112 81 -74Q0 -55 -81 -74Z';
        o += p(crown, P.fill, P.line);
        o += p('M0 -146Q-5 -128 0 -110', 'none', P.line, 1.7, 'stroke-opacity=".5"') + ov('M0 -146Q-9 -128 0 -106Q10 -128 0 -146Z', SH);
        o += ov('M44 -158C75 -150 87 -112 81 -74Q56 -65 30 -62C56 -94 60 -134 34 -159Z', SH);
        o += ov('M-72 -112C-70 -136 -58 -150 -42 -154C-54 -140 -60 -124 -61 -104Z', HL);
        const band = 'M-81 -74L-82.5 -93Q0 -74 82.5 -93L81 -74Q0 -55 -81 -74Z';
        o += p(band, dk, DU.line(dk), 2.2) + p('M-82 -84Q0 -65 82 -84', 'none', '#fff', 1.5, 'stroke-opacity=".5" stroke-dasharray="4 4"');
        o += DU.star(0, -70, 11, GOLD, GOLD_L, 1.8) + circ(-3, -73, 2, '#fff', null, 0, 'fill-opacity=".8"');
        return o;
      },
    },
    {
      id: 'hat_pirate', slot: 'hat', name: 'כובע פיראטים', tags: ['pirate'], price: 0, color: '#3a3346', coversTop: true,
      draw(R, P) {
        const trim = contrast(P, '#7b5bd6', GOLD), trimL = DU.line(trim);
        let o = brimShade(-46);
        // the feather, tucked behind the hat
        o += p('M58 -120C70 -158 100 -184 138 -172C120 -168 108 -152 102 -132C96 -116 78 -108 58 -120Z', '#ffffff', '#b9aed6', 2) +
          p('M64 -124C78 -150 100 -168 128 -172M78 -132l12 -22M88 -126l14 -24M70 -140l8 -18', 'none', '#b9aed6', 1.3, 'stroke-opacity=".8"') +
          ov('M58 -120C76 -128 96 -142 110 -160C104 -140 92 -116 58 -120Z', 'fill="#ff9ac1" fill-opacity=".35" stroke="none"');
        const body = 'M-130 -80C-112 -62 -60 -50 0 -48C60 -50 112 -62 130 -80C118 -118 70 -154 0 -162C-70 -154 -118 -118 -130 -80Z';
        o += p(body, P.fill, P.line);
        o += ov('M-130 -80C-112 -62 -60 -50 0 -48C60 -50 112 -62 130 -80C104 -74 60 -66 0 -64C-60 -66 -104 -74 -130 -80Z', SH);
        o += p('M-119 -84C-106 -116 -62 -146 0 -153C62 -146 106 -116 119 -84', 'none', trimL, 6) + p('M-119 -84C-106 -116 -62 -146 0 -153C62 -146 106 -116 119 -84', 'none', trim, 3.4);
        o += ov('M-104 -92C-90 -118 -56 -138 -18 -146C-50 -134 -76 -114 -90 -88Z', HL);
        o += circ(0, -102, 19, '#ffffff', P.line, 2) + DU.heart(0, -101, 11, '#ff5f8a', '#a11d47', 1.6) + circ(-4, -105, 2.2, '#fff', null, 0, 'fill-opacity=".8"');
        return o;
      },
    },
    {
      id: 'hat_sailor', slot: 'hat', name: 'כובע מלחים', tags: ['anime', 'beach'], price: 0, color: '#3a4a8f', coversTop: true,
      draw(R, P) {
        const W = '#ffffff', WL = '#9aa3c0';
        let o = brimShade(-46);
        // ribbon tails at the side
        o += p('M90 -70C102 -52 104 -32 97 -12L89 -20L84 -6C87 -28 85 -50 80 -64Z', P.fill, P.line, 2) + p('M84 -66C90 -52 90 -38 86 -24L79 -30L75 -18C78 -36 78 -52 74 -62Z', P.fill, P.line, 2) + ov('M84 -66C90 -52 90 -38 86 -24L79 -30L75 -18C78 -36 78 -52 74 -62Z', SH);
        const top = 'M-101 -98C-110 -130 -62 -152 0 -152C62 -152 110 -130 101 -98C70 -82 -70 -82 -101 -98Z';
        o += p(top, W, WL);
        o += ov('M-101 -98C-70 -112 70 -112 101 -98C70 -82 -70 -82 -101 -98Z', SH) + ov('M60 -146C96 -136 108 -118 101 -98C92 -104 80 -108 66 -110C80 -122 76 -136 60 -146Z', SH);
        o += p('M-84 -128Q0 -150 84 -128', 'none', WL, 1.4, 'stroke-opacity=".35"');
        o += ell(0, -152, 9, 4, P.fill, P.line, 1.8);
        const band = sym(0, [[0, -86], [34, -86, 68, -90, 93, -98], [97, -88, 97, -74, 94, -66], [70, -58, 34, -54, 0, -54]]);
        o += p(band, P.fill, P.line) + p('M-95.5 -90Q0 -70 95.5 -90', 'none', W, 2.6, 'stroke-opacity=".92"') + p('M-95.5 -74Q0 -54 95.5 -74', 'none', W, 2.6, 'stroke-opacity=".92"');
        o += ov('M-94 -66Q0 -46 94 -66L94.5 -72Q0 -52 -94.5 -72Z', SH);
        // a little anchor
        o += p('M0 -79V-62M-7 -67Q0 -58 7 -67M-4.5 -74H4.5', 'none', GOLD_L, 4.6) + p('M0 -79V-62M-7 -67Q0 -58 7 -67M-4.5 -74H4.5', 'none', GOLD, 2.4) + circ(0, -81, 2.6, 'none', GOLD, 1.8);
        return o;
      },
    },
    {
      id: 'hat_visor', slot: 'hat', name: 'מצחיית שמש', tags: ['retro', 'sport', 'beach'], price: 0, color: '#ff5fb0',
      draw(R, P) {
        const bill = 'M-88 -64Q-90 -30 0 -26Q90 -30 88 -64Q0 -46 -88 -64Z';
        let o = brimShade(-34);
        o += `<path d="${bill}" fill="${P.fill}" fill-opacity=".8" stroke="${P.line}" stroke-width="2.4"/>`;
        o += ov('M-78 -44Q0 -26 78 -44Q0 -32 -78 -44Z', HL) + p('M-84 -52Q0 -34 84 -52', 'none', '#fff', 1.6, 'stroke-opacity=".55"');
        const band = sym(0, [[0, -74], [34, -74, 70, -78, 94, -85], [97, -78, 97, -68, 94, -62], [70, -55, 34, -52, 0, -52]]);
        o += p(band, P.fill, P.line) + ov('M-94 -66Q0 -46 94 -66L94 -62Q0 -42 -94 -62Z', SH);
        o += p('M-94 -76Q0 -57 94 -76', 'none', contrast(P, '#5cc8ff', '#ffffff'), 2.6, 'stroke-opacity=".9"');
        o += DU.star(0, -63, 8, contrast(P, '#ff9a56', '#fff2a8'), P.line, 1.5);
        return o;
      },
    },
    {
      id: 'hat_headphones', slot: 'hat', name: 'אוזניות', tags: ['pop', 'retro', 'rock'], price: 0, color: '#7b5bd6',
      draw(R, P) {
        const band = 'M-98 -2C-106 -78 -62 -136 0 -136C62 -136 106 -78 98 -2';
        const dk = '#3a3346', lt = DU.light(P.base, 0.45);
        let o = p(band, 'none', P.line, 11.5) + p(band, 'none', P.fill, 7) + p('M-66 -112Q-36 -132 -2 -133', 'none', '#fff', 2, 'stroke-opacity=".55"');
        o += p('M-34 -130Q0 -142 34 -130', 'none', DU.line(dk), 12) + p('M-34 -130Q0 -142 34 -130', 'none', dk, 8);
        const cup = `<rect x="78" y="-12" width="16" height="54" rx="8" fill="${dk}" stroke="${DU.line(dk)}" stroke-width="2"/>` +
          `<rect x="88" y="-18" width="28" height="66" rx="13" fill="${P.fill}" stroke="${P.line}" stroke-width="2.4"/>` +
          ov('M102 -18h1a13 13 0 0 1 13 13v40a13 13 0 0 1 -13 13h-1a13 13 0 0 0 6 -13v-40a13 13 0 0 0 -6 -13Z', SH) +
          `<ellipse cx="102" cy="15" rx="7.5" ry="16" fill="${lt}" fill-opacity=".8"/>` + DU.star(102, 15, 6.5, '#fff', null) + glint(96, -8, 4);
        return o + DU.both(0, cup);
      },
    },
    {
      id: 'hat_bandana', slot: 'hat', name: 'בנדנה', tags: ['rock', 'pirate', 'cowgirl'], price: 0, color: '#e0435f', coversTop: true,
      draw(R, P, ctx) {
        const dot = contrast(P, P.line, '#ffffff');
        let o = brimShade(-46);
        // knot + tails at the side
        o += p('M94 -68C112 -62 126 -46 128 -22L114 -31L110 -14C108 -36 102 -54 90 -62Z', P.fill, P.line, 2.2) + ov('M94 -68C112 -62 126 -46 128 -22L114 -31C112 -46 106 -58 94 -68Z', SH);
        o += p('M92 -64C100 -46 100 -24 92 -4L84 -15L77 -3C84 -24 86 -46 84 -60Z', P.fill, P.line, 2.2);
        const dome = sym(0, [[0, -137], [56, -137, 97, -111, 98, -68], [70, -58, 34, -54, 0, -54]]);
        o += p(dome, P.fill, P.line);
        const dots = [[-62, -92], [-34, -114], [-4, -98], [26, -118], [56, -96], [-12, -126], [-44, -78], [20, -82], [78, -80], [-80, -76], [48, -126], [-70, -116], [0, -74]]
          .map((q) => circ(q[0], q[1], 3.6, dot, null, 0, 'fill-opacity=".85"')).join('');
        o += DU.clip(ctx.id('bd'), dome, dots + ov('M40 -131C84 -118 98 -96 98 -68Q70 -60 44 -57C72 -80 70 -112 40 -131Z', SH) + ov('M-78 -102Q-58 -128 -22 -133Q-52 -120 -66 -92Z', HL));
        const fold = sym(0, [[0, -70], [36, -70, 72, -74, 98.5, -83], [101, -77, 101, -70, 98, -64], [70, -55, 34, -51, 0, -51]]);
        o += p(fold, P.fill, P.line, 2.2) + ov(fold, SH);
        o += ell(95, -67, 9.5, 8.5, P.fill, P.line, 2.2) + p('M90 -71Q95 -67 92 -61', 'none', P.line, 1.4, 'stroke-opacity=".5"');
        return o;
      },
    },
    {
      id: 'hat_tophat', slot: 'hat', name: 'מגבעת קוסם', tags: ['magic', 'party'], price: 0, color: '#3a3346',
      draw(R, P) {
        const trim = contrast(P, '#7b5bd6', '#b48cff');
        let o = ell(0, -111, 74, 15, P.fill, P.line) + ov('M-74 -111A74 15 0 0 0 74 -111A74 9 0 0 1 -74 -111Z', HL);
        const crown = 'M-48 -114L-53 -170Q0 -160 53 -170L48 -114Q0 -101 -48 -114Z';
        o += p(crown, P.fill, P.line) + ov('M22 -164Q40 -166 53 -170L48 -114Q36 -108 22 -106Z', SH) + ov('M-44 -124L-48 -164L-36 -162L-34 -120Z', HL);
        const band = 'M-48 -114L-50 -136Q0 -124 50 -136L48 -114Q0 -101 -48 -114Z';
        o += p(band, trim, DU.line(trim), 2) + ov('M-48 -114L-48.6 -120Q0 -107 48.6 -120L48 -114Q0 -101 -48 -114Z', SH);
        o += ell(0, -170, 53, 9.5, DU.light(P.base, 0.16), P.line) + ell(0, -170, 38, 6, 'none', P.line, 1.2, 'stroke-opacity=".3"');
        o += DU.star(0, -120, 9.5, '#ffe58a', '#b98a1e', 1.6) + DU.sparkle(-34, -148, 5, '#fff', 0.9) + DU.sparkle(30, -152, 4, '#fff', 0.85);
        return rot(-8, 0, -112, o);
      },
    },
    {
      id: 'hat_newsboy', slot: 'hat', name: 'כובע קסקט', tags: ['paris', 'british'], price: 0, color: '#8a8fa8', coversTop: true,
      draw(R, P, ctx) {
        const dk = DU.dark(P.base, 0.22);
        const bill = 'M-74 -62Q-74 -37 0 -34Q74 -37 74 -62Q0 -46 -74 -62Z';
        let o = brimShade(-40);
        o += p(bill, dk, DU.line(dk)) + ov('M-64 -46Q0 -32 64 -46Q0 -40 -64 -46Z', HL);
        const crown = 'M-99 -70C-116 -106 -86 -150 0 -152C86 -150 116 -106 99 -70Q0 -47 -99 -70Z';
        o += p(crown, P.fill, P.line);
        let chk = '';
        for (let x = -120; x <= 120; x += 15) chk += `M${x} -160L${x + 46} -40M${x} -160L${x - 46} -40`;
        o += DU.clip(ctx.id('nb'), crown, p(chk, 'none', P.line, 1, 'stroke-opacity=".16"') + ov('M40 -146C92 -138 112 -104 99 -70Q70 -60 40 -56C72 -84 72 -122 40 -146Z', SH) + ov('M-86 -104Q-68 -134 -26 -144Q-58 -128 -72 -94Z', HL));
        o += p('M0 -152Q-5 -100 0 -55M0 -152Q-46 -122 -52 -60M0 -152Q46 -122 52 -60M0 -152Q-86 -130 -94 -72M0 -152Q86 -130 94 -72', 'none', P.line, 1.5, 'stroke-opacity=".4"');
        o += ell(0, -152, 8.5, 3.8, dk, DU.line(dk), 1.8);
        return o;
      },
    },
    {
      id: 'hat_trapper', slot: 'hat', name: 'כובע פרווה', tags: ['winter'], price: 0, color: '#e0435f', coversTop: true,
      draw(R, P, ctx) {
        const FUR = '#fff8ee', FUR_L = '#c9b79f';
        let o = brimShade(-48);
        const hood = sym(0, [[0, -144], [60, -144, 101, -112, 101, -58], [105, -22, 105, 10, 99, 34], [95, 50, 80, 52, 74, 42], [76, 12, 77, -14, 71, -38], [52, -49, 24, -53, 0, -53]]);
        o += p(hood, P.fill, P.line);
        let chk = '';
        for (let x = -100; x <= 100; x += 25) chk += `M${x} -150V60`;
        for (let y = -140; y <= 50; y += 25) chk += `M-110 ${y}H110`;
        o += DU.clip(ctx.id('tr'), hood, p(chk, 'none', DU.dark(P.base, 0.45), 5, 'stroke-opacity=".2"') + p(chk, 'none', '#ffffff', 1.2, 'stroke-opacity=".3"') +
          ov(sym(0, [[0, -144], [60, -144, 101, -112, 101, -58], [105, -22, 105, 10, 99, 34], [86, 30], [92, -20, 90, -60, 88, -70], [84, -108, 50, -134, 0, -134]]), SH));
        o += ov('M-70 -114Q-46 -136 -12 -138Q-44 -126 -60 -100Z', HL) + ell(0, -144, 8, 3.6, DU.dark(P.base, 0.2), P.line, 1.8);
        // fur: the turned-up front and the edges of the ear flaps
        const front = [];
        for (let i = -3; i <= 3; i++) front.push([i * 21, -68 - 11 * (i / 3.4) * (i / 3.4), 15.5]);
        o += blob(front, FUR, FUR_L);
        o += DU.both(0, blob([[101, -10, 11], [102, 6, 12], [99, 23, 12.5], [92, 38, 12.5], [81, 47, 11]], FUR, FUR_L));
        o += ov('M-66 -60Q0 -44 66 -60Q0 -52 -66 -60Z', SH);
        return o;
      },
    },
    {
      id: 'hat_strawberry', slot: 'hat', name: 'כובע תות', tags: ['kawaii'], price: 0, color: '#ff5f7a', coversTop: true,
      draw(R, P) {
        const G = '#6cc56a', seed = contrast(P, '#e0435f', '#fff2a8');
        let o = brimShade(-44);
        const dome = sym(0, [[0, -146], [58, -146, 97, -116, 98, -68], [70, -58, 34, -54, 0, -54]]);
        o += p(dome, P.fill, P.line);
        o += ov(sym(0, [[0, -146], [58, -146, 97, -116, 98, -68], [86, -72], [84, -112, 50, -136, 0, -136]]), SH) + ov('M-76 -102Q-58 -130 -24 -138Q-54 -122 -66 -92Z', HL);
        o += [[-64, -86], [-40, -104], [-14, -88], [14, -108], [40, -90], [64, -102], [-52, -66], [-24, -70], [6, -72], [30, -68], [58, -72], [80, -82], [-80, -76], [-28, -124], [28, -126], [0, -122], [-58, -118], [56, -122]]
          .map((q, i) => `<ellipse cx="${q[0]}" cy="${q[1]}" rx="2.4" ry="3.8" fill="${seed}" transform="rotate(${(i % 3 - 1) * 14} ${q[0]} ${q[1]})"/>`).join('');
        const band = sym(0, [[0, -68], [36, -68, 72, -72, 99, -80], [103, -72, 103, -58, 99, -50], [72, -44, 36, -42, 0, -42]]);
        const bc = DU.light(P.base, 0.62);
        o += p(band, bc, P.line) + ov('M-99 -56Q0 -38 99 -56L99 -50Q0 -32 -99 -50Z', SH);
        o += [14, 52, 90, 128, 166].map((a, i) => leaf(0, -146, i === 2 ? 26 : 34, a, G)).join('') + leaf(-4, -148, 22, 215, G) + leaf(4, -148, 22, -35, G);
        o += cord('M0 -148Q2 -160 10 -164', G, DU.line(G), 3.2);
        return o;
      },
    },
    {
      id: 'hat_space', slot: 'hat', name: 'קסדת חלל', tags: ['space'], price: 0, color: '#7de3e0',
      draw(R, P, ctx) {
        const S = ctx.paint('silver', [-80, 96, 120, 36]);
        const ln = '#6d76a0';
        let o = `<circle cx="0" cy="-22" r="150" fill="${P.fill}" fill-opacity=".06" stroke="#8fa3d6" stroke-width="3.2" stroke-opacity=".95"/>`;
        o += `<circle cx="0" cy="-22" r="144" fill="none" stroke="#ffffff" stroke-width="2" stroke-opacity=".5"/>`;
        o += p('M-124 -78A138 138 0 0 1 -58 -148', 'none', '#fff', 9, 'stroke-opacity=".7"') + p('M-134 -40A138 138 0 0 1 -130 -60', 'none', '#fff', 8, 'stroke-opacity=".6"') +
          p('M112 52A138 138 0 0 1 84 86', 'none', '#fff', 5, 'stroke-opacity=".4"');
        // ear knobs
        o += DU.both(0, `<rect x="143" y="-40" width="17" height="36" rx="7" fill="${P.fill}" stroke="${P.line}" stroke-width="2.2"/>` + circ(151.5, -22, 3.4, '#fff', null, 0, 'fill-opacity=".8"'));
        // neck ring
        o += ell(0, 112, 76, 16, S.fill, ln) + ell(0, 108, 62, 10, 'none', ln, 1.4, 'stroke-opacity=".5"');
        o += p('M-74 115Q0 133 74 115', 'none', P.line, 6) + p('M-74 115Q0 133 74 115', 'none', P.fill, 3.4);
        o += [-44, 0, 44].map((x) => circ(x, 121 - Math.abs(x) * 0.07, 3, '#fff', ln, 1)).join('');
        o += DU.sparkle(104, -116, 8, '#fff') + DU.sparkle(-96, 62, 5, '#fff', 0.9);
        return o;
      },
    },
    {
      id: 'hat_flowerpot', slot: 'hat', name: 'כובע פרחים', tags: ['nature', 'hawaii'], price: 0, color: '#ff9ac1', coversTop: true,
      draw(R, P) {
        let o = brimShade(-46);
        o += ell(0, -70, 132, 23, STRAW, STRAW_L) + ell(0, -69, 114, 17.5, 'none', STRAW_L, 1.4, 'stroke-opacity=".3"');
        o += ov('M-132 -70A132 23 0 0 0 132 -70A132 15 0 0 1 -132 -70Z', HL);
        const crown = sym(0, [[0, -150], [46, -150, 78, -136, 81, -104], [83, -92, 83, -82, 83, -74], [60, -60, 30, -57, 0, -57]]);
        o += p(crown, STRAW, STRAW_L);
        const lt = DU.light(P.base, 0.5), ctr = contrast(P, '#ffb347', '#ffd54d');
        [[-70, -92, 150], [70, -92, 30], [-40, -140, 215], [40, -140, -35], [0, -152, -90], [-76, -72, 170], [76, -72, 10], [-20, -62, 100], [22, -62, 80]].forEach((q) => { o += leaf(q[0], q[1], 20, q[2]); });
        const fl = [[-58, -80, 14, 0], [-30, -68, 13, 1], [0, -70, 15, 2], [30, -68, 13, 0], [58, -80, 14, 1], [-64, -106, 13, 2], [-38, -96, 14, 3], [-10, -100, 14, 0], [18, -96, 14, 1], [44, -104, 13, 2], [66, -106, 11, 3],
          [-46, -126, 13, 1], [-20, -128, 13, 2], [8, -126, 14, 3], [34, -130, 12, 0], [-8, -146, 11, 1], [16, -146, 10, 2]];
        const cols = [P.fill, '#ffffff', lt, '#fff2a8'];
        fl.forEach((q, i) => { const c = cols[q[3]]; o += DU.flower(q[0], q[1], q[2], c, c === '#fff2a8' ? '#ff9a56' : c === '#ffffff' ? '#ffd54d' : ctr, i % 2 ? 6 : 5); });
        return o;
      },
    },
    {
      id: 'hat_icecrown', slot: 'hat', name: 'כתר קרח', tags: ['winter', 'princess', 'magic'], price: 600, color: 'glitter:#9fdcff', fixed: true,
      draw(R, P) {
        const ln = '#3f86b8', A = '#d6f3ff', B = '#9fdcff';
        const shard = (x, y, h, w, deg) => rot(deg, x, y,
          p(`M${n(x - w)} ${y}L${n(x - w * 0.86)} ${n(y - h * 0.7)}L${x} ${n(y - h)}L${n(x + w * 0.86)} ${n(y - h * 0.7)}L${n(x + w)} ${y}Z`, B, ln, 2) +
          `<path d="M${n(x - w)} ${y}L${n(x - w * 0.86)} ${n(y - h * 0.7)}L${x} ${n(y - h)}L${x} ${y}Z" fill="${A}"/>` +
          p(`M${x} ${n(y - h)}V${y}M${n(x - w * 0.86)} ${n(y - h * 0.7)}L${x} ${n(y - h * 0.52)}L${n(x + w * 0.86)} ${n(y - h * 0.7)}`, 'none', '#fff', 1.2, 'stroke-opacity=".85"') +
          p(`M${n(x - w)} ${y}L${n(x - w * 0.86)} ${n(y - h * 0.7)}L${x} ${n(y - h)}L${n(x + w * 0.86)} ${n(y - h * 0.7)}L${n(x + w)} ${y}`, 'none', ln, 2));
        let o = shard(-41, -100, 34, 8, -17) + shard(41, -100, 34, 8, 17) + shard(-22, -102, 50, 9.5, -8) + shard(22, -102, 50, 9.5, 8) + shard(0, -100, 68, 11.5, 0);
        const band = 'M-54 -112L-51 -99Q0 -83 51 -99L54 -112Q0 -96 -54 -112Z';
        o += p(band, P.fill, ln, 2.2) + ov('M-52 -105L-51 -99Q0 -83 51 -99L52 -105Q0 -89 -52 -105Z', SH);
        o += gem(0, -98, 6.5, '#ffffff') + circ(-25, -103, 3.2, '#fff', ln, 1.2) + circ(25, -103, 3.2, '#fff', ln, 1.2) + circ(-44, -108, 2.6, '#fff', ln, 1.1) + circ(44, -108, 2.6, '#fff', ln, 1.1);
        o += DU.sparkle(-66, -142, 8, '#fff') + DU.sparkle(64, -156, 6.5, '#e3f6ff') + DU.sparkle(26, -176, 5, '#fff') + DU.sparkle(-38, -170, 4.5, '#e3f6ff') + DU.sparkle(78, -112, 4, '#fff');
        return o;
      },
    },
    {
      id: 'hat_idol', slot: 'hat', name: 'כובע כוכבת', tags: ['pop'], price: 400, color: 'glitter:#ff7fb5', fixed: true,
      draw(R, P) {
        const ln = '#a8456a', dk = '#3a3346';
        let o = ell(0, 0, 44, 10, P.fill, ln) + ov('M-44 0A44 10 0 0 0 44 0A44 6 0 0 1 -44 0Z', HL);
        const crown = 'M-27 -2L-31 -50Q0 -42 31 -50L27 -2Q0 7 -27 -2Z';
        o += p(crown, P.fill, ln) + ov('M12 -45Q22 -47 31 -50L27 -2Q20 1 12 2Z', SH);
        const band = 'M-27 -2L-28.4 -19Q0 -11 28.4 -19L27 -2Q0 7 -27 -2Z';
        o += p(band, dk, DU.line(dk), 1.8);
        o += ell(0, -50, 31, 6.5, '#ffb3d3', ln, 2);
        o += DU.bow(-24, -10, 14, '#ffffff', ln, true) + DU.star(10, -8, 7, '#ffe58a', '#b98a1e', 1.4);
        let s = at(46, -116, 18, o);
        s += DU.sparkle(92, -150, 8, '#fff') + DU.sparkle(8, -160, 5.5, '#fff7b8') + DU.sparkle(84, -98, 4.5, '#fff');
        return s;
      },
    },

    /* ======================= HAIR ACCESSORIES ======================= */
    {
      id: 'ha_kanzashi', slot: 'hairacc', name: 'סיכות פרחים יפניות', tags: ['anime'], price: 0, color: '#ff6f91',
      draw(R, P) {
        const ctr = contrast(P, '#ffb347', '#ffd54d'), lt = DU.light(P.base, 0.55);
        let o = cord('M-104 -108L-62 -60', GOLD, GOLD_L, 2.6) + circ(-106, -110, 5.5, GOLD, GOLD_L, 1.6) + circ(-107.5, -111.5, 1.6, '#fff', null, 0, 'fill-opacity=".8"');
        // dangling petals
        [[-99, -56, 5], [-90, -50, 6], [-81, -54, 4]].forEach((q, k) => {
          const len = q[2] * 10.5;
          o += p(`M${q[0]} ${q[1]}v${len}`, 'none', GOLD_L, 1.3);
          for (let i = 0; i < q[2]; i++) {
            const y = q[1] + 7 + i * 10.5, c = (i + k) % 2 ? '#ffffff' : lt;
            o += `<path d="M${q[0]} ${y - 5}Q${q[0] + 4.4} ${y} ${q[0]} ${y + 5}Q${q[0] - 4.4} ${y} ${q[0]} ${y - 5}Z" fill="${c}" stroke="${P.line}" stroke-width="1.1"/>`;
          }
        });
        o += leaf(-70, -62, 20, 20) + leaf(-96, -74, 18, 200);
        o += DU.flower(-96, -82, 14, lt, ctr, 5) + DU.flower(-58, -90, 15, '#ffffff', ctr, 5) + DU.flower(-79, -64, 21, P.fill, ctr, 5) + circ(-83, -68, 2.4, '#fff', null, 0, 'fill-opacity=".75"');
        return o;
      },
    },
    {
      id: 'ha_hibiscus', slot: 'hairacc', name: 'היביסקוס', tags: ['hawaii', 'beach'], price: 0, color: '#ff5f7a',
      draw(R, P) {
        return leaf(92, -32, 32, 46) + leaf(98, -50, 30, -24) + leaf(72, -60, 26, -120) + hibiscus(86, -42, 29, P);
      },
    },
    {
      id: 'ha_ribbons', slot: 'hairacc', name: 'סרטים ארוכים', tags: ['anime', 'kawaii', 'ballet'], price: 0, color: '#ff6f91',
      draw(R, P) {
        const long = 'M70 -96C100 -78 114 -36 106 6C103 24 108 38 116 48L103 47L100 60C92 44 90 26 93 6C98 -30 88 -64 62 -86Z';
        const short = 'M66 -92C84 -76 92 -52 90 -22L81 -29L76 -15C80 -40 76 -66 58 -82Z';
        const side = p(long, P.fill, P.line, 2.2) + ov('M106 6C103 24 108 38 116 48L103 47L100 60C92 44 90 26 93 6Z', SH) + p(short, P.fill, P.line, 2.2) + ov(short, SH) +
          rot(30, 66, -98, DU.bow(66, -98, 22, P.fill, P.line));
        return DU.both(0, side);
      },
    },
    {
      id: 'ha_antenna', slot: 'hairacc', name: 'אנטנות', tags: ['space'], price: 0, color: '#b48cff',
      draw(R, P) {
        const Y = contrast(P, '#ff9a56', '#ffe066');
        let spring = 'M34 -112';
        for (let i = 1; i <= 7; i++) { const t = i / 7; spring += `L${n(34 + 14 * t + (i % 2 ? 8 : -8) * (i < 7 ? 1 : 0))} ${n(-112 - 46 * t)}`; }
        const one = cord(spring, DU.light(P.base, 0.4), P.line, 2.6) + DU.star(49, -168, 12.5, Y, DU.line(Y), 1.8) + circ(46, -171, 2.2, '#fff', null, 0, 'fill-opacity=".85"') + circ(34, -112, 5, P.fill, P.line, 1.8);
        return cord(HEADBAND, P.fill, P.line, 3.8) + DU.both(0, one) + DU.sparkle(74, -152, 4.5, '#fff', 0.9) + DU.sparkle(-72, -176, 4, '#fff', 0.9);
      },
    },
    {
      id: 'ha_foxears', slot: 'hairacc', name: 'אוזני שועל', tags: ['anime', 'magic'], price: 0, color: '#f08a3c',
      draw(R, P) {
        const cream = '#fff3e0', tip = DU.dark(P.base, 0.55);
        const ear = p('M22 -116C34 -146 54 -168 75 -182C87 -152 91 -118 88 -84C66 -92 42 -104 22 -116Z', P.fill, P.line) +
          `<path d="M75 -182C68 -177 61 -171 55 -165C63 -158 74 -154 84 -154C82 -164 79 -173 75 -182Z" fill="${tip}"/>` +
          `<path d="M40 -116C48 -134 58 -148 68 -158C75 -141 78 -120 78 -100C73 -106 70 -108 66 -104C63 -112 58 -112 55 -108C52 -114 46 -114 40 -116Z" fill="${cream}"/>` +
          ov('M75 -182C87 -152 91 -118 88 -84L80 -88C82 -118 80 -150 72 -176Z', SH) +
          p('M22 -116C34 -146 54 -168 75 -182C87 -152 91 -118 88 -84', 'none', P.line, 2.4);
        return cord(HEADBAND, P.fill, P.line, 3.4) + DU.both(0, ear);
      },
    },
    {
      id: 'ha_bearears', slot: 'hairacc', name: 'אוזני דובי', tags: ['kawaii', 'sleepover'], price: 0, color: '#b9814a',
      draw(R, P) {
        const soft = contrast(P, '#ffc1d9', DU.light(P.base, 0.62));
        const ear = circ(60, -123, 24, P.fill, P.line, 2.4) + circ(60, -121, 13, soft) + ov('M38 -116A24 24 0 0 0 83 -116Q60 -96 38 -116Z') + glint(50, -137, 4.5);
        return cord(HEADBAND, P.fill, P.line, 3.4) + DU.both(0, ear);
      },
    },
    {
      id: 'ha_scrunchie', slot: 'hairacc', name: 'גומייה ענקית', tags: ['retro'], price: 0, color: '#ff5fb0',
      draw(R, P) {
        const x = 58, y = -116, dot = contrast(P, '#5cc8ff', '#fff2a8');
        let o = p(fluffD(x, y, 27, 12, 0.2), P.fill, P.line, 2.3);
        let cr = '', dots = '';
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 - Math.PI / 2, b = a + Math.PI / 12;
          cr += `M${n(x + Math.cos(a) * 10)} ${n(y + Math.sin(a) * 10)}L${n(x + Math.cos(a) * 24)} ${n(y + Math.sin(a) * 24)}`;
          if (i % 2) dots += circ(x + Math.cos(b) * 19, y + Math.sin(b) * 19, 2.8, dot, null, 0, 'fill-opacity=".9"');
        }
        o += p(cr, 'none', P.line, 1.4, 'stroke-opacity=".4"') + dots;
        o += ov(DU.ellD(x, y, 10, 9), SH2) + ov(DU.ellD(x, y, 6, 5.4), SH2) + p(DU.ellD(x, y, 10, 9), 'none', P.line, 1.6, 'stroke-opacity=".6"');
        o += ov(`M${x - 22} ${y + 8}Q${x} ${y + 38} ${x + 24} ${y + 6}Q${x} ${y + 24} ${x - 22} ${y + 8}Z`, SH) + ell(x - 9, y - 20, 7, 3.6, '#fff', null, 0, 'fill-opacity=".5"');
        return o;
      },
    },
    {
      id: 'ha_feather', slot: 'hairacc', name: 'נוצה', tags: ['cowgirl', 'pirate'], price: 0, color: '#3fbf9a',
      draw(R, P) {
        const c2 = contrast(P, '#ff9a56', '#ffffff');
        let o = at(-78, -54, -84, feather(58, c2, DU.line(DU.mix(c2, P.base, 0.4)), P.fill));
        o += at(-80, -52, -124, feather(84, P.fill, P.line, '#ffffff'));
        o += p('M-82 -56l8 12', 'none', '#7a4a2b', 2.4) + circ(-80, -53, 5.5, GOLD, GOLD_L, 1.6) + circ(-72, -42, 3.8, '#5cc8ff', '#2f6f9a', 1.2) + circ(-81.5, -54.5, 1.6, '#fff', null, 0, 'fill-opacity=".8"');
        return o;
      },
    },
    {
      id: 'ha_butterflies', slot: 'hairacc', name: 'פרפרים', tags: ['nature', 'magic'], price: 0, color: '#b48cff',
      draw(R, P) {
        const lt = DU.light(P.base, 0.45), c2 = contrast(P, '#ff9ac1', '#ffd24d');
        return at(-60, -98, -24, bfly(P.fill, lt, P.line), 1.3) + at(50, -112, 18, bfly(c2, DU.light(c2, 0.45), DU.line(c2)), 1.05) + at(84, -54, 30, bfly(lt, P.fill, P.line), 0.95) +
          DU.sparkle(-28, -124, 4, '#fff', 0.9) + DU.sparkle(84, -92, 3.6, '#fff', 0.9);
      },
    },
    {
      id: 'ha_scarf', slot: 'hairacc', name: 'מטפחת', tags: ['paris', 'retro'], price: 0, color: '#e0435f',
      draw(R, P, ctx) {
        const dot = contrast(P, P.line, '#ffffff');
        const band = 'M-96 -34C-95 -94 -52 -124 0 -124C52 -124 95 -94 96 -34L80 -36C78 -82 44 -104 0 -104C-44 -104 -78 -82 -80 -36Z';
        let dots = '';
        for (let i = -6; i <= 6; i++) { const a = (i / 7) * (Math.PI / 2); dots += circ(Math.sin(a) * 88, -36 - Math.cos(a) * 78, 3.8, dot, null, 0, 'fill-opacity=".85"'); }
        const end = (s) => p(`M${s * 3} -118C${s * 12} -142 ${s * 30} -156 ${s * 50} -152C${s * 48} -136 ${s * 34} -122 ${s * 12} -112Z`, P.fill, P.line, 2.2) + p(`M${s * 10} -120Q${s * 26} -134 ${s * 40} -144`, 'none', P.line, 1.3, 'stroke-opacity=".45"');
        let o = p(band, P.fill, P.line) + DU.clip(ctx.id('sc'), band, dots + ov('M96 -34C95 -94 52 -124 0 -124C50 -116 86 -88 88 -34Z', SH) + ov('M-84 -66C-72 -98 -38 -116 0 -118C-34 -112 -60 -94 -74 -60Z', HL));
        o += end(-1) + end(1) + ov('M3 -118C12 -142 30 -156 50 -152C40 -146 26 -134 14 -116Z', SH);
        o += ell(0, -116, 11, 9.5, P.fill, P.line, 2.2) + p('M-5 -121Q0 -116 -3 -109', 'none', P.line, 1.3, 'stroke-opacity=".5"');
        return o;
      },
    },
    {
      id: 'ha_balletcrown', slot: 'hairacc', name: 'כתר בלרינה', tags: ['ballet'], price: 0, color: '#ffc1d9',
      draw(R, P) {
        const F = DU.mix('#ffffff', P.base, 0.14), FL = DU.mix('#b9aed6', P.line, 0.3), PE = '#fff8f2', PL = '#b79aa6';
        const fe = p('M24 -112C50 -120 76 -106 88 -78C92 -68 92 -56 88 -46C82 -64 68 -80 44 -90Z', F, FL, 2) +
          p('M30 -110C52 -110 74 -96 86 -70M44 -104l-2 8M56 -99l-3 9M67 -91l-4 9M77 -81l-5 8', 'none', FL, 1.2, 'stroke-opacity=".7"') +
          p('M30 -100C48 -102 66 -92 76 -74C78 -68 78 -62 76 -56C70 -68 60 -78 42 -84Z', '#ffffff', FL, 1.8);
        let o = DU.both(0, fe);
        for (let i = -5; i <= 5; i++) { if (!i) continue; const x = i * 8.4, y = -119 + 0.011 * x * x; o += circ(x, y, 4.1, PE, PL, 1.3) + circ(x - 1.2, y - 1.3, 1.2, '#fff'); }
        o += p('M0 -138L9 -124Q9 -113 0 -108Q-9 -113 -9 -124Z', P.fill, P.line, 1.8) + `<path d="M0 -138L-9 -124Q-9 -117 -4 -112L0 -124Z" fill="#fff" fill-opacity=".55"/>` + circ(0, -141, 3.2, PE, PL, 1.2);
        o += DU.sparkle(-18, -134, 4, '#fff', 0.9) + DU.sparkle(20, -138, 3.4, '#fff', 0.9);
        return o;
      },
    },
    {
      id: 'ha_pompoms', slot: 'hairacc', name: 'פונפונים', tags: ['kawaii', 'winter', 'party'], price: 0, color: '#ff9ac1',
      draw(R, P) {
        const lt = DU.light(P.base, 0.5);
        const one = pom(60, -121, 21, P.fill, P.line) + pom(82, -98, 11, lt, P.line);
        return cord(HEADBAND, lt, P.line, 3) + DU.both(0, one);
      },
    },
    {
      id: 'ha_starcrown', slot: 'hairacc', name: 'זר כוכבים', tags: ['pop', 'space', 'magic'], price: 450, color: 'gold', fixed: true,
      draw(R, P, ctx) {
        const G = ctx.paint('gold', [-96, -150, 140, 80]);
        const ln = '#a86a12';
        const arc = 'M-96 -84Q0 -44 96 -84';
        let o = p(arc, 'none', ln, 5.4) + p(arc, 'none', GOLD, 2.6) + p('M-70 -74Q-30 -62 0 -62', 'none', '#fff', 1.2, 'stroke-opacity=".8"');
        [[-84, -80, 9, -14], [-46, -68, 12.5, -6], [0, -63, 16, 0], [46, -68, 12.5, 6], [84, -80, 9, 14]].forEach((q) => {
          o += rot(q[3], q[0], q[1], p(DU.starD(q[0], q[1], q[2]), G.fill, ln, 1.9)) + circ(q[0] - q[2] * 0.28, q[1] - q[2] * 0.3, q[2] * 0.16, '#fff', null, 0, 'fill-opacity=".85"');
        });
        o += p(DU.starD(-58, -140, 8), G.fill, ln, 1.6) + p(DU.starD(62, -146, 9.5), G.fill, ln, 1.6) + p(DU.starD(4, -152, 7), G.fill, ln, 1.6);
        o += DU.sparkle(-30, -148, 5, '#fff') + DU.sparkle(34, -132, 4.5, '#fff7b8') + DU.sparkle(-88, -122, 5.5, '#fff') + DU.sparkle(92, -116, 4.5, '#fff7b8') + DU.sparkle(22, -86, 3.4, '#fff');
        return o;
      },
    },
    {
      id: 'ha_rainbow', slot: 'hairacc', name: 'קשת בענן', tags: ['kawaii', 'party'], price: 350, color: 'rainbow', fixed: true,
      draw() {
        const cols = ['#b48cff', '#5cc8ff', '#7ddc8a', '#ffe066', '#ffa45c', '#ff6f91'];
        const arc = (k) => `M${-92 - k} -38C${-88 - k} ${-88 - k} ${n(-50 - k * 0.6)} ${-112 - k} 0 ${-112 - k}C${n(50 + k * 0.6)} ${-112 - k} ${88 + k} ${-88 - k} ${92 + k} -38`;
        let o = p(arc(8.5), 'none', '#7a5aa8', 23.4);
        cols.forEach((c, i) => { o += p(arc(i * 3.4), 'none', c, 3.6); });
        o += p(arc(15), 'none', '#fff', 1.4, 'stroke-opacity=".7" stroke-dasharray="14 60"');
        o += cloud(-100, -40, 1.5) + cloud(100, -40, 1.5);
        o += DU.sparkle(-62, -138, 5.5, '#fff') + DU.sparkle(70, -132, 4.5, '#fff') + DU.sparkle(8, -146, 4, '#fff7b8');
        return o;
      },
    },

    /* ======================= GLASSES ======================= */
    {
      id: 'gl_eyepatch', slot: 'glasses', name: 'רטייה', tags: ['pirate'], price: 0, color: '#3a3346',
      draw(R, P) {
        const st = contrast(P, P.line, '#2b2233');
        const strapA = 'M16 -14L-93 -66', strapB = 'M62 -10L93 -30';
        const patch = 'M12 -15Q38 -24 64 -15Q70 8 60 28Q38 44 16 28Q6 8 12 -15Z';
        let o = p(strapA, 'none', st, 4.2) + p(strapB, 'none', st, 4.2);
        o += p(patch, P.fill, P.line) + p('M16 -10Q38 -18 60 -10Q65 8 56 24Q38 37 20 24Q11 8 16 -10Z', 'none', contrast(P, P.line, '#ffffff'), 1.2, 'stroke-opacity=".5" stroke-dasharray="3.5 3.5"');
        o += ov('M64 -15Q70 8 60 28Q38 44 16 28Q40 32 54 20Q64 6 64 -15Z', SH);
        o += DU.star(38, 7, 11.5, GOLD, GOLD_L, 1.7) + circ(35, 4, 2, '#fff', null, 0, 'fill-opacity=".85"');
        return o;
      },
    },
    {
      id: 'gl_cat', slot: 'glasses', name: 'משקפי חתול', tags: ['paris', 'retro'], price: 0, color: '#e0435f',
      draw(R, P) {
        const d = 'M9 -6Q34 -14 58 -19Q70 -22 81 -33Q81 -4 68 14Q56 30 36 30Q12 28 8 6Q7 0 9 -6Z';
        const lens = frame(d, P, 3.8, 'fill="#241a3a" fill-opacity=".5"') + p('M18 -2l11 -8M27 4l6 -4', 'none', '#fff', 2.8, 'stroke-opacity=".7"') +
          circ(70, -22, 2.4, '#fff', null, 0, 'fill-opacity=".95"') + circ(63, -19.5, 1.7, '#fff', null, 0, 'fill-opacity=".95"');
        return frame('M-9 -3Q0 -9 9 -3', P, 3.4) + DU.both(0, lens);
      },
    },
    {
      id: 'gl_shutter', slot: 'glasses', name: 'משקפי פסים', tags: ['retro', 'pop'], price: 0, color: '#ff5fb0',
      draw(R, P) {
        const box = 'M20 -16H60Q70 -16 70 -6V21Q70 31 60 31H20Q10 31 10 21V-6Q10 -16 20 -16Z';
        let slats = '';
        [-8.6, 2.4, 13.4, 24.4].forEach((y) => { slats += `<rect x="10" y="${y - 2.9}" width="60" height="5.8" rx="1.5" fill="${P.fill}" stroke="${P.line}" stroke-width="1.3"/>`; });
        const lens = slats + frame(box, P, 3.6) + frame('M70 -6L85 -9', P, 3.2) + p('M16 -12l10 -2', 'none', '#fff', 2, 'stroke-opacity=".7"');
        return frame('M-10 -8H10', P, 5) + DU.both(0, lens);
      },
    },
    {
      id: 'gl_aviator', slot: 'glasses', name: 'משקפי טייס', tags: ['rock', 'cowgirl'], price: 0, color: '#ffd24d',
      draw(R, P) {
        const d = 'M10 -13Q38 -19 67 -13Q72 8 61 25Q47 38 30 32Q11 24 8 3Z';
        const lens = frame(d, P, 2.4, 'fill="#2c4a6e" fill-opacity=".48"') + ov('M10 -13Q38 -19 67 -13Q69 -4 67 4Q38 -6 9 -2Z', 'fill="#ffffff" fill-opacity=".14" stroke="none"') +
          p('M18 -6l12 -7M27 0l7 -4', 'none', '#fff', 2.8, 'stroke-opacity=".7"') + frame('M67 -11L85 -11', P, 2.2);
        return frame('M-10 -11Q0 -15 10 -11', P, 2.2) + frame('M-9 -2Q0 -7 9 -2', P, 2.2) + DU.both(0, lens);
      },
    },
    {
      id: 'gl_flower', slot: 'glasses', name: 'משקפי פרח', tags: ['hawaii', 'kawaii'], price: 0, color: '#ff9ac1',
      draw(R, P) {
        const d = fluffD(38.5, 9, 25.5, 6, 0.4);
        const lens = frame(d, P, 3.8, `fill="${P.fill}" fill-opacity=".2"`) + p('M24 -6l7 -7M29 1l4 -4', 'none', '#fff', 2.6, 'stroke-opacity=".8"') + frame('M68 2L84 -3', P, 3) +
          leaf(64, -18, 13, -40, '#7ccf7a');
        return frame('M-11 4Q0 -3 11 4', P, 3) + DU.both(0, lens);
      },
    },
    {
      id: 'gl_visor', slot: 'glasses', name: 'משקף חלל', tags: ['space'], price: 0, color: '#7b5bd6',
      draw(R, P, ctx) {
        const L = ctx.paint('mermaid', [-90, -22, 514, 30]);
        const shape = sym(0, [[0, -19], [36, -23, 70, -21, 85, -13], [93, 2, 89, 24, 75, 30], [50, 36, 22, 31, 0, 23]]);
        let o = `<path d="${shape}" fill="${L.fill}" fill-opacity=".42"/>` + ov(sym(0, [[0, -19], [36, -23, 70, -21, 85, -13], [88, -6], [60, -10, 30, -8, 0, -4]]), 'fill="#ffffff" fill-opacity=".3" stroke="none"');
        o += p(shape, 'none', P.line, 2.2);
        const bar = sym(0, [[0, -27], [38, -31, 74, -28, 89, -18], [90, -11], [72, -20, 36, -22, 0, -18]]);
        o += p(bar, P.fill, P.line, 2) + p('M-60 -4l16 -9M-46 4l9 -5M30 -6l12 -7', 'none', '#fff', 2.8, 'stroke-opacity=".75"');
        o += DU.both(0, circ(90, -8, 6, P.fill, P.line, 1.8) + circ(90, -8, 2.2, '#fff', null, 0, 'fill-opacity=".85"'));
        return o;
      },
    },
    {
      id: 'gl_rainbow', slot: 'glasses', name: 'משקפי קשת', tags: ['pop', 'party'], price: 350, color: 'rainbow', fixed: true,
      draw(R, P, ctx) {
        const Rb = ctx.paint('rainbow', [-72, -24, 411, 30]);
        const ln = '#7a5aa8';
        const d = DU.ellD(38.5, 9, 29, 27.5);
        const lens = `<path d="${d}" fill="#ffffff" fill-opacity=".16"/><path d="${d}" fill="none" stroke="${ln}" stroke-width="9"/><path d="${d}" fill="none" stroke="${Rb.fill}" stroke-width="6"/>` +
          p('M22 -6l8 -8M28 1l5 -5', 'none', '#fff', 2.6, 'stroke-opacity=".8"');
        const arm = (s) => `<path d="M${s * 67} 2L${s * 85} -4" fill="none" stroke="${ln}" stroke-width="6"/><path d="M${s * 67} 2L${s * 85} -4" fill="none" stroke="${s > 0 ? '#b48cff' : '#ff6f91'}" stroke-width="3.2"/>`;
        let o = `<path d="M-10 4Q0 -4 10 4" fill="none" stroke="${ln}" stroke-width="6"/><path d="M-10 4Q0 -4 10 4" fill="none" stroke="#7ddc8a" stroke-width="3.2"/>`;
        o += arm(-1) + arm(1) + DU.both(0, lens);
        o += cloud(64, -19, 0.75) + cloud(-64, -19, 0.75);
        o += DU.sparkle(84, -34, 6.5, '#fff') + DU.sparkle(-86, -30, 5, '#fff') + DU.sparkle(0, -18, 4, '#fff7b8') + DU.sparkle(70, 42, 4, '#fff');
        return o;
      },
    },

    /* ======================= EARRINGS (lobes ≈ ±85, 31) ======================= */
    {
      id: 'ear_cherry', slot: 'earrings', name: 'דובדבנים', tags: ['kawaii', 'retro'], price: 0, color: '#e0435f',
      draw(R, P) {
        return DU.both(0, p('M85 33Q81 42 79 50M85 33Q91 42 92 53', 'none', '#3f8a4a', 2) + leaf(85, 33, 12, -28, '#7ccf7a') + circ(85, 31.5, 2.6, GOLD, GOLD_L, 1.3) +
          circ(78.5, 55, 6.8, P.fill, P.line, 1.8) + circ(92.5, 58, 6.8, P.fill, P.line, 1.8) + circ(76.4, 52.6, 1.9, '#fff', null, 0, 'fill-opacity=".85"') + circ(90.4, 55.6, 1.9, '#fff', null, 0, 'fill-opacity=".85"'));
      },
    },
    {
      id: 'ear_bolt', slot: 'earrings', name: 'ברקים', tags: ['rock', 'pop'], price: 0, color: '#ffd24d',
      draw(R, P) {
        const bolt = 'M90 37L77 54H85.5L80 71L95 50H87L93 37Z';
        return DU.both(0, circ(85, 31.5, 2.8, P.fill, P.line, 1.4) + p('M86 33l3 4', 'none', P.line, 1.5) + p(bolt, P.fill, P.line, 1.9) + `<path d="M90 37L77 54H82L92 38Z" fill="#fff" fill-opacity=".5"/>`);
      },
    },
    {
      id: 'ear_moon', slot: 'earrings', name: 'ירח וכוכב', tags: ['space', 'magic'], price: 0, color: '#ffd24d',
      draw(R, P) {
        const moon = p('M85 33v7', 'none', P.line, 1.5) + circ(85, 31.5, 2.6, P.fill, P.line, 1.4) + p('M83 41A11.5 11.5 0 1 0 96.5 58.5A13.5 13.5 0 0 1 83 41Z', P.fill, P.line, 1.8) + circ(80.5, 54, 1.7, '#fff', null, 0, 'fill-opacity=".85"');
        const star = p('M-85 33v7', 'none', P.line, 1.5) + circ(-85, 31.5, 2.6, P.fill, P.line, 1.4) + DU.star(-85, 50, 10.5, P.fill, P.line, 1.8) + circ(-87.5, 47.5, 1.8, '#fff', null, 0, 'fill-opacity=".85"');
        return moon + star + DU.sparkle(98, 40, 3.6, '#fff', 0.95) + DU.sparkle(-98, 64, 3.2, '#fff', 0.95);
      },
    },
    {
      id: 'ear_shell', slot: 'earrings', name: 'צדפים', tags: ['hawaii', 'beach', 'pirate'], price: 0, color: '#ffc1d9',
      draw(R, P) {
        const sh = 'M85 39L75 46C70 53 73 61 78.5 62Q82 65 85 63Q88 65 91.5 62C97 61 100 53 95 46Z';
        return DU.both(0, circ(85, 32, 3.6, '#fff8f2', '#b79aa6', 1.3) + circ(84, 31, 1.1, '#fff') + p(sh, P.fill, P.line, 1.8) +
          p('M85 41V62M85 41L79 60M85 41L91 60M85 41L75.5 53M85 41L94.5 53', 'none', P.line, 1.1, 'stroke-opacity=".5"') + ov('M85 39L75 46C72 50 72 55 74 58Q78 48 85 39Z', HL));
      },
    },
    {
      id: 'ear_tassel', slot: 'earrings', name: 'ציציות', tags: ['paris', 'party'], price: 0, color: '#ff6f91',
      draw(R, P) {
        const t = 'M80.5 44L77 68Q85 73 93 68L89.5 44Z';
        return DU.both(0, circ(85, 31.5, 3, GOLD, GOLD_L, 1.4) + p('M85 34v5', 'none', GOLD_L, 1.5) + p(t, P.fill, P.line, 1.8) +
          p('M83 46L81 68M85 46V70M87 46L89 68', 'none', P.line, 1.1, 'stroke-opacity=".45"') + `<path d="M79.5 39H90.5L89.5 46H80.5Z" fill="${GOLD}" stroke="${GOLD_L}" stroke-width="1.5"/>` + ov('M85 46L77 68Q79 70 82 70Z', HL));
      },
    },
    {
      id: 'ear_bows', slot: 'earrings', name: 'סרטים', tags: ['kawaii', 'anime', 'ballet'], price: 0, color: '#ff9ac1',
      draw(R, P) { return DU.bow(86, 38, 10.5, P.fill, P.line, true) + DU.bow(-86, 38, 10.5, P.fill, P.line, true); },
    },
    {
      id: 'ear_feather', slot: 'earrings', name: 'נוצות', tags: ['cowgirl', 'nature'], price: 0, color: '#3fbf9a',
      draw(R, P) {
        const c2 = contrast(P, '#ff9a56', '#ffffff');
        return DU.both(0, at(85, 37, 82, feather(36, P.fill, P.line, c2)) + circ(85, 31.5, 2.8, GOLD, GOLD_L, 1.4) + circ(85.6, 38.5, 2.8, '#5cc8ff', '#2f6f9a', 1.1));
      },
    },
    {
      id: 'ear_crystal', slot: 'earrings', name: 'גבישים', tags: ['winter', 'princess', 'magic'], price: 400, color: 'glitter:#bfe9ff', fixed: true,
      draw() {
        const ln = '#3f86b8', A = '#e3f7ff', B = '#a9dcf7';
        const c = 'M85 39L91.5 47V62L85 73L78.5 62V47Z';
        return DU.both(0, gem(85, 32, 4.6, '#ffffff') + p(c, B, ln, 1.8) + `<path d="M85 39L78.5 47V62L85 73Z" fill="${A}"/>` +
          p('M85 39V73M78.5 47L85 52L91.5 47M78.5 62L85 58L91.5 62', 'none', '#fff', 1.1, 'stroke-opacity=".9"') + p(c, 'none', ln, 1.8)) +
          DU.sparkle(101, 44, 5.5, '#fff') + DU.sparkle(-100, 62, 4.5, '#fff') + DU.sparkle(-72, 36, 3, '#e3f4ff') + DU.sparkle(72, 70, 3, '#e3f4ff');
      },
    },
  ]);
})();
