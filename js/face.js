/* face.js — eyes, eyebrows, mouths and makeup. All in head coordinates
   (origin between the eyes; eyes sit at x = ±38, y = 8). */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const { n, p } = DU;
  const LASH = '#2b1a2c';
  const EX = 38, EY = 8;

  /* ---------- eyes ---------- */
  DU.EYES = [
    { id: 'round', name: 'עגולות', w: 46, h: 48, tilt: 0, irx: 14.5, iry: 20.5, lash: 'cute' },
    { id: 'sparkle', name: 'נוצצות', w: 48, h: 52, tilt: 1, irx: 16, iry: 23, lash: 'cute', star: true },
    { id: 'cat', name: 'חתוליות', w: 48, h: 40, tilt: 7, irx: 14, iry: 18.5, lash: 'wing' },
    { id: 'gentle', name: 'עדינות', w: 46, h: 44, tilt: -5, irx: 14.5, iry: 19.5, lash: 'soft' },
    { id: 'sleepy', name: 'חולמניות', w: 46, h: 31, tilt: -1, irx: 14.5, iry: 19.5, lash: 'soft', dy: 3 },
    { id: 'happy', name: 'צוחקות', closed: true },
    { id: 'wink', name: 'קריצה', w: 46, h: 48, tilt: 0, irx: 14.5, iry: 20.5, lash: 'cute', wink: true },
  ];
  DU.EYE_COLORS = ['#7a4a2b', '#b5762f', '#4f9d5d', '#2f9fa8', '#3f7fd9', '#6b5bd6', '#a25bd1', '#e0679d', '#d94f4f', '#e2a530', '#6b7285', '#2f2a3a'];

  function eyeOpen(sp, color, flip, id) {
    const a = sp.w / 2, b = sp.h / 2, t = sp.tilt || 0;
    const I = [-a, b * 0.22 + t * 0.45], O = [a, b * 0.02 - t];
    const up =
      `M${n(I[0])} ${n(I[1])}C${n(-a * 0.95)} ${n(-b * 0.5 + t * 0.2)} ${n(-a * 0.5)} ${n(-b * 1.02)} ${n(a * 0.02)} ${n(-b)}` +
      `C${n(a * 0.55)} ${n(-b * 0.98)} ${n(a * 0.97)} ${n(-b * 0.55 - t * 0.5)} ${n(O[0])} ${n(O[1])}`;
    const lo =
      `C${n(a * 0.96)} ${n(b * 0.55 - t * 0.3)} ${n(a * 0.55)} ${n(b * 0.96)} 0 ${n(b * 0.94)}` +
      `C${n(-a * 0.5)} ${n(b * 0.94)} ${n(-a * 0.92)} ${n(b * 0.72)} ${n(I[0])} ${n(I[1])}`;
    const icy = (sp.dy || 0) + b * 0.06;
    const irx = sp.irx, iry = sp.iry;
    const dk = DU.mix(color, '#1a0f2e', 0.62), lt = DU.light(color, 0.5);
    const hx = -irx * 0.42 * flip;
    let g = `<defs><clipPath id="${id}c"><path d="${up + lo}Z"/></clipPath>` +
      `<linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${dk}"/><stop offset=".5" stop-color="${color}"/><stop offset="1" stop-color="${lt}"/></linearGradient></defs>`;
    g += `<path d="${up + lo}Z" fill="#fff"/>`;
    g += `<g clip-path="url(#${id}c)">`;
    g += `<path d="M${n(-a - 2)} ${n(-b - 4)}H${n(a + 2)}V${n(-b * 0.3)}Q0 ${n(-b * 0.62)} ${n(-a - 2)} ${n(-b * 0.3)}Z" fill="#c9c0e4" fill-opacity=".75"/>`;
    g += `<ellipse cx="0" cy="${n(icy)}" rx="${n(irx)}" ry="${n(iry)}" fill="url(#${id}g)" stroke="${dk}" stroke-width="2.2"/>`;
    g += `<ellipse cx="0" cy="${n(icy - 1)}" rx="${n(irx * 0.42)}" ry="${n(iry * 0.44)}" fill="${DU.mix(color, '#120a22', 0.82)}"/>`;
    g += `<ellipse cx="0" cy="${n(icy + iry * 0.58)}" rx="${n(irx * 0.62)}" ry="${n(iry * 0.25)}" fill="${DU.light(color, 0.62)}" fill-opacity=".8"/>`;
    g += `<path d="M${n(-a - 2)} ${n(-b - 4)}H${n(a + 2)}V${n(-b * 0.62)}Q0 ${n(-b * 0.86)} ${n(-a - 2)} ${n(-b * 0.62)}Z" fill="#1a0f2e" fill-opacity=".28"/>`;
    if (sp.star) {
      g += DU.sparkle(hx, icy - iry * 0.42, irx * 0.5) + `<circle cx="${n(-hx * 0.95)}" cy="${n(icy + iry * 0.36)}" r="${n(irx * 0.2)}" fill="#fff"/>` +
        DU.sparkle(-hx * 0.3, icy + iry * 0.05, irx * 0.2, '#fff', 0.9) + `<circle cx="${n(hx * 1.3)}" cy="${n(icy + iry * 0.3)}" r="${n(irx * 0.1)}" fill="#fff"/>`;
    } else {
      g += `<ellipse cx="${n(hx)}" cy="${n(icy - iry * 0.44)}" rx="${n(irx * 0.36)}" ry="${n(irx * 0.4)}" fill="#fff"/>` +
        `<circle cx="${n(-hx * 0.95)}" cy="${n(icy + iry * 0.4)}" r="${n(irx * 0.18)}" fill="#fff" fill-opacity=".92"/>`;
    }
    g += '</g>';
    // lower lid, crease, lashes
    g += p(`M${n(a * 0.93)} ${n(b * 0.42 - t * 0.5)}Q${n(a * 0.62)} ${n(b * 0.96)} ${n(a * 0.02)} ${n(b * 0.95)}`, 'none', LASH, 1.7, 'stroke-opacity=".75"');
    g += p(`M${n(-a * 0.5)} ${n(-b - 6.5)}Q${n(a * 0.15)} ${n(-b - 11)} ${n(a * 0.8)} ${n(-b * 0.7 - 6 - t * 0.5)}`, 'none', LASH, 1.5, 'stroke-opacity=".35"');
    g += p(up, 'none', LASH, 5.6);
    const wl = sp.lash === 'wing' ? 15 : sp.lash === 'soft' ? 8 : 11;
    g += `<path d="M${n(O[0] - 7)} ${n(O[1] - 8)}Q${n(O[0] + wl * 0.3)} ${n(O[1] - 6)} ${n(O[0] + wl)} ${n(O[1] - 9 - t * 0.5)}Q${n(O[0] + wl * 0.45)} ${n(O[1] + 2)} ${n(O[0] - 2)} ${n(O[1] + 3.5)}Z" fill="${LASH}"/>`;
    if (sp.lash === 'cute' || sp.lash === 'wing') {
      g += `<path d="M${n(a * 0.6)} ${n(-b * 0.82 - t * 0.4)}l8 -8l-2.5 11Z" fill="${LASH}"/>`;
    }
    if (sp.lash === 'cute') g += `<path d="M${n(a * 0.9)} ${n(b * 0.3 - t * 0.6)}l7 3.5l-8 1.5Z" fill="${LASH}"/>`;
    return g;
  }
  function eyeClosed(up) {
    // up = true: happy ∩ arc
    const d = up ? 'M-21 9Q0 -15 21 9' : 'M-21 1Q0 17 21 1';
    return p(d, 'none', LASH, 5.6) + `<path d="M${up ? '17 4l10 -3l-6 9Z' : '17 3l10 2l-8 6Z'}" fill="${LASH}"/>` +
      `<path d="M${up ? '10 -3l6 -8l1 10Z' : '9 9l7 6l-10 -1Z'}" fill="${LASH}"/>`;
  }
  /* the pair of eyes */
  DU.drawEyes = function (shapeId, color, uid) {
    const sp = DU.EYES.find((e) => e.id === shapeId) || DU.EYES[0];
    const right = sp.closed ? eyeClosed(true) : eyeOpen(sp, color, 1, uid + 'eR');
    const left = sp.closed ? eyeClosed(true) : sp.wink ? eyeClosed(true) : eyeOpen(sp, color, -1, uid + 'eL');
    return `<g transform="translate(${EX} ${EY})">${right}</g><g transform="translate(${-EX} ${EY}) scale(-1 1)">${left}</g>`;
  };
  /* path of the upper lid (for eyeshadow), outer side = +x, relative to the eye centre */
  function lidBand(sp) {
    if (sp.closed) return 'M-22 6Q0 -18 23 6Q26 -4 20 -12Q0 -30 -20 -6Z';
    const a = sp.w / 2, b = sp.h / 2, t = sp.tilt || 0;
    return `M${n(-a)} ${n(b * 0.2 + t * 0.45)}C${n(-a * 0.95)} ${n(-b * 0.5)} ${n(-a * 0.5)} ${n(-b * 1.02)} 0 ${n(-b)}C${n(a * 0.55)} ${n(-b)} ${n(a * 0.97)} ${n(-b * 0.55 - t * 0.5)} ${n(a + 4)} ${n(-t)}` +
      `Q${n(a + 13)} ${n(-b * 0.7 - t)} ${n(a * 0.75)} ${n(-b - 9 - t * 0.6)}Q0 ${n(-b - 16)} ${n(-a * 0.8)} ${n(-b * 0.75)}Q${n(-a - 2)} ${n(-b * 0.2)} ${n(-a)} ${n(b * 0.2 + t * 0.45)}Z`;
  }

  /* ---------- eyebrows ---------- */
  DU.BROWS = [
    { id: 'soft', name: 'רכות', d: 'M-20 3Q0 -8 22 0', w: 4.6 },
    { id: 'straight', name: 'ישרות', d: 'M-20 -2Q0 -4 22 -2', w: 4.6 },
    { id: 'arch', name: 'מקושתות', d: 'M-20 3Q5 -15 23 -3', w: 3.4 },
    { id: 'brave', name: 'אמיצות', d: 'M-21 6Q2 -3 22 -9', w: 5 },
    { id: 'sweet', name: 'מתוקות', d: 'M-20 -9Q0 -9 22 3', w: 4.6 },
    { id: 'thick', name: 'עבות', d: 'M-20 2Q0 -7 21 0', w: 7.5 },
  ];
  DU.drawBrows = function (id, color) {
    const b = DU.BROWS.find((x) => x.id === id) || DU.BROWS[0];
    const one = `<path d="${b.d}" fill="none" stroke="${color}" stroke-width="${b.w}"/>`;
    return `<g transform="translate(39 -34)">${one}</g><g transform="translate(-39 -34) scale(-1 1)">${one}</g>`;
  };

  /* ---------- mouths (drawn around 0,62) ---------- */
  const ML = '#8c3346', MIN = '#b33a52', TNG = '#ff8fa5';
  DU.MOUTHS = [
    { id: 'smile', name: 'חיוך', draw: (c) => p('M-12 -2Q0 9 12 -2', 'none', c, 3.2) },
    { id: 'big', name: 'חיוך גדול', draw: (c) => p('M-17 -5Q0 -1 17 -5Q15 17 0 17Q-15 17 -17 -5Z', MIN, c, 2.6) + `<path d="M-9 13Q0 5 9 13Q0 18 -9 13Z" fill="${TNG}"/><path d="M-13 -3.2Q0 0 13 -3.2L12 1Q0 3 -12 1Z" fill="#fff"/>` },
    { id: 'cat', name: 'חתולי', draw: (c) => p('M-14 -3Q-7 8 0 0Q7 8 14 -3', 'none', c, 3) },
    { id: 'tiny', name: 'קטנטן', draw: (c) => p('M-6 1Q0 6 6 1', 'none', c, 3) },
    { id: 'o', name: 'הפתעה', draw: (c) => `<ellipse cx="0" cy="3" rx="6" ry="7.5" fill="${MIN}" stroke="${c}" stroke-width="2.4"/><ellipse cx="0" cy="6.5" rx="3.2" ry="2.6" fill="${TNG}"/>` },
    { id: 'grin', name: 'צחוק', draw: (c) => p('M-18 -4Q0 1 18 -4Q13 14 0 14Q-13 14 -18 -4Z', '#fff', c, 2.6) + p('M-14 4Q0 8 14 4', 'none', c, 1.4, 'stroke-opacity=".5"') },
    { id: 'tongue', name: 'לשון', draw: (c) => p('M-5 3.5Q-5.5 14 0 14Q5.5 14 5 3.5Z', TNG, c, 2.2) + p('M-12 -2Q0 9 12 -2', 'none', c, 3.2) },
    { id: 'kiss', name: 'נשיקה', draw: (c) => `<path d="${DU.heartD(0, 2, 6.5)}" fill="${MIN}" stroke="${c}" stroke-width="2"/>` },
    { id: 'shy', name: 'ביישני', draw: (c) => p('M-11 2q3.7 -5 7.4 0t7.4 0t7.4 0', 'none', c, 3) },
  ];
  DU.drawMouth = function (id, lips) {
    const m = DU.MOUTHS.find((x) => x.id === id) || DU.MOUTHS[0];
    let g = '';
    if (lips) g += `<ellipse cx="0" cy="${id === 'big' || id === 'grin' ? 17 : id === 'o' || id === 'kiss' ? -99 : 8}" rx="9" ry="3.6" fill="${lips}" fill-opacity=".55"/>`;
    g += m.draw(lips ? DU.mix(lips, '#5a1630', 0.25) : ML);
    return `<g transform="translate(0 62)">${g}</g>`;
  };

  /* ---------- makeup ---------- */
  DU.BLUSH = [
    { id: 'soft', name: 'ורדרד', c: '#ff7d9c' },
    { id: 'peach', name: 'אפרסק', c: '#ff9a66' },
    { id: 'manga', name: 'קווקווים', c: '#ff6f91' },
    { id: 'doll', name: 'בובה', c: '#ff8fb0' },
    { id: 'hearts', name: 'לבבות', c: '#ff6f91' },
  ];
  DU.SHADOWS = ['#ff9ac1', '#c79bff', '#7cc4ff', '#7ee0b8', '#ffd166', '#ff9a76', '#8d7ae6', '#f06ca8'];
  DU.LIPS = ['#ff6f91', '#e0435f', '#ff9a76', '#d05fb8', '#b03a5b', '#ffa9c0', '#9b5de5'];
  DU.SPARKLES = [
    { id: 'stars', name: 'כוכבים' },
    { id: 'gems', name: 'יהלומים' },
    { id: 'glitter', name: 'נצנצים' },
    { id: 'freckles', name: 'נמשים' },
    { id: 'heart', name: 'לב' },
    { id: 'starcheek', name: 'כוכב' },
  ];
  /* things under the eyes layer (blush, eyeshadow, freckles) */
  DU.drawMakeupUnder = function (mk, eyesId, uid, sk) {
    if (!mk) return '';
    let g = '';
    const sp = DU.EYES.find((e) => e.id === eyesId) || DU.EYES[0];
    if (mk.shadow) {
      const d = lidBand(sp);
      const dL = sp.wink ? lidBand({ closed: true }) : d;
      g += `<g transform="translate(${EX} ${EY})"><path d="${d}" fill="${mk.shadow}" fill-opacity=".62"/></g>` +
        `<g transform="translate(${-EX} ${EY}) scale(-1 1)"><path d="${dL}" fill="${mk.shadow}" fill-opacity=".62"/></g>`;
    }
    const bl = DU.BLUSH.find((b) => b.id === mk.blush);
    if (bl) {
      const id = uid + 'bl';
      g += `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${bl.c}" stop-opacity=".62"/><stop offset=".6" stop-color="${bl.c}" stop-opacity=".3"/><stop offset="1" stop-color="${bl.c}" stop-opacity="0"/></radialGradient></defs>`;
      const one = (s) => {
        const x = s * 51, y = 42;
        if (bl.id === 'doll') return `<circle cx="${x}" cy="${y}" r="11.5" fill="${bl.c}" fill-opacity=".6"/><ellipse cx="${x - 3}" cy="${y - 4}" rx="3.2" ry="2" fill="#fff" fill-opacity=".6"/>`;
        if (bl.id === 'hearts') return `<ellipse cx="${x}" cy="${y}" rx="18" ry="11" fill="url(#${id})"/><path d="${DU.heartD(x, y, 6.5)}" fill="${bl.c}" fill-opacity=".85"/>`;
        let o = `<ellipse cx="${x}" cy="${y}" rx="${bl.id === 'manga' ? 17 : 20}" ry="${bl.id === 'manga' ? 10 : 12.5}" fill="url(#${id})"/>`;
        if (bl.id === 'manga') o += `<path d="M${x - 9} ${y + 5}l4 -9M${x - 2} ${y + 5}l4 -9M${x + 5} ${y + 5}l4 -9" fill="none" stroke="${bl.c}" stroke-width="2" stroke-opacity=".9"/>`;
        return o;
      };
      g += one(1) + one(-1);
    }
    if (mk.sparkle === 'freckles') {
      const c = sk ? DU.mix(sk.fill, '#8a4a2a', 0.5) : '#c98a5e';
      const dots = [[-15, 37], [-8, 40], [8, 40], [15, 37], [0, 38.5], [-22, 40], [22, 40], [-32, 36], [32, 36], [-40, 41], [40, 41], [-48, 36], [48, 36]];
      g += dots.map((q) => `<circle cx="${q[0]}" cy="${q[1]}" r="1.7" fill="${c}" fill-opacity=".8"/>`).join('');
    }
    return g;
  };
  /* things over the eyes layer (glitter, stickers) */
  DU.drawMakeupOver = function (mk) {
    if (!mk || !mk.sparkle) return '';
    let g = '';
    const both = (f) => f(1) + f(-1);
    switch (mk.sparkle) {
      case 'stars':
        g += both((s) => DU.sparkle(s * 66, 26, 6, '#fff7b8') + DU.sparkle(s * 60, 36, 3.5, '#fff') + DU.sparkle(s * 70, 14, 3, '#ffe1f0') +
          `<path d="${DU.sparkleD(s * 66, 26, 6)}" fill="none" stroke="#e8a93a" stroke-width=".8"/>`);
        break;
      case 'gems':
        g += both((s) => [[30, 36, '#7de3ff'], [40, 38.5, '#ff9ad5'], [50, 37, '#c9a2ff']].map((q) =>
          `<path d="M${s * q[0]} ${q[1] - 3.6}l3.2 3.6l-3.2 3.6l-3.2 -3.6Z" fill="${q[2]}" stroke="#fff" stroke-width="1"/>`).join(''));
        break;
      case 'glitter':
        g += both((s) => [[40, 44, 2.2], [50, 40, 1.6], [58, 46, 2], [46, 50, 1.5], [54, 52, 1.8], [62, 38, 1.4], [36, 50, 1.3]].map((q, i) =>
          `<circle cx="${s * q[0]}" cy="${q[1]}" r="${q[2]}" fill="${['#fff', '#ffe58a', '#ffc1e3'][i % 3]}" fill-opacity=".95"/>`).join('') + DU.sparkle(s * 60, 30, 4.5, '#fff'));
        break;
      case 'heart':
        g += `<path d="${DU.heartD(58, 30, 5.5)}" fill="#ff5f8a" stroke="#fff" stroke-width="1.2"/>`;
        break;
      case 'starcheek':
        g += `<path d="${DU.starD(-58, 31, 7.5)}" fill="#ffd54d" stroke="#fff" stroke-width="1.2"/>` + DU.sparkle(-47, 24, 3, '#fff');
        break;
    }
    return g;
  };
})();
