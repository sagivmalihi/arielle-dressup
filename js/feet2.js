/* feet2.js — more shoes and socks (many for the style challenges).
   Same local foot system as feet.js: origin = centre of the ankle, y down, floor at y = G (24),
   +x pointing outward; the left foot is the mirror image. */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const { p, ov, n } = DU;
  const K = DU.clothKit;
  const { G, tf, place, feet, footD, cupD, soleD, boot, legBand, both, sockFoot, sock, sockD } = DU.feetKit;
  const W = '#ffffff';
  const Wp = { fill: W, line: '#9a93b5' };

  /* a strap drawn as a thick line with an outline */
  const strap = (d, P, w = 3.4) => p(d, 'none', P.line, w + 2.2) + p(d, 'none', P.fill, w);
  /* a shaft given as an explicit spine (body coords) + the foot (local), as one silhouette */
  function unionFoot(R, s, shaft, fd, P) {
    const t = tf(R, s);
    return `<path d="${shaft}" fill="${P.fill}" stroke="${P.line}" stroke-width="4.8"/><path d="${fd}" transform="${t}" fill="${P.fill}" stroke="${P.line}" stroke-width="4.8"/>` +
      `<path d="${shaft}" fill="${P.fill}"/><path d="${fd}" transform="${t}" fill="${P.fill}"/>`;
  }
  const legX = (R, s, y) => { const l = R.leg(y); return { x: R.cx + s * l.x, w: l.w }; };

  const items = [];
  const S = (o) => items.push(Object.assign({ slot: 'shoes' }, o));
  const Sk = (o) => items.push(Object.assign({ slot: 'socks' }, o));

  /* ============================== SHOES ============================== */
  S({
    id: 'sh_geta', name: 'סנדלי גטה', tags: ['anime'], color: '#e0435f',
    draw(R, P) {
      const wood = '#dcae74', woodL = '#8a5a2b';
      const v = `M-13 9Q-5 12 -2 ${G - 4}Q5 12 16.5 9`;
      return both((s) => sock(R, s, R.ankleY - 15, Wp)) + feet(R, () =>
        p(`M-2 ${G - 5}V${G + 0.5}`, 'none', Wp.line, 1.4) +
        `<rect x="-12" y="${G + 2.5}" width="7.5" height="7" rx="1.5" fill="${wood}" stroke="${woodL}" stroke-width="1.6"/><rect x="8.5" y="${G + 2.5}" width="7.5" height="7" rx="1.5" fill="${wood}" stroke="${woodL}" stroke-width="1.6"/>` +
        p(`M-17 ${G - 1.5}Q2 ${G + 2} 21 ${G - 1.5}Q21.5 ${G + 4.5} 17 ${G + 4.5}H-13Q-17.5 ${G + 4.5} -17 ${G - 1.5}Z`, wood, woodL, 1.8) +
        p(`M-10 ${G + 2.6}H14`, 'none', woodL, 1, 'stroke-opacity=".4"') + strap(v, P, 3.6));
    },
  });
  S({
    id: 'sh_loafers', name: 'מוקסינים', tags: ['british', 'school', 'paris'], color: '#a8703d',
    draw(R, P) {
      const w = R.ankle(1).w, lt = DU.light(P.base, 0.28), dk = DU.dark(P.base, 0.4);
      return feet(R, () => p(cupD(w, 2.7, 12), P.fill, P.line) + p(soleD(2.7, 0, 3.6), dk, P.line, 1.4) +
        p(`M-9.5 11.5Q2.5 6.5 15 11.5L14.5 16.5Q2.5 12 -9 16.5Z`, lt, P.line, 1.6) + p('M0 11.6h5.5', 'none', P.line, 1.8) +
        p(`M-8 18.5Q2.5 14.5 13.5 18.5`, 'none', P.line, 1.2, 'stroke-opacity=".45"') + ov('M8 17q7 1 8 5l-5 1q-1 -3 -3 -6Z', DU.HL));
    },
  });
  S({
    id: 'sh_cowboy', name: 'מגפי בוקרים', tags: ['cowgirl'], color: '#c47a3d', tall: true,
    draw(R, P) {
      const w = R.ankle(1).w, yT = R.kneeY + 42, lt = DU.light(P.base, 0.4), dk = DU.dark(P.base, 0.42);
      const top = (s) => { const l = legX(R, s, yT), ww = l.w + 5; return p(`M${n(l.x - ww)} ${n(yT - 6)}Q${n(l.x)} ${n(yT + 9)} ${n(l.x + ww)} ${n(yT - 6)}L${n(l.x + ww - 0.5)} ${n(yT + 6)}Q${n(l.x)} ${n(yT + 20)} ${n(l.x - ww + 0.5)} ${n(yT + 6)}Z`, lt, P.line, 1.8); };
      const deco = (s) => { const l = legX(R, s, yT + 50), x = l.x, y = yT + 30; return p(`M${n(x)} ${n(y)}q-9 12 0 26q9 -12 0 -26M${n(x)} ${n(y + 30)}q-7 9 0 20q7 -9 0 -20M${n(x - 8)} ${n(y + 4)}q-3 14 2 26M${n(x + 8)} ${n(y + 4)}q3 14 -2 26`, 'none', '#fff3d6', 1.4, 'stroke-opacity=".85" stroke-dasharray="3.5 3"'); };
      return both((s) => boot(R, s, yT, 3.8, footD(w, 3, -6, 3), P) + top(s) + deco(s) +
        place(R, s, p(soleD(3, 3, 4.6), dk, P.line, 1.6) + p(`M-11 ${G - 6}Q4 4 21 ${G - 6}`, 'none', lt, 2.6) + p(`M-3 8q6 -5 13 0`, 'none', '#fff3d6', 1.3, 'stroke-opacity=".8" stroke-dasharray="3 2.5"') + ov('M11 4q8 7 9 16l-5 0q-2 -9 -7 -13Z', DU.HL)));
    },
  });
  S({
    id: 'sh_platform', name: 'מגפי פלטפורמה', tags: ['rock', 'pop'], color: '#3a3346', tall: true,
    draw(R, P) {
      const w = R.ankle(1).w, yT = R.kneeY + 54, lt = DU.light(P.base, 0.32), silver = '#dfe3f2', silL = '#6f7694';
      const buckle = (s, y) => { const l = legX(R, s, y); return legBand(R, s, y, 7, 4.6, lt, P.line) + `<rect x="${n(l.x + s * (l.w - 3) - 4.5)}" y="${n(y - 5)}" width="9" height="10" rx="2" fill="${silver}" stroke="${silL}" stroke-width="1.5"/><path d="M${n(l.x + s * (l.w - 3))} ${n(y - 2.5)}v5" fill="none" stroke="${silL}" stroke-width="1.4"/>`; };
      return both((s) => boot(R, s, yT, 3.6, footD(w, 3.6, -6, 1), P) + legBand(R, s, yT + 4, 8, 4.4, lt, P.line) + buckle(s, yT + 34) + buckle(s, yT + 62) +
        place(R, s, p(`M-17.5 ${G - 8}Q2.5 ${G - 3.5} 22.5 ${G - 8}V${G + 6}Q22.5 ${G + 9} 18 ${G + 9}H-13Q-17.5 ${G + 9} -17.5 ${G + 6}Z`, lt, P.line, 1.8) +
          p(`M-17 ${G + 1}H22`, 'none', P.line, 1.2, 'stroke-opacity=".4"') + p(`M-10 ${G - 11}Q3 2 16.5 ${G - 11}`, 'none', lt, 3) + ov('M10 3q8 7 9 14l-5 0q-2 -8 -7 -11Z', DU.HL)));
    },
  });
  S({
    id: 'sh_pirate', name: 'מגפי פיראטים', tags: ['pirate'], color: '#8a5a3a', tall: true,
    draw(R, P) {
      const w = R.ankle(1).w, yT = R.kneeY + 18, lt = DU.light(P.base, 0.3), dk = DU.dark(P.base, 0.42);
      const cuffD = (s) => { const a = legX(R, s, yT - 2), b = legX(R, s, yT + 26); return p(`M${n(a.x - a.w - 11)} ${n(yT - 8)}Q${n(a.x)} ${n(yT - 2)} ${n(a.x + a.w + 11)} ${n(yT - 8)}L${n(b.x + b.w + 5)} ${n(yT + 24)}Q${n(b.x)} ${n(yT + 30)} ${n(b.x - b.w - 5)} ${n(yT + 24)}Z`, lt, P.line, 2) + p(`M${n(a.x - a.w - 8)} ${n(yT - 1)}Q${n(a.x)} ${n(yT + 5)} ${n(a.x + a.w + 8)} ${n(yT - 1)}`, 'none', P.line, 1.2, 'stroke-opacity=".4"'); };
      return both((s) => boot(R, s, yT + 8, 3.8, footD(w, 3.2, -6, 1.5), P) + cuffD(s) +
        place(R, s, p(soleD(3.2, 1.5, 5), dk, P.line, 1.6) + `<rect x="${n(-w - 4.5)}" y="-6" width="${n(w * 2 + 9)}" height="7" rx="3" fill="${dk}" stroke="${P.line}" stroke-width="1.8"/>` +
          `<rect x="-5.5" y="-8" width="11" height="11" rx="2" fill="#ffd24d" stroke="#c98a1a" stroke-width="1.6"/><rect x="-2.2" y="-4.8" width="4.4" height="4.6" rx="1" fill="${dk}"/>` + ov('M10 4q8 7 9 16l-5 0q-2 -9 -7 -13Z', DU.HL)));
    },
  });
  S({
    id: 'sh_moon', name: 'מגפי ירח', tags: ['space', 'winter'], color: 'silver', fixed: true, tall: true,
    draw(R, P) {
      const w = R.ankle(1).w, yT = R.ankleY - 62, blue = '#5cc8ff', blueL = '#2f6fb0';
      const shaft = (s) => DU.tube(R.legSpine(s, yT, R.ankleY + 3, 8).map((q, i, a) => ({ x: q.x, y: q.y, w: q.w + (i > 0 && i < a.length - 1 ? 2 : 0) })), 0.35, 0);
      const lines = (s) => { let d = ''; for (const y of [yT + 20, yT + 40]) { const l = legX(R, s, y); d += `M${n(l.x - l.w - 9)} ${n(y)}q${n(l.w + 9)} 6 ${n(l.w * 2 + 18)} 0`; } return p(d, 'none', P.line, 1.6, 'stroke-opacity=".5"'); };
      return both((s) => unionFoot(R, s, shaft(s), footD(w, 6.5, -6, 3), P) + lines(s) + legBand(R, s, yT + 4, 9, 9, blue, blueL, 4) +
        place(R, s, p(`M-20.5 ${G - 5}Q3 ${G - 1} 27 ${G - 5}Q28 ${G + 6} 21 ${G + 6}H-15Q-21.5 ${G + 6} -20.5 ${G - 5}Z`, blue, blueL, 1.8) + DU.star(3, 9, 6, '#ffd24d', '#c98a1a', 1.2) + DU.sparkle(w + 12, -44, 4, '#fff')));
    },
  });
  S({
    id: 'sh_jelly', name: 'סנדלי ג׳לי', tags: ['retro', 'beach', 'kawaii'], color: '#ff9ac1',
    draw(R, P) {
      const w = R.ankle(1).w;
      const bars = `M-11 13.5Q2.5 9.5 16 13.5M-12.5 18.5Q2.5 14.5 17.5 18.5M2.5 6.5V${G}M-5.5 8.5L-7.5 ${G}M10.5 8.5L12.5 ${G}`;
      return feet(R, () => `<path d="${cupD(w, 2.6, 10)}" fill="${P.fill}" fill-opacity=".38" stroke="${P.line}" stroke-width="2.2"/>` +
        p(bars, 'none', P.fill, 2.6, 'stroke-opacity=".95"') +
        `<rect x="${n(-w - 3.4)}" y="-5" width="${n(w * 2 + 6.8)}" height="6" rx="3" fill="${P.fill}" fill-opacity=".7" stroke="${P.line}" stroke-width="1.8"/><circle cx="${n(w)}" cy="-2" r="2.2" fill="#fff" stroke="${P.line}" stroke-width="1"/>` +
        DU.sparkle(-7, 15.5, 2.6, '#fff', 0.95) + DU.sparkle(12, 20, 2.2, '#fff', 0.9) + `<circle cx="6" cy="11" r="1.1" fill="#fff"/>`);
    },
  });
  S({
    id: 'sh_wedge', name: 'סנדלי פרחים', tags: ['hawaii', 'beach', 'paris'], color: '#ff6f91',
    draw(R, P) {
      const w = R.ankle(1).w, cork = '#e6bd80', corkL = '#9a6a34';
      return feet(R, () => p(`M-16 ${G - 3}Q2 ${G + 1} 20 ${G - 3}V${G + 5}Q20 ${G + 8} 15.5 ${G + 8}H-11.5Q-16 ${G + 8} -16 ${G + 5}Z`, cork, corkL, 1.8) +
        p(`M-15.5 ${G + 2}H19.5M-15 ${G + 5}H19`, 'none', corkL, 1, 'stroke-opacity=".45"') +
        `<path d="M-13.5 13Q2 8 17.5 13L17.5 19Q2 14 -13.5 19Z" fill="${P.fill}" stroke="${P.line}" stroke-width="1.8"/>` +
        `<rect x="${n(-w - 2.6)}" y="-5" width="${n(w * 2 + 5.2)}" height="6" rx="3" fill="${P.fill}" stroke="${P.line}" stroke-width="1.8"/>` +
        DU.flower(2, 14.5, 7, W, '#ffd24d') + `<ellipse cx="-7" cy="17.5" rx="4.2" ry="2" transform="rotate(-25 -7 17.5)" fill="#7ddc8a" stroke="#3f8f5a" stroke-width="1"/>`);
    },
  });
  S({
    id: 'sh_cat', name: 'נעלי חתול', tags: ['kawaii', 'sleepover'], color: '#3a3346',
    draw(R, P) {
      const w = R.ankle(1).w, dark = DU.lum(P.base) < 0.5;
      const eye = dark ? '#ffe066' : '#3a3346', wh = dark ? '#ffffff' : DU.line(P.base);
      const ear = (x0, xt, x1) => `<path d="M${x0} 14L${xt} 3.5L${x1} 12.5Z" fill="${P.fill}" stroke="${P.line}" stroke-width="2"/><path d="M${x0 + (xt - x0) * 0.45 + 0.6} 11.5L${xt} 7L${x1 - (x1 - xt) * 0.45 - 0.6} 11Z" fill="#ff9ac1"/>`;
      return feet(R, () => ear(-10, -7.5, -1.5) + ear(6, 12, 14.5) + p(cupD(w, 2.5, 15), P.fill, P.line) +
        `<ellipse cx="-4.5" cy="17.5" rx="2" ry="2.5" fill="${eye}"/><ellipse cx="8.5" cy="17.5" rx="2" ry="2.5" fill="${eye}"/>` + (dark ? '<ellipse cx="-4.5" cy="17.7" rx=".8" ry="1.9" fill="#2b1a2c"/><ellipse cx="8.5" cy="17.7" rx=".8" ry="1.9" fill="#2b1a2c"/>' : '<circle cx="-5.1" cy="16.7" r=".7" fill="#fff"/><circle cx="7.9" cy="16.7" r=".7" fill="#fff"/>') +
        `<path d="M0.6 20.3h2.8l-1.4 1.7Z" fill="#ff8fb0"/>` + p('M-8.5 20.5l-6.5 -0.8M-8.5 22l-6 1.4M12.5 20.5l6.5 -0.8M12.5 22l6 1.4', 'none', wh, 1, 'stroke-opacity=".8"'));
    },
  });
  S({
    id: 'sh_cleats', name: 'נעלי כדורגל', tags: ['sport'], color: '#e0435f',
    draw(R, P) {
      const w = R.ankle(1).w, dk = DU.dark(P.base, 0.45);
      const studs = [-9, 0, 9, 17].map((x) => `<path d="M${x - 2.6} ${G + 1.5}h5.2l-1 4.8h-3.2Z" fill="#ffd24d" stroke="#c98a1a" stroke-width="1.1"/>`).join('');
      return feet(R, () => studs + p(footD(w, 2.7, -7, 1.5), P.fill, P.line) + p(soleD(2.7, 1.5, 3.8), dk, P.line, 1.5) +
        p(`M${n(-w + 1)} -7h${n(w * 2 - 2)}v8q${n(-w + 1)} 4 ${n(-w * 2 + 2)} 0Z`, W, P.line, 1.5) + p('M-4.5 -3h9M-5 1.5h10', 'none', P.line, 1.5) +
        p('M9 7l8 9M6.5 10l8 9M4 13l7 8', 'none', W, 2.2) + ov('M-10 9q-3 6 -2 11l3 0q0 -6 2 -10Z', DU.HL));
    },
  });
  S({
    id: 'sh_ice', name: 'מחליקי קרח', tags: ['winter', 'sport'], price: 450, color: '#ffffff', tall: true,
    draw(R, P) {
      const w = R.ankle(1).w, yT = R.ankleY - 30, lightP = DU.lum(P.base) > 0.8;
      const pom = lightP ? '#ff9ac1' : DU.light(P.base, 0.6), pomL = DU.line(pom), bl = '#d5dcee', blL = '#6f7694';
      const blade = `<path d="M-9 ${G + 1.5}v4.5M10 ${G + 1.5}v4.5" fill="none" stroke="${blL}" stroke-width="2.4"/><path d="M-15 ${G + 5}H19Q23 ${G + 5} 23 ${G + 1.5}" fill="none" stroke="${blL}" stroke-width="4.6"/><path d="M-15 ${G + 5}H19Q23 ${G + 5} 23 ${G + 1.5}" fill="none" stroke="${bl}" stroke-width="2.4"/>`;
      return both((s) => place(R, s, blade) + boot(R, s, yT, 3.6, footD(w, 3, -6, 1), P) + legBand(R, s, yT + 3, 8, 4.8, lightP ? '#fff' : DU.light(P.base, 0.5), P.line, 4) +
        place(R, s, p(soleD(3, 1, 4), bl, blL, 1.5) + p('M-4 -20h8M-4.5 -13.5h9M-5 -7h10M-5 -0.5h10', 'none', P.line, 1.5) + p('M0 -24V2', 'none', P.line, 1.1, 'stroke-opacity=".4"') +
          `<path d="M-1 -25q-6 6 -5 11M1 -25q6 6 5 11" fill="none" stroke="${pomL}" stroke-width="1.3"/><circle cx="-6.5" cy="-12" r="4.6" fill="${pom}" stroke="${pomL}" stroke-width="1.4"/><circle cx="6.5" cy="-12" r="4.6" fill="${pom}" stroke="${pomL}" stroke-width="1.4"/>` +
          DU.sparkle(w + 12, 4, 4, '#fff')));
    },
  });
  S({
    id: 'sh_ruby', name: 'נעלי אודם', tags: ['magic', 'princess', 'pop'], price: 500, color: 'glitter:#e0435f', fixed: true,
    draw(R, P) {
      const w = R.ankle(1).w, red = '#ff5f7e', redL = '#8a1f3a';
      return feet(R, () => p(cupD(w, 2.6, 15), P.fill, redL, 2.2) + p(soleD(2.6, 0, 3), redL, null) + DU.bow(2, 11.5, 7.5, red, redL) +
        `<circle cx="2" cy="11.5" r="1.9" fill="#fff3b0" stroke="#c98a1a" stroke-width=".9"/>` + ov('M-11 15q2 -5 7 -6l-1 5q-4 1 -4 5Z', DU.HL) + DU.sparkle(15, 6, 5, '#fff') + DU.sparkle(-13, 3, 3.6, '#fff') + DU.sparkle(13, 21, 2.6, '#fff'));
    },
  });

  /* ============================== SOCKS ============================== */
  Sk({
    id: 'sk_argyle', name: 'גרבי מעוינים', tags: ['british', 'school'], color: '#3a4a8f',
    draw(R, P, ctx) {
      const yT = R.kneeY + 16, dia = DU.lum(P.base) > 0.55 ? DU.dark(P.base, 0.4) : DU.light(P.base, 0.45);
      const fill = (s) => {
        const l = legX(R, s, yT + 30), id = ctx.id('ar');
        ctx.defs.push(`<pattern id="${id}" width="22" height="28" patternUnits="userSpaceOnUse" patternTransform="translate(${n(l.x - 11)} ${n(yT)})"><path d="M11 0L22 14L11 28L0 14Z" fill="${dia}" fill-opacity=".85"/><path d="M0 0L22 28M22 0L0 28" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity=".85" stroke-dasharray="3 2.4"/></pattern>`);
        return `url(#${id})`;
      };
      return both((s) => sock(R, s, yT, P) + `<path d="${sockD(R, s, yT + 12)}" fill="${fill(s)}"/>` + legBand(R, s, yT + 6, 10, 2.4, DU.dark(P.base, 0.18), P.line));
    },
  });
  Sk({
    id: 'sk_neon', name: 'גרבי ניאון', tags: ['retro', 'sport'], color: '#ff5fa2',
    draw(R, P, ctx) {
      const yT = R.ankleY - 62, yB = R.ankleY + 3;
      const st = K.pat(ctx, '<rect y="2" width="40" height="5" fill="#ffe066"/><rect y="14" width="40" height="5" fill="#5cf0c8"/>', 40, 24);
      const one = (s) => {
        const sp = R.legSpine(s, yT, yB, 3.2).map((q, i, a) => ({ x: q.x, y: q.y, w: q.w + (i % 2 ? 2.4 : 0.4) + (i === 0 ? 1.6 : 0) }));
        const shaft = DU.tube(sp, 0.3, 0);
        let wr = '';
        for (let y = yT + 12; y < yB - 10; y += 12) { const l = legX(R, s, y); wr += `M${n(l.x - l.w - 3)} ${n(y)}q${n(l.w + 3)} 5 ${n(l.w * 2 + 6)} 0`; }
        return unionFoot(R, s, shaft, sockFoot(R), P) + `<path d="${shaft}" fill="${st}"/>` + p(wr, 'none', P.line, 1.3, 'stroke-opacity=".4"');
      };
      return both(one);
    },
  });
  Sk({
    id: 'sk_cat', name: 'גרבי חתול', tags: ['kawaii', 'anime'], color: '#3a3346',
    draw(R, P) {
      const yT = R.kneeY + 14, dark = DU.lum(P.base) < 0.5, f = dark ? '#ffffff' : '#3a3346';
      const face = (s) => {
        const l = legX(R, s, yT), x = l.x, ww = l.w + 1.5;
        const ear = (sg) => `<path d="M${n(x + sg * (ww - 1))} ${n(yT + 4)}L${n(x + sg * (ww - 3.5))} ${n(yT - 10)}L${n(x + sg * (ww - 12))} ${n(yT + 1)}Z" fill="${P.fill}" stroke="${P.line}" stroke-width="2.2"/><path d="M${n(x + sg * (ww - 3.6))} ${n(yT + 1)}L${n(x + sg * (ww - 4.6))} ${n(yT - 5.5)}L${n(x + sg * (ww - 9.5))} ${n(yT + 0.5)}Z" fill="#ff9ac1"/>`;
        return ear(-1) + ear(1) + `<path d="M${n(x - ww + 1.2)} ${n(yT + 1.4)}H${n(x + ww - 1.2)}V${n(yT + 6)}H${n(x - ww + 1.2)}Z" fill="${P.fill}"/>` +
          `<ellipse cx="${n(x - 6)}" cy="${n(yT + 15)}" rx="2" ry="2.6" fill="${f}"/><ellipse cx="${n(x + 6)}" cy="${n(yT + 15)}" rx="2" ry="2.6" fill="${f}"/>` +
          `<path d="M${n(x - 1.6)} ${n(yT + 20)}h3.2l-1.6 2Z" fill="#ff8fb0"/>` + p(`M${n(x)} ${n(yT + 22)}q-3 3.4 -5.4 0.6M${n(x)} ${n(yT + 22)}q3 3.4 5.4 0.6`, 'none', f, 1.2) +
          p(`M${n(x - 10)} ${n(yT + 20)}h-5M${n(x + 10)} ${n(yT + 20)}h5`, 'none', f, 1, 'stroke-opacity=".7"');
      };
      return both((s) => sock(R, s, yT, P) + face(s));
    },
  });
  Sk({
    id: 'sk_balletpink', name: 'גרביוני בלט', tags: ['ballet'], color: '#ffc1d9',
    draw(R, P) {
      const ds = R.pantsDs({ top: R.hipY - 8, ease: 1.2, yBot: R.ankleY + 3 });
      const shine = (s) => { const sp = R.legSpine(s, R.crotchY + 26, R.ankleY - 16).map((q) => ({ x: q.x + s * (q.w * 0.45), y: q.y, w: 2 })); return `<path d="${DU.tube(sp, 0.9, 0.9)}" fill="#ffffff" fill-opacity=".45"/>`; };
      return `<g opacity=".88">` + DU.union(ds, P.fill, P.line) + both((s) => `<path d="${sockFoot(R)}" transform="${tf(R, s)}" fill="${P.fill}" stroke="${P.line}" stroke-width="2.4"/><path d="${sockD(R, s, R.ankleY - 20, 1.2)}" fill="${P.fill}"/>`) + '</g>' + both(shine);
    },
  });
  Sk({
    id: 'sk_pirate', name: 'גרבי פיראטים', tags: ['pirate'], color: '#e0435f',
    draw(R, P, ctx) {
      const yT = R.kneeY + 26, st = K.stripes(ctx, P.fill, 14, 7), dk = DU.dark(P.base, 0.42);
      return both((s) => sock(R, s, yT, Wp) + `<path d="${sockD(R, s, yT)}" fill="${st}"/><path d="${sockFoot(R)}" transform="${tf(R, s)}" fill="${P.fill}"/>` +
        legBand(R, s, yT + 4, 9, 2.6, dk, P.line) + `<circle cx="${n(legX(R, s, yT).x + s * (legX(R, s, yT).w - 1))}" cy="${n(yT + 4)}" r="3" fill="#ffd24d" stroke="#c98a1a" stroke-width="1.1"/>`);
    },
  });
  Sk({
    id: 'sk_loose', name: 'גרביים רפויות', tags: ['anime', 'school'], color: '#ffffff',
    draw(R, P) {
      const yT = R.ankleY - 74, yB = R.ankleY + 4;
      const one = (s) => {
        const ys = []; for (let y = yT; y < yB; y += 9.5) ys.push(y); ys.push(yB);
        const sp = ys.map((y, i) => { const l = R.leg(y), t = (y - yT) / (yB - yT); return { x: R.cx + s * l.x, y, w: l.w + 3.5 + t * 5.5 + (i % 2 ? 2.6 : 0) }; });
        const shaft = DU.tube(sp, 0.35, 0.3);
        let wr = '';
        ys.slice(1, -1).forEach((y, i) => { const l = legX(R, s, y), t = (y - yT) / (yB - yT), ww = l.w + 2.5 + t * 5; wr += `M${n(l.x - ww)} ${n(y + (i % 2 ? 2 : 0))}q${n(ww)} ${i % 2 ? 4 : 6} ${n(ww * 2)} 0`; });
        return unionFoot(R, s, shaft, sockFoot(R), P) + p(wr, 'none', P.line, 1.4, 'stroke-opacity=".45"');
      };
      return both(one);
    },
  });
  Sk({
    id: 'sk_silver', name: 'גרבי כסף', tags: ['space', 'pop'], price: 250, color: 'silver', fixed: true,
    draw(R, P, ctx) {
      const yT = R.kneeY + 12, st = K.stars(ctx, '#fff8c9', 26, 4.2);
      return both((s) => { const l = legX(R, s, yT); return sock(R, s, yT, P) + `<path d="${sockD(R, s, yT + 10)}" fill="${st}"/>` + legBand(R, s, yT + 4, 8, 2.6, '#5cc8ff', '#2f6fb0') + DU.star(l.x + s * (l.w + 1), yT + 4, 5.2, '#ffd24d', '#c98a1a', 1.2) + DU.sparkle(l.x - s * 4, yT + 40, 3.4, '#fff'); });
    },
  });

  DU.addItems(items);
})();
