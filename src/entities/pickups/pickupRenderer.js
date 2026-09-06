import { poly, ellipse } from '../../rendering/primitives.js';

export function wisp(context, w, clock) {
  if (w.got) return;
  const g = context.scene, v = context.viewport;
  const p = v.iso(w.x, w.y, 0.5 + Math.sin(clock * 2 + w.x) * 0.08);
  const r = v.unit * 1.8;
  const glowHex = w.kind === 'speed' ? '#ffcf8a' : '#ff4d6d';
  const bodyHex = w.kind === 'speed' ? '#ffe6b8' : '#ff758f';
  ellipse(g, p[0], p[1] + r * 0.3, r * 0.34, r * 0.13, glowHex, 0.14); // ground glow
  for (let i = 3; i > 0; i--) ellipse(g, p[0], p[1], r * (0.16 + i * 0.10), r * (0.18 + i * 0.10), glowHex, 0.06);
  poly(g, [[p[0], p[1] - r * 0.25], [p[0] + r * 0.13, p[1]], [p[0], p[1] + r * 0.14], [p[0] - r * 0.13, p[1]]], bodyHex); // gem body
  ellipse(g, p[0] - r * 0.025, p[1] - r * 0.08, r * 0.03, r * 0.07, '#ffffff'); // highlight
}
