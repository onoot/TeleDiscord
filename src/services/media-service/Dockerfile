FROM node:18-alpine AS builder

# Установка необходимых пакетов для сборки
RUN apk add --no-cache python3 make g++ gcc libc6-compat vips-dev build-base

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Создаем чистый образ для продакшена
FROM node:18-alpine

# Установка необходимых пакетов для sharp и других зависимостей
RUN apk add --no-cache vips-dev fftw-dev build-base python3 make g++ vips

WORKDIR /app

# Копируем только необходимые файлы
COPY package*.json ./

# Устанавливаем только production зависимости с пропуском сборки sharp
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1
RUN npm install --omit=dev

# Копируем собранные файлы из builder
COPY --from=builder /app/dist ./dist

# Создаем директорию для загрузок
RUN mkdir -p /tmp/uploads && chmod 777 /tmp/uploads

EXPOSE 3000

CMD ["npm", "start"] 