import express, { Request, Response } from 'express';
import cors from 'cors';
import { json } from 'body-parser';

const app = express();

// Middleware
app.use(cors());
app.use(json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

export default app; 