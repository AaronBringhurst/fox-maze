// Input handling, entity state, the game loop, and HUD DOM syncing.
'use strict';

import {
  dirs, keyDirs, walk, distances, actor, beginStep, advance, laserSight, generateMaze,
  LASER_DURATION, LASER_RANGE, HASTE_DURATION,
} from './world.js';
import { Renderer } from './graphics.js';
import { audio } from './audio.js'

const $ = id => document.getElementById(id);
const canvas = $('game');
const renderer = new Renderer();

function fail(message) {
  $('error').style.display = 'block';
  $('error').textContent = message;
  $('veil').classList.add('hidden');
}

let maze = [];           // maze[y][x] === 1 means wall, 0 means walkable
let fox;                 // player actor
let cats = [];           // ghost cat actors
let wisps = [];          // gem pickups for the current level
let exitCell;            // {x,y} of this level's exit gate
let seed;                // maze RNG seed, shown in the corner and reused for wall texture noise
let state = 'intro';     // 'intro' | 'playing' | 'paused' | 'lost'
let elapsed = 0;         // seconds survived this level
let collected = 0;       // gems collected this level (drives the gate's progress lights)
let totalGems = 0;       // lifetime gems collected this run; every 3rd restores a missing life
let lives = 3;
let dash = 0;            // seconds remaining of an active dash
let cooldown = 0;        // seconds until dash is available again
let invuln = 0;          // seconds of post-hit invulnerability remaining
let pathClock = 0;       // countdown to the next cat pathfinding refresh
let field = [];          // BFS distance field from the fox, used for cat pathfinding
let trail = [];          // fading dash trail particles
let toastTimer = 0;
let gateLabelTimer = 0;  // the "EXIT GATE" label only shows for the first few seconds of a level
let clock = 0;           // free-running animation clock (seconds)
let pressed = [];        // currently-held movement key codes, most recent last
let buffered = null;     // next queued direction (index into dirs), applied on the next step boundary
let particles = [];
let level = 1;
let W = 0, H = 0;
let lastStepPhase = 0; // 0 = awaiting first footfall this cell, 1 = mid-step, 2 = already played both

let laserTime = 0;       // seconds of laser eyes remaining
let laserCooldown = 0;   // seconds until the next shot can fire
let beams = [];          // active laser beam visuals
let hasteTime = 0;       // seconds of active speed boost remaining

// Generates a new maze (pure logic lives in world.js) and resets all engine/HUD state for it.
function makeMaze(givenSeed, newLevel = 1) {
  level = newLevel;
  if (newLevel === 1) totalGems = 0; // lifetime count only resets on a fresh run, not between levels
  ({ seed, maze, exitCell, wisps, fox, cats } = generateMaze(givenSeed, newLevel));

  elapsed = 0; collected = 0; lives = 3;
  dash = 0; cooldown = 0; invuln = 0;
  trail = []; particles = [];
  laserTime = 0; laserCooldown = 0; beams = [];
  hasteTime = 0;
  gateLabelTimer = 5;
  pathClock = 0; pressed = []; buffered = null;
  lastStepPhase = 0;
  field = distances(maze, fox.toX, fox.toY);
  $('seed').textContent = 'GROVE / ' + seed.toString(16).padStart(8, '0').toUpperCase();
  sync();
}

