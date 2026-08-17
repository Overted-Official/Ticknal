import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

type PostgresClient = ReturnType<typeof postgres>;

const globalForPostgres = globalThis as typeof globalThis & {
  postgresClient?: PostgresClient;
};

// Reuse the same small pool across Next dev reloads; session-mode databases
// otherwise accumulate pools until they reject metrics/signals requests.
const client =
  globalForPostgres.postgresClient ??
  postgres(connectionString, {
    prepare: false,
    max: Number(process.env.POSTGRES_POOL_SIZE ?? 10),
    idle_timeout: 30,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPostgres.postgresClient = client;
}

export const db = drizzle(client, { schema });
