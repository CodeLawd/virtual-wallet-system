import { ApiProperty } from '@nestjs/swagger';
import { TransactionType, TransactionStatus } from '../../common/enums';

export class TransactionResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the transaction',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'ID of the tenant the transaction belongs to',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  tenantId: string;

  @ApiProperty({
    description: 'ID of the wallet involved in the transaction',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  walletId: string;

  @ApiProperty({
    description: 'Type of transaction',
    enum: TransactionType,
    example: TransactionType.DEPOSIT,
  })
  type: TransactionType;

  @ApiProperty({
    description: 'Current status of the transaction',
    enum: TransactionStatus,
    example: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @ApiProperty({ description: 'Amount of the transaction', example: 500.0 })
  amount: number;

  @ApiProperty({ description: 'Currency of the transaction', example: 'NGN' })
  currency: string;

  @ApiProperty({
    description:
      'Internal reference for the transaction (e.g., destination wallet ID for transfers)',
    example: 'some_internal_ref',
    nullable: true,
  })
  reference?: string;

  @ApiProperty({
    description: 'Name of the payment provider (if applicable)',
    example: 'PAYSTACK',
    nullable: true,
  })
  provider?: string;

  @ApiProperty({
    description:
      'Transaction ID from the external payment provider (if applicable)',
    example: 'PS_TXN_123456789',
    nullable: true,
  })
  providerTransactionId?: string;

  @ApiProperty({
    description: 'Additional metadata from the payment provider',
    example: { fee: 10, channel: 'card' },
    nullable: true,
  })
  providerMetadata?: Record<string, any>;

  @ApiProperty({
    description: 'ID of the idempotency key used for this transaction',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    nullable: true,
  })
  idempotencyKeyId?: string;

  @ApiProperty({
    description: 'Description of the transaction',
    example: 'Online deposit via card',
    nullable: true,
  })
  description?: string;

  @ApiProperty({
    description: 'Timestamp when the transaction was created',
    example: '2023-10-27T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the transaction was last updated',
    example: '2023-10-27T10:00:00.000Z',
  })
  updatedAt: Date;
}
