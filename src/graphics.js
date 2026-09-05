// PixiJS v8 application setup, the iso() projection, and every drawing routine.
// One Graphics object is cleared and fully redrawn each frame (mirrors the original
// immediate-mode WebGL renderer), depth-sorted the same way: draw order == paint order.
'use strict';

import { Application, Graphics } from 'pixi.js';
import { N } from './world.js';

const BACKGROUND_COLOR = 0x090e17;

// Isometric grid -> screen pixel projection, centered on (cx,cy) and scaled by `unit`.
export class Viewport {
  constructor(gridSize) {
    this.N = gridSize;
    this.unit = 24;
    this.cx = 0;
    this.cy = 0;
    this.W = 0;
    this.H = 0;
  }

  iso(x, y, z = 0) {
    return [this.cx + (x - y) * this.unit, this.cy + (x + y - (this.N - 1)) * this.unit * 0.5 - z * this.unit];
  }

  resize(w, h) {
    this.W = w; this.H = h;
    this.unit = Math.max(5, Math.min((w - 36) / (this.N * 2 + 1), (h - 235) / (this.N + 2)));
    this.cx = w / 2;
    this.cy = (h + 80) / 2;
  }
}

// Fills a convex polygon (points in order) into Graphics object `g`.
export function poly(g, points, hex, alpha = 1) {
  const flat = [];
  for (const [x, y] of points) flat.push(x, y);
  g.poly(flat).fill({ color: hex, alpha });
}

export function ellipse(g, x, y, rx, ry, hex, alpha = 1) {
  g.ellipse(x, y, rx, ry).fill({ color: hex, alpha });
}

// A straight thick "line" as a quad, matching the original's manual quad construction
// (rather than a stroked path) so mitering/caps behave identically at any zoom.
export function line(g, x, y, xx, yy, width, hex, alpha = 1) {
  let dx = xx - x, dy = yy - y;
  const len = Math.hypot(dx, dy) || 1;
  dx *= width / len / 2;
  dy *= width / len / 2;
  poly(g, [[x - dy, y + dx], [xx - dy, yy + dx], [xx + dy, yy - dx], [x + dy, y - dx]], hex, alpha);
}

export function tile(g, viewport, x, y, size, z, hex, alpha = 1) {
  poly(g, [
    viewport.iso(x - size, y - size, z), viewport.iso(x + size, y - size, z),
    viewport.iso(x + size, y + size, z), viewport.iso(x - size, y + size, z),
  ], hex, alpha);
}

// A raised block: top face at height z (from an optional zBottom, default the ground),
// plus left/right side faces down to zBottom.
export function box(g, viewport, x, y, size, z, topHex, leftHex, rightHex, alpha = 1, zBottom = 0) {
  const top = [viewport.iso(x - size, y - size, z), viewport.iso(x + size, y - size, z), viewport.iso(x + size, y + size, z), viewport.iso(x - size, y + size, z)];
  const base = [viewport.iso(x - size, y - size, zBottom), viewport.iso(x + size, y - size, zBottom), viewport.iso(x + size, y + size, zBottom), viewport.iso(x - size, y + size, zBottom)];
  poly(g, [top[3], top[2], base[2], base[3]], leftHex, alpha);
  poly(g, [top[2], top[1], base[1], base[2]], rightHex, alpha);
  poly(g, top, topHex, alpha);
}

