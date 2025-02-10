# Этап сборки
FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY index.ts ./
COPY tsconfig.json ./

RUN npm run build

# Этап production
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 80

CMD ["node", "dist/index.js"]