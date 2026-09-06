export function poly(g, points, hex, alpha = 1) {
  const flat = [];
  for (const [x, y] of points) flat.push(x, y);
  g.poly(flat).fill({ color: hex, alpha });
}

export function ellipse(g, x, y, rx, ry, hex, alpha = 1) {
  g.ellipse(x, y, rx, ry).fill({ color: hex, alpha });
}

// A straight thick "line" as a quad, matching the original's manual quad construction
// (rather than a stroked path) so mitering/caps behave identically at any zoom.
export function line(g, x, y, xx, yy, width, hex, alpha = 1) {
  let dx = xx - x, dy = yy - y;
  const len = Math.hypot(dx, dy) || 1;
  dx *= width / len / 2;
  dy *= width / len / 2;
  poly(g, [[x - dy, y + dx], [xx - dy, yy + dx], [xx + dy, yy - dx], [x + dy, y - dx]], hex, alpha);
}

export function tile(g, viewport, x, y, size, z, hex, alpha = 1) {
  poly(g, [
    viewport.iso(x - size, y - size, z), viewport.iso(x + size, y - size, z),
    viewport.iso(x + size, y + size, z), viewport.iso(x - size, y + size, z),
  ], hex, alpha);
}

// A raised block: top face at height z (from an optional zBottom, default the ground),
// plus left/right side faces down to zBottom.
export function box(g, viewport, x, y, size, z, topHex, leftHex, rightHex, alpha = 1, zBottom = 0) {
  const top = [viewport.iso(x - size, y - size, z), viewport.iso(x + size, y - size, z), viewport.iso(x + size, y + size, z), viewport.iso(x - size, y + size, z)];
  const base = [viewport.iso(x - size, y - size, zBottom), viewport.iso(x + size, y - size, zBottom), viewport.iso(x + size, y + size, zBottom), viewport.iso(x - size, y + size, zBottom)];
  poly(g, [top[3], top[2], base[2], base[3]], leftHex, alpha);
  poly(g, [top[2], top[1], base[1], base[2]], rightHex, alpha);
  poly(g, top, topHex, alpha);
}
