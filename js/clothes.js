/* clothes.js — tops, bottoms and dresses. Body coordinates, drawn from the rig.
   Tops return { body, sleeves }: the renderer draws arms between the two. */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const { p, ov, n } = DU;

  const fillp = (d, P, sw = 2.4) => p(d, P.fill, P.line, sw);
  const seam = (d, P, op = 0.5, sw = 1.5) => p(d, 'none', P.line, sw, `stroke-opacity="${op}"`);
  const stitch = (d, c = '#fff', op = 0.8) => p(d, 'none', c, 1.4, `stroke-opacity="${op}" stroke-dasharray="4 3.5"`);

  /* ---------- pattern fills ---------- */
  function pat(ctx, inner, w, h, rot) {
    const id = ctx.id('pt');
    ctx.defs.push(`<pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse"${rot ? ` patternTransform="rotate(${rot})"` : ''}>${inner}</pattern>`);
    return `url(#${id})`;
  }
  const K = (DU.clothKit = {
    pat,
    stripes: (ctx, c, step = 16, w = 7, rot = 0, op = 1) => pat(ctx, `<rect width="${step}" height="${w}" fill="${c}" fill-opacity="${op}"/>`, step, step, rot),
    dots: (ctx, c, step = 20, r = 3, op = 1) =>
      pat(ctx, `<circle cx="${step / 4}" cy="${step / 4}" r="${r}" fill="${c}" fill-opacity="${op}"/><circle cx="${(step * 3) / 4}" cy="${(step * 3) / 4}" r="${r}" fill="${c}" fill-opacity="${op}"/>`, step, step),
    hearts: (ctx, c, step = 26, s = 4.5) => pat(ctx, `<path d="${DU.heartD(step / 4, step / 4, s)}${DU.heartD((step * 3) / 4, (step * 3) / 4, s)}" fill="${c}"/>`, step, step),
    stars: (ctx, c, step = 28, r = 5) => pat(ctx, `<path d="${DU.starD(step / 4, step / 4, r)}${DU.starD((step * 3) / 4, (step * 3) / 4, r * 0.7)}" fill="${c}"/>`, step, step, 12),
    twinkles: (ctx, c, step = 30) => pat(ctx, `<path d="${DU.sparkleD(step / 4, step / 4, 5)}${DU.sparkleD((step * 3) / 4, (step * 3) / 4, 3.4)}" fill="${c}"/><circle cx="${step * 0.75}" cy="${step * 0.22}" r="1.2" fill="${c}"/>`, step, step, 15),
    plaid: (ctx, c1, c2, step = 26) =>
      pat(ctx, `<rect width="${step}" height="7" fill="${c1}" fill-opacity=".55"/><rect width="7" height="${step}" fill="${c1}" fill-opacity=".55"/><rect y="12" width="${step}" height="1.6" fill="${c2}"/><rect x="12" width="1.6" height="${step}" fill="${c2}"/>`, step, step),
    flowers: (ctx, c, step = 34) =>
      pat(ctx, [[step / 4, step / 4], [(step * 3) / 4, (step * 3) / 4]].map(([x, y]) =>
        [0, 72, 144, 216, 288].map((a) => `<circle cx="${n(x + Math.cos((a * Math.PI) / 180) * 3.6)}" cy="${n(y + Math.sin((a * Math.PI) / 180) * 3.6)}" r="2.8" fill="${c}"/>`).join('') + `<circle cx="${x}" cy="${y}" r="2" fill="#ffd54d"/>`).join(''), step, step),
    scales: (ctx, c, step = 18) => pat(ctx, `<path d="M0 0Q${step / 2} ${step * 0.8} ${step} 0M${-step / 2} ${step / 2}Q0 ${step * 1.3} ${step / 2} ${step / 2}Q${step} ${step * 1.3} ${step * 1.5} ${step / 2}" fill="none" stroke="${c}" stroke-width="1.5" stroke-opacity=".6"/>`, step, step),
    knit: (ctx, c, step = 10) => pat(ctx, `<path d="M0 2L${step / 2} ${step - 2}L${step} 2" fill="none" stroke="${c}" stroke-width="1.6" stroke-opacity=".35"/>`, step, step),
    over: (ds, fill) => (Array.isArray(ds) ? ds : [ds]).map((d) => `<path d="${d}" fill="${fill}"/>`).join(''),
  });

  /* where the hem of a top goes: tucked tops end under the waistband */
  const hemOf = (R, ctx, untucked) => (ctx.tucked ? R.waistY + 20 : untucked);
  const sleeves = (R, P, o, extra) => [-1, 1].map((s) => fillp(R.sleeve(s, o), P) + (extra ? extra(s) : '')).join('');
  /* a band across the end of a sleeve */
  function cuff(R, s, len, ease, fill, line, h = 7) {
    const c = R.cuff(s, len, ease);
    return `<rect x="${n(-c.w - 1.5)}" y="${-h / 2}" width="${n(c.w * 2 + 3)}" height="${h}" rx="3" fill="${fill}" stroke="${line}" stroke-width="2" transform="translate(${n(c.x)} ${n(c.y)}) rotate(${n(c.rot)})"/>`;
  }
  const buttons = (cx, y0, y1, k, c = '#fff', line = '#8a7fa8') => {
    let o = '';
    for (let i = 0; i < k; i++) o += `<circle cx="${cx}" cy="${n(y0 + ((y1 - y0) * i) / Math.max(1, k - 1))}" r="2.6" fill="${c}" stroke="${line}" stroke-width="1.2"/>`;
    return o;
  };
  /* peter-pan / pointed collar at the neck */
  function collar(R, fill, line, pointy) {
    const { cx, sY, nk } = R;
    const x0 = nk + 7, y0 = R.shY(x0) - 3;
    const one = pointy
      ? `M${n(cx + x0)} ${n(y0)}L${n(cx + x0 + 13)} ${n(y0 + 12)}L${n(cx + 9)} ${n(sY + 22)}L${n(cx + 1)} ${n(sY + 9)}Q${n(cx + 10)} ${n(sY + 4)} ${n(cx + x0)} ${n(y0)}Z`
      : `M${n(cx + x0)} ${n(y0)}C${n(cx + x0 + 16)} ${n(y0 + 4)} ${n(cx + x0 + 10)} ${n(sY + 24)} ${n(cx + 12)} ${n(sY + 22)}C${n(cx + 5)} ${n(sY + 21)} ${n(cx + 1)} ${n(sY + 15)} ${n(cx + 1)} ${n(sY + 9)}Q${n(cx + 10)} ${n(sY + 4)} ${n(cx + x0)} ${n(y0)}Z`;
    return DU.both(cx, p(one, fill, line, 2));
  }
  /* a frill: a row of scallops along a horizontal line from -w to w */
  function frill(cx, y, w, depth, fill, line, count) {
    count = count || Math.max(4, Math.round(w / 9));
    return p(DU.sym(cx, [[0, y - 2], [w, y - 2], ...DU.scallopSegs(w, y, count, depth)]), fill, line, 2);
  }
  /* pleat lines of a skirt from the waist to the hem */
  function pleats(R, top, hem, w0, w1, k, P, op = 0.45) {
    let d = '';
    for (let i = -k; i <= k; i++) {
      if (!i && k % 2) continue;
      d += `M${n(R.cx + (i / (k + 0.6)) * w0)} ${n(top + 6)}L${n(R.cx + (i / (k + 0.4)) * w1)} ${n(hem + 2 - Math.abs(i) * 0.6)}`;
    }
    return seam(d, P, op);
  }
  const skirtDims = (R, o) => ({ top: o.top == null ? R.waistY + 4 : o.top, hem: R.hipY + (o.len == null ? 70 : o.len), w0: R.side(o.top == null ? R.waistY + 4 : o.top) + 2.5, w1: R.hp + 2.5 + (o.flare == null ? 26 : o.flare) });

  const items = [];
  const T = (o) => items.push(Object.assign({ slot: 'top' }, o));
  const Bt = (o) => items.push(Object.assign({ slot: 'bottom' }, o));
  const D = (o) => items.push(Object.assign({ slot: 'dress' }, o));

  /* ============================== TOPS ============================== */
  T({
    id: 'top_tee', name: 'חולצת טי', tags: ['school', 'sport', 'beach'], color: '#ff9ac1',
    draw(R, P, ctx) {
      const o = { neck: 'round', nd: 9, hem: hemOf(R, ctx, R.hipY + 10), ease: 2.5 };
      const { cx, sY } = R;
      return {
        body: fillp(R.top(o), P) + seam(R.neckD({ nd: 14, nw: R.nk + 13 }), P) + (ctx.tucked ? '' : seam(`M${n(cx - R.hp - 1)} ${n(o.hem - 5)}H${n(cx + R.hp + 1)}`, P)) +
          DU.heart(cx, sY + 62, 13, '#fff', null) + DU.heart(cx, sY + 62, 7, DU.light(P.base, 0.2), null),
        sleeves: sleeves(R, P, { len: 0.3, ease: 3 }, (s) => seam(DU.tube(R.armSpine(s, 0.25, 0.26, 3.4), 0, 0), P, 0.45)),
      };
    },
  });
  T({
    id: 'top_stripes', name: 'חולצת פסים', tags: ['school', 'beach'], color: '#5cc8ff',
    draw(R, P, ctx) {
      const o = { neck: 'boat', nd: 6, nw: R.nk + 12, hem: hemOf(R, ctx, R.hipY + 12), ease: 2.5 };
      const W = { fill: '#ffffff', line: P.line };
      const st = K.stripes(ctx, P.fill, 18, 9);
      const d = R.top(o);
      return {
        body: fillp(d, W) + K.over(d, st) + p(d, 'none', P.line, 2.4),
        sleeves: [-1, 1].map((s) => { const sd = R.sleeve(s, { len: 0.92, ease: 2.6 }); return fillp(sd, W) + K.over(sd, st) + p(sd, 'none', P.line, 2.4); }).join(''),
      };
    },
  });
  T({
    id: 'top_tank', name: 'גופייה', tags: ['sport', 'beach'], color: '#ffd24d',
    draw(R, P, ctx) {
      const o = { neck: 'round', nd: 24, nw: R.nk + 9, strap: 17, hem: hemOf(R, ctx, R.hipY + 8), ease: 2.2 };
      return { body: fillp(R.top(o), P) + p(R.neckD(o), 'none', '#fff', 3.2, 'stroke-opacity=".85"') + p(R.neckD(o), 'none', P.line, 1.2) + DU.star(R.cx, R.sY + 66, 11, '#fff', null) };
    },
  });
  T({
    id: 'top_blouse', name: 'חולצה מכופתרת', tags: ['school', 'party'], color: '#ffffff',
    draw(R, P, ctx) {
      const o = { neck: 'v', nd: 20, nw: R.nk + 8, hem: hemOf(R, ctx, R.hipY + 12), ease: 2.6 };
      const { cx, sY } = R;
      const ac = DU.lum(P.base) > 0.85 ? '#ff9ac1' : '#ffffff';
      return {
        body: fillp(R.top(o), P) + seam(`M${cx} ${n(sY + 20)}V${n(o.hem)}`, P, 0.6) + buttons(cx, sY + 34, Math.min(o.hem - 8, R.hipY), ctx.tucked ? 3 : 4) + collar(R, '#fff', P.line, true) + DU.bow(cx, sY + 22, 9, ac),
        sleeves: sleeves(R, P, { len: 0.3, ease: 3.5, puff: 4 }, (s) => cuff(R, s, 0.3, 3.5, '#fff', P.line, 6)),
      };
    },
  });
  T({
    id: 'top_hoodie', name: 'קפוצ׳ון', tags: ['sport', 'winter', 'school'], color: '#b48cff', noTuck: true,
    draw(R, P) {
      const { cx, sY, nk, hipY } = R;
      const o = { neck: 'round', nd: 12, nw: nk + 11, hem: hipY + 20, ease: 6, fit: 0.75 };
      const hood = DU.sym(cx, [[0, sY - 30], [nk + 18, sY - 30, nk + 30, sY - 16, nk + 30, sY - 2], [nk + 30, sY + 14, nk + 12, sY + 22, 0, sY + 24]]);
      const pocket = DU.sym(cx, [[0, hipY - 30], [24, hipY - 30], [34, hipY + 4], [0, hipY + 4]]);
      const band = R.band(hipY + 12, hipY + 22, 7);
      const dk = DU.dark(P.base, 0.18);
      return {
        body: fillp(hood, P) + ov(hood) + fillp(R.top(o), P) + p(band, dk, P.line, 2) + p(pocket, P.fill, P.line, 1.8) + ov(pocket, 'fill="#43206b" fill-opacity=".08"') +
          seam(R.neckD({ nd: 18, nw: nk + 15 }), P) + p(`M${cx - 7} ${n(sY + 16)}v26M${cx + 7} ${n(sY + 16)}v22`, 'none', '#fff', 2.4) +
          `<circle cx="${cx - 7}" cy="${n(sY + 44)}" r="2.6" fill="#fff"/><circle cx="${cx + 7}" cy="${n(sY + 40)}" r="2.6" fill="#fff"/>`,
        sleeves: sleeves(R, P, { len: 0.94, ease: 5 }, (s) => cuff(R, s, 0.94, 4, dk, P.line, 9)),
      };
    },
  });
  T({
    id: 'top_sweater', name: 'סוודר', tags: ['winter', 'school'], color: '#ff9a56',
    draw(R, P, ctx) {
      const { cx, sY, nk } = R;
      const o = { neck: 'round', nd: 4, nw: nk + 8, hem: hemOf(R, ctx, R.hipY + 14), ease: 4.5, fit: 0.5 };
      const d = R.top(o), kn = K.knit(ctx, P.line);
      const neck = DU.sym(cx, [[0, sY - 18], [nk + 4, sY - 18], [nk + 9, sY - 4, nk + 9, sY + 2, nk + 6, sY + 6], [nk * 0.5, sY + 12, 0, sY + 12]]);
      const lt = DU.light(P.base, 0.25);
      return {
        body: fillp(d, P) + K.over(d, kn) + p(d, 'none', P.line, 2.4) + p(neck, lt, P.line, 2.2) + seam(`M${cx - 8} ${n(sY - 15)}v22M${cx} ${n(sY - 15)}v26M${cx + 8} ${n(sY - 15)}v22`, P, 0.35) +
          (ctx.tucked ? '' : p(R.band(o.hem - 9, o.hem, 5.5), lt, P.line, 2)),
        sleeves: [-1, 1].map((s) => { const sd = R.sleeve(s, { len: 0.95, ease: 4.5 }); return fillp(sd, P) + K.over(sd, kn) + p(sd, 'none', P.line, 2.4) + cuff(R, s, 0.95, 4, lt, P.line, 9); }).join(''),
      };
    },
  });
  T({
    id: 'top_crop', name: 'חולצה קצרה', tags: ['party', 'sport'], color: '#3fbf9a', noTuck: true,
    draw(R, P) {
      const o = { neck: 'square', nd: 12, nw: R.nk + 12, hem: R.waistY - 6, ease: 2.5 };
      return {
        body: fillp(R.top(o), P) + seam(`M${n(R.cx - R.wa - 4)} ${n(o.hem - 6)}H${n(R.cx + R.wa + 4)}`, P) + DU.sparkle(R.cx, R.sY + 44, 9, '#fff', 0.95) + DU.sparkle(R.cx + 13, R.sY + 34, 4, '#fff', 0.9),
        sleeves: sleeves(R, P, { len: 0.2, ease: 3.2, cap: 0.9 }),
      };
    },
  });
  T({
    id: 'top_puff', name: 'חולצת נסיכה', tags: ['princess', 'party'], color: '#ffc1d9',
    draw(R, P, ctx) {
      const { cx, sY, nk } = R;
      const o = { neck: 'square', nd: 18, nw: nk + 15, hem: hemOf(R, ctx, R.hipY + 4), ease: 2.4 };
      const lt = DU.light(P.base, 0.55);
      return {
        body: fillp(R.top(o), P) + p(R.neckD(o), 'none', lt, 4.5) + p(R.neckD(o), 'none', P.line, 1.2) +
          seam(`M${cx - 10} ${n(sY + 26)}L${cx - 7} ${n(R.waistY)}M${cx + 10} ${n(sY + 26)}L${cx + 7} ${n(R.waistY)}`, P, 0.35) +
          (ctx.tucked ? '' : frill(cx, o.hem, R.hp + 4, 8, lt, P.line)) + DU.bow(cx, sY + 24, 10, lt, P.line),
        sleeves: sleeves(R, P, { len: 0.3, ease: 3, puff: 9, cap: 1 }, (s) => cuff(R, s, 0.3, 2.5, lt, P.line, 6)),
      };
    },
  });
  T({
    id: 'top_pj', name: 'חולצת פיג׳מה', tags: ['sleepover'], color: '#7de3e0',
    draw(R, P, ctx) {
      const { cx, sY } = R;
      const o = { neck: 'v', nd: 22, nw: R.nk + 9, hem: hemOf(R, ctx, R.hipY + 16), ease: 4, fit: 0.6 };
      const d = R.top(o), st = K.twinkles(ctx, '#ffffff');
      return {
        body: fillp(d, P) + K.over(d, st) + p(d, 'none', P.line, 2.4) + p(R.neckD(o), 'none', '#fff', 4) + p(R.neckD(o), 'none', P.line, 1.1) +
          p(`M${cx} ${n(sY + 22)}V${n(o.hem)}`, 'none', '#fff', 3) + buttons(cx, sY + 36, o.hem - 10, ctx.tucked ? 3 : 4, P.fill, P.line) +
          p(`M${cx + 14} ${n(sY + 50)}h16v13q-8 5 -16 0Z`, P.fill, P.line, 1.6),
        sleeves: [-1, 1].map((s) => { const sd = R.sleeve(s, { len: 0.9, ease: 4.5 }); return fillp(sd, P) + K.over(sd, st) + p(sd, 'none', P.line, 2.4) + cuff(R, s, 0.9, 4.5, '#fff', P.line, 6); }).join(''),
      };
    },
  });
  T({
    id: 'top_sport', name: 'חולצת ספורט', tags: ['sport'], color: '#3f7fd9',
    draw(R, P, ctx) {
      const { cx, sY } = R;
      const o = { neck: 'v', nd: 14, nw: R.nk + 10, hem: hemOf(R, ctx, R.hipY + 12), ease: 3.2 };
      const d = R.top(o), id = ctx.id('cl');
      const panels = [-1, 1].map((s) => `<rect x="${n(cx + (s > 0 ? R.wa - 6 : -R.sh - 20))}" y="${n(sY + 40)}" width="${n(R.sh + 26 - R.wa)}" height="${n(o.hem - sY)}" fill="#fff"/>`).join('');
      return {
        body: fillp(d, P) + DU.clip(id, d, panels) + p(d, 'none', P.line, 2.4) + p(R.neckD(o), 'none', '#fff', 4) + p(R.neckD(o), 'none', P.line, 1.1) + DU.star(cx, sY + 60, 15, '#fff', null) + DU.star(cx, sY + 60, 8, '#ffd24d', null),
        sleeves: sleeves(R, P, { len: 0.3, ease: 3.4 }, (s) => cuff(R, s, 0.3, 3.4, '#fff', P.line, 6)),
      };
    },
  });
  T({
    id: 'top_cardigan', name: 'קרדיגן', tags: ['school', 'winter', 'nature'], color: '#f3e3c8', noTuck: true,
    draw(R, P) {
      const { cx, sY, nk, hipY } = R;
      const o = { neck: 'v', nd: 74, nw: nk + 12, hem: hipY + 18, ease: 5, fit: 0.55 };
      const d = R.top(o), dk = DU.dark(P.base, 0.14);
      const open = `M${cx} ${n(sY + 74)}V${n(o.hem)}`;
      return {
        body: fillp(d, P) + p(R.neckD(o), 'none', dk, 6) + p(R.neckD(o), 'none', P.line, 1.2) + p(open, 'none', P.line, 1.8) +
          buttons(cx - 6, sY + 84, o.hem - 12, 3, '#fff', P.line) + p(R.band(o.hem - 9, o.hem, 6), dk, P.line, 2) +
          p(`M${n(cx + 20)} ${n(hipY - 22)}h20v16h-20Z`, P.fill, P.line, 1.6) + p(`M${n(cx - 40)} ${n(hipY - 22)}h20v16h-20Z`, P.fill, P.line, 1.6),
        sleeves: sleeves(R, P, { len: 0.95, ease: 4.5 }, (s) => cuff(R, s, 0.95, 4, dk, P.line, 9)),
      };
    },
  });
  T({
    id: 'top_flower', name: 'חולצת פרחים', tags: ['nature', 'beach'], color: '#8bdc7a',
    draw(R, P, ctx) {
      const { cx, sY, nk } = R;
      const o = { neck: 'round', nd: 20, nw: nk + 12, strap: 22, hem: hemOf(R, ctx, R.hipY + 6), ease: 3, flare: ctx.tucked ? 0 : 7 };
      const d = R.top(o), fl = K.flowers(ctx, '#ffffff');
      const lt = DU.light(P.base, 0.5);
      return {
        body: fillp(d, P) + K.over(d, fl) + p(d, 'none', P.line, 2.4) + (ctx.tucked ? '' : frill(cx, o.hem, R.hp + 10, 9, lt, P.line)) +
          [-1, 1].map((s) => frill(cx + s * (nk + 20), R.shY(nk + 20) + 2, 13, 7, lt, P.line, 3)).join(''),
      };
    },
  });
  T({
    id: 'top_jacket', name: 'ג׳קט ג׳ינס', tags: ['school', 'party'], color: '#5c8fd6', noTuck: true,
    draw(R, P) {
      const { cx, sY, nk, waistY } = R;
      const o = { neck: 'v', nd: 60, nw: nk + 12, hem: waistY + 16, ease: 5, fit: 0.7 };
      const d = R.top(o);
      const lt = DU.light(P.base, 0.3);
      return {
        body: fillp(d, P) + p(`M${cx} ${n(sY + 60)}V${n(o.hem)}`, 'none', P.line, 1.8) + collar(R, lt, P.line, true) +
          stitch(`M${cx - 8} ${n(sY + 66)}V${n(o.hem - 8)}M${cx + 8} ${n(sY + 66)}V${n(o.hem - 8)}`, '#ffe9b8') +
          p(`M${cx + 16} ${n(sY + 52)}h20v14l-10 5l-10 -5Z`, P.fill, P.line, 1.6) + p(`M${cx - 36} ${n(sY + 52)}h20v14l-10 5l-10 -5Z`, P.fill, P.line, 1.6) +
          `<circle cx="${cx + 26}" cy="${n(sY + 58)}" r="2.3" fill="#ffd98a"/><circle cx="${cx - 26}" cy="${n(sY + 58)}" r="2.3" fill="#ffd98a"/>` +
          p(R.band(o.hem - 8, o.hem, 6), lt, P.line, 2),
        sleeves: sleeves(R, P, { len: 0.94, ease: 4.6 }, (s) => cuff(R, s, 0.94, 4.2, lt, P.line, 9)),
      };
    },
  });
  T({
    id: 'top_coat', name: 'מעיל חורף', tags: ['winter'], color: '#e0435f', noTuck: true,
    draw(R, P) {
      const { cx, sY, nk, hipY } = R;
      const o = { neck: 'round', nd: 6, nw: nk + 10, hem: hipY + 46, ease: 9, fit: 0.9, flare: 4 };
      const d = R.top(o);
      const fur = '#fff8ee', furL = '#c9b79f';
      const furD = DU.sym(cx, [[0, sY - 22], [nk + 10, sY - 24], [nk + 26, sY - 14, nk + 30, sY + 2, nk + 22, sY + 12], [nk + 10, sY + 22, 6, sY + 22, 0, sY + 18]]);
      let q = '';
      for (let y = sY + 60; y < o.hem - 8; y += 30) q += `M${n(cx - R.side(y) - 9)} ${n(y)}Q${cx} ${n(y + 9)} ${n(cx + R.side(y) + 9)} ${n(y)}`;
      return {
        body: fillp(d, P) + seam(q, P, 0.4, 1.8) + p(`M${cx} ${n(sY + 18)}V${n(o.hem)}`, 'none', P.line, 2) + buttons(cx - 9, sY + 46, o.hem - 20, 4, '#ffd98a', P.line) +
          p(furD, fur, furL, 2.2) + p(R.band(o.hem - 7, o.hem + 4, 13), fur, furL, 2.2),
        sleeves: sleeves(R, P, { len: 0.93, ease: 8 }, (s) => seam(DU.tube(R.armSpine(s, 0.45, 0.46, 8), 0, 0), P, 0.4, 1.8) + cuff(R, s, 0.94, 8, fur, furL, 12)),
      };
    },
  });
  T({
    id: 'top_sparkle', name: 'חולצת נצנצים', tags: ['party', 'princess'], price: 400, color: 'glitter:#ff7fb5', fixed: true,
    draw(R, P, ctx) {
      const o = { neck: 'round', nd: 12, nw: R.nk + 13, hem: hemOf(R, ctx, R.hipY + 6), ease: 2.6 };
      return {
        body: fillp(R.top(o), P) + p(R.neckD(o), 'none', '#fff', 3.6) + p(R.neckD(o), 'none', P.line, 1.1) + DU.sparkle(R.cx - 18, R.sY + 50, 7, '#fff') + DU.sparkle(R.cx + 16, R.sY + 82, 5, '#fff'),
        sleeves: sleeves(R, P, { len: 0.26, ease: 3, puff: 5, cap: 1 }),
      };
    },
  });
  T({
    id: 'top_rainbow', name: 'סוודר קשת', tags: ['party', 'magic', 'winter'], price: 450, color: 'rainbow', fixed: true,
    draw(R, P, ctx) {
      const { cx, sY, nk } = R;
      const o = { neck: 'round', nd: 8, nw: nk + 10, hem: hemOf(R, ctx, R.hipY + 14), ease: 4.5, fit: 0.5 };
      const d = R.top(o);
      const cloud = (x, y, k) => `<path d="M${x - 14 * k} ${y}a7 7 0 0 1 6 -9a9 9 0 0 1 17 -2a7 7 0 0 1 6 11Z" fill="#fff" stroke="${P.line}" stroke-width="1.4" transform="scale(1)"/>`;
      return {
        body: fillp(d, P) + p(R.neckD(o), 'none', '#fff', 5) + p(R.neckD(o), 'none', P.line, 1.1) + cloud(cx - 2, sY + 70, 1) + (ctx.tucked ? '' : p(R.band(o.hem - 9, o.hem, 5.5), '#fff', P.line, 2)),
        sleeves: sleeves(R, P, { len: 0.95, ease: 4.5 }, (s) => cuff(R, s, 0.95, 4, '#fff', P.line, 9)),
      };
    },
  });
  T({
    id: 'top_magic', name: 'חולצת כוכבים', tags: ['magic'], price: 500, color: 'galaxy', fixed: true,
    draw(R, P, ctx) {
      const { cx, sY } = R;
      const o = { neck: 'boat', nd: 8, nw: R.nk + 13, hem: hemOf(R, ctx, R.hipY + 12), ease: 3, flare: ctx.tucked ? 0 : 5 };
      const d = R.top(o), st = K.twinkles(ctx, '#fff6c2', 34);
      return {
        body: fillp(d, P) + K.over(d, st) + p(d, 'none', P.line, 2.4) + `<path d="M${cx - 9} ${n(sY + 62)}a13 13 0 1 0 14 -16a10 10 0 1 1 -14 16Z" fill="#fff3b0" stroke="#e8a93a" stroke-width="1.2"/>` + DU.sparkle(cx + 14, sY + 46, 6, '#fff'),
        sleeves: [-1, 1].map((s) => { const sd = R.sleeve(s, { len: 0.86, ease: 3, bell: 10 }); return fillp(sd, P) + K.over(sd, st) + p(sd, 'none', P.line, 2.4); }).join(''),
      };
    },
  });

  /* ============================== BOTTOMS ============================== */
  const waistband = (R, top, h, fill, line, ease = 3) => p(R.band(top, top + h, ease), fill, line, 2);

  Bt({
    id: 'bt_skirt', name: 'חצאית קפלים', tags: ['school', 'party'], color: '#3a4a8f',
    draw(R, P) {
      const o = { len: 64, flare: 24 }, k = skirtDims(R, o);
      return fillp(R.skirt(o), P) + pleats(R, k.top, k.hem, k.w0, k.w1, 4, P) + waistband(R, k.top - 2, 9, DU.light(P.base, 0.15), P.line);
    },
  });
  Bt({
    id: 'bt_plaid', name: 'חצאית משבצות', tags: ['school', 'winter'], color: '#e0435f',
    draw(R, P, ctx) {
      const o = { len: 66, flare: 28 }, k = skirtDims(R, o), d = R.skirt(o);
      return fillp(d, P) + K.over(d, K.plaid(ctx, DU.dark(P.base, 0.35), '#ffffff')) + p(d, 'none', P.line, 2.4) + pleats(R, k.top, k.hem, k.w0, k.w1, 3, P, 0.35) +
        waistband(R, k.top - 2, 9, DU.dark(P.base, 0.2), P.line);
    },
  });
  Bt({
    id: 'bt_jeans', name: 'ג׳ינס', tags: ['school', 'nature'], color: '#5c8fd6',
    draw(R, P) {
      const { cx, waistY, crotchY, hp, kneeY, ankleY } = R;
      const top = waistY + 4, ds = R.pantsDs({ top, ease: 3.2, yBot: ankleY - 6 });
      const cuffs = [-1, 1].map((s) => { const l = R.leg(ankleY - 10); return `<rect x="${n(cx + s * l.x - l.w - 5)}" y="${n(ankleY - 16)}" width="${n(l.w * 2 + 10)}" height="12" rx="3" fill="${DU.light(P.base, 0.45)}" stroke="${P.line}" stroke-width="2"/>`; }).join('');
      return DU.union(ds, P.fill, P.line) + waistband(R, top - 2, 10, P.fill, P.line, 3.6) +
        stitch(`M${n(cx - hp + 6)} ${n(top + 14)}q4 16 20 18M${n(cx + hp - 6)} ${n(top + 14)}q-4 16 -20 18M${cx} ${n(top + 10)}V${n(crotchY + 4)}`, '#ffe9b8') +
        `<circle cx="${cx}" cy="${n(top + 3)}" r="2.8" fill="#ffd98a" stroke="${P.line}" stroke-width="1"/>` +
        [-1, 1].map((s) => ov(`M${n(cx + s * 20)} ${n(kneeY - 40)}q${s * 10} 30 ${s * 2} 70q${-s * 12} -30 ${-s * 2} -70Z`, 'fill="#fff" fill-opacity=".16"')).join('') + cuffs;
    },
  });
  Bt({
    id: 'bt_shorts', name: 'מכנסיים קצרים', tags: ['beach', 'sport', 'nature'], color: '#7de3e0',
    draw(R, P) {
      const { cx, waistY, crotchY } = R;
      const top = waistY + 6, yBot = crotchY + 48, ds = R.pantsDs({ top, ease: 5, yBot, flare: 3 });
      const lt = DU.light(P.base, 0.5);
      const cuffs = [-1, 1].map((s) => { const l = R.leg(yBot); return `<rect x="${n(cx + s * l.x - l.w - 9.5)}" y="${n(yBot - 7)}" width="${n(l.w * 2 + 19)}" height="10" rx="3" fill="${lt}" stroke="${P.line}" stroke-width="2"/>`; }).join('');
      return DU.union(ds, P.fill, P.line) + cuffs + waistband(R, top - 2, 9, lt, P.line, 5) + p(`M${cx - 5} ${n(top + 8)}q-3 9 -7 13M${cx + 5} ${n(top + 8)}q3 9 7 13`, 'none', '#fff', 2.2) + seam(`M${cx} ${n(top + 8)}V${n(crotchY + 6)}`, P);
    },
  });
  Bt({
    id: 'bt_leggings', name: 'טייץ', tags: ['sport', 'sleepover'], color: '#3a3346', tight: true,
    draw(R, P) {
      const { cx, waistY, ankleY } = R;
      const top = waistY + 6, ds = R.pantsDs({ top, ease: 1.2, yBot: ankleY - 10 });
      const lt = DU.light(P.base, 0.35);
      return DU.union(ds, P.fill, P.line) + waistband(R, top - 2, 8, lt, P.line, 2.2) +
        [-1, 1].map((s) => { const sp = R.legSpine(s, R.crotchY + 6, ankleY - 14).map((q) => ({ x: q.x + s * (q.w - 2.5), y: q.y, w: 1.6 })); return `<path d="${DU.tube(sp, 0.8, 0.8)}" fill="${lt}"/>`; }).join('');
    },
  });
  Bt({
    id: 'bt_tutu', name: 'חצאית טוטו', tags: ['party', 'princess', 'magic'], color: '#ff9ac1',
    draw(R, P) {
      const { cx, waistY } = R;
      const top = waistY + 6;
      const layer = (len, flare, op) => {
        const o = { top, len, flare, bell: 12, hemSegs: (w, y) => DU.scallopSegs(w, y, 6, 10) };
        return `<path d="${R.skirt(o)}" fill="${P.fill}" fill-opacity="${op}" stroke="${P.line}" stroke-width="2"/>`;
      };
      return layer(64, 46, 0.75) + layer(46, 40, 0.8) + layer(28, 30, 0.9) + ov(R.skirt({ top, len: 10, flare: 14 }), DU.HL) +
        waistband(R, top - 2, 8, DU.dark(P.base, 0.12), P.line) + DU.bow(cx, top + 3, 9, DU.light(P.base, 0.5), P.line);
    },
  });
  Bt({
    id: 'bt_wide', name: 'מכנסיים רחבים', tags: ['party', 'nature'], color: '#f3e3c8',
    draw(R, P) {
      const { cx, waistY, ankleY, crotchY } = R;
      const top = waistY + 2, ds = R.pantsDs({ top, ease: 4, yBot: ankleY + 2, flare: 13 });
      return DU.union(ds, P.fill, P.line) + waistband(R, top - 2, 12, DU.dark(P.base, 0.12), P.line, 4) + seam(`M${cx} ${n(top + 12)}V${n(crotchY + 6)}`, P) +
        p(`M${cx} ${n(crotchY + 8)}V${n(ankleY + 1)}`, 'none', P.line, 2) + [-1, 1].map((s) => seam(`M${n(cx + s * 27)} ${n(top + 14)}L${n(cx + s * 26)} ${n(ankleY)}`, P, 0.3)).join('') + buttons(cx, top + 1, top + 7, 2, '#fff', P.line);
    },
  });
  Bt({
    id: 'bt_sweat', name: 'מכנסי טרנינג', tags: ['sport', 'winter', 'sleepover'], color: '#cfd3e6',
    draw(R, P) {
      const { cx, waistY, ankleY, crotchY } = R;
      const top = waistY + 6, ds = R.pantsDs({ top, ease: 6, yBot: ankleY - 12 });
      const dk = DU.dark(P.base, 0.2);
      const cuffs = [-1, 1].map((s) => { const l = R.leg(ankleY - 10); return `<rect x="${n(cx + s * l.x - l.w - 4)}" y="${n(ankleY - 17)}" width="${n(l.w * 2 + 8)}" height="12" rx="4" fill="${dk}" stroke="${P.line}" stroke-width="2"/>`; }).join('');
      return DU.union(ds, P.fill, P.line) + cuffs + waistband(R, top - 2, 10, dk, P.line, 6) + p(`M${cx - 5} ${n(top + 8)}q-2 10 -6 15M${cx + 5} ${n(top + 8)}q2 10 6 15`, 'none', '#fff', 2.2) +
        [-1, 1].map((s) => { const sp = R.legSpine(s, top + 14, ankleY - 20, 6).map((q) => ({ x: q.x + s * (q.w - 4), y: q.y, w: 2 })); return `<path d="${DU.tube(sp, 0, 0)}" fill="#fff" fill-opacity=".85"/>`; }).join('') + seam(`M${cx} ${n(top + 10)}V${n(crotchY + 6)}`, P);
    },
  });
  Bt({
    id: 'bt_overalls', name: 'סרבל', tags: ['nature', 'school'], color: '#5c8fd6', forceTuck: true,
    draw(R, P) {
      const { cx, sY, waistY, ankleY, crotchY, nk } = R;
      const top = waistY - 2, ds = R.pantsDs({ top, ease: 4.5, yBot: ankleY - 4, flare: 2 });
      const bib = DU.sym(cx, [[0, sY + 44], [24, sY + 44], [R.side(top) + 2, top + 3], [0, top + 3]]);
      const strap = (s) => p(`M${n(cx + s * 17)} ${n(sY + 50)}L${n(cx + s * (nk + 14))} ${n(R.shY(nk + 14) - 2)}L${n(cx + s * (nk + 25))} ${n(R.shY(nk + 25) - 2)}L${n(cx + s * 25)} ${n(sY + 52)}Z`, P.fill, P.line, 2);
      const cuffs = [-1, 1].map((s) => { const l = R.leg(ankleY - 8); return `<rect x="${n(cx + s * l.x - l.w - 7.5)}" y="${n(ankleY - 15)}" width="${n(l.w * 2 + 15)}" height="12" rx="3" fill="${DU.light(P.base, 0.4)}" stroke="${P.line}" stroke-width="2"/>`; }).join('');
      return DU.union(ds, P.fill, P.line) + cuffs + strap(-1) + strap(1) + fillp(bib, P) + p(`M${cx - 13} ${n(sY + 60)}h26v18q-13 8 -26 0Z`, P.fill, P.line, 1.6) + DU.heart(cx, sY + 71, 6, '#ff9ac1', null) +
        `<circle cx="${cx - 20}" cy="${n(sY + 51)}" r="3.4" fill="#ffd98a" stroke="${P.line}" stroke-width="1.2"/><circle cx="${cx + 20}" cy="${n(sY + 51)}" r="3.4" fill="#ffd98a" stroke="${P.line}" stroke-width="1.2"/>` +
        stitch(`M${cx} ${n(top + 8)}V${n(crotchY + 6)}`, '#ffe9b8') + waistband(R, top, 8, P.fill, P.line, 5);
    },
  });
  Bt({
    id: 'bt_long', name: 'חצאית ארוכה', tags: ['nature', 'princess', 'beach'], color: '#3fbf9a',
    draw(R, P) {
      const { cx, waistY, hipY, ankleY } = R;
      const top = waistY + 4, len = ankleY - 26 - hipY;
      const lt = DU.light(P.base, 0.4);
      const t1 = R.skirt({ top, len: len * 0.42, flare: 16, hemCurve: 4 });
      const d = R.skirt({ top, len, flare: 34, bell: 6, hemSegs: (w, y) => DU.scallopSegs(w, y, 7, 8) });
      return fillp(d, P) + ov(R.skirt({ top: hipY + len * 0.42, len: len, flare: 34, bell: 6, hemSegs: (w, y) => DU.scallopSegs(w, y, 7, 8) }), 'fill="#43206b" fill-opacity=".1"') +
        p(t1, 'none', P.line, 1.4, 'stroke-opacity=".5"') + waistband(R, top - 2, 10, lt, P.line) + DU.flower(cx - 16, top + 3, 6, '#fff');
    },
  });
  Bt({
    id: 'bt_pj', name: 'מכנסי פיג׳מה', tags: ['sleepover'], color: '#7de3e0',
    draw(R, P, ctx) {
      const { cx, waistY, ankleY, crotchY } = R;
      const top = waistY + 6, ds = R.pantsDs({ top, ease: 6, yBot: ankleY - 6, flare: 4 });
      return DU.union(ds, P.fill, P.line) + K.over(ds, K.twinkles(ctx, '#ffffff')) + seam(`M${cx} ${n(crotchY + 8)}V${n(ankleY - 8)}`, P, 0.6, 1.8) +
        waistband(R, top - 2, 9, '#fff', P.line, 6) + DU.bow(cx, top + 4, 7, '#fff', P.line) + seam(`M${cx} ${n(top + 10)}V${n(crotchY + 6)}`, P);
    },
  });
  Bt({
    id: 'bt_snow', name: 'מכנסי שלג', tags: ['winter'], color: '#5cc8ff',
    draw(R, P) {
      const { cx, waistY, ankleY, crotchY, kneeY } = R;
      const top = waistY + 2, ds = R.pantsDs({ top, ease: 9, yBot: ankleY - 2 });
      let q = '';
      [-1, 1].forEach((s) => { for (const y of [crotchY + 40, kneeY + 10, kneeY + 70]) { const l = R.leg(y); q += `M${n(cx + s * l.x - l.w - 8)} ${n(y)}q${n(l.w + 8)} 8 ${n(l.w * 2 + 16)} 0`; } });
      return DU.union(ds, P.fill, P.line) + seam(q, P, 0.4, 1.8) + waistband(R, top - 2, 11, DU.dark(P.base, 0.2), P.line, 9) + seam(`M${cx} ${n(top + 10)}V${n(crotchY + 8)}`, P) + p(`M${cx} ${n(crotchY + 8)}V${n(ankleY - 3)}`, 'none', P.line, 2);
    },
  });
  Bt({
    id: 'bt_sparkle', name: 'חצאית נצנצים', tags: ['party', 'princess'], price: 400, color: 'glitter:#b48cff', fixed: true,
    draw(R, P) {
      const o = { len: 64, flare: 32, bell: 8, hemSegs: (w, y) => DU.scallopSegs(w, y, 5, 9) }, k = skirtDims(R, o);
      return fillp(R.skirt(o), P) + waistband(R, k.top - 2, 9, '#fff', P.line) + DU.star(R.cx, k.top + 3, 7, '#ffd24d', '#c98a1a', 1.4);
    },
  });
  Bt({
    id: 'bt_rainbow', name: 'טוטו קשת', tags: ['magic', 'party'], price: 500, color: 'rainbow', fixed: true,
    draw(R, P, ctx) {
      const { cx, waistY, hipY } = R;
      const top = waistY + 6;
      const P2 = ctx.paint('rainbow', [cx - 110, top, 300, 40]);
      const layer = (len, flare, op) => `<path d="${R.skirt({ top, len, flare, bell: 12, hemSegs: (w, y) => DU.scallopSegs(w, y, 6, 10) })}" fill="${P2.fill}" fill-opacity="${op}" stroke="${P.line}" stroke-width="2"/>`;
      return layer(60, 46, 0.8) + layer(42, 38, 0.9) + layer(24, 28, 1) + waistband(R, top - 2, 8, '#fff', P.line) + DU.sparkle(cx - 40, hipY + 30, 6, '#fff') + DU.sparkle(cx + 34, hipY + 44, 5, '#fff') + DU.star(cx, top + 2, 6, '#ffd24d', '#c98a1a', 1.2);
    },
  });

  /* ============================== DRESSES ============================== */
  const dressSkirt = (R, o) => R.skirt(Object.assign({ top: R.waistY + 2 }, o));

  D({
    id: 'dr_sun', name: 'שמלת קיץ', tags: ['beach', 'nature'], color: '#ffd24d',
    draw(R, P, ctx) {
      const { cx, waistY } = R;
      const bo = { neck: 'square', nd: 22, nw: R.nk + 11, strap: 16, hem: waistY + 8, ease: 2.2 };
      const so = { len: 84, flare: 40, bell: 6 };
      const sk = dressSkirt(R, so), bd = R.top(bo), fl = K.flowers(ctx, '#ffffff');
      return fillp(sk, P) + K.over(sk, fl) + p(sk, 'none', P.line, 2.4) + fillp(bd, P) + waistband(R, waistY, 8, '#fff', P.line, 2.6) +
        frill(cx, R.hipY + 84 + 3, R.hp + 42, 9, '#fff', P.line, 9) + DU.bow(cx + R.wa - 4, waistY + 4, 8, '#fff', P.line, true);
    },
  });
  D({
    id: 'dr_party', name: 'שמלת מסיבה', tags: ['party'], color: '#ff6f91',
    draw(R, P) {
      const { cx, waistY, sY } = R;
      const bo = { neck: 'round', nd: 16, nw: R.nk + 12, hem: waistY + 8, ease: 2.4 };
      const lt = DU.light(P.base, 0.55);
      const under = dressSkirt(R, { len: 78, flare: 50, bell: 12, hemSegs: (w, y) => DU.scallopSegs(w, y, 7, 9) });
      const sk = dressSkirt(R, { len: 64, flare: 46, bell: 12, hemSegs: (w, y) => DU.scallopSegs(w, y, 6, 8) });
      return {
        body: p(under, lt, P.line, 2) + fillp(sk, P) + ov(dressSkirt(R, { len: 14, flare: 16 }), DU.HL) + fillp(R.top(bo), P) + p(R.neckD(bo), 'none', lt, 4) + p(R.neckD(bo), 'none', P.line, 1.1) +
          waistband(R, waistY, 9, lt, P.line, 2.8) + DU.bow(cx, waistY + 5, 15, lt, P.line, true) + DU.heart(cx, sY + 46, 6, lt, null),
        sleeves: sleeves(R, P, { len: 0.28, ease: 3, puff: 9, cap: 1 }, (s) => cuff(R, s, 0.28, 2.5, lt, P.line, 6)),
      };
    },
  });
  D({
    id: 'dr_school', name: 'שמלת סרפן', tags: ['school'], color: '#3a4a8f',
    draw(R, P) {
      const { cx, waistY, sY, nk } = R;
      const W = { fill: '#ffffff', line: '#8a8fa8' };
      const blouse = R.top({ neck: 'round', nd: 6, nw: nk + 7, hem: waistY + 4, ease: 2 });
      const bo = { neck: 'square', nd: 34, nw: nk + 12, strap: 15, hem: waistY + 8, ease: 3 };
      const so = { len: 70, flare: 34 }, k = skirtDims(R, Object.assign({ top: waistY + 2 }, so));
      return {
        body: fillp(blouse, W) + fillp(dressSkirt(R, so), P) + pleats(R, k.top, k.hem, k.w0, k.w1, 4, P, 0.4) + fillp(R.top(bo), P) + collar(R, '#fff', W.line) +
          DU.bow(cx, sY + 16, 9, '#e0435f') + buttons(cx - 12, sY + 50, sY + 50, 1, '#ffd98a', P.line) + buttons(cx + 12, sY + 50, sY + 50, 1, '#ffd98a', P.line) + waistband(R, waistY, 7, DU.light(P.base, 0.15), P.line, 3.2),
        sleeves: sleeves(R, W, { len: 0.28, ease: 3, puff: 5, cap: 1 }),
      };
    },
  });
  D({
    id: 'dr_princess', name: 'שמלת נסיכה', tags: ['princess'], color: '#b48cff',
    draw(R, P) {
      const { cx, waistY, hipY, ankleY, sY } = R;
      const len = ankleY - 8 - hipY;
      const lt = DU.light(P.base, 0.5), dk = DU.dark(P.base, 0.1);
      const bo = { neck: 'square', nd: 18, nw: R.nk + 15, hem: waistY + 10, ease: 2.4 };
      const sk = dressSkirt(R, { len, flare: 86, bell: 26, hemSegs: (w, y) => DU.scallopSegs(w, y, 9, 9) });
      const panel = DU.sym(cx, [[0, waistY + 6], [10, waistY + 6], [26, hipY + len * 0.5, 44, hipY + len - 10, 46, hipY + len + 2], [0, hipY + len + 8]]);
      const over = [-1, 1].map((s) => `M${n(cx + s * (R.wa + 3))} ${n(waistY + 6)}C${n(cx + s * 70)} ${n(hipY + 30)} ${n(cx + s * 96)} ${n(hipY + len * 0.45)} ${n(cx + s * 78)} ${n(hipY + len * 0.62)}C${n(cx + s * 50)} ${n(hipY + len * 0.5)} ${n(cx + s * 22)} ${n(hipY + 40)} ${n(cx + s * 8)} ${n(waistY + 6)}Z`);
      return {
        body: fillp(sk, P) + p(panel, lt, P.line, 1.8) + over.map((d) => p(d, dk, P.line, 1.8) + ov(d, DU.HL.replace('.38', '.14'))).join('') +
          [-1, 1].map((s) => DU.bow(cx + s * 76, hipY + len * 0.6, 9, lt, P.line)).join('') + fillp(R.top(bo), P) + p(R.neckD(bo), 'none', lt, 5) + p(R.neckD(bo), 'none', P.line, 1.1) +
          p(DU.sym(cx, [[0, waistY - 2], [R.wa + 3, waistY - 2], [R.wa + 4, waistY + 8], [0, waistY + 18]]), lt, P.line, 2) + `<path d="${DU.sparkleD(cx, sY + 44, 8)}" fill="#fff"/>` + `<circle cx="${cx}" cy="${n(waistY + 6)}" r="4.2" fill="#ffd24d" stroke="#c98a1a" stroke-width="1.2"/>`,
        sleeves: sleeves(R, P, { len: 0.3, ease: 3, puff: 11, cap: 1 }, (s) => cuff(R, s, 0.3, 2.5, lt, P.line, 6)),
      };
    },
  });
  D({
    id: 'dr_swim', name: 'בגד ים', tags: ['beach', 'sport'], color: '#5cc8ff',
    draw(R, P, ctx) {
      const { cx, waistY, hipY, sY } = R;
      const bo = { neck: 'round', nd: 24, nw: R.nk + 9, strap: 17, hem: hipY + 30, ease: 2 };
      const d = R.top(bo), st = K.dots(ctx, '#ffffff', 18, 2.6);
      const lt = DU.light(P.base, 0.5);
      const fr = dressSkirt(R, { top: hipY - 4, len: 64, flare: 26, bell: 8, hemSegs: (w, y) => DU.scallopSegs(w, y, 6, 8) });
      return fillp(d, P) + K.over(d, st) + p(d, 'none', P.line, 2.4) + p(fr, lt, P.line, 2) + p(R.band(hipY - 6, hipY + 2, 3), P.fill, P.line, 2) +
        p(R.neckD(bo), 'none', lt, 3.4) + p(R.neckD(bo), 'none', P.line, 1.1) + DU.bow(cx, sY + 30, 8, lt, P.line) + (waistY ? '' : '');
    },
  });
  D({
    id: 'dr_pj', name: 'כותונת לילה', tags: ['sleepover'], color: '#ffc1d9',
    draw(R, P, ctx) {
      const { cx, sY, hipY, nk } = R;
      const o = { neck: 'round', nd: 12, nw: nk + 12, hem: hipY + 92, ease: 5, fit: 0.85, flare: 22 };
      const d = R.top(o), st = K.hearts(ctx, '#ffffff', 30, 4.5);
      return {
        body: fillp(d, P) + K.over(d, st) + p(d, 'none', P.line, 2.4) + frill(cx, o.hem, R.side(o.hem) + 27, 9, '#fff', P.line, 9) + p(R.neckD(o), 'none', '#fff', 5) + p(R.neckD(o), 'none', P.line, 1.1) + DU.bow(cx, sY + 18, 8, '#fff', P.line),
        sleeves: sleeves(R, P, { len: 0.34, ease: 3.5, puff: 6, cap: 1 }, (s) => cuff(R, s, 0.34, 3.5, '#fff', P.line, 6)),
      };
    },
  });
  D({
    id: 'dr_winter', name: 'שמלת סריג', tags: ['winter', 'school'], color: '#e0435f',
    draw(R, P, ctx) {
      const { cx, sY, hipY, nk } = R;
      const o = { neck: 'round', nd: 4, nw: nk + 8, hem: hipY + 70, ease: 4, fit: 0.35, flare: 12 };
      const d = R.top(o), kn = K.knit(ctx, P.line);
      const lt = DU.light(P.base, 0.6);
      const neck = DU.sym(cx, [[0, sY - 18], [nk + 4, sY - 18], [nk + 9, sY - 4, nk + 9, sY + 2, nk + 6, sY + 6], [nk * 0.5, sY + 12, 0, sY + 12]]);
      let fair = '';
      for (let x = -R.hp - 20; x <= R.hp + 20; x += 14) fair += `<path d="${DU.sparkleD(cx + x, o.hem - 20, 4.5)}" fill="#fff"/>`;
      const id = ctx.id('cl');
      return {
        body: fillp(d, P) + K.over(d, kn) + DU.clip(id, d, `<rect x="${cx - 150}" y="${n(o.hem - 32)}" width="300" height="4" fill="#fff"/><rect x="${cx - 150}" y="${n(o.hem - 11)}" width="300" height="4" fill="#fff"/>${fair}`) + p(d, 'none', P.line, 2.4) + p(neck, lt, P.line, 2.2),
        sleeves: [-1, 1].map((s) => { const sd = R.sleeve(s, { len: 0.95, ease: 4 }); return fillp(sd, P) + K.over(sd, kn) + p(sd, 'none', P.line, 2.4) + cuff(R, s, 0.95, 4, lt, P.line, 9); }).join(''),
      };
    },
  });
  D({
    id: 'dr_fairy', name: 'שמלת פיה', tags: ['magic', 'nature'], color: '#8bdc7a',
    draw(R, P) {
      const { cx, waistY, sY, nk } = R;
      const bo = { neck: 'v', nd: 24, nw: nk + 11, strap: 18, hem: waistY + 8, ease: 2.2 };
      const lt = DU.light(P.base, 0.45), dk = DU.dark(P.base, 0.16);
      const petal = (w, y) => { const segs = [], c = 5, st = w / c; for (let i = 0; i < c; i++) { const x0 = w - st * i, x1 = w - st * (i + 1); segs.push([(x0 + x1) / 2 + 2, y + 26], [Math.max(0, x1), y - 4]); } return segs; };
      const under = dressSkirt(R, { len: 66, flare: 44, bell: 8, hemSegs: petal });
      const sk = dressSkirt(R, { len: 46, flare: 36, bell: 8, hemSegs: petal });
      return fillp(under, { fill: dk, line: P.line }) + fillp(sk, P) + fillp(R.top(bo), P) + waistband(R, waistY, 8, '#a8703d', '#5e3a1e', 2.6) +
        [-22, 0, 22].map((x) => `<path d="M${cx + x} ${n(waistY + 4)}q-9 -4 -7 -12q9 1 7 12q-2 -11 7 -12q2 8 -7 12Z" fill="${lt}" stroke="${P.line}" stroke-width="1.2"/>`).join('') +
        DU.flower(cx, sY + 30, 7, '#ffc1d9') + DU.sparkle(cx - 46, R.hipY + 30, 5, '#fff') + DU.sparkle(cx + 50, R.hipY + 48, 4, '#fff');
    },
  });
  D({
    id: 'dr_sport', name: 'שמלת טניס', tags: ['sport'], color: '#ffffff',
    draw(R, P) {
      const { cx, waistY, sY, nk } = R;
      const ac = DU.lum(P.base) > 0.85 ? '#ff6f91' : '#ffffff';
      const bo = { neck: 'v', nd: 20, nw: nk + 10, hem: waistY + 8, ease: 2.4 };
      const so = { len: 64, flare: 32 }, k = skirtDims(R, Object.assign({ top: waistY + 2 }, so));
      return {
        body: fillp(dressSkirt(R, so), P) + pleats(R, k.top, k.hem, k.w0, k.w1, 5, P, 0.4) + p(`M${n(cx - k.w1 + 2)} ${n(k.hem - 5)}Q${cx} ${n(k.hem + 4)} ${n(cx + k.w1 - 2)} ${n(k.hem - 5)}`, 'none', ac, 3.5) +
          fillp(R.top(bo), P) + p(R.neckD(bo), 'none', ac, 4) + p(R.neckD(bo), 'none', P.line, 1.1) + collar(R, P.fill, P.line, true) + waistband(R, waistY, 7, ac, P.line, 2.8) + DU.star(cx + 20, sY + 46, 5.5, ac, null),
        sleeves: sleeves(R, P, { len: 0.24, ease: 3 }, (s) => cuff(R, s, 0.24, 3, ac, P.line, 5)),
      };
    },
  });
  D({
    id: 'dr_onesie', name: 'אוברול דובי', tags: ['sleepover', 'winter'], color: '#f3e3c8',
    draw(R, P) {
      const { cx, sY, nk, ankleY, crotchY, waistY, hipY } = R;
      const o = { neck: 'round', nd: 8, nw: nk + 10, hem: crotchY, ease: 7, fit: 0.8 };
      const legs = [R.pantLeg(-1, ankleY - 4, 7, 0, hipY), R.pantLeg(1, ankleY - 4, 7, 0, hipY)];
      const lt = DU.light(P.base, 0.6), dk = DU.dark(P.base, 0.18);
      const tummy = DU.ellD(cx, waistY - 4, 26, 34);
      const hood = DU.sym(cx, [[0, sY - 28], [nk + 16, sY - 28, nk + 28, sY - 14, nk + 28, sY], [nk + 28, sY + 14, nk + 12, sY + 20, 0, sY + 22]]);
      const cuffs = [-1, 1].map((s) => { const l = R.leg(ankleY - 8); return `<rect x="${n(cx + s * l.x - l.w - 8)}" y="${n(ankleY - 15)}" width="${n(l.w * 2 + 16)}" height="12" rx="5" fill="${dk}" stroke="${P.line}" stroke-width="2"/>`; }).join('');
      return {
        body: fillp(hood, P) + ov(hood) + DU.union([R.top(o), ...legs], P.fill, P.line) + cuffs + p(tummy, lt, null) + p(`M${cx} ${n(sY + 14)}V${n(crotchY - 4)}`, 'none', P.line, 1.6, 'stroke-opacity=".5"') +
          `<circle cx="${cx}" cy="${n(sY + 20)}" r="3.4" fill="${dk}" stroke="${P.line}" stroke-width="1.2"/>` + DU.heart(cx - 14, waistY - 18, 5, '#ff9ac1', null),
        sleeves: sleeves(R, P, { len: 0.95, ease: 6 }, (s) => cuff(R, s, 0.95, 5.5, dk, P.line, 10)),
      };
    },
  });
  D({
    id: 'dr_gala', name: 'שמלת נשף נוצצת', tags: ['princess', 'party'], price: 900, color: 'glitter:#ff7fb5', fixed: true,
    draw(R, P, ctx) {
      const { cx, waistY, hipY, ankleY, sY } = R;
      const len = ankleY - 6 - hipY;
      const G = ctx.paint('gold', [cx - 60, waistY - 10, 120, 40]);
      const bo = { neck: 'v', nd: 22, nw: R.nk + 15, hem: waistY + 10, ease: 2.4 };
      const sk = dressSkirt(R, { len, flare: 96, bell: 30, hemSegs: (w, y) => DU.scallopSegs(w, y, 10, 10) });
      const tier = dressSkirt(R, { len: len * 0.55, flare: 70, bell: 28, hemSegs: (w, y) => DU.scallopSegs(w, y, 8, 10) });
      let stars = '';
      [[-70, 0.5, 6], [60, 0.4, 7], [-30, 0.75, 5], [86, 0.78, 6], [-100, 0.85, 5], [20, 0.62, 4], [-8, 0.9, 6]].forEach(([x, t, r]) => (stars += DU.sparkle(cx + x, hipY + len * t, r, '#fff')));
      return {
        body: fillp(sk, P) + ov(sk, 'fill="#43206b" fill-opacity=".12"') + fillp(tier, P) + stars + fillp(R.top(bo), P) + p(R.neckD(bo), 'none', '#fff', 4) + p(R.neckD(bo), 'none', P.line, 1.1) +
          p(R.band(waistY - 2, waistY + 10, 3), G.fill, G.line, 2) + DU.star(cx, waistY + 4, 9, '#fff3b0', '#c98a1a', 1.4) + DU.sparkle(cx, sY + 46, 7, '#fff'),
        sleeves: sleeves(R, P, { len: 0.3, ease: 3, puff: 12, cap: 1 }, (s) => cuff(R, s, 0.3, 2.5, G.fill, G.line, 6)),
      };
    },
  });
  D({
    id: 'dr_rainbow', name: 'שמלת קשת', tags: ['magic', 'party'], price: 700, color: 'rainbow', fixed: true,
    draw(R, P, ctx) {
      const { cx, waistY, hipY } = R;
      const P2 = ctx.paint('rainbow', [cx - 120, hipY, 300, 60]);
      const bo = { neck: 'round', nd: 18, nw: R.nk + 12, strap: 20, hem: waistY + 8, ease: 2.2 };
      const W = { fill: '#ffffff', line: '#8a8fa8' };
      const layer = (len, flare) => `<path d="${dressSkirt(R, { len, flare, bell: 14, hemSegs: (w, y) => DU.scallopSegs(w, y, 7, 10) })}" fill="${P2.fill}" stroke="${P.line}" stroke-width="2"/>`;
      const cloud = (x, y, k) => `<path d="M${n(x - 16 * k)} ${n(y)}a${8 * k} ${8 * k} 0 0 1 ${7 * k} -${10 * k}a${10 * k} ${10 * k} 0 0 1 ${19 * k} -${2 * k}a${8 * k} ${8 * k} 0 0 1 ${6 * k} ${12 * k}Z" fill="#fff" stroke="${W.line}" stroke-width="1.4"/>`;
      return layer(86, 54) + layer(62, 46) + layer(38, 36) + fillp(R.top(bo), W) + cloud(cx - 22, waistY + 12, 1) + cloud(cx + 18, waistY + 13, 0.9) + cloud(cx - 2, waistY + 15, 1.1) + DU.sparkle(cx, R.sY + 50, 7, '#ffd24d');
    },
  });
  D({
    id: 'dr_mermaid', name: 'שמלת בת ים', tags: ['beach', 'magic'], price: 800, color: 'mermaid', fixed: true,
    draw(R, P, ctx) {
      const { cx, waistY, hipY, ankleY, kneeY, hp } = R;
      const bo = { neck: 'round', nd: 22, nw: R.nk + 11, strap: 18, hem: waistY + 8, ease: 2.2 };
      const yK = kneeY + 40, yB = ankleY + 6;
      const sk = DU.sym(cx, [[0, waistY + 2], [R.side(waistY + 2) + 2.5, waistY + 2], ...DU.cr([[R.side(waistY + 2) + 2.5, waistY + 2], [hp + 4, hipY], [hp - 4, kneeY - 10], [hp - 12, yK]]),
        [hp + 10, yK + 20, hp + 52, yB - 30, hp + 60, yB], [hp + 30, yB - 12], [hp + 14, yB + 6], [hp - 6, yB - 12], [14, yB + 8], [0, yB - 10]]);
      const sc = K.scales(ctx, '#ffffff');
      const shell = (s) => `<path d="M${n(cx + s * 17)} ${n(R.sY + 54)}c${s * -14} -2 ${s * -16} -20 0 -22c${s * 16} 2 ${s * 14} 20 0 22Z" fill="#ffc1d9" stroke="${P.line}" stroke-width="1.5"/>`;
      return fillp(sk, P) + K.over(sk, sc) + p(sk, 'none', P.line, 2.4) + ov(DU.sym(cx, [[0, yK + 6], [hp - 12, yK], [hp + 10, yK + 20, hp + 52, yB - 30, hp + 60, yB], [hp + 30, yB - 12], [hp + 14, yB + 6], [hp - 6, yB - 12], [14, yB + 8], [0, yB - 10]]), DU.HL) +
        fillp(R.top(bo), P) + shell(-1) + shell(1) + waistband(R, waistY, 7, '#fff3b0', '#c98a1a', 2.6) + DU.sparkle(cx + 40, hipY + 60, 6, '#fff') + DU.sparkle(cx - 34, kneeY, 5, '#fff');
    },
  });
  D({
    id: 'dr_star', name: 'שמלת כוכבים', tags: ['magic', 'princess'], price: 800, color: 'galaxy', fixed: true,
    draw(R, P, ctx) {
      const { cx, waistY, hipY, sY } = R;
      const bo = { neck: 'boat', nd: 10, nw: R.nk + 13, hem: waistY + 8, ease: 2.4 };
      const st = K.twinkles(ctx, '#fff6c2', 36);
      const sk = dressSkirt(R, { len: 96, flare: 58, bell: 16, hemSegs: (w, y) => { const segs = [], c = 6, sp = w / c; for (let i = 0; i < c; i++) { const x0 = w - sp * i, x1 = w - sp * (i + 1); segs.push([(x0 + x1) / 2, y + 18], [Math.max(0, x1), y]); } return segs; } });
      const bd = R.top(bo);
      return {
        body: fillp(sk, P) + K.over(sk, st) + p(sk, 'none', P.line, 2.4) + fillp(bd, P) + K.over(bd, st) + p(bd, 'none', P.line, 2.4) + waistband(R, waistY, 8, '#fff3b0', '#c98a1a', 2.6) +
          `<path d="M${cx - 8} ${n(waistY + 12)}a11 11 0 1 0 12 -14a8.5 8.5 0 1 1 -12 14Z" fill="#fff3b0" stroke="#c98a1a" stroke-width="1.2"/>` + DU.sparkle(cx - 50, hipY + 50, 7, '#fff') + DU.sparkle(cx + 56, hipY + 76, 6, '#fff') + DU.sparkle(cx, sY + 44, 6, '#fff'),
        sleeves: [-1, 1].map((s) => { const sd = R.sleeve(s, { len: 0.8, ease: 3, bell: 14 }); return `<path d="${sd}" fill="${P.fill}" fill-opacity=".8" stroke="${P.line}" stroke-width="2.4"/>` + K.over(sd, st); }).join(''),
      };
    },
  });

  DU.addItems(items);
})();
