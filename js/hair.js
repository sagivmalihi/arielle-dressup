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
  DU.HAIR_COLORS = ['#2a2233', '#4a2f27', '#7a4a2b', '#a8703d', '#d9a054', '#f2d27a', '#c8553d', '#e8845c', '#ff9ac1', '#e35d9b', '#b48cff', '#7b5bd6', '#5cc8ff', '#3f7fd9', '#59d6b5', '#f4f1ff', '#9aa3b8'];
  DU.HAIR_SPECIAL = ['rainbow', 'sunset', 'mermaid', 'galaxy', 'gold']; // shop colors
})();
