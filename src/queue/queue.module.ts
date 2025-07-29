import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WebhooksModule } from '../webhooks/webhooks.module'; // Import WebhooksModule
import { TransactionsModule } from '../transactions/transactions.module'; // Import TransactionsModule
import { PaymentProvidersModule } from '../payment-providers/payment-providers.module'; // Import PaymentProvidersModule
import { TypeOrmModule } from '@nestjs/typeorm'; // Import TypeOrmModule
import { WebhookEvent } from 'src/webhooks/entity/webhook-event.entity';
import { WebhooksConsumer } from './webhooks.consumer';
import { QueueService } from './queue.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'webhooks',
    }),
    forwardRef(() => WebhooksModule), // Use forwardRef to avoid circular dependency
    TransactionsModule,
    PaymentProvidersModule,
    TypeOrmModule.forFeature([WebhookEvent]),
  ],
  providers: [QueueService, WebhooksConsumer],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
