import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Transaction,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Wallet } from 'src/wallets/entities/wallet.entity';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ name: 'api_key', unique: true })
  apiKey: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => User, (user) => user.tenant)
  users: User[];

  @OneToMany(() => Wallet, (wallet) => wallet.tenant)
  wallets: Wallet[];

  @OneToMany(() => Transaction, (transaction) => transaction.tenant)
  transactions: Transaction[];

  @OneToMany(() => IdempotencyKey, (idempotencyKey) => idempotencyKey.tenant)
  idempotencyKeys: IdempotencyKey[];

  @OneToMany(() => WebhookEvent, (webhookEvent) => webhookEvent.tenant)
  webhookEvents: WebhookEvent[];
}
