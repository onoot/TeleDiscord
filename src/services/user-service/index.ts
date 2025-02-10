import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './src/utils/init-db';

// Инициализируем базу данных
initializeDatabase()
  .then(() => console.log('Database initialized successfully'))
  .catch(err => console.error('Database initialization error:', err));

const app = express();
const port = process.env.PORT || 3000;

// Создаем маршрутизатор для API
const apiRouter = express.Router();

// Настраиваем CORS
app.use(cors());

// Middleware для парсинга JSON
app.use(express.json());

// Middleware для логирования всех запросов
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Маршрут для проверки работоспособности
apiRouter.get('/health', (req, res) => {
  console.log('Health check request received');
  res.status(200).json({ status: 'ok' });
  console.log('Health check response sent');
});

// Подключаем маршрутизатор API
app.use('/api/v1/users', apiRouter);

// Обработчик для всех остальных маршрутов
app.use((req, res) => {
  console.log(`Unhandled route: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Not Found' });
});

// Обработчик ошибок
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Запускаем сервер
app.listen(port, () => {
  console.log(`User service is running on port ${port}`);
}); 