// Pushes all game state into the DOM/HUD. Called once per update tick.
function sync() {
  $('levelInfo').textContent = 'LEVEL ' + level + ' · ' + cats.length + ' GHOST CATS';
  $('gateStatus').textContent = 'ENTER FOR LEVEL ' + (level + 1);
  $('gateLabel').classList.add('open');
  $('gateLabel').style.opacity = gateLabelTimer > 0 ? '1' : '0';
  $('wisps').textContent = totalGems;
  $('lives').textContent = Array.from({ length: 3 }, (_, i) => i < lives ? '♥' : '♡').join(' ');
  $('time').textContent = String(Math.floor(elapsed / 60)).padStart(2, '0') + ':' + String(Math.floor(elapsed % 60)).padStart(2, '0');
  $('energy').style.width = (1 - cooldown / 3) * 100 + '%';
  $('dashText').textContent = cooldown > 0 ? cooldown.toFixed(1) + 's' : 'READY';
  $('dashMeter').classList[cooldown <= 0 ? 'add' : 'remove']('ready');
  $('laserEnergy').style.width = (laserTime / LASER_DURATION) * 100 + '%';
  $('laserText').textContent = laserTime > 0 ? laserTime.toFixed(1) + 's' : collected === 3 ? 'EMPTY' : 'GET A GEM';
  $('laserMeter').classList[laserTime > 0 ? 'add' : 'remove']('active');
  $('hasteEnergy').style.width = (hasteTime / HASTE_DURATION) * 100 + '%';
  $('hasteText').textContent = hasteTime > 0 ? hasteTime.toFixed(1) + 's' : '';
  $('hasteMeter').classList[hasteTime > 0 ? 'add' : 'remove']('active');
}

function toast(text) {
  $('toast').textContent = text;
  $('toast').style.opacity = '1';
  toastTimer = 3;
}

function nextLevel() {
  const remainingLives = lives;
  makeMaze(undefined, level + 1);
  lives = remainingLives; // carry lives forward; makeMaze() resets everything else for the new level
  state = 'playing';
  sync();
  toast('Level ' + level + ' — ' + cats.length + ' ghost cats. They wake in 4 seconds!');
}

function modal(tag, title, text, buttonLabel) {
  $('cardTag').textContent = tag;
  $('cardTitle').textContent = title;
  $('cardText').textContent = text;
  $('play').textContent = buttonLabel;
  $('cardHint').textContent = state === 'paused' ? 'P or Escape to resume' : 'Every new grove is a new maze.';
  $('veil').classList.remove('hidden');
}

function start() {
  audio.init();
  audio.playMusic();
  if (state === 'paused') {
    state = 'playing';
  } else if (state === 'intro') {
    state = 'playing';
    toast('Grab gems for power-ups, then find the gate. The cats wake in 4 seconds.');
    // One-time nudge explaining dash, once the first toast has faded.
    setTimeout(() => {
      if (state === 'playing') toast('Space to dash: a burst of speed and brief invulnerability. Watch SPIRIT DASH in the corner for when it’s ready again.');
    }, 3200);
  } else {
    makeMaze();
    state = 'playing';
    toast('A new grove. The cats wake in 4 seconds.');
  }
  $('veil').classList.add('hidden');
  $('pause').textContent = 'Pause';
}

function pause() {
  if (state === 'playing') {
    audio.pauseMusic();
    state = 'paused';
    pressed = []; buffered = null;
    $('pause').textContent = 'Resume';
    modal('Take a breath', 'The woods can wait.', 'Your fox is safe while the game is paused.', 'Back to the grove →');
  } else if (state === 'paused') {
    audio.resumeMusic();
    start();
  }
}

function doDash() {
  if (state === 'playing' && cooldown <= 0) {
    audio.dash();
    dash = 0.42;
    cooldown = 3;
    toast('Spirit dash — the cats cannot touch you.');
  }
}

function burst(x, y, hex) {
  for (let i = 0; i < 15; i++)
    particles.push({ x, y, z: 0.3, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, vz: Math.random() * 1.4 + 0.4, life: 1, color: hex });
}

// Auto-fires at the nearest visible cat within range while laser eyes are active.
// A blasted cat dies permanently — it never comes back for the rest of the level.
function shootLaser() {
  if (laserTime <= 0 || laserCooldown > 0 || state !== 'playing') return;
  let target = null, nearest = LASER_RANGE;
  for (const cat of cats) {
    if (cat.dead) continue;
    const distance = Math.hypot(cat.x - fox.x, cat.y - fox.y);
    if (distance <= nearest && laserSight(maze, fox.x, fox.y, cat.x, cat.y)) { target = cat; nearest = distance; }
  }
  if (!target) return;
  audio.laserShot();
  audio.catHurt();
  beams.push({ x: target.x, y: target.y, phase: target.phase, life: 0.22 });
  burst(target.x, target.y, '#ff8eb4');
  target.dead = true;
  laserCooldown = 0.38;
}

