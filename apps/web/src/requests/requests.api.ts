import {
  createdRequestSchema,
  createRequestInputSchema,
  listedRequestsSchema,
  listRequestsQuerySchema,
  paginatedListRequestsQuerySchema,
  paginatedRequestsSchema,
  requestDetailSchema,
  requestSummarySchema,
  updateRequestStatusSchema,
  updateRequestInputSchema,
  type CreatedRequest,
  type CreateRequestInput,
  type ListedRequests,
  type ListRequestsQuery,
  type PaginatedListRequestsQuery,
  type PaginatedRequests,
  type RequestDetail,
  type RequestSummary,
  type UpdateRequestStatusInput,
  type UpdateRequestInput,
} from '@portal/contracts';

export async function getRequestSummary(): Promise<RequestSummary> {
  const response = await fetch('/api/requests/summary');
  if (response.status === 401) {
    throw new Error('Sua sessão expirou. Atualize a página e entre novamente.');
  }
  if (!response.ok) {
    throw new Error('Não foi possível carregar o resumo das solicitações.');
  }
  return requestSummarySchema.parse(await response.json());
}

export async function deleteRequest(id: number): Promise<void> {
  const response = await fetch(`/api/requests/${id}`, { method: 'DELETE' });
  if (response.status === 401) {
    throw new Error('Sua sessão expirou. Atualize a página e entre novamente.');
  }
  if (response.status === 404) {
    throw new Error('Solicitação não encontrada.');
  }
  if (response.status === 409) {
    throw new Error(
      'Esta solicitação deixou de estar aberta. Atualize os detalhes.',
    );
  }
  if (!response.ok) {
    throw new Error('Não foi possível excluir a solicitação.');
  }
}

export async function updateRequest(
  id: number,
  input: UpdateRequestInput,
): Promise<RequestDetail> {
  const response = await fetch(`/api/requests/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateRequestInputSchema.parse(input)),
  });
  if (response.status === 400) {
    throw new Error('Confira título, descrição e categoria.');
  }
  if (response.status === 401) {
    throw new Error('Sua sessão expirou. Atualize a página e entre novamente.');
  }
  if (response.status === 404) {
    throw new Error('Solicitação não encontrada.');
  }
  if (response.status === 409) {
    throw new Error(
      'Esta solicitação deixou de estar aberta. Atualize os detalhes.',
    );
  }
  if (!response.ok) {
    throw new Error('Não foi possível editar a solicitação.');
  }
  return requestDetailSchema.parse(await response.json());
}

export async function updateRequestStatus(
  id: number,
  input: UpdateRequestStatusInput,
): Promise<RequestDetail> {
  const response = await fetch(`/api/requests/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateRequestStatusSchema.parse(input)),
  });
  if (response.status === 400) {
    throw new Error('Selecione um status válido.');
  }
  if (response.status === 401) {
    throw new Error('Sua sessão expirou. Atualize a página e entre novamente.');
  }
  if (response.status === 404) {
    throw new Error('Solicitação não encontrada.');
  }
  if (!response.ok) {
    throw new Error('Não foi possível atualizar o status.');
  }
  return requestDetailSchema.parse(await response.json());
}

export async function getRequestDetail(id: number): Promise<RequestDetail> {
  const response = await fetch(`/api/requests/${id}`);
  if (response.status === 404) {
    throw new Error('Solicitação não encontrada.');
  }
  if (response.status === 401) {
    throw new Error('Sua sessão expirou. Atualize a página e entre novamente.');
  }
  if (!response.ok) {
    throw new Error('Não foi possível carregar a solicitação.');
  }
  return requestDetailSchema.parse(await response.json());
}

export async function listRequests(
  filters: PaginatedListRequestsQuery,
): Promise<PaginatedRequests> {
  const query = paginatedListRequestsQuerySchema.parse(filters);
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(query)) {
    if (value !== undefined) params.set(name, String(value));
  }
  const search = params.toString();
  const response = await fetch(`/api/requests/page?${search}`);
  if (response.status === 401) {
    throw new Error('Sua sessão expirou. Atualize a página e entre novamente.');
  }
  if (!response.ok) {
    throw new Error('Não foi possível carregar as solicitações.');
  }
  return paginatedRequestsSchema.parse(await response.json());
}

export async function listAllRequests(
  filters: ListRequestsQuery,
): Promise<ListedRequests> {
  const query = listRequestsQuerySchema.parse(filters);
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(query)) {
    if (value !== undefined) params.set(name, String(value));
  }
  const search = params.toString();
  const response = await fetch(`/api/requests${search ? `?${search}` : ''}`);
  if (response.status === 401) {
    throw new Error('Sua sessão expirou. Atualize a página e entre novamente.');
  }
  if (!response.ok) {
    throw new Error('Não foi possível carregar o quadro de solicitações.');
  }
  return listedRequestsSchema.parse(await response.json());
}

export async function createRequest(
  input: CreateRequestInput,
): Promise<CreatedRequest> {
  const response = await fetch('/api/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createRequestInputSchema.parse(input)),
  });

  if (response.status === 400) {
    throw new Error('Confira os dados e selecione uma categoria válida.');
  }
  if (response.status === 401) {
    throw new Error('Sua sessão expirou. Atualize a página e entre novamente.');
  }
  if (!response.ok) {
    throw new Error('Não foi possível criar a solicitação. Tente novamente.');
  }

  return createdRequestSchema.parse(await response.json());
}
