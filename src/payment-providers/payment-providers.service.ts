import { Injectable, BadRequestException } from "@nestjs/common"
import type { IPaymentProvider } from "../common/interfaces/payment-provider.interface"
import type { PaystackService } from "./paystack/paystack.service"
import type { FlutterwaveService } from "./flutterwave/flutterwave.service"
import type { StripeService } from "./stripe/stripe.service"

@Injectable()
export class PaymentProvidersService {
  private providers: Map<string, IPaymentProvider> = new Map()

  constructor(
    private paystackService: PaystackService,
    private flutterwaveService: FlutterwaveService,
    private stripeService: StripeService,
  ) {
    this.registerProvider(paystackService)
    this.registerProvider(flutterwaveService)
    this.registerProvider(stripeService)
  }

  private registerProvider(provider: IPaymentProvider) {
    this.providers.set(provider.name.toUpperCase(), provider)
  }

  getProvider(name: string): IPaymentProvider {
    const provider = this.providers.get(name.toUpperCase())
    if (!provider) {
      throw new BadRequestException(`Payment provider '${name}' not supported.`)
    }
    return provider
  }
}
