import 'reflect-metadata';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { useExpressServer } from 'routing-controllers';
import { DataSource } from 'typeorm';
import { config } from '../config';
import { Call } from './models/CallModel';
import { CallController } from './controllers/CallController';
import { CallService } from './services/CallService';
import cors from 'cors';
import { register } from './metrics';
import { runMigrations } from './database/migrations';

// Создаем подключение к базе данных
const dataSource = new DataSource({
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password||"",
  database: config.database.database,
  entities: [Call],
  synchronize: false, // Отключаем автоматическую синхронизацию, так как используем миграции
  logging: true
});

// Инициализируем Express приложение
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Настраиваем CORS
app.use(cors());

// Настраиваем middleware
app.use(express.json());

// Инициализируем сервисы
const callService = new CallService(dataSource, io);

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.status(200).json({ status: 'ok' });
});

// Эндпоинт для метрик Prometheus
app.get('/metrics', async (req: express.Request, res: express.Response) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

// Настраиваем WebSocket соединения
io.on('connection', (socket: any) => {
  console.log('Client connected:', socket.id);

  // Присоединяем пользователя к его персональной комнате
  socket.on('join', (userId: string) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });

  // Обработка отключения
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Настраиваем контроллеры
useExpressServer(app, {
  controllers: [CallController],
  routePrefix: '/api/v1',
  defaultErrorHandler: false
});

// Запускаем сервер
const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    // Выполняем миграции
    await runMigrations();
    console.log('Database migrations completed');

    // Подключаемся к базе данных через TypeORM
    await dataSource.initialize();
    console.log('Database connection initialized');

    // Запускаем HTTP сервер
    httpServer.listen(PORT, () => {
      console.log(`Call service is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Обработка завершения работы
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received. Closing HTTP server...');
  try {
    await dataSource.destroy();
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});

bootstrap(); 