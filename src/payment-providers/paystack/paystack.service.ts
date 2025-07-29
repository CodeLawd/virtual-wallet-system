import { Injectable, Logger } from '@nestjs/common';
import type {
  IPaymentProvider,
  InitiatePaymentResponse,
  WebhookProcessingResult,
  VirtualAccountCreationDetails,
  VirtualAccountResponse,
} from '../../common/interfaces/payment-provider.interface';
import { ConfigService } from '@nestjs/config';
import type { EntityManager } from 'typeorm'; // Import EntityManager

@Injectable()
export class PaystackService implements IPaymentProvider {
  name = 'PAYSTACK';
  private readonly logger = new Logger(PaystackService.name);
  private readonly secretKey: string;

  constructor(private configService: ConfigService) {
    this.secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    this.logger.log(
      `PaystackService initialized with secret key: ${this.secretKey ? '******' + this.secretKey.slice(-4) : 'N/A'}`,
    );
  }

  async initiateDeposit(
    amount: number,
    currency: string,
    context: { walletId: string; transactionId: string; tenantId: string },
  ): Promise<InitiatePaymentResponse> {
    this.logger.log(
      `Simulating Paystack deposit initiation for ${amount} ${currency} to wallet ${context.walletId} (Txn: ${context.transactionId})`,
    );
    return {
      status: 'success', // Simulating immediate success for mock
      providerTransactionId: `PS_TXN_${Date.now()}_${context.transactionId.slice(0, 8)}`,
      metadata: {
        paystackRef: `PS_REF_${Date.now()}`,
        context,
      },
    };
  }

  async initiateWithdrawal(
    amount: number,
    currency: string,
    context: { walletId: string; transactionId: string; tenantId: string },
  ): Promise<InitiatePaymentResponse> {
    this.logger.log(
      `Simulating Paystack withdrawal initiation for ${amount} ${currency} from wallet ${context.walletId} (Txn: ${context.transactionId})`,
    );

    return {
      status: 'success', // Simulating immediate success for mock
      providerTransactionId: `PS_TRANSFER_${Date.now()}_${context.transactionId.slice(0, 8)}`,
      metadata: {
        paystackTransferRef: `PS_TRF_REF_${Date.now()}`,
        context,
      },
    };
  }

  async processWebhook(
    payload: Record<string, any>,
  ): Promise<WebhookProcessingResult> {
    this.logger.log(`Processing Paystack webhook event: ${payload.event}`);

    // Mocking webhook processing based on event type
    if (
      payload.event === 'charge.success' ||
      payload.event === 'transfer.success'
    ) {
      const transactionId = payload.data?.metadata?.context?.transactionId; // Assuming context is passed in metadata
      const providerTransactionId =
        payload.data?.reference || payload.data?.transfer_code;
      return {
        status: 'success',
        transactionId: transactionId,
        providerTransactionId: providerTransactionId,
        metadata: payload.data,
      };
    } else if (
      payload.event === 'charge.failed' ||
      payload.event === 'transfer.failed'
    ) {
      const transactionId = payload.data?.metadata?.context?.transactionId;
      const providerTransactionId =
        payload.data?.reference || payload.data?.transfer_code;
      return {
        status: 'failed',
        transactionId: transactionId,
        providerTransactionId: providerTransactionId,
        errorMessage: payload.data?.gateway_response || 'Payment failed',
        metadata: payload.data,
      };
    } else if (payload.event === 'dedicatedaccount.assign_success') {
      // This is a mock for a virtual account payment webhook
      this.logger.log(
        `Simulating virtual account payment webhook for Paystack.`,
      );
      const accountNumber = payload.data?.account_number;
      const bankName = payload.data?.bank?.name;
      const amount = payload.data?.amount / 100; // Paystack amounts are in kobo/cents
      const currency = payload.data?.currency;
      const providerTransactionId = payload.data?.reference;
      const description = payload.data?.narration || 'Virtual account deposit';

      return {
        status: 'success',
        providerTransactionId: providerTransactionId,
        metadata: payload.data,
        virtualAccountPayment: {
          accountNumber,
          bankName,
          amount,
          currency,
          description,
        },
      };
    } else {
      this.logger.warn(
        `Unhandled Paystack webhook event type: ${payload.event}`,
      );
      return {
        status: 'failed',
        errorMessage: `Unhandled event type: ${payload.event}`,
        metadata: payload,
      };
    }
  }

  async createVirtualAccount(
    details: VirtualAccountCreationDetails,
    entityManager: EntityManager,
  ): Promise<VirtualAccountResponse> {
    this.logger.log(
      `Simulating Paystack virtual account creation for wallet ${details.walletId} (Tenant: ${details.tenantId})`,
    );

    // For mock, generate a random account number and use a mock bank.
    const accountNumber = `00${Math.floor(Math.random() * 1000000000)
      .toString()
      .padStart(9, '0')}`;
    const bankName = 'Providus Bank (Mock)';
    const providerReference = `PS_VA_${Date.now()}`;

    // In a real scenario, you might save some provider-specific VA details here
    // For now, we just return the necessary info.
    return {
      accountNumber,
      bankName,
      accountName: details.accountName,
      currency: details.currency,
      providerReference,
    };
  }
}
