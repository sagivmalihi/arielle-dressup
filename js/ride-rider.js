/* ride-rider.js — the girl on her bike for the 3D ride (needs THREE, ride-kit.js, render.js, motion.js).
   She stays a flat paper doll fixed to a real 3D bike: one plane shows her BACK (what the chase camera
   sees), one shows her FRONT (intro / arrival). Each is single-sided, so the right one shows from any angle.

     DU.rideRider.make(state, opts) → Promise<rider>       opts: { bikeColor, helmetColor }
     DU.rideRider.doll(state, opts) → Promise<Object3D>    a standing paper doll; opts: { h, pose, res }
     DU.rideRider.friends(n, seed, notKind) → [state, …]   random dressed girls (and one special character)

     rider = { group, height, update(dt, { speed, steer, braking }), pose('ride'|'wave'|'cheer'), bell(), dispose() }
     rider.group: origin on the ground under the middle of the bike, forward = +Z, metres.

   How the flat doll rides: the body below the hem (found by scanning the picture for the gap between the
   legs) is cut into a left and a right leg quad; their bottom edges follow the pedals. */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const RR = (DU.rideRider = {});

  /* the part of the 750×1000 body space that goes on a texture, and the texture size */
  const VB = [95, 70, 560, 896], TW = 640, TH = 1024;
  const UNIT = 1.3 / 696; // metres per body unit: a girl of normal height is about 1.3 m tall
  const PETS = ['sd_cat', 'sd_dog', 'sd_bunny', 'sd_fox', 'sd_hamster', 'sd_penguin', 'sd_owl', 'sd_unicorn', 'sd_dragon', 'sd_teddy'];

  /* the bike (metres; +Z forward) */
  const WR = 0.235, TYRE = 0.03, REAR_Z = -0.44, FRONT_Z = 0.47;
  const BB = { y: 0.205, z: -0.04 }, CRANK = 0.075, PEDX = 0.088;
  const FOOT_Y = BB.y - CRANK + 0.012; // where her soles are when a pedal is at the bottom
  const DZ = -0.04; // the plane the doll lives in
  const GRIP = { x: 0.215, z: 0.09 };
  const CHASE = (RR.CHASE = { y: 3.2, z: -7 }); // where the game's camera sits, relative to her: the hands are lined up with the grips for this view (change before make())

  const rad = (d) => (d * Math.PI) / 180, deg = (r) => (r * 180) / Math.PI;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- SVG → texture ---------- */
  function rasterise(svg, w, h) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        res(c);
      };
      img.onerror = () => rej(new Error('svg image failed'));
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }
  const serial = (el) => new XMLSerializer().serializeToString(el);
  function svgEl(inner, vb, w, h) {
    const holder = document.createElement('div');
    holder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb.join(' ')}">${inner}</svg>`;
    return holder.firstElementChild;
  }
  function texOf(canvas) {
    const t = new THREE.CanvasTexture(canvas);
    t.anisotropy = 4;
    return t;
  }
  const dollMat = (tex, side) => new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, side: side || THREE.FrontSide });

  /* ---------- posing the arms of a rig SVG (no animation; see motion.js for the part names) ---------- */
  function setArm(root, side, raise, bend, q = 1) {
    const s = side === 'l' ? -1 : 1, M = DU.motion;
    M.set(root, 'arm-' + side, raise ? `rotate(${-s * raise})` : '');
    M.set(root, 'fore-' + side, bend || q !== 1 ? `rotate(${-s * bend})${q !== 1 ? ` scale(1 ${q})` : ''}` : '');
    M.set(root, 'joint-' + side, bend ? `rotate(${(-s * bend) / 2})` : '');
    root.querySelectorAll(`[data-joint="${side}"]`).forEach((j) => j.setAttribute('style', Math.abs(bend) > 0.5 ? '' : 'display:none'));
    placeHeld(root, R_OF.get(root), side, raise, bend, q);
  }
  /* What she holds does not turn with the arm: a wand, balloons… stay upright at the hand wherever it is,
     and a bag keeps hanging where it hangs when she stands. */
  const R_OF = new WeakMap(); // svg root → its rig
  function placeHeld(root, R, side, raise, bend, q) {
    const helds = root.querySelectorAll(`[data-held="${side}"]`);
    if (!helds.length) return;
    if (!R || typeof DOMMatrix === 'undefined' || (!raise && !bend && q === 1)) { helds.forEach((h) => h.removeAttribute('transform')); return; }
    const s = side === 'l' ? -1 : 1, S = R.shoulder(s), E = R.elbow(s), Hd = R.hand(s);
    const m = new DOMMatrix().translateSelf(S.x, S.y).rotateSelf(-s * raise).translateSelf(-S.x, -S.y)
      .translateSelf(E.x, E.y).rotateSelf(-s * bend).scaleSelf(1, q).translateSelf(-E.x, -E.y);
    let t = m.inverse();
    if (side === 'l') { const p = m.transformPoint(new DOMPoint(Hd.x, Hd.y)); t = t.multiply(new DOMMatrix().translateSelf(p.x - Hd.x, p.y - Hd.y)); }
    const f = (v) => Math.round(v * 1000) / 1000;
    helds.forEach((h) => h.setAttribute('transform', `matrix(${f(t.a)} ${f(t.b)} ${f(t.c)} ${f(t.d)} ${f(t.e)} ${f(t.f)})`));
  }
  /* where the hand must be on the picture so that, from the chase camera, it sits on the grip */
  function handTarget(gripY) {
    const f = (-CHASE.z + DZ) / (-CHASE.z + GRIP.z);
    return { x: (GRIP.x * f) / UNIT, y: 950 - (CHASE.y - (CHASE.y - gripY) * f - FOOT_Y) / UNIT };
  }
  /* the riding arm: the upper arm goes down and out, the forearm points forward (so it is drawn short) */
  function rideArm(R, target) {
    const S = R.shoulder(1), E = R.elbow(1), Hd = R.hand(1);
    const L1 = Math.hypot(E.x - S.x, E.y - S.y), a0 = Math.atan2(E.x - S.x, E.y - S.y);
    const hx = Hd.x - E.x, hy = Hd.y - E.y;
    const raise = 25;
    const a1 = a0 + rad(raise);
    const ex = S.x + L1 * Math.sin(a1), ey = S.y + L1 * Math.cos(a1);
    const rx = R.cx + target.x - ex, ry = target.y - ey;
    const q = clamp(Math.sqrt(Math.max(0.01, rx * rx + ry * ry - hx * hx)) / hy, 0.24, 1);
    const bend = deg(Math.atan2(rx, ry) - Math.atan2(hx, hy * q)) - raise;
    return { raise, bend, q };
  }
  /* put an arm on the handlebar */
  function armOnBar(root, R, side, target) {
    const a = rideArm(R, target);
    setArm(root, side, a.raise, a.bend, a.q);
  }
  function setHead(root, a) {
    DU.motion.set(root, 'head', a ? `rotate(${a})` : '');
    DU.motion.set(root, 'hairback', a ? `rotate(${a})` : '');
  }
  /* poses for the textures. armL is the arm that holds wands (left of the front picture). */
  function applyPose(root, R, state, name, target) {
    const P = name === 'ride' ? {} : DU.safePose(state, name);
    ['l', 'r'].forEach((side) => {
      const a = side === 'l' ? P.armL : P.armR;
      if (a) setArm(root, side, a[0], a[1]); else armOnBar(root, R, side, target);
    });
    setHead(root, P.head || 0);
  }

  /* ---------- one face of the riding doll (front or back) ----------
     → { split (body y where the legs start, or null), body (canvas: legs), upper: { ride, wave, cheer } (canvases) } */
  async function buildFace(state, R, back, helmet, target, poses) {
    const root = svgEl(DU.renderCharacter(state, { rig: true, back, helmet, heldTag: true }), VB, TW, TH);
    R_OF.set(root, R);
    applyPose(root, R, state, 'ride', target);
    const bodyG = root.querySelector('[data-part="body"]');
    // the body alone (legs, clothes): find where the legs come apart, and keep it as the leg picture
    const alone = root.cloneNode(true);
    let n = alone.querySelector('[data-part="body"]');
    while (n && n !== alone) {
      const par = n.parentNode;
      Array.from(par.children).forEach((c) => { if (c !== n && c.tagName.toLowerCase() !== 'defs') c.setAttribute('display', 'none'); });
      n = par;
    }
    const body = await rasterise(serial(alone), TW, TH);
    const sx = TW / VB[2], sy = TH / VB[3];
    const y0 = Math.round((R.crotchY - 6 - VB[1]) * sy), y1 = Math.round((R.ankleY + 8 - VB[1]) * sy);
    let px = [], split = null, run = 0;
    try { px = body.getContext('2d').getImageData(Math.round((R.cx - VB[0]) * sx) - 1, y0, 3, y1 - y0).data; } catch (e) { console.warn('ride: cannot read the doll picture', e); }
    for (let y = 0; y < px.length / 12; y++) {
      const clear = px[y * 12 + 3] < 40 && px[y * 12 + 7] < 40 && px[y * 12 + 11] < 40;
      run = clear ? run + 1 : 0;
      if (run >= 5) { split = (y - run + 1 + y0) / sy + VB[1]; break; }
    }
    if (split !== null && bodyG) {
      const id = 'cut' + Math.floor(Math.random() * 1e6);
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.innerHTML = `<clipPath id="${id}"><rect x="-600" y="-600" width="1950" height="${600 + split}"/></clipPath>`;
      root.appendChild(defs);
      bodyG.setAttribute('clip-path', `url(#${id})`);
    }
    const upper = {};
    for (const name of poses) {
      applyPose(root, R, state, name, target);
      upper[name] = await rasterise(serial(root), TW, TH);
    }
    return { split, body, upper };
  }

  /* a quad given in body units → geometry in metres (x right, y up, facing +Z) with matching UVs */
  function quadGeo(x0, y0, x1, y1, footY) {
    const X = (x) => (x - 375) * UNIT, Y = (y) => footY + (950 - y) * UNIT;
    const U = (x) => (x - VB[0]) / VB[2], V = (y) => 1 - (y - VB[1]) / VB[3];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([X(x0), Y(y0), 0, X(x1), Y(y0), 0, X(x0), Y(y1), 0, X(x1), Y(y1), 0]), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([U(x0), V(y0), U(x1), V(y0), U(x0), V(y1), U(x1), V(y1)]), 2));
    g.setIndex([0, 2, 1, 1, 2, 3]);
    return g;
  }

  /* ---------- the pet (or nothing): the side item drawn on its own ---------- */
  async function petSprite(state, own) {
    const w = state.wear && state.wear.side;
    if (!w || !PETS.includes(w.id) || !DU.itemById[w.id]) return null;
    const s = DU.defaultState();
    s.wear = { side: w };
    const box = (DU.THUMB_BOX.side || '476 628 232 332').split(' ').map(Number);
    const pad = 24, vb = [box[0] - pad, box[1] - pad, box[2] + pad * 2, box[3] + pad * 2];
    const cw = 256, ch = Math.round((cw * vb[3]) / vb[2]);
    const canvas = await rasterise(serial(svgEl(DU.renderCharacter(s, { only: ['side'] }), vb, cw, ch)), cw, ch);
    // crop to what is drawn (and leave out the soft shadow on the floor under it)
    let d = [], x0 = cw, x1 = 0, y0 = ch, y1 = 0;
    try { d = canvas.getContext('2d').getImageData(0, 0, cw, ch).data; } catch (e) { return null; }
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (d[(y * cw + x) * 4 + 3] > 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 <= x0 || y1 <= y0) return null;
    const pw = ((x1 - x0) / cw) * vb[2] * UNIT, ph = ((y1 - y0) / ch) * vb[3] * UNIT;
    const k = Math.min(0.8, 0.27 / pw, 0.33 / ph);
    const g = new THREE.PlaneGeometry(pw * k, ph * k);
    const uv = g.attributes.uv;
    for (let i = 0; i < 4; i++) uv.setXY(i, uv.getX(i) ? x1 / cw : x0 / cw, uv.getY(i) ? 1 - y0 / ch : 1 - y1 / ch);
    g.translate(0, (ph * k) / 2, 0);
    const tex = texOf(canvas);
    const mat = dollMat(tex, THREE.DoubleSide);
    own.push(tex, mat, g);
    const m = new THREE.Mesh(g, mat);
    m.userData.h = ph * k;
    return m;
  }

  /* ---------- 3D bits ---------- */
  function tube(a, b, r, color, seg = 6) {
    const K = DU.rideKit, d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length();
    const geo = new THREE.CylinderGeometry(r, r, len, seg, 1).toNonIndexed();
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
    geo.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    return K.paint(geo, color);
  }
  const BEADS = ['#ff8fc0', '#ffd54d', '#7de3e0', '#b99cff', '#ffffff', '#ff9d4d'];
  function wheelParts(rim) {
    const K = DU.rideKit, H = Math.PI / 2, parts = [];
    parts.push(K.g(new THREE.TorusGeometry(WR - TYRE, TYRE, 8, 22), '#fff6e6', 0, 0, 0, 0, H, 0));
    parts.push(K.g(new THREE.TorusGeometry(WR - TYRE * 2 + 0.006, 0.011, 6, 22), rim, 0, 0, 0, 0, H, 0));
    parts.push(K.g(new THREE.CylinderGeometry(0.024, 0.024, 0.075, 8), '#eef1f5', 0, 0, 0, 0, 0, H));
    const sl = (WR - TYRE * 2) * 2;
    for (let i = 0; i < 4; i++) parts.push(K.g(new THREE.BoxGeometry(0.006, sl, 0.006), '#dfe5ec', 0, 0, 0, (i * Math.PI) / 4, 0, 0));
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + 0.2, r = 0.085 + (i % 3) * 0.022;
      parts.push(K.g(new THREE.SphereGeometry(0.017, 6, 5), BEADS[i % BEADS.length], i % 2 ? 0.012 : -0.012, Math.cos(a) * r, Math.sin(a) * r));
    }
    return parts;
  }
  function mudguard(z, start, arc, color) {
    const K = DU.rideKit;
    return K.g(new THREE.TorusGeometry(WR + 0.022, 0.011, 4, 12, arc), color, 0, WR, z, start, Math.PI / 2, 0, 1, 1, 3.2);
  }
  function backpackParts() {
    const K = DU.rideKit, P = K.PAL, parts = [];
    parts.push(K.g(new THREE.BoxGeometry(0.2, 0.22, 0.11), P.purple, 0, 0.11, 0));
    parts.push(K.g(new THREE.CylinderGeometry(0.1, 0.1, 0.11, 10, 1, false, 0, Math.PI), P.purple, 0, 0.22, 0, 0, Math.PI / 2, Math.PI / 2));
    parts.push(K.g(new THREE.BoxGeometry(0.15, 0.1, 0.03), P.pink, 0, 0.08, -0.065));
    parts.push(K.g(new THREE.BoxGeometry(0.17, 0.02, 0.02), P.yellow, 0, 0.19, -0.06));
    parts.push(K.g(new THREE.SphereGeometry(0.022, 8, 6), P.yellow, 0, 0.1, -0.085));
    parts.push(K.g(new THREE.TorusGeometry(0.035, 0.008, 5, 10, Math.PI), P.pink, 0, 0.31, 0));
    return parts;
  }

  function ballParts() {
    const K = DU.rideKit, P = K.PAL, parts = [], r = 0.115, cols = [P.red, P.white, P.blue, P.yellow, P.green, P.white];
    for (let i = 0; i < 6; i++) parts.push(K.g(new THREE.SphereGeometry(r, 5, 10, (i * Math.PI) / 3, Math.PI / 3), cols[i], 0, r + 0.03, 0, 0.5, 0, 0.3));
    return parts;
  }

  /* ---------- the rider ---------- */
  RR.make = async function (state, opts = {}) {
    const T = THREE, K = DU.rideKit, P = K.PAL;
    const R = DU.rig(state.body);
    const bikeColor = opts.bikeColor || P.pink, helmetColor = opts.helmetColor || P.purple;
    const own = []; // what dispose() must free

    const Y = (y) => FOOT_Y + (950 - y) * UNIT;
    const saddleY = Y(R.crotchY) - 0.006;
    const gripY = clamp(Y(R.sY + 14) - 0.2, 0.74, 0.97);
    const target = handTarget(gripY);

    // the riding doll: the same girl without what stands next to her (a pet rides in the crate instead)
    const riding = Object.assign({}, state, { wear: Object.assign({}, state.wear) });
    delete riding.wear.side;
    const [backF, frontF] = await Promise.all([
      buildFace(riding, R, true, helmetColor, target, ['ride', 'wave', 'cheer']),
      buildFace(riding, R, false, helmetColor, target, ['ride', 'wave', 'cheer']),
    ]);
    const pet = await petSprite(state, own);

    const group = new T.Group();
    const shadow = K.blob(0.42, 0.24);
    shadow.scale.set(0.75, 1.9, 1);
    group.add(shadow);
    own.push(shadow.geometry, shadow.material);
    const tilt = new T.Group();
    group.add(tilt);

    /* --- frame (does not move) --- */
    const white = '#ffffff', silver = '#e3e8ee', straw = '#f6dca6', strawD = '#dcb878', saddleC = '#8d76d8';
    const HB = [0, 0.46, 0.32], HT = [0, gripY - 0.05, 0.255], seatTop = [0, saddleY - 0.04, -0.13];
    const fr = [];
    fr.push(tube([0, BB.y, BB.z], seatTop, 0.021, bikeColor));
    fr.push(tube([0, BB.y, BB.z], HB, 0.024, bikeColor));
    fr.push(tube([0, BB.y + 0.16, BB.z - 0.045], [0, HB[1] + 0.05, HB[2] - 0.012], 0.019, bikeColor));
    fr.push(tube(HB, HT, 0.024, bikeColor));
    [-1, 1].forEach((s) => {
      fr.push(tube([s * 0.03, BB.y, BB.z], [s * 0.045, WR, REAR_Z], 0.013, bikeColor));
      fr.push(tube([s * 0.045, WR, REAR_Z], [s * 0.012, BB.y + 0.3, BB.z - 0.085], 0.012, bikeColor));
      fr.push(tube([s * 0.05, WR, REAR_Z], [s * 0.07, 0.505, REAR_Z - 0.06], 0.007, silver, 5)); // rack stays
    });
    fr.push(K.g(new T.CylinderGeometry(0.03, 0.03, 0.07, 8), silver, 0, BB.y, BB.z, 0, 0, Math.PI / 2));
    // saddle
    fr.push(K.g(new T.SphereGeometry(0.07, 10, 6), saddleC, 0, saddleY - 0.022, -0.15, 0, 0, 0, 0.95, 0.34, 1.2));
    fr.push(K.g(new T.SphereGeometry(0.05, 8, 6), saddleC, 0, saddleY - 0.022, -0.07, 0, 0, 0, 0.75, 0.34, 1.1));
        // mudguards
    fr.push(mudguard(REAR_Z, -0.55, 2.55, white));
    // rack + crate
    const rackY = 0.508, cz = -0.525, cw = 0.25, cl = 0.2, chh = 0.105;
    fr.push(K.g(new T.BoxGeometry(0.13, 0.012, 0.3), silver, 0, rackY, cz + 0.05));
    fr.push(K.g(new T.BoxGeometry(cw, 0.012, cl), straw, 0, rackY + 0.012, cz));
    [-1, 1].forEach((s) => {
      for (let i = 0; i < 2; i++) {
        fr.push(K.g(new T.BoxGeometry(0.012, 0.038, cl), i ? straw : strawD, (s * cw) / 2, rackY + 0.037 + i * 0.048, cz));
        fr.push(K.g(new T.BoxGeometry(cw, 0.038, 0.012), i ? straw : strawD, 0, rackY + 0.037 + i * 0.048, cz + (s * cl) / 2));
      }
      [-1, 1].forEach((e) => fr.push(K.g(new T.BoxGeometry(0.018, chh, 0.018), strawD, (s * cw) / 2, rackY + 0.012 + chh / 2, cz + (e * cl) / 2)));
    });
    fr.push(K.g(new T.SphereGeometry(0.022, 8, 6), '#ff5d73', 0, rackY - 0.03, cz - cl / 2 - 0.035, 0, 0, 0, 1.5, 1, 0.5)); // rear reflector
    const frame = K.mesh(fr);
    tilt.add(frame);
    own.push(frame.geometry);

    /* --- wheels --- */
    const rear = K.mesh(wheelParts(P.teal));
    rear.position.set(0, WR, REAR_Z);
    tilt.add(rear);
    own.push(rear.geometry);

    /* --- steering: fork, bar, basket, front wheel --- */
    const SZ = 0.31;
    const steer = new T.Group();
    steer.position.set(0, 0, SZ);
    tilt.add(steer);
    const st = [];
    [-1, 1].forEach((s) => {
      st.push(tube([s * 0.012, HB[1], HB[2] - SZ], [s * 0.045, WR, FRONT_Z - SZ], 0.013, bikeColor));
      st.push(tube([0, gripY, 0.25 - SZ], [s * 0.12, gripY + 0.022, 0.235 - SZ], 0.014, silver));
      st.push(tube([s * 0.12, gripY + 0.022, 0.235 - SZ], [s * GRIP.x, gripY, 0.145 - SZ], 0.014, silver));
      st.push(tube([s * GRIP.x, gripY, 0.15 - SZ], [s * GRIP.x, gripY - 0.004, 0.035 - SZ], 0.021, P.teal, 8));
      st.push(K.g(new T.SphereGeometry(0.024, 8, 6), P.yellow, s * GRIP.x, gripY - 0.004, 0.032 - SZ));
    });
    st.push(tube(HT, [0, gripY, 0.25], 0.016, silver).translate(0, 0, -SZ));
    // basket with flowers
    const bkY = gripY - 0.15, bkZ = 0.44 - SZ;
    st.push(K.g(new T.CylinderGeometry(0.135, 0.105, 0.15, 10), straw, 0, bkY, bkZ, 0, 0, 0, 1, 1, 0.72));
    st.push(K.g(new T.CylinderGeometry(0.139, 0.139, 0.022, 10), strawD, 0, bkY + 0.07, bkZ, 0, 0, 0, 1, 1, 0.72));
    st.push(K.g(new T.CylinderGeometry(0.122, 0.122, 0.024, 10), '#b98f55', 0, bkY + 0.071, bkZ, 0, 0, 0, 1, 1, 0.72));
    st.push(tube([0, gripY - 0.05, 0.27 - SZ], [0, bkY + 0.02, bkZ - 0.08], 0.01, silver, 5));
    const fl = [[-0.07, 0.03, P.pink], [0.06, 0.02, P.yellow], [0, 0.045, white], [0.09, -0.03, P.purple], [-0.1, -0.02, P.orange]];
    const petal = new T.SphereGeometry(0.017, 6, 4), heart = new T.SphereGeometry(0.012, 6, 4);
    const flower = (x, y, z, c, tiltX, r = 0.021) => {
      const f = [K.g(heart, c === P.yellow ? P.orange : P.yellow, 0, 0.006, 0)];
      for (let i = 0; i < 5; i++) f.push(K.g(petal, c, Math.cos(i * 1.2566) * r, 0, Math.sin(i * 1.2566) * r, 0, 0, 0, 1, 0.55, 1));
      const m = new T.Matrix4().makeRotationX(tiltX).setPosition(x, y, z);
      f.forEach((g) => st.push(g.applyMatrix4(m)));
    };
    fl.forEach(([x, z, c], i) => {
      st.push(tube([x * 0.6, bkY + 0.06, bkZ + z * 0.6], [x, bkY + 0.115 + (i % 2) * 0.02, bkZ + z], 0.004, P.green, 4));
      flower(x, bkY + 0.118 + (i % 2) * 0.02, bkZ + z, c, 0.25 - z * 4);
    });
    [[-0.055, P.pink], [0.055, white], [0, P.yellow]].forEach(([x, c]) => flower(x, bkY + 0.012, bkZ + 0.1 - Math.abs(x) * 0.12, c, Math.PI / 2, 0.018));
    st.push(mudguard(FRONT_Z - SZ, 0.75, 2.0, white));
    const steerMesh = K.mesh(st);
    steer.add(steerMesh);
    own.push(steerMesh.geometry);
    const front = K.mesh(wheelParts(P.teal));
    front.position.set(0, WR, FRONT_Z - SZ);
    steer.add(front);
    own.push(front.geometry);
    // bell
    const bellM = K.mesh([K.g(new T.SphereGeometry(0.03, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#f4f6f9', 0, 0, 0), K.g(new T.SphereGeometry(0.008, 6, 4), P.pink, 0, 0.031, 0)]);
    bellM.position.set(-0.115, gripY + 0.034, 0.238 - SZ);
    steer.add(bellM);
    own.push(bellM.geometry);
    const ringMat = new T.MeshBasicMaterial({ color: '#fff6c4', transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide, fog: false });
    const ringGeo = new T.TorusGeometry(0.07, 0.008, 5, 18);
    const rings = [0, 1].map(() => { const m = new T.Mesh(ringGeo, ringMat.clone()); m.visible = false; bellM.add(m); own.push(m.material); return m; });
    own.push(ringMat, ringGeo);
    // streamers on the grips
    const SC = [P.pink, P.yellow, P.teal, white, P.purple];
    const streamers = [-1, 1].map((s) => {
      const piv = new T.Group();
      piv.position.set(s * GRIP.x, gripY - 0.004, 0.03 - SZ);
      const strips = SC.map((c, i) => {
        const g = new T.PlaneGeometry(0.014, 0.15 + (i % 3) * 0.025).toNonIndexed();
        g.translate(0, -(0.075 + (i % 3) * 0.0125), 0);
        g.rotateY(i * 1.3);
        g.rotateX(((i - 2) * 0.16));
        g.rotateZ(((i % 2 ? 1 : -1) * 0.12) + s * 0.1);
        return K.paint(g, c);
      });
      const m = new T.Mesh(K.merge(strips), K.vmat({ side: T.DoubleSide }));
      piv.add(m);
      steer.add(piv);
      own.push(m.geometry);
      return piv;
    });

    /* --- cranks and pedals --- */
    const crank = K.mesh([
      K.g(new T.CylinderGeometry(0.058, 0.058, 0.008, 12), P.yellow, 0.04, 0, 0, 0, 0, Math.PI / 2),
      tube([0.05, 0, 0], [0.05, 0, -CRANK], 0.009, silver, 5), tube([-0.05, 0, 0], [-0.05, 0, CRANK], 0.009, silver, 5),
    ]);
    crank.position.set(0, BB.y, BB.z);
    tilt.add(crank);
    own.push(crank.geometry);
    const pedalGeo = K.merge([K.g(new T.BoxGeometry(0.075, 0.018, 0.06), white, 0, 0, 0), K.g(new T.BoxGeometry(0.078, 0.008, 0.02), P.yellow, 0, 0, 0)]);
    own.push(pedalGeo);
    const pedals = [-1, 1].map((s) => { const m = new T.Mesh(pedalGeo, K.vmat()); m.userData.s = s; tilt.add(m); return m; });

    /* --- in the crate: her pet, or the school bag --- */
    let petPivot = null;
    if (pet) {
      petPivot = new T.Group();
      petPivot.position.set(0, rackY + 0.035, cz + 0.01);
      pet.rotation.y = Math.PI; // it looks back at the camera
      petPivot.add(pet);
      tilt.add(petPivot);
    } else {
      const wornBag = state.wear && state.wear.bag && ['bag_backpack', 'bag_randoseru', 'bag_guitar'].includes(state.wear.bag.id);
      const bag = K.mesh(wornBag ? ballParts() : backpackParts()); // her school bag — or a ball, when the bag is already on her back
      bag.scale.setScalar(0.8);
      bag.position.set(0, rackY + 0.02, cz);
      tilt.add(bag);
      own.push(bag.geometry);
    }

    /* --- the safety flag on its springy pole --- */
    const flag = new T.Group();
    flag.position.set(cw / 2, rackY, cz - cl / 2);
    const poleH = 0.98, FLAG_TILT = -0.13; // the pole leans out so it does not cross her head
    const pole = K.mesh([tube([0, 0, 0], [0, poleH, 0], 0.007, white, 5), K.g(new T.SphereGeometry(0.016, 6, 5), P.yellow, 0, poleH + 0.01, 0)]);
    const pg = new T.BufferGeometry();
    pg.setAttribute('position', new T.BufferAttribute(new Float32Array([0, 0.07, 0, 0, -0.07, 0, 0, 0, -0.23]), 3));
    pg.computeVertexNormals();
    const pennant = new T.Mesh(pg, new T.MeshBasicMaterial({ color: P.orange, side: T.DoubleSide }));
    pennant.position.y = poleH - 0.09;
    flag.add(pole, pennant);
    tilt.add(flag);
    own.push(pole.geometry, pg, pennant.material);

    /* --- the doll: two faces --- */
    const doll = new T.Group();
    doll.position.z = DZ;
    tilt.add(doll);
    const pivotY = saddleY;
    function face(F, isBack) {
      const g = new T.Group();
      if (isBack) g.rotation.y = Math.PI;
      const tex = {};
      Object.keys(F.upper).forEach((k) => { tex[k] = texOf(F.upper[k]); own.push(tex[k]); });
      const up = new T.Group();
      up.position.y = pivotY;
      const geo = quadGeo(VB[0], VB[1], VB[0] + VB[2], VB[1] + VB[3], FOOT_Y - pivotY);
      const mat = dollMat(tex.ride);
      const upper = new T.Mesh(geo, mat);
      up.add(upper);
      g.add(up);
      own.push(geo, mat);
      const legs = [];
      if (F.split !== null) {
        const bt = texOf(F.body), lm = dollMat(bt);
        own.push(bt, lm);
        const yTop = F.split - 1.5, yBot = VB[1] + VB[3];
        [-1, 1].forEach((qs) => {
          const lg = quadGeo(qs < 0 ? VB[0] : 375, yTop, qs < 0 ? 375 : VB[0] + VB[2], yBot, FOOT_Y);
          const m = new T.Mesh(lg, lm);
          m.position.z = -0.004;
          m.frustumCulled = false;
          g.add(m);
          own.push(lg);
          const pos = lg.attributes.position;
          legs.push({ pos, qs, world: (isBack ? -1 : 1) * qs, top: pos.getY(0), bot: pos.getY(2), x0: pos.getX(2), x1: pos.getX(3) });
        });
      }
      doll.add(g);
      return { up, upper, mat, tex, legs };
    }
    const faces = [face(backF, true), face(frontF, false)];
    const legTop = backF.split !== null ? Y(backF.split - 1.5) : FOOT_Y;
    const legLen = Math.max(0.001, legTop - FOOT_Y);
    const amp = Math.min(CRANK, legLen * 0.22); // how far the feet travel (short when only her shoes show under a gown)
    const shear = (PEDX - 24 * UNIT) * clamp(legLen / 0.3, 0, 1);

    /* --- motion --- */
    let phase = 0.6, lean = 0, bar = 0, wheelA = 0, time = 0, bellT = 0, flagA = 0, flagV = 0, pose = 'ride', lastSteer = 0, sp = 0;
    function placeLegs() {
      pedals.forEach((p) => {
        const a = phase + (p.userData.s > 0 ? 0 : Math.PI);
        p.position.set(p.userData.s * PEDX, BB.y + CRANK * Math.sin(a), BB.z - CRANK * Math.cos(a));
      });
      faces.forEach((f) => f.legs.forEach((l) => {
        const a = phase + (l.world > 0 ? 0 : Math.PI);
        const footY = FOOT_Y + amp * (1 + Math.sin(a));
        const sc = (l.top - footY) / (l.top - FOOT_Y);
        const y = l.top - (l.top - l.bot) * sc, dx = l.qs * shear;
        l.pos.setXYZ(2, l.x0 + dx, y, 0);
        l.pos.setXYZ(3, l.x1 + dx, y, 0);
        l.pos.needsUpdate = true;
      }));
    }
    function update(dt, s = {}) {
      const speed = Math.max(0, s.speed || 0), steerIn = clamp(s.steer || 0, -1, 1);
      time += dt;
      sp += (speed - sp) * Math.min(1, dt * 6);
      const go = clamp(sp / 5, 0, 1);
      if (!s.braking) phase += speed * dt * 1.25;
      wheelA += (speed * dt) / WR;
      rear.rotation.x = wheelA;
      front.rotation.x = wheelA;
      crank.rotation.x = phase;
      placeLegs();
      // lean into the turn, turn the bar
      lean += (steerIn * 0.2 * (0.35 + 0.65 * go) - lean) * Math.min(1, dt * 7);
      bar += (-steerIn * 0.24 - bar) * Math.min(1, dt * 9);
      tilt.rotation.z = lean;
      steer.rotation.y = bar;
      tilt.position.y = Math.sin(phase * 2) * 0.004 * go;
      const sway = Math.sin(phase) * 0.022 * go;
      faces.forEach((f, i) => (f.up.rotation.z = i ? sway : -sway));
      // streamers trail behind with speed and flutter
      streamers.forEach((piv, i) => {
        piv.rotation.x = 0.15 + go * 1.05 + Math.sin(time * 17 + i * 2) * 0.12 * (0.2 + go);
        piv.rotation.z = Math.sin(time * 11 + i) * 0.1 * (0.2 + go) + lean * 0.5;
      });
      // the flag: a spring that answers to turning, bends back with speed
      const push = (steerIn - lastSteer) / Math.max(dt, 0.001);
      lastSteer = steerIn;
      flagV += (-flagA * 60 - flagV * 5 + push * 0.5 - lean * 20) * dt;
      flagA = clamp(flagA + flagV * dt, -0.5, 0.5);
      flag.rotation.z = FLAG_TILT + flagA;
      flag.rotation.x = -go * 0.16 + Math.sin(time * 9) * 0.02 * go;
      pennant.rotation.y = Math.sin(time * 14) * 0.5 * (0.15 + go);
      pennant.rotation.z = -go * 0.1;
      if (petPivot) {
        petPivot.position.y = rackY + 0.035 + Math.abs(Math.sin(phase)) * 0.016 * go + Math.abs(Math.sin(time * 3.1)) * 0.004;
        petPivot.rotation.z = Math.sin(phase + 0.6) * 0.07 * go + Math.sin(time * 2.3) * 0.03;
      }
      shadow.scale.set(0.75 + Math.abs(lean) * 0.5, 1.9, 1);
      // the bell
      if (bellT > 0) {
        bellT = Math.max(0, bellT - dt);
        const k = 1 - bellT / 0.55;
        bellM.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.45);
        bellM.rotation.z = Math.sin(k * 40) * 0.25 * (1 - k);
        rings.forEach((r, i) => {
          const kk = clamp(k * 1.3 - i * 0.25, 0, 1);
          r.visible = kk > 0 && kk < 1;
          r.scale.setScalar(0.4 + kk * 1.3);
          r.position.y = 0.05 + kk * 0.13;
          r.rotation.x = -0.35;
          r.material.opacity = (1 - kk) * 0.95;
        });
      } else if (rings[0].visible) rings.forEach((r) => (r.visible = false));
    }
    placeLegs();

    return {
      group,
      height: Y(R.headY - 147 * R.hs),
      update,
      pose(name) {
        pose = name === 'wave' || name === 'cheer' ? name : 'ride';
        faces.forEach((f) => { f.mat.map = f.tex[pose] || f.tex.ride; f.mat.needsUpdate = true; });
      },
      bell() { bellT = 0.55; },
      dispose() {
        if (group.parent) group.parent.remove(group);
        own.forEach((o) => o && o.dispose && o.dispose());
      },
    };
  };

  /* ---------- a standing paper doll ---------- */
  RR.doll = async function (state, opts = {}) {
    const K = DU.rideKit, R = DU.rig(state.body);
    const vb = [42, 70, 666, 896], h = opts.res || 640, w = Math.round((h * vb[2]) / vb[3]);
    const root = svgEl(DU.renderCharacter(state, { rig: true, heldTag: true }), vb, w, h);
    R_OF.set(root, R);
    const pose = opts.pose && opts.pose !== 'rest' ? opts.pose : null;
    if (pose) {
      const Pz = DU.safePose(state, pose);
      if (Pz.armL) setArm(root, 'l', Pz.armL[0], Pz.armL[1]);
      if (Pz.armR) setArm(root, 'r', Pz.armR[0], Pz.armR[1]);
      setHead(root, Pz.head || 0);
    }
    const canvas = await rasterise(serial(root), w, h);
    const k = (opts.h || 1.3) / (R.ground - R.headTop); // metres per body unit for this doll
    const g = new THREE.PlaneGeometry(vb[2] * k, vb[3] * k);
    g.translate((vb[0] + vb[2] / 2 - 375) * k, (950 - (vb[1] + vb[3] / 2)) * k, 0);
    const tex = texOf(canvas);
    const mesh = new THREE.Mesh(g, dollMat(tex, THREE.DoubleSide));
    const grp = new THREE.Group();
    grp.add(mesh, K.blob(0.26 * ((opts.h || 1.3) / 1.3), 0.26));
    grp.userData.h = opts.h || 1.3;
    grp.userData.dispose = () => { tex.dispose(); g.dispose(); mesh.material.dispose(); grp.children[1].geometry.dispose(); grp.children[1].material.dispose(); };
    return grp;
  };

  /* ---------- random friends ---------- */
  RR.friends = function (n, seed = 1, notKind) {
    const rnd = DU.rideKit ? DU.rideKit.rng(seed * 7919 + 13) : Math.random;
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const free = (slot) => DU.items.filter((it) => it.slot === slot && !it.price);
    const wearOf = (it) => (it.fixed ? { id: it.id } : { id: it.id, c: rnd() < 0.55 ? pick(DU.PALETTE) : it.color });
    const girls = DU.GIRLS.slice();
    const out = [];
    for (let i = 0; i < n; i++) {
      if (!girls.length) girls.push(...DU.GIRLS);
      const g = girls.splice(Math.floor(rnd() * girls.length), 1)[0];
      const s = DU.defaultState();
      Object.assign(s, { base: g.id, skin: g.skin, face: g.face, eyes: Object.assign({}, g.eyes), brows: g.brows, mouth: pick(['smile', 'big', 'grin', g.mouth]), hair: Object.assign({}, g.hair) });
      Object.assign(s.makeup, g.makeup || {});
      if (rnd() < 0.5) s.hair.style = pick(DU.HAIRS.filter((x) => !x.price)).id;
      if (rnd() < 0.3) s.hair.color = pick(DU.HAIR_COLORS);
      s.body = { h: Math.round((rnd() * 2 - 1.2) * 2) / 2, m: 0 };
      const w = {};
      if (rnd() < 0.4) w.dress = wearOf(pick(free('dress')));
      else { w.top = wearOf(pick(free('top'))); w.bottom = wearOf(pick(free('bottom'))); }
      w.shoes = wearOf(pick(free('shoes')));
      if (rnd() < 0.6) w.socks = wearOf(pick(free('socks')));
      if (rnd() < 0.45) w.hairacc = wearOf(pick(free('hairacc')));
      else if (rnd() < 0.3) w.hat = wearOf(pick(free('hat')));
      if (rnd() < 0.6 && DU.itemById.bag_backpack) w.bag = { id: rnd() < 0.7 ? 'bag_backpack' : 'bag_randoseru', c: pick(DU.PALETTE) };
      if (rnd() < 0.2) w.glasses = wearOf(pick(free('glasses')));
      s.wear = w;
      out.push(s);
    }
    // one of the friends is a special character (a wolf, a capybara…), not the same kind as the rider
    const sp = (DU.SPECIALS || []).filter((x) => x.kind && x.kind !== notKind);
    if (sp.length && n >= 3) {
      const g = sp[Math.floor(rnd() * sp.length)], s = out[2]; // the third friend stands in front, where the camera sees her
      Object.assign(s, { base: g.id, kind: g.kind, skin: g.skin, eyes: Object.assign({}, g.eyes), brows: g.brows, mouth: pick(['smile', 'big', g.mouth]), hair: Object.assign({}, g.hair) });
      s.makeup = { blush: null, shadow: null, lips: null, sparkle: null };
      if (g.wear && !s.wear.hat) s.wear = Object.assign({}, s.wear, g.wear);
    }
    return out;
  };
})();
