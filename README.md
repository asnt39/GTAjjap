# HARBORLINE

Player & Living City is a single-player third-person exploration and driving game in a fictional working harbor. The first district joins Breakwater Avenue, Market Crossing and West Quay. Buildings, signage, the container terminal, vessels and street layout were authored for the game.

## Run

Use Node.js 22 or newer. Run `npm ci` and `npm run dev`. Use `npm run build` to generate the static site in `dist/`. Assets ship with the game. The renderer requires WebGL 2.

## Controls

Walk with WASD or the up/down arrows. Tap Shift to toggle running. The pause menu also offers hold-to-run. Press Space to jump on foot and F to punch. Drag or use left/right arrows to turn the camera. Scroll to change camera distance. Read nearby signs with E, open the map with M and pause with Escape. On touch screens, use the stick for walking or push it to the edge to run. Drag the open view to look around and use the jump and attack buttons. Sound starts muted.

## Project layout

The Three.js scene and input loop live in `src/main.js`. The street, architecture, harbor and animated character have separate modules. World geometry registers static colliders with the movement system in `src/navigation.js`. The navigation module also defines the interactive locations used by the map and field signage. Discovered signs use the original `harborline.visits.v1` key. Completing the optional First Drive uses a separate `harborline.firstDrive.v2` key.

Approach either side of the Touring parked east of spawn and press E to enter. W accelerates, S brakes and then reverses, A/D steer, and Space applies the handbrake. Stop before pressing E to exit. Touch driving uses the stick for steering and separate pedal buttons. Enable the existing sound control for engine and road audio. Start the optional First Drive route from the pause menu.

The 120 Hz bicycle model and oriented footprint collision tests are in `src/driving.js`. The wheel and brake-light rig in `src/touring.js` reuses the original Touring mesh. Run `node tests/driving.mjs` to check dynamics, exit safety and the route. The scene has no server requirement.

Five residents share the Rocketbox geometry and source clips, each with an independent skeleton and a local wardrobe variant. Approach one and press E to speak. Their movement and reactions are in `src/residents.js`; the timed hand contact and health rules are in `src/melee.js`. The sprint preference uses `harborline.runMode.v3`. Run `node tests/footwork.mjs` and `node tests/living-city.mjs` for the on-foot and resident checks.

## Attribution

Open the pause menu's credits or inspect the notices under `public/assets/` for original sources, license conditions and adaptations. The included Three.js distribution is MIT licensed. Font licenses accompany the local Barlow font files.
