import { pool } from './connection';
import fs from 'fs';
import path from 'path';

// Retry wrapper for Docker macOS VirtioFS which can return EAGAIN (-35) on file reads
async function readFileRetry(filePath: string, retries = 8, delayMs = 150): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fs.promises.readFile(filePath, 'utf-8');
    } catch (err: any) {
      const isEagain = err.errno === -35 || (err.code || '').includes('-35') || err.code === 'EAGAIN';
      if (isEagain && i < retries - 1) {
        await new Promise(r => setTimeout(r, delayMs * (i + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Cannot read file after ${retries} attempts: ${filePath}`);
}

interface MigrationRecord {
  filename: string;
  executed_at: Date;
}

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function getExecutedMigrations(): Promise<string[]> {
  const result = await pool.query<MigrationRecord>('SELECT filename FROM migrations ORDER BY filename');
  return result.rows.map(row => row.filename);
}

async function recordMigration(filename: string) {
  await pool.query('INSERT INTO migrations (filename) VALUES ($1)', [filename]);
}

async function executeMigration(sql: string, filename: string) {
  console.log(`  → Executing migration: ${filename}`);
  try {
    // Execute migration in a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await recordMigration(filename);
      await client.query('COMMIT');
      console.log(`  ✅ Migration ${filename} completed`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    // Some migrations might have IF NOT EXISTS clauses, so check if it's a real error
    const errorMsg = error.message?.toLowerCase() || '';
    const isNonCriticalError = 
      errorMsg.includes('already exists') ||
      errorMsg.includes('duplicate key') ||
      errorMsg.includes('does not exist') ||
      errorMsg.includes('relation') && errorMsg.includes('already exists');
    
    if (isNonCriticalError) {
      console.log(`  ⚠️  Migration ${filename} had non-critical error (may already be applied): ${error.message}`);
      // Record it anyway to avoid future attempts
      try {
        await recordMigration(filename);
      } catch {
        // Ignore if already recorded
      }
    } else {
      console.error(`  ❌ Migration ${filename} failed:`, error.message);
      throw error;
    }
  }
}

async function migrate() {
  try {
    console.log('🔄 Running database migrations...');
    
    // Ensure migrations table exists
    await ensureMigrationsTable();
    
    // Get already executed migrations
    const executedMigrations = await getExecutedMigrations();
    console.log(`  Found ${executedMigrations.length} already executed migrations`);
    
    // Prioritise /tmp/migrations (copié au démarrage, hors volume Docker macOS)
    // pour éviter les erreurs -35 (EAGAIN) sur virtiofs
    let migrationsDir = '/tmp/migrations';
    if (!fs.existsSync(migrationsDir)) {
      migrationsDir = '/app/database/migrations';
    }
    if (!fs.existsSync(migrationsDir)) {
      migrationsDir = path.join(__dirname, '../../../database/migrations');
    }
    
    // Check if migrations directory exists
    if (!fs.existsSync(migrationsDir)) {
      console.log('  ⚠️  Migrations directory not found, skipping');
      return;
    }
    
    // Read all SQL files from migrations directory
    const allFiles = await fs.promises.readdir(migrationsDir);
    const files = allFiles
      .filter(file => file.endsWith('.sql'))
      .sort(); // Execute in alphabetical order (timestamp prefix ensures correct order)
    
    if (files.length === 0) {
      console.log('  ℹ️  No migration files found');
      return;
    }
    
    console.log(`  Found ${files.length} migration file(s)`);
    
    // Execute pending migrations
    let executedCount = 0;
    for (const file of files) {
      if (executedMigrations.includes(file)) {
        console.log(`  ⏭️  Skipping already executed: ${file}`);
        continue;
      }
      
      const filePath = path.join(migrationsDir, file);
      const sql = await readFileRetry(filePath);
      
      await executeMigration(sql, file);
      executedCount++;
    }
    
    if (executedCount === 0) {
      console.log('  ✅ All migrations are up to date');
    } else {
      console.log(`  ✅ Executed ${executedCount} new migration(s)`);
    }
    
    console.log('✅ Database migrations completed successfully');
  } catch (error: any) {
    console.error('❌ Migration error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Don't close the pool here for library usage
export { migrate };

if (require.main === module) {
  migrate()
    .catch((error) => {
      console.error('❌ Migration CLI failed:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      try {
        await pool.end();
      } catch (err) {
        console.error('Error closing DB pool after migrations:', err);
      }
    });
}
