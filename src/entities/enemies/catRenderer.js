import { poly, ellipse, line } from '../../rendering/primitives.js';

export function catSprite(context, cat, index, clock) {
  if (cat.dead) return;
  const g = context.scene, v = context.viewport;
  const p = v.iso(cat.x, cat.y, 0.3);
  const s = v.unit / 25;
  const x = p[0], y = p[1] + Math.sin(clock * 2.4 + cat.phase) * 3 * s;
  const main = index === 1 ? '#aabce8' : '#b8a4de';

  ellipse(g, p[0], p[1] + 10 * s, 13 * s, 4 * s, '#070c18', 0.4); // ground shadow
  ellipse(g, x, y - 9 * s, 23 * s, 24 * s, main, 0.045); // outer glow
  ellipse(g, x, y - 9 * s, 17 * s, 18 * s, main, 0.06);  // inner glow

  const bodyPts = [[-12, 4], [-13, -7], [-10, -15], [-11, -27], [-3, -21], [3, -21], [11, -27], [10, -14], [13, -7], [12, 5], [6, 1], [2, 7], [-3, 2], [-8, 6]];
  poly(g, bodyPts.map(([px, py]) => [x + px * s, y + py * s]), main, 0.82);
  poly(g, [[-11, -27], [-3, -21], [-10, -16]].map(([px, py]) => [x + px * s, y + py * s]), '#e6d6ff', 0.7); // ear highlight

  ellipse(g, x - 5 * s, y - 12 * s, 2.5 * s, 3.2 * s, '#172539');
  ellipse(g, x + 5 * s, y - 12 * s, 2.5 * s, 3.2 * s, '#172539');
  ellipse(g, x - 5 * s, y - 12 * s, 1 * s, 2 * s, '#c3ffdc'); // eye glow
  ellipse(g, x + 5 * s, y - 12 * s, 1 * s, 2 * s, '#c3ffdc');
  poly(g, [[x - 2 * s, y - 7 * s], [x + 2 * s, y - 7 * s], [x, y - 5 * s]], '#645179'); // nose
  line(g, x - 9 * s, y - 7 * s, x - 16 * s, y - 9 * s, 0.7 * s, '#e2d3fc', 0.6); // whiskers
  line(g, x + 9 * s, y - 7 * s, x + 16 * s, y - 9 * s, 0.7 * s, '#e2d3fc', 0.6);
}
