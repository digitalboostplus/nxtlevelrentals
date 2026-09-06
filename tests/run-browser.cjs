const { spawn, spawnSync } = require('node:child_process');
const project = 'demo-nlr-integrity';
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST || !process.env.FIREBASE_STORAGE_EMULATOR_HOST) throw new Error('All Firebase emulators are required');
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1', NLR_TEST_SERVER: 'true', NEXT_PUBLIC_USE_EMULATORS: 'true', NEXT_PUBLIC_USE_MOCK: 'false',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: project, GCLOUD_PROJECT: project, GOOGLE_CLOUD_PROJECT: project,
  NEXT_PUBLIC_FIREBASE_API_KEY: 'demo-test-key', NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${project}.firebaseapp.com`,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: `${project}.appspot.com`, NEXT_PUBLIC_FIREBASE_APP_ID: 'demo-app',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456', NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: '',
  GOOGLE_APPLICATION_CREDENTIALS: '', FIREBASE_CLIENT_EMAIL: '', FIREBASE_PRIVATE_KEY: '',
  GHL_API_KEY: '', GHL_ACCESS_TOKEN: '', GHL_LOCATION_ID: '', GEMINI_API_KEY: '', OPERATIONS_CRON_SECRET: '',
  NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:4100' };
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-p', '4100', '-H', '127.0.0.1'], { env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
const fs = require('node:fs'); fs.mkdirSync('.agent-artifacts', { recursive: true });
const log = fs.createWriteStream('.agent-artifacts/browser-server.log'); server.stdout.pipe(log); server.stderr.pipe(log);
(async () => {
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) {
      if (server.exitCode !== null) throw new Error('Browser test server exited');
      try { const response = await fetch('http://127.0.0.1:4100/login/', { signal: AbortSignal.timeout(5000) }); if (response.ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (!ready) throw new Error('Browser test server did not become ready');
    const test = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test'], { env, stdio: 'inherit', windowsHide: true });
    process.exitCode = await new Promise(resolve => test.on('exit', code => resolve(code ?? 1)));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); else server.kill('SIGTERM'); log.end(); }
})();
