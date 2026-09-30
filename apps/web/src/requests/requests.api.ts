import {
  createdRequestSchema,
  createRequestInputSchema,
  listedRequestsSchema,
  type CreatedRequest,
  type CreateRequestInput,
  type ListedRequests,
} from '@portal/contracts';

export async function listRequests(): Promise<ListedRequests> {
  const response = await fetch('/api/requests');
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
