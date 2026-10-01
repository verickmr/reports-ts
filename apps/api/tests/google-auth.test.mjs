import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { GoogleAuthService } from '../dist/auth/google-auth.service.js';

test('prepara tentativa Google com state persistido e PKCE S256', async () => {
  const previousClientId = process.env.GOOGLE_CLIENT_ID;
  const previousRedirectUri = process.env.GOOGLE_REDIRECT_URI;
  process.env.GOOGLE_CLIENT_ID = 'test-client-id';
  process.env.GOOGLE_REDIRECT_URI =
    'http://127.0.0.1:3000/api/auth/google/callback';
  const attempts = [];
  const prisma = {
    googleAuthAttempt: {
      async create({ data }) {
        attempts.push(data);
      },
    },
  };

  try {
    const { authorizationUrl, state } = await new GoogleAuthService(
      prisma,
    ).beginLogin();
    const url = new URL(authorizationUrl);
    const attempt = attempts[0];

    assert.equal(attempts.length, 1);
    assert.equal(url.origin, 'https://accounts.google.com');
    assert.equal(url.pathname, '/o/oauth2/v2/auth');
    assert.equal(url.searchParams.get('client_id'), 'test-client-id');
    assert.equal(url.searchParams.get('response_type'), 'code');
    assert.equal(url.searchParams.get('scope'), 'openid email');
    assert.equal(url.searchParams.get('state'), state);
    assert.equal(url.searchParams.get('nonce'), attempt.nonce);
    assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
    assert.equal(
      url.searchParams.get('code_challenge'),
      createHash('sha256')
        .update(attempt.codeVerifier, 'ascii')
        .digest('base64url'),
    );
    assert.equal(
      attempt.stateHash,
      createHash('sha256').update(state, 'ascii').digest('hex'),
    );
    assert.equal(attempt.purpose, 'LOGIN');
    assert.ok(attempt.expiresAt.getTime() > Date.now());
    assert.ok(attempt.expiresAt.getTime() <= Date.now() + 5 * 60 * 1000);
    assert.ok(!authorizationUrl.includes(attempt.codeVerifier));
  } finally {
    if (previousClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = previousClientId;
    if (previousRedirectUri === undefined)
      delete process.env.GOOGLE_REDIRECT_URI;
    else process.env.GOOGLE_REDIRECT_URI = previousRedirectUri;
  }
});

test('recusa redirect HTTP remoto sem salvar tentativa', async () => {
  const previousClientId = process.env.GOOGLE_CLIENT_ID;
  const previousRedirectUri = process.env.GOOGLE_REDIRECT_URI;
  process.env.GOOGLE_CLIENT_ID = 'test-client-id';
  process.env.GOOGLE_REDIRECT_URI =
    'http://example.com/api/auth/google/callback';
  let saved = false;
  const prisma = {
    googleAuthAttempt: {
      async create() {
        saved = true;
      },
    },
  };

  try {
    await assert.rejects(() => new GoogleAuthService(prisma).beginLogin(), {
      message: 'GOOGLE_REDIRECT_URI inválida.',
    });
    assert.equal(saved, false);
  } finally {
    if (previousClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = previousClientId;
    if (previousRedirectUri === undefined)
      delete process.env.GOOGLE_REDIRECT_URI;
    else process.env.GOOGLE_REDIRECT_URI = previousRedirectUri;
  }
});
