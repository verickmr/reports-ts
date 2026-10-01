import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import {
  googleAuthAttemptDurationMs,
  googleStatePattern,
} from './google-auth.constants.js';

const authorizationEndpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
const invalidAttempt = 'Tentativa de login Google inválida ou expirada.';

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
        expiresAt: new Date(Date.now() + googleAuthAttemptDurationMs),
      },
    });

    const authorizationUrl = new URL(authorizationEndpoint);
    authorizationUrl.searchParams.set('client_id', clientId);
    authorizationUrl.searchParams.set('redirect_uri', redirectUri);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('scope', 'openid email');
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set('nonce', nonce);
    authorizationUrl.searchParams.set('code_challenge', codeChallenge);
    authorizationUrl.searchParams.set('code_challenge_method', 'S256');

    return { authorizationUrl: authorizationUrl.toString(), state };
  }

  async consumeLoginAttempt(
    state: string | undefined,
    browserState: string | null,
  ): Promise<{ codeVerifier: string; nonce: string }> {
    if (
      !state ||
      !browserState ||
      !googleStatePattern.test(state) ||
      !googleStatePattern.test(browserState) ||
      !timingSafeEqual(Buffer.from(state), Buffer.from(browserState))
    ) {
      throw new UnauthorizedException(invalidAttempt);
    }

    const stateHash = sha256(state);
    const attempt = await this.prisma.googleAuthAttempt.findUnique({
      where: { stateHash },
    });
    const now = new Date();
    if (!attempt || attempt.purpose !== 'LOGIN' || attempt.expiresAt <= now) {
      throw new UnauthorizedException(invalidAttempt);
    }

    const deleted = await this.prisma.googleAuthAttempt.deleteMany({
      where: {
        stateHash,
        purpose: 'LOGIN',
        expiresAt: { gt: now },
      },
    });
    if (deleted.count !== 1) throw new UnauthorizedException(invalidAttempt);

    return { codeVerifier: attempt.codeVerifier, nonce: attempt.nonce };
  }
}
