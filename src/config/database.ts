import pg from 'pg';
import { config } from './index.js';

const { Pool } = pg;

const pool = new Pool(config.db);

pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const query = (text: string, params?: unknown[]) => pool.query(text, params);

export const getClient = () => pool.connect();

export default pool;
