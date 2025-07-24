import { Module } from '@nestjs/common';
import { VirtualAccountsService } from './virtual-accounts.service';
import { VirtualAccountsController } from './virtual-accounts.controller';

@Module({
  controllers: [VirtualAccountsController],
  providers: [VirtualAccountsService],
})
export class VirtualAccountsModule {}
