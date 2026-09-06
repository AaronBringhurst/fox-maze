import { poly, ellipse, line, tile, box } from './primitives.js';

export function wall(context, x, y, seed, fox) {
  const g = context.scene, v = context.viewport;
  const noise = ((x * 17 + y * 31 + seed) % 11) / 11;
  const near = Math.hypot(x - fox.x, y - fox.y) < 2 && x + y > fox.x + fox.y - 0.3;
  const alpha = near ? 0.32 : 1;
  box(g, v, x, y, 0.47, 0.58 + noise * 0.12, noise > 0.45 ? '#314650' : '#2b3f49', '#1b303a', '#223741', alpha);
  const p = v.iso(x, y, 0.62 + noise * 0.12);
  line(g, p[0] - v.unit * 0.55, p[1], p[0] - v.unit * 0.12, p[1] + v.unit * 0.21, 1, '#54716d', alpha * 0.55);
  if ((x * 3 + y * 7) % 13 === 0) box(g, v, x, y, 0.24, 0.81, '#465958', '#263b40', '#34494b', alpha);
}


export function background(context, clock) {
  const g = context.scene, v = context.viewport;
  for (let i = 0; i < 75; i++) {
    const x = ((i * 127.31 + Math.sin(i) * 80) % v.W + v.W) % v.W;
    const y = (i * 93.7) % v.H;
    ellipse(g, x, y, 1, 1, '#a9d2cb', 0.10 + 0.1 * Math.sin(clock * 0.4 + i));
  }
}

export function groundPlinth(context) {
  const g = context.scene, v = context.viewport;
  const extent = (v.width + v.height) / 2;
  ellipse(g, v.cx, v.cy + v.unit * 1.8, v.unit * extent * 1.05, v.unit * extent * 0.56, '#050a13', 0.48);
  ellipse(g, v.cx, v.cy, v.unit * extent * 1.08, v.unit * extent * 0.57, '#10242b', 0.16);

  const n = context.viewport.width - 1, m = context.viewport.height - 1;
  const top = v.iso(-0.65, -0.65), right = v.iso(n + 0.65, -0.65), bottom = v.iso(n + 0.65, m + 0.65), left = v.iso(-0.65, m + 0.65);
  poly(g, [left, bottom, [bottom[0], bottom[1] + v.unit * 0.7], [left[0], left[1] + v.unit * 0.7]], '#172930');
  poly(g, [bottom, right, [right[0], right[1] + v.unit * 0.7], [bottom[0], bottom[1] + v.unit * 0.7]], '#12212b');
  poly(g, [top, right, bottom, left], '#253c40');
}

export function floor(context, maze, seed) {
  const g = context.scene, v = context.viewport;
  for (let y = 0; y < maze.length; y++) {
    for (let x = 0; x < maze[y].length; x++) {
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
