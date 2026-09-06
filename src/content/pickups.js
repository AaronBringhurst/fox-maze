export const pickups = Object.freeze({
  laser: Object.freeze({ duration: 8, range: 9, cooldown: 0.38, weight: 0.7 }),
  speed: Object.freeze({ duration: 6, speed: 7, weight: 0.3 }),
});
export const LASER_DURATION = pickups.laser.duration;
export const LASER_RANGE = pickups.laser.range;
export const HASTE_DURATION = pickups.speed.duration;
