/* acc-body2.js — MORE necklaces, bracelets, bags, hand-held things and "wings" slot items
   (second batch; same conventions as acc-body.js). Body coordinates, everything hangs off rig
   anchors. Bags use the right-of-picture hand / shoulder (s = +1), hand-held things the
   left-of-picture hand (s = -1), so both can be worn together. */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const { n, p, ov, sym, tube } = DU;

  /* tagged template that rounds numbers:  d`M${x} ${y}` */
  const d = (s, ...v) => s.reduce((a, x, i) => a + x + (i < v.length ? (typeof v[i] === 'number' ? n(v[i]) : v[i]) : ''), '');
  const ell = (x, y, rx, ry, fill, line, sw = 2, extra = '') =>
    `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill || 'none'}"${line ? ` stroke="${line}" stroke-width="${sw}"` : ''}${extra ? ' ' + extra : ''}/>`;
  const circ = (x, y, r, fill, line, sw, extra) => ell(x, y, r, r, fill, line, sw, extra);
  const ln = (dd, line, sw = 2, extra = '') => p(dd, 'none', line, sw, extra);
  const rope = (dd, fill, line, w = 3.2) => ln(dd, line, w + 2.6) + ln(dd, fill, w);
  const GOLD = '#ffd24d', GOLD_L = '#b07a1e', GOLD_D = '#f0a92e', SILVER = '#e3e7f5', SILVER_L = '#8a90ad';
  const LEAF = '#7fcf7a', LEAF_L = '#3f8f4a';

  /* ---------- frames (see acc-body.js) ---------- */
  const wristG = (R, s, svg) => {
    const w = R.wrist(s);
    return `<g transform="translate(${n(w.x)} ${n(w.y)})${s < 0 ? ' scale(-1 1)' : ''} rotate(${n(-R.armAngle)})">${svg}</g>`;
  };
  const handG = (R, s, svg, rot = 0) => {
    const h = R.hand(s);
    return `<g transform="translate(${n(h.x)} ${n(h.y)})${s < 0 ? ' scale(-1 1)' : ''}${rot ? ` rotate(${n(rot)})` : ''}">${svg}</g>`;
  };
  const armW = (R) => R.arm(0.93).w + 2.2; // half width of a bracelet
  const uD = (cx, y0, X, D) =>
    d`M${cx - X} ${y0}C${cx - X} ${y0 + D * 0.552} ${cx - X * 0.552} ${y0 + D} ${cx} ${y0 + D}C${cx + X * 0.552} ${y0 + D} ${cx + X} ${y0 + D * 0.552} ${cx + X} ${y0}`;
  function uPts(cx, y0, X, D, spacing) {
    const N = 64, raw = [], len = [0];
    for (let i = 0; i <= N; i++) {
      const th = (Math.PI * i) / N;
      raw.push([cx - X * Math.cos(th), y0 + D * Math.sin(th)]);
      if (i) len.push(len[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
    }
    let count = Math.max(3, Math.round(len[N] / spacing));
    if (count % 2 === 0) count++;
    const out = [];
    for (let k = 0; k < count; k++) {
      const target = (len[N] * k) / (count - 1);
      let j = 1;
      while (j < N && len[j] < target) j++;
      const t = (target - len[j - 1]) / (len[j] - len[j - 1] || 1);
      out.push([raw[j - 1][0] + (raw[j][0] - raw[j - 1][0]) * t, raw[j - 1][1] + (raw[j][1] - raw[j - 1][1]) * t]);
    }
    return out;
  }
  const chain = (R, D, color = GOLD_D) => ln(uD(R.cx, R.sY - 9, R.nk + 3, D), color, 1.7);
  const bracelet = (y0, y1, W, bow = 2.4) => d`M${-W} ${y0}Q0 ${y0 + bow} ${W} ${y0}L${W} ${y1}Q0 ${y1 + bow} ${-W} ${y1}Z`;
  const sparkles = (list, fill = '#fff') => list.map((q) => DU.sparkle(q[0], q[1], q[2], q[3] || fill, q[4] || 1)).join('');
  const gem = (x, y, r, fill, line) => p(d`M${x} ${y - r}L${x + r * 0.8} ${y}L${x} ${y + r}L${x - r * 0.8} ${y}Z`, fill, line, 1.3);
  const MOON = 'M5 -13A13.5 13.5 0 1 0 14 9A10.5 10.5 0 0 1 5 -13Z';
  /* a scallop shell hanging from its hinge at (x, y); r = half width */
  function shell(x, y, r, fill = '#ffe9dc', line = '#c98f7a') {
    const body = d`M${x - r * 0.3} ${y}L${x + r * 0.3} ${y}C${x + r * 1.15} ${y + r * 0.35} ${x + r * 1.1} ${y + r * 1.45} ${x + r * 0.5} ${y + r * 1.7}Q${x + r * 0.25} ${y + r * 1.9} ${x} ${y + r * 1.72}Q${x - r * 0.25} ${y + r * 1.9} ${x - r * 0.5} ${y + r * 1.7}C${x - r * 1.1} ${y + r * 1.45} ${x - r * 1.15} ${y + r * 0.35} ${x - r * 0.3} ${y}Z`;
    const ribs = d`M${x} ${y + 1}V${y + r * 1.62}M${x - r * 0.12} ${y + 1}L${x - r * 0.46} ${y + r * 1.56}M${x + r * 0.12} ${y + 1}L${x + r * 0.46} ${y + r * 1.56}M${x - r * 0.2} ${y + 1}L${x - r * 0.84} ${y + r * 1.22}M${x + r * 0.2} ${y + 1}L${x + r * 0.84} ${y + r * 1.22}`;
    return p(body, fill, line, 1.4) + ln(ribs, line, 1, 'stroke-opacity=".55"');
  }
  /* fingers that wrap a held cup take the skin color — or the glove color when gloves are on */
  function fingerSkin(ctx) {
    let sk = (ctx && ctx.sk) || { fill: '#ffe3d1', line: '#b98a80' };
    const gl = ctx && ctx.state && ctx.state.wear && ctx.state.wear.bracelet;
    if (gl && (gl.id === 'br_gloves' || gl.id === 'br_lace')) {
      const it = DU.itemById && DU.itemById[gl.id];
      const c = gl.c || (it && it.color) || '#ffffff';
      sk = { fill: c, line: DU.line(c) };
    }
    return sk;
  }
  const rrect = (x0, y0, x1, y1, r) => d`M${x0 + r} ${y0}H${x1 - r}Q${x1} ${y0} ${x1} ${y0 + r}V${y1 - r}Q${x1} ${y1} ${x1 - r} ${y1}H${x0 + r}Q${x0} ${y1} ${x0} ${y1 - r}V${y0 + r}Q${x0} ${y0} ${x0 + r} ${y0}Z`;

  /* ================================================================== NECKLACES */
  const necklaces = [
    {
      id: 'nk_shell', slot: 'necklace', name: 'שרשרת צדפים', tags: ['hawaii', 'beach', 'pirate'], color: '#5cc8ff',
      draw(R, P) {
        const y0 = R.sY - 9, X = R.nk + 4, D = 34;
        const pts = uPts(R.cx, y0, X, D, 6.4), mid = (pts.length - 1) / 2;
        let o = ln(uD(R.cx, y0, X, D), '#b98a5a', 1.5);
        pts.forEach((q, i) => {
          const k = Math.abs(i - mid);
          if (k === 0 || k === 3) return;
          const c = i % 2 ? '#ffffff' : P.base;
          o += circ(q[0], q[1], 2.4, c, DU.line(c), 1);
        });
        [-3, 3].forEach((k) => { const q = pts[mid + k]; if (q) o += shell(q[0], q[1] - 1.5, 4.4, '#fff3e6', '#c9a07a'); });
        return o + shell(pts[mid][0], pts[mid][1] - 2, 7.6, '#ffd9cf', '#c9807a');
      },
    },
    {
      id: 'nk_sheriff', slot: 'necklace', name: 'כוכב שריף', tags: ['cowgirl'], color: '#8a5a3a',
      draw(R, P) {
        const { cx, sY, nk } = R, ky = sY + 7;
        const cord = d`M${cx - nk - 1.5} ${sY - 12}Q${cx - 9} ${sY - 3} ${cx - 2.2} ${ky}M${cx + nk + 1.5} ${sY - 12}Q${cx + 9} ${sY - 3} ${cx + 2.2} ${ky}`;
        const tails = d`M${cx - 2.2} ${ky}Q${cx - 5} ${sY + 30} ${cx - 7.5} ${sY + 50}M${cx + 2.2} ${ky}Q${cx + 5} ${sY + 28} ${cx + 7} ${sY + 45}`;
        const tip = (x, y) => p(d`M${x - 2.3} ${y}h4.6l-1 9.5h-2.6Z`, SILVER, SILVER_L, 1);
        let balls = '';
        for (let i = 0; i < 5; i++) { const a = ((-90 + i * 72) * Math.PI) / 180; balls += circ(cx + Math.cos(a) * 12.8, ky + Math.sin(a) * 12.8, 2.3, GOLD, GOLD_L, 0.9); }
        return rope(cord, P.fill, P.line, 2) + rope(tails, P.fill, P.line, 2) + tip(cx - 7.5, sY + 49) + tip(cx + 7, sY + 44) +
          p(DU.starD(cx, ky, 12.6, 5, 0.5), GOLD, GOLD_L, 1.8) + balls + circ(cx, ky, 4.8, '#fff3a8', GOLD_L, 1) +
          p(DU.starD(cx, ky, 2.7), GOLD_D, null) + ln(d`M${cx - 7.4} ${ky - 4.4}l3.4 -4.8`, '#fff', 1.4, 'stroke-opacity=".8"');
      },
    },
    {
      id: 'nk_headphones', slot: 'necklace', name: 'אוזניות על הצוואר', tags: ['pop', 'retro', 'rock'], color: '#ff6f91',
      draw(R, P) {
        const { cx, sY, nk } = R, lt = DU.light(P.base, 0.5);
        const one = (s) => {
          const x = cx + s * (nk + 15), y = sY + 10, rot = `transform="rotate(${n(s * 10)} ${n(x)} ${n(y)})"`;
          const band = d`M${cx + s * (nk + 0.5)} ${sY - 13}Q${cx + s * (nk + 12)} ${sY - 13} ${x - s * 1} ${y - 11}`;
          return ln(band, P.line, 8) + ln(band, P.fill, 5) +
            ell(x - s * 3.4, y + 0.6, 9, 12.4, '#4a4560', '#2f2a3f', 1.6, rot) +
            ell(x, y, 9.6, 12.8, P.fill, P.line, 2, rot) + ell(x, y, 5.6, 8.2, lt, P.line, 1.2, rot) +
            p(DU.starD(x, y, 3.6), '#fff', null) + ell(x - 3.6, y - 8, 2.6, 1.6, '#fff', null, 0, 'fill-opacity=".7"');
        };
        return one(-1) + one(1);
      },
    },
    {
      id: 'nk_bell', slot: 'necklace', name: 'קולר פעמון', tags: ['kawaii', 'anime'], color: '#e0435f',
      draw(R, P) {
        const { cx, sY } = R, X = R.nk + 0.8, yT = sY - 14, yB = sY - 7.4, by = yB + 13;
        const band = d`M${cx - X} ${yT}Q${cx} ${yT + 7} ${cx + X} ${yT}L${cx + X + 1.6} ${yB}Q${cx} ${yB + 8} ${cx - X - 1.6} ${yB}Z`;
        return p(band, P.fill, P.line, 1.8) + ln(d`M${cx - X + 2} ${yT + 3.2}Q${cx} ${yT + 9} ${cx + X - 2} ${yT + 3.2}`, '#fff', 1.2, 'stroke-opacity=".5"') +
          circ(cx, by, 7.2, GOLD, GOLD_L, 1.8) + ln(d`M${cx - 6.8} ${by - 0.6}Q${cx} ${by + 2.4} ${cx + 6.8} ${by - 0.6}`, GOLD_L, 1.2) +
          circ(cx, by + 3.2, 1.5, GOLD_L) + ln(d`M${cx} ${by + 3.8}v2.8`, GOLD_L, 1.3) + ell(cx - 2.8, by - 3.6, 2.2, 1.5, '#fff', null, 0, 'fill-opacity=".85"') +
          DU.bow(cx, yB + 2, 7.6, P.fill, P.line);
      },
    },
    {
      id: 'nk_boa', slot: 'necklace', name: 'צעיף נוצות', tags: ['pop', 'party'], color: '#ff9ac1',
      draw(R, P) {
        const { cx, sY, nk } = R, lt = DU.light(P.base, 0.5);
        const pts = uPts(cx, sY - 13, nk + 16, 27, 9).map((q) => [q[0], q[1], 8.6]);
        [[-15, 20, 8.4], [-20, 33, 8.8], [-22, 47, 8.2], [-20, 60, 7.4], [-23, 72, 6]].forEach((q) => pts.push([cx + q[0], sY + q[1], q[2]]));
        [[16, 20, 8.4], [21, 34, 9], [23, 48, 8.6], [25, 62, 8], [23, 76, 7.2], [26, 88, 5.8]].forEach((q) => pts.push([cx + q[0], sY + q[1], q[2]]));
        const fluff = pts.map((q, i) => [q[0] + (i % 2 ? 1.6 : -1.6), q[1], q[2] + (i % 3) * 0.7]);
        return fluff.map((q) => circ(q[0], q[1], q[2], P.fill, P.line, 3.6)).join('') + fluff.map((q) => circ(q[0], q[1], q[2], P.fill)).join('') +
          fluff.map((q, i) => (i % 2 ? '' : circ(q[0] - q[2] * 0.25, q[1] - q[2] * 0.3, q[2] * 0.42, lt, null, 0, 'fill-opacity=".85"'))).join('') +
          fluff.map((q, i) => (i % 3 ? '' : ln(d`M${q[0] + 1.5} ${q[1] + 3}q3 2 5 -1`, P.line, 1.1, 'stroke-opacity=".4"'))).join('') +
          sparkles([[cx - 32, sY + 42, 3.4], [cx + 36, sY + 30, 3]]);
      },
    },
    {
      id: 'nk_locket', slot: 'necklace', name: 'תליון לב זהב', tags: ['paris', 'princess'], color: 'gold', fixed: true,
      draw(R, P, ctx) {
        const x = R.cx, y = R.sY - 9 + 29, hy = y + 12.5;
        const G = ctx.paint('gold', [x - 12, hy - 12, 24, 24]);
        return chain(R, 29) + circ(x, y + 1.6, 2.2, GOLD, GOLD_L, 1) +
          p(DU.heartD(x, hy, 10.5), G.fill, GOLD_L, 1.9) + p(DU.heartD(x, hy + 0.4, 6.6), 'none', '#fff', 1, 'stroke-opacity=".75"') +
          circ(x, hy - 1.4, 1.7, GOLD_L) + p(d`M${x - 1} ${hy - 0.6}h2l0.9 4.4h-3.8Z`, GOLD_L, null) +
          ell(x - 5, hy - 5.4, 2.4, 1.6, '#fff', null, 0, 'fill-opacity=".9"') + DU.sparkle(x + 13, hy - 8, 3.4, '#fff');
      },
    },
    {
      id: 'nk_compass', slot: 'necklace', name: 'מצפן', tags: ['pirate', 'nature'], color: '#e9b44c',
      draw(R, P) {
        const { cx } = R, y0 = R.sY - 9, D = 36, y = y0 + D + 12.5;
        const tick = [0, 90, 180, 270].map((a) => { const c = Math.cos((a * Math.PI) / 180), s = Math.sin((a * Math.PI) / 180); return d`M${cx + c * 7.2} ${y + s * 7.2}L${cx + c * 9.4} ${y + s * 9.4}`; }).join('');
        return ln(uD(cx, y0, R.nk + 3, D), '#8a5a3a', 2.2) + circ(cx, y - 14, 2.8, 'none', P.line, 1.8) +
          circ(cx, y, 13.4, P.fill, P.line, 2.1) + circ(cx, y, 10, '#fffaf0', P.line, 1.2) + ln(tick, '#8a7a6a', 1.3) +
          `<g transform="rotate(32 ${n(cx)} ${n(y)})">` + p(d`M${cx} ${y - 8.4}L${cx + 3} ${y}L${cx - 3} ${y}Z`, '#e0435f', '#8c1f38', 0.9) + p(d`M${cx} ${y + 8.4}L${cx + 3} ${y}L${cx - 3} ${y}Z`, '#cfd3e6', '#8a8fa8', 0.9) + '</g>' +
          circ(cx, y, 1.5, GOLD, GOLD_L, 0.8) + p(d`M${cx - 8.6} ${y - 3.6}A9.4 9.4 0 0 1 ${cx - 2} ${y - 9.2}`, 'none', '#fff', 1.8, 'stroke-opacity=".9"');
      },
    },
    {
      id: 'nk_sailorscarf', slot: 'necklace', name: 'צעיף מלחים', tags: ['anime', 'school'], color: '#e0435f',
      draw(R, P) {
        const { cx, sY, nk } = R, ky = sY + 31, a = nk + 19;
        const band = (s) => d`M${cx + s * (nk + 3)} ${sY - 11}L${cx + s * a} ${R.shY(a) - 2}Q${cx + s * (a - 6)} ${sY + 18} ${cx + s * 5} ${ky + 3}L${cx + s * 1} ${ky - 8}Q${cx + s * (nk - 3)} ${sY + 6} ${cx + s * (nk + 3)} ${sY - 11}Z`;
        const stripe = (s) => d`M${cx + s * (a - 3.4)} ${R.shY(a) + 3}Q${cx + s * (a - 9)} ${sY + 17} ${cx + s * 7} ${ky - 1.4}`;
        const tailL = d`M${cx - 4.5} ${ky + 2}L${cx - 16} ${ky + 33}L${cx - 6.5} ${ky + 29}L${cx - 2.5} ${ky + 36}L${cx + 1} ${ky + 4}Z`;
        const tailR = d`M${cx + 4.5} ${ky + 2}L${cx + 14} ${ky + 38}L${cx + 6.5} ${ky + 33}L${cx + 1.5} ${ky + 40}L${cx - 1} ${ky + 4}Z`;
        return p(tailL, P.fill, P.line, 2) + ov(tailL) + p(tailR, P.fill, P.line, 2) +
          p(band(-1), P.fill, P.line, 2.2) + p(band(1), P.fill, P.line, 2.2) + ln(stripe(-1) + stripe(1), '#fff', 1.6, 'stroke-opacity=".8"') +
          `<rect x="${n(cx - 6.5)}" y="${n(ky - 7)}" width="13" height="12" rx="4" fill="${P.fill}" stroke="${P.line}" stroke-width="2"/>` +
          ell(cx - 2, ky - 3.6, 2.6, 1.4, '#fff', null, 0, 'fill-opacity=".5"');
      },
    },
    {
      id: 'nk_moon', slot: 'necklace', name: 'תליון ירח', tags: ['space', 'magic'], price: 400, color: 'silver', fixed: true,
      draw(R, P, ctx) {
        const { cx } = R, y = R.sY - 9 + 30 + 14, gid = ctx.id('mglow');
        return chain(R, 30, '#b9bfd9') +
          `<defs><radialGradient id="${gid}"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".45" stop-color="#cfe4ff" stop-opacity=".6"/><stop offset="1" stop-color="#8fb8ff" stop-opacity="0"/></radialGradient></defs>` +
          circ(cx, y, 27, `url(#${gid})`) + circ(cx, y - 13.6, 2.1, SILVER, SILVER_L, 1) +
          `<g transform="translate(${n(cx - 3)} ${n(y)})">` + p(MOON, '#fff3b0', '#c9a23a', 1.8) + p('M0 -9.4A10 10 0 0 0 -2 7', 'none', '#fff', 1.6, 'stroke-opacity=".8"') + '</g>' +
          p(DU.starD(cx + 5.5, y + 0.5, 4.6), '#ffffff', '#c9a23a', 1) +
          sparkles([[cx - 22, y - 10, 4.4], [cx + 21, y - 6, 3.6, '#fff7b8'], [cx + 13, y + 18, 3], [cx - 15, y + 16, 2.6, '#dff0ff']]);
      },
    },
  ];

  /* ================================================================== BRACELETS */
  const stud = (x, y, r) => p(d`M${x} ${y - r}L${x + r} ${y}L${x} ${y + r}L${x - r} ${y}Z`, SILVER, SILVER_L, 0.9) + ln(d`M${x - r * 0.45} ${y - r * 0.1}L${x} ${y - r * 0.55}`, '#fff', 0.9);
  const bracelets = [
    {
      id: 'br_studs', slot: 'bracelet', name: 'צמיד ניטים', tags: ['rock'], color: '#3a3346',
      draw(R, P) {
        const W = armW(R) + 0.5;
        const cuff = (y0, y1, k, r) => {
          let o = p(bracelet(y0, y1, W, 2.4), P.fill, P.line, 1.7) +
            ln(d`M${-W + 1.5} ${y0 + 2}Q0 ${y0 + 4.4} ${W - 1.5} ${y0 + 2}M${-W + 1.5} ${y1 - 2}Q0 ${y1 + 0.4} ${W - 1.5} ${y1 - 2}`, '#fff', 0.9, 'stroke-opacity=".4" stroke-dasharray="2 2"');
          for (let i = 0; i < k; i++) { const t = -1 + (2 * (i + 0.5)) / k; o += stud(t * (W - 1), (y0 + y1) / 2 + 2.2 * (1 - t * t), r); }
          return o;
        };
        return wristG(R, 1, cuff(-21, -7.5, 4, 2.7)) + wristG(R, -1, cuff(-15.5, -8, 3, 2.3));
      },
    },
    {
      id: 'br_neon', slot: 'bracelet', name: 'צמידי ג׳לי', tags: ['retro', 'pop'], color: '#ff9a56',
      draw(R, P) {
        const W = armW(R) + 0.2;
        const ring = (y, c) => p(bracelet(y, y + 3.5, W), c, DU.line(c), 1.2, 'fill-opacity=".92"') + ln(d`M${-W + 2} ${y + 1.3}Q0 ${y + 3.2} ${W * 0.3} ${y + 2.4}`, '#fff', 1, 'stroke-opacity=".75"');
        const cols = [P.base, '#35e0c0', '#ffe14d', '#ff62c4', '#7d7bff'];
        return wristG(R, 1, cols.map((c, i) => ring(-25.5 + i * 4.3, c)).join('')) + wristG(R, -1, ring(-15, cols[3]) + ring(-10.7, cols[1]));
      },
    },
    {
      id: 'br_bows', slot: 'bracelet', name: 'סרטי יד', tags: ['kawaii', 'ballet'], color: '#ff9ac1',
      draw(R, P) {
        const W = armW(R);
        const g = p(bracelet(-15.5, -10.5, W, 2), P.fill, P.line, 1.5) + DU.bow(W * 0.25, -12.5, 8.6, P.fill, P.line, true);
        return { over: wristG(R, 1, g) + wristG(R, -1, g) };
      },
    },
    {
      id: 'br_shells', slot: 'bracelet', name: 'צמיד צדפים', tags: ['hawaii', 'beach'], color: '#7de3e0',
      draw(R, P) {
        const W = armW(R);
        const yAt = (t, y) => y + 2.4 * (1 - t * t);
        const cord = (y) => ln(d`M${-W} ${y}Q0 ${y + 4.8} ${W} ${y}`, '#b98a5a', 1.6);
        const bead = (t, y, c, r = 2.3) => circ(t * (W - 1), yAt(t, y), r, c, DU.line(c), 1);
        return wristG(R, 1, cord(-15) + bead(-0.88, -15, P.base) + bead(-0.28, -15, '#ffffff') + bead(0.28, -15, '#ffffff') + bead(0.88, -15, P.base) +
          shell(-0.58 * (W - 1), yAt(-0.58, -15) - 2, 3.9, '#fff3e6', '#c9a07a') + shell(0.58 * (W - 1), yAt(0.58, -15) - 2, 3.9, '#ffe1d6', '#c9807a') +
          p(DU.starD(0, yAt(0, -15) + 1.6, 4.8, 5, 0.5), '#ff9a76', '#c9603f', 1)) +
          wristG(R, -1, cord(-12) + bead(-0.6, -12, '#ffffff') + bead(0, -12, P.base, 2.6) + bead(0.6, -12, '#ffffff'));
      },
    },
    {
      id: 'br_cuffs', slot: 'bracelet', name: 'צמידי חלל', tags: ['space'], color: 'silver', fixed: true,
      draw(R, P, ctx) {
        const W = armW(R) + 1.4, gid = ctx.id('cl');
        const g =
          p(bracelet(-27, -5.5, W, 2.6), '#dfe4f5', SILVER_L, 1.8) +
          ov(d`M${W * 0.35} ${-24.8}L${W} -27L${W} -5.5L${W * 0.35} ${-3.3}Z`) +
          p(bracelet(-27.6, -23.6, W + 1, 2.6), '#f6f8ff', SILVER_L, 1.3) + p(bracelet(-9.4, -5.2, W + 1, 2.6), '#f6f8ff', SILVER_L, 1.3) +
          ln(d`M${-W + 2.5} -20.5v9M${W - 2.5} -20.5v9`, SILVER_L, 1, 'stroke-opacity=".6"') +
          circ(0, -14.4, 7.5, `url(#${gid})`) + circ(0, -14.4, 3.6, '#8ff0ff', '#3fa6c9', 1.1) + circ(-1, -15.4, 1.1, '#fff');
        return `<defs><radialGradient id="${gid}"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".5" stop-color="#7de8ff" stop-opacity=".6"/><stop offset="1" stop-color="#7de8ff" stop-opacity="0"/></radialGradient></defs>` +
          wristG(R, 1, g) + wristG(R, -1, g);
      },
    },
    {
      id: 'br_lace', slot: 'bracelet', name: 'כפפות תחרה', tags: ['princess', 'paris'], color: '#ffffff',
      draw(R, P, ctx) {
        const W = armW(R) + 1;
        const palm = 'M-7.9 -6C-10 6 -11 16.6 -8.9 25.8C-7 34.8 4.4 36.8 8.2 29C11.2 21.4 10 8 7.9 -6Z';
        const thumb = 'M-8.2 3.2C-15.4 7.8 -17 18.6 -12.4 23.8C-9.8 25.8 -7.6 22.8 -8.3 17.6Z';
        let dots = '';
        for (let r = 0; r < 7; r++) for (let c = -2; c <= 2; c++) dots += circ(c * 5.2 + (r % 2 ? 2.6 : 0), r * 5.4, 1.05, P.line, null, 0, 'fill-opacity=".32"');
        const dx = (2 * W + 3) / 4;
        const cuff = d`M${-W - 1.5} -4.6Q0 -1.8 ${W + 1.5} -4.6L${W + 1.5} -10q${-dx / 2} -6.4 ${-dx} 0q${-dx / 2} -6.4 ${-dx} 0q${-dx / 2} -6.4 ${-dx} 0q${-dx / 2} -6.4 ${-dx} 0Z`;
        const lt = DU.lum(P.base) > 0.85 ? '#ffc1d9' : DU.light(P.base, 0.55);
        const mk = (id) => p(thumb, P.fill, P.line, 2) + p(palm, P.fill, P.line, 2) + `<path d="M-8.4 4.6L-7.6 17L-5 16.4L-5 5.4Z" fill="${P.fill}"/>` +
          DU.clip(id, palm, dots) + ln('M-1.8 27.6v5.2M3 26.8v4.8', P.line, 1.3, 'stroke-opacity=".5"') +
          p(cuff, P.fill, P.line, 1.7) + ln(d`M${-W + 1} -7.4Q0 -4.8 ${W - 1} -7.4`, P.line, 1, 'stroke-opacity=".45" stroke-dasharray="1.5 2.5"') +
          DU.bow(0, -7.2, 5, lt, DU.line(lt));
        return { over: wristG(R, 1, mk(ctx.id('lace'))) + wristG(R, -1, mk(ctx.id('lace'))) };
      },
    },
    {
      id: 'br_charm', slot: 'bracelet', name: 'צמיד קסמים', tags: ['magic', 'princess'], price: 300, color: 'gold', fixed: true,
      draw(R) {
        const W = armW(R), y = -19.5;
        const ch = d`M${-W} ${y}Q0 ${y + 5} ${W} ${y}`;
        const at = (t) => [t * (W - 0.6), y + 2.5 * (1 - t * t)];
        const hang = (t, len, svg) => { const q = at(t); return ln(d`M${q[0]} ${q[1]}v${len}`, GOLD_L, 1.1) + svg(q[0], q[1] + len); };
        const g = ln(ch, GOLD_L, 4.6, 'stroke-dasharray="0.1 3.4"') + ln(ch, GOLD, 2.8, 'stroke-dasharray="0.1 3.4"') +
          hang(-0.74, 3.2, (x, yy) => p(DU.starD(x, yy + 3.6, 4.4), '#fff3a8', GOLD_L, 1)) +
          hang(-0.25, 4.4, (x, yy) => p(DU.heartD(x, yy + 3.4, 3.8), '#ff8fb5', '#c9457a', 1)) +
          hang(0.25, 4.4, (x, yy) => gem(x, yy + 4, 3.6, '#7de3ff', '#3f9fc9')) +
          hang(0.74, 3.2, (x, yy) => `<g transform="translate(${n(x - 1)} ${n(yy + 4)}) scale(.34)">` + p(MOON, '#fff3b0', GOLD_L, 3) + '</g>') +
          sparkles([[-W - 5, -22, 3.6], [W + 6, -16, 3, '#fff7b8'], [-W - 3, -6, 2.4, '#fff7b8']]);
        return wristG(R, 1, g);
      },
    },
  ];

  /* ================================================================== BAGS (s = +1) */
  const bags = [
    {
      id: 'bag_satchel', slot: 'bag', name: 'ילקוט עור', tags: ['british', 'school'], color: '#a8703d',
      draw(R, P) {
        const { cx, hipY, nk } = R, bx = cx + R.hp - 14, by = hipY + 15, dk = DU.dark(P.base, 0.28);
        const s1 = tube([{ x: cx - nk - 16, y: R.shY(nk + 16) - 2.5, w: 3.8 }, { x: bx - 16, y: by - 18, w: 3.8 }], 0.2, 0);
        const s2 = tube([{ x: bx + 18, y: by - 17, w: 3.8 }, { x: cx + R.side(hipY - 26) + 1.5, y: hipY - 26, w: 3.8 }], 0, 0.5);
        const body = rrect(bx - 25, by - 18, bx + 25, by + 21, 6);
        const flap = d`M${bx - 19} ${by - 18}H${bx + 19}Q${bx + 25} ${by - 18} ${bx + 25} ${by - 12}V${by + 1}Q${bx + 25} ${by + 8} ${bx + 18} ${by + 8}H${bx - 18}Q${bx - 25} ${by + 8} ${bx - 25} ${by + 1}V${by - 12}Q${bx - 25} ${by - 18} ${bx - 19} ${by - 18}Z`;
        const strap = (x) => `<rect x="${n(x - 3.6)}" y="${n(by - 16)}" width="7.2" height="31" rx="2" fill="${dk}" stroke="${P.line}" stroke-width="1.4"/>` +
          `<rect x="${n(x - 4.8)}" y="${n(by + 4)}" width="9.6" height="7.4" rx="1.6" fill="${GOLD}" stroke="${GOLD_L}" stroke-width="1.3"/>` + ln(d`M${x} ${by + 5.4}v4.6`, GOLD_L, 1.3);
        const hd = d`M${bx - 9} ${by - 18}q9 -12 18 0`;
        return {
          over: p(s1, dk, P.line, 1.8) + p(s2, dk, P.line, 1.8) + ln(hd, P.line, 5.6) + ln(hd, dk, 3) +
            p(body, P.fill, P.line, 2.3) + ov(body) + p(flap, P.fill, P.line, 2.1) +
            ln(d`M${bx - 21} ${by - 11}V${by}Q${bx - 21} ${by + 4} ${bx - 17} ${by + 4}H${bx + 17}Q${bx + 21} ${by + 4} ${bx + 21} ${by}V${by - 11}`, '#fff', 1.1, 'stroke-opacity=".55" stroke-dasharray="2.5 3"') +
            strap(bx - 12) + strap(bx + 12) + ell(bx, by - 14.4, 5, 1.6, '#fff', null, 0, 'fill-opacity=".35"'),
        };
      },
    },
    {
      id: 'bag_randoseru', slot: 'bag', name: 'תיק גב יפני', tags: ['anime', 'school'], color: '#e0435f',
      draw(R, P) {
        const { cx, sY, hipY, sh, nk } = R, W = sh + 16, top = sY - 14, bot = hipY - 4, dk = DU.dark(P.base, 0.22);
        const body = sym(cx, [[0, top], [W - 20, top], [W - 6, top, W, top + 6, W, top + 20], [W + 1.5, bot - 14], [W + 1.5, bot - 4, W - 5, bot, W - 14, bot], [0, bot]]);
        const side = (s) => ln(d`M${cx + s * (W - 7)} ${top + 16}V${bot - 8}`, P.line, 1.4, 'stroke-opacity=".45"') +
          `<rect x="${n(cx + s * (W - 1) - 4)}" y="${n((top + bot) / 2 - 6)}" width="8" height="12" rx="2" fill="${GOLD}" stroke="${GOLD_L}" stroke-width="1.3"/>`;
        const cx0 = cx - W - 3, cy0 = top + 54;
        const charm = ln(d`M${cx0 + 3} ${cy0 - 16}Q${cx0 - 3} ${cy0 - 8} ${cx0} ${cy0}`, '#ff9ac1', 1.8) + circ(cx0, cy0 + 5, 5.4, GOLD, GOLD_L, 1.4) + ln(d`M${cx0 - 4.6} ${cy0 + 5}h9.2`, GOLD_L, 1) + circ(cx0, cy0 + 8, 1.1, GOLD_L) + DU.bow(cx0 + 0.5, cy0 - 1, 4.6, '#ff9ac1', DU.line('#ff9ac1'));
        const hd = d`M${cx - 11} ${top}q11 -15 22 0`;
        const back = ln(hd, P.line, 5.4) + ln(hd, dk, 2.8) + p(body, P.fill, P.line, 2.4) +
          ov(sym(cx, [[0, top + 34], [W, top + 34], [W + 1.5, bot - 14], [W + 1.5, bot - 4, W - 5, bot, W - 14, bot], [0, bot]])) +
          ln(d`M${cx - W + 1} ${top + 34}H${cx + W - 1}`, P.line, 1.6, 'stroke-opacity=".5"') + side(1) + side(-1) + charm;
        const strap = (s) => {
          const sp = [{ x: cx + s * (nk + 15), y: R.shY(nk + 15) - 3, w: 6 }, { x: cx + s * (R.ch - 4), y: sY + 34, w: 6 }, { x: cx + s * (R.side(sY + 74) - 1.5), y: sY + 76, w: 5.6 }];
          return p(tube(sp, 0.3, 0.4), P.fill, P.line, 2.1) +
            ln(d`M${sp[0].x - s * 2.8} ${sp[0].y + 6}L${sp[2].x - s * 3.4} ${sp[2].y - 5}M${sp[0].x + s * 2.6} ${sp[0].y + 7}L${sp[2].x + s * 2} ${sp[2].y - 5}`, '#fff', 1.1, 'stroke-opacity=".55" stroke-dasharray="3 3.2"') +
            circ(sp[1].x + s * 1.4, sp[1].y + 16, 4.2, 'none', SILVER_L, 3.4) + circ(sp[1].x + s * 1.4, sp[1].y + 16, 4.2, 'none', '#f3f5ff', 1.6);
        };
        return { back, over: strap(1) + strap(-1) };
      },
    },
    {
      id: 'bag_bunny', slot: 'bag', name: 'תיק ארנב', tags: ['kawaii'], color: '#ffc1d9',
      draw(R, P) {
        const bx = 11, cy = 68, lt = DU.light(P.base, 0.6);
        const ear = (x, rot) => `<g transform="rotate(${rot} ${x} ${cy - 14})">` + ell(x, cy - 32, 6.8, 17, P.fill, P.line, 2.1) + ell(x, cy - 31, 3.3, 11.5, lt) + '</g>';
        const handle = d`M${bx - 13} ${cy - 16}C${bx - 20} 30 -6 16 0 4C6 16 ${bx + 20} 30 ${bx + 13} ${cy - 16}`;
        return handG(R, 1,
          rope(handle, lt, P.line, 2.8) + ear(bx - 12, -16) + ear(bx + 12, 14) +
          ell(bx, cy, 26, 21.5, P.fill, P.line, 2.3) + ov(d`M${bx + 12} ${cy - 19}A26 21.5 0 0 1 ${bx + 4} ${cy + 21.3}A30 26 0 0 0 ${bx + 12} ${cy - 19}Z`) +
          ell(bx, cy + 6.5, 9.5, 7, lt) +
          circ(bx - 10, cy - 1.5, 2.7, '#3a2530') + circ(bx + 10, cy - 1.5, 2.7, '#3a2530') + circ(bx - 10.8, cy - 2.4, 0.9, '#fff') + circ(bx + 9.2, cy - 2.4, 0.9, '#fff') +
          p(DU.heartD(bx, cy + 3.6, 2.6), '#ff6f91', null) + ln(d`M${bx} ${cy + 6}q-3 3.4 -6 0.6M${bx} ${cy + 6}q3 3.4 6 0.6`, '#4a2f35', 1.2) +
          ell(bx - 16, cy + 5, 3.8, 2.4, '#ff8fa5', null, 0, 'fill-opacity=".7"') + ell(bx + 16, cy + 5, 3.8, 2.4, '#ff8fa5', null, 0, 'fill-opacity=".7"') +
          ell(bx - 10, cy - 14, 7, 2.2, '#fff', null, 0, 'fill-opacity=".45"') +
          DU.bow(bx + 13, cy - 19, 6.6, '#ff6f91', DU.line('#ff6f91')));
      },
    },
    {
      id: 'bag_guitar', slot: 'bag', name: 'נרתיק גיטרה', tags: ['rock'], color: '#3a3346',
      draw(R, P) {
        const { cx, sY, hipY, nk } = R;
        const bx = cx + 60, by = hipY + 12, tx = cx - 114, ty = sY - 98;
        const len = Math.hypot(tx - bx, ty - by), ang = (Math.atan2(tx - bx, by - ty) * 180) / Math.PI, k = Math.round((len / 302) * 1000) / 1000;
        const lt = DU.light(P.base, 0.3);
        const shape = 'M-44 6C-46 -28 -30 -40 -27 -58C-24 -74 -34 -80 -32 -100C-30 -120 -14 -126 -12 -138L-11 -262C-11 -276 -14 -280 -13 -290Q-12 -302 0 -302Q12 -302 13 -290C14 -280 11 -276 11 -262L12 -138C14 -126 30 -120 32 -100C34 -80 24 -74 27 -58C30 -40 46 -28 44 6C42 36 20 46 0 46C-20 46 -42 36 -44 6Z';
        const inner = 'M-38 6C-40 -24 -25 -38 -21.5 -57C-19 -73 -28 -81 -26.5 -99C-25 -115 -9 -122 -7 -137L-6 -262C-6 -274 -8.5 -280 -8 -289Q-7 -296.5 0 -296.5Q7 -296.5 8 -289C8.5 -280 6 -274 6 -262L7 -137C9 -122 25 -115 26.5 -99C28 -81 19 -73 21.5 -57C25 -38 40 -24 38 6C36 31 18 40 0 40C-18 40 -36 31 -38 6Z';
        const latch = (x, y) => `<rect x="${x - 3.5}" y="${y - 5}" width="7" height="10" rx="1.6" fill="${SILVER}" stroke="${SILVER_L}" stroke-width="1.3"/>`;
        const g = p(shape, P.fill, P.line, 2.4) + p(inner, 'none', lt, 1.6, 'stroke-opacity=".8"') +
          latch(42, -6) + latch(31, -70) + latch(12, -200) + latch(12, -262) +
          p(DU.starD(24, 12, 9), '#ffd24d', '#b07a1e', 1.3) + p(DU.heartD(10, -24, 6.5), '#ff6f91', '#b03a5b', 1.2) + circ(-12, 12, 7, '#5cc8ff', '#2f7fb5', 1.2) + p(DU.starD(-12, 12, 3.6), '#fff', null) +
          p(DU.starD(0, -284, 6), '#ffd24d', '#b07a1e', 1.1) +
          ell(-22, -22, 5, 14, '#fff', null, 0, 'fill-opacity=".14" transform="rotate(-18 -22 -22)"');
        const a = { x: cx - nk - 17, y: R.shY(nk + 17) - 2.5 }, b = { x: cx + R.side(hipY - 22) + 1, y: hipY - 22 };
        const strap = tube([{ x: a.x, y: a.y, w: 4.4 }, { x: b.x, y: b.y, w: 4.4 }], 0.2, 0.3);
        return {
          back: `<g transform="translate(${n(bx)} ${n(by)}) rotate(${n(ang)}) scale(${k})">${g}</g>`,
          over: p(strap, DU.dark(P.base, 0.08), P.line, 1.9) + ln(d`M${a.x + 2} ${a.y + 4}L${b.x - 2} ${b.y - 4}`, '#fff', 1.1, 'stroke-opacity=".45" stroke-dasharray="3 3.5"'),
        };
      },
    },
    {
      id: 'bag_basket', slot: 'bag', name: 'סל קש', tags: ['hawaii', 'nature', 'paris'], color: '#ff6f91',
      draw(R, P, ctx) {
        const bx = 13, top = 36, STRAW = '#ecc98a', STRAW_L = '#9a6a2c';
        const body = d`M${bx - 30} ${top}L${bx + 30} ${top}L${bx + 24} ${top + 40}Q${bx} ${top + 46} ${bx - 24} ${top + 40}Z`;
        let weave = '';
        for (let r = 0; r < 5; r++) {
          weave += d`M${bx - 34} ${top + 9 + r * 8}Q${bx} ${top + 13 + r * 8} ${bx + 34} ${top + 9 + r * 8}`;
          for (let c = -4; c <= 4; c++) weave += d`M${bx + c * 8 + (r % 2 ? 4 : 0)} ${top + 2 + r * 8}v7.5`;
        }
        const handle = d`M${bx - 26} ${top + 3}C${bx - 30} 4 -10 3 0 3C10 3 ${bx + 30} 4 ${bx + 26} ${top + 3}`;
        const leaf = (x, y, a) => ell(x, y, 4, 9, LEAF, LEAF_L, 1.2, `transform="rotate(${a} ${x} ${y})"`);
        return handG(R, 1,
          rope(handle, STRAW, STRAW_L, 3.6) + ln(handle, STRAW_L, 1, 'stroke-opacity=".5" stroke-dasharray="1.5 4"') +
          leaf(bx - 24, top - 4, -50) + leaf(bx + 25, top - 4, 50) + leaf(bx - 6, top - 13, -15) + leaf(bx + 10, top - 13, 20) +
          DU.flower(bx - 16, top - 5, 8.4, P.base) + DU.flower(bx + 17, top - 5, 8.4, DU.light(P.base, 0.55)) + DU.flower(bx + 1, top - 9, 9.4, '#ffffff', '#ffb347') +
          p(body, STRAW, STRAW_L, 2.3) + DU.clip(ctx.id('bsk'), body, ln(weave, STRAW_L, 1.2, 'stroke-opacity=".55"')) +
          ov(d`M${bx + 12} ${top}L${bx + 30} ${top}L${bx + 24} ${top + 40}Q${bx + 16} ${top + 42.6} ${bx + 9} ${top + 43.6}Z`) + p(body, 'none', STRAW_L, 2.3) +
          `<rect x="${bx - 32.5}" y="${top - 3.5}" width="65" height="8.5" rx="4.2" fill="#f5dcaa" stroke="${STRAW_L}" stroke-width="2"/>` +
          DU.bow(bx - 20, top + 17, 7, P.fill, P.line, true));
      },
    },
    {
      id: 'bag_treasure', slot: 'bag', name: 'שק אוצר', tags: ['pirate'], color: '#c9a26a',
      draw(R, P) {
        const bx = 10, top = 36, dk = DU.dark(P.base, 0.22);
        const sack = d`M${bx - 17} ${top}C${bx - 36} ${top + 14} ${bx - 36} ${top + 48} ${bx - 22} ${top + 54}Q${bx} ${top + 60} ${bx + 22} ${top + 54}C${bx + 36} ${top + 48} ${bx + 36} ${top + 14} ${bx + 17} ${top}Z`;
        const coin = (x, y, r = 6) => circ(x, y, r, GOLD, GOLD_L, 1.4) + circ(x, y, r * 0.55, 'none', GOLD_D, 1.1) + ln(d`M${x - r * 0.5} ${y - r * 0.45}l${r * 0.35} ${-r * 0.3}`, '#fff', 1.1, 'stroke-opacity=".9"');
        const cords = d`M${bx - 14} ${top + 2}C${bx - 16} 16 -4 12 0 4C4 12 ${bx + 16} 16 ${bx + 14} ${top + 2}`;
        const tie = d`M${bx - 17} ${top + 8}Q${bx} ${top + 13} ${bx + 17} ${top + 8}`;
        return handG(R, 1,
          rope(cords, '#f3dcae', '#a87b3c', 2.6) +
          coin(bx - 9, top - 3) + coin(bx + 8, top - 5, 6.4) + coin(bx - 1, top - 8, 5.6) + coin(bx + 14, top + 0.5, 5) +
          p(sack, P.fill, P.line, 2.4) +
          ov(d`M${bx + 8} ${top + 1}C${bx + 24} ${top + 12} ${bx + 26} ${top + 44} ${bx + 10} ${top + 56.6}Q${bx + 16} ${top + 55.6} ${bx + 22} ${top + 54}C${bx + 36} ${top + 48} ${bx + 36} ${top + 14} ${bx + 17} ${top}Z`) +
          p(d`M${bx - 19} ${top - 1}Q${bx - 12} ${top + 5} ${bx - 6} ${top}Q${bx} ${top + 5} ${bx + 6} ${top}Q${bx + 12} ${top + 5} ${bx + 19} ${top - 1}L${bx + 17} ${top + 7}Q${bx} ${top + 12} ${bx - 17} ${top + 7}Z`, P.fill, P.line, 1.9) +
          ln(tie, '#a87b3c', 3.8) + ln(tie, '#f3dcae', 1.9) +
          `<rect x="${bx - 22}" y="${top + 27}" width="13" height="12" rx="2" fill="${dk}" stroke="${P.line}" stroke-width="1.2" transform="rotate(-8 ${bx - 15} ${top + 33})"/>` +
          ln(d`M${bx - 20} ${top + 30}l3 2M${bx - 13} ${top + 36}l2.6 2`, '#fff', 1, 'stroke-opacity=".6"') +
          circ(bx + 6, top + 33, 9.5, GOLD, GOLD_L, 1.6) + p(DU.starD(bx + 6, top + 33.4, 5.4), '#fff6c2', GOLD_L, 1) +
          sparkles([[bx + 24, top - 13, 4.4, '#fff7b8'], [bx - 22, top - 10, 3.4, '#fff'], [bx + 32, top + 18, 3, '#fff7b8']]));
      },
    },
    {
      id: 'bag_ballet', slot: 'bag', name: 'תיק בלט', tags: ['ballet', 'sport'], color: '#b48cff',
      draw(R, P, ctx) {
        const x0 = -22, x1 = 50, y0 = 36, y1 = 70, lt = DU.light(P.base, 0.5), SAT = '#ffb3cf', SAT_L = '#c9648c';
        const body = rrect(x0, y0, x1, y1, 12);
        const h1 = d`M2 ${y0 + 3}C1 20 -3 14 0 4`, h2 = d`M28 ${y0 + 3}C26 18 6 16 0 4`;
        const deco = `<rect x="${x0}" y="${y0 + 13}" width="${x1 - x0}" height="7" fill="#fff" fill-opacity=".85"/>` +
          `<rect x="${x0}" y="${y0}" width="11" height="${y1 - y0}" ${DU.SH}/><rect x="${x1 - 11}" y="${y0}" width="11" height="${y1 - y0}" ${DU.SH}/>`;
        const slipper = (x, y, rot) => `<g transform="rotate(${rot} ${x} ${y})">` + ell(x, y, 6.2, 11.5, SAT, SAT_L, 1.5) + ell(x, y - 2.5, 3.4, 6.4, '#ffe3ee', SAT_L, 0.9) + '</g>';
        const rib = d`M${x1 - 8} ${y0 + 8}Q${x1 + 2} ${y1 + 2} ${x1 - 3} ${y1 + 11}M${x1 - 8} ${y0 + 8}Q${x1 + 13} ${y1 - 6} ${x1 + 13} ${y1 + 6}`;
        return handG(R, 1,
          rope(h1, lt, P.line, 3.2) + rope(h2, lt, P.line, 3.2) +
          ln(rib, SAT_L, 2.8) + ln(rib, SAT, 1.4) + slipper(x1 - 3, y1 + 20, 8) + slipper(x1 + 14, y1 + 15, -14) +
          p(body, P.fill, P.line, 2.4) + DU.clip(ctx.id('bl'), body, deco) +
          ln(d`M${x0 + 14} ${y0 + 6.5}H${x1 - 14}`, P.line, 1.3, 'stroke-dasharray="2.4 2.6" stroke-opacity=".7"') +
          DU.bow(14, y0 + 24.5, 7.4, '#fff', P.line) + ell(x0 + 22, y0 + 4, 9, 1.7, '#fff', null, 0, 'fill-opacity=".4"') + p(body, 'none', P.line, 2.4));
      },
    },
    {
      id: 'bag_rocket', slot: 'bag', name: 'תיק רקטה', tags: ['space'], price: 450, color: 'silver', fixed: true,
      draw(R, P, ctx) {
        const { cx, hipY, nk } = R, bx = cx + R.hp - 9, by = hipY + 14;
        const S = ctx.paint('silver', [-14, -34, 30, 60]);
        const c1 = d`M${cx - nk - 16} ${R.shY(nk + 16) - 2}L${bx - 10} ${by - 12}`;
        const c2 = d`M${bx + 12} ${by - 14}L${cx + R.side(hipY - 24) + 1.5} ${hipY - 24}`;
        const beads = (dd) => ln(dd, SILVER_L, 4.2, 'stroke-dasharray="0.1 6"') + ln(dd, '#f3f5ff', 2.4, 'stroke-dasharray="0.1 6"');
        const RED = '#ff6f91', RED_L = '#b03a5b';
        const g =
          p('M-7 22Q-9 36 0 46Q9 36 7 22Z', '#ff9a56', '#e0603a', 1.6) + p('M-3.4 23Q-4 31 0 37Q4 31 3.4 23Z', '#ffe27a', null) +
          p('M-10.6 6L-23 27L-10 21Z', RED, RED_L, 1.8) + p('M10.6 6L23 27L10 21Z', RED, RED_L, 1.8) +
          p('M0 -33C13 -20 15 2 11 22L-11 22C-15 2 -13 -20 0 -33Z', S.fill, SILVER_L, 2.2) +
          p('M0 -33C6.4 -26.6 10 -19 11.8 -12L-11.8 -12C-10 -19 -6.4 -26.6 0 -33Z', RED, RED_L, 1.8) +
          `<rect x="-11.4" y="14" width="22.8" height="5" fill="${RED}" stroke="${RED_L}" stroke-width="1.2"/>` +
          circ(0, 1, 7, '#8fd8ff', '#3f7fd9', 2.2) + ell(-2.2, -1.4, 2.2, 3, '#fff', null, 0, 'fill-opacity=".85"') +
          ln('M-7.4 -8Q-9.6 6 -8 20', '#fff', 1.8, 'stroke-opacity=".8"');
        return {
          over: beads(c1) + beads(c2) + `<g transform="translate(${n(bx)} ${n(by)}) rotate(24)">${g}</g>` +
            sparkles([[bx + 28, by - 28, 5, '#fff7b8'], [bx - 22, by + 18, 3.6, '#fff'], [bx + 26, by + 20, 3.2, '#dff0ff']]),
        };
      },
    },
  ];

  /* ================================================================== HAND-HELD (s = -1) */
  const hands = [
    {
      id: 'hd_guitar', slot: 'hand', name: 'גיטרה', tags: ['rock', 'pop'], color: '#e0435f',
      draw(R, P) {
        const WOOD = '#e9c98f', WOOD_L = '#9a6a2c', FRET = '#5a3a2a';
        const body = 'M-5 58C-8 50 -22 44 -27 54C-31 62 -24 72 -25 82C-27 94 -36 102 -36 118C-36 140 -20 152 2 152C24 152 38 140 38 118C38 102 29 94 27 82C26 72 33 64 30 54C26 44 10 50 5 58Z';
        let frets = '';
        for (let y = -14; y < 56; y += 9) frets += d`M-3 ${y}h6`;
        const peg = (x, y) => circ(x, y, 2.2, SILVER, SILVER_L, 1);
        return handG(R, -1,
          p(body, P.fill, P.line, 2.4) +
          ov('M12 50C22 46 31 48 30 54C33 64 26 72 27 82C29 94 38 102 38 118C38 140 24 152 2 152C16 146 26 134 24 116C22 100 16 92 17 80C18 68 20 58 12 50Z') +
          p('M4 72C14 74 19 82 18 92C17 102 25 106 24 118C23 130 15 137 6 135C0 133 -3 124 -2 112C-1 98 -4 84 4 72Z', '#ffffff', P.line, 1.2, 'fill-opacity=".95"') +
          `<rect x="-8" y="82" width="16" height="5.6" rx="2" fill="#3a3346"/><rect x="-8" y="98" width="16" height="5.6" rx="2" fill="#3a3346"/>` +
          `<rect x="-9" y="114" width="18" height="6" rx="1.6" fill="${SILVER}" stroke="${SILVER_L}" stroke-width="1.2"/>` +
          circ(17, 125, 2.6, SILVER, SILVER_L, 1) + circ(12, 133, 2.6, SILVER, SILVER_L, 1) +
          p(DU.starD(-20, 124, 6.4), '#ffd24d', GOLD_L, 1.1) +
          p('M-5 -22L-7.8 -44Q-7.4 -53 0 -53Q7.4 -53 7.8 -44L5 -22Z', P.fill, P.line, 2) + peg(-9.6, -44) + peg(-9, -36) + peg(-8.2, -28) + peg(9.6, -44) + peg(9, -36) + peg(8.2, -28) +
          p('M-4.6 -22H4.6L5 64H-5Z', WOOD, WOOD_L, 1.8) + p('M-3 -20H3V62H-3Z', FRET, null) + ln(frets, '#e3e7f5', 1) +
          ln('M-1.8 -40V118M0 -42V118M1.8 -40V118', '#ffffff', 0.7, 'stroke-opacity=".75"') +
          ell(-22, 104, 4, 12, '#fff', null, 0, 'fill-opacity=".35" transform="rotate(12 -22 104)"'),
          -7);
      },
    },
    {
      id: 'hd_fan', slot: 'hand', name: 'מניפה', tags: ['anime', 'party'], color: '#ff9ac1',
      draw(R, P) {
        const px = 0, py = 10, r0 = 30, r1 = 74, a0 = -158, a1 = -22, N = 8, ROT = 30;
        const pt = (a, r) => [px + Math.cos((a * Math.PI) / 180) * r, py + Math.sin((a * Math.PI) / 180) * r];
        const arcBand = (b0, b1, ra, rb) => { const A = pt(b0, ra), B = pt(b0, rb), C = pt(b1, rb), D = pt(b1, ra); return d`M${A[0]} ${A[1]}L${B[0]} ${B[1]}A${rb} ${rb} 0 0 1 ${C[0]} ${C[1]}L${D[0]} ${D[1]}A${ra} ${ra} 0 0 0 ${A[0]} ${A[1]}Z`; };
        let ribs = '', folds = '', shade = '';
        for (let i = 0; i <= N; i++) {
          const a = a0 + ((a1 - a0) * i) / N, q0 = pt(a, r0), q1 = pt(a, r1), e = pt(a, r1 - 4);
          ribs += d`M${px} ${py}L${e[0]} ${e[1]}`;
          if (i && i < N) folds += d`M${q0[0]} ${q0[1]}L${q1[0]} ${q1[1]}`;
          if (i < N && i % 2) shade += arcBand(a, a0 + ((a1 - a0) * (i + 1)) / N, r0, r1);
        }
        const e0 = pt(a0 + 2, r1 - 4.5), e1 = pt(a1 - 2, r1 - 4.5);
        const f1 = pt(-124, 54), f2 = pt(-80, 56), f3 = pt(-46, 53);
        return handG(R, -1,
          ln(ribs, '#9a6a2c', 3.6) + ln(ribs, '#e9c98f', 1.9) +
          p(arcBand(a0, a1, r0, r1), P.fill, P.line, 2.2) + `<path d="${shade}" fill="#43206b" fill-opacity=".1"/>` + ln(folds, P.line, 1, 'stroke-opacity=".35"') +
          p(d`M${e0[0]} ${e0[1]}A${r1 - 4.5} ${r1 - 4.5} 0 0 1 ${e1[0]} ${e1[1]}`, 'none', GOLD, 2.2) +
          DU.flower(f1[0], f1[1], 7, '#ffffff', '#ffb347') + DU.flower(f2[0], f2[1], 8, '#fff0f6', '#ff6f91') + DU.flower(f3[0], f3[1], 6.4, '#ffffff', '#ffb347') +
          `<g transform="rotate(${-ROT} ${px} ${py})">` + ln(d`M${px} ${py + 3}q-2 9 0 17`, '#e0435f', 1.8) + p(d`M${px - 2.6} ${py + 19}h5.2l1.8 14h-8.8Z`, '#e0435f', '#8c1f38', 1.2) + ln(d`M${px - 1.4} ${py + 23}v9M${px + 1.4} ${py + 23}v9`, '#8c1f38', 0.9, 'stroke-opacity=".6"') + '</g>' +
          circ(px, py, 3.4, GOLD, GOLD_L, 1.3),
          ROT);
      },
    },
    {
      id: 'hd_parasol', slot: 'hand', name: 'שמשייה', tags: ['paris', 'anime', 'princess'], color: '#ffc1d9',
      draw(R, P) {
        const lt = DU.light(P.base, 0.6);
        const hook = 'M0 24V-27Q0 -38 9.5 -38Q18 -38 18 -28';
        const canopy = 'M-4 27C-18 36 -16 62 -11.5 98L-2.6 198L2.6 198L11.5 98C16 62 18 36 4 27Z';
        return handG(R, -1,
          ln(hook, '#9a6a2c', 6.2) + ln(hook, '#e9c98f', 3.6) +
          p('M-2.4 196L2.4 196L1 214L-1 214Z', GOLD, GOLD_L, 1.2) +
          p(canopy, P.fill, P.line, 2.3) + ov('M2 28C14 38 13 64 9 98L1 196L2.6 198L11.5 98C16 62 18 36 4 27Z') +
          ln('M0 30V194M-7.5 36Q-8.6 100 -1.6 190M7.5 36Q8.6 100 1.6 190', P.line, 1.2, 'stroke-opacity=".4"') +
          p('M-15 30q3.75 10 7.5 0q3.75 10 7.5 0q3.75 10 7.5 0q3.75 10 7.5 0L15.5 26Q0 19 -15.5 26Z', '#ffffff', P.line, 1.6) +
          p('M-13.6 68Q0 74 13.6 68L13 76Q0 82 -13 76Z', lt, P.line, 1.4) + DU.bow(0, 73, 7.6, '#ffffff', P.line, true) +
          DU.sparkle(-18, 112, 3.4, '#fff'),
          -9);
      },
    },
    {
      id: 'hd_boombox', slot: 'hand', name: 'טייפ', tags: ['retro'], color: '#ff6f91',
      draw(R, P) {
        const x0 = -32, x1 = 70, y0 = 30, y1 = 88, mx = (x0 + x1) / 2, dk = '#3a3346';
        const body = rrect(x0, y0, x1, y1, 8);
        const handle = d`M${x0 + 14} ${y0 + 2}V12Q${x0 + 14} 2 ${x0 + 24} 2H${x1 - 24}Q${x1 - 14} 2 ${x1 - 14} 12V${y0 + 2}`;
        const spk = (x) => circ(x, y0 + 38, 16, SILVER, SILVER_L, 1.8) + circ(x, y0 + 38, 12, dk) + circ(x, y0 + 38, 6.5, '#5a5470') + circ(x, y0 + 38, 2.6, SILVER) + ell(x - 5, y0 + 31, 3.4, 2, '#fff', null, 0, 'fill-opacity=".4"');
        let btn = '';
        for (let i = 0; i < 5; i++) btn += `<rect x="${n(mx - 16.4 + i * 6.8)}" y="${y0 + 4.4}" width="5.2" height="5.6" rx="1" fill="${i === 2 ? '#ffd24d' : '#fff'}" stroke="${P.line}" stroke-width="1"/>`;
        return handG(R, -1,
          ln(d`M${x1 - 10} ${y0}L${x1 + 8} ${y0 - 34}`, SILVER_L, 2.2) + circ(x1 + 8, y0 - 34, 2.6, SILVER, SILVER_L, 1) +
          ln(handle, P.line, 7.6) + ln(handle, dk, 4.6) +
          p(body, P.fill, P.line, 2.4) + ov(d`M${x0} ${y1 - 14}H${x1}V${y1 - 8}Q${x1} ${y1} ${x1 - 8} ${y1}H${x0 + 8}Q${x0} ${y1} ${x0} ${y1 - 8}Z`) +
          `<rect x="${x0 + 4}" y="${y0 + 3}" width="${x1 - x0 - 8}" height="8.4" rx="3" fill="#fff" fill-opacity=".3"/>` + btn +
          spk(x0 + 21) + spk(x1 - 21) +
          `<rect x="${mx - 12}" y="${y0 + 18}" width="24" height="15" rx="2.4" fill="${dk}" stroke="${P.line}" stroke-width="1.2"/>` + circ(mx - 5.5, y0 + 25.5, 3, '#fff') + circ(mx + 5.5, y0 + 25.5, 3, '#fff') + circ(mx - 5.5, y0 + 25.5, 1, dk) + circ(mx + 5.5, y0 + 25.5, 1, dk) +
          `<rect x="${mx - 12}" y="${y0 + 38}" width="24" height="5" rx="1.6" fill="#fff6c2" stroke="${P.line}" stroke-width="1"/>` + ln(d`M${mx + 3} ${y0 + 38.8}v3.4`, '#e0435f', 1.6) +
          DU.sparkle(x1 + 16, y0 + 2, 4, '#fff'));
      },
    },
    {
      id: 'hd_ukulele', slot: 'hand', name: 'יוקללה', tags: ['hawaii'], color: '#e9b56a',
      draw(R, P) {
        const dk = DU.dark(P.base, 0.4);
        const body = 'M0 40C-12 40 -17 48 -17 58C-17 66 -13 68 -15 76C-20 81 -25 89 -25 100C-25 116 -13 124 0 124C13 124 25 116 25 100C25 89 20 81 15 76C13 68 17 66 17 58C17 48 12 40 0 40Z';
        const peg = (x, y) => circ(x, y, 2, '#fffaf0', '#b9a98a', 1);
        return handG(R, -1,
          p(body, P.fill, P.line, 2.3) + ov('M6 41C13 42 17 50 17 58C17 66 13 68 15 76C20 81 25 89 25 100C25 116 13 124 0 124C10 118 16 110 15 99C14 90 9 84 8 76C7 68 10 62 9 54C8.6 48 8 44 6 41Z') +
          circ(0, 80, 7, dk, P.line, 1.2) + circ(0, 80, 9.6, 'none', '#fff', 1, 'stroke-opacity=".6"') +
          `<rect x="-8.5" y="103" width="17" height="4.4" rx="1.4" fill="${dk}"/>` +
          p('M-4.6 -18L-6.4 -36Q-6 -43 0 -43Q6 -43 6.4 -36L4.6 -18Z', dk, P.line, 1.8) + peg(-8, -36) + peg(-7.4, -27) + peg(8, -36) + peg(7.4, -27) +
          p('M-4 -18H4L4.4 46H-4.4Z', DU.dark(P.base, 0.18), P.line, 1.6) + ln('M-3 -8h6M-3 2h6M-3 12h6M-3 22h6M-3 32h6', '#fff', 0.9, 'stroke-opacity=".6"') +
          ln('M-2.2 -34V105M-0.7 -36V105M0.7 -36V105M2.2 -34V105', '#ffffff', 0.7, 'stroke-opacity=".8"') +
          ell(-19, 99, 2.6, 5, LEAF, LEAF_L, 1, 'transform="rotate(-30 -19 99)"') + DU.flower(-13, 108, 5.6, '#ff6f91'),
          -6);
      },
    },
    {
      id: 'hd_lasso', slot: 'hand', name: 'לאסו', tags: ['cowgirl'], color: '#d9a054',
      draw(R, P) {
        const tw = (dd) => rope(dd, P.fill, P.line, 3.2) + ln(dd, P.line, 1, 'stroke-opacity=".45" stroke-dasharray="1.2 4.2"');
        return handG(R, -1,
          tw('M4 66q-7 16 -3 30') + ln('M1 96l-3 6M1 96l0.6 7M1 96l4 5.4', P.line, 1.3) +
          tw(DU.ellD(37, 101, 19, 25)) +
          tw(DU.ellD(7, 40, 21, 29)) + tw(DU.ellD(12, 43, 23, 31)) + tw(DU.ellD(5, 45, 20, 28)) +
          tw('M22 70Q27 74 31 76') + `<rect x="27" y="71.5" width="9" height="8" rx="2.6" fill="${P.fill}" stroke="${P.line}" stroke-width="1.6" transform="rotate(30 31.5 75.5)"/>`);
      },
    },
    {
      id: 'hd_spyglass', slot: 'hand', name: 'משקפת פיראטים', tags: ['pirate'], color: '#8a5a3a',
      draw(R, P) {
        const sec = (y0, y1, w0, w1) => d`M${-w0} ${y0}L${w0} ${y0}L${w1} ${y1}L${-w1} ${y1}Z`;
        const ring = (y, w) => `<rect x="${n(-w - 1.2)}" y="${n(y - 2.6)}" width="${n(w * 2 + 2.4)}" height="5.2" rx="1.6" fill="${GOLD}" stroke="${GOLD_L}" stroke-width="1.3"/>`;
        return handG(R, -1,
          p(sec(30, 4, 5, 5.4), GOLD_D, GOLD_L, 1.6) +
          p(sec(4, -36, 7.4, 8), P.fill, P.line, 2) + ov('M2.6 4L7.4 4L8 -36L2.8 -36Z') +
          p(sec(-36, -86, 10.4, 11.4), P.fill, P.line, 2) + ov('M4 -36L10.4 -36L11.4 -86L4.4 -86Z') +
          ln('M-6.6 -42V-80M-4.2 -2V-30', '#fff', 1.6, 'stroke-opacity=".35"') +
          ring(30, 5) + ring(4, 7.4) + ring(-36, 10.4) + ring(-84, 11.4) +
          ell(0, -88, 11.4, 3.8, '#bfe6ff', GOLD_L, 1.4) + ell(-3.6, -88.6, 3.4, 1.2, '#fff', null, 0, 'fill-opacity=".9"') +
          DU.sparkle(17, -99, 4.4, '#fff'),
          38);
      },
    },
    {
      id: 'hd_baguette', slot: 'hand', name: 'בגט', tags: ['paris'], color: '#3f7fd9',
      draw(R, P, ctx) {
        const BR = '#e8b064', BR_L = '#9a6224', CR = '#fff0c9';
        const bread = (x, top) => p(d`M${x - 8} 32C${x - 10} -20 ${x - 9.6} ${top + 30} ${x - 5.6} ${top + 7}Q${x} ${top - 3} ${x + 5.6} ${top + 7}C${x + 9.6} ${top + 30} ${x + 10} -20 ${x + 8} 32Z`, BR, BR_L, 2) +
          [0, 1, 2, 3].map((i) => ln(d`M${x - 5} ${top + 30 + i * 17}q5 -7 10 -4`, CR, 3)).join('');
        const sleeve = 'M-15 40L-17 -24Q-10 -31 -3 -24Q5 -33 19 -25L17 40Q1 45 -15 40Z';
        let st = '';
        for (let i = -3; i <= 3; i++) st += `<rect x="${n(i * 9 - 1.2)}" y="-40" width="4.4" height="90" fill="${P.fill}" fill-opacity=".85"/>`;
        return handG(R, -1,
          `<g transform="rotate(8 6 30)">${bread(9, -96)}</g>` + bread(-3, -112) +
          p(sleeve, '#fffaf0', '#b9ad98', 2) + DU.clip(ctx.id('bgt'), sleeve, st) + ov('M6 -30Q12 -31 19 -25L17 40Q11 42 5 43Z') + p(sleeve, 'none', '#b9ad98', 2) +
          p(DU.heartD(1, 27, 5), '#fff', P.line, 1.1),
          22);
      },
    },
    {
      id: 'hd_teacup', slot: 'hand', name: 'כוס תה', tags: ['british'], color: '#ffc1d9',
      draw(R, P, ctx) {
        const sk = fingerSkin(ctx), lt = DU.light(P.base, 0.55);
        const finger = (x, y) => ell(x, y, 4.4, 3.1, sk.fill, sk.line, 1.5);
        return {
          over: handG(R, -1,
            ln('M-4 -22q-5 -6 0 -12t0 -12M6 -24q-5 -6 0 -12t0 -10', '#ffffff', 2.4, 'stroke-opacity=".85"') +
            ell(1, 20.5, 25, 5, lt, P.line, 2) + ell(1, 19.6, 15, 2.6, '#fff', null, 0, 'fill-opacity=".5"') +
            ln('M16 -4q11 -1 11 6t-13 8', P.line, 6.6) + ln('M16 -4q11 -1 11 6t-13 8', P.fill, 3) +
            p('M-6 14h12l1.4 4.4h-14.8Z', P.fill, P.line, 1.6) +
            p('M-16 -8L16 -8C16 6 10 15 0 15C-10 15 -16 6 -16 -8Z', P.fill, P.line, 2.3) + ov('M6 -8L16 -8C16 6 10 15 0 15C7 10 9 2 6 -8Z') +
            ell(0, -8, 16, 4.2, '#c98a4b', P.line, 2) + ell(0, -8, 15.2, 3.6, 'none', GOLD, 1.2) +
            DU.flower(-1, 3.4, 4.6, '#ffffff', '#ffd24d') + circ(8.4, 0, 1.4, '#fff', null, 0, 'fill-opacity=".8"') + circ(-9.6, 5, 1.2, '#fff', null, 0, 'fill-opacity=".8"') +
            finger(-16, -2) + finger(-14.4, 5) + finger(-11, 11.4)),
        };
      },
    },
    {
      id: 'hd_boba', slot: 'hand', name: 'באבל טי', tags: ['kawaii', 'anime'], color: '#f2c9a0',
      draw(R, P, ctx) {
        const sk = fingerSkin(ctx), GL = '#8a90ad';
        const cup = 'M-13.5 -26L13.5 -26L10.4 24Q0 27.4 -10.4 24Z';
        const finger = (x, y) => ell(x, y, 4.4, 3.1, sk.fill, sk.line, 1.5);
        const pearls = [[-6, 20], [0, 21.6], [6, 20], [-3.2, 15.6], [3.4, 15.4], [-7.6, 14], [7.8, 13.6]].map((q) => circ(q[0], q[1], 2.5, '#4a2f35')).join('');
        return {
          over: handG(R, -1,
            `<g transform="rotate(9 4 -30)"><rect x="1" y="-66" width="7" height="62" rx="2.4" fill="#ff6f91" stroke="#b03a5b" stroke-width="1.5"/>` + ln('M1.6 -56l5.8 -4M1.6 -44l5.8 -4M1.6 -32l5.8 -4', '#fff', 2) + '</g>' +
            p(cup, '#ffffff', null, 0, 'fill-opacity=".8"') + p('M-12.6 -12L12.6 -12L10.4 24Q0 27.4 -10.4 24Z', P.fill, null) + pearls +
            p('M-15 -26Q-14 -41 0 -41Q14 -41 15 -26Z', '#ffffff', GL, 1.8, 'fill-opacity=".6"') +
            `<rect x="-16" y="-28.6" width="32" height="5" rx="2.4" fill="#fff" stroke="${GL}" stroke-width="1.5"/>` +
            ln('M-9.6 -20L-7.6 18', '#fff', 2.4, 'stroke-opacity=".6"') +
            circ(-4.6, -1, 1.5, '#4a2f35') + circ(4.6, -1, 1.5, '#4a2f35') + ln('M-2.4 2.4q1.2 1.8 2.4 0q1.2 1.8 2.4 0', '#4a2f35', 1.1) +
            ell(-8, 2.8, 2.2, 1.4, '#ff8fa5', null, 0, 'fill-opacity=".7"') + ell(8, 2.8, 2.2, 1.4, '#ff8fa5', null, 0, 'fill-opacity=".7"') +
            p(cup, 'none', GL, 2) +
            finger(-13.4, -7) + finger(-12.8, 1) + finger(-12, 9)),
        };
      },
    },
    {
      id: 'hd_ribbon', slot: 'hand', name: 'סרט התעמלות', tags: ['ballet', 'sport'], color: '#ff6f91',
      draw(R, P) {
        const pts = [[0, -61], [20, -88], [48, -80], [48, -52], [26, -40], [32, -16], [60, -12], [82, -32], [106, -22], [104, 6], [80, 18], [84, 42], [110, 50]];
        const dd = DU.smooth(pts);
        return handG(R, -1,
          ln(dd, P.line, 10.4) + ln(dd, P.fill, 7.6) + ln(dd, '#fff', 1.5, 'stroke-opacity=".6" stroke-dasharray="9 10"') +
          p('M-1.9 22L1.9 22L1.4 -60L-1.4 -60Z', '#fff5fb', '#a38ac2', 1.5) + circ(0, -61, 2.6, GOLD, GOLD_L, 1.1) +
          sparkles([[66, -42, 4], [38, 8, 3.2, '#fff7b8'], [114, 26, 3.4]]),
          26);
      },
    },
    {
      id: 'hd_lightstick', slot: 'hand', name: 'מקל אור', tags: ['pop'], color: '#b48cff',
      draw(R, P, ctx) {
        const gid = ctx.id('ls');
        return `<defs><radialGradient id="${gid}"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".5" stop-color="${P.base}" stop-opacity=".5"/><stop offset="1" stop-color="${P.base}" stop-opacity="0"/></radialGradient></defs>` +
          handG(R, -1,
            ln('M-1.5 24q-10 12 -1 22q10 -8 4 -22', P.line, 1.6) +
            p('M-4.4 24Q0 26.4 4.4 24L5.4 -32L-5.4 -32Z', '#ffffff', '#a9a3c2', 1.9) + ov('M1 25Q3 25 4.4 24L5.4 -32L1.6 -32Z') +
            `<rect x="-5.6" y="-12" width="11.2" height="5" fill="${P.fill}" stroke="${P.line}" stroke-width="1.1"/>` + circ(0, -22, 2.2, P.fill, P.line, 1) +
            `<rect x="-7.4" y="-38" width="14.8" height="7" rx="2.4" fill="${SILVER}" stroke="${SILVER_L}" stroke-width="1.5"/>` +
            circ(0, -58, 36, `url(#${gid})`) +
            circ(0, -58, 20, P.fill, P.line, 2.1, 'fill-opacity=".5"') +
            p(DU.starD(0, -57.4, 11.5, 5, 0.5), '#fff7b8', GOLD_L, 1.3) + p(DU.starD(0, -57.4, 5), '#fff', null) +
            ell(-8, -67, 4, 6, '#fff', null, 0, 'fill-opacity=".7" transform="rotate(30 -8 -67)"') +
            sparkles([[-28, -80, 5], [27, -72, 4, '#fff7b8'], [20, -94, 3.4], [-26, -40, 3]]),
            24);
      },
    },
    {
      id: 'hd_rocket', slot: 'hand', name: 'חללית צעצוע', tags: ['space'], color: '#e0435f',
      draw(R, P) {
        return handG(R, -1,
          p('M-6 31Q-8 45 0 56Q8 45 6 31Z', '#ff9a56', '#e0603a', 1.6) + p('M-3 32Q-3.6 40 0 46Q3.6 40 3 32Z', '#ffe27a', null) +
          `<rect x="-6.5" y="26" width="13" height="5.6" rx="1.4" fill="#8a90ad" stroke="#5a607d" stroke-width="1.3"/>` +
          p('M-12 6L-25 34L-11.6 27Z', P.fill, P.line, 1.9) + p('M12 6L25 34L11.6 27Z', P.fill, P.line, 1.9) +
          p('M0 -80C13 -64 15 -30 12 27L-12 27C-15 -30 -13 -64 0 -80Z', '#ffffff', '#8a90ad', 2.2) + ov('M4 -74C13 -60 15 -30 12 27L5 27C8 -20 8 -54 4 -74Z') +
          p('M0 -80C7 -71 10.8 -59 12.6 -47L-12.6 -47C-10.8 -59 -7 -71 0 -80Z', P.fill, P.line, 1.9) +
          `<rect x="-12.6" y="13" width="25.2" height="5.4" fill="${P.fill}" stroke="${P.line}" stroke-width="1.2"/>` +
          circ(0, -32, 7.6, '#8fd8ff', '#3f7fd9', 2.2) + ell(-2.4, -34.6, 2.4, 3.2, '#fff', null, 0, 'fill-opacity=".85"') +
          ln('M-7.6 -44Q-10.4 -10 -9 22', '#e3e7f5', 1.6) +
          sparkles([[-22, -66, 4.4, '#fff7b8'], [22, -58, 3.6], [26, -20, 3, '#fff7b8']]),
          26);
      },
    },
    {
      id: 'hd_pinwheel', slot: 'hand', name: 'שבשבת', tags: ['nature', 'kawaii'], color: '#5cc8ff',
      draw(R, P) {
        const cols = [P.base, '#ff9ac1', '#ffd24d', '#8bdc7a'];
        const blade = (i) => { const c = cols[i], dk = DU.dark(c, 0.18); return `<g transform="rotate(${i * 90})">` + p('M0 0L27 -12L13 -1Z', dk, DU.line(c), 1.3) + p('M0 0L-1 -30Q18 -30 27 -12Z', c, DU.line(c), 1.6) + '</g>'; };
        return handG(R, -1,
          p('M-2 22L2 22L2 -82L-2 -82Z', '#fffaf0', '#b9a98a', 1.5) +
          `<g transform="translate(0 -82) rotate(14)">` + blade(0) + blade(1) + blade(2) + blade(3) + circ(0, 0, 4.6, GOLD, GOLD_L, 1.4) + circ(-1.2, -1.2, 1.4, '#fff', null, 0, 'fill-opacity=".8"') + '</g>' +
          sparkles([[-36, -102, 4], [38, -70, 3.4, '#fff7b8']]),
          20);
      },
    },
    {
      id: 'hd_crystal', slot: 'hand', name: 'כדור בדולח', tags: ['magic'], price: 500, color: 'galaxy', fixed: true,
      draw(R, P, ctx) {
        const sk = fingerSkin(ctx), g1 = ctx.id('orb'), g2 = ctx.id('halo'), ox = 5, oy = 2, r = 25;
        const finger = (x, y) => ell(x, y, 4.4, 3.1, sk.fill, sk.line, 1.5);
        return {
          over: `<defs><radialGradient id="${g1}" cx=".36" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#e6d4ff"/><stop offset=".7" stop-color="#9b78f0"/><stop offset="1" stop-color="#4f33a8"/></radialGradient>` +
            `<radialGradient id="${g2}"><stop offset="0" stop-color="#fff" stop-opacity=".8"/><stop offset=".55" stop-color="#c9a8ff" stop-opacity=".4"/><stop offset="1" stop-color="#c9a8ff" stop-opacity="0"/></radialGradient></defs>` +
            handG(R, -1,
              circ(ox, oy, 46, `url(#${g2})`) + circ(ox, oy, r, `url(#${g1})`, '#5a3fb0', 2.1) +
              ln(d`M${ox - 14} ${oy + 8}q8 -18 22 -9q9 7 3 15`, '#fff', 1.6, 'stroke-opacity=".55"') +
              p(DU.starD(ox + 6, oy + 4, 6.4), '#fff7b8', null) + DU.sparkle(ox - 7, oy + 10, 4, '#fff', 0.9) + DU.sparkle(ox + 12, oy - 10, 3, '#fff', 0.9) + circ(ox - 2, oy - 2, 1.2, '#fff') + circ(ox + 14, oy + 10, 1, '#fff') +
              ell(ox - 9, oy - 11, 6.4, 4, '#fff', null, 0, `fill-opacity=".8" transform="rotate(-30 ${ox - 9} ${oy - 11})"`) +
              finger(ox - r + 2.5, oy - 7) + finger(ox - r + 1, oy + 1) + finger(ox - r + 2.5, oy + 9) +
              sparkles([[ox - 34, oy - 26, 5.4], [ox + 34, oy - 22, 4.4, '#fff7b8'], [ox + 30, oy + 28, 3.6], [ox - 26, oy + 30, 3.2, '#ffe1f0'], [ox + 4, oy - 40, 3.4, '#fff7b8']])),
        };
      },
    },
  ];

  /* ================================================================== "WINGS" SLOT */
  const wingPair = (R, one) => { const x = R.cx, y = R.sY + 42; return `<g transform="translate(${n(x)} ${n(y)})">${one}</g><g transform="translate(${n(x)} ${n(y)}) scale(-1 1)">${one}</g>`; };
  const wings = [
    {
      /* a little parrot perched on the shoulder; drawn in front so hair does not hide it, placed clear of the face */
      id: 'wg_parrot', slot: 'wings', name: 'תוכי', tags: ['pirate', 'nature'], color: '#e0435f',
      draw(R, P) {
        const { cx, sY, sh } = R, lt = DU.light(P.base, 0.45), BL = '#3f9fe0', BL_L = '#245f9e', YE = '#ffd24d';
        const g =
          p('M-3 -6C-6 10 -5 26 -8 42L-1.5 39C0 26 2 12 3 -4Z', BL, BL_L, 1.5) + p('M2 -6C3 10 6 24 6 40L11 36C11 22 9 8 7 -5Z', P.fill, P.line, 1.5) +
          ell(-5, 0, 4, 2.6, YE, GOLD_L, 1.2) + ell(5, 0, 4, 2.6, YE, GOLD_L, 1.2) +
          p('M0 -40C12 -38 15 -20 12 -8C9 2 -9 2 -12 -8C-15 -20 -12 -38 0 -40Z', P.fill, P.line, 2) + ell(0, -13, 7, 9.5, lt) +
          p('M-11.5 -27C-18 -22 -17 -9 -11 -3C-9 -10 -9 -19 -11.5 -27Z', BL, BL_L, 1.5) + p('M11.5 -27C18 -22 17 -9 11 -3C9 -10 9 -19 11.5 -27Z', BL, BL_L, 1.5) +
          ln('M-14 -16q2 4 1.6 8M14 -16q-2 4 -1.6 8', YE, 1.6) +
          p('M-3 -52Q-6 -62 -1 -64Q-1 -58 1 -54Z', YE, GOLD_L, 1.2) + p('M1 -53Q1 -64 7 -64Q4 -58 5 -53Z', P.fill, P.line, 1.2) +
          circ(0, -41, 12.6, P.fill, P.line, 2) + ell(-6.4, -39.6, 4.8, 5.4, '#ffffff') + ell(6.4, -39.6, 4.8, 5.4, '#ffffff') +
          circ(-6, -40.4, 2.5, '#3a2530') + circ(6, -40.4, 2.5, '#3a2530') + circ(-6.7, -41.2, 0.9, '#fff') + circ(5.3, -41.2, 0.9, '#fff') +
          p('M-3.6 -37.4Q0 -40.6 3.6 -37.4Q3 -31 0 -29.4Q-3 -31 -3.6 -37.4Z', YE, GOLD_L, 1.3) + ln('M-2.4 -34.4Q0 -33 2.4 -34.4', GOLD_L, 1) +
          ell(-9.6, -35, 2.2, 1.4, '#ff8fa5', null, 0, 'fill-opacity=".8"') + ell(9.6, -35, 2.2, 1.4, '#ff8fa5', null, 0, 'fill-opacity=".8"') +
          ell(-4, -50, 3.4, 1.6, '#fff', null, 0, 'fill-opacity=".4"');
        return { front: `<g transform="translate(${n(cx + sh + 3)} ${n(sY + 13)}) rotate(12) scale(1.18)">${g}</g>` };
      },
    },
    {
      id: 'wg_foxtail', slot: 'wings', name: 'זנב שועל', tags: ['anime', 'kawaii'], color: '#f08a3c',
      draw(R, P) {
        const { cx, hipY } = R;
        const sp = [
          { x: cx + 14, y: hipY + 22, w: 9 }, { x: cx + 58, y: hipY + 64, w: 17 }, { x: cx + 108, y: hipY + 62, w: 25 },
          { x: cx + 146, y: hipY + 18, w: 27 }, { x: cx + 154, y: hipY - 34, w: 21 }, { x: cx + 138, y: hipY - 78, w: 8 },
        ];
        const zx = cx + 152, zy = hipY - 8;
        const tipSp = [{ x: zx, y: zy, w: 25 }, { x: cx + 154, y: hipY - 34, w: 21 }, { x: cx + 138, y: hipY - 78, w: 8 }];
        let zz = '';
        for (let i = 0; i <= 10; i++) { const t = i / 10; zz += (i ? 'L' : 'M') + n(zx - 24.8 + 49.6 * t) + ' ' + n(zy - 3.8 + 7.6 * t + (i % 2 ? 11 : 0)); }
        const tuft = (x, y, rot) => p(d`M${x - 7} ${y - 3}Q${x + 2} ${y + 3} ${x + 9} ${y + 12}Q${x} ${y + 8} ${x - 8} ${y + 5}Z`, P.fill, P.line, 1.8, `transform="rotate(${rot} ${n(x)} ${n(y)})"`);
        return tuft(cx + 84, hipY + 82, 22) + tuft(cx + 134, hipY + 66, -28) + tuft(cx + 170, hipY + 22, -75) +
          p(tube(sp, 0, 0.9), P.fill, P.line, 2.4) + p(tube(tipSp, 0, 0.9), '#ffffff', P.line, 2.2) +
          `<path d="${zz}L${n(zx + 23)} ${n(zy - 8)}L${n(zx - 23)} ${n(zy - 14)}Z" fill="#ffffff"/>` + ln(zz, P.line, 1.5, 'stroke-opacity=".5"') +
          ln(d`M${cx + 56} ${hipY + 74}Q${cx + 104} ${hipY + 82} ${cx + 138} ${hipY + 40}M${cx + 72} ${hipY + 58}Q${cx + 106} ${hipY + 60} ${cx + 128} ${hipY + 30}`, P.line, 1.4, 'stroke-opacity=".35"');
      },
    },
    {
      id: 'wg_jetpack', slot: 'wings', name: 'ג׳טפק', tags: ['space'], price: 700, color: 'silver', fixed: true,
      draw(R, P, ctx) {
        const { cx, sY, hipY, sh, nk } = R, tx = sh + 30, tw = 21, top = sY - 24, bot = hipY - 28;
        const S = ctx.paint('silver', [cx - tx - tw, top, 60, bot - top]);
        const RED = '#ff6f91', RED_L = '#b03a5b';
        const tank = (s) => {
          const x = cx + s * tx;
          const body = d`M${x - tw} ${top + 20}V${bot - 10}Q${x - tw} ${bot} ${x - tw + 10} ${bot}H${x + tw - 10}Q${x + tw} ${bot} ${x + tw} ${bot - 10}V${top + 20}Z`;
          return p(d`M${x - 12} ${bot + 8}Q${x - 15} ${bot + 38} ${x} ${bot + 64}Q${x + 15} ${bot + 38} ${x + 12} ${bot + 8}Z`, '#ff9a56', '#e0603a', 1.8) +
            p(d`M${x - 6} ${bot + 9}Q${x - 7.5} ${bot + 28} ${x} ${bot + 44}Q${x + 7.5} ${bot + 28} ${x + 6} ${bot + 9}Z`, '#ffe27a', null) +
            p(d`M${x + s * (tw - 2)} ${top + 58}L${x + s * (tw + 46)} ${top + 98}L${x + s * (tw + 42)} ${top + 116}L${x + s * (tw - 2)} ${top + 106}Z`, RED, RED_L, 2) +
            p(d`M${x - 11} ${bot - 1}H${x + 11}L${x + 14.5} ${bot + 10}H${x - 14.5}Z`, '#8a90ad', '#5a607d', 1.8) +
            p(body, S.fill, SILVER_L, 2.4) +
            p(d`M${x - tw} ${top + 21}Q${x - tw} ${top - 8} ${x} ${top - 22}Q${x + tw} ${top - 8} ${x + tw} ${top + 21}Z`, RED, RED_L, 2.2) +
            `<rect x="${n(x - tw)}" y="${n(top + 30)}" width="${tw * 2}" height="6" fill="#5cc8ff" stroke="${SILVER_L}" stroke-width="1"/>` +
            `<rect x="${n(x - tw)}" y="${n(bot - 24)}" width="${tw * 2}" height="6" fill="#5cc8ff" stroke="${SILVER_L}" stroke-width="1"/>` +
            `<rect x="${n(x - tw + 5)}" y="${n(top + 40)}" width="5" height="${n(bot - top - 70)}" rx="2.5" fill="#fff" fill-opacity=".6"/>` +
            ell(x - 8, top - 2, 4, 7, '#fff', null, 0, `fill-opacity=".45" transform="rotate(28 ${n(x - 8)} ${n(top - 2)})"`) +
            sparkles([[x + s * 20, bot + 50, 4, '#fff7b8'], [x - s * 16, bot + 70, 3, '#fff']]);
        };
        const back = `<rect x="${n(cx - tx)}" y="${n(top + 30)}" width="${n(tx * 2)}" height="${n(bot - top - 50)}" rx="8" fill="#aab2cf" stroke="${SILVER_L}" stroke-width="2"/>` + tank(-1) + tank(1);
        const strap = (s) => {
          const sp = [{ x: cx + s * (nk + 15), y: R.shY(nk + 15) - 3, w: 5 }, { x: cx + s * (R.ch - 4), y: sY + 34, w: 5 }, { x: cx + s * (R.side(sY + 72) - 1.5), y: sY + 74, w: 4.8 }];
          return p(tube(sp, 0.3, 0.4), '#6b7190', '#3f4460', 2);
        };
        const cy = sY + 44, hw = R.side(cy) - 3;
        const over = strap(1) + strap(-1) + `<rect x="${n(cx - hw)}" y="${n(cy - 4)}" width="${n(hw * 2)}" height="8" rx="3" fill="#6b7190" stroke="#3f4460" stroke-width="1.8"/>` +
          circ(cx, cy, 8, SILVER, SILVER_L, 1.8) + circ(cx, cy, 4.6, '#8ff0ff', '#3fa6c9', 1.2) + circ(cx - 1.3, cy - 1.4, 1.3, '#fff');
        return { back, over };
      },
    },
    {
      id: 'wg_dragon', slot: 'wings', name: 'כנפי דרקון', tags: ['magic'], price: 800, color: '#8b6cf0',
      draw(R, P) {
        const lt = DU.light(P.base, 0.42);
        const mem = 'M6 -2C24 -40 46 -86 70 -102C92 -116 112 -130 132 -132C162 -128 194 -116 210 -92Q176 -58 200 -4Q160 20 152 72Q96 30 6 20Z';
        const one =
          p(mem, lt, P.line, 2.4) +
          ln('M70 -100Q150 -84 196 -50M60 -84Q130 -30 168 28M40 -50Q90 0 136 50', P.line, 1.2, 'stroke-opacity=".28"') +
          rope('M132 -132Q178 -124 210 -92', P.fill, P.line, 3.6) + rope('M132 -132Q182 -70 200 -4', P.fill, P.line, 3.6) + rope('M132 -132Q152 -30 152 72', P.fill, P.line, 3.6) +
          rope('M6 0Q40 -76 70 -102Q100 -124 132 -132', P.fill, P.line, 5.6) +
          p('M128 -136Q124 -150 136 -154Q134 -144 139 -138Z', '#fff3d6', '#b9a070', 1.4) +
          sparkles([[178, -134, 5, '#fff7b8'], [212, -44, 4], [124, 62, 3.6, '#fff7b8'], [92, -44, 3]]);
        return wingPair(R, one);
      },
    },
    {
      id: 'wg_ribbons', slot: 'wings', name: 'סרטי קסם', tags: ['ballet', 'magic'], price: 500, color: '#ffc1d9',
      draw(R, P) {
        const lt = DU.lum(P.base) > 0.8 ? DU.dark(P.base, 0.12) : DU.light(P.base, 0.4);
        const rib = (pts, w, fill) => {
          const sp = pts.map((q, i) => ({ x: q[0], y: q[1], w: w * (1 - 0.6 * Math.pow(i / (pts.length - 1), 1.8)) }));
          return p(tube(sp, 0, 0.9), fill, P.line, 2.2) + ln(DU.smooth(pts), '#fff', 1.8, 'stroke-opacity=".65" stroke-dasharray="10 9"');
        };
        const one =
          rib([[6, 16], [64, 54], [124, 44], [166, 84], [152, 140], [180, 190], [216, 198]], 12, lt) +
          rib([[6, 4], [50, -50], [88, -118], [140, -152], [188, -130], [198, -86], [170, -64]], 12.5, P.fill) +
          rib([[6, 10], [72, -4], [122, -32], [160, -12], [194, -28]], 9.5, P.fill) +
          sparkles([[150, -178, 5.4, '#fff7b8'], [214, -110, 4], [208, 30, 4.4, '#fff7b8'], [120, 98, 3.4], [198, 160, 4], [96, -72, 3]]);
        return wingPair(R, one);
      },
    },
    {
      id: 'wg_rainbowcape', slot: 'wings', name: 'גלימת קשת', tags: ['pop', 'magic'], price: 600, color: 'rainbow', fixed: true,
      draw(R, P, ctx) {
        const { cx, sY, sh, hipY, kneeY, nk } = R, hem = kneeY + 46, W = sh + 62, L = '#7a5aa8';
        const cape = sym(cx, [[0, sY - 8], [sh - 8, sY - 4], [sh + 6, sY + 8], [sh + 36, hipY - 20, sh + 56, kneeY - 40, W, hem - 6], ...DU.scallopSegs(W, hem - 6, 6, 14)]);
        const inner = sym(cx, [[0, sY], [sh - 2, sY + 12], [sh + 18, hipY - 10, sh + 30, kneeY - 30, W - 26, hem - 4], ...DU.scallopSegs(W - 26, hem - 4, 4, 11)]);
        const cols = DU.GRADS.rainbow, xa = cx - W - 14, span = (W + 14) * 2;
        let wedges = `<rect x="${n(cx - W - 30)}" y="${n(sY - 40)}" width="${n(W + 30)}" height="${n(hem - sY + 90)}" fill="${cols[0]}"/><rect x="${n(cx)}" y="${n(sY - 40)}" width="${n(W + 30)}" height="${n(hem - sY + 90)}" fill="${cols[cols.length - 1]}"/>`;
        cols.forEach((c, i) => { wedges += `<path d="${d`M${cx} ${sY - 40}L${xa + (span * i) / cols.length} ${hem + 30}L${xa + (span * (i + 1)) / cols.length} ${hem + 30}Z`}" fill="${c}"/>`; });
        const tieD = d`M${cx - nk - 17} ${R.shY(nk + 17) - 1}Q${cx} ${sY + 13} ${cx + nk + 17} ${R.shY(nk + 17) - 1}`;
        return {
          back: p(cape, '#ffffff', L, 2.6) + DU.clip(ctx.id('rc'), cape, wedges) + ov(inner, 'fill="#43206b" fill-opacity=".2" stroke="none"') + p(cape, 'none', L, 2.6) +
            sparkles([[cx - W + 18, hem - 44, 5.4, '#fff'], [cx + W - 22, hem - 76, 4.6, '#fff'], [cx + W - 36, hem - 28, 3.6, '#fff7b8'], [cx - W + 32, hem - 92, 3.6, '#fff7b8'], [cx - W + 44, hem - 20, 3, '#fff']]),
          over: ln(tieD, L, 7) + ln(tieD, '#ffffff', 4.4) + p(DU.starD(cx, sY + 7, 9.6), GOLD, GOLD_L, 1.6) + p(DU.starD(cx, sY + 7, 4.4), '#fff6c2', null),
        };
      },
    },
  ];

  DU.addItems([...necklaces, ...bracelets, ...bags, ...hands, ...wings]);
})();
