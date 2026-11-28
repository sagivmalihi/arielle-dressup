/* room.js — the home screen is her room.
   One illustration in a 1200×900 "scene" that is always fully visible (wall and floor bleed past it,
   so wider or taller screens just show more room), with real buttons laid over the things you can tap:
   wardrobe → new character · the girl → continue · wall of frames → gallery · window → shop · her bike → a ride (she picks where to) ·
   the tag on the bike → the bike workshop ·
   sticker book → album · gift box → a surprise · jar of stars → the points.
     DU.room.html(o)   o = { title, points, muted, hero, hasWip, gallery[≤5 states], gift, albumHave, albumTotal }
     DU.room.mount(root)
     DU.room.openGift(root, { stars }) → Promise */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const N = (v) => Math.round(v * 10) / 10;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ico = (name) => (DU.icon ? DU.icon(name) : '');
  const W = 1200, H = 900;
  /* a box in scene units → inline style in % of the scene */
  const box = (x, y, w, h) => `left:${N(x / 12)}%;top:${N(y / 9)}%;width:${N(w / 12)}%;height:${N(h / 9)}%`;
  const at = (x, y) => `left:${N(x / 12)}%;top:${N(y / 9)}%`;
  /* a point inside a button, in scene units from the button's corner */
  const off = (dx, dy, rot) => `left:calc(var(--su) * ${dx});top:calc(var(--su) * ${dy})${rot ? `;--rot:${rot}deg` : ''}`;

  /* one catalog item drawn by itself (no girl), in rig coordinates */
  const LAYER = { wings: 'back', socks: 'socks', shoes: 'shoes', bottom: 'body', top: 'body', dress: 'body', bracelet: 'wrist', bag: 'held', hand: 'held', necklace: 'over', earrings: 'head', glasses: 'head', hairacc: 'head', hat: 'head', side: 'front' };
  function itemAlone(id, color) {
    const it = DU.itemById[id];
    if (!it) return '';
    const R = DU.rig({ h: 0, m: 0 }), uid = DU.uid('rmi'), defs = [];
    let idc = 0;
    const ctx = {
      uid, R, sk: DU.skinPaint('#ffe3d1'), tucked: false, hasBottom: false, defs,
      state: { wear: { [it.slot]: { id } }, body: { h: 0, m: 0 }, tuck: true },
      id: (nm = 'i') => `${uid}${nm}${idc++}`,
      paint(spec, b) { const P = DU.paint(spec, ctx.id('p'), b || [R.cx - 130, R.sY - 20, 260, R.ground - R.sY]); if (P.defs) defs.push(P.defs); return P; },
    };
    const isHead = ['earrings', 'glasses', 'hairacc', 'hat'].includes(it.slot);
    const P = ctx.paint(it.fixed ? it.color : color || it.color || '#ff9ac1', isHead ? [-110, -200, 220, 330] : null);
    let out;
    try { out = it.draw(R, P, ctx); } catch (e) { out = ''; }
    if (typeof out === 'string') out = { [LAYER[it.slot]]: out };
    out = out || {};
    let s = '';
    ['back', 'socks', 'shoes', 'body', 'sleeves', 'wrist', 'held', 'over', 'front'].forEach((k) => (s += out[k] || ''));
    return `<g stroke-linejoin="round" stroke-linecap="round" fill="none"><defs>${defs.join('')}</defs>${s}</g>`;
  }
  const star5 = (x, y, r, rot = -90) => DU.starD(x, y, r, 5, 0.5, rot);

  /* where the five frames hang (scene units) */
  const FRAMES = [
    { x: 600, y: 128, w: 90, h: 120, c: '#ff9ec4', l: '#e0679d', r: -2.5 },
    { x: 702, y: 114, w: 108, h: 144, c: '#ffd060', l: '#d9a030', r: 1.2 },
    { x: 822, y: 130, w: 78, h: 104, c: '#9fe3d0', l: '#5fbfa6', r: 3 },
    { x: 608, y: 264, w: 74, h: 99, c: '#c9b3ff', l: '#9a86d8', r: 2 },
    { x: 696, y: 272, w: 72, h: 96, c: '#ffffff', l: '#e7bfd2', r: -1.6 },
  ];

  /* ---------------- the illustration ---------------- */
  function roomSvg(u, o) {
    let d = `<defs>
      <linearGradient id="${u}w" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="654"><stop offset="0" stop-color="#ffe6ee"/><stop offset="1" stop-color="#f8cbe0"/></linearGradient>
      <pattern id="${u}wp" width="72" height="72" patternUnits="userSpaceOnUse"><path d="${DU.sparkleD(18, 20, 6)}" fill="#fff" fill-opacity=".55"/><circle cx="54" cy="52" r="2.6" fill="#fff" fill-opacity=".55"/><circle cx="56" cy="14" r="1.6" fill="#fff" fill-opacity=".4"/></pattern>
      <linearGradient id="${u}f" gradientUnits="userSpaceOnUse" x1="0" y1="652" x2="0" y2="900"><stop offset="0" stop-color="#f9dcc0"/><stop offset="1" stop-color="#eebd98"/></linearGradient>
      <linearGradient id="${u}lb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe6" stop-opacity=".78"/><stop offset="1" stop-color="#fffbe6" stop-opacity="0"/></linearGradient>
      <radialGradient id="${u}gl"><stop offset="0" stop-color="#fff9df" stop-opacity=".85"/><stop offset=".55" stop-color="#fff9df" stop-opacity=".3"/><stop offset="1" stop-color="#fff9df" stop-opacity="0"/></radialGradient>
      <radialGradient id="${u}sh"><stop offset="0" stop-color="#5a2d6e" stop-opacity=".38"/><stop offset="1" stop-color="#5a2d6e" stop-opacity="0"/></radialGradient>
      <linearGradient id="${u}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fd9ff"/><stop offset=".7" stop-color="#d9f1ff"/><stop offset="1" stop-color="#ffe9d6"/></linearGradient>
      <linearGradient id="${u}in" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#46306b"/><stop offset="1" stop-color="#6d5099"/></linearGradient>
      <linearGradient id="${u}mi" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4fbff"/><stop offset=".5" stop-color="#cfe9ff"/><stop offset="1" stop-color="#e3dcff"/></linearGradient>
      <linearGradient id="${u}jar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff" stop-opacity=".9"/><stop offset=".35" stop-color="#e6f4ff" stop-opacity=".55"/><stop offset="1" stop-color="#d3e6ff" stop-opacity=".75"/></linearGradient>
      <radialGradient id="${u}bg"><stop offset="0" stop-color="#fff6c4" stop-opacity=".95"/><stop offset="1" stop-color="#fff6c4" stop-opacity="0"/></radialGradient>
      <linearGradient id="${u}bk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b79bff"/><stop offset="1" stop-color="#8f74ea"/></linearGradient>
      <clipPath id="${u}wc"><path d="M287 430V240A113 113 0 0 1 513 240V430Z"/></clipPath>
      <clipPath id="${u}mc"><circle cx="400" cy="498" r="46"/></clipPath>
    </defs>`;

    /* ---------------- wall + floor (they bleed far past the scene) ---------------- */
    let s = `<rect x="-1500" y="-1200" width="4200" height="1854" fill="url(#${u}w)"/><rect x="-1512" y="-1188" width="4248" height="1724" fill="url(#${u}wp)"/>`;
    s += `<ellipse cx="400" cy="300" rx="350" ry="330" fill="url(#${u}gl)"/>`;
    s += `<rect x="-1500" y="540" width="4200" height="114" fill="#fff4f0"/>`;
    for (let x = 18 - 148 * 10; x < 2700; x += 148) s += `<rect x="${x}" y="562" width="128" height="62" rx="9" fill="#fffaf8" stroke="#f4d6e0" stroke-width="3"/>`;
    s += `<rect x="-1500" y="530" width="4200" height="13" fill="#fff"/><rect x="-1500" y="543" width="4200" height="4" fill="#e9bfd2" opacity=".7"/>`;
    s += `<rect x="-1500" y="636" width="4200" height="18" fill="#f5d5e3"/><rect x="-1500" y="652" width="4200" height="1300" fill="url(#${u}f)"/><rect x="-1500" y="652" width="4200" height="5" fill="#c98f6e" opacity=".35"/>`;
    let pl = '';
    for (let xb = -3900; xb <= 5100; xb += 150) pl += `M${N(600 + ((xb - 600) * (652 - 330)) / (900 - 330))} 652L${N(600 + ((xb - 600) * (1900 - 330)) / (900 - 330))} 1900`;
    s += `<path d="${pl}" fill="none" stroke="#dba882" stroke-width="2.5" opacity=".75"/>`;
    s += `<path d="M120 712h70M330 760h90M840 716h80M980 790h110M40 830h90M690 868h100M1010 868h70M-260 760h90M1320 740h90M-120 880h110M1290 860h80M260 960h110M700 1010h120M-40 1060h100M1040 1040h110M420 1130h130" fill="none" stroke="#dba882" stroke-width="2.5" opacity=".6"/>`;

    /* ---------------- door + shelf with the jar of stars ---------------- */
    s += `<rect x="20" y="194" width="164" height="460" rx="12" fill="#fff"/>`;
    s += `<rect x="33" y="207" width="138" height="447" rx="7" fill="#ffeaf1" stroke="#ecc4d6" stroke-width="3"/>`;
    s += `<rect x="48" y="330" width="108" height="128" rx="9" fill="#fff5f8" stroke="#f2cfdc" stroke-width="3"/><rect x="48" y="474" width="108" height="156" rx="9" fill="#fff5f8" stroke="#f2cfdc" stroke-width="3"/>`;
    s += `<path d="${DU.heartD(102, 262, 25)}" fill="#cdeaff" stroke="#fff" stroke-width="5"/><path d="M88 258q6 -9 14 -2" fill="none" stroke="#fff" stroke-width="3" stroke-opacity=".8"/>`;
    s += `<circle cx="155" cy="470" r="9" fill="#ffd060" stroke="#d9a030" stroke-width="2.5"/><circle cx="152" cy="467" r="3" fill="#fff" fill-opacity=".8"/>`;
    s += `<path d="M40 182v20M168 182v20" stroke="#e7bfd2" stroke-width="5"/><rect x="10" y="172" width="190" height="12" rx="6" fill="#fff" stroke="#e7bfd2" stroke-width="2.5"/>`;
    let jar = `<g transform="translate(92 172) scale(1.2) translate(-92 -172)"><ellipse class="room-glow" cx="92" cy="122" rx="80" ry="74" fill="url(#${u}bg)"/>`;
    jar += `<g class="room-jar"><rect x="60" y="90" width="64" height="82" rx="17" fill="url(#${u}jar)" stroke="#a9bdea" stroke-width="2.6"/>`;
    [[76, 158, 10, -80], [94, 160, 11, -100], [111, 157, 9, -70], [84, 144, 10, -95], [103, 143, 10, -60], [92, 128, 9, -90], [74, 131, 7, -75], [110, 127, 7, -100]]
      .forEach(([x, y, r, rot], i) => (jar += `<path class="room-jstar" style="animation-delay:${-i * 0.37}s" d="${star5(x, y, r, rot)}" fill="${i % 3 === 1 ? '#ffe08a' : '#ffcc45'}" stroke="#e5a12a" stroke-width="1.6" stroke-linejoin="round"/>`));
    jar += `<path d="M69 102q-3 26 0 54" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-opacity=".9"/>`;
    jar += `<rect x="71" y="80" width="42" height="12" fill="#e9f3ff" stroke="#a9bdea" stroke-width="2.4"/><rect x="66" y="66" width="52" height="16" rx="6" fill="#ff9ec4" stroke="#e0679d" stroke-width="2.4"/></g></g>`;

    /* ---------------- window with the boutique street ---------------- */
    let v = `<rect x="280" y="110" width="240" height="330" fill="url(#${u}sky)"/><circle cx="462" cy="186" r="64" fill="url(#${u}bg)"/><circle cx="462" cy="186" r="22" fill="#fff6c4"/>`;
    v += `<g class="room-cloud" fill="#fff"><ellipse cx="330" cy="196" rx="30" ry="12"/><circle cx="318" cy="190" r="12"/><circle cx="336" cy="184" r="15"/></g>`;
    v += `<path d="M280 430V350h28v-22h30v30h26v-44h34v50h110V430Z" fill="#e6dcf6"/>`;
    v += `<circle cx="312" cy="356" r="30" fill="#9fe0bd"/><circle cx="322" cy="344" r="16" fill="#b9ecd0"/><rect x="308" y="380" width="8" height="46" rx="3" fill="#b98f72"/>`;
    v += `<rect x="342" y="296" width="150" height="134" fill="#fff6f9"/><rect x="334" y="284" width="166" height="16" rx="5" fill="#c4adf7"/>`;
    v += `<circle cx="417" cy="270" r="19" fill="#fff" stroke="#ff9ec4" stroke-width="4"/><path d="${DU.heartD(417, 264, 10)}" fill="#ff7aae"/>`;
    for (let i = 0; i < 7; i++) v += `<path d="M${340 + i * 22} 300h22v26a11 11 0 0 1 -22 0Z" fill="${i % 2 ? '#fff' : '#ff9ec4'}"/>`;
    v += `<rect x="352" y="350" width="60" height="62" rx="5" fill="#d6f0ff" stroke="#fff" stroke-width="4"/>`;
    v += `<path d="M382 362l-9 10l5 6l-8 28h24l-8 -28l5 -6Z" fill="#ff8fbd"/><path d="M382 356v6" stroke="#b98f72" stroke-width="2.5"/>`;
    v += `<rect x="428" y="352" width="46" height="78" rx="5" fill="#ff9ec4"/><rect x="436" y="360" width="30" height="30" rx="15" fill="#ffe3ef"/><circle cx="467" cy="398" r="3" fill="#fff"/>`;
    v += `<rect x="280" y="418" width="240" height="14" fill="#efe2f4"/>`;
    v += `<path d="M300 110L380 110L310 300L280 300Z M430 110L462 110L372 440L340 440Z" fill="#fff" fill-opacity=".2"/>`;
    s += `<g clip-path="url(#${u}wc)">${v}</g>`;
    s += `<path d="M400 128V430M287 244H513" stroke="#fff" stroke-width="9"/>`;
    s += `<path d="M287 430V240A113 113 0 0 1 513 240V430Z" fill="none" stroke="#fff" stroke-width="15"/><path d="M279 432V240A121 121 0 0 1 521 240V432" fill="none" stroke="#ecc4d6" stroke-width="2"/>`;
    s += `<rect x="264" y="428" width="272" height="17" rx="7" fill="#fff"/><rect x="270" y="445" width="260" height="5" fill="#d9a9c2" opacity=".5"/>`;
    s += `<path d="M492 424l3 -34M504 424l1 -40M514 424l-4 -30" stroke="#7ccb9c" stroke-width="3"/><path d="M488 392q6 -14 12 0q-6 8 -12 0ZM505 394q6 -14 12 0q-6 8 -12 0Z" fill="#ff7aae"/><path d="M498 384q7 -15 13 0q-6 8 -13 0Z" fill="#ffd060"/><path d="M486 408h34l-5 22h-24Z" fill="#b9a4f0"/><rect x="484" y="404" width="38" height="8" rx="4" fill="#cfbff7"/>`;
    const curtain = `<path d="M246 104H332Q330 206 302 284Q286 326 288 344Q304 398 298 466H246Z" fill="#d8f6ec"/>` +
      `<path d="M262 106Q262 240 268 330M284 106Q288 220 276 300M308 106Q306 190 288 276M262 360Q268 420 264 462M280 356Q286 410 282 464" fill="none" stroke="#a6e0cd" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M246 104H332Q330 206 302 284Q286 326 288 344Q304 398 298 466" fill="none" stroke="#9dd8c4" stroke-width="2.5"/><rect x="246" y="334" width="48" height="13" rx="6.5" fill="#ff9ec4"/>`;
    s += `<g class="room-curtain">${curtain}</g><g transform="matrix(-1 0 0 1 800 0)"><g class="room-curtain room-c2">${curtain}</g></g>`;
    s += `<path d="M232 104H568" stroke="#e9b96b" stroke-width="7" stroke-linecap="round"/><circle cx="232" cy="104" r="9" fill="#ffd060" stroke="#d9a030" stroke-width="2"/><circle cx="568" cy="104" r="9" fill="#ffd060" stroke="#d9a030" stroke-width="2"/>`;

    /* ---------------- rug + light on the floor ---------------- */
    s += `<ellipse cx="610" cy="812" rx="336" ry="78" fill="#f4a8c9"/><ellipse cx="610" cy="806" rx="336" ry="78" fill="#ffc6de"/>`;
    s += `<ellipse cx="610" cy="806" rx="304" ry="65" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="1 15" stroke-linecap="round"/><ellipse cx="610" cy="806" rx="246" ry="48" fill="#ffdcea"/>`;
    [[452, 808, 12], [690, 820, 10], [840, 800, 12], [384, 790, 8]].forEach(([x, y, r]) => (s += `<path d="${DU.sparkleD(x, y, r)}" fill="#fff" fill-opacity=".85"/>`));
    s += `<path d="M300 652L408 652L640 900L452 900Z" fill="url(#${u}lb)"/><path d="M430 652L540 652L940 900L690 900Z" fill="url(#${u}lb)"/>`;

    /* ---------------- vanity ---------------- */
    s += `<ellipse cx="400" cy="700" rx="120" ry="13" fill="url(#${u}sh)"/>`;
    s += `<path d="M324 610L318 694M476 610L482 694" stroke="#f0c8d8" stroke-width="9" stroke-linecap="round"/>`;
    s += `<rect x="314" y="578" width="172" height="36" rx="8" fill="#ffeaf1" stroke="#ecc4d6" stroke-width="2.5"/><path d="${DU.heartD(400, 590, 8)}" fill="#ffd060" stroke="#d9a030" stroke-width="1.6"/>`;
    s += `<path d="M400 566V540" stroke="#ffd060" stroke-width="7"/><circle cx="400" cy="498" r="52" fill="#ffd060" stroke="#d9a030" stroke-width="2.5"/><circle cx="400" cy="498" r="46" fill="url(#${u}mi)"/>`;
    s += `<g clip-path="url(#${u}mc)"><path d="M352 520L404 446H424L372 520ZM392 548L440 480H450L402 548Z" fill="#fff" fill-opacity=".75"/></g>`;
    s += DU.bow(400, 446, 0.62 * 30, '#ff9ec4', '#e0679d');
    s += `<rect x="304" y="564" width="192" height="15" rx="7.5" fill="#fff" stroke="#ecc4d6" stroke-width="2.5"/>`;
    s += `<rect x="326" y="536" width="24" height="28" rx="7" fill="#c9b3ff" stroke="#9a86d8" stroke-width="2"/><rect x="333" y="526" width="10" height="11" rx="2" fill="#ffd060" stroke="#d9a030" stroke-width="1.6"/><circle cx="338" cy="550" r="4" fill="#fff" fill-opacity=".7"/>`;
    s += `<rect x="358" y="548" width="10" height="16" rx="2" fill="#ffd060" stroke="#d9a030" stroke-width="1.6"/><path d="M359.5 548v-8l7 -4v12Z" fill="#ff5f9e"/>`;
    s += `<rect x="440" y="540" width="38" height="24" rx="6" fill="#ff9ec4" stroke="#e0679d" stroke-width="2"/><path d="M440 549h38" stroke="#e0679d" stroke-width="2"/><path d="${DU.heartD(459, 546, 5)}" fill="#fff"/>`;
    s += `<ellipse cx="400" cy="744" rx="58" ry="10" fill="url(#${u}sh)"/><path d="M356 700Q352 738 366 742H434Q448 738 444 700Z" fill="#ff8fbd" stroke="#e0679d" stroke-width="2.5"/><ellipse cx="400" cy="700" rx="44" ry="13" fill="#ffb3d3" stroke="#e0679d" stroke-width="2.5"/><path d="M372 716v20M400 718v22M428 716v20" stroke="#e0679d" stroke-width="2" stroke-opacity=".5"/>`;

    /* ---------------- gallery wall: her real characters ---------------- */
    s += `<g class="room-frames">`;
    FRAMES.forEach((f, i) => {
      const st = o.gallery && o.gallery[i];
      let pic;
      if (st) {
        try { pic = DU.renderCard(st, { par: 'xMidYMid slice' }).replace('<svg ', `<svg x="${f.x + 8}" y="${f.y + 8}" width="${f.w - 16}" height="${f.h - 16}" `); } catch (e) { pic = ''; }
      }
      if (!pic) { // an empty frame: a soft silhouette waiting for a girl
        const cx = f.x + f.w / 2, cy = f.y + f.h / 2, k = f.w / 90;
        pic = `<rect x="${f.x + 8}" y="${f.y + 8}" width="${f.w - 16}" height="${f.h - 16}" fill="#fbeef6"/>` +
          `<circle cx="${cx}" cy="${N(cy - 10 * k)}" r="${N(15 * k)}" fill="#efd9ee"/><path d="M${N(cx - 24 * k)} ${N(f.y + f.h - 8)}q0 -${N(30 * k)} ${N(24 * k)} -${N(30 * k)}q${N(24 * k)} 0 ${N(24 * k)} ${N(30 * k)}Z" fill="#efd9ee"/>` +
          `<path d="${DU.sparkleD(cx + 20 * k, cy - 30 * k, 6 * k)}" fill="#fff"/>`;
      }
      const cx = f.x + f.w / 2;
      s += `<g transform="rotate(${f.r} ${cx} ${f.y})"><g class="room-frame" style="animation-delay:${i * 0.06}s">` +
        `<path d="M${cx - 16} ${f.y + 2}L${cx} ${f.y - 14}L${cx + 16} ${f.y + 2}" fill="none" stroke="#c9a57f" stroke-width="2"/><circle cx="${cx}" cy="${f.y - 14}" r="3.5" fill="#d9a030"/>` +
        `<rect x="${f.x + 5}" y="${f.y + 8}" width="${f.w}" height="${f.h}" rx="7" fill="#7a3c9a" opacity=".16"/>` +
        `<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" rx="7" fill="${f.c}" stroke="${f.l}" stroke-width="2.5"/>` +
        `<rect x="${f.x + 5}" y="${f.y + 5}" width="${f.w - 10}" height="${f.h - 10}" rx="3" fill="#fff"/>${pic}` +
        `<path d="M${f.x + 8} ${f.y + 8}h${N((f.w - 16) * 0.5)}l${N(-(f.w - 16) * 0.34)} ${f.h - 16}h${N(-(f.w - 16) * 0.16)}Z" fill="#fff" fill-opacity=".16"/>` +
        `</g></g>`;
    });
    // an embroidery hoop with a heart
    s += `<g transform="rotate(4 866 252)"><g class="room-frame" style="animation-delay:.3s"><circle cx="869" cy="282" r="25" fill="#7a3c9a" opacity=".14"/><circle cx="866" cy="278" r="25" fill="#fffaf2" stroke="#e9b96b" stroke-width="5"/><rect x="860" y="248" width="12" height="8" rx="3" fill="#d9a030"/>` +
      `<path d="${DU.heartD(866, 272, 12)}" fill="#ff8fbd"/></g></g>`;
    s += `</g>`;

    /* ---------------- shelf with the sticker album ---------------- */
    s += `<path d="M712 520v22M884 520v22" stroke="#e7bfd2" stroke-width="5" stroke-linecap="round"/><rect x="684" y="510" width="226" height="13" rx="6.5" fill="#fff" stroke="#e7bfd2" stroke-width="2.5"/><rect x="690" y="523" width="214" height="4" fill="#d9a9c2" opacity=".45"/>`;
    s += `<g class="room-book"><path d="M700 404h86q10 0 10 10v96h-96Z" fill="#7a3c9a" opacity=".16" transform="translate(5 4)"/>` +
      `<path d="M708 510h90v-10h-90Z" fill="#fffaf2" stroke="#9a86d8" stroke-width="2.4" stroke-linejoin="round"/>` +
      `<path d="M700 404h88q8 0 8 8v92h-88q-8 0 -8 8Z" fill="url(#${u}bk)" stroke="#6a4fd0" stroke-width="2.6" stroke-linejoin="round"/>` +
      `<path d="M712 404v100" stroke="#6a4fd0" stroke-width="2.4" stroke-opacity=".6"/>` +
      `<rect x="722" y="416" width="64" height="24" rx="6" fill="#fff" fill-opacity=".92"/><path d="M730 428h48" stroke="#b99cff" stroke-width="4" stroke-linecap="round"/>` +
      `<path d="${star5(740, 464, 13)}" fill="#ffcc45" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><path d="${DU.heartD(770, 462, 10)}" fill="#ff7aae" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>` +
      `<g transform="translate(752 488)">${DU.flower(0, 0, 10, '#9fe3d0', '#ffd060', 5)}</g><circle cx="778" cy="488" r="7" fill="#7de3e0" stroke="#fff" stroke-width="3"/>` +
      `<path d="M790 404v40l7 -6l7 6v-36q0 -4 -4 -4Z" fill="#ff8fbd" stroke="#e0679d" stroke-width="2" stroke-linejoin="round"/></g>`;
    // a cup of pencils next to it
    s += `<path d="M838 472l4 -30M848 472l0 -36M858 472l-3 -32" stroke-width="6" stroke-linecap="round" fill="none" stroke="#ffd060"/><path d="M842 442l1 -8M848 436v-8M855 440l-1 -8" stroke="#ff7aae" stroke-width="6" stroke-linecap="round"/>` +
      `<path d="M830 470h36l-4 40h-28Z" fill="#ffd9ea" stroke="#e79ac0" stroke-width="2.4" stroke-linejoin="round"/><path d="${DU.heartD(848, 488, 7)}" fill="#ff8fbd"/>`;

    /* ---------------- wardrobe ---------------- */
    s += `<rect x="906" y="180" width="282" height="530" rx="18" fill="#7a3c9a" opacity=".12"/><ellipse cx="1052" cy="712" rx="170" ry="15" fill="url(#${u}sh)"/>`;
    s += `<rect x="938" y="688" width="20" height="26" rx="6" fill="#cdbbf2" stroke="#9a8cc8" stroke-width="2.5"/><rect x="1147" y="688" width="20" height="26" rx="6" fill="#cdbbf2" stroke="#9a8cc8" stroke-width="2.5"/>`;
    s += `<rect x="1092" y="120" width="70" height="46" rx="8" fill="#ffd9ea" stroke="#e79ac0" stroke-width="2.5"/><path d="M1106 122v42M1122 122v42M1138 122v42" stroke="#ff9ec4" stroke-width="5" stroke-opacity=".7"/><rect x="1086" y="112" width="82" height="16" rx="7" fill="#ffb3d3" stroke="#e0679d" stroke-width="2.5"/>`;
    s += `<ellipse cx="994" cy="152" rx="56" ry="13" fill="#ffe3a8" stroke="#dcae5e" stroke-width="2.5"/><path d="M964 150Q966 112 994 112Q1022 112 1024 150Z" fill="#ffecc2" stroke="#dcae5e" stroke-width="2.5"/><path d="M965 141Q994 150 1023 141L1024 150Q994 158 964 150Z" fill="#ff8fbd"/>`;
    s += `<rect x="920" y="168" width="264" height="528" rx="18" fill="#f1e8ff" stroke="#9a8cc8" stroke-width="3"/><rect x="922" y="170" width="20" height="524" rx="10" fill="#7a3c9a" opacity=".07"/>`;
    s += `<path d="M908 180Q1052 122 1196 180L1190 198H914Z" fill="#e4d8fb" stroke="#9a8cc8" stroke-width="3" stroke-linejoin="round"/><path d="${DU.heartD(1052, 158, 11)}" fill="#ff9ec4" stroke="#e0679d" stroke-width="2"/>`;
    s += `<rect x="938" y="206" width="228" height="368" rx="7" fill="url(#${u}in)"/><path d="M944 232H1160" stroke="#d9c9f7" stroke-width="5" stroke-linecap="round"/>`;
    let clothes = '';
    [['dr_sun', 972, null], ['dr_sailor', 1024, null], ['dr_party', 1077, '#ff6f91'], ['dr_fairy', 1130, null]].forEach(([id, hx, c]) => {
      clothes += `<path d="M${hx} 232v8M${hx - 22} 256L${hx} 242L${hx + 22} 256" fill="none" stroke="#e9b96b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<g transform="translate(${hx} 252) scale(.44) translate(-375 -452)">${itemAlone(id, c)}</g>`;
    });
    s += `<g class="room-clothes">${clothes}</g>`;
    s += `<rect x="938" y="528" width="228" height="46" fill="#3a2759" opacity=".5"/>`;
    s += `<g transform="translate(990 552) scale(.8) translate(-375 -940)">${itemAlone('sh_maryjane', '#ff6f91')}</g><g transform="translate(1112 552) scale(.8) translate(-375 -940)">${itemAlone('sh_sneakers', '#7de3e0')}</g>`;
    s += `<rect x="938" y="586" width="228" height="92" rx="10" fill="#e7dbfb" stroke="#9a8cc8" stroke-width="2.5"/><circle cx="966" cy="632" r="7" fill="#ffd060" stroke="#d9a030" stroke-width="2"/><circle cx="1138" cy="632" r="7" fill="#ffd060" stroke="#d9a030" stroke-width="2"/>`;
    s += `<path d="M1112 586q-2 20 6 34q8 10 4 24" fill="none" stroke="#ff8fbd" stroke-width="13" stroke-linecap="round"/><path d="M1112 596l11 -3M1116 612l11 -5M1122 628l11 -3" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`;
    const door = (mirror) =>
      `<rect x="0" y="0" width="114" height="368" rx="7" fill="#f9f4ff" stroke="#9a8cc8" stroke-width="2.6"/><rect x="12" y="14" width="90" height="340" rx="9" fill="none" stroke="#dccdf5" stroke-width="2.6"/>` +
      (mirror
        ? `<ellipse cx="57" cy="150" rx="29" ry="78" fill="url(#${u}mi)" stroke="#ffd060" stroke-width="4"/><path d="M40 120q8 -34 26 -40" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-opacity=".9"/><path d="${DU.sparkleD(72, 196, 8)}" fill="#fff"/>`
        : `<path d="${DU.heartD(57, 96, 20)}" fill="#ffc6de" stroke="#f29cc2" stroke-width="2.4"/><path d="${DU.heartD(57, 286, 11)}" fill="#e2d5fb"/><path d="${DU.sparkleD(40, 200, 7)}" fill="#e2d5fb"/>`) +
      `<circle cx="99" cy="190" r="6.5" fill="#ffd060" stroke="#d9a030" stroke-width="2"/>`;
    s += `<g transform="translate(938 206)"><g class="room-dl">${door(false)}</g></g>`;
    s += `<g transform="translate(1166 206) scale(-1 1)"><g class="room-dr">${door(true)}</g></g>`;

    /* ---------------- plant ---------------- */
    s += `<ellipse cx="884" cy="712" rx="52" ry="9" fill="url(#${u}sh)"/>`;
    const leaf = (x, y, len, w, rot, c) => `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M0 0Q${-w} ${-len * 0.55} 0 ${-len}Q${w} ${-len * 0.55} 0 0Z" fill="${c}"/><path d="M0 -4V${-len * 0.86}" stroke="#4fae7f" stroke-width="2" stroke-opacity=".6"/></g>`;
    s += `<g class="room-plant">` + leaf(884, 664, 118, 26, -34, '#7fd0a2') + leaf(884, 664, 130, 28, 28, '#6cc494') + leaf(884, 664, 96, 24, -62, '#9fe0bd') + leaf(884, 664, 100, 24, 58, '#8fd9b0') + leaf(884, 664, 140, 26, -6, '#8fd9b0') + `</g>`;
    s += `<path d="M854 656h60l-8 52h-44Z" fill="#fff" stroke="#c4adf7" stroke-width="2.5" stroke-linejoin="round"/><path d="M857 674l9 -8l9 8l9 -8l9 8l9 -8l8 8" fill="none" stroke="#ff9ec4" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><rect x="850" y="650" width="68" height="11" rx="5.5" fill="#f1e8ff" stroke="#c4adf7" stroke-width="2.5"/>`;

    /* ---------------- sleeping cat ---------------- */
    s += `<ellipse cx="800" cy="826" rx="62" ry="9" fill="url(#${u}sh)"/><g class="room-cat">`;
    s += `<path d="M846 812q26 -6 22 -24q-3 -10 -12 -6" fill="none" stroke="#f1dcc6" stroke-width="11" stroke-linecap="round"/><ellipse cx="806" cy="804" rx="50" ry="23" fill="#fffaf2" stroke="#dcbfa8" stroke-width="2.5"/><path d="M800 783q22 -4 40 8q-18 -2 -40 -8Z" fill="#ffd3a6"/>`;
    s += `<path d="M752 780l2 -20l15 12ZM788 776l6 -19l9 17Z" fill="#fffaf2" stroke="#dcbfa8" stroke-width="2.5" stroke-linejoin="round"/><path d="M790 774l4 -12l5 10Z" fill="#ffc6de"/><circle cx="774" cy="794" r="22" fill="#fffaf2" stroke="#dcbfa8" stroke-width="2.5"/><path d="M760 778q10 -6 20 -2q-8 6 -20 2Z" fill="#ffd3a6"/>`;
    s += `<path d="M762 796q5 4 9 0M778 796q5 4 9 0" fill="none" stroke="#8a6a5a" stroke-width="2.2" stroke-linecap="round"/><path d="M772 802l3 2.5l3 -2.5Z" fill="#ff8fa8"/><circle cx="760" cy="804" r="4" fill="#ffc6de" fill-opacity=".8"/><circle cx="790" cy="804" r="4" fill="#ffc6de" fill-opacity=".8"/></g>`;

    /* ---------------- the gift by the door ---------------- */
    s += `<ellipse cx="108" cy="676" rx="92" ry="15" fill="#c4adf7"/><ellipse cx="108" cy="675" rx="74" ry="10" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="1 10" stroke-linecap="round"/>`;
    if (o.gift) {
      s += `<g class="room-giftart"><ellipse cx="172" cy="800" rx="82" ry="13" fill="url(#${u}sh)"/>`;
      s += `<g transform="translate(172 742)"><g class="room-rays">` + Array.from({ length: 10 }, (_, i) => `<path d="M0 0L-13 -150L13 -150Z" fill="#fff3b0" fill-opacity=".75" transform="rotate(${i * 36})"/>`).join('') + `</g></g>`;
      s += `<g class="room-present"><g class="room-box"><rect x="118" y="722" width="108" height="76" rx="9" fill="#ff8fbd" stroke="#e0679d" stroke-width="2.6"/>`;
      [[136, 742], [208, 744], [140, 778], [204, 780], [150, 760], [196, 762]].forEach(([x, y]) => (s += `<circle cx="${x}" cy="${y}" r="4.5" fill="#fff" fill-opacity=".8"/>`));
      s += `<rect x="163" y="722" width="18" height="76" fill="#ffd060" stroke="#d9a030" stroke-width="2"/><rect x="118" y="722" width="20" height="76" rx="9" fill="#7a3c9a" opacity=".1"/></g>`;
      s += `<g class="room-lid"><rect x="110" y="698" width="124" height="28" rx="9" fill="#ff7aae" stroke="#e0679d" stroke-width="2.6"/><rect x="163" y="698" width="18" height="28" fill="#ffd060" stroke="#d9a030" stroke-width="2"/>` +
        `<path d="M172 696C158 670 132 672 136 688C138 698 158 698 172 696ZM172 696C186 670 212 672 208 688C206 698 186 698 172 696Z" fill="#ffd060" stroke="#d9a030" stroke-width="2.4" stroke-linejoin="round"/><circle cx="172" cy="695" r="7" fill="#ffe08a" stroke="#d9a030" stroke-width="2.2"/></g></g>`;
      s += `<path class="room-spark" style="animation-delay:-.6s" d="${DU.sparkleD(238, 716, 9)}" fill="#fff"/><path class="room-spark" style="animation-delay:-1.7s" d="${DU.sparkleD(112, 742, 7)}" fill="#fff"/></g>`;
    }

    /* ---------------- her shadow on the rug (she herself is laid over the picture) ---------------- */
    s += `<ellipse cx="560" cy="842" rx="78" ry="13" fill="url(#${u}sh)"/>`;

    /* ---------------- string lights: two garlands that leave room for the title ---------------- */
    const spans = [
      [-620, 30, -470, 100, -320, 34, 5], [-320, 34, -170, 100, -20, 26, 5], [-20, 26, 110, 100, 240, 40, 5], [240, 40, 334, 96, 404, 10, 4],
      [796, 10, 866, 96, 960, 40, 4], [960, 40, 1090, 100, 1220, 26, 5], [1220, 26, 1370, 100, 1520, 34, 5], [1520, 34, 1670, 100, 1820, 30, 5],
    ];
    let wire = '', bulbs = '';
    const cols = ['#ffd76a', '#ff9ec4', '#9fe3d0', '#c9b3ff'];
    let bi = 0;
    spans.forEach(([x0, y0, cx, cy, x1, y1, cnt], si) => {
      wire += `M${x0} ${y0}Q${cx} ${cy} ${x1} ${y1}`;
      for (let j = 0; j < cnt; j++) {
        const t = (j + 0.5) / cnt, x = (1 - t) * (1 - t) * x0 + 2 * t * (1 - t) * cx + t * t * x1, y = (1 - t) * (1 - t) * y0 + 2 * t * (1 - t) * cy + t * t * y1;
        bulbs += `<circle class="room-bglow" style="animation-delay:${N(-((bi * 0.53) % 3))}s" cx="${N(x)}" cy="${N(y + 13)}" r="26" fill="url(#${u}bg)"/><rect x="${N(x - 3.5)}" y="${N(y)}" width="7" height="7" rx="2" fill="#b99a8a"/><ellipse cx="${N(x)}" cy="${N(y + 14)}" rx="7.5" ry="9.5" fill="${cols[bi % 4]}" stroke="#fff" stroke-width="1.6"/><circle cx="${N(x - 2.5)}" cy="${N(y + 11)}" r="2.2" fill="#fff" fill-opacity=".85"/>`;
        bi++;
      }
    });
    s += `<path d="${wire}" fill="none" stroke="#b99a8a" stroke-width="2.6"/>${bulbs}`;
    s += `<circle cx="404" cy="10" r="7" fill="#ff9ec4" stroke="#e0679d" stroke-width="2"/><circle cx="796" cy="10" r="7" fill="#ff9ec4" stroke="#e0679d" stroke-width="2"/>`;
    s += jar;
    [[452, 560, 3, 0], [520, 640, 2.4, 1.3], [590, 700, 3, 2.1], [500, 760, 2.2, 3.4], [660, 790, 2.8, 0.7], [560, 500, 2, 4.2], [470, 690, 2.6, 5]].forEach(([x, y, r, dl]) => (s += `<circle class="room-mote" style="animation-delay:${-dl}s" cx="${x}" cy="${y}" r="${r}" fill="#fff"/>`));
    [[1040, 300, 11, 0], [1068, 430, 8, 1.1], [1046, 520, 9, 2], [742, 448, 7, 1.4]].forEach(([x, y, r, dl]) => (s += `<path class="room-spark" style="animation-delay:${-dl}s" d="${DU.sparkleD(x, y, r)}" fill="#fff"/>`));

    return `<svg class="room-art" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">${d}${s}</svg>`;
  }

  /* the game's name as sticker lettering */
  function titleSvg(u, title) {
    const len = Math.max(6, Array.from(title).length);
    const fs = N(Math.max(24, Math.min(52, 740 / len)));
    const tx = (extra) => `<text x="210" y="${N(50 + fs * 0.34)}" text-anchor="middle" direction="rtl" font-family="Fredoka, 'Arial Hebrew', system-ui, sans-serif" font-weight="700" font-size="${fs}" ${extra}>${esc(title)}</text>`;
    return `<svg class="room-title-art" viewBox="0 0 420 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(title)}"><defs><linearGradient id="${u}tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8fc0"/><stop offset="1" stop-color="#ff4f97"/></linearGradient></defs>` +
      `<g transform="rotate(-2 210 50)"><g transform="translate(0 5)" opacity=".22">${tx('fill="none" stroke="#5a2d6e" stroke-width="17" stroke-linejoin="round"')}</g>` +
      tx('fill="none" stroke="#5b3a8c" stroke-width="17" stroke-linejoin="round"') + tx('fill="none" stroke="#fff" stroke-width="10" stroke-linejoin="round"') + tx(`fill="url(#${u}tg)"`) + `</g>` +
      `<path d="${DU.sparkleD(18, 24, 12)}" fill="#ffcc45" stroke="#fff" stroke-width="2"/><path d="${DU.sparkleD(402, 74, 9)}" fill="#ffcc45" stroke="#fff" stroke-width="2"/><path d="${DU.sparkleD(390, 20, 6)}" fill="#b99cff"/><path d="${DU.heartD(30, 78, 7)}" fill="#ff7aae" stroke="#fff" stroke-width="2"/></svg>`;
  }

  const R = (DU.room = {});

  /* a happy pose that never swings an arm that is holding something
     (things in the 'hand' slot sit in the picture-left hand, hand-held bags in the right one) */
  function freePose(hero, kind) {
    const w = (hero && hero.wear) || {};
    const leftBusy = !!(w.hand && DU.itemById[w.hand.id]), rightBusy = !!(w.bag && DU.itemById[w.bag.id]);
    if (kind === 'cheer') {
      const p = { head: leftBusy && rightBusy ? -5 : 0 };
      if (!leftBusy) p.armL = [142, 18];
      if (!rightBusy) p.armR = [142, 18];
      return p;
    }
    if (!leftBusy) return { armL: [62, 112], head: -5 };
    if (!rightBusy) return { armR: [62, 112], head: 5 };
    return { head: -6 };
  }

  /* her bike, parked by the door, in the colours she gave it (bike.js): the way out to the ride (ride.js) */
  const bikeSvg = () => (DU.bike ? DU.bike.sideSvg(DU.bike.cur(), 'room-bike-art') : '');

  R.html = function (o) {
    o = o || {};
    const u = DU.uid('rm');
    let girl = '';
    try { girl = DU.renderCard(o.hero || DU.defaultState(), { rig: true, noBg: true }); } catch (e) { console.error('room: hero failed', e); }
    const tag = (txt, cls, style) => `<span class="room-tag ${cls || ''}" style="${style || ''}">${txt}</span>`;
    const count = o.albumTotal ? `<small dir="ltr">${o.albumHave || 0}/${o.albumTotal}</small>` : '';
    return `<div class="room" data-wip="${o.hasWip ? 1 : 0}">
      <div class="room-scene">
        ${roomSvg(u, o)}
        <button class="room-hot room-shop" data-act="shop" style="${box(246, 104, 308, 366)}" aria-label="החנות">${tag('החנות', 'mint', off(252, 46, 7))}</button>
        <button class="room-hot room-gallery" data-act="gallery" style="${box(590, 104, 322, 276)}" aria-label="הגלריה שלי">${tag('הגלריה שלי', '', off(248, 232, 3))}</button>
        <button class="room-hot room-album" data-act="album" style="${box(686, 388, 226, 150)}" aria-label="האלבום שלי">${tag('האלבום שלי' + count, 'lilac', off(120, 166, -2))}</button>
        <button class="room-hot room-wardrobe" data-act="new" style="${box(916, 160, 276, 560)}" aria-label="דמות חדשה">${tag(ico('sparkle') + 'דמות חדשה', 'big', off(120, 482, -3))}</button>
        <button class="room-hot room-jarbtn" type="button" style="${box(22, 44, 120, 140)}" aria-label="הכוכבים שלי"></button>
        <div class="room-pointswrap" style="${at(196, 128)}"><div class="stars-pill room-points">${ico('star')}<span>${Number(o.points) || 0}</span></div></div>
        <button class="room-hot room-bike" data-act="ride" style="${box(34, 468, 236, 196)}" aria-label="לצאת לרכיבה">${bikeSvg()}${tag(ico('bike') + 'לצאת לרכיבה', 'sky', off(128, -4, -4))}</button>
        ${DU.bike ? `<button class="room-hot room-garage" data-act="garage" style="${box(72, 330, 156, 80)}" aria-label="לעצב את האופניים">${tag(DU.bike.icon('wrench') + 'לעצב אופניים', 'rose', off(78, 40, 3))}</button>` : ''}
        ${o.gift ? `<button class="room-hot room-gift" data-act="gift" style="${box(92, 656, 164, 156)}" aria-label="הפתעה">${tag('הפתעה!', 'gold', off(116, -18, -6))}</button>` : ''}
        <div class="room-girl" style="${box(560 - 187.5, 838 - 912 * 0.5, 375, 500)}">${girl}</div>
        <button class="room-hot room-girlbtn" ${o.hasWip ? 'data-act="continue"' : 'type="button"'} style="${box(472, 404, 176, 454)}" aria-label="${o.hasWip ? 'להמשיך' : 'הדמות שלי'}">${o.hasWip ? tag(ico('play') + 'להמשיך', 'purple', off(88, 456)) : ''}</button>
      </div>
      <div class="room-title">${titleSvg(u, o.title || '')}<button class="room-pencil" data-act="title" aria-label="לשנות את שם המשחק">${ico('pencil')}</button></div>
      <button class="round-btn room-mute" data-act="mute" aria-label="צליל">${ico(o.muted ? 'mute' : 'sound')}</button>
    </div>`;
  };

  /* ---------------- life ---------------- */
  R.mount = function (root) {
    if (!root || root._roomOn) return;
    root._roomOn = true;
    const M = DU.motion, snd = DU.sound || { play() {}, tone() {} };
    const reduced = () => !!(M && M.reduced());
    const scene = root.querySelector('.room-scene');
    const girlSvg = root.querySelector('.room-girl svg');

    // the scene is always 1200×900 units, as big as fits; --su = pixels per unit
    const fit = () => {
      const w = root.clientWidth, h = root.clientHeight;
      if (!w || !h) return;
      const tall = h > w * 1.08;
      const su = Math.min(w / W, (tall ? h * 0.74 : h) / H);
      root.style.setProperty('--su', su.toFixed(4) + 'px');
      root.classList.toggle('room-tall', tall);
    };
    fit();
    const onResize = () => { if (!root.isConnected) return stop(); fit(); };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    let blinkT = 0, lookT = 0, alive = true, busy = false;
    function stop() {
      alive = false;
      clearTimeout(blinkT); clearTimeout(lookT);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    }

    // she blinks, and now and then tilts her head (breathing is a cheap CSS animation on the whole figure)
    if (girlSvg && M && !reduced()) {
      const blink = () => {
        if (!alive) return;
        if (!root.isConnected) return stop();
        if (!busy) M.blink(girlSvg).then(() => { if (alive && Math.random() < 0.25) setTimeout(() => !busy && root.isConnected && M.blink(girlSvg), 140); });
        blinkT = setTimeout(blink, 2600 + Math.random() * 2600);
      };
      blinkT = setTimeout(blink, 1500);
      const look = () => {
        if (!alive) return;
        if (!root.isConnected) return stop();
        if (!busy) {
          DU.pose(girlSvg, { head: Math.random() < 0.5 ? -4 : 4 }, 700, M.ease.inOut);
          setTimeout(() => { if (alive && !busy && root.isConnected) DU.pose(girlSvg, 'rest', 800, M.ease.inOut); }, 1900);
        }
        lookT = setTimeout(look, 6500 + Math.random() * 4000);
      };
      lookT = setTimeout(look, 4200);
    }

    const once = (cls, ms) => { root.classList.remove(cls); void root.offsetWidth; root.classList.add(cls); setTimeout(() => root.classList.remove(cls), ms); };
    let cheerT = 0;
    const cheer = (pose, ms) => {
      if (!girlSvg || !M) return;
      clearTimeout(cheerT);
      busy = true;
      DU.pose(girlSvg, freePose(root._hero, pose), 380);
      DU.setEyes(girlSvg, 'happy');
      M.hop(girlSvg, 24, 440);
      cheerT = setTimeout(() => { if (!root.isConnected) return; DU.pose(girlSvg, 'rest', 420); DU.setEyes(girlSvg); busy = false; }, ms);
    };
    root._cheer = cheer;
    root._once = once;

    // small flourishes; the real actions (data-act) are handled by app.js
    const on = (sel, ev, fn) => { const el = root.querySelector(sel); if (el) el.addEventListener(ev, fn); };
    on('.room-wardrobe', 'pointerdown', () => { root.classList.add('room-open'); setTimeout(() => root.isConnected && root.classList.remove('room-open'), 1100); });
    on('.room-gallery', 'pointerdown', () => once('room-wig', 900));
    on('.room-shop', 'pointerdown', () => { if (DU.fx) DU.fx.burst(scene, 33.3, 30, { count: 8, spread: 8, size: 2.6 }); });
    on('.room-album', 'pointerdown', () => once('room-bookhop', 700));
    on('.room-jarbtn', 'click', () => {
      once('room-jig', 700);
      [0, 2, 4].forEach((st, i) => snd.tone(784 * Math.pow(2, st / 12), { at: i * 0.09, dur: 0.28, vol: 0.14 }));
      if (DU.fx) DU.fx.burst(scene, 7.7, 14, { count: 8, spread: 7, size: 2.4, colors: ['#ffcc45', '#ffe08a', '#fff'] });
      const pill = root.querySelector('.room-points'); if (pill) { pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump'); }
    });
    const gb = root.querySelector('.room-girlbtn');
    if (gb && !gb.dataset.act) gb.addEventListener('click', () => { snd.tone(660, { dur: 0.12, type: 'triangle', vol: 0.18, slide: 990 }); cheer('wave', 1400); });
  };

  /* the surprise: the lid pops, sparkles, "+N" stars fly to the jar, and the box is gone */
  R.openGift = function (root, gift) {
    const stars = (gift && gift.stars) || 0;
    const M = DU.motion, snd = DU.sound || { play() {}, tone() {} };
    return new Promise((resolve) => {
      const scene = root && root.querySelector && root.querySelector('.room-scene');
      const btn = scene && scene.querySelector('.room-gift');
      const art = scene && scene.querySelector('.room-giftart');
      const finish = () => { if (btn) btn.remove(); if (art) art.remove(); if (root && root.classList) root.classList.remove('room-gift-open'); resolve(); };
      if (!scene || !btn || (M && M.reduced())) { finish(); return; }
      btn.disabled = true;
      root.classList.add('room-gift-open');
      const su = scene.clientWidth / W;
      [0, 4, 7, 12].forEach((st, i) => snd.tone(660 * Math.pow(2, st / 12), { at: 0.12 + i * 0.07, dur: 0.45, vol: 0.13 }));
      setTimeout(() => DU.fx && DU.fx.burst(scene, 14.3, 78, { count: 16, spread: 15, size: 3 }), 220);
      if (root._cheer) root._cheer('cheer', 1500);
      // "+N" pops up over the box
      const plus = document.createElement('div');
      plus.className = 'room-plus';
      plus.style.cssText = at(186, 628);
      plus.innerHTML = `<span dir="ltr">+${stars}</span>${ico('star')}`;
      scene.appendChild(plus);
      if (plus.animate) plus.animate(
        [{ transform: 'translate(-50%,-50%) translateY(70%) scale(.2)', opacity: 0, easing: 'cubic-bezier(.3,1.5,.5,1)' }, { transform: 'translate(-50%,-50%) scale(1.14)', opacity: 1, offset: 0.24 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.34 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.84 }, { transform: 'translate(-50%,-50%) translateY(-40%) scale(.9)', opacity: 0 }],
        { duration: 1560, easing: 'linear', fill: 'forwards' });
      // little stars fly from the box to the jar
      const from = [172, 700], to = [96, 110];
      for (let i = 0; i < 7; i++) {
        const sEl = document.createElement('span');
        sEl.className = 'room-fly';
        sEl.style.cssText = at(from[0], from[1]);
        sEl.innerHTML = ico('star');
        scene.appendChild(sEl);
        const dx = (to[0] - from[0]) * su, dy = (to[1] - from[1]) * su, bend = (120 + Math.random() * 120) * su * (i % 2 ? 1 : 0.4);
        const a = sEl.animate
          ? sEl.animate(
            [{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 }, { transform: `translate(-50%,-50%) translate(${bend}px, ${dy * 0.45}px) scale(1.15) rotate(140deg)`, opacity: 1, offset: 0.5 }, { transform: `translate(-50%,-50%) translate(${dx}px, ${dy}px) scale(.6) rotate(300deg)`, opacity: 1, offset: 0.94 }, { transform: `translate(-50%,-50%) translate(${dx}px, ${dy}px) scale(.1)`, opacity: 0 }],
            { duration: 820, delay: 420 + i * 85, easing: 'cubic-bezier(.4,0,.3,1)', fill: 'both' })
          : null;
        const done = () => { sEl.remove(); snd.tone(1568 * Math.pow(2, i / 12), { dur: 0.09, vol: 0.09 }); };
        if (a) a.onfinish = done; else setTimeout(done, 900);
      }
      setTimeout(() => { if (root._once) root._once('room-jig', 700); }, 1150);
      setTimeout(() => { plus.remove(); finish(); }, 1650);
    });
  };
  /* the app passes the hero state to html(); remember it for safe poses */
  const html0 = R.html;
  R.html = function (o) { R._hero = o && o.hero; return html0(o); };
  const mount0 = R.mount;
  R.mount = function (root) { if (root) root._hero = R._hero; return mount0(root); };
})();
