import assert from 'node:assert/strict';
import test from 'node:test';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { GoogleIdTokenVerifier } from '../dist/auth/google-id-token-verifier.js';

test('valida assinatura, claims e nonce antes de aceitar identidade Google', async () => {
  const previousClientId = process.env.GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_ID = 'test-client';
  try {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const jwk = await exportJWK(publicKey);
    jwk.kid = 'test-key';
    const verifier = new GoogleIdTokenVerifier(
      createLocalJWKSet({ keys: [jwk] }),
    );
    const claims = {
      sub: 'stable-google-sub',
      email: 'user@example.com',
      email_verified: true,
      nonce: 'expected-nonce',
    };
    async function sign({
      overrides = {},
      audience = 'test-client',
      issuer = 'https://accounts.google.com',
      expiration = '5m',
    } = {}) {
      return new SignJWT({ ...claims, ...overrides })
        .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
        .setIssuer(issuer)
        .setAudience(audience)
        .setIssuedAt()
        .setExpirationTime(expiration)
        .sign(privateKey);
    }

    const validToken = await sign();
    assert.deepEqual(await verifier.verify(validToken, 'expected-nonce'), {
      sub: 'stable-google-sub',
      email: 'user@example.com',
    });
    await assert.rejects(() => verifier.verify(validToken, 'wrong-nonce'), {
      status: 401,
    });
    const unverifiedEmail = await sign({
      overrides: { email_verified: false },
    });
    await assert.rejects(
      () => verifier.verify(unverifiedEmail, 'expected-nonce'),
      {
        status: 401,
      },
    );
    const wrongAudience = await sign({ audience: 'other-client' });
    await assert.rejects(
      () => verifier.verify(wrongAudience, 'expected-nonce'),
      {
        status: 401,
      },
    );
    const wrongIssuer = await sign({ issuer: 'https://example.com' });
    await assert.rejects(() => verifier.verify(wrongIssuer, 'expected-nonce'), {
      status: 401,
    });
    const expired = await sign({ expiration: '-2m' });
    await assert.rejects(() => verifier.verify(expired, 'expected-nonce'), {
      status: 401,
    });
    const [header, payload, signature] = validToken.split('.');
    const tamperedSignature = `${signature.slice(0, 10)}${signature[10] === 'a' ? 'b' : 'a'}${signature.slice(11)}`;
    await assert.rejects(
      () =>
        verifier.verify(
          `${header}.${payload}.${tamperedSignature}`,
          'expected-nonce',
        ),
      { status: 401 },
    );
  } finally {
    if (previousClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = previousClientId;
  }
});
