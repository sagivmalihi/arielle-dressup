/* backgrounds.js — the scenes behind the character.
   Each draw(uid) returns an SVG fragment that paints the whole 750×1000 card.
   The character stands at x=375 with her feet at y≈950, so every scene keeps a calm
   column behind her and a floor that starts around y≈790. Plain SVG only (no filters,
   no text, no CSS) so the same markup works in the PNG export. */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const n = DU.n;

  /* ---------- tiny markup helpers ---------- */
  const A = (ex) => (ex ? ' ' + ex : '');
  const F = (f) => (f ? ` fill="${f}"` : '');
  const ci = (x, y, r, f, ex) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}"${F(f)}${A(ex)}/>`;
  const el = (x, y, rx, ry, f, ex) => `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}"${F(f)}${A(ex)}/>`;
  const re = (x, y, w, h, f, ex) => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"${F(f)}${A(ex)}/>`;
  const pa = (d, f, ex) => `<path d="${d}"${F(f)}${A(ex)}/>`;
  const g = (attrs, s) => `<g ${attrs}>${s}</g>`;
  const st = (c, w, ex) => `fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${A(ex)}`;
  const stops = (a) => a.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op == null ? '' : ` stop-opacity="${op}"`}/>`).join('');
  const lg = (id, a, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops(a)}</linearGradient>`;
  const rg = (id, a) => `<radialGradient id="${id}">${stops(a)}</radialGradient>`;
  const sp = (x, y, r, f = '#fff', op) => `<path d="${DU.sparkleD(x, y, r)}" fill="${f}"${op == null ? '' : ` fill-opacity="${op}"`}/>`;
  const rnd = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  /* a random x that stays out of the calm column behind the character */
  const sideX = (r) => { const v = r(); return v < 0.5 ? 8 + v * 2 * 215 : 527 + (v - 0.5) * 2 * 215; };

  function cloud(x, y, s, f = '#fff', op) {
    const b = [[-1.15, 0.12, 0.5], [-0.55, -0.22, 0.68], [0.15, -0.42, 0.8], [0.85, -0.08, 0.6], [1.3, 0.2, 0.4]];
    const o = b.map(([dx, dy, r]) => ci(x + dx * s, y + dy * s, r * s)).join('') + re(x - 1.5 * s, y + 0.05 * s, 3.1 * s, 0.56 * s, null, `rx="${n(0.28 * s)}"`);
    return g(`fill="${f}"${op == null ? '' : ` opacity="${op}"`}`, o);
  }
  /* floor boards fanning out from a vanishing point */
  function planks(y, col, vy = 300, step = 105) {
    let d = '';
    for (let xb = -480; xb <= 1230; xb += step) d += `M${n(375 + ((xb - 375) * (y - vy)) / (1000 - vy))} ${y}L${xb} 1000`;
    return pa(d, null, st(col, 2.5));
  }
  /* a sagging string with things hanging from it */
  function garland(y, sag, spans, per, item) {
    const w = 750 / spans;
    let d = `M0 ${y}`, o = '';
    for (let i = 0; i < spans; i++) {
      const x0 = i * w;
      d += `Q${n(x0 + w / 2)} ${y + sag * 2} ${n(x0 + w)} ${y}`;
      for (let j = 0; j < per; j++) {
        const t = (j + 0.5) / per;
        o += item(x0 + w * t, y + 4 * sag * t * (1 - t), i * per + j);
      }
    }
    return [d, o];
  }
  function wave(y, amp, len) {
    let d = `M-20 ${y}q${len / 2} ${-amp} ${len} 0`;
    for (let x = len; x < 800; x += len) d += `t${len} 0`;
    return d;
  }
  function pine(x, base, h, w, col, snow) {
    let o = re(x - w * 0.06, base - h * 0.16, w * 0.12, h * 0.17, '#cfa98c');
    for (let i = 2; i >= 0; i--) {
      const ya = base - h + i * h * 0.2, yb = base - h * 0.12 - (2 - i) * h * 0.25, hw = (w / 2) * (0.5 + i * 0.25), my = (ya + yb) / 2;
      o += pa(`M${n(x)} ${n(ya)}Q${n(x + hw * 0.45)} ${n(my)} ${n(x + hw)} ${n(yb)}Q${n(x)} ${n(yb + hw * 0.28)} ${n(x - hw)} ${n(yb)}Q${n(x - hw * 0.45)} ${n(my)} ${n(x)} ${n(ya)}Z`, col);
      if (snow) {
        const k = yb - ya;
        o += pa(`M${n(x)} ${n(ya)}Q${n(x + hw * 0.3)} ${n(ya + k * 0.36)} ${n(x + hw * 0.62)} ${n(ya + k * 0.62)}Q${n(x + hw * 0.34)} ${n(ya + k * 0.46)} ${n(x + hw * 0.12)} ${n(ya + k * 0.62)}Q${n(x - hw * 0.1)} ${n(ya + k * 0.44)} ${n(x - hw * 0.3)} ${n(ya + k * 0.6)}Q${n(x - hw * 0.4)} ${n(ya + k * 0.5)} ${n(x - hw * 0.62)} ${n(ya + k * 0.62)}Q${n(x - hw * 0.3)} ${n(ya + k * 0.36)} ${n(x)} ${n(ya)}Z`, '#fff');
      }
    }
    return o;
  }
  function mush(x, y, s, cap) {
    return re(x - s * 0.28, y - s * 0.1, s * 0.56, s * 0.8, '#fff6e6', `rx="${n(s * 0.22)}"`) +
      pa(`M${n(x - s)} ${n(y)}Q${n(x - s)} ${n(y - s * 1.1)} ${n(x)} ${n(y - s * 1.1)}Q${n(x + s)} ${n(y - s * 1.1)} ${n(x + s)} ${n(y)}Q${n(x)} ${n(y + s * 0.22)} ${n(x - s)} ${n(y)}Z`, cap) +
      g('fill="#fff" fill-opacity=".85"', ci(x - s * 0.45, y - s * 0.45, s * 0.17) + ci(x + s * 0.3, y - s * 0.65, s * 0.2) + ci(x + s * 0.5, y - s * 0.22, s * 0.12));
  }
  function tulip(x, y, h, col) {
    return pa(`M${x} ${y + h}Q${x + 6} ${n(y + h / 2)} ${x} ${y}`, null, st('#6cc47a', 5)) +
      pa(`M${x} ${n(y + h * 0.75)}Q${x + 26} ${n(y + h * 0.6)} ${x + 24} ${n(y + h * 0.3)}Q${x + 6} ${n(y + h * 0.5)} ${x} ${n(y + h * 0.75)}Z`, '#7fd08a') +
      pa(`M${x - 15} ${y - 4}Q${x - 18} ${y - 32} ${x - 9} ${y - 36}L${x} ${y - 22}L${x + 9} ${y - 36}Q${x + 18} ${y - 32} ${x + 15} ${y - 4}Q${x} ${y + 10} ${x - 15} ${y - 4}Z`, col) +
      pa(`M${x - 9} ${y - 36}L${x} ${y - 22}L${x + 9} ${y - 36}Q${x} ${y - 46} ${x - 9} ${y - 36}Z`, DU.light(col, 0.3));
  }
  function daisy(x, y, r, col, c = '#ffd54d') {
    let o = '';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      o += ci(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.5);
    }
    return g(`fill="${col}"`, o) + ci(x, y, r * 0.36, c);
  }
  function bfly(x, y, s, col) {
    const w = (sx, sy, k) => el(x + sx * s * 0.55, y + sy * s * 0.4, s * 0.55 * k, s * 0.42 * k, col, `transform="rotate(${sx * sy * 28} ${n(x + sx * s * 0.55)} ${n(y + sy * s * 0.4)})"`);
    return w(-1, -1, 1) + w(1, -1, 1) + w(-1, 1, 0.72) + w(1, 1, 0.72) + el(x, y, s * 0.11, s * 0.5, '#8a6fb0') +
      ci(x - s * 0.6, y - s * 0.45, s * 0.14, '#fff', 'fill-opacity=".7"') + ci(x + s * 0.6, y - s * 0.45, s * 0.14, '#fff', 'fill-opacity=".7"');
  }
  function balloon(x, y, r, col, tx, ty) {
    return pa(`M${x} ${n(y + r * 1.2)}Q${n(x + (tx - x) * 0.2 + 14)} ${n((y + ty) / 2)} ${tx} ${ty}`, null, st('#fff', 2.2, 'stroke-opacity=".9"')) +
      el(x, y, r, r * 1.16, col) + pa(`M${x - 5} ${n(y + r * 1.22)}L${x} ${n(y + r * 1.1)}L${x + 5} ${n(y + r * 1.22)}Z`, col) +
      el(x - r * 0.35, y - r * 0.45, r * 0.2, r * 0.32, '#fff', 'fill-opacity=".55" transform="rotate(25 ' + n(x - r * 0.35) + ' ' + n(y - r * 0.45) + ')"');
  }
  function lolly(x, y, r, c1, c2, bottom) {
    let d = '';
    for (let i = 0; i <= 44; i++) {
      const t = i / 44, a = t * Math.PI * 5.2, rr = r * 0.86 * t;
      d += (i ? 'L' : 'M') + n(x + Math.cos(a) * rr) + ' ' + n(y + Math.sin(a) * rr);
    }
    return re(x - 5, y, 10, bottom - y, '#fff', 'rx="5"') + re(x + 1, y, 4, bottom - y, '#f3dcec') + ci(x, y, r, c2) + pa(d, null, st(c1, r * 0.17)) +
      pa(`M${n(x - r * 0.72)} ${n(y - r * 0.2)}A${n(r * 0.75)} ${n(r * 0.75)} 0 0 1 ${n(x - r * 0.2)} ${n(y - r * 0.72)}`, null, st('#fff', r * 0.09, 'stroke-opacity=".8"'));
  }
  function gum(x, y, s, col) {
    return pa(`M${x - s} ${y}Q${x - s} ${n(y - s * 1.5)} ${x} ${n(y - s * 1.5)}Q${x + s} ${n(y - s * 1.5)} ${x + s} ${y}Q${x} ${n(y + s * 0.3)} ${x - s} ${y}Z`, col) +
      el(x - s * 0.35, y - s * 0.95, s * 0.2, s * 0.3, '#fff', 'fill-opacity=".6"');
  }
  function fish(x, y, s, col, dir) {
    return pa(`M${n(x - dir * s * 0.75)} ${y}l${n(-dir * s * 0.75)} ${n(-s * 0.55)}q${n(dir * s * 0.3)} ${n(s * 0.55)} 0 ${n(s * 1.1)}Z`, DU.dark(col, 0.12)) +
      el(x, y, s, s * 0.62, col) + pa(`M${n(x - dir * s * 0.1)} ${n(y - s * 0.55)}q${n(-dir * s * 0.3)} ${n(-s * 0.5)} ${n(-dir * s * 0.6)} ${n(s * 0.15)}Z`, DU.dark(col, 0.12)) +
      el(x - dir * s * 0.1, y + s * 0.1, s * 0.3, s * 0.2, '#fff', 'fill-opacity=".45"') +
      ci(x + dir * s * 0.5, y - s * 0.12, s * 0.2, '#fff') + ci(x + dir * s * 0.55, y - s * 0.12, s * 0.1, '#4a3a6b') + el(x + dir * s * 0.42, y + s * 0.2, s * 0.14, s * 0.09, '#ff9fb5', 'fill-opacity=".8"');
  }
  function bubble(x, y, r) {
    return ci(x, y, r, '#fff', 'fill-opacity=".22" stroke="#fff" stroke-opacity=".8" stroke-width="2"') + ci(x - r * 0.35, y - r * 0.35, r * 0.22, '#fff');
  }
  function weed(x, base, h, col, w) {
    const k = h / 3;
    return pa(`M${x} ${base}q${n(w * 2)} ${n(-k / 2)} 0 ${n(-k)}t0 ${n(-k)}t0 ${n(-k)}`, null, st(col, w));
  }
  function dots(seed, count, pick, r0, r1, onlySides) {
    const r = rnd(seed);
    let o = '';
    for (let i = 0; i < count; i++) {
      const x = onlySides ? sideX(r) : r() * 750, y = pick(r);
      o += ci(x, y, r0 + r() * (r1 - r0));
    }
    return o;
  }
  /* crescent moon as a real shape (so a glow can sit behind it) */
  function crescent(cx, cy, R, ox, oy, r) {
    const d = Math.hypot(ox, oy), a = (R * R - r * r + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, R * R - a * a));
    const mx = cx + (a * ox) / d, my = cy + (a * oy) / d;
    const p1 = [mx + (hh * oy) / d, my - (hh * ox) / d], p2 = [mx - (hh * oy) / d, my + (hh * ox) / d];
    return `M${n(p1[0])} ${n(p1[1])}A${R} ${R} 0 1 0 ${n(p2[0])} ${n(p2[1])}A${r} ${r} 0 1 1 ${n(p1[0])} ${n(p1[1])}Z`;
  }

  /* ---------- the scenes ---------- */
  const B = [];

  B.push({
    id: 'bedroom', name: 'חדר שינה', tags: ['sleepover'], price: 0,
    draw(u) {
      u += 'bd';
      let s = `<defs>${lg(u + 'w', [[0, '#eee0ff'], [1, '#ffe6f2']])}${lg(u + 'f', [[0, '#f9dcbd'], [1, '#f3c9a2']])}${lg(u + 'k', [[0, '#a9deff'], [1, '#fff1d0']])}${rg(u + 'g', [[0, '#fff7c2', 0.85], [1, '#fff7c2', 0]])}` +
        `<pattern id="${u}p" width="96" height="96" patternUnits="userSpaceOnUse">${pa(DU.starD(24, 26, 7), '#fff', 'fill-opacity=".65"')}${pa(DU.starD(72, 74, 5), '#fff', 'fill-opacity=".5"')}${ci(72, 24, 2.6, '#fff', 'fill-opacity=".55"')}${ci(24, 72, 2.6, '#fff', 'fill-opacity=".55"')}</pattern></defs>`;
      s += re(0, 0, 750, 800, `url(#${u}w)`) + re(0, 0, 750, 632, `url(#${u}p)`);
      s += re(0, 640, 750, 150, '#f8d2e6') + re(0, 630, 750, 11, '#fff') + re(0, 782, 750, 20, '#fff');
      s += re(0, 800, 750, 200, `url(#${u}f)`) + planks(800, '#e8bb90');
      s += el(375, 928, 258, 56, '#ffc0dc') + el(375, 926, 228, 45, '#ffe0ee') + el(375, 926, 150, 26, '#fff', 'fill-opacity=".5"');
      // window + curtains
      s += re(40, 142, 180, 262, '#fff', 'rx="16"') + re(52, 154, 156, 238, `url(#${u}k)`, 'rx="8"') + ci(96, 206, 20, '#fff3b0') + cloud(150, 330, 22, '#fff', 0.9) + cloud(112, 262, 13, '#fff', 0.8);
      s += re(126, 154, 8, 238, '#fff') + re(52, 266, 156, 8, '#fff');
      s += pa('M24 126H98Q94 250 54 330Q72 380 62 424H24Z', '#ff9fc4') + pa('M236 126H162Q166 250 206 330Q188 380 198 424H236Z', '#ff9fc4');
      s += pa('M46 132Q46 230 38 318M214 132Q214 230 222 318', null, st('#f27fae', 3, 'stroke-opacity=".6"'));
      s += re(42, 322, 22, 11, '#ffd76a', 'rx="5"') + re(196, 322, 22, 11, '#ffd76a', 'rx="5"') + re(12, 114, 236, 13, '#d3b0f5', 'rx="6.5"') + ci(12, 120, 10, '#c29af0') + ci(248, 120, 10, '#c29af0');
      // dresser + lamp + cactus
      s += re(28, 612, 178, 182, '#fff9fc', 'rx="12"') + g('fill="#ffdbeb"', re(42, 628, 150, 44, null, 'rx="8"') + re(42, 682, 150, 44, null, 'rx="8"') + re(42, 736, 150, 44, null, 'rx="8"')) + g('fill="#ffd76a"', ci(117, 650, 6) + ci(117, 704, 6) + ci(117, 758, 6));
      s += ci(82, 548, 62, `url(#${u}g)`) + re(79, 566, 6, 34, '#d9c2f5') + re(66, 596, 32, 16, '#c9a4f0', 'rx="6"') + pa('M54 572H110L98 522H66Z', '#fff3b0') + pa('M58 558H106', null, st('#ffe08a', 4));
      s += re(146, 590, 32, 22, '#ffb7a1', 'rx="5"') + el(162, 572, 12, 22, '#8fd6a5') + el(162, 570, 4, 16, '#b3e6c2') + ci(162, 550, 6, '#ff8fb8');
      // bed + teddy
      s += re(700, 496, 80, 300, '#cbb0f5', 'rx="26"') + re(514, 728, 250, 66, '#e3d0ff', 'rx="10"') + re(520, 792, 14, 22, '#cbb0f5') + re(518, 674, 250, 66, '#fff', 'rx="18"');
      s += el(712, 668, 46, 24, '#ffe3ef') + el(712, 664, 44, 21, '#fff');
      s += re(518, 690, 176, 90, '#a9e6d4', 'rx="16"') + g('fill="#fff" fill-opacity=".8"', ci(548, 716, 6) + ci(592, 742, 6) + ci(636, 714, 6) + ci(668, 752, 6) + ci(556, 760, 6)) + re(518, 690, 176, 16, '#c7f0e3', 'rx="8"');
      s += g('fill="#f0c8a0"', ci(612, 632, 21) + ci(596, 614, 9) + ci(628, 614, 9) + el(612, 668, 25, 24)) + el(612, 640, 10, 7, '#fff3e3') + g('fill="#6b4a6b"', ci(604, 630, 2.6) + ci(620, 630, 2.6) + ci(612, 637, 2.2)) + ci(600, 640, 4, '#ff9fb5', 'fill-opacity=".7"') + ci(624, 640, 4, '#ff9fb5', 'fill-opacity=".7"');
      // shelf + pictures
      s += re(546, 300, 184, 12, '#fff', 'rx="6"') + re(560, 246, 18, 54, '#ff9fc4', 'rx="3"') + re(580, 236, 16, 64, '#9fd8ff', 'rx="3"') + re(598, 252, 20, 48, '#ffe08a', 'rx="3"') + re(620, 242, 14, 58, '#b9a4f0', 'rx="3"');
      s += re(672, 276, 32, 24, '#ffcbb0', 'rx="5"') + el(680, 262, 8, 17, '#8fd6a5', 'transform="rotate(-20 680 262)"') + el(696, 262, 8, 17, '#7fcf98', 'transform="rotate(20 696 262)"');
      s += re(556, 150, 72, 62, '#fff', 'rx="8"') + pa(DU.heartD(592, 182, 15), '#ff9fc4') + re(646, 158, 62, 62, '#fff', 'rx="8"') + pa(DU.starD(677, 190, 19), '#ffd76a');
      // fairy lights
      const cols = ['#fff3a8', '#ffb3d1', '#a9e0ff', '#c9f0c0'];
      const [d, o] = garland(34, 22, 4, 5, (x, y, i) => ci(x, y + 7, 13, cols[i % 4], 'fill-opacity=".3"') + ci(x, y + 7, 6.5, cols[i % 4]));
      return s + pa(d, null, st('#d9bdf0', 2.5)) + o;
    },
  });

  B.push({
    id: 'beach', name: 'חוף ים', tags: ['beach'], price: 0,
    draw(u) {
      u += 'bc';
      let s = `<defs>${lg(u + 's', [[0, '#8ad3ff'], [0.7, '#d6f2ff'], [1, '#fff2d6']])}${lg(u + 'w', [[0, '#4cc6dc'], [0.6, '#8ae2df'], [1, '#d3f6ee']])}${lg(u + 'd', [[0, '#fff0c9'], [1, '#fbd79b']])}${rg(u + 'g', [[0, '#fff7c2', 0.9], [1, '#fff7c2', 0]])}</defs>`;
      s += re(0, 0, 750, 540, `url(#${u}s)`) + ci(610, 150, 125, `url(#${u}g)`) + ci(610, 150, 58, '#fff5b5');
      s += cloud(150, 120, 44) + cloud(350, 66, 24, '#fff', 0.75) + cloud(700, 330, 30, '#fff', 0.8);
      s += pa('M250 522Q320 486 400 508Q440 518 470 522Z', '#a9e0cc') + pa('M548 514h58l-11 14h-36Z', '#fff') + pa('M576 508V456L606 504Z', '#ff9fc4') + pa('M571 508V470L550 504Z', '#fff');
      s += re(0, 520, 750, 280, `url(#${u}w)`);
      s += pa(wave(558, 9, 120), null, st('#fff', 4, 'stroke-opacity=".5" stroke-dasharray="90 60"')) + pa(wave(612, 11, 150), null, st('#fff', 5, 'stroke-opacity=".5" stroke-dasharray="120 70"')) + pa(wave(672, 12, 170), null, st('#fff', 6, 'stroke-opacity=".55" stroke-dasharray="150 60"'));
      s += pa('M0 772Q60 752 130 768T260 766T400 772T540 762T660 770T750 760V1000H0Z', '#fff') + pa('M0 790Q60 770 130 786T260 784T400 790T540 780T660 788T750 778V1000H0Z', `url(#${u}d)`);
      s += g('fill="#f1c78a"', dots(7, 16, (r) => 830 + r() * 160, 2, 4));
      // palm
      s += pa('M50 836Q36 600 94 352L124 358Q78 600 98 836Z', '#dcae7e') + pa('M58 760q20 8 38 0M60 680q20 8 36 0M66 600q18 8 34 0M76 520q16 8 32 0M88 440q14 8 30 0', null, st('#c4945f', 3));
      s += g('fill="#5fc48c"', pa('M108 352Q28 300 -34 362Q40 334 104 370Z') + pa('M108 350Q50 238 -14 228Q60 268 100 358Z') + pa('M112 352Q192 308 256 372Q182 346 114 368Z'));
      s += g('fill="#78d6a0"', pa('M108 350Q104 238 52 184Q142 232 122 354Z') + pa('M110 350Q172 246 244 246Q182 290 118 362Z'));
      s += ci(100, 360, 11, '#b8855a') + ci(120, 364, 11, '#a87548');
      // umbrella + towel
      s += pa('M664 500L674 870', null, st('#fff', 7)) + pa('M546 500A118 118 0 0 1 782 500Z', '#ff9fc4') + g('fill="#fff"', pa('M664 382L585 500H625Z') + pa('M664 382L664 500H704Z') + pa('M664 382L743 500H782Z')) + ci(664, 380, 8, '#ffd76a');
      s += pa('M548 896L716 872L756 902V936L592 954Z', '#b9a4f0') + pa('M570 904L728 882M592 928L748 906', null, st('#fff', 6, 'stroke-opacity=".7"'));
      // ball, bucket, starfish, shell
      s += el(135, 946, 32, 7, '#e9bd82', 'fill-opacity=".6"') + ci(135, 905, 37, '#fff') + pa('M135 868Q98 890 108 934Q122 900 135 868Z', '#ff8fb8') + pa('M135 868Q172 890 162 934Q148 900 135 868Z', '#7fd3ff') + pa('M135 868Q118 905 135 942Q152 905 135 868Z', '#ffe08a');
      s += pa('M38 910H86L79 958H45Z', '#ffd76a') + pa('M40 912Q62 880 84 912', null, st('#ffb347', 4)) + re(36, 906, 52, 9, '#ffb347', 'rx="4"');
      s += pa(DU.starD(236, 968, 22, 5, 0.52, -70), '#ff9f9f') + ci(236, 968, 4, '#ffc4c4') + pa('M486 986Q484 958 504 954Q524 958 522 986Z', '#ffd1e3') + pa('M504 956V984M495 960L492 984M513 960L516 984', null, st('#f5a9c6', 2));
      return s;
    },
  });

  B.push({
    id: 'stage', name: 'במה', tags: ['party'], price: 0,
    draw(u) {
      u += 'st';
      let s = `<defs>${lg(u + 'w', [[0, '#b7a2f0'], [1, '#ecc8f5']])}${lg(u + 'f', [[0, '#f8d5ac'], [1, '#eebd8c']])}` +
        `<pattern id="${u}c" width="52" height="40" patternUnits="userSpaceOnUse"><rect width="52" height="40" fill="#ff8fb8"/><rect width="14" height="40" fill="#f273a6"/><rect x="30" width="7" height="40" fill="#ffb0cf"/></pattern></defs>`;
      s += re(0, 0, 750, 800, `url(#${u}w)`);
      const r = rnd(11);
      let k = '';
      for (let i = 0; i < 14; i++) k += sp(sideX(r), 130 + r() * 560, 5 + r() * 9, '#fff', 0.75);
      s += k + g('fill="#fff" fill-opacity=".14"', ci(210, 250, 46) + ci(560, 330, 60) + ci(180, 560, 34) + ci(590, 600, 40));
      s += pa('M60 0H150L560 800H240Z', '#fff', 'fill-opacity=".13"') + pa('M690 0H600L190 800H510Z', '#fff', 'fill-opacity=".13"');
      s += re(0, 800, 750, 200, `url(#${u}f)`) + planks(800, '#dfa877') + el(375, 905, 260, 62, '#fff', 'fill-opacity=".4"') + re(0, 978, 750, 22, '#dba173');
      let bulbs = '';
      for (let x = 190; x <= 240; x += 46) bulbs += ci(x, 808, 17, '#fff3b0', 'fill-opacity=".35"') + ci(x, 808, 9, '#fff3b0') + ci(750 - x, 808, 17, '#fff3b0', 'fill-opacity=".35"') + ci(750 - x, 808, 9, '#fff3b0');
      s += bulbs;
      const drape = pa('M0 0H168Q164 260 104 420Q152 600 142 804H0Z', `url(#${u}c)`) + pa('M168 0Q164 260 104 420Q152 600 142 804', null, st('#e0609a', 4, 'stroke-opacity=".5"')) + el(98, 424, 18, 10, '#ffd76a') + pa('M92 430q-4 22 4 40M104 430q6 20 0 38', null, st('#ffd76a', 4));
      s += drape + g('transform="matrix(-1 0 0 1 750 0)"', drape);
      let v = 'M0 0H750V70';
      for (let i = 5; i >= 0; i--) v += `Q${i * 125 + 62.5} 132 ${i * 125} 70`;
      s += pa(v + 'Z', '#ff6fa5') + pa(v.replace('M0 0H750V70', 'M750 70'), null, st('#ffd76a', 6));
      for (let i = 0; i <= 6; i++) s += ci(i * 125, 72, 8, '#ffd76a') + pa(`M${i * 125 - 5} 78h10l-5 20Z`, '#ffd76a');
      return s;
    },
  });

  B.push({
    id: 'forest', name: 'יער', tags: ['nature', 'magic'], price: 0,
    draw(u) {
      u += 'fo';
      let s = `<defs>${lg(u + 'b', [[0, '#cdf0d4'], [0.55, '#f1fadb'], [1, '#cdeec0']])}${rg(u + 'g', [[0, '#fffbc8', 0.9], [1, '#fffbc8', 0]])}</defs>`;
      s += re(0, 0, 750, 1000, `url(#${u}b)`);
      let far = '';
      [[70, 250, 62], [190, 320, 50], [300, 270, 56], [420, 300, 52], [530, 250, 60], [650, 310, 54], [745, 270, 50]].forEach(([x, y, w]) => {
        far += re(x - 8, y, 16, 560, null) + el(x, y, w, w * 1.7);
      });
      s += g('fill="#c3e9c3"', far) + re(0, 560, 750, 250, '#dcf3d0', 'fill-opacity=".7"');
      s += pa('M170 0H300L110 800H-60Z', '#fffbe0', 'fill-opacity=".4"') + pa('M370 0H440L330 800H230Z', '#fffbe0', 'fill-opacity=".22"');
      // big side trees
      s += pa('M0 0H74Q58 420 96 810H0Z', '#c49a76') + pa('M750 0H668Q694 420 648 810H750Z', '#c49a76');
      s += pa('M30 200q10 60 4 130M46 420q12 70 6 150M716 180q-12 70 -6 140M704 440q-10 60 0 130', null, st('#a97f5c', 4, 'stroke-opacity=".7"'));
      s += g('fill="#74c98d"', ci(30, 50, 125) + ci(170, 20, 95) + ci(720, 40, 130) + ci(580, 10, 90)) + g('fill="#8fd9a3"', ci(110, 130, 78) + ci(238, 62, 58) + ci(640, 130, 80) + ci(510, 58, 56)) + g('fill="#a9e6b6"', ci(60, 110, 40) + ci(200, 40, 34) + ci(690, 96, 44) + ci(560, 50, 30));
      // ground
      s += pa('M0 800Q190 772 375 792T750 782V1000H0Z', '#9fdb92') + el(375, 955, 240, 58, '#bdeaa8');
      s += g('fill="#74c98d"', ci(20, 800, 70) + ci(110, 822, 52) + ci(735, 800, 74) + ci(640, 824, 50)) + g('fill="#8fd9a3"', ci(60, 812, 44) + ci(690, 812, 46));
      s += mush(120, 900, 32, '#ff8fa8') + mush(176, 925, 18, '#ffb37a') + mush(640, 915, 27, '#ff8fa8') + mush(596, 940, 15, '#c9a4f0');
      s += daisy(52, 950, 13, '#fff') + daisy(712, 968, 13, '#fff') + daisy(238, 978, 11, '#ffe08a') + daisy(530, 984, 11, '#ffc4de');
      [[205, 300], [560, 380], [150, 520], [610, 600], [230, 690], [540, 210], [80, 660], [680, 470]].forEach(([x, y], i) => {
        s += ci(x, y, 13 + (i % 3) * 3, `url(#${u}g)`) + ci(x, y, 3.2, '#fffbd0');
      });
      return s + sp(250, 440, 9, '#fff', 0.9) + sp(520, 520, 7, '#fff', 0.9) + sp(170, 250, 6, '#fff', 0.8) + sp(590, 720, 8, '#fff', 0.9);
    },
  });

  B.push({
    id: 'classroom', name: 'כיתה', tags: ['school'], price: 0,
    draw(u) {
      u += 'cl';
      let s = `<defs>${lg(u + 'f', [[0, '#f6d8ab'], [1, '#efc592']])}${lg(u + 'b', [[0, '#a9dcbd'], [1, '#8fcdaa']])}</defs>`;
      s += re(0, 0, 750, 800, '#fff5dc') + re(0, 618, 750, 172, '#d3efe1') + re(0, 608, 750, 11, '#fff') + re(0, 782, 750, 20, '#fff');
      const cols = ['#ff9fb5', '#ffe08a', '#9fd8ff', '#a9e6b8', '#c9a4f0'];
      const [d, o] = garland(40, 14, 1, 13, (x, y, i) => pa(`M${n(x - 21)} ${n(y - 1)}h42l-21 44Z`, cols[i % 5]));
      s += pa(d.replace('M0', 'M-10').replace(/750 40$/, '760 40'), null, st('#e6cfa8', 3)) + o;
      // chalkboard
      s += re(62, 222, 626, 344, '#e9c08f', 'rx="14"') + re(76, 236, 598, 312, `url(#${u}b)`, 'rx="6"') + re(96, 558, 558, 15, '#d9a877', 'rx="6"');
      s += re(128, 549, 28, 9, '#fff', 'rx="3"') + re(164, 549, 22, 9, '#ffc4de', 'rx="3"') + re(194, 549, 20, 9, '#fff3a8', 'rx="3"') + re(578, 543, 46, 15, '#b9a4f0', 'rx="4"') + re(578, 553, 46, 5, '#fff');
      let k = ci(138, 296, 17) + pa('M138 266v-10M138 326v10M108 296h-10M168 296h10M117 275l-7 -7M159 275l7 -7M117 317l-7 7M159 317l7 7');
      k += pa(DU.heartD(196, 388, 15)) + pa(DU.starD(118, 400, 17));
      k += pa('M560 298h30M575 283v30M612 291h26M612 307h26') + pa('M560 408l24 -22l24 22v28h-48Z') + pa(DU.starD(642, 396, 14));
      k += ci(596, 486, 24) + pa('M586 494q10 9 20 0') + ci(588, 480, 1.6) + ci(604, 480, 1.6);
      s += g(st('#fff', 4, 'stroke-opacity=".85"'), k);
      s += pa('M108 500a36 36 0 0 1 72 0', null, st('#ffc4de', 5)) + pa('M119 500a25 25 0 0 1 50 0', null, st('#fff3a8', 5)) + pa('M130 500a14 14 0 0 1 28 0', null, st('#b6e4ff', 5));
      // clock
      s += ci(668, 150, 38, '#fff', 'stroke="#ffb3cf" stroke-width="7"') + pa('M668 150V128M668 150L684 158', null, st('#8f86c9', 4)) + ci(668, 150, 4, '#8f86c9') + g('fill="#c9c3e6"', ci(668, 122, 2.5) + ci(668, 178, 2.5) + ci(640, 150, 2.5) + ci(696, 150, 2.5));
      s += re(0, 800, 750, 200, `url(#${u}f)`) + planks(800, '#e3b37f');
      // desks
      s += re(150, 784, 14, 130, '#d9a56a') + pa('M-10 742H172L192 772H-10Z', '#f9d5a4') + re(-10, 770, 202, 16, '#e9b97e');
      s += re(28, 716, 92, 15, '#ff9fc4', 'rx="3"') + re(36, 701, 82, 15, '#9fd8ff', 'rx="3"') + re(32, 686, 86, 15, '#ffe08a', 'rx="3"') + ci(74, 668, 18, '#ff7f8f') + ci(68, 662, 5, '#fff', 'fill-opacity=".5"') + pa('M74 652q2 -10 10 -12', null, st('#a97f5c', 3)) + el(88, 644, 8, 4, '#7fcf98', 'transform="rotate(-25 88 644)"');
      s += re(588, 784, 14, 130, '#d9a56a') + pa('M580 742H760V772H560Z', '#f9d5a4') + re(560, 770, 200, 16, '#e9b97e');
      s += re(662, 730, 46, 12, '#c9a4f0', 'rx="5"') + re(681, 716, 8, 16, '#c9a4f0') + ci(685, 682, 36, '#9fd8ff') + g('fill="#a9e6b8"', pa('M664 668q12 -16 26 -8q4 12 -8 18q-10 4 -18 -10Z') + pa('M690 694q14 -8 22 2q-4 14 -16 14Z')) + pa('M655 664a36 36 0 0 1 20 -16', null, st('#fff', 4, 'stroke-opacity=".7"'));
      s += re(600, 704, 30, 38, '#ffb3cf', 'rx="5"') + pa('M606 704l4 -30l6 30ZM616 704l5 -36l6 36Z', '#ffe08a') + pa('M610 674l-2 12h5ZM621 668l-2 12h5Z', '#8f86c9');
      return s;
    },
  });

  B.push({
    id: 'snow', name: 'שלג', tags: ['winter'], price: 0,
    draw(u) {
      u += 'sn';
      let s = `<defs>${lg(u + 's', [[0, '#b9d8ff'], [0.6, '#e4e3ff'], [1, '#fff6fb']])}</defs>`;
      s += re(0, 0, 750, 820, `url(#${u}s)`);
      s += pa('M0 640Q120 540 260 610T520 590T750 620V820H0Z', '#dfe9ff') + pa('M0 700Q200 624 380 690T750 670V820H0Z', '#edf2ff');
      // cabin
      s += re(640, 592, 15, 30, '#c98f77') + g('fill="#fff" opacity=".75"', ci(648, 574, 9) + ci(657, 552, 11) + ci(650, 526, 13));
      s += re(552, 632, 96, 74, '#ecbf9e') + pa('M540 640L600 584L660 640Z', '#d79c80') + pa('M536 638L600 578L664 638L652 640L600 594L548 640Z', '#fff') + re(568, 652, 24, 24, '#fff3b0', 'rx="3"') + pa('M580 652v24M568 664h24', null, st('#ecbf9e', 2.5)) + re(610, 660, 22, 46, '#c98f77', 'rx="3"');
      s += pine(205, 792, 210, 110, '#a9dcc8', true) + pine(88, 818, 400, 190, '#84c9b0', true) + pine(700, 822, 430, 190, '#84c9b0', true);
      s += pa('M0 800Q140 770 300 792T560 786T750 796V1000H0Z', '#fff') + g('fill="#e3ecff"', el(540, 892, 150, 20) + el(200, 968, 170, 18) + el(390, 962, 120, 14));
      // snowman
      s += el(152, 934, 62, 10, '#dbe6ff') + ci(150, 880, 54, '#dfe9ff') + ci(145, 875, 48, '#fff') + ci(150, 808, 40, '#dfe9ff') + ci(146, 804, 35, '#fff') + pa('M113 800L74 768M187 800L228 770M86 778l-4 -16M216 779l4 -16', null, st('#b98e6a', 4));
      s += ci(150, 748, 29, '#dfe9ff') + ci(147, 745, 25, '#fff') + re(124, 768, 52, 13, '#ff8fb8', 'rx="6.5"') + pa('M160 778l16 36l-15 -3l-9 -32Z', '#ff8fb8');
      s += pa('M124 738Q124 704 150 704Q176 704 176 738Z', '#7fd6c2') + re(119, 731, 62, 13, '#fff', 'rx="6.5"') + ci(150, 702, 10, '#fff');
      s += g('fill="#5a4a6b"', ci(141, 746, 3.2) + ci(159, 746, 3.2) + ci(150, 798, 3.6) + ci(150, 816, 3.6)) + pa('M150 752l22 6l-22 5Z', '#ffa35c');
      // snowfall
      s += g('fill="#fff"', dots(5, 40, (r) => r() * 780, 2, 5.5));
      const fl = (x, y, q) => `M${x - q} ${y}h${2 * q}M${n(x - q / 2)} ${n(y - q * 0.87)}l${q} ${n(q * 1.74)}M${n(x + q / 2)} ${n(y - q * 0.87)}l${-q} ${n(q * 1.74)}`;
      s += pa(fl(60, 90, 14) + fl(215, 180, 10) + fl(540, 110, 12) + fl(690, 60, 15) + fl(40, 420, 9) + fl(600, 300, 9) + fl(230, 520, 8), null, st('#fff', 3));
      return s + sp(300, 850, 7, '#bfd8ff') + sp(610, 950, 8, '#bfd8ff') + sp(90, 985, 6, '#bfd8ff') + sp(470, 830, 5, '#bfd8ff');
    },
  });

  B.push({
    id: 'garden', name: 'גן פרחים', tags: ['nature'], price: 0,
    draw(u) {
      u += 'gd';
      let s = `<defs>${lg(u + 's', [[0, '#a6dfff'], [1, '#e9f9ff']])}</defs>`;
      s += re(0, 0, 750, 800, `url(#${u}s)`) + ci(0, 0, 160, '#fff', 'fill-opacity=".4"') + ci(0, 0, 108, '#fff3a8');
      s += cloud(610, 110, 46) + cloud(300, 90, 26, '#fff', 0.8) + cloud(690, 300, 22, '#fff', 0.7);
      s += pa('M0 620Q160 520 330 600T750 560V820H0Z', '#cdf0ba') + pa('M0 690Q220 620 420 680T750 650V820H0Z', '#b6e8a2');
      s += g('fill="#7fcf88"', ci(30, 706, 76) + ci(130, 724, 60) + ci(206, 750, 40) + ci(724, 700, 80) + ci(620, 722, 62) + ci(548, 752, 38)) + g('fill="#98dc9c"', ci(60, 690, 40) + ci(150, 712, 30) + ci(690, 686, 42) + ci(600, 712, 30));
      [[40, 660, '#ff9fc4'], [96, 690, '#fff'], [150, 676, '#ffe08a'], [186, 722, '#ff9fc4'], [10, 716, '#fff'], [706, 652, '#ffe08a'], [650, 690, '#ff9fc4'], [596, 676, '#fff'], [738, 716, '#ff9fc4'], [560, 730, '#ffe08a']].forEach(([x, y, c]) => {
        s += ci(x, y, 9, c) + ci(x, y, 3.5, c === '#ffe08a' ? '#ff9f5c' : '#ffd24d');
      });
      // picket fence
      let f = '';
      for (let x = 6; x < 750; x += 44) f += pa(`M${x} 802V694l15 -18l15 18V802Z`);
      s += re(0, 714, 750, 12, '#e2ebf1') + re(0, 762, 750, 12, '#e2ebf1') + g('fill="#fff"', f);
      s += pa('M0 798Q200 786 375 796T750 790V1000H0Z', '#a2df8c') + el(375, 948, 128, 30, '#efe8cc') + el(424, 876, 66, 15, '#efe8cc') + el(352, 830, 44, 10, '#efe8cc');
      s += g('fill="#8fd47c"', pa('M210 990l8 -26l6 24l8 -30l6 32ZM500 1000l8 -26l6 22l8 -30l6 34ZM250 860l6 -18l5 16l6 -20l5 22Z'));
      s += tulip(42, 878, 120, '#ff8fb8') + tulip(100, 912, 90, '#ffd24d') + tulip(158, 880, 120, '#ff9f7a') + tulip(602, 900, 100, '#c9a4f0') + tulip(658, 874, 126, '#ff8fb8') + tulip(714, 908, 92, '#ffd24d');
      s += daisy(208, 946, 15, '#fff') + daisy(28, 972, 13, '#fff') + daisy(556, 956, 15, '#fff') + daisy(736, 978, 12, '#fff');
      return s + bfly(150, 370, 19, '#ff9fc4') + bfly(618, 450, 15, '#ffd76a') + bfly(566, 210, 12, '#c9a4f0');
    },
  });

  B.push({
    id: 'castle', name: 'ארמון', tags: ['princess'], price: 0,
    draw(u) {
      u += 'ca';
      let s = `<defs>${lg(u + 's', [[0, '#ffcfe8'], [0.6, '#ffe6d6'], [1, '#fff5e6']])}</defs>`;
      s += re(0, 0, 750, 820, `url(#${u}s)`) + cloud(120, 150, 46, '#fff', 0.9) + cloud(340, 84, 24, '#fff', 0.7) + cloud(520, 190, 22, '#fff', 0.6) + cloud(60, 330, 24, '#fff', 0.6);
      s += sp(230, 230, 9, '#fff') + sp(60, 60, 7, '#fff') + sp(470, 70, 8, '#fff') + sp(200, 420, 6, '#fff');
      s += pa('M0 660Q150 560 320 640T750 600V820H0Z', '#d7f0c8');
      // little far tower
      s += re(72, 480, 46, 150, '#f8e6f2') + re(104, 480, 14, 150, '#efd7e8') + pa('M62 484L95 408L128 484Z', '#d9c2f5') + pa('M95 408V384l22 9l-22 9', '#ffd76a') + pa('M88 540v-14q0 -8 7 -8q7 0 7 8v14Z', '#c9b2ee');
      s += pa('M0 724Q240 652 430 712T750 690V820H0Z', '#c2e9b2');
      // castle
      const win = (x, y) => pa(`M${x} ${y}v-16q0 -10 9 -10q9 0 9 10v16Z`, '#bda6ec');
      let c = re(524, 544, 230, 150, '#fbe2ee');
      for (let x = 580; x < 700; x += 30) c += re(x, 528, 18, 18, '#fbe2ee');
      c += re(516, 404, 60, 290, '#fff0f6') + re(558, 404, 18, 290, '#f5dcea') + pa('M504 408L546 310L588 408Z', '#c9a4f0') + pa('M546 310L588 408H566Z', '#b790e6');
      c += re(700, 364, 62, 330, '#fff0f6') + pa('M688 368L731 262L774 368Z', '#c9a4f0');
      c += re(604, 274, 78, 420, '#fff6fa') + re(660, 274, 22, 420, '#f5dcea') + pa('M590 280L643 150L696 280Z', '#ff9fc6') + pa('M643 150L696 280H668Z', '#f285b3') + pa('M643 150V118l30 12l-30 12', '#ffd76a') + pa('M643 152V118', null, st('#e9b84a', 3));
      c += pa('M616 694V630Q616 600 643 600Q670 600 670 630V694Z', '#c9a4f0') + pa('M643 602V694', null, st('#b790e6', 3)) + pa(DU.heartD(643, 572, 10), '#ff9fc6');
      c += win(634, 360) + win(634, 450) + win(537, 470) + win(537, 560) + win(722, 440) + win(722, 540) + win(586, 610) + win(690, 610);
      s += c + g('fill="#9bd99b"', ci(520, 700, 30) + ci(566, 708, 22) + ci(712, 704, 26) + ci(748, 696, 30));
      s += pa('M0 730Q50 688 100 712Q150 684 214 740Q234 772 244 806H0Z', '#9bd99b') + g('fill="#ff9fc4"', ci(40, 728, 8) + ci(96, 740, 8) + ci(150, 722, 8) + ci(186, 760, 8) + ci(16, 770, 8) + ci(120, 776, 8)) + g('fill="#fff"', ci(70, 760, 6) + ci(164, 748, 6));
      s += pa('M0 796Q200 784 375 794T750 788V1000H0Z', '#bfe8a8');
      s += pa('M236 1000Q330 880 480 820Q590 776 620 694H668Q656 800 566 852Q476 900 530 1000Z', '#ffefdf') + g('fill="#f9dcc9"', el(600, 760, 16, 6) + el(540, 822, 22, 8) + el(450, 868, 26, 9) + el(380, 930, 34, 11) + el(430, 978, 38, 11) + el(320, 982, 30, 10));
      s += daisy(110, 900, 13, '#fff') + daisy(50, 960, 12, '#ffc4de') + daisy(180, 968, 11, '#ffe08a') + daisy(660, 930, 13, '#fff') + daisy(716, 880, 11, '#ffc4de') + daisy(610, 984, 11, '#ffe08a');
      return s + sp(690, 210, 8, '#fff') + sp(560, 250, 6, '#fff');
    },
  });

  B.push({
    id: 'gym', name: 'מגרש ספורט', tags: ['sport'], price: 0,
    draw(u) {
      u += 'gy';
      let s = `<defs>${lg(u + 's', [[0, '#aedfff'], [1, '#eaf8ff']])}</defs>`;
      s += re(0, 0, 750, 800, `url(#${u}s)`) + ci(690, 150, 44, '#fff3a8') + cloud(130, 180, 40) + cloud(450, 140, 26, '#fff', 0.8);
      const cols = ['#ff9fb5', '#ffe08a', '#9fd8ff', '#a9e6b8', '#c9a4f0'];
      const [d, o] = garland(44, 15, 1, 13, (x, y, i) => pa(`M${n(x - 21)} ${n(y - 1)}h42l-21 44Z`, cols[i % 5]));
      s += pa(d.replace('M0', 'M-10').replace(/750 44$/, '760 44'), null, st('#fff', 3)) + o;
      let t = '';
      for (let x = 20; x < 790; x += 78) t += ci(x, 440, 50);
      s += g('fill="#a9e2a0"', t);
      for (let i = 0; i < 5; i++) s += re(0, 470 + i * 27, 750, 27, i % 2 ? '#e6defa' : '#d8cdf5');
      s += re(0, 462, 750, 9, '#fff');
      const r = rnd(23);
      for (let i = 0; i < 26; i++) s += ci(sideX(r), 484 + Math.floor(r() * 5) * 27, 8, cols[i % 5]);
      s += re(0, 604, 750, 190, '#a5e196');
      for (let x = 0; x < 750; x += 150) s += re(x, 604, 75, 190, '#b3e8a4');
      s += re(0, 650, 750, 5, '#fff', 'fill-opacity=".8"');
      // goal
      s += pa('M40 500v140M70 500v140M100 500v140M130 500v140M160 500v140M24 520h172M24 550h172M24 580h172M24 610h172', null, st('#fff', 1.6, 'stroke-opacity=".7"')) + pa('M24 642V482H196V642', null, st('#fff', 8));
      // hoop
      s += re(694, 320, 12, 480, '#d3cdea') + re(598, 232, 132, 94, '#fff', 'rx="8" stroke="#c9a4f0" stroke-width="4"') + re(640, 266, 50, 38, null, 'fill="none" stroke="#ff9fb5" stroke-width="4"') + pa('M636 334L648 384H682L694 334M648 334l8 50M665 334v50M682 334l-8 50M641 352h48M645 368h40', null, st('#fff', 2.4)) + el(665, 332, 31, 8, null, 'fill="none" stroke="#ff8a65" stroke-width="6"');
      // track
      s += re(0, 790, 750, 210, '#ffb59e') + re(0, 786, 750, 8, '#fff') + re(0, 838, 750, 5, '#fff', 'fill-opacity=".85"') + re(0, 898, 750, 7, '#fff', 'fill-opacity=".85"') + re(0, 972, 750, 9, '#fff', 'fill-opacity=".85"');
      // ball + cones
      s += el(122, 940, 32, 7, '#f29a80', 'fill-opacity=".7"') + ci(120, 900, 37, '#fff', 'stroke="#d3cdea" stroke-width="3"') + pa(DU.starD(120, 900, 14, 5, 0.81), '#8f86c9') + pa('M120 886V866M133 896l19 -8M128 911l12 17M112 911l-12 17M107 896l-19 -8', null, st('#8f86c9', 3)) + g('fill="#8f86c9"', pa('M108 866q12 -6 24 0l-12 6Z') + pa('M152 880q6 12 3 24l-9 -14Z') + pa('M88 880q-6 12 -3 24l9 -14Z') + pa('M132 934q-12 6 -24 0l12 -8Z'));
      const cone = (x, y) => re(x - 30, y - 6, 60, 12, '#ff8f52', 'rx="5"') + pa(`M${x - 22} ${y - 4}L${x - 6} ${y - 62}h12L${x + 22} ${y - 4}Z`, '#ffa56b') + pa(`M${x - 15} ${y - 28}h30l-4 -14h-22Z`, '#fff');
      return s + cone(612, 936) + cone(690, 968);
    },
  });

  B.push({
    id: 'nightsky', name: 'שמי כוכבים', tags: ['magic'], price: 0,
    draw(u) {
      u += 'ns';
      let s = `<defs>${lg(u + 's', [[0, '#4d4ab8'], [0.45, '#7e64d3'], [0.8, '#c893e6'], [1, '#ffc9e3']])}${rg(u + 'm', [[0, '#fff6c9', 0.75], [1, '#fff6c9', 0]])}${lg(u + 't', [[0, '#fff', 0], [1, '#fff', 0.95]], 1, 0.4)}</defs>`;
      s += re(0, 0, 750, 840, `url(#${u}s)`);
      s += g('fill="#fff" fill-opacity=".85"', dots(3, 46, (r) => r() * 640, 0.9, 2.7));
      const r = rnd(41);
      for (let i = 0; i < 11; i++) s += sp(sideX(r), 40 + r() * 560, 5 + r() * 8, '#fff6c9', 0.95);
      s += ci(608, 172, 135, `url(#${u}m)`) + pa(crescent(608, 172, 72, 34, -20, 60), '#fff6c9') + sp(676, 118, 9, '#fff');
      s += pa('M36 66L212 150', null, st(`url(#${u}t)`, 5)) + sp(216, 152, 13, '#fff');
      s += pa('M70 300L122 262L172 292L150 352L96 370Z', null, st('#fff', 1.6, 'stroke-opacity=".45"')) + g('fill="#fff"', ci(70, 300, 3.6) + ci(122, 262, 4.2) + ci(172, 292, 3.4) + ci(150, 352, 3.8) + ci(96, 370, 3.4));
      s += cloud(88, 724, 62, '#e9c9f6', 0.75) + cloud(676, 706, 66, '#e9c9f6', 0.75) + cloud(262, 782, 40, '#f4d6f6', 0.6) + cloud(520, 786, 36, '#f4d6f6', 0.6);
      s += pa('M0 836Q375 764 750 836V1000H0Z', '#8a7edb') + pa('M0 836Q375 764 750 836V850Q375 778 0 850Z', '#aa9eea');
      s += g('fill="#7a6ecf"', pa('M40 880l6 -22l5 18l7 -24l5 28ZM660 900l6 -22l5 18l7 -24l5 28ZM210 950l6 -20l5 16l6 -22l5 26ZM520 960l6 -20l5 16l6 -22l5 26Z'));
      return s + sp(90, 930, 8, '#fff6c9') + sp(180, 880, 6, '#ffd3ea') + sp(600, 880, 7, '#fff6c9') + sp(700, 950, 8, '#ffd3ea') + sp(300, 985, 5, '#fff6c9') + sp(470, 890, 5, '#ffd3ea');
    },
  });

  B.push({
    id: 'hearts', name: 'לבבות', tags: [], price: 0,
    draw(u) {
      u += 'he';
      let s = `<defs>${rg(u + 'g', [[0, '#fff', 0.75], [1, '#fff', 0]])}${lg(u + 'f', [[0, '#ffc6da'], [1, '#ffb3ce']])}` +
        `<pattern id="${u}p" width="124" height="112" patternUnits="userSpaceOnUse">${pa(DU.heartD(32, 30, 14), '#ffc6da')}${pa(DU.heartD(94, 86, 10), '#ffd2e3')}${pa(DU.sparkleD(92, 26, 6), '#fff')}${ci(30, 88, 3, '#fff')}</pattern></defs>`;
      s += re(0, 0, 750, 1000, '#ffe2ed') + re(0, 0, 750, 1000, `url(#${u}p)`) + el(375, 430, 370, 440, `url(#${u}g)`);
      s += pa('M0 842Q375 790 750 842V1000H0Z', `url(#${u}f)`) + pa('M0 842Q375 790 750 842', null, st('#fff', 5, 'stroke-opacity=".7"'));
      s += pa(DU.heartD(92, 150, 36), '#ffa9c8', 'fill-opacity=".85"') + pa(DU.heartD(664, 214, 28), '#ffb9d2', 'fill-opacity=".85"') + pa(DU.heartD(648, 668, 22), '#ffa9c8', 'fill-opacity=".8"') + pa(DU.heartD(96, 628, 24), '#ffb9d2', 'fill-opacity=".8"');
      return s + sp(170, 100, 10) + sp(600, 150, 9) + sp(60, 420, 8) + sp(700, 480, 10) + sp(150, 760, 8) + sp(610, 780, 7);
    },
  });

  B.push({
    id: 'clouds', name: 'עננים', tags: [], price: 0,
    draw(u) {
      u += 'cd';
      let s = `<defs>${lg(u + 's', [[0, '#9ad3ff'], [0.65, '#d3eeff'], [1, '#f4fbff']])}</defs>`;
      s += re(0, 0, 750, 1000, `url(#${u}s)`);
      s += cloud(112, 150, 60) + cloud(640, 112, 48, '#fff', 0.92) + cloud(688, 404, 54, '#fff', 0.88) + cloud(74, 474, 46, '#fff', 0.88) + cloud(380, 62, 28, '#fff', 0.6) + cloud(566, 650, 36, '#fff', 0.75) + cloud(170, 690, 40, '#fff', 0.75);
      s += sp(240, 270, 9) + sp(560, 250, 8) + sp(40, 300, 7) + sp(710, 590, 8) + sp(220, 560, 6);
      let a = '', b = '';
      [-20, 110, 250, 400, 540, 680, 790].forEach((x, i) => { a += ci(x, 838 + (i % 2) * 14, 86 + (i % 3) * 10); });
      [40, 190, 330, 470, 610, 745].forEach((x, i) => { b += ci(x, 912 - (i % 2) * 16, 96); });
      return s + g('fill="#e1f1ff"', a) + g('fill="#fff"', b + re(0, 905, 750, 95));
    },
  });

  B.push({
    id: 'rainbow', name: 'ארץ הקשת', tags: ['magic', 'party'], price: 600,
    draw(u) {
      u += 'rb';
      let s = `<defs>${lg(u + 's', [[0, '#c0e8ff'], [0.6, '#f0e8ff'], [1, '#fff0f6']])}</defs>`;
      s += re(0, 0, 750, 820, `url(#${u}s)`);
      const cols = ['#ff9fb5', '#ffc48a', '#fff0a0', '#b5eeb0', '#a5dcff', '#cdb5ff'];
      s += g('fill="none" stroke-width="17.6" opacity=".92"', cols.map((c, i) => ci(375, 1000, 962 - i * 17, null, `stroke="${c}"`)).join(''));
      s += cloud(36, 222, 58) + cloud(150, 262, 32) + cloud(714, 222, 58) + cloud(604, 262, 32);
      s += pa('M150 810Q375 716 600 810Z', '#c9f3dc') + pa('M0 700Q110 604 240 684Q300 724 330 810H0Z', '#ffd3e8') + pa('M750 680Q640 592 510 694Q460 734 430 810H750Z', '#d6ccff');
      s += pa('M0 796Q200 782 375 794T750 788V1000H0Z', '#bdf0d0') + el(375, 955, 250, 50, '#d6f8e2');
      s += balloon(96, 430, 34, '#ff9fb5', 112, 700) + balloon(152, 474, 30, '#ffe08a', 112, 700) + balloon(58, 504, 28, '#a5dcff', 112, 700);
      s += balloon(652, 420, 34, '#cdb5ff', 648, 696) + balloon(600, 482, 28, '#b5eeb0', 648, 696) + balloon(698, 492, 30, '#ffc48a', 648, 696);
      s += pa(DU.starD(60, 884, 15), '#fff0a0') + pa(DU.starD(700, 902, 16), '#fff0a0') + pa(DU.starD(186, 962, 12), '#ffc4de') + pa(DU.starD(580, 972, 12), '#ffc4de') + pa(DU.starD(120, 950, 9), '#fff') + pa(DU.starD(650, 962, 9), '#fff');
      return s + sp(230, 330, 10) + sp(530, 330, 9) + sp(210, 600, 8) + sp(545, 610, 9) + sp(40, 620, 7) + sp(716, 610, 7);
    },
  });

  B.push({
    id: 'candy', name: 'ארץ הממתקים', tags: ['party'], price: 700,
    draw(u) {
      u += 'cy';
      let s = `<defs>${lg(u + 's', [[0, '#ffdcee'], [1, '#fff2df']])}</defs>`;
      s += re(0, 0, 750, 820, `url(#${u}s)`) + cloud(150, 110, 46, '#ffc4e1', 0.9) + cloud(600, 90, 40, '#c9ecff', 0.95) + cloud(380, 60, 24, '#fff', 0.8);
      // ice-cream hills with frosting
      const drip = (cx, cy, r, a0, a1) => {
        const N = 12, pts = [], rad = (d) => (d * Math.PI) / 180;
        const P = (a, rr) => [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
        const s0 = P(rad(a0), r + 2), s1 = P(rad(a1), r + 2);
        for (let i = N; i >= 0; i--) pts.push(P(rad(a0 + ((a1 - a0) * i) / N), r - (i % 2 ? 46 : 16)));
        return `M${n(s0[0])} ${n(s0[1])}A${r + 2} ${r + 2} 0 0 1 ${n(s1[0])} ${n(s1[1])}L${n(pts[0][0])} ${n(pts[0][1])}` + DU.cr(pts).map((c) => 'C' + c.map(n).join(' ')).join('') + 'Z';
      };
      s += ci(660, 810, 222, '#c6efe4') + pa(drip(660, 810, 222, 205, 335), '#fff') + ci(644, 580, 17, '#ff6f91') + pa('M644 566q4 -18 18 -22', null, st('#7fcf98', 3.5)) + ci(639, 575, 4.5, '#fff', 'fill-opacity=".6"');
      s += ci(96, 800, 200, '#ffcfe3') + pa(drip(96, 800, 200, 215, 340), '#fff') + ci(110, 592, 16, '#ff6f91') + pa('M110 578q4 -18 18 -22', null, st('#7fcf98', 3.5)) + ci(105, 587, 4.5, '#fff', 'fill-opacity=".6"');
      s += lolly(200, 560, 34, '#ffd24d', '#fff', 820) + lolly(84, 372, 62, '#ff8fb8', '#fff', 820) + lolly(664, 318, 72, '#8fd3ff', '#fff', 820);
      const cane = 'M556 812V646Q556 604 590 604Q624 604 624 642';
      s += pa(cane, null, st('#fff', 24)) + pa(cane, null, `fill="none" stroke="#ff7f9f" stroke-width="24" stroke-dasharray="17 17" stroke-dashoffset="8"`);
      // frosting ground
      let f = 'M0 786H750V822';
      for (let x = 750; x > 0; x -= 75) f += `Q${x - 12} ${850 + ((x / 75) % 2) * 14} ${x - 30} ${832}Q${x - 50} ${806} ${x - 75} ${824}`;
      s += re(0, 792, 750, 208, '#ffd6e8') + pa(f + 'Z', '#fff');
      const r = rnd(9), sc = ['#ff8fb8', '#8fd3ff', '#ffd24d', '#a9e6b8', '#c9a4f0'];
      for (let i = 0; i < 18; i++) {
        const x = 20 + r() * 710, y = 878 + r() * 110;
        s += re(x - 8, y - 3, 16, 6, sc[i % 5], `rx="3" transform="rotate(${Math.round(r() * 180)} ${n(x)} ${n(y)})"`);
      }
      return s + gum(60, 910, 30, '#b5eeb0') + gum(700, 940, 34, '#ffc48a') + gum(634, 892, 22, '#cdb5ff') + gum(150, 962, 24, '#ff9fb5') + sp(250, 250, 9) + sp(520, 230, 8) + sp(240, 460, 7);
    },
  });

  B.push({
    id: 'undersea', name: 'מתחת לים', tags: ['beach', 'magic'], price: 800,
    draw(u) {
      u += 'us';
      let s = `<defs>${lg(u + 'w', [[0, '#c4f5ee'], [0.5, '#86dcea'], [1, '#62bce2']])}${lg(u + 'd', [[0, '#fff0cf'], [1, '#f7dba8']])}</defs>`;
      s += re(0, 0, 750, 830, `url(#${u}w)`);
      s += g('fill="#fff"', pa('M120 0H240L60 830H-120Z', null, 'fill-opacity=".15"') + pa('M380 0H470L330 830H210Z', null, 'fill-opacity=".1"') + pa('M600 0H700L640 830H500Z', null, 'fill-opacity=".13"'));
      s += g('fill="#6cc6e2" fill-opacity=".55"', pa('M0 600Q60 500 130 590Q170 550 210 640Q232 730 250 830H0Z') + pa('M750 550Q680 490 620 606Q570 640 540 724Q520 790 500 830H750Z'));
      s += weed(40, 830, 340, '#4fc7a0', 18) + weed(92, 830, 240, '#7ddcb5', 14) + weed(152, 830, 170, '#4fc7a0', 12) + weed(712, 830, 370, '#4fc7a0', 18) + weed(662, 830, 250, '#7ddcb5', 14);
      s += pa('M584 830V744M584 786Q560 766 556 724M584 776Q610 756 616 710M556 746Q544 736 540 716M616 736Q628 728 634 708', null, st('#ff9fc0', 16)) + pa('M584 820V750M558 742v-12M614 728v-12', null, st('#ffc4da', 5));
      s += pa('M208 830V766M208 796Q188 778 186 748M208 790Q228 774 232 742', null, st('#ffb38a', 14)) + pa('M208 822v-50', null, st('#ffd3b8', 4));
      s += fish(140, 300, 34, '#ffb37a', 1) + fish(634, 440, 28, '#ffe08a', -1) + fish(606, 196, 20, '#ff9fc4', -1) + fish(78, 548, 18, '#c9a4f0', 1);
      [[200, 190, 14], [216, 142, 8], [192, 104, 5], [562, 320, 12], [548, 276, 7], [700, 150, 16], [56, 420, 10], [330, 110, 6], [440, 60, 5], [722, 580, 9]].forEach(([x, y, r]) => { s += bubble(x, y, r); });
      s += pa('M0 808Q120 788 250 804T500 798T750 806V1000H0Z', `url(#${u}d)`) + pa('M60 872q40 -10 80 0M540 860q40 -10 80 0M300 980q40 -10 80 0M620 984q30 -8 60 0', null, st('#f0cf98', 3));
      // clam with pearl + starfish + pebbles
      s += pa('M70 928Q78 866 120 860Q162 866 170 928Q120 906 70 928Z', '#ffc9dd') + pa('M96 916Q100 880 120 864M144 916Q140 880 120 864M120 908V866', null, st('#ffa9c8', 2.5)) + pa('M68 930Q120 980 172 930Q120 946 68 930Z', '#ffb3cf') + ci(120, 928, 14, '#fff') + ci(115, 923, 4, '#e6f0ff');
      s += pa(DU.starD(652, 934, 31, 5, 0.52, -80), '#ffa58a') + g('fill="#ffd3c4"', ci(652, 934, 4) + ci(652, 918, 3) + ci(667, 929, 3) + ci(661, 947, 3) + ci(643, 947, 3) + ci(637, 929, 3));
      return s + g('fill="#f3d6a6"', el(250, 930, 16, 7) + el(520, 950, 20, 8) + el(430, 846, 12, 5));
    },
  });

  B.push({
    id: 'space', name: 'חלל', tags: ['magic'], price: 900,
    draw(u) {
      u += 'sp';
      let s = `<defs>${lg(u + 's', [[0, '#38378f'], [0.4, '#5f49ba'], [0.75, '#9c68d3'], [1, '#e3a0dc']])}${rg(u + 'a', [[0, '#ff9fd6', 0.5], [1, '#ff9fd6', 0]])}${rg(u + 'b', [[0, '#7fd3ff', 0.45], [1, '#7fd3ff', 0]])}<clipPath id="${u}c">${ci(135, 190, 68)}</clipPath></defs>`;
      s += re(0, 0, 750, 840, `url(#${u}s)`) + ci(120, 440, 240, `url(#${u}a)`) + ci(660, 170, 230, `url(#${u}b)`);
      s += g('fill="#fff" fill-opacity=".85"', dots(17, 44, (r) => r() * 760, 0.9, 2.6));
      const r = rnd(29);
      for (let i = 0; i < 9; i++) s += sp(sideX(r), 30 + r() * 700, 5 + r() * 7, '#fff6c9', 0.95);
      // ringed planet
      const ring = 'transform="rotate(-18 135 190)"';
      s += el(135, 190, 110, 25, null, `${st('#fff0b8', 9)} ${ring}`) + ci(135, 190, 68, '#ffc79e') + g(`clip-path="url(#${u}c)"`, re(60, 158, 150, 15, '#ffb080') + re(60, 196, 150, 9, '#ffe0c0') + re(60, 220, 150, 18, '#ffb080') + ci(110, 160, 60, '#fff', 'fill-opacity=".12"'));
      s += pa('M25 190A110 25 0 0 0 245 190', null, `${st('#fff0b8', 9)} ${ring}`);
      s += ci(646, 356, 38, '#8fd3ff') + el(636, 346, 22, 9, '#c4eaff', 'transform="rotate(-20 636 346)"') + ci(660, 372, 7, '#6fbdf0') + ci(634, 372, 4, '#6fbdf0') + ci(588, 122, 16, '#ff9fc4') + ci(583, 117, 5, '#ffc9de') + ci(70, 650, 22, '#a9ecd0') + ci(63, 643, 7, '#d3f7e8');
      // rocket
      s += g('transform="translate(636 590) rotate(24)"', pa('M-14 30Q0 92 14 30Z', '#ffd24d') + pa('M-7 30Q0 64 7 30Z', '#ff9f5c') + pa('M-26 4L-50 42L-26 32Z', '#ff8fb8') + pa('M26 4L50 42L26 32Z', '#ff8fb8') + pa('M0 -74Q32 -30 26 32H-26Q-32 -30 0 -74Z', '#fff') + pa('M0 -74Q17 -52 21 -36H-21Q-17 -52 0 -74Z', '#ff8fb8') + ci(0, -6, 13, '#8fd3ff', 'stroke="#c9a4f0" stroke-width="4"') + re(-26, 20, 52, 8, '#d9ccff'));
      // ufo
      s += pa('M82 520A33 31 0 0 1 148 520Z', '#b5f0e0', 'fill-opacity=".9"') + el(115, 526, 62, 16, '#c9b8f5') + el(115, 520, 62, 12, '#efe6ff') + g('fill="#fff0a0"', ci(78, 528, 5) + ci(115, 535, 5) + ci(152, 528, 5)) + ci(104, 506, 5, '#fff', 'fill-opacity=".7"');
      // moon ground
      s += pa('M0 824Q375 752 750 824V1000H0Z', '#d9d2f5') + pa('M0 824Q375 752 750 824V838Q375 766 0 838Z', '#ece7fb');
      s += g('fill="#c3b9ec"', el(150, 902, 60, 16) + el(600, 934, 70, 18) + el(400, 986, 50, 10) + el(690, 862, 30, 8) + el(60, 976, 36, 9)) + g('fill="#cdc4f0"', el(150, 906, 50, 11) + el(600, 938, 59, 12));
      s += re(52, 762, 5, 112, '#fff') + pa('M57 764L112 782L57 802Z', '#ff9fc4') + pa(DU.starD(76, 782, 8), '#fff0a0');
      return s;
    },
  });

  B.push({
    id: 'ballroom', name: 'אולם נשפים', tags: ['princess', 'party'], price: 1000,
    draw(u) {
      u += 'br';
      let s = `<defs>${lg(u + 'w', [[0, '#fff0f7'], [1, '#ffe8da']])}${lg(u + 'k', [[0, '#9a90e6'], [0.7, '#e3b0ea'], [1, '#ffd3e0']])}${lg(u + 'c', [[0, '#ff9fc0'], [1, '#ff7fa8']])}${rg(u + 'g', [[0, '#fff6c9', 0.7], [1, '#fff6c9', 0]])}${rg(u + 'h', [[0, '#fff', 0.75], [1, '#fff', 0]])}</defs>`;
      s += re(0, 0, 750, 800, `url(#${u}w)`) + re(0, 0, 750, 14, '#f2cf7a') + re(0, 14, 750, 9, '#fff');
      s += el(375, 470, 150, 340, `url(#${u}h)`);
      const win = (x) => {
        let o = pa(`M${x} 652V282Q${x} 190 ${x + 85} 190Q${x + 170} 190 ${x + 170} 282V652Z`, '#f2cf7a') + pa(`M${x + 10} 642V284Q${x + 10} 200 ${x + 85} 200Q${x + 160} 200 ${x + 160} 284V642Z`, `url(#${u}k)`);
        o += sp(x + 50, 260, 7, '#fff') + sp(x + 120, 330, 6, '#fff') + sp(x + 44, 360, 5, '#fff') + ci(x + 124, 250, 3, '#fff') + ci(x + 60, 310, 2.5, '#fff');
        o += re(x + 81, 200, 8, 442, '#f2cf7a') + re(x + 10, 420, 150, 8, '#f2cf7a');
        o += pa(`M${x - 16} 178H${x + 58}Q${x + 40} 330 ${x} 424Q${x + 14} 540 ${x - 6} 664H${x - 16}Z`, '#ff9dbf') + pa(`M${x + 186} 178H${x + 112}Q${x + 130} 330 ${x + 170} 424Q${x + 156} 540 ${x + 176} 664H${x + 186}Z`, '#ff9dbf');
        o += re(x - 10, 418, 20, 11, '#ffd76a', 'rx="5"') + re(x + 160, 418, 20, 11, '#ffd76a', 'rx="5"');
        o += pa(`M${x - 22} 168H${x + 192}V200Q${x + 85} 266 ${x - 22} 200Z`, '#ff7fa8') + pa(`M${x + 192} 200Q${x + 85} 266 ${x - 22} 200`, null, st('#ffd76a', 5));
        return o;
      };
      s += win(30) + win(550);
      const col = (x) => re(x, 176, 30, 616, '#fffaf0') + re(x + 20, 176, 10, 616, '#f5e6cf') + re(x - 8, 158, 46, 22, '#f2cf7a', 'rx="6"') + re(x - 8, 776, 46, 22, '#f2cf7a', 'rx="6"');
      s += col(216) + col(504);
      const chand = (x) => ci(x, 78, 88, `url(#${u}g)`) + re(x - 2, 22, 4, 40, '#f2cf7a') + pa(`M${x - 52} 84Q${x} 126 ${x + 52} 84M${x - 28} 76Q${x} 104 ${x + 28} 76`, null, st('#f2cf7a', 5)) + el(x, 68, 12, 15, '#f2cf7a') +
        g('fill="#fff"', re(x - 55, 62, 6, 22) + re(x - 31, 56, 6, 20) + re(x + 25, 56, 6, 20) + re(x + 49, 62, 6, 22)) + g('fill="#ffe08a"', el(x - 52, 55, 4, 7) + el(x - 28, 49, 4, 7) + el(x + 28, 49, 4, 7) + el(x + 52, 55, 4, 7)) +
        sp(x - 52, 104, 6, '#fff') + sp(x, 126, 8, '#fff') + sp(x + 52, 104, 6, '#fff');
      s += chand(125) + chand(625);
      // marble floor in perspective + carpet
      s += re(0, 796, 750, 204, '#fff7f0');
      const ys = [796, 822, 858, 912, 1000], px = (xb, y) => n(375 + ((xb - 375) * (y - 560)) / 440);
      let t = '';
      for (let rI = 0; rI < 4; rI++) for (let k = -6; k < 6; k++) if ((rI + k) & 1) {
        const x0 = 375 + k * 130, x1 = x0 + 130, y0 = ys[rI], y1 = ys[rI + 1];
        t += pa(`M${px(x0, y0)} ${y0}L${px(x1, y0)} ${y0}L${px(x1, y1)} ${y1}L${px(x0, y1)} ${y1}Z`);
      }
      s += g('fill="#ffd9e6"', t) + re(0, 786, 750, 12, '#f2cf7a');
      s += pa('M318 796H432L520 1000H230Z', `url(#${u}c)`) + pa('M318 796L230 1000M432 796L520 1000', null, st('#ffd76a', 6));
      return s + sp(236, 300, 7, '#ffe08a') + sp(516, 420, 7, '#ffe08a') + sp(20, 730, 8, '#ffe08a') + sp(730, 720, 8, '#ffe08a');
    },
  });

  DU.backgrounds = B;
})();
