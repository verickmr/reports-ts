import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  createRequestInputSchema,
  listRequestsQuerySchema,
  requestIdSchema,
  type CreatedRequest,
  type ListedRequests,
  type RequestDetail,
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

  @Get(':id')
  detail(@Param('id') id: string): Promise<RequestDetail> {
    const parsed = requestIdSchema.safeParse(id);
    if (!parsed.success) {
      throw new BadRequestException('Código da solicitação inválido.');
    }
    return this.requests.detail(parsed.data);
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
