import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { WalletsModule } from '../wallets/wallets.module';
import { PaymentProvidersModule } from '../payment-providers/payment-providers.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { VirtualAccountsModule } from '../virtual-accounts/virtual-accounts.module';

@Module({
  controllers: [TransactionsController],
  providers: [TransactionsService],
  imports: [
    TypeOrmModule.forFeature([Transaction]),
    WalletsModule,
    PaymentProvidersModule,
    IdempotencyModule,
    VirtualAccountsModule,
  ],
  exports: [TransactionsService],
})
export class TransactionsModule {}
