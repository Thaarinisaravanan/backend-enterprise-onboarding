import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_PREFIX: z.string().default('api'),
  APP_VERSION: z.string().default('1.0.0'),

  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),
  DATABASE_TEST_URL: z.string().url().optional(),

  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters for security'),
  JWT_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  BULL_QUEUE_LOW_STOCK: z.string().default('low-stock-alerts'),

  LOW_STOCK_THRESHOLD: z.coerce.number().default(10),
  CACHE_TTL_SECONDS: z.coerce.number().default(60),
  BCRYPT_ROUNDS: z.coerce.number().min(10).max(14).default(12),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.errors
      .map((err) => `  [${err.path.join('.')}] ${err.message}`)
      .join('\n');
    throw new Error(`\n❌ Environment validation failed:\n${errors}\n`);
  }

  return result.data;
}
