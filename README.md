# Hollow Run — Ghostlight Grove

An isometric maze chase: guide the fox through a procedurally generated grove, collect gems, and reach the exit gate before the ghost cats catch up. Each new grove adds one more cat.

**[Play the live demo →](https://aaronbringhurst.github.io/fox-maze/)**

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

The application starts in `src/main.js`. Modules are organized by ownership:

- `src/config/`: default balance values and direction constants.
- `src/content/`: enemy/pickup definitions and the current level plan.
- `src/core/`: input binding, audio, and seeded random numbers.
- `src/entities/`: shared actor model and entity-specific drawing.
- `src/world/`: maze layout, object placement, pathfinding, collision, and grid movement.
- `src/state/`: session creation and level reset rules; `state.run` survives level transitions.
- `src/systems/`: movement, pickups, combat, enemies, and particles. No DOM or Pixi dependencies.
- `src/scenes/`: gameplay lifecycle and system update order.
- `src/rendering/`: Pixi setup, projection, terrain, and visual effects.
- `src/ui/`: HUD, overlays, and styles.
- `tests/`: seeded generation and gameplay regression checks.

### Adding content

Edit `content/progression.js` to plan level dimensions, enemy counts, and pickup counts. The current defaults preserve the original 19×19 endless game. Layout generation accepts odd width/height values of at least 7; placement runs afterward using the same seeded random stream.

Enemy and pickup tuning lives in `content/`; implement new behavior in the relevant `systems/` module and add its visual under `entities/`. Keep world calculations in grid coordinates and convert to screen coordinates only in rendering.

`PlayScene` owns a session and calls systems in a deliberate order: timers, movement, pickups, exit transition, pathfinding, lasers, enemies, particles, then HUD. Systems receive state and feedback callbacks; they do not import a global session, UI, or audio singleton.

Run progress (level, lives, lifetime gems) lives in `state.run`; level objects and temporary effects are replaced by `loadLevel`. Saves, bosses, additional scenes, and an event bus are future features rather than placeholder implementations.


## Local development

```bash
npm install
npm run dev
```

Run `npm test` for regression checks (no additional test dependency required).

Then open the printed local URL. `npm run build` produces a production bundle in `dist/`; `npm run preview` serves that build locally.

## Deployment

Pushes to `main` automatically build and publish to GitHub Pages via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). Enable Pages for the repo once (Settings → Pages → Source: GitHub Actions) and it deploys on every push.
# fox-maze

Adding a line in the Readme so i can keep up my goal of daily pushes for my github