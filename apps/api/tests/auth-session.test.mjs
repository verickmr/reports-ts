import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { AuthService } from '../dist/auth/auth.service.js';

test('remove sessões vencidas ao criar uma nova e preserva as ativas', async () => {
  const sessions = [
    { tokenHash: 'expired', expiresAt: new Date(Date.now() - 60_000) },
    { tokenHash: 'active', expiresAt: new Date(Date.now() + 60_000) },
  ];
  const prisma = {
    session: {
      async deleteMany({ where }) {
        assert.deepEqual(Object.keys(where), ['expiresAt']);
        const expired = sessions.filter(
          (session) => session.expiresAt <= where.expiresAt.lte,
        );
        for (const session of expired)
          sessions.splice(sessions.indexOf(session), 1);
        return { count: expired.length };
      },
      async create({ data }) {
        sessions.push(data);
      },
    },
  };
  const user = {
    id: 'user-id',
    username: 'solicitante',
    name: 'Solicitante',
    role: 'REQUESTER',
  };

  const { token, user: sessionUser } = await new AuthService(
    prisma,
  ).createSession(user);

  assert.deepEqual(sessionUser, user);
  assert.equal(sessions.length, 2);
  assert.equal(sessions[0].tokenHash, 'active');
  assert.equal(sessions[1].userId, user.id);
  assert.equal(
    sessions[1].tokenHash,
    createHash('sha256').update(token).digest('hex'),
  );
  assert.ok(sessions[1].expiresAt > new Date());
});
