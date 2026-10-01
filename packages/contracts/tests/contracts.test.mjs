import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createRequestInputSchema,
  listRequestsQuerySchema,
  loginInputSchema,
  paginatedListRequestsQuerySchema,
  paginatedRequestsSchema,
  requestIdSchema,
  requestSummarySchema,
  updateRequestInputSchema,
  updateRequestStatusSchema,
} from '../dist/index.js';

const requestInput = {
  title: '  Computador sem rede  ',
  description: '  Verificar conexão  ',
  categoryId: 1,
};

test('a criação normaliza texto e rejeita campos controlados pelo servidor', () => {
  assert.deepEqual(createRequestInputSchema.parse(requestInput), {
    title: 'Computador sem rede',
    description: 'Verificar conexão',
    categoryId: 1,
  });
  assert.equal(
    createRequestInputSchema.safeParse({ ...requestInput, status: 'COMPLETED' })
      .success,
    false,
  );
  assert.equal(
    updateRequestInputSchema.safeParse({
      ...requestInput,
      requesterId: 'outro',
    }).success,
    false,
  );
  assert.equal(
    createRequestInputSchema.safeParse({ ...requestInput, title: '   ' })
      .success,
    false,
  );
});

test('login exige usuário e senha e normaliza o usuário', () => {
  assert.deepEqual(
    loginInputSchema.parse({ username: ' solicitante ', password: 'senha' }),
    { username: 'solicitante', password: 'senha' },
  );
  assert.equal(
    loginInputSchema.safeParse({ username: '   ', password: 'senha' }).success,
    false,
  );
  assert.equal(
    loginInputSchema.safeParse({ username: 'solicitante', password: '' })
      .success,
    false,
  );
});

test('filtros convertem categoria e rejeitam períodos invertidos', () => {
  const from = '2026-09-30T00:00:00.000Z';
  const before = '2026-10-01T00:00:00.000Z';
  assert.deepEqual(
    listRequestsQuerySchema.parse({
      title: ' rede ',
      categoryId: '2',
      createdFrom: from,
      createdBefore: before,
    }),
    { title: 'rede', categoryId: 2, createdFrom: from, createdBefore: before },
  );
  assert.equal(
    listRequestsQuerySchema.safeParse({
      createdFrom: before,
      createdBefore: from,
    }).success,
    false,
  );
  assert.equal(
    listRequestsQuerySchema.safeParse({ unknown: 'x' }).success,
    false,
  );
});

test('paginação mantém filtros, aplica padrões e limita tamanho da página', () => {
  assert.deepEqual(paginatedListRequestsQuerySchema.parse({}), {
    page: 1,
    pageSize: 20,
  });
  assert.deepEqual(
    paginatedListRequestsQuerySchema.parse({
      categoryId: '2',
      page: '3',
      pageSize: '50',
    }),
    { categoryId: 2, page: 3, pageSize: 50 },
  );
  for (const query of [
    { page: '0' },
    { page: '1.5' },
    { pageSize: '101' },
    {
      createdFrom: '2026-10-02T00:00:00.000Z',
      createdBefore: '2026-10-01T00:00:00.000Z',
    },
    { unknown: 'x' },
  ]) {
    assert.equal(
      paginatedListRequestsQuerySchema.safeParse(query).success,
      false,
    );
  }
  assert.deepEqual(
    paginatedRequestsSchema.parse({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
    }),
    { items: [], page: 1, pageSize: 20, total: 0 },
  );
});

test('códigos e mudança de status aceitam apenas valores previstos', () => {
  assert.equal(requestIdSchema.parse('42'), 42);
  for (const id of ['0', '-1', '1x', '9007199254740992']) {
    assert.equal(requestIdSchema.safeParse(id).success, false);
  }
  assert.deepEqual(updateRequestStatusSchema.parse({ status: 'IN_PROGRESS' }), {
    status: 'IN_PROGRESS',
  });
  assert.equal(
    updateRequestStatusSchema.safeParse({ status: 'UNKNOWN' }).success,
    false,
  );
  assert.equal(
    updateRequestStatusSchema.safeParse({ status: 'OPEN', title: 'alterado' })
      .success,
    false,
  );
});

test('resumo permite zeros e rejeita contagens negativas', () => {
  const empty = {
    total: 0,
    byStatus: { OPEN: 0, IN_PROGRESS: 0, COMPLETED: 0 },
  };
  assert.deepEqual(requestSummarySchema.parse(empty), empty);
  assert.equal(
    requestSummarySchema.safeParse({
      total: -1,
      byStatus: empty.byStatus,
    }).success,
    false,
  );
});
