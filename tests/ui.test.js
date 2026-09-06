import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createInput } from '../src/core/input.js';
import { createHud } from '../src/ui/hud.js';
import { createGameState, loadLevel } from '../src/state/gameState.js';

function surface() {
  const doc = new EventTarget();
  const win = new EventTarget();
  const elements = new Map();
  const markup = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const [, id] of markup.matchAll(/\bid="([^"]+)"/g)) {
    const element = new EventTarget();
    const classes = new Set();
    Object.assign(element, { style: {}, textContent: '', classList: {
      add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name),
    } });
    elements.set(id, element);
  }
  doc.getElementById = id => {
    assert.ok(elements.has(id), `Missing markup element: ${id}`);
    return elements.get(id);
  };
  const button = new EventTarget();
  button.dataset = { key: 'KeyD' };
  button.setPointerCapture = () => {};
  doc.querySelectorAll = () => [button];
  return { doc, win, elements, button };
}
const send = (target, type, fields = {}) => target.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), fields));

test('keyboard, touch, blur, and cleanup route through the same input state', () => {
  const { doc, win, button } = surface();
  const input = createInput();
  let playing = true, dashes = 0, pauses = 0;
  const unbind = input.bind({ isPlaying: () => playing, dash: () => dashes++, pause: () => pauses++ }, win, doc);
  send(win, 'keydown', { code: 'KeyD' });
  send(win, 'keydown', { code: 'KeyW' });
  assert.deepEqual(input.pressed, ['KeyD', 'KeyW']);
  assert.equal(input.buffered, 0);
  send(win, 'keyup', { code: 'KeyW' });
  assert.deepEqual(input.pressed, ['KeyD']);
  send(win, 'keydown', { code: 'Space', repeat: true });
  assert.equal(dashes, 0);
  send(win, 'keydown', { code: 'Space' });
  assert.equal(dashes, 1);
  send(win, 'blur');
  assert.equal(pauses, 1);
  assert.deepEqual(input.pressed, []);
  send(button, 'pointerdown', { pointerId: 1 });
  assert.deepEqual(input.pressed, ['KeyD']);
  send(button, 'pointercancel');
  assert.deepEqual(input.pressed, []);
  playing = false;
  send(win, 'keydown', { code: 'KeyW' });
  assert.deepEqual(input.pressed, []);
  playing = true;
  unbind();
  send(win, 'keydown', { code: 'KeyD' });
  send(button, 'pointerdown', { pointerId: 1 });
  assert.deepEqual(input.pressed, []);
});

test('HUD uses existing markup, displays run state, expires toasts, and unbinds controls', () => {
  const { doc, elements } = surface();
  const hud = createHud(doc);
  const s = createGameState();
  loadLevel(s, 42);
  s.run.totalGems = 5;
  s.run.lives = 2;
  hud.sync(s);
  assert.equal(elements.get('wisps').textContent, 5);
  assert.equal(elements.get('lives').textContent, '♥ ♥ ♡');
  assert.equal(elements.get('seed').textContent, 'GROVE / 0000002A');
  hud.toast('A new grove');
  hud.update(3.1);
  assert.equal(elements.get('toast').style.opacity, '0');
  s.mode = 'paused';
  hud.modal(s, 'Pause', 'Paused', 'Safe', 'Resume');
  assert.equal(elements.get('cardHint').textContent, 'P or Escape to resume');
  hud.showPlaying();
  assert.ok(elements.get('veil').classList.contains('hidden'));
  let starts = 0;
  const unbind = hud.bind({ start: () => starts++, pause: () => {}, newRun: () => {} });
  send(elements.get('play'), 'click');
  assert.equal(starts, 1);
  unbind();
  send(elements.get('play'), 'click');
  assert.equal(starts, 1);
});
