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
      it.tags = it.tags || [];
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

  /* round themes ("the challenge") */
  DU.THEMES = [
    { id: 'beach', name: 'חוף ים', icon: '🏖️', hint: 'יום כיף בים!' },
    { id: 'party', name: 'מסיבה', icon: '🎉', hint: 'הולכים לחגוג!' },
    { id: 'school', name: 'בית ספר', icon: '🎒', hint: 'יום ראשון בכיתה!' },
    { id: 'winter', name: 'חורף', icon: '❄️', hint: 'קר בחוץ, מתלבשים חם!' },
    { id: 'magic', name: 'קסם', icon: '🪄', hint: 'עולם של קסמים!' },
    { id: 'sport', name: 'ספורט', icon: '⚽', hint: 'זזים ומשחקים!' },
    { id: 'princess', name: 'נסיכה', icon: '👑', hint: 'נשף בארמון!' },
    { id: 'nature', name: 'טבע', icon: '🌸', hint: 'טיול בין הפרחים!' },
    { id: 'sleepover', name: 'מסיבת פיג׳מות', icon: '🌙', hint: 'לילה טוב וכיף!' },
  ];

  /* the base girls */
  DU.GIRLS = [
    { id: 'g1', skin: '#ffe3d1', face: 'soft', eyes: { shape: 'round', color: '#7a4a2b' }, brows: 'soft', mouth: 'smile', hair: { style: 'long', color: '#4a2f27' } },
    { id: 'g2', skin: '#fbd3b6', face: 'round', eyes: { shape: 'sparkle', color: '#3f7fd9' }, brows: 'soft', mouth: 'big', hair: { style: 'twintails', color: '#f2d27a' } },
    { id: 'g3', skin: '#eebf94', face: 'heart', eyes: { shape: 'cat', color: '#4f9d5d' }, brows: 'brave', mouth: 'cat', hair: { style: 'ponytail', color: '#c8553d' } },
    { id: 'g4', skin: '#cf9668', face: 'soft', eyes: { shape: 'gentle', color: '#b5762f' }, brows: 'sweet', mouth: 'smile', hair: { style: 'curly', color: '#2a2233' } },
    { id: 'g5', skin: '#a66e45', face: 'round', eyes: { shape: 'round', color: '#6b5bd6' }, brows: 'arch', mouth: 'grin', hair: { style: 'buns', color: '#4a2f27' } },
    { id: 'g6', skin: '#7a4a2e', face: 'heart', eyes: { shape: 'sparkle', color: '#e2a530' }, brows: 'soft', mouth: 'big', hair: { style: 'puffs', color: '#2a2233' } },
  ];
})();
