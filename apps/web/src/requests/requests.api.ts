import {
  createdRequestSchema,
  createRequestInputSchema,
  listRequestsQuerySchema,
  listedRequestsSchema,
  requestDetailSchema,
  type CreatedRequest,
  type CreateRequestInput,
  type ListRequestsQuery,
  type ListedRequests,
  type RequestDetail,
} from '@portal/contracts';

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
  filters: ListRequestsQuery = {},
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
    throw new Error('Não foi possível carregar as solicitações.');
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
