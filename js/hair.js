/* hair.js — hairstyles, in head coordinates (origin between the eyes, skull top y=-108,
   chin y=+90, face half-width 80, ears at x=±80 y≈15, shoulders at about y=+110).
   Each style: { id, name, price, back(P), front(P), top?(P) }
     back  — behind the body and the head (long hair, tails)
     front — over the face: bangs, side locks, anything in front of the shoulders
     top   — optional: buns / volume above the skull; hidden when a hat covers the head
   P = paint { fill, line, base }. Use DU.SH / DU.SH2 / DU.HL overlays for shading so that
   special fills (rainbow…) shade correctly. Eyebrows are drawn OVER the bangs (anime style).
   DU.hairKit has the building blocks: cap / capA (skull cap + fringe + side locks), tail (tapered
   lock along a spine), scallop (curly outline), tie, shine, strands, and the FRINGE / LOCK sets. */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const { p, ov, sym, n } = DU;

  const H = (DU.hairKit = {
    fill: (d, P, sw = 2.4) => p(d, P.fill, P.line, sw),
    /* thin strand lines */
    strands: (d, P, op = 0.45) => p(d, 'none', P.line, 1.6, `stroke-opacity="${op}"`),
    /* the anime "angel ring" shine across the top of the head */
    shine: (y = -80, w = 58) =>
      ov(`M${-w - 2} ${y + 2}Q${-w / 2} ${y - 18} 0 ${y - 20}Q${w / 2} ${y - 18} ${w + 2} ${y + 2}L${w - 6} ${y + 8}L${w - 12} ${y}L${w - 20} ${y + 6}Q${w / 3} ${y - 6} 0 ${y - 6}Q${-w / 3} ${y - 6} ${-w + 20} ${y + 6}L${-w + 12} ${y}L${-w + 6} ${y + 8}Z`, DU.HL),
    /* the cap of hair that hugs the skull, with a fringe given as sym() segments from the temple (68,-10) to the centre */
    cap: (fringe, lock) =>
      sym(0, [[0, -124], [52, -125, 91, -92, 90, -34], ...(lock || NOLOCK), ...fringe]),
  });
  const NOLOCK = [[90, -22, 80, -12, 68, -10]];

  /* ---------- more helpers (absolute coordinates) ---------- */
  /* path from segments: [x,y] start, then [x,y] line · [qx,qy,x,y] quad · [c1x,c1y,c2x,c2y,x,y] cubic */
  H.path = (segs, close = true) => {
    let d = `M${n(segs[0][0])} ${n(segs[0][1])}`;
    for (let i = 1; i < segs.length; i++) {
      const g = segs[i];
      d += (g.length === 2 ? 'L' : g.length === 4 ? 'Q' : 'C') + g.map(n).join(' ');
    }
    return d + (close ? 'Z' : '');
  };
  H.mir = (segs) => segs.map((g) => g.map((v, i) => (i % 2 ? v : -v)));
  /* the same segments travelled backwards (start = the point the original began from) */
  H.rev = (start, segs) => {
    const pts = [start, ...segs.map((g) => g.slice(-2))];
    const out = [];
    for (let i = segs.length - 1; i >= 0; i--) {
      const g = segs[i], q = pts[i];
      if (g.length === 2) out.push(q);
      else if (g.length === 4) out.push([g[0], g[1], q[0], q[1]]);
      else out.push([g[2], g[3], g[0], g[1], q[0], q[1]]);
    }
    return out;
  };
  /* a symmetric (sym-style) fringe as absolute segments from the right temple to the left temple */
  H.full = (fr) => [...fr, ...H.rev([-68, -10], H.mir(fr))];
  /* asymmetric cap: fringe = absolute segments from the right temple (68,-10) to the left temple (-68,-10);
     lockR / lockL are LOCK entries (both written for the +x side) */
  H.capA = (fringe, lockR, lockL) =>
    H.path([[0, -124], [52, -125, 91, -92, 90, -34], ...(lockR || NOLOCK), ...fringe, ...H.rev([-90, -34], H.mir(lockL || NOLOCK)), [-91, -92, -52, -125, 0, -124]]);
  /* a tapered lock / tail along a spine [[x, y, halfWidth], …] */
  H.tailD = (sp, capS = 0.6, capE = 0.9) => DU.tube(sp.map((q) => ({ x: q[0], y: q[1], w: q[2] })), capS, capE);
  H.tail = (sp, P, capS, capE) => H.fill(H.tailD(sp, capS, capE), P);
  H.flip = (sp) => sp.map((q) => [-q[0], q[1], q[2]]);
  /* a strand line flowing along a spine, off = -1…1 across its width */
  H.flow = (sp, off = 0, a = 1, b = 1) => {
    const pts = [];
    for (let j = a; j < sp.length - b; j++) {
      const A = sp[Math.max(0, j - 1)], B = sp[Math.min(sp.length - 1, j + 1)], q = sp[j];
      const tx = B[0] - A[0], ty = B[1] - A[1], l = Math.hypot(tx, ty) || 1;
      pts.push([q[0] - (ty / l) * q[2] * off, q[1] + (tx / l) * q[2] * off]);
    }
    return DU.smooth(pts);
  };
  /* bumpy (curly) outline through points; bumps go to the left of the travel direction,
     which is outward for a shape listed clockwise on screen */
  H.scallop = (pts, k = 0.42, closed = true, noMove = false) => {
    let d = noMove ? '' : `M${n(pts[0][0])} ${n(pts[0][1])}`;
    const L = pts.length, cnt = closed ? L : L - 1;
    for (let i = 0; i < cnt; i++) {
      const a = pts[i], b = pts[(i + 1) % L];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const hx = dy * k * 1.33, hy = -dx * k * 1.33;
      d += `C${n(a[0] + hx)} ${n(a[1] + hy)} ${n(b[0] + hx)} ${n(b[1] + hy)} ${n(b[0])} ${n(b[1])}`;
    }
    return d + (closed ? 'Z' : '');
  };
  /* a small hair tie (soft pink-ish tint of the hair color) */
  H.tieColor = (P) => DU.mix(DU.light(P.base, 0.55), '#ff8fb5', 0.4);
  H.tie = (x, y, rot, P, s = 1) =>
    `<g transform="translate(${n(x)} ${n(y)}) rotate(${rot})"><rect x="${n(-6 * s)}" y="${n(-13 * s)}" width="${n(12 * s)}" height="${n(26 * s)}" rx="${n(6 * s)}" fill="${H.tieColor(P)}" stroke="${P.line}" stroke-width="2"/>` +
    `<path d="M${n(-2 * s)} ${n(-7 * s)}v${n(9 * s)}" fill="none" stroke="#fff" stroke-width="2" stroke-opacity=".75"/></g>`;

  /* fringes: sym() segments starting at the temple (68,-10), ending on the centre line */
  const FRINGE = {
    strands: [[66, -30, 62, -40, 58, -46], [56, -36, 50, -27, 43, -22], [40, -34, 36, -44, 30, -50], [28, -38, 22, -28, 14, -24], [12, -36, 8, -46, 0, -50]],
    blunt: [[66, -30, 62, -44, 56, -52], [40, -43, 20, -42, 0, -42]],
    curtain: [[70, -30, 62, -54, 42, -72], [26, -86, 10, -96, 0, -100]],
    m: [[66, -30, 62, -42, 56, -50], [52, -40, 46, -32, 38, -28], [32, -40, 24, -50, 17, -55], [13, -44, 7, -31, 0, -26]],
    wispy: [[66, -30, 63, -40, 60, -46], [58, -38, 55, -32, 51, -28], [49, -38, 46, -46, 42, -52], [40, -42, 37, -34, 33, -29], [30, -40, 27, -48, 22, -54], [20, -44, 17, -36, 13, -30], [10, -40, 6, -50, 0, -54]],
    hairline: [[66, -34, 60, -56, 40, -64], [22, -70, 8, -70, 0, -70]],
  };
  H.FRINGE = FRINGE;
  /* asymmetric fringes: absolute segments from the right temple (68,-10) to the left temple (-68,-10) */
  const SWEPT = [ // parted on the left, swept to the right
    [67, -24, 64, -34, 60, -40], [58, -32, 55, -26, 50, -22], [48, -32, 43, -40, 36, -44], [33, -37, 28, -31, 22, -28],
    [18, -38, 12, -47, 4, -52], [0, -46, -6, -40, -12, -36], [-15, -48, -20, -60, -28, -68], [-33, -56, -39, -44, -46, -36],
    [-50, -42, -54, -47, -57, -49], [-62, -40, -66, -24, -68, -10],
  ];
  const SWOOP = [ // one big soft swoop, parted on the right
    [68, -30, 62, -56, 44, -74], [40, -79, 35, -84, 30, -88], [14, -58, -20, -36, -56, -26],
    [-58, -34, -60, -40, -62, -44], [-65, -34, -67, -22, -68, -10],
  ];
  const CHOPPY = [
    [66, -26, 63, -40, 60, -48], [58, -40, 54, -33, 50, -29], [47, -40, 43, -50, 38, -55], [35, -46, 30, -38, 25, -33],
    [21, -44, 16, -54, 10, -59], [6, -50, 0, -41, -6, -36], [-10, -46, -16, -55, -22, -60], [-26, -50, -31, -43, -36, -39],
    [-40, -48, -45, -54, -50, -57], [-53, -48, -56, -38, -58, -32], [-62, -30, -66, -22, -68, -10],
  ];
  H.SWEPT = SWEPT; H.SWOOP = SWOOP; H.CHOPPY = CHOPPY;
  /* the mirror image of an asymmetric fringe */
  H.flipFringe = (fr) => H.rev([-68, -10], H.mir(fr));

  /* side locks: sym() segments from the temple outside (90,-34) down to a tip and back up to (68,-10) */
  const LOCK = {
    long: [[92, 0, 93, 44, 85, 86], [82, 96], [74, 60, 72, 20, 68, -10]],
    chin: [[96, 6, 98, 60, 86, 100], [76, 104], [70, 70, 72, 20, 68, -12]],
    short: [[93, -10, 92, 16, 84, 34], [80, 40], [76, 20, 72, 4, 68, -10]],
    wisp: [[92, -14, 91, 6, 86, 22], [83, 28], [79, 12, 73, 0, 68, -10]],
    hime: [[92, 0, 93, 30, 91, 56], [66, 58], [67, 30, 68, 10, 68, -10]],
    spiky: [[93, -12, 95, 10, 90, 24], [97, 38], [85, 31], [81, 43], [76, 22, 71, 4, 68, -10]],
    inward: [[95, 10, 100, 62, 88, 106], [80, 112], [77, 70, 72, 20, 68, -10]],
  };
  H.LOCK = LOCK;

  /* hair pulled up: what stays visible behind the head */
  const BACK_UP = sym(0, [[0, -126], [60, -126, 97, -92, 97, -30], [98, 0, 92, 26, 78, 40], [60, 50, 30, 40, 0, 40]]);
  const BACK_NAPE = sym(0, [[0, -126], [60, -126, 97, -92, 97, -30], [99, 6, 96, 40, 84, 56], [60, 70, 30, 66, 0, 66]]);
  const bangLines = 'M58 -46Q66 -68 58 -92M30 -50Q34 -76 24 -100M-58 -46Q-66 -68 -58 -92M-30 -50Q-34 -76 -24 -100M0 -50V-76';
  const both = (f) => f(1) + f(-1);
  const side = (sp, s) => (s > 0 ? sp : H.flip(sp));

  /* a round bun with a swirl */
  function bun(x, y, rx, ry, P) {
    return (
      H.fill(DU.ellD(x, y, rx, ry), P) +
      ov(`M${n(x - rx * 0.86)} ${n(y + ry * 0.3)}Q${n(x)} ${n(y + ry * 1.25)} ${n(x + rx * 0.86)} ${n(y + ry * 0.3)}Q${n(x)} ${n(y + ry * 0.75)} ${n(x - rx * 0.86)} ${n(y + ry * 0.3)}Z`, DU.SH) +
      H.strands(`M${n(x - rx * 0.55)} ${n(y + ry * 0.2)}Q${n(x - rx * 0.5)} ${n(y - ry * 0.6)} ${n(x + rx * 0.1)} ${n(y - ry * 0.55)}Q${n(x + rx * 0.62)} ${n(y - ry * 0.45)} ${n(x + rx * 0.5)} ${n(y + ry * 0.15)}Q${n(x + rx * 0.35)} ${n(y + ry * 0.5)} ${n(x - rx * 0.05)} ${n(y + ry * 0.38)}`, P, 0.5) +
      `<ellipse cx="${n(x - rx * 0.38)}" cy="${n(y - ry * 0.45)}" rx="${n(rx * 0.26)}" ry="${n(ry * 0.14)}" transform="rotate(-28 ${n(x - rx * 0.38)} ${n(y - ry * 0.45)})" ${DU.HL}/>`
    );
  }
  /* a plait from (x0,y0) to (x1,y1) with a tie and a little brush at the end */
  function braid(x0, y0, x1, y1, links, w, P) {
    let out = '';
    const ang = Math.atan2(x1 - x0, y1 - y0);
    const step = Math.hypot(x1 - x0, y1 - y0) / links;
    const ex = x1 + Math.sin(ang) * 8, ey = y1 + Math.cos(ang) * 8;
    out += H.tail([[ex, ey - 4, w * 0.3], [ex + Math.sin(ang) * 14 + 2, ey + 14, w * 0.42], [ex + Math.sin(ang) * 30, ey + 34, 1.5]], P, 0.3, 0.9);
    for (let i = links - 1; i >= 0; i--) {
      const t = (i + 0.5) / links;
      const ww = w * (1 - 0.22 * t), sg = i % 2 ? -1 : 1;
      const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      const hw = ww * 0.52, hh = step * 0.86, ox = sg * ww * 0.12;
      const leaf = `M${n(ox)} ${n(-hh)}C${n(ox + hw * 1.25)} ${n(-hh * 0.95)} ${n(ox + hw * 1.1)} ${n(hh * 0.35)} ${n(ox)} ${n(hh)}C${n(ox - hw * 1.1)} ${n(hh * 0.35)} ${n(ox - hw * 1.25)} ${n(-hh * 0.95)} ${n(ox)} ${n(-hh)}Z`;
      out += `<g transform="translate(${n(x)} ${n(y)}) rotate(${n((-ang * 180) / Math.PI + sg * 24)})">` +
        H.fill(leaf, P, 2.2) +
        `<path d="M${n(ox - hw * 0.15)} ${n(-hh * 0.55)}Q${n(ox + hw * 0.2)} ${n(0)} ${n(ox)} ${n(hh * 0.6)}" fill="none" stroke="${P.line}" stroke-width="1.4" stroke-opacity=".4"/></g>`;
    }
    out += H.tie(x1 + Math.sin(ang) * 2, y1 + Math.cos(ang) * 2, 90 - (ang * 180) / Math.PI, P, 0.8);
    return out;
  }
  /* a "drill" ringlet hanging from (x,y) */
  function drill(x, y, s, P) {
    const rx = [27, 26, 23, 19, 14.5, 9.5], ry = [21, 21, 20, 18, 15, 12];
    let out = '';
    for (let i = rx.length - 1; i >= 0; i--) {
      const cx = x + s * i * 2.2, cy = y + i * 34 - i * i * 0.9;
      out += `<g transform="translate(${n(cx)} ${n(cy)}) rotate(${s * 12})">` +
        H.fill(DU.ellD(0, 0, rx[i], ry[i]), P, 2.2) +
        ov(`M${n(-rx[i] * 0.9)} ${n(ry[i] * 0.25)}Q0 ${n(ry[i] * 1.3)} ${n(rx[i] * 0.9)} ${n(ry[i] * 0.25)}Q0 ${n(ry[i] * 0.7)} ${n(-rx[i] * 0.9)} ${n(ry[i] * 0.25)}Z`, DU.SH) +
        H.strands(`M${n(-rx[i] * 0.7)} ${n(-ry[i] * 0.2)}Q0 ${n(-ry[i] * 0.75)} ${n(rx[i] * 0.7)} ${n(-ry[i] * 0.25)}`, P, 0.4) +
        `<ellipse cx="${n(-s * rx[i] * 0.3)}" cy="${n(-ry[i] * 0.42)}" rx="${n(rx[i] * 0.3)}" ry="${n(ry[i] * 0.14)}" ${DU.HL}/></g>`;
    }
    return out;
  }
  /* a round coily puff: a circle with a bumpy edge */
  function puff(x, y, r, P, bumps = 12) {
    const pts = [];
    for (let i = 0; i < bumps; i++) {
      const a = (i / bumps) * Math.PI * 2 - Math.PI / 2;
      pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
    const coil = (cx, cy, k) => `M${n(cx - 6 * k)} ${n(cy + 2 * k)}q${n(2 * k)} ${n(-9 * k)} ${n(8 * k)} ${n(-5 * k)}q${n(4 * k)} ${n(4 * k)} ${n(-2 * k)} ${n(7 * k)}`;
    return (
      H.fill(H.scallop(pts, 0.34), P) +
      ov(`M${n(x - r * 0.9)} ${n(y + r * 0.35)}Q${n(x)} ${n(y + r * 1.3)} ${n(x + r * 0.9)} ${n(y + r * 0.35)}Q${n(x)} ${n(y + r * 0.8)} ${n(x - r * 0.9)} ${n(y + r * 0.35)}Z`, DU.SH) +
      H.strands(coil(x - r * 0.35, y - r * 0.1, 1) + coil(x + r * 0.3, y - r * 0.4, 0.9) + coil(x + r * 0.25, y + r * 0.35, 1) + coil(x - r * 0.25, y + r * 0.5, 0.8) + coil(x - r * 0.05, y - r * 0.6, 0.8), P, 0.5) +
      `<ellipse cx="${n(x - r * 0.38)}" cy="${n(y - r * 0.5)}" rx="${n(r * 0.24)}" ry="${n(r * 0.12)}" transform="rotate(-30 ${n(x - r * 0.38)} ${n(y - r * 0.5)})" ${DU.HL}/>`
    );
  }

  /* shared outlines for the curly style (listed clockwise from the top centre) */
  const CURL_R = [[44, -137], [84, -116], [112, -80], [127, -36], [134, 10], [135, 56]];
  const CURL_FULL = [[0, -141], ...CURL_R, [128, 98], [106, 126], [74, 138], [38, 128], [0, 134]];
  const mirPts = (pts) => pts.slice().reverse().map((q) => [-q[0], q[1]]);

  DU.HAIRS = [
    {
      id: 'long', name: 'ארוך', price: 0,
      back: (P) =>
        H.fill(sym(0, [[0, -126], [60, -126, 97, -92, 97, -30], [99, 40, 106, 150, 108, 236], [100, 262], [88, 246], [74, 268], [58, 250], [40, 270], [22, 254], [0, 266]]), P) +
        ov(sym(0, [[0, 20], [84, 20], [90, 140, 90, 220, 86, 250], [74, 266], [58, 250], [40, 268], [22, 254], [0, 264]]), DU.SH) +
        H.strands('M96 60Q102 150 98 240M-96 60Q-102 150 -98 240', P),
      front: (P) =>
        H.fill(H.cap(FRINGE.strands, LOCK.long), P) + H.strands(bangLines, P) + H.shine(),
    },
    {
      id: 'bob', name: 'קארה', price: 0,
      back: (P) =>
        H.fill(sym(0, [[0, -126], [60, -126, 99, -92, 99, -28], [103, 20, 104, 64, 92, 100], [72, 114, 30, 112, 0, 110]]), P) +
        ov(sym(0, [[0, 30], [92, 30], [96, 64, 92, 90, 90, 100], [70, 112, 30, 110, 0, 108]]), DU.SH),
      front: (P) =>
        H.fill(H.cap(FRINGE.blunt, LOCK.chin), P) +
        H.strands('M56 -52Q64 -72 56 -94M-56 -52Q-64 -72 -56 -94M28 -43Q32 -70 22 -98M-28 -43Q-32 -70 -22 -98M86 40Q90 70 84 96M-86 40Q-90 70 -84 96', P) + H.shine(),
    },
    {
      id: 'twintails', name: 'שתי קוקיות', price: 0,
      back: (P) => {
        const t = [[88, -78, 10], [112, -92, 17], [137, -64, 22], [148, -4, 24], [151, 66, 23], [146, 136, 19], [137, 196, 12], [128, 246, 3]];
        const t2 = [[142, 140, 9], [157, 190, 7.5], [156, 236, 2]];
        return H.fill(BACK_UP, P) + both((s) =>
          H.tail(side(t2, s), P) + H.tail(side(t, s), P) +
          H.strands(H.flow(side(t, s), 0.35 * s, 1, 1) + H.flow(side(t, s), -0.4 * s, 2, 1), P));
      },
      front: (P) =>
        H.fill(H.cap(FRINGE.strands, LOCK.short), P) + H.strands(bangLines, P) + H.shine() +
        H.tie(91, -78, 62, P) + H.tie(-91, -78, -62, P),
    },
    {
      id: 'ponytail', name: 'קוקו', price: 0,
      back: (P) => {
        const t = [[6, -116, 13], [34, -148, 19], [80, -146, 24], [120, -108, 26], [139, -40, 26], [144, 40, 24], [137, 112, 18], [123, 172, 10], [110, 214, 2.5]];
        const t2 = [[136, 96, 8], [150, 146, 7], [146, 190, 1.5]];
        return H.fill(BACK_UP, P) + H.tail(t2, P) + H.tail(t, P) + H.strands(H.flow(t, 0.4, 2, 1) + H.flow(t, -0.35, 2, 1), P);
      },
      front: (P) =>
        H.fill(H.capA(SWEPT, LOCK.wisp, LOCK.wisp), P) +
        H.strands('M60 -40Q66 -66 56 -92M36 -44Q40 -74 22 -102M4 -52Q4 -80 -14 -104M-28 -68Q-34 -94 -28 -116M-57 -49Q-68 -70 -58 -94', P) + H.shine(),
      top: (P) => H.tie(22, -134, 52, P, 1.05),
    },
    {
      id: 'buns', name: 'פקעות', price: 0,
      back: (P) => H.fill(BACK_UP, P),
      front: (P) =>
        H.fill(H.cap(FRINGE.m, LOCK.short), P) +
        H.strands('M56 -50Q64 -70 56 -92M17 -55Q20 -80 10 -104M-56 -50Q-64 -70 -56 -92M-17 -55Q-20 -80 -10 -104', P) + H.shine(),
      top: (P) => both((s) => H.tie(s * 50, -100, s * -38, P, 0.85) + bun(s * 64, -120, 32, 30, P)),
    },
    {
      id: 'braids', name: 'צמות', price: 0,
      back: (P) => H.fill(BACK_NAPE, P),
      front: (P) =>
        both((s) => braid(s * 80, 46, s * 66, 216, 7, 28, P)) +
        H.fill(H.cap(FRINGE.curtain, [[93, -8, 96, 24, 88, 44], [78, 46], [74, 24, 72, 4, 68, -10]]), P) +
        H.strands('M0 -100V-123M42 -72Q62 -84 70 -104M-42 -72Q-62 -84 -70 -104M20 -90Q40 -100 46 -116M-20 -90Q-40 -100 -46 -116', P) + H.shine(-95, 50),
    },
    {
      id: 'curly', name: 'מתולתל', price: 0,
      back: (P) =>
        H.fill(H.scallop([...CURL_FULL, ...mirPts(CURL_FULL.slice(1, -1))], 0.36), P) +
        ov(sym(0, [[0, 30], [96, 30], [112, 70, 100, 110, 96, 124], [60, 136, 30, 128, 0, 132]]), DU.SH),
      front: (P) => {
        const inner = [[114, 76], [94, 68], [81, 44], [75, 16], [68, -12]];
        const fringe = [[54, -34], [36, -44], [16, -37], [-4, -46], [-24, -38], [-44, -45], [-58, -34], [-68, -12]];
        const pts = [[0, -141], ...CURL_R, ...inner, ...fringe, ...mirPts(inner).slice(1), ...mirPts(CURL_R)];
        const curl = (x, y, k = 1, f = 1) => `M${n(x)} ${n(y)}q${n(8 * k * f)} ${n(-10 * k)} ${n(16 * k * f)} ${n(-2 * k)}q${n(4 * k * f)} ${n(8 * k)} ${n(-6 * k * f)} ${n(10 * k)}`;
        return H.fill(H.scallop(pts, 0.36), P) +
          H.strands(curl(-70, -84) + curl(20, -98, 1, -1) + curl(-18, -72, 0.9) + curl(60, -70, 1, -1) + curl(96, -30, 1, -1) + curl(-112, -24) + curl(100, 30) + curl(-104, 38, 1, -1) + curl(-44, -104, 0.9) + curl(52, -112, 0.8), P, 0.5) +
          ov('M-64 -92Q-30 -118 6 -112Q-28 -108 -56 -84Z', DU.HL) + ov('M60 -98Q78 -90 88 -70Q72 -84 56 -90Z', DU.HL);
      },
    },
    {
      id: 'pixie', name: 'קצר', price: 0,
      back: (P) =>
        H.fill(sym(0, [[0, -126], [60, -126, 98, -92, 98, -30], [100, 0, 97, 28, 88, 42], [84, 54], [77, 43], [68, 57], [60, 47], [40, 58, 20, 56, 0, 56]]), P),
      front: (P) =>
        H.fill(H.capA(CHOPPY, LOCK.spiky, LOCK.spiky), P) +
        H.strands('M60 -48Q68 -70 58 -94M38 -55Q42 -80 28 -104M10 -59Q10 -84 -4 -108M-22 -60Q-26 -84 -18 -108M-50 -57Q-60 -76 -52 -98M88 -6Q92 8 90 22M-88 -6Q-92 8 -90 22', P) + H.shine(-82, 56),
      top: (P) => H.tail([[4, -121, 6], [8, -138, 5.5], [22, -153, 4], [38, -152, 1]], P, 0, 0.9),
    },
    {
      id: 'wavy', name: 'גלי', price: 0,
      back: (P) => {
        const sidePts = [[97, -30], [109, 20], [102, 62], [115, 104], [105, 146], [119, 188], [109, 226], [115, 252]];
        return H.fill(sym(0, [[0, -126], [60, -126, 97, -92, 97, -30], ...DU.cr(sidePts), [111, 270, 97, 258], [87, 276, 73, 258], [61, 276, 47, 258], [35, 274, 21, 258], [10, 270, 0, 262]]), P) +
          ov(sym(0, [[0, 20], [86, 20], ...DU.cr([[86, 20], [96, 70], [90, 130], [100, 190], [94, 244]]), [73, 258], [61, 276, 47, 258], [35, 274, 21, 258], [10, 270, 0, 262]]), DU.SH) +
          H.strands(both((s) => DU.smooth(sidePts.slice(1).map((q) => [s * (q[0] - 9), q[1]]))), P);
      },
      front: (P) => {
        const lk = [[86, -26, 9], [94, 20, 11], [84, 62, 10.5], [93, 104, 8], [86, 142, 2]];
        const lk2 = [[-86, -26, 9], [-95, 24, 11], [-85, 68, 10.5], [-94, 110, 8], [-88, 150, 2]];
        return H.tail(lk, P, 0.3) + H.tail(lk2, P, 0.3) + H.strands(H.flow(lk, 0, 1, 1) + H.flow(lk2, 0, 1, 1), P) +
          H.fill(H.capA(SWOOP, NOLOCK, NOLOCK), P) +
          H.strands('M30 -88Q26 -106 30 -120M10 -62Q-22 -44 -52 -34M34 -70Q4 -84 -40 -52M44 -74Q60 -86 66 -104M-62 -44Q-72 -68 -62 -94', P) + H.shine(-93, 50);
      },
    },
    {
      id: 'sidetail', name: 'קוקו בצד', price: 0,
      back: (P) => {
        const t = [[-88, -48, 10], [-110, -62, 16], [-133, -34, 20], [-141, 22, 22], [-137, 84, 20], [-125, 140, 14], [-116, 184, 3]];
        const t2 = [[-134, 86, 8], [-149, 132, 6.5], [-146, 172, 1.5]];
        return H.fill(BACK_UP, P) + H.tail(t2, P) + H.tail(t, P) + H.strands(H.flow(t, 0.35, 1, 1) + H.flow(t, -0.4, 2, 1), P);
      },
      front: (P) =>
        H.fill(H.capA(H.full(FRINGE.wispy), LOCK.chin, LOCK.wisp), P) +
        H.strands('M60 -46Q68 -68 58 -92M42 -52Q46 -78 34 -100M22 -54Q24 -80 12 -104M-60 -46Q-68 -68 -58 -92M-42 -52Q-46 -78 -34 -100M-22 -54Q-24 -80 -12 -104M0 -54V-78M86 40Q90 70 84 96', P) + H.shine() +
        H.tie(-91, -50, -56, P),
    },
    {
      id: 'puffs', name: 'פונפונים', price: 0,
      back: (P) => H.fill(BACK_UP, P),
      front: (P) => {
        const line = [[68, -10], [63, -36], [47, -56], [25, -67], [0, -71], [-25, -67], [-47, -56], [-63, -36], [-68, -10]];
        const d = 'M-68 -10C-80 -12 -90 -22 -90 -34C-91 -92 -52 -125 0 -124C52 -125 91 -92 90 -34C90 -22 80 -12 68 -10' + H.scallop(line, 0.22, false, true) + 'Z';
        return H.fill(d, P) +
          H.strands('M-50 -92q6 -8 14 -3q4 5 -3 9M10 -104q7 -7 14 -1q3 6 -4 9M-22 -112q6 -7 13 -2M46 -88q6 -7 13 -2q3 5 -3 8M-74 -66q5 -7 12 -3M70 -62q5 -7 11 -2M-10 -86q6 -7 13 -1', P, 0.5) +
          ov('M-58 -88Q-28 -112 8 -108Q-26 -104 -50 -80Z', DU.HL);
      },
      top: (P) => both((s) => H.tie(s * 50, -92, s * -40, P, 0.85) + puff(s * 74, -112, 41, P)),
    },
    {
      id: 'hime', name: 'נסיכה', price: 0,
      back: (P) =>
        H.fill(sym(0, [[0, -126], [60, -126, 97, -92, 97, -30], [101, 60, 108, 200, 110, 304], [60, 314, 20, 316, 0, 316]]), P) +
        ov(sym(0, [[0, 20], [86, 20], [92, 120, 96, 230, 98, 306], [60, 314, 20, 316, 0, 316]]), DU.SH) +
        H.strands('M100 60Q106 180 104 296M-100 60Q-106 180 -104 296', P),
      front: (P) =>
        H.fill(H.cap(FRINGE.blunt, LOCK.hime), P) +
        H.strands('M56 -52Q64 -72 56 -94M-56 -52Q-64 -72 -56 -94M28 -43Q32 -70 22 -98M-28 -43Q-32 -70 -22 -98M0 -42V-70M80 -8V52M-80 -8V52', P) + H.shine(),
    },
    {
      id: 'halfup', name: 'חצי אסוף', price: 0,
      back: (P) =>
        H.fill(sym(0, [[0, -126], [60, -126, 97, -92, 97, -30], [102, 40, 116, 130, 110, 196], [104, 234, 80, 246, 58, 236], [42, 250, 16, 248, 0, 246]]), P) +
        ov(sym(0, [[0, 20], [86, 20], [92, 100, 100, 170, 94, 214], [80, 240, 62, 240, 58, 236], [42, 250, 16, 248, 0, 246]]), DU.SH) +
        H.strands('M100 50Q112 130 104 200M-100 50Q-112 130 -104 200', P),
      front: (P) =>
        H.fill(H.cap(FRINGE.curtain, LOCK.inward), P) +
        H.strands('M0 -100V-123M42 -72Q62 -84 70 -104M-42 -72Q-62 -84 -70 -104M86 30Q92 70 84 102M-86 30Q-92 70 -84 102', P) + H.shine(-95, 50),
      top: (P) => H.tie(0, -116, 90, P, 0.85) + bun(0, -134, 24, 20, P),
    },
    {
      id: 'drills', name: 'תלתלי נשף', price: 500,
      back: (P) =>
        H.fill(BACK_UP, P) + both((s) => H.tail([[s * 86, -52, 9], [s * 104, -48, 13], [s * 116, -28, 16]], P, 0.5, 0.5) + drill(s * 118, -14, s, P)),
      front: (P) =>
        H.fill(H.cap(FRINGE.m, LOCK.short), P) +
        H.strands('M56 -50Q64 -70 56 -92M17 -55Q20 -80 10 -104M-56 -50Q-64 -70 -56 -92M-17 -55Q-20 -80 -10 -104', P) + H.shine() +
        H.tie(93, -48, 68, P) + H.tie(-93, -48, -68, P),
    },
    {
      id: 'mermaid', name: 'בת ים', price: 600,
      back: (P) => {
        const flowPts = [[97, -30], [106, 6], [120, 60], [110, 122], [130, 184], [121, 244], [142, 304], [128, 346], [110, 320], [92, 348], [72, 322], [40, 340], [0, 326],
          [-38, 342], [-76, 324], [-98, 354], [-114, 322], [-136, 340], [-131, 290], [-119, 232], [-134, 172], [-115, 112], [-124, 52], [-106, 6], [-97, -30]];
        const body = H.path([[0, -126], [60, -126, 97, -92, 97, -30], ...DU.cr(flowPts), [-97, -92, -60, -126, 0, -126]]);
        const w1 = [[124, 236, 7], [142, 276, 6], [154, 316, 4.5], [146, 350, 1]], w2 = [[-126, 200, 7], [-146, 238, 6], [-141, 284, 4.5], [-157, 320, 1]];
        return H.tail(w1, P) + H.tail(w2, P) + H.fill(body, P) +
          ov(DU.smooth([[0, 20], [86, 20], [100, 80], [92, 140], [108, 200], [100, 260], [116, 316], [92, 340], [72, 318], [40, 336], [0, 322], [-38, 338], [-76, 320], [-96, 344], [-108, 300], [-100, 240], [-112, 180], [-96, 120], [-104, 60], [-86, 20]], true), DU.SH) +
          H.strands('M106 20Q124 70 114 124Q110 160 126 196M-108 20Q-126 70 -118 120Q-116 160 -130 190M118 250Q112 280 128 318M-124 250Q-116 286 -126 318', P);
      },
      front: (P) => {
        const lk = [[86, -26, 9], [96, 22, 12], [85, 70, 11.5], [96, 118, 10], [86, 160, 6], [92, 190, 1.5]];
        const lk2 = [[-86, -26, 9], [-97, 26, 12], [-86, 76, 11.5], [-98, 126, 10], [-89, 168, 6], [-96, 198, 1.5]];
        return H.tail(lk, P, 0.3) + H.tail(lk2, P, 0.3) + H.strands(H.flow(lk, 0, 1, 1) + H.flow(lk2, 0, 1, 1), P) +
          H.fill(H.capA(H.flipFringe(SWOOP), NOLOCK, NOLOCK), P) +
          H.strands('M-30 -88Q-26 -106 -30 -120M-10 -62Q22 -44 52 -34M-34 -70Q-4 -84 40 -52M-44 -74Q-60 -86 -66 -104M62 -44Q72 -68 62 -94', P) + H.shine(-93, 50);
      },
    },
  ];
  /* ====================== second batch (each has theme tags) ====================== */
  /* k evenly spaced stations along a smooth curve through pts → [{x, y, ang (from vertical), t, step}] */
  function along(pts, k) {
    const g = (i) => pts[Math.max(0, Math.min(pts.length - 1, i))];
    const dense = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
      for (let j = 0; j < 10; j++) {
        const t = j / 10, t2 = t * t, t3 = t2 * t;
        dense.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
      }
    }
    dense.push(pts[pts.length - 1].slice(0, 2));
    const len = [0];
    for (let i = 1; i < dense.length; i++) len.push(len[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
    const total = len[len.length - 1], out = [];
    for (let j = 0; j < k; j++) {
      const target = ((j + 0.5) / k) * total;
      let i = 1;
      while (i < len.length - 1 && len[i] < target) i++;
      const f = (target - len[i - 1]) / (len[i] - len[i - 1] || 1), a = dense[i - 1], b = dense[i];
      out.push({ x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, ang: Math.atan2(b[0] - a[0], b[1] - a[1]), t: (j + 0.5) / k, step: total / k });
    }
    return out;
  }
  H.along = along;
  /* a plait that follows a curve; width goes from w0 to w1 */
  function braidAlong(pts, links, w0, w1, P) {
    const q = along(pts, links), last = q[links - 1];
    const dx = Math.sin(last.ang), dy = Math.cos(last.ang);
    const ex = last.x + dx * (last.step * 0.5 + 7), ey = last.y + dy * (last.step * 0.5 + 7);
    let out = H.tail([[ex - dx * 4, ey - dy * 4, w1 * 0.3], [ex + dx * 14 + 2, ey + dy * 14, w1 * 0.42], [ex + dx * 32, ey + dy * 34, 1.5]], P, 0.3, 0.9);
    for (let i = links - 1; i >= 0; i--) {
      const c = q[i], ww = w0 + (w1 - w0) * c.t, sg = i % 2 ? -1 : 1;
      const hw = ww * 0.52, hh = c.step * 0.86, ox = sg * ww * 0.12;
      const leaf = `M${n(ox)} ${n(-hh)}C${n(ox + hw * 1.25)} ${n(-hh * 0.95)} ${n(ox + hw * 1.1)} ${n(hh * 0.35)} ${n(ox)} ${n(hh)}C${n(ox - hw * 1.1)} ${n(hh * 0.35)} ${n(ox - hw * 1.25)} ${n(-hh * 0.95)} ${n(ox)} ${n(-hh)}Z`;
      out += `<g transform="translate(${n(c.x)} ${n(c.y)}) rotate(${n((-c.ang * 180) / Math.PI + sg * 24)})">` + H.fill(leaf, P, 2.2) +
        `<path d="M${n(ox - hw * 0.15)} ${n(-hh * 0.55)}Q${n(ox + hw * 0.2)} 0 ${n(ox)} ${n(hh * 0.6)}" fill="none" stroke="${P.line}" stroke-width="1.4" stroke-opacity=".4"/></g>`;
    }
    return out + H.tie(ex - dx * 5, ey - dy * 5, 90 - (last.ang * 180) / Math.PI, P, Math.max(0.7, w1 / 34));
  }
  /* a thin braid along a spine [[x, y, halfWidth], …] with little beads at the end */
  const BEADS = ['#ffd76a', '#ff8fb5', '#7de3e0'];
  function thinBraid(sp, P, bead = 0) {
    const pts = sp.map((q) => [q[0], q[1]]);
    let total = 0;
    for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const q = along(pts, Math.max(4, Math.round(total / 13)));
    let d = '';
    q.forEach((c) => {
      const ax = Math.sin(c.ang), ay = Math.cos(c.ang), w = 5;
      d += `M${n(c.x + ay * w - ax * 3)} ${n(c.y - ax * w - ay * 3)}L${n(c.x + ax * 3)} ${n(c.y + ay * 3)}L${n(c.x - ay * w - ax * 3)} ${n(c.y + ax * w - ay * 3)}`;
    });
    const e = sp[sp.length - 1], l = q[q.length - 1], ax = Math.sin(l.ang), ay = Math.cos(l.ang);
    const beads = [0, 1].map((i) => `<circle cx="${n(e[0] + ax * (3 + i * 9))}" cy="${n(e[1] + ay * (3 + i * 9))}" r="5" fill="${BEADS[(bead + i) % 3]}" stroke="${P.line}" stroke-width="1.6"/>`).join('');
    return H.tail(sp, P, 0.3, 0.3) + H.strands(d, P, 0.5) + beads;
  }
  /* a long spiral curl: slanted coils stacked downward from (x, y) */
  function ringlet(x, y, coils, rx, ry, s, P) {
    const pitch = ry * 1.22, yEnd = y + (coils - 1) * pitch;
    let out = H.tail([[x, yEnd, rx * 0.6], [x + s * 3, yEnd + ry * 1.3, rx * 0.4], [x - s * 2, yEnd + ry * 2.5, 1.2]], P, 0.3, 0.9);
    for (let i = coils - 1; i >= 0; i--) {
      const k = 1 - 0.022 * i, cx = x + s * Math.sin(i * 1.1) * 2.2, cy = y + i * pitch;
      out += `<g transform="translate(${n(cx)} ${n(cy)}) rotate(${s * 17})">` + H.fill(DU.ellD(0, 0, rx * k, ry * k), P, 2.1) +
        `<ellipse cx="${n(-s * rx * k * 0.28)}" cy="${n(-ry * k * 0.42)}" rx="${n(rx * k * 0.34)}" ry="${n(ry * k * 0.16)}" ${DU.HL}/></g>`;
    }
    return out + ov(H.tailD([[x - s * rx * 0.55, y - ry * 0.5, rx * 0.34], [x - s * rx * 0.55, yEnd + ry * 0.4, rx * 0.3]], 0.6, 0.6), DU.SH);
  }
  /* points on a circle, clockwise on screen from angle a0 to a1 (degrees, -90 = top) */
  const arcPts = (cx, cy, r, a0, a1, k) => {
    const pts = [];
    for (let i = 0; i <= k; i++) { const a = ((a0 + ((a1 - a0) * i) / k) * Math.PI) / 180; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    return pts;
  };
  const coil = (x, y, k = 1) => `M${n(x - 6 * k)} ${n(y + 2 * k)}q${n(2 * k)} ${n(-9 * k)} ${n(8 * k)} ${n(-5 * k)}q${n(4 * k)} ${n(4 * k)} ${n(-2 * k)} ${n(7 * k)}`;
  /* more asymmetric fringes (right temple → left temple) */
  const PUNK = [ // spiky, parted on the right, swept across
    [68, -34, 62, -60, 44, -78], [36, -66, 28, -52, 20, -42], [18, -54, 14, -62, 8, -68], [2, -54, -6, -40, -16, -32],
    [-18, -46, -22, -56, -28, -62], [-34, -48, -42, -34, -52, -26], [-54, -38, -56, -46, -58, -50], [-63, -40, -66, -26, -68, -10],
  ];
  const SIDEPART = [[68, -34, 62, -60, 46, -78], [30, -74, 8, -66, -10, -52], [-26, -40, -44, -32, -58, -36], [-63, -30, -66, -20, -68, -10]];
  H.PUNK = PUNK; H.SIDEPART = SIDEPART;

  DU.HAIRS.push(
    {
      id: 'bun', name: 'פקעת בלרינה', price: 0, tags: ['ballet', 'paris'],
      back: (P) => H.fill(BACK_UP, P),
      front: (P) =>
        H.tail([[42, -70, 4.5], [51, -48, 4], [56, -28, 1]], P, 0.2, 0.9) + H.tail([[-36, -72, 4.5], [-47, -50, 4], [-53, -32, 1]], P, 0.2, 0.9) + H.tail([[-8, -76, 4], [-15, -58, 3.4], [-12, -42, 1]], P, 0.2, 0.9) +
        H.fill(H.cap(FRINGE.hairline, LOCK.wisp), P) +
        H.strands('M0 -70Q2 -98 0 -122M30 -66Q34 -96 20 -120M-30 -66Q-34 -96 -20 -120M58 -54Q62 -86 40 -112M-58 -54Q-62 -86 -40 -112M84 -30Q84 -70 58 -104M-84 -30Q-84 -70 -58 -104', P, 0.4) + H.shine(-94, 48),
      top: (P) => H.tie(0, -119, 90, P, 1.15) + bun(0, -143, 32, 27, P),
    },
    {
      id: 'odango', name: 'פקעות וקוקיות', price: 0, tags: ['anime', 'kawaii'],
      back: (P) => {
        const t = [[64, -114, 7], [98, -106, 9.5], [121, -58, 11], [128, 20, 11.5], [125, 110, 10.5], [119, 200, 8.5], [113, 276, 5], [109, 318, 1.5]];
        return H.fill(BACK_UP, P) + both((s) => H.tail(side(t, s), P) + H.strands(H.flow(side(t, s), 0.1 * s, 2, 1), P));
      },
      front: (P) => H.fill(H.cap(FRINGE.strands, LOCK.wisp), P) + H.strands(bangLines, P) + H.shine(),
      top: (P) => both((s) => H.tie(s * 80, -101, s * 44, P, 0.72) + bun(s * 62, -122, 25, 23, P)),
    },
    {
      id: 'sidebraid', name: 'צמה בצד', price: 0, tags: ['cowgirl', 'nature', 'hawaii'],
      back: (P) => H.fill(BACK_NAPE, P),
      front: (P) =>
        braidAlong([[85, 38], [90, 92], [82, 150], [74, 208], [70, 262]], 9, 37, 27, P) +
        H.fill(H.capA(SWOOP, [[95, -4, 101, 28, 93, 52], [78, 58], [74, 30, 71, 8, 68, -10]], LOCK.wisp), P) +
        H.strands('M30 -88Q26 -106 30 -120M10 -62Q-22 -44 -52 -34M34 -70Q4 -84 -40 -52M44 -74Q60 -86 66 -104M-62 -44Q-72 -68 -62 -94M88 0Q93 26 86 50', P) + H.shine(-93, 50),
    },
    {
      id: 'afro', name: 'אפרו', price: 0, tags: ['retro', 'pop'],
      back: (P) =>
        H.fill(H.scallop(arcPts(0, -42, 138, -90, 270, 26).slice(0, -1), 0.3), P) +
        ov(sym(0, [[0, 26], [90, 26], [94, 48, 72, 74, 44, 82], [24, 88, 10, 88, 0, 88]]), DU.SH),
      front: (P) => {
        const outer = arcPts(0, -42, 138, -90, 42, 10);
        const inner = [[92, 44], [80, 22], [73, 2], [68, -14]];
        const fringe = [[56, -38], [38, -52], [14, -58], [-12, -58], [-36, -52], [-56, -38], [-68, -14]];
        const pts = [...outer, ...inner, ...fringe, ...mirPts(inner).slice(1), ...mirPts(outer).slice(0, -1)];
        const coils = [[-70, -122], [-20, -152], [42, -142], [92, -102], [-106, -62], [112, -32], [-114, 8], [110, 30], [-50, -92], [22, -106], [72, -68], [-86, -24], [-4, -80]];
        return H.fill(H.scallop(pts, 0.3), P) + H.strands(coils.map((q) => coil(q[0], q[1], 1.15)).join(''), P, 0.5) +
          ov('M-80 -124Q-40 -162 8 -160Q-36 -150 -68 -112Z', DU.HL) + ov('M70 -132Q98 -112 108 -84Q88 -108 64 -120Z', DU.HL);
      },
    },
    {
      id: 'boxbraids', name: 'צמות דקות', price: 0, tags: ['pop', 'hawaii'],
      back: (P) => {
        const b = (x, len, s) => [[s * (x - 24), -24, 7], [s * (x - 7), 40, 7.5], [s * x, 120, 7.5], [s * (x + 3), 200, 7], [s * (x + 1), len, 6]];
        return H.fill(sym(0, [[0, -126], [60, -126, 97, -92, 97, -30], [104, 16, 108, 56, 106, 96], [60, 108, 30, 106, 0, 106]]), P) +
          both((s) => thinBraid(b(130, 254, s), P, 0) + thinBraid(b(115, 298, s), P, 1) + thinBraid(b(100, 280, s), P, 2));
      },
      front: (P) => {
        const f = (s) => [[s * 83, -22, 7], [s * 89, 40, 7.5], [s * 83, 108, 7.5], [s * 78, 168, 7], [s * 76, 206, 6]];
        const rows = 'M12 -96Q28 -108 32 -122M28 -84Q50 -98 56 -114M44 -72Q68 -86 76 -100M58 -56Q80 -64 87 -76';
        return both((s) => thinBraid(f(s), P, s > 0 ? 1 : 2)) +
          H.fill(H.cap(FRINGE.curtain, [[93, -12, 92, 2, 86, 14], [80, 18], [77, 8, 72, -2, 68, -10]]), P) +
          H.strands('M0 -100V-123' + rows + rows.replace(/([MQ ])(-?\d+) (-?\d+)/g, (m, c, x, y) => `${c}${-x} ${y}`), P, 0.5) + H.shine(-95, 46);
      },
    },
    {
      id: 'pigtails', name: 'קוקיות קצרות', price: 0, tags: ['school', 'kawaii', 'british'],
      back: (P) => {
        const t = [[82, 38, 8], [103, 47, 14], [121, 76, 16.5], [128, 110, 13], [124, 138, 7], [119, 156, 1.5]];
        return H.fill(BACK_NAPE, P) + both((s) => H.tail(side(t, s), P, 0.5, 0.9) + H.strands(H.flow(side(t, s), 0.3 * s, 1, 1), P));
      },
      front: (P) =>
        H.fill(H.capA(H.flipFringe(SWEPT), LOCK.wisp, LOCK.wisp), P) +
        H.strands('M-60 -40Q-66 -66 -56 -92M-36 -44Q-40 -74 -22 -102M-4 -52Q-4 -80 14 -104M28 -68Q34 -94 28 -116M57 -49Q68 -70 58 -94', P) + H.shine() +
        H.tie(89, 42, 58, P, 0.9) + H.tie(-89, 42, -58, P, 0.9),
    },
    {
      id: 'punk', name: 'קוצים', price: 0, tags: ['rock'],
      back: (P) =>
        H.fill(sym(0, [[0, -126], [60, -126, 98, -92, 98, -30], [100, -8, 99, 8, 109, 26], [93, 22], [97, 50], [81, 38], [77, 64], [63, 47], [40, 60, 20, 58, 0, 58]]), P),
      front: (P) =>
        H.fill(H.capA(PUNK, LOCK.spiky, [[94, -8, 98, 26, 91, 52], [85, 72], [81, 46], [75, 58], [73, 30, 70, 8, 68, -10]]), P) +
        H.strands('M44 -78Q46 -100 36 -118M20 -42Q30 -72 22 -104M-16 -32Q0 -66 -2 -104M-52 -26Q-34 -62 -30 -100M-58 -50Q-66 -72 -58 -96M-88 0Q-93 26 -88 50', P) + H.shine(-84, 54),
      top: (P) => {
        const zig = 'M-60 -100L-52 -146L-36 -121L-22 -168L-6 -127L12 -172L27 -125L44 -158L53 -115L68 -134L66 -98';
        return `<path d="${zig}Q0 -84 -60 -100Z" fill="${P.fill}"/>` + p(zig, 'none', P.line, 2.4) +
          H.strands('M-48 -112L-50 -134M-20 -124L-21 -150M12 -128L12 -156M43 -122L44 -146M62 -108L66 -124', P, 0.45);
      },
    },
    {
      id: 'ringlets', name: 'תלתלים ארוכים', price: 0, tags: ['princess', 'pirate'],
      back: (P) =>
        H.fill(sym(0, [[0, -126], [62, -126, 100, -94, 104, -34], [108, -14, 126, -2, 140, 14], [151, 26, 141, 44, 128, 48], [100, 60, 40, 66, 0, 66]]), P) +
        both((s) => ringlet(s * 133, 26, 10, 15, 13.5, s, P) + ringlet(s * 108, 44, 14, 16, 14.5, s, P)),
      front: (P) =>
        both((s) => ringlet(s * 86, 6, 7, 12.5, 11.5, s, P)) +
        H.fill(H.cap(FRINGE.curtain, [[93, -16, 92, -4, 88, 6], [78, 8], [75, 0, 71, -6, 68, -10]]), P) +
        H.strands('M0 -100V-123M42 -72Q62 -84 70 -104M-42 -72Q-62 -84 -70 -104M20 -90Q40 -100 46 -116M-20 -90Q-40 -100 -46 -116', P) + H.shine(-95, 50),
    },
    {
      id: 'big80s', name: 'שיער מנופח', price: 0, tags: ['retro', 'rock'],
      back: (P) =>
        H.fill(sym(0, [[0, -136], [72, -138, 114, -104, 119, -50], [138, -46], [125, -24, 131, -2, 129, 12], [152, 18], [135, 40, 139, 62, 133, 76], [152, 92], [129, 104, 123, 122, 113, 132], [122, 152], [97, 139, 80, 148, 66, 144], [40, 150, 20, 146, 0, 146]]), P) +
        ov(sym(0, [[0, 44], [60, 44], [88, 62, 98, 100, 94, 124], [84, 138, 74, 144, 66, 144], [40, 150, 20, 146, 0, 146]]), DU.SH) +
        H.strands('M112 -40L128 -30M118 20L138 26M122 82L140 92M106 130L114 144M-112 -40L-128 -30M-118 20L-138 26M-122 82L-140 92M-106 130L-114 144M104 -90Q118 -70 116 -52M-104 -90Q-118 -70 -116 -52', P, 0.5),
      front: (P) =>
        H.fill(H.capA(H.full(FRINGE.wispy), LOCK.spiky, LOCK.spiky), P) +
        H.strands('M60 -46Q68 -68 58 -92M42 -52Q46 -78 34 -100M22 -54Q24 -80 12 -104M-60 -46Q-68 -68 -58 -92M-42 -52Q-46 -78 -34 -100M-22 -54Q-24 -80 -12 -104M0 -54V-78', P) + H.shine(-84, 56),
      top: (P) => {
        const t = [[50, -114, 11], [64, -150, 17], [96, -170, 22], [132, -154, 24], [153, -112, 22], [160, -66, 16], [158, -32, 8], [156, -14, 2]];
        const t2 = [[140, -130, 9], [166, -108, 8], [176, -78, 2]];
        return H.tail(t2, P) + H.tail(t, P, 0.4, 0.9) + H.strands(H.flow(t, 0.4, 1, 1) + H.flow(t, -0.35, 2, 1), P) + H.tie(52, -121, 28, P, 1.3);
      },
    },
    {
      id: 'shortwavy', name: 'גלי קצר', price: 0, tags: ['paris', 'school'],
      back: (P) =>
        H.fill(sym(0, [[0, -126], [60, -126, 97, -92, 97, -30], ...DU.cr([[97, -30], [111, 6], [102, 40], [113, 72], [103, 100]]), [97, 118, 84, 118, 78, 104], [70, 122, 54, 122, 46, 107], [38, 122, 22, 122, 14, 109], [8, 117, 4, 115, 0, 113]]), P) +
        ov(sym(0, [[0, 28], [90, 28], [98, 60, 96, 90, 92, 104], [84, 118, 80, 112, 78, 104], [70, 122, 54, 122, 46, 107], [38, 122, 22, 122, 14, 109], [8, 117, 4, 115, 0, 113]]), DU.SH),
      front: (P) => {
        const lk = [[86, -26, 9], [96, 6, 11.5], [87, 38, 11], [95, 70, 9], [90, 98, 3]];
        const lk2 = [[-86, -26, 9], [-97, 8, 11.5], [-88, 42, 11], [-96, 74, 9], [-92, 102, 3]];
        return H.tail(lk, P, 0.3) + H.tail(lk2, P, 0.3) + H.strands(H.flow(lk, 0, 1, 1) + H.flow(lk2, 0, 1, 1), P) +
          H.fill(H.capA(SIDEPART, NOLOCK, NOLOCK), P) +
          H.strands('M46 -78Q44 -100 46 -118M30 -74Q0 -66 -30 -42M38 -76Q10 -92 -36 -62M56 -70Q66 -86 70 -102M-58 -36Q-72 -62 -64 -92', P) + H.shine(-93, 50);
      },
    },
    {
      id: 'rapunzel', name: 'ארוך־ארוך', price: 700, tags: ['princess', 'magic'],
      back: (P) => {
        const path = [[-54, 44], [-98, 72], [-126, 132], [-134, 222], [-130, 322], [-124, 420]];
        const fl = along(path, 6), cols = ['#ffc1d9', '#ffffff', '#ffe08a', '#c9b6ff', '#ffc1d9', '#ffffff'];
        return H.fill(BACK_NAPE, P) + H.tail([[10, 50, 22], [-40, 46, 24], [-80, 60, 22], [-104, 86, 20]], P, 0.6, 0.4) +
          braidAlong(path, 16, 46, 29, P) +
          fl.slice(1).map((c, i) => DU.flower(c.x + (i % 2 ? 9 : -9), c.y, 9, cols[i])).join('');
      },
      front: (P) =>
        H.tail([[84, -24, 6], [92, 14, 6.5], [85, 50, 5], [90, 82, 1.2]], P, 0.3, 0.9) + H.tail([[-84, -24, 6], [-92, 10, 6.5], [-86, 44, 5], [-90, 70, 1.2]], P, 0.3, 0.9) +
        H.fill(H.cap(FRINGE.curtain, LOCK.wisp), P) +
        H.strands('M0 -100V-123M42 -72Q62 -84 70 -104M-42 -72Q-62 -84 -70 -104M20 -90Q40 -100 46 -116M-20 -90Q-40 -100 -46 -116', P) + H.shine(-95, 50) +
        DU.flower(-80, -34, 10, '#ffc1d9') + DU.flower(-66, -50, 7, '#ffffff'),
    }
  );

  DU.HAIR_COLORS = ['#2a2233', '#4a2f27', '#7a4a2b', '#a8703d', '#d9a054', '#f2d27a', '#c8553d', '#e8845c', '#ff9ac1', '#e35d9b', '#b48cff', '#7b5bd6', '#5cc8ff', '#3f7fd9', '#59d6b5', '#f4f1ff', '#9aa3b8'];
  DU.HAIR_SPECIAL = ['rainbow', 'sunset', 'mermaid', 'galaxy', 'gold']; // shop colors
})();
