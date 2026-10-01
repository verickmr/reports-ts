import { createHash, randomBytes } from 'node:crypto';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

const authorizationEndpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
const attemptDurationMs = 5 * 60 * 1000;

function sha256(value: string): string {
  return createHash('sha256').update(value, 'ascii').digest('hex');
}

@Injectable()
export class GoogleAuthService {
  constructor(private readonly prisma: PrismaService) {}

  async beginLogin(): Promise<{ authorizationUrl: string; state: string }> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      throw new ServiceUnavailableException('Login Google não configurado.');
    }

    let callback: URL;
    try {
      callback = new URL(redirectUri);
    } catch {
      throw new ServiceUnavailableException('GOOGLE_REDIRECT_URI inválida.');
    }
    if (
      callback.hash ||
      callback.search ||
      (callback.protocol !== 'https:' &&
        !(
          callback.protocol === 'http:' &&
          ['localhost', '127.0.0.1'].includes(callback.hostname)
        ))
    ) {
      throw new ServiceUnavailableException('GOOGLE_REDIRECT_URI inválida.');
    }

    const state = randomBytes(32).toString('base64url');
    const codeVerifier = randomBytes(32).toString('base64url');
    const nonce = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256')
      .update(codeVerifier, 'ascii')
      .digest('base64url');

    await this.prisma.googleAuthAttempt.create({
      data: {
        stateHash: sha256(state),
        purpose: 'LOGIN',
        codeVerifier,
        nonce,
        expiresAt: new Date(Date.now() + attemptDurationMs),
      },
    });

    const authorizationUrl = new URL(authorizationEndpoint);
    authorizationUrl.searchParams.set('client_id', clientId);
    authorizationUrl.searchParams.set('redirect_uri', callback.toString());
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('scope', 'openid email');
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set('nonce', nonce);
    authorizationUrl.searchParams.set('code_challenge', codeChallenge);
    authorizationUrl.searchParams.set('code_challenge_method', 'S256');

    return { authorizationUrl: authorizationUrl.toString(), state };
  }
}
