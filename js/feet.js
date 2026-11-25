/* feet.js — shoes and socks.
   Feet are drawn in a small local system: origin = centre of the ankle, y down,
   the floor at y = 24, +x pointing outward (the left foot is the mirror image). */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const { p, ov, n } = DU;
  const K = DU.clothKit;
  const G = 24; // floor, local

  const tf = (R, s) => { const a = R.ankle(s); return `translate(${n(a.x)} ${n(a.y)})${s < 0 ? ' scale(-1 1)' : ''}`; };
  const place = (R, s, svg) => `<g transform="${tf(R, s)}">${svg}</g>`;
  const feet = (R, f) => place(R, -1, f(-1)) + place(R, 1, f(1));

  /* the foot part of a closed shoe / sock. pad = thickness, top = y of the opening, toe = extra toe room */
  function footD(w, pad = 2, top = -9, toe = 0) {
    const b = G + 1 + pad * 0.3;
    return `M${n(-w - pad)} ${top}C${n(-w - pad - 2)} 6 ${n(-14 - pad)} 12 ${n(-13 - pad)} 20C${n(-13 - pad)} ${n(b + 1)} ${n(16 + pad + toe)} ${n(b + 1)} ${n(17 + pad + toe)} 20C${n(18 + pad + toe)} 12 ${n(w + pad + 2)} 6 ${n(w + pad)} ${top}Z`;
  }
  /* a low-cut shoe (the top edge dips so the sock / foot shows) */
  function cupD(w, pad = 2.5, dip = 15) {
    const b = G + 1 + pad * 0.3;
    return `M${n(-w - pad)} 2Q1 ${dip} ${n(w + pad)} 2C${n(w + pad + 2)} 8 ${n(18 + pad)} 12 ${n(17 + pad)} 20C${n(17 + pad)} ${n(b + 1)} ${n(-13 - pad)} ${n(b + 1)} ${n(-13 - pad)} 20C${n(-14 - pad)} 12 ${n(-w - pad - 2)} 8 ${n(-w - pad)} 2Z`;
  }
  function soleD(pad = 2, toe = 0, th = 5) {
    const b = G + 1.5 + pad * 0.3;
    return `M${n(-13.6 - pad)} ${n(b - th)}Q2 ${n(b - th + 3.5)} ${n(17.6 + pad + toe)} ${n(b - th)}Q${n(18 + pad + toe)} ${n(b + 1.5)} ${n(10 + toe)} ${n(b + 1.5)}H${-7}Q${n(-14 - pad)} ${n(b + 1.5)} ${n(-13.6 - pad)} ${n(b - th)}Z`;
  }
  /* shaft (body coords) + foot (local) as one silhouette */
  function boot(R, s, yTop, ease, fd, P, capTop = 0) {
    const shaft = DU.tube(R.legSpine(s, yTop, R.ankleY + 3, ease), capTop, 0);
    const t = tf(R, s);
    return `<path d="${shaft}" fill="${P.fill}" stroke="${P.line}" stroke-width="4.8"/><path d="${fd}" transform="${t}" fill="${P.fill}" stroke="${P.line}" stroke-width="4.8"/>` +
      `<path d="${shaft}" fill="${P.fill}"/><path d="${fd}" transform="${t}" fill="${P.fill}"/>`;
  }
  /* a horizontal band around the leg at y (body coords) */
  function legBand(R, s, y, h, ease, fill, line, rx = 3) {
    const l = R.leg(y);
    return `<rect x="${n(R.cx + s * l.x - l.w - ease)}" y="${n(y - h / 2)}" width="${n((l.w + ease) * 2)}" height="${h}" rx="${rx}" fill="${fill}" stroke="${line}" stroke-width="2"/>`;
  }
  const both = (f) => f(-1) + f(1);
  const W = '#ffffff';

  const items = [];
  const S = (o) => items.push(Object.assign({ slot: 'shoes' }, o));
  const Sk = (o) => items.push(Object.assign({ slot: 'socks' }, o));

  /* ============================== SHOES ============================== */
  S({
    id: 'sh_sneakers', name: 'נעלי ספורט', tags: ['sport', 'school'], color: '#ff6f91',
    draw(R, P) {
      const w = R.ankle(1).w;
      return feet(R, () => p(footD(w, 2.8, -8, 1), P.fill, P.line) + p(soleD(2.8, 1, 5.5), W, P.line, 1.8) + p(`M-9 ${G - 4.5}Q3 9 ${15} ${G - 4.5}`, 'none', W, 4) +
        p(`M${n(-w + 1)} -8h${n(w * 2 - 2)}v9q${n(-w + 1)} 4 ${n(-w * 2 + 2)} 0Z`, W, P.line, 1.5) + p('M-4.5 -3h9M-5 2h10', 'none', P.line, 1.5) + ov(`M8 4q7 6 8 14l-5 0q-1 -8 -6 -12Z`, DU.HL));
    },
  });
  S({
    id: 'sh_maryjane', name: 'נעלי בובה', tags: ['school', 'party', 'princess'], color: '#3a3346',
    draw(R, P) {
      const w = R.ankle(1).w;
      return feet(R, () => p(cupD(w, 2.6, 16), P.fill, P.line) + p(soleD(2.6, 0, 3.5), DU.dark(P.base, 0.3), P.line, 1.4) +
        `<rect x="${n(-w - 3.5)}" y="-1" width="${n(w * 2 + 7)}" height="6" rx="3" fill="${P.fill}" stroke="${P.line}" stroke-width="1.8"/><circle cx="${n(w + 0.5)}" cy="2" r="2.2" fill="#ffd98a" stroke="${P.line}" stroke-width="1"/>` +
        ov('M6 14q8 1 9 6l-6 1q-1 -4 -3 -7Z', DU.HL));
    },
  });
  S({
    id: 'sh_sandals', name: 'סנדלים', tags: ['beach', 'nature'], color: '#ff9a56',
    draw(R, P) {
      const w = R.ankle(1).w;
      return feet(R, () => p(`M-15 ${G - 1}Q2 ${G + 5.5} 19 ${G - 1}Q19 ${G + 3.5} 10 ${G + 3.5}H-7Q-15 ${G + 3.5} -15 ${G - 1}Z`, DU.mix(P.base, '#a8703d', 0.5), P.line, 1.8) +
        `<path d="M-13.5 13Q2 8 17.5 13L17.5 19Q2 14 -13.5 19Z" fill="${P.fill}" stroke="${P.line}" stroke-width="1.8"/>` +
        `<rect x="${n(-w - 2.5)}" y="-5" width="${n(w * 2 + 5)}" height="6" rx="3" fill="${P.fill}" stroke="${P.line}" stroke-width="1.8"/>` + DU.flower(3, 15, 4.5, W));
    },
  });
  S({
    id: 'sh_flipflops', name: 'כפכפים', tags: ['beach', 'sleepover'], color: '#5cc8ff',
    draw(R, P) {
      return feet(R, () => p(`M-15.5 ${G - 1}Q2 ${G + 5.5} 19.5 ${G - 1}Q19.5 ${G + 4} 10 ${G + 4}H-7Q-15.5 ${G + 4} -15.5 ${G - 1}Z`, P.fill, P.line, 1.8) +
        p(`M-12 12Q-3 14 2 ${G - 2}Q7 14 15.5 12`, 'none', P.line, 5.4) + p(`M-12 12Q-3 14 2 ${G - 2}Q7 14 15.5 12`, 'none', DU.light(P.base, 0.45), 3));
    },
  });
  S({
    id: 'sh_boots', name: 'מגפיים', tags: ['winter', 'nature'], color: '#a8703d', tall: true,
    draw(R, P) {
      const w = R.ankle(1).w, yT = R.kneeY + 34;
      return both((s) => boot(R, s, yT, 3.4, footD(w, 3.2, -6, 1), P) + legBand(R, s, yT + 4, 9, 4.6, DU.light(P.base, 0.3), P.line) +
        place(R, s, p(soleD(3.2, 1, 5), DU.dark(P.base, 0.4), P.line, 1.6) + p('M-5 -30h10M-5.5 -22h11M-6 -14h12M-6 -6h12', 'none', DU.light(P.base, 0.55), 1.8) + ov('M9 2q8 8 9 18l-5 0q-2 -10 -7 -15Z', DU.HL)));
    },
  });
  S({
    id: 'sh_rain', name: 'מגפי גשם', tags: ['nature', 'winter'], color: '#ffd24d', tall: true,
    draw(R, P) {
      const w = R.ankle(1).w, yT = R.kneeY + 46;
      return both((s) => boot(R, s, yT, 5.5, footD(w, 4, -6, 2), P) + legBand(R, s, yT + 3, 8, 6.6, DU.light(P.base, 0.45), P.line) +
        place(R, s, p(soleD(4, 2, 5.5), DU.dark(P.base, 0.35), P.line, 1.6) + ov(`M${n(w - 1)} -52q5 20 3 46l-4 0q2 -24 -2 -46Z`, DU.HL) + ov('M9 3q9 7 10 17l-5 0q-2 -9 -8 -14Z', DU.HL)));
    },
  });
  S({
    id: 'sh_uggs', name: 'מגפי פרווה', tags: ['winter', 'sleepover'], color: '#f3e3c8', tall: true,
    draw(R, P) {
      const w = R.ankle(1).w, yT = R.ankleY - 52;
      const fur = (s) => { const l = R.leg(yT), x = R.cx + s * l.x, ww = l.w + 8; return p(`M${n(x - ww)} ${n(yT - 5)}q${n(ww * 0.33)} -7 ${n(ww * 0.66)} 0q${n(ww * 0.33)} -7 ${n(ww * 0.66)} 0q${n(ww * 0.33)} -7 ${n(ww * 0.68)} 0l0 10q${n(-ww * 0.33)} 7 ${n(-ww * 0.66)} 0q${n(-ww * 0.33)} 7 ${n(-ww * 0.66)} 0q${n(-ww * 0.33)} 7 ${n(-ww * 0.68)} 0Z`, '#fffaf2', '#c9b79f', 2); };
      return both((s) => boot(R, s, yT, 5, footD(w, 4.5, -6, 2), P) + fur(s) + place(R, s, p(soleD(4.5, 2, 4), DU.dark(P.base, 0.3), P.line, 1.6) + p('M2 -40V-4', 'none', P.line, 1.3, 'stroke-opacity=".4" stroke-dasharray="4 4"')));
    },
  });
  S({
    id: 'sh_slippers', name: 'נעלי בית ארנב', tags: ['sleepover'], color: '#ffc1d9',
    draw(R, P) {
      const w = R.ankle(1).w, lt = DU.light(P.base, 0.6);
      const ear = (x, r) => `<path d="M${x - 4} 4C${x - 9} -8 ${x - 5} -22 ${x + r} -22C${x + 6} -18 ${x + 7} -6 ${x + 4} 4Z" fill="${P.fill}" stroke="${P.line}" stroke-width="2"/><path d="M${x - 1} 0C${x - 4} -8 ${x - 2} -15 ${x + r * 0.6} -16C${x + 3} -10 ${x + 3} -4 ${x + 2} 0Z" fill="${lt}"/>`;
      return feet(R, () => `<g transform="translate(0 8)">${ear(-5, -2)}${ear(8, 2)}</g>` + p(`M${n(-w - 5)} 6C${n(-w - 12)} 10 -19 ${G - 2} -14 ${G + 1}C-6 ${G + 4} 12 ${G + 4} 19 ${G + 1}C25 ${G - 3} ${n(w + 12)} 10 ${n(w + 5)} 6Q1 0 ${n(-w - 5)} 6Z`, P.fill, P.line) +
        `<circle cx="-4" cy="15" r="1.8" fill="#3a3346"/><circle cx="8" cy="15" r="1.8" fill="#3a3346"/><path d="M0.5 18.5l1.5 -1.6l1.5 1.6q-1.5 1.6 -3 0Z" fill="#ff6f91"/><circle cx="-9" cy="18.5" r="2.4" fill="#ff8fb0" fill-opacity=".6"/><circle cx="13" cy="18.5" r="2.4" fill="#ff8fb0" fill-opacity=".6"/>`);
    },
  });
  S({
    id: 'sh_ballet', name: 'נעלי בלט', tags: ['party', 'princess', 'magic'], color: '#ffc1d9',
    draw(R, P) {
      const w = R.ankle(1).w;
      const rib = (s) => { let d = ''; for (let i = 0; i < 3; i++) { const y0 = R.ankleY - 6 - i * 15, y1 = y0 - 15, a = R.leg(y0), b = R.leg(y1), x = R.cx + s * a.x; d += `M${n(x - a.w)} ${n(y0)}L${n(R.cx + s * b.x + b.w)} ${n(y1)}M${n(x + a.w)} ${n(y0)}L${n(R.cx + s * b.x - b.w)} ${n(y1)}`; } return p(d, 'none', P.line, 4.4) + p(d, 'none', P.fill, 2.6); };
      return both((s) => rib(s)) + feet(R, () => p(cupD(w, 2.2, 17), P.fill, P.line) + DU.bow(1, 12, 6, DU.light(P.base, 0.5), P.line));
    },
  });
  S({
    id: 'sh_hightops', name: 'נעלי כוכבים', tags: ['school', 'party', 'sport'], color: '#b48cff',
    draw(R, P) {
      const w = R.ankle(1).w, yT = R.ankleY - 24;
      return both((s) => boot(R, s, yT, 3.6, footD(w, 3, -6, 1), P) + place(R, s, p(soleD(3, 1, 6), W, P.line, 1.8) + p(`M-9.5 ${G - 5}Q3 8 15.5 ${G - 5}`, 'none', W, 4.4) +
        p(`M${n(-w + 2)} -24h${n(w * 2 - 4)}v24q${n(-w + 2)} 4 ${n(-w * 2 + 4)} 0Z`, W, P.line, 1.5) + p('M-4 -19h8M-4.5 -13h9M-5 -7h10M-5 -1h10', 'none', P.line, 1.5) + DU.star(w + 1, -12, 5.5, '#ffd24d', P.line, 1.2)));
    },
  });
  S({
    id: 'sh_glass', name: 'נעלי זכוכית', tags: ['princess', 'magic'], price: 500, color: 'glitter:#9fdcff', fixed: true,
    draw(R, P) {
      const w = R.ankle(1).w;
      return feet(R, () => `<path d="${cupD(w, 2.8, 16)}" fill="${P.fill}" fill-opacity=".88" stroke="#5a9fd6" stroke-width="2.2"/>` + ov('M-11 14q3 -5 8 -6l-1 5q-4 1 -5 5Z', DU.HL) +
        `<path d="M1 7l5 5l-5 5l-5 -5Z" fill="#fff" stroke="#5a9fd6" stroke-width="1.3"/>` + DU.sparkle(14, 6, 5, '#fff') + DU.sparkle(-12, 4, 3.5, '#fff'));
    },
  });
  S({
    id: 'sh_wings', name: 'מגפי כנפיים', tags: ['magic', 'sport'], price: 500, color: '#ffffff', tall: true,
    draw(R, P) {
      const w = R.ankle(1).w, yT = R.ankleY - 30;
      const wing = `<path d="M${n(w + 3)} -8C${n(w + 16)} -30 ${n(w + 30)} -30 ${n(w + 34)} -26C${n(w + 30)} -22 ${n(w + 31)} -18 ${n(w + 27)} -16C${n(w + 28)} -12 ${n(w + 24)} -9 ${n(w + 20)} -9C${n(w + 18)} -4 ${n(w + 10)} -3 ${n(w + 3)} -8Z" fill="#fff" stroke="#c9a23a" stroke-width="1.8"/><path d="M${n(w + 8)} -11q8 -6 16 -11M${n(w + 10)} -8q7 -3 12 -6" fill="none" stroke="#c9a23a" stroke-width="1.2" stroke-opacity=".7"/>`;
      return both((s) => place(R, s, wing) + boot(R, s, yT, 3.6, footD(w, 3, -6, 1), P) + legBand(R, s, yT + 3, 7, 4.6, '#ffd24d', '#c98a1a') +
        place(R, s, p(soleD(3, 1, 4.5), '#ffd24d', '#c98a1a', 1.6) + DU.star(0, -6, 5, '#ffd24d', '#c98a1a', 1.2) + DU.sparkle(w + 30, -36, 4, '#fff6c2')));
    },
  });
  S({
    id: 'sh_roller', name: 'גלגיליות', tags: ['sport', 'party'], price: 450, color: '#ff9ac1', tall: true,
    draw(R, P) {
      const w = R.ankle(1).w, yT = R.ankleY - 26;
      const wheels = [-8, 11].map((x) => `<circle cx="${x}" cy="${G + 6.5}" r="6" fill="#ffd24d" stroke="#c98a1a" stroke-width="1.8"/><circle cx="${x}" cy="${G + 6.5}" r="2" fill="#fff"/>`).join('');
      return both((s) => place(R, s, wheels) + boot(R, s, yT, 3.6, footD(w, 3, -6, 1), P) + place(R, s, p(soleD(3, 1, 4.5), W, P.line, 1.6) +
        p(`M${n(-w + 2)} -26h${n(w * 2 - 4)}v26q${n(-w + 2)} 4 ${n(-w * 2 + 4)} 0Z`, W, P.line, 1.5) + p('M-4 -20h8M-4.5 -13h9M-5 -6h10', 'none', P.line, 1.5) + DU.heart(w + 1, -13, 4.5, '#fff', P.line, 1.2) + p(`M-6 ${G - 3}h14`, 'none', W, 3)));
    },
  });

  /* ============================== SOCKS ============================== */
  const sockFoot = (R) => footD(R.ankle(1).w, 1.3, -8);
  const sock = (R, s, yTop, P, ease = 1.5) => boot(R, s, yTop, ease, sockFoot(R), P);
  const sockD = (R, s, yTop, ease = 1.5) => DU.tube(R.legSpine(s, yTop, R.ankleY + 3, ease), 0, 0);

  Sk({
    id: 'sk_ankle', name: 'גרביים קצרות', tags: ['sport', 'school'], color: '#ffffff',
    draw(R, P) {
      const yT = R.ankleY - 16;
      return both((s) => sock(R, s, yT, P) + legBand(R, s, yT + 3, 7, 2.6, DU.lum(P.base) > 0.85 ? '#ff9ac1' : DU.light(P.base, 0.5), P.line));
    },
  });
  Sk({
    id: 'sk_frill', name: 'גרבי תחרה', tags: ['school', 'party', 'princess'], color: '#ffffff',
    draw(R, P) {
      const yT = R.ankleY - 30;
      const fr = (s) => { const l = R.leg(yT), x = R.cx + s * l.x, ww = l.w + 5; return p(`M${n(x - ww)} ${n(yT + 4)}q${n(ww * 0.33)} -11 ${n(ww * 0.66)} -2q${n(ww * 0.33)} -11 ${n(ww * 0.66)} 0q${n(ww * 0.33)} -9 ${n(ww * 0.68)} 2l-2 7H${n(x - ww + 2)}Z`, P.fill, P.line, 1.8); };
      return both((s) => sock(R, s, yT + 4, P) + fr(s));
    },
  });
  Sk({
    id: 'sk_knee', name: 'גרבי ברך', tags: ['school', 'winter'], color: '#ffffff',
    draw(R, P) {
      const yT = R.kneeY + 16, ac = DU.lum(P.base) > 0.85 ? '#3a4a8f' : DU.light(P.base, 0.55);
      return both((s) => sock(R, s, yT, P) + legBand(R, s, yT + 6, 3.5, 1.6, ac, null, 1) + legBand(R, s, yT + 13, 3.5, 1.6, ac, null, 1));
    },
  });
  Sk({
    id: 'sk_stripes', name: 'גרבי פסים', tags: ['party', 'winter', 'magic'], color: '#ff6f91',
    draw(R, P, ctx) {
      const yT = R.kneeY - 28, Wp = { fill: W, line: P.line }, st = K.stripes(ctx, P.fill, 22, 11);
      return both((s) => sock(R, s, yT, Wp) + `<path d="${sockD(R, s, yT)}" fill="${st}"/><path d="${sockFoot(R)}" transform="${tf(R, s)}" fill="${st}"/>`);
    },
  });
  Sk({
    id: 'sk_tights', name: 'גרביונים', tags: ['winter', 'princess', 'party'], color: '#ffffff',
    draw(R, P) {
      const ds = R.pantsDs({ top: R.hipY - 8, ease: 1.2, yBot: R.ankleY + 3 });
      return DU.union(ds, P.fill, P.line) + both((s) => `<path d="${sockFoot(R)}" transform="${tf(R, s)}" fill="${P.fill}" stroke="${P.line}" stroke-width="2.4"/><path d="${sockD(R, s, R.ankleY - 20, 1.2)}" fill="${P.fill}"/>`);
    },
  });
  Sk({
    id: 'sk_legwarm', name: 'חותלות', tags: ['sport', 'winter'], color: '#b48cff',
    draw(R, P) {
      const yT = R.kneeY + 26, yB = R.ankleY + 6;
      const one = (s) => {
        const sp = R.legSpine(s, yT, yB, 5).map((q, i, a) => ({ x: q.x, y: q.y, w: q.w + (i === a.length - 1 ? 3 : 0) + (i % 2 ? 1.5 : 0) }));
        let lines = '';
        for (let y = yT + 14; y < yB - 4; y += 13) { const l = R.leg(y); lines += `M${n(R.cx + s * l.x - l.w - 4)} ${n(y)}q${n(l.w + 4)} 5 ${n(l.w * 2 + 8)} 0`; }
        return p(DU.tube(sp, 0.25, 0.25), P.fill, P.line) + p(lines, 'none', P.line, 1.5, 'stroke-opacity=".45"');
      };
      return both(one);
    },
  });
  Sk({
    id: 'sk_fuzzy', name: 'גרביים פרוותיות', tags: ['sleepover', 'winter'], color: '#7de3e0',
    draw(R, P, ctx) {
      const yT = R.ankleY - 38, lt = DU.light(P.base, 0.6), st = K.dots(ctx, lt, 16, 2.6);
      const top = (s) => { const l = R.leg(yT), x = R.cx + s * l.x, ww = l.w + 5; return p(`M${n(x - ww)} ${n(yT + 6)}q${n(-3)} -9 ${n(ww * 0.3)} -9q${n(ww * 0.35)} -6 ${n(ww * 0.7)} 0q${n(ww * 0.35)} -6 ${n(ww * 0.7)} 0q${n(ww * 0.33)} 0 ${n(ww * 0.3)} 9q${n(-ww)} 7 ${n(-ww * 2)} 0Z`, lt, P.line, 1.8) + `<circle cx="${n(x + s * (ww - 1))}" cy="${n(yT + 12)}" r="5" fill="${W}" stroke="${P.line}" stroke-width="1.5"/>`; };
      return both((s) => sock(R, s, yT + 2, P, 2.2) + `<path d="${sockD(R, s, yT + 2, 2.2)}" fill="${st}"/><path d="${sockFoot(R)}" transform="${tf(R, s)}" fill="${st}"/>` + top(s));
    },
  });
  Sk({
    id: 'sk_star', name: 'גרבי כוכבים', tags: ['magic', 'party'], price: 250, color: 'galaxy', fixed: true,
    draw(R, P, ctx) {
      const yT = R.kneeY + 10, st = K.twinkles(ctx, '#fff6c2', 26);
      return both((s) => sock(R, s, yT, P) + `<path d="${sockD(R, s, yT)}" fill="${st}"/>` + legBand(R, s, yT + 3, 6, 2.4, '#fff3b0', '#c98a1a') + DU.star(R.cx + s * (R.leg(yT).x + R.leg(yT).w + 1), yT + 3, 5, '#ffd24d', '#c98a1a', 1.2));
    },
  });
  Sk({
    id: 'sk_rainbow', name: 'גרבי קשת', tags: ['party', 'magic'], price: 250, color: 'rainbow', fixed: true,
    draw(R, P, ctx) {
      const yT = R.kneeY - 30;
      const cols = ['#ff6f91', '#ffa45c', '#ffe066', '#7ddc8a', '#5cc8ff', '#b48cff'];
      const st = K.pat(ctx, cols.map((c, i) => `<rect y="${i * 9}" width="60" height="9" fill="${c}"/>`).join(''), 60, 54);
      const Wp = { fill: W, line: '#8a6aa8' };
      return both((s) => sock(R, s, yT, Wp) + `<path d="${sockD(R, s, yT)}" fill="${st}"/><path d="${sockFoot(R)}" transform="${tf(R, s)}" fill="#b48cff"/>` + legBand(R, s, yT + 3, 6, 2.4, W, Wp.line));
    },
  });

  /* helpers shared with the other shoe / sock files */
  DU.feetKit = { G, tf, place, feet, footD, cupD, soleD, boot, legBand, both, sockFoot, sock, sockD };

  DU.addItems(items);
})();
