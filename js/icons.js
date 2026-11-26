/* icons.js — the hand-drawn icon set. One style everywhere: plum outline, flat pastel fills,
   one white highlight. DU.icon('home') → an inline <svg> sized 1em × 1em ('' for an unknown name),
   so an icon simply follows the font-size of whatever it sits in.
   (The size itself is the .du-ico rule in css/room.css, because style.css stretches every bare <svg> to 100%.) */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const K = '#4b3878'; // outline
  const PINK = '#ff9ec4', HOT = '#ff5f9e', ROSE = '#ff7aae', LILAC = '#c9b3ff', GOLD = '#ffd060', SUN = '#ffcc45',
    MINT = '#8fd9b0', SKY = '#bfe9ff', BLUE = '#9fd0ff', SKIN = '#ffdcc6', RED = '#e0457f';
  const L = `stroke="${K}" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"`;
  const L2 = `stroke="${K}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"`;
  const P = (d, fill, l) => `<path d="${d}" fill="${fill || 'none'}" ${l || L}/>`;
  const C = (cx, cy, r, fill, l) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill || 'none'}" ${l === 0 ? '' : l || L}/>`;
  const R = (x, y, w, h, rx, fill, l) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill || 'none'}" ${l === 0 ? '' : l || L}/>`;
  const HI = (d, w = 2.4) => `<path d="${d}" fill="none" stroke="#fff" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const S = (d, color, w) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const heart = (x, y, s) => DU.heartD(x, y, s);
  const star = (x, y, r, rot = -90) => DU.starD(x, y, r, 5, 0.52, rot);
  const spark = (x, y, r) => DU.sparkleD(x, y, r);
  const speaker = (fill) => P('M7 19h8l10 -8v26l-10 -8H7Z', fill);
  const tee = 'M15 6L5 12l4 8l5 -3';

  const I = {
    /* ---------- chrome ---------- */
    home: P('M11 23v16h26V23', '#fff3ea') + P('M9 22L24 9l15 13Z', PINK) + P('M6 25L24 9l18 16') + R(20, 28, 8, 11, 2, LILAC),
    star: P(star(24, 25, 17), SUN) + HI('M17 22q2 -5 6 -6', 2.6),
    sound: speaker(LILAC) + P('M31 18q5 6 0 12') + P('M36 13q9 11 0 22'),
    mute: speaker('#ddd6ec') + S('M32 19l10 10M42 19l-10 10', RED, 3.6),
    zoom: C(20, 20, 12.5, '#d6f0ff') + S('M29.5 29.5L40.5 40.5', K, 7) + S('M31 31l8.5 8.5', LILAC, 2.4) + HI('M13 18q2 -5 7 -6'),
    check: S('M9 25l10 10L39 13', K, 10.5) + S('M9 25l10 10L39 13', '#fff', 5),
    lock: R(11, 21, 26, 20, 5, GOLD) + P('M16 21v-5a8 8 0 0 1 16 0v5') + C(24, 29.5, 3, K, 0) + S('M24 31v5', K, 2.8),
    pencil: P('M9 39l3 -11L31 9l8 8L20 36Z', GOLD) + P('M9 39l3 -11l8 8Z', SKIN) + P('M31 9l3 -3q2 -1.5 4 0l4 4q1.5 2 0 4l-3 3Z', PINK) + `<path d="M9 39l1.6 -5.6l4 4Z" fill="${K}"/>` + HI('M17 27L29 15'),
    camera: P('M16 15l3 -5h10l3 5', LILAC) + R(5, 15, 38, 25, 6, LILAC) + C(24, 27.5, 8, '#eaf6ff') + C(24, 27.5, 3.5, '#7ac3f0', 0) + C(36.5, 20.5, 1.8, GOLD, 0) + HI('M19 24q2 -3 5 -3', 2.2),
    gallery: P('M15 13L24 5l9 8') + R(7, 13, 34, 28, 4, GOLD) + R(12, 18, 24, 18, 2, '#fff', L2) + `<path d="${heart(24, 27, 6.5)}" fill="${ROSE}"/>`,
    shop: P('M9 18h30l-2.5 23h-25Z', PINK) + P('M17 18v-3.5a7 7 0 0 1 14 0v3.5') + `<path d="${heart(24, 29.5, 5.5)}" fill="#fff"/>`,
    album: R(9, 7, 31, 35, 4, LILAC) + S('M15.5 7.5v34', K, 2.8) + P(star(28.5, 19.5, 7.5), SUN, L2) + `<path d="${heart(24, 33, 3.4)}" fill="${ROSE}"/>` + C(33.5, 33, 2.8, '#9fe3d0', 0),
    gift: R(9, 22, 30, 19, 3, PINK) + R(6, 14, 36, 9, 3, ROSE) + R(21, 14, 6, 27, 0, GOLD, L2) + P('M24 14C18 3 8 7 12 12C14 14 20 14 24 14ZM24 14C30 3 40 7 36 12C34 14 28 14 24 14Z', GOLD),
    trash: P('M13 16h22l-2 25H15Z', LILAC) + P('M8 16h32') + P('M19 16v-5h10v5') + S('M20.5 23v11M27.5 23v11', K, 2.4),
    dice: `<g transform="rotate(-8 24 24)">` + R(9, 9, 30, 30, 7, '#fff') + [[17, 17], [31, 17], [24, 24], [17, 31], [31, 31]].map(([x, y]) => C(x, y, 2.7, HOT, 0)).join('') + '</g>',
    close: S('M13 13l22 22M35 13L13 35', K, 9.5) + S('M13 13l22 22M35 13L13 35', ROSE, 4.2),
    play: P('M15 9.5L39 24L15 38.5Z', PINK) + HI('M20 18v9'),
    sparkle: P(spark(21, 27, 16), SUN) + P(spark(37, 12, 7.5), PINK, L2) + P(spark(38, 37, 5), LILAC, L2),
    fabric: `<g transform="rotate(-8 24 24)">` + R(7, 9, 30, 28, 4, '#9fe3d0') + [[15, 17], [25, 17], [20, 24], [30, 24], [15, 31]].map(([x, y]) => C(x, y, 2.3, '#fff', 0)).join('') + '</g>' + P(heart(33, 33, 7.5), ROSE, L2),
    none: C(24, 24, 16, '#fff') + S('M13 35L35 13', RED, 3.8),

    /* ---------- main tabs ---------- */
    girl: P('M7 43q0 -14 17 -14q17 0 17 14Z', PINK) + C(24, 19.5, 10.5, SKIN) + P('M13.5 21Q12 7 24 7Q36 7 34.5 21Q31 12.5 24 13.5Q17 12.5 13.5 21Z', '#b98cff') + C(20.3, 21, 1.7, K, 0) + C(27.7, 21, 1.7, K, 0) + S('M21 25q3 2.5 6 0', K, 2),
    face: C(24, 26, 15, SKIN) + P('M9 25Q8 9 24 9Q40 9 39 25Q34 15 24 16Q14 15 9 25Z', '#b98cff') + C(18.5, 28, 2.2, K, 0) + C(29.5, 28, 2.2, K, 0) + S('M20 33.5q4 3.5 8 0', K, 2.6) + C(14.5, 32.5, 2.3, PINK, 0) + C(33.5, 32.5, 2.3, PINK, 0),
    makeup: R(16, 27, 16, 15, 3, LILAC) + R(18, 21, 12, 7, 1.5, GOLD) + P('M20 21V11.5L28 6V21Z', HOT) + HI('M22.5 13.5v5', 2.2),
    clothes: P('M24 18v-3.5a4.5 4.5 0 1 0 -4.5 -4.5') + P('M24 18L7 31q-3 3.5 1 6h32q4 -2.5 1 -6Z', PINK) + HI('M13 32l8 -6', 2.6),
    acc: P('M24 24C15 11 5 13 6 24C5 35 15 37 24 24Z', PINK) + P('M24 24C33 11 43 13 42 24C43 35 33 37 24 24Z', PINK) + R(19.5, 19, 9, 10, 3.5, HOT) + HI('M11 19q3 -3 6 -1'),
    bg: R(6, 10, 36, 29, 5, SKY) + P('M8 37l10 -13l7 8l5 -5l10 10Z', MINT) + C(33, 18, 4, GOLD),

    /* ---------- sub tabs ---------- */
    eyes: P('M4 25Q24 6 44 25Q24 44 4 25Z', '#fff') + C(24, 25, 9.5, '#7ac3f0') + C(24, 25, 4.2, K, 0) + C(20.8, 21.5, 2.3, '#fff', 0) + S('M13 15.5l-3.5 -5M24 11.5v-6.5M35 15.5l3.5 -5', K, 2.8),
    brows: S('M7 22Q22 7 41 18', K, 10) + S('M7 22Q22 7 41 18', '#b9824f', 4.6) + P('M12 33q12 8 24 0') + S('M16 37l-2 4.5M24 39.5v5M32 37l2 4.5', K, 2.4),
    mouth: P('M7 19Q24 13 41 19Q38 39 24 39Q10 39 7 19Z', RED) + `<path d="M11.5 20.6Q24 16.6 36.500 20.6L35.5 26Q24 23 12.5 26Z" fill="#fff"/><path d="M16.500 34q7.5 -7 15 0q-7.5 4.5 -15 0Z" fill="${PINK}"/>`,
    blush: C(23, 26, 15, '#ffc6de') + S('M16 23l-3 8M23 21l-3 10M30 23l-3 8', ROSE, 2.8) + P(spark(39, 10, 6.5), SUN, L2),
    shadow: P('M5 28Q24 3 43 28Q24 38 5 28Z', LILAC) + `<path d="M11 26Q24 9 37 26Q24 17 11 26Z" fill="#fff" fill-opacity=".55"/>` + S('M12 33l-2.5 5M20 36l-1 5.5M28 36l1 5.5M36 33l2.5 5', K, 2.6),
    lips: P('M5 24Q13 13 20 17Q24 19.5 28 17Q35 13 43 24Q33 37 24 37Q15 37 5 24Z', HOT) + S('M5 24Q24 29.5 43 24', K, 2.6) + HI('M13 20.5q3 -2.5 5.5 -1.5'),
    glitter: P(spark(17, 29, 14), SUN) + P(spark(35, 14, 9), PINK, L2) + P(spark(37, 37, 6), LILAC, L2),
    top: P('M16 7L4 15l5 9l6 -3.5V41h18V20.5l6 3.5l5 -9L32 7q-3 5 -8 5q-5 0 -8 -5Z', PINK) + HI('M19.5 26v9'),
    bottom: P('M11 8h26l3 33H28l-4 -19l-4 19H8Z', BLUE) + S('M11.500 14.500h25', K, 2.4) + HI('M14.500 20l-1.500 15'),
    dress: P('M17 6Q24 13 31 6L34 15L29 21L39 42H9L19 21L14 15Z', PINK) + S('M19 21h10', K, 2.8) + HI('M17.5 29l-3 8'),
    shoes: P('M5 31V17h9q2 7 8 9l14 3q7 1.5 7 7v3H5Z', PINK) + P('M5 34h38v5H5Z', '#fff') + HI('M17 22.500l5 -2M21 26.500l5 -2', 2.2),
    socks: `<path d="M16 6h15v19l9 7q4 4 0 8q-4 4 -9 1L16 31Z" fill="#fff"/>` + S('M17.5 12h12M17.5 17.500h12', ROSE, 3.2) + P('M16 6h15v19l9 7q4 4 0 8q-4 4 -9 1L16 31Z'),
    hat: `<ellipse cx="24" cy="32" rx="20.5" ry="7.5" fill="#ffe3a8" ${L}/>` + P('M12 31Q13 11 24 11Q35 11 36 31Q24 36 12 31Z', '#ffecc2') + P('M12.4 25.500Q24 30.500 35.6 25.500L36 31Q24 36 12 31Z', ROSE),
    hairacc: S('M8 41Q7 12 24 12Q41 12 40 41', K, 9.5) + S('M8 41Q7 12 24 12Q41 12 40 41', LILAC, 4.2) + P('M32 15C27 5 19 10 23 15C19 20 27 25 32 15Z', ROSE, L2) + P('M32 15C37 5 45 10 41 15C45 20 37 25 32 15Z', ROSE, L2) + C(32, 15, 3.2, HOT, L2),
    glasses: C(14.5, 27, 8.5, '#d6f0ff') + C(33.5, 27, 8.5, '#d6f0ff') + P('M22.500 25.500q1.500 -2 3 0') + P('M6.500 24L3.500 18M41.500 24l3 -6') + HI('M10.500 24.500q1.500 -3 4.500 -3.500', 2.2),
    earrings: C(15, 10.500, 3.5, GOLD, L2) + S('M15 14v5', K, 2.4) + P('M15 19l7 10l-7 12l-7 -12Z', '#7de3e0') + C(34, 10.500, 3.2, GOLD, L2) + S('M34 13.500v5', K, 2.4) + P(heart(34, 27, 7.5), ROSE),
    necklace: S('M8 7Q8 31 24 31Q40 31 40 7', K, 8) + S('M8 7Q8 31 24 31Q40 31 40 7', GOLD, 3.4) + P(heart(24, 36, 7.5), ROSE),
    bracelet: `<ellipse cx="24" cy="24" rx="16" ry="12.500" fill="none" stroke="${K}" stroke-width="9.500"/><ellipse cx="24" cy="24" rx="16" ry="12.500" fill="none" stroke="${GOLD}" stroke-width="4.4"/>` + C(9.500, 30, 4.4, PINK, L2) + C(24, 36.500, 4.6, LILAC, L2) + C(38.500, 30, 4.4, '#9fe3d0', L2),
    bag: P('M16 20q0 -13 8 -13q8 0 8 13') + P('M8 20h32l-3 21H11Z', LILAC) + P('M8 20h32l-2 8q-14 6 -28 0Z', '#e2d6fb') + C(24, 29.500, 3.2, GOLD, L2),
    hand: S('M9 40L26 23', K, 7.5) + S('M9 40L26 23', PINK, 2.8) + P(star(31, 17, 11.500, -75), SUN) + P(spark(11, 13, 5.500), LILAC, L2) + P(spark(41, 35, 4.500), PINK, L2),
    side: P('M24 23C15 23 10.500 31 13.500 36.500C16.500 41.500 21 38 24 38C27 38 31.500 41.500 34.500 36.500C37.500 31 33 23 24 23Z', PINK) +
      `<ellipse cx="10.500" cy="21" rx="4.200" ry="5.200" fill="${ROSE}" ${L2}/><ellipse cx="19" cy="12.500" rx="4.200" ry="5.400" fill="${ROSE}" ${L2}/><ellipse cx="29" cy="12.500" rx="4.200" ry="5.400" fill="${ROSE}" ${L2}/><ellipse cx="37.500" cy="21" rx="4.200" ry="5.200" fill="${ROSE}" ${L2}/>`,
    wings: P('M23 24C14 2 0 8 5 21C7 27 15 27 23 24Z', SKY) + P('M23 24C12 27 7 39 15 41C21 42 23 33 23 24Z', LILAC) + P('M25 24C34 2 48 8 43 21C41 27 33 27 25 24Z', SKY) + P('M25 24C36 27 41 39 33 41C27 42 25 33 25 24Z', LILAC) + S('M24 14v25', K, 3.6) + S('M24 14q-2 -6 -6 -7M24 14q2 -6 6 -7', K, 2.2),
    hair: C(23, 27, 9.5, SKIN) + P('M11 28Q8 8 24 8Q41 8 38 28Q38 37 43 42Q32 42 31 32Q33 18 24 18Q16 18 14 28Z', '#b98cff') + HI('M15 16q3 -5 8 -5.500'),

    /* ---------- small controls ---------- */
    tuckin: P(`${tee}v13h20V17l5 3l4 -8L33 6q-4 4 -9 4q-5 0 -9 -4Z`, PINK) + R(12, 28, 24, 14, 2, BLUE) + S('M24 34v8', K, 2.4),
    tuckout: R(12, 30, 24, 12, 2, BLUE) + S('M24 37v5', K, 2.4) + P(`${tee}v19q10 4 20 0V17l5 3l4 -8L33 6q-4 4 -9 4q-5 0 -9 -4Z`, PINK),
    up: P('M24 7L39 24h-8.5v16h-13V24H9Z', LILAC) + HI('M22 15l-5 6'),
    down: P('M24 41L39 24h-8.5V8h-13v16H9Z', LILAC) + HI('M21 12v9'),
    minus: R(9, 19.500, 30, 9, 4.5, LILAC),
    muscle: P('M8 37q-1 -9 7 -13l3 -13q1 -4 5 -3l5 2q3 2 1 5l-5 2.5l-1 5q11 -5 16 3q4 9 -4 13H14q-5 0 -6 -1.5Z', SKIN) + S('M22 31.500q5 -4 10 -1', K, 2.4),
    save: P('M24 31L11 18h7.5V7h11v11H37Z', MINT) + P('M8 34v7h32v-7'),
    share: P('M24 5L37 18h-7.5v11h-11V18H11Z', SKY) + P('M14 27H8v15h32V27h-6'),
    heart: P(heart(24, 24.500, 15.500), ROSE) + HI('M13 19.500q1.500 -5 6 -5.500', 2.6),
  };

  DU.icon = function (name) {
    const body = I[name];
    if (!body) return '';
    return `<svg class="du-ico" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 48 48" aria-hidden="true" focusable="false" >${body}</svg>`;
  };
  DU.icon.names = Object.keys(I);
})();
