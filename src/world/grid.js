import { dirs } from '../config/constants.js';

export function walk(maze, x, y) {
  return x >= 0 && y >= 0 && y < maze.length && x < maze[y].length && maze[y][x] === 0;
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
