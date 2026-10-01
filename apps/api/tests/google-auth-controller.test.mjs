import assert from 'node:assert/strict';
import test from 'node:test';
import { GoogleAuthController } from '../dist/auth/google-auth.controller.js';
import { GoogleAuthService } from '../dist/auth/google-auth.service.js';

test('inicia Google e conclui callback somente com state do mesmo navegador', async () => {
  const previous = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
  };
  process.env.GOOGLE_CLIENT_ID = 'test-client';
  process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
  process.env.GOOGLE_REDIRECT_URI =
    'http://localhost:5173/api/auth/google/callback';
  let attempt;
  let exchanged;
  const prisma = {
    googleAuthAttempt: {
      async create({ data }) {
        attempt = data;
      },
      async findUnique({ where }) {
        return where.stateHash === attempt?.stateHash ? attempt : null;
      },
      async deleteMany({ where }) {
        if (where.expiresAt?.lte) {
          if (!attempt || attempt.expiresAt > where.expiresAt.lte)
            return { count: 0 };
          attempt = null;
          return { count: 1 };
        }
        if (where.stateHash !== attempt?.stateHash) return { count: 0 };
        attempt = null;
        return { count: 1 };
      },
    },
  };
  const attempts = new GoogleAuthService(prisma);
  const tokens = {
    async exchangeCode(code, verifier) {
      if (code === 'bad-code') throw new Error('Token exchange failed.');
      exchanged = { code, verifier };
      return 'signed-id-token';
    },
    async verifyIdToken(token, nonce) {
      assert.equal(token, 'signed-id-token');
      assert.ok(nonce);
      return { sub: 'google-sub', email: 'user@example.com' };
    },
  };
  const accounts = {
    async login(identity) {
      assert.equal(identity.sub, 'google-sub');
      return { token: 'session-token' };
    },
  };
  const controller = new GoogleAuthController(attempts, tokens, accounts);
  function response() {
    const headers = new Map();
    return {
      headers,
      getHeader(name) {
        return headers.get(name);
      },
      setHeader(name, value) {
        headers.set(name, value);
      },
      redirect(status, url) {
        this.redirected = { status, url };
      },
    };
  }

  try {
    assert.deepEqual(controller.availability(), { enabled: true });
    const start = response();
    await controller.start(start);
    assert.equal(start.redirected.status, 302);
    const authorizationUrl = new URL(start.redirected.url);
    const state = authorizationUrl.searchParams.get('state');
    assert.ok(state);
    assert.match(start.headers.get('Set-Cookie')[0], /SameSite=Lax/);
    assert.equal(start.headers.get('Cache-Control'), 'no-store');
    assert.equal(start.headers.get('Referrer-Policy'), 'no-referrer');

    const bad = response();
    await controller.callback(
      { iss: 'https://accounts.google.com', state, code: 'auth-code' },
      { headers: { cookie: `portal_google_state=${'b'.repeat(43)}` } },
      bad,
    );
    assert.equal(bad.redirected.url, '/login?google=failed');
    assert.equal(exchanged, undefined);
    assert.ok(attempt);
    assert.match(bad.headers.get('Set-Cookie')[0], /Max-Age=0/);

    const callback = response();
    await controller.callback(
      { iss: 'https://accounts.google.com', state, code: 'auth-code' },
      { headers: { cookie: `portal_google_state=${state}` } },
      callback,
    );
    assert.equal(callback.redirected.url, '/');
    assert.equal(callback.redirected.status, 302);
    assert.equal(callback.headers.get('Cache-Control'), 'no-store');
    assert.equal(exchanged.code, 'auth-code');
    assert.ok(exchanged.verifier);
    assert.equal(callback.headers.get('Set-Cookie').length, 2);
    assert.match(callback.headers.get('Set-Cookie')[0], /portal_session=/);
    assert.match(callback.headers.get('Set-Cookie')[1], /Max-Age=0/);
    assert.equal(attempt, null);

    const cancelledStart = response();
    await controller.start(cancelledStart);
    const cancelledState = new URL(
      cancelledStart.redirected.url,
    ).searchParams.get('state');
    const cancelled = response();
    await controller.callback(
      {
        iss: 'https://accounts.google.com',
        state: cancelledState,
        error: 'access_denied',
      },
      { headers: { cookie: `portal_google_state=${cancelledState}` } },
      cancelled,
    );
    assert.equal(cancelled.redirected.url, '/login?google=cancelled');
    assert.match(cancelled.headers.get('Set-Cookie')[0], /Max-Age=0/);
    assert.equal(attempt, null);

    const failedStart = response();
    await controller.start(failedStart);
    const failedState = new URL(failedStart.redirected.url).searchParams.get(
      'state',
    );
    const failed = response();
    await controller.callback(
      {
        iss: 'https://accounts.google.com',
        state: failedState,
        code: 'bad-code',
      },
      { headers: { cookie: `portal_google_state=${failedState}` } },
      failed,
    );
    assert.equal(failed.redirected.url, '/login?google=failed');
    assert.match(failed.headers.get('Set-Cookie')[0], /Max-Age=0/);
    assert.equal(failed.headers.get('Set-Cookie').length, 1);
  } finally {
    for (const [key, value] of [
      ['GOOGLE_CLIENT_ID', previous.clientId],
      ['GOOGLE_CLIENT_SECRET', previous.clientSecret],
      ['GOOGLE_REDIRECT_URI', previous.redirectUri],
    ]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
