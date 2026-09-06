import { keyDirs } from '../config/constants.js';

export function createInput() {
  const input = { pressed: [], buffered: null };
  input.clear = () => { input.pressed = []; input.buffered = null; };
  input.bind = ({ isPlaying, dash, pause }, win = window, doc = document) => {
    const cleanups = [];
    const listen = (target, type, handler) => {
      target.addEventListener(type, handler);
      cleanups.push(() => target.removeEventListener(type, handler));
    };
    const down = code => {
      if (keyDirs[code] === undefined || !isPlaying()) return;
      input.pressed = input.pressed.filter(k => k !== code);
      input.pressed.push(code);
      input.buffered = keyDirs[code];
    };
    const up = code => { input.pressed = input.pressed.filter(k => k !== code); };
    listen(win, 'keydown', e => {
      if (keyDirs[e.code] === undefined && !['Space', 'KeyP', 'Escape'].includes(e.code)) return;
      e.preventDefault();
      if (e.repeat) return;
      if (e.code === 'Space') dash();
      else if (e.code === 'KeyP' || e.code === 'Escape') pause();
      else down(e.code);
    });
    listen(win, 'keyup', e => up(e.code));
    listen(win, 'blur', () => { input.clear(); if (isPlaying()) pause(); });
    listen(doc, 'visibilitychange', () => { if (doc.hidden && isPlaying()) pause(); });
    doc.querySelectorAll('[data-key]').forEach(button => {
      listen(button, 'pointerdown', e => { e.preventDefault(); button.setPointerCapture(e.pointerId); down(button.dataset.key); });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(button, type, () => up(button.dataset.key));
    });
    listen(doc.getElementById('touchDash'), 'pointerdown', e => { e.preventDefault(); dash(); });
    return () => { cleanups.forEach(cleanup => cleanup()); input.clear(); };
  };
  return input;
}
