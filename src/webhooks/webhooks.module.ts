import { Module } from "@nestjs/common"
import { WebhooksService } from "./webhooks.service"
import { WebhooksController } from "./webhooks.controller"
import { TransactionsModule } from "../transactions/transactions.module"
import { PaymentProvidersModule } from "../payment-providers/payment-providers.module"
import { TenantsModule } from "../tenants/tenants.module"
import { TypeOrmModule } from "@nestjs/typeorm"
import { WebhookEvent } from "../entities/webhook-event.entity"
import { QueueModule } from "../queue/queue.module" // Import QueueModule

@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookEvent]),
    TransactionsModule,
    PaymentProvidersModule,
    TenantsModule,
    QueueModule, // Import QueueModule to use QueueService
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService], // Export for use in QueueModule's consumer
})
export class WebhooksModule {}
