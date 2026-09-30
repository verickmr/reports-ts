import { Controller, Get, UseGuards } from '@nestjs/common';
import type { CategoriesResponse } from '@portal/contracts';
import { SessionGuard } from '../auth/session.guard.js';
import { PrismaService } from '../database/prisma.service.js';

@Controller('categories')
@UseGuards(SessionGuard)
export class CategoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(): Promise<CategoriesResponse> {
    return this.prisma.category.findMany({
      select: { id: true, slug: true, name: true },
      orderBy: { name: 'asc' },
    });
  }
}
