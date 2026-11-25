/* render.js — turns a character "state" into layered SVG.
   Layer order (back → front):
     back · hairBack · legs/torso + base outfit · socks · shoes/bottom/top/dress ("body")
     · arms · sleeves · wrist · held · hands · over · headBack · face · hair front/top
     · brows · head · front
   Items return either a string (goes to their category's default layer) or an object
   { layerName: svg }. Layers named back/body/socks/shoes/sleeves/wrist/held/over/front use
   body coordinates; headBack/head use head coordinates. */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const { n } = DU;

  DU.CARD_W = 750;
  DU.CARD_H = 1000;
  DU.CHAR_SCALE = 1.16;

  /* slots, in the order their layers stack */
  DU.SLOTS = ['wings', 'socks', 'shoes', 'bottom', 'top', 'dress', 'bracelet', 'bag', 'hand', 'necklace', 'earrings', 'glasses', 'hairacc', 'hat'];
  const DEFAULT_LAYER = {
    wings: 'back', socks: 'socks', shoes: 'shoes', bottom: 'body', top: 'body', dress: 'body', bracelet: 'wrist',
    bag: 'held', hand: 'held', necklace: 'over', earrings: 'head', glasses: 'head', hairacc: 'head', hat: 'head',
  };

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
    const add = (name, svg) => { if (svg) L[name] = (L[name] || '') + svg; };

    const wear = state.wear || {};
    const itemOf = (slot) => { const w = wear[slot]; return w && DU.itemById && DU.itemById[w.id] ? DU.itemById[w.id] : null; };
    const drawItem = (slot) => {
      const it = itemOf(slot);
      if (!it) return null;
      const spec = it.fixed ? it.color : wear[slot].c || it.color || '#ff9ac1';
      const isHead = ['earrings', 'glasses', 'hairacc', 'hat'].includes(slot);
      const P = ctx.paint(spec, isHead ? [-110, -200, 220, 330] : null);
      let out;
      try { out = it.draw(R, P, ctx); } catch (e) { console.error('item draw failed', it.id, e); out = ''; }
      if (typeof out === 'string') out = { [DEFAULT_LAYER[slot]]: out };
      return out || {};
    };

    const top = itemOf('top'), bottom = itemOf('bottom'), dress = itemOf('dress'), shoes = itemOf('shoes'), hat = itemOf('hat');
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
    };
    const socksOut = drawItem('socks');
    if (socksOut) Object.keys(socksOut).forEach((k) => add(k, socksOut[k]));
    seq.forEach((slot) => take(slot, ['body', 'shoes']));
    Object.keys(others).forEach((k) => add(k, others[k]));
    ['wings', 'bracelet', 'bag', 'hand', 'necklace', 'earrings', 'glasses', 'hairacc', 'hat'].forEach((slot) => {
      const out = drawItem(slot);
      if (out) Object.keys(out).forEach((k) => add(k, out[k]));
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

    const mk = state.makeup || {};
    const eyes = state.eyes || {};
    const face =
      DU.body.head(sk, state.face) +
      DU.drawMakeupUnder(mk, eyes.shape, uid, sk) +
      DU.drawEyes(eyes.shape, eyes.color || '#7a4a2b', uid) +
      DU.drawMouth(state.mouth, mk.lips) +
      DU.drawMakeupOver(mk);

    const parts = [
      L.back, head(hairBack),
      DU.body.lower(R, sk), L.socks, bodyLayer,
      DU.body.arms(R, sk), L.sleeves, L.wrist, L.held, DU.body.hands(R, sk), L.over,
      head((L.headBack || '') + face + hairFront + hairTop + DU.drawBrows(state.brows, browColor) + (L.head || '')),
      L.front,
    ].filter(Boolean).join('');

    return `<g stroke-linejoin="round" stroke-linecap="round" fill="none"><defs>${defs.join('')}</defs>${parts}</g>`;
  };

  /* a rectangle [x, y, w, h] around the head, for the face zoom */
  DU.headBox = function (state) {
    const R = DU.rig(state.body);
    const s = DU.CHAR_SCALE;
    const cy = DU.GROUND_Y + (R.headY - DU.GROUND_Y) * s;
    const h = 420;
    return [375 - (h * 0.75) / 2, cy - h * 0.5, h * 0.75, h];
  };
  DU.GROUND_Y = 950;

  DU.charTransform = () => `translate(375 950) scale(${DU.CHAR_SCALE}) translate(-375 -950)`;

  /* The whole card: background + character (+ optional name ribbon). Returns <svg> markup. */
  DU.renderCard = function (state, opts = {}) {
    const uid = opts.uid || DU.uid('k');
    const bg = (DU.backgrounds || []).find((b) => b.id === state.bg) || (DU.backgrounds || [])[0];
    let bgSvg = `<rect width="750" height="1000" fill="#fde9f3"/>`;
    if (bg && !opts.noBg) { try { bgSvg = bg.draw(uid + 'bg'); } catch (e) { console.error('bg failed', e); } }
    const ch = `<g transform="${DU.charTransform()}">${DU.renderCharacter(state, { uid })}</g>`;
    const vb = opts.viewBox || '0 0 750 1000';
    const size = opts.width ? ` width="${opts.width}" height="${opts.height}"` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${size} preserveAspectRatio="${opts.par || 'xMidYMid meet'}">${opts.noBg && !opts.plain ? '' : bgSvg}${ch}${opts.extra || ''}</svg>`;
  };
})();
