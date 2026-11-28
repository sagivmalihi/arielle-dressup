/* school.js — "תצוגת העיצובים של הכיתה": what happens inside the school, after the bike ride.
   The school hall with its little stage. The game invents four classmates, each with a design of her own
   (a theme, items of that theme from the whole catalogue, the shop too, colours that go together). They come
   up one at a time and she rates each DESIGN with one to five stars. Whatever she gives, the classmate thanks
   her happily and she earns the same few stars, so the rating is her honest taste. Then it is her turn: she
   chooses how to stand (DU.POSE_LIST) and the classmates raise their star cards for her. By the rule of
   score.js a character with real effort always gets 4–5 stars from everyone; a barely dressed one gets a
   gentle, lower result and a hint. A closing board shows what she earned and the designs of the day.

     DU.school.open({ host, state, onExit })   the screen is put into host; state = her character
                                               (seed: a number, for tests: the same classmates every time)
     DU.school.close()
     DU.school.classmates(n, state, seed, last) → [{ name, title, theme, state }] (a seed repeats the same class;
                                               last = the class before, so its names and themes do not come back at once)

   Every size in school.css is in --u: 1% of the width of the 4:3 hall (wall and floor bleed past it).
   A tap on the hall hurries the parts that play by themselves. */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const n = DU.n;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const ico = (name) => (DU.icon ? DU.icon(name) : '');
  const ABORT = { abort: true };

  const CLASS_SIZE = 4;
  const RATE_STARS = 5; // what she earns for rating one design: the same whatever she gave
  const CARD_STAR = 5; // what every star on a classmate's card is worth when it is her turn

  /* ================= the invented classmates ================= */
  const NAMES = ['נועה', 'מאיה', 'תמר', 'יעל', 'שירה', 'טליה', 'אביגיל', 'מיכל', 'רוני', 'ליה', 'עדי', 'הילה', 'נויה', 'אלה', 'רומי', 'יובל',
    'עלמה', 'ליבי', 'שחר', 'גאיה', 'מיקה', 'עמית', 'ליאן', 'אגם', 'הדס', 'שני', 'כרמל', 'זוהר', 'ענבל', 'מיה', 'אמה', 'יולי'];
  /* a look for every theme of catalog.js: t = names for the design · p = palettes "main second accent" (all from
     DU.PALETTE, so she can make the same at home) · pat = prints of fabric.js · bl / sp = blush and face sparkle that suit it ·
     fun = how often the hair gets a fantasy colour · hc = shop hair colours that suit it */
  const LOOKS = {
    beach: { t: ['נסיכת הים', 'יום כיף בחוף', 'גלים וצדפים', 'קיץ מתוק'], p: ['5cc8ff ffd24d ffffff', '7de3e0 ff9a56 fff2a8', 'ff6f91 7de3e0 ffffff', 'ffd24d 3f7fd9 ffffff'], pat: ['stripes', 'dots', 'flowers'], bl: ['peach', 'soft'], sp: ['freckles', 'glitter'], fun: 0.1, hc: ['sunset', 'mermaid'] },
    party: { t: ['מלכת המסיבה', 'יום הולדת שמח', 'בלונים וקונפטי', 'חגיגה צבעונית'], p: ['ff6f91 b48cff ffd24d', 'b48cff ff9ac1 ffffff', 'd05fb8 ffd24d 7de3e0', 'e0435f ffc1d9 ffffff'], pat: ['dots', 'hearts', 'stars'], bl: ['soft', 'hearts'], sp: ['glitter', 'stars', 'heart'], fun: 0.3, hc: ['rainbow'] },
    school: { t: ['היום הראשון בכיתה', 'תלמידה מצטיינת', 'הפסקה בחצר', 'ילקוט וחלומות'], p: ['3a4a8f ffffff e0435f', '3f7fd9 ffd24d ffffff', 'e0435f 3a4a8f ffffff', '3fbf9a ffffff 3a4a8f'], pat: ['plaid', 'stripes', 'checks'], bl: ['soft', 'peach'], sp: ['freckles'], fun: 0 },
    winter: { t: ['נסיכת השלג', 'יום חורף חמים', 'פתיתי שלג', 'שוקו חם'], p: ['e0435f ffffff 3a4a8f', '5cc8ff ffffff cfd3e6', '7b5bd6 ffc1d9 ffffff', '3fbf9a f3e3c8 e0435f'], pat: ['plaid', 'dots', 'zigzag'], bl: ['soft', 'peach'], sp: ['glitter', 'stars'], fun: 0.1 },
    magic: { t: ['פיית הכוכבים', 'קוסמת קטנה', 'יער הקסמים', 'אבקת פיות'], p: ['7b5bd6 ffd24d b48cff', 'b48cff 7de3e0 ffffff', '3a4a8f ffd24d d05fb8', 'd05fb8 b48cff fff2a8'], pat: ['stars', 'dots'], bl: ['soft', 'stars'], sp: ['stars', 'glitter', 'gems', 'butterfly'], fun: 0.5, hc: ['galaxy', 'rainbow', 'mermaid'] },
    sport: { t: ['אלופת הכיתה', 'מהירה כמו הרוח', 'יום ספורט', 'שיא חדש'], p: ['3f7fd9 ffffff ffd24d', 'e0435f ffffff 3a3346', '3fbf9a ffd24d ffffff', 'ff9a56 3a4a8f ffffff'], pat: ['stripes'], bl: ['peach'], sp: ['bandaid', 'starcheek'], fun: 0.1 },
    princess: { t: ['נסיכת הארמון', 'נשף המלכות', 'כתר וחלום', 'נסיכה ורודה'], p: ['ff9ac1 ffd24d ffffff', 'b48cff ffc1d9 ffffff', '7de3e0 ffffff ffd24d', 'ffc1d9 b48cff fff2a8'], pat: ['hearts', 'stars', 'flowers'], bl: ['soft', 'doll'], sp: ['gems', 'glitter'], fun: 0.15, hc: ['gold'] },
    nature: { t: ['טיול בין הפרחים', 'ילדת היער', 'אביב בגינה', 'פרפרים ופרחים'], p: ['8bdc7a ffd24d ffffff', '3fbf9a ff9ac1 f3e3c8', 'ff9a56 8bdc7a fff2a8', 'ffc1d9 8bdc7a ffffff'], pat: ['flowers', 'dots'], bl: ['peach', 'soft'], sp: ['freckles', 'butterfly'], fun: 0.1 },
    sleepover: { t: ['מסיבת פיג׳מות', 'לילה טוב', 'חלומות מתוקים', 'כריות ודובים'], p: ['b48cff ffc1d9 ffffff', '7de3e0 fff2a8 ffffff', 'ffc1d9 b48cff fff2a8', '3a4a8f ffd24d cfd3e6'], pat: ['stars', 'hearts', 'dots', 'stripes'], bl: ['soft', 'doll'], sp: ['stars', 'heart'], fun: 0.15 },
    anime: { t: ['גיבורת אנימה', 'אביב בטוקיו', 'פריחת הדובדבן', 'כוכבת מיפן'], p: ['3a4a8f ffffff e0435f', 'ff9ac1 e0435f ffffff', 'e0435f 3a3346 ffffff', 'b48cff ffffff ffd24d'], pat: ['flowers', 'stripes'], bl: ['manga', 'band'], sp: ['heart', 'starcheek', 'whiskers'], fun: 0.5, hc: ['sunset', 'galaxy'] },
    british: { t: ['תלמידה מלונדון', 'תה של אחר הצהריים', 'משבצות ועניבה', 'יום גשום בלונדון'], p: ['3a4a8f e0435f ffffff', 'e0435f 3a4a8f ffd24d', '3fbf9a 3a4a8f ffffff', '8a8fa8 e0435f ffffff'], pat: ['plaid', 'checks'], bl: ['soft'], sp: ['freckles'], fun: 0 },
    paris: { t: ['טיול בפריז', 'שיק פריזאי', 'קפה וקרואסון', 'ציירת קטנה'], p: ['3a3346 e0435f ffffff', 'e0435f 3a4a8f ffffff', 'ffc1d9 3a3346 ffffff', '3a4a8f ffffff e0435f'], pat: ['stripes', 'dots'], bl: ['soft'], sp: ['heart'], fun: 0.05 },
    hawaii: { t: ['אלוהה!', 'רקדנית הולה', 'פרחי הוואי', 'אי של קיץ'], p: ['ff6f91 8bdc7a ffd24d', 'ff9a56 7de3e0 ffffff', '7de3e0 ff6f91 fff2a8', 'ffd24d ff6f91 8bdc7a'], pat: ['flowers'], bl: ['peach'], sp: ['freckles', 'glitter'], fun: 0.1, hc: ['sunset', 'mermaid'] },
    cowgirl: { t: ['בוקרת אמיצה', 'החווה שלי', 'רוכבת המערב', 'שקיעה בחווה'], p: ['e0435f 3f7fd9 f3e3c8', 'ffd24d 3f7fd9 a8703d', '3fbf9a a8703d f3e3c8', 'ff9a56 3a4a8f f3e3c8'], pat: ['plaid', 'checks'], bl: ['peach'], sp: ['freckles'], fun: 0 },
    kawaii: { t: ['מתוקה כמו סוכרייה', 'ארנבון ורוד', 'ענן של סוכר', 'הכי חמודה'], p: ['ffc1d9 b48cff ffffff', 'ff9ac1 7de3e0 fff2a8', 'b48cff ffc1d9 ffffff', 'fff2a8 ff9ac1 7de3e0'], pat: ['hearts', 'dots', 'stars'], bl: ['hearts', 'doll', 'soft'], sp: ['heart', 'starcheek', 'whiskers'], fun: 0.55, hc: ['rainbow'] },
    rock: { t: ['כוכבת רוק', 'סולנית הלהקה', 'גיטרה חשמלית', 'הופעה חיה'], p: ['3a3346 e0435f cfd3e6', '3a3346 b48cff ffffff', '7b5bd6 3a3346 ffd24d', 'e0435f 3a3346 ffffff'], pat: ['zigzag', 'stars', 'checks'], bl: ['soft'], sp: ['starcheek', 'tears'], fun: 0.5, hc: ['galaxy'] },
    pop: { t: ['כוכבת פופ', 'זמרת על הבמה', 'נצנצים ואורות', 'להיט הקיץ'], p: ['d05fb8 ffd24d 7de3e0', 'ff6f91 b48cff ffffff', 'b48cff ffd24d ff9ac1', '5cc8ff ff9ac1 ffd24d'], pat: ['stars', 'hearts', 'zigzag'], bl: ['stars', 'soft'], sp: ['starcheek', 'glitter', 'stars'], fun: 0.6, hc: ['rainbow', 'gold'] },
    retro: { t: ['שנות השמונים', 'מסיבת דיסקו', 'גלגיליות וצבעים', 'ניאון זוהר'], p: ['d05fb8 7de3e0 ffd24d', 'ff9a56 b48cff 7de3e0', '5cc8ff ff6f91 ffd24d', '8bdc7a d05fb8 ffffff'], pat: ['zigzag', 'checks', 'stripes', 'dots'], bl: ['soft'], sp: ['starcheek', 'glitter'], fun: 0.4, hc: ['sunset'] },
    ballet: { t: ['בלרינה קטנה', 'אגם הברבורים', 'על קצות האצבעות', 'נסיכת הבלט'], p: ['ffc1d9 ffffff ff9ac1', 'b48cff ffffff ffc1d9', 'ffffff ffc1d9 b48cff', '7de3e0 ffffff ffc1d9'], pat: ['dots', 'hearts'], bl: ['soft', 'doll'], sp: ['glitter', 'gems'], fun: 0.1 },
    pirate: { t: ['פיראטית אמיצה', 'ציידת האוצרות', 'קפטנית הים', 'מפת האוצר'], p: ['e0435f 3a3346 ffffff', '3a4a8f e0435f f3e3c8', '3a3346 ffd24d e0435f', '3fbf9a 3a3346 f3e3c8'], pat: ['stripes'], bl: ['peach'], sp: ['bandaid', 'freckles'], fun: 0.1 },
    space: { t: ['נוסעת בחלל', 'אסטרונאוטית', 'כוכבת מהעתיד', 'טיול לירח'], p: ['5cc8ff cfd3e6 7b5bd6', '7b5bd6 7de3e0 ffffff', '3a4a8f ffd24d cfd3e6', 'b48cff 5cc8ff ffffff'], pat: ['stars', 'dots'], bl: ['soft'], sp: ['stars', 'gems'], fun: 0.55, hc: ['galaxy'] },
  };
  const GLAM = ['party', 'magic', 'princess', 'pop', 'rock', 'retro', 'space', 'kawaii', 'ballet']; // themes that like eyeshadow
  const FUN_HAIR = ['#ff9ac1', '#e35d9b', '#b48cff', '#7b5bd6', '#5cc8ff', '#59d6b5', '#f4f1ff'];
  /* things that keep the colour they were drawn with: fur, fruit, toys */
  const KEEP = /ears|tail|parrot|orange|teddy|bunny|bear|hood|strawberry|flowerpot/;
  const ANIMAL = /ears|tail|ha_bunny/; // animal ears and tails to put on
  const SETS = [['ha_catears', 'wg_cattail'], ['ha_foxears', 'wg_foxtail']];
  const SISTERS = [['school', 'british'], ['beach', 'hawaii']]; // themes too much alike to stand in one show
  const ACC = [['head', 0.9], ['hand', 0.7], ['necklace', 0.6], ['earrings', 0.5], ['bag', 0.42], ['bracelet', 0.4], ['wings', 0.34], ['side', 0.3], ['glasses', 0.22]];

  /* a small seeded generator (mulberry32), so a test can ask for the same class again */
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const rgb = (hex) => { const v = parseInt(String(hex).slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
  /* leather, straw, wood: browns and tans stay as they are */
  function natural(hex) {
    if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return false;
    const [r, g, b] = rgb(hex), max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (!d) return false;
    const l = (max + min) / 510, s = d / (255 - Math.abs(max + min - 255));
    const h = (((max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60) + 360) % 360;
    return h >= 15 && h <= 45 && s < 0.72 && l > 0.3 && l < 0.8;
  }
  const nearest = (list, hex) => { const a = rgb(hex); let best = list[0], bd = 1e9; list.forEach((c) => { const b = rgb(c), dd = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2; if (dd < bd) { bd = dd; best = c; } }); return best; };

  /* one design: theme T on base girl g (or a special character), with the random source r.
     taken = item ids the other classmates of this show already wear: she takes something else when she can */
  function design(T, g, r, taken) {
    const pick = (a) => a[Math.floor(r() * a.length)], chance = (p) => r() < p;
    const L = LOOKS[T.id] || LOOKS.party;
    const pal = pick(L.p).split(' ').map((c) => '#' + c), [main, second, accent] = pal;
    const of = (slot) => { const l = DU.items.filter((it) => it.slot === slot && it.tags.includes(T.id)), f = l.filter((it) => !taken[it.id]); return f.length ? f : l; };
    const s = DU.defaultState();
    Object.assign(s, { base: g.id, skin: g.skin, face: g.face, eyes: Object.assign({}, g.eyes), brows: g.brows, mouth: pick(['smile', 'big', 'grin', g.mouth, g.mouth]), hair: Object.assign({}, g.hair) });
    if (g.kind) { s.kind = g.kind; s.body = Object.assign({}, g.body); } else s.body = { h: pick([-1, 0, 0, 1]), m: chance(0.12) ? 1 : 0 };
    Object.assign(s.makeup, g.makeup || {});
    const wear = Object.assign({}, g.wear || {});

    /* a colour for a thing: from the palette, unless the thing has a look of its own */
    const tint = (it, c) => {
      if (it.fixed || !c || KEEP.test(it.id) || natural(it.color)) return { id: it.id };
      if (it.color === '#3a3346' && chance(0.7)) return { id: it.id }; // black things mostly stay black
      if (it.color === '#ffffff' && chance(0.5)) return { id: it.id };
      return { id: it.id, c };
    };
    const print = (w, it) => { // now and then her own fabric (fabric.js) instead of a plain colour
      if (!DU.fabric || it.fixed || !w.c || !L.pat || !chance(0.24)) return w;
      const fg = DU.lum(w.c) > 0.8 ? second : '#ffffff';
      if (fg !== w.c) w.c = DU.fabric.make({ kind: pick(L.pat), bg: w.c, fg, size: pick([1, 2, 2]) });
      return w;
    };
    const anyOf = (slot) => { const l = of(slot); return l.length ? l : DU.items.filter((it) => it.slot === slot && !it.price); };

    /* the outfit: a dress, or a top with a bottom */
    const dresses = of('dress');
    if (dresses.length && chance(0.5)) { const it = pick(dresses); wear.dress = print(tint(it, main), it); }
    else {
      const top = pick(anyOf('top')), bottom = pick(anyOf('bottom'));
      wear.top = print(tint(top, main), top);
      wear.bottom = tint(bottom, second);
      const tc = wear.top.c || top.color, bc = wear.bottom.c || bottom.color;
      if (tc === bc && !bottom.fixed) wear.bottom = { id: bottom.id, c: tc === accent ? main : accent }; // not one block of colour
    }
    wear.shoes = tint(pick(anyOf('shoes')), chance(0.5) ? second : accent);
    if (of('socks').length && chance(0.6)) wear.socks = tint(pick(of('socks')), chance(0.5) ? '#ffffff' : accent);

    /* three to five accessories of the theme; a free hand is kept for the pose */
    const role = { head: () => (chance(0.5) ? accent : main), necklace: () => accent, earrings: () => (chance(0.5) ? '#ffd24d' : accent), bag: () => (chance(0.5) ? second : accent), bracelet: () => (chance(0.5) ? accent : second), wings: () => second, glasses: () => (chance(0.5) ? null : accent), hand: () => null, side: () => null };
    const order = ACC.map((a) => [a, r()]).sort((a, b) => a[1] - b[1]).map((a) => a[0]);
    const want = 3 + Math.floor(r() * 3);
    let count = 0;
    for (let pass = 0; pass < 2; pass++) {
      for (const [k, p] of order) {
        if (count >= want) break;
        if (k === 'head' ? wear.hat || wear.hairacc : wear[k]) continue;
        if ((k === 'hand' && wear.bag) || (k === 'bag' && wear.hand)) continue;
        if (pass === 0 && !chance(p)) continue;
        let list = k === 'head' ? of('hat').concat(of('hairacc')) : of(k);
        if (g.kind) list = list.filter((it) => !ANIMAL.test(it.id)); // a wolf has ears and a tail of her own
        if (!list.length) continue;
        const it = pick(list);
        wear[it.slot] = tint(it, role[k]());
        count++;
      }
    }
    /* cat ears go with a cat's tail and fox ears with a fox's: never the ears of one and the tail of another */
    SETS.forEach(([ears, tail]) => {
      if (wear.wings && wear.wings.id === tail) { delete wear.hat; wear.hairacc = { id: ears }; }
      else if (wear.hairacc && wear.hairacc.id === ears && !wear.wings && chance(0.5)) wear.wings = { id: tail };
    });
    s.wear = wear;

    /* hair: a style of the theme; her own colour, or a fantasy one where it suits */
    const styles = DU.HAIRS.filter((h) => DU.fits('hair', h, T.id));
    if (s.kind) { if (styles.length && chance(0.45)) s.hair.style = pick(styles).id; }
    else if (styles.length && chance(0.75)) s.hair.style = pick(styles).id;
    if (L.hc && chance(0.16)) s.hair.color = pick(L.hc);
    else if (chance(L.fun || 0)) s.hair.color = pick(FUN_HAIR);

    /* face */
    if (chance(0.3)) s.eyes.shape = pick(['round', 'sparkle', 'cat', 'gentle', 'doll', 'heart', 'cool']);
    const mk = s.makeup;
    if (chance(T.id === 'rock' || T.id === 'sport' ? 0.3 : 0.6)) mk.blush = pick(L.bl || ['soft']);
    if (chance(GLAM.includes(T.id) ? 0.6 : 0.22)) mk.shadow = nearest(DU.SHADOWS, chance(0.5) ? main : second);
    if (chance(0.35)) mk.lips = T.id === 'rock' ? pick(['#b03a5b', '#7b3f6e', '#e0435f']) : pick(DU.LIPS.slice(0, 5));
    if (L.sp && chance(0.45)) mk.sparkle = pick(L.sp);

    const bgs = (DU.backgrounds || []).filter((b) => DU.fits('bg', b, T.id));
    s.bg = bgs.length ? pick(bgs).id : 'classroom';
    return { theme: T.id, title: pick(L.t), state: s, pal };
  }

  /* n classmates for one show: n themes, n different girls (not hers, when possible), no two outfits alike,
     and in about half the shows one of them is a special character.
     last = the classmates of the show before: their names, themes and girls rest for a round */
  function classmates(count, hero, seed, last) {
    const r = seed == null ? Math.random : rng(seed);
    const pick = (a) => a[Math.floor(r() * a.length)];
    const shuffle = (a) => a.map((x) => [x, r()]).sort((a, b) => a[1] - b[1]).map((x) => x[0]);
    const fresh = (list, used, key) => { const l = list.filter((x) => !used.includes(key ? x[key] : x)); return l.length >= count ? l : list; };
    hero = hero || {}; last = last || [];
    const themes = [], near = (a, b) => SISTERS.some((p) => p.includes(a.id) && p.includes(b.id));
    shuffle(fresh(DU.THEMES.filter((t) => LOOKS[t.id]), last.map((m) => m.theme), 'id')).forEach((t) => { if (themes.length < count && !themes.some((x) => near(x, t))) themes.push(t); });
    let girls = shuffle(fresh(DU.GIRLS.filter((g) => g.id !== hero.base), last.map((m) => m.state.base), 'id'));
    if (girls.length < count) girls = girls.concat(shuffle(DU.GIRLS));
    const own = (hero.name || '').trim();
    const names = shuffle(fresh(NAMES.filter((x) => x !== own), last.map((m) => m.name)));
    const specials = (DU.SPECIALS || []).filter((x) => x.kind && x.kind !== hero.kind && x.id !== hero.base);
    const spAt = specials.length && r() < 0.5 ? Math.floor(r() * count) : -1;
    const out = [], taken = {};
    themes.forEach((T, i) => {
      const g = i === spAt ? pick(specials) : girls[i];
      let d = null;
      for (let k = 0; k < 6; k++) { // try again if her main garment is already in this show
        d = design(T, g, r, taken);
        if (!taken[(d.state.wear.dress || d.state.wear.top).id]) break;
      }
      Object.keys(d.state.wear).forEach((slot) => (taken[d.state.wear[slot].id] = 1));
      d.name = names[i % names.length];
      d.state.name = d.name;
      out.push(d);
    });
    return out;
  }

  /* ================= small drawn things ================= */
  const STARD = DU.starD(0, 0, 10, 5, 0.5);
  const starSvg = (cls = '') => `<svg class="${cls}" viewBox="-11 -11 22 22" aria-hidden="true"><path d="${STARD}" fill="#ffc83d" stroke="#e8932a" stroke-width="1.6" stroke-linejoin="round"/><path d="M-3.2 -3.6Q-1 -6.4 1.6 -6.6" fill="none" stroke="#fff6c9" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  /* a star she can fill: pale, and gold once it is given */
  const rateSvg = `<svg viewBox="-12 -12 24 24" aria-hidden="true"><path class="sc-s0" d="${STARD}" fill="#fff6dc" stroke="#e9c98a" stroke-width="1.5" stroke-linejoin="round" stroke-dasharray="2.4 2"/><g class="sc-s1"><path d="${STARD}" fill="#ffc83d" stroke="#e8932a" stroke-width="1.7" stroke-linejoin="round"/><path d="M-3.2 -3.6Q-1 -6.4 1.6 -6.6" fill="none" stroke="#fff6c9" stroke-width="1.6" stroke-linecap="round"/></g></svg>`;
  /* the stars she gave, small; they fill from the right, like the big ones she tapped */
  const miniStars = (k) => `<span class="sc-mini">${Array.from({ length: 5 }, (_, i) => `<svg viewBox="-11 -11 22 22" aria-hidden="true"><path d="${STARD}" fill="${i < k ? '#ffc83d' : '#efe4d2'}" stroke="${i < k ? '#e8932a' : '#d9c8ae'}" stroke-width="1.6" stroke-linejoin="round"/></svg>`).join('')}</span>`;

  /* the teacher: a wise owl with glasses and a graduation cap, on her perch (swing = true: the perch hangs on two ropes) */
  function owlSvg(swing) {
    const F = '#b79bff', L = '#5b3fa8', D = '#9a7df0';
    const both = (svg) => svg + `<g transform="matrix(-1 0 0 1 100 0)">${svg}</g>`;
    let g = (swing ? `<path d="M9 97V-70M91 97V-70" stroke="#c9a57f" stroke-width="1.8"/>` : '') + `<path d="M3 97H97" stroke="#a56a36" stroke-width="7.4"/><path d="M3 97H97" stroke="#d79c60" stroke-width="4.6"/>`;
    g += `<path d="M43 86L50 101L57 86Z" fill="${D}" stroke="${L}" stroke-width="2"/>`;
    g += both(`<path d="M27 34L22 13L40 24Z" fill="${F}" stroke="${L}" stroke-width="2.4"/>`);
    g += `<path d="M50 20C72 20 80 38 80 60C80 80 68 93 50 93C32 93 20 80 20 60C20 38 28 20 50 20Z" fill="${F}" stroke="${L}" stroke-width="2.4"/>`;
    g += `<ellipse cx="50" cy="73" rx="17" ry="17.5" fill="#f3ecff"/><path d="M41 66l3 3l3 -3M53 66l3 3l3 -3M47 75l3 3l3 -3M41 83l3 3l3 -3M53 83l3 3l3 -3" fill="none" stroke="#cdb9ff" stroke-width="1.8"/>`;
    g += both(`<g class="sc-owl-wing"><path d="M22 52C11 60 11 79 23 87C28 76 28 62 22 52Z" fill="${D}" stroke="${L}" stroke-width="2.2"/></g>`);
    g += both(`<circle cx="38" cy="43" r="12.4" fill="#fff8ee"/><circle cx="38.6" cy="43.6" r="6.6" fill="#3a2a5c"/><circle cx="40.8" cy="41" r="2.3" fill="#fff"/><circle cx="36.6" cy="46.6" r="1.1" fill="#fff"/>`);
    g += both(`<g class="sc-owl-lid"><circle cx="38" cy="43" r="12.4" fill="#d9c8ff"/><path d="M30 44.5q8 5 16 0" fill="none" stroke="${L}" stroke-width="2.2"/></g>`);
    g += both(`<circle cx="38" cy="43" r="12.4" fill="none" stroke="#ffab2e" stroke-width="2.6"/><ellipse cx="24" cy="55" rx="4" ry="2.6" fill="#ff8fb5" opacity=".6"/>`);
    g += `<path d="M49 38.6h2" stroke="#ffab2e" stroke-width="2.6"/><path d="M46 49.5H54L50 57.5Z" fill="#ffb347" stroke="#d98420" stroke-width="1.6"/>`;
    g += both(`<path d="M41 93v5M37 93.5l-2 4M45 93.5l2 4" fill="none" stroke="#f29a2e" stroke-width="2.6"/>`);
    g += `<path d="M34 19v7q16 7 32 0v-7Z" fill="#4a3a78" stroke="#241640" stroke-width="2"/><path d="M50 4L82 15L50 26L18 15Z" fill="#3a2a5c" stroke="#241640" stroke-width="2"/><path d="M50 15L76 16.5V29" fill="none" stroke="#ffcf40" stroke-width="2"/><circle cx="76" cy="31" r="3.2" fill="#ffcf40" stroke="#d99a1e" stroke-width="1.2"/><circle cx="50" cy="15" r="2.2" fill="#ffcf40"/>`;
    return `<svg viewBox="0 0 100 104" aria-hidden="true"><g stroke-linejoin="round" stroke-linecap="round">${g}</g></svg>`;
  }
  /* the school bell on the wall */
  const bellSvg = `<svg viewBox="0 0 60 60" aria-hidden="true"><g stroke-linejoin="round" stroke-linecap="round">
    <g class="sc-bell-lines" fill="none" stroke="#ff9a56" stroke-width="2.6"><path d="M8 18q-5 9 0 18M52 18q5 9 0 18"/><path d="M2 14q-6 13 0 26M58 14q6 13 0 26" stroke-opacity=".55"/></g>
    <rect x="17" y="6" width="26" height="48" rx="7" fill="#dfe6f5" stroke="#8b97b8" stroke-width="2"/>
    <path d="M30 50L40 43" stroke="#8b97b8" stroke-width="2.6"/><circle cx="41" cy="42.5" r="3.4" fill="#aab4d2" stroke="#6f7ba0" stroke-width="1.6"/>
    <g class="sc-bell-dome"><circle cx="30" cy="26" r="15.5" fill="#ff6f6f" stroke="#c64545" stroke-width="2.2"/><circle cx="30" cy="26" r="9.5" fill="none" stroke="#ffb3b3" stroke-width="1.8" stroke-opacity=".8"/><circle cx="30" cy="26" r="3.4" fill="#ffd95c" stroke="#d99a1e" stroke-width="1.4"/><path d="M19.5 20q3.4 -6.4 9.6 -7.4" fill="none" stroke="#fff" stroke-width="2.4" stroke-opacity=".8"/></g>
  </g></svg>`;

  /* ---------- the hall (viewBox 400×300 = the 4:3 picture; the wall, the floor and the flags go on past it) ---------- */
  function hallSvg(u) {
    const W = '#d79c60', WL = '#a56a36', WH = '#f3c995'; // the wood of the stage: fill, line, light
    const defs = `<defs>
      <linearGradient id="${u}w" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="150"><stop offset="0" stop-color="#fff7e3"/><stop offset="1" stop-color="#ffe9c4"/></linearGradient>
      <pattern id="${u}wp" width="58" height="58" patternUnits="userSpaceOnUse"><path d="${DU.starD(14, 16, 4.4, 5, 0.5)}" fill="#fff" fill-opacity=".75"/><circle cx="43" cy="44" r="2.3" fill="#fff" fill-opacity=".75"/></pattern>
      <linearGradient id="${u}f" gradientUnits="userSpaceOnUse" x1="0" y1="196" x2="0" y2="300"><stop offset="0" stop-color="#f8ddb4"/><stop offset="1" stop-color="#ebc28c"/></linearGradient>
      <linearGradient id="${u}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe8ff"/><stop offset=".72" stop-color="#e9f8ff"/><stop offset="1" stop-color="#fff7e6"/></linearGradient>
      <linearGradient id="${u}st" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3ad70"/><stop offset="1" stop-color="#f5d09c"/></linearGradient>
      <linearGradient id="${u}in" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f4f6b" stop-opacity=".34"/><stop offset="1" stop-color="#1f4f6b" stop-opacity="0"/></linearGradient>
      <radialGradient id="${u}sh"><stop offset="0" stop-color="#7a4a1f" stop-opacity=".3"/><stop offset="1" stop-color="#7a4a1f" stop-opacity="0"/></radialGradient>
      <radialGradient id="${u}gl"><stop offset="0" stop-color="#fff6c4" stop-opacity=".95"/><stop offset="1" stop-color="#fff6c4" stop-opacity="0"/></radialGradient>
      <clipPath id="${u}op"><rect x="102" y="34" width="196" height="154"/></clipPath>
    </defs>`;

    /* wall, the painted band along its foot, floor */
    let s = `<rect x="-1500" y="-1300" width="3400" height="1500" fill="url(#${u}w)"/><rect x="-1508" y="-1300" width="3422" height="1446" fill="url(#${u}wp)"/>`;
    s += `<rect x="-1500" y="150" width="3400" height="46" fill="#bfeadd"/><rect x="-1500" y="146" width="3400" height="5.5" fill="#fff"/><rect x="-1500" y="151.5" width="3400" height="2" fill="#7fcdb8" opacity=".5"/>`;
    for (let x = -1500 + 13; x < 1900; x += 26) s += `<circle cx="${x}" cy="173" r="2.6" fill="#fff" fill-opacity=".6"/>`;
    s += `<rect x="-1500" y="196" width="3400" height="1500" fill="url(#${u}f)"/><rect x="-1500" y="300" width="3400" height="1400" fill="#ebc28c"/>`;
    s += `<rect x="-1500" y="191" width="3400" height="6.5" fill="#e0a565"/><rect x="-1500" y="191" width="3400" height="1.6" fill="#f6cf98"/>`;
    let seams = '', joints = '';
    const SEAM = [196, 207, 220, 236, 256, 281, 312, 351, 400, 462, 540, 640];
    SEAM.slice(1, -1).forEach((y, i) => {
      seams += `M-1500 ${y}H1900`;
      const step = 150 + i * 34;
      for (let x = -1500 + ((i * 0.37) % 1) * step; x < 1900; x += step) joints += `M${n(x)} ${SEAM[i]}V${y}`;
    });
    s += `<path d="${seams}" fill="none" stroke="#d2a064" stroke-width="1.2" opacity=".5"/><path d="${joints}" fill="none" stroke="#d2a064" stroke-width="1.1" opacity=".38"/>`;

    /* flags on a string, all along the top of the wall */
    const FL = ['#ff8fc0', '#ffd24d', '#7de3e0', '#b99cff', '#8bdc7a', '#ff9a56'];
    let string = '', flags = '', fi = 0;
    for (let x0 = -700; x0 < 1100; x0 += 100) {
      string += `M${x0} 3Q${x0 + 50} 19 ${x0 + 100} 3`;
      [0.14, 0.38, 0.62, 0.86].forEach((t) => {
        const x = x0 + t * 100, y = 3 + 2 * t * (1 - t) * 16, slope = 2 * (1 - 2 * t) * 16 / 100;
        flags += `<path d="M${n(x - 6.5)} ${n(y - 6.5 * slope)}L${n(x + 6.5)} ${n(y + 6.5 * slope)}L${n(x)} ${n(y + 14)}Z" fill="${FL[fi++ % FL.length]}"/>`;
      });
    }
    s += `<g opacity=".95">${flags}<path d="${string}" fill="none" stroke="#c9a57f" stroke-width="1.3"/></g>`;

    /* what the children drew, taped to the wall */
    const sheet = (x, y, w, h, rot, paper, tape, inner) => `<g transform="translate(${x} ${y}) rotate(${rot} ${w / 2} ${h / 2})"><rect x="1.6" y="2.2" width="${w}" height="${h}" rx="1.4" fill="#a8743c" opacity=".2"/><rect width="${w}" height="${h}" rx="1.4" fill="${paper}"/><g fill="none" stroke-linecap="round" stroke-linejoin="round">${inner}</g><rect x="${w / 2 - 6.5}" y="-3.4" width="13" height="6.4" rx="1" fill="${tape}" opacity=".85" transform="rotate(-7 ${w / 2} 0)"/></g>`;
    const house = `<path d="M4 39q14 -4 28 0" stroke="#6cc070" stroke-width="3.2"/><rect x="10" y="22" width="16" height="15" fill="#ffc1d9" stroke="#e0679d" stroke-width="1.7"/><path d="M7.500 23L18 11.5L28.500 23Z" fill="#ff8a7a" stroke="#d2553f" stroke-width="1.7"/><rect x="16" y="29" width="5" height="8" fill="#b99cff"/><rect x="12" y="25" width="3.6" height="3.6" fill="#bfe8ff"/><circle cx="29.500" cy="8.500" r="3.6" fill="#ffd54d"/><path d="M29.500 2.600v-1.400M35.400 8.500h1.400M33.700 4.300l1 -1M33.700 12.700l1 1M25.300 4.300l-1 -1" stroke="#f2b33d" stroke-width="1.4"/>`;
    const bloom = `<path d="M17 41V23" stroke="#5fbf6a" stroke-width="2.6"/><path d="M17 33q-7 -1 -8 -7q7 0 8 7ZM17 36q7 -1 8 -7q-7 0 -8 7Z" fill="#8bdc7a"/>${[0, 72, 144, 216, 288].map((a) => `<circle cx="${n(17 + Math.cos((a - 90) * Math.PI / 180) * 6.2)}" cy="${n(16 + Math.sin((a - 90) * Math.PI / 180) * 6.2)}" r="4.6" fill="#ff8fc0"/>`).join('')}<circle cx="17" cy="16" r="3.8" fill="#ffd54d"/><path d="M27 9q3 -4 5 0q-2 3 -5 0ZM27 9q-3 -4 -5 0q2 3 5 0Z" fill="#b99cff"/>`;
    const bow = `<path d="M5 27A15 15 0 0 1 35 27" stroke="#ff7a6b" stroke-width="3"/><path d="M8.200 27A11.800 11.800 0 0 1 31.800 27" stroke="#ffd24d" stroke-width="3"/><path d="M11.400 27A8.600 8.600 0 0 1 28.600 27" stroke="#8bdc7a" stroke-width="3"/><path d="M14.600 27A5.400 5.400 0 0 1 25.400 27" stroke="#5cc8ff" stroke-width="3"/><g fill="#fff"><circle cx="5" cy="27" r="3.4"/><circle cx="9" cy="28" r="2.8"/><circle cx="35" cy="27" r="3.4"/><circle cx="31" cy="28" r="2.8"/></g>`;
    const sketch = `<path d="M17 7q-3 0 -3 -2.500q0 -2.300 3 -2.300q3 0 3 2.300" stroke="#8a7aa3" stroke-width="1.3"/><path d="M12 12Q17 15 22 12L28 34Q17 38 6 34Z" fill="#c9b3ff" stroke="#8b6cf0" stroke-width="1.6"/><path d="M10 20.500Q17 23 24 20.500" stroke="#fff" stroke-width="1.6"/><path d="${DU.starD(17, 28, 3.2)}" fill="#ffd54d"/><rect x="5" y="39.500" width="6" height="4.500" rx="1" fill="#ff8fc0"/><rect x="14" y="39.500" width="6" height="4.500" rx="1" fill="#7de3e0"/><rect x="23" y="39.500" width="6" height="4.500" rx="1" fill="#ffd24d"/>`;
    const heart = `<path d="${DU.heartD(15, 15, 9)}" fill="#ff6f91"/><path d="${DU.starD(6, 26, 2.6)}" fill="#ffd24d"/><path d="${DU.starD(25, 5, 2.4)}" fill="#ffd24d"/>`;
    s += sheet(8, 82, 36, 44, -4, '#fffdf6', '#ffd24d', house) + sheet(52, 90, 34, 44, 3.5, '#fff6fb', '#7de3e0', bloom);
    s += sheet(312, 86, 40, 34, 3, '#eaf6ff', '#ff9ac1', bow) + sheet(358, 92, 34, 47, -3.5, '#fffdf6', '#b99cff', sketch);
    s += sheet(-58, 60, 36, 44, 5, '#fff6fb', '#ffd24d', house) + sheet(-96, 96, 30, 30, -6, '#fffdf6', '#7de3e0', heart) + sheet(-46, 110, 34, 44, -2, '#eefbf3', '#ff9ac1', bloom);
    s += sheet(420, 62, 40, 34, -4, '#eaf6ff', '#ffd24d', bow) + sheet(466, 98, 30, 30, 6, '#fff6fb', '#b99cff', heart) + sheet(424, 104, 34, 47, 2, '#fffdf6', '#7de3e0', sketch);

    /* the stage: a backdrop the class painted, the boards, the wooden frame */
    const cloud = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})" fill="#fff"><ellipse cx="0" cy="0" rx="19" ry="7.500"/><circle cx="-8" cy="-4" r="7.500"/><circle cx="4" cy="-7" r="9.500"/><circle cx="13" cy="-2" r="6"/></g>`;
    let rays = '';
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; rays += `M${n(Math.cos(a) * 17)} ${n(Math.sin(a) * 17)}L${n(Math.cos(a) * 23)} ${n(Math.sin(a) * 23)}`; }
    let bk = `<rect x="102" y="34" width="196" height="154" fill="url(#${u}sky)"/>`;
    bk += `<g transform="translate(136 76)"><path d="${rays}" fill="none" stroke="#ffcf5a" stroke-width="3.2" stroke-linecap="round"/><circle r="13.500" fill="#ffe27a" stroke="#f2b33d" stroke-width="1.8"/><circle cx="-4.400" cy="-2" r="1.400" fill="#b9822a"/><circle cx="4.400" cy="-2" r="1.400" fill="#b9822a"/><path d="M-4.600 3.200q4.600 4.400 9.200 0" fill="none" stroke="#b9822a" stroke-width="1.5" stroke-linecap="round"/></g>`;
    bk += cloud(262, 72, 1) + cloud(176, 106, 0.62) + cloud(238, 118, 0.5);
    bk += `<path d="M102 166Q150 136 204 158T298 146V188H102Z" fill="#c4eab3"/><path d="M102 178Q164 158 226 173T298 168V188H102Z" fill="#a4dc98"/>`;
    [[118, 176, '#ff8fc0'], [140, 169, '#ffd24d'], [262, 171, '#ff8fc0'], [284, 176, '#b99cff'], [170, 180, '#fff'], [244, 181, '#fff']].forEach(([x, y, c]) => (bk += `<path d="M${x} ${y + 3}v6" stroke="#6cbf6a" stroke-width="1.4"/><circle cx="${x}" cy="${y}" r="3.2" fill="${c}"/><circle cx="${x}" cy="${y}" r="1.2" fill="#ffb02e"/>`));
    bk += `<rect x="102" y="34" width="196" height="46" fill="url(#${u}in)"/>`;
    s += `<g clip-path="url(#${u}op)">${bk}</g>`;
    s += `<ellipse cx="200" cy="228" rx="132" ry="7" fill="url(#${u}sh)"/>`;
    let boards = '';
    for (let i = 1; i < 8; i++) boards += `M${n(102 + i * 24.5)} 188L${n(92 + i * 27)} 204`;
    s += `<path d="M102 188H298L308 204H92Z" fill="url(#${u}st)"/><path d="${boards}" fill="none" stroke="#c98d55" stroke-width="1" opacity=".6"/>`;
    s += `<rect x="92" y="204" width="216" height="21.500" fill="${W}"/><rect x="92" y="204" width="216" height="4.500" fill="#7a4a1f" opacity=".16"/>`;
    let planks = '';
    for (let x = 110; x < 308; x += 18) planks += `M${x} 205V225`;
    s += `<path d="${planks}" fill="none" stroke="${WL}" stroke-width="1" opacity=".3"/><path d="M92 204V225.500H308V204" fill="none" stroke="${WL}" stroke-width="1.6"/><path d="M92 204H308" stroke="#fff1d6" stroke-width="1.8"/>`;
    [[104, 215, 4.6, '#ffd24d'], [120, 211, 3, '#ff9ac1'], [296, 215, 4.6, '#ffd24d'], [280, 211, 3, '#7de3e0']].forEach(([x, y, rr, c]) => (s += `<path d="${DU.starD(x, y, rr, 5, 0.5)}" fill="${c}" stroke="#fff" stroke-width="1"/>`));
    for (let i = 0; i < 6; i++) { const x = 112 + i * 35.2; s += `<circle cx="${n(x)}" cy="201" r="8" fill="url(#${u}gl)"/><path d="M${n(x - 4.2)} 204A4.200 4.200 0 0 1 ${n(x + 4.2)} 204Z" fill="#fff6cf" stroke="#e0a52f" stroke-width="1.2"/>`; }
    s += `<rect x="94.500" y="30" width="8.500" height="175" rx="1.6" fill="${W}" stroke="${WL}" stroke-width="1.6"/><rect x="297" y="30" width="8.500" height="175" rx="1.6" fill="${W}" stroke="${WL}" stroke-width="1.6"/>`;
    s += `<path d="M97.200 36V200M299.700 36V200" stroke="${WH}" stroke-width="1.6" opacity=".8"/>`;
    s += `<rect x="89" y="23.500" width="222" height="11.500" rx="3.4" fill="${W}" stroke="${WL}" stroke-width="1.6"/><path d="M94 27H306" stroke="${WH}" stroke-width="1.8" opacity=".85"/>`;
    /* where the classmates stand, on the floor at both sides of the stage */
    SPOT_X.forEach((x) => (s += `<ellipse cx="${n(x * 4)}" cy="${n(SPOT_Y * 4 + 0.6)}" rx="17" ry="4.2" fill="#fff" fill-opacity=".42"/>`));
    return `<svg class="sc-hall" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">${defs}${s}</svg>`;
  }
  function valanceSvg(u) {
    let sc = 'M0 0H196V9';
    for (let i = 6; i >= 0; i--) sc += `Q${i * 28 + 14} 27 ${i * 28} 9`;
    return `<svg class="sc-val" viewBox="0 0 196 22" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${u}vg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16768c"/><stop offset="1" stop-color="#2fb0c2"/></linearGradient></defs>
      <path d="${sc}Z" fill="url(#${u}vg)"/><path d="${sc.replace('M0 0H196V9', 'M196 9')}" fill="none" stroke="#ffd24d" stroke-width="1.8"/>
      ${[28, 56, 84, 112, 140, 168].map((x) => `<circle cx="${x}" cy="10" r="2.3" fill="#ffd24d"/>`).join('')}</svg>`;
  }

  /* a little doll drawn from the numbers of a pose, so the button shows what she will really do
     (also when a busy hand keeps an arm low). c = { skin, hair, dress } */
  function doll(p, c) {
    const rad = Math.PI / 180, q = (v) => Math.round(v * 10) / 10, K = '#4b3878';
    const arm = (s, a) => {
      const a1 = (11 + (a ? a[0] : 0)) * rad, a2 = (5 + (a ? a[0] + a[1] : 0)) * rad, len = 8.6;
      const S = [24 + s * 6.2, 22.6], E = [S[0] + s * Math.sin(a1) * len, S[1] + Math.cos(a1) * len], H = [E[0] + s * Math.sin(a2) * len, E[1] + Math.cos(a2) * len];
      const d = `M${q(S[0])} ${q(S[1])}L${q(E[0])} ${q(E[1])}L${q(H[0])} ${q(H[1])}`;
      return `<path d="${d}" stroke="${K}" stroke-width="5.2"/><path d="${d}" stroke="${c.skin}" stroke-width="2.9"/>`;
    };
    const eye = (x, kind) => (kind === 'up' ? `<path d="M${x - 1.7} 13.600q1.700 -2.400 3.400 0" stroke="${K}" stroke-width="1.2"/>` : kind === 'down' ? `<path d="M${x - 1.7} 12.600q1.700 2.200 3.400 0" stroke="${K}" stroke-width="1.2"/>` : `<circle cx="${x}" cy="13" r="1.150" fill="${K}"/>`);
    const e = p.eyes === 'happy' ? ['up', 'up'] : p.eyes === 'calm' ? ['down', 'down'] : p.eyes === 'wink' ? ['up', 'dot'] : ['dot', 'dot'];
    const mouth = p.mouth === 'kiss' ? `<path d="${DU.heartD(24, 16.6, 1.5)}" fill="#e0457f"/>` : p.mouth === 'big' || p.mouth === 'grin' ? `<path d="M21.800 15.600h4.400q-.4 2.600 -2.200 2.600t-2.200 -2.600Z" fill="#c2356f"/>` : `<path d="M22 15.800q2 1.800 4 0" stroke="${K}" stroke-width="1.100"/>`;
    const lift = p.hop ? -3 : 0;
    let g = `<g transform="translate(0 ${lift}) rotate(${q((p.lean || 0) * 1.25)} 24 55)" fill="none" stroke-linecap="round" stroke-linejoin="round">`;
    g += `<path d="M21.400 41V54.500M26.600 41V54.500" stroke="${K}" stroke-width="5"/><path d="M21.400 41V54.500M26.600 41V54.500" stroke="${c.skin}" stroke-width="2.700"/><path d="M19.600 55.300h3.400M25 55.300h3.400" stroke="${K}" stroke-width="2.800"/>`;
    g += `<path d="M18.800 21Q24 23 29.200 21L33.800 41Q24 44.500 14.200 41Z" fill="${c.dress}" stroke="${K}" stroke-width="1.700"/>`;
    g += arm(-1, p.armL) + arm(1, p.armR);
    g += `<g transform="rotate(${q(p.head || 0)} 24 20)"><circle cx="15.800" cy="14.500" r="3" fill="${c.hair}" stroke="${K}" stroke-width="1.400"/><circle cx="32.200" cy="14.500" r="3" fill="${c.hair}" stroke="${K}" stroke-width="1.400"/><circle cx="24" cy="12.600" r="7.600" fill="${c.skin}" stroke="${K}" stroke-width="1.700"/><path d="M16.600 12Q17 5.200 24 5.200Q31 5.200 31.400 12Q27.500 8.400 24 9.800Q20.500 8.400 16.600 12Z" fill="${c.hair}" stroke="${K}" stroke-width="1.400"/>${eye(21, e[0])}${eye(27, e[1])}${mouth}</g></g>`;
    if (p.hop) g += `<path d="M17 57.500h14M20 59.300h8" fill="none" stroke="${K}" stroke-width="1.200" stroke-linecap="round" stroke-opacity=".45"/>`;
    if (p.fx === 'heart') g += `<path d="${DU.heartD(40, 9, 3.6)}" fill="#ff5fa2"/><path d="${DU.heartD(8.5, 15, 2.3)}" fill="#ff9ac1"/>`;
    if (p.fx === 'star') g += `<path d="${DU.sparkleD(40.5, 9, 4.6)}" fill="#ffc83d"/><path d="${DU.sparkleD(7.5, 15, 3)}" fill="#ffc83d"/>`;
    return `<svg viewBox="0 0 48 61" aria-hidden="true">${g}</svg>`;
  }

  /* ---------- sounds ---------- */
  const semi = (base, st) => base * Math.pow(2, st / 12);
  const tone = (f, o) => { try { if (DU.sound && DU.sound.tone) DU.sound.tone(f, o); } catch (e) { /* never break the show */ } };
  const play = (name) => { try { if (DU.sound) DU.sound.play(name); } catch (e) { /* ignore */ } };
  const SFX = {
    bell: () => { for (let i = 0; i < 9; i++) tone(i % 2 ? 1865 : 1568, { type: 'triangle', at: i * 0.075, dur: 0.11, vol: 0.09 }); tone(1568, { at: 0.68, dur: 0.6, vol: 0.07 }); },
    whoosh: () => tone(240, { type: 'triangle', dur: 0.3, slide: 900, vol: 0.06 }),
    step: (i) => tone(semi(392, i % 2 ? 3 : 0), { type: 'sine', dur: 0.07, vol: 0.08 }),
    chime: (st = 0) => [0, 4, 7, 12].forEach((s, i) => tone(semi(660, st + s), { type: 'sine', at: i * 0.07, dur: 0.5, vol: 0.12 })),
    pop: (st = 0) => tone(semi(520, st), { type: 'triangle', dur: 0.16, slide: semi(780, st), vol: 0.17 }),
    rate: (k) => { for (let i = 0; i < k; i++) tone(semi(784, [0, 2, 4, 7, 12][i]), { type: 'sine', at: i * 0.08, dur: 0.26, vol: 0.13 }); },
    star: (i = 0) => tone(semi(784, [0, 2, 4, 7, 9, 12, 14, 16][i % 8]), { type: 'sine', dur: 0.24, vol: 0.11 }),
    soft: (st = 0) => tone(semi(440, st), { type: 'sine', dur: 0.22, vol: 0.12 }),
    clap: () => { for (let i = 0; i < 16; i++) tone(1500 + Math.random() * 1900, { type: 'triangle', at: i * 0.055 + Math.random() * 0.03, dur: 0.05, vol: 0.045 }); },
    drum: () => { for (let i = 0; i < 6; i++) tone(196, { type: 'triangle', at: i * 0.09, dur: 0.06, vol: 0.1 }); },
  };

  /* ---------- what is said ---------- */
  const THANKS = [
    null,
    ['תודה שדירגת!', 'תודה! היה כיף להציג!'],
    ['תודה!', 'תודה! היה כיף להציג!'],
    ['תודה! איזה כיף!', 'תודה רבה!'],
    ['תודה רבה! איזה כיף!', 'יש! תודה!'],
    ['וואו, חמישה כוכבים! תודה!', 'יש!! תודה רבה!', 'איזה כיף! תודה!'],
  ];
  const SAY = {
    dress: ['איזו שמלה יפה!', 'השמלה מהממת!'], top: ['איזו חולצה יפה!'], bottom: ['איזו תלבושת!'], shoes: ['הנעליים הכי מגניבות!'],
    hat: ['הכובע מושלם!'], hairacc: ['איזה יופי בשיער!'], glasses: ['איזה משקפיים!'], earrings: ['איזה עגילים!'], necklace: ['השרשרת יפהפייה!'],
    bag: ['איזה תיק חמוד!'], wings: ['הכנפיים קסומות!'], socks: ['איזה גרביים!'], bracelet: ['איזה צמיד!'],
  };
  const SAY_ANY = ['מהמם!', 'הכי יפה!', 'אני רוצה גם!', 'איזה צבעים!', 'כל הכבוד!'];
  const SAY_LOW = ['התחלה יפה!', 'אהבתי את הפוזה!', 'עוד קצת פרטים וזה מושלם!', 'איזה חיוך!'];
  /* what the class thinks of her: the stars on every card and a line that is true for what she wears */
  function verdict(state, count) {
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const ef = DU.effort(state), ok = !!ef.invested;
    if (!ok) return { ok, stars: Array(count).fill(3), say: SAY_LOW.slice(0, count) };
    const stars = Array(count).fill(5); // real effort: four or five from everyone, more fives the more she did
    const fours = ef.total >= 12 ? 0 : ef.total >= 7 ? 1 : 2;
    for (let k = 0; k < fours; k++) stars[(Math.floor(Math.random() * count) + k * 2) % count] = 4;
    const wear = state.wear || {}, lines = [];
    Object.keys(wear).forEach((slot) => {
      const it = wear[slot] && DU.itemById[wear[slot].id];
      if (!it) return;
      if (SAY[slot]) lines.push(pick(SAY[slot]));
      else if (slot === 'hand' || slot === 'side') lines.push(`${it.name}! איזה רעיון!`);
    });
    if (ef.ch.hairStyle || ef.ch.hairColor) lines.push('איזה שיער!');
    if (ef.makeup >= 2) lines.push('האיפור נוצץ!');
    const say = ['איזו פוזה!'];
    lines.sort(() => Math.random() - 0.5).concat(SAY_ANY.slice().sort(() => Math.random() - 0.5)).forEach((l) => { if (say.length < count && !say.includes(l)) say.push(l); });
    return { ok, stars, say: say.sort(() => Math.random() - 0.5) };
  }

  /* ================= the screen ================= */
  /* where things are, in u (1% of the hall's width); the box a girl is drawn in is in school.css (.sc-fig) */
  const FEET = 50; // the feet of a girl on the stage
  const SPOT_S = 0.6, SPOT_Y = 61.6; // a classmate who stands by the stage: how small, and where her feet are
  const SPOT_X = [82.4, 17.6, 93, 7]; // the first one stands right of the stage, the next one left of it…
  /* a pose as this girl can strike it: with full hands (DU.freePose), and, if a pet stands next to her while the parrot
     sits on her shoulder, without the lean (the two are drawn in one part: the pet would tip over with her) */
  const poseOf = (st, id) => {
    const p = DU.freePose(st, id), w = st.wear || {};
    if (w.side && w.wings && w.wings.id === 'wg_parrot') p.lean = 0;
    return p;
  };
  const dollColours = (st) => {
    const hex = (c) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : null);
    const w = st.wear || {}, main = w.dress || w.top, it = main && DU.itemById[main.id];
    let dress = (main && hex(main.c)) || (it && hex(it.color)) || '#ff8fc0';
    if (DU.lum(dress) < 0.32) dress = DU.mix(dress, '#ffffff', 0.38); // a black dress would hide the little arms
    return { skin: hex(st.skin) || '#ffe3d1', hair: st.hair && st.hair.style !== 'none' ? hex(st.hair.color) || '#b98cff' : DU.mix(hex(st.skin) || '#8f96b5', '#2b1c3a', 0.3), dress };
  };

  function make(o) {
    const host = o.host, hero = o.state || DU.defaultState(), M = DU.motion, S = DU.store || null;
    const u = DU.uid('sc'), reduced = M.reduced();
    const root = el(`<div class="school" dir="rtl" role="group" aria-label="תצוגת העיצובים של הכיתה">
      <div class="sc-box">
        ${hallSvg(u)}
        <div class="sc-figs"></div>
        <div class="sc-cur l"></div><div class="sc-cur r"></div>${valanceSvg(u)}
        <div class="sc-bell">${bellSvg}</div>
        <div class="sc-owl">${owlSvg(true)}</div><div class="sc-say sc-owl-say"></div>
        <div class="sc-plaque"></div><div class="sc-pick"></div>
        <div class="sc-spots">${SPOT_X.map((x, i) => `<div class="sc-spot ${x > 50 ? 'r' : 'l'}" data-i="${i}" style="--x:${x};--y:${SPOT_Y}"><div class="sc-badge"></div><div class="sc-card"></div><div class="sc-say sc-mate-say"></div></div>`).join('')}</div>
        <div class="sc-say sc-stage-say"></div>
        <div class="sc-sign"><span>תצוגת העיצובים של הכיתה</span></div>
        <div class="sc-fx"></div>
        <div class="sc-turn"><div>${starSvg()}<span>עכשיו תורך!</span>${starSvg()}</div></div>
      </div>
      <div class="sc-band"></div>
      <div class="sc-skip">אפשר לגעת כדי לדלג</div>
      <div class="sc-top"><button class="round-btn" data-sc="home" aria-label="הביתה">${ico('home')}</button><button class="round-btn" data-act="mute" aria-label="צליל">${ico(S && S.data.mute ? 'mute' : 'sound')}</button><span class="sc-gap"></span><div class="stars-pill sc-points">${ico('star')} <span>${S ? S.data.points : 0}</span></div></div>
      <div class="sc-over"></div>
    </div>`);
    host.innerHTML = '';
    host.appendChild(root);
    const $ = (sel, e = root) => e.querySelector(sel);
    const figs = $('.sc-figs'), fx = $('.sc-fx'), band = $('.sc-band'), over = $('.sc-over'), plaque = $('.sc-plaque'), pick = $('.sc-pick');
    const pill = $('.sc-points'), pillN = $('.sc-points span'), owl = $('.sc-owl'), owlSay = $('.sc-owl-say'), stageSay = $('.sc-stage-say');
    const spots = [...root.querySelectorAll('.sc-spot')];

    /* the hall is always whole: --u = 1% of its width, as big as fits. On a tall screen (an iPad held upright)
       the hall sits at the top and the strip gets the floor under it, with bigger buttons (--bu is its own unit). */
    const fit = () => {
      const w = root.clientWidth, h = root.clientHeight;
      if (!w || !h) return;
      const tall = h > w * 1.12, unit = Math.min(w / 100, (tall ? h - 70 : h) / 75);
      root.classList.toggle('sc-tall', tall);
      root.style.setProperty('--u', unit.toFixed(3) + 'px');
      root.style.setProperty('--hu', unit.toFixed(3) + 'px');
      root.style.setProperty('--bu', (tall ? Math.max(unit, Math.min(unit * 1.8, (w - 24) / 54, (h - 86 - unit * 63) / 22.5)) : unit).toFixed(3) + 'px');
    };
    fit();
    const onResize = () => { if (root.isConnected) fit(); else dispose(); };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    /* ---------- time: waiting, hurrying, leaving ---------- */
    let dead = false, fast = false, busy = false, halt = null, taps = {};
    const pending = new Set(), timers = new Set();
    const alive = () => !dead && root.isConnected;
    /* wait ms; read = true keeps the time also when nothing moves (reduced motion), so words can be read */
    const wait = (ms, read) => new Promise((res, rej) => {
      if (!alive()) return rej(ABORT);
      if (reduced && !read) ms = Math.min(ms, 60);
      if (fast || ms <= 0) return res();
      const w = { res, rej, t: setTimeout(() => { pending.delete(w); if (alive()) res(); else rej(ABORT); }, ms) };
      pending.add(w);
    });
    const later = (ms, fn) => { const t = setTimeout(() => { timers.delete(t); if (alive()) fn(); else if (!dead) dispose(); }, ms); timers.add(t); }; // the screen was replaced: stop everything
    const T = (ms) => (fast ? 0 : ms);
    const work = () => { busy = true; root.classList.add('sc-busy'); };
    /* her turn to tap: whatever was hurried lands in its last frame first */
    const calm = () => { void root.offsetWidth; fast = false; busy = false; root.classList.remove('sc-fast', 'sc-busy'); };
    const hurry = () => {
      if (!busy || fast) return;
      fast = true; root.classList.add('sc-fast');
      [...pending].forEach((w) => { clearTimeout(w.t); w.res(); }); pending.clear();
    };
    /* wait for a tap on one of the buttons: handlers = { 'name of data-sc': (dataset, done) => … } */
    const tapFor = (handlers) => new Promise((res, rej) => {
      if (!alive()) return rej(ABORT);
      halt = () => rej(ABORT);
      taps = {};
      Object.keys(handlers).forEach((k) => (taps[k] = (d) => handlers[k](d, (v) => { taps = {}; halt = null; res(v); })));
    });
    function dispose() {
      if (dead) return;
      dead = true;
      pending.forEach((w) => { clearTimeout(w.t); w.rej(ABORT); }); pending.clear();
      timers.forEach((t) => clearTimeout(t)); timers.clear();
      if (halt) { const h = halt; halt = null; h(); }
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    }
    const leave = () => { dispose(); if (SC.live === api) SC.live = null; if (o.onExit) { try { o.onExit(); } catch (e) { console.error(e); } } };

    root.addEventListener('click', (e) => {
      if (dead || e.target.closest('[data-act]')) return; // the sound button belongs to app.js
      const b = e.target.closest('[data-sc]');
      if (!b) return hurry();
      if (b.disabled) return;
      if (b.dataset.sc === 'home') { play('tap'); return leave(); }
      const fn = taps[b.dataset.sc];
      if (fn) fn(b.dataset, b);
    });

    /* ---------- stars ---------- */
    let earned = 0, shown = S ? S.data.points : 0;
    const bump = () => { pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump'); };
    const showPoints = (v) => { shown = v; pillN.textContent = Math.round(v); };
    /* where something is, in % of the fx layer (= the hall) */
    const at = (node, kx = 0.5, ky = 0.5) => {
      const a = fx.getBoundingClientRect(), b = node.getBoundingClientRect();
      return [((b.left + b.width * kx - a.left) / a.width) * 100, ((b.top + b.height * ky - a.top) / a.height) * 100];
    };
    /* add stars to her jar (the store) at once; the little stars that fly to the counter are only the show of it */
    function give(total, froms) {
      if (total <= 0) return;
      const end = S ? S.addPoints(total) : shown + total;
      earned += total;
      if (fast || reduced || !froms || !froms.length || !fx.animate) { showPoints(end); bump(); return; }
      const a = fx.getBoundingClientRect(), [tx, ty] = at(pill.querySelector('svg') || pill), per = total / froms.length;
      let left = froms.length;
      froms.forEach((node, i) => {
        const from = at(node);
        const s = el(`<span class="sc-fly" style="left:${from[0]}%;top:${from[1]}%">${starSvg()}</span>`);
        fx.appendChild(s);
        const dx = ((tx - from[0]) / 100) * a.width, dy = ((ty - from[1]) / 100) * a.height, bend = (i % 2 ? 1 : -1) * (24 + (i % 3) * 12);
        s.animate([{ transform: 'translate(0,0) scale(.5) rotate(0deg)' }, { transform: `translate(${dx * 0.45 + bend}px,${dy * 0.55 - 20}px) scale(1.3) rotate(160deg)`, offset: 0.5 }, { transform: `translate(${dx}px,${dy}px) scale(.7) rotate(360deg)` }],
          { duration: 620, delay: i * 45, easing: 'cubic-bezier(.4,0,.5,1)', fill: 'both' }).onfinish = () => {
          s.remove();
          if (!alive()) return;
          left--;
          showPoints(left ? Math.min(end, shown + per) : end); bump(); SFX.star(i);
        };
      });
    }
    function confetti() {
      if (fast || reduced || !fx.animate) return;
      const C = ['#ffd54d', '#ff8fc0', '#7de3e0', '#b99cff', '#ffffff', '#8bdc7a'], W = fx.clientWidth / 100;
      for (let i = 0; i < 30; i++) {
        const c = el(`<span class="sc-conf" style="left:${4 + Math.random() * 92}%;background:${C[i % C.length]}"></span>`);
        fx.appendChild(c);
        c.animate([{ transform: 'translateY(0) rotate(0deg)', opacity: 1 }, { transform: `translate(${(Math.random() - 0.5) * 12 * W}px,${(50 + Math.random() * 24) * W}px) rotate(${360 + Math.random() * 540}deg)`, opacity: 0.9, offset: 0.85 }, { transform: `translate(0,${78 * W}px) rotate(900deg)`, opacity: 0 }],
          { duration: 1700 + Math.random() * 900, delay: Math.random() * 500, easing: 'cubic-bezier(.3,.4,.6,1)', fill: 'forwards' }).onfinish = () => c.remove();
      }
    }

    /* ---------- the people ---------- */
    function figure(state) {
      const f = el(`<div class="sc-fig is-far"><div class="sc-shadow"></div><div class="sc-step">${DU.renderCard(state, { rig: true, noBg: true })}</div></div>`);
      f._state = state;
      figs.appendChild(f);
      return f;
    }
    const face = (f, eyes, mouth) => { DU.setEyes(f, eyes); DU.setMouth(f, mouth); };
    const hop = (f, h, ms) => { if (!fast && !reduced) M.hop(f, h, ms); };
    const strike = (f, pose, ms = 400, quiet) => DU.strike(f, poseOf(f._state, pose), { ms: T(ms), fxHost: fx, quiet: quiet || fast, upright: !!(f._state.wear || {}).side });
    const rest = (f, ms = 300) => { DU.pose(f, 'rest', T(ms)); face(f); };
    const burst = (f, opts) => { if (fast || reduced) return; const [x, y] = at(f, 0.5, 0.36); DU.fx.burst(fx, x, y, opts); };
    /* she steps from the back of the stage to the front, swinging her arms a little (they stay low: her hands may be full) */
    async function walkIn(f) {
      f.classList.remove('is-far'); f.classList.add('is-walking');
      for (let k = 0; k < 3; k++) {
        DU.pose(f, k % 2 ? { armL: [-7, 6], armR: [12, 8] } : { armL: [12, 8], armR: [-7, 6] }, T(280));
        if (!fast) SFX.step(k);
        await wait(310);
      }
      f.classList.remove('is-walking');
      await wait(80);
    }
    /* how high her head (with a hat, with ears) reaches over her feet, in u: the tag over her goes just above it */
    function headUp(f) {
      const h = f.querySelector('[data-part="head"]'), a = f.getBoundingClientRect();
      const upx = parseFloat(getComputedStyle(root).getPropertyValue('--u')) || 10;
      if (!h || !a.height) return 38;
      const up = (a.top + a.height * 0.912 - h.getBoundingClientRect().top) / upx;
      return Math.max(28, Math.min(41.5, up));
    }
    const say = (node, text, on = true) => { if (on) node.textContent = text; node.classList.toggle('is-on', !!on); };
    const owlTalk = (text) => { say(owlSay, text); owl.classList.remove('is-talk'); void owl.offsetWidth; owl.classList.add('is-talk'); };
    const curtains = (open) => { if (root.classList.contains('sc-open') !== open && !fast) SFX.whoosh(); root.classList.toggle('sc-open', open); };
    function ringBell() {
      const b = $('.sc-bell');
      b.classList.add('is-ring');
      if (!fast) SFX.bell();
      later(900, () => b.classList.remove('is-ring'));
    }
    /* every now and then somebody blinks */
    (function blinker() {
      later(1800 + Math.random() * 1600, () => {
        const all = [...figs.querySelectorAll('.sc-fig:not(.is-far)')];
        const f = all[Math.floor(Math.random() * all.length)];
        if (f && !reduced && !fast) M.blink(f);
        blinker();
      });
    })();

    /* ---------- 1 · welcome ---------- */
    async function hello() {
      over.innerHTML = `<div class="sc-hello"><div class="sc-hello-owl">${owlSvg()}</div><div class="sc-hello-text"><b>ברוכה הבאה!</b><p>היום בכיתה: תצוגת עיצובים.<br>ארבע חברות יעלו לבמה. דרגי כל עיצוב בכוכבים, ואז יגיע התור שלך!</p><button class="btn big" data-sc="start">מתחילים!</button></div></div>`;
      root.classList.add('sc-veil');
      calm();
      await tapFor({ start: (d, done) => done() });
      play('pick');
      root.classList.remove('sc-veil');
      over.innerHTML = '';
    }

    /* ---------- 2 · a classmate shows her design, she rates it ---------- */
    function ratingBar() {
      band.innerHTML = `<div class="sc-panel sc-rate"><div class="sc-ask">כמה כוכבים לעיצוב?</div><div class="sc-stars">${[1, 2, 3, 4, 5].map((k) => `<button class="sc-star" data-sc="star" data-n="${k}" aria-label="${k === 1 ? 'כוכב אחד' : k + ' כוכבים'}">${rateSvg}</button>`).join('')}</div></div>`;
      return band.firstElementChild;
    }
    async function turnOf(mate, i, rated) {
      work();
      const f = figure(mate.state);
      mate.fig = f;
      owlTalk(i === 0 ? `ראשונה: ${mate.name}!` : i === CLASS_SIZE - 1 ? `ואחרונה: ${mate.name}!` : `עכשיו: ${mate.name}!`);
      await wait(350);
      curtains(true);
      await wait(560);
      await walkIn(f);
      mate.up = headUp(f);
      strike(f, mate.pose, 420);
      if (/^(calm|happy)$/.test(DU.POSES[mate.pose].eyes || '')) later(T(1200), () => { if (rated[i] == null) DU.setEyes(f); }); // her eyes are part of the design: she opens them again
      if (!fast) SFX.chime(i * 2 - 2);
      plaque.innerHTML = `<b>${esc(mate.name)}</b><i></i><span>${esc(mate.title)}</span>`;
      plaque.classList.add('is-on');
      await wait(420);
      say(owlSay, '', false);
      const bar = ratingBar();
      calm();
      const k = await tapFor({ star: (d, done) => done(Math.max(1, Math.min(5, +d.n || 1))) });
      work();
      rated[i] = k;
      const stars = [...bar.querySelectorAll('.sc-star')];
      stars.forEach((b, j) => { b.disabled = true; if (j < k) later(T(j * 70), () => b.classList.add('on')); });
      SFX.rate(k);
      bar.classList.add('is-done');
      bar.querySelector('.sc-ask').innerHTML = `תודה שדירגת! <b dir="ltr">+${RATE_STARS}</b>`;
      give(RATE_STARS, [stars[k - 1]]);
      /* she is glad whatever she got: more stars, a bigger party, and never a sad face */
      say(stageSay, THANKS[k][Math.floor(Math.random() * THANKS[k].length)]);
      face(f, 'happy', k >= 3 ? 'big' : 'smile');
      if (k >= 4) { DU.pose(f, poseOf(mate.state, 'jump'), T(320)); hop(f, k === 5 ? 34 : 24, 480); burst(f, { count: k === 5 ? 18 : 12, spread: 20, size: 3.4 }); }
      else if (k === 3) { DU.pose(f, poseOf(mate.state, 'hello'), T(320)); hop(f, 16, 420); burst(f, { count: 7, spread: 14, size: 2.8 }); }
      else { DU.pose(f, poseOf(mate.state, 'hello'), T(320)); burst(f, { shape: 'heart', count: 5, spread: 11, size: 2.6, colors: ['#ff8fc0', '#ffc1d9', '#ffffff'] }); }
      if (k === 5) { later(T(260), () => { if (!fast) { SFX.clap(); burst(f, { shape: 'heart', count: 10, spread: 24, size: 3.2 }); } }); confetti(); }
      await wait(1500, true);
      say(stageSay, '', false);
      plaque.classList.remove('is-on');
      band.innerHTML = '';
      /* down from the stage to her place beside it */
      rest(f, 260);
      const sp = spots[i];
      f.style.setProperty('--dx', SPOT_X[i] - 50); f.style.setProperty('--dy', SPOT_Y - FEET); f.style.setProperty('--s', SPOT_S);
      f.classList.add('at-spot', 'is-walking');
      sp.style.setProperty('--up', (mate.up * SPOT_S).toFixed(2));
      sp.querySelector('.sc-badge').innerHTML = `<b>${esc(mate.name)}</b>${miniStars(k)}`;
      if (!fast) [0, 1, 2].forEach((j) => later(j * 240, () => SFX.step(j)));
      await wait(520);
      curtains(false);
      await wait(430);
      f.classList.remove('is-walking');
      sp.classList.add('is-here');
      await wait(260);
    }

    /* ---------- 3 · her turn: she chooses how to stand ---------- */
    async function herTurn() {
      work();
      const f = figure(hero);
      owl.classList.remove('is-talk'); void owl.offsetWidth; owl.classList.add('is-talk');
      root.classList.add('sc-turn-on');
      ringBell();
      mates.forEach((m, j) => later(T(200 + j * 110), () => hop(m.fig, 18, 420)));
      await wait(1500, true);
      root.classList.remove('sc-turn-on');
      curtains(true);
      await wait(560);
      await walkIn(f);
      rest(f, 200);
      /* the strip of poses along the bottom; the button that settles it sits on the front of the stage
         (on a low screen there is no room there: a second one waits at the end of the strip) */
      const okBtn = `<button class="btn mint sc-ok" data-sc="ok" hidden>זו הפוזה! ${ico('check')}</button>`;
      const cols = dollColours(hero);
      pick.innerHTML = `<div class="sc-ask sc-hint">בחרי איך לעמוד</div>${okBtn}`;
      pick.classList.add('is-on');
      band.innerHTML = `<div class="sc-poses">${okBtn}<div class="sc-panel sc-pose-grid">${DU.POSE_LIST.map((p) => `<button class="sc-pose" data-sc="pose" data-id="${p.id}">${doll(poseOf(hero, p.id), cols)}<span>${esc(p.name)}</span></button>`).join('')}</div></div>`;
      calm();
      let chosen = null;
      await tapFor({
        pose(d) {
          chosen = d.id;
          band.querySelectorAll('.sc-pose').forEach((x) => x.classList.toggle('on', x.dataset.id === chosen));
          root.querySelectorAll('.sc-ok').forEach((b) => (b.hidden = false));
          pick.querySelector('.sc-hint').hidden = true;
          strike(f, chosen, 360);
          SFX.pop((DU.POSE_LIST.findIndex((p) => p.id === chosen) % 6) * 2);
          const m = mates[Math.floor(Math.random() * mates.length)]; // somebody in the class likes it
          if (m && m.fig) hop(m.fig, 12, 360);
        },
        ok(d, done) { if (chosen) done(); },
      });
      play('pick');
      band.innerHTML = '';
      pick.classList.remove('is-on'); pick.innerHTML = '';
      const nm = (hero.name || '').trim();
      plaque.innerHTML = nm ? `<b>${esc(nm)}</b><i></i><span>העיצוב שלך</span>` : '<span>העיצוב שלך</span>';
      plaque.classList.add('is-on');
      return { f, pose: chosen };
    }

    /* ---------- 4 · the class rates her ---------- */
    async function classRates(f, pose, firstTime) {
      work();
      const V = verdict(hero, mates.length);
      owlTalk('מה אומרת הכיתה?');
      if (!fast) SFX.drum();
      await wait(900, true);
      say(owlSay, '', false);
      const order = [2, 0, 1, 3].filter((i) => i < mates.length); // from the right of the hall to the left
      const cards = [];
      for (let k = 0; k < order.length; k++) {
        const i = order[k], sp = spots[i], m = mates[i], card = sp.querySelector('.sc-card');
        card.innerHTML = Array(V.stars[k]).fill(starSvg()).join('');
        sp.classList.add('is-up');
        cards.push(card);
        if (!fast) { if (V.ok) SFX.pop(k * 2); else SFX.soft(k === 1 ? -2 : k * 2); }
        face(m.fig, 'happy', 'big');
        DU.pose(m.fig, poseOf(m.state, V.ok ? 'jump' : 'hello'), T(300));
        hop(m.fig, V.ok ? 20 : 12, 420);
        const bub = sp.querySelector('.sc-mate-say');
        say(bub, V.say[k]);
        await wait(V.ok ? 1050 : 1200, true);
        say(bub, '', false);
        later(T(500), () => rest(m.fig, 320));
      }
      const got = V.stars.reduce((a, b) => a + b, 0), gain = firstTime ? got * CARD_STAR : 0;
      strike(f, pose, 360, true);
      hop(f, 30, 520);
      if (V.ok) { play('fanfare'); confetti(); burst(f, { count: 18, spread: 24, size: 3.6 }); later(T(300), () => { if (!fast) SFX.clap(); }); owlTalk('כל הכבוד!'); }
      else { SFX.chime(-3); burst(f, { shape: 'heart', count: 8, spread: 16, size: 3 }); owlTalk('יופי של התחלה!'); }
      band.innerHTML = `<div class="sc-panel sc-result ${V.ok ? '' : 'low'}"><div class="sc-res-text"><div class="sc-ask">הכיתה נתנה לך <b dir="ltr">${got}</b> ${starSvg('sc-inl')}${gain ? ` <em dir="ltr">+${gain}</em>` : ''}</div>${V.ok ? '' : '<small>בפעם הבאה אפשר להוסיף עוד בגדים, נעליים ואביזרים, והכיתה תיתן עוד כוכבים</small>'}</div><button class="btn sc-next" data-sc="next">המשך</button></div>`;
      give(gain, cards.reduce((all, c) => all.concat([...c.querySelectorAll('svg')]), []));
      await wait(700);
      later(1600, () => say(owlSay, '', false));
      calm();
      await tapFor({ next: (d, done) => done() });
      play('tap');
      return { got, gain, ok: V.ok };
    }

    /* ---------- 5 · the closing board ---------- */
    async function closing(rated, res, rateGain) {
      work();
      band.innerHTML = '';
      say(owlSay, '', false);
      figs.innerHTML = ''; // the board covers the hall: its pictures take the place of the girls, not one more of each
      spots.forEach((sp) => sp.classList.remove('is-here', 'is-up'));
      plaque.classList.remove('is-on');
      root.classList.remove('sc-open');
      const pic = (st) => { try { return DU.renderCard(st, { par: 'xMidYMid slice' }); } catch (e) { console.error(e); return ''; } };
      const total = rateGain + res.gain;
      const nm = (hero.name || '').trim();
      over.innerHTML = `<div class="sc-end">
        <div class="sc-end-head">${starSvg()}<b>איזו תצוגה!</b>${starSvg()}</div>
        <div class="sc-wall">
          ${mates.map((m, i) => `<div class="sc-photo" style="--r:${[-2.5, 1.5, -1.5, 2.5][i % 4]}deg"><div class="sc-pic">${pic(m.state)}</div><b>${esc(m.name)}</b><span>${esc(m.title)}</span>${miniStars(rated[i] || 0)}</div>`).join('')}
          <div class="sc-photo mine" style="--r:0deg"><div class="sc-pic">${pic(hero)}</div><b>${nm ? esc(nm) : 'העיצוב שלך'}</b><span>${nm ? 'העיצוב שלך' : 'מהכיתה:'}</span><span class="sc-got" dir="ltr">${starSvg()}${res.got}</span></div>
        </div>
        <div class="sc-sum">
          <span>דירגת ${mates.length} עיצובים <b dir="ltr">+${rateGain}</b></span>
          ${res.gain ? `<span>כוכבים מהכיתה <b dir="ltr">+${res.gain}</b></span>` : '<span class="soft">על העיצוב הזה כבר קיבלת היום כוכבים מהכיתה</span>'}
          <span class="sc-total">${starSvg()}<b dir="ltr">+${total}</b></span>
        </div>
        <div class="sc-end-btns"><button class="btn" data-sc="again">${ico('sparkle')}<span>עוד תצוגה</span></button><button class="btn white" data-sc="home">${ico('home')}<span>הביתה לחדר</span></button></div>
      </div>`;
      root.classList.add('sc-veil');
      showPoints(S ? S.data.points : shown);
      calm();
      await tapFor({ again: (d, done) => done() });
      play('pick');
      root.classList.remove('sc-veil');
      over.innerHTML = '';
    }

    /* ---------- the whole afternoon ---------- */
    let mates = [], shows = 0;
    async function run() {
      await hello();
      for (;;) {
        mates = classmates(CLASS_SIZE, hero, o.seed == null ? undefined : o.seed + shows, mates);
        /* a pet or a thing stands at her right: the third girl stands at the right edge of the hall, where it
           could be cut off, so the girls who brought one take the other places first */
        const places = [1, 3, 0, 2].filter((i) => i < mates.length), placed = [];
        mates.filter((m) => m.state.wear.side).concat(mates.filter((m) => !m.state.wear.side)).forEach((m, k) => (placed[places[k]] = m));
        if (places.length === mates.length) mates = placed;
        mates.forEach((m) => (m.pose = DU.POSE_LIST[Math.floor(Math.random() * DU.POSE_LIST.length)].id));
        const rated = [], before = earned;
        work();
        ringBell();
        await wait(700);
        for (let i = 0; i < mates.length; i++) await turnOf(mates[i], i, rated);
        const mine = await herTurn();
        const res = await classRates(mine.f, mine.pose, shows === 0); // the class's stars for the same design count once a visit
        shows++;
        await closing(rated, res, earned - before - res.gain);
      }
    }
    /* if anything breaks, she keeps the stars she already got and can always go home */
    function broken(e) {
      console.error('the class show failed', e);
      if (!alive()) return;
      calm();
      root.classList.add('sc-veil');
      over.innerHTML = `<div class="sc-hello"><div class="sc-hello-owl">${owlSvg()}</div><div class="sc-hello-text"><b>אופס!</b><p>התצוגה נעצרה לרגע.<br>הכוכבים שלך שמורים.</p><button class="btn big" data-sc="home">${ico('home')} הביתה לחדר</button></div></div>`;
    }
    const api = { root, dispose, get earned() { return earned; }, debug: { hurry, get mates() { return mates; }, get busy() { return busy; } } };
    run().catch((e) => { if (e !== ABORT) broken(e); else if (!root.isConnected) { dispose(); if (SC.live === api) SC.live = null; } });
    return api;
  }

  const SC = (DU.school = { live: null, classmates });
  SC.open = function (o) { SC.close(); SC.live = make(o || {}); return SC.live; };
  SC.close = function () { const l = SC.live; SC.live = null; if (l) l.dispose(); };
})();
