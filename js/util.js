/* util.js — small helpers shared by all the art: colors, smooth paths, cute shapes.
   Everything lives on window.DU. Art is plain SVG strings (no filters, no CSS classes,
   no <text>) so the same markup renders in the page and in the PNG export. */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});

  const n = (v) => Math.round(v * 10) / 10;
  DU.n = n;

  /* ---------- colors ---------- */
  function rgb(hex) {
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const v = parseInt(h, 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }
  function toHex(r, g, b) {
    return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  }
  DU.mix = (a, b, t) => {
    const A = rgb(a), B = rgb(b);
    return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  };
  DU.dark = (c, t = 0.25) => DU.mix(c, '#3a1d4d', t); // shadows lean plum, like cel shading
  DU.light = (c, t = 0.3) => DU.mix(c, '#ffffff', t);
  DU.line = (c) => DU.mix(c, '#2b1630', 0.62); // outline color that belongs to a fill
  DU.lum = (c) => { const [r, g, b] = rgb(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

  /* Universal overlays: work on solid colors and on gradient / pattern fills alike. */
  DU.SH = 'fill="#43206b" fill-opacity=".2" stroke="none"'; // shadow overlay
  DU.SH2 = 'fill="#43206b" fill-opacity=".34" stroke="none"'; // deeper shadow
  DU.HL = 'fill="#ffffff" fill-opacity=".38" stroke="none"'; // highlight overlay

  /* ---------- paints (solid colors + special sparkly fills) ----------
     spec: '#rrggbb' | 'rainbow' | 'gold' | 'silver' | 'galaxy' | 'sunset' | 'mermaid' | 'glitter:#rrggbb'
     box:  [x, y, w, h] the area the gradient should span (user space).
     returns { fill, line, base, defs } — put defs once before using fill. */
  const GRADS = {
    rainbow: ['#ff6f91', '#ffa45c', '#ffe066', '#7ddc8a', '#5cc8ff', '#b48cff'],
    gold: ['#fff3b0', '#ffd24d', '#f5a623', '#ffe27a'],
    silver: ['#ffffff', '#d9deee', '#aab2cf', '#eef1fb'],
    galaxy: ['#2b1d6e', '#6a3fc4', '#c259d6', '#ff8fc7', '#5cc8ff'],
    sunset: ['#ff7eb3', '#ff9a76', '#ffd166'],
    mermaid: ['#7af0d2', '#5cc8ff', '#b48cff', '#ff9ad5'],
    candy: ['#ff9ad5', '#ffffff', '#8fe3ff', '#ffffff', '#ff9ad5'],
  };
  DU.GRADS = GRADS;
  DU.paint = function (spec, id, box) {
    spec = spec || '#cccccc';
    if (spec[0] === '#') return { fill: spec, line: DU.line(spec), base: spec, defs: '' };
    const [x, y, w, h] = box || [0, 0, 750, 1000];
    if (spec.startsWith('glitter:')) {
      const c = spec.slice(8);
      const defs =
        `<pattern id="${id}" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">` +
        `<rect width="26" height="26" fill="${c}"/>` +
        `<path d="${DU.sparkleD(6, 6, 4.2)}" fill="#fff" fill-opacity=".9"/>` +
        `<path d="${DU.sparkleD(19, 17, 3)}" fill="#fff" fill-opacity=".75"/>` +
        `<circle cx="17" cy="5" r="1.1" fill="#fff" fill-opacity=".8"/><circle cx="5" cy="19" r="1.3" fill="${DU.light(c, 0.6)}"/>` +
        `<circle cx="12" cy="12" r=".9" fill="#fff" fill-opacity=".7"/></pattern>`;
      return { fill: `url(#${id})`, line: DU.line(c), base: c, defs };
    }
    const stops = GRADS[spec] || GRADS.rainbow;
    const st = stops.map((c, i) => `<stop offset="${n((i / (stops.length - 1)) * 100)}%" stop-color="${c}"/>`).join('');
    const defs = `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${n(x)}" y1="${n(y)}" x2="${n(x + w * 0.35)}" y2="${n(y + h)}">${st}</linearGradient>`;
    const base = stops[Math.floor(stops.length / 2)];
    return { fill: `url(#${id})`, line: DU.line(base), base, defs };
  };
  /* CSS background for a swatch button showing a paint spec */
  DU.swatchCss = function (spec) {
    if (!spec) return '#fff';
    if (spec[0] === '#') return spec;
    if (spec.startsWith('glitter:')) {
      const c = spec.slice(8);
      return `radial-gradient(circle at 30% 30%, #fff 0 9%, transparent 10%), radial-gradient(circle at 70% 62%, #fff 0 7%, transparent 8%), radial-gradient(circle at 42% 78%, #fff 0 5%, transparent 6%), ${c}`;
    }
    return `linear-gradient(160deg, ${(GRADS[spec] || GRADS.rainbow).join(', ')})`;
  };

  /* ---------- path builders ---------- */
  /* Catmull-Rom spline through [x,y] points → SVG path */
  function crSegs(pts, closed, k) {
    const L = pts.length;
    const g = (i) => (closed ? pts[(i + L) % L] : pts[Math.max(0, Math.min(L - 1, i))]);
    const out = [];
    const count = closed ? L : L - 1;
    for (let i = 0; i < count; i++) {
      const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
      out.push([
        p1[0] + ((p2[0] - p0[0]) / 6) * k, p1[1] + ((p2[1] - p0[1]) / 6) * k,
        p2[0] - ((p3[0] - p1[0]) / 6) * k, p2[1] - ((p3[1] - p1[1]) / 6) * k,
        p2[0], p2[1],
      ]);
    }
    return out;
  }
  const segStr = (s) => 'C' + s.map(n).join(' ');
  DU.smooth = function (pts, closed, k = 1) {
    if (pts.length < 2) return '';
    return `M${n(pts[0][0])} ${n(pts[0][1])}` + crSegs(pts, closed, k).map(segStr).join('') + (closed ? 'Z' : '');
  };
  /* Cubic segments (for DU.sym) that pass smoothly through pts, starting at pts[0] */
  DU.cr = (pts, k = 1) => crSegs(pts, false, k);

  /* Symmetric closed path around the vertical line x = cx.
     segs[0] = [dx, y] start (left side is drawn first with x = cx - dx), then each segment is
     [dx, y] line · [qx, qy, dx, y] quadratic · [c1x, c1y, c2x, c2y, dx, y] cubic.
     The right side is generated by mirroring, so a shape only describes its half. */
  DU.sym = function (cx, segs) {
    const pt = (dx, y, s) => `${n(cx + s * dx)} ${n(y)}`;
    const end = (g) => g.slice(-2);
    let d = 'M' + pt(segs[0][0], segs[0][1], -1);
    for (let i = 1; i < segs.length; i++) {
      const g = segs[i];
      if (g.length === 2) d += 'L' + pt(g[0], g[1], -1);
      else if (g.length === 4) d += 'Q' + pt(g[0], g[1], -1) + ' ' + pt(g[2], g[3], -1);
      else d += 'C' + pt(g[0], g[1], -1) + ' ' + pt(g[2], g[3], -1) + ' ' + pt(g[4], g[5], -1);
    }
    const last = end(segs[segs.length - 1]);
    if (last[0] !== 0) d += 'L' + pt(last[0], last[1], 1);
    for (let i = segs.length - 1; i >= 1; i--) {
      const g = segs[i], p = end(segs[i - 1]);
      if (g.length === 2) d += 'L' + pt(p[0], p[1], 1);
      else if (g.length === 4) d += 'Q' + pt(g[0], g[1], 1) + ' ' + pt(p[0], p[1], 1);
      else d += 'C' + pt(g[2], g[3], 1) + ' ' + pt(g[0], g[1], 1) + ' ' + pt(p[0], p[1], 1);
    }
    return d + 'Z';
  };

  /* Outline of a tapered tube along a spine [{x,y,w}] (w = half width).
     capS / capE: 0 = flat end, otherwise roundness (≈0.9 is a half circle). */
  DU.tube = function (sp, capS = 0, capE = 0) {
    const L = [], R = [], T = [];
    for (let i = 0; i < sp.length; i++) {
      const a = sp[Math.max(0, i - 1)], b = sp[Math.min(sp.length - 1, i + 1)];
      let tx = b.x - a.x, ty = b.y - a.y;
      const len = Math.hypot(tx, ty) || 1;
      tx /= len; ty /= len;
      T.push([tx, ty]);
      L.push([sp[i].x - ty * sp[i].w, sp[i].y + tx * sp[i].w]);
      R.push([sp[i].x + ty * sp[i].w, sp[i].y - tx * sp[i].w]);
    }
    const last = sp.length - 1;
    let d = `M${n(L[0][0])} ${n(L[0][1])}` + crSegs(L, false, 1).map(segStr).join('');
    const cap = (from, to, t, w, k, sgn) => {
      if (!k) return `L${n(to[0])} ${n(to[1])}`;
      const ox = t[0] * w * k * 1.33 * sgn, oy = t[1] * w * k * 1.33 * sgn;
      return `C${n(from[0] + ox)} ${n(from[1] + oy)} ${n(to[0] + ox)} ${n(to[1] + oy)} ${n(to[0])} ${n(to[1])}`;
    };
    d += cap(L[last], R[last], T[last], sp[last].w, capE, 1);
    d += crSegs(R.slice().reverse(), false, 1).map(segStr).join('');
    d += cap(R[0], L[0], T[0], sp[0].w, capS, -1);
    return d + 'Z';
  };

  /* ---------- svg string helpers ---------- */
  DU.p = (d, fill, line, sw = 2.4, extra = '') =>
    `<path d="${d}" fill="${fill || 'none'}"${line ? ` stroke="${line}" stroke-width="${sw}"` : ''}${extra ? ' ' + extra : ''}/>`;
  DU.ov = (d, kind) => `<path d="${d}" ${kind || DU.SH}/>`; // overlay (shadow / highlight)
  DU.mirror = (cx, svg) => `<g transform="matrix(-1 0 0 1 ${n(2 * cx)} 0)">${svg}</g>`;
  DU.both = (cx, svg) => svg + DU.mirror(cx, svg); // draw one side, get both
  DU.g = (svg, attrs = '') => `<g ${attrs}>${svg}</g>`;
  DU.at = (x, y, svg, extra = '') => `<g transform="translate(${n(x)} ${n(y)})${extra ? ' ' + extra : ''}">${svg}</g>`;
  /* clip some artwork (stripes, dots…) to a shape */
  DU.clip = (id, d, svg) => `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})">${svg}</g>`;

  /* ---------- cute shapes (path data) ---------- */
  DU.starD = function (x, y, r, pts = 5, inner = 0.45, rot = -90) {
    let d = '';
    for (let i = 0; i < pts * 2; i++) {
      const rr = i % 2 ? r * inner : r;
      const a = ((rot + (i * 180) / pts) * Math.PI) / 180;
      d += (i ? 'L' : 'M') + n(x + Math.cos(a) * rr) + ' ' + n(y + Math.sin(a) * rr);
    }
    return d + 'Z';
  };
  /* 4-point twinkle */
  DU.sparkleD = function (x, y, r) {
    const k = r * 0.22;
    return `M${n(x)} ${n(y - r)}Q${n(x + k)} ${n(y - k)} ${n(x + r)} ${n(y)}Q${n(x + k)} ${n(y + k)} ${n(x)} ${n(y + r)}Q${n(x - k)} ${n(y + k)} ${n(x - r)} ${n(y)}Q${n(x - k)} ${n(y - k)} ${n(x)} ${n(y - r)}Z`;
  };
  DU.heartD = function (x, y, s) {
    // s = half width; (x,y) = center
    return `M${n(x)} ${n(y + s * 0.95)}C${n(x - s * 1.5)} ${n(y - s * 0.05)} ${n(x - s * 0.95)} ${n(y - s * 1.15)} ${n(x)} ${n(y - s * 0.4)}C${n(x + s * 0.95)} ${n(y - s * 1.15)} ${n(x + s * 1.5)} ${n(y - s * 0.05)} ${n(x)} ${n(y + s * 0.95)}Z`;
  };
  DU.ellD = (x, y, rx, ry) =>
    `M${n(x - rx)} ${n(y)}A${n(rx)} ${n(ry)} 0 1 0 ${n(x + rx)} ${n(y)}A${n(rx)} ${n(ry)} 0 1 0 ${n(x - rx)} ${n(y)}Z`;
  DU.sparkle = (x, y, r, fill = '#fff', op = 1) => `<path d="${DU.sparkleD(x, y, r)}" fill="${fill}" fill-opacity="${op}"/>`;
  DU.star = (x, y, r, fill, line, sw = 2) => DU.p(DU.starD(x, y, r), fill, line, sw);
  DU.heart = (x, y, s, fill, line, sw = 2) => DU.p(DU.heartD(x, y, s), fill, line, sw);

  /* A ribbon bow centered on (x,y); s ≈ half width. */
  DU.bow = function (x, y, s, fill, line, tails) {
    line = line || DU.line(fill);
    const w = s, h = s * 0.62;
    const loop = (sg) =>
      `M${n(x)} ${n(y)}C${n(x + sg * w * 0.35)} ${n(y - h * 1.25)} ${n(x + sg * w * 1.08)} ${n(y - h * 1.2)} ${n(x + sg * w)} ${n(y - h * 0.1)}C${n(x + sg * w * 1.05)} ${n(y + h * 1.05)} ${n(x + sg * w * 0.4)} ${n(y + h * 0.9)} ${n(x)} ${n(y)}Z`;
    const fold = (sg) => `M${n(x + sg * w * 0.18)} ${n(y - h * 0.1)}Q${n(x + sg * w * 0.55)} ${n(y - h * 0.25)} ${n(x + sg * w * 0.8)} ${n(y - h * 0.55)}`;
    let out = '';
    if (tails) {
      const tail = (sg) =>
        `M${n(x)} ${n(y)}Q${n(x + sg * w * 0.4)} ${n(y + h * 1.2)} ${n(x + sg * w * 0.75)} ${n(y + h * 2.3)}L${n(x + sg * w * 0.38)} ${n(y + h * 2.05)}L${n(x + sg * w * 0.2)} ${n(y + h * 2.5)}Q${n(x + sg * w * 0.1)} ${n(y + h * 1.2)} ${n(x)} ${n(y)}Z`;
      out += DU.p(tail(-1), fill, line, 2) + DU.p(tail(1), fill, line, 2) + DU.ov(tail(-1));
    }
    out += DU.p(loop(-1), fill, line, 2) + DU.p(loop(1), fill, line, 2);
    out += DU.p(fold(-1), 'none', line, 1.4, 'stroke-opacity=".55"') + DU.p(fold(1), 'none', line, 1.4, 'stroke-opacity=".55"');
    out += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(s * 0.22)}" ry="${n(s * 0.27)}" fill="${fill}" stroke="${line}" stroke-width="2"/>`;
    out += `<ellipse cx="${n(x - s * 0.05)}" cy="${n(y - s * 0.08)}" rx="${n(s * 0.08)}" ry="${n(s * 0.1)}" ${DU.HL}/>`;
    return out;
  };
  /* A simple flower: petals around a center */
  DU.flower = function (x, y, r, fill, center = '#ffd54d', petals = 5) {
    let out = '';
    const line = DU.line(fill);
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2 - Math.PI / 2;
      out += `<ellipse cx="${n(x + Math.cos(a) * r * 0.55)}" cy="${n(y + Math.sin(a) * r * 0.55)}" rx="${n(r * 0.48)}" ry="${n(r * 0.48)}" fill="${fill}" stroke="${line}" stroke-width="1.4"/>`;
    }
    out += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 0.36)}" fill="${center}" stroke="${DU.line(center)}" stroke-width="1.2"/>`;
    return out;
  };
  /* scalloped / zigzag edge points between two x's (for hems, frills) — returns sym() segments going inward to dx=0 */
  DU.scallopSegs = function (fromDx, y, count, depth) {
    const segs = [];
    const step = fromDx / count;
    for (let i = 0; i < count; i++) {
      const x0 = fromDx - step * i, x1 = fromDx - step * (i + 1);
      segs.push([(x0 + x1) / 2 + step * 0.15, y + depth, Math.max(0, x1), y]);
    }
    return segs;
  };

  let _uid = 0;
  DU.uid = (p = 'u') => p + (++_uid).toString(36);
})();