function update(dt) {
  clock += dt;
  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) $('toast').style.opacity = '0';
  }
  if (state !== 'playing') return;

  elapsed += dt;
  dash = Math.max(0, dash - dt);
  cooldown = Math.max(0, cooldown - dt);
  invuln = Math.max(0, invuln - dt);
  laserTime = Math.max(0, laserTime - dt);
  laserCooldown = Math.max(0, laserCooldown - dt);
  hasteTime = Math.max(0, hasteTime - dt);
  gateLabelTimer = Math.max(0, gateLabelTimer - dt);
  beams = beams.filter(b => (b.life -= dt) > 0);

  // Movement: try the buffered turn first, then fall back through the other currently-held
  // keys (most recently pressed first) so a second held key never stalls movement just
  // because its direction happens to be a wall — the older held key keeps working.
  if (fox.t >= 1) {
    let moved = buffered !== null && beginStep(maze, fox, buffered);
    if (moved) buffered = null;
    for (let i = pressed.length - 1; i >= 0 && !moved; i--) moved = beginStep(maze, fox, keyDirs[pressed[i]]);
  }
  advance(fox, dt, dash > 0 ? 10 : hasteTime > 0 ? 7 : 4.3);

  // Two footfalls per grid step, skipped while dashing (the dash whoosh covers it).
  if (dash <= 0) {
    if (fox.t < 1) {
      if (fox.t >= 0.15 && lastStepPhase === 0) {
        audio.step();
        lastStepPhase = 1;
      } else if (fox.t >= 0.65 && lastStepPhase === 1) {
        audio.step();
        lastStepPhase = 2;
      }
    } else {
      lastStepPhase = 0;
    }
  }

  if (dash > 0) trail.push({ x: fox.x, y: fox.y, life: 0.3 });
  trail = trail.filter(p => (p.life -= dt) > 0);

  // Gem pickup: each kind grants its own effect, and every 3rd lifetime gem restores a missing life.
  for (const w of wisps) {
    if (w.got || Math.hypot(fox.x - w.x, fox.y - w.y) >= 0.48) continue;
    w.got = true;
    collected++;
    totalGems++;
    audio.gemPickup();

    let effectMessage;
    if (w.kind === 'speed') {
      hasteTime = HASTE_DURATION;
      burst(w.x, w.y, '#ffcf8a');
      effectMessage = 'Speed gem! Blazing fast for ' + HASTE_DURATION + ' seconds.';
    } else {
      laserTime = LASER_DURATION;
      laserCooldown = 0;
      burst(w.x, w.y, '#ff4d6d');
      effectMessage = collected === 3
        ? 'All three gems found! Laser eyes refreshed — 8 seconds.'
        : collected + ' of 3 gems. Laser eyes active — auto-fire for 8 seconds!';
    }

    const restoredLife = totalGems % 3 === 0 && lives < 3;
    if (restoredLife) lives++;
    toast(restoredLife ? '3 gems — a life returns!' : effectMessage);
  }

  // Reaching the exit gate advances to the next level — gems no longer gate this.
  if (Math.hypot(fox.x - exitCell.x, fox.y - exitCell.y) < 0.45) {
    nextLevel();
    return;
  }

  // Refresh the cats' shared pathfinding field periodically rather than every frame.
  pathClock -= dt;
  if (pathClock <= 0) { field = distances(maze, fox.toX, fox.toY); pathClock = 0.22; }

  shootLaser();

  // Cat AI: greedily step toward whichever open neighbor has the lowest distance-to-fox.
  if (elapsed > 4 && state === 'playing') {
    for (const cat of cats) {
      if (cat.dead) continue;
      if (cat.t >= 1) {
        const choices = dirs
          .map(([dx, dy], i) => ({ i, x: cat.toX + dx, y: cat.toY + dy }))
          .filter(p => walk(maze, p.x, p.y));
        choices.sort((a, b) => field[a.y][a.x] - field[b.y][b.x]);
        if (choices.length) beginStep(maze, cat, choices[0].i);
      }
      advance(cat, dt, 1.65 + collected * 0.13);

      if (invuln <= 0 && dash <= 0 && Math.hypot(cat.x - fox.x, cat.y - fox.y) < 0.58) {
        lives--;
        invuln = 3;
        audio.playerHit();
        burst(fox.x, fox.y, '#ffab77');
        cats = cats.map(c => ({ ...c, ...actor(c.homeX, c.homeY) })); // send every cat back home
        toast('A close call! The cats retreat. Dash with Space.');
        if (lives === 0) {
          state = 'lost';
          modal('The grove keeps its secrets', 'Caught in the moonlight.',
            'You reached level ' + level + '. Try a new path, and save your spirit dash for a close encounter.',
            'Start a new run →');
        }
        break;
      }
    }
  }

  particles = particles.filter(p => {
    p.life -= dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    return p.life > 0;
  });
  sync();
}

