/* rig.js — the one body template.
   Every garment is drawn from these points, so everything lines up whatever height
   or muscles the girl has. Body coordinates: a 750×1000 card, x-centre 375, feet on y=950.
   The head (face, hair, hats, glasses…) is drawn in its own "head coordinates":
   origin between the eyes, face from y=-108 (top of skull) to y=+90 (chin), half-width 80;
   the renderer places it with translate(cx, headY) scale(hs). */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const { n } = DU;

  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth01 = (t) => t * t * (3 - 2 * t);
  /* interpolate a list of keys sorted by k[key] */
  function at(keys, key, v, fields, ease) {
    if (v <= keys[0][key]) return keys[0];
    for (let i = 1; i < keys.length; i++) {
      if (v <= keys[i][key]) {
        let t = (v - keys[i - 1][key]) / (keys[i][key] - keys[i - 1][key] || 1);
        if (ease) t = smooth01(t);
        const o = {};
        fields.forEach((f) => (o[f] = lerp(keys[i - 1][f], keys[i][f], t)));
        o[key] = v;
        return o;
      }
    }
    return keys[keys.length - 1];
  }

  DU.rig = function (body) {
    const h = Math.max(-2, Math.min(2, (body && body.h) || 0)); // height: -2 … 2
    const m = Math.max(0, Math.min(3, (body && body.m) || 0)); // muscles: 0 … 3
    const cx = 375, ground = 950;
    const ankleY = ground - 24;
    const legLen = 286 + h * 20;
    const crotchY = ankleY - legLen;
    const kneeY = crotchY + legLen * 0.47;
    const hipY = crotchY - 36;
    const torso = 184 + h * 6;
    const sY = crotchY - torso; // shoulder line
    const waistY = sY + (hipY - sY) * 0.6;
    const neckY = sY - 22; // chin level
    const hs = 0.96;
    const headY = neckY + 10 - 90 * hs;
    // half widths
    const sh = 59 + m * 3.6, ch = 45 + m * 2.4, wa = 36 + m * 2.4, hp = 51 + m * 2, nk = 14 + m * 1;
    const tw = 25.5 + m * 1.6; // thigh

    const R = { h, m, cx, ground, ankleY, legLen, crotchY, kneeY, hipY, sY, waistY, neckY, hs, headY, sh, ch, wa, hp, nk, tw };
    R.headTop = headY - 108 * hs;
    R.chestY = sY + 56; // armpit level

    /* ----- arms: t = 0 shoulder … 0.5 elbow … 1 wrist; x is the offset from cx (right side) ----- */
    const S = [sh - 12, sY + 14], E = [sh + 6, sY + 92 + h * 3], W = [sh + 15, sY + 164 + h * 6];
    const armKeys = [
      { t: 0, x: S[0], y: S[1], w: 14 + m * 1.5 },
      { t: 0.27, x: lerp(S[0], E[0], 0.54), y: lerp(S[1], E[1], 0.54), w: 12.6 + m * 2.2 }, // bicep
      { t: 0.5, x: E[0], y: E[1], w: 10.6 + m * 1 }, // elbow
      { t: 0.66, x: lerp(E[0], W[0], 0.32), y: lerp(E[1], W[1], 0.32), w: 10.8 + m * 1.6 }, // forearm
      { t: 1, x: W[0], y: W[1], w: 7.2 + m * 0.4 }, // wrist
    ];
    R.arm = (t) => at(armKeys, 't', t, ['x', 'y', 'w']);
    /* spine for DU.tube along the arm on side s (+1 = right of the picture, -1 = left) */
    R.armSpine = function (s, t0 = 0, t1 = 1, ease = 0) {
      const ts = [t0, ...armKeys.map((k) => k.t).filter((t) => t > t0 + 0.02 && t < t1 - 0.02), t1];
      return ts.map((t) => { const a = R.arm(t); return { x: cx + s * a.x, y: a.y, w: a.w + ease }; });
    };
    R.shoulder = (s) => ({ x: cx + s * S[0], y: S[1] });
    R.elbow = (s) => ({ x: cx + s * E[0], y: E[1] });
    R.wrist = (s) => ({ x: cx + s * W[0], y: W[1], w: 7.2 + m * 0.4 });
    R.armAngle = (Math.atan2(W[0] - E[0], W[1] - E[1]) * 180) / Math.PI; // degrees from vertical
    /* centre of the closed hand (where a held thing sits) */
    R.hand = (s) => {
      const a = (R.armAngle * Math.PI) / 180;
      return { x: cx + s * (W[0] + Math.sin(a) * 17), y: W[1] + Math.cos(a) * 17 };
    };

    /* ----- legs: keyed by y; x is the centre offset from cx ----- */
    const legTop = hipY - 6;
    const legKeys = [
      { y: legTop, x: hp - tw, w: tw },
      { y: crotchY + 14, x: hp - tw - 0.4, w: tw - 0.6 },
      { y: lerp(crotchY, kneeY, 0.6), x: 26 + m * 0.5, w: 21.5 + m * 1.5 },
      { y: kneeY, x: 25.5 + m * 0.4, w: 16.6 + m * 0.9 },
      { y: lerp(kneeY, ankleY, 0.3), x: 25.5 + m * 0.4, w: 16.6 + m * 2 }, // calf
      { y: lerp(kneeY, ankleY, 0.72), x: 24.6, w: 12 + m * 0.9 },
      { y: ankleY, x: 24, w: 9.8 + m * 0.5 },
    ];
    R.legTop = legTop;
    R.leg = (y) => at(legKeys, 'y', y, ['x', 'w']);
    R.legSpine = function (s, y0 = legTop, y1 = ankleY, ease = 0, flare = 0) {
      const ys = [y0, ...legKeys.map((k) => k.y).filter((y) => y > y0 + 4 && y < y1 - 4), y1];
      return ys.map((y) => {
        const l = R.leg(y);
        const f = flare ? flare * Math.pow(Math.max(0, (y - y0) / (y1 - y0 || 1)), 1.6) : 0;
        return { x: cx + s * l.x, y, w: l.w + ease + f };
      });
    };
    R.ankle = (s) => ({ x: cx + s * 24, y: ankleY, w: 9.8 + m * 0.5 });
    /* y on the leg: t = 0 crotch … 1 ankle */
    R.legY = (t) => crotchY + (ankleY - crotchY) * t;

    /* ----- torso ----- */
    const sideKeys = [
      { y: sY + 20, w: sh }, { y: sY + 56, w: ch }, { y: waistY, w: wa }, { y: hipY, w: hp }, { y: crotchY, w: hp - 1.5 },
    ];
    R.side = (y) => at(sideKeys, 'y', y, ['w'], true).w; // half width of the torso at y
    R.shY = (dx) => { // y of the top of the shoulder at offset dx from the centre
      const t = Math.max(0, Math.min(1, (dx - nk) / (sh - nk)));
      return sY - 6 + 20 * Math.pow(t, 1.3);
    };
    R.torsoD = DU.sym(cx, [
      [nk, neckY - 6],
      [nk, sY - 13],
      [nk, sY - 4, nk + 12, sY + 1, sh - 14, sY + 5],
      [sh - 5, sY + 7, sh, sY + 12, sh, sY + 22],
      [ch, sY + 54],
      [ch + 1, sY + 80, wa, waistY - 26, wa, waistY],
      [wa, waistY + 24, hp, hipY - 26, hp, hipY],
      [hp, hipY + 20, hp - 2, crotchY - 6, 22, crotchY + 8],
      [0, crotchY + 10],
    ]);

    /* ================= garment builders ================= */

    /* points down one side of the torso from yTop to yBot (dx,y pairs for DU.cr / DU.sym)
       ease: extra room; fit: 0 follows the body … 1 straight line (boxy); flare: extra half width at the hem */
    R.sidePts = function (yTop, yBot, ease = 2, fit = 0, flare = 0) {
      const ys = [yTop, ...[sY + 56, waistY, hipY, crotchY].filter((y) => y > yTop + 10 && y < yBot - 10), yBot];
      const w0 = R.side(yTop) + ease, w1 = R.side(yBot) + ease + flare;
      return ys.map((y) => {
        const t = (y - yTop) / (yBot - yTop || 1);
        const follow = R.side(y) + ease + flare * Math.pow(t, 1.5);
        return [lerp(follow, lerp(w0, w1, t), fit), y];
      });
    };

    /* body of a top / bodice. o = {
         neck: 'round' | 'v' | 'square' | 'boat', nd: neck depth below the shoulder line, nw: neck half width,
         strap: width of a strap (sleeveless); omit for tops with sleeves (reaches the shoulder tip),
         hem: y of the hem, ease, fit, flare, hemSegs: extra sym() segments from the hem corner inward (scallops…) }
       returns path data. */
    R.top = function (o = {}) {
      const e = o.ease == null ? 2 : o.ease;
      const hem = o.hem == null ? hipY + 8 : o.hem;
      const nw = Math.min(o.nw == null ? nk + 9 : o.nw, sh - 8);
      const nd = o.nd == null ? 12 : o.nd;
      const ny = R.shY(nw) - 2;
      const segs = [];
      if (o.neck === 'v') segs.push([0, sY + nd], [nw, ny]);
      else if (o.neck === 'square') segs.push([0, sY + nd], [nw - 2, sY + nd], [nw, ny]);
      else if (o.neck === 'boat') segs.push([0, sY + nd], [nw * 0.7, sY + nd, nw, sY + nd, nw + 6, ny + 3]);
      else segs.push([0, sY + nd], [nw * 0.62, sY + nd, nw, sY + nd * 0.5, nw, ny]);
      const armY = sY + 56 + (o.armDrop || 0);
      if (o.strap) {
        const so = Math.min(nw + o.strap, sh - 3);
        segs.push([so, R.shY(so) - 2]);
        segs.push([so - 1, sY + 28, ch + e - 7, armY - 4, ch + e, armY]);
      } else {
        segs.push([sh - 2, R.shY(sh - 2) - 2], [sh + 1, sY + 24], [ch + e, armY]);
      }
      const side = R.sidePts(armY, hem, e, o.fit || 0, o.flare || 0);
      segs.push(...DU.cr(side));
      if (o.hemSegs) segs.push(...o.hemSegs(side[side.length - 1][0], hem));
      else if (o.hemCurve) segs.push([side[side.length - 1][0] * 0.5, hem + o.hemCurve, 0, hem + o.hemCurve]);
      return DU.sym(cx, segs);
    };

    /* a sleeve on side s. o = { len: 0…1 along the arm, ease, puff: extra width at the top,
       bell: extra width at the cuff, cap: roundness at the shoulder } → path data */
    R.sleeve = function (s, o = {}) {
      const len = o.len == null ? 0.3 : o.len, e = o.ease == null ? 2.5 : o.ease;
      const sp = R.armSpine(s, 0, len, e);
      if (o.puff) sp.forEach((p, i) => { const t = i / (sp.length - 1 || 1); p.w += o.puff * Math.sin(Math.PI * Math.min(1, t * (len < 0.4 ? 0.75 : 1.6))) ; });
      if (o.bell) sp.forEach((p, i) => { const t = i / (sp.length - 1 || 1); p.w += o.bell * t * t; });
      return DU.tube(sp, o.cap == null ? 0.85 : o.cap, 0);
    };
    /* where a sleeve of length len ends: { x, y, w (half width), rot (degrees, for a band drawn horizontally) } */
    R.cuff = function (s, len, ease = 2.5) {
      const a = R.arm(len), b = R.arm(Math.max(0, len - 0.06));
      const ang = (Math.atan2(a.x - b.x, a.y - b.y) * 180) / Math.PI;
      return { x: cx + s * a.x, y: a.y, w: a.w + ease, rot: -s * ang };
    };
    /* a trouser leg on side s from the hip down to yBot (use R.legY(t)). → path data */
    R.pantLeg = function (s, yBot, ease = 2.5, flare = 0, yTop) {
      return DU.tube(R.legSpine(s, yTop == null ? legTop : yTop, yBot, ease, flare), 0.6, 0);
    };
    /* the hip part of trousers / shorts: from the waistband (top) to the crotch. → path data */
    R.pelvis = function (top, ease = 2.5) {
      const pts = R.sidePts(top, crotchY, ease);
      return DU.sym(cx, [[0, top], pts[0], ...DU.cr(pts), [hp - 6 + ease, crotchY + 16, 12, crotchY + 12, 0, crotchY + 10]]);
    };
    /* whole trousers as one silhouette (pelvis + both legs): returns markup. */
    R.pants = function (o, fill, line) {
      const top = o.top == null ? waistY + 4 : o.top, e = o.ease == null ? 2.5 : o.ease;
      const yBot = o.yBot == null ? ankleY - 4 : o.yBot;
      const parts = [R.pelvis(top, e), R.pantLeg(-1, yBot, e, o.flare || 0), R.pantLeg(1, yBot, e, o.flare || 0)];
      return DU.union(parts, fill, line);
    };
    /* a skirt. o = { top: waist y, len: length below the hip line, flare: extra half width at the hem,
       ease, hemSegs(dx, y): custom hem going inward } → path data */
    R.skirt = function (o = {}) {
      const top = o.top == null ? waistY + 4 : o.top, e = o.ease == null ? 2.5 : o.ease;
      const hem = hipY + (o.len == null ? 70 : o.len), fl = o.flare == null ? 26 : o.flare;
      const w0 = R.side(top) + e, w1 = hp + e + fl;
      const pts = [[w0, top], [lerp(w0, w1, 0.42) + (o.bell || 0), lerp(top, hem, 0.35)], [lerp(w0, w1, 0.8) + (o.bell || 0) * 0.6, lerp(top, hem, 0.72)], [w1, hem]];
      const segs = [[0, top - (o.dip || 0)], pts[0], ...DU.cr(pts)];
      if (o.hemSegs) segs.push(...o.hemSegs(w1, hem));
      else segs.push([w1 * 0.5, hem + (o.hemCurve == null ? 6 : o.hemCurve), 0, hem + (o.hemCurve == null ? 6 : o.hemCurve)]);
      return DU.sym(cx, segs);
    };
    /* a waistband / belt between two y's following the body → path data */
    R.band = function (y0, y1, ease = 3) {
      const a = R.side(y0) + ease, b = R.side(y1) + ease;
      return DU.sym(cx, [[0, y0], [a, y0], [b, y1], [0, y1]]);
    };
    return R;
  };

  /* Several overlapping parts drawn as ONE silhouette: strokes first, fills on top. */
  DU.union = function (ds, fill, line, sw = 2.4) {
    return (
      ds.map((d) => `<path d="${d}" fill="${fill}" stroke="${line}" stroke-width="${sw * 2}"/>`).join('') +
      ds.map((d) => `<path d="${d}" fill="${fill}"/>`).join('')
    );
  };
})();
