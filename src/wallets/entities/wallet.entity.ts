import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Tenant } from 'src/tenants/entities/tenant.entity';
import { Transaction } from 'src/transactions/entities/transaction.entity';

@Entity('wallets')
@Index(['userId', 'currency'], { unique: true }) // A user can only have one wallet per currency
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0.0 })
  balance: number;

  @Column({ length: 10 })
  currency: string; // e.g., NGN, USD

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.wallets, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Tenant, (tenant) => tenant.wallets, { onDelete: 'CASCADE' })
  tenant: Tenant;

  @OneToMany(() => Transaction, (transaction) => transaction.wallet)
  transactions: Transaction[];
}
