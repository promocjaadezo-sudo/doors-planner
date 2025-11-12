'use strict';

const { spawn } = require('node:child_process');

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });

    child.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

(async () => {
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  console.log('[prepush] Uruchamiam lint...');
  await runCommand(npmCmd, ['run', 'lint']);

  console.log('[prepush] Uruchamiam smoke testy Playwright...');
  await runCommand(npxCmd, ['playwright', 'test', '--grep', '@smoke']);

  console.log('[prepush] Wszystkie pre-push checki zakończone sukcesem.');
})().catch(error => {
  console.error('\n[prepush] Pre-push checki nie powiodły się.');
  console.error(error.message || error);
  process.exit(1);
});
