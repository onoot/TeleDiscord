import * as k8s from '@kubernetes/client-node';
import { Pool } from 'pg';
import { createClient } from 'redis';
import { config } from './config';

// Создаем пул подключений к PostgreSQL
const pool = new Pool(config.postgres);

// Создаем клиент Redis
const redisClient = createClient({
  url: config.redis.url
});

redisClient.on('error', (err: Error) => console.error('Redis Client Error', err));

// SQL для создания таблицы
const createTableSQL = `
CREATE TABLE IF NOT EXISTS servers (
  id SERIAL PRIMARY KEY,
  service_name VARCHAR(255) NOT NULL UNIQUE,
  ip VARCHAR(255) NOT NULL,
  ports JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

// Функция для инициализации базы данных
const initializeDatabase = async () => {
  try {
    await pool.query(createTableSQL);
    await redisClient.connect();
    console.log('Database and Redis initialized');
  } catch (error) {
    console.error('Initialization error:', error);
    process.exit(1);
  }
};

// Функция для получения информации о сервисе балансировщика
const getLoadBalancerInfo = async () => {
  try {
    // Сначала пробуем получить данные из Redis
    const cachedData = await redisClient.get('loadbalancer:traefik');
    if (cachedData) {
      console.log('Retrieved from cache');
      return JSON.parse(cachedData);
    }

    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

    const response = await k8sApi.readNamespacedService('traefik', 'default');
    const service = response.body;

    if (service.spec?.type !== 'LoadBalancer') {
      throw new Error('Traefik service is not of type LoadBalancer');
    }

    const ports = service.spec.ports?.map(port => ({
      name: port.name || 'unnamed',
      port: port.port,
      nodePort: port.nodePort,
      protocol: port.protocol
    })) || [];

    const ip = service.status?.loadBalancer?.ingress?.[0]?.ip || 
               service.status?.loadBalancer?.ingress?.[0]?.hostname ||
               'localhost';

    const info = {
      serviceName: 'traefik',
      ip,
      ports
    };

    // Кэшируем данные в Redis
    await redisClient.setEx('loadbalancer:traefik', config.redis.ttl, JSON.stringify(info));
    console.log('Cached in Redis');

    return info;
  } catch (error) {
    console.error('Error getting LoadBalancer info:', error);
    throw error;
  }
};

// Функция для обновления информации в базе данных
const updateLoadBalancerInfo = async () => {
  try {
    const info = await getLoadBalancerInfo();
    const result = await pool.query(
      `
      INSERT INTO servers (service_name, ip, ports, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (service_name)
      DO UPDATE SET
        ip = EXCLUDED.ip,
        ports = EXCLUDED.ports,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
      `,
      [info.serviceName, info.ip, JSON.stringify(info.ports)]
    );
    console.log('LoadBalancer info updated in database:', result.rows[0]);
  } catch (error) {
    console.error('Error updating LoadBalancer info:', error);
  }
};

// Функция очистки при завершении
const cleanup = async () => {
  await pool.end();
  await redisClient.quit();
};

// Основная функция
const main = async () => {
  try {
    console.log('Starting with configuration:', {
      postgresHost: config.postgres.host,
      redisUrl: config.redis.url,
      redisTtl: config.redis.ttl,
      updateInterval: config.app.updateInterval
    });

    await initializeDatabase();
    
    // Первоначальное обновление
    await updateLoadBalancerInfo();
    
    // Периодическое обновление
    const interval = setInterval(updateLoadBalancerInfo, config.app.updateInterval);

    // Обработка завершения
    process.on('SIGTERM', async () => {
      clearInterval(interval);
      await cleanup();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      clearInterval(interval);
      await cleanup();
      process.exit(0);
    });
  } catch (error) {
    console.error('Application error:', error);
    await cleanup();
    process.exit(1);
  }
};

// Запуск приложения
main(); 