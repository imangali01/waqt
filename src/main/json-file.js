import fs from 'node:fs';
import path from 'node:path';

export function createJsonFile(filePath) {
  function read(defaults) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      if (e.code === 'ENOENT') return defaults;
      try { fs.renameSync(filePath, `${filePath}.corrupt-${Date.now()}`); } catch { /* ignore */ }
      return defaults;
    }
  }
  function write(data) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, filePath);
  }
  return { read, write };
}
