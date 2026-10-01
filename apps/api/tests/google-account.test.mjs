import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { AuthService } from '../dist/auth/auth.service.js';
import { GoogleAccountService } from '../dist/auth/google-account.service.js';

test('cria solicitante pelo sub sem assumir conta local com e-mail igual', async () => {
  const existingAgent = {
    id: 'existing-agent',
    username: 'agent@example.com',
    name: 'Atendente',
    role: 'AGENT',
    googleSub: null,
  };
  let googleUser = null;
  let createdUser;
  const sessions = [];
  const prisma = {
    user: {
      async findUnique({ where }) {
        return googleUser?.googleSub === where.googleSub ? googleUser : null;
      },
      async upsert({ where, create }) {
        assert.equal(where.googleSub, 'stable-google-sub');
        createdUser = create;
        googleUser = { ...create, id: 'new-google-user' };
        return googleUser;
      },
    },
    session: {
      async create({ data }) {
        sessions.push(data);
      },
    },
  };
  const auth = new AuthService(prisma);
  const accounts = new GoogleAccountService(prisma, auth);

  const first = await accounts.login({
    sub: 'stable-google-sub',
    email: existingAgent.username,
  });
  assert.equal(first.user.id, 'new-google-user');
  assert.equal(first.user.role, 'REQUESTER');
  assert.equal(createdUser.googleSub, 'stable-google-sub');
  assert.equal(createdUser.role, 'REQUESTER');
  assert.notEqual(createdUser.username, existingAgent.username);
  assert.match(createdUser.passwordHash, /^\$argon2id\$/);
  assert.equal(sessions[0].userId, 'new-google-user');
  assert.equal(
    sessions[0].tokenHash,
    createHash('sha256').update(first.token).digest('hex'),
  );

  const second = await accounts.login({
    sub: 'stable-google-sub',
    email: 'new-address@example.com',
  });
  assert.equal(second.user.id, first.user.id);
  assert.equal(second.user.role, 'REQUESTER');
  assert.equal(second.user.name, existingAgent.username);
  assert.notEqual(second.token, first.token);
  assert.equal(sessions.length, 2);
});

test('preserva perfil de conta local já vinculada ao sub', async () => {
  const agent = {
    id: 'linked-agent',
    username: 'atendente',
    name: 'Atendente',
    role: 'AGENT',
    googleSub: 'linked-sub',
  };
  const prisma = {
    user: {
      async findUnique() {
        return agent;
      },
      async upsert() {
        throw new Error('Não deve criar outro usuário.');
      },
    },
    session: {
      async create({ data }) {
        assert.equal(data.userId, agent.id);
      },
    },
  };

  const result = await new GoogleAccountService(
    prisma,
    new AuthService(prisma),
  ).login({ sub: agent.googleSub, email: 'other@example.com' });
  assert.equal(result.user.role, 'AGENT');
  assert.equal(result.user.username, 'atendente');
});
