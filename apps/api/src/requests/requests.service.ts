import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateRequestInput,
  CreatedRequest,
  ListRequestsQuery,
  ListedRequests,
  RequestDetail,
} from '@portal/contracts';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filters: ListRequestsQuery): Promise<ListedRequests> {
    const requests = await this.prisma.request.findMany({
      where: {
        title: filters.title
          ? { contains: filters.title, mode: 'insensitive' }
          : undefined,
        categoryId: filters.categoryId,
        status: filters.status,
        createdAt:
          filters.createdFrom || filters.createdBefore
            ? {
                gte: filters.createdFrom
                  ? new Date(filters.createdFrom)
                  : undefined,
                lt: filters.createdBefore
                  ? new Date(filters.createdBefore)
                  : undefined,
              }
            : undefined,
      },
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

  async detail(id: number): Promise<RequestDetail> {
    const request = await this.prisma.request.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        category: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true } },
      },
    });
    if (!request) throw new NotFoundException('Solicitação não encontrada.');

    return {
      ...request,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
    };
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
