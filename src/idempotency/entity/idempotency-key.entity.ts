import { IdempotencyStatus } from 'src/common/enums';
import { Tenant } from 'src/tenants/entities/tenant.entity';
import { Transaction } from 'src/transactions/entities/transaction.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('idempotency_keys')
@Index(['tenantId', 'key'], { unique: true })
export class IdempotencyKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string; // The client-provided idempotency key

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'resource_id', nullable: true })
  resourceId?: string; // ID of the resource created/modified (e.g., transaction ID)

  @Column({ name: 'response_payload', type: 'jsonb', nullable: true })
  responsePayload?: Record<string, any>; // Stored response for idempotent requests

  @Column({ type: 'enum', enum: IdempotencyStatus })
  status: IdempotencyStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Tenant, (tenant) => tenant.idempotencyKeys, {
    onDelete: 'CASCADE',
  })
  tenant: Tenant;

  @OneToOne(() => Transaction, (transaction) => transaction.idempotencyKey)
  transaction: Transaction;
}
