import { balance } from '../config/balance.js';
import { laserSight } from '../world/collision.js';
import { pickups, LASER_RANGE } from '../content/pickups.js';

export function shootLaser(s, { audio, burst }) {
  if (s.laserTime <= 0 || s.laserCooldown > 0 || s.mode !== 'playing') return;
  let target = null, nearest = LASER_RANGE;
  for (const cat of s.cats) {
    if (cat.dead) continue;
    const distance = Math.hypot(cat.x - s.fox.x, cat.y - s.fox.y);
    if (distance <= nearest && laserSight(s.maze, s.fox.x, s.fox.y, cat.x, cat.y)) { target = cat; nearest = distance; }
  }
  if (!target) return;
  audio.laserShot();
  audio.catHurt();
  s.beams.push({ x: target.x, y: target.y, phase: target.phase, life: 0.22 });
  burst(target.x, target.y, '#ff8eb4');
  target.dead = true;
  s.laserCooldown = pickups.laser.cooldown;
}

export function doDash(s, { audio, toast }) {
  if (s.mode === 'playing' && s.cooldown <= 0) {
    audio.dash();
    s.dash = balance.dashDuration;
    s.cooldown = balance.dashCooldown;
    toast('Spirit dash — the cats cannot touch you.');
  }
}
