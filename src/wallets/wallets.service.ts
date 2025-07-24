import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'; // Import Inject, CACHE_MANAGER
import type { Repository, EntityManager } from 'typeorm';
import { Wallet } from '../entities/wallet.entity';
import type { CreateWalletDto } from './dto/create-wallet.dto';
import type { WalletResponseDto } from './dto/wallet-response.dto';
import { PostgresErrorCode } from '../common/constants/postgres-error-codes.enum';
import type { Cache } from 'cache-manager';

@Injectable()
export class WalletsService {
  private walletsRepository: Repository<Wallet>;

  constructor(
    entityManager: EntityManager,
    private cacheManager: Cache,
  ) {
    this.walletsRepository = entityManager.getRepository(Wallet);
  }

  async create(
    userId: string,
    tenantId: string,
    createWalletDto: CreateWalletDto,
  ): Promise<WalletResponseDto> {
    const { currency } = createWalletDto;

    const newWallet = this.walletsRepository.create({
      userId,
      tenantId,
      currency,
      balance: 0, // Default balance
    });

    try {
      const wallet = await this.walletsRepository.save(newWallet);
      await this.cacheManager.del(`wallets_user_${userId}_tenant_${tenantId}`); // Invalidate user's wallets cache
      await this.cacheManager.del(`wallet_${wallet.id}_tenant_${tenantId}`); // Invalidate specific wallet cache
      return {
        id: wallet.id,
        userId: wallet.userId,
        tenantId: wallet.tenantId,
        balance: Number.parseFloat(wallet.balance.toString()), // Convert Decimal to number
        currency: wallet.currency,
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt,
      };
    } catch (error) {
      if (error.code === PostgresErrorCode.UniqueViolation) {
        throw new ConflictException(
          `Wallet with currency '${currency}' already exists for this user.`,
        );
      }
      throw error;
    }
  }

  async findAllByUserId(
    userId: string,
    tenantId: string,
  ): Promise<WalletResponseDto[]> {
    const cacheKey = `wallets_user_${userId}_tenant_${tenantId}`;
    let wallets = await this.cacheManager.get<WalletResponseDto[]>(cacheKey);

    if (!wallets) {
      const walletEntities = await this.walletsRepository.find({
        where: { userId, tenantId },
      });
      wallets = walletEntities.map((wallet) => ({
        id: wallet.id,
        userId: wallet.userId,
        tenantId: wallet.tenantId,
        balance: Number.parseFloat(wallet.balance.toString()),
        currency: wallet.currency,
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt,
      }));
      await this.cacheManager.set(cacheKey, wallets);
    }
    return wallets;
  }

  async findByTenantIdAndId(
    id: string,
    tenantId: string,
  ): Promise<WalletResponseDto> {
    const cacheKey = `wallet_${id}_tenant_${tenantId}`;
    let wallet = await this.cacheManager.get<WalletResponseDto>(cacheKey);

    if (!wallet) {
      const walletEntity = await this.walletsRepository.findOneBy({
        id,
        tenantId,
      });
      if (!walletEntity) {
        throw new NotFoundException(
          `Wallet with ID '${id}' not found for this tenant.`,
        );
      }
      wallet = {
        id: walletEntity.id,
        userId: walletEntity.userId,
        tenantId: walletEntity.tenantId,
        balance: Number.parseFloat(walletEntity.balance.toString()),
        currency: walletEntity.currency,
        createdAt: walletEntity.createdAt,
        updatedAt: walletEntity.updatedAt,
      };
      await this.cacheManager.set(cacheKey, wallet);
    }
    return wallet;
  }

  /**
   * Atomically updates a wallet's balance within a transaction.
   * @param walletId The ID of the wallet to update.
   * @param amount The amount to add/subtract (positive for add, negative for subtract).
   * @param entityManager The TypeORM EntityManager for the ongoing transaction.
   * @returns The updated wallet.
   */
  async updateWalletBalance(
    walletId: string,
    amount: number,
    entityManager: EntityManager,
  ): Promise<WalletResponseDto> {
    if (isNaN(amount)) {
      throw new BadRequestException(
        'Invalid amount provided for wallet update.',
      );
    }

    // Use query builder for atomic update to prevent race conditions
    const result = await entityManager
      .createQueryBuilder()
      .update(Wallet)
      .set({ balance: () => `balance + ${amount}` }) // Directly update using SQL expression
      .where('id = :id', { id: walletId })
      .returning([
        'id',
        'userId',
        'tenantId',
        'balance',
        'currency',
        'createdAt',
        'updatedAt',
      ])
      .execute();

    const updatedWallet = result.raw[0]; // raw contains the returned data

    if (!updatedWallet) {
      throw new NotFoundException(
        `Wallet with ID '${walletId}' not found during balance update.`,
      );
    }

    // Check for negative balance if it's a withdrawal
    if (amount < 0 && Number.parseFloat(updatedWallet.balance) < 0) {
      throw new BadRequestException('Insufficient balance.');
    }

    // Invalidate cache for this specific wallet and the user's wallets
    // Note: Cache invalidation should ideally happen *after* the transaction commits.
    // For simplicity in this example, we're doing it here.
    // A more robust solution might involve event listeners or a separate cache invalidation service.
    const walletResponse: WalletResponseDto = {
      id: updatedWallet.id,
      userId: updatedWallet.userId,
      tenantId: updatedWallet.tenantId,
      balance: Number.parseFloat(updatedWallet.balance),
      currency: updatedWallet.currency,
      createdAt: updatedWallet.createdAt,
      updatedAt: updatedWallet.updatedAt,
    };
    await this.cacheManager.del(
      `wallet_${walletResponse.id}_tenant_${walletResponse.tenantId}`,
    );
    await this.cacheManager.del(
      `wallets_user_${walletResponse.userId}_tenant_${walletResponse.tenantId}`,
    );

    return walletResponse;
  }
}
