import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsNotEmpty,
  Length,
  IsCurrency,
} from 'class-validator';

export class CreateVirtualAccountDto {
  @ApiProperty({
    description: 'The ID of the wallet to link the virtual account to',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  @IsUUID()
  walletId: string;

  @ApiProperty({
    description:
      'The currency of the virtual account (must match wallet currency)',
    example: 'NGN',
    minLength: 3,
    maxLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 3, {
    message: 'Currency must be a 3-letter ISO 4217 code (e.g., NGN, USD).',
  })
  @IsCurrency({
    require_symbol: false,
    require_decimal: false,
  })
  currency: string;

  @ApiProperty({
    description:
      'The payment provider to use for generating the virtual account (e.g., PAYSTACK, FLUTTERWAVE)',
    example: 'PAYSTACK',
  })
  @IsString()
  @IsNotEmpty()
  provider: string;
}
