import { balance } from '../config/balance.js';

// Preserve the current endless progression; future level unlocks belong here.
export function getLevelPlan(level = 1) {
  if (!Number.isInteger(level) || level < 1) throw new RangeError('Level must be a positive integer');
  return { level, width: balance.mazeSize, height: balance.mazeSize, loopAttempts: balance.loopAttempts, pickupCount: 3, enemyCount: level + 2 };
}
