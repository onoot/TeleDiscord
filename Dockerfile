FROM node:18-alpine as builder

# Установка необходимых пакетов для сборки
RUN apk add --no-cache \
    make \
    g++ \
    gcc \
    libc6-compat \
    build-base \
    linux-headers \
    git \
    bash \
    musl-dev \
    curl

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache curl

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

EXPOSE 3000
CMD ["node", "./dist/services/user-service/index.js"] 