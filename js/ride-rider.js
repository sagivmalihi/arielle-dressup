/* ride-rider.js — the girl on her bike for the 3D ride (needs THREE, ride-kit.js, ride-bike.js, render.js, motion.js).
   She stays a flat paper doll fixed to a real 3D bike: one plane shows her BACK (what the chase camera
   sees), one shows her FRONT (intro / arrival). Each is single-sided, so the right one shows from any angle.
   The bike itself is built in ride-bike.js from her bike spec (bike.js).

     DU.rideRider.make(state, opts) → Promise<rider>       opts: { bike: a bike spec }
     DU.rideRider.doll(state, opts) → Promise<Object3D>    a standing paper doll; opts: { h, pose, res, helmet }
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

  /* the bike (metres; +Z forward): where the pedals and the grips are on every bike */
  const { CRANK, PEDX, FOOT_Y, GRIP } = DU.rideBike.DIM;
  const DZ = -0.04; // the plane the doll lives in
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

  /* ---------- the rider ---------- */
  RR.make = async function (state, opts = {}) {
    const T = THREE, K = DU.rideKit, RB = DU.rideBike;
    const R = DU.rig(state.body);
    const spec = DU.bike.norm(opts.bike), helmet = DU.bike.helmetOf(spec);
    const own = []; // what dispose() must free

    const Y = (y) => FOOT_Y + (950 - y) * UNIT;
    const fit = RB.fit(state.body), saddleY = fit.saddleY;
    const target = handTarget(fit.gripY);

    // the riding doll: the same girl without what stands next to her (a pet rides in the crate instead)
    const riding = Object.assign({}, state, { wear: Object.assign({}, state.wear) });
    delete riding.wear.side;
    const [backF, frontF] = await Promise.all([
      buildFace(riding, R, true, helmet, target, ['ride', 'wave', 'cheer']),
      buildFace(riding, R, false, helmet, target, ['ride', 'wave', 'cheer']),
    ]);
    const pet = await petSprite(state, own);

    const group = new T.Group();
    const shadow = K.blob(0.42, 0.24);
    shadow.scale.set(0.75, 1.9, 1);
    group.add(shadow);
    own.push(shadow.geometry, shadow.material);

    /* --- her bike; in the crate her pet, or the school bag (a ball, when the bag is already on her back) --- */
    const wornBag = state.wear && state.wear.bag && ['bag_backpack', 'bag_randoseru', 'bag_guitar'].includes(state.wear.bag.id);
    const bike = RB.build(spec, fit, { cargo: pet ? false : wornBag ? 'ball' : 'bag' });
    const tilt = bike.tilt;
    group.add(tilt);
    let petPivot = null;
    if (pet) {
      petPivot = new T.Group();
      petPivot.position.set(0, bike.crate.y + 0.035, bike.crate.z + 0.01);
      pet.rotation.y = Math.PI; // it looks back at the camera
      petPivot.add(pet);
      tilt.add(petPivot);
    }

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

    /* --- motion: the bike moves itself; her feet follow the pedals --- */
    let pose = 'ride';
    function placeLegs() {
      const phase = bike.phase;
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
      bike.update(dt, s);
      const phase = bike.phase, go = bike.go, time = bike.time;
      placeLegs();
      const sway = Math.sin(phase) * 0.022 * go;
      faces.forEach((f, i) => (f.up.rotation.z = i ? sway : -sway));
      if (petPivot) {
        petPivot.position.y = bike.crate.y + 0.035 + Math.abs(Math.sin(phase)) * 0.016 * go + Math.abs(Math.sin(time * 3.1)) * 0.004;
        petPivot.rotation.z = Math.sin(phase + 0.6) * 0.07 * go + Math.sin(time * 2.3) * 0.03;
      }
      shadow.scale.set(0.75 + Math.abs(bike.lean) * 0.5, 1.9, 1);
    }
    placeLegs();

    return {
      group,
      bike,
      height: Y(R.headY - 147 * R.hs),
      update,
      pose(name) {
        pose = name === 'wave' || name === 'cheer' ? name : 'ride';
        faces.forEach((f) => { f.mat.map = f.tex[pose] || f.tex.ride; f.mat.needsUpdate = true; });
      },
      bell() { bike.bell(); },
      dispose() {
        if (group.parent) group.parent.remove(group);
        bike.dispose();
        own.forEach((o) => o && o.dispose && o.dispose());
      },
    };
  };

  /* ---------- a standing paper doll ---------- */
  RR.doll = async function (state, opts = {}) {
    const K = DU.rideKit, R = DU.rig(state.body);
    const vb = [42, 70, 666, 896], h = opts.res || 640, w = Math.round((h * vb[2]) / vb[3]);
    const root = svgEl(DU.renderCharacter(state, { rig: true, heldTag: true, helmet: opts.helmet || null }), vb, w, h);
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
