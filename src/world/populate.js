import { distances } from './pathfinding.js';
import { walk } from './grid.js';
import { actor } from '../entities/actor.js';
import { pickups } from '../content/pickups.js';

export function populateMaze(maze, plan, random) {
  // The exit is the cell farthest (by walking distance) from the start.
  const fromStart = distances(maze, 1, 1);
  const cells = [];
  for (let y = 1; y < maze.length - 1; y++)
    for (let x = 1; x < maze[y].length - 1; x++)
      if (walk(maze, x, y)) cells.push({ x, y, d: fromStart[y][x] });
  cells.sort((a, b) => b.d - a.d);
  const exitCell = { ...cells[0] };

  // Place gems one at a time, each picked to maximize its minimum distance from the start,
  // the exit, and every gem already placed — spreads them around the maze.
  // Each gem also rolls a kind: mostly laser eyes, sometimes a speed boost.
  const wisps = [];
  const placed = [{ x: 1, y: 1 }, exitCell];
  for (let i = 0; i < plan.pickupCount; i++) {
    const fieldsFromPlaced = placed.map(p => distances(maze, p.x, p.y));
    const best = cells
      .filter(p => p.d > 5)
      .map(p => ({ ...p, score: Math.min(...fieldsFromPlaced.map(f => f[p.y][p.x])) }))
      .sort((a, b) => b.score - a.score)[0];
    wisps.push({ ...best, got: false, kind: random() < pickups.laser.weight ? 'laser' : 'speed' });
    placed.push(best);
  }

  const fox = actor(1, 1);
  const cats = [];
  let spawnCells = cells.filter(p => p.d > Math.max(12, cells[0].d * 0.45));
  if (!spawnCells.length) spawnCells = cells.filter(p => p.d > 0);
  const catCount = plan.enemyCount;
  for (let i = 0; i < catCount; i++) {
    const p = spawnCells[Math.floor(i * spawnCells.length / catCount)];
    cats.push({ ...actor(p.x, p.y), homeX: p.x, homeY: p.y, phase: i * 2.1 });
  }

  return { exitCell, wisps, fox, cats };
}
