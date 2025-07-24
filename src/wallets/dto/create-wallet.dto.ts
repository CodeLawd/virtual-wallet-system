import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsCurrency, Length } from 'class-validator';

export class CreateWalletDto {
  @ApiProperty({
    description: 'The currency of the wallet (e.g., NGN, USD, EUR)',
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
}

export class WalletResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the wallet',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'ID of the user who owns the wallet',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  userId: string;

  @ApiProperty({
    description: 'ID of the tenant the wallet belongs to',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Current balance of the wallet',
    example: 1000.5,
  })
  balance: number;

  @ApiProperty({
    description: 'Currency of the wallet (e.g., NGN, USD)',
    example: 'NGN',
  })
  currency: string;

  @ApiProperty({
    description: 'Timestamp when the wallet was created',
    example: '2023-10-27T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the wallet was last updated',
    example: '2023-10-27T10:00:00.000Z',
  })
  updatedAt: Date;
}
