import { WebhookEventStatus } from 'src/common/enums';
import { Tenant } from 'src/tenants/entities/tenant.entity';
import { Transaction } from 'src/transactions/entities/transaction.entity';
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

@Entity('webhook_events')
@Index(['tenantId', 'provider', 'eventType'])
@Index(['status'])
export class WebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column()
  provider: string; // e.g., PAYSTACK, FLUTTERWAVE

  @Column({ name: 'event_type' })
  eventType: string; // e.g., charge.success, transfer.completed

  @Column({ type: 'jsonb' })
  payload: Record<string, any>; // Raw webhook payload

  @Column({ type: 'enum', enum: WebhookEventStatus })
  status: WebhookEventStatus;

  @Column({ name: 'error_message', nullable: true })
  errorMessage?: string;

  @Column({ name: 'related_transaction_id', nullable: true, unique: true })
  relatedTransactionId?: string; // Link to the transaction updated by this webhook

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Tenant, (tenant) => tenant.webhookEvents, {
    onDelete: 'CASCADE',
  })
  tenant: Tenant;

  @OneToOne(() => Transaction, (transaction) => transaction.webhookEvent, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'related_transaction_id' })
  relatedTransaction: Transaction;
}
