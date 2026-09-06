import { balance } from '../config/balance.js';
import { LASER_DURATION, HASTE_DURATION } from '../content/pickups.js';

export function createHud(doc = document) {
  const $ = id => doc.getElementById(id);
  let toastTimer = 0;
  function sync(s) {
    $('seed').textContent = 'GROVE / ' + s.seed.toString(16).padStart(8, '0').toUpperCase();
    $('levelInfo').textContent = 'LEVEL ' + s.run.level + ' · ' + s.cats.length + ' GHOST CATS';
    $('gateStatus').textContent = 'ENTER FOR LEVEL ' + (s.run.level + 1);
    $('gateLabel').classList.add('open');
    $('gateLabel').style.opacity = s.gateLabelTimer > 0 ? '1' : '0';
    $('wisps').textContent = s.run.totalGems;
    $('lives').textContent = Array.from({ length: balance.maxLives }, (_, i) => i < s.run.lives ? '♥' : '♡').join(' ');
    $('time').textContent = String(Math.floor(s.elapsed / 60)).padStart(2, '0') + ':' + String(Math.floor(s.elapsed % 60)).padStart(2, '0');
    $('energy').style.width = (1 - s.cooldown / balance.dashCooldown) * 100 + '%';
    $('dashText').textContent = s.cooldown > 0 ? s.cooldown.toFixed(1) + 's' : 'READY';
    $('dashMeter').classList[s.cooldown <= 0 ? 'add' : 'remove']('ready');
    $('laserEnergy').style.width = (s.laserTime / LASER_DURATION) * 100 + '%';
    $('laserText').textContent = s.laserTime > 0 ? s.laserTime.toFixed(1) + 's' : s.collected === 3 ? 'EMPTY' : 'GET A GEM';
    $('laserMeter').classList[s.laserTime > 0 ? 'add' : 'remove']('active');
    $('hasteEnergy').style.width = (s.hasteTime / HASTE_DURATION) * 100 + '%';
    $('hasteText').textContent = s.hasteTime > 0 ? s.hasteTime.toFixed(1) + 's' : '';
    $('hasteMeter').classList[s.hasteTime > 0 ? 'add' : 'remove']('active');
  }
  function toast(text) {
    $('toast').textContent = text;
    $('toast').style.opacity = '1';
    toastTimer = 3;
  }
  function modal(s, tag, title, text, buttonLabel) {
    $('cardTag').textContent = tag;
    $('cardTitle').textContent = title;
    $('cardText').textContent = text;
    $('play').textContent = buttonLabel;
    $('cardHint').textContent = s.mode === 'paused' ? 'P or Escape to resume' : 'Every new grove is a new maze.';
    $('veil').classList.remove('hidden');
  }
  function fail(message) {
    $('error').style.display = 'block';
    $('error').textContent = message;
    $('veil').classList.add('hidden');
  }
  function positionGateLabel(gateTop, W) {
    if (!gateTop) return;
    const label = $('gateLabel');
    label.style.left = Math.max(88, Math.min(W - 88, gateTop[0])) + 'px';
    label.style.top = Math.max(190, gateTop[1] - 7) + 'px';
  }
  function update(dt) {
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) $('toast').style.opacity = '0';
    }
  }
  function showPlaying() { $('veil').classList.add('hidden'); $('pause').textContent = 'Pause'; }
  function showPaused() { $('pause').textContent = 'Resume'; }
  function bind({ start, pause, newRun }) {
    const bindings = [['play', start], ['pause', pause], ['new', newRun]];
    bindings.forEach(([id, handler]) => $(id).addEventListener('click', handler));
    return () => bindings.forEach(([id, handler]) => $(id).removeEventListener('click', handler));
  }
  return { sync, toast, modal, fail, positionGateLabel, update, showPlaying, showPaused, bind };
}
