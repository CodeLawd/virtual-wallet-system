import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import type { Repository, DataSource, EntityManager } from 'typeorm';
import type { WalletsService } from '../wallets/wallets.service';
import type { PaymentProvidersService } from '../payment-providers/payment-providers.service';
import type { IdempotencyService } from '../idempotency/idempotency.service';
import type { CreateDepositDto } from './dto/create-deposit.dto';
import type { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import type { CreateTransferDto } from './dto/create-transfer.dto';
import type { TransactionResponseDto } from './dto/transaction-response.dto';
import {
  TransactionType,
  TransactionStatus,
  IdempotencyStatus,
} from '../common/enums';
import type { Cache } from 'cache-manager';
import type { VirtualAccountsService } from '../virtual-accounts/virtual-accounts.service'; // Import VirtualAccountsService
import { Transaction } from './entities/transaction.entity';

@Injectable()
export class TransactionsService {
  private transactionsRepository: Repository<Transaction>;
  private dataSource: DataSource;
  private walletsService: WalletsService;
  private paymentProvidersService: PaymentProvidersService;
  private idempotencyService: IdempotencyService;
  private virtualAccountsService: VirtualAccountsService; // Inject VirtualAccountsService
  private cacheManager: Cache;

  constructor(
    transactionsRepository: Repository<Transaction>,
    dataSource: DataSource,
    walletsService: WalletsService,
    paymentProvidersService: PaymentProvidersService,
    idempotencyService: IdempotencyService,
    virtualAccountsService: VirtualAccountsService, // Inject VirtualAccountsService
    cacheManager: Cache,
  ) {
    this.transactionsRepository = transactionsRepository;
    this.dataSource = dataSource;
    this.walletsService = walletsService;
    this.paymentProvidersService = paymentProvidersService;
    this.idempotencyService = idempotencyService;
    this.virtualAccountsService = virtualAccountsService;
    this.cacheManager = cacheManager;
  }

  async createTransaction(
    tenantId: string,
    walletId: string,
    type: TransactionType,
    amount: number,
    currency: string,
    status: TransactionStatus,
    entityManager: EntityManager,
    idempotencyKeyId?: string,
    reference?: string,
    provider?: string,
    providerTransactionId?: string,
    providerMetadata?: Record<string, any>,
    description?: string,
  ): Promise<TransactionResponseDto> {
    const newTransaction = entityManager.create(Transaction, {
      tenantId,
      walletId,
      type,
      amount,
      currency,
      status,
      idempotencyKeyId,
      reference,
      provider,
      providerTransactionId,
      providerMetadata,
      description,
    });
    const transaction = await entityManager.save(newTransaction);
    await this.cacheManager.del(`transactions_tenant_${tenantId}`); // Invalidate all transactions for tenant
    await this.cacheManager.del(
      `transactions_user_${walletId}_tenant_${tenantId}`,
    ); // Invalidate user's transactions
    await this.cacheManager.del(
      `transaction_${transaction.id}_tenant_${tenantId}`,
    ); // Invalidate specific transaction
    return {
      id: transaction.id,
      tenantId: transaction.tenantId,
      walletId: transaction.walletId,
      type: transaction.type,
      status: transaction.status,
      amount: Number.parseFloat(transaction.amount.toString()),
      currency: transaction.currency,
      reference: transaction.reference,
      provider: transaction.provider,
      providerTransactionId: transaction.providerTransactionId,
      providerMetadata: transaction.providerMetadata,
      idempotencyKeyId: transaction.idempotencyKeyId,
      description: transaction.description,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }

  async updateTransactionStatus(
    transactionId: string,
    newStatus: TransactionStatus,
    entityManager: EntityManager,
    providerTransactionId?: string,
    providerMetadata?: Record<string, any>,
  ): Promise<TransactionResponseDto> {
    const updateData: Partial<Transaction> = { status: newStatus };
    if (providerTransactionId) {
      updateData.providerTransactionId = providerTransactionId;
    }
    if (providerMetadata) {
      updateData.providerMetadata = providerMetadata;
    }

    const result = await entityManager.update(
      Transaction,
      { id: transactionId },
      updateData,
    );

    if (result.affected === 0) {
      throw new NotFoundException(
        `Transaction with ID '${transactionId}' not found.`,
      );
    }

    const updatedTransaction = await entityManager.findOneBy(Transaction, {
      id: transactionId,
    });
    if (!updatedTransaction) {
      throw new NotFoundException(
        `Transaction with ID '${transactionId}' not found after update.`,
      );
    }

    // Invalidate cache for this specific transaction and relevant lists
    await this.cacheManager.del(
      `transactions_tenant_${updatedTransaction.tenantId}`,
    );
    await this.cacheManager.del(
      `transactions_user_${updatedTransaction.walletId}_tenant_${updatedTransaction.tenantId}`,
    );
    await this.cacheManager.del(
      `transaction_${updatedTransaction.id}_tenant_${updatedTransaction.tenantId}`,
    );

    return {
      id: updatedTransaction.id,
      tenantId: updatedTransaction.tenantId,
      walletId: updatedTransaction.walletId,
      type: updatedTransaction.type,
      status: updatedTransaction.status,
      amount: Number.parseFloat(updatedTransaction.amount.toString()),
      currency: updatedTransaction.currency,
      reference: updatedTransaction.reference,
      provider: updatedTransaction.provider,
      providerTransactionId: updatedTransaction.providerTransactionId,
      providerMetadata: updatedTransaction.providerMetadata,
      idempotencyKeyId: updatedTransaction.idempotencyKeyId,
      description: updatedTransaction.description,
      createdAt: updatedTransaction.createdAt,
      updatedAt: updatedTransaction.updatedAt,
    };
  }

  async processDeposit(
    tenantId: string,
    userId: string,
    createDepositDto: CreateDepositDto,
    idempotencyKey: string,
  ): Promise<TransactionResponseDto> {
    const { walletId, amount, provider, description } = createDepositDto;

    return this.dataSource.transaction(async (entityManager) => {
      // 1. Check and create idempotency key
      const existingIdempotency =
        await this.idempotencyService.findByKeyAndTenantId(
          idempotencyKey,
          tenantId,
          entityManager,
        );
      if (existingIdempotency) {
        if (
          existingIdempotency.status === IdempotencyStatus.PROCESSED &&
          existingIdempotency.responsePayload
        ) {
          throw new ConflictException(
            'Idempotent request already processed.',
            existingIdempotency.responsePayload,
          );
        } else if (existingIdempotency.status === IdempotencyStatus.PENDING) {
          throw new ConflictException(
            'Idempotent request is currently being processed.',
          );
        }
        // If FAILED, we can proceed to retry
        await this.idempotencyService.updateStatus(
          existingIdempotency.id,
          IdempotencyStatus.PENDING,
          entityManager,
        );
      } else {
        await this.idempotencyService.create(
          idempotencyKey,
          tenantId,
          IdempotencyStatus.PENDING,
          entityManager,
        );
      }

      // 2. Get wallet and validate
      const wallet = await this.walletsService.findByTenantIdAndId(
        walletId,
        tenantId,
      );
      if (wallet.userId !== userId) {
        throw new BadRequestException(
          'Wallet does not belong to the authenticated user.',
        );
      }
      if (wallet.currency !== createDepositDto.currency) {
        throw new BadRequestException(
          'Deposit currency does not match wallet currency.',
        );
      }

      // 3. Create PENDING transaction
      const transaction = await this.createTransaction(
        tenantId,
        walletId,
        TransactionType.DEPOSIT,
        amount,
        wallet.currency,
        TransactionStatus.PENDING,
        entityManager,
        idempotencyKey,
        undefined, // reference
        provider,
        undefined, // providerTransactionId
        undefined, // providerMetadata
        description,
      );

      // 4. Simulate interaction with payment provider
      const paymentProvider =
        this.paymentProvidersService.getProvider(provider);
      const providerResponse = await paymentProvider.initiateDeposit(
        amount,
        wallet.currency,
        {
          walletId: wallet.id,
          transactionId: transaction.id,
          tenantId: tenantId,
        },
      );

      // 5. Update transaction with provider details
      await this.updateTransactionStatus(
        transaction.id,
        providerResponse.status === 'success'
          ? TransactionStatus.PENDING
          : TransactionStatus.FAILED, // Still PENDING until webhook confirms
        entityManager,
        providerResponse.providerTransactionId,
        providerResponse.metadata,
      );

      // 6. If provider response is immediately successful, update wallet balance and transaction status
      // In a real system, this would typically happen via webhook.
      // For this mock, we'll simulate immediate success for simplicity if the mock provider says so.
      if (providerResponse.status === 'success') {
        await this.walletsService.updateWalletBalance(
          wallet.id,
          amount,
          entityManager,
        );
        await this.updateTransactionStatus(
          transaction.id,
          TransactionStatus.SUCCESS,
          entityManager,
        );
        await this.idempotencyService.updateStatus(
          idempotencyKey,
          IdempotencyStatus.PROCESSED,
          entityManager,
          transaction.id,
          {
            message: 'Deposit initiated and processed successfully.',
            transactionId: transaction.id,
          },
        );
      } else {
        await this.idempotencyService.updateStatus(
          idempotencyKey,
          IdempotencyStatus.FAILED,
          entityManager,
          transaction.id,
          {
            message: 'Deposit initiation failed at provider.',
            transactionId: transaction.id,
          },
        );
        throw new BadRequestException(
          'Deposit initiation failed with provider.',
        );
      }

      return transaction;
    });
  }

  async processWithdrawal(
    tenantId: string,
    userId: string,
    createWithdrawalDto: CreateWithdrawalDto,
    idempotencyKey: string,
  ): Promise<TransactionResponseDto> {
    const { walletId, amount, provider, description } = createWithdrawalDto;

    return this.dataSource.transaction(async (entityManager) => {
      // 1. Check and create idempotency key
      const existingIdempotency =
        await this.idempotencyService.findByKeyAndTenantId(
          idempotencyKey,
          tenantId,
          entityManager,
        );
      if (existingIdempotency) {
        if (
          existingIdempotency.status === IdempotencyStatus.PROCESSED &&
          existingIdempotency.responsePayload
        ) {
          throw new ConflictException(
            'Idempotent request already processed.',
            existingIdempotency.responsePayload,
          );
        } else if (existingIdempotency.status === IdempotencyStatus.PENDING) {
          throw new ConflictException(
            'Idempotent request is currently being processed.',
          );
        }
        await this.idempotencyService.updateStatus(
          existingIdempotency.id,
          IdempotencyStatus.PENDING,
          entityManager,
        );
      } else {
        await this.idempotencyService.create(
          idempotencyKey,
          tenantId,
          IdempotencyStatus.PENDING,
          entityManager,
        );
      }

      // 2. Get wallet and validate balance
      const wallet = await this.walletsService.findByTenantIdAndId(
        walletId,
        tenantId,
      );
      if (wallet.userId !== userId) {
        throw new BadRequestException(
          'Wallet does not belong to the authenticated user.',
        );
      }
      if (wallet.currency !== createWithdrawalDto.currency) {
        throw new BadRequestException(
          'Withdrawal currency does not match wallet currency.',
        );
      }
      if (wallet.balance < amount) {
        throw new BadRequestException('Insufficient balance for withdrawal.');
      }

      // 3. Deduct from wallet balance immediately (optimistic update)
      await this.walletsService.updateWalletBalance(
        wallet.id,
        -amount,
        entityManager,
      );

      // 4. Create PENDING transaction
      const transaction = await this.createTransaction(
        tenantId,
        walletId,
        TransactionType.WITHDRAWAL,
        amount,
        wallet.currency,
        TransactionStatus.PENDING,
        entityManager,
        idempotencyKey,
        undefined, // reference
        provider,
        undefined, // providerTransactionId
        undefined, // providerMetadata
        description,
      );

      // 5. Simulate interaction with payment provider
      const paymentProvider =
        this.paymentProvidersService.getProvider(provider);
      const providerResponse = await paymentProvider.initiateWithdrawal(
        amount,
        wallet.currency,
        {
          walletId: wallet.id,
          transactionId: transaction.id,
          tenantId: tenantId,
        },
      );

      // 6. Update transaction with provider details
      await this.updateTransactionStatus(
        transaction.id,
        providerResponse.status === 'success'
          ? TransactionStatus.PENDING
          : TransactionStatus.FAILED, // Still PENDING until webhook confirms
        entityManager,
        providerResponse.providerTransactionId,
        providerResponse.metadata,
      );

      // 7. If provider response is immediately successful, update idempotency key
      // In a real system, this would typically happen via webhook.
      if (providerResponse.status === 'success') {
        await this.idempotencyService.updateStatus(
          idempotencyKey,
          IdempotencyStatus.PROCESSED,
          entityManager,
          transaction.id,
          {
            message: 'Withdrawal initiated successfully.',
            transactionId: transaction.id,
          },
        );
      } else {
        // If provider initiation fails, reverse wallet balance and mark transaction as failed
        await this.walletsService.updateWalletBalance(
          wallet.id,
          amount,
          entityManager,
        ); // Reverse deduction
        await this.updateTransactionStatus(
          transaction.id,
          TransactionStatus.FAILED,
          entityManager,
        );
        await this.idempotencyService.updateStatus(
          idempotencyKey,
          IdempotencyStatus.FAILED,
          entityManager,
          transaction.id,
          {
            message:
              'Withdrawal initiation failed at provider, balance reversed.',
            transactionId: transaction.id,
          },
        );
        throw new BadRequestException(
          'Withdrawal initiation failed with provider.',
        );
      }

      return transaction;
    });
  }

  async processTransfer(
    tenantId: string,
    userId: string,
    createTransferDto: CreateTransferDto,
    idempotencyKey: string,
  ): Promise<TransactionResponseDto> {
    const {
      sourceWalletId,
      destinationWalletId,
      amount,
      currency,
      description,
    } = createTransferDto;

    if (sourceWalletId === destinationWalletId) {
      throw new BadRequestException(
        'Source and destination wallets cannot be the same.',
      );
    }

    return this.dataSource.transaction(async (entityManager) => {
      // 1. Check and create idempotency key
      const existingIdempotency =
        await this.idempotencyService.findByKeyAndTenantId(
          idempotencyKey,
          tenantId,
          entityManager,
        );
      if (existingIdempotency) {
        if (
          existingIdempotency.status === IdempotencyStatus.PROCESSED &&
          existingIdempotency.responsePayload
        ) {
          throw new ConflictException(
            'Idempotent request already processed.',
            existingIdempotency.responsePayload,
          );
        } else if (existingIdempotency.status === IdempotencyStatus.PENDING) {
          throw new ConflictException(
            'Idempotent request is currently being processed.',
          );
        }
        await this.idempotencyService.updateStatus(
          existingIdempotency.id,
          IdempotencyStatus.PENDING,
          entityManager,
        );
      } else {
        await this.idempotencyService.create(
          idempotencyKey,
          tenantId,
          IdempotencyStatus.PENDING,
          entityManager,
        );
      }

      // 2. Get source and destination wallets
      const sourceWallet = await this.walletsService.findByTenantIdAndId(
        sourceWalletId,
        tenantId,
      );
      const destinationWallet = await this.walletsService.findByTenantIdAndId(
        destinationWalletId,
        tenantId,
      );

      if (sourceWallet.userId !== userId) {
        throw new BadRequestException(
          'Source wallet does not belong to the authenticated user.',
        );
      }
      if (
        sourceWallet.currency !== currency ||
        destinationWallet.currency !== currency
      ) {
        throw new BadRequestException(
          'Currencies of source, destination wallets, and transfer amount must match.',
        );
      }
      if (sourceWallet.balance < amount) {
        throw new BadRequestException(
          'Insufficient balance in source wallet for transfer.',
        );
      }

      // 3. Deduct from source wallet
      await this.walletsService.updateWalletBalance(
        sourceWallet.id,
        -amount,
        entityManager,
      );

      // 4. Add to destination wallet
      await this.walletsService.updateWalletBalance(
        destinationWallet.id,
        amount,
        entityManager,
      );

      // 5. Create transaction for source wallet (withdrawal type)
      const sourceTransaction = await this.createTransaction(
        tenantId,
        sourceWallet.id,
        TransactionType.TRANSFER,
        amount,
        currency,
        TransactionStatus.SUCCESS, // Internal transfers are typically synchronous and immediately successful
        entityManager,
        idempotencyKey,
        destinationWallet.id, // Reference to destination wallet
        undefined, // No external provider
        undefined,
        undefined,
        `Transfer to ${destinationWallet.id}: ${description || ''}`,
      );

      // 6. Create transaction for destination wallet (deposit type)
      // Note: This is a separate transaction record for the receiving wallet for auditability.
      await this.createTransaction(
        tenantId,
        destinationWallet.id,
        TransactionType.TRANSFER,
        amount,
        currency,
        TransactionStatus.SUCCESS,
        entityManager,
        undefined, // No idempotency key for the receiving side of an internal transfer
        sourceWallet.id, // Reference to source wallet
        undefined,
        undefined,
        undefined,
        `Transfer from ${sourceWallet.id}: ${description || ''}`,
      );

      // 7. Update idempotency key status
      await this.idempotencyService.updateStatus(
        idempotencyKey,
        IdempotencyStatus.PROCESSED,
        entityManager,
        sourceTransaction.id,
        {
          message: 'Internal transfer processed successfully.',
          transactionId: sourceTransaction.id,
        },
      );

      return sourceTransaction;
    });
  }

  async findAllByTenantId(
    tenantId: string,
    userId?: string,
  ): Promise<TransactionResponseDto[]> {
    const cacheKey = userId
      ? `transactions_user_${userId}_tenant_${tenantId}`
      : `transactions_tenant_${tenantId}`;
    let transactions =
      await this.cacheManager.get<TransactionResponseDto[]>(cacheKey);

    if (!transactions) {
      const where: any = { tenantId };
      if (userId) {
        const userWallets = await this.walletsService.findAllByUserId(
          userId,
          tenantId,
        );
        where.walletId = userWallets.map((w) => w.id);
      }

      const transactionEntities = await this.transactionsRepository.find({
        where,
        order: { createdAt: 'DESC' },
      });

      transactions = transactionEntities.map((transaction) => ({
        id: transaction.id,
        tenantId: transaction.tenantId,
        walletId: transaction.walletId,
        type: transaction.type,
        status: transaction.status,
        amount: Number.parseFloat(transaction.amount.toString()),
        currency: transaction.currency,
        reference: transaction.reference,
        provider: transaction.provider,
        providerTransactionId: transaction.providerTransactionId,
        providerMetadata: transaction.providerMetadata,
        idempotencyKeyId: transaction.idempotencyKeyId,
        description: transaction.description,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      }));
      await this.cacheManager.set(cacheKey, transactions);
    }
    return transactions;
  }

  async findByIdAndTenantId(
    id: string,
    tenantId: string,
  ): Promise<TransactionResponseDto> {
    const cacheKey = `transaction_${id}_tenant_${tenantId}`;
    let transaction =
      await this.cacheManager.get<TransactionResponseDto>(cacheKey);

    if (!transaction) {
      const transactionEntity = await this.transactionsRepository.findOneBy({
        id,
        tenantId,
      });
      if (!transactionEntity) {
        throw new NotFoundException(
          `Transaction with ID '${id}' not found for this tenant.`,
        );
      }
      transaction = {
        id: transactionEntity.id,
        tenantId: transactionEntity.tenantId,
        walletId: transactionEntity.walletId,
        type: transactionEntity.type,
        status: transactionEntity.status,
        amount: Number.parseFloat(transactionEntity.amount.toString()),
        currency: transactionEntity.currency,
        reference: transactionEntity.reference,
        provider: transactionEntity.provider,
        providerTransactionId: transactionEntity.providerTransactionId,
        providerMetadata: transactionEntity.providerMetadata,
        idempotencyKeyId: transactionEntity.idempotencyKeyId,
        description: transactionEntity.description,
        createdAt: transactionEntity.createdAt,
        updatedAt: transactionEntity.updatedAt,
      };
      await this.cacheManager.set(cacheKey, transaction);
    }
    return transaction;
  }

  /**
   * Processes a successful transaction event (e.g., from a webhook).
   * Updates transaction status and wallet balance if necessary.
   * @param transactionId The ID of the transaction to update.
   * @param providerTransactionId The transaction ID from the payment provider.
   * @param providerMetadata Any additional metadata from the provider.
   * @param entityManager Optional: TypeORM EntityManager for an ongoing transaction.
   * @returns The updated transaction.
   */
  async processSuccessfulTransaction(
    transactionId: string,
    providerTransactionId: string,
    providerMetadata: Record<string, any>,
    entityManager?: EntityManager,
  ): Promise<TransactionResponseDto> {
    const repo = entityManager
      ? entityManager.getRepository(Transaction)
      : this.transactionsRepository;
    const currentTransaction = await repo.findOneBy({ id: transactionId });

    if (!currentTransaction) {
      throw new NotFoundException(
        `Transaction with ID '${transactionId}' not found.`,
      );
    }

    if (currentTransaction.status === TransactionStatus.SUCCESS) {
      // Already processed, idempotent webhook call
      return {
        id: currentTransaction.id,
        tenantId: currentTransaction.tenantId,
        walletId: currentTransaction.walletId,
        type: currentTransaction.type,
        status: currentTransaction.status,
        amount: Number.parseFloat(currentTransaction.amount.toString()),
        currency: currentTransaction.currency,
        reference: currentTransaction.reference,
        provider: currentTransaction.provider,
        providerTransactionId: currentTransaction.providerTransactionId,
        providerMetadata: currentTransaction.providerMetadata,
        idempotencyKeyId: currentTransaction.idempotencyKeyId,
        description: currentTransaction.description,
        createdAt: currentTransaction.createdAt,
        updatedAt: currentTransaction.updatedAt,
      };
    }

    // Update transaction status
    const transaction = await this.updateTransactionStatus(
      transactionId,
      TransactionStatus.SUCCESS,
      entityManager || this.dataSource.manager, // Use provided EM or default
      providerTransactionId,
      providerMetadata,
    );

    // For deposits, ensure wallet balance is updated if it wasn't already
    // The mock `initiateDeposit` already updated the balance. In a real system,
    // if the initial `initiateDeposit` only returned a URL and didn't touch balance,
    // this is where the balance would be credited.
    if (
      transaction.type === TransactionType.DEPOSIT &&
      transaction.status === TransactionStatus.SUCCESS
    ) {
      // This check is simplified; in a real system, you'd need a more robust way to ensure idempotency
      // of balance updates, perhaps by checking a flag on the transaction or using an event log.
      // For now, we assume the initial mock deposit already updated the balance.
      // If it didn't, we would update it here:
      // await this.walletsService.updateWalletBalance(transaction.walletId, transaction.amount, entityManager || this.dataSource.manager);
    }

    return transaction;
  }

  /**
   * Processes a failed transaction event (e.g., from a webhook).
   * Updates transaction status and reverses wallet balance if necessary.
   * @param transactionId The ID of the transaction to update.
   * @param errorMessage The error message from the payment provider.
   * @param providerTransactionId The transaction ID from the payment provider.
   * @param providerMetadata Any additional metadata from the provider.
   * @param entityManager Optional: TypeORM EntityManager for an ongoing transaction.
   * @returns The updated transaction.
   */
  async processFailedTransaction(
    transactionId: string,
    errorMessage: string,
    providerTransactionId?: string,
    providerMetadata?: Record<string, any>,
    entityManager?: EntityManager,
  ): Promise<TransactionResponseDto> {
    const repo = entityManager
      ? entityManager.getRepository(Transaction)
      : this.transactionsRepository;
    const currentTransaction = await repo.findOneBy({ id: transactionId });

    if (!currentTransaction) {
      throw new NotFoundException(
        `Transaction with ID '${transactionId}' not found.`,
      );
    }

    if (
      currentTransaction.status === TransactionStatus.FAILED ||
      currentTransaction.status === TransactionStatus.REVERSED
    ) {
      // Already processed as failed/reversed
      return {
        id: currentTransaction.id,
        tenantId: currentTransaction.tenantId,
        walletId: currentTransaction.walletId,
        type: currentTransaction.type,
        status: currentTransaction.status,
        amount: Number.parseFloat(currentTransaction.amount.toString()),
        currency: currentTransaction.currency,
        reference: currentTransaction.reference,
        provider: currentTransaction.provider,
        providerTransactionId: currentTransaction.providerTransactionId,
        providerMetadata: currentTransaction.providerMetadata,
        idempotencyKeyId: currentTransaction.idempotencyKeyId,
        description: currentTransaction.description,
        createdAt: currentTransaction.createdAt,
        updatedAt: currentTransaction.updatedAt,
      };
    }

    // Update transaction status to FAILED
    let transaction = await this.updateTransactionStatus(
      transactionId,
      TransactionStatus.FAILED,
      entityManager || this.dataSource.manager,
      providerTransactionId,
      providerMetadata,
    );

    // Reverse wallet balance if it was optimistically deducted (e.g., for withdrawals)
    if (
      currentTransaction.type === TransactionType.WITHDRAWAL &&
      currentTransaction.status === TransactionStatus.PENDING
    ) {
      await this.walletsService.updateWalletBalance(
        currentTransaction.walletId,
        Number.parseFloat(currentTransaction.amount.toString()),
        entityManager || this.dataSource.manager,
      );
      // Optionally update status to REVERSED if balance was reversed
      transaction = await this.updateTransactionStatus(
        transactionId,
        TransactionStatus.REVERSED,
        entityManager || this.dataSource.manager,
      );
    }

    return transaction;
  }

  /**
   * Processes a deposit initiated via a virtual account webhook.
   * This method is called by the WebhooksService.
   * @param tenantId The ID of the tenant.
   * @param virtualAccount The virtual account entity.
   * @param amount The amount deposited.
   * @param currency The currency of the deposit.
   * @param providerTransactionId The transaction ID from the payment provider.
   * @param providerMetadata Any additional metadata from the provider.
   * @param description Optional description for the transaction.
   * @param entityManager The TypeORM EntityManager for the ongoing transaction.
   * @returns The created transaction.
   */
  async processVirtualAccountDeposit(
    tenantId: string,
    virtualAccount: VirtualAccount,
    amount: number,
    currency: string,
    providerTransactionId: string,
    providerMetadata: Record<string, any>,
    description?: string,
    entityManager?: EntityManager,
  ): Promise<TransactionResponseDto> {
    return this.dataSource.transaction(async (em) => {
      const currentEntityManager = entityManager || em;

      // Check for existing transaction with this providerTransactionId to ensure idempotency
      const existingTransaction = await currentEntityManager.findOneBy(
        Transaction,
        {
          tenantId,
          provider: virtualAccount.provider,
          providerTransactionId,
          type: TransactionType.DEPOSIT,
        },
      );

      if (existingTransaction) {
        // If already processed, return the existing transaction
        return {
          id: existingTransaction.id,
          tenantId: existingTransaction.tenantId,
          walletId: existingTransaction.walletId,
          type: existingTransaction.type,
          status: existingTransaction.status,
          amount: Number.parseFloat(existingTransaction.amount.toString()),
          currency: existingTransaction.currency,
          reference: existingTransaction.reference,
          provider: existingTransaction.provider,
          providerTransactionId: existingTransaction.providerTransactionId,
          providerMetadata: existingTransaction.providerMetadata,
          idempotencyKeyId: existingTransaction.idempotencyKeyId,
          description: existingTransaction.description,
          createdAt: existingTransaction.createdAt,
          updatedAt: existingTransaction.updatedAt,
        };
      }

      // Update wallet balance
      await this.walletsService.updateWalletBalance(
        virtualAccount.walletId,
        amount,
        currentEntityManager,
      );

      // Create a new transaction record
      const transaction = await this.createTransaction(
        tenantId,
        virtualAccount.walletId,
        TransactionType.DEPOSIT,
        amount,
        currency,
        TransactionStatus.SUCCESS, // Virtual account deposits are typically confirmed as success via webhook
        currentEntityManager,
        undefined, // No idempotency key from client for webhook-initiated transactions
        virtualAccount.accountNumber, // Reference to virtual account number
        virtualAccount.provider,
        providerTransactionId,
        providerMetadata,
        description ||
          `Deposit via virtual account ${virtualAccount.accountNumber}`,
      );
      return transaction;
    });
  }
}
