import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || process.env.COLISDIRECT_DB_NAME || 'colisdirect_db',
  user: process.env.DB_USER || process.env.COLISDIRECT_DB_USER || 'colisdirect',
  password: process.env.DB_PASSWORD || process.env.COLISDIRECT_DB_PASSWORD || 'colisdirect_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

