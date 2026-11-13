import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 3167;
const origin = 'http://127.0.0.1:' + port;
const child = spawn(process.execPath, [
  join(root, 'node_modules', 'next', 'dist', 'bin', 'next'),
  'start', '--hostname', '127.0.0.1', '--port', String(port),
], {
  cwd: root,
  env: {
    ...process.env,
    DRAWING_SSO_ENABLED: 'true',
    DRAWING_SSO_ORIGIN: origin,
    DRAWING_SUPABASE_URL: 'https://example.supabase.co',
    DRAWING_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_ci_placeholder',
    DRAWING_SSO_CLIENT_ID: 'drawing-chat-ci-client',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverOutput = '';
for (const stream of [child.stdout, child.stderr]) {
  stream.setEncoding('utf8');
  stream.on('data', chunk => { serverOutput += chunk; });
}

async function get(url, options = {}) {
  return fetch(origin + url, { redirect: 'manual', ...options });
}

async function waitForServer() {
  for (let count = 0; count < 100; count++) {
    if (child.exitCode !== null) throw new Error('Next.js exited before tests\n' + serverOutput);
    try {
      const response = await get('/api/drawing-id/start');
      if (response.status >= 200 && response.status < 500) return response;
    } catch {
      // The HTTP server has not started yet.
    }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error('Next.js did not start\n' + serverOutput);
}

try {
  const start = await waitForServer();
  assert.equal(start.status, 307, 'login start must redirect');
  const location = new URL(start.headers.get('location'));
  assert.equal(location.origin, 'https://example.supabase.co');
  assert.equal(location.pathname, '/auth/v1/oauth/authorize');
  assert.equal(location.searchParams.get('response_type'), 'code');
  assert.equal(location.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(location.searchParams.get('redirect_uri'), origin + '/api/drawing-id/callback');
  assert.ok((location.searchParams.get('state') ?? '').length >= 43);
  assert.ok((location.searchParams.get('code_challenge') ?? '').length >= 43);

  const cookies = start.headers.getSetCookie().join('\n');
  assert.match(cookies, /drawing_chat_sso_state=/);
  assert.match(cookies, /drawing_chat_sso_verifier=/);
  assert.match(cookies, /HttpOnly/i);

  // Invalid callbacks must fail BEFORE any token exchange or network request.
  const callback = await get('/api/drawing-id/callback?code=invalid&state=wrong');
  assert.equal(callback.status, 307);
  assert.equal(new URL(callback.headers.get('location')).pathname, '/');
  assert.equal(new URL(callback.headers.get('location')).searchParams.get('drawing_id'), 'failed');

  // Logout is a protected POST operation and rejects other origins.
  const denied = await get('/api/drawing-id/logout', {
    method: 'POST',
    headers: { Origin: 'https://malicious.example' },
  });
  assert.equal(denied.status, 403);

  console.log('Drawing ID OAuth smoke tests passed (dummy client, no external auth calls).');
} finally {
  child.kill('SIGTERM');
}
