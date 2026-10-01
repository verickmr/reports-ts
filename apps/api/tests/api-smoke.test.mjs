import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

const baseUrl = (
  process.env.API_TEST_BASE_URL ?? 'http://127.0.0.1:3000/api'
).replace(/\/$/, '');
const username = process.env.API_TEST_USERNAME ?? 'solicitante';
const password =
  process.env.API_TEST_PASSWORD ?? process.env.DEMO_REQUESTER_PASSWORD;

test('fluxo HTTP de uma solicitação autenticada', async () => {
  assert.ok(password, 'Defina API_TEST_PASSWORD ou DEMO_REQUESTER_PASSWORD.');

  let cookie;
  let requestId;
  async function api(path, options = {}) {
    const headers = new Headers(options.headers);
    if (cookie) headers.set('Cookie', cookie);
    return fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
      signal: AbortSignal.timeout(10_000),
    });
  }
  function jsonOptions(method, body) {
    return {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    };
  }

  try {
    assert.equal((await api('/requests')).status, 401);

    const login = await api(
      '/auth/login',
      jsonOptions('POST', { username, password }),
    );
    assert.equal(login.status, 200);
    cookie = login.headers.get('set-cookie')?.split(';')[0];
    assert.ok(cookie?.startsWith('portal_session='));

    const categoriesResponse = await api('/categories');
    assert.equal(categoriesResponse.status, 200);
    const categories = await categoriesResponse.json();
    assert.ok(categories.length > 0, 'Execute o seed antes do teste.');

    const summaryBeforeResponse = await api('/requests/summary');
    assert.equal(summaryBeforeResponse.status, 200);
    const summaryBefore = await summaryBeforeResponse.json();

    const title = `Teste HTTP ${randomUUID()}`;
    const creation = await api(
      '/requests',
      jsonOptions('POST', {
        title,
        description: 'Solicitação temporária para verificar a API.',
        categoryId: categories[0].id,
      }),
    );
    assert.equal(creation.status, 201);
    const created = await creation.json();
    requestId = created.id;
    assert.equal(created.title, title);
    assert.equal(created.status, 'OPEN');
    assert.equal(
      created.requesterId,
      (await (await api('/auth/me')).json()).user.id,
    );

    const summaryAfterCreate = await (await api('/requests/summary')).json();
    assert.equal(summaryAfterCreate.total, summaryBefore.total + 1);
    assert.equal(
      summaryAfterCreate.byStatus.OPEN,
      summaryBefore.byStatus.OPEN + 1,
    );

    const list = await api(`/requests?title=${encodeURIComponent(title)}`);
    assert.equal(list.status, 200);
    assert.deepEqual(
      (await list.json()).map((item) => item.id),
      [requestId],
    );
    const detail = await api(`/requests/${requestId}`);
    assert.equal(detail.status, 200);
    assert.equal((await detail.json()).title, title);

    const editedTitle = `${title} editado`;
    const update = await api(
      `/requests/${requestId}`,
      jsonOptions('PUT', {
        title: editedTitle,
        description: 'Descrição atualizada.',
        categoryId: categories[0].id,
      }),
    );
    assert.equal(update.status, 200);
    assert.equal((await update.json()).title, editedTitle);

    const progress = await api(
      `/requests/${requestId}/status`,
      jsonOptions('PATCH', { status: 'IN_PROGRESS' }),
    );
    assert.equal(progress.status, 200);
    assert.equal((await progress.json()).status, 'IN_PROGRESS');
    const summaryInProgress = await (await api('/requests/summary')).json();
    assert.equal(
      summaryInProgress.byStatus.IN_PROGRESS,
      summaryBefore.byStatus.IN_PROGRESS + 1,
    );
    assert.equal(
      (
        await api(
          `/requests/${requestId}`,
          jsonOptions('PUT', {
            title: editedTitle,
            description: 'Outra descrição.',
            categoryId: categories[0].id,
          }),
        )
      ).status,
      409,
    );
    assert.equal(
      (await api(`/requests/${requestId}`, { method: 'DELETE' })).status,
      409,
    );

    const completed = await api(
      `/requests/${requestId}/status`,
      jsonOptions('PATCH', { status: 'COMPLETED' }),
    );
    assert.equal(completed.status, 200);
    assert.equal((await completed.json()).status, 'COMPLETED');
    const summaryCompleted = await (await api('/requests/summary')).json();
    assert.equal(
      summaryCompleted.byStatus.COMPLETED,
      summaryBefore.byStatus.COMPLETED + 1,
    );

    const reopen = await api(
      `/requests/${requestId}/status`,
      jsonOptions('PATCH', { status: 'OPEN' }),
    );
    assert.equal(reopen.status, 200);
    assert.equal(
      (await api(`/requests/${requestId}`, { method: 'DELETE' })).status,
      204,
    );
    requestId = undefined;

    assert.equal((await api(`/requests/${created.id}`)).status, 404);
    const summaryAfterDelete = await (await api('/requests/summary')).json();
    assert.deepEqual(summaryAfterDelete, summaryBefore);

    assert.equal((await api('/auth/logout', { method: 'POST' })).status, 204);
    assert.equal((await api('/auth/me')).status, 401);
    cookie = undefined;
  } finally {
    if (requestId !== undefined) {
      try {
        await api(
          `/requests/${requestId}/status`,
          jsonOptions('PATCH', { status: 'OPEN' }),
        );
        await api(`/requests/${requestId}`, { method: 'DELETE' });
      } catch {
        // A falha original do teste é mais útil que uma falha na limpeza.
      }
    }
    if (cookie) {
      await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    }
  }
});
