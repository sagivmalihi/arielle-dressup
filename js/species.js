/* species.js — the special characters: animals that stand on the same body as the girls, so every
   garment, shoe and accessory fits them.
   A character with state.kind = 'wolf' | 'capy' is drawn with fur for skin (state.skin = the fur colour),
   an animal head in the usual head coordinates (eyes at ±38,8 · skull top −108 · chin +90), ears that
   poke out over the hair, and maybe a tail. Eyes, brows, mouth, makeup and hair stay the player's choice;
   hair style 'none' = just fur.
     DU.SPECIES[kind] = { id, name, furs: [colours], earT (where earrings go), earUp / zoomUp (thumbnail and
                          face-zoom offsets), paint(hex) → sk, head(sk, o), headBack(sk, o), ears(sk, o),
                          tail(R, sk)? → { svg, x, y } }
     DU.SPECIALS      = the pickable special characters (same shape as DU.GIRLS, plus kind / body / wear) */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const { n, p, ov, sym } = DU;
  const ell = (x, y, rx, ry, fill, line, sw = 2, extra = '') =>
    `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill || 'none'}"${line ? ` stroke="${line}" stroke-width="${sw}"` : ''}${extra ? ' ' + extra : ''}/>`;
  const ln = (d, c, sw = 2, extra = '') => p(d, 'none', c, sw, extra);
  const both = (svg) => DU.both(0, svg);
  const NOSE = '#3d2b3c', NOSE_L = '#241526';

  /* fur paint: like DU.skinPaint, plus light (muzzle, chest, inner ear) and dark (tips, tufts) */
  function furPaint(hex, cream, k) {
    const dim = DU.lum(hex) < 0.3;
    return {
      fill: hex,
      shade: dim ? DU.mix(hex, '#ffffff', 0.16) : DU.mix(hex, '#3a2a55', 0.2),
      blush: DU.mix(hex, '#ff5f7e', 0.45),
      line: DU.mix(hex, '#2b1630', dim ? 0.72 : 0.62),
      light: DU.mix(hex, cream, k),
      dark: dim ? DU.mix(hex, '#17101f', 0.5) : DU.mix(hex, '#2b1c3a', 0.36),
      fur: true,
    };
  }

  /* the short line from the nose down to the mouth: it ends where that mouth begins */
  const LIP_Y = { smile: 65.5, big: 59, cat: 62, tiny: 65.5, o: 57.5, grin: 60.5, tongue: 65.5, kiss: 61.5, shy: 63, fang: 60, gap: 59, pout: 64, smirk: 66, wow: 54 };
  const philtrum = (y0, mouth, c) => ln(`M0 ${y0}V${LIP_Y[mouth] || 62}`, c, 2.6);
  /* little fur ticks on the legs (body coordinates) */
  function ticks(R, sk) {
    const { cx, crotchY, kneeY, ankleY } = R;
    let d = '';
    [-1, 1].forEach((s) => {
      const a = R.leg(crotchY + 46), b = R.leg(kneeY + (ankleY - kneeY) * 0.34);
      const ax = cx + s * (a.x + a.w - 9), bx = cx + s * (b.x + b.w - 7);
      d += `M${n(ax)} ${n(crotchY + 40)}l${n(-s * 2.5)} 7l${n(s * 4.5)} -3l${n(-s * 2.5)} 8` +
        `M${n(bx)} ${n(kneeY + (ankleY - kneeY) * 0.3)}l${n(-s * 2)} 6l${n(s * 4)} -2.6l${n(-s * 2)} 7`;
    });
    return ln(d, sk.shade, 1.8, 'stroke-opacity=".8"');
  }

  /* =============================== the wolf =============================== */
  const WOLF_HEAD = sym(0, [
    [0, -108],
    [46, -108, 80, -74, 80, -24],
    [81, -4, 86, 12, 99, 21], // out to the first cheek tuft
    [91, 29, 85, 33],
    [87, 43, 93, 51], // the second
    [82, 53, 76, 57],
    [76, 65, 76, 72], // the third, small
    [56, 81, 26, 90, 0, 90],
  ]);
  const WOLF_EAR = 'M19 -99C27 -128 43 -154 59 -170C64 -173 69 -170 71 -163C81 -132 88 -96 87 -56';
  function wolfEars(sk, o) {
    const F = sk.fill, L = sk.line;
    const inner = DU.mix(sk.light, '#ff9db8', 0.42);
    let ear = `<path d="${WOLF_EAR}Z" fill="${F}"/>`;
    if (o.back) {
      ear += ov('M59 -170C64 -173 69 -170 71 -163C76 -148 80 -132 83 -116C74 -132 62 -150 48 -158Z', `fill="${sk.dark}" fill-opacity=".55" stroke="none"`) +
        ln('M40 -112l4 -10M52 -100l4 -10M66 -92l3 -10', sk.shade, 1.8, 'stroke-opacity=".8"');
    } else {
      ear += `<path d="M35 -101C41 -124 50 -143 60 -156C68 -134 75 -106 75 -76C61 -82 47 -91 35 -101Z" fill="${inner}"/>` +
        ov('M60 -156C68 -134 75 -106 75 -76L68 -79C68 -104 66 -130 57 -150Z', DU.SH) +
        // tufts of fur at the foot of the ear
        `<path d="M31 -99L37 -116L42 -102L48 -119L53 -98L60 -112L64 -90L71 -100L75 -74L52 -82Z" fill="${sk.light}"/>`;
    }
    ear += ln(WOLF_EAR, L, 2.4);
    if (o.hair) ear += ln('M19 -99l5 9l3 -7l6 10l3 -7l7 11l3 -6l8 11l3 -5l9 11l3 -4l8 12l1 -9l7 9', L, 1.6, 'stroke-opacity=".5"');
    return both(ear);
  }
  function wolfHead(sk, o) {
    const F = sk.fill, L = sk.line, W = sk.light, id = o.uid + 'wm';
    // the light mask: cheeks, muzzle and a blaze between the eyes
    const mask = 'M-112 34C-86 22 -66 30 -50 38C-36 45 -22 42 -15 26C-11 10 -7 -10 0 -10C7 -10 11 10 15 26C22 42 36 45 50 38C66 30 86 22 112 34V104H-112Z';
    let g = p(WOLF_HEAD, F, L, 2.4) +
      `<clipPath id="${id}"><path d="${WOLF_HEAD}"/></clipPath><g clip-path="url(#${id})"><path d="${mask}" fill="${W}"/>` +
      ov('M-112 70C-70 86 -30 96 0 96C30 96 70 86 112 70V110H-112Z', 'fill="#43206b" fill-opacity=".1" stroke="none"') + '</g>' +
      p(WOLF_HEAD, 'none', L, 2.4);
    if (o.bald) {
      g += p('M-27 -104C-22 -92 -19 -84 -17 -74C-13 -83 -9 -89 -5 -94C-3 -85 0 -76 2 -65C6 -78 10 -87 14 -93C16 -87 19 -81 22 -76C24 -86 26 -95 28 -103C12 -110 -10 -110 -27 -104Z', sk.dark, null) +
        ov('M-27 -104C-10 -110 12 -110 28 -103C12 -106 -10 -106 -27 -104Z', DU.HL);
    }
    g += philtrum(46, o.mouth, NOSE) +
      p('M-11.5 36.5C-11.5 32 -5 30.5 0 30.5C5 30.5 11.5 32 11.5 36.5C11.5 42 4.5 46.6 0 47C-4.5 46.6 -11.5 42 -11.5 36.5Z', NOSE, NOSE_L, 1.6) +
      ell(-3.6, 34.6, 4, 2, '#fff', null, 0, 'fill-opacity=".55"');
    return g;
  }
  function wolfHeadBack(sk) {
    return p(WOLF_HEAD, sk.fill, sk.line, 2.4) +
      ov('M-78 30C-50 48 -24 56 0 56C24 56 50 48 78 30C80 50 60 80 0 88C-60 80 -80 50 -78 30Z', DU.SH) +
      ln('M-30 -60l4 9l4 -8M10 -76l4 9l4 -8M-8 -30l4 9l4 -8M34 -34l4 9l4 -8M-44 -8l4 9l4 -8', sk.shade, 1.8, 'stroke-opacity=".8"');
  }
  function wolfTail(R, sk) {
    const { cx, hipY } = R;
    const sp = [
      { x: cx + 12, y: hipY + 2, w: 12 }, { x: cx + 60, y: hipY + 20, w: 20 }, { x: cx + 102, y: hipY + 62, w: 29 },
      { x: cx + 122, y: hipY + 120, w: 32 }, { x: cx + 114, y: hipY + 172, w: 23 }, { x: cx + 94, y: hipY + 210, w: 5 },
    ];
    const d = DU.tube(sp, 0.5, 0.9);
    // spikes of fur along the outside
    const tuft = (x, y, a, s) => `<g transform="translate(${n(cx + x)} ${n(hipY + y)}) rotate(${a}) scale(${s})">${p('M-11 -6C2 -4 12 6 17 20C6 16 -4 12 -12 8Z', sk.fill, sk.line, 2.4 / s)}</g>`;
    const id = 'wt' + DU.uid('');
    const tipY = hipY + 150;
    return {
      x: cx + 12, y: hipY + 2,
      svg: tuft(126, 50, -8, 1) + tuft(150, 104, 18, 1.05) + tuft(142, 160, 48, 0.95) + tuft(76, 108, 150, 0.8) + tuft(84, 160, 172, 0.8) +
        p(d, sk.fill, sk.line, 2.4) +
        `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})">` +
        `<path d="M${n(cx + 60)} ${n(tipY + 6)}l14 -14l10 12l12 -16l10 14l13 -15l11 15l14 -12l12 16V${n(hipY + 240)}H${n(cx + 60)}Z" fill="${sk.light}"/>` +
        ov(`M${n(cx + 40)} ${n(hipY + 20)}C${n(cx + 84)} ${n(hipY + 52)} ${n(cx + 100)} ${n(hipY + 110)} ${n(cx + 88)} ${n(hipY + 216)}H${n(cx + 20)}Z`, 'fill="#43206b" fill-opacity=".13" stroke="none"') + '</g>' +
        p(d, 'none', sk.line, 2.4) +
        ln(`M${n(cx + 84)} ${n(hipY + 50)}q14 12 18 30M${n(cx + 108)} ${n(hipY + 96)}q8 14 6 32M${n(cx + 96)} ${n(hipY + 74)}q-2 10 -8 16`, sk.shade, 1.8, 'stroke-opacity=".85"'),
    };
  }
  /* light fur on the throat and chest (under the clothes) + ticks */
  function wolfUnder(R, sk) {
    const { cx, sY, neckY, nk } = R, y0 = neckY + 4;
    const d = `M${n(cx - nk + 1)} ${n(y0)}L${n(cx - nk - 3)} ${n(sY - 2)}L${n(cx - 29)} ${n(sY + 16)}l7 3l-4 11l9 -2l0 13l9 -6l8 12l8 -12l9 6l0 -13l9 2l-4 -11l7 -3L${n(cx + nk + 3)} ${n(sY - 2)}L${n(cx + nk - 1)} ${n(y0)}Z`;
    return `<path d="${d}" fill="${sk.light}"/>` + ticks(R, sk);
  }

  /* =============================== the capybara =============================== */
  const CAPY_HEAD = sym(0, [[0, -108], [48, -108, 82, -80, 82, -30], [83, 6, 91, 32, 88, 56], [84, 82, 54, 93, 0, 93]]);
  const CAPY_EAR = 'M61 -88C58 -100 64 -109 73 -109C82 -108 87 -100 85 -91C84 -86 82 -82 80 -79';
  function capyEars(sk, o) {
    const E = DU.mix(sk.fill, '#4a2a22', 0.45), EL = DU.line(E);
    let ear = `<path d="${CAPY_EAR}Z" fill="${E}"/>`;
    if (!o.back) ear += ell(73, -96, 4, 5, DU.mix(E, '#2a1420', 0.45), null, 0, 'transform="rotate(14 73 -96)"');
    ear += ln(CAPY_EAR, EL, 2.4);
    if (o.hair) ear += ln('M61 -88l4 6l2 -4l5 7l2 -4l5 7', EL, 1.6, 'stroke-opacity=".5"');
    return both(ear);
  }
  function capyHead(sk, o) {
    const F = sk.fill, L = sk.line, id = o.uid + 'cm';
    // the long square snout: a darker block down the middle of the face, two nostrils at its top
    const snout = sym(0, [[0, 19], [26, 19, 43, 22, 44, 40], [46, 62, 44, 80, 34, 88], [22, 94, 10, 95, 0, 95]]);
    const dk = DU.mix(F, '#2a1420', 0.8);
    let g = p(CAPY_HEAD, F, L, 2.4) +
      `<clipPath id="${id}"><path d="${CAPY_HEAD}"/></clipPath><g clip-path="url(#${id})">` +
      `<path d="${snout}" fill="${sk.snout}"/>` + ov('M-44 40C-43 24 -26 19 0 19C26 19 43 24 44 40C30 32 -30 32 -44 40Z', DU.HL) +
      ov('M-112 74C-70 89 -30 98 0 98C30 98 70 89 112 74V112H-112Z', 'fill="#43206b" fill-opacity=".1" stroke="none"') + '</g>' +
      p(CAPY_HEAD, 'none', L, 2.4);
    if (o.bald) g += ln('M-9 -106q2 9 0 16M0 -108q2 11 0 20M9 -106q2 9 0 16', sk.dark, 2.4, 'stroke-opacity=".8"');
    g += both(ell(26, 60, 1.8, 1.8, dk, null, 0, 'fill-opacity=".5"') + ell(33, 67, 1.8, 1.8, dk, null, 0, 'fill-opacity=".5"') + ell(25, 74, 1.8, 1.8, dk, null, 0, 'fill-opacity=".5"'));
    g += ln(`M0 41V${LIP_Y[o.mouth] || 62}`, dk, 2.4) +
      both(`<path d="M4.5 38C5 31.6 11 28 15.4 30.4C18.4 32.2 17.6 37 13.6 39.6C10 41.8 5.6 41.6 4.5 38Z" fill="${dk}"/>`);
    return g;
  }
  function capyHeadBack(sk) {
    return p(CAPY_HEAD, sk.fill, sk.line, 2.4) +
      ov('M-84 34C-54 50 -24 58 0 58C24 58 54 50 84 34C86 56 64 84 0 91C-64 84 -86 56 -84 34Z', DU.SH) +
      ln('M-30 -60q2 8 0 14M10 -76q2 8 0 14M-8 -30q2 8 0 14M34 -34q2 8 0 14M-44 -8q2 8 0 14', sk.shade, 1.8, 'stroke-opacity=".8"');
  }

  const wolfFurs = ['#8f96b5', '#b9bdcb', '#f4f1ea', '#5f5c72', '#3a3644', '#8a6a52', '#c98f5e', '#e8d4b2', '#f4a9c8', '#b9a5ec', '#9fd0f2', '#a5e3cb'];
  const capyFurs = ['#bf8750', '#a9764a', '#8a5a3c', '#6e4a36', '#dba86a', '#e6c193', '#f3e8d8', '#f7b6cf', '#c9b6f2', '#a9d3f5', '#a8e0c8', '#f7e08a'];
  DU.SPECIES = {
    wolf: {
      id: 'wolf', name: 'זאבה', furs: wolfFurs, earT: 'translate(0 -104)', earUp: 100, zoomUp: 24,
      paint(hex) { const sk = furPaint(hex, '#fffaf0', 0.8); sk.under = (R) => wolfUnder(R, sk); sk.underBack = (R) => ticks(R, sk); return sk; },
      head: wolfHead, headBack: wolfHeadBack, ears: wolfEars, tail: wolfTail,
    },
    capy: {
      id: 'capy', name: 'קפיברה', furs: capyFurs, earT: 'translate(0 -124) scale(.94)', earUp: 118, zoomUp: 8,
      paint(hex) { const sk = furPaint(hex, '#fff1d6', 0.42); sk.snout = DU.mix(hex, DU.lum(hex) < 0.3 ? '#c9a58a' : '#5b3323', DU.lum(hex) < 0.3 ? 0.4 : 0.27); sk.under = sk.underBack = (R) => ticks(R, sk); return sk; },
      head: capyHead, headBack: capyHeadBack, ears: capyEars, tail: null,
    },
  };
  DU.species = (state) => (state && state.kind && DU.SPECIES[state.kind]) || null;

  /* something for a capybara to balance on her head (anyone can wear it) */
  if (DU.addItems) {
    DU.addItems([{
      id: 'ha_orange', slot: 'hairacc', name: 'תפוז על הראש', tags: ['nature', 'beach', 'kawaii', 'sleepover'], price: 0, color: '#ff9a2e',
      draw(R, P) {
        const leaf = '#5fbf6a', leafL = DU.line(leaf);
        return ell(0, -106, 17, 3.4, '#43206b', null, 0, 'fill-opacity=".18"') +
          ell(0, -127, 22, 20.5, P.fill, P.line, 2.4) +
          ov('M0 -106.5C12 -106.5 22 -115 22 -127C22 -131 21 -135 19 -138C19 -124 10 -113 -8 -108C-5 -107 -3 -106.5 0 -106.5Z', DU.SH) +
          ov('M-15 -134C-12 -141 -6 -145 0 -146C-6 -142 -10 -137 -11 -131Z', DU.HL) +
          ell(-6, -121, 1.1, 1.1, P.line, null, 0, 'fill-opacity=".3"') + ell(5, -117, 1.1, 1.1, P.line, null, 0, 'fill-opacity=".3"') + ell(9, -126, 1.1, 1.1, P.line, null, 0, 'fill-opacity=".3"') + ell(-11, -113, 1.1, 1.1, P.line, null, 0, 'fill-opacity=".3"') +
          ln('M0 -146.5V-151', '#7a5a34', 3) +
          p('M1 -149C8 -160 21 -161 28 -154C21 -146 9 -144 1 -149Z', leaf, leafL, 2) + ln('M4 -150Q14 -154 24 -154', leafL, 1.3, 'stroke-opacity=".6"');
      },
    }]);
  }

  /* the special characters you can pick (next to DU.GIRLS) */
  DU.SPECIALS = [
    { id: 'wolf', kind: 'wolf', skin: wolfFurs[0], face: 'soft', body: { h: 1, m: 1 }, eyes: { shape: 'cat', color: '#e2a530' }, brows: 'brave', mouth: 'fang', hair: { style: 'none', color: '#4f5674' } },
    { id: 'capy', kind: 'capy', skin: capyFurs[0], face: 'soft', body: { h: -2, m: 1 }, eyes: { shape: 'sleepy', color: '#7a4a2b' }, brows: 'dots', mouth: 'cat', hair: { style: 'none', color: '#7a4a2b' }, wear: { hairacc: { id: 'ha_orange' } } },
  ];
  /* every character you can start from: the girls, then the special ones */
  DU.baseOf = (id) => (DU.GIRLS || []).concat(DU.SPECIALS).find((x) => x.id === id) || null;
})();
