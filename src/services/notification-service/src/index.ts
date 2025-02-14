import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { Kafka } from 'kafkajs';
import cors from 'cors';
import { logger } from './utils/logger';
import { NotificationService } from './services/notification.service';
import { NotificationStore } from './services/notification.store';
import { NotificationController } from './controllers/notification.controller';
import mongoose from 'mongoose';
import { config } from './config';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(express.json());
app.use(cors());

// Kafka setup
const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:29092']
});

const consumer = kafka.consumer({ groupId: 'notification-service-group' });

// Services setup
const notificationStore = new NotificationStore();
const notificationService = new NotificationService(consumer, io, notificationStore);
const notificationController = new NotificationController(notificationStore);

// Routes
app.use(notificationController.getRouter());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    // Подключаемся к MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/notifications', {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      useNewUrlParser: true,
      useUnifiedTopology: true
    } as mongoose.ConnectOptions);
    console.log('Successfully connected to MongoDB');

    // Подключаемся к Kafka
    await consumer.connect();
    await consumer.subscribe({
      topics: ['messages', 'calls', 'channels'],
      fromBeginning: true
    });

    // Запускаем сервис уведомлений
    await notificationService.start();

    // Запускаем HTTP сервер
    httpServer.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
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
    await mongoose.disconnect();
    await consumer.disconnect();
    httpServer.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});

bootstrap(); 