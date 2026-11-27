/* score.js — "סיימתי": how the game rates a character.
   Arielle's rules: a character that got real effort ALWAYS scores high (lots of stars).
   A character that was barely touched gets a tiny score and is not saved to the gallery —
   gently — and the player can always overrule that and save her anyway. */
(function () {
  'use strict';
  const DU = (window.DU = window.DU || {});
  const ACC = ['hat', 'hairacc', 'glasses', 'earrings', 'necklace', 'bracelet', 'bag', 'hand', 'wings', 'side'];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  DU.LOW_SCORE = 10; // what a not-invested character gets
  /* "Invested" = she wears at least MIN_WORN things and the player made at least MIN_CHOICES choices
     in total (things worn + makeup + changed hair / eyes / brows / mouth / body / background + a name). */
  DU.MIN_WORN = 1;
  DU.MIN_CHOICES = 4;

  /* how much the player changed from the starting look */
  DU.effort = function (state) {
    const g = (DU.baseOf ? DU.baseOf(state.base) : (DU.GIRLS || []).find((x) => x.id === state.base)) || {};
    const wear = state.wear || {}, mk = state.makeup || {}, gw = g.wear || {}, gb = g.body || {};
    // what she came with (a special character's own accessory) is not the player's choice
    const worn = Object.keys(wear).filter((k) => wear[k] && DU.itemById[wear[k].id] && !(gw[k] && gw[k].id === wear[k].id && (wear[k].c || null) === (gw[k].c || null))).length;
    const gm = g.makeup || {};
    const makeup = ['blush', 'shadow', 'lips', 'sparkle'].filter((k) => mk[k] && mk[k] !== gm[k]).length;
    const ch = {
      hairStyle: !!(g.hair && state.hair.style !== g.hair.style),
      hairColor: !!(g.hair && state.hair.color !== g.hair.color),
      eyeShape: !!(g.eyes && state.eyes.shape !== g.eyes.shape),
      eyeColor: !!(g.eyes && state.eyes.color !== g.eyes.color),
      brows: state.brows !== g.brows,
      mouth: state.mouth !== g.mouth,
      height: ((state.body && state.body.h) || 0) !== (gb.h || 0),
      muscles: ((state.body && state.body.m) || 0) !== (gb.m || 0),
      bg: state.bg !== 'bedroom',
      skin: !!(g.skin && (state.skin !== g.skin || state.face !== g.face)),
    };
    const changes = Object.keys(ch).filter((k) => ch[k]).length;
    const named = !!(state.name && state.name.trim());
    const total = worn + makeup + changes + (named ? 1 : 0);
    return { worn, makeup, changes, ch, named, total, invested: worn >= DU.MIN_WORN && total >= DU.MIN_CHOICES };
  };

  const FAV = {
    hat: ['וואו, הכובע הזה מושלם!'],
    dress: ['השמלה הזאת מהממת!', 'איזו שמלה חלומית!'],
    shoes: ['הנעליים האלה הכי מגניבות!'],
    wings: ['הכנפיים האלה קסומות!'],
    glasses: ['המשקפיים האלה הכי מגניבים!'],
    earrings: ['איזה עגילים נוצצים!'],
    hair: ['התסרוקת הזאת מהממת!', 'איזה שיער יפהפה!'],
    eyes: ['איזה עיניים יפות!'],
    makeup: ['האיפור הזה נוצץ!'],
    bg: ['הרקע הזה מתאים בול!'],
  };

  DU.scoreCharacter = function (state, themeId) {
    const ef = DU.effort(state);
    const theme = DU.THEMES.find((t) => t.id === themeId) || null;
    const wear = state.wear || {};
    const items = Object.keys(wear).map((slot) => ({ slot, it: DU.itemById[wear[slot] && wear[slot].id] })).filter((x) => x.it);

    if (!ef.invested) {
      return { ok: false, total: DU.LOW_SCORE, lines: [], effort: ef, theme, fav: null };
    }
    const lines = [];
    lines.push({ icon: '💖', label: 'דמות מקסימה', pts: 500 });

    let outfit = 0;
    if (wear.dress || (wear.top && wear.bottom)) outfit += 60;
    if (wear.shoes) outfit += 40;
    if (outfit) lines.push({ icon: '👗', label: 'תלבושת שלמה', pts: outfit });

    if (theme) {
      const matches = items.filter((x) => x.it.tags.includes(theme.id));
      const bg = (DU.backgrounds || []).find((b) => b.id === state.bg);
      const bgOk = DU.fits('bg', bg, theme.id);
      const hairOk = DU.fits('hair', (DU.HAIRS || []).find((h) => h.id === state.hair.style), theme.id);
      const pts = Math.min(6, matches.length + (hairOk ? 1 : 0)) * 70 + (bgOk ? 60 : 0);
      if (pts) lines.push({ icon: theme.icon, label: `מתאים לאתגר ״${theme.name}״`, pts, count: matches.length + (bgOk ? 1 : 0) + (hairOk ? 1 : 0) });
    }

    let det = 0;
    det += items.filter((x) => ACC.includes(x.slot)).length * 40;
    if (wear.socks) det += 20;
    det += Math.min(3, items.filter((x) => String(wear[x.slot].c || '').startsWith('pat:') || wear[x.slot].st).length) * 25; // her own fabric / sticker
    det += Math.min(4, ef.makeup) * 30;
    if (ef.ch.hairStyle || ef.ch.hairColor) det += 40;
    det += ['eyeShape', 'eyeColor', 'brows', 'mouth'].filter((k) => ef.ch[k]).length * 15;
    if (ef.ch.height || ef.ch.muscles || ef.ch.skin) det += 10;
    if (ef.named) det += 30;
    if (det) lines.push({ icon: '✨', label: 'המון פרטים', pts: det });

    // the surprise: one thing the game especially loved
    const cands = [];
    items.forEach((x) => cands.push({ key: x.slot, name: x.it.name }, { key: x.slot, name: x.it.name }));
    cands.push({ key: 'hair' });
    if (ef.makeup) cands.push({ key: 'makeup' });
    if (ef.ch.eyeColor || ef.ch.eyeShape) cands.push({ key: 'eyes' });
    const c = pick(cands);
    const text = FAV[c.key] ? pick(FAV[c.key]) : `וואו! ${c.name} — בחירה מושלמת!`;
    lines.push({ icon: '🎁', label: text, pts: 100, surprise: true });

    const total = lines.reduce((s, l) => s + l.pts, 0);
    const praise = total >= 1400 ? 'כוכבת על!' : total >= 1100 ? 'מהממת!' : total >= 850 ? 'מקסימה!' : 'יפהפייה!';
    return { ok: true, total, lines, effort: ef, theme, fav: text, praise };
  };

  DU.pickTheme = function (lastId) {
    const list = DU.THEMES.filter((t) => t.id !== lastId);
    return pick(list).id;
  };
})();
