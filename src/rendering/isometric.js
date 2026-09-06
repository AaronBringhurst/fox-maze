import { balance } from '../config/balance.js';

export class Viewport {
  constructor(width = balance.mazeSize, height = width) {
    this.width = width;
    this.height = height;
    this.unit = 24;
    this.cx = 0;
    this.cy = 0;
    this.W = 0;
    this.H = 0;
  }

  iso(x, y, z = 0) {
    return [this.cx + (x - y - (this.width - this.height) / 2) * this.unit, this.cy + (x + y - ((this.width + this.height) / 2 - 1)) * this.unit * 0.5 - z * this.unit];
  }

  resize(w, h) {
    this.W = w; this.H = h;
    this.unit = Math.max(5, Math.min((w - 36) / (this.width + this.height + 1), (h - 235) / ((this.width + this.height) / 2 + 2)));
    this.cx = w / 2;
    this.cy = (h + 80) / 2;
  }
}
