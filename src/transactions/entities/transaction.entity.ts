import { TransactionStatus, TransactionType } from 'src/common/enums';
import { Tenant } from 'src/tenants/entities/tenant.entity';
import { Wallet } from 'src/wallets/entities/wallet.entity';
import { WebhookEvent } from 'src/webhooks/entity/webhook-event.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('transactions')
@Index(['tenantId', 'walletId'])
@Index(['tenantId', 'status'])
@Index(['provider', 'providerTransactionId'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'wallet_id' })
  walletId: string; // The wallet involved (source for withdrawal/transfer, destination for deposit)

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'enum', enum: TransactionStatus })
  status: TransactionStatus;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ length: 10 })
  currency: string;

  @Column({ nullable: true })
  reference?: string; // Internal transaction reference (e.g., for transfers)

  @Column({ nullable: true })
  provider?: string; // e.g., PAYSTACK, FLUTTERWAVE, STRIPE

  @Column({ name: 'provider_transaction_id', nullable: true })
  providerTransactionId?: string; // ID from external provider

  @Column({ name: 'provider_metadata', type: 'jsonb', nullable: true })
  providerMetadata?: Record<string, any>; // Provider-specific data

  @Column({ name: 'idempotency_key_id', nullable: true, unique: true })
  idempotencyKeyId?: string; // Link to idempotency key

  @Column({ nullable: true })
  description?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Tenant, (tenant) => tenant.transactions, {
    onDelete: 'CASCADE',
  })
  tenant: Tenant;

  @ManyToOne(() => Wallet, (wallet) => wallet.transactions, {
    onDelete: 'CASCADE',
  })
  wallet: Wallet;

  @OneToOne(
    () => IdempotencyKey,
    (idempotencyKey) => idempotencyKey.transaction,
    { onDelete: 'SET NULL' },
  )
  @JoinColumn({ name: 'idempotency_key_id' })
  idempotencyKey: IdempotencyKey;

  @OneToOne(
    () => WebhookEvent,
    (webhookEvent) => webhookEvent.relatedTransaction,
    { onDelete: 'SET NULL' },
  )
  webhookEvent: WebhookEvent;
}
