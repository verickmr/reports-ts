import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  createRequestInputSchema,
  listRequestsQuerySchema,
  requestIdSchema,
  updateRequestStatusSchema,
  updateRequestInputSchema,
  type CreatedRequest,
  type ListedRequests,
  type RequestDetail,
} from '@portal/contracts';
import { AuthenticatedRequest, SessionGuard } from '../auth/session.guard.js';
import { RequestsService } from './requests.service.js';

function parseRequestId(id: string): number {
  const parsed = requestIdSchema.safeParse(id);
  if (!parsed.success) {
    throw new BadRequestException('Código da solicitação inválido.');
  }
  return parsed.data;
}

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
    return this.requests.detail(parseRequestId(id));
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<RequestDetail> {
    const parsed = updateRequestStatusSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Informe um status válido.');
    }
    return this.requests.updateStatus(parseRequestId(id), parsed.data);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<RequestDetail> {
    const parsed = updateRequestInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        'Informe título, descrição e categoria válidos.',
      );
    }
    return this.requests.update(parseRequestId(id), parsed.data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.requests.remove(parseRequestId(id));
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
