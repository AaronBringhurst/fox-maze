import { Application, Graphics } from 'pixi.js';
import { Viewport } from './isometric.js';
const BACKGROUND_COLOR = 0x090e17;
import { eyePositions, foxSprite } from '../entities/fox/foxRenderer.js';
import { catSprite } from '../entities/enemies/catRenderer.js';
import { wisp } from '../entities/pickups/pickupRenderer.js';
import { laserEffects, drawTrail, drawParticles, fireflies } from './effects.js';
import { wall, background, groundPlinth, floor } from './terrain.js';
import { gate, gateBeacon } from '../entities/gate/gateRenderer.js';

export class Renderer {
  constructor() {
    this.viewport = new Viewport();
    this.app = new Application();
    this.scene = new Graphics();
  }

  async init(canvas) {
    await this.app.init({
      canvas,
      resizeTo: window,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      antialias: true,
      backgroundColor: BACKGROUND_COLOR,
    });
    this.app.stage.addChild(this.scene);
    this.resize(window.innerWidth, window.innerHeight);
  }

  resize(w, h) {
    this.viewport.resize(w, h);
  }

  // Draws one wall block, fading it out when it would occlude the fox from the camera.
  wall(...args) { return wall(this, ...args); }

  // Screen positions of the fox's two eyes (for the laser-eyes effect), matching its current bob/facing.
  eyePositions(...args) { return eyePositions(this, ...args); }

  // Glowing eye effect while laser eyes are active, plus active beam visuals toward just-blasted cats.
  laserEffects(...args) { return laserEffects(this, ...args); }

  // Draws the fox as a flat-shaded low-poly sprite built from hand-placed triangles.
  foxSprite(...args) { return foxSprite(this, ...args); }

  // Draws one ghost cat as a translucent floating blob-body with glowing eyes. Hidden once dead.
  catSprite(...args) { return catSprite(this, ...args); }

  // Draws a floating gem wisp (skipped once collected). Color reflects its kind.
  wisp(...args) { return wisp(this, ...args); }

  // Gold block archway, animated portal, and collectible inlays.
  gate(...args) { return gate(this, ...args); }

  // Anchor above the arch for the HTML exit locator.
  gateBeacon(...args) { return gateBeacon(this, ...args); }

  background(...args) { return background(this, ...args); }

  groundPlinth(...args) { return groundPlinth(this, ...args); }

  floor(...args) { return floor(this, ...args); }

  drawTrail(...args) { return drawTrail(this, ...args); }

  drawParticles(...args) { return drawParticles(this, ...args); }

  fireflies(...args) { return fireflies(this, ...args); }

  // Rebuilds and draws one full frame: background, floor, maze walls/floor, gate, pickups,
  // actors (depth-sorted so nearer isometric tiles draw over farther ones), particles.
  // Returns { gateTop } — the screen point above the exit beacon, for HUD label positioning.
  render(state) {
    const { maze, seed, exitCell, wisps, cats, fox, particles, trail, beams, dash, invuln, laserTime, collected, clock } = state;
    if (this.viewport.width !== maze[0].length || this.viewport.height !== maze.length) {
      this.viewport.width = maze[0].length;
      this.viewport.height = maze.length;
      this.viewport.resize(this.viewport.W, this.viewport.H);
    }
    const g = this.scene;
    g.clear();

    this.background(clock);
    this.groundPlinth();
    this.floor(maze, seed);
    this.drawTrail(trail);

    // Depth-sort every wall, the gate, gems, cats, and the fox together so isometric occlusion looks right.
    const items = [];
    for (let y = 0; y < maze.length; y++)
      for (let x = 0; x < maze[y].length; x++)
        if (maze[y][x]) items.push({ depth: x + y, draw: () => this.wall(x, y, seed, fox) });
    items.push({ depth: exitCell.x + exitCell.y + 0.05, draw: () => this.gate(exitCell, collected, clock) });
    wisps.forEach(w => items.push({ depth: w.x + w.y + 0.1, draw: () => this.wisp(w, clock) }));
    cats.forEach((cat, i) => items.push({ depth: cat.x + cat.y + 0.15, draw: () => this.catSprite(cat, i, clock) }));
    items.push({ depth: fox.x + fox.y + 0.2, draw: () => this.foxSprite(fox, dash, invuln, clock) });
    items.sort((a, b) => a.depth - b.depth);
    items.forEach(item => item.draw());

    const gateTop = this.gateBeacon(exitCell, clock);
    this.laserEffects(fox, clock, laserTime, beams);

    this.drawParticles(particles);
    this.fireflies(clock);

    return { gateTop };
  }
}
