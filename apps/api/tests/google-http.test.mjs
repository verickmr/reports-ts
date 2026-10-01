import 'reflect-metadata';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import test from 'node:test';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist/app.module.js';
import { GoogleTokenService } from '../dist/auth/google-token.service.js';
import { PrismaService } from '../dist/database/prisma.service.js';

test('login Google funciona por HTTP com provedor simulado', async () => {
  const previous = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
  };
  process.env.GOOGLE_CLIENT_ID = 'http-test-client';
  process.env.GOOGLE_CLIENT_SECRET = 'http-test-secret';
  const googleSub = `http-test-${randomUUID()}`;
  let app;
  let prisma;
  let state;
  let exchanges = 0;

  try {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api');
    prisma = app.get(PrismaService);
    const tokens = app.get(GoogleTokenService);
    tokens.exchangeCode = async (code, verifier) => {
      assert.equal(code, 'test-auth-code');
      assert.match(verifier, /^[A-Za-z0-9_-]{43}$/);
      exchanges += 1;
      return 'test-id-token';
    };
    tokens.verifyIdToken = async (token, nonce) => {
      assert.equal(token, 'test-id-token');
      assert.match(nonce, /^[A-Za-z0-9_-]{43}$/);
      return { sub: googleSub, email: 'http-test@example.com' };
    };

    await app.listen(0, '127.0.0.1');
    const base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`;
    process.env.GOOGLE_REDIRECT_URI = `${base}/auth/google/callback`;

    const availability = await fetch(`${base}/auth/google/availability`);
    assert.deepEqual(await availability.json(), { enabled: true });

    const start = await fetch(`${base}/auth/google/start`, {
      redirect: 'manual',
    });
    assert.equal(start.status, 302);
    const authorizationUrl = new URL(start.headers.get('location'));
    assert.equal(authorizationUrl.origin, 'https://accounts.google.com');
    state = authorizationUrl.searchParams.get('state');
    assert.ok(state);
    const stateCookie = start.headers.getSetCookie()[0].split(';')[0];
    assert.equal(stateCookie, `portal_google_state=${state}`);

    const callbackUrl = new URL(`${base}/auth/google/callback`);
    callbackUrl.searchParams.set('iss', 'https://accounts.google.com');
    callbackUrl.searchParams.set('state', state);
    callbackUrl.searchParams.set('code', 'test-auth-code');
    const wrongBrowser = await fetch(callbackUrl, {
      headers: { Cookie: `portal_google_state=${'b'.repeat(43)}` },
      redirect: 'manual',
    });
    assert.equal(wrongBrowser.headers.get('location'), '/login?google=failed');
    assert.equal(exchanges, 0);

    const callback = await fetch(callbackUrl, {
      headers: { Cookie: stateCookie },
      redirect: 'manual',
    });
    assert.equal(callback.status, 302);
    assert.equal(callback.headers.get('location'), '/');
    assert.equal(exchanges, 1);
    const cookies = callback.headers.getSetCookie();
    const sessionCookie = cookies
      .find((cookie) => cookie.startsWith('portal_session='))
      ?.split(';')[0];
    assert.ok(sessionCookie);
    assert.match(
      cookies.find((cookie) => cookie.startsWith('portal_google_state=')),
      /Max-Age=0/,
    );
    const me = await fetch(`${base}/auth/me`, {
      headers: { Cookie: sessionCookie },
    });
    assert.equal(me.status, 200);
    assert.equal((await me.json()).user.role, 'REQUESTER');
    assert.equal(await prisma.user.count({ where: { googleSub } }), 1);

    const replay = await fetch(callbackUrl, {
      headers: { Cookie: stateCookie },
      redirect: 'manual',
    });
    assert.equal(replay.headers.get('location'), '/login?google=failed');
    assert.equal(exchanges, 1);
  } finally {
    try {
      if (prisma) {
        if (state) {
          await prisma.googleAuthAttempt.deleteMany({
            where: {
              stateHash: createHash('sha256')
                .update(state, 'ascii')
                .digest('hex'),
            },
          });
        }
        await prisma.user.deleteMany({ where: { googleSub } });
      }
    } finally {
      await app?.close();
      for (const [key, value] of [
        ['GOOGLE_CLIENT_ID', previous.clientId],
        ['GOOGLE_CLIENT_SECRET', previous.clientSecret],
        ['GOOGLE_REDIRECT_URI', previous.redirectUri],
      ]) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  }
});
