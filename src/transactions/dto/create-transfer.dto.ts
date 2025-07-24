import { ApiProperty } from "@nestjs/swagger"
import { IsUUID, IsNumber, IsPositive, IsString, IsNotEmpty, Length, IsOptional } from "class-validator"

export class CreateTransferDto {
  @ApiProperty({
    description: "The ID of the source wallet for the transfer",
    example: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  })
  @IsUUID()
  sourceWalletId: string

  @ApiProperty({
    description: "The ID of the destination wallet for the transfer",
    example: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  })
  @IsUUID()
  destinationWalletId: string

  @ApiProperty({ description: "The amount to transfer", example: 250.0 })
  @IsNumber()
  @IsPositive()
  amount: number

  @ApiProperty({
    description: "The currency of the transfer (must match both wallet currencies)",
    example: "NGN",
    minLength: 3,
    maxLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 3, { message: "Currency must be a 3-letter ISO 4217 code (e.g., NGN, USD)." })
  currency: string

  @ApiProperty({ description: "Optional description for the transfer", example: "Payment for goods", required: false })
  @IsOptional()
  @IsString()
  description?: string
}
