import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  createRequestInputSchema,
  listRequestsQuerySchema,
  type CreatedRequest,
  type ListedRequests,
} from '@portal/contracts';
import { AuthenticatedRequest, SessionGuard } from '../auth/session.guard.js';
import { RequestsService } from './requests.service.js';

@Controller('requests')
@UseGuards(SessionGuard)
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Get()
  list(@Query() query: unknown): Promise<ListedRequests> {
    const parsed = listRequestsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException('Filtros inválidos.');
    }
    return this.requests.list(parsed.data);
  }

  @Post()
  async create(
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<CreatedRequest> {
    const parsed = createRequestInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        'Informe título, descrição e categoria válidos.',
      );
    }
    return this.requests.create(parsed.data, request.user!.id);
  }
}
