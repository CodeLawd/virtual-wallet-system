import { Module } from '@nestjs/common';
import { VirtualAccountsService } from './virtual-accounts.service';
import { VirtualAccountsController } from './virtual-accounts.controller';
import { VirtualAccount } from './entities/virtual-account.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  controllers: [VirtualAccountsController],
  providers: [VirtualAccountsService],
  imports: [TypeOrmModule.forFeature([VirtualAccount])],
})
export class VirtualAccountsModule {}
