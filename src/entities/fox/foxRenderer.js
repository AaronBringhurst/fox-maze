import { poly, ellipse } from '../../rendering/primitives.js';

export function eyePositions(context, fox, clock) {
  const v = context.viewport;
  const p = v.iso(fox.x, fox.y, 0.10);
  const s = v.unit / 25;
  const bob = fox.t < 1 ? Math.sin(fox.t * Math.PI * 2) * 1.4 : Math.sin(clock * 2) * 0.5;
  const flip = fox.dir === 0 || fox.dir === 1 ? 1 : -1;
  return [
    [p[0] + 16.5 * s * flip, p[1] + (bob - 23.5) * s],
    [p[0] + 9.5 * s * flip, p[1] + (bob - 24.5) * s],
  ];
}

export function foxSprite(context, fox, dash, invuln, clock) {
  const g = context.scene, v = context.viewport;
  const p = v.iso(fox.x, fox.y, 0.10);
  const s = v.unit / 25;
  const bob = fox.t < 1 ? Math.sin(fox.t * Math.PI * 2) * 1.4 : Math.sin(clock * 2) * 0.5;
  const X = p[0], Y = p[1] + bob * s;
  const flip = fox.dir === 0 || fox.dir === 1 ? 1 : -1;
  const shape = (pts, hex, alpha = 1) => poly(g, pts.map(([px, py]) => [X + px * s * flip, Y + py * s]), hex, alpha);

  ellipse(g, p[0], p[1] + 3 * s, 14 * s, 5 * s, '#030b15', 0.48); // ground shadow
  if (dash > 0 || invuln > 0) ellipse(g, X, Y - 8 * s, 21 * s, 19 * s, '#c7fada', 0.10 + 0.05 * Math.sin(clock * 15));
  if (invuln > 0 && Math.floor(clock * 12) % 2 === 0) return; // invulnerability flicker

  shape([[-8, -5], [-22, -5], [-30, -14], [-26, -24], [-17, -16], [-5, -17]], '#d5663b');
  shape([[-30, -14], [-26, -24], [-22, -20], [-21, -12]], '#fff0cd');
  shape([[-12, -6], [-8, 2], [-3, 2], [-3, -9]], '#5c342a');
  shape([[5, -7], [6, 2], [10, 2], [11, -9]], '#63352c');
  shape([[-13, -14], [-6, -23], [9, -20], [14, -9], [4, -3], [-9, -5]], '#ed8848');
  shape([[-6, -23], [9, -20], [4, -12], [-13, -14]], '#ffac5d');
  shape([[4, -13], [14, -12], [9, -5], [3, -5]], '#ffdcaa');
  shape([[2, -22], [1, -36], [10, -30], [15, -31], [21, -35], [22, -21], [17, -12], [9, -14]], '#f7974d');
  shape([[3, -33], [5, -24], [9, -28]], '#663a37');
  shape([[19, -31], [17, -24], [21, -24]], '#663a37');
  shape([[9, -21], [21, -21], [26, -16], [16, -12]], '#ffedca');
  shape([[24, -18], [28, -17], [25, -14], [23, -15]], '#252533');
  shape([[15, -25], [18, -25], [18, -22], [15, -22]], '#211e2b');
  shape([[15, -25], [16, -25], [16, -24], [15, -24]], '#ffffff');
}
