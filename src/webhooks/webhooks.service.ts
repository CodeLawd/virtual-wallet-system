import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { WebhookEventStatus } from '../common/enums';
import { TransactionsService } from '../transactions/transactions.service';
import { PaymentProvidersService } from '../payment-providers/payment-providers.service';
import { QueueService } from '../queue/queue.service';
import { VirtualAccountsService } from '../virtual-accounts/virtual-accounts.service'; // Import VirtualAccountsService
import { WebhookEvent } from './entity/webhook-event.entity';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(WebhookEvent)
    private readonly webhookEventsRepository: Repository<WebhookEvent>,
    private readonly transactionsService: TransactionsService,
    private readonly paymentProvidersService: PaymentProvidersService,
    private readonly virtualAccountsService: VirtualAccountsService,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => QueueService))
    private readonly queueService: QueueService,
  ) {}

  async createWebhookEvent(
    tenantId: string,
    provider: string,
    eventType: string,
    payload: Record<string, any>,
    status: WebhookEventStatus,
    entityManager: EntityManager,
    errorMessage?: string,
    relatedTransactionId?: string,
  ): Promise<WebhookEvent> {
    const newWebhookEvent = entityManager.create(WebhookEvent, {
      tenantId,
      provider,
      eventType,
      payload,
      status,
      errorMessage,
      relatedTransactionId,
    });
    const webhookEvent = await entityManager.save(newWebhookEvent);
    return webhookEvent;
  }

  async updateWebhookEventStatus(
    webhookEventId: string,
    status: WebhookEventStatus,
    entityManager: EntityManager,
    errorMessage?: string,
    relatedTransactionId?: string,
  ): Promise<WebhookEvent> {
    const updateData: Partial<WebhookEvent> = { status };
    if (errorMessage !== undefined) {
      updateData.errorMessage = errorMessage;
    }
    if (relatedTransactionId !== undefined) {
      updateData.relatedTransactionId = relatedTransactionId;
    }

    const result = await entityManager.update(
      WebhookEvent,
      { id: webhookEventId },
      updateData,
    );

    if (result.affected === 0) {
      throw new NotFoundException(
        `Webhook event with ID '${webhookEventId}' not found.`,
      );
    }

    const updatedWebhookEvent = await entityManager.findOneBy(WebhookEvent, {
      id: webhookEventId,
    });
    if (!updatedWebhookEvent) {
      throw new InternalServerErrorException(
        `Webhook event with ID '${webhookEventId}' not found after update.`,
      );
    }
    return updatedWebhookEvent;
  }

  async findWebhookEventById(
    id: string,
    tenantId?: string,
  ): Promise<WebhookEvent> {
    const where: any = { id };
    if (tenantId) {
      where.tenantId = tenantId;
    }
    const event = await this.webhookEventsRepository.findOneBy(where);
    if (!event) {
      throw new NotFoundException(`Webhook event with ID '${id}' not found.`);
    }
    return event;
  }

  /**
   * Receives an incoming webhook and enqueues it for asynchronous processing.
   * This method is called by the controller.
   */
  async processIncomingWebhook(
    tenantId: string,
    provider: string,
    payload: Record<string, any>,
  ): Promise<any> {
    // Store the raw webhook event immediately in a transaction
    return this.dataSource.transaction(async (entityManager) => {
      const webhookEventRecord = await this.createWebhookEvent(
        tenantId,
        provider,
        payload.event || payload.type || 'unknown', // Assuming 'event' or 'type' field in payload
        payload,
        WebhookEventStatus.PENDING,
        entityManager,
      );
      // Add job to queue for asynchronous processing
      await this.queueService.addWebhookProcessingJob(
        webhookEventRecord.id,
        tenantId,
        provider,
        payload,
      ); // Pass webhookEventRecord.id
      this.logger.log(
        `Webhook event ${webhookEventRecord.id} received and enqueued for processing.`,
      );
      return {
        success: true,
        message: 'Webhook received and queued for processing.',
      };
    });
  }

  /**
   * Processes the actual webhook payload. This method is called by the BullMQ consumer.
   */
  async processWebhookPayload(
    webhookEventId: string, // Now receiving webhookEventId directly
    tenantId: string,
    provider: string,
    payload: Record<string, any>,
  ): Promise<any> {
    let webhookEventRecord: WebhookEvent | undefined;
    let relatedTransactionId: string | undefined;
    return this.dataSource.transaction(async (entityManager) => {
      try {
        webhookEventRecord = await entityManager.findOneBy(WebhookEvent, {
          id: webhookEventId,
        });
        if (!webhookEventRecord) {
          throw new NotFoundException(
            `Webhook event record with ID '${webhookEventId}' not found for processing.`,
          );
        }

        // Prevent reprocessing if already processed or failed
        if (
          webhookEventRecord.status === WebhookEventStatus.PROCESSED ||
          webhookEventRecord.status === WebhookEventStatus.FAILED
        ) {
          this.logger.warn(
            `Webhook event ${webhookEventId} already ${webhookEventRecord.status}. Skipping reprocessing.`,
          );
          return {
            success: true,
            message: `Webhook already ${webhookEventRecord.status}.`,
          };
        }

        const paymentProvider =
          this.paymentProvidersService.getProvider(provider);
        const processingResult = await paymentProvider.processWebhook(payload);

        if (processingResult.transactionId) {
          // This path is for webhooks related to existing transactions (e.g., deposit/withdrawal confirmations)
          relatedTransactionId = processingResult.transactionId;
          if (processingResult.status === 'success') {
            await this.transactionsService.processSuccessfulTransaction(
              processingResult.transactionId,
              processingResult.providerTransactionId,
              processingResult.metadata,
              entityManager,
            );
          } else if (processingResult.status === 'failed') {
            await this.transactionsService.processFailedTransaction(
              processingResult.transactionId,
              processingResult.errorMessage || 'Webhook indicated failure',
              processingResult.providerTransactionId,
              processingResult.metadata,
              entityManager,
            );
          }
        } else if (processingResult.virtualAccountPayment) {
          // This path is for webhooks indicating a payment to a virtual account
          const { accountNumber, amount, currency, description } =
            processingResult.virtualAccountPayment;
          const virtualAccount =
            await this.virtualAccountsService.findByAccountNumberAndProvider(
              accountNumber,
              provider,
            );

          if (!virtualAccount) {
            this.logger.error(
              `Virtual account not found for account number ${accountNumber} and provider ${provider}. Cannot process deposit.`,
            );
            throw new NotFoundException(
              `Virtual account not found for account number ${accountNumber} and provider ${provider}.`,
            );
          }

          // Process the deposit via virtual account
          const transaction =
            await this.transactionsService.processVirtualAccountDeposit(
              virtualAccount.tenantId,
              virtualAccount,
              amount,
              currency,
              processingResult.providerTransactionId,
              processingResult.metadata,
              description,
              entityManager,
            );
          relatedTransactionId = transaction.id;
        } else {
          this.logger.warn(
            `Webhook event ${webhookEventId} processed but no transaction or virtual account payment details found.`,
          );
        }

        await this.updateWebhookEventStatus(
          webhookEventRecord.id,
          WebhookEventStatus.PROCESSED,
          entityManager,
          undefined,
          relatedTransactionId,
        );
        this.logger.log(
          `Webhook event ${webhookEventId} processed successfully.`,
        );
        return { success: true, message: 'Webhook processed successfully.' };
      } catch (error) {
        if (webhookEventRecord) {
          this.logger.error(
            `Error processing webhook event ${webhookEventId}: ${error.message}`,
            error.stack,
          );
          await this.updateWebhookEventStatus(
            webhookEventRecord.id,
            WebhookEventStatus.FAILED,
            entityManager,
            error.message || 'Unknown error during processing',
            relatedTransactionId,
          );
        }
        throw error; // Re-throw to mark the BullMQ job as failed
      }
    });
  }

  async replayWebhookEvent(
    webhookEventId: string,
    tenantId: string,
  ): Promise<any> {
    const webhookEvent = await this.findWebhookEventById(
      webhookEventId,
      tenantId,
    );

    if (!webhookEvent) {
      throw new NotFoundException(
        `Webhook event with ID '${webhookEventId}' not found for this tenant.`,
      );
    }

    // Enqueue a job to replay the webhook
    await this.queueService.addWebhookReplayJob(webhookEvent.id, tenantId); // Pass webhookEvent.id
    this.logger.log(`Webhook event ${webhookEventId} enqueued for replay.`);
    return { success: true, message: 'Webhook event enqueued for replay.' };
  }

  /**
   * Internal method for replaying webhook events, called by the BullMQ consumer.
   */
  async replayWebhookEventInternal(
    webhookEventId: string,
    tenantId: string,
  ): Promise<any> {
    const webhookEvent = await this.findWebhookEventById(
      webhookEventId,
      tenantId,
    );

    if (!webhookEvent) {
      this.logger.warn(
        `Webhook event with ID '${webhookEventId}' not found for replay (internal).`,
      );
      throw new NotFoundException(
        `Webhook event with ID '${webhookEventId}' not found for replay.`,
      );
    }

    return this.dataSource.transaction(async (entityManager) => {
      // Reset status to PENDING before re-processing
      await this.updateWebhookEventStatus(
        webhookEvent.id,
        WebhookEventStatus.PENDING,
        entityManager,
        null,
        null,
      );

      // Re-process the webhook payload
      return this.processWebhookPayload(
        webhookEvent.id,
        webhookEvent.tenantId,
        webhookEvent.provider,
        webhookEvent.payload,
      );
    });
  }
}
