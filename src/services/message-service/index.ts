import express from 'express';
import { config } from 'dotenv';

// Загружаем переменные окружения
config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware для парсинга JSON
app.use(express.json());

// Базовый маршрут для проверки работоспособности
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Запускаем сервер
app.listen(port, () => {
  console.log(`Message service is running on port ${port}`);
}); 