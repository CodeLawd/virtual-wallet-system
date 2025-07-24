import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({
    description: 'Unique name of the tenant (e.g., business name)',
    example: 'Acme Corp',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}

export class TenantResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the tenant',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  id: string;

  @ApiProperty({ description: 'Name of the tenant', example: 'Acme Corp' })
  name: string;

  @ApiProperty({
    description: 'API key for the tenant (used for initial user registration)',
    example: 'generated_api_key_uuid',
  })
  apiKey: string;

  @ApiProperty({
    description: 'Timestamp when the tenant was created',
    example: '2023-10-27T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the tenant was last updated',
    example: '2023-10-27T10:00:00.000Z',
  })
  updatedAt: Date;
}
