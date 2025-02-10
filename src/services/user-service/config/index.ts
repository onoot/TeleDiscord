import dotenv from 'dotenv';

// Загружаем .env файл
dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  database: {
    host: string;
    database: string;
    username: string;
    password: string | null;
  };
  redis: {
    host: string;
    port: number;
    password: string | null;
  };
  kafka: {
    brokers: string[];
    clientId: string;
    ssl?: boolean;
    sasl?: {
      mechanism: 'plain';
      username: string;
      password: string;
    };
  };
  jwt: {
    secret: string;
    expiresIn: string;
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
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    host: process.env.POSTGRES_HOST || 'localhost:5432',
    database: process.env.POSTGRES_DB || 'postgres',
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || null,
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || null,
  },
  
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: 'user-service',
    ssl: process.env.KAFKA_SSL === 'true',
    sasl: process.env.KAFKA_SASL_USERNAME && process.env.KAFKA_SASL_PASSWORD
      ? {
          mechanism: 'plain',
          username: process.env.KAFKA_SASL_USERNAME,
          password: process.env.KAFKA_SASL_PASSWORD,
        }
      : undefined,
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
}; 