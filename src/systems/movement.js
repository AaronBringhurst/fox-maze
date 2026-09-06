import { balance } from '../config/balance.js';
import { keyDirs } from '../config/constants.js';
import { beginStep, advance } from '../world/grid.js';
import { pickups } from '../content/pickups.js';

export function updateMovement(s, input, dt, { audio }) {
  // Movement: try the buffered turn first, then fall back through the other currently-held
  // keys (most recently pressed first) so a second held key never stalls movement just
  // because its direction happens to be a wall — the older held key keeps working.
  if (s.fox.t >= 1) {
    let moved = input.buffered !== null && beginStep(s.maze, s.fox, input.buffered);
    if (moved) input.buffered = null;
    for (let i = input.pressed.length - 1; i >= 0 && !moved; i--) moved = beginStep(s.maze, s.fox, keyDirs[input.pressed[i]]);
  }
  advance(s.fox, dt, s.dash > 0 ? balance.dashSpeed : s.hasteTime > 0 ? pickups.speed.speed : balance.playerSpeed);

  // Two footfalls per grid step, skipped while dashing (the dash whoosh covers it).
  if (s.dash <= 0) {
    if (s.fox.t < 1) {
      if (s.fox.t >= 0.15 && s.lastStepPhase === 0) {
        audio.step();
        s.lastStepPhase = 1;
      } else if (s.fox.t >= 0.65 && s.lastStepPhase === 1) {
        audio.step();
        s.lastStepPhase = 2;
      }
    } else {
      s.lastStepPhase = 0;
    }
  }

  if (s.dash > 0) s.trail.push({ x: s.fox.x, y: s.fox.y, life: 0.3 });
  s.trail = s.trail.filter(p => (p.life -= dt) > 0);

}
