/* acc-body.js — necklaces, bracelets, bags, hand-held things and wings.
   Everything here is drawn in body coordinates and hangs off rig anchors, so it follows
   the girl's height and muscles. Bags use the right-of-picture hand / shoulder (s = +1),
   hand-held things the left-of-picture hand (s = -1), so both can be worn together. */
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

  /* ---------- frames ---------- */
  /* at the wrist: y runs down the arm towards the hand, x across the arm; mirrored on the left */
  const wristG = (R, s, svg) => {
    const w = R.wrist(s);
    return `<g transform="translate(${n(w.x)} ${n(w.y)})${s < 0 ? ' scale(-1 1)' : ''} rotate(${n(-R.armAngle)})">${svg}</g>`;
  };
  /* at the closed hand: +x points away from the body, +y down; rot > 0 tilts "up" outward */
  const handG = (R, s, svg, rot = 0) => {
    const h = R.hand(s);
    return `<g transform="translate(${n(h.x)} ${n(h.y)})${s < 0 ? ' scale(-1 1)' : ''}${rot ? ` rotate(${n(rot)})` : ''}">${svg}</g>`;
  };
  const armW = (R) => R.arm(0.93).w + 2.2; // half width of a bracelet

  /* ---------- a necklace hanging in a U from the sides of the neck ---------- */
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

  /* ================================================================== NECKLACES */
  const necklaces = [
    {
      id: 'nk_pearls', slot: 'necklace', name: 'שרשרת פנינים', tags: ['princess', 'party'], color: '#fffaf3', fixed: true,
      draw(R) {
        const pts = uPts(R.cx, R.sY - 9, R.nk + 3.5, 31, 7.4);
        const mid = (pts.length - 1) / 2;
        return pts.map((q, i) => {
          const r = i === mid ? 4.8 : 3.7;
          return circ(q[0], q[1], r, '#eadbe8', '#b9a3bd', 1.1) + circ(q[0] - r * 0.14, q[1] - r * 0.16, r * 0.78, '#fffaf5') + circ(q[0] - r * 0.34, q[1] - r * 0.36, r * 0.26, '#fff');
        }).join('');
      },
    },
    {
      id: 'nk_heart', slot: 'necklace', name: 'שרשרת לב', tags: ['party'], color: '#ff6f91',
      draw(R, P) {
        const y = R.sY - 9 + 27, x = R.cx;
        return chain(R, 27) + circ(x, y + 1.5, 2, GOLD, GOLD_L, 1) +
          p(DU.heartD(x, y + 10, 8), P.fill, P.line, 1.9) + ell(x - 3.6, y + 6.4, 2, 2.6, '#fff', null, 0, 'fill-opacity=".7"');
      },
    },
    {
      id: 'nk_choker', slot: 'necklace', name: 'צ׳וקר', tags: ['party'], color: '#3a3346',
      draw(R, P) {
        const { cx, sY } = R, X = R.nk + 0.8, yT = sY - 14, yB = sY - 6.6;
        const band = d`M${cx - X} ${yT}Q${cx} ${yT + 7} ${cx + X} ${yT}L${cx + X + 1.6} ${yB}Q${cx} ${yB + 8} ${cx - X - 1.6} ${yB}Z`;
        return p(band, P.fill, P.line, 1.8) + ln(d`M${cx - X + 2} ${yT + 3.4}Q${cx} ${yT + 9} ${cx + X - 2} ${yT + 3.4}`, '#fff', 1.2, 'stroke-opacity=".45"') +
          circ(cx, yB + 5.2, 1.6, GOLD, GOLD_L, 0.9) + p(DU.heartD(cx, yB + 11, 4.6), '#ff9ac1', DU.line('#ff9ac1'), 1.4) + circ(cx - 1.6, yB + 9.6, 1, '#fff');
      },
    },
    {
      id: 'nk_scarf', slot: 'necklace', name: 'צעיף', tags: ['winter'], color: '#e0435f',
      draw(R, P, ctx) {
        const { cx, sY } = R, X = R.nk + 21, ex = cx + 19;
        const wrap = sym(cx, [[0, sY - 20], [X - 8, sY - 23, X + 3, sY - 12, X, sY + 1], [X - 5, sY + 17, 12, sY + 22, 0, sY + 22]]);
        const end = d`M${ex - 13} ${sY + 8}L${ex + 13} ${sY + 6}C${ex + 16} ${sY + 38} ${ex + 13} ${sY + 62} ${ex + 16} ${sY + 86}L${ex - 12} ${sY + 88}C${ex - 14} ${sY + 62} ${ex - 11} ${sY + 36} ${ex - 13} ${sY + 8}Z`;
        let fringe = '';
        for (let i = 0; i < 7; i++) fringe += d`M${ex - 10 + i * 4} ${sY + 87}l${(i - 3) * 0.5} 9.5`;
        const stripes = `<rect x="${n(ex - 20)}" y="${n(sY + 60)}" width="40" height="6.5" fill="#fff" fill-opacity=".6"/><rect x="${n(ex - 20)}" y="${n(sY + 71)}" width="40" height="6.5" fill="#fff" fill-opacity=".6"/>`;
        let knit = '';
        for (let i = -3; i <= 3; i++) knit += d`M${cx + i * 9 - 2} ${sY - 12 + Math.abs(i) * 0.6}q3 9 0 26`;
        return ln(fringe, P.line, 2.2) + p(end, P.fill, P.line, 2.3) + DU.clip(ctx.id('sc'), end, stripes) +
          ov(d`M${ex - 13} ${sY + 8}L${ex + 13} ${sY + 6}L${ex + 14} ${sY + 30}Q${ex} ${sY + 22} ${ex - 12.5} ${sY + 30}Z`) +
          p(wrap, P.fill, P.line, 2.4) +
          ov(sym(cx, [[0, sY + 9], [X - 4, sY + 3, X, sY + 1, X, sY + 1], [X - 5, sY + 17, 12, sY + 22, 0, sY + 22]])) +
          ln(knit, P.line, 1.3, 'stroke-opacity=".3"') +
          ln(d`M${cx - X + 4} ${sY - 7}Q${cx} ${sY + 9} ${cx + X - 4} ${sY - 7}`, P.line, 1.5, 'stroke-opacity=".45"') +
          ell(ex + 1, sY + 12, 15, 9.5, P.fill, P.line, 2.2, `transform="rotate(-8 ${n(ex)} ${n(sY + 12)})"`) +
          ln(d`M${ex - 8} ${sY + 10}q8 5 17 -1`, P.line, 1.3, 'stroke-opacity=".4"') +
          ell(ex - 5, sY + 8, 5, 2.4, '#fff', null, 0, 'fill-opacity=".3"');
      },
    },
    {
      id: 'nk_bowtie', slot: 'necklace', name: 'פפיון', tags: ['school', 'party'], color: '#e0435f',
      draw(R, P) {
        const { cx, sY } = R;
        return ln(d`M${cx - R.nk - 1} ${sY - 11}Q${cx} ${sY - 3} ${cx + R.nk + 1} ${sY - 11}`, P.line, 4.6) + ln(d`M${cx - R.nk - 1} ${sY - 11}Q${cx} ${sY - 3} ${cx + R.nk + 1} ${sY - 11}`, P.fill, 2.4) +
          DU.bow(cx, sY - 2, 17, P.fill, P.line);
      },
    },
    {
      id: 'nk_tie', slot: 'necklace', name: 'עניבה', tags: ['school'], color: '#3f7fd9',
      draw(R, P, ctx) {
        const { cx, sY } = R;
        const knot = d`M${cx - 7} ${sY - 10}L${cx + 7} ${sY - 10}L${cx + 4.6} ${sY + 3}L${cx - 4.6} ${sY + 3}Z`;
        const body = d`M${cx - 4.6} ${sY + 3}L${cx + 4.6} ${sY + 3}L${cx + 10.5} ${sY + 58}L${cx} ${sY + 73}L${cx - 10.5} ${sY + 58}Z`;
        let st = '';
        for (let k = 0; k < 7; k++) st += d`M${cx - 16} ${sY + 16 + k * 11}l32 -12`;
        return p(body, P.fill, P.line, 2.2) + DU.clip(ctx.id('tie'), body, ln(st, '#fff', 3.6, 'stroke-opacity=".55"')) +
          ov(d`M${cx} ${sY + 3}L${cx + 4.6} ${sY + 3}L${cx + 10.5} ${sY + 58}L${cx} ${sY + 73}Z`) +
          p(knot, P.fill, P.line, 2.2) + ov(d`M${cx - 4.6} ${sY + 3}L${cx + 4.6} ${sY + 3}L${cx + 5.4} ${sY - 2}L${cx - 5.4} ${sY - 2}Z`);
      },
    },
    {
      id: 'nk_lei', slot: 'necklace', name: 'שרשרת פרחים', tags: ['beach', 'nature'], color: '#ff6f91',
      draw(R, P) {
        const pts = uPts(R.cx, R.sY - 6, R.nk + 12, 47, 13.5);
        const cols = [P.base, '#ffffff', DU.light(P.base, 0.5), '#ffd24d'];
        let leaves = '', fl = '';
        pts.forEach((q, i) => {
          if (i < pts.length - 1) {
            const b = pts[i + 1], mx = (q[0] + b[0]) / 2, my = (q[1] + b[1]) / 2;
            const a = (Math.atan2(b[1] - q[1], b[0] - q[0]) * 180) / Math.PI + 90;
            leaves += ell(mx, my, 4, 8, LEAF, LEAF_L, 1.2, `transform="rotate(${n(a)} ${n(mx)} ${n(my)})"`);
          }
          const c = cols[i % cols.length];
          fl += DU.flower(q[0], q[1], i % 2 ? 8 : 9.2, c, c === '#ffd24d' ? '#ff9a56' : '#ffd24d');
        });
        return leaves + fl;
      },
    },
    {
      id: 'nk_medal', slot: 'necklace', name: 'מדליה', tags: ['sport'], color: '#3f7fd9',
      draw(R, P) {
        const { cx, sY, nk } = R, yb = sY + 46;
        const half = (s) => {
          const dd = d`M${cx + s * (nk + 5)} ${sY - 11}L${cx + s * (nk - 5)} ${sY - 9}L${cx - s * 5.5} ${yb + 1}L${cx + s * 4.5} ${yb + 2}Z`;
          return p(dd, P.fill, P.line, 2) + ln(d`M${cx + s * nk} ${sY - 9.5}L${cx - s * 0.5} ${yb}`, '#fff', 2.4, 'stroke-opacity=".75"');
        };
        const my = yb + 12;
        return half(1) + half(-1) + ov(d`M${cx - 5.5} ${yb + 1}L${cx + 5.5} ${yb + 1}L${cx + 2} ${yb - 9}L${cx - 2} ${yb - 9}Z`) +
          circ(cx, my, 13, GOLD, GOLD_L, 2.2) + circ(cx, my, 9.4, 'none', GOLD_D, 1.6) + p(DU.starD(cx, my + 0.4, 6.4), '#fff6c2', GOLD_L, 1.1) +
          p(d`M${cx - 9.5} ${my - 5}A11 11 0 0 1 ${cx - 2} ${my - 10.6}`, 'none', '#fff', 2, 'stroke-opacity=".8"');
      },
    },
    {
      id: 'nk_bandana', slot: 'necklace', name: 'בנדנה', tags: ['nature', 'sport'], color: '#3fbf9a',
      draw(R, P, ctx) {
        const { cx, sY, nk } = R;
        const shape = sym(cx, [[0, sY - 16], [nk + 10, sY - 18, nk + 20, sY - 10, nk + 18, sY - 2], [nk + 6, sY + 14, 7, sY + 31, 0, sY + 38]]);
        let dots = '';
        for (let r = 0; r < 6; r++) for (let c = -4; c <= 4; c++) dots += circ(cx + c * 10 + (r % 2 ? 5 : 0), sY - 9 + r * 9, 2.1, '#fff', null, 0, 'fill-opacity=".85"');
        return p(shape, P.fill, P.line, 2.3) + DU.clip(ctx.id('bd'), shape, dots) +
          ov(sym(cx, [[0, sY - 16], [nk + 10, sY - 18, nk + 20, sY - 10, nk + 18, sY - 2], [nk + 6, sY + 4, 8, sY + 1, 0, sY + 1]]), DU.HL) +
          ln(d`M${cx - nk - 14} ${sY - 4}Q${cx} ${sY + 6} ${cx + nk + 14} ${sY - 4}`, P.line, 1.5, 'stroke-opacity=".5"');
      },
    },
    {
      id: 'nk_magic', slot: 'necklace', name: 'קמע קסם', tags: ['magic'], price: 500, color: 'mermaid', fixed: true,
      draw(R, P, ctx) {
        const { cx } = R, y = R.sY - 9 + 30 + 11, gid = ctx.id('glow');
        const G = ctx.paint('mermaid', [cx - 13, y - 13, 26, 26]);
        return chain(R, 30, '#b9bfd9') +
          `<defs><radialGradient id="${gid}"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".45" stop-color="#e3c9ff" stop-opacity=".6"/><stop offset="1" stop-color="#b48cff" stop-opacity="0"/></radialGradient></defs>` +
          circ(cx, y, 25, `url(#${gid})`) + circ(cx, y - 10.5, 2.1, SILVER, SILVER_L, 1) +
          p(DU.starD(cx, y, 12.5), G.fill, '#6b4fc4', 1.8) + p(DU.starD(cx, y, 6), '#fff', null, 0, 'fill-opacity=".75"') +
          sparkles([[cx - 21, y - 9, 4.5], [cx + 20, y - 3, 3.6, '#fff7b8'], [cx + 12, y + 17, 3], [cx - 14, y + 15, 2.6, '#ffe1f0']]);
      },
    },
  ];

  /* ================================================================== BRACELETS */
  const bracelets = [
    {
      id: 'br_bangles', slot: 'bracelet', name: 'צמידים', tags: ['party'], color: '#ff6f91',
      draw(R, P) {
        const W = armW(R);
        const ring = (y, fill, line) => p(bracelet(y, y + 3.8, W), fill, line, 1.4) + ln(d`M${-W + 2} ${y + 1.4}Q0 ${y + 3.4} ${W * 0.3} ${y + 2.6}`, '#fff', 1, 'stroke-opacity=".7"');
        return wristG(R, 1, ring(-19, P.fill, P.line) + ring(-14.2, GOLD, GOLD_L) + ring(-9.4, P.fill, P.line)) +
          wristG(R, -1, ring(-15, GOLD, GOLD_L) + ring(-10.2, P.fill, P.line));
      },
    },
    {
      id: 'br_beads', slot: 'bracelet', name: 'צמיד חרוזים', tags: ['beach', 'nature'], color: '#5cc8ff',
      draw(R, P) {
        const W = armW(R);
        const cols = [P.base, '#ffd24d', '#ff9ac1', '#ffffff', '#8bdc7a', '#b48cff'];
        const row = (y, r, k, off) => {
          let o = '';
          for (let i = 0; i < k; i++) {
            const t = k === 1 ? 0 : (i / (k - 1)) * 2 - 1, x = t * (W - 1), yy = y + 2.4 * (1 - t * t), c = cols[(i + off) % cols.length];
            o += circ(x, yy, r, c, DU.line(c), 1.1) + circ(x - r * 0.3, yy - r * 0.35, r * 0.3, '#fff', null, 0, 'fill-opacity=".85"');
          }
          return o;
        };
        return wristG(R, 1, row(-16.5, 2.9, 5, 2) + row(-10, 3.6, 5, 0));
      },
    },
    {
      id: 'br_watch', slot: 'bracelet', name: 'שעון', tags: ['school', 'sport'], color: '#ff9ac1',
      draw(R, P) {
        const W = armW(R);
        return wristG(R, -1,
          p(bracelet(-16.5, -7.5, W, 2), P.fill, P.line, 1.7) + ln('M-5.5 -14.5v5M5.5 -14.5v5', P.line, 1, 'stroke-opacity=".4"') +
          circ(0, -11.6, 7.6, P.fill, P.line, 2) + circ(0, -11.6, 5.4, '#ffffff', '#c9cfe6', 1) +
          ln('M0 -11.6V-15.2M0 -11.6L2.9 -10.2', '#4a4560', 1.4) + circ(0, -11.6, 1, '#ff6f91') + p('M7.4 -12.8h2.2v2.4h-2.2Z', P.fill, P.line, 1));
      },
    },
    {
      id: 'br_scrunchie', slot: 'bracelet', name: 'גומייה', tags: ['sleepover', 'sport'], color: '#b48cff',
      draw(R, P) {
        const W = armW(R);
        // one puffy ring with a ruffled edge
        const X = W + 3.5, yT = -17.5, yB = -5.5;
        let dd = d`M${-X} ${-11.5}`;
        const bumps = 4, step = (2 * X) / bumps;
        for (let i = 0; i < bumps; i++) dd += d`Q${-X + step * (i + 0.5)} ${yT - 4 + 2.4 * (1 - Math.pow((i + 0.5) / bumps * 2 - 1, 2))} ${-X + step * (i + 1)} ${i === bumps - 1 ? -11.5 : yT + 2.6}`;
        for (let i = 0; i < bumps; i++) dd += d`Q${X - step * (i + 0.5)} ${yB + 4 + 2.4 * (1 - Math.pow((i + 0.5) / bumps * 2 - 1, 2))} ${X - step * (i + 1)} ${i === bumps - 1 ? -11.5 : yB - 2.6}`;
        let o = p(dd + 'Z', P.fill, P.line, 1.9);
        o += ln(d`M${-X + step} ${yT + 3}q2.4 5 0 ${yB - yT - 6}M0 ${yT + 2.4}q2.4 6 0 ${yB - yT - 5}M${X - step} ${yT + 3}q-2.4 5 0 ${yB - yT - 6}`, P.line, 1.2, 'stroke-opacity=".5"');
        o += ell(-X * 0.5, -14.6, 3, 1.5, '#fff', null, 0, 'fill-opacity=".6"') + ell(X * 0.42, -14, 3, 1.5, '#fff', null, 0, 'fill-opacity=".6"');
        return wristG(R, 1, o);
      },
    },
    {
      id: 'br_gloves', slot: 'bracelet', name: 'כפפות', tags: ['winter'], color: '#ff6f91',
      draw(R, P) {
        const W = armW(R) + 2.2;
        const mitt = 'M-10.4 -7C-13 6 -13.8 18 -11.2 28C-8.4 38.6 6.6 40.2 10.8 31.6C14.2 23 12.8 8 10.4 -7Z';
        const thumb = 'M-10.2 2.6C-18 6 -20.6 17.6 -15.8 23.8C-12.6 27 -9.4 23.6 -10 17.6Z';
        const g =
          p(mitt, P.fill, P.line, 2.3) + p(thumb, P.fill, P.line, 2.3) + `<path d="M-10.6 4L-9.4 17L-6 16L-6 5Z" fill="${P.fill}"/>` +
          ov('M4 -5C7 8 8.4 22 5.6 33C9.2 32 10.6 30 10.8 31.6C14.2 23 12.8 8 10.4 -7Z') +
          p(DU.heartD(-0.4, 14, 4.4), '#fff', null, 0, 'fill-opacity=".85"') +
          p(d`M${-W} -15.5Q0 -12.6 ${W} -15.5Q${W + 2.6} -10 ${W} -4.6Q0 -1.6 ${-W} -4.6Q${-W - 2.6} -10 ${-W} -15.5Z`, '#ffffff', '#b3acd6', 1.8) +
          ln(d`M${-W + 4} -12.6v5M-2.5 -11.4v5M3.5 -11.4v5M${W - 4} -12.6v5`, '#b3acd6', 1.2, 'stroke-opacity=".6"');
        return { over: wristG(R, 1, g) + wristG(R, -1, g) };
      },
    },
    {
      id: 'br_friend', slot: 'bracelet', name: 'צמיד חברות', tags: ['school', 'nature'], color: '#ff9a56',
      draw(R, P, ctx) {
        const W = armW(R), b = bracelet(-16, -8, W, 2.2);
        const cols = ['#ffffff', '#5cc8ff', '#ffd24d', '#ff6f91'];
        let st = '';
        for (let i = -4; i <= 6; i++) st += ln(d`M${i * 4.2 - 8} -4l8 -16`, cols[(i + 8) % cols.length], 2.3);
        return wristG(R, -1,
          ln(d`M${W - 1} -11q6 2 7 8M${W - 1} -10q3 4 2.5 9`, P.fill, 1.6) + circ(W + 6.2, -2.4, 1.7, '#ffd24d', GOLD_L, 0.8) + circ(W + 1.6, -0.6, 1.7, '#5cc8ff', DU.line('#5cc8ff'), 0.8) +
          p(b, P.fill, null) + DU.clip(ctx.id('fr'), b, st) + p(b, 'none', P.line, 1.6));
      },
    },
    {
      id: 'br_sparkle', slot: 'bracelet', name: 'צמידי כוכבים', tags: ['magic', 'princess'], price: 350, color: 'gold', fixed: true,
      draw(R) {
        const W = armW(R);
        const ring = (y) => p(bracelet(y, y + 4.2, W), GOLD, GOLD_L, 1.4) + ln(d`M${-W + 2} ${y + 1.5}Q0 ${y + 3.6} ${W * 0.4} ${y + 2.8}`, '#fff', 1.1, 'stroke-opacity=".85"');
        const g =
          ln(d`M${W - 0.5} -8.6q4 1 5.2 5`, GOLD_L, 1.2) + p(DU.starD(W + 5.6, 0.6, 5.6), '#fff3a8', GOLD_L, 1.2) +
          ring(-17.6) + ring(-11.8) + gem(0, -8.6, 3, '#ff9ad5', '#fff') +
          sparkles([[-W - 5, -19, 3.6], [W + 7, -15, 3, '#fff7b8'], [-W - 3, -5, 2.4, '#fff7b8']]);
        return wristG(R, 1, g) + wristG(R, -1, g);
      },
    },
  ];

  /* ================================================================== BAGS (s = +1) */
  function teddy(P) {
    const F = P.fill, L = P.line, lt = DU.light(P.base, 0.55);
    const part = (dd) => p(dd, F, L, 2);
    let o = '';
    // raised arm (held by the hand), then legs, body, free arm
    o += part(tube([{ x: -10, y: 19, w: 6 }, { x: -17, y: -3, w: 5.4 }, { x: -23, y: -27, w: 5.2 }], 0.6, 0.9));
    o += ell(-9.5, 47, 7, 8.4, F, L, 2) + ell(9.5, 47, 7, 8.4, F, L, 2) + ell(-9.5, 49, 3.6, 4.2, lt) + ell(9.5, 49, 3.6, 4.2, lt);
    o += ell(0, 30, 14.5, 17, F, L, 2) + ell(0, 32.5, 8.6, 10.4, lt);
    o += ell(15, 27, 5.6, 10, F, L, 2, 'transform="rotate(-24 15 27)"');
    // ears + head
    o += circ(-12.5, -11, 7.2, F, L, 2) + circ(12.5, -11, 7.2, F, L, 2) + circ(-12.5, -10.6, 3.6, lt) + circ(12.5, -10.6, 3.6, lt);
    o += ell(0, 0, 18.5, 16, F, L, 2.1);
    o += ell(0, 5.4, 7.8, 6.2, lt);
    o += ell(0, 2.6, 2.6, 1.9, '#4a2f35') + ln('M0 4.4v2.2M0 6.6q-2.6 2.6 -4.6 0.4M0 6.6q2.6 2.6 4.6 0.4', '#4a2f35', 1.2);
    o += circ(-7.6, -2.4, 2.2, '#3a2530') + circ(7.6, -2.4, 2.2, '#3a2530') + circ(-8.2, -3.1, 0.8, '#fff') + circ(7, -3.1, 0.8, '#fff');
    o += ell(-12.4, 4, 3.4, 2.2, '#ff8fa5', null, 0, 'fill-opacity=".7"') + ell(12.4, 4, 3.4, 2.2, '#ff8fa5', null, 0, 'fill-opacity=".7"');
    o += DU.bow(0, 15.4, 7.4, '#ff6f91', DU.line('#ff6f91'));
    return o;
  }
  const bags = [
    {
      id: 'bag_backpack', slot: 'bag', name: 'תיק גב', tags: ['school'], color: '#5cc8ff',
      draw(R, P) {
        const { cx, sY, hipY, sh, nk } = R, W = sh + 17, top = sY - 12, bot = hipY + 2;
        const body = sym(cx, [[0, top], [W - 30, top - 3, W, top + 6, W, top + 30], [W + 4, (top + bot) / 2, W + 3, bot - 18, W - 8, bot], [0, bot + 2]]);
        const pocket = (s) => ell(cx + s * (W + 1), bot - 34, 9, 22, P.fill, P.line, 2.2) + ov(DU.ellD(cx + s * (W + 3), bot - 30, 5, 16));
        const back = pocket(1) + pocket(-1) + p(body, P.fill, P.line, 2.4) +
          ov(sym(cx, [[0, top + 40], [W, top + 40], [W + 4, (top + bot) / 2, W + 3, bot - 18, W - 8, bot], [0, bot + 2]])) +
          ln(d`M${cx - 12} ${top - 1}q12 -16 24 0`, P.line, 5.4) + ln(d`M${cx - 12} ${top - 1}q12 -16 24 0`, P.fill, 2.8);
        const strap = (s) => {
          const sp = [{ x: cx + s * (nk + 15), y: R.shY(nk + 15) - 3, w: 5.4 }, { x: cx + s * (R.ch - 4), y: sY + 34, w: 5.4 }, { x: cx + s * (R.side(sY + 72) - 1.5), y: sY + 74, w: 5.2 }];
          return p(tube(sp, 0.3, 0.4), P.fill, P.line, 2.1) +
            ln(d`M${sp[0].x - s * 1} ${sp[0].y + 5}L${sp[2].x - s * 1.5} ${sp[2].y - 5}`, '#fff', 1.3, 'stroke-opacity=".5" stroke-dasharray="3 3.5"') +
            `<rect x="${n(sp[2].x - 6.6)}" y="${n(sp[2].y - 9)}" width="13.2" height="5.6" rx="2" fill="${SILVER}" stroke="${SILVER_L}" stroke-width="1.3" transform="rotate(${n(s * 12)} ${n(sp[2].x)} ${n(sp[2].y - 6)})"/>`;
        };
        return { back, over: strap(1) + strap(-1) };
      },
    },
    {
      id: 'bag_cross', slot: 'bag', name: 'תיק צד', tags: ['party', 'school'], color: '#b48cff',
      draw(R, P) {
        const { cx, hipY, nk } = R, bx = cx + R.hp - 8, by = hipY + 14;
        const s1 = tube([{ x: cx - nk - 16, y: R.shY(nk + 16) - 2.5, w: 3.3 }, { x: bx - 13, y: by - 15, w: 3.3 }], 0.2, 0);
        const s2 = tube([{ x: bx + 14, y: by - 14, w: 3.3 }, { x: cx + R.side(hipY - 22) + 1.5, y: hipY - 22, w: 3.3 }], 0, 0.5);
        const body = d`M${bx - 13} ${by - 16}H${bx + 13}Q${bx + 21} ${by - 16} ${bx + 21} ${by - 8}V${by + 11}Q${bx + 21} ${by + 19} ${bx + 13} ${by + 19}H${bx - 13}Q${bx - 21} ${by + 19} ${bx - 21} ${by + 11}V${by - 8}Q${bx - 21} ${by - 16} ${bx - 13} ${by - 16}Z`;
        const flap = d`M${bx - 13} ${by - 16}H${bx + 13}Q${bx + 21} ${by - 16} ${bx + 21} ${by - 8}V${by - 3}Q${bx + 12} ${by + 7} ${bx} ${by + 7}Q${bx - 12} ${by + 7} ${bx - 21} ${by - 3}V${by - 8}Q${bx - 21} ${by - 16} ${bx - 13} ${by - 16}Z`;
        return {
          over: p(s1, P.fill, P.line, 1.8) + p(s2, P.fill, P.line, 1.8) + p(body, P.fill, P.line, 2.3) + ov(body) +
            p(flap, P.fill, P.line, 2.1) + ln(d`M${bx - 17} ${by - 5}Q${bx - 9} ${by + 3} ${bx} ${by + 3}Q${bx + 9} ${by + 3} ${bx + 17} ${by - 5}`, '#fff', 1.2, 'stroke-opacity=".6" stroke-dasharray="2.5 3"') +
            ell(bx - 10, by - 11, 6, 2.2, '#fff', null, 0, 'fill-opacity=".4"') +
            p(DU.heartD(bx, by + 7, 4.8), GOLD, GOLD_L, 1.3),
        };
      },
    },
    {
      id: 'bag_tote', slot: 'bag', name: 'תיק חוף', tags: ['beach'], color: '#5cc8ff',
      draw(R, P, ctx) {
        const bx = 14, top = 30;
        const body = d`M${bx - 35} ${top}L${bx + 35} ${top}L${bx + 30} ${top + 60}Q${bx} ${top + 66} ${bx - 30} ${top + 60}Z`;
        let st = '';
        for (let i = 0; i < 4; i++) st += `<rect x="${bx - 40}" y="${top + 11 + i * 15}" width="80" height="7.5" fill="${P.fill}"/>`;
        const handles = d`M${bx - 20} ${top + 4}C${bx - 22} 12 -5 16 0 4C5 16 ${bx + 22} 12 ${bx + 20} ${top + 4}`;
        return handG(R, 1,
          rope(handles, '#f3dcae', '#a87b3c', 3.4) +
          p(body, '#fffaf0', P.line, 2.4) + DU.clip(ctx.id('tote'), body, st) +
          p(d`M${bx - 35} ${top}L${bx + 35} ${top}L${bx + 34.3} ${top + 8}L${bx - 34.3} ${top + 8}Z`, P.fill, P.line, 2) +
          ov(d`M${bx + 16} ${top + 8}L${bx + 34.3} ${top + 8}L${bx + 30} ${top + 60}Q${bx + 22} ${top + 62.5} ${bx + 14} ${top + 63.6}Z`) +
          circ(bx - 4, top + 36, 12.5, '#fffaf0', P.line, 1.6) + circ(bx - 4, top + 36, 6.2, '#ffd24d', GOLD_L, 1.3) +
          ln([0, 45, 90, 135, 180, 225, 270, 315].map((a) => { const c = Math.cos((a * Math.PI) / 180), s = Math.sin((a * Math.PI) / 180); return d`M${bx - 4 + c * 8} ${top + 36 + s * 8}L${bx - 4 + c * 10.6} ${top + 36 + s * 10.6}`; }).join(''), GOLD_D, 1.6) +
          p(body, 'none', P.line, 2.4));
      },
    },
    {
      id: 'bag_purse', slot: 'bag', name: 'תיק קטן', tags: ['party', 'princess'], color: '#ff6f91',
      draw(R, P) {
        const bx = 9, top = 27;
        const body = d`M${bx - 20} ${top + 5}Q${bx - 25} ${top + 34} ${bx - 17} ${top + 36}H${bx + 17}Q${bx + 25} ${top + 34} ${bx + 20} ${top + 5}Z`;
        const flap = d`M${bx - 21} ${top + 4}Q${bx} ${top - 2} ${bx + 21} ${top + 4}Q${bx + 21} ${top + 20} ${bx} ${top + 23}Q${bx - 21} ${top + 20} ${bx - 21} ${top + 4}Z`;
        const handle = d`M${bx - 13} ${top + 4}C${bx - 17} 8 -5 14 0 4C5 14 ${bx + 17} 8 ${bx + 13} ${top + 4}`;
        return handG(R, 1,
          rope(handle, P.fill, P.line, 3) +
          p(body, P.fill, P.line, 2.3) + ov(body) + p(flap, P.fill, P.line, 2.2) +
          ln(d`M${bx - 16} ${top + 8}Q${bx - 15} ${top + 16} ${bx} ${top + 18.6}Q${bx + 15} ${top + 16} ${bx + 16} ${top + 8}`, '#fff', 1.2, 'stroke-opacity=".6" stroke-dasharray="2.5 3"') +
          ell(bx - 9, top + 5.5, 6.5, 2.2, '#fff', null, 0, 'fill-opacity=".45"') +
          circ(bx, top + 22.6, 4.2, GOLD, GOLD_L, 1.4) + circ(bx - 1.2, top + 21.4, 1.3, '#fff', null, 0, 'fill-opacity=".85"') +
          DU.sparkle(bx + 22, top + 2, 3.4, '#fff'));
      },
    },
    {
      id: 'bag_teddy', slot: 'bag', name: 'דובי', tags: ['sleepover'], color: '#c98e5a',
      draw(R, P) {
        return handG(R, 1, `<g transform="translate(25 35) rotate(7)">${teddy(P)}</g>`);
      },
    },
    {
      id: 'bag_sport', slot: 'bag', name: 'תיק ספורט', tags: ['sport'], color: '#3fbf9a',
      draw(R, P, ctx) {
        const x0 = -24, x1 = 52, y0 = 38, y1 = 76;
        const body = d`M${x0 + 12} ${y0}H${x1 - 12}Q${x1} ${y0} ${x1} ${y0 + 12}V${y1 - 12}Q${x1} ${y1} ${x1 - 12} ${y1}H${x0 + 12}Q${x0} ${y1} ${x0} ${y1 - 12}V${y0 + 12}Q${x0} ${y0} ${x0 + 12} ${y0}Z`;
        const dk = DU.dark(P.base, 0.35);
        const h1 = d`M2 ${y0 + 3}C1 20 -3 14 0 4`, h2 = d`M30 ${y0 + 3}C28 18 6 16 0 4`;
        const deco =
          `<rect x="${x0}" y="${y0 + 15}" width="${x1 - x0}" height="8" fill="#fff" fill-opacity=".9"/>` +
          `<rect x="${x0}" y="${y0}" width="12" height="${y1 - y0}" ${DU.SH}/><rect x="${x1 - 12}" y="${y0}" width="12" height="${y1 - y0}" ${DU.SH}/>` +
          `<rect x="-3" y="${y0}" width="9" height="${y1 - y0}" fill="${dk}"/><rect x="26" y="${y0}" width="9" height="${y1 - y0}" fill="${dk}"/>`;
        return handG(R, 1,
          rope(h1, dk, P.line, 3.4) + rope(h2, dk, P.line, 3.4) +
          p(body, P.fill, P.line, 2.4) + DU.clip(ctx.id('sp'), body, deco) +
          ln(d`M${x0 + 14} ${y0 + 7}H${x1 - 14}`, P.line, 1.4, 'stroke-dasharray="2.4 2.6" stroke-opacity=".7"') +
          p(DU.starD(16, y0 + 29.5, 5.4), '#fff', null) +
          ell(x0 + 22, y0 + 4.4, 9, 1.8, '#fff', null, 0, 'fill-opacity=".4"') +
          p(body, 'none', P.line, 2.4));
      },
    },
    {
      id: 'bag_star', slot: 'bag', name: 'תיק כוכב', tags: ['magic', 'party'], price: 500, color: 'glitter:#ffd24d', fixed: true,
      draw(R, P) {
        const { cx, hipY, nk } = R, bx = cx + R.hp - 12, by = hipY + 16;
        const c1 = d`M${cx - nk - 16} ${R.shY(nk + 16) - 2}L${bx - 8} ${by - 14}`;
        const c2 = d`M${bx + 12} ${by - 12}L${cx + R.side(hipY - 24) + 1.5} ${hipY - 24}`;
        const beads = (dd) => ln(dd, GOLD_L, 4.4, 'stroke-dasharray="0.1 6.2"') + ln(dd, GOLD, 2.6, 'stroke-dasharray="0.1 6.2"');
        const star = DU.starD(bx, by, 27, 5, 0.56);
        return {
          over: beads(c1) + beads(c2) +
            p(star, GOLD, GOLD_L, 6.4) + p(star, P.fill, GOLD_L, 2) + p(DU.starD(bx, by + 0.5, 15, 5, 0.56), 'none', '#fff', 1.6, 'stroke-opacity=".85" stroke-dasharray="3 3"') +
            ell(bx - 7, by - 9, 5, 2.6, '#fff', null, 0, 'fill-opacity=".7" transform="rotate(-30 ' + n(bx - 7) + ' ' + n(by - 9) + ')"') +
            DU.bow(bx, by - 25, 7.5, '#ff9ac1', DU.line('#ff9ac1')) +
            sparkles([[bx + 30, by - 18, 5.4, '#fff3a8'], [bx - 31, by + 10, 4.4, '#fff3a8'], [bx + 23, by + 26, 3.6, '#ffffff'], [bx - 24, by - 22, 3.4, '#ffffff']]).replace(/<path /g, '<path stroke="#e8a93a" stroke-width=".7" '),
        };
      },
    },
  ];

  /* ================================================================== HAND-HELD (s = -1) */
  const hands = [
    {
      id: 'hd_wand', slot: 'hand', name: 'שרביט קסם', tags: ['magic'], color: '#ffd24d',
      draw(R, P) {
        return handG(R, -1,
          p('M-2.6 22L2.6 22L2.4 -84L-2.4 -84Z', '#fff5fb', '#a38ac2', 1.6) +
          ln('M-2.4 10l4.8 -5M-2.4 -6l4.8 -5M-2.4 -22l4.8 -5M-2.4 -38l4.8 -5M-2.4 -54l4.8 -5M-2.4 -70l4.8 -5', '#ff9ac1', 2.2) +
          DU.bow(0, -78, 8, '#ff9ac1', DU.line('#ff9ac1'), true) +
          p(DU.starD(0, -100, 19, 5, 0.52), P.fill, P.line, 2.3) + p(DU.starD(-1.5, -101.5, 9, 5, 0.52), '#fff', null, 0, 'fill-opacity=".55"') +
          sparkles([[-24, -116, 6], [25, -96, 4.6, '#fff7b8'], [14, -128, 3.6], [-22, -84, 3, '#fff7b8']]),
          27);
      },
    },
    {
      id: 'hd_balloon', slot: 'hand', name: 'בלון', tags: ['party'], color: '#ff6f91',
      draw(R, P) {
        const H = R.hand(-1), bx = H.x - 88, by = R.sY - 64;
        const bal = d`M${bx} ${by - 44}C${bx + 31} ${by - 44} ${bx + 38} ${by - 9} ${bx + 31} ${by + 10}C${bx + 25} ${by + 30} ${bx + 9} ${by + 43} ${bx} ${by + 45}C${bx - 9} ${by + 43} ${bx - 25} ${by + 30} ${bx - 31} ${by + 10}C${bx - 38} ${by - 9} ${bx - 31} ${by - 44} ${bx} ${by - 44}Z`;
        return ln(d`M${H.x - 1} ${H.y + 4}C${H.x - 22} ${H.y - 70} ${bx + 36} ${by + 130} ${bx + 1} ${by + 52}`, '#8a8fa8', 1.7) +
          p(d`M${bx} ${by + 44}l-6 9.5h12Z`, P.fill, P.line, 1.9) +
          p(bal, P.fill, P.line, 2.4) +
          ov(d`M${bx + 14} ${by - 38}C${bx + 34} ${by - 22} ${bx + 34} ${by + 14} ${bx + 4} ${by + 44}C${bx + 12} ${by + 40} ${bx + 26} ${by + 28} ${bx + 31} ${by + 10}C${bx + 37} ${by - 8} ${bx + 32} ${by - 30} ${bx + 14} ${by - 38}Z`) +
          ell(bx - 13, by - 20, 6.5, 12, '#fff', null, 0, `fill-opacity=".6" transform="rotate(22 ${n(bx - 13)} ${n(by - 20)})"`) +
          circ(bx - 20, by + 3, 2.4, '#fff', null, 0, 'fill-opacity=".6"') +
          p(DU.heartD(bx + 5, by + 6, 8), '#fff', null, 0, 'fill-opacity=".4"');
      },
    },
    {
      id: 'hd_icecream', slot: 'hand', name: 'גלידה', tags: ['beach'], color: '#ff9ac1',
      draw(R, P, ctx) {
        const cone = 'M-13.5 -22L13.5 -22L1.6 18Q0 20 -1.6 18Z';
        let waffle = '';
        for (let i = -4; i <= 4; i++) waffle += d`M${i * 8 - 14} -24l22 44M${i * 8 + 14} -24l-22 44`;
        const scoop2 = DU.light(P.base, 0.6);
        return handG(R, -1,
          p(cone, '#f0c27e', '#9a6a2c', 2.1) + DU.clip(ctx.id('wf'), cone, ln(waffle, '#c9944a', 1.3)) +
          circ(0, -57, 13, '#fff6d8', '#c9a86a', 2.1) + ell(-4, -62, 4, 2.6, '#fff', null, 0, 'fill-opacity=".8"') +
          p('M-17 -30C-20 -46 -10 -52 0 -52C10 -52 20 -46 17 -30C14 -22 11 -27 7 -24C3 -21 1 -27 -4 -24C-9 -21 -13 -24 -17 -30Z', P.fill, P.line, 2.2) +
          ell(-7, -44, 5, 3, '#fff', null, 0, 'fill-opacity=".55"') +
          ln('M-9 -35l3 -2M4 -41l3 2M9 -33l2 -3M-2 -47l3 1', '#fff', 2) + ln('M-2 -32l3 2M12 -40l1 -3', scoop2, 2) +
          ln('M1 -70q3 -8 9 -9', '#7a3b2a', 1.5) + circ(0.5, -70, 4.8, '#e0435f', '#8c1f38', 1.5) + circ(-1.2, -71.6, 1.4, '#fff', null, 0, 'fill-opacity=".85"'),
          33);
      },
    },
    {
      id: 'hd_flowers', slot: 'hand', name: 'זר פרחים', tags: ['nature', 'princess'], color: '#ff9ac1',
      draw(R, P) {
        const c2 = DU.light(P.base, 0.55), wrap = 'M-17 -32L17 -32L3 16Q0 19 -3 16Z';
        const leaf = (x, y, a) => ell(x, y, 5, 11, LEAF, LEAF_L, 1.4, `transform="rotate(${a} ${x} ${y})"`);
        return handG(R, -1,
          leaf(-21, -40, -50) + leaf(21, -40, 50) + leaf(-10, -66, -20) + leaf(12, -66, 24) +
          p(wrap, '#fff8ef', '#c9b79a', 2) + p('M-17 -32L0 -20L17 -32L8 -4L0 -20L-8 -4Z', '#ffe9f1', '#d9b8c6', 1.4) +
          DU.flower(-12, -40, 10.5, P.base) + DU.flower(12, -40, 10.5, c2) + DU.flower(0, -54, 11.5, '#ffffff', '#ffb347') +
          DU.flower(-15, -58, 8.5, '#ffd24d', '#ff9a56') + DU.flower(15, -58, 8.5, P.base) + DU.flower(0, -72, 9, c2) +
          DU.bow(0, -7, 8, '#ff6f91', DU.line('#ff6f91'), true),
          31);
      },
    },
    {
      id: 'hd_mic', slot: 'hand', name: 'מיקרופון', tags: ['party'], color: '#ff6f91',
      draw(R, P, ctx) {
        const head = DU.ellD(0, -47, 12.5, 13);
        let mesh = '';
        for (let i = -4; i <= 4; i++) mesh += d`M${i * 5 - 16} -62l32 30M${i * 5 + 16} -62l-32 30`;
        const H = R.hand(-1);
        const note = (x, y, c) => ell(x, y, 5, 3.8, c, DU.line(c), 1.2, `transform="rotate(-20 ${n(x)} ${n(y)})"`) + ln(d`M${x + 4.3} ${y - 1.4}v-16`, DU.line(c), 3.4) + ln(d`M${x + 4.3} ${y - 1.4}v-16`, c, 1.8) + p(d`M${x + 4.3} ${y - 18}q8 1 9 9q-4 -4 -9 -4Z`, c, DU.line(c), 1.2);
        return note(H.x - 62, H.y - 66, P.base) + note(H.x - 78, H.y - 40, '#b48cff') + handG(R, -1,
          p('M-4.4 20Q0 22 4.4 20L6.4 -33L-6.4 -33Z', P.fill, P.line, 2.1) + ov('M1 21Q3 21 4.4 20L6.4 -33L2 -33Z') +
          `<rect x="-7.4" y="-38" width="14.8" height="6.6" rx="2" fill="${SILVER}" stroke="${SILVER_L}" stroke-width="1.5"/>` +
          p(head, '#eef1fb', SILVER_L, 2.1) + DU.clip(ctx.id('mic'), head, ln(mesh, '#aab2cf', 1.1)) + ell(-4.4, -52, 3.6, 4.6, '#fff', null, 0, 'fill-opacity=".8"') +
          DU.sparkle(-18, -62, 4.4, '#fff'),
          30);
      },
    },
    {
      id: 'hd_ball', slot: 'hand', name: 'כדור', tags: ['sport', 'beach'], color: '#ff6f91',
      draw(R, P, ctx) {
        const r = 30, x = 25, y = 8, px = x + 7, py = y - 12;
        const cols = [P.fill, '#ffffff', '#ffd24d', '#ffffff', '#5cc8ff', '#ffffff'];
        let seg = '';
        for (let i = 0; i < 6; i++) {
          const a0 = ((i * 60 + 20) * Math.PI) / 180, a1 = (((i + 1) * 60 + 20) * Math.PI) / 180;
          seg += `<path d="${d`M${px} ${py}L${px + Math.cos(a0) * 90} ${py + Math.sin(a0) * 90}L${px + Math.cos(a1) * 90} ${py + Math.sin(a1) * 90}Z`}" fill="${cols[i]}" stroke="${P.line}" stroke-width="1.2" stroke-opacity=".35"/>`;
        }
        const ball = DU.ellD(x, y, r, r);
        return handG(R, -1,
          p(ball, '#fff', null) + DU.clip(ctx.id('ball'), ball, seg + circ(px, py, 5, '#fff', P.line, 1.2, 'stroke-opacity=".5"')) +
          ov(d`M${x + 26} ${y - 15}A30 30 0 0 1 ${x - 15} ${y + 26}A38 38 0 0 0 ${x + 26} ${y - 15}Z`) +
          ell(x - 12, y - 15, 7, 4, '#fff', null, 0, `fill-opacity=".75" transform="rotate(-35 ${x - 12} ${y - 15})"`) +
          p(ball, 'none', P.line, 2.4));
      },
    },
    {
      id: 'hd_book', slot: 'hand', name: 'ספר', tags: ['school'], color: '#7b5bd6',
      draw(R, P) {
        return handG(R, -1,
          p('M-12 6L27 6L27 60L-12 60Z', '#fffaf0', '#b9ad98', 1.6) + ln('M-9 57.4H27M-9 54.8H27', '#d9cdb8', 1) +
          p('M24 56l0 12l3.6 -3.4l3.6 3.4l0 -12Z', '#e0435f', '#8c1f38', 1.2) +
          p('M-17 2L22 2Q25 2 25 5L25 55L-17 55Z', P.fill, P.line, 2.3) + p('M-17 2L-10 2L-10 55L-17 55Z', P.fill, P.line, 1.6) + ov('M-17 2L-10 2L-10 55L-17 55Z') +
          `<rect x="-4.5" y="12" width="24" height="5.4" rx="2.4" fill="#fff" fill-opacity=".85"/>` +
          p(DU.starD(7.5, 35, 9.5), '#ffd24d', GOLD_L, 1.5) + ell(-4, 5.6, 5, 1.4, '#fff', null, 0, 'fill-opacity=".45"'),
          -6);
      },
    },
    {
      id: 'hd_pillow', slot: 'hand', name: 'כרית', tags: ['sleepover'], color: '#b48cff',
      draw(R, P) {
        const pil = 'M-31 -31Q0 -23 31 -31Q24 0 31 31Q0 23 -31 31Q-24 0 -31 -31Z';
        const moon = 'M5 -13A13.5 13.5 0 1 0 14 9A10.5 10.5 0 0 1 5 -13Z';
        return handG(R, -1, `<g transform="translate(21 47) rotate(12)">` +
          [[-31, -31], [31, -31], [31, 31], [-31, 31]].map((q) => circ(q[0], q[1], 4.2, '#fff', P.line, 1.5)).join('') +
          p(pil, P.fill, P.line, 2.4) + p('M-25 -24Q0 -18 25 -24Q19 0 25 24Q0 18 -25 24Q-19 0 -25 -24Z', 'none', '#fff', 1.4, 'stroke-opacity=".6" stroke-dasharray="3 3.5"') +
          ov('M31 -31Q24 0 31 31Q0 23 -31 31Q-10 20 6 14Q22 4 31 -31Z') +
          p(moon, '#fff6c2', GOLD_L, 1.4) +
          sparkles([[-13, -12, 4.6, '#fff'], [-15, 11, 3.4, '#fff7b8'], [15, -16, 3, '#fff'], [18, 14, 2.6, '#fff7b8']]) +
          `</g>`);
      },
    },
    {
      id: 'hd_cocoa', slot: 'hand', name: 'שוקו חם', tags: ['winter'], color: '#ff9ac1',
      draw(R, P, ctx) {
        let sk = (ctx && ctx.sk) || { fill: '#ffe3d1', line: '#b98a80' };
        const gl = ctx && ctx.state && ctx.state.wear && ctx.state.wear.bracelet;
        if (gl && gl.id === 'br_gloves') { const c = gl.c || '#ff6f91'; sk = { fill: c, line: DU.line(c) }; } // fingers match the mittens
        const mug = 'M-17 -9L17 -9L15 17Q14 23 8 23L-8 23Q-14 23 -15 17Z';
        const finger = (y) => ell(-16, y, 4.6, 3.2, sk.fill, sk.line, 1.5);
        return {
          over: handG(R, -1,
            ln('M-4 -24q-5 -7 0 -13t0 -13M7 -26q-5 -7 0 -13t0 -11', '#ffffff', 2.6, 'stroke-opacity=".85"') +
            ln('M17 -2q12 0 12 9t-13 9', P.line, 7.4) + ln('M17 -2q12 0 12 9t-13 9', P.fill, 3.4) +
            p(mug, P.fill, P.line, 2.3) + ov('M6 -9L17 -9L15 17Q14 23 8 23L3 23Q8 8 6 -9Z') +
            ell(0, -9, 17, 4.6, '#7a4a2b', P.line, 2) +
            p('M-11 -9.5C-12 -17 -4 -16 -2 -19C1 -23 9 -20 8 -15C13 -15 13 -9 9 -8.4C2 -6.6 -6 -6.8 -11 -9.5Z', '#fffdf8', '#c9b9a8', 1.5) +
            `<rect x="-6" y="-15.5" width="5.6" height="4.6" rx="1.6" fill="#ffd9e6" stroke="#d99ab0" stroke-width="1"/><rect x="2" y="-13.6" width="5.2" height="4.4" rx="1.6" fill="#fff" stroke="#c9b9a8" stroke-width="1"/>` +
            p(DU.heartD(1, 8, 6), '#fff', null, 0, 'fill-opacity=".85"') +
            finger(-1) + finger(6) + finger(13)),
        };
      },
    },
    {
      id: 'hd_lollipop', slot: 'hand', name: 'סוכרייה', tags: ['party'], color: '#ff6f91',
      draw(R, P, ctx) {
        const cy = -62, r = 20;
        let sp = '';
        for (let a = 0; a <= 3.4 * Math.PI * 2; a += 0.28) {
          const rr = 1 + (a / (3.4 * Math.PI * 2)) * (r + 2);
          sp += (sp ? 'L' : 'M') + n(Math.cos(a) * rr) + ' ' + n(cy + Math.sin(a) * rr);
        }
        const disc = DU.ellD(0, cy, r, r);
        return handG(R, -1,
          p('M-2 22L2 22L2 -44L-2 -44Z', '#ffffff', '#a9a3c2', 1.5) +
          p(disc, P.fill, null) + DU.clip(ctx.id('lol'), disc, ln(sp, '#fff', 4.6, 'stroke-opacity=".92"')) +
          ov(d`M${r * 0.8} ${cy - r * 0.6}A${r} ${r} 0 0 1 ${-r * 0.6} ${cy + r * 0.8}A${r * 1.3} ${r * 1.3} 0 0 0 ${r * 0.8} ${cy - r * 0.6}Z`) +
          p(disc, 'none', P.line, 2.3) + ell(-8, cy - 10, 5, 2.8, '#fff', null, 0, `fill-opacity=".8" transform="rotate(-35 -8 ${cy - 10})"`) +
          DU.bow(0, -38, 8, '#8fd8ff', DU.line('#8fd8ff')),
          30);
      },
    },
    {
      id: 'hd_pompom', slot: 'hand', name: 'פונפון', tags: ['sport'], color: '#ff6f91',
      draw(R, P) {
        const lt = DU.light(P.base, 0.42);
        return {
          over: handG(R, -1,
            p(DU.starD(0, 6, 35, 22, 0.7, -80), P.fill, P.line, 2.2) +
            p(DU.starD(0, 6, 27.5, 18, 0.68, -62), lt, P.line, 1.5) +
            p(DU.starD(0, 6, 19.5, 14, 0.62, -90), P.fill, P.line, 1.3) +
            p(DU.starD(0, 6, 11, 10, 0.58, -70), DU.light(P.base, 0.7), P.line, 1.1) +
            sparkles([[-27, -22, 4.6], [29, -12, 3.6, '#fff7b8'], [22, 32, 3]])),
        };
      },
    },
    {
      id: 'hd_starwand', slot: 'hand', name: 'שרביט כוכבים', tags: ['magic', 'princess'], price: 600, color: 'gold', fixed: true,
      draw(R, P, ctx) {
        const G = ctx.paint('gold', [-28, -150, 56, 56]);
        const stick = 'M-3 24L3 24L2.8 -100L-2.8 -100Z';
        let st = '';
        for (let k = 0; k < 11; k++) st += d`M-5 ${16 - k * 12}l10 -8`;
        const rib = (s, c) => p(d`M${s * 3} -100C${s * 22} -92 ${s * 14} -72 ${s * 30} -62C${s * 38} -57 ${s * 34} -46 ${s * 42} -40L${s * 33} -41C${s * 28} -50 ${s * 30} -56 ${s * 22} -60C${s * 8} -68 ${s * 14} -86 ${s * 1} -94Z`, c, DU.line(c), 1.6);
        return handG(R, -1,
          rib(1, '#ff9ac1') + rib(-1, '#8fd8ff') +
          p(stick, '#fff5fb', '#a38ac2', 1.6) + DU.clip(ctx.id('sw'), stick, ln(st, '#ff9ac1', 3)) + p(stick, 'none', '#a38ac2', 1.6) +
          circ(0, -124, 39, 'none', '#fff', 2, 'stroke-opacity=".8" stroke-dasharray="0.1 9"') +
          p(DU.starD(0, -124, 29, 5, 0.54), GOLD, GOLD_L, 6) + p(DU.starD(0, -124, 29, 5, 0.54), G.fill, GOLD_L, 2) +
          p(DU.starD(0, -124, 16, 5, 0.54), '#fff', null, 0, 'fill-opacity=".5"') +
          p(DU.heartD(0, -123, 6.6), '#ff6f91', '#fff', 1.3) +
          DU.bow(0, -96, 9, '#ff9ac1', DU.line('#ff9ac1')) +
          sparkles([[-36, -150, 7], [36, -138, 5.6, '#fff7b8'], [26, -166, 4.4], [-42, -112, 4.4, '#fff7b8'], [44, -104, 3.6], [-14, -168, 3.4, '#ffe1f0'], [8, -80, 3, '#fff7b8']]),
          25);
      },
    },
  ];

  /* ================================================================== WINGS (behind everything) */
  const wingPair = (R, one) => { const x = R.cx, y = R.sY + 42; return `<g transform="translate(${n(x)} ${n(y)})">${one}</g><g transform="translate(${n(x)} ${n(y)}) scale(-1 1)">${one}</g>`; };
  const wings = [
    {
      id: 'wg_fairy', slot: 'wings', name: 'כנפי פיה', tags: ['magic'], price: 800, color: 'mermaid', fixed: true,
      draw(R, P, ctx) {
        const G = ctx.paint('mermaid', [0, -160, 190, 300]);
        const up = 'M6 0C24 -62 92 -156 160 -154C206 -152 206 -96 176 -58C142 -16 62 4 6 6Z';
        const lo = 'M6 6C54 8 122 30 140 84C152 124 120 148 94 126C62 100 30 58 6 16Z';
        const one =
          p(lo, G.fill, '#8f7fe0', 2.2, 'fill-opacity=".72"') + p(up, G.fill, '#8f7fe0', 2.2, 'fill-opacity=".78"') +
          p('M22 -6C40 -52 96 -128 152 -134C178 -134 180 -100 160 -70C132 -34 70 -10 22 -6Z', '#fff', null, 0, 'fill-opacity=".3"') +
          p('M24 16C60 22 108 44 122 86C128 108 112 118 98 106C70 84 44 50 24 16Z', '#fff', null, 0, 'fill-opacity=".3"') +
          ln('M8 2Q72 -62 152 -124M8 3Q84 -30 174 -72M8 4Q60 -8 124 -30M8 8Q62 30 124 98M8 10Q42 42 98 114', '#fff', 1.6, 'stroke-opacity=".8"') +
          sparkles([[150, -150, 7], [186, -96, 5, '#fff7b8'], [108, -64, 4.4], [70, -112, 3.6, '#fff7b8'], [132, 60, 5], [84, 92, 3.6, '#fff7b8'], [150, 118, 3.4], [188, -30, 3.6]]);
        return wingPair(R, one);
      },
    },
    {
      id: 'wg_butterfly', slot: 'wings', name: 'כנפי פרפר', tags: ['nature', 'magic'], price: 700, color: '#ff9ac1',
      draw(R, P) {
        const up = 'M6 -4C28 -92 118 -172 184 -142C226 -122 216 -42 162 -12C112 14 52 10 6 6Z';
        const lo = 'M6 4C60 6 140 30 152 90C158 138 112 168 82 140C52 110 22 60 6 14Z';
        const lt = DU.light(P.base, 0.55);
        const one =
          p(lo, P.fill, P.line, 2.6) + p(up, P.fill, P.line, 2.6) +
          p('M24 -8C42 -78 112 -140 166 -122C194 -110 190 -56 150 -32C110 -10 62 -6 24 -8Z', lt, null) +
          p('M26 16C68 22 122 44 130 90C134 120 106 136 88 118C62 92 40 56 26 16Z', lt, null) +
          ln('M10 -2Q80 -70 160 -116M10 0Q96 -34 176 -66M10 2Q70 -8 140 -22M10 8Q70 34 118 104M10 10Q50 44 92 124', P.line, 1.5, 'stroke-opacity=".45"') +
          [[188, -118, 7], [200, -86, 5.4], [192, -56, 4.4], [140, -150, 5], [140, 118, 6], [150, 88, 4.4], [112, 146, 4.2]].map((q) => circ(q[0], q[1], q[2], '#fff', P.line, 1.1, 'fill-opacity=".92"')).join('') +
          circ(104, -74, 13, P.fill, P.line, 1.5) + circ(104, -74, 6, '#fff', null, 0, 'fill-opacity=".85"') + circ(90, 82, 9, P.fill, P.line, 1.4) + circ(90, 82, 4, '#fff', null, 0, 'fill-opacity=".85"') +
          sparkles([[70, -128, 4.4], [170, -8, 3.6], [42, 76, 3.2]]);
        return wingPair(R, one);
      },
    },
    {
      id: 'wg_angel', slot: 'wings', name: 'כנפי מלאך', tags: ['magic', 'princess'], price: 900, color: '#ffffff', fixed: true,
      draw(R) {
        const L = '#a39cd0';
        const full = 'M4 0C14 -42 42 -106 82 -120C122 -132 172 -112 194 -72Q204 -40 188 -14Q192 14 170 26Q172 52 148 58Q146 84 120 84Q112 106 88 100Q76 116 56 104Q40 108 28 88Q12 62 4 20Z';
        const mid = 'M4 0C14 -42 42 -106 82 -120C122 -132 172 -112 194 -72Q184 -46 164 -44Q160 -22 138 -24Q130 -4 108 -8Q96 12 74 6Q60 22 40 14Q22 26 4 20Z';
        const top = 'M4 0C14 -42 42 -106 82 -120C122 -132 172 -112 194 -72Q172 -78 150 -72Q134 -58 112 -58Q98 -42 78 -42Q64 -26 46 -28Q30 -10 4 4Z';
        const one =
          p(full, '#ece8fb', L, 2.4) +
          ln('M176 -8Q178 4 170 26M154 6Q158 30 148 58M130 22Q132 56 120 84M104 34Q102 74 88 100M78 40Q70 80 56 104M54 36Q40 70 28 88', L, 1.4, 'stroke-opacity=".6"') +
          p(mid, '#f8f6ff', L, 2) + p(top, '#ffffff', L, 1.8) +
          ln('M34 -62Q70 -108 120 -112M30 -34Q80 -92 160 -94', L, 1.2, 'stroke-opacity=".4"') +
          sparkles([[160, -122, 6, '#ffe48a'], [200, -40, 4.6, '#ffe48a'], [60, -124, 4, '#ffe48a'], [140, 78, 4, '#ffe48a'], [100, -86, 3.4, '#ffd24d']]);
        return wingPair(R, `<g transform="rotate(-15) scale(1.08)">${one}</g>`);
      },
    },
    {
      id: 'wg_cape', slot: 'wings', name: 'גלימה', tags: ['magic', 'princess'], price: 600, color: '#7b5bd6',
      draw(R, P) {
        const { cx, sY, sh, hipY, kneeY, nk } = R, hem = kneeY + 54, W = sh + 58;
        const cape = sym(cx, [[0, sY - 8], [sh - 8, sY - 4], [sh + 6, sY + 8], [sh + 34, hipY - 20, sh + 52, kneeY - 40, W, hem - 6], ...DU.scallopSegs(W, hem - 6, 5, 13)]);
        const inner = sym(cx, [[0, sY], [sh - 2, sY + 12], [sh + 18, hipY - 10, sh + 30, kneeY - 30, W - 24, hem - 4], ...DU.scallopSegs(W - 24, hem - 4, 4, 11)]);
        const fold = (s) => ln(d`M${cx + s * (sh + 12)} ${sY + 40}Q${cx + s * (sh + 34)} ${hipY + 20} ${cx + s * (sh + 44)} ${hem - 4}M${cx + s * (sh + 2)} ${hipY}Q${cx + s * (sh + 14)} ${kneeY - 20} ${cx + s * (sh + 20)} ${hem}`, P.line, 1.5, 'stroke-opacity=".45"');
        const tieD = d`M${cx - nk - 17} ${R.shY(nk + 17) - 1}Q${cx} ${sY + 13} ${cx + nk + 17} ${R.shY(nk + 17) - 1}`;
        return {
          back: p(cape, P.fill, P.line, 2.6) + ov(inner, DU.SH2) + fold(1) + fold(-1) +
            sparkles([[cx - W + 16, hem - 40, 5, '#fff7b8'], [cx + W - 20, hem - 70, 4.4, '#fff'], [cx + W - 34, hem - 26, 3.4, '#fff7b8'], [cx - W + 30, hem - 86, 3.4, '#fff']]),
          over: ln(tieD, P.line, 7) + ln(tieD, P.fill, 4.4) + circ(cx, sY + 6.6, 7, GOLD, GOLD_L, 1.8) + p(DU.starD(cx, sY + 6.8, 4.2), '#fff6c2', GOLD_L, 0.9),
        };
      },
    },
    {
      id: 'wg_cattail', slot: 'wings', name: 'זנב חתול', tags: ['party'], price: 300, color: '#3a3346',
      draw(R, P) {
        const { cx, hipY } = R;
        const sp = [
          { x: cx + 16, y: hipY + 26, w: 9.5 }, { x: cx + 62, y: hipY + 70, w: 9 }, { x: cx + 108, y: hipY + 66, w: 9 },
          { x: cx + 134, y: hipY + 22, w: 8.6 }, { x: cx + 128, y: hipY - 32, w: 8.2 }, { x: cx + 108, y: hipY - 62, w: 7.6 },
        ];
        const tip = tube([{ x: cx + 133, y: hipY - 2, w: 8.5 }, { x: cx + 128, y: hipY - 32, w: 8.2 }, { x: cx + 108, y: hipY - 62, w: 7.6 }], 0, 0.95);
        return p(tube(sp, 0, 0.95), P.fill, P.line, 2.4) + p(tip, '#ffffff', P.line, 2, 'fill-opacity=".92"') +
          ln(d`M${cx + 60} ${hipY + 76}Q${cx + 100} ${hipY + 80} ${cx + 124} ${hipY + 50}`, '#fff', 1.6, 'stroke-opacity=".3"') +
          DU.bow(cx + 134, hipY + 10, 9, '#ff9ac1', DU.line('#ff9ac1'));
      },
    },
  ];

  DU.addItems([...necklaces, ...bracelets, ...bags, ...hands, ...wings]);
})();
