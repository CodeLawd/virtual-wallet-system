import { Injectable, Logger } from "@nestjs/common"
import type {
  IPaymentProvider,
  InitiatePaymentResponse,
  WebhookProcessingResult,
} from "../../common/interfaces/payment-provider.interface"
import type { ConfigService } from "@nestjs/config"

@Injectable()
export class StripeService implements IPaymentProvider {
  name = "STRIPE"
  private readonly logger = new Logger(StripeService.name)
  private readonly secretKey: string

  constructor(private configService: ConfigService) {
    this.secretKey = this.configService.get<string>("STRIPE_SECRET_KEY")
    this.logger.log(
      `StripeService initialized with secret key: ${this.secretKey ? "******" + this.secretKey.slice(-4) : "N/A"}`,
    )
  }

  async initiateDeposit(
    amount: number,
    currency: string,
    context: { walletId: string; transactionId: string; tenantId: string },
  ): Promise<InitiatePaymentResponse> {
    this.logger.log(
      `Simulating Stripe deposit initiation for ${amount} ${currency} to wallet ${context.walletId} (Txn: ${context.transactionId})`,
    )
    // In a real scenario, this would involve creating a PaymentIntent or Checkout Session.
    // Example: stripe.paymentIntents.create(...)
    return {
      status: "success", // Simulating immediate success for mock
      providerTransactionId: `pi_${Date.now()}_${context.transactionId.slice(0, 8)}`,
      metadata: {
        stripeClientSecret: `cs_${Date.now()}`,
        context,
      },
    }
  }

  async initiateWithdrawal(
    amount: number,
    currency: string,
    context: { walletId: string; transactionId: string; tenantId: string },
  ): Promise<InitiatePaymentResponse> {
    this.logger.log(
      `Simulating Stripe withdrawal initiation for ${amount} ${currency} from wallet ${context.walletId} (Txn: ${context.transactionId})`,
    )
    // In a real scenario, this would involve creating a Payout.
    // Example: stripe.payouts.create(...)
    return {
      status: "success", // Simulating immediate success for mock
      providerTransactionId: `po_${Date.now()}_${context.transactionId.slice(0, 8)}`,
      metadata: {
        stripePayoutId: `payout_${Date.now()}`,
        context,
      },
    }
  }

  async processWebhook(payload: Record<string, any>): Promise<WebhookProcessingResult> {
    this.logger.log(`Processing Stripe webhook event: ${payload.type}`)
    // In a real scenario, you would verify the webhook signature using this.secretKey and stripe.webhooks.constructEvent
    // const signature = req.headers['stripe-signature'];
    // const event = stripe.webhooks.constructEvent(req.body, signature, this.secretKey);

    // Mocking webhook processing based on event type
    if (
      payload.type === "payment_intent.succeeded" ||
      payload.type === "charge.succeeded" ||
      payload.type === "payout.succeeded"
    ) {
      const transactionId = payload.data?.object?.metadata?.context?.transactionId // Assuming context is passed in metadata
      const providerTransactionId = payload.data?.object?.id
      return {
        status: "success",
        transactionId: transactionId,
        providerTransactionId: providerTransactionId,
        metadata: payload.data.object,
      }
    } else if (
      payload.type === "payment_intent.payment_failed" ||
      payload.type === "charge.failed" ||
      payload.type === "payout.failed"
    ) {
      const transactionId = payload.data?.object?.metadata?.context?.transactionId
      const providerTransactionId = payload.data?.object?.id
      return {
        status: "failed",
        transactionId: transactionId,
        providerTransactionId: providerTransactionId,
        errorMessage: payload.data?.object?.last_payment_error?.message || "Stripe payment failed",
        metadata: payload.data.object,
      }
    } else {
      this.logger.warn(`Unhandled Stripe webhook event type: ${payload.type}`)
      return {
        status: "failed",
        errorMessage: `Unhandled event type: ${payload.type}`,
        metadata: payload,
      }
    }
  }
}
