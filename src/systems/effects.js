export function burst(s, x, y, hex) {
  for (let i = 0; i < 15; i++)
    s.particles.push({ x, y, z: 0.3, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, vz: Math.random() * 1.4 + 0.4, life: 1, color: hex });
}

export function updateParticles(s, dt) {
  s.particles = s.particles.filter(p => {
    p.life -= dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    return p.life > 0;
  });
}
