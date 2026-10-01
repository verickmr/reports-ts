import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import argon2 from 'argon2';
import type { AuthUser, LoginInput } from '@portal/contracts';
import { PrismaService } from '../database/prisma.service.js';
import { sessionDurationMs } from './session-cookie.js';

const invalidCredentials = 'Usuário ou senha inválidos.';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(input: LoginInput): Promise<{ token: string; user: AuthUser }> {
    const user = await this.prisma.user.findUnique({
      where: { username: input.username },
    });
    if (!user || !(await argon2.verify(user.passwordHash, input.password))) {
      throw new UnauthorizedException(invalidCredentials);
    }

    return this.createSession({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    });
  }

  async createSession(
    user: AuthUser,
  ): Promise<{ token: string; user: AuthUser }> {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.session.create({
      data: {
        tokenHash: hashToken(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + sessionDurationMs),
      },
    });
    return { token, user };
  }

  async getUser(token: string): Promise<AuthUser | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    const now = Date.now();
    if (
      !session ||
      session.expiresAt.getTime() <= now ||
      session.createdAt.getTime() + sessionDurationMs <= now
    ) {
      return null;
    }
    return {
      id: session.user.id,
      username: session.user.username,
      name: session.user.name,
      role: session.user.role,
    };
  }

  async logout(token: string | null): Promise<void> {
    if (!token) return;
    await this.prisma.session.deleteMany({
      where: { tokenHash: hashToken(token) },
    });
  }
}
