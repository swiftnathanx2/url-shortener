import { config } from 'dotenv';
import { z } from 'zod';

const mode = process.env.NODE_ENV ?? 'development';

config({ path: [`.env.${mode}`, `.env`] });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'verbose', 'debug', 'silly']).default('info'),
  DATABASE_URL: z.url('Please set DATABASE_URL'),
});

export const ENV = envSchema.parse(process.env);
