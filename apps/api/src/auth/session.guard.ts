import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthUser } from '@portal/contracts';
import { AuthService } from './auth.service.js';
import { CookieRequest, readSessionToken } from './session-cookie.js';

export type AuthenticatedRequest = CookieRequest & { user?: AuthUser };

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = readSessionToken(request);
    const user = token && (await this.auth.getUser(token));
    if (!user) throw new UnauthorizedException('Sessão inválida ou expirada.');
    request.user = user;
    return true;
  }
}
