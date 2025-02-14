import dotenv from 'dotenv';

// Загружаем .env файл
dotenv.config();

interface Config {
  port: number;
  wsPort: number;
  nodeEnv: string;
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string | null;
  };
  redis: {
    host: string;
    port: number;
    password: string | null;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  kafka: {
    brokers: string[];
    clientId: string;
    groupId: string;
  };
  cors: {
    origin: string;
  };
}

// Функция для получения обязательной переменной окружения
const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

// Функция для получения опциональной переменной окружения
const optionalEnv = (key: string, defaultValue: string = ''): string => {
  return process.env[key] || defaultValue;
};

export const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  wsPort: parseInt(process.env.WS_PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'calls',
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || null,
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || null,
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: 'call-service',
    groupId: 'call-service-group'
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || '*'
  }
}; 