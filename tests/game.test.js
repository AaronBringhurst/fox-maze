import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createLevel } from '../src/world/createLevel.js';
import { distances } from '../src/world/pathfinding.js';
import { walk, beginStep, advance } from '../src/world/grid.js';
import { laserSight } from '../src/world/collision.js';
import { getLevelPlan } from '../src/content/progression.js';
import { actor } from '../src/entities/actor.js';
import { createGameState, loadLevel } from '../src/state/gameState.js';
import { updateMovement } from '../src/systems/movement.js';
import { updatePickups } from '../src/systems/pickups.js';
import { updateEnemies } from '../src/systems/enemies.js';
import { doDash, shootLaser } from '../src/systems/combat.js';
import { createInput } from '../src/core/input.js';
import { createPlayScene } from '../src/scenes/PlayScene.js';
import { Viewport } from '../src/rendering/isometric.js';
import { Renderer } from '../src/rendering/Renderer.js';

const noop = () => {};
const audio = Object.fromEntries(['init', 'playMusic', 'pauseMusic', 'resumeMusic', 'step', 'dash', 'gemPickup', 'laserShot', 'catHurt', 'playerHit'].map(name => [name, noop]));
const feedback = { audio, burst: noop, toast: noop, modal: noop };
function session() {
  const s = createGameState();
  loadLevel(s, 42);
  s.mode = 'playing';
  return s;
}
function corridor() {
  const s = session();
  s.maze = [[1, 1, 1, 1, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 1]];
  s.fox = actor(1, 1);
  s.cats = [];
  s.wisps = [];
  s.field = distances(s.maze, 1, 1);
  return s;
}

test('seeded levels preserve pre-refactor layouts and placements', () => {
  // Captured from the original world.js before its removal.
  const fixtures = [
    [0, 1, '2ae95f7bf9c9738490aef9b266421cc496ebee7b413c3c95b73408f2fbd3c085'],
    [1, 5, '5b3a2a8d71f968e5058c87ee36a85820172b5ab949f79d7e48e7b633048135c8'],
    [42, 12, '8437a65b2281bb013ea34bc304e9c5e1bdc409d7a1ca32500933c184417b9e76'],
    [4294967295, 5, '332c4e30a928ef342d5d7a4695609566a4a543eb013040cb7dc195cfd1597577'],
  ];
  for (const [seed, level, expected] of fixtures) {
    assert.equal(createHash('sha256').update(JSON.stringify(createLevel(seed, level))).digest('hex'), expected);
  }
});

test('variable square and rectangular mazes have reachable exits and objects', () => {
  for (const [width, height] of [[7, 7], [19, 19], [25, 31], [31, 21]]) {
    for (let seed = 0; seed < 20; seed++) {
      const level = createLevel(seed, 5, { ...getLevelPlan(5), width, height });
      assert.equal(level.maze.length, height);
      assert.ok(level.maze.every(row => row.length === width));
      const field = distances(level.maze, 1, 1);
      for (const p of [level.exitCell, ...level.wisps, ...level.cats]) {
        assert.ok(walk(level.maze, p.x, p.y));
        assert.ok(field[p.y][p.x] > 0);
      }
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        if (walk(level.maze, x, y)) assert.ok(field[y][x] >= 0);
      }
      assert.equal(field[level.exitCell.y][level.exitCell.x], Math.max(...field.flat()));
    }
  }
});

test('invalid dimensions are rejected', () => {
  assert.throws(() => createLevel(0, 1, { ...getLevelPlan(), width: 20 }), RangeError);
});

test('movement rejects walls and interpolates to the target cell', () => {
  const s = corridor();
  assert.equal(beginStep(s.maze, s.fox, 0), false);
  assert.equal(beginStep(s.maze, s.fox, 1), true);
  advance(s.fox, 0.25, 2);
  assert.equal(s.fox.x, 1.5);
  advance(s.fox, 1, 2);
  assert.equal(s.fox.x, 2);
  assert.equal(s.fox.t, 1);
});

test('a blocked buffered turn falls back to an older held direction', () => {
  const s = corridor();
  const input = { pressed: ['KeyD', 'KeyW'], buffered: 0 };
  updateMovement(s, input, 0.1, feedback);
  assert.equal(s.fox.toX, 2);
  assert.equal(input.buffered, 0);
});

test('dash respects pause and cooldown', () => {
  const s = corridor();
  s.mode = 'paused';
  doDash(s, feedback);
  assert.equal(s.dash, 0);
  s.mode = 'playing';
  doDash(s, feedback);
  assert.equal(s.dash, 0.42);
  s.dash = 0;
  doDash(s, feedback);
  assert.equal(s.dash, 0);
});

