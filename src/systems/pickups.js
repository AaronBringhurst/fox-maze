import { balance } from '../config/balance.js';
import { LASER_DURATION, HASTE_DURATION } from '../content/pickups.js';

export function updatePickups(s, { audio, burst, toast }) {
  // Gem pickup: each kind grants its own effect, and every 3rd lifetime gem restores a missing life.
  for (const w of s.wisps) {
    if (w.got || Math.hypot(s.fox.x - w.x, s.fox.y - w.y) >= balance.pickupRadius) continue;
    w.got = true;
    s.collected++;
    s.run.totalGems++;
    audio.gemPickup();

    let effectMessage;
    if (w.kind === 'speed') {
      s.hasteTime = HASTE_DURATION;
      burst(w.x, w.y, '#ffcf8a');
      effectMessage = 'Speed gem! Blazing fast for ' + HASTE_DURATION + ' seconds.';
    } else {
      s.laserTime = LASER_DURATION;
      s.laserCooldown = 0;
      burst(w.x, w.y, '#ff4d6d');
      effectMessage = s.collected === 3
        ? 'All three gems found! Laser eyes refreshed — 8 seconds.'
        : s.collected + ' of 3 gems. Laser eyes active — auto-fire for 8 seconds!';
    }

    const restoredLife = s.run.totalGems % balance.gemsPerLife === 0 && s.run.lives < balance.maxLives;
    if (restoredLife) s.run.lives++;
    toast(restoredLife ? '3 gems — a life returns!' : effectMessage);
  }

}
