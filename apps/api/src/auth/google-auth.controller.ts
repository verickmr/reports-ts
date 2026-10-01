import type { GoogleAuthAvailability } from '@portal/contracts';
import {
  Controller,
  Get,
  Logger,
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
  private readonly logger = new Logger(GoogleAuthController.name);

  constructor(
    private readonly attempts: GoogleAuthService,
    private readonly tokens: GoogleTokenService,
    private readonly accounts: GoogleAccountService,
  ) {}

  @Get('availability')
  availability(): GoogleAuthAvailability {
    return { enabled: this.attempts.isAvailable() };
  }

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
        typeof query.state !== 'string'
      ) {
        throw new UnauthorizedException('Retorno do Google inválido.');
      }

      const { codeVerifier, nonce } = await this.attempts.consumeLoginAttempt(
        query.state,
        readGoogleStateCookie(request),
      );
      if (query.error === 'access_denied' && query.code === undefined) {
        writeGoogleStateCookie(response, null);
        response.redirect(302, '/login?google=cancelled');
        return;
      }
      if (
        typeof query.code !== 'string' ||
        !query.code ||
        query.code.length > 2_048 ||
        query.error !== undefined
      ) {
        throw new UnauthorizedException('Retorno do Google inválido.');
      }

      const idToken = await this.tokens.exchangeCode(query.code, codeVerifier);
      const identity = await this.tokens.verifyIdToken(idToken, nonce);
      ({ token } = await this.accounts.login(identity));
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) {
        this.logger.error('Falha ao concluir login Google.');
      }
      writeGoogleStateCookie(response, null);
      response.redirect(302, '/login?google=failed');
      return;
    }

    writeSessionCookie(response, token);
    writeGoogleStateCookie(response, null);
    response.redirect(302, '/');
  }
}
