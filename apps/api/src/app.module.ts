import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { GoogleAuthService } from './auth/google-auth.service.js';
import { GoogleAccountService } from './auth/google-account.service.js';
import { GoogleTokenService } from './auth/google-token.service.js';
import { SessionGuard } from './auth/session.guard.js';
import { CategoriesController } from './categories/categories.controller.js';
import { PrismaService } from './database/prisma.service.js';
import { RequestsController } from './requests/requests.controller.js';
import { RequestsService } from './requests/requests.service.js';

@Module({
  controllers: [
    HealthController,
    AuthController,
    CategoriesController,
    RequestsController,
  ],
  providers: [
    PrismaService,
    AuthService,
    GoogleAuthService,
    GoogleAccountService,
    GoogleTokenService,
    SessionGuard,
    RequestsService,
  ],
})
export class AppModule {}
