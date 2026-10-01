import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

const googleKeys = createRemoteJWKSet(
  new URL('https://www.googleapis.com/oauth2/v3/certs'),
  { timeoutDuration: 5_000 },
);
const invalidToken = 'Identidade Google inválida.';

export type GoogleIdentity = { sub: string; email: string };

export class GoogleIdTokenVerifier {
  constructor(private readonly keys: JWTVerifyGetKey = googleKeys) {}

  async verify(
    idToken: string,
    expectedNonce: string,
  ): Promise<GoogleIdentity> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new ServiceUnavailableException('Login Google não configurado.');
    }
    if (!idToken || idToken.length > 16_384 || !expectedNonce) {
      throw new UnauthorizedException(invalidToken);
    }

    let payload;
    try {
      ({ payload } = await jwtVerify(idToken, this.keys, {
        algorithms: ['RS256'],
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
        audience: clientId,
        clockTolerance: '60s',
        maxTokenAge: '10m',
        requiredClaims: ['exp', 'nonce', 'sub', 'email', 'email_verified'],
      }));
    } catch {
      throw new UnauthorizedException(invalidToken);
    }

    if (
      payload.aud !== clientId ||
      payload.nonce !== expectedNonce ||
      typeof payload.sub !== 'string' ||
      !payload.sub ||
      payload.sub.length > 255 ||
      typeof payload.email !== 'string' ||
      !payload.email ||
      (payload.email_verified !== true && payload.email_verified !== 'true')
    ) {
      throw new UnauthorizedException(invalidToken);
    }

    return { sub: payload.sub, email: payload.email };
  }
}
