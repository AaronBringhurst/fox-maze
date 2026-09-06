import { ellipse, line } from './primitives.js';

export function laserEffects(context, fox, clock, laserTime, beams) {
  const g = context.scene, v = context.viewport;
  const eyes = context.eyePositions(fox, clock);
  const s = v.unit / 25;
  if (laserTime > 0) {
    for (const [x, y] of eyes) {
      ellipse(g, x, y, 6 * s, 5 * s, '#ff487a', 0.18 + 0.06 * Math.sin(clock * 12));
      ellipse(g, x, y, 2.7 * s, 2.2 * s, '#ff5f91');
      ellipse(g, x, y, 1.2 * s, 1.1 * s, '#fff1fa');
    }
  }
  for (const beam of beams) {
    const p = v.iso(beam.x, beam.y, 0.3);
    const target = [p[0], p[1] + (Math.sin(clock * 2.4 + beam.phase) * 3 - 10) * s];
    const alpha = beam.life / 0.22;
    for (const eye of eyes) {
      line(g, eye[0], eye[1], target[0], target[1], 8 * s, '#ff477e', alpha * 0.17);
      line(g, eye[0], eye[1], target[0], target[1], 3 * s, '#ff6b9d', alpha * 0.95);
      line(g, eye[0], eye[1], target[0], target[1], 1 * s, '#fff0fa', alpha);
    }
    ellipse(g, target[0], target[1], 9 * s, 9 * s, '#ff92c3', alpha * 0.28);
  }
}

export function drawTrail(context, trail) {
  const g = context.scene, v = context.viewport;
  for (const t of trail) {
    const p = v.iso(t.x, t.y, 0.3);
    ellipse(g, p[0], p[1], v.unit * 0.3, v.unit * 0.18, '#b9f3ce', t.life * 0.5);
  }
}

export function drawParticles(context, particles) {
  const g = context.scene, v = context.viewport;
  for (const p of particles) {
    const q = v.iso(p.x, p.y, p.z);
    ellipse(g, q[0], q[1], v.unit * 0.055, v.unit * 0.055, p.color, p.life);
  }
}

export function fireflies(context, clock) {
  const g = context.scene, v = context.viewport;
  for (let i = 0; i < 23; i++) {
    const x = (i * 3.17) % context.viewport.width, y = (i * 7.31) % context.viewport.height;
    const p = v.iso(x, y, 0.6 + Math.sin(clock * 0.5 + i) * 0.4);
    ellipse(g, p[0] + Math.sin(clock * 0.4 + i) * 10, p[1], 1.5, 1.5, '#d9ffc0', 0.18 + 0.15 * Math.sin(clock + i));
  }
}