function positionGateLabel(gateTop) {
  if (!gateTop) return;
  const label = $('gateLabel');
  label.style.left = Math.max(88, Math.min(W - 88, gateTop[0])) + 'px';
  label.style.top = Math.max(190, gateTop[1] - 7) + 'px';
}

function tick(ticker) {
  const dt = Math.min(ticker.deltaMS / 1000, 0.04); // clamp to avoid huge jumps after a tab was backgrounded
  update(dt);
  const { gateTop } = renderer.render({
    maze, seed, exitCell, wisps, cats, fox, particles, trail, beams,
    dash, invuln, laserTime, collected, clock,
  });
  positionGateLabel(gateTop);
}

function resize() {
  W = innerWidth; H = innerHeight;
  renderer.resize(W, H);
}

function down(code) {
  if (keyDirs[code] === undefined) return;
  if (state !== 'playing') return;
  pressed = pressed.filter(k => k !== code);
  pressed.push(code);
  buffered = keyDirs[code];
}
function up(code) {
  pressed = pressed.filter(k => k !== code);
}

addEventListener('keydown', e => {
  if (keyDirs[e.code] === undefined && !['Space', 'KeyP', 'Escape'].includes(e.code)) return;
  e.preventDefault();
  if (e.repeat) return;
  if (e.code === 'Space') doDash();
  else if (e.code === 'KeyP' || e.code === 'Escape') pause();
  else down(e.code);
});
addEventListener('keyup', e => up(e.code));
addEventListener('blur', () => {
  pressed = []; buffered = null;
  if (state === 'playing') pause();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'playing') pause();
});

$('play').onclick = start;
$('pause').onclick = pause;
$('new').onclick = () => {
  audio.init();
  audio.playMusic();
  makeMaze();
  state = 'playing';
  $('veil').classList.add('hidden');
  $('pause').textContent = 'Pause';
  toast('Level 1 — a fresh run. The cats wake in 4 seconds.');
};

// Mobile on-screen movement buttons + dash button.
document.querySelectorAll('[data-key]').forEach(b => {
  b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); down(b.dataset.key); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, () => up(b.dataset.key));
});
$('touchDash').addEventListener('pointerdown', e => { e.preventDefault(); doDash(); });

canvas.addEventListener('webglcontextlost', e => {
  e.preventDefault();
  if (state === 'playing') pause();
  fail('The graphics context was interrupted. Reload this page to start a fresh game.');
});

addEventListener('resize', resize);

async function main() {
  try {
    await renderer.init(canvas);
  } catch (err) {
    fail('WebGL/WebGPU is unavailable. Enable hardware acceleration in your browser, then reload this page.');
    throw err;
  }
  makeMaze();
  resize();
  renderer.app.ticker.add(tick);
}
main();
