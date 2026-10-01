import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { GoogleAccountService } from './google-account.service.js';
import { GoogleAuthService } from './google-auth.service.js';
import {
  readGoogleStateCookie,
  writeGoogleStateCookie,
  type GoogleCookieResponse,
} from './google-state-cookie.js';
import { GoogleTokenService } from './google-token.service.js';
import { CookieRequest, writeSessionCookie } from './session-cookie.js';

type RedirectResponse = GoogleCookieResponse & {
  redirect(status: number, url: string): void;
};

@Controller('auth/google')
export class GoogleAuthController {
  constructor(
    private readonly attempts: GoogleAuthService,
    private readonly tokens: GoogleTokenService,
    private readonly accounts: GoogleAccountService,
  ) {}

  @Get('start')
  async start(@Res() response: RedirectResponse): Promise<void> {
    const { authorizationUrl, state } = await this.attempts.beginLogin();
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    writeGoogleStateCookie(response, state);
    response.redirect(302, authorizationUrl);
  }

  @Get('callback')
  async callback(
    @Query() query: Record<string, unknown>,
    @Req() request: CookieRequest,
    @Res() response: RedirectResponse,
  ): Promise<void> {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    let token: string;
    try {
      if (
        query.iss !== 'https://accounts.google.com' ||
        typeof query.state !== 'string' ||
        typeof query.code !== 'string' ||
        !query.code ||
        query.code.length > 2_048 ||
        query.error !== undefined
      ) {
        throw new UnauthorizedException('Retorno do Google inválido.');
      }

      const { codeVerifier, nonce } = await this.attempts.consumeLoginAttempt(
        query.state,
        readGoogleStateCookie(request),
      );
      const idToken = await this.tokens.exchangeCode(query.code, codeVerifier);
      const identity = await this.tokens.verifyIdToken(idToken, nonce);
      ({ token } = await this.accounts.login(identity));
    } catch (error) {
      writeGoogleStateCookie(response, null);
      throw error;
    }

    writeSessionCookie(response, token);
    writeGoogleStateCookie(response, null);
    response.redirect(302, '/');
  }
}
