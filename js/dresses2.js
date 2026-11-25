/* dresses2.js — more dresses, many of them for the style challenges. Same rules as clothes.js:
   body coordinates, drawn from the rig; a dress returns a string or { body, sleeves }.
   Every skirt reaches at least hipY + 62 so the base shorts never peek out. */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const { p, ov, n } = DU;
  const K = DU.clothKit;
  const { fillp, seam, stitch, sleeves, cuff, buttons, collar, frill, pleats, skirtDims, waistband, dressSkirt } = K;

  const W = { fill: '#ffffff', line: '#8a8fa8' };
  const trim = (d, c, P, w = 4) => p(d, 'none', c, w) + p(d, 'none', P.line, 1.1);
  const scal = (count, depth) => (w, y) => DU.scallopSegs(w, y, count, depth);
  const zig = (count, depth) => (w, y) => {
    const segs = [], st = w / count;
    for (let i = 0; i < count; i++) { const x0 = w - st * i, x1 = w - st * (i + 1); segs.push([(x0 + x1) / 2, y + depth], [Math.max(0, x1), y]); }
    return segs;
  };
  /* a print / trim color that still shows when the dress is recolored white */
  const onLight = (P, c = '#ff9ac1') => (DU.lum(P.base) > 0.85 ? c : '#ffffff');
  const dims = (R, so) => skirtDims(R, Object.assign({ top: R.waistY + 2 }, so));
  /* a little butterfly */
  function butterfly(x, y, r, c, line, rot = 0) {
    const up = (g) => `M0 0C${n(g * r * 0.25)} ${n(-r * 1.15)} ${n(g * r * 1.35)} ${n(-r * 1.0)} ${n(g * r * 1.1)} ${n(-r * 0.2)}C${n(g * r * 0.95)} ${n(r * 0.3)} ${n(g * r * 0.3)} ${n(r * 0.15)} 0 0Z`;
    const lo = (g) => `M0 ${n(r * 0.05)}C${n(g * r * 0.5)} ${n(r * 0.1)} ${n(g * r * 1.0)} ${n(r * 0.5)} ${n(g * r * 0.62)} ${n(r * 0.95)}C${n(g * r * 0.3)} ${n(r * 1.05)} ${n(g * r * 0.05)} ${n(r * 0.55)} 0 ${n(r * 0.05)}Z`;
    const dot = (g) => `<circle cx="${n(g * r * 0.68)}" cy="${n(-r * 0.42)}" r="${n(r * 0.17)}" fill="${line}" fill-opacity=".35"/>`;
    return `<g transform="translate(${n(x)} ${n(y)}) rotate(${rot})">` + [-1, 1].map((g) => `<path d="${lo(g)}" fill="${c}" stroke="${line}" stroke-width="1.4"/><path d="${up(g)}" fill="${c}" stroke="${line}" stroke-width="1.4"/>${dot(g)}`).join('') +
      `<path d="M0 ${n(-r * 0.45)}V${n(r * 0.6)}" fill="none" stroke="${line}" stroke-width="2.4"/><path d="M0 ${n(-r * 0.45)}q${n(-r * 0.3)} ${n(-r * 0.45)} ${n(-r * 0.55)} ${n(-r * 0.5)}M0 ${n(-r * 0.45)}q${n(r * 0.3)} ${n(-r * 0.45)} ${n(r * 0.55)} ${n(-r * 0.5)}" fill="none" stroke="${line}" stroke-width="1.1"/></g>`;
  }
  /* a six-armed snowflake */
  const flake = (x, y, r, c = '#ffffff', sw = 1.5) =>
    `<path d="M${n(x - r)} ${n(y)}h${n(2 * r)}M${n(x - r * 0.5)} ${n(y - r * 0.87)}l${n(r)} ${n(r * 1.74)}M${n(x + r * 0.5)} ${n(y - r * 0.87)}l${n(-r)} ${n(r * 1.74)}" fill="none" stroke="${c}" stroke-width="${sw}"/>`;
  /* big hibiscus print */
  function hibiscus(ctx, c, step = 60) {
    const one = (x, y, k) =>
      [0, 72, 144, 216, 288].map((a) => {
        const r = ((a - 90) * Math.PI) / 180, px = n(x + Math.cos(r) * 7.4 * k), py = n(y + Math.sin(r) * 7.4 * k);
        return `<ellipse cx="${px}" cy="${py}" rx="${n(5.2 * k)}" ry="${n(6.6 * k)}" transform="rotate(${a} ${px} ${py})" fill="${c}"/>`;
      }).join('') +
      `<circle cx="${n(x)}" cy="${n(y)}" r="${n(2.8 * k)}" fill="#ffd24d"/><path d="M${n(x)} ${n(y)}l${n(5 * k)} ${n(-7 * k)}" stroke="#ffb02e" stroke-width="1.6" fill="none"/><circle cx="${n(x + 5 * k)}" cy="${n(y - 7 * k)}" r="${n(1.7 * k)}" fill="#ff8a3d"/>`;
    const leaf = (x, y, a) => `<ellipse cx="${n(x)}" cy="${n(y)}" rx="7" ry="3" transform="rotate(${a} ${n(x)} ${n(y)})" fill="#7ddc8a"/>`;
    return K.pat(ctx, leaf(step * 0.52, step * 0.2, 30) + leaf(step * 0.2, step * 0.62, -40) + one(step * 0.26, step * 0.28, 1) + one(step * 0.76, step * 0.74, 0.8), step, step, 8);
  }

  const items = [];
  const D = (o) => items.push(Object.assign({ slot: 'dress' }, o));

  /* ---------- sailor uniform ---------- */
  D({
    id: 'dr_sailor', name: 'מדי מלחים', tags: ['anime', 'school'], color: '#3a4a8f',
    draw(R, P) {
      const { cx, sY, nk, sh, waistY } = R;
      const bo = { neck: 'v', nd: 36, nw: nk + 8, hem: waistY + 8, ease: 2.6 };
      const so = { len: 66, flare: 32 }, k = dims(R, so);
      const nw = nk + 8, ny = R.shY(nw) - 3, o2 = sh - 5, oy = R.shY(o2) - 2;
      const col = DU.sym(cx, [[0, sY + 36], [nw, ny], [o2, oy], [o2 + 3, sY + 28, 26, sY + 54, 0, sY + 66]]);
      const stripe = (off) => [-1, 1].map((s) => `M${n(cx + s * (o2 - 3 - off))} ${n(oy + 6 + off * 0.4)}C${n(cx + s * (o2 - 1 - off))} ${n(sY + 26 - off * 0.2)} ${n(cx + s * (23 - off * 0.4))} ${n(sY + 49 - off)} ${n(cx)} ${n(sY + 60 - off * 1.25)}`).join('');
      const sc = ['#e0435f', '#ff6f91'].includes(String(P.base).toLowerCase()) ? '#ffffff' : '#e0435f';
      const scL = DU.line(sc);
      const tail = (s) => `M${n(cx + s * 3)} ${n(sY + 63)}L${n(cx + s * 13)} ${n(sY + 92)}L${n(cx + s * 4)} ${n(sY + 87)}L${n(cx)} ${n(sY + 72)}Z`;
      return {
        body: fillp(dressSkirt(R, so), P) + pleats(R, k.top, k.hem, k.w0, k.w1, 5, P, 0.4) +
          p(`M${n(cx - k.w1 + 4)} ${n(k.hem - 9)}Q${cx} ${n(k.hem)} ${n(cx + k.w1 - 4)} ${n(k.hem - 9)}`, 'none', onLight(P, '#3a4a8f'), 2.6) +
          fillp(R.top(bo), W) + waistband(R, waistY, 7, P.fill, P.line, 2.8),
        sleeves: sleeves(R, W, { len: 0.3, ease: 3.2, puff: 3 }, (s) => cuff(R, s, 0.3, 3.2, P.fill, P.line, 7)) +
          fillp(col, P, 2.2) + p(stripe(0), 'none', onLight(P, '#3a4a8f'), 2) + p(stripe(4.5), 'none', onLight(P, '#3a4a8f'), 1.4) +
          p(tail(-1), sc, scL, 1.8) + p(tail(1), sc, scL, 1.8) + `<ellipse cx="${cx}" cy="${n(sY + 66)}" rx="6.5" ry="5.2" fill="${sc}" stroke="${scL}" stroke-width="1.8"/>`,
      };
    },
  });

  /* ---------- kimono / yukata ---------- */
  D({
    id: 'dr_kimono', name: 'קימונו', tags: ['anime'], color: '#ff9ac1',
    draw(R, P, ctx) {
      const { cx, sY, nk, waistY, hipY, ankleY } = R;
      const lt = DU.light(P.base, 0.62);
      const ob = DU.lum(P.base) > 0.5 ? DU.mix(P.base, '#c93a6e', 0.82) : DU.mix(P.base, '#ffd98a', 0.88), obL = DU.line(ob), obLt = DU.light(ob, 0.45);
      const fl = K.flowers(ctx, onLight(P), 46);
      const bo = { neck: 'v', nd: 50, nw: nk + 10, hem: waistY + 6, ease: 4, fit: 0.4 };
      const bd = R.top(bo), len = ankleY - 16 - hipY;
      const col = (top, e) => { const w0 = R.side(top) + e, pts = [[w0, top], ...(top < hipY - 12 ? [[R.hp + e + 1, hipY]] : []), [R.hp + e + 3, hipY + len * 0.55], [R.hp + e + 6, hipY + len]]; return DU.sym(cx, [[0, top], pts[0], ...DU.cr(pts), [(R.hp + e + 6) * 0.5, hipY + len + 3, 0, hipY + len + 3]]); };
      const sk = col(waistY + 2, 4);
      const ny = R.shY(nk + 10) - 2;
      const bandL = `M${n(cx - nk - 10)} ${n(ny)}L${n(cx + 5)} ${n(sY + 54)}`;
      const bandR = `M${n(cx + nk + 10)} ${n(ny)}L${n(cx - 16)} ${n(waistY - 6)}`;
      const band = (d) => p(d, 'none', P.line, 9.6, 'stroke-linecap="butt"') + p(d, 'none', lt, 6.6, 'stroke-linecap="butt"');
      const sw = R.side(waistY) + 5;
      const hemBand = col(hipY + len - 26, 4);
      return {
        body: fillp(sk, P) + K.over(sk, fl) + `<path d="${hemBand}" fill="${lt}" fill-opacity=".55"/>` + p(sk, 'none', P.line, 2.4) +
          p(`M${n(cx - 16)} ${n(waistY + 14)}L${n(cx - 9)} ${n(hipY + len + 2)}`, 'none', P.line, 1.8) +
          fillp(bd, P) + K.over(bd, fl) + p(bd, 'none', P.line, 2.4) + band(bandL) + band(bandR) +
          p(R.band(waistY - 15, waistY + 16, 5), ob, obL, 2.2) + ov(R.band(waistY + 8, waistY + 16, 5)) +
          p(`M${n(cx - sw)} ${n(waistY)}H${n(cx + sw)}`, 'none', obL, 4.6) + p(`M${n(cx - sw)} ${n(waistY)}H${n(cx + sw)}`, 'none', '#fff6dc', 2.6) +
          DU.bow(cx + 14, waistY, 11, obLt, obL),
        sleeves: [-1, 1].map((s) => { const sd = R.sleeve(s, { len: 0.86, ease: 5, bell: 22 }); return fillp(sd, P) + K.over(sd, fl) + p(sd, 'none', P.line, 2.4) + cuff(R, s, 0.86, 26, lt, P.line, 6); }).join(''),
      };
    },
  });

  /* ---------- ballet ---------- */
  D({
    id: 'dr_ballet', name: 'בגד בלט', tags: ['ballet'], color: '#ffc1d9',
    draw(R, P) {
      const { cx, sY, nk, waistY, hipY } = R;
      const lt = DU.light(P.base, 0.55);
      const bo = { neck: 'round', nd: 26, nw: nk + 9, strap: 12, hem: hipY + 16, ease: 1.8 };
      const top = waistY + 8;
      const layer = (len, flare, bell, op) => `<path d="${R.skirt({ top, len, flare, bell, hemSegs: scal(7, 8) })}" fill="${P.fill}" fill-opacity="${op}" stroke="${P.line}" stroke-width="1.8"/>`;
      return fillp(R.top(bo), P) + trim(R.neckD(bo), lt, P, 3.4) +
        layer(64, 76, 54, 0.6) + layer(50, 70, 50, 0.7) + layer(36, 60, 42, 0.82) + layer(22, 44, 28, 0.95) +
        ov(R.skirt({ top, len: 12, flare: 22, bell: 10 }), DU.HL) + waistband(R, top - 3, 8, lt, P.line, 2.4) + DU.bow(cx, sY + 32, 7, lt, P.line) +
        DU.sparkle(cx - 60, hipY + 24, 5, '#fff') + DU.sparkle(cx + 52, hipY + 38, 4, '#fff') + DU.sparkle(cx + 14, hipY + 14, 3.2, '#fff');
    },
  });

  /* ---------- tartan pinafore ---------- */
  D({
    id: 'dr_tartan', name: 'שמלת משבצות', tags: ['british', 'school'], color: '#3fbf9a',
    draw(R, P, ctx) {
      const { cx, sY, nk, waistY } = R;
      const blouse = R.top({ neck: 'round', nd: 6, nw: nk + 7, hem: waistY + 4, ease: 2 });
      const bo = { neck: 'square', nd: 38, nw: nk + 13, strap: 15, hem: waistY + 8, ease: 3 };
      const so = { len: 68, flare: 32 }, k = dims(R, so);
      const pl = K.plaid(ctx, DU.dark(P.base, 0.42), '#fff6c2', 24);
      const sk = dressSkirt(R, so), bd = R.top(bo), dk = DU.dark(P.base, 0.22);
      return {
        body: fillp(blouse, W) + fillp(sk, P) + K.over(sk, pl) + p(sk, 'none', P.line, 2.4) + pleats(R, k.top, k.hem, k.w0, k.w1, 4, P, 0.4) +
          fillp(bd, P) + K.over(bd, pl) + p(bd, 'none', P.line, 2.4) + collar(R, '#fff', W.line) +
          waistband(R, waistY, 7, dk, P.line, 3.2) + buttons(cx - 13, sY + 56, sY + 56, 1, '#ffd98a', P.line) + buttons(cx + 13, sY + 56, sY + 56, 1, '#ffd98a', P.line) +
          p(`M${cx - 3.2} ${n(sY + 14)}h6.4l2 20l-5.2 6l-5.2 -6Z`, dk, P.line, 1.6) + p(`M${cx - 4} ${n(sY + 10)}h8l-1 6h-6Z`, dk, P.line, 1.6),
        sleeves: sleeves(R, W, { len: 0.28, ease: 3, puff: 5, cap: 1 }, (s) => cuff(R, s, 0.28, 2.6, '#fff', W.line, 5)),
      };
    },
  });

  /* ---------- prairie dress ---------- */
  D({
    id: 'dr_prairie', name: 'שמלת בוקרת', tags: ['cowgirl', 'nature'], color: '#f2b56b',
    draw(R, P, ctx) {
      const { cx, sY, nk, waistY, hipY, kneeY, ch } = R;
      const lt = DU.light(P.base, 0.6), dk = DU.dark(P.base, 0.18);
      const fl = K.flowers(ctx, onLight(P), 28);
      const bo = { neck: 'round', nd: 5, nw: nk + 8, hem: waistY + 8, ease: 2.6 };
      const long = kneeY - hipY + 48, mid = long * 0.5;
      const low = dressSkirt(R, { len: long, flare: 54, bell: 8, hemSegs: scal(9, 8) });
      const up = dressSkirt(R, { len: mid, flare: 34, bell: 4, hemSegs: scal(7, 7) });
      const bd = R.top(bo);
      return {
        body: fillp(low, { fill: dk, line: P.line }) + K.over(low, fl) + p(low, 'none', P.line, 2.4) + fillp(up, P) + K.over(up, fl) + p(up, 'none', P.line, 2.4) +
          fillp(bd, P) + K.over(bd, fl) + p(bd, 'none', P.line, 2.4) + frill(cx, sY + 36, ch + 2, 7, lt, P.line, 7) +
          p(R.neckD(bo), 'none', lt, 5) + p(R.neckD(bo), 'none', P.line, 1.1) + buttons(cx, sY + 14, sY + 30, 2, '#fff', P.line) + buttons(cx, sY + 56, waistY - 4, 3, '#fff', P.line) +
          waistband(R, waistY, 8, dk, P.line, 2.8) + DU.bow(cx, waistY + 4, 8, lt, P.line),
        sleeves: [-1, 1].map((s) => { const sd = R.sleeve(s, { len: 0.52, ease: 3.2, puff: 7, cap: 1 }); return fillp(sd, P) + K.over(sd, fl) + p(sd, 'none', P.line, 2.4) + cuff(R, s, 0.53, 4.5, lt, P.line, 8); }).join(''),
      };
    },
  });

  /* ---------- hawaiian muumuu ---------- */
  D({
    id: 'dr_muumuu', name: 'שמלת הוואי', tags: ['hawaii', 'beach'], color: '#ff6f91',
    draw(R, P, ctx) {
      const { cx, nk, hipY } = R;
      const lt = DU.light(P.base, 0.55);
      const o = { neck: 'round', nd: 15, nw: nk + 13, hem: hipY + 94, ease: 5, fit: 0.9, flare: 30 };
      const d = R.top(o), hb = hibiscus(ctx, onLight(P));
      return {
        body: fillp(d, P) + K.over(d, hb) + p(d, 'none', P.line, 2.4) + frill(cx, o.hem, R.side(o.hem) + 35, 10, lt, P.line, 10) +
          p(R.neckD(o), 'none', P.line, 8.4) + p(R.neckD(o), 'none', lt, 6),
        sleeves: [-1, 1].map((s) => { const sd = R.sleeve(s, { len: 0.24, ease: 3, puff: 7, cap: 1 }); return fillp(sd, P) + K.over(sd, hb) + p(sd, 'none', P.line, 2.4) + cuff(R, s, 0.25, 5.5, lt, P.line, 7); }).join(''),
      };
    },
  });

  /* ---------- little Paris dress ---------- */
  D({
    id: 'dr_paris', name: 'שמלה שחורה קטנה', tags: ['paris', 'party'], color: '#3a3346',
    draw(R, P) {
      const { cx, sY, nk, waistY } = R;
      const dark = DU.lum(P.base) < 0.5, ac = dark ? '#e0435f' : '#3a3346';
      const bo = { neck: 'round', nd: 7, nw: nk + 8, hem: waistY + 8, ease: 2.4 };
      const so = { len: 70, flare: 30, bell: 5 };
      const sk = dressSkirt(R, so), k = dims(R, so);
      return {
        body: fillp(sk, P) +
          p(`M${n(cx - k.w1 + 5)} ${n(k.hem - 8)}Q${cx} ${n(k.hem + 1)} ${n(cx + k.w1 - 5)} ${n(k.hem - 8)}`, 'none', '#ffffff', 2, 'stroke-opacity=".85"') +
          fillp(R.top(bo), P) + buttons(cx, sY + 34, waistY - 8, 3, '#fff', P.line) + waistband(R, waistY, 6, dark ? DU.light(P.base, 0.18) : DU.dark(P.base, 0.15), P.line, 2.8) +
          collar(R, '#fff', '#8a8fa8') + DU.bow(cx, sY + 17, 9, ac),
        sleeves: sleeves(R, P, { len: 0.24, ease: 3, cap: 0.95 }, (s) => cuff(R, s, 0.24, 3, '#fff', '#8a8fa8', 6)),
      };
    },
  });

  /* ---------- doll dress ---------- */
  D({
    id: 'dr_lolita', name: 'שמלת בובה', tags: ['kawaii', 'party'], color: '#c9b6ff',
    draw(R, P) {
      const { cx, sY, nk, waistY, hipY, hp } = R;
      const lt = DU.light(P.base, 0.6), pk = '#ff9ac1', pkL = DU.line(pk);
      const bo = { neck: 'square', nd: 17, nw: nk + 14, hem: waistY + 8, ease: 2.4 };
      const lace = dressSkirt(R, { len: 84, flare: 58, bell: 18, hemSegs: scal(11, 8) });
      const sk = dressSkirt(R, { len: 72, flare: 56, bell: 18, hemSegs: scal(8, 7) });
      const apron = DU.sym(cx, [[0, waistY + 6], [R.side(waistY + 6) - 4, waistY + 6], [hp + 2, hipY + 20, 34, hipY + 60, 22, hipY + 62], ...DU.scallopSegs(22, hipY + 62, 3, 7)]);
      const bib = DU.sym(cx, [[0, sY + 30], [15, sY + 30], [18, waistY + 4], [0, waistY + 4]]);
      return {
        body: p(lace, '#ffffff', P.line, 2) + fillp(sk, P) + ov(dressSkirt(R, { len: 14, flare: 18, bell: 6 }), DU.HL) +
          [-1, 1].map((s) => DU.bow(cx + s * (hp + 30), hipY + 62, 8, pk, pkL)).join('') +
          fillp(R.top(bo), P) + trim(R.neckD(bo), '#ffffff', P, 5) + p(bib, '#ffffff', P.line, 1.8) + p(apron, '#ffffff', P.line, 1.8) +
          DU.heart(cx, hipY + 30, 8, pk, null) + waistband(R, waistY, 8, lt, P.line, 2.8) + DU.bow(cx, waistY + 4, 13, pk, pkL, true) + DU.bow(cx, sY + 24, 7, pk, pkL),
        sleeves: sleeves(R, P, { len: 0.3, ease: 3, puff: 11, cap: 1 }, (s) => cuff(R, s, 0.31, 3.5, '#ffffff', P.line, 7)),
      };
    },
  });

  /* ---------- pirate ---------- */
  D({
    id: 'dr_pirate', name: 'שמלת פיראטית', tags: ['pirate'], color: '#e0435f',
    draw(R, P, ctx) {
      const { cx, sY, nk, waistY, hipY, wa } = R;
      const dk = DU.dark(P.base, 0.4), dkL = DU.line(dk);
      const blouse = { neck: 'round', nd: 20, nw: nk + 13, hem: waistY + 8, ease: 3 };
      const st = K.stripes(ctx, DU.lum(P.base) > 0.85 ? '#e0435f' : P.fill, 20, 10, 90);
      const under = dressSkirt(R, { top: waistY + 6, len: 88, flare: 46, bell: 8, hemSegs: zig(7, 12) });
      const over = dressSkirt(R, { top: waistY + 6, len: 38, flare: 32, bell: 10, hemSegs: zig(5, 16) });
      const pts = R.sidePts(sY + 62, waistY + 12, 3);
      const vest = DU.sym(cx, [[0, sY + 70], pts[0], ...DU.cr(pts), [0, waistY + 20]]);
      let lace = '';
      for (let y = sY + 76; y < waistY + 6; y += 11) lace += `M${cx - 6} ${n(y)}L${cx + 6} ${n(y + 9)}M${cx + 6} ${n(y)}L${cx - 6} ${n(y + 9)}`;
      const sash = `M${n(cx - wa - 6)} ${n(waistY + 8)}L${n(cx + wa + 6)} ${n(waistY + 16)}L${n(cx + wa + 6)} ${n(waistY + 27)}L${n(cx - wa - 6)} ${n(waistY + 19)}Z`;
      const tails = `M${n(cx - wa - 3)} ${n(waistY + 14)}l-9 34l8 -4l5 8l5 -36Z`;
      return {
        body: fillp(under, W) + K.over(under, st) + p(under, 'none', P.line, 2.4) + fillp(over, { fill: dk, line: dkL }) +
          fillp(R.top(blouse), W) + trim(R.neckD(blouse), '#ffffff', W, 5) + frill(cx, sY + 22, nk + 9, 6, '#fff', W.line, 4) +
          p(vest, dk, dkL, 2.2) + p(`M${cx - 8} ${n(sY + 72)}V${n(waistY + 12)}M${cx + 8} ${n(sY + 72)}V${n(waistY + 12)}`, 'none', dkL, 1.2, 'stroke-opacity=".5"') + p(lace, 'none', '#ffe9b8', 1.7) +
          p(tails, '#ffd24d', '#c98a1a', 1.8) + p(sash, '#ffd24d', '#c98a1a', 2) + `<circle cx="${n(cx - wa - 1)}" cy="${n(waistY + 15)}" r="5.5" fill="#ffd24d" stroke="#c98a1a" stroke-width="1.8"/>`,
        sleeves: sleeves(R, W, { len: 0.62, ease: 3.5, puff: 8, bell: 6, cap: 1 }, (s) => cuff(R, s, 0.63, 6, '#fff', W.line, 7)),
      };
    },
  });

  /* ---------- disco ---------- */
  D({
    id: 'dr_disco', name: 'שמלת דיסקו', tags: ['retro', 'party'], color: '#d05fb8',
    draw(R, P, ctx) {
      const { cx, nk, hipY } = R;
      const o = { neck: 'round', nd: 12, nw: nk + 11, strap: 21, hem: hipY + 70, ease: 4, fit: 0.88, flare: 24 };
      const d = R.top(o);
      const wave = K.pat(ctx,
        '<path d="M-2 8Q10 -1 20 8T42 8" fill="none" stroke="#ffd24d" stroke-width="6.5"/><path d="M-2 22Q10 13 20 22T42 22" fill="none" stroke="#ffffff" stroke-width="5"/><path d="M-2 35Q10 26 20 35T42 35" fill="none" stroke="#ff9a56" stroke-width="5.5"/>', 40, 42);
      const hw = R.side(o.hem) + 4 + 24;
      return fillp(d, P) + K.over(d, wave) + p(d, 'none', P.line, 2.4) + trim(R.neckD(o), '#ffffff', P, 5) +
        p(`M${n(cx - hw + 3)} ${n(o.hem - 4)}H${n(cx + hw - 3)}`, 'none', P.line, 7.4, 'stroke-linecap="butt"') + p(`M${n(cx - hw + 3)} ${n(o.hem - 4)}H${n(cx + hw - 3)}`, 'none', '#ffffff', 5, 'stroke-linecap="butt"');
    },
  });

  /* ---------- space suit ---------- */
  D({
    id: 'dr_space', name: 'חליפת חלל', tags: ['space'], color: '#5cc8ff',
    draw(R, P, ctx) {
      const { cx, sY, nk, ankleY, crotchY, waistY, hipY, kneeY } = R;
      const S = ctx.paint('silver', [cx - 90, sY - 10, 150, ankleY - sY]);
      const o = { neck: 'round', nd: 3, nw: nk + 7, hem: crotchY, ease: 3.5, fit: 0.25 };
      const legs = [R.pantLeg(-1, ankleY - 5, 3.5, 0, hipY), R.pantLeg(1, ankleY - 5, 3.5, 0, hipY)];
      const ring = DU.sym(cx, [[0, sY - 15], [nk + 4, sY - 15], [nk + 9, sY - 3, nk + 9, sY + 3, nk + 6, sY + 7], [nk * 0.5, sY + 12, 0, sY + 12]]);
      const lt = DU.light(P.base, 0.5);
      const side = (s) => { const sp = R.legSpine(s, hipY + 6, ankleY - 20, 3.5).map((q) => ({ x: q.x + s * (q.w - 4), y: q.y, w: 2.4 })); return `<path d="${DU.tube(sp, 0, 0)}" fill="${P.fill}"/>`; };
      const knee = (s) => { const l = R.leg(kneeY); return `<ellipse cx="${n(cx + s * l.x)}" cy="${n(kneeY)}" rx="${n(l.w - 4)}" ry="7" fill="${P.fill}" stroke="${P.line}" stroke-width="1.6"/>`; };
      const anklet = (s) => { const l = R.leg(ankleY - 10); return `<rect x="${n(cx + s * l.x - l.w - 5)}" y="${n(ankleY - 17)}" width="${n(l.w * 2 + 10)}" height="12" rx="5" fill="${P.fill}" stroke="${P.line}" stroke-width="2"/>`; };
      return {
        body: DU.union([R.top(o), ...legs], S.fill, S.line) + side(-1) + side(1) + knee(-1) + knee(1) + anklet(-1) + anklet(1) +
          p(ring, P.fill, P.line, 2.2) + seam(`M${cx} ${n(sY + 12)}V${n(sY + 32)}M${cx} ${n(sY + 62)}V${n(waistY)}`, S, 0.5) +
          `<rect x="${cx - 19}" y="${n(sY + 33)}" width="38" height="26" rx="7" fill="${P.fill}" stroke="${P.line}" stroke-width="2"/>` +
          `<circle cx="${cx - 9}" cy="${n(sY + 46)}" r="4" fill="#ffd24d" stroke="${P.line}" stroke-width="1.2"/><circle cx="${cx + 2}" cy="${n(sY + 46)}" r="4" fill="#ff7fb5" stroke="${P.line}" stroke-width="1.2"/><circle cx="${cx + 12}" cy="${n(sY + 42)}" r="2.2" fill="#fff"/><circle cx="${cx + 12}" cy="${n(sY + 50)}" r="2.2" fill="#fff"/>` +
          p(R.band(waistY + 3, waistY + 14, 4.5), P.fill, P.line, 2) + `<circle cx="${cx}" cy="${n(waistY + 8.5)}" r="6.5" fill="${lt}" stroke="${P.line}" stroke-width="1.8"/>` + DU.star(cx, waistY + 8.5, 3.6, '#fff', null) +
          DU.sparkle(cx - 30, sY + 74, 4.5, '#fff') + DU.sparkle(cx + 34, hipY + 4, 3.6, '#fff'),
        sleeves: sleeves(R, S, { len: 0.95, ease: 4 }, (s) => cuff(R, s, 0.95, 4.5, P.fill, P.line, 10) + cuff(R, s, 0.5, 4.6, P.fill, P.line, 6)),
      };
    },
  });

  /* ---------- raincoat ---------- */
  D({
    id: 'dr_raincoat', name: 'מעיל גשם', tags: ['nature', 'winter'], color: '#ffd24d',
    draw(R, P) {
      const { cx, sY, nk, hipY, hp } = R;
      const lt = DU.light(P.base, 0.5), dk = DU.dark(P.base, 0.16);
      const o = { neck: 'round', nd: 8, nw: nk + 10, hem: hipY + 84, ease: 7, fit: 0.9, flare: 16 };
      const hood = DU.sym(cx, [[0, sY - 32], [nk + 20, sY - 32, nk + 32, sY - 16, nk + 32, sY - 2], [nk + 32, sY + 14, nk + 12, sY + 22, 0, sY + 24]]);
      const d = R.top(o);
      const pocket = (s) => `<path d="M${n(cx + s * 22)} ${n(hipY + 18)}h${s * 26}v20q${-s * 13} 6 ${-s * 26} 0Z" fill="${P.fill}" stroke="${P.line}" stroke-width="1.7"/><path d="M${n(cx + s * 20)} ${n(hipY + 14)}h${s * 30}v9h${-s * 30}Z" fill="${dk}" stroke="${P.line}" stroke-width="1.7"/>`;
      let tog = '';
      for (const y of [sY + 34, sY + 70, sY + 106, sY + 142]) tog += `<rect x="${cx - 13}" y="${n(y - 3.5)}" width="18" height="7" rx="3.5" fill="#ffffff" stroke="${P.line}" stroke-width="1.3"/><circle cx="${cx + 9}" cy="${n(y)}" r="3" fill="${dk}" stroke="${P.line}" stroke-width="1.2"/>`;
      return {
        body: fillp(hood, P) + ov(hood) + fillp(d, P) + p(`M${cx + 5} ${n(sY + 10)}V${n(o.hem)}`, 'none', P.line, 1.8) + tog + pocket(-1) + pocket(1) +
          p(R.neckD({ nd: 15, nw: nk + 15 }), 'none', P.line, 1.5, 'stroke-opacity=".5"') + p(R.neckD(o), 'none', P.line, 7.4) + p(R.neckD(o), 'none', lt, 5) +
          ov(`M${n(cx - hp - 12)} ${n(sY + 66)}q-5 60 -8 ${n(o.hem - sY - 80)}l7 0q1 -60 8 ${n(-(o.hem - sY - 80))}Z`, DU.HL) +
          p(`M${n(cx - R.side(o.hem) - 21)} ${n(o.hem - 6)}H${n(cx + R.side(o.hem) + 21)}`, 'none', P.line, 1.4, 'stroke-opacity=".45"'),
        sleeves: sleeves(R, P, { len: 0.93, ease: 6.5 }, (s) => cuff(R, s, 0.94, 6.5, lt, P.line, 9)),
      };
    },
  });

  /* ---------- cheerleader ---------- */
  D({
    id: 'dr_cheer', name: 'תלבושת מעודדת', tags: ['sport', 'pop'], color: '#e0435f',
    draw(R, P) {
      const { cx, sY, nk, waistY, wa, ch } = R;
      const bo = { neck: 'v', nd: 20, nw: nk + 10, strap: 23, hem: waistY + 8, ease: 2.4 };
      const so = { len: 64, flare: 38 }, k = dims(R, so);
      const gold = '#ffd24d', wt = onLight(P, '#e0435f');
      const hemLine = (dy) => `M${n(cx - k.w1 + 3 + dy * 0.3)} ${n(k.hem - 6 - dy)}Q${cx} ${n(k.hem + 3 - dy)} ${n(cx + k.w1 - 3 - dy * 0.3)} ${n(k.hem - 6 - dy)}`;
      const sideStripe = (s) => `M${n(cx + s * (ch - 1))} ${n(sY + 62)}Q${n(cx + s * (wa - 3))} ${n(waistY - 22)} ${n(cx + s * (wa - 2))} ${n(waistY + 4)}`;
      return fillp(dressSkirt(R, so), P) + pleats(R, k.top, k.hem, k.w0, k.w1, 5, P, 0.42) + p(hemLine(0), 'none', wt, 4) + p(hemLine(7), 'none', gold, 2.2) +
        fillp(R.top(bo), P) + p(sideStripe(-1) + sideStripe(1), 'none', wt, 3) + p(R.neckD(bo), 'none', P.line, 7.6) + p(R.neckD(bo), 'none', wt, 5.2) + p(R.neckD(bo), 'none', gold, 1.6) +
        waistband(R, waistY, 8, wt, P.line, 2.8) + p(`M${n(cx - wa - 3)} ${n(waistY + 4)}H${n(cx + wa + 3)}`, 'none', gold, 2) +
        DU.star(cx, sY + 62, 13, wt, null) + DU.star(cx, sY + 62, 7.5, gold, null);
    },
  });

  /* ============================ shop specials ============================ */
  D({
    id: 'dr_idol', name: 'שמלת כוכבת פופ', tags: ['pop', 'party'], price: 800, color: 'glitter:#ff7fb5', fixed: true,
    draw(R, P, ctx) {
      const { cx, sY, nk, waistY, hipY } = R;
      const P2 = ctx.paint('glitter:#b48cff');
      const G = ctx.paint('gold', [cx - 60, waistY - 10, 120, 40]);
      const bo = { neck: 'square', nd: 18, nw: nk + 14, hem: waistY + 8, ease: 2.4 };
      const lace = dressSkirt(R, { len: 86, flare: 60, bell: 18, hemSegs: scal(11, 8) });
      const mid = dressSkirt(R, { len: 72, flare: 54, bell: 18, hemSegs: scal(8, 9) });
      const top = dressSkirt(R, { len: 50, flare: 44, bell: 14, hemSegs: zig(6, 14) });
      let stars = '';
      [[-44, 30, 6], [38, 24, 7], [-6, 40, 5], [-70, 62, 5], [64, 58, 6], [10, 68, 5]].forEach(([x, y, r]) => (stars += DU.star(cx + x, hipY + y, r, '#fff3b0', '#c98a1a', 1)));
      return {
        body: p(lace, '#ffffff', P.line, 2) + fillp(mid, P2) + fillp(top, P) + stars + fillp(R.top(bo), P) + trim(R.neckD(bo), '#ffffff', P, 5) +
          p(R.band(waistY - 2, waistY + 10, 3), G.fill, G.line, 2) + DU.bow(cx, sY + 34, 19, '#ffffff', P.line, true) + DU.star(cx, sY + 34, 5.5, '#ffd24d', '#c98a1a', 1.2) +
          DU.star(cx, waistY + 4, 8, '#fff3b0', '#c98a1a', 1.3) + DU.sparkle(cx - 56, hipY + 14, 6, '#fff') + DU.sparkle(cx + 70, hipY + 40, 5, '#fff'),
        sleeves: sleeves(R, P2, { len: 0.28, ease: 3, puff: 11, cap: 1 }, (s) => cuff(R, s, 0.29, 3, '#ffffff', P.line, 6) + DU.star(R.cuff(s, 0.14, 0).x + s * 6, R.cuff(s, 0.14, 0).y, 5, '#fff3b0', '#c98a1a', 1)),
      };
    },
  });
  D({
    id: 'dr_ice', name: 'שמלת קרח', tags: ['winter', 'princess', 'magic'], price: 900, color: '#9fdcff', fixed: true,
    draw(R, P, ctx) {
      const { cx, sY, nk, waistY, hipY, ankleY } = R;
      const gid = ctx.id('ice');
      ctx.defs.push(`<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${cx - 40}" y1="${n(sY)}" x2="${cx + 40}" y2="${n(ankleY)}"><stop offset="0" stop-color="#eafaff"/><stop offset=".45" stop-color="#a9e0ff"/><stop offset="1" stop-color="#5fa4ee"/></linearGradient>`);
      const F = { fill: `url(#${gid})`, line: '#3f6fb0' };
      const Gl = ctx.paint('glitter:#bfe9ff');
      const Sv = ctx.paint('silver', [cx - 50, waistY - 10, 100, 40]);
      const len = ankleY - 6 - hipY;
      const bo = { neck: 'boat', nd: 9, nw: nk + 13, hem: waistY + 10, ease: 2.4 };
      const sk = dressSkirt(R, { len, flare: 84, bell: 26, hemSegs: zig(9, 16) });
      const over = dressSkirt(R, { len: len * 0.62, flare: 62, bell: 26, hemSegs: zig(7, 22) });
      let fl = '';
      [[-74, 0.56, 8], [66, 0.5, 9], [-30, 0.8, 7], [92, 0.82, 7], [-104, 0.9, 6], [22, 0.7, 6], [-6, 0.95, 7]].forEach(([x, t, r]) => (fl += flake(cx + x, hipY + len * t, r) + `<circle cx="${n(cx + x)}" cy="${n(hipY + len * t)}" r="1.6" fill="#fff"/>`));
      const gem = `M${cx} ${n(waistY - 4)}l7 8l-7 9l-7 -9Z`;
      return {
        body: fillp(sk, F) + ov(sk, 'fill="#2f4fa0" fill-opacity=".1"') + `<path d="${over}" fill="${Gl.fill}" fill-opacity=".9" stroke="${F.line}" stroke-width="2"/>` + fl +
          fillp(R.top(bo), F) + trim(R.neckD(bo), '#ffffff', F, 5) + flake(cx, sY + 46, 9) + DU.sparkle(cx, sY + 46, 4, '#fff') +
          p(R.band(waistY - 2, waistY + 10, 3), Sv.fill, Sv.line, 2) + p(gem, '#e8fbff', F.line, 1.5) + DU.sparkle(cx - 46, hipY + 30, 6, '#fff') + DU.sparkle(cx + 50, hipY + 54, 5, '#fff'),
        sleeves: [-1, 1].map((s) => {
          const sd = R.sleeve(s, { len: 0.9, ease: 3, bell: 22 }), c1 = R.cuff(s, 0.45, 0), c2 = R.cuff(s, 0.75, 0);
          return `<path d="${sd}" fill="#dff5ff" fill-opacity=".5" stroke="${F.line}" stroke-width="2.2"/>` + flake(c1.x + s * 2, c1.y, 5) + flake(c2.x - s * 6, c2.y + 4, 4.2) + DU.sparkle(c2.x + s * 12, c2.y - 12, 3.6, '#fff');
        }).join(''),
      };
    },
  });
  D({
    id: 'dr_butterfly', name: 'שמלת פרפרים', tags: ['nature', 'magic'], price: 700, color: 'sunset', fixed: true,
    draw(R, P) {
      const { cx, sY, nk, waistY, hipY } = R;
      const bo = { neck: 'v', nd: 22, nw: nk + 11, strap: 18, hem: waistY + 8, ease: 2.2 };
      const layer = (len, flare, op) => `<path d="${dressSkirt(R, { len, flare, bell: 12, hemSegs: scal(4, 24) })}" fill="${P.fill}" fill-opacity="${op}" stroke="${P.line}" stroke-width="2"/>`;
      const bl = '#8a4a7a';
      return layer(74, 56, 0.7) + layer(56, 48, 0.85) + layer(36, 36, 1) + ov(dressSkirt(R, { len: 12, flare: 14 }), DU.HL) +
        fillp(R.top(bo), P) + trim(R.neckD(bo), '#ffffff', P, 3.4) + waistband(R, waistY, 7, '#fff3b0', '#c98a1a', 2.6) +
        butterfly(cx + 20, waistY + 2, 11, '#ffffff', bl, 18) + butterfly(cx - nk - 18, sY + 8, 10, '#fff0f8', bl, -20) +
        butterfly(cx - 44, hipY + 30, 14, '#efe4ff', bl, -14) + butterfly(cx + 52, hipY + 52, 13, '#ffffff', bl, 20) +
        DU.sparkle(cx + 30, hipY + 22, 4.5, '#fff') + DU.sparkle(cx - 70, hipY + 66, 4, '#fff');
    },
  });

  void stitch;
  DU.addItems(items);
})();
