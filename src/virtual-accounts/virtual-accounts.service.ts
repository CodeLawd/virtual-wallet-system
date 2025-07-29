import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import type { CreateVirtualAccountDto } from './dto/create-virtual-account.dto';
import { WalletsService } from '../wallets/wallets.service';
import { PaymentProvidersService } from '../payment-providers/payment-providers.service';
import { PostgresErrorCode } from '../common/constants/postgres-error-codes.enum';
import { VirtualAccountStatus } from '../common/enums';
import { VirtualAccount } from './entities/virtual-account.entity';
import { VirtualAccountResponseDto } from './dto/virtual-account-response.dto';

@Injectable()
export class VirtualAccountsService {
  private virtualAccountsRepository: Repository<VirtualAccount>;

  constructor(
    @InjectEntityManager()
    private entityManager: EntityManager,
    private walletsService: WalletsService,
    private paymentProvidersService: PaymentProvidersService,
  ) {
    this.virtualAccountsRepository =
      entityManager.getRepository(VirtualAccount);
  }

  async create(
    tenantId: string,
    userId: string,
    createVirtualAccountDto: CreateVirtualAccountDto,
  ): Promise<VirtualAccountResponseDto> {
    const { walletId, currency, provider } = createVirtualAccountDto;

    // 1. Validate wallet existence and ownership
    const wallet = await this.walletsService.findByTenantIdAndId(
      walletId,
      tenantId,
    );
    if (wallet.userId !== userId) {
      throw new BadRequestException(
        'Wallet does not belong to the authenticated user.',
      );
    }
    if (wallet.currency !== currency) {
      throw new BadRequestException(
        'Virtual account currency must match wallet currency.',
      );
    }

    // 2. Check if a virtual account already exists for this wallet/provider/currency
    const existingVa = await this.virtualAccountsRepository.findOneBy({
      tenantId,
      walletId,
      currency,
      provider,
      status: VirtualAccountStatus.ACTIVE,
    });
    if (existingVa) {
      throw new ConflictException(
        `An active virtual account for wallet '${walletId}' with currency '${currency}' and provider '${provider}' already exists.`,
      );
    }

    // 3. Call the payment provider to generate the virtual account
    const paymentProvider = this.paymentProvidersService.getProvider(provider);
    if (!paymentProvider.createVirtualAccount) {
      throw new BadRequestException(
        `Payment provider '${provider}' does not support virtual account creation.`,
      );
    }

    const vaDetails = await paymentProvider.createVirtualAccount(
      {
        walletId: wallet.id,
        tenantId: tenantId,
        userId: userId,
        currency: currency,
        accountName: `Wallet ${wallet.id} - Tenant ${wallet.tenantId}`, // Example account name using available properties
      },
      this.entityManager,
    );

    // 4. Save virtual account details to our database
    const newVirtualAccount = this.virtualAccountsRepository.create({
      tenantId,
      walletId,
      accountNumber: vaDetails.accountNumber,
      bankName: vaDetails.bankName,
      accountName: vaDetails.accountName,
      currency: vaDetails.currency,
      provider: provider,
      providerReference: vaDetails.providerReference,
      status: VirtualAccountStatus.ACTIVE,
    });

    try {
      const virtualAccount =
        await this.virtualAccountsRepository.save(newVirtualAccount);
      return {
        id: virtualAccount.id,
        tenantId: virtualAccount.tenantId,
        walletId: virtualAccount.walletId,
        accountNumber: virtualAccount.accountNumber,
        bankName: virtualAccount.bankName,
        accountName: virtualAccount.accountName,
        currency: virtualAccount.currency,
        provider: virtualAccount.provider,
        providerReference: virtualAccount.providerReference,
        status: virtualAccount.status,
        createdAt: virtualAccount.createdAt,
        updatedAt: virtualAccount.updatedAt,
      };
    } catch (error) {
      if (error.code === PostgresErrorCode.UniqueViolation) {
        throw new ConflictException(
          `Virtual account with account number '${vaDetails.accountNumber}' already exists.`,
        );
      }
      throw error;
    }
  }

  async findByAccountNumberAndProvider(
    accountNumber: string,
    provider: string,
  ): Promise<VirtualAccount | null> {
    return this.virtualAccountsRepository.findOneBy({
      accountNumber,
      provider,
    });
  }

  async findByIdAndTenantId(
    id: string,
    tenantId: string,
  ): Promise<VirtualAccountResponseDto> {
    const virtualAccount = await this.virtualAccountsRepository.findOneBy({
      id,
      tenantId,
    });
    if (!virtualAccount) {
      throw new NotFoundException(
        `Virtual account with ID '${id}' not found for this tenant.`,
      );
    }
    return {
      id: virtualAccount.id,
      tenantId: virtualAccount.tenantId,
      walletId: virtualAccount.walletId,
      accountNumber: virtualAccount.accountNumber,
      bankName: virtualAccount.bankName,
      accountName: virtualAccount.accountName,
      currency: virtualAccount.currency,
      provider: virtualAccount.provider,
      providerReference: virtualAccount.providerReference,
      status: virtualAccount.status,
      createdAt: virtualAccount.createdAt,
      updatedAt: virtualAccount.updatedAt,
    };
  }
}
