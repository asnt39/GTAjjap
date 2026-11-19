# HARBORLINE

First Drive is a single-player third-person exploration and driving prototype in a fictional working harbor. The first district joins Breakwater Avenue, Market Crossing and West Quay. Buildings, signage, the container terminal, vessels and street layout were authored for the game.

## Run

Use Node.js 22 or newer. Run `npm ci` and `npm run dev`. Use `npm run build` to generate the static site in `dist/`. Assets ship with the game. The renderer requires WebGL 2.

## Controls

Walk with WASD or the up/down arrows. Hold Shift to run. Drag or use left/right arrows to turn the camera. Scroll to change camera distance. Read nearby signs with E, open the map with M and pause with Escape. On touch screens, use the stick and sprint button and drag the open view. Sound starts muted.

## Project layout

The Three.js scene and input loop live in `src/main.js`. The street, architecture, harbor and animated character have separate modules. World geometry registers static colliders with the movement system in `src/navigation.js`. The navigation module also defines the interactive locations used by the map and field signage. Discovered signs use the original `harborline.visits.v1` key. Completing the optional First Drive uses a separate `harborline.firstDrive.v2` key.

Approach either side of the Touring parked east of spawn and press E to enter. W accelerates, S brakes and then reverses, A/D steer, and Space applies the handbrake. Stop before pressing E to exit. Touch driving uses the stick for steering and separate pedal buttons. Enable the existing sound control for engine and road audio. Start the optional First Drive route from the pause menu.

The 120 Hz bicycle model and oriented footprint collision tests are in `src/driving.js`. The wheel and brake-light rig in `src/touring.js` reuses the original Touring mesh. Run `node tests/driving.mjs` to check dynamics, exit safety and the route. The scene has no server requirement.

## Attribution

Open the pause menu's credits or inspect the notices under `public/assets/` for original sources, license conditions and adaptations. The included Three.js distribution is MIT licensed. Font licenses accompany the local Barlow font files.
