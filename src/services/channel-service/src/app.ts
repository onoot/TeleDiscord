import 'reflect-metadata';
import express from 'express';
import { useExpressServer } from 'routing-controllers';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import { DataSource } from 'typeorm';
import { Server, Channel, Role, User } from './models/channel.model';
import { ServerController } from './controllers/channel.controller';
import { authMiddleware } from './middleware/auth';

export class App {
  public app: express.Application;
  public server: any;
  public io: SocketServer;
  public port: number;
  private dataSource: DataSource;

  constructor(port: number) {
    this.app = express();
    this.port = port;
    this.server = createServer(this.app);
    this.io = new SocketServer(this.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    this.initializeDataSource();
    this.initializeMiddlewares();
    this.initializeControllers();
    this.initializeWebSockets();
  }

  private async initializeDataSource() {
    // Разделяем хост и порт из строки подключения
    const [host] = (process.env.POSTGRES_HOST || 'localhost').split(':');
    
    this.dataSource = new DataSource({
      type: 'postgres',
      host: host,
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      username: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || '',
      database: process.env.POSTGRES_DB || 'postgres',
      entities: [Server, Channel, Role, User],
      synchronize: false,
      migrations: [__dirname + '/migrations/*.{js,ts}'],
      migrationsRun: true,
      logging: process.env.NODE_ENV !== 'production'
    });

    try {
      await this.dataSource.initialize();
      console.log('Data Source has been initialized!');
    } catch (error) {
      console.error('Error during Data Source initialization:', error);
      throw error;
    }
  }

  private initializeMiddlewares() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cors());
  }

  private initializeControllers() {
    useExpressServer(this.app, {
      controllers: [ServerController],
      middlewares: [authMiddleware],
      defaultErrorHandler: false,
      routePrefix: '/api/v1'
    });

    // Маршрут проверки здоровья
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });
  }

  private initializeWebSockets() {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Аутентификация сокета
      socket.on('authenticate', async (token: string) => {
        try {
          // Здесь должна быть проверка токена
          const userId = 'test-user-id'; // Заменить на реальную проверку токена
          socket.data.userId = userId;
          console.log(`Socket ${socket.id} authenticated as user ${userId}`);
        } catch (error) {
          socket.disconnect();
        }
      });

      // Присоединение к комнате канала
      socket.on('joinChannel', (channelId: string) => {
        if (socket.data.userId) {
          socket.join(`channel:${channelId}`);
          console.log(`User ${socket.data.userId} joined channel ${channelId}`);
        }
      });

      // Покидание комнаты канала
      socket.on('leaveChannel', (channelId: string) => {
        socket.leave(`channel:${channelId}`);
        console.log(`User ${socket.data.userId} left channel ${channelId}`);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  public listen() {
    this.server.listen(this.port, () => {
      console.log(`Server is running on port ${this.port}`);
    });
  }
} 