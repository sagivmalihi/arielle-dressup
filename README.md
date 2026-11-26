# הגיע הזמן לעצב!

A dress-up and character-design game in anime style, designed by Arielle and her dad.
Hebrew, RTL, made for an iPad in landscape and for a laptop.

Play: https://dressup.magicvessel.com/

It is a static web app with no build step and no backend: open `index.html`, or serve the
folder from any static host. Stars, purchases and the gallery are saved in the browser
(`localStorage`), so they do not sync between devices.

## How it is built

All art is layered SVG drawn in code on one parametric body (`js/rig.js`), so every item
lines up on every height and build.

| File | What it holds |
|---|---|
| `js/util.js` | colors, special fills (rainbow, glitter…), path helpers |
| `js/rig.js` | the body template and garment builders |
| `js/body.js`, `js/face.js`, `js/hair.js` | skin, eyes, brows, mouths, makeup, hairstyles |
| `js/clothes*.js`, `js/dresses2.js`, `js/feet*.js`, `js/acc-head*.js`, `js/acc-body*.js` | the items |
| `js/backgrounds*.js` | the scenes |
| `js/catalog.js` | item registry, palette, the challenges (places and styles), the base girls, body colors |
| `js/render.js` | layer order, the card, thumbnails |
| `js/score.js` | the "סיימתי" rating and the "invested" rule |
| `js/props.js` | more things to hold, and the pets and objects that stand next to her (`side` slot) |
| `js/motion.js` | moving a rigged girl (`renderCard(state, { rig: true })`): poses, hop, blink, sparkles |
| `js/room.js`, `js/icons.js` | the home screen (her room) and the hand-drawn icon set |
| `js/show.js` | the fashion show that plays after "סיימתי" |
| `js/fabric.js` | "my own fabric": pattern fills (`pat:kind:bg:fg:size`), chest stickers, the studio |
| `js/album.js` | the sticker album, the secret combinations, and the living effects on backgrounds |
| `js/store.js`, `js/sound.js`, `js/app.js` | saving, sound effects, screens |
| `js/ride*.js`, `lib/three.min.js` | the 3D bike ride to school (see below) |

To add an item, add an object to one of the `DU.addItems([...])` lists: `id`, `slot`,
Hebrew `name`, theme `tags`, `price` (0 = free, more = shop), `color`, and a `draw(R, P, ctx)`
that returns SVG.

## The bike ride

From her room (the bike by the door), after the fashion show, or from the gallery, the girl she
dressed rides her bike to school through real streets in 3D. It is the only part that uses a
library: [three.js](https://threejs.org) r149 (MIT), bundled in `lib/`. All of it is fetched only
when a ride starts, so the dress-up game loads as fast as before.

| File | What it holds |
|---|---|
| `js/ride-data.js` | the streets, buildings, parks and the route, baked from OpenStreetMap (metres; x east, z south) |
| `js/ride-kit.js` | shared 3D helpers: palette, painted primitives merged into one mesh, signs with text, the route maths |
| `js/ride-world.js` | builds the city from the data: roads, buildings, trees, signs, sky, light |
| `js/ride-rider.js` | the girl as a paper doll on a 3D bike (a back view of her is drawn by `render.js`) |
| `js/ride-models.js` | stars, cones, pigeons, cats, cars, people, traffic lights |
| `js/ride.js` | the game: steering, hop and bell, what lies on the road, the red lights, the arrival |

Map data © OpenStreetMap contributors, available under the Open Database License.

The font is Fredoka (SIL Open Font License), bundled in `fonts/` so the game loads nothing from other sites.

When you publish a change, bump the `?v=` number on the assets in `index.html` so devices fetch the new files.
