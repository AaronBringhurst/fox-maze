import { dirs } from '../config/constants.js';
import { walk } from './grid.js';

export function generateLayout({ width, height, loopAttempts }, random) {
  if (![width, height].every(n => Number.isInteger(n) && n >= 7 && n % 2 === 1)) throw new RangeError('Maze dimensions must be odd integers of at least 7');
  const maze = Array.from({ length: height }, () => Array(width).fill(1));
  maze[1][1] = 0;
  const stack = [[1, 1]];
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const choices = dirs.filter(([dx, dy]) =>
      x + dx * 2 > 0 && y + dy * 2 > 0 && x + dx * 2 < width - 1 && y + dy * 2 < height - 1 && maze[y + dy * 2][x + dx * 2]);
    if (!choices.length) { stack.pop(); continue; }
    const [dx, dy] = choices[Math.floor(random() * choices.length)];
    maze[y + dy][x + dx] = 0;         // knock down the wall between cells
    maze[y + dy * 2][x + dx * 2] = 0; // open the next cell
    stack.push([x + dx * 2, y + dy * 2]);
  }

  // Add loops so every chase has opportunities to double back.
  for (let i = 0; i < loopAttempts; i++) {
    const x = 2 + Math.floor(random() * (width - 4));
    const y = 2 + Math.floor(random() * (height - 4));
    if (maze[y][x] && ((walk(maze, x - 1, y) && walk(maze, x + 1, y)) || (walk(maze, x, y - 1) && walk(maze, x, y + 1)))) maze[y][x] = 0;
  }

  return maze;
}
