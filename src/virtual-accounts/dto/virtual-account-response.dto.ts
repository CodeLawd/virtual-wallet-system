import { ApiProperty } from "@nestjs/swagger"
import { VirtualAccountStatus } from "../../common/enums"

export class VirtualAccountResponseDto {
  @ApiProperty({
    description: "Unique identifier of the virtual account",
    example: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  })
  id: string

  @ApiProperty({
    description: "ID of the tenant the virtual account belongs to",
    example: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  })
  tenantId: string

  @ApiProperty({
    description: "ID of the wallet linked to this virtual account",
    example: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  })
  walletId: string

  @ApiProperty({ description: "The generated bank account number", example: "0123456789" })
  accountNumber: string

  @ApiProperty({ description: "The name of the bank", example: "Providus Bank" })
  bankName: string

  @ApiProperty({ description: "The name associated with the virtual account", example: "Acme Corp - John Doe" })
  accountName: string

  @ApiProperty({ description: "Currency of the virtual account", example: "NGN" })
  currency: string

  @ApiProperty({ description: "Payment provider that generated this virtual account", example: "PAYSTACK" })
  provider: string

  @ApiProperty({
    description: "Provider's internal reference for the virtual account",
    example: "VA_REF_12345",
    nullable: true,
  })
  providerReference?: string

  @ApiProperty({
    description: "Current status of the virtual account",
    enum: VirtualAccountStatus,
    example: VirtualAccountStatus.ACTIVE,
  })
  status: VirtualAccountStatus

  @ApiProperty({ description: "Timestamp when the virtual account was created", example: "2023-10-27T10:00:00.000Z" })
  createdAt: Date

  @ApiProperty({
    description: "Timestamp when the virtual account was last updated",
    example: "2023-10-27T10:00:00.000Z",
  })
  updatedAt: Date
}
