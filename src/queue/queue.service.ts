import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  private readonly webhooksQueue: Queue;

  constructor() {
    this.webhooksQueue = new Queue('webhooks');
  } // Inject the queue

  async addWebhookProcessingJob(
    webhookEventId: string,
    tenantId: string,
    provider: string,
    payload: Record<string, any>,
  ) {
    try {
      await this.webhooksQueue.add(
        'process-webhook', // Job name
        { webhookEventId, tenantId, provider, payload }, // Pass webhookEventId
        {
          attempts: 3, // Retry failed jobs up to 3 times
          backoff: {
            type: 'exponential',
            delay: 1000, // Initial delay of 1 second
          },
          removeOnComplete: true, // Remove job from queue when completed
          removeOnFail: false, // Keep failed jobs for inspection
        },
      );
      this.logger.log(
        `Webhook processing job added to queue for event ID ${webhookEventId}.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to add webhook processing job: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async addWebhookReplayJob(webhookEventId: string, tenantId: string) {
    try {
      await this.webhooksQueue.add(
        'replay-webhook', // Job name
        { webhookEventId, tenantId },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
      this.logger.log(
        `Webhook replay job added to queue for event ID ${webhookEventId}.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to add webhook replay job: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
