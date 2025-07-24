import type { EntityManager } from "typeorm" // Import EntityManager

export interface InitiatePaymentResponse {
  status: "success" | "pending" | "failed"
  providerTransactionId?: string
  metadata?: Record<string, any>
  errorMessage?: string
}

export interface WebhookProcessingResult {
  status: "success" | "failed"
  transactionId?: string // Our internal transaction ID
  providerTransactionId?: string // Provider's transaction ID
  errorMessage?: string
  metadata?: Record<string, any>
  // New fields for virtual account payments
  virtualAccountPayment?: {
    accountNumber: string
    bankName: string
    amount: number
    currency: string
    description?: string
  }
}

export interface VirtualAccountCreationDetails {
  walletId: string
  tenantId: string
  userId: string
  currency: string
  accountName: string
}

export interface VirtualAccountResponse {
  accountNumber: string
  bankName: string
  accountName: string
  currency: string
  providerReference?: string
  // Add any other provider-specific details for the virtual account
}

export interface IPaymentProvider {
  name: string
  initiateDeposit(
    amount: number,
    currency: string,
    context: { walletId: string; transactionId: string; tenantId: string },
  ): Promise<InitiatePaymentResponse>
  initiateWithdrawal(
    amount: number,
    currency: string,
    context: { walletId: string; transactionId: string; tenantId: string },
  ): Promise<InitiatePaymentResponse>
  // verifyTransaction(providerTransactionId: string): Promise<TransactionStatus>; // Optional: for polling
  processWebhook(payload: Record<string, any>): Promise<WebhookProcessingResult>
  // New optional method for virtual account creation
  createVirtualAccount?(
    details: VirtualAccountCreationDetails,
    entityManager: EntityManager,
  ): Promise<VirtualAccountResponse>
}
