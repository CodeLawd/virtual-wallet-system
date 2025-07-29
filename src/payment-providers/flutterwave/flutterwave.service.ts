import { Injectable, Logger } from "@nestjs/common"
import type {
  IPaymentProvider,
  InitiatePaymentResponse,
  WebhookProcessingResult,
  VirtualAccountCreationDetails,
  VirtualAccountResponse,
} from "../../common/interfaces/payment-provider.interface"
import { ConfigService } from "@nestjs/config"
import type { EntityManager } from "typeorm" // Import EntityManager

@Injectable()
export class FlutterwaveService implements IPaymentProvider {
  name = "FLUTTERWAVE"
  private readonly logger = new Logger(FlutterwaveService.name)
  private readonly secretKey: string

  constructor(private configService: ConfigService) {
    this.secretKey = this.configService.get<string>("FLUTTERWAVE_SECRET_KEY")
    this.logger.log(
      `FlutterwaveService initialized with secret key: ${this.secretKey ? "******" + this.secretKey.slice(-4) : "N/A"}`,
    )
  }

  async initiateDeposit(
    amount: number,
    currency: string,
    context: { walletId: string; transactionId: string; tenantId: string },
  ): Promise<InitiatePaymentResponse> {
    this.logger.log(
      `Simulating Flutterwave deposit initiation for ${amount} ${currency} to wallet ${context.walletId} (Txn: ${context.transactionId})`,
    )
    // In a real scenario, this would involve an HTTP call to Flutterwave's initiate payment endpoint.
    // Example: https://api.flutterwave.com/v3/payments
    return {
      status: "success", // Simulating immediate success for mock
      providerTransactionId: `FLW_TXN_${Date.now()}_${context.transactionId.slice(0, 8)}`,
      metadata: {
        flutterwaveRef: `FLW_REF_${Date.now()}`,
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
      `Simulating Flutterwave withdrawal initiation for ${amount} ${currency} from wallet ${context.walletId} (Txn: ${context.transactionId})`,
    )
    // In a real scenario, this would involve an HTTP call to Flutterwave's transfer endpoint.
    // Example: https://api.flutterwave.com/v3/transfers
    return {
      status: "success", // Simulating immediate success for mock
      providerTransactionId: `FLW_TRANSFER_${Date.now()}_${context.transactionId.slice(0, 8)}`,
      metadata: {
        flutterwaveTransferRef: `FLW_TRF_REF_${Date.now()}`,
        context,
      },
    }
  }

  async processWebhook(payload: Record<string, any>): Promise<WebhookProcessingResult> {
    this.logger.log(`Processing Flutterwave webhook event: ${payload.event}`)
    // In a real scenario, you would verify the webhook signature using this.secretKey
    // const hash = crypto.createHmac('sha256', this.secretKey).update(JSON.stringify(payload)).digest('hex');
    // if (hash !== req.headers['verif-hash']) { throw new UnauthorizedException('Invalid webhook signature'); }

    // Mocking webhook processing based on event type
    if (payload.event === "charge.completed" || payload.event === "transfer.completed") {
      const transactionId = payload.data?.meta?.context?.transactionId // Assuming context is passed in meta
      const providerTransactionId = payload.data?.id || payload.data?.flw_ref
      return {
        status: "success",
        transactionId: transactionId,
        providerTransactionId: providerTransactionId,
        metadata: payload.data,
      }
    } else if (payload.event === "charge.failed" || payload.event === "transfer.failed") {
      const transactionId = payload.data?.meta?.context?.transactionId
      const providerTransactionId = payload.data?.id || payload.data?.flw_ref
      return {
        status: "failed",
        transactionId: transactionId,
        providerTransactionId: providerTransactionId,
        errorMessage: payload.data?.status || "Payment failed",
        metadata: payload.data,
      }
    } else if (payload.event === "account_number.created" || payload.event === "account_number.payment") {
      // This is a mock for a virtual account payment webhook
      this.logger.log(`Simulating virtual account payment webhook for Flutterwave.`)
      const accountNumber = payload.data?.account_number
      const bankName = payload.data?.bank_name
      const amount = payload.data?.amount
      const currency = payload.data?.currency
      const providerTransactionId = payload.data?.flw_ref || payload.data?.id
      const description = payload.data?.narration || "Virtual account deposit"

      return {
        status: "success",
        providerTransactionId: providerTransactionId,
        metadata: payload.data,
        virtualAccountPayment: {
          accountNumber,
          bankName,
          amount,
          currency,
          description,
        },
      }
    } else {
      this.logger.warn(`Unhandled Flutterwave webhook event type: ${payload.event}`)
      return {
        status: "failed",
        errorMessage: `Unhandled event type: ${payload.event}`,
        metadata: payload,
      }
    }
  }

  async createVirtualAccount(
    details: VirtualAccountCreationDetails,
    entityManager: EntityManager,
  ): Promise<VirtualAccountResponse> {
    this.logger.log(
      `Simulating Flutterwave virtual account creation for wallet ${details.walletId} (Tenant: ${details.tenantId})`,
    )
    // In a real scenario, this would involve an HTTP call to Flutterwave's virtual account endpoint.
    // Example: https://api.flutterwave.com/v3/virtual-account-numbers
    // It would return a generated account number and bank details.

    // For mock, generate a random account number and use a mock bank.
    const accountNumber = `01${Math.floor(Math.random() * 1000000000)
      .toString()
      .padStart(9, "0")}`
    const bankName = "Wema Bank (Mock)"
    const providerReference = `FLW_VA_${Date.now()}`

    return {
      accountNumber,
      bankName,
      accountName: details.accountName,
      currency: details.currency,
      providerReference,
    }
  }
}
