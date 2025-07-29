import { Module } from '@nestjs/common';
import { VirtualAccountsService } from './virtual-accounts.service';
import { VirtualAccountsController } from './virtual-accounts.controller';
import { VirtualAccount } from './entities/virtual-account.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletsModule } from '../wallets/wallets.module';
import { PaymentProvidersModule } from '../payment-providers/payment-providers.module';

@Module({
  controllers: [VirtualAccountsController],
  providers: [VirtualAccountsService],
  imports: [
    TypeOrmModule.forFeature([VirtualAccount]),
    WalletsModule,
    PaymentProvidersModule,
  ],
  exports: [VirtualAccountsService],
})
export class VirtualAccountsModule {}
