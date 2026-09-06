import { makeRng } from '../core/random.js';
import { getLevelPlan } from '../content/progression.js';
import { generateLayout } from './mazeGen.js';
import { populateMaze } from './populate.js';

export function createLevel(givenSeed, level = 1, plan = getLevelPlan(level)) {
  const seed = givenSeed ?? crypto.getRandomValues(new Uint32Array(1))[0];
  const random = makeRng(seed);
  const maze = generateLayout(plan, random);
  return { seed, maze, ...populateMaze(maze, plan, random) };
}
