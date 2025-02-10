import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { IMedia } from '../models/Media';
import { R2Storage } from './r2-storage';
import { KafkaProducer } from '../kafka/producer';
import { Express } from 'express';
import { producer } from '../kafka/producer';

export class MediaProcessor {
  private r2Storage: R2Storage;
  private kafkaProducer: KafkaProducer;

  constructor() {
    this.r2Storage = new R2Storage();
    this.kafkaProducer = new KafkaProducer();
  }

  public async process(media: IMedia, file: Express.Multer.File): Promise<void> {
    media.status = 'processing';
    await media.save();

    try {
      switch (media.type) {
        case 'image':
          await this.processImage(media, file);
          break;
        case 'video':
          await this.processVideo(media, file);
          break;
        default:
          // Для документов просто отмечаем как обработанные
          media.status = 'completed';
          await media.save();
          break;
      }
    } catch (error: unknown) {
      media.status = 'failed';
      await media.save();

      if (error instanceof Error) {
        throw new Error(`Failed to process media: ${error.message}`);
      }
      throw new Error('Failed to process media: Unknown error');
    }
  }

  private async processImage(media: IMedia, file: Express.Multer.File): Promise<void> {
    try {
      const image = sharp(file.buffer);
      const metadata = await image.metadata();

      // Обновляем метаданные
      media.metadata = {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
      };

      // Создаем превью если нужно
      if (metadata.width && metadata.width > 800) {
        await image
          .resize(800)
          .toBuffer();
      }

      media.status = 'completed';
      await media.save();

      // Отправляем событие в Kafka
      await producer.sendMessage({
        eventType: 'media.processed',
        mediaId: media._id,
        userId: media.userId,
        metadata: media.metadata
      });

    } catch (error: unknown) {
      media.status = 'failed';
      await media.save();

      if (error instanceof Error) {
        throw new Error(`Failed to process image: ${error.message}`);
      }
      throw new Error('Failed to process image: Unknown error');
    }
  }

  private async processVideo(media: IMedia, file: Express.Multer.File): Promise<void> {
    try {
      // Здесь будет логика обработки видео
      // Например, извлечение метаданных, создание превью и т.д.
      
      media.status = 'completed';
      await media.save();

      await producer.sendMessage({
        eventType: 'media.processed',
        mediaId: media._id,
        userId: media.userId,
        metadata: media.metadata
      });

    } catch (error: unknown) {
      media.status = 'failed';
      await media.save();

      if (error instanceof Error) {
        throw new Error(`Failed to process video: ${error.message}`);
      }
      throw new Error('Failed to process video: Unknown error');
    }
  }
}

export const mediaProcessor = new MediaProcessor(); 