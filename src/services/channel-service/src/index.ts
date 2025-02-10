import 'dotenv/config';
import { App } from './app';

const PORT = parseInt(process.env.PORT || '3000', 10);

async function bootstrap() {
  try {
    const app = new App(PORT);
    app.listen();
    
    console.log(`Channel service is running on port ${PORT}`);
    
    // Обработка сигналов завершения
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      console.log('SIGINT signal received: closing HTTP server');
      process.exit(0);
    });
  } catch (error) {
    console.error('Error starting the application:', error);
    process.exit(1);
  }
}

bootstrap(); 