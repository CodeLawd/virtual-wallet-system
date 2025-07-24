import { ApiProperty } from "@nestjs/swagger"
import { IsUUID, IsNumber, IsPositive, IsString, IsNotEmpty, Length, IsOptional } from "class-validator"

export class CreateWithdrawalDto {
  @ApiProperty({
    description: "The ID of the wallet to withdraw from",
    example: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  })
  @IsUUID()
  walletId: string

  @ApiProperty({ description: "The amount to withdraw", example: 500.0 })
  @IsNumber()
  @IsPositive()
  amount: number

  @ApiProperty({
    description: "The currency of the withdrawal (must match wallet currency)",
    example: "NGN",
    minLength: 3,
    maxLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 3, { message: "Currency must be a 3-letter ISO 4217 code (e.g., NGN, USD)." })
  currency: string

  @ApiProperty({
    description: "The payment provider to use for the withdrawal (e.g., PAYSTACK, FLUTTERWAVE, STRIPE)",
    example: "FLUTTERWAVE",
  })
  @IsString()
  @IsNotEmpty()
  provider: string

  @ApiProperty({
    description: "Optional description for the withdrawal",
    example: "Cash out to bank account",
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string
}
