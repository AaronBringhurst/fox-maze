import { dirs } from '../config/constants.js';
import { walk } from './grid.js';

export function distances(maze, x, y) {
  const dist = maze.map(row => row.map(() => -1));
  if (!walk(maze, x, y)) return dist;
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
