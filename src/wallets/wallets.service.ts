import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository, EntityManager } from 'typeorm';
import type {
  CreateWalletDto,
  WalletResponseDto,
} from './dto/create-wallet.dto';
import { PostgresErrorCode } from '../common/constants/postgres-error-codes.enum';
import { Wallet } from './entities/wallet.entity';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private walletsRepository: Repository<Wallet>,
  ) {}

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
    const wallets = await this.walletsRepository.find({
      where: { userId, tenantId },
    });

    return wallets.map((wallet) => ({
      id: wallet.id,
      userId: wallet.userId,
      tenantId: wallet.tenantId,
      balance: Number.parseFloat(wallet.balance.toString()),
      currency: wallet.currency,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    }));
  }

  async findByTenantIdAndId(
    id: string,
    tenantId: string,
  ): Promise<WalletResponseDto> {
    const wallet = await this.walletsRepository.findOneBy({
      id,
      tenantId,
    });

    if (!wallet) {
      throw new NotFoundException(
        `Wallet with ID '${id}' not found for this tenant.`,
      );
    }

    return {
      id: wallet.id,
      userId: wallet.userId,
      tenantId: wallet.tenantId,
      balance: Number.parseFloat(wallet.balance.toString()),
      currency: wallet.currency,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
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


    return walletResponse;
  }
}
