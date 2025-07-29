import { Module } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';

@Module({
  controllers: [TenantsController],
  providers: [TenantsService],
  imports: [TypeOrmModule.forFeature([Tenant])],
  exports: [TenantsService],
})
export class TenantsModule {}
