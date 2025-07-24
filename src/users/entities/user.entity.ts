import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm"
import { Tenant } from "./tenant.entity"
import { Wallet } from "./wallet.entity"

@Entity("users")
@Index(["tenantId", "email"], { unique: true }) // Ensure email is unique per tenant
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ name: "tenant_id" })
  tenantId: string

  @Column()
  email: string

  @Column({ name: "password_hash" })
  passwordHash: string

  @Column({ name: "first_name" })
  firstName: string

  @Column({ name: "last_name" })
  lastName: string

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date

  @ManyToOne(
    () => Tenant,
    (tenant) => tenant.users,
    { onDelete: "CASCADE" },
  )
  tenant: Tenant

  @OneToMany(
    () => Wallet,
    (wallet) => wallet.user,
  )
  wallets: Wallet[]
}
