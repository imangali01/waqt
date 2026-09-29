import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

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

function crc32(buf) {
  let c;
  let crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function trayPng(size = 32) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - size / 2;
      const dy = y + 0.5 - size / 2;
      const inside = dx * dx + dy * dy <= (size / 2 - 1) ** 2;
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = 0x2b; raw[o + 1] = 0xa3; raw[o + 2] = 0x6b; raw[o + 3] = inside ? 255 : 0;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

fs.writeFileSync(path.join(outDir, 'chime.wav'), chimeWav());
fs.writeFileSync(path.join(outDir, 'tray.png'), trayPng());
fs.mkdirSync('build', { recursive: true });
fs.writeFileSync(path.join('build', 'icon.png'), trayPng(256));
console.log('assets generated');
