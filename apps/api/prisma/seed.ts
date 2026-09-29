import 'dotenv/config';
import argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole } from '../src/generated/prisma/client.js';

const categories = [
  { slug: 'ti', name: 'TI' },
  { slug: 'rh', name: 'RH' },
  { slug: 'compras', name: 'Compras' },
  { slug: 'financeiro', name: 'Financeiro' },
  { slug: 'infraestrutura', name: 'Infraestrutura' },
] as const;

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'O seed de demonstração não pode ser executado em produção.',
    );
  }

  const connectionString = process.env.DATABASE_URL;
  const requesterPassword = process.env.DEMO_REQUESTER_PASSWORD;
  const agentPassword = process.env.DEMO_AGENT_PASSWORD;
  if (!connectionString || !requesterPassword || !agentPassword) {
    throw new Error(
      'Defina DATABASE_URL e as duas senhas DEMO_* antes do seed.',
    );
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    for (const category of categories) {
      await prisma.category.upsert({
        where: { slug: category.slug },
        create: category,
        update: { name: category.name },
      });
    }

    const users = [
      {
        username: 'solicitante',
        name: 'Solicitante de Demonstração',
        role: UserRole.REQUESTER,
        password: requesterPassword,
      },
      {
        username: 'atendente',
        name: 'Atendente de Demonstração',
        role: UserRole.AGENT,
        password: agentPassword,
      },
    ];

    for (const user of users) {
      const existing = await prisma.user.findUnique({
        where: { username: user.username },
        select: { passwordHash: true },
      });
      const passwordHash =
        existing && (await argon2.verify(existing.passwordHash, user.password))
          ? existing.passwordHash
          : await argon2.hash(user.password, { type: argon2.argon2id });
      await prisma.user.upsert({
        where: { username: user.username },
        create: {
          username: user.username,
          name: user.name,
          role: user.role,
          passwordHash,
        },
        update: {
          name: user.name,
          role: user.role,
          passwordHash,
        },
      });
    }

    console.log('Categorias e usuários de demonstração preparados.');
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
