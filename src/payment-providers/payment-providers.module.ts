import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentProvidersService } from './payment-providers.service';
import { PaystackService } from './paystack/paystack.service';
import { FlutterwaveService } from './flutterwave/flutterwave.service';
import { StripeService } from './stripe/stripe.service';

@Module({
  imports: [
    ConfigModule, // Make ConfigService available to all payment provider services
  ],
  providers: [
    PaymentProvidersService,
    PaystackService,
    FlutterwaveService,
    StripeService,
  ],
  exports: [PaymentProvidersService],
})
export class PaymentProvidersModule {}
