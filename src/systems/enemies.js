import { balance } from '../config/balance.js';
import { dirs } from '../config/constants.js';
import { beginStep, advance, walk } from '../world/grid.js';
import { actor } from '../entities/actor.js';
import { ghostCat } from '../content/enemies.js';

export function updateEnemies(s, dt, { audio, burst, toast, modal }) {
  // Cat AI: greedily step toward whichever open neighbor has the lowest distance-to-fox.
  if (s.elapsed > ghostCat.wakeDelay && s.mode === 'playing') {
    for (const cat of s.cats) {
      if (cat.dead) continue;
      if (cat.t >= 1) {
        const choices = dirs
          .map(([dx, dy], i) => ({ i, x: cat.toX + dx, y: cat.toY + dy }))
          .filter(p => walk(s.maze, p.x, p.y));
        choices.sort((a, b) => s.field[a.y][a.x] - s.field[b.y][b.x]);
        if (choices.length) beginStep(s.maze, cat, choices[0].i);
      }
      advance(cat, dt, ghostCat.speed + s.collected * ghostCat.speedPerGem);

      if (s.invuln <= 0 && s.dash <= 0 && Math.hypot(cat.x - s.fox.x, cat.y - s.fox.y) < balance.hitRadius) {
        s.run.lives--;
        s.invuln = balance.hitInvulnerability;
        audio.playerHit();
        burst(s.fox.x, s.fox.y, '#ffab77');
        s.cats = s.cats.map(c => ({ ...c, ...actor(c.homeX, c.homeY) })); // send every cat back home
        toast('A close call! The cats retreat. Dash with Space.');
        if (s.run.lives === 0) {
          s.mode = 'lost';
          modal('The grove keeps its secrets', 'Caught in the moonlight.',
            'You reached level ' + s.run.level + '. Try a new path, and save your spirit dash for a close encounter.',
            'Start a new run →');
        }
        break;
      }
    }
  }

}
