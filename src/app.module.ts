import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { WalletsModule } from './wallets/wallets.module';
import { VirtualAccountsModule } from './virtual-accounts/virtual-accounts.module';
import { TransactionsModule } from './transactions/transactions.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { TenantsModule } from './tenants/tenants.module';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { PaymentProvidersModule } from './payment-providers/payment-providers.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || '',
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      username: process.env.DATABASE_USER || '',
      password: process.env.DATABASE_PASSWORD || '',
      database: process.env.DATABASE_NAME || '',
      entities: ['dist/**/*.entity{.ts,.js}'],
      ssl: !!(process.env.ENV === 'production'),
      synchronize: true,
      extra:
        process.env.ENV === 'production'
          ? {
              ssl: {
                rejectUnauthorized: false,
              },
            }
          : undefined,
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
    UsersModule,
    WalletsModule,
    VirtualAccountsModule,
    TransactionsModule,
    AuthModule,
    TenantsModule,
    IdempotencyModule,
    PaymentProvidersModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
