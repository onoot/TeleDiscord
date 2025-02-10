export const config = {
  postgres: {
    host: process.env.POSTGRES_HOST || '127.0.0.1',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'messenger',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres'
  },
  redis: {
    url: process.env.REDIS_URL || `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    ttl: parseInt(process.env.REDIS_CACHE_TTL || '60') // время жизни кэша в секундах
  },
  app: {
    updateInterval: parseInt(process.env.UPDATE_INTERVAL || '30000') // интервал обновления в миллисекундах
  }
}; 