/* ride-garage.js — the bike workshop: the screen where she designs her bikes.
   Needs THREE, ride-kit.js, ride-bike.js, ride-rider.js and bike.js (it is fetched with the ride, see loadRide in app.js).
     DU.garage.open({ host, state, tab }) → the screen is put into host; state = the girl who stands by the bike
     DU.garage.close()                    → frees the 3D picture (also happens by itself when the screen is replaced)
   The bike turns on a stand in real 3D, exactly as it will look on the ride. A part she does not own yet can be
   tried on the bike first, and bought with stars if she likes it. Every change is saved at once (DU.bike.save). */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const G = (DU.garage = { live: null });
  const T = window.THREE;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ico = (n) => (DU.icon && DU.icon(n)) || '';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
  const LOOKS = ['paint', 'seat', 'wheel', 'frame', 'wheels', 'basket', 'streamers', 'flag', 'flagC']; // what changes the 3D bike
  const MOVING = ['wheels', 'streamers', 'flag', 'trail']; // on these pages the wheels turn, so she sees the part in the wind
  const TH = 232; // the small pictures, in pixels

  G.open = function (o) { G.close(); G.live = make(o || {}); return G.live; };
  G.close = function () { const l = G.live; G.live = null; if (l) l.dispose(); };

  /* the wall and the floor of the workshop (a flat picture behind the 3D bike) */
  function backdrop() {
    const u = DU.uid('gw');
    let s = `<defs><linearGradient id="${u}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dff3ff"/><stop offset="1" stop-color="#eef9ff"/></linearGradient>` +
      `<pattern id="${u}t" width="120" height="60" patternUnits="userSpaceOnUse" patternTransform="skewX(-28)"><rect width="120" height="60" fill="#ffe9f2"/><rect width="60" height="30" fill="#ffd6e7"/><rect x="60" y="30" width="60" height="30" fill="#ffd6e7"/></pattern>` +
      `<linearGradient id="${u}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>`;
    s += `<rect x="-600" y="-300" width="2200" height="790" fill="url(#${u}w)"/><rect x="-600" y="470" width="2200" height="600" fill="url(#${u}t)"/><rect x="-600" y="470" width="2200" height="130" fill="url(#${u}f)"/>`;
    s += `<rect x="-600" y="452" width="2200" height="20" fill="#fff"/><rect x="-600" y="470" width="2200" height="5" fill="#d9a9c2" opacity=".45"/>`;
    // the board with her tools
    s += `<rect x="70" y="120" width="300" height="210" rx="16" fill="#fff" stroke="#c9dff0" stroke-width="5"/>`;
    for (let y = 150; y < 320; y += 30) for (let x = 100; x < 360; x += 30) s += `<circle cx="${x}" cy="${y}" r="3" fill="#d6e8f5"/>`;
    s += `<g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M128 160v96" stroke="#b99cff" stroke-width="13"/><path d="M114 152q14 -18 28 0q-4 14 -14 14q-10 0 -14 -14Z" fill="#b99cff" stroke="#8d76d8" stroke-width="3"/>` +
      `<path d="M196 150v70" stroke="#ff8fc0" stroke-width="11"/><path d="M196 220v44" stroke="#c9ced6" stroke-width="7"/><path d="M186 264h20" stroke="#8a8fa8" stroke-width="6"/>` +
      `<circle cx="292" cy="212" r="46" stroke="#fff6e6" stroke-width="15"/><circle cx="292" cy="212" r="54" stroke="#e7dcc6" stroke-width="2.5"/><circle cx="292" cy="212" r="38" stroke="#e7dcc6" stroke-width="2.5"/><circle cx="292" cy="212" r="33" stroke="#7de3e0" stroke-width="5"/></g>`;
    // a shelf with pots of paint
    s += `<rect x="460" y="232" width="270" height="14" rx="7" fill="#fff" stroke="#c9dff0" stroke-width="4"/>`;
    [['#ff8fc0', 482], ['#ffd54d', 546], ['#7de3e0', 610], ['#b99cff', 674]].forEach(([c, x]) => (s += `<rect x="${x}" y="182" width="46" height="50" rx="7" fill="${c}" stroke="#fff" stroke-width="4"/><rect x="${x - 3}" y="176" width="52" height="12" rx="5" fill="#fff"/><path d="M${x + 10} 200q13 -9 26 0" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".8"/>`));
    // flags across the top
    let fl = '';
    const cols = ['#ff8fc0', '#ffd54d', '#7de3e0', '#b99cff', '#ff9d4d', '#a3dc7f'];
    for (let i = 0; i < 14; i++) { const x = -40 + i * 66, y = 40 + Math.sin((i / 13) * Math.PI) * 30; fl += `<path d="M${x} ${y}l34 4l-14 40Z" fill="${cols[i % 6]}" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>`; }
    s += `<path d="M-60 36Q400 110 860 36" fill="none" stroke="#c9b3a0" stroke-width="3"/>` + fl;
    return `<svg class="g-back" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 700" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">${s}</svg>`;
  }

  function make(o) {
    const B = DU.bike, K = DU.rideKit, RB = DU.rideBike, RR = DU.rideRider, S = DU.store, snd = DU.sound || { play() {} };
    const host = o.host;
    const hero = JSON.parse(JSON.stringify(o.state || DU.defaultState()));
    if (hero.wear) delete hero.wear.side; // her pet waits at home: the bike stands where it would
    const fit = RB.fit(hero.body), fit0 = RB.fit();
    const Rg = DU.rig(hero.body), dollH = (Rg.ground - Rg.headTop) * RB.DIM.UNIT;
    let spec = B.cur(), tryOn = null, tab = B.TABS.some((t) => t.id === o.tab) ? o.tab : 'paint', dead = false, raf = 0;
    const view = () => (tryOn ? Object.assign({}, spec, { [tryOn.kind]: tryOn.id }) : spec);

    host.innerHTML = `
      <div class="garage">
        <div class="topbar">
          <button class="round-btn" data-act="home" aria-label="בית">${ico('home')}</button>
          <h2 class="g-title">${B.icon('wrench')}<span>סדנת האופניים</span></h2>
          <div class="stars-pill">${ico('star')} <span>${S.data.points}</span></div>
          <button class="round-btn" data-act="mute" aria-label="צליל">${ico(S.data.mute ? 'mute' : 'sound')}</button>
          <button class="btn ride-go g-go" data-act="ride">${ico('bike')} לרכוב!</button>
        </div>
        <div class="g-stage">
          ${backdrop()}
          <canvas class="g-canvas"></canvas>
          <button class="round-btn g-dice" data-g="random" aria-label="אופניים בהפתעה">${ico('dice')}</button>
          <button class="round-btn g-del" data-g="del" aria-label="למחוק את האופניים האלה" hidden>${ico('trash')}</button>
          <div class="g-turn">${B.icon('turn')}אפשר לסובב</div>
          <div class="g-buy" hidden></div>
        </div>
        <div class="panel card-panel g-panel"><div class="cats g-tabs"></div><div class="g-body" style="display:contents"></div></div>
        <div class="g-bikes card-panel"><div class="hair-label"><span class="ico">${ico('bike')}</span>האופניים שלי</div><div class="g-slots"></div></div>
      </div>`;
    const root = host.firstElementChild;
    const stage = $('.g-stage', root), canvas = $('.g-canvas', root), tabsEl = $('.g-tabs', root), bodyEl = $('.g-body', root), slotsEl = $('.g-slots', root), buyEl = $('.g-buy', root);

    /* ---------------- 3D ---------------- */
    let renderer = null;
    try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { console.error('garage: no 3D', e); }
    const api = { dispose, get spec() { return spec; }, root };
    if (!renderer) { $('.g-turn', root).textContent = 'אוי, התמונה בתלת־ממד לא עובדת במכשיר הזה'; }
    const scene = new T.Scene(), camera = new T.PerspectiveCamera(30, 1, 0.1, 60);
    const lights = (sc) => { sc.add(new T.HemisphereLight('#ffffff', '#f6eee2', 0.78)); const sun = new T.DirectionalLight(K.PAL.sun, 0.36); sun.position.set(0.52, 0.74, 0.43).multiplyScalar(200); sc.add(sun); };
    lights(scene);
    const stand = K.mesh([
      K.g(new T.CylinderGeometry(0.86, 0.9, 0.07, 44), '#fff7fb', 0, -0.036, 0),
      K.g(new T.TorusGeometry(0.86, 0.018, 6, 44), '#ff8fc0', 0, -0.004, 0, Math.PI / 2, 0, 0),
      K.g(new T.CylinderGeometry(0.93, 0.96, 0.03, 44), '#ffd6e7', 0, -0.075, 0),
    ]);
    scene.add(stand);
    const table = new T.Group(); // the bike turns on it
    scene.add(table);
    const shade = K.blob(0.62, 0.2); shade.scale.set(0.6, 1.75, 1); shade.position.y = 0.004; table.add(shade);
    const trailHold = new T.Group(); table.add(trailHold);
    const dollAt = new T.Vector3(-1.2, -0.07, 0.25);
    const dollShade = K.blob(0.3, 0.16); dollShade.position.set(dollAt.x, -0.085, dollAt.z); scene.add(dollShade);

    let bike = null, builtLook = '', doll = null, builtDoll = '', dollBusy = false, trail = null, builtTrail = '';
    const lookKey = (v) => LOOKS.map((k) => v[k]).join('|');
    function syncBike() {
      const v = view(), key = lookKey(v);
      if (key === builtLook || !renderer) return;
      const keep = bike ? { phase: bike.phase } : null;
      if (bike) bike.dispose();
      bike = RB.build(v, fit, { cargo: 'bag' });
      if (keep) bike.phase = keep.phase;
      table.add(bike.tilt);
      builtLook = key;
    }
    function syncDoll() {
      const v = view(), key = v.helmet + '|' + v.helmetC;
      if (key === builtDoll || dollBusy || !renderer) return;
      dollBusy = true;
      RR.doll(hero, { h: dollH, res: 1100, helmet: B.helmetOf(v) }).then((d) => {
        dollBusy = false;
        if (dead) { if (d.userData.dispose) d.userData.dispose(); return; }
        if (d.children[1]) d.children[1].visible = false; // its own round shadow: ours lies on the floor
        if (doll) { scene.remove(doll); if (doll.userData.dispose) doll.userData.dispose(); }
        doll = d; doll.position.copy(dollAt); scene.add(doll);
        builtDoll = key;
        if (hop <= 0) hop = 0.0001;
      }).catch((e) => { dollBusy = false; builtDoll = key; console.error('garage: doll failed', e); });
    }
    function syncTrail() {
      const v = view(), want = tab === 'trail' ? v.trail : 'none';
      if (want === builtTrail || !renderer) return;
      if (trail) trail.dispose();
      trail = RB.trail(want, { rows: 22, step: 0.24, width: 0.3, count: 36 });
      if (trail) trailHold.add(trail.obj);
      builtTrail = want;
    }

    /* where the camera looks: the whole picture, or one part of the bike (at = a point of the bike) */
    const HEAD_Y = dollH - 0.2;
    const FOCUS = {
      paint: { yaw: 1.1 }, frame: { yaw: 1.42 },
      wheels: { yaw: 1.42, at: [0, 0.4, 0.02], k: 0.72 },
      basket: { yaw: 0.6, at: [0, fit.gripY - 0.1, 0.3], k: 0.52 },
      streamers: { yaw: 0.55, at: [0, fit.gripY - 0.1, 0.12], k: 0.48 },
      bell: { yaw: 0.5, at: [0, fit.gripY - 0.06, 0.18], k: 0.46 },
      flag: { yaw: -2.25, at: [0.1, 0.9, -0.5], k: 0.78 },
      trail: { yaw: -2.2, at: [0, 0.5, -0.75], k: 0.92 },
      helmet: { yaw: 1.1, world: [dollAt.x, HEAD_Y - 0.02, dollAt.z], k: 0.36 },
    };
    const WHOLE = new T.Vector3(-0.37, 0.68, 0);
    let yaw = 1.1, yawT = 1.1, free = false, sway = 0, dist = 5, aspect = 1, hop = 0, spin = 0, demoV = 0, road = 0, wide = 0; // wide: seconds of looking at the whole bike again
    const camAt = WHOLE.clone(), camTo = new T.Vector3();
    let camK = 1;
    function wholeDist() { return Math.max(4.7, 2.95 / (2 * Math.tan((camera.fov * Math.PI) / 360) * aspect)); }
    function resize() {
      if (!renderer) return;
      const w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      aspect = w / h; camera.aspect = aspect; camera.updateProjectionMatrix();
    }
    let ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(resize); ro.observe(stage); }
    window.addEventListener('resize', resize);
    resize();

    function frame(now) {
      if (dead) return;
      if (!root.isConnected) { G.close(); return; }
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, Math.max(0.001, (now - frame.last) / 1000));
      frame.last = now;
      if (document.hidden || !renderer) return;
      syncBike(); syncDoll(); syncTrail();
      if (wide > 0) wide -= dt;
      const f = free || wide > 0 ? {} : FOCUS[tab] || {};
      if (!free && !drag.on) { sway += dt; yawT = (f.yaw === undefined ? 1.1 : f.yaw) + (f.at || f.world ? 0 : Math.sin(sway * 0.5) * 0.22); }
      if (spin > 0) { const d = Math.min(spin, dt * 9); spin -= d; yaw += d; yawT += d; }
      else if (!drag.on) yaw = damp(yaw, yawT, 5, dt);
      table.rotation.y = yaw;
      // the camera
      const sn = Math.sin(yaw), cs = Math.cos(yaw);
      if (f.world) camTo.set(f.world[0], f.world[1], f.world[2]);
      else if (f.at) camTo.set(f.at[0] * cs + f.at[2] * sn, f.at[1], -f.at[0] * sn + f.at[2] * cs);
      else camTo.copy(WHOLE);
      camAt.x = damp(camAt.x, camTo.x, 5, dt); camAt.y = damp(camAt.y, camTo.y, 5, dt); camAt.z = damp(camAt.z, camTo.z, 5, dt);
      camK = damp(camK, f.k || 1, 5, dt);
      dist = wholeDist() * camK;
      camera.position.set(camAt.x, camAt.y + 0.07 * dist, camAt.z + dist);
      camera.lookAt(camAt);
      // on some pages she sees the bike as it is on the road: the wheels turn, the wind blows
      demoV = damp(demoV, MOVING.includes(tab) ? 6.4 : 0, 2.5, dt);
      if (bike) bike.update(dt, { speed: demoV, steer: 0, braking: demoV < 0.3 });
      road += demoV * dt;
      trailHold.position.z = -road;
      if (trail) trail.update(dt, 0, 0.03, road + RB.DIM.REAR_Z - 0.12, demoV);
      if (doll) { if (hop > 0) { hop += dt; const k = hop / 0.42; doll.position.y = dollAt.y + (k < 1 ? Math.sin(k * Math.PI) * 0.12 : 0); if (k >= 1) hop = 0; } }
      renderer.render(scene, camera);
      thumbStep();
    }

    /* ---------------- the small pictures: real little renders of each part ---------------- */
    const thumbs = new Map(), queue = [];
    let rt = null, thScene = null, thCam = null, thBuf = null, thCv = null;
    const TH_CAM = { // from where each part is looked at: [eye…], [target…]
      frame: [[3.2, 0.66, 0.3], [0, 0.5, 0.02]],
      bike: [[2.9, 1.25, 1.75], [0, 0.6, -0.04]],
      wheels: [[1.2, 0.1, 0.34], [0, 0, 0]],
      basket: [[0.52, 0.44, 0.98], [0, 0.06, 0.01]],
      'basket:lamp': [[0.3, 0.14, 0.58], [0, 0, -0.04]],
      streamers: [[0.5, 0.03, -0.6], [0, -0.03, -0.06]],
      'streamers:pompom': [[0.36, 0.04, -0.42], [0, 0, -0.02]],
      flag: [[0.8, 0.98, -0.8], [0, 0.9, -0.1]],
      'flag:pinwheel': [[0.5, 0.95, -0.95], [0, 0.89, -0.04]],
      'flag:balloons': [[1.6, 0.75, -1.5], [0.08, 0.5, -0.12]],
    };
    function thumbKey(kind, id, v) {
      if (kind === 'frame') return ['frame', id, v.paint, v.seat, v.wheel, v.wheels].join('|');
      if (kind === 'wheels') return ['wheels', id, v.wheel].join('|');
      if (kind === 'flag') return ['flag', id, v.flagC].join('|');
      if (kind === 'bike') return 'bike|' + lookKey(v);
      return kind + '|' + id;
    }
    function thumbSpec(kind, id, v) {
      if (kind === 'bike') return v;
      const s = Object.assign({}, v, { [kind]: id });
      if (kind === 'frame') Object.assign(s, { flag: 'none', basket: 'none', streamers: 'none' });
      return s;
    }
    function renderThumb(kind, id, v) {
      if (!rt) {
        rt = new T.WebGLRenderTarget(TH, TH, { samples: renderer.capabilities.isWebGL2 ? 4 : 0 });
        thScene = new T.Scene(); lights(thScene);
        thCam = new T.PerspectiveCamera(26, 1, 0.05, 30);
        thBuf = new Uint8Array(TH * TH * 4);
        thCv = document.createElement('canvas'); thCv.width = thCv.height = TH;
      }
      const piece = RB.piece(kind, thumbSpec(kind, id, v), fit0);
      thScene.add(piece.obj);
      const cam = TH_CAM[kind + ':' + id] || TH_CAM[kind];
      thCam.position.set(cam[0][0], cam[0][1], cam[0][2]); thCam.lookAt(cam[1][0], cam[1][1], cam[1][2]);
      renderer.setRenderTarget(rt);
      renderer.setClearColor(0x000000, 0); renderer.clear();
      renderer.render(thScene, thCam);
      renderer.readRenderTargetPixels(rt, 0, 0, TH, TH, thBuf);
      renderer.setRenderTarget(null);
      thScene.remove(piece.obj); piece.dispose();
      // upside down → the right way up, and the soft edges back to plain colours
      const ctx = thCv.getContext('2d'), img = ctx.createImageData(TH, TH), d = img.data;
      for (let y = 0; y < TH; y++) {
        const src = (TH - 1 - y) * TH * 4, dst = y * TH * 4;
        for (let x = 0; x < TH * 4; x += 4) {
          const a = thBuf[src + x + 3];
          if (a) { const k = 255 / a; d[dst + x] = Math.min(255, thBuf[src + x] * k); d[dst + x + 1] = Math.min(255, thBuf[src + x + 1] * k); d[dst + x + 2] = Math.min(255, thBuf[src + x + 2] * k); d[dst + x + 3] = a; }
        }
      }
      ctx.putImageData(img, 0, 0);
      return thCv.toDataURL('image/png');
    }
    /* an <img> that gets its picture now (when it was made before) or in one of the next frames */
    function thumbImg(kind, id, v) {
      const key = thumbKey(kind, id, v || view());
      const have = thumbs.get(key);
      if (!have && !queue.some((q) => q.key === key)) queue.push({ key, kind, id, v: Object.assign({}, v || view()) });
      return `<img class="g-th" alt="" draggable="false" data-th="${esc(key)}"${have ? ` src="${have}"` : ''}>`;
    }
    function thumbStep() {
      if (!queue.length || !renderer) return;
      const q = queue.shift();
      if (!root.querySelector(`img[data-th="${CSS.escape(q.key)}"]`)) return; // nobody waits for it any more
      let url = '';
      try { url = renderThumb(q.kind, q.id, q.v); } catch (e) { console.error('garage: picture failed', q.key, e); }
      if (!url) return;
      if (thumbs.size > 260) thumbs.clear();
      thumbs.set(q.key, url);
      root.querySelectorAll(`img[data-th="${CSS.escape(q.key)}"]`).forEach((im) => (im.src = url));
    }

    /* ---------------- the panel ---------------- */
    const star = () => ico('star');
    const price = (kind, id) => (B.owns(kind, id) ? '' : `<span class="g-price">${star()}<b dir="ltr">${B.price(kind, id)}</b></span>`);
    function headSvg(style, color) {
      const s = Object.assign({}, hero, { body: { h: 0, m: 0 }, wear: {} });
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="225 96 300 330" preserveAspectRatio="xMidYMid meet">${DU.renderCharacter(s, { helmet: { c: color, style } })}</svg>`;
    }
    function tile(kind, p, v) {
      const on = v[kind] === p.id, own = B.owns(kind, p.id);
      let pic;
      if (p.id === 'none') pic = `<span class="g-ico">${ico('none')}</span>`;
      else if (kind === 'trail' || kind === 'bell') pic = `<span class="g-ico">${B.icon(kind + '-' + p.id)}</span>`;
      else if (kind === 'helmet') pic = headSvg(p.id, v.helmetC);
      else pic = thumbImg(kind, p.id, v);
      return `<button class="tile g-tile ${on ? 'on' : ''} ${own ? '' : 'locked'} ${tryOn && tryOn.kind === kind && tryOn.id === p.id ? 'trying' : ''}" data-g="part" data-kind="${kind}" data-id="${p.id}" aria-label="${esc(p.name)}">${pic}<span class="label">${esc(p.name)}</span>${price(kind, p.id)}</button>`;
    }
    const swatch = (field, c, v, label) => `<button class="sw ${v[field] === c ? 'on' : ''}" style="background:${c}" data-g="color" data-f="${field}" data-c="${c}" aria-label="${label}"></button>`;
    function drawTabs() {
      tabsEl.innerHTML = B.TABS.map((t) => `<button class="cat ${t.id === tab ? 'on' : ''}" data-g="tab" data-id="${t.id}"><span class="ico">${B.icon(t.id)}</span>${t.name}</button>`).join('');
    }
    function drawPanel(keep) {
      const v = view(), sc = $('.grid-scroll', bodyEl), top = keep && sc ? sc.scrollTop : 0, cl = $('.colors', bodyEl), left = keep && cl ? cl.scrollLeft : 0;
      let h = '', row = '';
      if (tab === 'paint') {
        h += `<div class="section-title">צבע האופניים</div><div class="swatches">${B.COLORS.map((c) => swatch('paint', c, v, 'צבע האופניים').replace('class="sw ', 'class="sw big ')).join('')}</div>`;
        h += `<div class="section-title">צבעים מיוחדים</div><div class="grid small">${B.PAINTS.map((p) =>
          `<button class="tile g-tile g-paint ${v.paint === p.id ? 'on' : ''} ${B.owns('paint', p.id) ? '' : 'locked'}" data-g="part" data-kind="paint" data-id="${p.id}" aria-label="${esc(p.name)}"><i style="background:${B.paintCss(p.id)}"></i><span class="label">${esc(p.name)}</span>${price('paint', p.id)}</button>`).join('')}</div>`;
        h += `<div class="section-title">צבע המושב</div><div class="swatches">${B.COLORS.map((c) => swatch('seat', c, v, 'צבע המושב').replace('class="sw ', 'class="sw big ')).join('')}</div>`;
      } else {
        h += `<div class="grid">${B.PARTS[tab].map((p) => tile(tab, p, v)).join('')}</div>`;
        const f = { wheels: ['wheel', 'צבע הגלגלים והידיות'], flag: ['flagC', 'צבע הדגל'], helmet: ['helmetC', 'צבע הקסדה'] }[tab];
        if (f) row = `<div class="colors">${B.COLORS.map((c) => swatch(f[0], c, v, f[1])).join('')}</div>`;
        if (tab === 'trail') h += `<div class="hint-box g-note">${B.icon('trail')} השובל מופיע מאחורייך כשרוכבים</div>`;
        if (tab === 'bell') h += `<div class="hint-box g-note">${B.icon('bell')} לחצי כדי לשמוע</div>`;
      }
      bodyEl.innerHTML = `<div class="grid-scroll">${h}</div>${row}`;
      if (top) $('.grid-scroll', bodyEl).scrollTop = top;
      if (left && $('.colors', bodyEl)) $('.colors', bodyEl).scrollLeft = left;
    }
    function drawSlots() {
      const list = B.list(), at = B.at();
      slotsEl.innerHTML = list.map((s, i) => `<button class="tile g-slot ${i === at ? 'on' : ''}" data-g="slot" data-i="${i}" aria-label="אופניים ${i + 1}">${thumbImg('bike', '', i === at ? spec : B.norm(s))}</button>`).join('') +
        (B.canAdd() ? `<button class="tile g-slot g-add" data-g="add" aria-label="אופניים חדשים"><span class="g-ico">${B.icon('plus')}</span><span class="label">חדשים</span></button>` : '');
      $('.g-del', root).hidden = list.length < 2;
    }
    function drawBuy() {
      if (!tryOn) { buyEl.hidden = true; buyEl.innerHTML = ''; return; }
      const p = B.part(tryOn.kind, tryOn.id), pts = S.data.points, enough = pts >= p.price;
      buyEl.hidden = false;
      buyEl.innerHTML = `<span class="g-buy-name">${ico('lock')} ${esc(p.name)}</span>` +
        (enough ? `<button class="btn" data-g="buy">לקנות ב־<span dir="ltr">${star()} ${p.price}</span></button>`
          : `<span class="g-buy-miss">חסרים לך עוד <b dir="ltr">${star()} ${p.price - pts}</b></span>`) +
        `<button class="round-btn" data-g="untry" aria-label="ביטול">${ico('close')}</button>`;
    }
    function points() {
      root.querySelectorAll('.stars-pill span').forEach((e) => (e.textContent = S.data.points));
      const pill = $('.stars-pill', root); if (pill) { pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump'); }
    }
    function refresh(keep) { drawPanel(keep); drawSlots(); drawBuy(); }
    function look(t) { free = false; sway = 0; wide = 0; if (t) tab = t; }
    function whole() { free = false; wide = 2.6; spin = Math.PI * 2; hop = 0.0001; } // a new bike: she sees all of it turn round once

    /* ---------------- what she taps ---------------- */
    const act = {
      tab(el) { if (tab === el.dataset.id) { look(); return; } tryOn = null; look(el.dataset.id); snd.play('tab'); drawTabs(); refresh(); },
      part(el) {
        const kind = el.dataset.kind, id = el.dataset.id;
        look();
        if (kind === 'bell') B.ring(id);
        if (B.owns(kind, id)) { tryOn = null; spec = Object.assign({}, spec, { [kind]: id }); B.save(spec); if (kind !== 'bell') snd.play('pick'); }
        else { tryOn = tryOn && tryOn.kind === kind && tryOn.id === id ? null : { kind, id }; if (kind !== 'bell') snd.play('tap'); } // not hers yet: she sees it on the bike first
        refresh(true);
      },
      color(el) {
        const f = el.dataset.f;
        if (tryOn && tryOn.kind === f) tryOn = null;
        spec = Object.assign({}, spec, { [f]: el.dataset.c }); B.save(spec);
        look(); snd.play('tap'); refresh(true);
      },
      buy() {
        if (!tryOn) return;
        const t = tryOn;
        if (!B.buy(t.kind, t.id)) { snd.play('locked'); drawBuy(); return; }
        tryOn = null; spec = Object.assign({}, spec, { [t.kind]: t.id }); B.save(spec);
        snd.play('buy'); points(); hop = 0.0001; spin = Math.PI * 2;
        if (DU.app && DU.app.confetti) DU.app.confetti(60);
        if (DU.app && DU.app.toast) DU.app.toast(B.part(t.kind, t.id).name + ' שלך!');
        refresh(true);
      },
      untry() { tryOn = null; snd.play('tap'); refresh(true); },
      random() { tryOn = null; spec = B.random(); B.save(spec); snd.play('pick'); whole(); refresh(); },
      slot(el) { const i = +el.dataset.i; if (i === B.at()) return; tryOn = null; B.select(i); spec = B.cur(); snd.play('pick'); whole(); refresh(); },
      add() { if (B.add() < 0) return; tryOn = null; spec = B.cur(); snd.play('save'); whole(); refresh(); const l = slotsEl.lastElementChild; if (l && l.scrollIntoView) l.scrollIntoView({ block: 'nearest', inline: 'nearest' }); },
      del() {
        if (B.list().length < 2) return;
        const go = () => { tryOn = null; B.remove(B.at()); spec = B.cur(); snd.play('off'); whole(); refresh(); };
        snd.play('tap');
        if (DU.app && DU.app.confirm) DU.app.confirm('למחוק את האופניים האלה?', 'כן, למחוק', 'לא', go); else go();
      },
    };
    root.addEventListener('click', (e) => {
      const el = e.target.closest('[data-g]');
      if (!el || el.disabled || !root.contains(el)) return;
      const fn = act[el.dataset.g];
      if (fn) fn(el);
    });
    // turn the bike with a finger
    const drag = { on: false, id: null, x: 0 };
    canvas.addEventListener('pointerdown', (e) => { drag.on = true; drag.id = e.pointerId; drag.x = e.clientX; try { canvas.setPointerCapture(e.pointerId); } catch (x) { /* fine */ } });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag.on || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x; drag.x = e.clientX;
      if (!free && Math.abs(dx) > 0) { free = true; root.classList.add('g-turned'); }
      yaw += dx * 0.011; yawT = yaw;
    });
    const dragEnd = (e) => { if (e.pointerId === drag.id) drag.on = false; };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => canvas.addEventListener(t, dragEnd));

    function dispose() {
      if (dead) return;
      dead = true; cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      if (ro) ro.disconnect();
      try { if (bike) bike.dispose(); if (trail) trail.dispose(); if (doll && doll.userData.dispose) doll.userData.dispose(); if (rt) rt.dispose(); } catch (e) { console.error(e); }
      try { K.dispose(scene); if (thScene) K.dispose(thScene); if (renderer) { renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss(); } } catch (e) { console.error(e); }
    }

    drawTabs(); refresh();
    frame.last = performance.now();
    raf = requestAnimationFrame(frame);
    api.debug = { TH_CAM, thumb: renderThumb, get bike() { return bike; }, get doll() { return doll; }, scene, camera, renderer, thumbs, queue, act, step: (dt) => frame(frame.last + dt * 1000), get tab() { return tab; }, get tryOn() { return tryOn; } };
    return api;
  }
})();
