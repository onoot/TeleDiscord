import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://mongodb:27017/messenger',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },
  kafka: {
    broker: process.env.KAFKA_BROKER || 'kafka-service:9092',
    clientId: 'notification-service',
    groupId: 'notification-service-group'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret'
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  }
}; 