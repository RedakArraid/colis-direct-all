import { pool } from './connection';

/**
 * Wait for PostgreSQL to be ready
 * Retries connection until successful or max attempts reached
 */
export async function waitForPostgres(maxAttempts = 30, delayMs = 1000): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await pool.query('SELECT 1');
      console.log('✅ PostgreSQL is ready');
      return;
    } catch (error: any) {
      if (attempt === maxAttempts) {
        console.error(`❌ Failed to connect to PostgreSQL after ${maxAttempts} attempts`);
        throw new Error(`PostgreSQL connection failed: ${error.message}`);
      }
      console.log(`⏳ Waiting for PostgreSQL... (attempt ${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

