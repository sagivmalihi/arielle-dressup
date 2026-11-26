/* render.js — turns a character "state" into layered SVG.
   Layer order (back → front):
     back · hairBack · legs/torso + base outfit · socks · shoes/bottom/top/dress ("body")
     · arms · sleeves · wrist · held · hands · over · headBack · face · hair front/top
     · brows · head · front
   opts.rig = true gives the same picture with the parts in groups that can move
   (see motion.js): all · head · hairback · hairsway · eyes · mouth · brows · arm-l/r · fore-l/r · body.
   opts.back = true (with opts.rig) draws her from behind: no face, the back hair over the body, wings on top,
   mirrored left-right. opts.helmet = a colour puts a bike helmet on her head instead of the hat (front and back).
   opts.only = [slots] draws just those items, with no body and no head (for a pet or a prop on its own).
   opts.heldTag = true (with opts.rig) wraps what she holds in <g data-held="l|r">.
   Items return either a string (goes to their category's default layer) or an object
   { layerName: svg }. Layers named back/body/socks/shoes/sleeves/wrist/held/over/front use
   body coordinates; headBack/head use head coordinates. */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const { n } = DU;

  DU.CARD_W = 750;
  DU.CARD_H = 1000;

  /* slots, in the order their layers stack */
  DU.SLOTS = ['wings', 'socks', 'shoes', 'bottom', 'top', 'dress', 'bracelet', 'bag', 'hand', 'necklace', 'earrings', 'glasses', 'hairacc', 'hat', 'side'];
  const DEFAULT_LAYER = {
    wings: 'back', socks: 'socks', shoes: 'shoes', bottom: 'body', top: 'body', dress: 'body', bracelet: 'wrist',
    bag: 'held', hand: 'held', necklace: 'over', earrings: 'head', glasses: 'head', hairacc: 'head', hat: 'head', side: 'front',
  };
  /* a group whose own origin (0,0) sits at x,y — so rotate()/scale() on it turn around that point */
  const pivot = (x, y, part, inner) =>
    `<g transform="translate(${n(x)} ${n(y)})"><g data-part="${part}"><g transform="translate(${n(-x)} ${n(-y)})">${inner}</g></g></g>`;
  DU.pivot = pivot;

  DU.defaultState = function () {
    return {
      v: 1, base: 'g1', skin: '#ffe3d1', face: 'soft', body: { h: 0, m: 0 },
      eyes: { shape: 'round', color: '#7a4a2b' }, brows: 'soft', mouth: 'smile',
      makeup: { blush: null, shadow: null, lips: null, sparkle: null },
      hair: { style: 'long', color: '#4a2f27' },
      wear: {}, tuck: true, bg: 'bedroom', name: '',
    };
  };

  DU.renderCharacter = function (state, opts = {}) {
    const uid = opts.uid || DU.uid('c');
    const R = DU.rig(state.body);
    const sk = DU.skinPaint(state.skin);
    const defs = [];
    let idc = 0;
    const ctx = {
      uid, R, state, sk, tucked: false,
      id: (name = 'i') => `${uid}${name}${idc++}`,
      /* get a paint for a color spec; box = [x,y,w,h] the gradient should span */
      paint(spec, box) {
        const P = DU.paint(spec, ctx.id('p'), box || [R.cx - 130, R.sY - 20, 260, R.ground - R.sY]);
        if (P.defs) defs.push(P.defs);
        return P;
      },
      defs,
    };
    const L = {}; // layer name → svg
    const only = opts.only || null;
    const rig = !!opts.rig && !only;
    const back = rig && !!opts.back; // seen from behind
    const helmet = opts.helmet || null;
    const armBits = { heldL: '', heldR: '', overL: '', overBoth: '' }; // rig only: things that must move with an arm
    const add = (name, svg, slot) => {
      if (!svg) return;
      if (back && name === 'over' && slot !== 'hand' && slot !== 'bracelet') return; // things on the chest are not seen from behind
      if (back && name === 'head' && slot === 'earrings') name = 'ears';
      if (rig && name === 'held' && slot === 'hand') armBits.heldL += svg;
      else if (rig && name === 'held' && slot === 'bag') armBits.heldR += svg;
      else if (rig && name === 'over' && slot === 'hand') armBits.overL += svg;
      else if (rig && name === 'over' && slot === 'bracelet') armBits.overBoth += svg;
      else L[name] = (L[name] || '') + svg;
    };

    const wear = state.wear || {};
    const itemOf = (slot) => { const w = wear[slot]; return w && DU.itemById && DU.itemById[w.id] ? DU.itemById[w.id] : null; };
    const drawItem = (slot) => {
      const it = itemOf(slot);
      if (!it) return null;
      if (only && !only.includes(slot)) return null;
      if ((helmet && slot === 'hat') || (back && (slot === 'glasses' || slot === 'necklace' || slot === 'side'))) return null;
      const spec = it.fixed ? it.color : wear[slot].c || it.color || '#ff9ac1';
      const isHead = ['earrings', 'glasses', 'hairacc', 'hat'].includes(slot);
      const P = ctx.paint(spec, isHead ? [-110, -200, 220, 330] : null);
      let out;
      try { out = it.draw(R, P, ctx); } catch (e) { console.error('item draw failed', it.id, e); out = ''; }
      if (typeof out === 'string') out = { [DEFAULT_LAYER[slot]]: out };
      return out || {};
    };

    const top = itemOf('top'), bottom = itemOf('bottom'), dress = itemOf('dress'), shoes = itemOf('shoes'), hat = helmet ? null : itemOf('hat');
    ctx.tucked = !!(top && bottom && !dress && !top.noTuck && (state.tuck || bottom.forceTuck));
    ctx.hasBottom = !!bottom && !dress;

    // body garments: order depends on tuck + boots
    let seq;
    if (dress) seq = ['shoes', 'dress'];
    else {
      const lower = shoes && shoes.tall && bottom && bottom.tight ? ['bottom', 'shoes'] : ['shoes', 'bottom'];
      seq = ctx.tucked ? ['top', ...lower] : [...lower, 'top'];
    }
    let bodyLayer = '';
    const others = {};
    const take = (slot, mainNames) => {
      const out = drawItem(slot);
      if (!out) return;
      Object.keys(out).forEach((k) => {
        if (mainNames.includes(k)) bodyLayer += out[k];
        else others[k] = (others[k] || '') + out[k];
      });
      // a sticker on the chest of a top / dress (fabric.js)
      const stk = !back && (slot === 'top' || slot === 'dress') && wear[slot] && wear[slot].st;
      if (stk && DU.stickerSvg) { try { bodyLayer += DU.stickerSvg(R, stk, ctx) || ''; } catch (e) { console.error('sticker failed', e); } }
    };
    const socksOut = drawItem('socks');
    if (socksOut) Object.keys(socksOut).forEach((k) => add(k, socksOut[k], 'socks'));
    seq.forEach((slot) => take(slot, ['body', 'shoes']));
    Object.keys(others).forEach((k) => add(k, others[k]));
    ['wings', 'bracelet', 'bag', 'hand', 'necklace', 'earrings', 'glasses', 'hairacc', 'hat', 'side'].forEach((slot) => {
      const out = drawItem(slot);
      if (out && back) { // from behind: a cross-body bag hangs on her back, a parrot still sits on her shoulder
        if (slot === 'bag' && out.over && !out.back) out.back = out.over;
        if (slot === 'wings' && out.front) { out.back = (out.back || '') + out.front; delete out.front; }
      }
      if (out) Object.keys(out).forEach((k) => add(k, out[k], slot));
    });

    // hair
    const hairStyle = (DU.HAIRS || []).find((x) => x.id === (state.hair && state.hair.style)) || (DU.HAIRS || [])[0];
    const hairSpec = (state.hair && state.hair.color) || '#4a2f27';
    const HP = DU.paint(hairSpec, uid + 'hair', [-110, -130, 200, 420]);
    if (HP.defs) defs.push(HP.defs);
    const browColor = DU.mix(HP.base, '#2b1630', DU.lum(HP.base) > 0.6 ? 0.5 : 0.35);
    const hairBack = hairStyle && hairStyle.back ? hairStyle.back(HP) : '';
    const hairFront = hairStyle && hairStyle.front ? hairStyle.front(HP) : '';
    const hairTop = hairStyle && hairStyle.top && !(hat && hat.coversTop) ? hairStyle.top(HP) : '';

    const headT = `translate(${n(R.cx)} ${n(R.headY)}) scale(${R.hs})`;
    const head = (svg) => (svg ? `<g transform="${headT}">${svg}</g>` : '');

    const helmetSvg = helmet ? DU.drawHelmet(helmet, back) : '';
    if (only) {
      const bits = [L.back, L.socks, bodyLayer, L.sleeves, L.wrist, L.held, L.over, head((L.headBack || '') + (L.head || '')), L.front].filter(Boolean).join('');
      return `<g stroke-linejoin="round" stroke-linecap="round" fill="none"><defs>${defs.join('')}</defs>${bits}</g>`;
    }

    const mk = state.makeup || {};
    const eyes = state.eyes || {};
    const face = opts.noHead ? '' :
      DU.body.head(sk, state.face) +
      DU.drawMakeupUnder(mk, eyes.shape, uid, sk) +
      DU.drawEyes(eyes.shape, eyes.color || '#7a4a2b', uid) +
      DU.drawMouth(state.mouth, mk.lips) +
      DU.drawMakeupOver(mk);

    if (rig) {
      const eyeColor = eyes.color || '#7a4a2b';
      const rface =
        DU.body.head(sk, state.face) + DU.drawMakeupUnder(mk, eyes.shape, uid, sk) +
        pivot(0, 8, 'eyes', DU.drawEyes(eyes.shape, eyeColor, uid)) +
        `<g data-part="mouth">${DU.drawMouth(state.mouth, mk.lips)}</g>` + DU.drawMakeupOver(mk);
      const headInner = `<g transform="${headT}">${(L.headBack || '') + rface + hairFront + hairTop}<g data-part="brows">${DU.drawBrows(state.brows, browColor)}</g>${L.head || ''}${helmetSvg}</g>`;
      const nx = R.cx, ny = R.neckY + 6;
      /* opts.heldTag: the things in her hands get their own <g data-held="l|r"> so they can be placed apart from the arm */
      const held = (side, svg) => (opts.heldTag && svg ? `<g data-held="${side}">${svg}</g>` : svg);
      const ARM = DU.body.arms(R, sk) + (L.sleeves || '');
      const hands = DU.body.hands(R, sk);
      const arm = (s) => {
        const S = R.shoulder(s), E = R.elbow(s), side = s > 0 ? 'r' : 'l';
        const x0 = s > 0 ? R.cx : R.cx - 460;
        const cu = `${uid}cu${side}`, cf = `${uid}cf${side}`, cs = `${uid}cs${side}`, cj = `${uid}cj${side}`;
        defs.push(
          `<clipPath id="${cu}"><rect x="${x0}" y="-300" width="460" height="${n(E.y + 300.8)}"/></clipPath>` +
          `<clipPath id="${cf}"><rect x="${x0}" y="${n(E.y)}" width="460" height="1400"/></clipPath>` +
          `<clipPath id="${cs}"><rect x="${x0}" y="-300" width="460" height="1700"/></clipPath>` +
          `<clipPath id="${cj}"><circle cx="${n(E.x)}" cy="${n(E.y)}" r="${n(R.arm(0.5).w + 7)}"/></clipPath>`
        );
        // the elbow: a round patch of the same arm (skin or sleeve), turned half way, fills the gap when the arm bends
        const joint = `<g style="display:none" data-joint="${side}">${pivot(E.x, E.y, 'joint-' + side, `<g clip-path="url(#${cj})">${ARM}</g>`)}</g>`;
        const fore = pivot(E.x, E.y, 'fore-' + side,
          `<g clip-path="url(#${cf})">${ARM}</g><g clip-path="url(#${cs})">${L.wrist || ''}</g>${s < 0 ? held('l', armBits.heldL) : held('r', armBits.heldR)}` +
          `<g clip-path="url(#${cs})">${hands}${armBits.overBoth}</g>${s < 0 ? held('l', armBits.overL) : ''}`);
        return pivot(S.x, S.y, 'arm-' + side, joint + `<g clip-path="url(#${cu})">${ARM}</g>` + fore);
      };
      /* from behind: the front locks hide behind the body, wings and the back hair come on top, the skull wears a cap of hair */
      const headG = (inner) => pivot(nx, ny, 'head', `<g data-part="headbob"><g transform="${headT}">${inner}</g></g>`);
      const partsB = !back ? '' :
        (opts.noHead ? '' : pivot(nx, ny, 'hairback', head(hairFront))) +
        `<g data-part="body">${DU.body.lower(R, sk) + (L.socks || '') + bodyLayer}</g>` +
        arm(-1) + arm(1) + (L.held || '') +
        `<g data-part="back">${L.back || ''}</g>` +
        (opts.noHead ? '' :
          headG((L.headBack || '') + DU.body.head(sk, state.face) + DU.drawHairCap(HP) + (L.ears || '')) +
          pivot(nx, ny, 'hairback', `<g data-part="hairbob">${pivot(R.cx, R.headTop, 'hairsway', head(hairBack))}</g>`) +
          headG(hairTop + (L.head || '') + helmetSvg));
      const partsR = back ? `<g transform="matrix(-1 0 0 1 ${n(2 * R.cx)} 0)">${partsB}</g>` :
        `<g data-part="back">${L.back || ''}</g>` +
        (opts.noHead ? '' : pivot(nx, ny, 'hairback', `<g data-part="hairbob">${pivot(R.cx, R.headTop, 'hairsway', head(hairBack))}</g>`)) +
        `<g data-part="body">${DU.body.lower(R, sk) + (L.socks || '') + bodyLayer}</g>` +
        arm(-1) + arm(1) + (L.held || '') +
        `<g data-part="over">${L.over || ''}</g>` +
        (opts.noHead ? '' : pivot(nx, ny, 'head', `<g data-part="headbob">${headInner}</g>`)) +
        `<g data-part="front">${L.front || ''}</g>`;
      return `<g class="du-char" data-uid="${uid}" data-eye-shape="${eyes.shape}" data-eye-color="${eyeColor}" data-mouth="${state.mouth}" data-lips="${mk.lips || ''}" ` +
        `stroke-linejoin="round" stroke-linecap="round" fill="none"><defs>${defs.join('')}</defs>${pivot(R.cx, R.ground, 'all', partsR)}</g>`;
    }

    const headSvg = opts.noHead ? '' : head((L.headBack || '') + face + hairFront + hairTop + DU.drawBrows(state.brows, browColor) + (L.head || '') + helmetSvg);
    const parts = [
      L.back, opts.noHead ? '' : head(hairBack),
      DU.body.lower(R, sk), L.socks, bodyLayer,
      DU.body.arms(R, sk), L.sleeves, L.wrist, L.held, DU.body.hands(R, sk), L.over,
      headSvg,
      L.front,
    ].filter(Boolean).join('');

    return `<g stroke-linejoin="round" stroke-linecap="round" fill="none"><defs>${defs.join('')}</defs>${parts}</g>`;
  };

  /* the cap of hair that covers the skull when she is seen from behind (head coordinates) */
  DU.drawHairCap = function (HP) {
    const cap = DU.sym(0, [[0, -113], [49, -113, 84, -77, 84, -24], [84, 12, 78, 38, 62, 58], [46, 72, 20, 77, 0, 77]]);
    return DU.p(cap, HP.fill, HP.line, 2.4) +
      DU.ov(DU.sym(0, [[0, 34], [74, 34], [70, 50, 62, 58, 62, 58], [46, 72, 20, 77, 0, 77]]), DU.SH) +
      DU.p('M-34 30Q-30 54 -20 70M0 34V74M34 30Q30 54 20 70', 'none', HP.line, 1.6, 'stroke-opacity=".4"');
  };

  /* a bike helmet in head coordinates (drawn over the hair). back = seen from behind */
  DU.drawHelmet = function (color, back) {
    const line = DU.line(color), dark = DU.mix(color, '#2b1630', 0.5), light = DU.light(color, 0.55);
    const strapC = '#6b6480', strapL = '#d9d5ea';
    const vent = (a, len, w, cy0) => `<g transform="rotate(${a} 0 -36)">` +
      DU.p(`M${-w} ${n(cy0)}Q0 ${n(cy0 - w * 1.5)} ${w} ${n(cy0)}L${n(w * 0.8)} ${n(cy0 + len)}Q0 ${n(cy0 + len + w * 1.3)} ${n(-w * 0.8)} ${n(cy0 + len)}Z`, dark, line, 2) + '</g>';
    const strap = (d) => DU.p(d, 'none', strapC, 5.4) + DU.p(d, 'none', strapL, 1.6, 'stroke-opacity=".8" stroke-dasharray="4 5"');
    if (back) {
      const shell = DU.sym(0, [[0, -147], [63, -147, 105, -112, 103, -50], [103, -18, 86, 2, 58, 9], [38, 13, 16, 14, 0, 14]]);
      return strap('M-97 -30Q-96 10 -84 40') + strap('M97 -30Q96 10 84 40') +
        DU.p(shell, color, line, 2.6) +
        DU.ov(DU.sym(0, [[0, -22], [100, -34], [102, -14, 86, 2, 58, 9], [38, 13, 16, 14, 0, 14]]), DU.SH) +
        vent(0, 44, 6, -134) + vent(-27, 40, 5.5, -130) + vent(27, 40, 5.5, -130) + vent(-52, 26, 5, -124) + vent(52, 26, 5, -124) +
        DU.p('M-96 -30Q-60 -12 0 -10Q60 -12 96 -30', 'none', light, 3, 'stroke-opacity=".75"') +
        DU.star(0, -44, 15, '#fff6c2', line, 2) +
        `<rect x="-11" y="-3" width="22" height="11" rx="5" fill="${dark}" stroke="${line}" stroke-width="2"/>` +
        DU.ov('M-86 -84Q-74 -122 -40 -138Q-70 -116 -78 -78Z', DU.HL);
    }
    const shell = DU.sym(0, [[0, -147], [63, -147, 105, -112, 103, -52], [103, -40, 97, -33, 89, -32], [66, -50, 32, -61, 0, -61]]);
    return strap('M-92 -36Q-92 34 -20 86') + strap('M92 -36Q92 34 20 86') +
      `<rect x="-10" y="80" width="20" height="11" rx="4" fill="#ffffff" stroke="${strapC}" stroke-width="2"/>` +
      DU.p('M-66 -52Q0 -74 66 -52Q40 -34 0 -36Q-40 -34 -66 -52Z', dark, line, 2.2) +
      DU.p(shell, color, line, 2.6) +
      vent(0, 40, 6, -134) + vent(-27, 36, 5.5, -130) + vent(27, 36, 5.5, -130) + vent(-52, 22, 5, -124) + vent(52, 22, 5, -124) +
      DU.p('M-91 -38Q-62 -54 0 -64Q62 -54 91 -38', 'none', light, 3, 'stroke-opacity=".75"') +
      DU.star(-74, -66, 9, '#fff6c2', line, 1.8) +
      DU.ov('M-86 -84Q-74 -122 -40 -138Q-70 -116 -78 -78Z', DU.HL);
  };

  /* Where the character stands on the card: feet a little above the bottom edge (room for the
     name ribbon), scaled so even the tallest girl in a tall hat fits. */
  DU.FEET_Y = 912;
  DU.charScale = function (state) {
    const R = DU.rig(state.body);
    return Math.min(1.14, 898 / (950 - (R.headY - 182)));
  };
  DU.charTransform = (state) => `translate(375 ${DU.FEET_Y}) scale(${Math.round(DU.charScale(state) * 1000) / 1000}) translate(-375 -950)`;
  /* where the head centre lands on the card (0…1 of the card height), for the face zoom */
  DU.headCenterY = function (state) {
    const R = DU.rig(state.body);
    return (DU.FEET_Y + (R.headY + 6 - 950) * DU.charScale(state)) / 1000;
  };

  /* Small previews. They use the raw rig coordinates of the default body (no card scaling). */
  DU.THUMB_BOX = {
    top: '250 428 250 250', bottom: '185 530 380 430', dress: '125 425 500 540', shoes: '290 800 170 165', socks: '235 655 280 305',
    hat: '215 100 320 350', hairacc: '225 130 300 330', glasses: '290 305 170 130', earrings: '265 300 220 180', necklace: '290 395 170 160',
    bracelet: '255 515 240 200', bag: '250 395 310 340', hand: '150 400 290 330', wings: '115 290 520 540', side: '476 628 232 332',
    hair: '205 200 340 400', face: '283 262 184 190', girl: '225 205 300 400',
  };
  const BODY_SLOTS = ['top', 'bottom', 'dress', 'shoes', 'socks', 'necklace', 'bracelet', 'bag', 'hand', 'side']; // drawn without the head, so long hair never hides the item
  DU.renderThumb = function (state, kind) {
    const uid = DU.uid('t');
    const s = Object.assign({}, state, { body: { h: 0, m: 0 } });
    const inner = DU.renderCharacter(s, { uid, noHead: BODY_SLOTS.includes(kind) });
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${DU.THUMB_BOX[kind] || DU.THUMB_BOX.girl}" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
  };
  DU.renderBgThumb = function (bg) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1000" preserveAspectRatio="xMidYMid slice">${bg.draw(DU.uid('b'))}</svg>`;
  };

  /* The whole card: background + character (+ optional name ribbon). Returns <svg> markup. */
  DU.renderCard = function (state, opts = {}) {
    const uid = opts.uid || DU.uid('k');
    const bg = (DU.backgrounds || []).find((b) => b.id === state.bg) || (DU.backgrounds || [])[0];
    let bgSvg = `<rect width="750" height="1000" fill="#fde9f3"/>`;
    if (bg && !opts.noBg) { try { bgSvg = bg.draw(uid + 'bg'); } catch (e) { console.error('bg failed', e); } }
    const ch = `<g data-part="place" transform="${DU.charTransform(state)}">${DU.renderCharacter(state, { uid, rig: opts.rig })}</g>`;
    const vb = opts.viewBox || '0 0 750 1000';
    const size = opts.width ? ` width="${opts.width}" height="${opts.height}"` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${size} preserveAspectRatio="${opts.par || 'xMidYMid meet'}">${opts.noBg && !opts.plain ? '' : bgSvg}${ch}${opts.extra || ''}</svg>`;
  };
})();
