/* show.js — "סיימתי" as a fashion show (instead of a table of numbers).
   The curtains part, she walks out of the lit arch, strikes a pose, cameras flash, three judges
   raise their star cards and say what they loved (taken from the real score), the stars fly into
   the counter and the praise sign drops in. A tap anywhere jumps to the last frame.
   A girl that is "not ready yet" gets a short, gentle version with the "I love her" button.

   DU.show.run(host, { state, res, gain, theme, stickers, pagesDone }) → { done: Promise, skip() }
   DU.show.loved(host)   after "אני אוהבת אותה!" — switches the last frame to "saved"
   The buttons of the last frame are plain <button data-act="r-new | r-edit | r-photo | r-love">;
   app.js handles them. Every size in show.css is in --u (1% of the stage width). */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const n = DU.n;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const U = (v) => `calc(var(--u) * ${v})`;
  const ABORT = { abort: true };

  /* ---------- little drawn icons (no emoji in the show) ---------- */
  const STARD = DU.starD(0, 0, 10, 5, 0.5);
  const SPARK = 'M0 -10C1.2 -3 3 -1.2 10 0C3 1.2 1.2 3 0 10C-1.2 3 -3 1.2 -10 0C-3 -1.2 -1.2 -3 0 -10Z';
  const HEART = 'M0 8.4C-11 1 -10.4 -8 -4.8 -8C-2 -8 0 -6.2 0 -4.4C0 -6.2 2 -8 4.8 -8C10.4 -8 11 1 0 8.4Z';
  const starSvg = (cls = '') => `<svg class="${cls}" viewBox="-11 -11 22 22" aria-hidden="true"><path d="${STARD}" fill="#ffc83d" stroke="#e8932a" stroke-width="1.6" stroke-linejoin="round"/><path d="M-3.2 -3.6Q-1 -6.4 1.6 -6.6" fill="none" stroke="#fff6c9" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  const heartSvg = (cls = '', fill = '#ff5fa2', line = '#d93f80') => `<svg class="${cls}" viewBox="-12 -11 24 22" aria-hidden="true"><path d="${HEART}" fill="${fill}" stroke="${line}" stroke-width="1.6" stroke-linejoin="round"/><path d="M-6.2 -3.2Q-5.6 -5.8 -3.4 -5.6" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  const ICON = {
    spark: (c = '#fff') => `<svg class="sh-ico" viewBox="-12 -12 24 24" aria-hidden="true"><path d="${SPARK}" fill="${c}"/><path d="${SPARK}" transform="translate(7.5 -7.5) scale(.38)" fill="${c}"/></svg>`,
    pencil: () => `<svg class="sh-ico" viewBox="-12 -12 24 24" aria-hidden="true"><g transform="rotate(40)" stroke="#6a4fd0" stroke-width="1.6" stroke-linejoin="round"><rect x="-3.6" y="-10" width="7.2" height="14.5" rx="1" fill="#ffc83d"/><rect x="-3.6" y="-10" width="7.2" height="3.6" rx="1" fill="#ff8fb5"/><path d="M-3.6 4.5L0 10.5L3.6 4.5Z" fill="#ffe9c9"/></g></svg>`,
    camera: () => `<svg class="sh-ico" viewBox="-12 -12 24 24" aria-hidden="true"><g stroke="#6a4fd0" stroke-width="1.6" stroke-linejoin="round"><path d="M-5 -6.5L-3.4 -9H3.4L5 -6.5Z" fill="#b9a4f7"/><rect x="-10" y="-6.5" width="20" height="14.5" rx="3.4" fill="#8b6cf0"/><circle cx="0" cy="1" r="4.6" fill="#e9defc"/><circle cx="0" cy="1" r="2" fill="#6a4fd0" stroke="none"/><circle cx="7" cy="-3.6" r="1" fill="#fff" stroke="none"/></g></svg>`,
    heart: () => heartSvg('sh-ico', '#fff', '#ffd0e4'),
    bike: () => `<svg class="sh-ico" viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="32" r="8.5"/><circle cx="37" cy="32" r="8.5"/><path d="M11 32L19 17H31L37 32M19 17L25 32H11M31 17L29 10.5H34.5M15.5 12H22.5"/></g></svg>`,
    check: () => `<svg viewBox="-12 -12 24 24" aria-hidden="true"><circle r="10.5" fill="#2fc7a0"/><path d="M-5 0.5L-1.5 4L5.5 -3.5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    sticker: () => `<svg viewBox="-12 -12 24 24" aria-hidden="true"><path d="M-9 -6a3 3 0 0 1 3 -3H6a3 3 0 0 1 3 3V2L2 9H-6a3 3 0 0 1 -3 -3Z" fill="#fff" stroke="#8b6cf0" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 2H5a3 3 0 0 0 -3 3V9" fill="#e9defc" stroke="#8b6cf0" stroke-width="1.8" stroke-linejoin="round"/><path d="${HEART}" transform="translate(-1.5 -2.5) scale(.42)" fill="#ff5fa2"/></svg>`,
    book: () => `<svg viewBox="-12 -12 24 24" aria-hidden="true"><path d="M0 -6C-3 -8.5 -7 -8.5 -10 -7V7C-7 5.5 -3 5.5 0 8C3 5.5 7 5.5 10 7V-7C7 -8.5 3 -8.5 0 -6Z" fill="#fff" stroke="#8b6cf0" stroke-width="1.8" stroke-linejoin="round"/><path d="M0 -6V8" stroke="#8b6cf0" stroke-width="1.6"/><path d="${STARD}" transform="translate(5 -0.5) scale(.3)" fill="#ffc83d"/></svg>`,
  };

  /* the buttons of the last frame (app.js handles the data-act clicks) */
  const okButtons = `<button class="btn ride-go" data-act="r-ride">${ICON.bike()}<span>לצאת לרכיבה</span></button><button class="btn" data-act="r-new">${ICON.spark()}<span>דמות חדשה</span></button><button class="btn white" data-act="r-edit">${ICON.pencil()}<span>להמשיך לעצב</span></button><button class="btn white" data-act="r-photo">${ICON.camera()}<span>תמונה</span></button>`;
  const lowButtons = `<button class="btn sh-love" data-act="r-love">${ICON.heart()}<span>אני אוהבת אותה! לשמור בכל זאת</span></button><button class="btn mint" data-act="r-edit">${ICON.spark()}<span>להוסיף עוד פרטים</span></button>`;

  /* ---------- the hall (viewBox 400×300 = the 4:3 stage). Static part and the blinking part apart,
     so the big picture is painted once. ---------- */
  const AX = 200, AY = 100, AR = 60;
  const xl = (y) => 150 - (y - 172) * 0.625; // left edge of the runway at y
  const STICK = ['#ff7fc0', '#7de3ff', '#ffe27a', '#b99cff'];
  function hallParts(u, bg) {
    let halos = '', bulbs = '';
    const bulb = (x, y, i) => {
      halos += `<circle cx="${n(x)}" cy="${n(y)}" r="5.2" fill="#ffe9a8" opacity=".3"/>`;
      bulbs += `<circle class="sh-bulb" style="animation-delay:${((i % 3) * 0.3).toFixed(1)}s" cx="${n(x)}" cy="${n(y)}" r="2.3" fill="#fffbe3"/>`;
    };
    for (let i = 0; i <= 12; i++) { const a = Math.PI + (i / 12) * Math.PI; bulb(AX + Math.cos(a) * (AR + 9), AY + Math.sin(a) * (AR + 9), i); }
    for (let k = 1; k <= 4; k++) { bulb(AX - AR - 9, AY + k * 16, k); bulb(AX + AR + 9, AY + k * 16, k + 1); }

    /* audience: three rows on each side of the runway, some holding little light sticks */
    let crowd = '', sticks = '';
    [[186, 4.4, '#3a2063', 16], [200, 5.8, '#2d174f', 20], [219, 7.6, '#1f0f3b', 25]].forEach(([y, r, fill, step], ri) => {
      let i = 0;
      for (let x = 15 + ri * 5; x < xl(y) - r * 2.4; x += step, i++) {
        [x, 400 - x].forEach((px, si) => {
          const jy = y + ((i * 7 + ri * 3 + si) % 3) - 1;
          crowd += `<circle cx="${n(px)}" cy="${n(jy)}" r="${r}" fill="${fill}"/><path d="M${n(px - r * 2)} ${n(jy + r * 3)}Q${n(px - r * 1.9)} ${n(jy + r * 1.05)} ${n(px)} ${n(jy + r * 1.05)}Q${n(px + r * 1.9)} ${n(jy + r * 1.05)} ${n(px + r * 2)} ${n(jy + r * 3)}Z" fill="${fill}"/>`;
          if ((i + ri + si) % 3 === 0) {
            const c = STICK[(i + ri * 2 + si) % 4], sx = px + (si ? -1 : 1) * r * 1.5, sy = jy + r * 0.9;
            sticks += `<g class="sh-stick" style="animation-delay:${((i * 0.37 + ri * 0.2) % 1.4).toFixed(2)}s"><path d="M${n(sx)} ${n(sy)}v${n(-r * 2.3)}" stroke="${c}" stroke-width="${n(r * 0.42)}" stroke-linecap="round"/><circle cx="${n(sx)}" cy="${n(sy - r * 2.3)}" r="${n(r * 1.05)}" fill="${c}" opacity=".35"/><circle cx="${n(sx)}" cy="${n(sy - r * 2.3)}" r="${n(r * 0.5)}" fill="#fff"/></g>`;
          }
        });
      }
    });

    let edge = '';
    [176, 183, 192, 204, 219, 238, 262, 292].forEach((y, i) => {
      const r = 1 + i * 0.36;
      [xl(y) + 3 + i * 0.5, 400 - xl(y) - 3 - i * 0.5].forEach((x) => { edge += `<circle cx="${n(x)}" cy="${y}" r="${n(r * 2.4)}" fill="#ffd9f2" opacity=".28"/><circle cx="${n(x)}" cy="${y}" r="${n(r)}" fill="#fff6e3"/>`; });
    });
    let dust = '';
    for (let i = 0; i < 22; i++) {
      const x = (i * 97 + 31) % 400, y = (i * 53 + 11) % 165, r = 0.7 + ((i * 7) % 5) * 0.28;
      if (x > 130 && x < 270 && y > 30) continue; // not over the arch
      dust += `<circle class="sh-tw" style="animation-delay:${((i * 0.31) % 2.6).toFixed(2)}s" cx="${x}" cy="${y}" r="${n(r)}" fill="${i % 3 ? '#ffe9ff' : '#ffe9a8'}"/>`;
    }

    const archD = `M${AX - AR} 172V${AY}a${AR} ${AR} 0 0 1 ${2 * AR} 0V172Z`;
    let inside = '';
    if (bg) { // her own background glows inside the arch
      try {
        inside = `<g clip-path="url(#${u}ac)"><svg x="${AX - AR}" y="${AY - AR - 4}" width="${2 * AR}" height="${172 - AY + AR + 4}" viewBox="0 0 750 1000" preserveAspectRatio="xMidYMid slice">${bg.draw(u + 'bg')}</svg></g><path d="${archD}" fill="url(#${u}gl)"/>`;
      } catch (e) { inside = ''; }
    }

    const stat = `<svg class="sh-hall" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <radialGradient id="${u}h" cx="50%" cy="30%" r="80%"><stop offset="0" stop-color="#6d3aa0"/><stop offset=".5" stop-color="#3b1d66"/><stop offset="1" stop-color="#1a0c30"/></radialGradient>
        <pattern id="${u}d" width="20" height="172" patternUnits="userSpaceOnUse"><rect width="20" height="172" fill="#4d2180"/><rect x="0" width="5" height="172" fill="#3c1869"/><rect x="9" width="5" height="172" fill="#5e2b96"/><rect x="14" width="2" height="172" fill="#6f3aa8"/></pattern>
        <linearGradient id="${u}dv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#120722" stop-opacity=".75"/><stop offset=".45" stop-color="#120722" stop-opacity=".12"/><stop offset="1" stop-color="#120722" stop-opacity=".55"/></linearGradient>
        <radialGradient id="${u}g" cx="50%" cy="62%" r="62%"><stop offset="0" stop-color="#fffdf2"/><stop offset=".38" stop-color="#ffd0ea"/><stop offset=".75" stop-color="#d77fe0"/><stop offset="1" stop-color="#8b4fc9"/></radialGradient>
        <radialGradient id="${u}gl" cx="50%" cy="66%" r="66%"><stop offset="0" stop-color="#fffdf2" stop-opacity=".62"/><stop offset=".55" stop-color="#ffd0ea" stop-opacity=".3"/><stop offset="1" stop-color="#8b4fc9" stop-opacity=".42"/></radialGradient>
        <clipPath id="${u}ac"><path d="${archD}"/></clipPath>
        <linearGradient id="${u}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a4bb8"/><stop offset=".4" stop-color="#9a6ad2"/><stop offset="1" stop-color="#cba4ee"/></linearGradient>
        <linearGradient id="${u}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1550"/><stop offset="1" stop-color="#150a28"/></linearGradient>
        <radialGradient id="${u}p"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".6" stop-color="#ffe3f6" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
        <radialGradient id="${u}v" cx="50%" cy="45%" r="75%"><stop offset=".55" stop-color="#0d0518" stop-opacity="0"/><stop offset="1" stop-color="#0d0518" stop-opacity=".7"/></radialGradient>
        <radialGradient id="${u}a" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffb8e6" stop-opacity=".55"/><stop offset="1" stop-color="#ffb8e6" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#${u}h)"/>
      <rect width="400" height="172" fill="url(#${u}d)"/><rect width="400" height="172" fill="url(#${u}dv)"/>
      <ellipse cx="200" cy="112" rx="150" ry="110" fill="url(#${u}a)"/>
      <path d="M${AX - AR - 16} 172V${AY}a${AR + 16} ${AR + 16} 0 0 1 ${2 * AR + 32} 0V172Z" fill="#2c1352" stroke="#ffd36b" stroke-width="2.5"/>
      <path d="${archD}" fill="url(#${u}g)"/>${inside}
      <path d="M${AX - AR} 172V${AY}a${AR} ${AR} 0 0 1 ${2 * AR} 0V172" fill="none" stroke="#fff3c4" stroke-width="2"/>
      ${halos}
      <rect y="172" width="400" height="128" fill="url(#${u}f)"/>
      <path d="M150 172H250L330 300H70Z" fill="url(#${u}r)"/>
      <path d="M186 172H214L246 300H154Z" fill="#fff" opacity=".13"/>
      <path d="M150 172H250L253 177H147Z" fill="#ffe1f5" opacity=".7"/>
      <ellipse cx="200" cy="181" rx="46" ry="7" fill="#ffd0ea" opacity=".5"/>
      <ellipse cx="200" cy="238" rx="74" ry="17" fill="url(#${u}p)"/>
      ${edge}${crowd}
      <rect width="400" height="300" fill="url(#${u}v)"/>
    </svg>`;
    const live = `<svg class="sh-live" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">${dust}${bulbs}${sticks}</svg>`;
    return stat + live;
  }

  /* ---------- the judges: three original characters ---------- */
  const JUDGES = [
    { id: 'cat', x: 11.5, lift: 6.6, bx: 0, bw: 19, tilt: -4 },
    { id: 'bunny', x: 29, lift: 0.4, bx: 1.5, bw: 19, tilt: 3 },
    { id: 'bear', x: 83.5, lift: 1.2, bx: -5, bw: 29, tilt: -2 },
  ];
  const mir = (svg) => `<g transform="matrix(-1 0 0 1 120 0)">${svg}</g>`;
  const both = (svg) => svg + mir(svg);
  function judgeSvg(id) {
    let g = '';
    if (id === 'cat') {
      const F = '#cfc2ec', L = '#6f5a99';
      g += `<path d="M20 150C20 122 40 111 60 111C80 111 100 122 100 150Z" fill="#6b3fa0" stroke="#3f2466" stroke-width="3"/>`;
      g += `<path d="M42 113Q60 124 78 113Q79 105 60 106Q41 105 42 113Z" fill="#8457bd" stroke="#3f2466" stroke-width="2.6"/>`;
      g += both(`<path d="M27 62L22 22L55 42Z" fill="${F}" stroke="${L}" stroke-width="3"/><path d="M30 52L28 32L44 43Z" fill="#ffb3cf"/>`);
      g += `<path d="M60 38C88 38 104 56 104 80C104 104 86 118 60 118C34 118 16 104 16 80C16 56 32 38 60 38Z" fill="${F}" stroke="${L}" stroke-width="3"/>`;
      g += both(`<path d="M16 84L7 88L17 92" fill="${F}" stroke="${L}" stroke-width="2.6"/>`);
      g += `<ellipse cx="60" cy="97" rx="19" ry="12" fill="#efe8fb"/>`;
      g += both(`<ellipse cx="41" cy="79" rx="6.6" ry="7.6" fill="#3a2a5c"/><circle cx="43.4" cy="75.6" r="2.3" fill="#fff"/><path d="M32 74Q41 69 50 75" fill="none" stroke="${L}" stroke-width="3"/>`);
      g += both(`<path d="M27 72Q25 63 41 65Q56 66 54 80Q52 91 40 91Q27 91 27 76Z" fill="#fff" fill-opacity=".22" stroke="#e0437f" stroke-width="3"/><path d="M27 70L19 63" stroke="#e0437f" stroke-width="3"/><circle cx="30" cy="68" r="1.4" fill="#ffd36b"/>`);
      g += `<path d="M54 76Q60 72 66 76" fill="none" stroke="#e0437f" stroke-width="3"/>`;
      g += `<path d="M56 93H64L60 98Z" fill="#ff7fa8" stroke="#d2557f" stroke-width="1.4"/><path d="M60 98Q60 104 53 103M60 98Q60 104 67 103" fill="none" stroke="${L}" stroke-width="2.4"/>`;
      g += both(`<path d="M36 98L20 96M36 102L21 105" stroke="${L}" stroke-width="1.6" stroke-opacity=".7"/>`);
      g += `<circle cx="48" cy="119" r="2.6" fill="#fff6e3"/><circle cx="54" cy="121.6" r="2.6" fill="#fff6e3"/><circle cx="60" cy="122.6" r="2.6" fill="#fff6e3"/><circle cx="66" cy="121.6" r="2.6" fill="#fff6e3"/><circle cx="72" cy="119" r="2.6" fill="#fff6e3"/>`;
    } else if (id === 'bunny') {
      const F = '#fff5ec', L = '#d2ac96';
      g += `<path d="M22 150C22 124 42 112 60 112C78 112 98 124 98 150Z" fill="#8fe0c8" stroke="#3f9f87" stroke-width="3"/>`;
      g += both(`<path d="M32 50C13 44 2 66 7 96C9 111 24 113 28 100C33 84 40 64 32 50Z" fill="${F}" stroke="${L}" stroke-width="3"/><path d="M26 60C17 62 13 78 15 94C17 101 22 100 23 93C25 82 29 70 26 60Z" fill="#ffc4d6"/>`);
      g += `<path d="M60 40C87 40 102 58 102 81C102 105 84 118 60 118C36 118 18 105 18 81C18 58 33 40 60 40Z" fill="${F}" stroke="${L}" stroke-width="3"/>`;
      g += `<path d="M52 41Q56 30 64 36Q62 40 66 42" fill="${F}" stroke="${L}" stroke-width="2.6"/>`;
      g += both(`<ellipse cx="42" cy="79" rx="8" ry="9.6" fill="#4a2f55"/><circle cx="44.8" cy="74.8" r="3.1" fill="#fff"/><circle cx="39.6" cy="83.6" r="1.6" fill="#fff"/><ellipse cx="29" cy="94" rx="7" ry="4.4" fill="#ffa9c6" opacity=".8"/>`);
      g += `<ellipse cx="60" cy="90" rx="3.4" ry="2.5" fill="#ff7fa8"/>`;
      g += `<path d="M51 96Q60 99 69 96Q67 109 60 109Q53 109 51 96Z" fill="#b33a52" stroke="#8c3346" stroke-width="2.2"/><path d="M56 97.4H64V102H56Z" fill="#fff"/><path d="M60 97.4V102" stroke="#e5d7d0" stroke-width="1"/>`;
      g += `<g transform="translate(92 54)">${DU.flower(0, 0, 8.5, '#ff8fc0')}</g>`;
      g += `<path d="M60 116L47 110V124Z" fill="#ff8fc0" stroke="#d2557f" stroke-width="2.2"/><path d="M60 116L73 110V124Z" fill="#ff8fc0" stroke="#d2557f" stroke-width="2.2"/><circle cx="60" cy="116.5" r="3.6" fill="#ffb3d4" stroke="#d2557f" stroke-width="2"/>`;
    } else {
      const F = '#e3aa6a', L = '#9a6a35';
      g += `<path d="M12 150C12 122 36 110 60 110C84 110 108 122 108 150Z" fill="#fff7e8" stroke="#c9a37a" stroke-width="3"/>`;
      g += both(`<circle cx="26" cy="48" r="13.5" fill="${F}" stroke="${L}" stroke-width="3"/><circle cx="26" cy="48" r="6.6" fill="#f8d3a0"/>`);
      g += `<path d="M60 36C92 36 108 57 108 81C108 106 88 120 60 120C32 120 12 106 12 81C12 57 28 36 60 36Z" fill="${F}" stroke="${L}" stroke-width="3"/>`;
      g += `<ellipse cx="60" cy="97" rx="23" ry="16.5" fill="#f9dfb4"/>`;
      g += both(`<path d="M35 78Q42.5 69 50 78" fill="none" stroke="#4a2a14" stroke-width="3.6"/><ellipse cx="29" cy="93" rx="7.5" ry="4.6" fill="#ff9f8f" opacity=".7"/>`);
      g += `<ellipse cx="60" cy="89" rx="7.4" ry="5.2" fill="#6b3d1e"/><ellipse cx="57.6" cy="87.4" rx="2.4" ry="1.4" fill="#fff" opacity=".7"/>`;
      g += `<path d="M60 94V99M60 99Q54 106 47 101M60 99Q66 106 73 101" fill="none" stroke="#6b3d1e" stroke-width="2.5"/>`;
      g += `<g transform="translate(79 36) rotate(15)"><rect x="-15" y="-26" width="30" height="26" rx="3" fill="#3a2a5c" stroke="#241640" stroke-width="3"/><rect x="-15" y="-9" width="30" height="6.5" fill="#ffc83d"/><rect x="-23" y="-2" width="46" height="7" rx="3.5" fill="#3a2a5c" stroke="#241640" stroke-width="3"/><path d="M-9 -21V-13" stroke="#6a5a94" stroke-width="2.4"/></g>`;
      g += `<path d="M60 118L43 109V128Z" fill="#ff5f6e" stroke="#b83245" stroke-width="2.4"/><path d="M60 118L77 109V128Z" fill="#ff5f6e" stroke="#b83245" stroke-width="2.4"/><circle cx="60" cy="118.5" r="4.4" fill="#ff8a94" stroke="#b83245" stroke-width="2.2"/><circle cx="49" cy="116" r="1.5" fill="#fff"/><circle cx="50" cy="122" r="1.3" fill="#fff"/><circle cx="71" cy="116" r="1.5" fill="#fff"/><circle cx="70" cy="122" r="1.3" fill="#fff"/>`;
    }
    return `<svg class="sh-jsvg" viewBox="0 -8 120 158" aria-hidden="true"><g stroke-linejoin="round" stroke-linecap="round">${g}</g></svg>`;
  }

  /* ---------- sounds ---------- */
  const semi = (base, st) => base * Math.pow(2, st / 12);
  const tone = (f, o) => { try { if (DU.sound && DU.sound.tone) DU.sound.tone(f, o); } catch (e) { /* never break the show */ } };
  const play = (name) => { try { if (DU.sound) DU.sound.play(name); } catch (e) { /* ignore */ } };
  const SFX = {
    whoosh: () => tone(240, { type: 'triangle', dur: 0.3, slide: 900, vol: 0.07 }),
    step: (i) => tone(semi(392, i % 2 ? 3 : 0), { type: 'sine', dur: 0.07, vol: 0.09 }),
    chime: (st = 0) => [0, 4, 7, 12].forEach((s, i) => tone(semi(660, st + s), { type: 'sine', at: i * 0.07, dur: 0.5, vol: 0.13 })),
    pop: (st = 0) => tone(semi(520, st), { type: 'triangle', dur: 0.16, slide: semi(780, st), vol: 0.18 }),
    star: (i = 0) => tone(semi(784, [0, 2, 4, 7, 9, 12, 14, 16][i % 8]), { type: 'sine', dur: 0.28, vol: 0.13 }),
    soft: (st = 0) => tone(semi(440, st), { type: 'sine', dur: 0.22, vol: 0.12 }),
  };

  /* ---------- what the judges say (from the real score) ---------- */
  function judgeLines(res, theme) {
    if (!res.ok) {
      return { say: ['חסרים לה עוד פרטים', 'היא עוד לא מוכנה…', 'עוד קצת והיא מושלמת!'], stars: [0, 0, 0] };
    }
    const lines = res.lines || [], ef = res.effort || { ch: {} }, ch = ef.ch || {};
    const fav = res.fav || 'איזו דמות מקסימה!';
    const themeLine = lines.find((l) => l.count != null);
    const outfit = lines.find((l) => l.label === 'תלבושת שלמה');
    const det = lines.find((l) => l.label === 'המון פרטים');
    const count = themeLine ? themeLine.count : 0, nm = theme ? theme.name : '';
    const cat = count >= 3 && nm ? `הכי ${nm} שיש!` : count >= 1 && nm ? `ממש ${nm}!` : outfit ? 'איזו תלבושת!' : 'איזה סטייל!';
    // the bunny picks something the bear did not already say
    const cands = [];
    if (ef.makeup >= 2) cands.push([/איפור/, 'איפור נוצץ!']);
    if (ch.hairStyle || ch.hairColor) cands.push([/שיער|תסרוק/, 'איזה שיער!']);
    if (ch.eyeColor || ch.eyeShape) cands.push([/עיניים/, 'איזה עיניים!']);
    if (det && det.pts >= 120) cands.push([/פרטים/, 'כמה פרטים!']);
    cands.push([/צבעים/, 'איזה צבעים!'], [/סטייל/, 'איזה סטייל!']);
    const used = [fav, cat].join(' ');
    const pick = cands.find(([re]) => !re.test(used)) || cands[cands.length - 1];
    return {
      say: [cat, pick[1], fav],
      stars: [count >= 3 ? 5 : 4, det && det.pts >= 150 ? 5 : 4, 5],
    };
  }

  /* a last pose that suits what she holds: a cup or a balloon should not be swung around, a bag neither */
  function finalPose(state) {
    const w = (state && state.wear) || {};
    const hand = !!(w.hand && DU.itemById[w.hand.id]), bag = !!(w.bag && DU.itemById[w.bag.id]);
    if (hand && bag) return { armL: [18, 10], armR: [16, -12], head: 5 };
    if (hand) return { armL: [20, 12], armR: [40, -112], head: 5 };
    if (bag) return { armL: [96, 10], armR: [16, -12], head: -5 };
    return DU.POSES.star;
  }

  function build(host, o) {
    const res = o.res || {}, ok = !!res.ok, state = o.state, theme = o.theme || res.theme || null;
    const total = Math.round(res.total || 0), gain = Math.max(0, Math.round(o.gain || 0));
    const M = DU.motion, u = DU.uid('sh');
    const reduced = M.reduced();
    const bg = (DU.backgrounds || []).find((b) => b.id === state.bg) || null;
    const J = judgeLines(res, theme);
    const FINAL = ok ? finalPose(state) : DU.safePose(state, 'shy');
    const praise = res.praise || 'מקסימה!';

    let scallops = 'M0 0H400V13';
    for (let i = 7; i >= 0; i--) scallops += `Q${i * 50 + 25} 31 ${i * 50} 13`;
    const valance = `<svg class="sh-val" viewBox="0 0 400 26.4" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${u}vg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a174a"/><stop offset="1" stop-color="#c93c78"/></linearGradient></defs>
      <path d="${scallops}Z" fill="url(#${u}vg)"/><path d="${scallops.replace('M0 0H400V13', 'M400 13')}" fill="none" stroke="#ffd36b" stroke-width="1.6"/>
      ${[50, 100, 150, 200, 250, 300, 350].map((x) => `<circle cx="${x}" cy="14" r="2.2" fill="#ffd36b"/>`).join('')}</svg>`;

    /* the news of this round: little pills under the star counter */
    const pill = (icon, html, cls = '') => `<span class="sh-pill ${cls}">${icon}<span>${html}</span></span>`;
    const savedPill = pill(ICON.check(), 'נשמרה בגלריה');
    const newsOk = () => {
      const bits = [];
      if (gain) bits.push(pill(starSvg(), `<span dir="ltr">+${gain}</span> כוכבים חדשים`, 'gold'));
      bits.push(savedPill);
      if (o.pagesDone > 0) bits.push(pill(ICON.book(), 'השלמת דף באלבום!'));
      else if (o.stickers > 0) bits.push(pill(ICON.sticker(), o.stickers === 1 ? 'מדבקה חדשה לאלבום' : `<span dir="ltr">+${o.stickers}</span> מדבקות לאלבום`));
      if (!gain && bits.length < 3) bits.push(pill(ICON.spark('#ff5fa2'), 'דמות חדשה = כוכבים חדשים!'));
      return bits.join('');
    };
    const noteLow = `היא קיבלה רק ${starSvg('sh-nstar')}<b dir="ltr">${total}</b> ולא תישמר בגלריה.<br><small>אפשר להוסיף לה בגדים, נעליים, אביזרים ואיפור</small>`;

    const themeChip = theme ? `<div class="sh-theme"><svg viewBox="-11 -11 22 22" aria-hidden="true"><path d="${SPARK}" fill="#ff5fa2"/></svg><span>אתגר: ${esc(theme.name)}</span></div>` : '';
    const stage = el(`<div class="sh-stage ${ok ? 'sh-ok' : 'sh-low'} sh-spots sh-open" role="group" aria-label="תצוגת אופנה">
      ${hallParts(u, bg)}
      <div class="sh-cone back l"></div><div class="sh-cone back r"></div>
      <div class="sh-sign"><div class="sh-plaque">${starSvg()}<span>${esc(praise)}</span>${starSvg()}</div></div>
      <div class="sh-actor"><div class="sh-step"><div class="sh-shadow"></div><div class="sh-refl">${DU.renderCard(state, { noBg: true })}</div><div class="sh-girl">${DU.renderCard(state, { rig: true, noBg: true })}</div></div></div>
      <div class="sh-cur l"></div><div class="sh-cur r"></div>${valance}
      <div class="sh-desk l">${starSvg()}</div><div class="sh-desk r">${starSvg()}</div>
      ${JUDGES.map((j, i) => `<div class="sh-judge" data-j="${i}" style="left:${U(j.x)};--lift:${U(j.lift)};--bx:${U(j.bx)};--bw:${U(j.bw)};--tilt:${j.tilt}deg">
          <div class="sh-card">${Array(J.stars[i] || 0).fill(starSvg()).join('')}</div>${judgeSvg(j.id)}<div class="sh-bubble">${esc(J.say[i])}</div></div>`).join('')}
      <div class="sh-dim"></div><div class="sh-cone front l"></div><div class="sh-cone front r"></div><div class="sh-white"></div>
      <div class="sh-count">${starSvg()}<span>0</span></div>${themeChip}
      <div class="sh-news">${ok ? newsOk() : ''}</div>
      <div class="sh-fx"></div>
      <div class="sh-end"><div class="sh-note">${ok ? '' : noteLow}</div><div class="sh-btns">${ok ? okButtons : lowButtons}</div></div>
      <div class="sh-skip">אפשר לגעת כדי לדלג</div>
    </div>`);
    host.innerHTML = '';
    host.appendChild(stage);

    const actor = stage.querySelector('.sh-actor'), fx = stage.querySelector('.sh-fx'), countEl = stage.querySelector('.sh-count span');
    const countPill = stage.querySelector('.sh-count'), judges = [...stage.querySelectorAll('.sh-judge')], white = stage.querySelector('.sh-white');
    const face = (eyes, mouth) => { DU.setEyes(actor, eyes); DU.setMouth(actor, mouth); };

    let finished = false, lovedDone = false, finishDone;
    const done = new Promise((r) => (finishDone = r));
    const alive = () => !finished && host.isConnected;
    const wait = (ms) => new Promise((res2, rej) => setTimeout(() => (alive() ? res2() : rej(ABORT)), ms));
    const later = (ms, fn) => setTimeout(() => { if (alive()) fn(); }, ms);

    /* where something is, in % of the stage */
    const at = (node, fx_ = 0.5, fy = 0.5) => {
      const a = stage.getBoundingClientRect(), b = node.getBoundingClientRect();
      return [((b.left + b.width * fx_ - a.left) / a.width) * 100, ((b.top + b.height * fy - a.top) / a.height) * 100];
    };
    const FLASH = [[13, 60], [24, 64], [33, 58], [72, 60], [88, 63], [94, 58], [18, 66], [80, 66], [29, 62], [69, 64]];
    function flash(i) {
      const [x, y] = FLASH[i % FLASH.length];
      const f = el(`<span class="sh-fl" style="left:${x}%;top:${y}%"><svg viewBox="-10 -10 20 20"><path d="${SPARK}" fill="#fff"/></svg></span>`);
      stage.appendChild(f);
      f.animate([{ opacity: 0, transform: 'scale(.2) rotate(0deg)' }, { opacity: 1, transform: 'scale(1.25) rotate(20deg)', offset: 0.3 }, { opacity: 0, transform: 'scale(.5) rotate(45deg)' }], { duration: 300, easing: 'ease-out' }).onfinish = () => f.remove();
      if (i % 3 === 0) { white.animate([{ opacity: 0 }, { opacity: 0.2 }, { opacity: 0 }], { duration: 200 }); play('camera'); }
    }
    let shown = 0;
    function flyStar(from, i, per) {
      const a = stage.getBoundingClientRect(), [tx, ty] = at(countPill.querySelector('svg'));
      const s = el(`<span class="sh-fly" style="left:${from[0]}%;top:${from[1]}%"><svg viewBox="-13 -13 26 26"><circle r="12.5" fill="#ffe27a" opacity=".35"/><path d="${STARD}" fill="#ffc83d" stroke="#e8932a" stroke-width="1.6" stroke-linejoin="round"/></svg></span>`);
      fx.appendChild(s);
      const dx = ((tx - from[0]) / 100) * a.width, dy = ((ty - from[1]) / 100) * a.height, bend = (i % 2 ? 1 : -1) * (30 + (i % 3) * 14);
      s.animate(
        [{ transform: 'translate(0,0) scale(.5) rotate(0deg)' }, { transform: `translate(${dx * 0.45 + bend}px,${dy * 0.55 - 26}px) scale(1.35) rotate(160deg)`, offset: 0.5 }, { transform: `translate(${dx}px,${dy}px) scale(.7) rotate(360deg)` }],
        { duration: 600, easing: 'cubic-bezier(.4,0,.5,1)', fill: 'forwards' }
      ).onfinish = () => {
        s.remove();
        if (!alive()) return;
        shown = Math.min(total, shown + per);
        countEl.textContent = Math.round(shown);
        countPill.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.16)' }, { transform: 'scale(1)' }], { duration: 170 });
        SFX.star(i);
      };
    }
    function confetti() {
      const C = ['#ffd54d', '#ff8fc0', '#7de3e0', '#b99cff', '#ffffff'], W = stage.clientWidth / 100;
      for (let i = 0; i < 28; i++) {
        const c = el(`<span class="sh-conf" style="left:${6 + Math.random() * 88}%;background:${C[i % 5]}"></span>`);
        fx.appendChild(c);
        c.animate([{ transform: 'translateY(0) rotate(0deg)', opacity: 1 }, { transform: `translate(${(Math.random() - 0.5) * 12 * W}px,${(52 + Math.random() * 26) * W}px) rotate(${360 + Math.random() * 540}deg)`, opacity: 0.9, offset: 0.85 }, { transform: `translate(0,${80 * W}px) rotate(900deg)`, opacity: 0 }],
          { duration: 1700 + Math.random() * 900, delay: Math.random() * 500, easing: 'cubic-bezier(.3,.4,.6,1)', fill: 'forwards' }).onfinish = () => c.remove();
      }
    }

    /* the last frame (also where a tap, reduced motion or an error lands) */
    function finish(keepFx) {
      if (finished) return;
      finished = true;
      stage.classList.add('sh-instant');
      stage.classList.remove('sh-dark', 'sh-far', 'sh-walking');
      stage.classList.add('sh-spots', 'sh-open');
      if (ok) stage.classList.add('sh-on-sign');
      judges.forEach((j) => { j.classList.remove('is-hop'); j.classList.add('is-up'); });
      countEl.textContent = total;
      if (!keepFx) fx.innerHTML = '';
      try { face(); DU.pose(actor, FINAL, 0); } catch (e) { console.error(e); }
      void stage.offsetWidth;
      stage.classList.remove('sh-instant');
      stage.classList.add('sh-done');
      setTimeout(() => stage.classList.add('sh-ready'), 380); // a skipping tap must not land on a button
      finishDone();
    }

    async function playOk() {
      stage.classList.add('sh-instant');
      stage.classList.remove('sh-spots', 'sh-open');
      stage.classList.add('sh-dark', 'sh-far');
      DU.pose(actor, 'rest', 0);
      void stage.offsetWidth;
      stage.classList.remove('sh-instant');
      await wait(250);
      stage.classList.add('sh-spots'); SFX.whoosh();
      await wait(450);
      stage.classList.add('sh-open');
      await wait(380);
      stage.classList.remove('sh-far', 'sh-dark'); stage.classList.add('sh-walking');
      for (let k = 0; k < 3; k++) {
        DU.pose(actor, k % 2 ? { armL: [-7, 6], armR: [12, 8] } : { armL: [12, 8], armR: [-7, 6] }, 300);
        SFX.step(k);
        await wait(340);
      }
      stage.classList.remove('sh-walking');
      await wait(90);
      DU.pose(actor, FINAL, 420); M.hop(actor, 30, 520); face('wink', 'big');
      SFX.chime();
      const [hx, hy] = at(actor, 0.5, 0.42);
      DU.fx.burst(fx, hx, hy, { count: 16, spread: 22, size: 3.6 });
      for (let i = 0; i < 9; i++) later(i * 125 + (i % 3) * 40, () => flash(i));
      later(1100, () => face());
      await wait(560);
      for (let i = 0; i < judges.length; i++) {
        judges[i].classList.add('is-up', 'is-hop');
        SFX.pop(i * 2);
        await wait(400);
      }
      await wait(150);
      const stars = judges.reduce((all, j) => all.concat([...j.querySelectorAll('.sh-card svg')]), []);
      const per = total / Math.max(1, stars.length);
      let k = 0;
      for (const s of stars) { flyStar(at(s), k++, per); await wait(50); }
      await wait(520);
      stage.classList.add('sh-on-sign');
      play('fanfare');
      await wait(380);
      DU.fx.burst(fx, 50, 8, { count: 18, spread: 26, size: 3.4 }); confetti();
      countEl.textContent = total;
      await wait(260);
      finish(true); // the confetti keeps falling over the last frame
    }

    async function playLow() {
      stage.classList.add('sh-instant');
      stage.classList.remove('sh-open');
      stage.classList.add('sh-far');
      DU.pose(actor, 'rest', 0);
      void stage.offsetWidth;
      stage.classList.remove('sh-instant');
      await wait(220);
      stage.classList.add('sh-open');
      await wait(350);
      stage.classList.remove('sh-far'); stage.classList.add('sh-walking');
      for (let k = 0; k < 3; k++) { DU.pose(actor, k % 2 ? { armL: [-5, 4], armR: [8, 6] } : { armL: [8, 6], armR: [-5, 4] }, 300); await wait(340); }
      stage.classList.remove('sh-walking');
      DU.pose(actor, FINAL, 480, M.ease.out);
      await wait(380);
      play('hmm');
      for (let i = 0; i < judges.length; i++) {
        judges[i].classList.add('is-up', 'is-hop');
        if (i) SFX.soft(i === 1 ? -2 : 3);
        await wait(520);
      }
      countEl.textContent = total;
      countPill.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 200 });
      await wait(300);
      finish();
    }

    function skip() { finish(); }
    host.addEventListener('click', () => { if (!finished) skip(); });

    if (reduced) finish();
    else (ok ? playOk() : playLow()).catch((e) => { if (e !== ABORT) console.error(e); if (host.isConnected) finish(); });

    /* "אני אוהבת אותה!" — she is saved after all */
    function loved() {
      if (ok || lovedDone) return;
      lovedDone = true;
      if (!finished) finish();
      stage.classList.remove('sh-ready');
      stage.classList.remove('sh-low'); stage.classList.add('sh-loved');
      stage.querySelector('.sh-plaque').innerHTML = `${heartSvg('', '#fff', '#ffd0e4')}<span>נשמרה בגלריה!</span>${heartSvg('', '#fff', '#ffd0e4')}`;
      stage.querySelector('.sh-note').innerHTML = 'כי את אוהבת אותה, וזה הכי חשוב.';
      stage.querySelector('.sh-btns').innerHTML = okButtons;
      const cheer = ['איזה כיף!', 'יש!', 'אוהבים אותה!'];
      judges.forEach((j, i) => {
        j.classList.remove('is-up', 'is-hop');
        j.querySelector('.sh-card').innerHTML = Array(3).fill(heartSvg()).join('');
        j.querySelector('.sh-bubble').textContent = cheer[i];
        setTimeout(() => { if (host.isConnected) { j.classList.add('is-up', 'is-hop'); SFX.pop(i * 2 + 3); } }, reduced ? 0 : 150 + i * 220);
      });
      stage.classList.add('sh-on-sign');
      try {
        DU.pose(actor, finalPose(state), 420);
        if (!reduced) {
          M.hop(actor, 30, 520); face('happy', 'big');
          setTimeout(() => { if (host.isConnected) face(); }, 1300);
          const [hx, hy] = at(actor, 0.5, 0.4);
          DU.fx.burst(fx, hx, hy, { shape: 'heart', count: 20, spread: 30, size: 4, colors: ['#ff5fa2', '#ff9ac1', '#ffffff', '#ffc1d9', '#e0437f'], ms: 1000 });
          setTimeout(() => { if (host.isConnected) DU.fx.burst(fx, 50, 8, { shape: 'heart', count: 12, spread: 22, size: 3.2, colors: ['#ff5fa2', '#ffffff', '#ffc1d9'] }); }, 380);
        }
      } catch (e) { console.error(e); }
      setTimeout(() => stage.classList.add('sh-ready'), 420);
    }

    return { done, skip, loved };
  }

  /* if anything in the show breaks, the player still gets her score and the buttons */
  function fallback(host, o) {
    const res = (o && o.res) || {}, ok = !!res.ok;
    host.innerHTML = `<div class="sh-fallback"><div class="sh-fb-total">${starSvg()}<span dir="ltr">${Math.round(res.total || 0)}</span></div>` +
      `<div class="sh-fb-text">${ok ? esc(res.praise || 'מקסימה!') : 'היא עוד לא מוכנה… היא לא תישמר בגלריה.'}</div><div class="sh-btns">${ok ? okButtons : lowButtons}</div></div>`;
    return {
      done: Promise.resolve(), skip() {},
      loved() { host.querySelector('.sh-fb-text').textContent = 'היא נשמרה בגלריה! כי את אוהבת אותה, וזה הכי חשוב.'; host.querySelector('.sh-btns').innerHTML = okButtons; },
    };
  }

  DU.show = {
    run(host, o) {
      let c;
      try { c = build(host, o || {}); } catch (e) { console.error('the show failed', e); c = fallback(host, o); }
      host._show = c;
      return { done: c.done, skip: c.skip };
    },
    loved(host) { if (host && host._show) host._show.loved(); },
  };
})();
