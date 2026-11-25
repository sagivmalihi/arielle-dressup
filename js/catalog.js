/* catalog.js — the item registry, colors and round themes.
   An item:
     { id, slot, name (Hebrew), tags: [theme ids], price: 0 = free | >0 = shop special,
       color: default color spec, fixed: true = cannot be recolored (uses `color` as is),
       draw(R, P, ctx) → svg string (goes to the slot's default layer) or { layer: svg } }
   Extra flags: tall (boots), tight (leggings…), noTuck (tops that never tuck), coversTop (hats).
   slots: top bottom dress shoes socks · hat hairacc glasses earrings necklace bracelet bag hand wings */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});

  DU.items = [];
  DU.itemById = {};
  DU.addItems = function (list) {
    list.forEach((it) => {
      if (DU.itemById[it.id]) console.warn('duplicate item id', it.id);
      it.tags = (it.tags || []).concat(DU.EXTRA_TAGS[it.id] || []).filter((t, i, arr) => arr.indexOf(t) === i);
      it.price = it.price || 0;
      DU.items.push(it);
      DU.itemById[it.id] = it;
    });
  };

  /* colors offered for every recolorable item */
  DU.PALETTE = [
    '#ff6f91', '#ff9ac1', '#ffc1d9', '#e0435f', '#ff9a56', '#ffd24d', '#fff2a8', '#8bdc7a', '#3fbf9a', '#7de3e0',
    '#5cc8ff', '#3f7fd9', '#3a4a8f', '#b48cff', '#7b5bd6', '#d05fb8', '#ffffff', '#cfd3e6', '#8a8fa8', '#3a3346', '#a8703d', '#f3e3c8',
  ];

  /* round themes ("the challenge"). kind 'place' = where she is going, kind 'style' = a fashion style.
     Tag vocabulary for items, hairstyles and backgrounds = the ids below. */
  DU.THEMES = [
    { id: 'beach', kind: 'place', name: 'חוף ים', icon: '🏖️', hint: 'יום כיף בים!' },
    { id: 'party', kind: 'place', name: 'מסיבה', icon: '🎉', hint: 'הולכים לחגוג!' },
    { id: 'school', kind: 'place', name: 'בית ספר', icon: '🎒', hint: 'יום ראשון בכיתה!' },
    { id: 'winter', kind: 'place', name: 'חורף', icon: '❄️', hint: 'קר בחוץ, מתלבשים חם!' },
    { id: 'magic', kind: 'place', name: 'קסם', icon: '🪄', hint: 'עולם של קסמים!' },
    { id: 'sport', kind: 'place', name: 'ספורט', icon: '⚽', hint: 'זזים ומשחקים!' },
    { id: 'princess', kind: 'place', name: 'נסיכה', icon: '👑', hint: 'נשף בארמון!' },
    { id: 'nature', kind: 'place', name: 'טבע', icon: '🌸', hint: 'טיול בין הפרחים!' },
    { id: 'sleepover', kind: 'place', name: 'מסיבת פיג׳מות', icon: '🌙', hint: 'לילה טוב וכיף!' },
    { id: 'anime', kind: 'style', name: 'אנימה יפנית', icon: '🎌', hint: 'מדי מלחים, קימונו, קוקיות וסרטים גדולים!' },
    { id: 'british', kind: 'style', name: 'בית ספר בריטי', icon: '🇬🇧', hint: 'בלייזר, עניבה, חצאית משבצות וגרבי ברך!' },
    { id: 'paris', kind: 'style', name: 'שיק פריזאי', icon: '🥐', hint: 'ברט, פסים, צעיף ונעלי בובה!' },
    { id: 'hawaii', kind: 'style', name: 'אלוהה הוואי', icon: '🌺', hint: 'פרחים בשיער, חצאית הולה ושרשרת פרחים!' },
    { id: 'cowgirl', kind: 'style', name: 'בוקרת', icon: '🤠', hint: 'כובע בוקרים, מגפיים, ג׳ינס ומשבצות!' },
    { id: 'kawaii', kind: 'style', name: 'קאוואי מתוק', icon: '🐰', hint: 'פסטל, לבבות, ארנבים — והכול חמוד!' },
    { id: 'rock', kind: 'style', name: 'כוכבת רוק', icon: '🎸', hint: 'ג׳קט, מגפיים, משקפי שמש וגיטרה!' },
    { id: 'pop', kind: 'style', name: 'כוכבת פופ', icon: '🎤', hint: 'נצנצים, כוכבים והמון ברק!' },
    { id: 'retro', kind: 'style', name: 'שנות השמונים', icon: '🛼', hint: 'חותלות, גומיות וצבעים זוהרים!' },
    { id: 'ballet', kind: 'style', name: 'בלרינה', icon: '🩰', hint: 'טוטו, נעלי בלט ופקעת בשיער!' },
    { id: 'pirate', kind: 'style', name: 'פיראטית', icon: '🏴‍☠️', hint: 'כובע פיראטים, פסים, מגפיים ותוכי!' },
    { id: 'space', kind: 'style', name: 'חלל ועתיד', icon: '🚀', hint: 'כסוף, כוכבים ואנטנות!' },
  ];

  /* style tags for things drawn before the style challenges existed.
     keys: item id · 'hair:<style id>' · 'bg:<background id>' */
  const STYLE = {
    anime: 'ha_catears ha_bow ha_twobows sk_knee sk_stripes sh_maryjane bt_skirt hd_wand ear_stars nk_bowtie top_blouse hair:twintails hair:hime hair:buns hair:drills hair:long bg:garden',
    british: 'bt_plaid bt_skirt sk_knee sh_maryjane nk_tie nk_bowtie top_blouse top_cardigan top_sweater dr_school gl_round gl_square hd_book ha_headband hat_beret bag_backpack hair:braids hair:bob hair:ponytail bg:classroom',
    paris: 'hat_beret top_stripes nk_scarf bt_skirt bt_wide sh_ballet sh_maryjane bag_purse bag_cross nk_pearls ear_pearls gl_sun top_cardigan hd_flowers hair:bob hair:halfup hair:wavy',
    hawaii: 'nk_lei ha_flower ha_flowercrown top_flower dr_sun sh_sandals sh_flipflops bt_shorts ear_flowers br_beads hd_icecream bag_tote gl_sun hair:wavy hair:long hair:mermaid bg:beach',
    cowgirl: 'bt_jeans nk_bandana sh_boots top_jacket bt_overalls bt_shorts br_friend hair:braids hair:ponytail bg:forest',
    kawaii: 'ha_bunny ha_bow ha_twobows ha_catears ha_clips bag_teddy dr_party dr_pj top_puff top_tee bt_tutu sk_frill sk_fuzzy sh_maryjane sh_slippers hd_lollipop ear_hearts gl_heart nk_heart hat_hood hair:buns hair:twintails hair:puffs bg:hearts bg:candy bg:clouds',
    rock: 'top_jacket bt_leggings bt_jeans bt_shorts sh_boots sh_hightops gl_sun gl_star hd_mic nk_choker br_bangles ear_hoops ear_stars hat_cap hair:pixie hair:sidetail hair:ponytail bg:stage',
    pop: 'top_sparkle top_crop bt_sparkle bt_tutu hd_mic hd_starwand gl_star gl_heart ear_stars ear_gems sh_hightops br_sparkle br_bangles nk_choker dr_star dr_gala sk_star bag_star hair:twintails hair:drills hair:sidetail hair:halfup bg:stage bg:rainbow',
    retro: 'sk_legwarm br_scrunchie br_bangles ha_sweatband sh_roller sh_hightops top_crop top_tank top_hoodie bt_leggings bt_shorts gl_heart ear_hoops hat_cap hair:sidetail hair:curly hair:ponytail bg:gym',
    ballet: 'bt_tutu bt_rainbow bt_leggings sh_ballet sk_tights sk_legwarm ha_tiara ha_bow top_crop top_tank top_puff nk_pearls hair:buns hair:halfup hair:ponytail bg:stage',
    pirate: 'top_stripes sh_boots nk_bandana ear_hoops bt_leggings bt_shorts br_beads hair:braids hair:wavy hair:long bg:beach bg:undersea',
    space: 'sk_star top_magic dr_star gl_ski gl_star sh_wings ear_stars nk_magic bag_star bt_leggings hat_wizard hair:buns hair:pixie bg:nightsky bg:space',
  };
  DU.EXTRA_TAGS = {};
  Object.keys(STYLE).forEach((tag) => STYLE[tag].split(' ').forEach((id) => (DU.EXTRA_TAGS[id] = DU.EXTRA_TAGS[id] || []).push(tag)));
  /* does a hairstyle / background / item fit a theme? kind: 'item' | 'hair' | 'bg' */
  DU.fits = function (kind, obj, themeId) {
    if (!obj || !themeId) return false;
    if ((obj.tags || []).includes(themeId)) return true;
    return kind !== 'item' && (DU.EXTRA_TAGS[kind + ':' + obj.id] || []).includes(themeId);
  };

  /* the base girls */
  DU.GIRLS = [
    { id: 'g1', skin: '#ffe3d1', face: 'soft', eyes: { shape: 'round', color: '#7a4a2b' }, brows: 'soft', mouth: 'smile', hair: { style: 'long', color: '#4a2f27' } },
    { id: 'g2', skin: '#fbd3b6', face: 'round', eyes: { shape: 'sparkle', color: '#3f7fd9' }, brows: 'soft', mouth: 'big', hair: { style: 'twintails', color: '#f2d27a' } },
    { id: 'g3', skin: '#eebf94', face: 'heart', eyes: { shape: 'cat', color: '#4f9d5d' }, brows: 'brave', mouth: 'cat', hair: { style: 'ponytail', color: '#c8553d' } },
    { id: 'g4', skin: '#cf9668', face: 'soft', eyes: { shape: 'gentle', color: '#b5762f' }, brows: 'sweet', mouth: 'smile', hair: { style: 'curly', color: '#2a2233' } },
    { id: 'g5', skin: '#a66e45', face: 'round', eyes: { shape: 'round', color: '#6b5bd6' }, brows: 'arch', mouth: 'grin', hair: { style: 'buns', color: '#4a2f27' } },
    { id: 'g6', skin: '#7a4a2e', face: 'heart', eyes: { shape: 'sparkle', color: '#e2a530' }, brows: 'soft', mouth: 'big', hair: { style: 'puffs', color: '#2a2233' } },
    { id: 'g7', skin: '#fff0e6', face: 'oval', eyes: { shape: 'gentle', color: '#2f9fa8' }, brows: 'arch', mouth: 'tiny', hair: { style: 'wavy', color: '#e8845c' }, makeup: { sparkle: 'freckles' } },
    { id: 'g8', skin: '#f3c39c', face: 'heart', eyes: { shape: 'cool', color: '#6b7285' }, brows: 'straight', mouth: 'smirk', hair: { style: 'hime', color: '#2a2233' } },
    { id: 'g9', skin: '#e0a878', face: 'chubby', eyes: { shape: 'doll', color: '#4f9d5d' }, brows: 'thick', mouth: 'gap', hair: { style: 'pixie', color: '#a8703d' } },
    { id: 'g10', skin: '#b97f52', face: 'oval', eyes: { shape: 'cat', color: '#e2a530' }, brows: 'arch', mouth: 'fang', hair: { style: 'braids', color: '#4a2f27' } },
    { id: 'g11', skin: '#8d5a3b', face: 'soft', eyes: { shape: 'heart', color: '#e0679d' }, brows: 'soft', mouth: 'big', hair: { style: 'boxbraids', color: '#2a2233' }, makeup: { blush: 'soft' } },
    { id: 'g12', skin: '#5a3524', face: 'chubby', eyes: { shape: 'sparkle', color: '#a25bd1' }, brows: 'sweet', mouth: 'cat', hair: { style: 'afro', color: '#4a2f27' } },
  ];

  /* body colors: natural tones first, then a few fantasy ones */
  DU.SKINS = [
    '#fff0e6', '#ffe3d1', '#fbd3b6', '#f3c39c', '#eebf94', '#e0a878', '#cf9668', '#b97f52', '#a66e45', '#8d5a3b', '#7a4a2e', '#5a3524',
    '#ffd1e8', '#e2d2ff', '#c4e6ff', '#c2f0dc', '#fff3b0', '#d6d9e6',
  ];
})();
