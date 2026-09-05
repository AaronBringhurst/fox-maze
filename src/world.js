// Pure game logic: no DOM, no rendering. Everything here is deterministic and testable
// in isolation — maze generation, pathfinding, collision, and actor step interpolation.
'use strict';

export const N = 19; // maze is N x N cells, always odd so walls/passages alternate cleanly
export const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // grid step per direction index: N, E, S, W
export const keyDirs = { KeyW: 0, ArrowUp: 0, KeyD: 1, ArrowRight: 1, KeyS: 2, ArrowDown: 2, KeyA: 3, ArrowLeft: 3 };

export const LASER_DURATION = 8; // seconds of auto-fire laser eyes per gem
export const LASER_RANGE = 9;    // max grid distance a laser shot can reach
export const HASTE_DURATION = 6; // seconds of speed-gem boost

// Deterministic PRNG (mulberry32). Returns a `random()` closure seeded from `seed`,
// so a maze can be replayed exactly from its seed.
export function makeRng(seed) {
  let seedState = seed;
  return function random() {
    let t = (seedState += 0x6D2B79F5);
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function walk(maze, x, y) {
  return x >= 0 && y >= 0 && x < N && y < N && maze[y][x] === 0;
}

// BFS grid distances from (x,y) to every reachable cell — used for both cat pathfinding and maze generation.
export function distances(maze, x, y) {
  const dist = Array.from({ length: N }, () => Array(N).fill(-1));
  const queue = [[x, y]];
  dist[y][x] = 0;
  for (let i = 0; i < queue.length; i++) {
    const [cx2, cy2] = queue[i];
    for (const [dx, dy] of dirs) {
      const nx = cx2 + dx, ny = cy2 + dy;
      if (walk(maze, nx, ny) && dist[ny][nx] < 0) {
        dist[ny][nx] = dist[cy2][cx2] + 1;
        queue.push([nx, ny]);
      }
    }
  }
  return dist;
}

export function actor(x, y) {
  return { x, y, fromX: x, fromY: y, toX: x, toY: y, t: 1, dir: 1 };
}

// Starts an actor stepping toward the adjacent cell in direction `dir` (one of the 4 `dirs` indices).
// Returns false (and does nothing) if that cell is a wall.
export function beginStep(maze, actorObj, dir) {
  const [dx, dy] = dirs[dir];
  const x = actorObj.toX + dx, y = actorObj.toY + dy;
  if (!walk(maze, x, y)) return false;
  actorObj.fromX = actorObj.toX; actorObj.fromY = actorObj.toY;
  actorObj.toX = x; actorObj.toY = y;
  actorObj.t = 0;
  actorObj.dir = dir;
  return true;
}

// Advances an actor's interpolation `t` from its `from` cell toward its `to` cell.
export function advance(actorObj, dt, speed) {
  actorObj.t = Math.min(1, actorObj.t + dt * speed);
  actorObj.x = actorObj.fromX + (actorObj.toX - actorObj.fromX) * actorObj.t;
  actorObj.y = actorObj.fromY + (actorObj.toY - actorObj.fromY) * actorObj.t;
}

// True if a straight line from (x,y) to (tx,ty) is unobstructed by any wall tile
// (slab/AABB intersection test against each solid cell's 1x1 square).
export function laserSight(maze, x, y, tx, ty) {
  const dx = tx - x, dy = ty - y;
  for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
      if (!maze[row][col]) continue;
      let tMin = 0, tMax = 1;
      for (const [origin, delta, min, max] of [[x, dx, col - 0.5, col + 0.5], [y, dy, row - 0.5, row + 0.5]]) {
        if (Math.abs(delta) < 1e-9) {
          if (origin < min || origin > max) { tMax = -1; break; }
        } else {
          const t1 = (min - origin) / delta, t2 = (max - origin) / delta;
          tMin = Math.max(tMin, Math.min(t1, t2));
          tMax = Math.min(tMax, Math.max(t1, t2));
        }
      }
      if (tMin <= tMax) return false; // the segment crosses this wall tile
    }
  }
  return true;
}

// Generates one maze via randomized depth-first backtracking on odd grid coordinates,
// carves a few extra loop connections, then places the exit, gems, and actor spawns.
// Pure function of (seed, level) — no engine/HUD state is touched here.
export function generateMaze(givenSeed, level) {
  const seed = givenSeed === undefined ? crypto.getRandomValues(new Uint32Array(1))[0] : givenSeed;
  const random = makeRng(seed);

  const maze = Array.from({ length: N }, () => Array(N).fill(1));
  maze[1][1] = 0;
  const stack = [[1, 1]];
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const choices = dirs.filter(([dx, dy]) =>
      x + dx * 2 > 0 && y + dy * 2 > 0 && x + dx * 2 < N - 1 && y + dy * 2 < N - 1 && maze[y + dy * 2][x + dx * 2]);
    if (!choices.length) { stack.pop(); continue; }
    const [dx, dy] = choices[Math.floor(random() * choices.length)];
    maze[y + dy][x + dx] = 0;         // knock down the wall between cells
    maze[y + dy * 2][x + dx * 2] = 0; // open the next cell
    stack.push([x + dx * 2, y + dy * 2]);
  }

  // Add loops so every chase has opportunities to double back.
  for (let i = 0; i < 18; i++) {
    const x = 2 + Math.floor(random() * (N - 4));
    const y = 2 + Math.floor(random() * (N - 4));
    if (maze[y][x] && ((walk(maze, x - 1, y) && walk(maze, x + 1, y)) || (walk(maze, x, y - 1) && walk(maze, x, y + 1)))) maze[y][x] = 0;
  }

  // The exit is the cell farthest (by walking distance) from the start.
  const fromStart = distances(maze, 1, 1);
  const cells = [];
  for (let y = 1; y < N - 1; y++)
    for (let x = 1; x < N - 1; x++)
      if (walk(maze, x, y)) cells.push({ x, y, d: fromStart[y][x] });
  cells.sort((a, b) => b.d - a.d);
  const exitCell = { ...cells[0] };

  // Place gems one at a time, each picked to maximize its minimum distance from the start,
  // the exit, and every gem already placed — spreads them around the maze.
  // Each gem also rolls a kind: mostly laser eyes, sometimes a speed boost.
  const wisps = [];
  const placed = [{ x: 1, y: 1 }, exitCell];
  for (let i = 0; i < 3; i++) {
    const fieldsFromPlaced = placed.map(p => distances(maze, p.x, p.y));
    const best = cells
      .filter(p => p.d > 5)
      .map(p => ({ ...p, score: Math.min(...fieldsFromPlaced.map(f => f[p.y][p.x])) }))
      .sort((a, b) => b.score - a.score)[0];
    wisps.push({ ...best, got: false, kind: random() < 0.7 ? 'laser' : 'speed' });
    placed.push(best);
  }

  const fox = actor(1, 1);
  const cats = [];
  const spawnCells = cells.filter(p => p.d > Math.max(12, cells[0].d * 0.45));
  const catCount = level + 2;
  for (let i = 0; i < catCount; i++) {
    const p = spawnCells[Math.floor(i * spawnCells.length / catCount)];
    cats.push({ ...actor(p.x, p.y), homeX: p.x, homeY: p.y, phase: i * 2.1 });
  }

  return { seed, maze, exitCell, wisps, fox, cats };
}
