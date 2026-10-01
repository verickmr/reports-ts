import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { GoogleAuthService } from '../dist/auth/google-auth.service.js';
import {
  readGoogleStateCookie,
  writeGoogleStateCookie,
} from '../dist/auth/google-state-cookie.js';

test('prepara tentativa Google com state persistido e PKCE S256', async () => {
  const previousClientId = process.env.GOOGLE_CLIENT_ID;
  const previousClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const previousRedirectUri = process.env.GOOGLE_REDIRECT_URI;
  process.env.GOOGLE_CLIENT_ID = 'test-client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
  process.env.GOOGLE_REDIRECT_URI =
    'http://127.0.0.1:3000/api/auth/google/callback';
  const attempts = [
    { stateHash: 'expired', expiresAt: new Date(Date.now() - 60_000) },
    { stateHash: 'active', expiresAt: new Date(Date.now() + 60_000) },
  ];
  const prisma = {
    googleAuthAttempt: {
      async deleteMany({ where }) {
        assert.deepEqual(Object.keys(where), ['expiresAt']);
        const cutoff = where.expiresAt.lte;
        const expired = attempts.filter((item) => item.expiresAt <= cutoff);
        for (const item of expired) attempts.splice(attempts.indexOf(item), 1);
        return { count: expired.length };
      },
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
    const attempt = attempts[1];

    assert.equal(attempts.length, 2);
    assert.equal(attempts[0].stateHash, 'active');
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
    if (previousClientSecret === undefined)
      delete process.env.GOOGLE_CLIENT_SECRET;
    else process.env.GOOGLE_CLIENT_SECRET = previousClientSecret;
    if (previousRedirectUri === undefined)
      delete process.env.GOOGLE_REDIRECT_URI;
    else process.env.GOOGLE_REDIRECT_URI = previousRedirectUri;
  }
});

test('recusa redirect HTTP remoto sem salvar tentativa', async () => {
  const previousClientId = process.env.GOOGLE_CLIENT_ID;
  const previousClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const previousRedirectUri = process.env.GOOGLE_REDIRECT_URI;
  process.env.GOOGLE_CLIENT_ID = 'test-client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
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
    assert.equal(new GoogleAuthService(prisma).isAvailable(), false);
    await assert.rejects(() => new GoogleAuthService(prisma).beginLogin(), {
      message: 'GOOGLE_REDIRECT_URI inválida.',
    });
    assert.equal(saved, false);
  } finally {
    if (previousClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = previousClientId;
    if (previousClientSecret === undefined)
      delete process.env.GOOGLE_CLIENT_SECRET;
    else process.env.GOOGLE_CLIENT_SECRET = previousClientSecret;
    if (previousRedirectUri === undefined)
      delete process.env.GOOGLE_REDIRECT_URI;
    else process.env.GOOGLE_REDIRECT_URI = previousRedirectUri;
  }
});

test('aceita somente o state do navegador e consome a tentativa uma vez', async () => {
  let saved = {
    purpose: 'LOGIN',
    codeVerifier: 'verifier',
    nonce: 'nonce',
    expiresAt: new Date(Date.now() + 60_000),
  };
  const state = 'a'.repeat(43);
  const stateHash = createHash('sha256').update(state, 'ascii').digest('hex');
  const prisma = {
    googleAuthAttempt: {
      async findUnique({ where }) {
        return where.stateHash === stateHash ? saved : null;
      },
      async deleteMany({ where }) {
        if (
          saved &&
          where.stateHash === stateHash &&
          where.purpose === 'LOGIN' &&
          saved.expiresAt > where.expiresAt.gt
        ) {
          saved = null;
          return { count: 1 };
        }
        return { count: 0 };
      },
    },
  };
  const auth = new GoogleAuthService(prisma);

  await assert.rejects(() => auth.consumeLoginAttempt(state, 'b'.repeat(43)));
  assert.ok(saved);
  assert.deepEqual(await auth.consumeLoginAttempt(state, state), {
    codeVerifier: 'verifier',
    nonce: 'nonce',
  });
  await assert.rejects(() => auth.consumeLoginAttempt(state, state));
});

test('cookie Google é curto, restrito ao callback e preserva outros cookies', () => {
  const headers = new Map([['Set-Cookie', 'portal_session=session-token']]);
  const response = {
    getHeader(name) {
      return headers.get(name);
    },
    setHeader(name, value) {
      headers.set(name, value);
    },
  };
  const state = 'a'.repeat(43);

  writeGoogleStateCookie(response, state);
  const [sessionCookie, googleCookie] = headers.get('Set-Cookie');
  assert.equal(sessionCookie, 'portal_session=session-token');
  assert.match(googleCookie, /HttpOnly; SameSite=Lax/);
  assert.match(googleCookie, /Path=\/api\/auth\/google\/callback/);
  assert.match(googleCookie, /Max-Age=300/);
  assert.equal(
    readGoogleStateCookie({
      headers: { cookie: `portal_google_state=${state}` },
    }),
    state,
  );
  assert.equal(
    readGoogleStateCookie({
      headers: {
        cookie: `portal_google_state=${state}; portal_google_state=${state}`,
      },
    }),
    null,
  );
});
