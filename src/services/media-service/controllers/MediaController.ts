import { JsonController, Post, Get, Delete, Param, Body, Req, Res, Middleware } from 'routing-controllers';
import { Request, Response } from 'express';
import { Multer } from 'multer';
import { JwtPayload } from '../middleware/auth';
import { producer } from '../kafka/producer';
import { redisClient } from '../redis/client';
import { Media, IMedia } from '../models/Media';
import { mediaProcessor } from '../services/media-processor';
import { r2Storage } from '../services/r2-storage';

@JsonController('/media')
@Middleware({ type: 'before' })
export class MediaController {
  @Post('/upload')
  async uploadMedia(@Req() req: Request & { user: JwtPayload }, @Res() res: Response): Promise<any> {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const userId = req.user?.id;

      // Загружаем файл в R2
      const uploadResult = await r2Storage.uploadFile(req.file);

      // Создаем запись в базе данных
      const media = await Media.create({
        userId,
        type: req.body.type,
        url: uploadResult.url,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        isPublic: req.body.isPublic || false,
      });

      // Отправляем событие в Kafka
      await producer.sendMessage({
        eventType: 'media.uploaded',
        mediaId: media._id,
        userId,
        mediaType: req.body.type,
      });

      // Если это изображение или видео, запускаем обработку
      if (req.body.type === 'image' || req.body.type === 'video') {
        await mediaProcessor.process(media, req.file);
      }

      return res.status(200).json(media);
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      return res.status(500).json({ message: 'An unknown error occurred' });
    }
  }

  @Get('/:id')
  async getMedia(@Param('id') id: string, @Req() req: Request & { user: JwtPayload }, @Res() res: Response): Promise<any> {
    try {
      const media = await Media.findById(id);

      if (!media) {
        return res.status(404).json({ message: 'Media not found' });
      }

      if (!media.isPublic && media.userId !== req.user?.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      return res.status(200).json(media);
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      return res.status(500).json({ message: 'An unknown error occurred' });
    }
  }

  @Delete('/:id')
  async deleteMedia(@Param('id') id: string, @Req() req: Request & { user: JwtPayload }, @Res() res: Response): Promise<any> {
    try {
      const media = await Media.findById(id);

      if (!media) {
        return res.status(404).json({ message: 'Media not found' });
      }

      if (media.userId !== req.user?.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Удаляем файл из R2
      const key = media.url.split('/').pop();
      if (key) {
        await r2Storage.deleteFile(key);
      }

      // Удаляем запись из базы данных
      await media.deleteOne();

      // Отправляем событие в Kafka
      await producer.sendMessage({
        eventType: 'media.deleted',
        mediaId: media._id,
        userId: media.userId,
      });

      return res.status(200).json({ message: 'Media deleted successfully' });
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      return res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
} 