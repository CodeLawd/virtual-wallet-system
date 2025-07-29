import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WebhooksModule } from '../webhooks/webhooks.module'; // Import WebhooksModule
import { TransactionsModule } from '../transactions/transactions.module'; // Import TransactionsModule
import { PaymentProvidersModule } from '../payment-providers/payment-providers.module'; // Import PaymentProvidersModule
import { TypeOrmModule } from '@nestjs/typeorm'; // Import TypeOrmModule
import { WebhookEvent } from 'src/webhooks/entity/webhook-event.entity';
import { WebhooksConsumer } from './webhooks.consumer';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'webhooks',
    }),
    WebhooksModule,
    TransactionsModule,
    PaymentProvidersModule,
    TypeOrmModule.forFeature([WebhookEvent]),
  ],
  providers: [WebhooksConsumer],
  exports: [BullModule],
})
export class QueueModule {}
