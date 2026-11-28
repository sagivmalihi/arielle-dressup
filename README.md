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
| `js/species.js` | the special characters (a wolf, a capybara): fur, an animal head, ears and a tail on the same body, so every item fits them |
| `js/render.js` | layer order, the card, thumbnails |
| `js/score.js` | the "סיימתי" rating and the "invested" rule |
| `js/props.js` | more things to hold, and the pets and objects that stand next to her (`side` slot) |
| `js/motion.js` | moving a rigged girl (`renderCard(state, { rig: true })`): poses, hop, blink, sparkles |
| `js/room.js`, `js/icons.js` | the home screen (her room) and the hand-drawn icon set |
| `js/show.js` | the fashion show that plays after "סיימתי" |
| `js/fabric.js` | "my own fabric": pattern fills (`pat:kind:bg:fg:size`), chest stickers, the studio |
| `js/album.js` | the sticker album, the secret combinations, and the living effects on backgrounds |
| `js/store.js`, `js/sound.js`, `js/app.js` | saving, sound effects, screens |
| `js/bike.js` | her bikes: what a bike is made of, the choices and prices of the workshop, which bikes she has, the sound of her bell |
| `js/places.js`, `css/places.css` | the places she can ride to: the catalogue with prices in stars, which places are hers, their postcards, and the contract a place plugs into (see "Adding a place") |
| `js/ride*.js`, `lib/three.min.js` | the 3D bike ride and the bike workshop (see below) |

To add an item, add an object to one of the `DU.addItems([...])` lists: `id`, `slot`,
Hebrew `name`, theme `tags`, `price` (0 = free, more = shop), `color`, and a `draw(R, P, ctx)`
that returns SVG.

## The bike ride

From her room (the bike by the door), after the fashion show, from the gallery or from the bike
workshop, the girl she dressed goes for a ride in 3D. First she picks where to ("לאן רוכבים?", a
board of postcards): the school, through the real streets, is always hers; the other places are
bought with stars. A place that is not built yet shows as "בקרוב". At the school she can go inside
when the ride ends. The ride is the only part that uses a library: [three.js](https://threejs.org)
r149 (MIT), bundled in `lib/`. All of it, and the files of the place she chose, are fetched only
when a ride starts, so the dress-up game loads as fast as before.

She sets her own speed (▲ and ▼ on the screen, or the arrow keys), from a slow roll up to about
115 km/h; the bike slows by itself for sharp corners and red lights.

The tag on the bike in her room opens the **bike workshop**: frame shape, paint, wheels, basket,
streamers, flag, the trail she leaves at speed, the sound of the bell and her helmet. She can keep
up to five bikes. Some parts cost stars; she can try them on the bike before buying.

| File | What it holds |
|---|---|
| `js/ride-data.js` | the way to school: the streets, buildings, parks and the route, baked from OpenStreetMap (metres; x east, z south) |
| `js/ride-kit.js` | shared 3D helpers: palette, painted primitives merged into one mesh, signs with text, the route maths (with heights, for a way that climbs) |
| `js/ride-world.js` | builds the city from the baked data of a place: roads, buildings, trees, signs, sky, light |
| `js/ride-bike.js` | her bike in 3D, built from her design: frames, paints, wheels, basket, streamers, flag; and what she leaves behind her on the road |
| `js/ride-rider.js` | the girl as a paper doll on that bike (a back view of her is drawn by `render.js`) |
| `js/ride-models.js` | stars, cones, pigeons, cats, cars, people, traffic lights |
| `js/ride.js` | the game, the same for every place: steering, her speed (▲ ▼ or the arrow keys, up to about 115 km/h), hop and bell, what lies on the road, the red lights, the arrival. Also the school's own part (`DU.RIDE_PLACE.school`) and the standard pieces a place can reuse (`DU.ride.std`) |
| `js/ride-garage.js`, `css/garage.css` | the bike workshop: she designs her bikes on a turning stand in 3D, tries parts on, buys them with stars |

### Adding a place

The whole contract is written at the top of `js/places.js`. In short:

1. Add an entry to `DU.places.LIST` in `js/places.js`: `id`, Hebrew `name`, `price` in stars, `kind`
   (`'city'` or `'sky'`), `files` (what is fetched for this place when she rides there), and
   `ready: true` once those files exist (until then the picker shows "בקרוב"). Draw its postcard in
   `CARDS` in the same file (an SVG of 400×300; the middle is what every screen shows).
2. A place on real streets bakes its data like `js/ride-data.js` and registers it as
   `DU.RIDE_DATA_OF[id]`, with the destination in `end: { x, z, a }` (the school has `school`).
   Nothing else is needed: the street level, the balloon arch and her friends at the end are the defaults.
3. What is special about the place goes into a small module that registers `DU.RIDE_PLACE[id]`.
   Every field is optional: `data`, `world(scene, data, opts)`, `level(api)`, `scenery(api)`,
   `update(dt, api)`, `texts`, `icon`, `sound(api)`. The hooks get one `api` object with what such
   code needs (`T`, `K`, `P`, `scene`, `make`, `place`, `things`, `ambient`, `friends`, `kit()`, `std`…).
4. A way that climbs gives `alt` in its data: one height in metres per route point. The rider, the
   camera, everything put down with `place()`, the shadows and the trail then follow the road, and
   the bike pitches with the slope.

The picker, buying with stars, loading the files and the end card need no change.

Map data © OpenStreetMap contributors, available under the Open Database License.

The font is Fredoka (SIL Open Font License), bundled in `fonts/` so the game loads nothing from other sites.

When you publish a change, bump the `?v=` number on the assets in `index.html` so devices fetch the new files.
