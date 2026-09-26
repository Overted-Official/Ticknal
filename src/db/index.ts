import './fs-patch';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import * as schema from './schema';

dotenv.config({ path: '.env.local' });

const useLocalDb = process.env.USE_LOCAL_DB === 'true';

type PostgresClient = ReturnType<typeof postgres>;

const globalForDb = globalThis as typeof globalThis & {
  drizzleDbInstance?: any;
  postgresClient?: PostgresClient;
  pgliteClient?: PGlite;
};

function normalizeDb<T>(instance: T): T {
  const origExecute = (instance as any).execute.bind(instance);
  (instance as any).execute = (query: any) => {
    const raw = origExecute(query);
    const origRawExecute = raw.execute ? raw.execute.bind(raw) : null;
    if (origRawExecute) {
      raw.execute = async (placeholderValues?: any) => {
        const result = await origRawExecute(placeholderValues);
        if (result && !Array.isArray(result) && Array.isArray((result as any).rows)) {
          const rows = (result as any).rows;
          (rows as any).affectedRows = (result as any).affectedRows;
          (rows as any).fields = (result as any).fields;
          (rows as any).rows = rows;
          return rows;
        }
        if (Array.isArray(result) && !(result as any).rows) {
          (result as any).rows = result;
        }
        return result;
      };
    }
    const origThen = raw.then.bind(raw);
    raw.then = (onfulfilled?: any, onrejected?: any) => {
      return origThen((result: any) => {
        let finalResult = result;
        if (result && !Array.isArray(result) && Array.isArray((result as any).rows)) {
          finalResult = (result as any).rows;
          finalResult.affectedRows = (result as any).affectedRows;
          finalResult.fields = (result as any).fields;
          finalResult.rows = finalResult;
        } else if (Array.isArray(result) && !(result as any).rows) {
          (result as any).rows = result;
        }
        return onfulfilled ? onfulfilled(finalResult) : finalResult;
      }, onrejected);
    };
    return raw;
  };
  return instance;
}

function createDbInstance() {
  if (globalForDb.drizzleDbInstance) {
    return globalForDb.drizzleDbInstance;
  }

  // 1. Local Offline Mode (Zero Supabase Egress)
  if (useLocalDb) {
    const isBuildPhase =
      process.env.NEXT_PHASE === 'phase-production-build' ||
      process.env.npm_lifecycle_event === 'build';

    let pglite: PGlite;
    if (isBuildPhase) {
      // In-memory PGlite for build-time static evaluation (prevents multi-worker file locks and WAL corruption)
      pglite = globalForDb.pgliteClient ?? new PGlite();
    } else {
      const dataDir = path.resolve(process.cwd(), '.local_pgdata');
      const pidFile = path.join(dataDir, 'postmaster.pid');
      const ownerFile = path.join(dataDir, '.node_owner.pid');

      let isAnotherNodeOwnerRunning = false;
      if (fs.existsSync(ownerFile)) {
        try {
          const ownerPid = parseInt(fs.readFileSync(ownerFile, 'utf8').trim(), 10);
          if (!isNaN(ownerPid) && ownerPid !== process.pid) {
            try {
              process.kill(ownerPid, 0);
              isAnotherNodeOwnerRunning = true;
            } catch {
              // Owner process is dead
              isAnotherNodeOwnerRunning = false;
            }
          }
        } catch {}
      }

      if (isAnotherNodeOwnerRunning && !globalForDb.pgliteClient) {
        // Another active Node worker already holds exclusive lock on .local_pgdata.
        // Fall back to in-memory PGlite for this worker to prevent multi-process WAL corruption.
        pglite = new PGlite();
      } else {
        if (!isAnotherNodeOwnerRunning && fs.existsSync(pidFile) && !globalForDb.pgliteClient) {
          try {
            fs.unlinkSync(pidFile);
          } catch {}
        }
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        try {
          fs.writeFileSync(ownerFile, String(process.pid), 'utf8');
        } catch {}

        pglite = globalForDb.pgliteClient ?? new PGlite(dataDir);
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      globalForDb.pgliteClient = pglite;
    }

    // Graceful shutdown: write clean Postgres checkpoint on exit to prevent WAL corruption
    if (typeof process !== 'undefined' && typeof (process as any).on === 'function') {
      const closeClient = async () => {
        if (globalForDb.pgliteClient) {
          try {
            await globalForDb.pgliteClient.close();
          } catch {}
        }
        try {
          const dataDir = path.resolve(process.cwd(), '.local_pgdata');
          const ownerFile = path.join(dataDir, '.node_owner.pid');
          if (fs.existsSync(ownerFile)) {
            const ownerPid = parseInt(fs.readFileSync(ownerFile, 'utf8').trim(), 10);
            if (ownerPid === process.pid) {
              fs.unlinkSync(ownerFile);
            }
          }
        } catch {}
      };
      process.once('SIGINT', closeClient);
      process.once('SIGTERM', closeClient);
      process.once('beforeExit', closeClient);
    }

    // Ensure self-healing bootstrap for core runtime tables
    if (!isBuildPhase) {
      pglite.waitReady
        .then(() => {
          pglite
            .exec(`
              CREATE TABLE IF NOT EXISTS public.profiles (
                id UUID PRIMARY KEY,
                email VARCHAR(255),
                full_name TEXT,
                avatar_url TEXT,
                role VARCHAR(50) DEFAULT 'user' NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
              );
              CREATE TABLE IF NOT EXISTS public.ticker_alerts (
                id SERIAL PRIMARY KEY,
                user_id UUID NOT NULL,
                ticker_symbol VARCHAR(20) NOT NULL,
                enabled BOOLEAN DEFAULT true NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
              );
            `)
            .catch(() => {});
        })
        .catch((err) => {
          console.warn('[db] Warning: PGlite waitReady failed:', err?.message || err);
        });
    }

    const instance = normalizeDb(drizzlePglite(pglite, { schema }));
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
      idle_timeout: 15,
      connect_timeout: 10,
      max_lifetime: 60 * 15,
    });

  if (process.env.NODE_ENV !== 'production') {
    globalForDb.postgresClient = client;
  }

  const instance = normalizeDb(drizzlePostgres(client, { schema }));
  if (process.env.NODE_ENV !== 'production') {
    globalForDb.drizzleDbInstance = instance;
  }
  return instance;
}

export const db = createDbInstance() as ReturnType<typeof drizzlePostgres<typeof schema>>;
export { schema };

