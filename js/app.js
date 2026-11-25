/* app.js — screens and interaction: home · pick a girl · editor · result · gallery · shop. */
(function () {
  'use strict';
  const DU = window.DU, S = DU.store, snd = DU.sound;
  const app = document.getElementById('app');
  const modals = document.getElementById('modals');
  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = (o) => JSON.parse(JSON.stringify(o));

  const DEFAULT_TITLE = 'הגיע הזמן לעצב!'; // Arielle's name for the game
  const HC_PRICE = 300;
  const HC_NAMES = { rainbow: 'שיער קשת', sunset: 'שיער שקיעה', mermaid: 'שיער בת ים', galaxy: 'שיער גלקסיה', gold: 'שיער זהב' };
  const NAME_IDEAS = ['מיה', 'נועה', 'לונה', 'שירה', 'אלה', 'רומי', 'טליה', 'ליבי', 'מיקה', 'עלמה', 'יולי', 'כוכבית'];
  const HEAD_SLOTS = ['hat', 'hairacc', 'glasses', 'earrings'];

  const CATS = [
    { id: 'girl', ico: '👧', name: 'דמות' },
    { id: 'face', ico: '👀', name: 'פנים' },
    { id: 'makeup', ico: '💄', name: 'איפור' },
    { id: 'clothes', ico: '👗', name: 'בגדים' },
    { id: 'acc', ico: '🎀', name: 'אביזרים' },
    { id: 'bg', ico: '🖼️', name: 'רקע' },
  ];
  const SUBS = {
    face: [['eyes', '👁️', 'עיניים'], ['brows', '〰️', 'גבות'], ['mouth', '👄', 'פה']],
    makeup: [['blush', '🌸', 'סומק'], ['shadow', '🎨', 'צללית'], ['lips', '💋', 'שפתון'], ['sparkle', '✨', 'נצנצים']],
    clothes: [['top', '👚', 'חולצות'], ['bottom', '👖', 'מכנסיים וחצאיות'], ['dress', '👗', 'שמלות'], ['shoes', '👟', 'נעליים'], ['socks', '🧦', 'גרביים']],
    acc: [['hat', '🎩', 'כובעים'], ['hairacc', '🎀', 'לשיער'], ['glasses', '👓', 'משקפיים'], ['earrings', '💎', 'עגילים'], ['necklace', '📿', 'שרשראות'], ['bracelet', '⌚', 'צמידים'], ['bag', '👜', 'תיקים'], ['hand', '🪄', 'ביד'], ['wings', '🦋', 'כנפיים']],
  };

  let st = null; // the character being edited
  let round = null; // { theme, awarded, gid, score, ok }
  let screen = 'home';
  const ui = { cat: 'clothes', sub: { face: 'eyes', makeup: 'blush', clothes: 'top', acc: 'hat' }, zoom: false, only: false };
  const lastColor = {};

  /* ---------------- small helpers ---------------- */
  const title = () => (S.data.title || '').trim() || DEFAULT_TITLE;
  const muteIcon = () => (S.data.mute ? '🔇' : '🔊');
  const theme = () => DU.THEMES.find((t) => t.id === (round && round.theme)) || DU.THEMES[0];
  const ownsItem = (it) => !it.price || S.owns('item:' + it.id);
  const ownsHair = (h) => !h.price || S.owns('hair:' + h.id);
  const ownsHC = (c) => c[0] === '#' || S.owns('hc:' + c);
  const ownsBg = (b) => !b.price || S.owns('bg:' + b.id);
  const themeLabel = (t) => (t.kind === 'style' ? 'סגנון ' : '') + t.name;

  function girlState(g) {
    const s = DU.defaultState();
    Object.assign(s, { base: g.id, skin: g.skin, face: g.face, eyes: clone(g.eyes), brows: g.brows, mouth: g.mouth, hair: clone(g.hair) });
    Object.assign(s.makeup, g.makeup || {});
    return s;
  }
  function demoGirl() {
    const s = girlState(DU.GIRLS[1]);
    s.wear = { dress: { id: 'dr_party', c: '#ff6f91' }, shoes: { id: 'sh_maryjane', c: '#e0435f' }, socks: { id: 'sk_frill', c: '#ffffff' }, hairacc: { id: 'ha_bow', c: '#ff6f91' }, hand: { id: 'hd_balloon', c: '#5cc8ff' } };
    s.makeup = { blush: 'soft', shadow: null, lips: null, sparkle: 'stars' };
    s.bg = 'hearts';
    return s;
  }
  function toast(msg) {
    const old = $('.toast'); if (old) old.remove();
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }
  function setPointsUI() {
    document.querySelectorAll('.stars-pill span').forEach((e) => (e.textContent = S.data.points));
    document.querySelectorAll('.stars-pill').forEach((e) => { e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); });
  }
  function saveWip() { S.data.wip = st ? { state: st, round } : null; S.save(); }

  /* ---------------- thumbnails (cached) ---------------- */
  const cache = new Map();
  function cached(key, make) {
    if (cache.has(key)) return cache.get(key);
    if (cache.size > 500) cache.clear();
    const v = make(); cache.set(key, v); return v;
  }
  const hairKey = (s) => s.hair.style + s.hair.color;
  /* a bare version of the current girl, to preview one thing on */
  function bare(s, withFace) {
    const b = DU.defaultState();
    Object.assign(b, { skin: s.skin, face: s.face, hair: clone(s.hair), eyes: clone(s.eyes), brows: s.brows, mouth: s.mouth });
    if (withFace) b.makeup = clone(s.makeup);
    return b;
  }
  function itemThumb(it, color, src) {
    src = src || st || demoGirl();
    const c = it.fixed ? '' : color || it.color;
    const head = HEAD_SLOTS.includes(it.slot) || it.slot === 'wings';
    return cached(['it', it.id, c, src.skin, head ? hairKey(src) + src.face : ''].join('|'), () => {
      const b = bare(src);
      b.wear = { [it.slot]: { id: it.id, c: c || undefined } };
      if (it.slot === 'top') b.tuck = false;
      return DU.renderThumb(b, it.slot);
    });
  }
  function faceThumb(mut, key) {
    return cached(['face', key, st.skin, st.face, hairKey(st), JSON.stringify(st.eyes), st.brows, st.mouth, JSON.stringify(st.makeup)].join('|'), () => {
      const b = bare(st, true); mut(b); return DU.renderThumb(b, 'face');
    });
  }
  function hairThumb(styleId, src) {
    src = src || st;
    return cached(['hair', styleId, src.hair.color, src.skin, src.face, JSON.stringify(src.eyes)].join('|'), () => {
      const b = bare(src); b.hair.style = styleId; return DU.renderThumb(b, 'hair');
    });
  }
  const bgThumb = (b) => cached('bg|' + b.id, () => DU.renderBgThumb(b));

  /* ---------------- modals ---------------- */
  let modalStack = [];
  function openModal(html, handlers = {}, opts = {}) {
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = html;
    back._handlers = handlers; back._sticky = !!opts.sticky; back._onClose = opts.onClose;
    modals.appendChild(back); modalStack.push(back);
    return back;
  }
  function closeModal(back) {
    back = back || modalStack[modalStack.length - 1];
    if (!back) return;
    modalStack = modalStack.filter((m) => m !== back);
    back.remove();
    if (back._onClose) back._onClose();
  }
  const closeAll = () => { while (modalStack.length) closeModal(); };

  /* ---------------- home ---------------- */
  function showHome() {
    screen = 'home'; closeAll();
    const d = S.data;
    const hero = d.wip ? d.wip.state : d.gallery[0] ? d.gallery[0].state : demoGirl();
    document.title = title();
    app.innerHTML = `
      <div class="home">
        <div class="home-top"><button class="round-btn" data-act="mute" aria-label="צליל">${muteIcon()}</button><div class="stars-pill">⭐ <span>${d.points}</span></div></div>
        <div class="home-art">${DU.renderCard(hero)}</div>
        <div class="home-side">
          <h1 class="title">${esc(title())}</h1>
          <button class="title-edit" data-act="title">✏️ לשנות את שם המשחק</button>
          <div class="home-buttons">
            <button class="btn big" data-act="new">✨ דמות חדשה</button>
            ${d.wip ? '<button class="btn big purple" data-act="continue">▶ להמשיך</button>' : ''}
            <div class="home-row"><button class="btn white" data-act="gallery">🖼️ גלריה</button><button class="btn white" data-act="shop">🛍️ חנות</button></div>
          </div>
        </div>
      </div>`;
  }

  /* ---------------- pick a girl ---------------- */
  function showPick() {
    screen = 'pick';
    app.innerHTML = `
      <div class="screen">
        <div class="bar"><button class="round-btn" data-act="home" aria-label="בית">🏠</button><h2>בחרי דמות 👇</h2></div>
        <div class="scroll"><div class="girls pick">${DU.GIRLS.map((g) => `<button class="girl" data-act="pick" data-id="${g.id}">${DU.renderThumb(girlState(g), 'girl')}</button>`).join('')}</div></div>
      </div>`;
  }
  function startRound(girlId) {
    const g = DU.GIRLS.find((x) => x.id === girlId) || DU.GIRLS[0];
    st = girlState(g);
    round = { theme: DU.pickTheme(S.data.lastTheme), awarded: 0, gid: 'c' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36) };
    S.data.lastTheme = round.theme;
    ui.cat = 'clothes'; ui.sub.clothes = 'top';
    saveWip();
    showEditor();
    themeModal(true);
  }

  /* ---------------- editor ---------------- */
  function showEditor() {
    screen = 'editor'; closeAll();
    app.innerHTML = `
      <div class="editor">
        <div class="topbar">
          <button class="round-btn" data-act="home" aria-label="בית">🏠</button>
          <button class="theme-chip" data-act="theme" id="themeChip"></button>
          <div class="stars-pill">⭐ <span>${S.data.points}</span></div>
          <button class="round-btn" data-act="mute" aria-label="צליל">${muteIcon()}</button>
          <button class="btn mint done-btn" data-act="done">סיימתי ✓</button>
        </div>
        <div class="panel card-panel"><div class="cats" id="cats"></div><div id="panelBody" style="display:contents"></div></div>
        <div class="stage-wrap"><div class="stage" id="stage"><div class="stage-art" id="art"></div>
          <button class="round-btn stage-btn zoom-btn" data-act="zoom" aria-label="זום">🔍</button>
          <button class="name-pill" data-act="name" id="namePill"></button></div></div>
        <div class="hairstrip card-panel" id="hair"></div>
      </div>`;
    autoZoom();
    drawTheme(); drawCats(); drawPanel(); drawStage(); drawHair(); drawName();
  }
  function drawTheme() {
    const t = theme(), el = $('#themeChip');
    if (el) el.innerHTML = `<span class="ico">${t.icon}</span><span>האתגר: ${esc(themeLabel(t))}</span><small>${esc(t.hint)}</small>`;
  }
  function drawCats() {
    $('#cats').innerHTML = CATS.map((c) => `<button class="cat ${ui.cat === c.id ? 'on' : ''}" data-act="cat" data-id="${c.id}"><span class="ico">${c.ico}</span>${c.name}</button>`).join('');
  }
  function drawName() {
    const el = $('#namePill'); if (!el) return;
    const nm = (st.name || '').trim();
    el.textContent = nm || '✏️ איך קוראים לה?';
    el.classList.toggle('empty', !nm);
  }
  function drawStage(pop) {
    const art = $('#art'); if (!art) return;
    art.innerHTML = DU.renderCard(st, { par: 'xMidYMid slice' });
    const cy = DU.headCenterY(st);
    art.style.transformOrigin = `50% ${(cy * 100).toFixed(1)}%`;
    const stage = $('#stage');
    stage.style.setProperty('--zy', ((0.47 - cy) * 100).toFixed(1) + '%');
    stage.classList.toggle('zoom', ui.zoom);
    if (pop) { art.classList.remove('pop'); void art.offsetWidth; art.classList.add('pop'); }
  }
  function autoZoom() {
    const sub = ui.sub[ui.cat];
    ui.zoom = ui.cat === 'face' || ui.cat === 'makeup' || (ui.cat === 'acc' && (sub === 'glasses' || sub === 'earrings'));
  }
  const curSlot = () => (ui.cat === 'clothes' || ui.cat === 'acc' ? ui.sub[ui.cat] : null);

  function tile(inner, attrs, cls = '') { return `<button class="tile ${cls}" ${attrs}>${inner}</button>`; }
  const lockTag = (price) => `<span class="lock">🔒 ${price}</span>`;

  function panelContent() {
    const cat = ui.cat, sub = ui.sub[cat], t = theme();
    if (cat === 'girl') {
      const faces = Object.keys(DU.FACES).map((f) => tile(cached(['fs', f, st.skin, hairKey(st), JSON.stringify(st.eyes), st.brows, st.mouth].join('|'), () => { const b = bare(st); b.face = f; return DU.renderThumb(b, 'face'); }),
        `data-act="faceshape" data-id="${f}" aria-label="${DU.FACE_NAMES[f] || f}"`, st.face === f ? 'on' : '')).join('');
      const skins = DU.SKINS.map((c) => `<button class="sw big ${st.skin === c ? 'on' : ''}" style="background:${c}" data-act="skin" data-c="${c}" aria-label="צבע גוף"></button>`).join('');
      const stepper = (k, min, max, lo, hi) => {
        const v = st.body[k] || 0; let dots = '';
        for (let i = min; i <= max; i++) dots += `<span class="dot ${i === v ? 'on' : ''}"></span>`;
        return `<div class="stepper"><button class="round-btn" data-act="body" data-k="${k}" data-d="-1" aria-label="${lo}">${k === 'h' ? '⬇️' : '➖'}</button><div class="dots">${dots}</div><button class="round-btn" data-act="body" data-k="${k}" data-d="1" aria-label="${hi}">${k === 'h' ? '⬆️' : '💪'}</button></div>`;
      };
      return `<div class="section-title">🎨 צבע גוף</div><div class="swatches">${skins}</div>
        <div class="section-title">🙂 צורת פנים</div><div class="grid small">${faces}</div>
        <div class="section-title">📏 גובה</div>${stepper('h', -2, 2, 'נמוכה יותר', 'גבוהה יותר')}
        <div class="section-title">💪 שרירים</div>${stepper('m', 0, 3, 'פחות שרירים', 'יותר שרירים')}`;
    }
    if (cat === 'face') {
      if (sub === 'eyes') return `<div class="grid">${DU.EYES.map((e) => tile(faceThumb((b) => (b.eyes.shape = e.id), 'e' + e.id), `data-act="eyes" data-id="${e.id}" aria-label="${e.name}"`, st.eyes.shape === e.id ? 'on' : '')).join('')}</div>`;
      if (sub === 'brows') return `<div class="grid">${DU.BROWS.map((e) => tile(faceThumb((b) => (b.brows = e.id), 'b' + e.id), `data-act="brows" data-id="${e.id}" aria-label="${e.name}"`, st.brows === e.id ? 'on' : '')).join('')}</div>`;
      return `<div class="grid">${DU.MOUTHS.map((e) => tile(faceThumb((b) => (b.mouth = e.id), 'm' + e.id), `data-act="mouth" data-id="${e.id}" aria-label="${e.name}"`, st.mouth === e.id ? 'on' : '')).join('')}</div>`;
    }
    if (cat === 'makeup') {
      const none = (k) => tile('🚫', `data-act="makeup" data-k="${k}" data-id="" aria-label="בלי"`, 'none ' + (!st.makeup[k] ? 'on' : ''));
      const opts = sub === 'blush' ? DU.BLUSH.map((b) => b.id) : sub === 'shadow' ? DU.SHADOWS : sub === 'lips' ? DU.LIPS : DU.SPARKLES.map((b) => b.id);
      return `<div class="grid">${none(sub)}${opts.map((id) => tile(faceThumb((b) => (b.makeup[sub] = id), sub + id), `data-act="makeup" data-k="${sub}" data-id="${id}"`, st.makeup[sub] === id ? 'on' : '')).join('')}</div>`;
    }
    if (cat === 'bg') {
      return `<div class="grid">${DU.backgrounds.map((b) => tile(bgThumb(b) + `<span class="label">${esc(b.name)}</span>` + (ownsBg(b) ? '' : lockTag(b.price)) + (DU.fits('bg', b, t.id) ? `<span class="badge">${t.icon}</span>` : ''),
        `data-act="bg" data-id="${b.id}"`, 'bg ' + (st.bg === b.id ? 'on ' : '') + (ownsBg(b) ? '' : 'locked'))).join('')}</div>`;
    }
    // clothes / accessories
    const slot = sub;
    const worn = st.wear[slot];
    let list = DU.items.filter((it) => it.slot === slot).sort((a, b) => (ownsItem(a) ? 0 : 1) - (ownsItem(b) ? 0 : 1) || (a.price ? 1 : 0) - (b.price ? 1 : 0));
    if (ui.only) list = list.filter((it) => it.tags.includes(t.id) || (worn && worn.id === it.id));
    let html = '';
    if (slot === 'top' || slot === 'bottom') {
      html += `<div class="toggle"><button class="${st.tuck ? 'on' : ''}" data-act="tuck" data-v="1">👕 חולצה בפנים</button><button class="${!st.tuck ? 'on' : ''}" data-act="tuck" data-v="0">👚 חולצה בחוץ</button></div>`;
    }
    html += `<div class="grid">${tile('🚫', `data-act="wear" data-slot="${slot}" data-id="" aria-label="בלי"`, 'none ' + (!worn ? 'on' : ''))}`;
    html += list.map((it) => {
      const on = worn && worn.id === it.id, own = ownsItem(it);
      return tile(itemThumb(it, on ? worn.c : lastColor[it.id]) + (own ? (it.price ? '<span class="new">✨</span>' : '') : lockTag(it.price)) + (it.tags.includes(t.id) ? `<span class="badge">${t.icon}</span>` : ''),
        `data-act="wear" data-slot="${slot}" data-id="${it.id}" aria-label="${esc(it.name)}"`, (on ? 'on ' : '') + (own ? '' : 'locked'));
    }).join('');
    html += '</div>';
    if (ui.only && !list.some((it) => it.tags.includes(t.id))) html += `<div class="hint-box">${t.icon} אין כאן משהו לאתגר הזה.<br>נסי קטגוריה אחרת!</div>`;
    return html;
  }
  function colorsRow() {
    if (ui.cat === 'face' && ui.sub.face === 'eyes') {
      return `<div class="colors">${DU.EYE_COLORS.map((c) => `<button class="sw ${st.eyes.color === c ? 'on' : ''}" style="background:${c}" data-act="eyecolor" data-c="${c}" aria-label="צבע עיניים"></button>`).join('')}</div>`;
    }
    const slot = curSlot(), w = slot && st.wear[slot], it = w && DU.itemById[w.id];
    if (!it || it.fixed) return '';
    const cur = w.c || it.color;
    return `<div class="colors">${DU.PALETTE.map((c) => `<button class="sw ${cur === c ? 'on' : ''}" style="background:${c}" data-act="color" data-c="${c}" aria-label="צבע"></button>`).join('')}</div>`;
  }
  function drawPanel(keepScroll) {
    const body = $('#panelBody'); if (!body) return;
    const sc = $('#gridScroll'), top = keepScroll && sc ? sc.scrollTop : 0;
    const subs = $('.subs', body), subScroll = keepScroll && subs ? subs.scrollLeft : null;
    const cols = $('.colors', body), colScroll = keepScroll && cols ? cols.scrollLeft : 0;
    let html = '';
    const filterChip = ui.cat === 'clothes' || ui.cat === 'acc' ? `<button class="sub only ${ui.only ? 'on' : ''}" data-act="only" aria-pressed="${ui.only}">${theme().icon} רק לאתגר</button>` : '';
    if (SUBS[ui.cat]) html += `<div class="subs">${filterChip}${SUBS[ui.cat].map(([id, ico, nm]) => `<button class="sub ${ui.sub[ui.cat] === id ? 'on' : ''}" data-act="sub" data-id="${id}">${ico} ${nm}</button>`).join('')}</div>`;
    html += `<div class="grid-scroll" id="gridScroll">${panelContent()}</div>` + colorsRow();
    body.innerHTML = html;
    if (top) $('#gridScroll').scrollTop = top;
    if (subScroll != null && $('.subs', body)) $('.subs', body).scrollLeft = subScroll;
    if (colScroll && $('.colors', body)) $('.colors', body).scrollLeft = colScroll;
    if (!keepScroll) { const on = $('.sub.on', body); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  }
  function drawHair(keepScroll) {
    const el = $('#hair'); if (!el) return;
    const a = $('.hair-styles', el), b = $('.hair-colors', el);
    const sa = keepScroll && a ? a.scrollLeft : null, sb = keepScroll && b ? b.scrollLeft : null;
    const th = theme();
    const styles = DU.HAIRS.map((h) => tile(hairThumb(h.id) + (ownsHair(h) ? '' : lockTag(h.price)) + (DU.fits('hair', h, th.id) ? `<span class="badge">${th.icon}</span>` : ''), `data-act="hair" data-id="${h.id}" aria-label="${esc(h.name)}"`, (st.hair.style === h.id ? 'on ' : '') + (ownsHair(h) ? '' : 'locked'))).join('');
    const colors = DU.HAIR_COLORS.concat(DU.HAIR_SPECIAL).map((c) => `<button class="sw ${st.hair.color === c ? 'on' : ''} ${ownsHC(c) ? '' : 'locked'}" style="background:${DU.swatchCss(c)}" data-act="haircolor" data-c="${c}" aria-label="צבע שיער"></button>`).join('');
    el.innerHTML = `<div class="hair-label"><span class="ico">💇‍♀️</span>שיער</div><div class="hair-styles">${styles}</div><div class="hair-colors">${colors}</div>`;
    if (sa != null) $('.hair-styles', el).scrollLeft = sa;
    if (sb != null) $('.hair-colors', el).scrollLeft = sb;
  }
  /* something about the look changed */
  function changed(what) {
    drawStage(true);
    drawPanel(true);
    if (what === 'hair' || what === 'look') drawHair(true);
    saveWip();
  }

  /* ---------------- shop products ---------------- */
  function products() {
    const list = [];
    DU.items.filter((i) => i.price).forEach((i) => list.push({ key: 'item:' + i.id, kind: 'item', id: i.id, name: i.name, price: i.price, slot: i.slot }));
    DU.HAIRS.filter((h) => h.price).forEach((h) => list.push({ key: 'hair:' + h.id, kind: 'hair', id: h.id, name: 'תסרוקת ' + h.name, price: h.price }));
    DU.HAIR_SPECIAL.forEach((c) => list.push({ key: 'hc:' + c, kind: 'hc', id: c, name: HC_NAMES[c] || 'צבע מיוחד', price: HC_PRICE }));
    DU.backgrounds.filter((b) => b.price).forEach((b) => list.push({ key: 'bg:' + b.id, kind: 'bg', id: b.id, name: 'רקע ' + b.name, price: b.price }));
    return list;
  }
  function applyProduct(s, pr) {
    if (pr.kind === 'item') {
      const it = DU.itemById[pr.id];
      s.wear[it.slot] = { id: it.id, c: it.fixed ? undefined : it.color };
      if (it.slot === 'dress') { delete s.wear.top; delete s.wear.bottom; }
      if (it.slot === 'top' || it.slot === 'bottom') delete s.wear.dress;
    } else if (pr.kind === 'hair') s.hair.style = pr.id;
    else if (pr.kind === 'hc') s.hair.color = pr.id;
    else if (pr.kind === 'bg') s.bg = pr.id;
    return s;
  }
  /* ask to buy; onBought runs after a successful purchase */
  function buyModal(pr, base, onBought) {
    snd.play('tap');
    const preview = applyProduct(clone(base || demoGirl()), pr);
    const pts = S.data.points, enough = pts >= pr.price;
    const m = openModal(`
      <div class="modal"><button class="x" data-act="close" aria-label="סגירה">✕</button>
        <h3>✨ ${esc(pr.name)}</h3>
        <div class="preview-card">${DU.renderCard(preview)}</div>
        ${enough
          ? `<button class="btn big" data-act="buy-yes">לקנות ב־<span dir="ltr">⭐ ${pr.price}</span></button>`
          : `<p>חסרים לך עוד <b dir="ltr">⭐ ${pr.price - pts}</b><br>עוד קצת כוכבים וזה שלך!</p><button class="btn white" data-act="close">בסדר 👍</button>`}
        <div class="note soft">יש לך <span dir="ltr">⭐ ${pts}</span></div>
      </div>`, {
      'buy-yes'() {
        if (!S.buy(pr.key, pr.price)) return;
        snd.play('buy'); closeModal(m); confetti(60); setPointsUI(); cache.clear();
        toast('🎉 ' + pr.name + ' שלך!');
        if (onBought) onBought();
      },
    });
    if (!enough) snd.play('locked');
  }

  /* ---------------- actions in the editor ---------------- */
  function wear(slot, id) {
    const it = id && DU.itemById[id];
    if (it && !ownsItem(it)) return buyModal({ key: 'item:' + it.id, kind: 'item', id: it.id, name: it.name, price: it.price }, st, () => { wear(slot, id); });
    if (!it || (st.wear[slot] && st.wear[slot].id === id)) {
      if (st.wear[slot]) snd.play('off');
      delete st.wear[slot];
    } else {
      st.wear[slot] = { id, c: it.fixed ? undefined : lastColor[id] || it.color };
      if (slot === 'dress') { delete st.wear.top; delete st.wear.bottom; }
      if (slot === 'top' || slot === 'bottom') delete st.wear.dress;
      snd.play('pick');
    }
    changed();
  }

  /* ---------------- name / title / theme dialogs ---------------- */
  function inputModal({ head, value, placeholder, ideas, max, onSave }) {
    const m = openModal(`
      <div class="modal"><button class="x" data-act="close" aria-label="סגירה">✕</button>
        <h3>${head}</h3>
        <input class="name-input" id="nameInput" maxlength="${max}" value="${esc(value)}" placeholder="${esc(placeholder)}" autocomplete="off" autocapitalize="off" enterkeyhint="done">
        ${ideas ? `<div class="row">${ideas.map((x) => `<button class="btn white small" data-act="idea" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>` : ''}
        <div class="row"><button class="btn big mint" data-act="save">שמירה ✓</button></div>
      </div>`, {
      idea(el) { $('#nameInput', m).value = el.dataset.v; snd.play('tap'); },
      save() { onSave($('#nameInput', m).value.trim()); closeModal(m); snd.play('pick'); },
    });
    const inp = $('#nameInput', m);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); m._handlers.save(); } });
    if (!window.matchMedia('(pointer: coarse)').matches) { inp.focus(); inp.select(); }
  }
  function nameModal() {
    const ideas = NAME_IDEAS.slice().sort(() => Math.random() - 0.5).slice(0, 6);
    inputModal({ head: '✏️ איך קוראים לה?', value: st.name || '', placeholder: 'השם שלה', ideas, max: 14, onSave: (v) => { st.name = v; drawName(); saveWip(); } });
  }
  function titleModal() {
    inputModal({ head: '✏️ שם המשחק', value: S.data.title || '', placeholder: DEFAULT_TITLE, max: 26, onSave: (v) => { S.data.title = v; S.save(true); showHome(); } });
  }
  function themeModal(intro) {
    const t = theme();
    const m = openModal(`
      <div class="modal">
        <div class="big-ico">${t.icon}</div>
        <h3>${intro ? 'האתגר שלך:' : 'האתגר:'} ${esc(themeLabel(t))}</h3>
        <p>${esc(t.hint)}<br>בגדים, אביזרים ותסרוקות עם הסימן ${t.icon} נותנים עוד כוכבים ⭐</p>
        <div class="row"><button class="btn big" data-act="close">יאללה! 🎨</button></div>
        ${intro ? '' : '<div class="row"><button class="btn white small" data-act="other">🎲 אתגר אחר</button></div>'}
      </div>`, {
      other() { round.theme = DU.pickTheme(round.theme); S.data.lastTheme = round.theme; saveWip(); closeModal(m); drawTheme(); drawPanel(true); drawHair(true); themeModal(true); },
    });
    if (intro) snd.play('pick');
  }
  function confirmModal(text, yes, no, onYes) {
    const m = openModal(`<div class="modal"><p style="font-size:22px;font-weight:800">${text}</p><div class="row"><button class="btn" data-act="yes">${yes}</button><button class="btn white" data-act="close">${no}</button></div></div>`,
      { yes() { closeModal(m); onYes(); } });
  }

  /* ---------------- "סיימתי" — the result ---------------- */
  function saveGallery() {
    S.upsertGallery({ id: round.gid, state: clone(st), score: round.score, ok: round.ok, awarded: round.awarded, theme: round.theme, ts: Date.now() });
    round.saved = true;
  }
  function finish() {
    snd.unlock();
    const res = DU.scoreCharacter(st, round.theme);
    const gain = Math.max(0, res.total - (round.awarded || 0));
    round.awarded = Math.max(round.awarded || 0, res.total);
    round.score = res.total; round.ok = res.ok;
    if (gain) S.addPoints(gain);
    if (res.ok || round.saved) saveGallery(); // a girl already in the gallery stays there, updated
    saveWip();
    showResult(res, gain);
  }
  const resultButtons = () => `<div class="row"><button class="btn" data-act="r-new">✨ דמות חדשה</button><button class="btn white" data-act="r-edit">✏️ להמשיך לעצב</button><button class="btn white" data-act="r-photo">📷 תמונה</button></div>`;
  function showResult(res, gain) {
    const card = DU.renderCard(st);
    const handlers = {
      'r-new'() { closeAll(); showPick(); },
      'r-edit'() { closeAll(); setPointsUI(); },
      'r-photo'() { photoModal(st); },
      'r-love'() {
        saveGallery(); saveWip(); snd.play('save'); confetti(90);
        $('.side', m).innerHTML = `<div class="big-ico">💖</div><h3 style="text-align:center">היא נשמרה בגלריה!</h3><p style="text-align:center">כי את אוהבת אותה — וזה הכי חשוב.</p>${resultButtons()}`;
      },
    };
    let m;
    if (!res.ok) {
      m = openModal(`
        <div class="modal wide"><div class="result">
          <div class="pic">${card}</div>
          <div class="side">
            <div class="big-ico">🙈</div>
            <h3 style="text-align:center">היא עוד לא מוכנה…</h3>
            <p style="text-align:center">לדמות הזאת חסרים עוד פרטים,<br>אז היא קיבלה רק <b dir="ltr">⭐ ${res.total}</b> ולא תישמר בגלריה.</p>
            <div class="note soft">אפשר להוסיף לה בגדים, נעליים, אביזרים ואיפור ✨</div>
            <div class="row"><button class="btn big" data-act="r-love">💖 אני אוהבת אותה! לשמור בכל זאת</button></div>
            <div class="row"><button class="btn mint" data-act="r-edit">✨ להוסיף עוד פרטים</button></div>
          </div>
        </div></div>`, handlers, { sticky: true });
      snd.play('hmm');
      setPointsUI();
      return;
    }
    m = openModal(`
      <div class="modal wide"><div class="result">
        <div class="pic">${card}</div>
        <div class="side">
          <div class="praise">${esc(res.praise)} 🎉</div>
          <div class="total" id="total">⭐ 0</div>
          <div class="lines">${res.lines.map((l) => `<div class="line ${l.surprise ? 'surprise' : ''}"><span class="ico">${l.icon}</span><span class="lb">${esc(l.label)}</span><span class="pt">+${l.pts}</span></div>`).join('')}</div>
          <div class="note">${gain ? `<span class="gain">+${gain} ⭐</span> כוכבים חדשים! · 🖼️ נשמרה בגלריה` : '🖼️ נשמרה בגלריה · דמות חדשה = כוכבים חדשים!'}</div>
          ${resultButtons()}
        </div>
      </div></div>`, handlers, { sticky: true });
    snd.play('fanfare'); confetti(170);
    // reveal the lines one by one while the total counts up
    const lines = m.querySelectorAll('.line'), totalEl = $('#total', m);
    let shown = 0, sum = 0;
    const step = () => {
      if (!m.isConnected) return;
      if (shown < lines.length) {
        lines[shown].classList.add('show'); sum += res.lines[shown].pts; shown++;
        countTo(totalEl, sum, 360); snd.play('star');
        setTimeout(step, 520);
      } else setPointsUI();
    };
    setTimeout(step, 500);
  }
  function countTo(el, to, ms) {
    const from = parseInt(el.dataset.v || '0', 10), t0 = performance.now();
    el.dataset.v = to;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      el.textContent = '⭐ ' + Math.round(from + (to - from) * k);
      if (k < 1 && el.isConnected) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------------- picture (PNG) ---------------- */
  async function makePNG(state) {
    const svg = DU.renderCard(state, { width: 750, height: 1000 });
    const img = new Image();
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('svg image failed')); img.src = url; });
    const W = 1500, H = 2000;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, W, H);
    const nm = (state.name || '').trim();
    if (nm) {
      g.font = '800 78px system-ui, -apple-system, "Arial Hebrew", Arial, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl';
      const tw = Math.min(W - 260, g.measureText(nm).width), bw = tw + 130, bh = 118, bx = (W - bw) / 2, by = H - bh - 28;
      g.fillStyle = 'rgba(255,255,255,.93)'; g.strokeStyle = '#ffb3d1'; g.lineWidth = 8;
      g.beginPath();
      if (g.roundRect) g.roundRect(bx, by, bw, bh, 59); else g.rect(bx, by, bw, bh);
      g.fill(); g.stroke();
      g.fillStyle = '#4b3564';
      g.fillText(nm, W / 2, by + bh / 2 + 4, W - 260);
    }
    const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
    if (!blob) throw new Error('png failed');
    return blob;
  }
  async function photoModal(state) {
    snd.play('camera');
    const m = openModal(`
      <div class="modal"><button class="x" data-act="close" aria-label="סגירה">✕</button>
        <h3>📷 התמונה שלה</h3>
        <div class="preview-card" id="pngBox"><div style="height:100%;display:flex;align-items:center;justify-content:center;font-size:40px">⏳</div></div>
        <div class="row"><button class="btn big" data-act="png-save" disabled>⬇️ לשמור תמונה</button></div>
        <div class="note soft" id="pngHint"></div>
      </div>`, {});
    try {
      const blob = await makePNG(state);
      if (!m.isConnected) return;
      const url = URL.createObjectURL(blob);
      const fname = ((state.name || '').trim() || 'הדמות שלי') + '.png';
      const file = typeof File === 'function' ? new File([blob], fname, { type: 'image/png' }) : null;
      const touch = window.matchMedia('(pointer: coarse)').matches;
      const canShare = !!(touch && file && navigator.canShare && navigator.canShare({ files: [file] }));
      $('#pngBox', m).innerHTML = `<img alt="" src="${url}">`;
      const btn = $('[data-act="png-save"]', m);
      btn.disabled = false;
      if (canShare) btn.textContent = '📤 לשמור או לשלוח';
      $('#pngHint', m).textContent = touch ? 'אפשר גם ללחוץ לחיצה ארוכה על התמונה' : '';
      m._handlers['png-save'] = async () => {
        if (canShare) {
          try { await navigator.share({ files: [file] }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
        }
        const a = document.createElement('a'); a.href = url; a.download = fname; document.body.appendChild(a); a.click(); a.remove();
        snd.play('save');
      };
      m._onClose = () => setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error(e);
      if (m.isConnected) $('#pngBox', m).innerHTML = '<div style="padding:20px;font-weight:800">אוי, לא הצלחתי ליצור תמונה 🙈</div>';
    }
  }

  /* ---------------- gallery ---------------- */
  function showGallery() {
    screen = 'gallery'; closeAll();
    const list = S.data.gallery;
    app.innerHTML = `
      <div class="screen">
        <div class="bar"><button class="round-btn" data-act="home" aria-label="בית">🏠</button><h2>🖼️ הגלריה שלי</h2><div class="stars-pill">⭐ <span>${S.data.points}</span></div></div>
        <div class="scroll card-panel">${list.length
          ? `<div class="shelf">${list.map((g) => `<button class="gcard" data-act="g-open" data-id="${g.id}"><div class="pic">${DU.renderCard(g.state, { par: 'xMidYMid slice' })}</div><div class="meta"><span>${esc((g.state.name || '').trim() || 'בלי שם')}</span><span class="sc">⭐ ${g.score || 0}</span></div></button>`).join('')}</div>`
          : '<div class="empty-box"><span class="ico">🖼️</span>עוד אין כאן דמויות.<br>מעצבים דמות, לוחצים "סיימתי" — והיא מגיעה לכאן!</div>'}</div>
      </div>`;
  }
  function galleryModal(id) {
    const g = S.data.gallery.find((x) => x.id === id); if (!g) return;
    snd.play('tap');
    const m = openModal(`
      <div class="modal"><button class="x" data-act="close" aria-label="סגירה">✕</button>
        <h3>${esc((g.state.name || '').trim() || 'בלי שם')} <span dir="ltr" style="color:#a36b00">⭐ ${g.score || 0}</span></h3>
        <div class="preview-card">${DU.renderCard(g.state)}</div>
        <div class="row"><button class="btn" data-act="edit">✏️ לעצב אותה</button><button class="btn white" data-act="photo">📷 תמונה</button><button class="btn white" data-act="del" aria-label="מחיקה">🗑️</button></div>
      </div>`, {
      edit() {
        st = clone(g.state);
        if (!st.makeup) st.makeup = { blush: null, shadow: null, lips: null, sparkle: null };
        round = { theme: DU.pickTheme(g.theme), awarded: g.awarded || g.score || 0, gid: g.id, saved: true };
        ui.cat = 'clothes'; saveWip(); showEditor(); themeModal(true);
      },
      photo() { photoModal(g.state); },
      del() { confirmModal('למחוק אותה מהגלריה?', '🗑️ כן, למחוק', 'לא', () => { S.removeGallery(id); if (S.data.wip && S.data.wip.round && S.data.wip.round.gid === id) S.data.wip.round.saved = false; closeAll(); showGallery(); snd.play('off'); }); },
    });
  }

  /* ---------------- shop ---------------- */
  function showShop() {
    screen = 'shop'; closeAll();
    const base = S.data.wip ? S.data.wip.state : demoGirl();
    const all = products();
    const groups = [['👗 בגדים ונעליים', (p) => p.kind === 'item' && ['top', 'bottom', 'dress', 'shoes', 'socks'].includes(p.slot)], ['🎀 אביזרים', (p) => p.kind === 'item' && !['top', 'bottom', 'dress', 'shoes', 'socks'].includes(p.slot)], ['💇‍♀️ שיער', (p) => p.kind === 'hair' || p.kind === 'hc'], ['🖼️ רקעים', (p) => p.kind === 'bg']];
    const pic = (p) => {
      if (p.kind === 'item') return itemThumb(DU.itemById[p.id], null, base);
      if (p.kind === 'hair') return hairThumb(p.id, base);
      if (p.kind === 'hc') return cached('hc|' + p.id + base.skin + base.hair.style, () => { const b = bare(base); b.hair.color = p.id; return DU.renderThumb(b, 'hair'); });
      return bgThumb(DU.backgrounds.find((b) => b.id === p.id));
    };
    const html = groups.map(([name, f]) => {
      const list = all.filter(f).sort((a, b) => a.price - b.price);
      if (!list.length) return '';
      return `<div class="section-title" style="margin:14px 16px 0">${name}</div><div class="shelf shop">${list.map((p) => {
        const own = S.owns(p.key);
        return `<button class="shop-tile ${own ? 'owned' : ''}" data-act="s-buy" data-key="${p.key}"><div class="pic">${pic(p)}</div><div class="nm">${esc(p.name)}</div><div class="pr">${own ? '✓ שלך' : '⭐ ' + p.price}</div></button>`;
      }).join('')}</div>`;
    }).join('');
    const sc = $('.scroll'), top = screen === 'shop' && sc ? sc.scrollTop : 0;
    app.innerHTML = `
      <div class="screen">
        <div class="bar"><button class="round-btn" data-act="home" aria-label="בית">🏠</button><h2>🛍️ החנות</h2><div class="stars-pill">⭐ <span>${S.data.points}</span></div></div>
        <div class="scroll card-panel" id="shopScroll">${html}</div>
      </div>`;
    if (top) $('#shopScroll').scrollTop = top;
  }

  /* ---------------- confetti ---------------- */
  const cv = document.getElementById('confetti');
  let parts = [], raf = 0;
  function confetti(count = 120) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    const cols = ['#ff5fa2', '#ffd24d', '#8b6cf0', '#5cc8ff', '#2fc7a0', '#ff9a56', '#ffffff'];
    for (let i = 0; i < count; i++) {
      parts.push({ x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.5, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, r: 5 + Math.random() * 7, a: Math.random() * 6.28, va: (Math.random() - 0.5) * 0.3, c: cols[i % cols.length], k: i % 4, life: 0 });
    }
    if (!raf) raf = requestAnimationFrame(tickConfetti);
  }
  function tickConfetti() {
    const g = cv.getContext('2d'), dpr = cv.width / innerWidth;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, innerWidth, innerHeight);
    parts.forEach((p) => {
      p.x += p.vx + Math.sin(p.life / 14) * 0.8; p.y += p.vy; p.vy += 0.04; p.a += p.va; p.life++;
      g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; g.globalAlpha = Math.max(0, Math.min(1, (260 - p.life) / 40));
      if (p.k === 0) g.fillRect(-p.r, -p.r * 0.45, p.r * 2, p.r * 0.9);
      else if (p.k === 1) { g.beginPath(); g.arc(0, 0, p.r * 0.6, 0, 6.3); g.fill(); }
      else { g.fill(new Path2D(p.k === 2 ? DU.starD(0, 0, p.r) : DU.heartD(0, 0, p.r * 0.7))); }
      g.restore();
    });
    parts = parts.filter((p) => p.y < innerHeight + 30 && p.life < 260);
    if (parts.length) raf = requestAnimationFrame(tickConfetti);
    else { raf = 0; g.clearRect(0, 0, innerWidth, innerHeight); }
  }

  /* ---------------- one click handler for everything ---------------- */
  const actions = {
    home() { snd.play('tap'); showHome(); },
    mute() {
      S.data.mute = !S.data.mute; S.save(true); snd.setMuted(S.data.mute);
      document.querySelectorAll('[data-act="mute"]').forEach((b) => (b.textContent = muteIcon()));
      snd.play('tap');
    },
    title() { snd.play('tap'); titleModal(); },
    new() {
      snd.play('tap');
      const w = S.data.wip;
      if (w && !w.round.saved && DU.effort(w.state).total >= 3) confirmModal('להתחיל דמות חדשה?<br><small>הדמות שבאמצע לא נשמרה בגלריה.</small>', '✨ כן, דמות חדשה', 'להמשיך איתה', showPick);
      else showPick();
    },
    continue() { snd.play('tap'); const w = S.data.wip; if (!w) return; st = w.state; round = w.round; if (!st.makeup) st.makeup = {}; showEditor(); },
    gallery() { snd.play('tap'); showGallery(); },
    shop() { snd.play('tap'); showShop(); },
    pick(el) { startRound(el.dataset.id); },
    close() { snd.play('tap'); closeModal(); },

    cat(el) { ui.cat = el.dataset.id; autoZoom(); snd.play('tab'); drawCats(); drawPanel(); drawStage(); },
    sub(el) { ui.sub[ui.cat] = el.dataset.id; autoZoom(); snd.play('tab'); drawPanel(); drawStage(); },
    zoom() { ui.zoom = !ui.zoom; snd.play('tap'); drawStage(); },
    only() { ui.only = !ui.only; snd.play('tab'); drawPanel(true); },
    name() { snd.play('tap'); nameModal(); },
    theme() { snd.play('tap'); themeModal(false); },
    done() { finish(); },

    wear(el) { wear(el.dataset.slot, el.dataset.id); },
    color(el) { const slot = curSlot(), w = slot && st.wear[slot]; if (!w) return; w.c = el.dataset.c; lastColor[w.id] = w.c; snd.play('tap'); changed(); },
    tuck(el) { st.tuck = el.dataset.v === '1'; snd.play('tap'); changed(); },
    skin(el) { st.skin = el.dataset.c; snd.play('tap'); changed('look'); },
    faceshape(el) { st.face = el.dataset.id; snd.play('pick'); changed('look'); },
    body(el) {
      const k = el.dataset.k, d = +el.dataset.d, min = k === 'h' ? -2 : 0, max = k === 'h' ? 2 : 3;
      const v = Math.max(min, Math.min(max, (st.body[k] || 0) + d));
      if (v === (st.body[k] || 0)) return snd.play('locked');
      st.body[k] = v; snd.play(d > 0 ? 'pick' : 'off'); changed();
    },
    eyes(el) { st.eyes.shape = el.dataset.id; snd.play('pick'); changed('look'); },
    eyecolor(el) { st.eyes.color = el.dataset.c; snd.play('tap'); changed('look'); },
    brows(el) { st.brows = el.dataset.id; snd.play('pick'); changed(); },
    mouth(el) { st.mouth = el.dataset.id; snd.play('pick'); changed(); },
    makeup(el) { const k = el.dataset.k, id = el.dataset.id || null; st.makeup[k] = st.makeup[k] === id ? null : id; snd.play(st.makeup[k] ? 'pick' : 'off'); changed(); },
    bg(el) {
      const b = DU.backgrounds.find((x) => x.id === el.dataset.id);
      if (!ownsBg(b)) return buyModal({ key: 'bg:' + b.id, kind: 'bg', id: b.id, name: 'רקע ' + b.name, price: b.price }, st, () => { st.bg = b.id; changed(); });
      st.bg = b.id; snd.play('pick'); changed();
    },
    hair(el) {
      const h = DU.HAIRS.find((x) => x.id === el.dataset.id);
      if (!ownsHair(h)) return buyModal({ key: 'hair:' + h.id, kind: 'hair', id: h.id, name: 'תסרוקת ' + h.name, price: h.price }, st, () => { st.hair.style = h.id; changed('hair'); });
      st.hair.style = h.id; snd.play('pick'); changed('hair');
    },
    haircolor(el) {
      const c = el.dataset.c;
      if (!ownsHC(c)) return buyModal({ key: 'hc:' + c, kind: 'hc', id: c, name: HC_NAMES[c] || 'צבע מיוחד', price: HC_PRICE }, st, () => { st.hair.color = c; changed('hair'); });
      st.hair.color = c; snd.play('tap'); changed('hair');
    },

    'g-open'(el) { galleryModal(el.dataset.id); },
    's-buy'(el) {
      const pr = products().find((p) => p.key === el.dataset.key); if (!pr) return;
      if (S.owns(pr.key)) { snd.play('tap'); return toast('✓ כבר שלך!'); }
      buyModal(pr, S.data.wip ? S.data.wip.state : demoGirl(), () => { const sc = $('#shopScroll'), top = sc ? sc.scrollTop : 0; showShop(); if ($('#shopScroll')) $('#shopScroll').scrollTop = top; });
    },
  };

  document.addEventListener('click', (e) => {
    snd.unlock();
    const back = e.target.closest('.modal-back');
    const el = e.target.closest('[data-act]');
    if (back) {
      if (!el) { if (e.target === back && !back._sticky) { snd.play('tap'); closeModal(back); } return; }
      if (el.disabled) return;
      const h = back._handlers && back._handlers[el.dataset.act];
      if (h) return h(el);
    }
    if (!el || el.disabled) return;
    const fn = actions[el.dataset.act];
    if (fn) fn(el);
  });
  // no pinch-zoom / double-tap zoom / rubber-banding: it is a game
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => { if (!e.target.closest('.preview-card, input')) e.preventDefault(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') { const m = modalStack[modalStack.length - 1]; if (m && !m._sticky) closeModal(m); } });

  /* ---------------- go ---------------- */
  snd.setMuted(S.data.mute);
  DU.app = { showHome, showEditor, showPick, showGallery, showShop, startRound, finish, get state() { return st; }, get round() { return round; }, actions };
  showHome();
})();
