import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    status: err.status
  });

  // Обработка ошибок валидации
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 400,
      message: 'Validation Error',
      errors: err.errors
    });
  }

  // Обработка ошибок аутентификации
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      status: 401,
      message: 'Unauthorized'
    });
  }

  // Обработка ошибок базы данных
  if (err.name === 'DatabaseError') {
    return res.status(503).json({
      status: 503,
      message: 'Database Error'
    });
  }

  // Общая обработка ошибок
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    status,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}; 