FROM node:18-alpine AS builder

WORKDIR /app

# Устанавливаем необходимые пакеты для сборки
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Копируем файлы package.json и tsconfig.json
COPY src/services/user-service/package*.json src/services/user-service/tsconfig.json ./

# Устанавливаем все зависимости, включая devDependencies
RUN npm install

# Копируем исходные файлы
COPY src/services/user-service/src ./src
COPY src/services/user-service/config ./config

# Собираем TypeScript
RUN npm run build

# Начинаем новый этап сборки
FROM node:18-alpine

# Устанавливаем зависимости для bcrypt
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Создаем пользователя node и устанавливаем права
RUN mkdir -p /app && chown -R node:node /app

# Переключаемся на пользователя node
USER node

WORKDIR /app

# Копируем package.json и package-lock.json
COPY --chown=node:node src/services/user-service/package*.json ./

# Устанавливаем только production зависимости
RUN npm ci --only=production

# Копируем собранные файлы из предыдущего этапа
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/config ./config

# Открываем порты для HTTP и WebSocket
EXPOSE 3000 3001

# Запускаем приложение
CMD ["node", "dist/src/index.js"] 