export class Renderer {
  constructor() {
    this.viewport = new Viewport(N);
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
  wall(x, y, seed, fox) {
    const g = this.scene, v = this.viewport;
    const noise = ((x * 17 + y * 31 + seed) % 11) / 11;
    const near = Math.hypot(x - fox.x, y - fox.y) < 2 && x + y > fox.x + fox.y - 0.3;
    const alpha = near ? 0.32 : 1;
    box(g, v, x, y, 0.47, 0.58 + noise * 0.12, noise > 0.45 ? '#314650' : '#2b3f49', '#1b303a', '#223741', alpha);
    const p = v.iso(x, y, 0.62 + noise * 0.12);
    line(g, p[0] - v.unit * 0.55, p[1], p[0] - v.unit * 0.12, p[1] + v.unit * 0.21, 1, '#54716d', alpha * 0.55);
    if ((x * 3 + y * 7) % 13 === 0) box(g, v, x, y, 0.24, 0.81, '#465958', '#263b40', '#34494b', alpha);
  }

  // Screen positions of the fox's two eyes (for the laser-eyes effect), matching its current bob/facing.
  eyePositions(fox, clock) {
    const v = this.viewport;
    const p = v.iso(fox.x, fox.y, 0.10);
    const s = v.unit / 25;
    const bob = fox.t < 1 ? Math.sin(fox.t * Math.PI * 2) * 1.4 : Math.sin(clock * 2) * 0.5;
    const flip = fox.dir === 0 || fox.dir === 1 ? 1 : -1;
    return [
      [p[0] + 16.5 * s * flip, p[1] + (bob - 23.5) * s],
      [p[0] + 9.5 * s * flip, p[1] + (bob - 24.5) * s],
    ];
  }

  // Glowing eye effect while laser eyes are active, plus active beam visuals toward just-blasted cats.
  laserEffects(fox, clock, laserTime, beams) {
    const g = this.scene, v = this.viewport;
    const eyes = this.eyePositions(fox, clock);
    const s = v.unit / 25;
    if (laserTime > 0) {
      for (const [x, y] of eyes) {
        ellipse(g, x, y, 6 * s, 5 * s, '#ff487a', 0.18 + 0.06 * Math.sin(clock * 12));
        ellipse(g, x, y, 2.7 * s, 2.2 * s, '#ff5f91');
        ellipse(g, x, y, 1.2 * s, 1.1 * s, '#fff1fa');
      }
    }
    for (const beam of beams) {
      const p = v.iso(beam.x, beam.y, 0.3);
      const target = [p[0], p[1] + (Math.sin(clock * 2.4 + beam.phase) * 3 - 10) * s];
      const alpha = beam.life / 0.22;
      for (const eye of eyes) {
        line(g, eye[0], eye[1], target[0], target[1], 8 * s, '#ff477e', alpha * 0.17);
        line(g, eye[0], eye[1], target[0], target[1], 3 * s, '#ff6b9d', alpha * 0.95);
        line(g, eye[0], eye[1], target[0], target[1], 1 * s, '#fff0fa', alpha);
      }
      ellipse(g, target[0], target[1], 9 * s, 9 * s, '#ff92c3', alpha * 0.28);
    }
  }

  // Draws the fox as a flat-shaded low-poly sprite built from hand-placed triangles.
  foxSprite(fox, dash, invuln, clock) {
    const g = this.scene, v = this.viewport;
    const p = v.iso(fox.x, fox.y, 0.10);
    const s = v.unit / 25;
    const bob = fox.t < 1 ? Math.sin(fox.t * Math.PI * 2) * 1.4 : Math.sin(clock * 2) * 0.5;
    const X = p[0], Y = p[1] + bob * s;
    const flip = fox.dir === 0 || fox.dir === 1 ? 1 : -1;
    const shape = (pts, hex, alpha = 1) => poly(g, pts.map(([px, py]) => [X + px * s * flip, Y + py * s]), hex, alpha);

    ellipse(g, p[0], p[1] + 3 * s, 14 * s, 5 * s, '#030b15', 0.48); // ground shadow
    if (dash > 0 || invuln > 0) ellipse(g, X, Y - 8 * s, 21 * s, 19 * s, '#c7fada', 0.10 + 0.05 * Math.sin(clock * 15));
    if (invuln > 0 && Math.floor(clock * 12) % 2 === 0) return; // invulnerability flicker

    shape([[-8, -5], [-22, -5], [-30, -14], [-26, -24], [-17, -16], [-5, -17]], '#d5663b');
    shape([[-30, -14], [-26, -24], [-22, -20], [-21, -12]], '#fff0cd');
    shape([[-12, -6], [-8, 2], [-3, 2], [-3, -9]], '#5c342a');
    shape([[5, -7], [6, 2], [10, 2], [11, -9]], '#63352c');
    shape([[-13, -14], [-6, -23], [9, -20], [14, -9], [4, -3], [-9, -5]], '#ed8848');
    shape([[-6, -23], [9, -20], [4, -12], [-13, -14]], '#ffac5d');
    shape([[4, -13], [14, -12], [9, -5], [3, -5]], '#ffdcaa');
    shape([[2, -22], [1, -36], [10, -30], [15, -31], [21, -35], [22, -21], [17, -12], [9, -14]], '#f7974d');
    shape([[3, -33], [5, -24], [9, -28]], '#663a37');
    shape([[19, -31], [17, -24], [21, -24]], '#663a37');
    shape([[9, -21], [21, -21], [26, -16], [16, -12]], '#ffedca');
    shape([[24, -18], [28, -17], [25, -14], [23, -15]], '#252533');
    shape([[15, -25], [18, -25], [18, -22], [15, -22]], '#211e2b');
    shape([[15, -25], [16, -25], [16, -24], [15, -24]], '#ffffff');
  }

  // Draws one ghost cat as a translucent floating blob-body with glowing eyes. Hidden once dead.
  catSprite(cat, index, clock) {
    if (cat.dead) return;
    const g = this.scene, v = this.viewport;
    const p = v.iso(cat.x, cat.y, 0.3);
    const s = v.unit / 25;
    const x = p[0], y = p[1] + Math.sin(clock * 2.4 + cat.phase) * 3 * s;
    const main = index === 1 ? '#aabce8' : '#b8a4de';

    ellipse(g, p[0], p[1] + 10 * s, 13 * s, 4 * s, '#070c18', 0.4); // ground shadow
    ellipse(g, x, y - 9 * s, 23 * s, 24 * s, main, 0.045); // outer glow
    ellipse(g, x, y - 9 * s, 17 * s, 18 * s, main, 0.06);  // inner glow

    const bodyPts = [[-12, 4], [-13, -7], [-10, -15], [-11, -27], [-3, -21], [3, -21], [11, -27], [10, -14], [13, -7], [12, 5], [6, 1], [2, 7], [-3, 2], [-8, 6]];
    poly(g, bodyPts.map(([px, py]) => [x + px * s, y + py * s]), main, 0.82);
    poly(g, [[-11, -27], [-3, -21], [-10, -16]].map(([px, py]) => [x + px * s, y + py * s]), '#e6d6ff', 0.7); // ear highlight

    ellipse(g, x - 5 * s, y - 12 * s, 2.5 * s, 3.2 * s, '#172539');
    ellipse(g, x + 5 * s, y - 12 * s, 2.5 * s, 3.2 * s, '#172539');
    ellipse(g, x - 5 * s, y - 12 * s, 1 * s, 2 * s, '#c3ffdc'); // eye glow
    ellipse(g, x + 5 * s, y - 12 * s, 1 * s, 2 * s, '#c3ffdc');
    poly(g, [[x - 2 * s, y - 7 * s], [x + 2 * s, y - 7 * s], [x, y - 5 * s]], '#645179'); // nose
    line(g, x - 9 * s, y - 7 * s, x - 16 * s, y - 9 * s, 0.7 * s, '#e2d3fc', 0.6); // whiskers
    line(g, x + 9 * s, y - 7 * s, x + 16 * s, y - 9 * s, 0.7 * s, '#e2d3fc', 0.6);
  }

  // Draws a floating gem wisp (skipped once collected). Color reflects its kind.
  wisp(w, clock) {
    if (w.got) return;
    const g = this.scene, v = this.viewport;
    const p = v.iso(w.x, w.y, 0.5 + Math.sin(clock * 2 + w.x) * 0.08);
    const r = v.unit * 1.8;
    const glowHex = w.kind === 'speed' ? '#ffcf8a' : '#ff4d6d';
    const bodyHex = w.kind === 'speed' ? '#ffe6b8' : '#ff758f';
    ellipse(g, p[0], p[1] + r * 0.3, r * 0.34, r * 0.13, glowHex, 0.14); // ground glow
    for (let i = 3; i > 0; i--) ellipse(g, p[0], p[1], r * (0.16 + i * 0.10), r * (0.18 + i * 0.10), glowHex, 0.06);
    poly(g, [[p[0], p[1] - r * 0.25], [p[0] + r * 0.13, p[1]], [p[0], p[1] + r * 0.14], [p[0] - r * 0.13, p[1]]], bodyHex); // gem body
    ellipse(g, p[0] - r * 0.025, p[1] - r * 0.08, r * 0.03, r * 0.07, '#ffffff'); // highlight
  }

  // Draws the exit gate as a gold/brass archway: two pillars built from visibly stacked
  // blocks, topped by an arch made of individual wedge-shaped segments (voussoirs) — with a
  // warm magical glow filling the opening. Always open — gems no longer gate it, they just
  // light three small progress lights inside the archway as a bonus-collectible tally.
  gate(exitCell, collected) {
    const g = this.scene, v = this.viewport;
    const { x, y } = exitCell;
    const glowColor = '#fff2af';
    const goldLight = '#ffe9a0', goldMid = '#d9a83c', goldMidAlt = '#c99830', goldShadow = '#8a641c';

    let p = v.iso(x, y, 0.05);
    ellipse(g, p[0], p[1], v.unit * 0.95, v.unit * 0.48, glowColor, 0.25);
    tile(g, v, x, y, 0.46, 0.04, '#9c7a2e');
    tile(g, v, x, y, 0.32, 0.06, '#f8d786', 0.85);

    // Pillars: stacked gold blocks with a visible seam between each one.
    const pillarHeight = 1.8, pillarSegments = 5, seam = 0.025;
    const segHeight = (pillarHeight - seam * (pillarSegments - 1)) / pillarSegments;
    for (let i = 0; i < pillarSegments; i++) {
      const zBottom = i * (segHeight + seam), zTop = zBottom + segHeight;
      const shade = i % 2 === 0 ? goldMid : goldMidAlt;
      box(g, v, x - 0.38, y, 0.2, zTop, goldLight, goldShadow, shade, 1, zBottom);
      box(g, v, x + 0.38, y, 0.2, zTop, goldLight, goldShadow, shade, 1, zBottom);
    }

    // Segmented voussoir arch spanning the two pillar tops, built as a strip of wedge blocks
    // in screen space (so the curve reads correctly under the isometric skew) with a gap
    // between each wedge and a bright bevel line for a stacked-block look.
    const leftTop = v.iso(x - 0.38, y, pillarHeight), rightTop = v.iso(x + 0.38, y, pillarHeight);
    const archRise = v.unit * 0.62, archSegments = 12, bandHalfWidth = v.unit * 0.15, seamGap = 0.09;
    const curvePoints = [];
    for (let i = 0; i <= archSegments; i++) {
      const t = i / archSegments;
      const baseX = leftTop[0] + (rightTop[0] - leftTop[0]) * t;
      const baseY = leftTop[1] + (rightTop[1] - leftTop[1]) * t;
      curvePoints.push([baseX, baseY - Math.sin(t * Math.PI) * archRise]);
    }
    for (let i = 0; i < archSegments; i++) {
      const a = curvePoints[i], b = curvePoints[i + 1];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const pa = [a[0] + dx * seamGap * 0.5, a[1] + dy * seamGap * 0.5];
      const pb = [b[0] - dx * seamGap * 0.5, b[1] - dy * seamGap * 0.5];
      const len = Math.hypot(dx, dy) || 1;
      const perpX = -dy / len * bandHalfWidth, perpY = dx / len * bandHalfWidth;
      const outer1 = [pa[0] - perpX, pa[1] - perpY], outer2 = [pb[0] - perpX, pb[1] - perpY];
      const inner1 = [pa[0] + perpX, pa[1] + perpY], inner2 = [pb[0] + perpX, pb[1] + perpY];
      poly(g, [outer1, outer2, inner2, inner1], i % 2 === 0 ? goldMid : goldMidAlt);
      line(g, outer1[0], outer1[1], outer2[0], outer2[1], v.unit * 0.035, goldLight, 0.9); // bright bevel along the outer edge
    }

    p = v.iso(x, y, 0.9);
    ellipse(g, p[0], p[1], v.unit * 0.37, v.unit * 0.64, glowColor, 0.65);

    for (let i = 0; i < 3; i++) { // three small gem-progress lights inside the archway
      const q = v.iso(x, y, 0.55 + i * 0.32);
      ellipse(g, q[0], q[1], v.unit * 0.055, v.unit * 0.06, i < collected ? '#fff8d9' : '#7a5c1c');
    }
  }

  // Draws the light beam rising from the gate (drawn after maze geometry so it stays visible over
  // walls). Returns the screen point above the beam, for positioning the HTML "EXIT GATE" label.
  gateBeacon(exitCell, clock) {
    const g = this.scene, v = this.viewport;
    const { x, y } = exitCell;
    const p = v.iso(x, y, 0.12), top = v.iso(x, y, 2.9);
    const glowColor = '#ffed9b';
    const pulse = 0.5 + 0.5 * Math.sin(clock * 3);

    poly(g, [[p[0] - v.unit * 0.35, p[1]], [p[0] + v.unit * 0.35, p[1]], [top[0] + v.unit * 0.12, top[1]], [top[0] - v.unit * 0.12, top[1]]], glowColor, 0.08 + pulse * 0.07);
    line(g, p[0], p[1], top[0], top[1], v.unit * 0.08, glowColor, 0.3 + pulse * 0.2);

    for (let ring = 0; ring < 2; ring++) { // two rising rings of light climbing the beam
      const r = 0.7 + ((clock * 0.6 + ring * 0.5) % 1) * 0.6;
      const points = [];
      for (let i = 0; i <= 40; i++) {
        const t = i / 40 * Math.PI * 2;
        points.push([p[0] + Math.cos(t) * v.unit * r, p[1] + Math.sin(t) * v.unit * r * 0.5]);
      }
      for (let i = 1; i < points.length; i++) line(g, points[i - 1][0], points[i - 1][1], points[i][0], points[i][1], 2, glowColor, 0.65);
    }

    const tip = v.iso(x, y, 2.7 + Math.sin(clock * 3) * 0.10); // above the stone arch, not inside it
    poly(g, [[tip[0] - v.unit * 0.19, tip[1] - v.unit * 0.15], [tip[0] + v.unit * 0.19, tip[1] - v.unit * 0.15], [tip[0], tip[1] + v.unit * 0.12]], '#fff2b9');

    return top;
  }

  background(clock) {
    const g = this.scene, v = this.viewport;
    for (let i = 0; i < 75; i++) {
      const x = ((i * 127.31 + Math.sin(i) * 80) % v.W + v.W) % v.W;
      const y = (i * 93.7) % v.H;
      ellipse(g, x, y, 1, 1, '#a9d2cb', 0.10 + 0.1 * Math.sin(clock * 0.4 + i));
    }
  }

  groundPlinth() {
    const g = this.scene, v = this.viewport;
    ellipse(g, v.cx, v.cy + v.unit * 1.8, v.unit * N * 1.05, v.unit * N * 0.56, '#050a13', 0.48);
    ellipse(g, v.cx, v.cy, v.unit * N * 1.08, v.unit * N * 0.57, '#10242b', 0.16);

    const n = N - 1;
    const top = v.iso(-0.65, -0.65), right = v.iso(n + 0.65, -0.65), bottom = v.iso(n + 0.65, n + 0.65), left = v.iso(-0.65, n + 0.65);
    poly(g, [left, bottom, [bottom[0], bottom[1] + v.unit * 0.7], [left[0], left[1] + v.unit * 0.7]], '#172930');
    poly(g, [bottom, right, [right[0], right[1] + v.unit * 0.7], [bottom[0], bottom[1] + v.unit * 0.7]], '#12212b');
    poly(g, [top, right, bottom, left], '#253c40');
  }

  floor(maze, seed) {
    const g = this.scene, v = this.viewport;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const hash = (x * 37 + y * 71 + seed) % 17;
        tile(g, v, x, y, 0.485, 0, maze[y][x] ? '#22383e' : hash < 5 ? '#8bbbd8' : hash < 11 ? '#7aabc9' : '#83b3d1');
        if (!maze[y][x] && hash % 3 === 0) {
          const p = v.iso(x + 0.2, y + 0.2);
          line(g, p[0], p[1], p[0] + v.unit * 0.16, p[1] + v.unit * 0.04, 1, '#c4e5f8', 0.5);
        }
      }
    }
    tile(g, v, 1, 1, 0.38, 0.015, '#b4deee', 0.8); // start tile highlight
  }

  drawTrail(trail) {
    const g = this.scene, v = this.viewport;
    for (const t of trail) {
      const p = v.iso(t.x, t.y, 0.3);
      ellipse(g, p[0], p[1], v.unit * 0.3, v.unit * 0.18, '#b9f3ce', t.life * 0.5);
    }
  }

  drawParticles(particles) {
    const g = this.scene, v = this.viewport;
    for (const p of particles) {
      const q = v.iso(p.x, p.y, p.z);
      ellipse(g, q[0], q[1], v.unit * 0.055, v.unit * 0.055, p.color, p.life);
    }
  }

  fireflies(clock) {
    const g = this.scene, v = this.viewport;
    for (let i = 0; i < 23; i++) {
      const x = (i * 3.17) % N, y = (i * 7.31) % N;
      const p = v.iso(x, y, 0.6 + Math.sin(clock * 0.5 + i) * 0.4);
      ellipse(g, p[0] + Math.sin(clock * 0.4 + i) * 10, p[1], 1.5, 1.5, '#d9ffc0', 0.18 + 0.15 * Math.sin(clock + i));
    }
  }

  // Rebuilds and draws one full frame: background, floor, maze walls/floor, gate, pickups,
  // actors (depth-sorted so nearer isometric tiles draw over farther ones), particles.
  // Returns { gateTop } — the screen point above the exit beacon, for HUD label positioning.
  render(state) {
    const { maze, seed, exitCell, wisps, cats, fox, particles, trail, beams, dash, invuln, laserTime, collected, clock } = state;
    const g = this.scene;
    g.clear();

    this.background(clock);
    this.groundPlinth();
    this.floor(maze, seed);
    this.drawTrail(trail);

    // Depth-sort every wall, the gate, gems, cats, and the fox together so isometric occlusion looks right.
    const items = [];
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++)
        if (maze[y][x]) items.push({ depth: x + y, draw: () => this.wall(x, y, seed, fox) });
    items.push({ depth: exitCell.x + exitCell.y + 0.05, draw: () => this.gate(exitCell, collected) });
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
