import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Логируем входящий запрос
  console.log('=== Incoming Request ===');
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(filterSensitiveHeaders(req.headers), null, 2));
  console.log('Query:', JSON.stringify(req.query, null, 2));
  console.log('Body:', JSON.stringify(filterSensitiveData(req.body), null, 2));
  console.log('=====================');

  // Перехватываем отправку ответа для логирования
  const originalSend = res.send;
  res.send = function(data: any) {
    const responseTime = Date.now() - startTime;
    
    console.log('=== Outgoing Response ===');
    console.log(`Response Time: ${responseTime}ms`);
    console.log('Status:', res.statusCode);
    console.log('Headers:', JSON.stringify(res.getHeaders(), null, 2));
    
    // Логируем тело ответа, если это не бинарные данные
    if (typeof data === 'string' || Buffer.isBuffer(data)) {
      try {
        const body = JSON.parse(data.toString());
        console.log('Body:', JSON.stringify(filterSensitiveData(body), null, 2));
      } catch {
        console.log('Body: [Binary or non-JSON data]');
      }
    }
    
    console.log('=====================');
    return originalSend.call(res, data);
  };

  next();
};

// Функция для фильтрации чувствительных данных
function filterSensitiveData(data: any): any {
  if (!data) return data;
  
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];
  const filtered = { ...data };

  for (const field of sensitiveFields) {
    if (field in filtered) {
      filtered[field] = '[FILTERED]';
    }
  }

  return filtered;
}

// Функция для фильтрации чувствительных заголовков
function filterSensitiveHeaders(headers: any): any {
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
  const filtered = { ...headers };

  for (const header of sensitiveHeaders) {
    if (header in filtered) {
      filtered[header] = '[FILTERED]';
    }
  }

  return filtered;
} 