FROM node:18-alpine as builder

WORKDIR /app

RUN apk add --no-cache \
    python3 \
    make \
    g++

COPY package*.json tsconfig.json ./

RUN npm install

COPY . .

RUN npm run build

FROM node:18-alpine

RUN apk add --no-cache \
    python3 \
    make \
    g++

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

CMD ["npm", "start"] 