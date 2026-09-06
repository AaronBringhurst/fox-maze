import { poly, ellipse, line, tile } from '../../rendering/primitives.js';

// Keep the original brass/gold palette, with dark joints and bright top faces.
const gold = {
  top: '#ffe9a0', face: '#d9a83c', alternate: '#c99830', side: '#8a641c',
  light: '#fff2af', portal: '#f5bd45', core: '#ffe6a0',
};

export function gate(context, exitCell, collected, clock = 0) {
  const g = context.scene, v = context.viewport;
  const { x, y } = exitCell;
  const point = (u, z, depth = 0) => v.iso(x + u, y + depth, z);
  const pulse = 0.5 + 0.5 * Math.sin(clock * 2.2);
  const ground = point(0, 0.03);
  ellipse(g, ground[0], ground[1], v.unit * 0.9, v.unit * 0.42, gold.portal, 0.12 + pulse * 0.05);
  tile(g, v, x, y, 0.47, 0.025, gold.side);
  tile(g, v, x, y, 0.40, 0.035, gold.face, 0.6);

  // The portal follows the stepped inner edge of the masonry. Draw it first,
  // so the solid blocks mask its edges and the opening remains clearly framed.
  const opening = [
    [-0.48, 0.06], [0.48, 0.06], [0.48, 1.43], [0.26, 1.43],
    [0.26, 1.77], [-0.26, 1.77], [-0.26, 1.43], [-0.48, 1.43],
  ];
  poly(g, opening.map(([u, z]) => point(u, z)), gold.portal, 0.68 + pulse * 0.10);
  poly(g, opening.map(([u, z]) => point(u * 0.80, 0.10 + z * 0.91)), gold.core, 0.24 + pulse * 0.12);
  for (const side of [-1, 1]) {
    const a = point(side * 0.45, 0.10), b = point(side * 0.45, 1.40);
    line(g, ...a, ...b, v.unit * 0.035, gold.light, 0.65);
  }

  // Slow, faint light bands move up the portal, confined to its opening.
  for (let i = 0; i < 3; i++) {
    const phase = (clock * 0.22 + i / 3) % 1;
    const z = 0.14 + phase * 1.52;
    const half = z > 1.4 ? 0.23 : 0.43;
    poly(g, [[-half, z], [half, z], [half, z + 0.035], [-half, z + 0.035]].map(([u, h]) => point(u, h)), gold.light, Math.sin(phase * Math.PI) * 0.22);
  }

  // Rectangular prisms in world coordinates, with actual top/side depth.
  // Small gaps between blocks remain dark rather than blending into a ring.
  function block(left, right, bottom, top, alternate = false) {
    const back = -0.19, front = 0.19;
    const a = point(left, top, front), b = point(right, top, front);
    const c = point(right, bottom, front), d = point(left, bottom, front);
    poly(g, [b, point(right, top, back), point(right, bottom, back), c], gold.side);
    poly(g, [a, b, c, d], alternate ? gold.alternate : gold.face);
    poly(g, [point(left, top, back), point(right, top, back), b, a], gold.top);
    line(g, ...a, ...b, v.unit * 0.025, gold.light, 0.75);
  }

  // Four broad courses per pillar, two inward shoulders, and a block lintel.
  // This stepped silhouette stays readable at the normal maze zoom.
  for (const side of [-1, 1]) {
    const center = side * 0.64;
    for (let course = 0; course < 4; course++) {
      block(center - 0.17, center + 0.17, 0.06 + course * 0.35, 0.39 + course * 0.35, course % 2 === 1);
    }
  }
  block(-0.81, -0.27, 1.46, 1.78);
  block(0.27, 0.81, 1.46, 1.78);
  for (let i = 0; i < 3; i++) {
    const left = -0.53 + i * 0.36;
    block(left, left + 0.34, 1.80, 2.13, i !== 1);
  }

  // Tiny inlaid lights on the crown retain the existing collectible tally.
  for (let i = 0; i < 3; i++) {
    const center = -0.36 + i * 0.36;
    poly(g, [[center - 0.045, 1.92], [center + 0.045, 1.92], [center + 0.045, 2.01], [center - 0.045, 2.01]].map(([u, z]) => point(u, z, 0.195)), i < collected ? gold.light : gold.side);
  }

  // A small fixed particle budget; animation uses the scene clock, not RNG
  // or gameplay state. Sparks fade in/out instead of visibly wrapping.
  for (let i = 0; i < 9; i++) {
    const phase = (clock * (0.16 + (i % 3) * 0.025) + i * 0.618) % 1;
    const u = Math.sin(i * 2.4 + clock * 0.7) * 0.20;
    const p = point(u, 0.15 + phase * 1.52, 0.015);
    const alpha = Math.sin(phase * Math.PI) * 0.8;
    const size = v.unit * (i % 3 === 0 ? 0.035 : 0.022);
    ellipse(g, p[0], p[1], size * 2.5, size * 2.5, gold.portal, alpha * 0.15);
    poly(g, [[p[0] - size, p[1] - size], [p[0] + size, p[1] - size], [p[0] + size, p[1] + size], [p[0] - size, p[1] + size]], gold.light, alpha);
  }
}

// Keep the locator above walls without painting beams or rings over the arch.
export function gateBeacon(context, exitCell) {
  return context.viewport.iso(exitCell.x, exitCell.y, 2.45);
}
