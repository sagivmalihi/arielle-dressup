/* clothes2.js — more tops and bottoms (style-challenge pieces: sailor, blazer, hula, hakama…).
   Same rules as clothes.js; helpers come from DU.clothKit. */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const { p, ov, n } = DU;
  const K = DU.clothKit;
  const { fillp, seam, stitch, hemOf, sleeves, cuff, buttons, collar, frill, pleats, skirtDims, waistband } = K;

  const WHITE = '#ffffff', GOLD = '#ffd24d', GOLD_L = '#c98a1a', SILVER = '#e6e9f5', SILVER_L = '#8a8fa8';
  const rgbOf = (hex) => { const v = parseInt(String(hex).slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
  /* a color that stands out next to the garment color */
  const accent = (base, a = '#e0435f', b = '#3a4a8f') => { const [r, g, bl] = rgbOf(base); return r > 190 && g < 150 && bl < 175 ? b : a; };
  const dot = (x, y, r, fill, line, sw = 1.1) => `<circle cx="${n(x)}" cy="${n(y)}" r="${r}" fill="${fill}"${line ? ` stroke="${line}" stroke-width="${sw}"` : ''}/>`;
  /* a sleeve that takes a pattern overlay */
  const patSleeve = (R, s, o, P, pat) => { const sd = R.sleeve(s, o); return fillp(sd, P) + K.over(sd, pat) + p(sd, 'none', P.line, 2.4); };
  /* a thin band around the arm at t */
  const armBand = (R, s, t, ease, fill, line, half = 0.035) => p(DU.tube(R.armSpine(s, t - half, t + half, ease), 0, 0), fill, line, 1.8);

  /* one front panel of an open vest (right side of the picture); mirror it with DU.both */
  function vestPanel(R, hemY, o = {}) {
    const { cx, sY, nk, sh, ch } = R;
    const nx = nk + (o.neck == null ? 10 : o.neck), so = sh - 5, e = o.ease == null ? 1 : o.ease, inner = o.inner == null ? 14 : o.inner;
    const side = R.sidePts(sY + 58, hemY, e).map(([dx, y]) => [cx + dx, y]);
    const pt = o.point == null ? 5 : o.point;
    const d = `M${n(cx + nx)} ${n(R.shY(nx) - 2.5)}L${n(cx + so)} ${n(R.shY(so) - 2.5)}C${n(cx + so)} ${n(sY + 30)} ${n(cx + ch - 6)} ${n(sY + 46)} ${n(side[0][0])} ${n(side[0][1])}` +
      DU.smooth(side).replace(/^M[^C]+/, '') +
      `L${n(cx + inner)} ${n(hemY + pt)}C${n(cx + inner - 3)} ${n(hemY - 18)} ${n(cx + 7)} ${n(sY + 58)} ${n(cx + nx)} ${n(R.shY(nx) - 2.5)}Z`;
    return { d, xe: side[side.length - 1][0] - cx, inner, pt };
  }
  /* lapel on the right side of a V-neck jacket: from the neck point down to the V bottom */
  function lapel(R, nw, nd, wide = 9) {
    const { cx, sY } = R, ny = R.shY(nw) - 2;
    return `M${n(cx + nw)} ${n(ny)}L${n(cx + nw + wide)} ${n(ny + wide)}L${n(cx + 10 + wide)} ${n(sY + nd * 0.54)}L${n(cx + 4 + wide)} ${n(sY + nd * 0.64)}L${n(cx + 1.5)} ${n(sY + nd)}Z`;
  }
  /* big hibiscus print */
  function hibiscus(ctx, c1, c2, leaf, step = 54) {
    const fl = (x, y, r, col) => [0, 72, 144, 216, 288].map((a) => {
      const t = ((a - 90) * Math.PI) / 180, px = n(x + Math.cos(t) * r * 0.6), py = n(y + Math.sin(t) * r * 0.6);
      return `<ellipse cx="${px}" cy="${py}" rx="${n(r * 0.48)}" ry="${n(r * 0.62)}" transform="rotate(${a} ${px} ${py})" fill="${col}"/>`;
    }).join('') + `<circle cx="${x}" cy="${y}" r="${n(r * 0.22)}" fill="#ffd24d"/>`;
    const lf = (x, y, rot) => `<path d="M0 0q8 -8 18 0q-10 8 -18 0Z" transform="translate(${x} ${y}) rotate(${rot})" fill="${leaf}"/>`;
    return K.pat(ctx, lf(4, 34, -35) + lf(30, 12, 15) + lf(34, 52, 30) + fl(14, 14, 11, c1) + fl(40, 38, 9.5, c2), step, step, 0);
  }
  /* trouser legs that flare out below the knee */
  function bellLegs(R, top, yBot, ease, flare) {
    const leg = (s) => {
      const sp = R.legSpine(s, R.legTop, yBot, ease);
      sp.forEach((q) => {
        if (q.y > R.kneeY) { const f = flare * Math.pow((q.y - R.kneeY) / (yBot - R.kneeY), 1.25); q.x += s * f * 0.2; q.w += f * 0.5; }
      });
      return DU.tube(sp, 0.6, 0);
    };
    return [R.pelvis(top, ease), leg(-1), leg(1)];
  }
  /* a band across both trouser legs at y (hem cuffs) */
  const legCuffs = (R, y, h, pad, fill, line, rx = 3) => [-1, 1].map((s) => { const l = R.leg(y); return `<rect x="${n(R.cx + s * l.x - l.w - pad)}" y="${n(y - h / 2)}" width="${n((l.w + pad) * 2)}" height="${h}" rx="${rx}" fill="${fill}" stroke="${line}" stroke-width="2"/>`; }).join('');

  const items = [];
  const T = (o) => items.push(Object.assign({ slot: 'top' }, o));
  const Bt = (o) => items.push(Object.assign({ slot: 'bottom' }, o));

  /* ============================== TOPS ============================== */
  T({
    id: 'top_sailor', name: 'חולצת מלחים', tags: ['anime', 'school'], color: '#3a4a8f',
    draw(R, P, ctx) {
      const { cx, sY, nk, sh, ch } = R;
      const W = { fill: WHITE, line: P.line };
      const nd = 30, nw = nk + 11, ny = R.shY(nw) - 2, so = sh - 3;
      const o = { neck: 'v', nd, nw, hem: hemOf(R, ctx, R.hipY + 8), ease: 2.8 };
      const acc = accent(P.base);
      // chest insert that closes the V
      const yI = sY + 9, dxI = nw * (1 - (yI - ny) / (sY + nd - ny));
      const insert = `M${n(cx - dxI)} ${n(yI)}H${n(cx + dxI)}L${n(cx)} ${n(sY + nd + 2)}Z`;
      const flap = `M${n(cx + nw)} ${n(ny)}L${n(cx + so)} ${n(R.shY(so) - 2.5)}C${n(cx + so + 3)} ${n(sY + 18)} ${n(cx + ch + 3)} ${n(sY + 30)} ${n(cx + ch - 7)} ${n(sY + 37)}L${n(cx + 3)} ${n(sY + nd + 10)}L${n(cx)} ${n(sY + nd)}Z`;
      const stripe = `M${n(cx + so - 4.5)} ${n(R.shY(so) + 2)}Q${n(cx + ch)} ${n(sY + 24)} ${n(cx + ch - 9)} ${n(sY + 32.5)}L${n(cx + 7)} ${n(sY + nd + 5.5)}`;
      return {
        body: fillp(R.top(o), W) + (ctx.tucked ? '' : p(`M${n(cx - R.hp - 2)} ${n(o.hem - 6)}H${n(cx + R.hp + 2)}`, 'none', P.fill, 3)) +
          p(insert, WHITE, P.line, 1.8) + p(`M${n(cx - dxI + 4)} ${n(yI + 5)}H${n(cx + dxI - 4)}`, 'none', P.fill, 2.4),
        sleeves: sleeves(R, W, { len: 0.3, ease: 3 }, (s) => cuff(R, s, 0.3, 3, P.fill, P.line, 7)) +
          DU.both(cx, p(flap, P.fill, P.line, 2.2) + p(stripe, 'none', WHITE, 2)) + DU.bow(cx, sY + nd + 10, 9.5, acc, DU.line(acc), true),
      };
    },
  });
  T({
    id: 'top_blazer', name: 'בלייזר', tags: ['british', 'school'], color: '#3a4a8f', noTuck: true,
    draw(R, P) {
      const { cx, sY, nk, hipY, waistY } = R;
      const W = { fill: WHITE, line: '#8a8fa8' };
      const shirt = R.top({ neck: 'round', nd: 6, nw: nk + 7, hem: waistY + 6, ease: 1.5 });
      const nd = 64, nw = nk + 11;
      const o = { neck: 'v', nd, nw, hem: hipY + 22, ease: 5, fit: 0.6, hemCurve: 3 };
      const dk = DU.dark(P.base, 0.16), acc = accent(P.base);
      const crest = (x, y) => p(`M${n(x - 7.5)} ${n(y - 8)}h15v8q0 9 -7.5 12q-7.5 -3 -7.5 -12Z`, acc, GOLD_L, 1.5) + DU.star(x, y, 4, GOLD, null);
      const flapP = (s) => p(`M${n(cx + s * 17)} ${n(hipY - 4)}h${s * 22}v7h${-s * 22}Z`, dk, P.line, 1.5);
      return {
        body: fillp(shirt, W) + fillp(R.top(o), P) + DU.both(cx, p(lapel(R, nw, nd, 9), dk, P.line, 2)) + p(`M${cx} ${n(sY + nd)}V${n(o.hem + 3)}`, 'none', P.line, 1.6) +
          buttons(cx, sY + nd + 12, sY + nd + 30, 2, GOLD, GOLD_L) + flapP(-1) + flapP(1) + crest(cx + 27, sY + 58) + collar(R, WHITE, W.line, true),
        sleeves: sleeves(R, P, { len: 0.94, ease: 4.4 }, (s) => { const c = R.cuff(s, 0.9, 4.4); return seam(DU.tube(R.armSpine(s, 0.86, 0.865, 4.6), 0, 0), P, 0.5) + dot(c.x + s * (c.w - 3.5), c.y - 1, 1.9, GOLD, GOLD_L, 0.9) + dot(c.x + s * (c.w - 3), c.y + 5, 1.9, GOLD, GOLD_L, 0.9); }),
      };
    },
  });
  T({
    id: 'top_leather', name: 'ג׳קט רוק', tags: ['rock'], color: '#3a3346', noTuck: true,
    draw(R, P) {
      const { cx, sY, nk, sh, waistY } = R;
      const nd = 66, nw = nk + 12;
      const o = { neck: 'v', nd, nw, hem: waistY + 16, ease: 5, fit: 0.7 };
      const lt = DU.light(P.base, 0.2), dk = DU.dark(P.base, 0.25);
      const lp = lapel(R, nw, nd, 12), ny = R.shY(nw) - 2;
      const studs = (sg) => [0.25, 0.5, 0.75].map((t) => dot(cx + sg * (nw + 12 + (22 - nw - 12) * t - 3.5), ny + 12 + (sY + nd * 0.54 - ny - 12) * t, 1.7, SILVER, SILVER_L, 0.8)).join('');
      const zip = `M${n(cx + 1.5)} ${n(sY + nd)}L${n(cx + 5)} ${n(o.hem - 9)}`;
      const pocket = (sg) => p(`M${n(cx + sg * 15)} ${n(waistY - 24)}l${sg * 15} 7`, 'none', SILVER, 2.6) + p(`M${n(cx + sg * 15)} ${n(waistY - 24)}l${sg * 15} 7`, 'none', SILVER_L, 0.9, 'stroke-dasharray="1.5 2"');
      const x1 = nk + 17, x2 = sh;
      const epaulette = (s) => p(`M${n(cx + s * x1)} ${n(R.shY(x1) - 3.5)}L${n(cx + s * x2)} ${n(R.shY(x2) - 3)}L${n(cx + s * (x2 + 1))} ${n(R.shY(x2) + 4.5)}L${n(cx + s * x1)} ${n(R.shY(x1) + 3.5)}Z`, lt, P.line, 1.6) + dot(cx + s * (x2 - 5), R.shY(x2 - 5) + 0.5, 1.8, SILVER, SILVER_L, 0.8);
      const shine = (s) => { const sp = R.armSpine(s, 0.08, 0.44, 4.5).map((q) => ({ x: q.x + s * (q.w - 4.5), y: q.y, w: 1.7 })); return `<path d="${DU.tube(sp, 0.8, 0.8)}" ${DU.HL}/>`; };
      return {
        body: fillp(R.top(o), P) + DU.both(cx, p(lp, lt, P.line, 2)) + studs(1) + studs(-1) + p(zip, 'none', SILVER, 3) + p(zip, 'none', SILVER_L, 1, 'stroke-dasharray="1.6 2"') +
          pocket(1) + pocket(-1) + p(R.band(o.hem - 9, o.hem, 6), dk, P.line, 2) + `<rect x="${n(cx + 9)}" y="${n(o.hem - 10.5)}" width="13" height="10" rx="2" fill="${SILVER}" stroke="${SILVER_L}" stroke-width="1.4"/><rect x="${n(cx + 12.5)}" y="${n(o.hem - 7.5)}" width="6" height="4" fill="${dk}"/>` +
          ov(`M${n(cx - 30)} ${n(sY + 46)}q4 18 2 34l-5 0q2 -17 -1 -33Z`, DU.HL),
        sleeves: sleeves(R, P, { len: 0.94, ease: 4.5 }, (s) => shine(s) + seam(DU.tube(R.armSpine(s, 0.5, 0.505, 4.7), 0, 0), P, 0.5) + armBand(R, s, 0.92, 4.4, dk, P.line, 0.025)) + epaulette(-1) + epaulette(1),
      };
    },
  });
  T({
    id: 'top_plaid', name: 'חולצת משבצות', tags: ['cowgirl', 'nature'], color: '#e0435f',
    draw(R, P, ctx) {
      const { cx, sY, nk } = R;
      const o = { neck: 'v', nd: 20, nw: nk + 9, hem: hemOf(R, ctx, R.hipY + 13), ease: 3.2, fit: 0.3 };
      const d = R.top(o), pl = K.plaid(ctx, DU.dark(P.base, 0.5), WHITE, 22), lt = DU.light(P.base, 0.4);
      const pocket = (sg) => p(`M${n(cx + sg * 12)} ${n(sY + 46)}h${sg * 19}v7l${-sg * 9.5} 5l${-sg * 9.5} -5Z`, lt, P.line, 1.5) + dot(cx + sg * 21.5, sY + 53, 1.7, WHITE, P.line, 0.9);
      return {
        body: fillp(d, P) + K.over(d, pl) + p(d, 'none', P.line, 2.4) + p(`M${cx} ${n(sY + 20)}V${n(o.hem)}`, 'none', P.line, 1.6) + buttons(cx, sY + 30, Math.min(o.hem - 8, R.hipY), ctx.tucked ? 3 : 4, WHITE, P.line) +
          pocket(1) + pocket(-1) + collar(R, lt, P.line, true),
        sleeves: [-1, 1].map((s) => patSleeve(R, s, { len: 0.5, ease: 3.6 }, P, pl) + cuff(R, s, 0.5, 3.8, lt, P.line, 10)).join(''),
      };
    },
  });
  T({
    id: 'top_vest', name: 'וסט בוקרים', tags: ['cowgirl'], color: '#a8703d', noTuck: true,
    draw(R, P) {
      const { cx, sY, nk, waistY, hipY } = R;
      const W = { fill: WHITE, line: '#8a8fa8' };
      const so = { neck: 'v', nd: 17, nw: nk + 8, hem: hipY + 10, ease: 2.6 };
      const hemV = waistY + 22, v = vestPanel(R, hemV), dk = DU.dark(P.base, 0.25);
      let fr = '';
      for (let dx = v.inner + 1.5; dx <= v.xe - 1; dx += 5.2) fr += `M${n(cx + dx)} ${n(hemV + v.pt * (1 - (dx - v.inner) / (v.xe - v.inner)))}v12`;
      const panel = p(fr, 'none', dk, 2.2) + fillp(v.d, P) + stitch(`M${n(cx + 12.5)} ${n(sY + 62)}Q${n(cx + 15)} ${n(hemV - 20)} ${n(cx + v.inner + 4)} ${n(hemV)}`, '#ffe9b8', 0.9);
      return {
        body: fillp(R.top(so), W) + p(`M${cx} ${n(sY + 17)}V${n(so.hem)}`, 'none', W.line, 1.4) + buttons(cx, sY + 28, hipY, 4, WHITE, W.line) + collar(R, WHITE, W.line, true),
        sleeves: sleeves(R, W, { len: 0.3, ease: 3, puff: 2 }) + DU.both(cx, panel) + DU.star(cx + 27, sY + 62, 7, GOLD, GOLD_L, 1.3) + dot(cx + 27, sY + 62, 1.6, GOLD_L),
      };
    },
  });
  T({
    id: 'top_aloha', name: 'חולצת הוואי', tags: ['hawaii', 'beach'], color: '#ff6f91',
    draw(R, P, ctx) {
      const { cx, sY, nk } = R;
      const o = { neck: 'v', nd: 24, nw: nk + 10, hem: hemOf(R, ctx, R.hipY + 15), ease: 4.5, fit: 0.55 };
      const d = R.top(o), hb = hibiscus(ctx, WHITE, '#fff3a8', DU.mix(P.base, '#2fae7a', 0.75)), lt = DU.light(P.base, 0.35);
      return {
        body: fillp(d, P) + K.over(d, hb) + p(d, 'none', P.line, 2.4) + p(`M${cx} ${n(sY + 24)}V${n(o.hem)}`, 'none', P.line, 1.6) + buttons(cx, sY + 36, Math.min(o.hem - 9, R.hipY + 4), ctx.tucked ? 3 : 4, WHITE, P.line) + collar(R, lt, P.line, true),
        sleeves: [-1, 1].map((s) => patSleeve(R, s, { len: 0.34, ease: 4.6 }, P, hb) + seam(DU.tube(R.armSpine(s, 0.29, 0.295, 5), 0, 0), P, 0.5)).join(''),
      };
    },
  });
  T({
    id: 'top_neon', name: 'סווטשירט ניאון', tags: ['retro', 'sport'], color: '#d05fb8', noTuck: true,
    draw(R, P, ctx) {
      const { cx, sY, nk, hipY } = R;
      const o = { neck: 'boat', nd: 10, nw: nk + 18, hem: hipY + 18, ease: 7.5, fit: 0.85 };
      const d = R.top(o), id = ctx.id('cl');
      const c1 = '#ffe14d', c2 = '#4de1ff';
      const shapes = `<path d="M${cx - 36} ${n(sY + 44)}l17 -24l15 24Z" fill="${c1}"/><circle cx="${cx + 25}" cy="${n(sY + 42)}" r="11" fill="${c2}"/>` +
        `<path d="M${cx - 34} ${n(sY + 74)}l9 -9l9 9l9 -9l9 9l9 -9l9 9l9 -9" fill="none" stroke="${WHITE}" stroke-width="4.5"/>` +
        `<rect x="${cx - 40}" y="${n(sY + 90)}" width="20" height="20" transform="rotate(18 ${cx - 30} ${n(sY + 100)})" fill="${c2}"/>` +
        `<path d="M${cx + 6} ${n(sY + 112)}h26l-13 -22Z" fill="${c1}"/><circle cx="${cx - 4}" cy="${n(sY + 96)}" r="3.5" fill="${WHITE}"/><circle cx="${cx + 40}" cy="${n(sY + 76)}" r="3.5" fill="${c1}"/>` +
        `<path d="M${cx + 30} ${n(sY + 124)}q6 -8 12 0t12 0" fill="none" stroke="${WHITE}" stroke-width="3.5"/><circle cx="${cx - 12}" cy="${n(sY + 126)}" r="6" fill="none" stroke="${c1}" stroke-width="3.5"/>`;
      return {
        body: fillp(d, P) + DU.clip(id, d, shapes) + p(d, 'none', P.line, 2.4) + p(R.neckD(o), 'none', c2, 5) + p(R.neckD(o), 'none', P.line, 1.1) + p(R.band(o.hem - 10, o.hem, 8.5), c2, P.line, 2),
        sleeves: sleeves(R, P, { len: 0.9, ease: 6.5 }, (s) => armBand(R, s, 0.42, 6.6, c1, null, 0.02) + cuff(R, s, 0.9, 5.5, c2, P.line, 10)),
      };
    },
  });
  T({
    id: 'top_wrap', name: 'חולצת בלט', tags: ['ballet', 'sport'], color: '#ffc1d9',
    draw(R, P, ctx) {
      const { cx, sY, nk, waistY, wa } = R;
      const o = { neck: 'v', nd: 46, nw: nk + 12, hem: ctx.tucked ? waistY + 20 : waistY + 12, ease: 2.2 };
      const lt = DU.light(P.base, 0.5);
      return {
        body: fillp(R.top(o), P) + p(`M${cx} ${n(sY + 46)}Q${n(cx + wa * 0.6)} ${n(waistY - 14)} ${n(cx + wa + 2)} ${n(waistY + 4)}`, 'none', P.line, 1.8) + p(R.neckD(o), 'none', lt, 4.2) + p(R.neckD(o), 'none', P.line, 1.1) +
          (ctx.tucked ? '' : p(R.band(o.hem - 6, o.hem, 2.6), lt, P.line, 1.8)),
        sleeves: sleeves(R, P, { len: 0.88, ease: 2.2 }, (s) => seam(DU.tube(R.armSpine(s, 0.83, 0.835, 2.4), 0, 0), P, 0.5)) + DU.bow(cx + wa + 3, waistY + 5, 8.5, lt, P.line, true),
      };
    },
  });
  T({
    id: 'top_pirate', name: 'חולצת פיראטים', tags: ['pirate'], color: '#e0435f',
    draw(R, P, ctx) {
      const { cx, sY, nk, waistY } = R;
      const W = { fill: WHITE, line: '#8a8fa8' };
      const o = { neck: 'v', nd: 34, nw: nk + 10, hem: hemOf(R, ctx, R.hipY + 12), ease: 4.5, fit: 0.45 };
      const ny = R.shY(o.nw) - 2, vw = (y) => Math.max(0, o.nw * (1 - (y - ny) / (sY + o.nd - ny)));
      let lace = '';
      for (const y of [sY + 6, sY + 15, sY + 24]) lace += `M${n(cx - vw(y))} ${n(y)}L${n(cx + vw(y + 9))} ${n(y + 9)}M${n(cx + vw(y))} ${n(y)}L${n(cx - vw(y + 9))} ${n(y + 9)}`;
      const hemV = waistY + 10, v = vestPanel(R, hemV, { inner: 17, point: 9, neck: 12 });
      const panel = fillp(v.d, P) + p(`M${n(cx + 13.5)} ${n(sY + 62)}Q${n(cx + 17)} ${n(hemV - 14)} ${n(cx + v.inner + 3.5)} ${n(hemV + 3)}`, 'none', GOLD, 1.8) + dot(cx + 22, sY + 70, 2.3, GOLD, GOLD_L) + dot(cx + 23.5, sY + 82, 2.3, GOLD, GOLD_L);
      const blouse = (s) => { const so = { len: 0.9, ease: 3.5, puff: 7, bell: 5 }; return fillp(R.sleeve(s, so), W) + cuff(R, s, 0.9, 2.2, WHITE, W.line, 7) + armBand(R, s, 0.955, 6.5, WHITE, W.line, 0.02); };
      return {
        body: fillp(R.top(o), W) + p(lace, 'none', '#8a5a3a', 1.7) + p(R.neckD(o), 'none', WHITE, 4.5) + p(R.neckD(o), 'none', W.line, 1.1) +
          (ctx.tucked ? '' : frill(cx, o.hem, R.side(o.hem) + 5, 6, WHITE, W.line)),
        sleeves: blouse(-1) + blouse(1) + DU.both(cx, panel),
      };
    },
  });
  T({
    id: 'top_space', name: 'ג׳קט חלל', tags: ['space'], color: '#5cc8ff', noTuck: true,
    draw(R, P, ctx) {
      const { cx, sY, nk, waistY } = R;
      const S = ctx.paint('silver', [cx - 90, sY - 20, 180, 170]);
      const o = { neck: 'round', nd: 5, nw: nk + 9, hem: waistY + 18, ease: 5, fit: 0.7 };
      const d = R.top(o), id = ctx.id('cl');
      const yoke = `<path d="M${cx - 130} ${n(sY - 40)}H${cx + 130}V${n(sY + 30)}L${cx} ${n(sY + 50)}L${cx - 130} ${n(sY + 30)}Z" fill="${P.fill}"/><path d="M${cx - 130} ${n(sY + 36)}L${cx} ${n(sY + 56)}L${cx + 130} ${n(sY + 36)}" fill="none" stroke="${WHITE}" stroke-width="3"/>`;
      const neck = DU.sym(cx, [[0, sY - 15], [nk + 4, sY - 15], [nk + 9, sY - 3, nk + 9, sY + 3, nk + 6, sY + 7], [nk * 0.5, sY + 12, 0, sY + 12]]);
      let quilt = '';
      for (let y = sY + 74; y < o.hem - 12; y += 15) quilt += `M${n(cx - R.side(y) - 6)} ${n(y)}Q${cx} ${n(y + 6)} ${n(cx + R.side(y) + 6)} ${n(y)}`;
      const planet = (x, y) => `<ellipse cx="${n(x)}" cy="${n(y)}" rx="12" ry="3.6" transform="rotate(-18 ${n(x)} ${n(y)})" fill="none" stroke="${WHITE}" stroke-width="2"/>` + dot(x, y, 6.5, '#ffd24d', GOLD_L, 1.2) + `<path d="M${n(x - 11)} ${n(y + 3.5)}q11 5 22 -7" fill="none" stroke="${WHITE}" stroke-width="2"/>`;
      return {
        body: p(d, S.fill, S.line) + DU.clip(id, d, yoke) + p(d, 'none', S.line, 2.4) + p(quilt, 'none', S.line, 1.4, 'stroke-opacity=".4"') + p(`M${cx} ${n(sY + 10)}V${n(o.hem)}`, 'none', S.line, 2) +
          `<rect x="${cx - 2.5}" y="${n(sY + 12)}" width="5" height="9" rx="2" fill="${WHITE}" stroke="${S.line}" stroke-width="1.2"/>` + planet(cx + 24, sY + 76) + p(neck, P.fill, P.line, 2.2) +
          p(R.band(o.hem - 9, o.hem, 6), P.fill, P.line, 2) + DU.sparkle(cx - 26, sY + 82, 6, WHITE) + DU.sparkle(cx - 34, sY + 20, 4, WHITE),
        sleeves: [-1, 1].map((s) => p(R.sleeve(s, { len: 0.94, ease: 4.8 }), S.fill, S.line) + armBand(R, s, 0.5, 4.9, P.fill, P.line, 0.04) + cuff(R, s, 0.94, 4.4, P.fill, P.line, 9)).join(''),
      };
    },
  });
  T({
    id: 'top_polo', name: 'חולצת פולו', tags: ['school', 'sport', 'british'], color: '#3fbf9a',
    draw(R, P, ctx) {
      const { cx, sY, nk } = R;
      const o = { neck: 'v', nd: 19, nw: nk + 8, hem: hemOf(R, ctx, R.hipY + 10), ease: 2.8 };
      const lt = DU.light(P.base, 0.55);
      return {
        body: fillp(R.top(o), P) + p(`M${cx - 4.5} ${n(sY + 17)}h9v25h-9Z`, P.fill, P.line, 1.5) + buttons(cx, sY + 26, sY + 36, 2, WHITE, P.line) + collar(R, lt, P.line, true) +
          DU.star(cx + 22, sY + 50, 5, WHITE, null) + (ctx.tucked ? '' : seam(`M${n(cx - R.hp - 1)} ${n(o.hem - 5)}H${n(cx + R.hp + 1)}`, P)),
        sleeves: sleeves(R, P, { len: 0.3, ease: 3 }, (s) => cuff(R, s, 0.3, 3, lt, P.line, 6)),
      };
    },
  });
  T({
    id: 'top_ruffle', name: 'חולצת מלמלה', tags: ['paris', 'party'], color: '#ffffff',
    draw(R, P, ctx) {
      const { cx, sY, nk } = R;
      const o = { neck: 'round', nd: 6, nw: nk + 8, hem: hemOf(R, ctx, R.hipY + 8), ease: 2.8 };
      const acc = DU.lum(P.base) > 0.8 ? '#3a3346' : WHITE;
      const soft = DU.mix(P.line, P.base, 0.2);
      /* one ruffle of the jabot: a little trapezoid with a scalloped lower edge and fold lines */
      const tier = (y0, y1, w, c) => {
        const wb = w + 1.5, st = wb / c;
        let folds = '';
        for (let j = 1; j < c; j++) folds += `M${n(cx + wb - st * j)} ${n(y1)}v-7M${n(cx - wb + st * j)} ${n(y1)}v-7`;
        return p(DU.sym(cx, [[0, y0], [w, y0], [wb, y1], ...DU.scallopSegs(wb, y1, c, 6)]), P.fill, soft, 1.7) + p(folds + `M${cx} ${n(y1)}v-7`, 'none', soft, 1.2, 'stroke-opacity=".6"');
      };
      const jabot = tier(sY + 49, sY + 62, 8, 2) + tier(sY + 37, sY + 51, 12, 3) + tier(sY + 25, sY + 39, 16, 3) + tier(sY + 12, sY + 27, 20, 4);
      return {
        body: fillp(R.top(o), P) + jabot + collar(R, P.fill, P.line) + DU.bow(cx, sY + 12, 8, acc, DU.line(acc), true) + (ctx.tucked ? '' : frill(cx, o.hem, R.hp + 4, 6, P.fill, P.line)),
        sleeves: sleeves(R, P, { len: 0.62, ease: 3, puff: 5, cap: 1 }, (s) => armBand(R, s, 0.66, 6, P.fill, P.line, 0.03) + cuff(R, s, 0.62, 2.4, P.fill, P.line, 6)),
      };
    },
  });
  T({
    id: 'top_bunny', name: 'סוודר ארנב', tags: ['kawaii', 'winter'], color: '#ffc1d9',
    draw(R, P, ctx) {
      const { cx, sY, nk } = R;
      const o = { neck: 'round', nd: 8, nw: nk + 10, hem: hemOf(R, ctx, R.hipY + 14), ease: 4.5, fit: 0.5 };
      const d = R.top(o), kn = K.knit(ctx, P.line), lt = DU.light(P.base, 0.55);
      const bx = cx, by = sY + 60, L = '#8a7fa8';
      const ear = (sg) => `<ellipse cx="${bx + sg * 8.5}" cy="${n(by - 21)}" rx="5.6" ry="13" transform="rotate(${sg * 12} ${bx + sg * 8.5} ${n(by - 21)})" fill="${WHITE}" stroke="${L}" stroke-width="1.5"/><ellipse cx="${bx + sg * 8.5}" cy="${n(by - 21)}" rx="2.5" ry="8.5" transform="rotate(${sg * 12} ${bx + sg * 8.5} ${n(by - 21)})" fill="#ffb3cf"/>`;
      const bunny = ear(-1) + ear(1) + `<ellipse cx="${bx}" cy="${n(by)}" rx="18" ry="14.5" fill="${WHITE}" stroke="${L}" stroke-width="1.5"/>` + dot(bx - 7, by - 2, 2.2, '#3a3346') + dot(bx + 7, by - 2, 2.2, '#3a3346') + dot(bx - 7.6, by - 2.8, 0.8, WHITE) + dot(bx + 6.4, by - 2.8, 0.8, WHITE) +
        `<path d="${DU.heartD(bx, by + 3.2, 2.6)}" fill="#ff6f91"/><path d="M${bx - 3.4} ${n(by + 6.5)}q1.7 2.6 3.4 0q1.7 2.6 3.4 0" fill="none" stroke="${L}" stroke-width="1.3"/>` +
        `<circle cx="${bx - 12.5}" cy="${n(by + 4)}" r="3" fill="#ff8fb0" fill-opacity=".6"/><circle cx="${bx + 12.5}" cy="${n(by + 4)}" r="3" fill="#ff8fb0" fill-opacity=".6"/>`;
      return {
        body: fillp(d, P) + K.over(d, kn) + p(d, 'none', P.line, 2.4) + p(R.neckD(o), 'none', lt, 5) + p(R.neckD(o), 'none', P.line, 1.1) + bunny + (ctx.tucked ? '' : p(R.band(o.hem - 9, o.hem, 5.5), lt, P.line, 2)),
        sleeves: [-1, 1].map((s) => patSleeve(R, s, { len: 0.95, ease: 4.5 }, P, kn) + cuff(R, s, 0.95, 4, lt, P.line, 9)).join(''),
      };
    },
  });
  T({
    id: 'top_tiedye', name: 'חולצת טאי־דאי', tags: ['retro', 'beach', 'hawaii'], color: '#ff8fc7', fixed: true,
    draw(R, P, ctx) {
      const { cx, sY } = R;
      const o = { neck: 'round', nd: 9, hem: hemOf(R, ctx, R.hipY + 10), ease: 2.8 };
      const d = R.top(o);
      const cols = ['#ff8fc7', '#ffb36b', '#ffe66b', '#8fe38f', '#6fd3ff', '#b796ff'];
      const burst = (x, y, r0, step, count) => { let g = ''; for (let i = count; i >= 0; i--) g += `<path d="${DU.starD(x, y, r0 + i * step, 13, 0.8, i * 11)}" fill="${cols[i % 6]}" stroke="${WHITE}" stroke-width="1.2" stroke-opacity=".45"/>`; return g; };
      const L = DU.line('#b796ff');
      return {
        body: p(d, cols[0], L) + DU.clip(ctx.id('cl'), d, burst(cx + 4, sY + 62, 9, 13, 11)) + p(d, 'none', L, 2.4) + p(R.neckD({ nd: 13, nw: R.nk + 12 }), 'none', WHITE, 1.6, 'stroke-opacity=".7"'),
        sleeves: [-1, 1].map((s) => { const sd = R.sleeve(s, { len: 0.3, ease: 3 }), a = R.arm(0.18); return p(sd, cols[3], L) + DU.clip(ctx.id('cl'), sd, burst(cx + s * a.x, a.y, 5, 9, 6)) + p(sd, 'none', L, 2.4); }).join(''),
      };
    },
  });
  T({
    id: 'top_idol', name: 'ג׳קט כוכבת', tags: ['pop', 'party'], price: 450, color: 'glitter:#b48cff', fixed: true, noTuck: true,
    draw(R, P, ctx) {
      const { cx, sY, nk, sh, waistY } = R;
      const G = ctx.paint('gold', [cx - 80, sY - 10, 160, 130]);
      const o = { neck: 'round', nd: 4, nw: nk + 8, hem: waistY + 8, ease: 3.6, fit: 0.3, hemCurve: 9 };
      const neck = DU.sym(cx, [[0, sY - 12], [nk + 4, sY - 12], [nk + 8, sY - 2, nk + 8, sY + 3, nk + 5, sY + 6], [nk * 0.5, sY + 10, 0, sY + 10]]);
      const braid = [[26, 23], [41, 19.5], [56, 16]].map(([dy, w]) => p(`M${n(cx - w)} ${n(sY + dy)}Q${cx} ${n(sY + dy + 4)} ${n(cx + w)} ${n(sY + dy)}`, 'none', GOLD_L, 4.6) + p(`M${n(cx - w)} ${n(sY + dy)}Q${cx} ${n(sY + dy + 4)} ${n(cx + w)} ${n(sY + dy)}`, 'none', GOLD, 2.8) + dot(cx - w, sY + dy, 2.8, GOLD, GOLD_L) + dot(cx + w, sY + dy, 2.8, GOLD, GOLD_L)).join('');
      const x1 = nk + 15, x2 = sh + 3;
      const epaulette = (s) => {
        let fr = '';
        for (let x = x1 + 9; x <= x2; x += 3.6) fr += `M${n(cx + s * x)} ${n(R.shY(x) + 2)}v8`;
        return p(fr, 'none', GOLD_L, 2.6) + p(fr, 'none', GOLD, 1.4) + p(`M${n(cx + s * x1)} ${n(R.shY(x1) - 4)}Q${n(cx + s * (x1 + x2) / 2)} ${n(R.shY((x1 + x2) / 2) - 8)} ${n(cx + s * x2)} ${n(R.shY(x2) - 3)}L${n(cx + s * (x2 + 1))} ${n(R.shY(x2) + 4)}L${n(cx + s * x1)} ${n(R.shY(x1) + 3)}Z`, G.fill, G.line, 1.6);
      };
      return {
        body: fillp(R.top(o), P) + p(`M${cx} ${n(sY + 10)}V${n(o.hem + 9)}`, 'none', P.line, 1.6) + braid + p(neck, G.fill, G.line, 2) + DU.sparkle(cx - 30, sY + 74, 5, WHITE) + DU.sparkle(cx + 32, sY + 70, 4, WHITE),
        sleeves: sleeves(R, P, { len: 0.94, ease: 3.6 }, (s) => cuff(R, s, 0.94, 3.4, G.fill, G.line, 10) + armBand(R, s, 0.87, 3.8, GOLD, GOLD_L, 0.012)) + epaulette(-1) + epaulette(1),
      };
    },
  });

  /* ============================== BOTTOMS ============================== */
  Bt({
    id: 'bt_hula', name: 'חצאית הולה', tags: ['hawaii', 'beach'], color: '#8bdc7a',
    draw(R, P) {
      const { cx, waistY } = R;
      const top = waistY + 6;
      const strands = (w, y) => { const segs = [], c = 9, st = w / c; for (let i = 0; i < c; i++) { const x0 = w - st * i, x1 = w - st * (i + 1); segs.push([(x0 + x1) / 2 + 1.5, y + 14], [Math.max(0, x1), y - 5]); } return segs; };
      const o = { top, len: 82, flare: 30, bell: 5, hemSegs: strands }, k = skirtDims(R, o), d = R.skirt(o);
      const kk = 8, xt = (i) => cx + (i / (kk + 0.6)) * k.w0, xh = (i) => cx + (i / (kk + 0.4)) * k.w1;
      let wedges = '';
      for (let i = -kk; i < kk; i += 2) wedges += `M${n(xt(i))} ${n(k.top + 6)}L${n(xt(i + 1))} ${n(k.top + 6)}L${n(xh(i + 1))} ${n(k.hem + 2)}L${n(xh(i))} ${n(k.hem + 2)}Z`;
      const fcol = ['#ff6f91', '#ffd24d', WHITE, '#ffd24d', '#ff6f91'];
      const flowers = [-0.84, -0.42, 0, 0.42, 0.84].map((t, i) => DU.flower(cx + t * k.w0, top + 4 + Math.abs(t) * 1.5, 6.6, fcol[i], i === 2 ? '#ff9a56' : '#fff3a8')).join('');
      return fillp(d, P) + ov(wedges, 'fill="#1f6b3a" fill-opacity=".16" stroke="none"') + pleats(R, k.top, k.hem, k.w0, k.w1, kk, P, 0.4) + p(R.band(top - 2, top + 8, 3), DU.dark(P.base, 0.2), P.line, 2) + flowers;
    },
  });
  Bt({
    id: 'bt_denimskirt', name: 'חצאית ג׳ינס', tags: ['school', 'rock', 'cowgirl'], color: '#5c8fd6',
    draw(R, P) {
      const { cx, hp } = R;
      const o = { len: 66, flare: 13, hemCurve: 3 }, k = skirtDims(R, o), d = R.skirt(o);
      const hemD = `M${n(cx - k.w1 + 2)} ${n(k.hem - 4)}Q${cx} ${n(k.hem + 2.5)} ${n(cx + k.w1 - 2)} ${n(k.hem - 4)}`;
      let fray = '';
      for (let dx = -k.w1 + 4; dx <= k.w1 - 4; dx += 5) fray += `M${n(cx + dx)} ${n(k.hem + 3 * (1 - Math.pow(dx / k.w1, 2)))}v4`;
      return p(fray, 'none', DU.light(P.base, 0.55), 1.8) + fillp(d, P) + p(hemD, 'none', DU.light(P.base, 0.4), 4.5) +
        stitch(`M${n(cx - hp + 5)} ${n(k.top + 13)}q4 15 19 17M${n(cx + hp - 5)} ${n(k.top + 13)}q-4 15 -19 17M${cx} ${n(k.top + 10)}V${n(k.hem - 8)}`, '#ffe9b8') +
        buttons(cx + 5, k.top + 20, k.hem - 14, 3, '#ffd98a', P.line) + waistband(R, k.top - 2, 10, P.fill, P.line, 3.4) +
        [-1, 1].map((s) => p(`M${n(cx + s * 18)} ${n(k.top - 3)}v12`, 'none', P.line, 3.4) + p(`M${n(cx + s * 18)} ${n(k.top - 3)}v12`, 'none', P.fill, 1.6)).join('') +
        dot(cx, k.top + 3, 2.8, '#ffd98a', P.line, 1);
    },
  });
  Bt({
    id: 'bt_flare', name: 'מכנסי פעמון', tags: ['retro', 'pop'], color: '#ff9a56',
    draw(R, P, ctx) {
      const { cx, waistY, ankleY, crotchY, kneeY } = R;
      const top = waistY + 2, yBot = ankleY + 2, ds = bellLegs(R, top, yBot, 2.6, 32);
      const lt = DU.light(P.base, 0.4);
      const bands = `<rect x="${cx - 160}" y="${n(yBot - 27)}" width="320" height="7" fill="${WHITE}"/><rect x="${cx - 160}" y="${n(yBot - 15)}" width="320" height="7" fill="${GOLD}"/>`;
      return DU.union(ds, P.fill, P.line) + [1, 2].map((i) => DU.clip(ctx.id('cl'), ds[i], bands)).join('') +
        seam(`M${cx} ${n(top + 12)}V${n(crotchY + 6)}`, P) + [-1, 1].map((s) => seam(`M${n(cx + s * 26)} ${n(crotchY + 20)}L${n(cx + s * 25.5)} ${n(kneeY)}L${n(cx + s * 28)} ${n(yBot - 30)}`, P, 0.3)).join('') +
        waistband(R, top - 2, 13, lt, P.line, 3.4) + buttons(cx, top + 2, top + 8, 2, WHITE, P.line) + DU.star(cx - 26, kneeY + 26, 7.5, GOLD, P.line, 1.3);
    },
  });
  Bt({
    id: 'bt_cargo', name: 'מכנסי כיסים', tags: ['sport', 'nature', 'rock'], color: '#9aa86b',
    draw(R, P) {
      const { cx, waistY, ankleY, crotchY, kneeY } = R;
      const top = waistY + 6, e = 6, yBot = ankleY - 12, ds = R.pantsDs({ top, ease: e, yBot });
      const dk = DU.dark(P.base, 0.22), lt = DU.light(P.base, 0.3);
      const pocket = (s) => {
        const y = crotchY + 44, l = R.leg(y + 14), outer = cx + s * (l.x + l.w + e), x = s > 0 ? outer - 19 : outer - 3;
        return `<rect x="${n(x)}" y="${n(y)}" width="22" height="31" rx="3" fill="${P.fill}" stroke="${P.line}" stroke-width="1.8"/><path d="M${n(x + 11)} ${n(y + 9)}v22" fill="none" stroke="${P.line}" stroke-width="1.2" stroke-opacity=".4"/>` +
          `<rect x="${n(x - 1)}" y="${n(y - 2)}" width="24" height="10" rx="3" fill="${lt}" stroke="${P.line}" stroke-width="1.8"/>` + dot(x + 11, y + 3, 1.8, dk);
      };
      const knee = [-1, 1].map((s) => { const l = R.leg(kneeY); return `M${n(cx + s * l.x - l.w - e)} ${n(kneeY - 4)}q${n(l.w + e)} 7 ${n((l.w + e) * 2)} 0`; }).join('');
      return DU.union(ds, P.fill, P.line) + legCuffs(R, ankleY - 11, 12, 4, dk, P.line, 4) + seam(knee, P, 0.45) + pocket(-1) + pocket(1) +
        waistband(R, top - 2, 10, dk, P.line, e) + p(`M${cx - 5} ${n(top + 8)}q-2 10 -6 15M${cx + 5} ${n(top + 8)}q2 10 6 15`, 'none', WHITE, 2.2) + seam(`M${cx} ${n(top + 10)}V${n(crotchY + 6)}`, P);
    },
  });
  Bt({
    id: 'bt_fringe', name: 'חצאית פרנזים', tags: ['cowgirl'], color: '#a8703d',
    draw(R, P) {
      const { cx, hipY } = R;
      const o = { len: 62, flare: 18, hemCurve: 4 }, k = skirtDims(R, o), d = R.skirt(o);
      const dk = DU.dark(P.base, 0.25);
      let fr = '', fr2 = '';
      for (let dx = -k.w1 + 2; dx <= k.w1 - 2; dx += 4.6) fr += `M${n(cx + dx)} ${n(k.hem - 1 + 4 * (1 - Math.pow(dx / k.w1, 2)))}v13`;
      const yy = hipY - 2, wy = R.side(yy) + 6;
      for (let dx = -wy + 3; dx <= wy - 3; dx += 4.6) fr2 += `M${n(cx + dx)} ${n(yy + 7 * (1 - Math.pow(dx / wy, 2)))}v8`;
      const yoke = `M${n(cx - wy)} ${n(yy)}Q${cx} ${n(yy + 14)} ${n(cx + wy)} ${n(yy)}`;
      return p(fr, 'none', dk, 2.2) + fillp(d, P) + p(fr2, 'none', dk, 2) + p(yoke, 'none', P.line, 1.6) + stitch(`M${n(cx - wy + 2)} ${n(yy - 4)}Q${cx} ${n(yy + 10)} ${n(cx + wy - 2)} ${n(yy - 4)}`, '#ffe9b8', 0.9) +
        waistband(R, k.top - 2, 10, dk, P.line, 3.4) + `<ellipse cx="${cx}" cy="${n(k.top + 3)}" rx="9" ry="6.5" fill="${GOLD}" stroke="${GOLD_L}" stroke-width="1.5"/>` + DU.star(cx, k.top + 3, 3.6, WHITE, null) +
        dot(cx - 22, k.top + 3, 2.2, GOLD, GOLD_L) + dot(cx + 22, k.top + 3, 2.2, GOLD, GOLD_L);
    },
  });
  Bt({
    id: 'bt_pirate', name: 'מכנסי פיראטים', tags: ['pirate'], color: '#e0435f',
    draw(R, P, ctx) {
      const { cx, waistY, crotchY, kneeY, wa } = R;
      const top = waistY + 6, yBot = kneeY + 20, e = 5;
      const ds = R.pantsDs({ top, ease: e, yBot });
      const st = K.stripes(ctx, WHITE, 15, 6.5, 90, 0.92), dk = DU.dark(P.base, 0.3);
      const tx = cx + wa + 3, ty = top + 5;
      const tail = (dx, len) => p(`M${n(tx - 3)} ${n(ty)}C${n(tx + dx * 0.4)} ${n(ty + len * 0.4)} ${n(tx + dx)} ${n(ty + len * 0.7)} ${n(tx + dx + 3)} ${n(ty + len)}L${n(tx + dx - 6)} ${n(ty + len - 3)}C${n(tx + dx * 0.5 - 5)} ${n(ty + len * 0.6)} ${n(tx - 6)} ${n(ty + len * 0.3)} ${n(tx - 3)} ${n(ty)}Z`, GOLD, GOLD_L, 1.8);
      return DU.union(ds, P.fill, P.line) + K.over(ds, st) + p(`M${cx} ${n(top + 10)}V${n(crotchY + 8)}`, 'none', P.line, 1.4, 'stroke-opacity=".5"') + p(`M${cx} ${n(crotchY + 8)}V${n(yBot - 5)}`, 'none', P.line, 2.2) + legCuffs(R, yBot - 1, 10, e - 1.5, dk, P.line, 4) +
        [-1, 1].map((s) => { const l = R.leg(yBot); return dot(cx + s * (l.x + l.w + e - 3), yBot - 1, 2, GOLD, GOLD_L); }).join('') +
        tail(10, 34) + tail(2, 40) + p(R.band(top - 3, top + 11, 4.5), GOLD, GOLD_L, 2) + p(`M${n(cx - wa)} ${n(top + 4)}Q${cx} ${n(top + 9)} ${n(cx + wa)} ${n(top + 3)}`, 'none', GOLD_L, 1.2, 'stroke-opacity=".6"') +
        `<ellipse cx="${n(tx - 2)}" cy="${n(ty)}" rx="5" ry="6" fill="${GOLD}" stroke="${GOLD_L}" stroke-width="1.8"/>`;
    },
  });
  Bt({
    id: 'bt_tiered', name: 'חצאית קומות', tags: ['paris', 'party', 'kawaii'], color: '#ffc1d9',
    draw(R, P) {
      const { cx, waistY } = R;
      const top = waistY + 4;
      const tier = (len, flare, bell) => R.skirt({ top, len, flare, bell, hemSegs: (w, y) => DU.scallopSegs(w, y, Math.max(4, Math.round(w / 11)), 7) });
      const t3 = tier(70, 36, 10), t2 = tier(46, 27, 8), t1 = tier(23, 16, 5);
      const gather = (y, w) => { let g = ''; for (let dx = -w + 6; dx <= w - 6; dx += 9) g += `M${n(cx + dx)} ${n(y)}v7`; return g; };
      const k2 = skirtDims(R, { top, len: 46, flare: 27 }), k1 = skirtDims(R, { top, len: 23, flare: 16 });
      return fillp(t3, P) + ov(t3, 'fill="#43206b" fill-opacity=".13" stroke="none"') + seam(gather(k2.hem + 9, k2.w1 - 2), P, 0.35) +
        fillp(t2, P) + ov(t2, 'fill="#43206b" fill-opacity=".06" stroke="none"') + seam(gather(k1.hem + 9, k1.w1 - 2), P, 0.35) + fillp(t1, P) +
        waistband(R, top - 2, 9, DU.light(P.base, 0.5), P.line) + DU.bow(cx + R.wa - 6, top + 3, 8, DU.light(P.base, 0.55), P.line, true);
    },
  });
  Bt({
    id: 'bt_bike', name: 'מכנסי אופניים', tags: ['sport', 'retro'], color: '#5cc8ff', tight: true,
    draw(R, P) {
      const { cx, waistY, kneeY, hipY, crotchY } = R;
      const top = waistY + 6, yBot = kneeY - 10, e = 1.4, ds = R.pantsDs({ top, ease: e, yBot });
      const ac = DU.lum(P.base) > 0.7 ? '#ff5fa2' : '#ffe14d'; // a stripe that shows on any color
      const stripe = (s) => {
        const sp = [top + 9, waistY + 26, hipY - 10].map((y) => ({ x: cx + s * (R.side(y) + e - 4), y, w: 2.8 }))
          .concat(R.legSpine(s, hipY + 4, yBot - 6, e).map((q) => ({ x: q.x + s * (q.w - 4), y: q.y, w: 2.8 })));
        return `<path d="${DU.tube(sp, 0, 0)}" fill="${ac}"/>`;
      };
      return DU.union(ds, P.fill, P.line) + stripe(-1) + stripe(1) + legCuffs(R, yBot - 2, 7, e + 0.6, ac, P.line, 3) + waistband(R, top - 2, 8, ac, P.line, 2.2) + seam(`M${cx} ${n(top + 8)}V${n(crotchY + 6)}`, P, 0.4);
    },
  });
  Bt({
    id: 'bt_bermuda', name: 'מכנסי ברמודה', tags: ['british', 'school', 'paris'], color: '#8a8fa8',
    draw(R, P) {
      const { cx, waistY, kneeY, crotchY, hp } = R;
      const top = waistY + 4, yBot = kneeY - 6, e = 5;
      const ds = R.pantsDs({ top, ease: e, yBot, flare: 1.5 });
      const belt = DU.dark(P.base, 0.5), lt = DU.light(P.base, 0.3);
      const crease = [-1, 1].map((s) => `M${n(cx + s * R.leg(crotchY).x)} ${n(top + 14)}L${n(cx + s * R.leg(yBot).x)} ${n(yBot - 12)}`).join('');
      return DU.union(ds, P.fill, P.line) + seam(crease, P, 0.4) + p(`M${cx} ${n(crotchY + 8)}V${n(yBot - 9)}`, 'none', P.line, 2) + seam(`M${cx} ${n(top + 10)}V${n(crotchY + 6)}M${n(cx - hp + 6)} ${n(top + 12)}l9 20M${n(cx + hp - 6)} ${n(top + 12)}l-9 20`, P) +
        legCuffs(R, yBot - 4, 10, e + 2.8, lt, P.line, 2) + p(R.band(top - 2, top + 9, 5.6), belt, DU.line(belt), 2) +
        `<rect x="${cx - 7}" y="${n(top - 3)}" width="14" height="12" rx="2.5" fill="${GOLD}" stroke="${GOLD_L}" stroke-width="1.5"/><rect x="${cx - 3.5}" y="${n(top)}" width="7" height="6" rx="1" fill="${belt}"/>`;
    },
  });
  Bt({
    id: 'bt_space', name: 'חצאית כסופה', tags: ['space', 'pop'], color: 'silver', fixed: true,
    draw(R, P, ctx) {
      const { cx } = R;
      const o = { len: 64, flare: 28 }, k = skirtDims(R, o), d = R.skirt(o);
      const S = ctx.paint('silver', [cx - 100, k.top, 200, 90]);
      const kk = 5, xt = (i) => cx + (i / (kk + 0.6)) * k.w0, xh = (i) => cx + (i / (kk + 0.4)) * k.w1;
      let shine = '';
      for (let i = -kk; i < kk; i += 2) shine += `M${n(xt(i))} ${n(k.top + 6)}L${n(xt(i + 1))} ${n(k.top + 6)}L${n(xh(i + 1))} ${n(k.hem + 2)}L${n(xh(i))} ${n(k.hem + 2)}Z`;
      const gem = '#4de1ff';
      return p(d, S.fill, S.line) + DU.clip(ctx.id('cl'), d, `<path d="${shine}" fill="#fff" fill-opacity=".5"/>`) + pleats(R, k.top, k.hem, k.w0, k.w1, kk, S, 0.5) +
        p(`M${n(cx - k.w1 + 2)} ${n(k.hem - 5)}Q${cx} ${n(k.hem + 4)} ${n(cx + k.w1 - 2)} ${n(k.hem - 5)}`, 'none', gem, 3) + p(R.band(k.top - 2, k.top + 8, 3), '#6b7190', '#3a3f5c', 2) +
        dot(cx, k.top + 3, 4.6, gem, '#2a8fb0', 1.3) + dot(cx - 1.4, k.top + 1.6, 1.4, WHITE) + DU.sparkle(cx - 34, k.hem - 26, 5.5, WHITE) + DU.sparkle(cx + 30, k.top + 30, 4, WHITE);
    },
  });
  Bt({
    id: 'bt_ballet', name: 'חצאית בלט', tags: ['ballet'], color: '#ffc1d9',
    draw(R, P) {
      const { cx, waistY, hipY, wa } = R;
      const top = waistY + 6, o = { top, len: 66, flare: 28, bell: 8, hemCurve: 8 }, k = skirtDims(R, o);
      const back = R.skirt(o);
      const front = `M${n(cx - k.w0)} ${n(top)}L${n(cx + k.w0)} ${n(top)}C${n(cx + k.w0 + 12)} ${n(top + 22)} ${n(cx + k.w1 - 2)} ${n(hipY + 14)} ${n(cx + k.w1 - 8)} ${n(hipY + 34)}Q${n(cx - 4)} ${n(hipY + 76)} ${n(cx - k.w1 + 1)} ${n(k.hem - 3)}C${n(cx - k.w1 + 8)} ${n(hipY + 22)} ${n(cx - k.w0 - 10)} ${n(top + 26)} ${n(cx - k.w0)} ${n(top)}Z`;
      const folds = `M${n(cx + k.w0 - 4)} ${n(top + 10)}Q${n(cx + 10)} ${n(hipY + 20)} ${n(cx - 14)} ${n(hipY + 62)}M${n(cx + 6)} ${n(top + 10)}Q${n(cx - 12)} ${n(hipY + 10)} ${n(cx - 34)} ${n(hipY + 54)}M${n(cx - 16)} ${n(top + 10)}Q${n(cx - 30)} ${n(hipY)} ${n(cx - 48)} ${n(hipY + 44)}`;
      const lt = DU.light(P.base, 0.5);
      return `<path d="${back}" fill="${P.fill}" fill-opacity=".7" stroke="${P.line}" stroke-width="2"/><path d="${front}" fill="${P.fill}" fill-opacity=".78" stroke="${P.line}" stroke-width="2"/>` +
        seam(folds, P, 0.3) + ov(`M${n(cx - k.w0)} ${n(top)}L${n(cx + k.w0)} ${n(top)}L${n(cx + k.w0 + 8)} ${n(top + 16)}Q${cx} ${n(top + 24)} ${n(cx - k.w0 - 8)} ${n(top + 16)}Z`, DU.HL) +
        waistband(R, top - 2, 7, lt, P.line, 2.6) + DU.bow(cx - wa - 1, top + 2, 8, lt, P.line, true);
    },
  });
  Bt({
    id: 'bt_hakama', name: 'מכנסי חצאית יפניים', tags: ['anime'], color: '#e0435f',
    draw(R, P) {
      const { cx, waistY, ankleY, crotchY } = R;
      const top = waistY - 6, yBot = ankleY - 8, e = 7;
      const ds = R.pantsDs({ top, ease: e, yBot, flare: 16 });
      const dk = DU.dark(P.base, 0.2), lt = DU.light(P.base, 0.8);
      const fold = [[7, 11], [19, 29], [31, 47]].map(([a, b]) => [-1, 1].map((s) => `M${n(cx + s * a)} ${n(top + 14)}L${n(cx + s * b)} ${n(yBot)}`).join('')).join('');
      const shade = [-1, 1].map((s) => `M${n(cx + s * 7)} ${n(top + 14)}L${n(cx + s * 19)} ${n(top + 14)}L${n(cx + s * 29)} ${n(yBot)}L${n(cx + s * 11)} ${n(yBot)}Z`).join('');
      return DU.union(ds, P.fill, P.line) + ov(shade, 'fill="#43206b" fill-opacity=".1" stroke="none"') + seam(fold, P, 0.5) + p(`M${cx} ${n(crotchY + 26)}V${n(yBot)}`, 'none', P.line, 2) +
        p(R.band(top, top + 13, e - 1.5), dk, P.line, 2) + p(`M${n(cx - R.side(top + 6) - 4)} ${n(top + 6.5)}H${n(cx + R.side(top + 6) + 4)}`, 'none', P.line, 1.2, 'stroke-opacity=".45"') + DU.bow(cx, top + 8, 10.5, lt, P.line, true);
    },
  });
  Bt({
    id: 'bt_galaxy', name: 'טייץ גלקסיה', tags: ['space', 'magic'], price: 350, color: 'galaxy', fixed: true, tight: true,
    draw(R, P, ctx) {
      const { cx, waistY, ankleY, kneeY } = R;
      const top = waistY + 6, ds = R.pantsDs({ top, ease: 1.2, yBot: ankleY - 10 });
      const G = ctx.paint('galaxy', [cx - 70, top, 110, ankleY - top]);
      const st = K.twinkles(ctx, '#fff6c2', 30);
      return DU.union(ds, G.fill, G.line) + K.over(ds, st) + waistband(R, top - 2, 8, '#fff3b0', GOLD_L, 2.2) +
        `<path d="M${cx - 31} ${n(kneeY - 44)}a9 9 0 1 0 10 -11a7 7 0 1 1 -10 11Z" fill="#fff3b0" stroke="${GOLD_L}" stroke-width="1.1"/>` + DU.sparkle(cx + 27, kneeY - 20, 6, WHITE) + DU.sparkle(cx - 24, kneeY + 60, 4.5, WHITE) + DU.sparkle(cx + 24, kneeY + 96, 4, WHITE);
    },
  });
  Bt({
    id: 'bt_gold', name: 'חצאית זהב', tags: ['princess', 'pop'], price: 450, color: 'gold', fixed: true,
    draw(R, P, ctx) {
      const { cx } = R;
      const o = { len: 70, flare: 34, bell: 10, hemSegs: (w, y) => DU.scallopSegs(w, y, 6, 9) }, k = skirtDims(R, o), d = R.skirt(o);
      const G = ctx.paint('gold', [cx - 110, k.top, 220, 110]);
      const sc = K.scales(ctx, WHITE, 16);
      return p(d, G.fill, G.line) + K.over(d, sc) + p(d, 'none', G.line, 2.4) + ov(R.skirt({ top: k.top, len: 12, flare: 12 }), DU.HL) +
        waistband(R, k.top - 2, 9, '#fff3b0', G.line) + `<path d="${DU.heartD(cx, k.top + 3, 5.5)}" fill="#e0435f" stroke="${G.line}" stroke-width="1.3"/>` +
        DU.sparkle(cx - 40, k.hem - 22, 6.5, WHITE) + DU.sparkle(cx + 36, k.hem - 36, 5, WHITE) + DU.sparkle(cx + 8, k.hem - 12, 4, WHITE);
    },
  });

  DU.addItems(items);
})();
