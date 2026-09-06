import { balance } from '../config/balance.js';
import { createLevel } from '../world/createLevel.js';
import { distances } from '../world/pathfinding.js';

export function createGameState() {
  return { mode: 'intro', clock: 0, run: { level: 1, totalGems: 0, lives: balance.maxLives } };
}

// A level transition replaces level-owned data while preserving run progress.
export function loadLevel(s, seed, level = 1) {
  const generated = createLevel(seed, level);
  if (level === 1) s.run = { level, totalGems: 0, lives: balance.maxLives };
  else s.run.level = level;
  Object.assign(s, generated, {
    elapsed: 0, collected: 0, dash: 0, cooldown: 0, invuln: 0,
    trail: [], particles: [], laserTime: 0, laserCooldown: 0, beams: [],
    hasteTime: 0, gateLabelTimer: 5, pathClock: 0, lastStepPhase: 0,
    field: distances(generated.maze, generated.fox.toX, generated.fox.toY),
  });
}
