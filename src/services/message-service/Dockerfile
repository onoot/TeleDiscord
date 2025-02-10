FROM node:18-alpine as builder

# Устанавливаем зависимости для сборки
WORKDIR /app
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Копируем файлы package.json и tsconfig.json
COPY package*.json tsconfig.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходные файлы
COPY . .

# Собираем TypeScript
RUN npm run build

# Создаем production образ
FROM node:18-alpine

# Устанавливаем зависимости для production
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Создаем пользователя node и настраиваем права
RUN mkdir -p /app && chown -R node:node /app
WORKDIR /app
USER node

# Копируем файлы package.json и package-lock.json
COPY --from=builder --chown=node:node /app/package*.json ./

# Устанавливаем только production зависимости
RUN npm ci --only=production

# Копируем скомпилированные файлы и конфигурацию
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/config ./config
COPY --from=builder --chown=node:node /app/.env ./.env

# Открываем порты для HTTP и WebSocket
EXPOSE 3000 3001

# Запускаем приложение
CMD ["node", "dist/index.js"] 