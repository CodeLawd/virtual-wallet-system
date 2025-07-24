import { Module } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdempotencyKey } from './entity/idempotency-key.entity';

@Module({
  imports: [TypeOrmModule.forFeature([IdempotencyKey])], // Register IdempotencyKey entity
  providers: [IdempotencyService, IdempotencyInterceptor],
  exports: [IdempotencyService, IdempotencyInterceptor], // Export for use in other modules
})
export class IdempotencyModule {}
