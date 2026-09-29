import { spawn } from 'node:child_process';
import electron from 'electron';

// В терминале VS Code выставлен ELECTRON_RUN_AS_NODE=1: без сброса Electron стартует как обычный Node.
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electron, ['.'], { stdio: 'inherit', env });
child.on('exit', (code) => process.exit(code ?? 0));
