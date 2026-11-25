/* hair.js — hairstyles, in head coordinates (origin between the eyes, skull top y=-108,
   chin y=+90, face half-width 80, ears at x=±80 y≈15, shoulders at about y=+110).
   Each style: { id, name, price, back(P), front(P), top?(P) }
     back  — behind the body and the head (long hair, tails)
     front — over the face: bangs, side locks, anything in front of the shoulders
     top   — optional: buns / volume above the skull; hidden when a hat covers the head
   P = paint { fill, line }. Use DU.SH / DU.SH2 / DU.HL overlays for shading so that
   special fills (rainbow…) shade correctly. Eyebrows are drawn OVER the bangs (anime style). */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const { p, ov, sym } = DU;

  const H = (DU.hairKit = {
    fill: (d, P, sw = 2.4) => p(d, P.fill, P.line, sw),
    /* thin strand lines */
    strands: (d, P, op = 0.45) => p(d, 'none', P.line, 1.6, `stroke-opacity="${op}"`),
    /* the anime "angel ring" shine across the top of the head */
    shine: (y = -80, w = 58) =>
      ov(`M${-w - 2} ${y + 2}Q${-w / 2} ${y - 18} 0 ${y - 20}Q${w / 2} ${y - 18} ${w + 2} ${y + 2}L${w - 6} ${y + 8}L${w - 12} ${y}L${w - 20} ${y + 6}Q${w / 3} ${y - 6} 0 ${y - 6}Q${-w / 3} ${y - 6} ${-w + 20} ${y + 6}L${-w + 12} ${y}L${-w + 6} ${y + 8}Z`, DU.HL),
    /* the cap of hair that hugs the skull, with a fringe given as sym() segments from the temple (68,-10) to the centre */
    cap: (fringe, lock) =>
      sym(0, [[0, -124], [52, -125, 91, -92, 90, -34], ...(lock || [[90, -22, 80, -12, 68, -10]]), ...fringe]),
  });

  /* fringes: sym() segments starting at the temple (68,-10), ending on the centre line */
  const FRINGE = {
    strands: [[66, -30, 62, -40, 58, -46], [56, -36, 50, -27, 43, -22], [40, -34, 36, -44, 30, -50], [28, -38, 22, -28, 14, -24], [12, -36, 8, -46, 0, -50]],
    blunt: [[66, -30, 62, -44, 56, -52], [40, -43, 20, -42, 0, -42]],
  };
  H.FRINGE = FRINGE;
  /* side locks: sym() segments from the temple outside (90,-34) down to a tip and back up to (68,-10) */
  const LOCK = {
    long: [[92, 0, 93, 44, 85, 86], [82, 96], [74, 60, 72, 20, 68, -10]],
    chin: [[96, 6, 98, 60, 86, 100], [76, 104], [70, 70, 72, 20, 68, -12]],
    short: [[93, -10, 92, 16, 84, 34], [80, 40], [76, 20, 72, 4, 68, -10]],
  };
  H.LOCK = LOCK;
  const bangLines = 'M58 -46Q66 -68 58 -92M30 -50Q34 -76 24 -100M-58 -46Q-66 -68 -58 -92M-30 -50Q-34 -76 -24 -100M0 -50V-76';

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
  ];
  DU.HAIR_COLORS = ['#2a2233', '#4a2f27', '#7a4a2b', '#a8703d', '#d9a054', '#f2d27a', '#c8553d', '#e8845c', '#ff9ac1', '#e35d9b', '#b48cff', '#7b5bd6', '#5cc8ff', '#3f7fd9', '#59d6b5', '#f4f1ff', '#9aa3b8'];
  DU.HAIR_SPECIAL = ['rainbow', 'sunset', 'mermaid', 'galaxy', 'gold']; // shop colors
})();
