import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';
import type { AuthUser } from '@portal/contracts';
import { PrismaService } from '../database/prisma.service.js';
import { AuthService } from './auth.service.js';
import type { GoogleIdentity } from './google-id-token-verifier.js';

@Injectable()
export class GoogleAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async login(
    identity: GoogleIdentity,
  ): Promise<{ token: string; user: AuthUser }> {
    let user = await this.prisma.user.findUnique({
      where: { googleSub: identity.sub },
    });
    if (!user) {
      const username = `google_${createHash('sha256').update(identity.sub).digest('hex')}`;
      const passwordHash = await argon2.hash(
        randomBytes(32).toString('base64url'),
        { type: argon2.argon2id },
      );
      user = await this.prisma.user.upsert({
        where: { googleSub: identity.sub },
        create: {
          googleSub: identity.sub,
          username,
          name: identity.email.slice(0, 120),
          passwordHash,
          role: 'REQUESTER',
        },
        update: {},
      });
    }

    return this.auth.createSession({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    });
  }
}
