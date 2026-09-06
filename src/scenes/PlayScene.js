import { balance } from '../config/balance.js';
import { createGameState, loadLevel } from '../state/gameState.js';
import { distances } from '../world/pathfinding.js';
import { updateMovement } from '../systems/movement.js';
import { updatePickups } from '../systems/pickups.js';
import { updateEnemies } from '../systems/enemies.js';
import { shootLaser, doDash } from '../systems/combat.js';
import { burst as emitBurst, updateParticles } from '../systems/effects.js';

// Owns the session and update ordering. UI/audio are supplied by the bootstrap.
export function createPlayScene({ renderer, hud, audio, input }) {
  const s = createGameState();
  let hintTimer;
  const toast = text => hud.toast(text);
  const modal = (...args) => hud.modal(s, ...args);
  const burst = (...args) => emitBurst(s, ...args);
  const feedback = { audio, toast, modal, burst };
  const sync = () => hud.sync(s);
  function makeMaze(seed, level = 1) {
    clearTimeout(hintTimer);
    loadLevel(s, seed, level);
    input.clear();
    sync();
  }
  function start() {
    audio.init();
    audio.playMusic();
    if (s.mode === 'paused') {
      s.mode = 'playing';
    } else if (s.mode === 'intro') {
      s.mode = 'playing';
      toast('Grab gems for power-ups, then find the gate. The cats wake in 4 seconds.');
      // One-time nudge explaining dash, once the first toast has faded.
      hintTimer = setTimeout(() => {
        if (s.mode === 'playing') toast('Space to dash: a burst of speed and brief invulnerability. Watch SPIRIT DASH in the corner for when it’s ready again.');
      }, 3200);
    } else {
      makeMaze();
      s.mode = 'playing';
      toast('A new grove. The cats wake in 4 seconds.');
    }
    hud.showPlaying();
  }
  function pause() {
    if (s.mode === 'playing') {
      audio.pauseMusic();
      s.mode = 'paused';
      input.clear();
      hud.showPaused();
      modal('Take a breath', 'The woods can wait.', 'Your fox is safe while the game is paused.', 'Back to the grove →');
    } else if (s.mode === 'paused') {
      audio.resumeMusic();
      start();
    }
  }
  function nextLevel() {
    makeMaze(undefined, s.run.level + 1);
    s.mode = 'playing';
    sync();
    toast('Level ' + s.run.level + ' — ' + s.cats.length + ' ghost cats. They wake in 4 seconds!');
  }
  function update(dt) {
    s.clock += dt;
    hud.update(dt);
    if (s.mode !== 'playing') return;

    s.elapsed += dt;
    s.dash = Math.max(0, s.dash - dt);
    s.cooldown = Math.max(0, s.cooldown - dt);
    s.invuln = Math.max(0, s.invuln - dt);
    s.laserTime = Math.max(0, s.laserTime - dt);
    s.laserCooldown = Math.max(0, s.laserCooldown - dt);
    s.hasteTime = Math.max(0, s.hasteTime - dt);
    s.gateLabelTimer = Math.max(0, s.gateLabelTimer - dt);
    s.beams = s.beams.filter(b => (b.life -= dt) > 0);

    updateMovement(s, input, dt, feedback);
    updatePickups(s, feedback);

    // Reaching the exit gate advances to the next level — gems no longer gate this.
    if (Math.hypot(s.fox.x - s.exitCell.x, s.fox.y - s.exitCell.y) < balance.exitRadius) {
      nextLevel();
      return;
    }

    // Refresh the cats' shared pathfinding field periodically rather than every frame.
    s.pathClock -= dt;
    if (s.pathClock <= 0) { s.field = distances(s.maze, s.fox.toX, s.fox.toY); s.pathClock = balance.pathInterval; }

    shootLaser(s, feedback);

    updateEnemies(s, dt, feedback);
    updateParticles(s, dt);
    sync();
  }
  function newRun() {
    audio.init();
    audio.playMusic();
    makeMaze();
    s.mode = 'playing';
    hud.showPlaying();
    toast('Level 1 — a fresh run. The cats wake in 4 seconds.');
  }
  return {
    state: s,
    enter: () => makeMaze(),
    start, pause, newRun,
    dash: () => doDash(s, feedback),
    update,
    render() {
      const { gateTop } = renderer.render(s);
      hud.positionGateLabel(gateTop, renderer.viewport.W);
    },
    dispose() { clearTimeout(hintTimer); input.clear(); audio.pauseMusic(); },
  };
}
