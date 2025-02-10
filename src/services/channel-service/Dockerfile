# Этап сборки
FROM node:18-alpine as builder

WORKDIR /app

# Устанавливаем необходимые системные зависимости
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Копируем файлы package.json и tsconfig.json
COPY package*.json ./
COPY tsconfig.json ./
COPY .env ./

# Устанавливаем все зависимости
RUN npm install

# Копируем исходный код
COPY src ./src
COPY config ./config

# Собираем TypeScript
RUN npm run build

# Начинаем новый этап сборки
FROM node:18-alpine

# Устанавливаем необходимые системные зависимости
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Создаем пользователя node и настраиваем права
RUN mkdir -p /app && chown -R node:node /app
WORKDIR /app
USER node

# Копируем package.json
COPY --chown=node:node package*.json ./

# Устанавливаем только production зависимости
RUN npm install --omit=dev

# Копируем собранные файлы из предыдущего этапа
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/config ./config
COPY --chown=node:node --from=builder /app/.env ./

# Определяем порт, который будет прослушивать приложение
EXPOSE 3000

# Запускаем приложение
CMD ["node", "dist/index.js"]