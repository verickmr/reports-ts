import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateRequestInput,
  CreatedRequest,
  ListRequestsQuery,
  ListedRequests,
  RequestDetail,
  UpdateRequestStatusInput,
  UpdateRequestInput,
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

  async updateStatus(
    id: number,
    input: UpdateRequestStatusInput,
  ): Promise<RequestDetail> {
    const updated = await this.prisma.request.updateMany({
      where: { id },
      data: { status: input.status },
    });
    if (updated.count === 0) {
      throw new NotFoundException('Solicitação não encontrada.');
    }
    return this.detail(id);
  }

  async update(id: number, input: UpdateRequestInput): Promise<RequestDetail> {
    await this.assertCategoryExists(input.categoryId);
    const updated = await this.prisma.request.updateMany({
      where: { id, status: 'OPEN' },
      data: {
        title: input.title,
        description: input.description,
        categoryId: input.categoryId,
      },
    });
    if (updated.count === 0) {
      const existing = await this.prisma.request.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!existing) throw new NotFoundException('Solicitação não encontrada.');
      throw new ConflictException(
        'Apenas solicitações abertas podem ser editadas.',
      );
    }
    return this.detail(id);
  }

  async remove(id: number): Promise<void> {
    const deleted = await this.prisma.request.deleteMany({
      where: { id, status: 'OPEN' },
    });
    if (deleted.count === 0) {
      const existing = await this.prisma.request.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!existing) throw new NotFoundException('Solicitação não encontrada.');
      throw new ConflictException(
        'Apenas solicitações abertas podem ser excluídas.',
      );
    }
  }

  async create(
    input: CreateRequestInput,
    requesterId: string,
  ): Promise<CreatedRequest> {
    await this.assertCategoryExists(input.categoryId);

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

  private async assertCategoryExists(categoryId: number): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!category) throw new BadRequestException('Categoria inválida.');
  }
}
