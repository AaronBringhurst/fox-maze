import { Renderer } from './rendering/Renderer.js';
import { SoundManager } from './core/audio.js';
import { createInput } from './core/input.js';
import { createHud } from './ui/hud.js';
import { createPlayScene } from './scenes/PlayScene.js';
import './ui/styles.css';

async function main() {
  const canvas = document.getElementById('game');
  const renderer = new Renderer();
  const hud = createHud();
  const audio = new SoundManager();
  const input = createInput();
  try {
    await renderer.init(canvas);
  } catch (error) {
    hud.fail('WebGL/WebGPU is unavailable. Enable hardware acceleration in your browser, then reload this page.');
    throw error;
  }
  const scene = createPlayScene({ renderer, hud, audio, input });
  scene.enter();
  const unbindHud = hud.bind(scene);
  const unbindInput = input.bind({ isPlaying: () => scene.state.mode === 'playing', dash: scene.dash, pause: scene.pause });
  const resize = () => renderer.resize(innerWidth, innerHeight);
  const contextLost = e => {
    e.preventDefault();
    if (scene.state.mode === 'playing') scene.pause();
    hud.fail('The graphics context was interrupted. Reload this page to start a fresh game.');
  };
  const tick = ticker => {
    scene.update(Math.min(ticker.deltaMS / 1000, 0.04));
    scene.render();
  };
  window.addEventListener('resize', resize);
  canvas.addEventListener('webglcontextlost', contextLost);
  resize();
  renderer.app.ticker.add(tick);
  if (import.meta.hot) import.meta.hot.dispose(() => {
    renderer.app.ticker.remove(tick);
    unbindHud();
    unbindInput();
    window.removeEventListener('resize', resize);
    canvas.removeEventListener('webglcontextlost', contextLost);
    scene.dispose();
    renderer.app.destroy(false);
  });
}
main();
