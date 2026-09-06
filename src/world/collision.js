export function laserSight(maze, x, y, tx, ty) {
  const dx = tx - x, dy = ty - y;
  for (let row = 0; row < maze.length; row++) {
    for (let col = 0; col < maze[row].length; col++) {
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
