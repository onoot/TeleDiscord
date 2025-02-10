# Мессенджер на Микросервисной Архитектуре

Современный мессенджер, построенный на микросервисной архитектуре с использованием Node.js, TypeScript, MongoDB, PostgreSQL и других современных технологий.

## Основные Функции

- Обмен сообщениями в реальном времени
- Голосовые и видео звонки через WebRTC
- Обмен фото и голосовыми сообщениями
- Создание групп и каналов
- Система ролей и прав доступа
- Реакции на сообщения
- Система друзей и черный список
- Настройки профиля и каналов

## Технологический Стек

- **Backend**: Node.js, TypeScript
- **Базы Данных**: 
  - MongoDB (для сообщений, медиа)
  - PostgreSQL (для пользователей, отношений)
- **Кэширование**: Redis
- **Очереди Сообщений**: Apache Kafka
- **Хранение Файлов**: Cloudflare R2
- **Контейнеризация**: Docker
- **Оркестрация**: Kubernetes

## Микросервисы

1. Сервис Сообщений
2. Сервис Пользователей
3. Сервис Медиа
4. Сервис Групп и Каналов
5. Сервис Настроек
6. Сервис Уведомлений
7. Сервис Видео/Аудио

## Установка и Запуск

### Предварительные Требования

- Docker и Docker Compose
- Node.js 18+
- Kubernetes кластер (для production)

### Локальная Разработка

1. Клонируйте репозиторий:
   ```bash
   git clone https://github.com/onoot/messenger.git
   cd messenger
   ```

2. Создайте файл .env на основе .env.example:
   ```bash
   cp .env.example .env
   ```

3. Запустите сервисы через Docker Compose:
   ```bash
   docker-compose up -d
   ```

### Production Deployment

1. Соберите Docker образы:
   ```bash
   docker build -t message-service:latest ./src/services/message-service
   docker build -t user-service:latest ./src/services/user-service
   docker build -t media-service:latest ./src/services/media-service
   ```

2. Примените Kubernetes манифесты:
   ```bash
   kubectl apply -f kubernetes/
   ```

## Структура Проекта

```
├── src/
│   ├── services/
│   │   ├── message-service/
│   │   ├── user-service/
│   │   ├── media-service/
│   │   └── ...
│   └── shared/
├── kubernetes/
├── docker-compose.yml
└── README.md
```

## Мониторинг и Логирование

- Prometheus для метрик
- Grafana для визуализации
- ELK Stack для логов

## API Документация

API документация доступна через Swagger UI после запуска сервисов:
- Message Service: http://localhost:3001/api-docs
- User Service: http://localhost:3002/api-docs
- Media Service: http://localhost:3003/api-docs

## Разработка

### Добавление Нового Микросервиса

1. Создайте новую директорию в `src/services/`
2. Скопируйте базовую структуру из существующего сервиса
3. Обновите конфигурацию в docker-compose.yml
4. Создайте Kubernetes манифесты

### Тестирование

```bash
# Запуск тестов для всех сервисов
npm test

# Запуск тестов для конкретного сервиса
cd src/services/message-service && npm test
```

## Безопасность

- JWT для аутентификации
- Rate limiting
- Input validation
- CORS protection
- Secure WebSocket connections

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## Лицензия

MIT 