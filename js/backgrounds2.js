/* backgrounds2.js — more scenes (style challenges: Japan, London, Paris, ranch, pirate ship…).
   Same rules as backgrounds.js: draw(uid) paints the whole 750×1000 card with plain SVG.
   The character stands at x=375 with her feet at y≈912, so the floor starts around y≈770–800
   and the column behind her (x 240–510, y 130–700) stays calm. */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const n = DU.n;

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
  const many = (k, f) => { let o = ''; for (let i = 0; i < k; i++) o += f(i); return o; };

  function cloud(x, y, s, f = '#fff', op) {
    const b = [[-1.15, 0.12, 0.5], [-0.55, -0.22, 0.68], [0.15, -0.42, 0.8], [0.85, -0.08, 0.6], [1.3, 0.2, 0.4]];
    const o = b.map(([dx, dy, r]) => ci(x + dx * s, y + dy * s, r * s)).join('') + re(x - 1.5 * s, y + 0.05 * s, 3.1 * s, 0.56 * s, null, `rx="${n(0.28 * s)}"`);
    return g(`fill="${f}"${op == null ? '' : ` opacity="${op}"`}`, o);
  }
  /* floor boards fanning out from a vanishing point */
  function planks(y, col, vy = 300, step = 105, w = 2.5) {
    let d = '';
    for (let xb = -480; xb <= 1230; xb += step) d += `M${n(375 + ((xb - 375) * (y - vy)) / (1000 - vy))} ${y}L${xb} 1000`;
    return pa(d, null, st(col, w));
  }
  /* a sagging string with things hanging from it */
  function garland(y, sag, spans, per, item) {
    const w = 750 / spans;
    let d = `M0 ${y}`, o = '';
    for (let i = 0; i < spans; i++) {
      const x0 = i * w;
      d += `Q${n(x0 + w / 2)} ${y + sag * 2} ${n(x0 + w)} ${y}`;
      for (let j = 0; j < per; j++) { const t = (j + 0.5) / per; o += item(x0 + w * t, y + 4 * sag * t * (1 - t), i * per + j); }
    }
    return [d, o];
  }
  function wave(y, amp, len) {
    let d = `M-20 ${y}q${len / 2} ${-amp} ${len} 0`;
    for (let x = len; x < 800; x += len) d += `t${len} 0`;
    return d;
  }
  function pine(x, base, h, w, col) {
    let o = re(x - w * 0.06, base - h * 0.16, w * 0.12, h * 0.17, '#bfa7c9');
    for (let i = 2; i >= 0; i--) {
      const ya = base - h + i * h * 0.2, yb = base - h * 0.12 - (2 - i) * h * 0.25, hw = (w / 2) * (0.5 + i * 0.25), my = (ya + yb) / 2, k = yb - ya;
      o += pa(`M${n(x)} ${n(ya)}Q${n(x + hw * 0.45)} ${n(my)} ${n(x + hw)} ${n(yb)}Q${n(x)} ${n(yb + hw * 0.28)} ${n(x - hw)} ${n(yb)}Q${n(x - hw * 0.45)} ${n(my)} ${n(x)} ${n(ya)}Z`, col);
      o += pa(`M${n(x)} ${n(ya)}Q${n(x + hw * 0.3)} ${n(ya + k * 0.36)} ${n(x + hw * 0.62)} ${n(ya + k * 0.62)}Q${n(x + hw * 0.3)} ${n(ya + k * 0.46)} ${n(x)} ${n(ya + k * 0.6)}Q${n(x - hw * 0.3)} ${n(ya + k * 0.46)} ${n(x - hw * 0.62)} ${n(ya + k * 0.62)}Q${n(x - hw * 0.3)} ${n(ya + k * 0.36)} ${n(x)} ${n(ya)}Z`, '#fff');
    }
    return o;
  }
  /* a palm: trunk from (x, base) leaning by lean px, fronds at the top */
  function palm(x, base, h, lean, trunk, leaf, leaf2) {
    const tx = x + lean, ty = base - h;
    let o = pa(`M${n(x - 13)} ${base}Q${n(x + lean * 0.2 - 12)} ${n(base - h * 0.55)} ${n(tx - 9)} ${n(ty)}L${n(tx + 9)} ${n(ty + 4)}Q${n(x + lean * 0.2 + 14)} ${n(base - h * 0.5)} ${n(x + 15)} ${base}Z`, trunk);
    const fr = (a, len, col) => {
      const r = (a * Math.PI) / 180, ex = tx + Math.cos(r) * len, ey = ty + Math.sin(r) * len, mx = tx + Math.cos(r) * len * 0.5, my = ty + Math.sin(r) * len * 0.5 - len * 0.34;
      return pa(`M${n(tx)} ${n(ty)}Q${n(mx)} ${n(my)} ${n(ex)} ${n(ey)}Q${n(mx)} ${n(my + len * 0.3)} ${n(tx)} ${n(ty + 12)}Z`, col);
    };
    o += fr(200, h * 0.5, leaf) + fr(-20, h * 0.5, leaf) + fr(150, h * 0.46, leaf2) + fr(30, h * 0.46, leaf2) + fr(250, h * 0.36, leaf2) + fr(-70, h * 0.36, leaf);
    return o + ci(tx - 6, ty + 8, 8, '#c9925f') + ci(tx + 8, ty + 10, 8, '#b98250');
  }
  /* a checkerboard floor in perspective (vanishing point at 375, vy) */
  function checker(yTop, vy, c2, cols = 9, rows = 5) {
    const X = (xb, y) => 375 + ((xb - 375) * (y - vy)) / (1000 - vy);
    let d = '';
    for (let i = 0; i < rows; i++) {
      const y0 = yTop + (1000 - yTop) * Math.pow(i / rows, 1.5), y1 = yTop + (1000 - yTop) * Math.pow((i + 1) / rows, 1.5);
      for (let j = -cols; j < cols; j++) {
        if ((i + j) & 1) continue;
        const a = 375 + j * 190, b = a + 190;
        d += `M${n(X(a, y0))} ${n(y0)}L${n(X(b, y0))} ${n(y0)}L${n(X(b, y1))} ${n(y1)}L${n(X(a, y1))} ${n(y1)}Z`;
      }
    }
    return pa(d, c2);
  }

  /* a light 5-petal flower (no outlines) */
  const fl = (x, y, r, c, c2 = '#ffe08a') =>
    g(`fill="${c}"`, many(5, (i) => { const a = (i / 5) * 6.283 - 1.57; return ci(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.5); })) + ci(x, y, r * 0.34, c2);

  const B = [];

  /* ---------------------------------------------------------------- tokyo */
  B.push({
    id: 'tokyo', name: 'רחוב ביפן', tags: ['anime'], price: 0,
    draw(u) {
      u += 'tk';
      const r = rnd(41);
      let s = `<defs>${lg(u + 's', [[0, '#ffd3e6'], [0.6, '#ffe7d9'], [1, '#fff5e3']])}${lg(u + 'f', [[0, '#ece4f6'], [1, '#d8cdea']])}</defs>`;
      s += re(0, 0, 750, 800, `url(#${u}s)`) + ci(120, 150, 50, '#fff8e6', 'fill-opacity=".8"');
      // far mountain + pale town
      s += pa('M420 610L586 330Q600 316 614 330L780 610Z', '#ecdaf3') + pa('M553 386L586 330Q600 316 614 330L647 386Q632 372 618 388Q600 370 584 388Q568 372 553 386Z', '#fff');
      s += pa('M0 800V640h40v-30h50v40h60v-56h36v70h70v-34h44v50h80v-40h50v24h70v-44h40v60h60v-30h50v50h100V800Z', '#f5dfee');
      // shop on the left
      s += re(-10, 420, 226, 380, '#fbe9d8') + pa('M-20 428Q100 398 240 372L226 430H-20Z', '#a99ccf') + pa('M-20 428H226', null, st('#8f82bd', 5));
      s += re(20, 540, 150, 260, '#efd6c0') + re(20, 470, 150, 14, '#c9a57f');
      s += many(4, (i) => pa(`M${22 + i * 37} 484h34v${74 + (i % 2) * 8}h-34Z`, '#8f9be0') + ci(39 + i * 37, 518, 8, '#fff', 'fill-opacity=".85"'));
      s += pa('M190 440v24', null, st('#8a6f5f', 3)) + el(190, 492, 20, 28, '#ff8fa3') + pa('M174 480h32M172 492h36M174 504h32', null, st('#fff', 2, 'stroke-opacity=".6"')) + re(182, 462, 16, 6, '#5f4b6b') + re(182, 518, 16, 6, '#5f4b6b');
      // torii on the right
      s += g('fill="#ff8585"', re(574, 366, 26, 444) + re(704, 366, 26, 444) + re(552, 404, 220, 20, null, 'rx="4"') + pa('M532 330Q650 356 770 326V354Q650 380 536 356Z'));
      s += pa('M532 330Q650 356 770 326V337Q650 366 533 340Z', '#e06a72') + re(568, 796, 38, 16, '#6b5b7b', 'rx="3"') + re(698, 796, 38, 16, '#6b5b7b', 'rx="3"');
      // ground
      s += re(0, 792, 750, 208, `url(#${u}f)`) + planks(792, '#cabfe0', 420, 150, 2) + pa('M0 852H750M0 930H750', null, st('#cabfe0', 2));
      // cherry branches in the top corners
      const blossom = (x, y, k) => many(k, () => ci(x + (r() - 0.5) * 120, y + (r() - 0.5) * 70, 12 + r() * 12, r() < 0.5 ? '#ffb7d2' : '#ffd0e2'));
      s += pa('M-10 60Q90 70 150 130M60 76Q110 60 150 30M-10 150Q60 150 100 200', null, st('#a07a72', 7)) + blossom(70, 80, 16) + blossom(40, 170, 8);
      s += pa('M760 40Q670 60 600 120M700 62Q650 40 610 20', null, st('#a07a72', 7)) + blossom(670, 70, 16);
      // lanterns on a string
      const [d, o] = garland(96, 16, 3, 3, (x, y, i) => (x > 250 && x < 500 ? '' : pa(`M${n(x)} ${n(y)}v10`, null, st('#8a6f5f', 2)) + el(x, y + 26, 13, 17, ['#ff8fa3', '#ffe08a', '#ffb7d2'][i % 3]) + re(x - 6, y + 8, 12, 4, '#5f4b6b') + re(x - 6, y + 40, 12, 4, '#5f4b6b')));
      s += pa(d, null, st('#8a6f5f', 2)) + o;
      // stone lantern, bamboo pot, petals
      s += g('fill="#cfc6de"', re(92, 868, 40, 70, null, 'rx="5"') + re(80, 836, 64, 36, null, 'rx="6"') + pa('M68 838L112 800L156 838Z') + re(78, 934, 68, 14, null, 'rx="4"')) + re(98, 846, 28, 18, '#ffe9a8', 'rx="4"');
      s += pa('M612 950h70l-8 -52h-54Z', '#8fa0d8') + pa('M636 898V780M652 898V750M664 898V800', null, st('#8fd0a0', 7)) + g('fill="#a6e0b4"', el(624, 800, 16, 6) + el(668, 772, 18, 6) + el(676, 820, 16, 6) + el(640, 760, 16, 6));
      s += many(22, () => { const x = sideX(r), y = 200 + r() * 760; return el(x, y, 6, 3.4, '#ffb7d2', `fill-opacity=".85" transform="rotate(${n(r() * 160)} ${n(x)} ${n(y)})"`); });
      return s;
    },
  });

  /* ---------------------------------------------------------------- london */
  B.push({
    id: 'london', name: 'לונדון', tags: ['british'], price: 0,
    draw(u) {
      u += 'ld';
      const r = rnd(77);
      let s = `<defs>${lg(u + 's', [[0, '#cbd6ee'], [0.6, '#e5e2f3'], [1, '#f7edf3']])}${lg(u + 'f', [[0, '#dcd5e8'], [1, '#c6bedb']])}${rg(u + 'g', [[0, '#fff3c4', 0.9], [1, '#fff3c4', 0]])}</defs>`;
      s += re(0, 0, 750, 800, `url(#${u}s)`) + cloud(210, 110, 46, '#fff', 0.8) + cloud(560, 170, 40, '#f4f1fa', 0.9) + cloud(380, 60, 26, '#fff', 0.6);
      // pale skyline with chimneys
      s += pa('M0 800V620h60v-24h18v24h70v-50h50v50h60v-30h20v30h80v-60h70v60h60v-36h16v36h80v-56h60v56h56v-30h50V800Z', '#dbd7ec');
      // clock tower
      s += g('fill="#cbbfe2"', re(92, 300, 80, 500) + pa('M92 300L132 150L172 300Z') + re(84, 290, 96, 16, null, 'rx="4"') + re(84, 400, 96, 12, null, 'rx="4"'));
      s += pa('M132 150v-34', null, st('#cbbfe2', 5)) + ci(132, 348, 31, '#f3d9a0') + ci(132, 348, 25, '#fffdf5') + pa('M132 348V330M132 348L145 354', null, st('#6b5b8b', 4)) + ci(132, 348, 3.5, '#6b5b8b');
      s += g('fill="#b7a9d6"', many(4, (i) => re(102 + i * 16, 430, 9, 330, null, 'rx="4"'))) + pa('M100 300L110 262M164 300L154 262', null, st('#b7a9d6', 5));
      // far bus
      s += re(548, 716, 92, 60, '#ff8f8f', 'rx="10"') + g('fill="#fff3f3"', many(4, (i) => re(556 + i * 21, 724, 15, 13, null, 'rx="3"') + re(556 + i * 21, 746, 15, 13, null, 'rx="3"'))) + ci(568, 778, 9, '#5f5677') + ci(620, 778, 9, '#5f5677');
      // bunting
      const [d, o] = garland(34, 14, 3, 5, (x, y, i) => pa(`M${n(x - 17)} ${n(y)}h34l-17 34Z`, ['#ff8f8f', '#ffffff', '#8fb4ff'][i % 3]));
      s += o + pa(d, null, st('#b3a6cf', 3));
      // pavement
      s += re(0, 790, 750, 210, `url(#${u}f)`) + re(0, 790, 750, 12, '#efeaf6') + planks(802, '#b9b0d0', 380, 140, 2) + pa('M0 866H750M0 944H750', null, st('#b9b0d0', 2));
      s += el(210, 962, 80, 12, '#cfe6f5', 'fill-opacity=".8"') + el(210, 962, 44, 6, null, st('#fff', 2, 'stroke-opacity=".7"')) + el(560, 972, 60, 9, '#cfe6f5', 'fill-opacity=".8"');
      // street lamp
      s += ci(48, 430, 70, `url(#${u}g)`) + re(42, 470, 12, 420, '#5f5677', 'rx="5"') + re(30, 882, 36, 16, '#5f5677', 'rx="5"') + pa('M30 470h36l-8 -64h-20Z', '#fff3c4') + pa('M26 406h44l-22 -26Z', '#5f5677') + pa('M30 470h36', null, st('#5f5677', 6));
      // red phone box
      s += pa('M606 560Q664 520 722 560V900H606Z', '#ff6f6f') + re(598, 892, 132, 20, '#e05a62', 'rx="5"') + re(606, 566, 116, 30, '#e05a62') + re(628, 572, 72, 18, '#fff3f3', 'rx="4"');
      s += g('fill="#d9eef8"', many(15, (i) => re(622 + (i % 3) * 30, 610 + Math.floor(i / 3) * 50, 24, 42, null, 'rx="3"'))) + pa('M664 528l5 9h-10Z', '#ffd98a') + ci(712, 760, 4, '#ffd98a');
      // drizzle at the sides, a pigeon
      s += g(st('#fff', 2.5, 'stroke-opacity=".55"'), many(26, () => { const x = sideX(r), y = 130 + r() * 560; return pa(`M${n(x)} ${n(y)}l-5 16`); }));
      s += el(300, 942, 17, 11, '#b9b3cf') + ci(314, 932, 8, '#b9b3cf') + pa('M321 932l8 2l-8 3Z', '#ffb347') + ci(316, 930, 1.6, '#4b3564') + pa('M284 940l-14 -5l10 12Z', '#a49dbe');
      return s;
    },
  });

  /* ---------------------------------------------------------------- paris */
  B.push({
    id: 'paris', name: 'פריז', tags: ['paris'], price: 0,
    draw(u) {
      u += 'pr';
      let s = `<defs>${lg(u + 's', [[0, '#ffd6c6'], [0.55, '#ffe7dc'], [1, '#fff6ec']])}${lg(u + 'f', [[0, '#efdfd6'], [1, '#e0cbc2']])}` +
        `<pattern id="${u}c" width="56" height="30" patternUnits="userSpaceOnUse"><path d="M0 30Q14 6 28 30Q42 6 56 30M-28 15Q-14 -9 0 15Q14 -9 28 15Q42 -9 56 15" fill="none" stroke="#d3bbb2" stroke-width="2" stroke-opacity=".7"/></pattern></defs>`;
      s += re(0, 0, 750, 810, `url(#${u}s)`) + cloud(330, 96, 36, '#fff', 0.85) + cloud(520, 200, 26, '#fff', 0.7) + ci(250, 150, 34, '#fff3c9', 'fill-opacity=".8"');
      // far rooftops
      s += pa('M0 810V640l30 -30h80l30 30v-50l24 -24h70l24 24v40l20 -20h60l20 20v-30h90v40l24 -24h60l24 24V810Z', '#f6e3dc');
      s += g('fill="#c7bfdc" fill-opacity=".8"', pa('M0 640l30 -30h80l30 30Z') + pa('M140 590l24 -24h70l24 24Z'));
      // the tower
      s += pa('M130 180L123 330Q116 470 86 600L56 800H98Q112 706 130 696Q148 706 162 800H204L174 600Q144 470 137 330Z', '#c9bfe0');
      s += g('fill="#b6abd4"', re(116, 322, 28, 12, null, 'rx="3"') + re(100, 462, 60, 14, null, 'rx="3"') + re(76, 592, 108, 16, null, 'rx="3"')) + pa('M130 180v-36', null, st('#c9bfe0', 4));
      s += pa('M123 334L137 462M137 334L123 462M108 480L152 592M152 480L108 592M92 612L130 696L168 612', null, st('#fff', 2.5, 'stroke-opacity=".5"'));
      // café
      s += re(540, 250, 220, 560, '#fbe5d3') + re(540, 250, 220, 22, '#eecfb8') + g('fill="#fff7ee"', re(570, 300, 60, 90, null, 'rx="30"') + re(660, 300, 60, 90, null, 'rx="30"'));
      s += g('fill="#cfe6f5"', re(578, 310, 44, 74, null, 'rx="22"') + re(668, 310, 44, 74, null, 'rx="22"')) + re(566, 384, 68, 12, '#b7dcae', 'rx="5"') + re(656, 384, 68, 12, '#b7dcae', 'rx="5"');
      s += many(6, (i) => ci(574 + i * 11, 382, 6, ['#ff9ac1', '#ffd76a', '#ff8f8f'][i % 3])) + many(6, (i) => ci(664 + i * 11, 382, 6, ['#ffd76a', '#ff9ac1', '#fff'][i % 3]));
      s += re(566, 520, 150, 290, '#e9cdb6') + re(580, 536, 122, 200, '#cfe6f5', 'rx="6"') + pa('M641 536V736M580 636H702', null, st('#fff7ee', 6));
      s += g('fill="#ff9fb8"', pa('M526 440H760V500H526Z')) + g('fill="#fff"', many(5, (i) => re(552 + i * 52, 440, 26, 60))) +
        pa('M526 500' + many(9, () => 'q13 18 26 0'), '#ff9fb8') + pa('M526 440H760', null, st('#e5839d', 5));
      // ground: cobblestones
      s += re(0, 800, 750, 200, `url(#${u}f)`) + re(0, 800, 750, 200, `url(#${u}c)`) + re(0, 800, 750, 10, '#f7ebe4');
      // table + chair
      s += el(676, 800, 52, 12, '#fff7ee') + re(672, 800, 8, 110, '#b9a4c9') + el(676, 912, 30, 7, '#b9a4c9') + re(662, 780, 24, 16, '#fff', 'rx="5"') + pa('M686 784q10 2 0 10', null, st('#fff', 3)) + el(674, 782, 9, 3, '#c98f6b');
      s += pa('M584 912V800Q584 770 606 770Q628 770 628 800V912M584 850H628', null, st('#b9a4c9', 6)) + pa('M594 800q12 -18 24 0', null, st('#b9a4c9', 4));
      // topiary + little chalkboard
      s += re(52, 850, 76, 70, '#b9a4c9', 'rx="6"') + re(84, 780, 12, 76, '#a07a72') + ci(90, 740, 52, '#9fd6a8') + ci(72, 724, 16, '#b7e3bd') + many(5, (i) => ci(62 + i * 14 + (i % 2) * 4, 722 + ((i * 37) % 44), 5, '#ff9ac1'));
      s += pa('M196 930L214 800H262L280 930Z', '#6b5b7b') + pa('M212 912L224 814H252L264 912Z', '#4f4660') + pa(DU.heartD(238, 846, 11), null, st('#ffd1e0', 3)) + pa('M224 880h28', null, st('#fff', 3, 'stroke-opacity=".7"'));
      s += sp(46, 300, 9, '#fff', 0.9) + sp(214, 250, 6, '#fff', 0.8) + pa('M420 250q8 -8 16 0q8 -8 16 0', null, st('#b9a4c9', 3));
      return s;
    },
  });

  /* ---------------------------------------------------------------- ranch */
  B.push({
    id: 'ranch', name: 'חווה', tags: ['cowgirl'], price: 0,
    draw(u) {
      u += 'rn';
      const r = rnd(19);
      let s = `<defs>${lg(u + 's', [[0, '#bfe2ff'], [0.6, '#e6f4ff'], [1, '#fff2d6']])}${lg(u + 'f', [[0, '#f4dfb6'], [1, '#e9c995']])}${rg(u + 'g', [[0, '#fff6bf', 0.9], [1, '#fff6bf', 0]])}</defs>`;
      s += re(0, 0, 750, 800, `url(#${u}s)`) + ci(612, 130, 110, `url(#${u}g)`) + ci(612, 130, 50, '#fff3a8') + cloud(190, 110, 42) + cloud(420, 70, 24, '#fff', 0.75);
      // mesas + hills
      s += pa('M-10 640V520h70l14 -40h90l16 40h60V640Z', '#f6cdb4') + pa('M540 640V540h50l12 -50h110l10 50h40V640Z', '#f6cdb4') + pa('M540 560h222M-10 540h240', null, st('#eab79b', 4, 'stroke-opacity=".7"'));
      s += pa('M-10 800V650Q150 590 330 640T760 620V800Z', '#e6e2a4') + pa('M-10 800V700Q200 650 420 700T760 680V800Z', '#d3e09a');
      // windmill
      s += pa('M640 700L654 420H666L680 700M646 600H674M650 520H670', null, st('#b9b3cf', 5)) + g(`transform="translate(660 414)"`, many(8, (i) => pa('M0 0L-9 -52H9Z', i % 2 ? '#d9d5ea' : '#c3bddb', `transform="rotate(${i * 45})"`)) + ci(0, 0, 9, '#9f97bd'));
      // barn
      s += pa('M24 800V560L60 470L130 430L200 470L236 560V800Z', '#ff8f8f') + pa('M14 566L54 462L130 420L206 462L246 566L228 572L196 478L130 442L64 478L32 572Z', '#c96f77');
      s += re(84, 640, 92, 160, '#e9767c') + pa('M84 640H176V800H84ZM84 640L176 800M176 640L84 800', null, st('#fff', 7)) + re(106, 500, 48, 54, '#6b4b5b', 'rx="6"') + pa('M106 500h48v54h-48ZM130 500v54', null, st('#fff', 5));
      // fence
      s += g('fill="#e3bd8c"', many(8, (i) => re(-6 + i * 108, 690, 20, 116, null, 'rx="6"')) + re(-10, 714, 770, 16, null, 'rx="6"') + re(-10, 760, 770, 16, null, 'rx="6"'));
      // ground
      s += pa('M0 800Q375 776 750 800V1000H0Z', `url(#${u}f)`);
      s += g(st('#b9c97c', 4), many(10, () => { const x = sideX(r), y = 830 + r() * 150; return pa(`M${n(x)} ${n(y)}l-7 -16M${n(x)} ${n(y)}l1 -20M${n(x)} ${n(y)}l9 -15`); })) + g('fill="#dcbd8a"', many(12, () => el(sideX(r), 830 + r() * 160, 5 + r() * 5, 3)));
      // hay bale
      s += el(100, 944, 74, 10, '#d9b87c', 'fill-opacity=".6"') + ci(100, 880, 62, '#ffd982') + ci(100, 880, 62, null, st('#e9b95a', 4)) + pa('M100 880m-40 0a40 40 0 1 1 40 40a26 26 0 1 1 -26 -26a13 13 0 1 1 13 13', null, st('#e9b95a', 4));
      // cactus
      s += g('fill="#7fcf9a"', re(640, 660, 46, 270, null, 'rx="23"') + pa('M642 800H612Q590 800 590 778V740Q590 726 603 726Q616 726 616 740V776H642Z') + pa('M684 770H716Q738 770 738 748V700Q738 686 725 686Q712 686 712 700V746H684Z'));
      s += pa('M652 690V900M674 690V900', null, st('#63b783', 3, 'stroke-opacity=".7"')) + DU.flower(663, 656, 13, '#ff9ac1') + DU.flower(603, 722, 8, '#ffd76a') + el(663, 934, 60, 9, '#d9b87c', 'fill-opacity=".6"');
      s += sp(300, 300, 6, '#fff', 0.8) + pa('M470 200q9 -8 18 0q9 -8 18 0', null, st('#9fb6d6', 3));
      return s;
    },
  });

  /* ---------------------------------------------------------------- pirate ship */
  B.push({
    id: 'ship', name: 'ספינת פיראטים', tags: ['pirate'], price: 0,
    draw(u) {
      u += 'sh';
      let s = `<defs>${lg(u + 's', [[0, '#9fd8ff'], [0.7, '#def3ff'], [1, '#effbff']])}${lg(u + 'w', [[0, '#5fc3dc'], [1, '#a6e6ea']])}${lg(u + 'd', [[0, '#eecb9c'], [1, '#dcae78']])}</defs>`;
      s += re(0, 0, 750, 560, `url(#${u}s)`) + ci(600, 120, 46, '#fff6bf') + cloud(420, 100, 34) + cloud(660, 250, 28, '#fff', 0.8) + cloud(330, 220, 20, '#fff', 0.6);
      s += re(0, 548, 750, 230, `url(#${u}w)`) + pa(wave(580, 8, 120), null, st('#fff', 4, 'stroke-opacity=".5" stroke-dasharray="80 60"')) + pa(wave(618, 9, 150), null, st('#fff', 4, 'stroke-opacity=".5" stroke-dasharray="110 70"'));
      // little island
      s += el(566, 552, 60, 12, '#ffe6b0') + pa('M566 548Q560 510 574 480', null, st('#c9925f', 6)) + g('fill="#7fd6a0"', pa('M574 480Q540 468 522 490Q548 480 572 488Z') + pa('M574 480Q606 462 630 482Q600 476 576 488Z') + pa('M574 480Q570 450 550 440Q584 450 580 484Z'));
      // sail + mast + flag
      s += pa('M108 96Q250 150 236 420Q170 392 108 410Z', '#fff7e3') + g('fill="#ff9fa8"', pa('M108 150Q200 170 232 250L108 240Z') + pa('M108 320Q190 316 238 372L236 420Q170 392 108 410Z'));
      s += pa('M-20 110Q60 150 76 410Q30 396 -20 404Z', '#fff7e3') + pa('M-20 200Q40 214 72 300L-20 290Z', '#ff9fa8');
      s += re(74, -10, 34, 800, '#b98555') + pa('M82 0V790', null, st('#d3a06c', 5, 'stroke-opacity=".7"')) + re(-20, 84, 280, 14, '#a8744a', 'rx="6"') + re(-20, 408, 280, 14, '#a8744a', 'rx="6"');
      s += pa('M108 10H206L190 36L206 62H108Z', '#4b3564') + ci(150, 32, 12, '#fff') + re(143, 38, 14, 9, '#fff', 'rx="3"') + ci(146, 31, 3, '#4b3564') + ci(154, 31, 3, '#4b3564') + pa('M132 22L168 48M168 22L132 48', null, st('#fff', 3.5));
      // rope ladder
      s += pa('M108 430L226 664M74 430L150 664', null, st('#c9a77a', 4)) + pa('M96 480L128 480M110 528L154 528M126 580L180 580M142 630L206 630', null, st('#c9a77a', 4));
      // ship's wheel
      s += g(`transform="translate(652 566)"`, many(8, (i) => pa('M0 0V-76', null, st('#b98555', 7) + ` transform="rotate(${i * 45})"`)) + ci(0, 0, 56, null, st('#c9955f', 12)) + ci(0, 0, 14, '#a8744a')) + re(644, 620, 16, 60, '#a8744a');
      // rail
      s += g('fill="#e6c08e"', many(16, (i) => re(8 + i * 48, 664, 16, 104, null, 'rx="8"'))) + re(-10, 646, 770, 22, '#cf9f68', 'rx="8"') + re(-10, 756, 770, 20, '#cf9f68', 'rx="6"');
      // deck
      s += re(0, 770, 750, 230, `url(#${u}d)`) + planks(770, '#c9975f', 360, 120, 3) + many(10, (i) => ci(40 + i * 74, 800 + (i % 3) * 60, 3, '#b98555'));
      // barrel
      s += el(84, 962, 62, 10, '#b98555', 'fill-opacity=".5"') + pa('M30 836Q20 896 34 956H134Q148 896 138 836Z', '#c98f5a') + pa('M28 862H140M26 930H142', null, st('#7f6f8f', 8)) + el(84, 836, 54, 12, '#dba873') + pa('M62 846V950M106 846V950', null, st('#a8744a', 3, 'stroke-opacity=".7"'));
      // treasure chest
      s += el(640, 962, 96, 10, '#b98555', 'fill-opacity=".5"') + pa('M556 842Q556 772 640 772Q724 772 724 842Z', '#a8744a') + re(556, 870, 168, 86, '#c98f5a', 'rx="6"') + el(640, 866, 80, 16, '#6b4b3b');
      s += many(9, (i) => el(580 + ((i * 53) % 120), 860 - ((i * 29) % 22), 14, 6, i % 2 ? '#ffd24d' : '#ffe58a')) + ci(606, 846, 8, '#ff8fb5') + ci(668, 842, 7, '#7de3e0') + re(630, 884, 20, 24, '#ffd24d', 'rx="4"') + pa('M556 890H724', null, st('#ffd24d', 6));
      s += sp(590, 820, 11, '#fff') + sp(694, 826, 8, '#fff') + sp(640, 800, 7, '#fffbe0');
      // gull
      s += pa('M300 150q12 -12 24 0q12 -12 24 0', null, st('#8fa8c9', 4));
      return s;
    },
  });

  /* ---------------------------------------------------------------- on the moon */
  B.push({
    id: 'moon', name: 'על הירח', tags: ['space'], price: 0,
    draw(u) {
      u += 'mn';
      const r = rnd(5);
      let s = `<defs>${lg(u + 's', [[0, '#2a2468'], [0.6, '#5a4aa6'], [1, '#9383d8']])}${lg(u + 'f', [[0, '#e3e0f5'], [1, '#bdb7e2']])}${rg(u + 'g', [[0, '#bfe6ff', 0.6], [1, '#bfe6ff', 0]])}</defs>`;
      s += re(0, 0, 750, 810, `url(#${u}s)`);
      s += g('fill="#fff"', many(46, () => { const x = r() < 0.75 ? sideX(r) : 250 + r() * 250; return ci(x, 20 + r() * 720, 1.2 + r() * 2.2, null, `fill-opacity="${n(0.5 + r() * 0.5)}"`); }));
      s += sp(60, 420, 10, '#fff8c9') + sp(700, 330, 9, '#fff') + sp(560, 60, 8, '#ffd9f0') + sp(226, 80, 7, '#fff') + sp(690, 560, 7, '#fff8c9') + sp(36, 640, 6, '#fff');
      // Earth
      s += ci(130, 176, 120, `url(#${u}g)`) + ci(130, 176, 78, '#7fc4ff') + `<clipPath id="${u}e"><circle cx="130" cy="176" r="78"/></clipPath>` +
        g(`clip-path="url(#${u}e)"`, g('fill="#8fe0b0"', pa('M70 130q30 -30 60 -10q10 30 -20 40q-30 14 -40 -30Z') + pa('M140 200q40 -10 60 20q-10 40 -50 30q-20 -20 -10 -50Z') + pa('M60 220q20 0 24 24q-14 20 -34 6Z')) +
          g('fill="#fff" fill-opacity=".8"', el(160, 140, 34, 9) + el(96, 196, 30, 8) + el(150, 246, 36, 8)) + pa('M130 98A78 78 0 0 1 130 254A110 110 0 0 0 130 98Z', '#2a2468', 'fill-opacity=".18"'));
      // ringed planet
      s += g('transform="rotate(-18 636 126)"', el(636, 126, 62, 14, null, st('#ffd9f0', 6)) + ci(636, 126, 34, '#ffb7d9') + pa('M604 118q32 12 64 0', null, st('#ff9ac1', 5, 'stroke-opacity=".7"')) + pa('M574 126A62 14 0 0 0 698 126', null, st('#ffd9f0', 6)));
      // far ridge + surface
      s += pa('M0 810V760l60 -30l50 20l70 -40l60 34l90 -20l80 26l70 -34l80 30l60 -24l70 30l60 -16V810Z', '#a9a0de');
      s += pa('M0 800Q375 752 750 800V1000H0Z', `url(#${u}f)`);
      const crater = (x, y, w) => el(x, y, w, w * 0.3, '#c6c0e8') + pa(`M${n(x - w)} ${n(y)}A${n(w)} ${n(w * 0.3)} 0 0 1 ${n(x + w)} ${n(y)}`, null, st('#a9a0de', 3)) + pa(`M${n(x - w * 0.8)} ${n(y + w * 0.1)}A${n(w)} ${n(w * 0.3)} 0 0 0 ${n(x + w * 0.8)} ${n(y + w * 0.1)}`, null, st('#f3f1fc', 3));
      s += crater(210, 850, 48) + crater(560, 838, 36) + crater(90, 960, 60) + crater(470, 968, 44) + crater(676, 946, 30) + crater(326, 800, 22);
      s += g('fill="#d3cff0"', el(250, 930, 16, 8) + el(600, 900, 12, 6) + el(160, 890, 9, 5));
      // flag
      s += re(106, 640, 8, 230, '#e9e6f7', 'rx="4"') + pa('M114 646Q150 632 186 648V704Q150 688 114 702Z', '#ff9ac1') + pa(DU.starD(150, 672, 15), '#fff') + el(110, 872, 26, 7, '#b3acdf');
      // rocket
      s += el(642, 878, 76, 12, '#a9a0de', 'fill-opacity=".7"') + g('fill="#b48cff"', pa('M598 800Q566 820 566 872L606 846Z') + pa('M686 800Q718 820 718 872L678 846Z') + pa('M634 838h16v40h-16Z'));
      s += pa('M642 560Q596 640 596 760V846H688V760Q688 640 642 560Z', '#fbf9ff') + pa('M642 560Q612 612 602 672H682Q672 612 642 560Z', '#ff8fb5') + ci(642, 726, 26, '#b48cff') + ci(642, 726, 18, '#bfe6ff') + ci(636, 720, 6, '#fff', 'fill-opacity=".8"') + re(596, 800, 92, 14, '#ffd76a');
      s += pa('M610 690V830', null, st('#e3def5', 6, 'stroke-opacity=".8"'));
      return s;
    },
  });

  /* ---------------------------------------------------------------- ballet studio */
  B.push({
    id: 'studio', name: 'סטודיו לבלט', tags: ['ballet'], price: 0,
    draw(u) {
      u += 'bs';
      let s = `<defs>${lg(u + 'w', [[0, '#ffe3ec'], [1, '#fff3ee']])}${lg(u + 'g', [[0, '#cdeaff'], [1, '#eef8ff']])}${lg(u + 'f', [[0, '#f6d7ad'], [1, '#e8c090']])}${lg(u + 'l', [[0, '#fff', 0.5], [1, '#fff', 0]])}</defs>`;
      s += re(0, 0, 750, 780, `url(#${u}w)`) + re(0, 0, 750, 56, '#ffd3e0') + pa('M0 56' + many(15, () => 'q25 22 50 0'), '#ffd3e0');
      // arched windows / mirrors at the sides
      const win = (x) => pa(`M${x} 600V250Q${x} 150 ${x + 85} 150Q${x + 170} 150 ${x + 170} 250V600Z`, '#fff') +
        pa(`M${x + 12} 590V252Q${x + 12} 164 ${x + 85} 164Q${x + 158} 164 ${x + 158} 252V590Z`, `url(#${u}g)`) + cloud(x + 76, 300, 20, '#fff', 0.9) + cloud(x + 104, 440, 15, '#fff', 0.8) +
        pa(`M${x + 85} 164V590M${x + 12} 330H${x + 158}M${x + 12} 470H${x + 158}`, null, st('#fff', 7)) + re(x - 8, 596, 186, 16, '#fff', 'rx="6"');
      s += win(34) + win(546);
      s += pa('M20 130Q60 330 26 620H-10V130Z', '#ffc4d6', 'fill-opacity=".85"') + pa('M730 130Q690 330 724 620H760V130Z', '#ffc4d6', 'fill-opacity=".85"') + re(-10, 118, 240, 14, '#e9a9bd', 'rx="6"') + re(520, 118, 240, 14, '#e9a9bd', 'rx="6"');
      // light falling in
      s += pa('M46 600H192L300 780H80Z', `url(#${u}l)`) + pa('M558 600H704L690 780H470Z', `url(#${u}l)`);
      // barre
      s += re(0, 656, 750, 12, '#e3b98a', 'rx="6"') + re(0, 700, 750, 9, '#ecc79c', 'rx="4"') + g('fill="#cfa06f"', re(112, 650, 12, 130, null, 'rx="5"') + re(626, 650, 12, 130, null, 'rx="5"'));
      // floor
      s += re(0, 776, 750, 224, `url(#${u}f)`) + re(0, 776, 750, 9, '#fbe6c8') + planks(785, '#d9ae7a', 330, 100, 2.5) + el(375, 930, 230, 30, '#fff', 'fill-opacity=".18"');
      // pointe shoes hanging on the barre
      s += pa('M168 668q-6 40 6 70M186 668q10 36 -2 64', null, st('#ff9ac1', 3)) + pa('M160 736q-6 44 12 52q16 -6 12 -52Z', '#ffb7d2') + pa('M182 730q-2 44 16 50q14 -8 8 -52Z', '#ff9ac1') + pa('M166 744h14M186 738h14', null, st('#fff', 3, 'stroke-opacity=".7"'));
      // plant
      s += pa('M626 950h84l-10 -74h-64Z', '#b9a4f0') + re(620, 866, 96, 16, '#a48de3', 'rx="6"') + g('fill="#9fd6a8"', pa('M668 866Q640 800 600 790Q636 826 660 866Z') + pa('M668 866Q676 780 720 760Q700 820 676 866Z') + pa('M668 866Q664 800 676 750Q690 810 674 866Z'));
      // bag + ribbon wand on the floor
      s += el(120, 950, 70, 9, '#d9ae7a', 'fill-opacity=".5"') + re(64, 880, 112, 66, '#ff9ac1', 'rx="18"') + pa('M88 884q32 -44 64 0', null, st('#e0457f', 6)) + pa(DU.heartD(120, 914, 13), '#fff') + re(64, 902, 112, 8, '#ffc4d9');
      s += many(5, (i) => sp([40, 230, 520, 716, 496][i], [220, 96, 100, 230, 620][i], [8, 6, 7, 9, 5][i], '#fff', 0.9));
      return s;
    },
  });

  /* ---------------------------------------------------------------- disco */
  B.push({
    id: 'disco', name: 'דיסקו', tags: ['retro', 'pop', 'rock'], price: 0,
    draw(u) {
      u += 'dc';
      const r = rnd(88);
      let s = `<defs>${lg(u + 'w', [[0, '#3b2b80'], [0.6, '#7b41b3'], [1, '#c463c4']])}${lg(u + 'f', [[0, '#8f6fe0'], [1, '#6a4fd0']])}${rg(u + 'b', [[0, '#ffffff'], [0.6, '#dfe3f5'], [1, '#aab2cf']])}${rg(u + 'g', [[0, '#fff', 0.5], [1, '#fff', 0]])}` +
        `${lg(u + 'c', [[0, '#7de3ff', 0.42], [1, '#7de3ff', 0]])}${lg(u + 'p', [[0, '#ffe08a', 0.4], [1, '#ffe08a', 0]])}${lg(u + 'm', [[0, '#ff9ad5', 0.42], [1, '#ff9ad5', 0]])}</defs>`;
      s += re(0, 0, 750, 800, `url(#${u}w)`);
      // light beams from the top corners
      s += pa('M150 120L-40 800H150Z', `url(#${u}c)`) + pa('M150 120L120 800H280Z', `url(#${u}m)`) + pa('M700 0L520 800H660Z', `url(#${u}p)`) + pa('M700 0L690 800H800V300Z', `url(#${u}c)`) + pa('M40 0L170 800H40Z', `url(#${u}p)`);
      // neon shapes on the wall
      s += pa('M560 250l34 -40l34 40l34 -40l34 40', null, st('#ffe08a', 8)) + pa('M620 330L676 430H564Z', null, st('#7de3ff', 8)) + ci(660, 520, 34, null, st('#ff9ad5', 8)) + pa('M50 300h90M50 330h60', null, st('#7de3ff', 8)) +
        pa('M70 420l40 60l-70 10Z', null, st('#ffe08a', 8)) + ci(170, 400, 22, null, st('#ff9ad5', 8)) + pa('M556 150h120', null, st('#ff9ad5', 8, 'stroke-dasharray="2 22"'));
      // disco ball
      s += pa('M150 0V60', null, st('#dfe3f5', 4)) + ci(150, 122, 100, `url(#${u}g)`) + ci(150, 122, 62, `url(#${u}b)`) + `<clipPath id="${u}k"><circle cx="150" cy="122" r="62"/></clipPath>` +
        g(`clip-path="url(#${u}k)" ${st('#8f97bd', 2, 'stroke-opacity=".7"')}`, pa('M88 96Q150 112 212 96M88 124Q150 142 212 124M92 152Q150 172 208 152M120 60Q104 122 124 184M150 60V184M180 60Q196 122 176 184')) +
        g('fill="#fff"', re(116, 84, 16, 14, null, 'rx="2"') + re(160, 110, 14, 14, null, 'rx="2"') + re(128, 142, 12, 12, null, 'rx="2"')) + sp(196, 82, 14, '#fff') + sp(96, 166, 9, '#fff') + sp(236, 150, 7, '#ffe08a');
      // stars
      s += many(20, () => sp(sideX(r), 190 + r() * 560, 3 + r() * 6, ['#fff', '#ffe08a', '#7de3ff'][Math.floor(r() * 3)], 0.85));
      // floor
      s += re(0, 792, 750, 208, `url(#${u}f)`) + checker(792, 420, '#ff9ad5') + re(0, 792, 750, 8, '#ffd9f0', 'fill-opacity=".8"') + el(375, 930, 230, 34, '#fff', 'fill-opacity=".14"');
      // speakers
      const spk = (x) => re(x, 610, 124, 260, '#2f2466', 'rx="12"') + ci(x + 62, 680, 30, '#8f6fe0') + ci(x + 62, 680, 14, '#c9b6ff') + ci(x + 62, 790, 44, '#8f6fe0') + ci(x + 62, 790, 22, '#c9b6ff') + ci(x + 62, 790, 7, '#2f2466') + re(x + 8, 870, 108, 12, '#241a52', 'rx="5"');
      s += spk(14) + spk(612);
      // notes
      const note = (x, y, c) => el(x, y, 11, 8, c, `transform="rotate(-20 ${x} ${y})"`) + pa(`M${x + 9} ${y - 3}V${y - 46}l22 8`, null, st(c, 5));
      s += note(206, 560, '#ffe08a') + note(552, 610, '#7de3ff') + note(230, 250, '#ff9ad5');
      return s;
    },
  });

  /* ---------------------------------------------------------------- luau */
  B.push({
    id: 'luau', name: 'חוף הוואי', tags: ['hawaii', 'beach'], price: 0,
    draw(u) {
      u += 'lu';
      let s = `<defs>${lg(u + 's', [[0, '#8f7fe0'], [0.35, '#ff9fbf'], [0.72, '#ffc98f'], [1, '#ffecb3']])}${lg(u + 'w', [[0, '#f9a9b8'], [0.5, '#b6bfe6'], [1, '#8fd3e6']])}${lg(u + 'd', [[0, '#ffe4b3'], [1, '#f6cc92']])}${rg(u + 'g', [[0, '#fff3b0', 0.85], [1, '#fff3b0', 0]])}${rg(u + 'h', [[0, '#ffd76a', 0.7], [1, '#ffd76a', 0]])}</defs>`;
      s += re(0, 0, 750, 570, `url(#${u}s)`) + ci(580, 540, 190, `url(#${u}g)`) + ci(580, 540, 84, '#fff3b0') + cloud(250, 150, 34, '#ffd9e6', 0.8) + cloud(470, 90, 22, '#ffe6ee', 0.7) + cloud(660, 220, 26, '#ffe0c9', 0.7);
      s += pa('M-10 566V520Q60 480 140 520Q190 500 250 566Z', '#b79ad6', 'fill-opacity=".8"');
      s += re(0, 560, 750, 240, `url(#${u}w)`) + g('fill="#fff3b0" fill-opacity=".7"', re(520, 580, 120, 6, null, 'rx="3"') + re(540, 606, 86, 6, null, 'rx="3"') + re(506, 636, 150, 7, null, 'rx="3"') + re(548, 670, 70, 7, null, 'rx="3"'));
      s += pa(wave(700, 10, 150), null, st('#fff', 5, 'stroke-opacity=".55" stroke-dasharray="130 70"')) + pa(wave(740, 11, 170), null, st('#fff', 6, 'stroke-opacity=".6" stroke-dasharray="150 60"'));
      s += pa('M0 786Q70 766 150 782T300 780T450 786T600 776T750 782V1000H0Z', '#fff7e6') + pa('M0 800Q70 780 150 796T300 794T450 800T600 790T750 796V1000H0Z', `url(#${u}d)`);
      // palms
      s += palm(40, 860, 560, 90, '#c9925f', '#3fae8f', '#63c9a3') + palm(-6, 880, 400, -10, '#b98250', '#4fb898', '#7fd6b0');
      // flower garland along the top
      const [d, o] = garland(30, 16, 3, 4, (x, y, i) => fl(x, y + 8, 14, ['#ff8fb5', '#fff', '#ffd76a', '#ff9f8f'][i % 4], i % 4 === 2 ? '#ff9f8f' : '#ffe08a'));
      s += pa(d, null, st('#7fd6a0', 4)) + o;
      // tiki torches
      const torch = (x, hgt) => ci(x, 900 - hgt - 30, 64, `url(#${u}h)`) + re(x - 6, 900 - hgt, 12, hgt + 30, '#c99a5a', 'rx="5"') + pa(`M${x - 22} ${900 - hgt}h44l-8 30h-28Z`, '#a8744a') + pa(`M${x - 22} ${900 - hgt + 10}h44`, null, st('#e9c58c', 4)) +
        pa(`M${x} ${900 - hgt - 62}q22 28 10 50q-8 14 -20 0q-12 -22 10 -50Z`, '#ff9a56') + pa(`M${x + 1} ${900 - hgt - 40}q10 16 4 28q-5 8 -10 0q-6 -12 6 -28Z`, '#ffe08a') +
        pa(`M${x - 6} ${930 - hgt + 40}h12M${x - 6} ${930 - hgt + 120}h12M${x - 6} ${930 - hgt + 200}h12`, null, st('#a8744a', 3));
      s += torch(206, 330) + torch(556, 300);
      // surfboard
      s += pa('M690 520Q730 640 716 900H664Q650 640 690 520Z', '#7de3e0') + pa('M690 520V900', null, st('#fff', 5)) + pa('M662 760h56', null, st('#ff9ac1', 14)) + fl(690, 680, 15, '#fff');
      // hibiscus + shells
      const hib = (x, y, rr, c) => fl(x, y, rr, c) + pa(`M${x} ${y}l${n(rr * 0.6)} ${n(-rr * 0.7)}`, null, st('#ffd24d', 3));
      s += g('fill="#63c9a3"', el(60, 960, 46, 14, null, 'transform="rotate(-20 60 960)"') + el(150, 972, 40, 12, null, 'transform="rotate(14 150 972)"') + el(640, 972, 46, 13, null, 'transform="rotate(-12 640 972)"'));
      s += hib(96, 940, 30, '#ff7f9f') + hib(160, 962, 20, '#ffb347') + hib(616, 952, 26, '#ff8fb5') + hib(700, 964, 18, '#fff');
      s += pa('M452 968Q450 946 468 942Q486 946 484 968Z', '#ffd9e6') + pa('M468 944V966M460 948L458 966M476 948L478 966', null, st('#f5a9c6', 2));
      return s;
    },
  });

  /* ---------------------------------------------------------------- kawaii room */
  B.push({
    id: 'sweets', name: 'חדר קאוואי', tags: ['kawaii', 'sleepover'], price: 0,
    draw(u) {
      u += 'sw';
      let s = `<defs>${lg(u + 'f', [[0, '#ece2fb'], [1, '#dccdf5']])}` +
        `<pattern id="${u}d" width="60" height="60" patternUnits="userSpaceOnUse"><rect width="60" height="60" fill="#ffe6f0"/><circle cx="15" cy="15" r="5" fill="#fff" fill-opacity=".8"/><circle cx="45" cy="45" r="5" fill="#fff" fill-opacity=".8"/></pattern></defs>`;
      s += re(0, 0, 750, 790, `url(#${u}d)`) + re(0, 0, 750, 44, '#ffc9de') + pa('M0 44' + many(15, () => 'q25 24 50 0'), '#ffc9de');
      // heart bunting
      const [d, o] = garland(74, 14, 3, 4, (x, y, i) => pa(DU.heartD(x, y + 18, 13), ['#ff8fb5', '#b48cff', '#7de3e0', '#ffd76a'][i % 4]));
      s += pa(d, null, st('#e9a9c6', 3)) + o;
      // window
      s += re(40, 190, 170, 220, '#fff', 'rx="26"') + re(52, 202, 146, 196, '#cdeaff', 'rx="18"') + cloud(120, 280, 24) + cloud(150, 350, 14, '#fff', 0.8) + pa('M125 202V398M52 300H198', null, st('#fff', 7)) + re(30, 404, 190, 16, '#fff', 'rx="8"');
      s += pa('M40 186Q70 290 44 404H24V186Z', '#c9b6ff', 'fill-opacity=".9"') + pa('M210 186Q180 290 206 404H226V186Z', '#c9b6ff', 'fill-opacity=".9"') + pa(DU.heartD(125, 180, 12), '#ff8fb5');
      // shelves with sweets
      s += re(540, 332, 190, 14, '#fff', 'rx="6"') + re(540, 506, 190, 14, '#fff', 'rx="6"') + pa('M556 346l14 24M714 346l-14 24M556 520l14 24M714 520l-14 24', null, st('#f3c9dd', 5));
      const mac = (x, y, c) => el(x, y - 16, 22, 9, c) + re(x - 19, y - 14, 38, 7, '#fff7ee', 'rx="3"') + el(x, y - 5, 22, 9, c);
      s += mac(576, 332, '#ff9ac1') + mac(576, 308, '#b6f0d6') + mac(576, 284, '#ffe08a') + mac(628, 332, '#c9b6ff') + mac(628, 308, '#ff9ac1');
      s += re(660, 290, 56, 42, '#fff7ee', 'rx="6"') + pa('M656 292q8 -16 16 0q8 -16 16 0q8 -16 16 0q8 -16 16 0v10h-64Z', '#ff9ac1') + ci(688, 272, 8, '#ff5f7f') + pa('M688 264q4 -10 10 -10', null, st('#7fcf9a', 3));
      s += pa('M556 506V452Q556 440 568 440H596Q608 440 608 452V506Z', '#eaf6ff') + re(552, 428, 60, 14, '#b48cff', 'rx="6"') + many(7, (i) => ci(566 + (i % 3) * 16, 492 - Math.floor(i / 3) * 16, 7, ['#ff9ac1', '#ffe08a', '#7de3e0'][i % 3]));
      s += ci(674, 472, 30, '#fff') + ci(652, 446, 12, '#fff') + ci(696, 446, 12, '#fff') + ci(652, 446, 6, '#ffc9de') + ci(696, 446, 6, '#ffc9de') + ci(664, 468, 3.4, '#4b3564') + ci(684, 468, 3.4, '#4b3564') + el(674, 478, 5, 3.4, '#ff8fb5') + ci(656, 480, 5, '#ffb7d2', 'fill-opacity=".7"') + ci(692, 480, 5, '#ffb7d2', 'fill-opacity=".7"');
      // floor + rug
      s += re(0, 786, 750, 214, `url(#${u}f)`) + re(0, 786, 750, 10, '#f6effd') + el(375, 930, 262, 50, '#ffd9e8') + el(375, 930, 262, 50, null, st('#fff', 6, 'stroke-dasharray="2 16"')) + el(375, 930, 200, 34, '#ffe9f2');
      // bunny + bear plushies
      s += el(142, 950, 70, 10, '#cdbcec', 'fill-opacity=".6"') + g('fill="#fff"', pa('M118 800Q104 720 124 716Q142 720 136 800Z') + pa('M152 800Q150 716 172 716Q190 724 170 802Z') + ci(144, 836, 46) + el(144, 912, 44, 40) + el(106, 944, 20, 12) + el(182, 944, 20, 12));
      s += g('fill="#ffc9de"', pa('M122 790Q114 740 126 732Q134 742 131 790Z') + pa('M157 790Q158 738 170 734Q178 744 166 792Z') + ci(118, 848, 9, null, 'fill-opacity=".8"') + ci(170, 848, 9, null, 'fill-opacity=".8"')) + ci(130, 832, 4.5, '#4b3564') + ci(158, 832, 4.5, '#4b3564') + pa('M139 846q5 6 10 0', null, st('#4b3564', 3)) + pa(DU.heartD(144, 908, 12), '#ff8fb5');
      s += g('fill="#e9c9a0"', ci(48, 870, 34) + ci(22, 844, 13) + ci(74, 844, 13) + el(48, 936, 32, 30)) + ci(22, 844, 6, '#f6dfc3') + ci(74, 844, 6, '#f6dfc3') + el(48, 880, 13, 10, '#f6dfc3') + ci(38, 866, 3.6, '#4b3564') + ci(58, 866, 3.6, '#4b3564') + ci(48, 876, 4, '#8a5f4b');
      // pillows
      s += el(640, 952, 96, 10, '#cdbcec', 'fill-opacity=".6"') + pa(DU.heartD(606, 892, 54), '#ff9ac1') + pa(DU.heartD(606, 892, 36), null, st('#fff', 4, 'stroke-dasharray="3 9"')) + pa(DU.starD(694, 902, 46, 5, 0.6), '#ffe08a') + ci(684, 898, 3.4, '#4b3564') + ci(704, 898, 3.4, '#4b3564') + pa('M688 908q6 6 12 0', null, st('#4b3564', 3));
      s += sp(250, 150, 8, '#fff') + sp(510, 200, 7, '#fff') + sp(232, 520, 8, '#fff') + sp(520, 640, 7, '#fff');
      return s;
    },
  });

  /* ---------------------------------------------------------------- northern lights (shop) */
  B.push({
    id: 'aurora', name: 'זוהר הצפון', tags: ['winter', 'magic'], price: 700,
    draw(u) {
      u += 'au';
      const r = rnd(321);
      let s = `<defs>${lg(u + 's', [[0, '#1c2764'], [0.6, '#33509d'], [1, '#6f93d3']])}${lg(u + 'a', [[0, '#8ff5c8', 0], [0.55, '#8ff5c8', 0.25], [1, '#8ff5c8', 0.75]])}${lg(u + 'b', [[0, '#c9a2ff', 0], [0.5, '#c9a2ff', 0.2], [1, '#c9a2ff', 0.65]])}${lg(u + 'c', [[0, '#ff9ad5', 0], [0.6, '#ff9ad5', 0.15], [1, '#ff9ad5', 0.55]])}${lg(u + 'f', [[0, '#f3f8ff'], [1, '#cfe0fa']])}${rg(u + 'g', [[0, '#ffe9a8', 0.8], [1, '#ffe9a8', 0]])}</defs>`;
      s += re(0, 0, 750, 800, `url(#${u}s)`);
      s += g('fill="#fff"', many(44, () => { const x = r() < 0.7 ? sideX(r) : 250 + r() * 250; return ci(x, 16 + r() * 520, 1 + r() * 2.2, null, `fill-opacity="${n(0.5 + r() * 0.5)}"`); }));
      // the lights
      s += pa('M-20 0H780V250Q640 170 470 250T160 230T-20 300Z', `url(#${u}b)`) + pa('M-20 0H780V330Q660 400 520 330T250 350T-20 250Z', `url(#${u}a)`) + pa('M-20 60H780V470Q700 410 610 450T460 400T250 440T-20 400Z', `url(#${u}c)`);
      s += g(st('#fff', 3, 'stroke-opacity=".3"'), pa('M60 150V290M150 120V250M560 190V330M650 250V370M700 220V360M100 300V420M620 300V440M40 200V320'));
      s += sp(70, 60, 9, '#fff') + sp(690, 40, 8, '#fff8c9') + sp(224, 30, 6, '#fff') + sp(540, 150, 7, '#fff') + ci(628, 96, 30, '#f6f3ff') + ci(642, 88, 26, '#33509d', 'fill-opacity=".9"');
      // far mountains
      s += pa('M-10 800V600L90 470L160 560L230 500L330 640L420 600L520 660L610 520L680 600L760 500V800Z', '#8fa6dc') + g('fill="#f3f8ff"', pa('M90 470L58 512Q76 506 90 520Q104 504 122 512Z') + pa('M610 520L584 556Q598 550 610 562Q624 548 640 558Z') + pa('M230 500L208 530Q222 526 232 538Q242 526 254 532Z'));
      // snow
      s += pa('M0 840V760Q190 700 380 760T750 740V840Z', '#e6effd') + pa('M0 790Q200 750 400 790T750 776V1000H0Z', `url(#${u}f)`);
      s += pine(236, 800, 170, 96, '#6fbfa6') + pine(520, 790, 150, 86, '#6fbfa6') + pine(700, 880, 300, 170, '#5fb39a') + pine(606, 840, 210, 120, '#7fcab2') + pine(20, 900, 320, 180, '#5fb39a');
      // cabin
      s += ci(150, 720, 90, `url(#${u}g)`) + re(86, 690, 128, 96, '#b98f9f') + pa('M86 712H214M86 738H214M86 764H214', null, st('#a57a8c', 3)) + pa('M70 696L150 630L230 696Z', '#fff') + pa('M82 696L150 642L218 696Z', '#8f6f86') + pa('M70 696L150 630L230 696L218 700L150 646L82 700Z', '#fff');
      s += re(172, 634, 20, 40, '#8f6f86') + re(168, 628, 28, 10, '#fff', 'rx="4"') + g('fill="#fff" fill-opacity=".6"', ci(184, 606, 10) + ci(194, 584, 13) + ci(186, 558, 16));
      s += re(104, 716, 36, 36, '#ffe08a', 'rx="4"') + pa('M122 716v36M104 734h36', null, st('#b98f9f', 3)) + re(160, 724, 32, 62, '#8f6f86', 'rx="4"') + ci(184, 756, 3, '#ffe08a');
      // sparkle on the snow
      s += many(16, () => sp(sideX(r), 820 + r() * 160, 3 + r() * 5, '#fff', 0.9)) + g('fill="#fff" fill-opacity=".8"', many(18, () => ci(sideX(r), 420 + r() * 380, 2 + r() * 2.5)));
      return s;
    },
  });

  DU.backgrounds = DU.backgrounds || [];
  DU.backgrounds.push(...B);
})();
