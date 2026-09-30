import fs from 'node:fs';
import path from 'node:path';
import { moonPng } from './png.js';

const outDir = path.resolve('assets');
fs.mkdirSync(outDir, { recursive: true });

function chimeWav() {
  const rate = 44100;
  const notes = [{ f: 659.25, start: 0, len: 0.9 }, { f: 880, start: 0.22, len: 1.1 }];
  const total = Math.floor(rate * 1.4);
  const samples = new Int16Array(total);
  for (const n of notes) {
    for (let i = 0; i < n.len * rate; i++) {
      const idx = Math.floor(n.start * rate) + i;
      if (idx >= total) break;
      const t = i / rate;
      const env = Math.min(1, t / 0.01) * Math.exp(-3.2 * t);
      samples[idx] += Math.round(Math.sin(2 * Math.PI * n.f * t) * env * 9000);
    }
  }
  const data = Buffer.from(samples.buffer);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

fs.writeFileSync(path.join(outDir, 'chime.wav'), chimeWav());
fs.writeFileSync(path.join(outDir, 'tray.png'), moonPng(32));
fs.mkdirSync('build', { recursive: true });
fs.writeFileSync(path.join('build', 'icon.png'), moonPng(512));
console.log('assets generated');
