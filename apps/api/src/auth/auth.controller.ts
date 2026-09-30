import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { loginInputSchema, type AuthResponse } from '@portal/contracts';
import { AuthService } from './auth.service.js';
import {
  CookieRequest,
  CookieResponse,
  readSessionToken,
  writeSessionCookie,
} from './session-cookie.js';
import { AuthenticatedRequest, SessionGuard } from './session.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<AuthResponse> {
    const parsed = loginInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Informe usuário e senha válidos.');
    }
    const { token, user } = await this.auth.login(parsed.data);
    writeSessionCookie(response, token);
    return { user };
  }

  @Get('me')
  @UseGuards(SessionGuard)
  me(@Req() request: AuthenticatedRequest): AuthResponse {
    return { user: request.user! };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<void> {
    await this.auth.logout(readSessionToken(request));
    writeSessionCookie(response, null);
  }
}
