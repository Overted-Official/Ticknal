import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import * as schema from './schema';

dotenv.config({ path: '.env.local' });

const useLocalDb = process.env.USE_LOCAL_DB === 'true';

type PostgresClient = ReturnType<typeof postgres>;

const globalForDb = globalThis as typeof globalThis & {
  drizzleDbInstance?: any;
  postgresClient?: PostgresClient;
  pgliteClient?: PGlite;
};

function createDbInstance() {
  if (globalForDb.drizzleDbInstance) {
    return globalForDb.drizzleDbInstance;
  }

  // 1. Local Offline Mode (Zero Supabase Egress)
  if (useLocalDb) {
    const dataDir = path.resolve(process.cwd(), '.local_pgdata');
    const pglite = globalForDb.pgliteClient ?? new PGlite(dataDir);
    if (process.env.NODE_ENV !== 'production') {
      globalForDb.pgliteClient = pglite;
    }
    const instance = drizzlePglite(pglite, { schema });
    if (process.env.NODE_ENV !== 'production') {
      globalForDb.drizzleDbInstance = instance;
    }
    return instance;
  }

  // 2. Production / Cloud Supabase Mode
  const connectionString = process.env.DATABASE_URL!;
  const client =
    globalForDb.postgresClient ??
    postgres(connectionString, {
      prepare: false,
      max: Number(process.env.POSTGRES_POOL_SIZE ?? 10),
      idle_timeout: 30,
    });

  if (process.env.NODE_ENV !== 'production') {
    globalForDb.postgresClient = client;
  }

  const instance = drizzlePostgres(client, { schema });
  if (process.env.NODE_ENV !== 'production') {
    globalForDb.drizzleDbInstance = instance;
  }
  return instance;
}

export const db = createDbInstance() as ReturnType<typeof drizzlePostgres<typeof schema>>;
export { schema };

