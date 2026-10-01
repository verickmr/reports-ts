import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { googleStatePattern } from './google-auth.constants.js';
import {
  GoogleIdTokenVerifier,
  type GoogleIdentity,
} from './google-id-token-verifier.js';

const tokenEndpoint = 'https://oauth2.googleapis.com/token';
const exchangeFailed = 'Não foi possível concluir o login Google.';

@Injectable()
export class GoogleTokenService {
  private readonly verifier = new GoogleIdTokenVerifier();

  verifyIdToken(idToken: string, nonce: string): Promise<GoogleIdentity> {
    return this.verifier.verify(idToken, nonce);
  }

  async exchangeCode(code: string, codeVerifier: string): Promise<string> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
      throw new ServiceUnavailableException('Login Google não configurado.');
    }
    if (!code || !googleStatePattern.test(codeVerifier)) {
      throw new UnauthorizedException(exchangeFailed);
    }

    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    });

    let response: Response;
    try {
      response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        redirect: 'error',
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ServiceUnavailableException(exchangeFailed);
    }
    if (!response.ok) {
      if (response.status >= 500) {
        throw new ServiceUnavailableException(exchangeFailed);
      }
      throw new UnauthorizedException(exchangeFailed);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ServiceUnavailableException(exchangeFailed);
    }
    if (
      !payload ||
      typeof payload !== 'object' ||
      !('id_token' in payload) ||
      typeof payload.id_token !== 'string' ||
      !payload.id_token
    ) {
      throw new ServiceUnavailableException(exchangeFailed);
    }

    return payload.id_token;
  }
}
