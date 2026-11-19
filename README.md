# HARBORLINE

A single-player third-person exploration prototype in a fictional working harbor. The first district joins Breakwater Avenue, Market Crossing and West Quay. Buildings, signage, the container terminal, vessels and street layout were authored for the game.

## Run

Use Node.js 22 or newer. Run `npm ci` and `npm run dev`. Use `npm run build` to generate the static site in `dist/`. Assets ship with the game. The renderer requires WebGL 2.

## Controls

Walk with WASD or the up/down arrows. Hold Shift to run. Drag or use left/right arrows to turn the camera. Scroll to change camera distance. Read nearby signs with E, open the map with M and pause with Escape. On touch screens, use the stick and sprint button and drag the open view. Sound starts muted.

## Project layout

The Three.js scene and input loop live in `src/main.js`. The street, architecture, harbor and animated character have separate modules. World geometry registers static colliders with the movement system in `src/navigation.js`. The navigation module also defines the interactive locations used by the map and field signage. Only discovered sign identifiers are persisted in browser storage under `harborline.visits.v1`.

This version supports walking and running on the street and quay. Parked vehicles are scenery. The scene has no server requirement.

## Attribution

Open the pause menu's credits or inspect the notices under `public/assets/` for original sources, license conditions and adaptations. The included Three.js distribution is MIT licensed. Font licenses accompany the local Barlow font files.
