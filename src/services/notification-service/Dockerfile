# Build stage
FROM node:18-alpine as builder

# Установка необходимых зависимостей
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# Production stage
FROM node:18-alpine

# Создаем пользователя для запуска приложения
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем только production зависимости
RUN npm ci --only=production

# Копируем собранное приложение из builder stage
COPY --from=builder /app/dist ./dist

# Создаем директорию для логов и устанавливаем права
RUN mkdir -p logs && chown -R app:app logs

# Переключаемся на пользователя app
USER app

# Указываем порт, который будет слушать приложение
EXPOSE 3000

# Запускаем приложение
CMD ["node", "dist/index.js"] 