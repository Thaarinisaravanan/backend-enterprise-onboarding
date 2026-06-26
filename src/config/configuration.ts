export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  appVersion: process.env.APP_VERSION ?? '1.0.0',

  database: {
    url: process.env.DATABASE_URL,
    testUrl: process.env.DATABASE_TEST_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiration: process.env.JWT_EXPIRATION ?? '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION ?? '7d',
  },

  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD ?? undefined,
  },

  bull: {
    lowStockQueue: process.env.BULL_QUEUE_LOW_STOCK ?? 'low-stock-alerts',
  },

  inventory: {
    lowStockThreshold: parseInt(process.env.LOW_STOCK_THRESHOLD ?? '10', 10),
  },

  cache: {
    ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS ?? '60', 10),
  },

  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
  },
});
