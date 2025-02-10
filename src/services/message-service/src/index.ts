import 'reflect-metadata';
import express from 'express';
import { config } from '../config';
import { setupRoutes } from './routes';
import { connectToMongoDB } from './database';
import cors from 'cors';

async function bootstrap() {
  try {
    // Подключаемся к MongoDB
    await connectToMongoDB();
    console.log('Successfully connected to MongoDB');

    // Создаем Express приложение
    const app = express();

    // Настраиваем middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cors({
      origin: config.cors.origin,
      credentials: config.cors.credentials,
      methods: config.cors.methods
    }));

    // Настраиваем маршруты
    const router = express.Router();
    setupRoutes(router);
    app.use(router);

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'ok' });
    });

    // Запускаем сервер
    app.listen(config.port, () => {
      console.log(`Server is running on port ${config.port}`);
    });

  } catch (error) {
    console.error('Failed to start the application:', error);
    process.exit(1);
  }
}

bootstrap(); 