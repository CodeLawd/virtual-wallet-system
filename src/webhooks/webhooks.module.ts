import { Module, forwardRef } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { TransactionsModule } from '../transactions/transactions.module';
import { PaymentProvidersModule } from '../payment-providers/payment-providers.module';
import { TenantsModule } from '../tenants/tenants.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookEvent } from './entity/webhook-event.entity';
import { VirtualAccountsModule } from '../virtual-accounts/virtual-accounts.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookEvent]),
    TransactionsModule,
    PaymentProvidersModule,
    VirtualAccountsModule,
    forwardRef(() => QueueModule),
   ],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService], // Export for use in QueueModule's consumer
})
export class WebhooksModule {}