test('pickups refresh effects once and every third lifetime gem heals', () => {
  const s = corridor();
  s.run.lives = 2;
  s.run.totalGems = 2;
  s.wisps = [{ x: 1, y: 1, kind: 'laser', got: false }];
  updatePickups(s, feedback);
  assert.equal(s.laserTime, 8);
  assert.equal(s.run.lives, 3);
  updatePickups(s, feedback);
  assert.equal(s.run.totalGems, 3);
  s.wisps.push({ x: 1, y: 1, kind: 'speed', got: false });
  updatePickups(s, feedback);
  assert.equal(s.hasteTime, 6);
  assert.equal(s.laserTime, 8);
});

test('walls block lasers, and the nearest visible enemy is hit', () => {
  const s = corridor();
  s.laserTime = 8;
  s.cats = [{ ...actor(3, 1), phase: 0 }, { ...actor(2, 1), phase: 1 }];
  assert.equal(laserSight(s.maze, 1, 1, 3, 1), true);
  shootLaser(s, feedback);
  assert.equal(s.cats[1].dead, true);
  assert.equal(s.cats[0].dead, undefined);
  s.maze[1][2] = 1;
  s.laserCooldown = 0;
  assert.equal(laserSight(s.maze, 1, 1, 3, 1), false);
  shootLaser(s, feedback);
  assert.equal(s.cats[0].dead, undefined);
});

test('cats wake after four seconds; hits reset positions without reviving dead cats', () => {
  const s = corridor();
  s.cats = [{ ...actor(1, 1), homeX: 3, homeY: 1 }, { ...actor(2, 1), homeX: 2, homeY: 1, dead: true }];
  s.elapsed = 4;
  updateEnemies(s, 0, feedback);
  assert.equal(s.run.lives, 3);
  s.elapsed = 4.1;
  updateEnemies(s, 0, feedback);
  assert.equal(s.run.lives, 2);
  assert.equal(s.cats[0].x, 3);
  assert.equal(s.cats[1].dead, true);
  s.cats[0] = { ...s.cats[0], ...actor(1, 1) };
  updateEnemies(s, 0, feedback);
  assert.equal(s.run.lives, 2);
  s.invuln = 0;
  s.run.lives = 1;
  updateEnemies(s, 0, feedback);
  assert.equal(s.mode, 'lost');
});

test('level transitions preserve run progress and reset temporary effects', () => {
  const s = session();
  s.run.lives = 1;
  s.run.totalGems = 5;
  s.laserTime = 8;
  loadLevel(s, 10, 2);
  assert.deepEqual(s.run, { level: 2, lives: 1, totalGems: 5 });
  assert.equal(s.laserTime, 0);
  assert.equal(s.cats.length, 4);
  loadLevel(s, 11, 1);
  assert.deepEqual(s.run, { level: 1, lives: 3, totalGems: 0 });
  assert.notEqual(s.cats, session().cats);
});

test('scene pause freezes gameplay and exit advances the level', () => {
  const hud = Object.fromEntries(['toast', 'modal', 'sync', 'showPlaying', 'showPaused', 'update'].map(name => [name, noop]));
  const scene = createPlayScene({ renderer: {}, hud, audio, input: createInput() });
  scene.enter();
  scene.newRun();
  scene.update(0.01);
  scene.pause();
  const elapsed = scene.state.elapsed;
  scene.update(1);
  assert.equal(scene.state.elapsed, elapsed);
  scene.start();
  scene.state.fox = actor(scene.state.exitCell.x, scene.state.exitCell.y);
  scene.update(0);
  assert.equal(scene.state.run.level, 2);
  scene.dispose();
});

test('rendering supports desktop, mobile, and rectangular levels with finite coordinates', () => {
  for (const [width, height] of [[19, 19], [25, 31]]) for (const [screenW, screenH] of [[1280, 800], [390, 844]]) {
    const s = session();
    Object.assign(s, createLevel(42, 1, { ...getLevelPlan(), width, height }));
    s.laserTime = 4;
    s.beams = [{ x: 3, y: 3, phase: 0, life: 0.1 }];
    const renderer = Object.create(Renderer.prototype);
    renderer.viewport = new Viewport();
    renderer.resize(screenW, screenH);
    let calls = 0;
    renderer.scene = new Proxy({}, { get: () => (...args) => {
      calls++;
      for (const number of args.flat(Infinity).filter(value => typeof value === 'number')) assert.ok(Number.isFinite(number));
      return renderer.scene;
    } });
    const { gateTop } = renderer.render(s);
    assert.ok(calls > 100);
    assert.ok(gateTop.every(Number.isFinite));
    assert.equal(renderer.viewport.width, width);
    assert.equal(renderer.viewport.height, height);
    const center = renderer.viewport.iso((width - 1) / 2, (height - 1) / 2);
    assert.deepEqual(center, [renderer.viewport.cx, renderer.viewport.cy]);
  }
});
