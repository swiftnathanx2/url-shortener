import { ENV } from '#src/config/env.js';
import pg from 'pg';

export const pool = new pg.Pool({
  connectionString: ENV.DATABASE_URL,
});

export const query = (text, params) => pool.query(text, params);
