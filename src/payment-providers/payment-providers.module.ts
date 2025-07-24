import { Module } from "@nestjs/common"
import { PaymentProvidersService } from "./payment-providers.service"
import { PaystackService } from "./paystack/paystack.service"
import { FlutterwaveService } from "./flutterwave/flutterwave.service"
import { StripeService } from "./stripe/stripe.service"

@Module({
  providers: [PaymentProvidersService, PaystackService, FlutterwaveService, StripeService],
  exports: [PaymentProvidersService], // Export so other modules can use it
})
export class PaymentProvidersModule {}
