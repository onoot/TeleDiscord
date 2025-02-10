import 'reflect-metadata';
import express from 'express';
import { useExpressServer } from 'routing-controllers';
import multer from 'multer';
import mongoose from 'mongoose';
import { producer } from '../kafka/producer';
import { redisClient } from '../redis/client';
import { MediaController } from '../controllers/MediaController';

// Настройка multer для обработки файлов
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

// Создаем Express приложение
const app = express();

// Подключаем middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Настраиваем routing-controllers
useExpressServer(app, {
  controllers: [MediaController],
  middlewares: [],
  defaultErrorHandler: false
});

// Обработка ошибок
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

// Подключаемся к MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/media-service')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Подключаемся к Kafka и Redis
Promise.all([
  producer.connect(),
  redisClient.connect()
])
  .then(() => {
    // Запускаем сервер
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`Media service is running on port ${port}`);
    });
  })
  .catch(err => {
    console.error('Failed to connect to services:', err);
    process.exit(1);
  }); 