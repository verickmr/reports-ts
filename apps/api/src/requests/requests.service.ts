import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  CreateRequestInput,
  CreatedRequest,
  ListedRequests,
} from '@portal/contracts';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<ListedRequests> {
    const requests = await this.prisma.request.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        category: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    return requests.map((request) => ({
      ...request,
      createdAt: request.createdAt.toISOString(),
    }));
  }

  async create(
    input: CreateRequestInput,
    requesterId: string,
  ): Promise<CreatedRequest> {
    const category = await this.prisma.category.findUnique({
      where: { id: input.categoryId },
      select: { id: true },
    });
    if (!category) throw new BadRequestException('Categoria inválida.');

    const request = await this.prisma.request.create({
      data: {
        title: input.title,
        description: input.description,
        categoryId: input.categoryId,
        requesterId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        categoryId: true,
        requesterId: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      ...request,
      createdAt: request.createdAt.toISOString(),
    };
  }
}
