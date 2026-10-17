const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');

const BASE_URL = 'http://127.0.0.1:3107';
let server;

before(async () => {
  server = spawn(process.execPath, ['src/app.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: '3107',
      UNLEASH_API_TOKEN: ''
    },
    stdio: 'ignore'
  });

  const deadline = Date.now() + 10000;

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Application exited with code ${server.exitCode}`);
    }

    try {
      const response = await fetch(`${BASE_URL}/health`);
      if (response.ok) return;
    } catch {}

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error('Application did not start within 10 seconds');
});

after(async () => {
  if (server && server.exitCode === null) {
    const exited = new Promise(resolve => server.once('exit', resolve));
    server.kill();
    await Promise.race([
      exited,
      new Promise(resolve => setTimeout(resolve, 3000))
    ]);
  }
});

test('home page displays the disabled feature flag', async () => {
  const response = await fetch(`${BASE_URL}/`);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Feature Flag \[new-dashboard\]: DISABLED \(OFF\)/);
});

test('dashboard returns 403 when the flag is disabled', async () => {
  const response = await fetch(`${BASE_URL}/dashboard`);
  const html = await response.text();

  assert.equal(response.status, 403);
  assert.match(html, /new-dashboard/);
});

test('health endpoint returns a healthy status', async () => {
  const response = await fetch(`${BASE_URL}/health`);
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.status, 'ok');
  assert.equal(data.unleash.ready, false);
  assert.equal(data.unleash.flag, false);
});

test('feature API reports the flag as disabled', async () => {
  const response = await fetch(`${BASE_URL}/api/features`);
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(data, { 'new-dashboard': false });
});
