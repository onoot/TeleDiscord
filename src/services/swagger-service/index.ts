import express, { Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import cors from 'cors';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

const app = express();
const port = 80;

app.use(cors());

// Загрузка конфигураций Swagger
const loadYamlFile = (filePath: string) => {
  try {
    return yaml.load(fs.readFileSync(filePath, 'utf8')) as Record<string, any>;
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
    return null;
  }
};

const userServiceSpec = loadYamlFile('/etc/swagger-docs/user-service.yaml');
const messageServiceSpec = loadYamlFile('/etc/swagger-docs/message-service.yaml');
const callServiceSpec = loadYamlFile('/etc/swagger-docs/call-service.yaml');
const channelServiceSpec = loadYamlFile('/etc/swagger-docs/channel-service.yaml');
const notificationServiceSpec = loadYamlFile('/etc/swagger-docs/notification-service.yaml');

if (!userServiceSpec || !messageServiceSpec || !callServiceSpec || !channelServiceSpec || !notificationServiceSpec) {
  console.error('Failed to load one or more Swagger specifications');
  process.exit(1);
}

// Объединяем спецификации
const combinedSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Messenger API Documentation',
    version: '1.0.1',
    description: 'Единая документация API сервисов обмена сообщениями'
  },
  servers: [
    {
      url: 'http://localhost',
      description: 'API сервисов'
    }
  ],
  tags: [
    {
      name: 'Пользователи v1',
      description: 'Методы для работы с пользователями'
    },
    {
      name: 'Сообщения v1',
      description: 'Методы для работы с сообщениями'
    },
    {
      name: 'Звонки v1',
      description: 'Методы для работы с видео и аудио звонками'
    },
    {
      name: 'Каналы v1',
      description: 'Методы для работы с каналами и серверами'
    },
    {
      name: 'Уведомления v1',
      description: 'Методы для работы с уведомлениями'
    }
  ],
  paths: {
    ...userServiceSpec.paths,
    ...messageServiceSpec.paths,
    ...callServiceSpec.paths,
    ...channelServiceSpec.paths,
    ...notificationServiceSpec.paths
  },
  components: {
    schemas: {
      ...userServiceSpec.components?.schemas,
      ...messageServiceSpec.components?.schemas,
      ...callServiceSpec.components?.schemas,
      ...channelServiceSpec.components?.schemas,
      ...notificationServiceSpec.components?.schemas
    },
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  }
};

// Настройка единого маршрута для документации
app.use('/', swaggerUi.serve);
app.get('/', swaggerUi.setup(combinedSpec, {
  explorer: true,
  customSiteTitle: "Messenger API Documentation"
}));

// Маршрут проверки здоровья
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Swagger UI запущен на порту ${port}`);
  console.log('Документация доступна по URL:');
  console.log(`http://localhost:${port}/`);
}); 