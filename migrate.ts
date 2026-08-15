import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  // Create a connection
  const sql = postgres(connectionString, { max: 1 });

  try {
    console.log('Dropping conflicting tables...');
    await sql`DROP TABLE IF EXISTS "orders" CASCADE;`;
    await sql`DROP TABLE IF EXISTS "strategy_signals" CASCADE;`;
    await sql`DROP TABLE IF EXISTS "ticker_alerts" CASCADE;`;
    await sql`DROP TABLE IF EXISTS "signal_notifications" CASCADE;`;
    await sql`DROP TABLE IF EXISTS "push_subscriptions" CASCADE;`;
    
    console.log('Reading migration file...');
    const migrationFile = path.join(process.cwd(), 'src/db/migrations/0000_curly_viper.sql');
    const sqlContent = fs.readFileSync(migrationFile, 'utf8');
    
    // Split by statement breakpoint
    const statements = sqlContent.split('--> statement-breakpoint');
    
    console.log(`Executing ${statements.length} migration statements...`);
    for (const stmt of statements) {
      if (stmt.trim()) {
        await sql.unsafe(stmt);
      }
    }
    
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await sql.end();
  }
}

migrate();
