/* body.js — skin: legs, torso, arms, hands, the plain base outfit, and the head shape. */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const { n, p } = DU;

  DU.skinPaint = function (hex) {
    return {
      fill: hex,
      shade: DU.mix(DU.mix(hex, '#c4486f', 0.24), '#4a2040', 0.1),
      blush: DU.mix(hex, '#ff5f7e', 0.45),
      line: DU.mix(hex, '#3d1423', 0.6),
    };
  };

  const B = (DU.body = {});

  /* bare foot on side s */
  function footD(R, s) {
    const a = R.ankle(s), x = a.x, g = R.ground, w = a.w;
    const o = s; // toes point a little outward
    return (
      `M${n(x - w)} ${n(a.y - 8)}` +
      `C${n(x - w - 1)} ${n(a.y + 6)} ${n(x - 12 - 2 * o)} ${n(g - 11)} ${n(x - 12 + 2 * o)} ${n(g - 3)}` +
      `C${n(x - 10 + 2 * o)} ${n(g + 2)} ${n(x + 11 + 3 * o)} ${n(g + 2)} ${n(x + 13 + 2 * o)} ${n(g - 3)}` +
      `C${n(x + 14 + 2 * o)} ${n(g - 11)} ${n(x + w + 1)} ${n(a.y + 6)} ${n(x + w)} ${n(a.y - 8)}Z`
    );
  }
  B.footD = footD;

  /* legs + feet + torso + neck, then the base outfit (always worn) */
  B.lower = function (R, sk) {
    const { cx, sY, neckY, nk, kneeY, crotchY, hipY, waistY, hp, ch, wa, m } = R;
    const legs = [-1, 1].map((s) => DU.tube(R.legSpine(s), 0.7, 0.3));
    const feet = [-1, 1].map((s) => footD(R, s));
    let out = DU.union([R.torsoD, ...legs, ...feet], sk.fill, sk.line);
    // soft shading: under the chin, inner legs
    out += `<path d="M${n(cx - nk)} ${n(neckY - 4)}L${n(cx + nk)} ${n(neckY - 4)}L${n(cx + nk)} ${n(neckY + 9)}Q${n(cx)} ${n(neckY + 27)} ${n(cx - nk)} ${n(neckY + 9)}Z" fill="${sk.shade}"/>`;
    [-1, 1].forEach((s) => {
      const k = R.leg(kneeY), kx = cx + s * k.x;
      // knee
      out += p(`M${n(kx - 6)} ${n(kneeY - 3)}Q${n(kx)} ${n(kneeY + 3)} ${n(kx + 6)} ${n(kneeY - 3)}`, 'none', sk.shade, 2.2);
      // toes
      const a = R.ankle(s);
      out += p(`M${n(a.x - 3 + s * 2)} ${n(R.ground - 5)}v3.5M${n(a.x + 3 + s * 2)} ${n(R.ground - 5)}v3.5`, 'none', sk.shade, 1.6);
      if (m >= 2) {
        const c = R.leg(kneeY + (R.ankleY - kneeY) * 0.3), x = cx + s * (c.x + c.w - 5);
        out += p(`M${n(x)} ${n(kneeY + 26)}q${n(s * 3)} 22 ${n(-s * 2)} 44`, 'none', sk.shade, 1.8, 'stroke-opacity=".7"');
        const t = R.leg(crotchY + 60), tx = cx + s * (t.x + t.w - 6);
        out += p(`M${n(tx)} ${n(crotchY + 44)}q${n(s * 3)} 30 ${n(-s * 3)} 62`, 'none', sk.shade, 1.8, 'stroke-opacity=".6"');
      }
    });
    // collarbones
    out += p(`M${n(cx - nk - 3)} ${n(sY + 3)}q-12 3 -20 1M${n(cx + nk + 3)} ${n(sY + 3)}q12 3 20 1`, 'none', sk.shade, 1.8, 'stroke-opacity=".8"');

    /* --- base outfit: plain tank top + shorts --- */
    const tankF = '#ffffff', tankL = '#a79cc8', shortsF = '#d9d2f5', shortsL = '#8b7fb5';
    const hemY = crotchY + 34;
    const lg = R.leg(hemY);
    const shorts = DU.sym(cx, [
      [0, hipY - 14], [R.side(hipY - 14) + 2, hipY - 14],
      [hp + 3, hipY + 14, lg.x + lg.w + 3.5, hemY - 26, lg.x + lg.w + 3, hemY],
      [Math.max(1.2, lg.x - lg.w - 2.5), hemY + 2],
      [Math.max(1, lg.x - lg.w - 1), crotchY + 20, 2, crotchY + 12, 0, crotchY + 11],
    ]);
    out += p(shorts, shortsF, shortsL, 2.2);
    out += p(`M${n(cx)} ${n(hipY + 4)}V${n(crotchY + 10)}`, 'none', shortsL, 1.5, 'stroke-opacity=".6"');
    const tank = R.top({ neck: 'round', nd: 30, nw: nk + 8, strap: 15, hem: hipY + 6, ease: 1.5 });
    out += p(tank, tankF, tankL, 2.2);
    return out;
  };

  /* arms, without the hands. The fill has no stroke at the shoulder so the arm melts into it. */
  B.arms = function (R, sk) {
    const { cx, sY, sh, m } = R;
    const one = (s) => {
      const sp = R.armSpine(s);
      let out = `<path d="${DU.tube(sp, 0.62, 0.2)}" fill="${sk.fill}"/>`;
      const sides = sp.map((q, i) => {
        const a = sp[Math.max(0, i - 1)], b = sp[Math.min(sp.length - 1, i + 1)];
        let tx = b.x - a.x, ty = b.y - a.y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
        return [[q.x - ty * q.w, q.y + tx * q.w], [q.x + ty * q.w, q.y - tx * q.w]];
      });
      const outer = sides.map((q) => (s > 0 ? q[1] : q[0])), inner = sides.map((q) => (s > 0 ? q[0] : q[1]));
      // outer contour: from the top of the shoulder, round the deltoid, down to the wrist
      const w0 = sp[0].w, sx = sp[0].x, sy = sp[0].y;
      const oc = [[sx - s * w0 * 0.85, sy - w0 * 0.8], [sx + s * w0 * 0.3, sy - w0 * 0.68], outer[0], ...outer.slice(1)];
      out += p(DU.smooth(oc), 'none', sk.line, 2.4);
      // inner contour: from the armpit down
      const ic = inner.slice(1);
      ic[0] = [ic[0][0], ic[0][1] + 10];
      out += p(DU.smooth(ic), 'none', sk.line, 2.4);
      if (m >= 2) {
        const b = R.arm(0.27), bx = cx + s * b.x;
        out += p(`M${n(bx + s * (b.w - 5))} ${n(b.y - 14)}q${n(s * 3)} 12 ${n(-s * 2)} 26`, 'none', sk.shade, 1.8, 'stroke-opacity=".7"');
        out += p(`M${n(bx - s * (b.w - 4))} ${n(b.y - 4)}q${n(-s * 2)} 8 ${n(s * 1)} 16`, 'none', sk.shade, 1.6, 'stroke-opacity=".5"');
      }
      return out;
    };
    return one(-1) + one(1);
  };

  /* hands (drawn late so they can sit over bag handles, wands…) */
  B.hands = function (R, sk) {
    const one = (s) => {
      const w = R.wrist(s);
      const k = w.w / 7.2;
      const palm = `M${n(-6.6 * k)} -4C-8.6 6 -9.6 16 -7.6 25C-6 33 3.5 35 6.8 28C9.6 21 8.6 8 ${n(6.6 * k)} -4Z`;
      const thumb = 'M-7 4C-13.5 8.5 -15 18 -11 22.5C-9 24 -7.4 21.5 -7.8 17.5';
      let g = `<path d="${palm}" fill="${sk.fill}" stroke="${sk.line}" stroke-width="2.3"/>`;
      g += `<path d="M${n(-6.2 * k)} -5.5L${n(6.2 * k)} -5.5L${n(6 * k)} 1L${n(-6 * k)} 1Z" fill="${sk.fill}"/>`;
      g += `<path d="${thumb}" fill="${sk.fill}" stroke="${sk.line}" stroke-width="2.3"/>`;
      g += `<path d="M-1.6 26.5v5M2.8 25.8v4.6" fill="none" stroke="${sk.shade}" stroke-width="1.6"/>`;
      const sc = s > 0 ? '' : ' scale(-1 1)';
      return `<g transform="translate(${n(w.x)} ${n(w.y)})${sc} rotate(${n(-R.armAngle)})">${g}</g>`;
    };
    return one(-1) + one(1);
  };

  /* ---------- head (head coordinates) ---------- */
  const FACES = {
    soft: [[58, 58], [42, 78], [18, 90]],
    round: [[63, 60], [48, 83], [22, 91]],
    heart: [[54, 55], [36, 76], [11, 90]],
  };
  DU.FACES = FACES;
  B.faceD = function (shape) {
    const f = FACES[shape] || FACES.soft;
    return DU.sym(0, [
      [0, -108],
      [46, -108, 80, -74, 80, -24],
      [80, 10, 74, 36, f[0][0], f[0][1]],
      [f[1][0], f[1][1], f[2][0], f[2][1], 0, 90],
    ]);
  };
  B.head = function (sk, shape) {
    let out = '';
    // ears
    const ear = `<path d="M74 2C86 -6 92 6 88 20C86 30 80 36 74 32Z" fill="${sk.fill}" stroke="${sk.line}" stroke-width="2.3"/><path d="M80 8Q85 14 80 24" fill="none" stroke="${sk.shade}" stroke-width="1.8"/>`;
    out += DU.both(0, ear);
    out += p(B.faceD(shape), sk.fill, sk.line, 2.4);
    // nose: a tiny soft mark
    out += p('M-2.5 36Q1.5 41 -1 44.5', 'none', sk.shade, 2.1);
    return out;
  };
})();
