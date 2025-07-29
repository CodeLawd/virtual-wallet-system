import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { WebhooksService } from '../webhooks/webhooks.service'; // Import WebhooksService

@Processor('webhooks') // This consumer processes jobs from the 'webhooks' queue
export class WebhooksConsumer extends WorkerHost {
  private readonly logger = new Logger(WebhooksConsumer.name);

  constructor(private readonly webhooksService: WebhooksService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(
      `Processing job ${job.id} of type ${job.name} with data: ${JSON.stringify(job.data)}`,
    );

    switch (job.name) {
      case 'process-webhook':
        const { webhookEventId, tenantId, provider, payload } = job.data; // Destructure webhookEventId
        // Call the actual processing logic in WebhooksService
        return this.webhooksService.processWebhookPayload(
          webhookEventId,
          tenantId,
          provider,
          payload,
        );
      case 'replay-webhook':
        const {
          webhookEventId: replayWebhookEventId,
          tenantId: replayTenantId,
        } = job.data;
        // Call the actual replay logic in WebhooksService
        return this.webhooksService.replayWebhookEventInternal(
          replayWebhookEventId,
          replayTenantId,
        );
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
        throw new Error(`Unknown job type: ${job.name}`);
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(
      `Job ${job.id} completed. Result: ${JSON.stringify(job.returnvalue)}`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(
      `Job ${job.id} failed with error: ${err.message}`,
      err.stack,
    );
  }
}
