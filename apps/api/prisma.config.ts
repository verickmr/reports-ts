import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'pnpm run db:seed:run',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
