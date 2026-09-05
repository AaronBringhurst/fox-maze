# Hollow Run — Ghostlight Grove

An isometric maze chase: guide the fox through a procedurally generated grove, collect gems, and reach the exit gate before the ghost cats catch up. Each new grove adds one more cat.

**[Play the live demo →](https://aaronbringhurst.github.io/hollow-run/)**

## Gameplay

- **Move** with `WASD` / arrow keys (isometric directions), or the on-screen buttons on touch devices.
- **Spirit Dash** (`Space`) — a short burst of speed and invulnerability, on a cooldown.
- **Gems** grant one of two effects: **Laser Eyes** (auto-fires at any ghost cat in line of sight for 8 seconds) or a **Speed Boost**. Every third gem collected restores a lost life.
- **Ghost cats** hunt the fox using a live pathfinding field recomputed as it moves. Getting caught costs a life and sends every cat back to its spawn point.
- Reach the glowing exit gate to advance to the next grove.

## Tech stack

- **[PixiJS v8](https://pixijs.com/)** — WebGL/WebGPU 2D rendering, driven by a single `Graphics` object rebuilt every frame.
- **Procedural generation** — a seeded [mulberry32](https://github.com/bryc/code/blob/master/jshash/PRNGs.md) PRNG drives a randomized depth-first-search maze carver, with extra loop connections carved in afterward so chases have room to double back.
- **BFS pathfinding** — a breadth-first distance field from the fox is recomputed periodically and shared by every ghost cat for greedy pursuit; the same BFS also picks the exit and spreads gem placement across the maze.
- **Line-of-sight raycasting** — laser eyes only auto-fire at cats with an unobstructed line to the fox, via slab/AABB intersection tests against the wall grid.
- **ES Modules**, no framework — plain JavaScript split by concern (see below), bundled with [Vite](https://vitejs.dev/).

## Project structure

```
index.html       Canvas, HUD, and modal markup; loads src/game.js as a module
src/world.js      Pure game logic: PRNG, maze generation, BFS, collision, actor stepping
src/graphics.js   PixiJS setup, the isometric projection, and every drawing routine
src/game.js       Input handling, entity state, the game loop, and HUD syncing
```

## Local development

```bash
npm install
npm run dev
```

Then open the printed local URL. `npm run build` produces a production bundle in `dist/`; `npm run preview` serves that build locally.

## Deployment

Pushes to `main` automatically build and publish to GitHub Pages via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). Enable Pages for the repo once (Settings → Pages → Source: GitHub Actions) and it deploys on every push.
# fox-maze
