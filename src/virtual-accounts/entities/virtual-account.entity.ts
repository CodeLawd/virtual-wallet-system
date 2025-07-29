import { VirtualAccountStatus } from 'src/common/enums';
import { Tenant } from 'src/tenants/entities/tenant.entity';
import { Wallet } from 'src/wallets/entities/wallet.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';

@Entity('virtual_accounts')
@Index(['tenantId', 'accountNumber'], { unique: true }) // Account number unique per tenant
@Index(['tenantId', 'walletId']) // Index for finding virtual accounts by wallet
export class VirtualAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'wallet_id' })
  walletId: string; // The wallet this virtual account is linked to

  @Column({ name: 'account_number', unique: true })
  accountNumber: string;

  @Column({ name: 'bank_name' })
  bankName: string;

  @Column({ name: 'account_name' })
  accountName: string;

  @Column({ length: 10 })
  currency: string;

  @Column()
  provider: string; // e.g., PAYSTACK, FLUTTERWAVE

  @Column({ name: 'provider_reference', nullable: true })
  providerReference?: string; // Provider's internal ID for the virtual account

  @Column({
    type: 'enum',
    enum: VirtualAccountStatus,
    default: VirtualAccountStatus.ACTIVE,
  })
  status: VirtualAccountStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Tenant, (tenant) => tenant.id, { onDelete: 'CASCADE' })
  tenant: Tenant;

  @OneToOne(() => Wallet, (wallet) => wallet.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;
}
