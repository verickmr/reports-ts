import assert from 'node:assert/strict';
import test from 'node:test';
import { GoogleTokenService } from '../dist/auth/google-token.service.js';

function withGoogleConfig(run) {
  const previous = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
    fetch: globalThis.fetch,
  };
  process.env.GOOGLE_CLIENT_ID = 'test-client';
  process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
  process.env.GOOGLE_REDIRECT_URI =
    'http://127.0.0.1:3000/api/auth/google/callback';
  return Promise.resolve()
    .then(run)
    .finally(() => {
      for (const [key, value] of [
        ['GOOGLE_CLIENT_ID', previous.clientId],
        ['GOOGLE_CLIENT_SECRET', previous.clientSecret],
        ['GOOGLE_REDIRECT_URI', previous.redirectUri],
      ]) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      globalThis.fetch = previous.fetch;
    });
}

test('troca código com PKCE e não inclui segredo na URL', async () => {
  await withGoogleConfig(async () => {
    let request;
    globalThis.fetch = async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ id_token: 'signed-id-token' }), {
        status: 200,
      });
    };

    const idToken = await new GoogleTokenService().exchangeCode(
      'one-time-code',
      'a'.repeat(43),
    );
    const body = new URLSearchParams(request.options.body);
    assert.equal(idToken, 'signed-id-token');
    assert.equal(request.url, 'https://oauth2.googleapis.com/token');
    assert.equal(request.options.method, 'POST');
    assert.equal(request.options.redirect, 'error');
    assert.equal(body.get('code'), 'one-time-code');
    assert.equal(body.get('code_verifier'), 'a'.repeat(43));
    assert.equal(body.get('client_id'), 'test-client');
    assert.equal(body.get('client_secret'), 'test-secret');
    assert.equal(body.get('grant_type'), 'authorization_code');
    assert.equal(
      body.get('redirect_uri'),
      'http://127.0.0.1:3000/api/auth/google/callback',
    );
    assert.ok(!request.url.includes('test-secret'));
  });
});

test('rejeita código recusado e resposta sem ID token', async () => {
  await withGoogleConfig(async () => {
    globalThis.fetch = async () => new Response('{}', { status: 400 });
    await assert.rejects(
      () => new GoogleTokenService().exchangeCode('bad-code', 'a'.repeat(43)),
      { status: 401 },
    );

    globalThis.fetch = async () => new Response('{}', { status: 200 });
    await assert.rejects(
      () => new GoogleTokenService().exchangeCode('valid-code', 'a'.repeat(43)),
      { status: 503 },
    );
  });
});
